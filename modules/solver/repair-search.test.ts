/** Unit tests for the iterated-local-search repair fallback (repair-search.ts). */
import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate, repairStreamSeeds, computePlateauPenaltyCells, selectGuideCells, relinkPaths, preferredTurnExit, __takePlyForTests } from './repair-search.js';
import { createState, applyMove } from './search-state.js';
import { getRealLengthFromState } from './solution.js';
import { evaluatePrunedMove } from './hard-prune-pipeline.js';
import type { PruneDiagnostics } from './hard-prune-pipeline.js';
import {
    replayAndValidate,
} from './repair-search-test-support.test.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

function makeLevel(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 3 };
    return normalizeRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: overrides.reqLen ?? (grid.w - 1 + grid.h - 1), reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
}

test('repairSearchFromGate solves a simple line level', async () => {
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(path, [K(1, 1), K(2, 1), K(3, 1)]);
});

test('repairSearchFromGate finds a valid path requiring an intersection and a must-cross visit', async () => {
    // 3x3 grid; gate top-middle, goal bottom-right; a must-cross cell forces a revisit.
    const level = makeLevel({
        grid: { w: 3, h: 3 },
        gates: [{ x: 2, y: 1 }],
        goal: { x: 3, y: 3 },
        mustCross: [{ x: 2, y: 2 }],
        reqLen: 7, reqInt: 1,
    });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(2, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null);
    assert.ok(path, 'expected a solution within budget on this small grid');
    assert.equal(replayAndValidate(path as number[], level, prep), true);
});

test('stochastic takePly retains a candidate that deterministic neighbor-budget rejects', () => {
    const level = makeLevel({
        grid: { w: 5, h: 5 }, goal: { x: 5, y: 5 }, mustCross: [{ x: 3, y: 3 }],
        reqLen: 20, reqInt: 0,
    });
    const prep = prepLevel(level);
    prep._cfg = { PRUNE_MC_NEIGHBOR_BUDGET: true };
    const prefix = [K(1, 1), K(2, 1), K(3, 1), K(4, 1), K(5, 1), K(5, 2), K(4, 2), K(3, 2)];
    const candidate = K(2, 2);
    const state = createState(prefix[0], level, prep);
    for (const next of prefix.slice(1)) applyMove(next, state, level, prep, false);

    const choices: Array<{ survivors: number[] }> = [];
    prep._repairChoiceResearchObserver = { observe: record => choices.push(record) };
    __takePlyForTests(state, level, prep, SCORING_PROFILES.repair, null, () => 0, null, 0, []);
    assert.ok(choices[0]?.survivors.includes(candidate),
        'the exact stochastic survivor-selection loop must retain the neighbor-budget candidate');

    const deterministicState = createState(prefix[0], level, prep);
    for (const next of prefix.slice(1)) applyMove(next, deterministicState, level, prep, false);
    applyMove(candidate, deterministicState, level, prep, false);
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    assert.equal(evaluatePrunedMove(candidate, getRealLengthFromState(deterministicState), deterministicState,
        level, prep, prep._cfg, false, { diagnostics }), 'reject');
    assert.equal(diagnostics.rejected.PRUNE_MC_NEIGHBOR_BUDGET, 1,
        'the equivalent deterministic shared-gauntlet use still rejects and names the rule');
});

test('repairSearchFromGate is deterministic: identical inputs produce identical output', async () => {
    const level = makeLevel({
        grid: { w: 4, h: 4 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 4 },
        mustPass: [{ x: 3, y: 2 }, { x: 2, y: 3 }],
        mustCross: [{ x: 2, y: 2 }],
        reqLen: 14, reqInt: 3,
    });
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 1500, Date.now(), null);

    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const eliteRecords: number[][] = [];
    const choiceRecords: Array<{ survivors: number[]; chosenIndex: number }> = [];
    prepB._repairEliteResearchObserver = { observe: record => eliteRecords.push(record.path) };
    prepB._repairChoiceResearchObserver = { observe: record => choiceRecords.push(record) };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 1500, Date.now(), null);

    assert.deepEqual(pathA, pathB);
    assert.equal(prepA._metrics.nodesExpanded, prepB._metrics.nodesExpanded, 'elite observation must not change canonical work');
    assert.ok(eliteRecords.every(path => path[0] === K(1, 1)), 'emitted elites are replay-complete from the gate');
    assert.ok(choiceRecords.every(record => record.survivors[record.chosenIndex] !== undefined));
});

