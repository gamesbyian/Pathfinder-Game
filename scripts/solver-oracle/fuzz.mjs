#!/usr/bin/env node
/**
 * Differential fuzzing harness for the reference oracle (docs/solver-dev-tooling-plan.md
 * Component F). Cross-checks THREE independent implementations of move legality against each
 * other on many small random levels (generate.mjs): the reference oracle (oracle.mjs), the
 * production solver's move-generator (via modules/Solver.js's SOLVER_TESTING_API —
 * createState/getNeighbors/applyMove/isSolutionState/prepLevel, the exact code the production
 * solver runs), and — added 2026-08-06 — LIVE PLAY's own `isValidMove`
 * (modules/domain/move-rules.js), the exact code the browser game and the submission/hint
 * referee run.
 *
 * WHY THE THIRD ARM. Before 2026-08-06 this harness only checked oracle-vs-solver agreement, so
 * it could not, and did not, catch a real bug where live play's flipping-filter entry-axis check
 * was dead code (crossedSet can never contain a cell before the step onto it commits) — the
 * solver's own check was correct, the oracle's was correct, but `isValidMove` alone enforced no
 * axis restriction on a flipping filter's first-ever crossing, silently reaching production. See
 * reports/2026-08-06-game-rules-solver-alignment-plan.md for the full writeup and fix. This third
 * arm is exactly the differential check that would have caught it automatically instead of by
 * hand.
 *
 * LANDMARK COVERAGE (2026-08-06): generate.mjs now sometimes places surround/mustTurn/
 * adjacentTurn landmarks, and oracle.mjs independently implements all three (previously it
 * flagged any landmark-bearing level `hasLandmarks` and this harness skipped it outright — a
 * real, then-documented coverage gap, not a silent one). Decorative landmarks and the plain
 * `mustPass` role need no new logic (they fold into existing blocks/mustPass handling). See
 * oracle.mjs's file doc for how the turn-direction geometry is kept independently re-derived
 * rather than shared with the domain arm it's cross-checked against here.
 *
 * `isValidMove` is checked under MoveContext.TAP_ROUTE (not PLAY, and NOT SOLVER despite the
 * name): TAP_ROUTE disables the PLAY-only hazard checks the oracle and solver both deliberately
 * skip (geese/false goals are irrelevant to move-generation soundness — see CLAUDE.md's "Solver
 * ignores false goals" note; `checkFalseGoals: true` is harmless here since this harness never
 * arms any false goal), while still exercising every shared rule (portals, filters, edge-reuse,
 * gate re-entry) where a real bug could hide. MoveContext.SOLVER was tried first and rejected:
 * its `checkWinMetrics: true` makes `isValidMove` refuse to STEP onto the goal at all unless
 * must-pass/must-cross are already satisfied — but `getNeighbors`/`getLegalMoves` don't ask that
 * question during move generation at all (whether arriving at the goal is a genuine win is a
 * SEPARATE, later check — `isSolutionState`/`isOracleSolution`, already compared independently
 * below). Using SOLVER's checkWinMetrics here produced ~70% spurious "mismatches" in testing, all
 * of the same shape (domain refuses to enter the goal early, oracle+production allow it) — a real
 * option-selection error, not a real bug, caught by the "way too many mismatches to be real"
 * sanity check before this harness was trusted. Using MoveContext.PLAY would separately produce
 * spurious mismatches on any generated level with a goose/false-goal on the walked path.
 *
 * State for `isValidMove` is built via the REAL `runtime/path-state.js`'s `rebuildDerivedState` —
 * not hand-rolled — so this harness doesn't risk introducing a fourth, independently-buggy state
 * tracker for the very state-construction step it's trying to keep honest. Cheap to do from
 * scratch every step (full path replay) since these levels are tiny (max 7x7) and max-steps is
 * bounded.
 *
 * Deliberately checks MOVE-BY-MOVE AGREEMENT via random walks, not "did the search find the same
 * answer": comparing full search outcomes would conflate genuine strategy/completeness
 * differences (different pruning depth, different budget) with real move-generation/win-
 * condition bugs, and would need much bigger budgets to mean anything. A random walk through all
 * three implementations' legal-move sets in lockstep, checking set-equality at every step (plus
 * win-condition agreement whenever the goal is reached), is cheap, targets exactly the class of
 * bug this component exists to catch (see oracle.mjs's file doc — the MST-bound scratch-buffer
 * bug precedent, and the flipping-filter precedent above), and needs no search/budget at all.
 *
 * Solvability of the generated levels is NOT required or checked: this only asks "do the three
 * implementations agree about what's LEGAL and about the WIN CONDITION," a question with a
 * definite right answer on ANY schema-valid level, solvable or not.
 *
 * Any disagreement is a build-breaking finding (exit code 1) — see this component's invariants
 * in docs/solver-dev-tooling-plan.md: never silently logged and ignored.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/solver-oracle/fuzz.mjs
 *       [--count=200] [--seed=1] [--max-steps=60] [--out=<file>]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { generateRandomLevel, mulberry32 } from './generate.mjs';
import {
    parseOracleLevel, createOracleState, getLegalMoves, applyOracleMove, isOracleSolution,
} from './oracle.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const COUNT = Number(args.get('--count') || 200);
const SEED = Number(args.get('--seed') ?? 1);
const MAX_STEPS = Number(args.get('--max-steps') || 60);
const OUT_FILE = args.get('--out') || null;

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/Solver.js');
const { validateRawLevel } = await import('../../modules/domain/level-schema.js');
const { parseRawLevel } = await import('../../modules/domain/level-codec.js');
const { isValidMove } = await import('../../modules/domain/move-rules.js');
const { MoveContext } = await import('../../modules/domain/move-context.js');
const { rebuildDerivedState } = await import('../../modules/runtime/path-state.js');
const { areWinMetricsSatisfied } = await import('../../modules/runtime/game-rules.js');
const { validateCandidatePath } = await import('../../modules/domain/path-validator.ts');
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove, isSolutionState, PACK } = SOLVER_TESTING_API;

// Fresh play-mode state for `isValidMove`, built from `path`/`isPortalJump` via the real
// production derivation (see file doc) rather than hand-rolled bookkeeping.
function buildDomainState(startKey) {
    const state = {
        mode: 0, // PLAY
        path: [startKey],
        isPortalJump: new Set(),
        visitedCounts: new Map(),
        cellUsage: new Map(),
        intersections: 0,
        flipCount: 0,
        crossedFlippingFilters: new Map(),
        activeGateKey: startKey,
        turnsAtMap: new Map(),
        armedFalseGoals: new Set(),
        revealedGeese: new Set(),
    };
    return state;
}

function unpack(k) {
    return `${k & 0xFFFF},${(k >>> 16) & 0xFFFF}`;
}

const boundedReason = (verdict) => verdict?.ok ? null
    : String(verdict?.reason || verdict?.error || 'rejected without a reason').slice(0, 240);

/** Run all four final arbiters from the common level/path, rebuilding every arm's state. */
function finalVerdicts(raw, pathKeys) {
    const oracleLevel = parseOracleLevel(raw);
    const prodLevel = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(prodLevel);
    const domainLevel = parseRawLevel(raw);
    const oracleState = createOracleState(oracleLevel, unpack(pathKeys[0]));
    const solverState = createState(pathKeys[0], prodLevel, prep);

    for (let i = 1; i < pathKeys.length; i++) {
        const next = pathKeys[i];
        const previous = pathKeys[i - 1];
        const portal = prodLevel.portalMap.get(previous);
        const portalJump = !!(portal && portal.dest === next);
        applyOracleMove(oracleLevel, oracleState, unpack(next));
        applyMove(next, solverState, prodLevel, prep, portalJump);
    }

    // Runtime state is deliberately reconstructed from only the path and portal-jump indexes.
    const runtimeState = buildDomainState(pathKeys[0]);
    runtimeState.path = [...pathKeys];
    for (let i = 1; i < pathKeys.length; i++) {
        const portal = domainLevel.portalMap.get(pathKeys[i - 1]);
        if (portal?.dest === pathKeys[i]) runtimeState.isPortalJump.add(i);
    }
    rebuildDerivedState(runtimeState, domainLevel);
    const referee = validateCandidatePath(domainLevel, [...pathKeys]);
    return {
        oracle: Boolean(isOracleSolution(oracleLevel, oracleState)),
        solver: Boolean(isSolutionState(solverState, prodLevel)),
        runtime: Boolean(pathKeys.at(-1) === domainLevel.goalKey
            && areWinMetricsSatisfied(runtimeState, domainLevel)),
        referee: Boolean(referee?.ok),
        refereeReasons: boundedReason(referee),
    };
}

