#!/usr/bin/env node
/**
 * Differential fuzzing harness for the reference oracle (docs/solver-dev-tooling-plan.md
 * Component F). Cross-checks oracle.mjs against the REAL production move-generator/win-checker
 * (via modules/Solver.js's SOLVER_TESTING_API — createState/getNeighbors/applyMove/
 * isSolutionState/prepLevel, the exact code the production solver runs) on many small random
 * levels (generate.mjs).
 *
 * Deliberately checks MOVE-BY-MOVE AGREEMENT via random walks, not "did the search find the same
 * answer": comparing full search outcomes would conflate genuine strategy/completeness
 * differences (different pruning depth, different budget) with real move-generation/win-
 * condition bugs, and would need much bigger budgets to mean anything. A random walk through
 * BOTH implementations' legal-move sets in lockstep, checking set-equality at every step (plus
 * win-condition agreement whenever the goal is reached), is cheap, targets exactly the class of
 * bug this component exists to catch (see oracle.mjs's file doc — the MST-bound scratch-buffer
 * bug precedent), and needs no search/budget at all.
 *
 * Solvability of the generated levels is NOT required or checked: this only asks "do the two
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
const SEED = Number(args.get('--seed') || 1);
const MAX_STEPS = Number(args.get('--max-steps') || 60);
const OUT_FILE = args.get('--out') || null;

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/Solver.js');
const { validateRawLevel } = await import('../../modules/domain/level-schema.js');
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove, isSolutionState, PACK } = SOLVER_TESTING_API;

function unpack(k) {
    return `${k & 0xFFFF},${(k >>> 16) & 0xFFFF}`;
}

function fuzzOneLevel(raw, seed, maxSteps) {
    const rng = mulberry32(seed);

    const validation = validateRawLevel(raw);
    if (!validation.ok) return { skipped: true, reason: `schema-invalid: ${validation.errors.join('; ')}` };

    const oracleLevel = parseOracleLevel(raw);
    if (oracleLevel.hasLandmarks) return { skipped: true, reason: 'landmarks unsupported by this oracle' };

    const prodLevel = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(prodLevel);

    const gateXY = raw.gates[0];
    const oStart = `${gateXY.x - 1},${gateXY.y - 1}`;
    const pStart = PACK(gateXY.x - 1, gateXY.y - 1);

    const oState = createOracleState(oracleLevel, oStart);
    const pState = createState(pStart, prodLevel, prep);

    for (let step = 0; step < maxSteps; step++) {
        const oPos = oState.path[oState.path.length - 1];
        const pPos = pState.path[pState.path.length - 1];
        if (oPos !== unpack(pPos)) {
            return { mismatch: true, step, reason: `position drift: oracle=${oPos} production=${unpack(pPos)}` };
        }

        const oMoves = getLegalMoves(oracleLevel, oState);
        const pMoves = getNeighbors(pPos, pState, prodLevel, prep).map(unpack);
        const oSet = new Set(oMoves), pSet = new Set(pMoves);
        const oOnly = oMoves.filter((m) => !pSet.has(m));
        const pOnly = pMoves.filter((m) => !oSet.has(m));
        if (oOnly.length > 0 || pOnly.length > 0) {
            return { mismatch: true, step, reason: 'legal-move disagreement', pos: oPos, oracleOnly: oOnly, productionOnly: pOnly };
        }

        const oSol = isOracleSolution(oracleLevel, oState);
        const pSol = isSolutionState(pState, prodLevel);
        if (oSol !== pSol) {
            return { mismatch: true, step, reason: 'win-condition disagreement', pos: oPos, oracleSays: oSol, productionSays: pSol };
        }

        if (oMoves.length === 0 || oSol) break;

        const next = oMoves[Math.floor(rng() * oMoves.length)];
        applyOracleMove(oracleLevel, oState, next);
        const [nx, ny] = next.split(',').map(Number);
        const pNext = PACK(nx, ny);
        const portalEntry = prodLevel.portalMap.get(pPos);
        const isPortalJump = !!(portalEntry && portalEntry.dest === pNext);
        applyMove(pNext, pState, prodLevel, prep, isPortalJump);
    }
    return { mismatch: false };
}

console.log(`Oracle differential fuzz: ${COUNT} levels, seed=${SEED}, max-steps=${MAX_STEPS}.`);

let tested = 0, skipped = 0, mismatches = 0;
const mismatchDetails = [];
const seedRng = mulberry32(SEED);

for (let i = 0; i < COUNT; i++) {
    const levelSeed = Math.floor(seedRng() * 0xFFFFFFFF);
    const raw = generateRandomLevel(mulberry32(levelSeed));
    const result = fuzzOneLevel(raw, levelSeed, MAX_STEPS);
    if (result.skipped) { skipped++; continue; }
    tested++;
    if (result.mismatch) {
        mismatches++;
        mismatchDetails.push({ index: i, levelSeed, raw, ...result });
        console.log(`  MISMATCH at level #${i} (seed ${levelSeed}): ${result.reason}`);
    }
}

console.log(`\nTested ${tested} level(s) (${skipped} skipped: schema-invalid or landmarks), ${mismatches} mismatch(es).`);

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ count: COUNT, seed: SEED, maxSteps: MAX_STEPS, tested, skipped, mismatches, mismatchDetails }, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
}

if (mismatches > 0) {
    console.error(`\n${mismatches} oracle/production disagreement(s) found — see above (build-breaking, docs/solver-dev-tooling-plan.md Component F).`);
    process.exit(1);
}