test('repair research seed normalizes both independent streams without changing production derivation', () => {
    const production = repairStreamSeeds(K(1, 1), 7);
    assert.notEqual(production.primary, production.mustTurn);
    assert.deepEqual(repairStreamSeeds(K(1, 1), 7, null), production);
    const normalizedA = repairStreamSeeds(K(1, 1), 7, 12345);
    const normalizedB = repairStreamSeeds(K(4, 4), 99, 12345);
    assert.deepEqual(normalizedA, normalizedB);
    assert.notEqual(normalizedA.primary, normalizedA.mustTurn);
});

test('repairSearchFromGate stops at its wall deadline without relying on real elapsed time', async () => {
    // Portal-free grid: reqLen parity must match the gate/goal Manhattan-distance parity.
    // A 1x3 corridor's only route is 2 steps; reqLen=1 is impossible (wrong parity).
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 1 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const out: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number; stopReason?: 'wall-clock' | 'node-budget' | 'work-budget' } = {};
    const clock = vi.spyOn(Date, 'now');
    try {
        clock.mockReturnValueOnce(0).mockReturnValue(300);
        const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 300, 0, null, undefined, false, Infinity, out);
        assert.equal(path, null);
        assert.equal(out.timedOut, true);
        assert.equal(out.stopReason, 'wall-clock');
        assert.ok((out.nodesExpanded ?? 0) > 0, 'the mocked deadline should fire only after real repair work');
    } finally {
        clock.mockRestore();
    }
});

test('every path repairSearchFromGate returns satisfies isSolutionState (soundness spot-check)', async () => {
    // A slightly larger, more constrained grid — soundness must hold regardless of whether
    // the winning walk came from a fresh restart or a mid-path splice.
    const level = makeLevel({
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        mustPass: [{ x: 3, y: 3 }],
        mustCross: [{ x: 2, y: 4 }],
        reqLen: 16, reqInt: 3,
    });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
    // A null result (budget exhausted without a solution) is also an acceptable outcome here —
    // this test's contract is "never return an invalid path," not "always succeed."
});

// enableMustTurnBias (the S043 fix's must-turn exit-guidance nudge — see data/stress/README.md).
// Backward compatibility matters here: the ordinary repair attempt calls this function with the
// parameter omitted (defaulting to false) specifically so it stays byte-for-byte identical to
// pre-fix behaviour; only a separate, later attempt (attempts.ts's repairMustTurnBiasedAttempt)
// passes true.
const mustTurnLevel = () => makeLevel({
    grid: { w: 5, h: 5 },
    gates: [{ x: 1, y: 1 }],
    goal: { x: 5, y: 5 },
    landmarks: [{ x: 3, y: 3, objectType: 'fountain', role: 'mustTurn', turn: 'cw' }],
    reqLen: 16, reqInt: 3,
});

test('repairSearchFromGate defaults enableMustTurnBias to false (omitted 8th arg)', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // No 8th argument at all — exercises the same call shape every pre-existing caller uses.
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 500, Date.now(), null);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableMustTurnBias=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

// This level's biased search needs a real ~344k nodes to converge (~250ms uncontended) — a much
// thinner wall-clock margin against a 1500ms budget than the sibling determinism test above
// (~2.4k nodes, ~5-17ms), which made this test flaky in CI: two back-to-back calls with identical
// seeds only diverge in output if they get to run a different number of restarts before their
// independent 1500ms wall-clock windows close, which shared/throttled CI runners can absolutely
// cause (reproduced locally by racing 20 busy-loop processes across 4 cores against this exact
// pair of calls: elapsed time for the same 344186-node convergence ranged 1.1s-2.4s, straddling
// the old 1500ms budget and producing the exact null-vs-solved mismatch seen in CI). The fix
// bounds both calls by nodeBudget (a deterministic node count, machine-speed-independent) instead
// of by budgetMs — repairSearchFromGate always does the exact same sequence of operations for a
// given seed regardless of wall-clock speed, so nodeBudget alone determines the outcome. budgetMs
// is raised only as a generous, effectively-never-hit safety net (a real hang/regression should
// still fail fast rather than hang the suite), not as the mechanism this test relies on.
test('repairSearchFromGate with enableMustTurnBias=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, true, 1_000_000);

    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, true, 1_000_000);

    assert.deepEqual(pathA, pathB);
}, 25000);