function verdictsAgree(v) {
    return new Set([v.oracle, v.solver, v.runtime, v.referee]).size === 1;
}

function fuzzOneLevel(raw, seed, maxSteps, trial) {
    const rng = mulberry32(seed);

    const validation = validateRawLevel(raw);
    if (!validation.ok) return { skipped: true, reason: `schema-invalid: ${validation.errors.join('; ')}` };

    const oracleLevel = parseOracleLevel(raw);

    const prodLevel = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(prodLevel);

    // Third arm: the REAL domain/runtime level object (not the solver's independently-normalized
    // one) — the same parse function live play, the editor, and the referee all use.
    const domainLevel = parseRawLevel(raw);
    if (!domainLevel) return { skipped: true, reason: 'domain parseRawLevel rejected a schema-valid level' };

    const gateXY = raw.gates[0];
    const oStart = `${gateXY.x - 1},${gateXY.y - 1}`;
    const pStart = PACK(gateXY.x - 1, gateXY.y - 1);

    const oState = createOracleState(oracleLevel, oStart);
    const pState = createState(pStart, prodLevel, prep);
    const dState = buildDomainState(pStart);
    rebuildDerivedState(dState, domainLevel);

    // All grid cells, checked as isValidMove candidates every step — cheap on these tiny (<=7x7)
    // generated levels, and gives a TRUE full legal-move-set comparison rather than only checking
    // whatever the other two arms already proposed (which would miss a case where isValidMove
    // wrongly ALLOWS something neither oracle nor solver ever consider).
    //
    // Geese and false goals are excluded here specifically — this is an intentional, CORRECT scope
    // difference, not a shared invariant to test. Entering a goose/false-goal cell in real play is
    // a legal MOVE that triggers a hazard as a separate consequence (isValidMove's checkHazards
    // gate is what encodes that, and MoveContext.TAP_ROUTE deliberately disables it so path-drawing
    // isn't blocked); the solver and oracle instead exclude both from the search space entirely
    // as a structural optimization (prep.ts's staticNeighborKeys skips gooseSet/falseGoalKeys; see
    // oracle.mjs's isStructurallyImpassable) — no accepted solution could ever include one, so
    // there's no reason to ever generate that branch. Comparing the two would flag this correct
    // difference as a false mismatch on every generated level that happens to place a goose/false
    // goal next to the walked path.
    const { w: gridW, h: gridH } = domainLevel.grid;
    const allCells = [];
    for (let y = 0; y < gridH; y++) for (let x = 0; x < gridW; x++) {
        const k = PACK(x, y);
        if (domainLevel.gooseSet.has(k) || domainLevel.falseGoalKeys.has(k)) continue;
        allCells.push(k);
    }

    for (let step = 0; step < maxSteps; step++) {
        const oPos = oState.path[oState.path.length - 1];
        const pPos = pState.path[pState.path.length - 1];
        const dPos = dState.path[dState.path.length - 1];
        if (oPos !== unpack(pPos) || oPos !== unpack(dPos)) {
            return { mismatch: true, step, reason: `position drift: oracle=${oPos} production=${unpack(pPos)} domain=${unpack(dPos)}` };
        }

        const oMoves = getLegalMoves(oracleLevel, oState);
        const pMoves = getNeighbors(pPos, pState, prodLevel, prep).map(unpack);
        const oSet = new Set(oMoves), pSet = new Set(pMoves);
        const oOnly = oMoves.filter((m) => !pSet.has(m));
        const pOnly = pMoves.filter((m) => !oSet.has(m));
        if (oOnly.length > 0 || pOnly.length > 0) {
            return { mismatch: true, step, reason: 'legal-move disagreement (oracle vs production)', pos: oPos, oracleOnly: oOnly, productionOnly: pOnly };
        }

        // Once ANY implementation has arrived at the goal, movement is universally over — win or
        // not — per isValidMove's own unconditional "invalid-after-goal" rule. getNeighbors and
        // getLegalMoves never need to encode that themselves: production search treats an
        // unsuccessful goal arrival as a dead end and backtracks immediately, so neither is ever
        // actually asked "what's legal AFTER the goal" in real usage. Skip the move-generation
        // comparison at the goal (it would compare a real rule against an intentionally-unspecified
        // one) and let the win-condition check below decide the only question that matters here.
        const atGoal = pPos === prodLevel.goalKey;
        if (!atGoal) {
            const dMoves = allCells.filter((k) => isValidMove(k, dState, domainLevel, MoveContext.TAP_ROUTE)).map(unpack);
            const dSet = new Set(dMoves);
            const dOnly = dMoves.filter((m) => !oSet.has(m));
            const refOnly = oMoves.filter((m) => !dSet.has(m)); // oracle+production already agree, so this covers both
            if (dOnly.length > 0 || refOnly.length > 0) {
                return { mismatch: true, step, reason: 'legal-move disagreement (domain isValidMove vs oracle+production)', pos: oPos, domainOnly: dOnly, oracleProductionOnly: refOnly };
            }
        }

        const oSol = Boolean(isOracleSolution(oracleLevel, oState));
        if (atGoal) {
            const verdicts = finalVerdicts(raw, [...pState.path]);
            if (!verdictsAgree(verdicts)) {
                return { mismatch: true, step, reason: 'final-acceptance disagreement', pos: oPos,
                    seed, trial, path: [...pState.path].map(unpack), level: raw, verdicts };
            }
        }

        if (oMoves.length === 0 || oSol || atGoal) break;

        const next = oMoves[Math.floor(rng() * oMoves.length)];
        applyOracleMove(oracleLevel, oState, next);
        const [nx, ny] = next.split(',').map(Number);
        const pNext = PACK(nx, ny);
        const portalEntry = prodLevel.portalMap.get(pPos);
        const isPortalJump = !!(portalEntry && portalEntry.dest === pNext);
        applyMove(pNext, pState, prodLevel, prep, isPortalJump);

        dState.path.push(pNext);
        if (isPortalJump) dState.isPortalJump.add(dState.path.length - 1);
        rebuildDerivedState(dState, domainLevel);
    }
    return { mismatch: false };
}

const W = (x, y) => PACK(x - 1, y - 1);
const base = (overrides = {}) => ({
    grid: { w: 4, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 4, y: 1 },
    reqLen: 3, reqInt: 0, blocks: [], mustPass: [], mustCross: [], geese: [], falseGoals: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [], ...overrides,
});
const straight = [W(1, 1), W(2, 1), W(3, 1), W(4, 1)];
const turn = [W(1, 1), W(2, 1), W(2, 2), W(3, 2)];
const corner = [W(1, 1), W(2, 1), W(2, 2)];
const cross = [W(1, 2), W(2, 2), W(3, 2), W(3, 1), W(2, 1), W(2, 2), W(2, 3), W(3, 3)];
const ring = [W(1, 1), W(2, 1), W(3, 1), W(3, 2), W(3, 3), W(2, 3), W(1, 3), W(1, 2)];
const fixtures = [
    ['required length/intersections accepted', base(), straight, true],
    ['required length rejected', base({ reqLen: 4 }), straight, false],
    ['required intersections rejected', base({ reqInt: 1 }), straight, false],
    ['must-pass accepted', base({ mustPass: [{ x: 2, y: 1 }] }), straight, true],
    ['must-pass rejected', base({ mustPass: [{ x: 2, y: 2 }] }), straight, false],
    ['must-cross accepted', base({ grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 3, y: 3 }, reqLen: 7, reqInt: 1, mustCross: [{ x: 2, y: 2 }] }), cross, true],
    ['must-cross rejected', base({ mustCross: [{ x: 2, y: 1 }] }), straight, false],
    ['must-turn direction accepted', base({ grid: { w: 3, h: 2 }, goal: { x: 3, y: 2 }, landmarks: [{ x: 2, y: 1, objectType: 'park', role: 'mustTurn' }] }), turn, true],
    ['must-turn direction rejected', base({ grid: { w: 3, h: 2 }, goal: { x: 3, y: 2 }, landmarks: [{ x: 2, y: 1, objectType: 'park', role: 'mustTurnCcw' }] }), turn, false],
    ['adjacent-turn accepted', base({ grid: { w: 2, h: 2 }, goal: { x: 2, y: 2 }, reqLen: 2, landmarks: [{ x: 1, y: 2, objectType: 'park', role: 'adjacentTurn' }] }), corner, true],
    ['adjacent-turn direction rejected', base({ grid: { w: 2, h: 2 }, goal: { x: 2, y: 2 }, reqLen: 2, landmarks: [{ x: 1, y: 2, objectType: 'park', role: 'adjacentTurnCcw' }] }), corner, false],
    ['surround accepted', base({ grid: { w: 3, h: 3 }, goal: { x: 1, y: 2 }, reqLen: 7, landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] }), ring, true],
    ['surround rejected', base({ grid: { w: 3, h: 3 }, goal: { x: 3, y: 1 }, reqLen: 2, landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] }), straight.slice(0, 3), false],
    ['portals accepted', base({ goal: { x: 4, y: 3 }, reqLen: 2, portals: [{ x1: 2, y1: 1, x2: 4, y2: 2 }] }), [W(1, 1), W(2, 1), W(4, 2), W(4, 3)], true],
    ['portals rejected', base({ goal: { x: 4, y: 3 }, reqLen: 3, portals: [{ x1: 2, y1: 1, x2: 4, y2: 2 }] }), [W(1, 1), W(2, 1), W(4, 2), W(4, 3)], false],
    ['flipping filters accepted', base({ flippingFilters: [{ x: 2, y: 1, axis: 1 }] }), straight, true],
    ['flipping filters rejected', base({ reqLen: 4, flippingFilters: [{ x: 2, y: 1, axis: 1 }] }), straight, false],
];