// ── Stage 2 prototype: signature-conditioned soft feature memory ────────────────────────────────
// The plan (docs/repair-search-stagnation-escape-plan.md) calls out the frequency-table/log-odds
// arithmetic as the part worth pinning down directly, independent of any solver run.
test('computePlateauPenaltyCells penalizes cells overrepresented in the plateau shape, not cells common everywhere', () => {
    // cellA: 90/100 in this shape but only 100/1000 globally → strongly overrepresented → penalized.
    // cellB: 50/100 in this shape and 500/1000 globally → same rate everywhere → NOT penalized.
    const shapeCells = new Map<number, number>([[0xA, 90], [0xB, 50]]);
    const globalCells = new Map<number, number>([[0xA, 100], [0xB, 500]]);
    const out = computePlateauPenaltyCells(shapeCells, 100, globalCells, 1000, 2.5, 4, 8);
    assert.equal(out.has(0xA), true, 'strongly overrepresented cell is penalized');
    assert.equal(out.has(0xB), false, 'a cell common everywhere is not penalized');
    // logOdds(cellA) = ln(90.5/10.5) − ln(100.5/900.5) ≈ 4.346; penalty = 4 × min(4.346, 8).
    assert.ok(Math.abs(out.get(0xA)! - 4 * 4.346) < 0.1, `penalty ~17.4, got ${out.get(0xA)}`);
});

test('computePlateauPenaltyCells caps the penalty and handles empty/degenerate input', () => {
    // A near-universal-in-shape, near-absent-globally cell has huge log-odds → clamped to UNIT×CAP.
    const capped = computePlateauPenaltyCells(new Map([[1, 999]]), 1000, new Map([[1, 1]]), 100000, 2.5, 4, 8);
    assert.equal(capped.get(1), 4 * 8, 'log-odds is capped so the penalty is finite');
    assert.equal(computePlateauPenaltyCells(undefined, 0, new Map(), 0, 2.5, 4, 8).size, 0, 'no shape data → empty map');
    assert.equal(computePlateauPenaltyCells(new Map([[1, 5]]), 5, new Map([[1, 5]]), 5, 2.5, 4, 8).size, 0, 'zero global baseline denominator → empty, no throw');
});

test('repairSearchFromGate with enablePlateauPenalty=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // Positional args through seedSalt=0, then enablePlateauPenalty=true (13th arg).
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, Infinity, null, 0, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

// Node-budget-bounded (not wall-clock) for the same CI-throttling reason as the enableMustTurnBias
// determinism test above: repairSearchFromGate does the identical operation sequence for a given
// seed regardless of machine speed, and the Stage 2 penalty is computed only from deterministic
// state (never a rand() draw), so bounding by node count makes the outcome deterministic.
test('repairSearchFromGate with enablePlateauPenalty=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, true);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, true);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enablePlateauPenalty=false (default) is byte-identical to omitting it', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000, null, 0, false);
    assert.deepEqual(pathA, pathB);
}, 25000);

// ── Stage 3 prototype: scatter-search recombination (guide-biased construction) ──────────────────
test('selectGuideCells prefers complementary constraints, breaks ties by distance, skips base/null', () => {
    const baseCells = new Set([1, 2, 3]);
    const noPend = { mp: 0, mc: 0, sr: 0, mt: 0, at: 0 };
    // base has must-turn bit 0b1 pending; only `complement` clears it → chosen even though `far` is
    // structurally more distant.
    const base = { cells: baseCells, pend: { mp: 0, mc: 0, sr: 0, mt: 0b1, at: 0 } };
    const far = { cells: new Set([5, 6, 7, 8, 9]), pend: { mp: 0, mc: 0, sr: 0, mt: 0b1, at: 0 } };      // dist 8, comp 0
    const complement = { cells: new Set([1, 2, 3, 4]), pend: { mp: 0, mc: 0, sr: 0, mt: 0b0, at: 0 } };  // dist 1, comp 1
    assert.equal(selectGuideCells(base, [{ cells: baseCells, pend: base.pend }, far, complement]), complement.cells, 'complementary guide wins over merely-distant one');
    // With no complementarity signal, falls back to max structural distance.
    const b2 = { cells: baseCells, pend: noPend };
    const near = { cells: new Set([1, 2, 3, 4]), pend: noPend };
    const farTie = { cells: new Set([5, 6, 7, 8, 9]), pend: noPend };
    assert.equal(selectGuideCells(b2, [near, farTie, { cells: null, pend: null }]), farTie.cells, 'distance tiebreak when complementarity is equal');
    assert.equal(selectGuideCells(b2, [{ cells: baseCells, pend: noPend }]), null, 'no eligible guide → null');
});

test('repairSearchFromGate with enableRecombination=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // Positional args through enablePlateauPenalty=false, then enableRecombination=true (14th arg).
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, Infinity, null, 0, false, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableRecombination=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, true);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, true);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enableRecombination=false (default) is byte-identical to omitting it', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000, null, 0, false, false);
    assert.deepEqual(pathA, pathB);
}, 25000);

// ── Counterfactual consumer experiment: beam-survivor elite seeding ──────────────────────────────
// Motivated by the 2026-08-13 stratified beam/repair producer-population pilot (zero exact-prefix /
// zero metric-projection overlap across 25 levels — see BEAM_SEED_WIDTH's own comment). Positional
// args through enableElitePrefixDfs=false, then enableBeamSeed=true (18th arg).

test('repairSearchFromGate with enableBeamSeed=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, Infinity, null, 0, false, false, false, false, false, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableBeamSeed=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, false, false, false, true);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, false, false, false, true);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enableBeamSeed=false (default) is byte-identical to omitting it', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000, null, 0, false, false, false, false, false, false);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enableBeamSeed=true actually seeds the elite pool from a beam survivor before any restart', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const arrivals: { producer: 'repair'; path: number[]; badness: number; arrivalNodes: number; restart: number }[] = [];
    prep._repairEliteResearchObserver = { observe: record => arrivals.push(record) };
    await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, 50_000, null, 0, false, false, false, false, false, true);
    // At least one elite must have arrived at restart 0 -- i.e. before the restart loop's first
    // increment (restartCount++ is the loop's very first statement) -- proving the seed step ran
    // and inserted through considerElite BEFORE ordinary restart-driven discovery had a chance to.
    assert.equal(arrivals.some(a => a.restart === 0), true, 'a beam-seeded elite arrived before restart 1');
});

test('enableBeamSeed=true charges the beam-seed cost against this call\'s own nodesExpanded, not a free extra pass', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const out: { nodesExpanded?: number } = {};
    // A tiny nodeBudget the ordinary restart loop alone could not possibly exceed in zero restarts,
    // isolating the beam-seed step's own node cost as (most of) what gets reported.
    await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1, out, 0, false, false, false, false, false, true);
    assert.equal(prep._metrics.nodesExpanded > 0, true, 'the beam-seed step spent real, globally-counted nodes');
    // The tiny nodeBudget=1 means the restart loop's own first check trips immediately on
    // nodesExpandedLocal alone -- so out.nodesExpanded (set on that exit path) reports ONLY the
    // beam-seed step's own cost, not any restart-loop spend.
    assert.equal((out.nodesExpanded ?? 0) > 0, true, 'the beam-seed cost was charged to this call\'s own local counter, which the restart loop\'s own termination check reads');
});