for (const [name, raw, fixturePath, expected] of fixtures) {
    const verdicts = finalVerdicts(raw, fixturePath);
    if (!verdictsAgree(verdicts) || verdicts.oracle !== expected) {
        console.error(JSON.stringify({ reason: 'deterministic fixture disagreement', fixture: name,
            seed: 'fixture', trial: name, step: fixturePath.length - 1, level: raw,
            path: fixturePath.map(unpack), expected, verdicts }, null, 2));
        process.exit(1);
    }
}
console.log(`Final-acceptance fixtures: ${fixtures.length} passed (accepted and rejected goal arrivals).`);

console.log(`Oracle differential fuzz: ${COUNT} levels, seed=${SEED}, max-steps=${MAX_STEPS}.`);

let tested = 0, skipped = 0, mismatches = 0, landmarkLevelsTested = 0;
const mismatchDetails = [];
const seedRng = mulberry32(SEED);

for (let i = 0; i < COUNT; i++) {
    const levelSeed = Math.floor(seedRng() * 0xFFFFFFFF);
    const raw = generateRandomLevel(mulberry32(levelSeed));
    const result = fuzzOneLevel(raw, levelSeed, MAX_STEPS, i);
    if (result.skipped) { skipped++; continue; }
    tested++;
    if (Array.isArray(raw.landmarks) && raw.landmarks.length > 0) landmarkLevelsTested++;
    if (result.mismatch) {
        mismatches++;
        mismatchDetails.push({ index: i, levelSeed, raw, ...result });
        console.log(`  MISMATCH at level #${i} (seed ${levelSeed}): ${result.reason}`);
    }
}

console.log(`\nTested ${tested} level(s) (${skipped} skipped: schema-invalid), ${landmarkLevelsTested} carrying landmarks, ${mismatches} mismatch(es).`);

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ count: COUNT, seed: SEED, maxSteps: MAX_STEPS, tested, skipped, mismatches, mismatchDetails }, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
}

if (mismatches > 0) {
    console.error(`\n${mismatches} oracle/production/domain disagreement(s) found — see above (build-breaking, docs/solver-dev-tooling-plan.md Component F).`);
    process.exit(1);
}