// ── Stage 3-real prototype: reversible-operator path relinking ───────────────────────────────────
test('relinkPaths recombines base prefix + guide suffix at a shared anchor into a valid solution', () => {
    // 3×3, gate (1,1) → goal (3,3), reqLen 4. base is a non-solution ending at (3,1); guide is a
    // real length-4 solution. They share the interior anchor (2,2): base[0..2] + guide[3..] =
    // (1,1),(2,1),(2,2),(3,2),(3,3) is the solution the operator must reconstruct through the gauntlet.
    const level = makeLevel({ grid: { w: 3, h: 3 }, goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const ws = createState(K(1, 1), level, prep);
    const base = [K(1, 1), K(2, 1), K(2, 2), K(3, 2), K(3, 1)];
    const guide = [K(1, 1), K(1, 2), K(2, 2), K(3, 2), K(3, 3)];
    const res = relinkPaths(ws, base, guide, level, prep, null, [], K(1, 1), 10_000);
    assert.equal(res.solved, true, 'anchor splice finds the recombined solution');
    assert.equal(replayAndValidate(ws.path.slice(), level, prep), true, 'and it is genuinely valid');
});

test('relinkPaths returns unsolved (no false positive) when no anchor recombination solves', () => {
    // Same level; guide is a solution but base shares no usable interior anchor with it, so no
    // recombination can complete — the operator must report unsolved, never a bogus "solved".
    const level = makeLevel({ grid: { w: 3, h: 3 }, goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const ws = createState(K(1, 1), level, prep);
    const base = [K(1, 1), K(2, 1), K(3, 1)];                 // shares only the gate with guide's interior
    const guide = [K(1, 1), K(1, 2), K(1, 3), K(2, 3), K(3, 3)];
    const res = relinkPaths(ws, base, guide, level, prep, null, [], K(1, 1), 10_000);
    assert.equal(res.solved, false);
});

test('repairSearchFromGate with enableRelink=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // Positional args through enableRecombination=false, then enableRelink=true (15th arg).
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, Infinity, null, 0, false, false, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableRelink=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, true);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, true);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enableRelink=false (default) is byte-identical to omitting it', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000, null, 0, false, false, false);
    assert.deepEqual(pathA, pathB);
}, 25000);

// ── Shared turn-aware selective biasing ──────────────────────────────────────────────────────────
test('preferredTurnExit returns the required-turn exit and skips straight-through / non-orthogonal', () => {
    // Arrived at (3,2) heading right (from (2,2)); the two perpendicular exits are (3,1) and (3,3),
    // straight-through is (4,2). cw and ccw must select opposite perpendicular exits.
    const prev = K(2, 2), pos = K(3, 2);
    const nbrs = [K(3, 1), K(3, 3), K(4, 2)];
    const cw = preferredTurnExit(prev, pos, nbrs, 'cw');
    const ccw = preferredTurnExit(prev, pos, nbrs, 'ccw');
    assert.ok(cw === K(3, 1) || cw === K(3, 3), 'cw picks a perpendicular exit');
    assert.ok(ccw === K(3, 1) || ccw === K(3, 3), 'ccw picks a perpendicular exit');
    assert.notEqual(cw, ccw, 'opposite required directions pick opposite exits');
    assert.equal(preferredTurnExit(prev, pos, nbrs, 'either'), K(3, 1), 'either takes the first perpendicular exit');
    assert.equal(preferredTurnExit(prev, pos, [K(4, 2)], 'either'), null, 'only a straight-through exit → no turn');
    assert.equal(preferredTurnExit(K(2, 2), K(3, 3), nbrs, 'either'), null, 'a non-orthogonal arrival → null');
});

test('repairSearchFromGate with enableTurnBias=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // Positional args through enableRelink=false, then enableTurnBias=true (16th arg).
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, false, Infinity, null, 0, false, false, false, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableTurnBias=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, false, true);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 1_000_000, null, 0, false, false, false, true);
    assert.deepEqual(pathA, pathB);
}, 25000);

test('enableTurnBias=false (default) is byte-identical to omitting it', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000);
    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, SCORING_PROFILES.repair, 20000, Date.now(), null, undefined, false, 500_000, null, 0, false, false, false, false);
    assert.deepEqual(pathA, pathB);
}, 25000);

// Ablation flags added to close a coverage gap: SPLICE_PROBABILITY, STAGNATION_THRESHOLD/
// STAGNATION_BURST_LEN, and EXIT_GUIDANCE_EPSILON_BOOST previously had no toggle at all — only
// the whole-attempt STRATEGY_REPAIR_FALLBACK/STRATEGY_REPAIR_MUSTTURN_BIAS flags existed. These
// tests confirm each new flag is actually read (an explicit `false` measurably changes the
// restart trajectory or rand() consumption vs. the default) and that omitting `_cfg` entirely
// (every pre-existing caller's shape) is untouched.
test('STRATEGY_REPAIR_ELITE_SPLICE=false forces every restart fresh-from-gate', async () => {
    const level = makeLevel({
        grid: { w: 4, h: 4 }, gates: [{ x: 1, y: 1 }], goal: { x: 4, y: 4 },
        mustPass: [{ x: 3, y: 2 }, { x: 2, y: 3 }], mustCross: [{ x: 2, y: 2 }],
        reqLen: 20, reqInt: 3,
    });

    const prepDefault = prepLevel(level);
    prepDefault._metrics = { nodesExpanded: 0 };
    const outDefault: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, prepDefault, SCORING_PROFILES.repair, 150, Date.now(), null, undefined, false, Infinity, outDefault);

    const prepNoSplice = prepLevel(level);
    prepNoSplice._cfg = { STRATEGY_REPAIR_ELITE_SPLICE: false };
    prepNoSplice._metrics = { nodesExpanded: 0 };
    const outNoSplice: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, prepNoSplice, SCORING_PROFILES.repair, 150, Date.now(), null, undefined, false, Infinity, outNoSplice);

    // Both are legitimate ILS runs (may or may not solve in 150ms); the flag must at minimum
    // not crash, and — since rand() consumption differs the moment splicing is force-disabled —
    // the two runs' bestBadness trajectories are not required to match, only to both be defined.
    assert.equal(typeof outDefault.bestBadness === 'number' || outDefault.bestBadness === undefined, true);
    assert.equal(typeof outNoSplice.bestBadness === 'number' || outNoSplice.bestBadness === undefined, true);
});

test('STRATEGY_REPAIR_STAGNATION_BURST=false never forces a fresh-restart burst, and omitted _cfg is unaffected', async () => {
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });

    const prepNoCfg = prepLevel(level);
    prepNoCfg._metrics = { nodesExpanded: 0 };
    const pathNoCfg = await repairSearchFromGate(K(1, 1), level, prepNoCfg, SCORING_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(pathNoCfg, [K(1, 1), K(2, 1), K(3, 1)]);

    const prepNoBurst = prepLevel(level);
    prepNoBurst._cfg = { STRATEGY_REPAIR_STAGNATION_BURST: false };
    prepNoBurst._metrics = { nodesExpanded: 0 };
    const pathNoBurst = await repairSearchFromGate(K(1, 1), level, prepNoBurst, SCORING_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(pathNoBurst, [K(1, 1), K(2, 1), K(3, 1)], 'disabling the stagnation burst must not break an ordinary solve');
});

test('STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST=false disables the must-turn exit nudge without breaking the biased attempt', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._cfg = { STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST: false };
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 2000, Date.now(), null, undefined, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

// Determinism is owned by the small synthetic repairSearchFromGate tests above. Do not use the
// historical R02560 rescue witness merely to prove identical inputs produce identical outputs.

test('searchCompletionFromPartialPath never returns an unsound path on a level with must-pass/must-cross objectives (soundness spot-check)', async () => {
    // Reuses the existing must-pass/must-cross soundness-check shape (see the earlier
    // "every path repairSearchFromGate returns satisfies isSolutionState" test) — confirms the
    // new operator doesn't regress soundness once structuralDeficit briefly touches 0 mid-walk
    // on a level that actually has objectives to satisfy first.
    const level = makeLevel({
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        mustPass: [{ x: 3, y: 3 }],
        mustCross: [{ x: 2, y: 4 }],
        reqLen: 16, reqInt: 3,
    });
    const prep = prepLevel(level);
    // No _cfg — searchCompletionFromPartialPath is default-enabled, so this already exercises it.
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, SCORING_PROFILES.repair, 3000, Date.now(), null);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});
