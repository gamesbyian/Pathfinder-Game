/**
 * Full solver-ablation generator (Component 4 of the hint-workbench plan): the extracted
 * baseline -> cascade/strategy -> swap -> portal-cascade/strategy -> swap-portal ->
 * combined -> swap-combined phase pipeline, driven by the real solver on a tiny level.
 * Mirrors diversification.test.ts's fixture/assertion style for the browser-safe subset,
 * but exercises the full seven-phase generator scripts/hint-diversification.mjs and
 * scripts/hint-workbench.mjs's ablation-full/-combined-only/-reverse-only presets both
 * delegate to.
 *
 * The fixture blocks off the middle column except at the portal cell, so the portal is
 * structurally REQUIRED for any solution (not just optionally usable) — this keeps every
 * phase, including portal-exit and combined forcing, deterministically exercised rather
 * than depending on which route the solver happens to prefer.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';

// Fast/deep test-tier gate (see docs/testing.md's "Fast and deep gates" and
// modules/solver/lower-bounds.test.ts's identical gate for the full rationale).
const deepTest = process.env.SOLVER_DEEP_TESTS === '0' ? test.skip : test;
import { createSolver } from '../solver.js';
import { pathSignature } from '../domain/hint-novelty.js';
import { createHintAblationGenerator } from './hint-ablation-generator.js';

const solverApi = createSolver();

// 3x3 grid; x=2 column is blocked at y=1 and y=3, leaving the portal cell (2,2) as the
// only connector between the gate's column (x=1) and the goal's column (x=3).
function rawForcedPortalLevel(hints: number[][] = []): any {
    return {
        grid: { w: 3, h: 3 },
        gates: [{ x: 1, y: 2 }],
        goal: { x: 3, y: 2 },
        portals: [{ x1: 2, y1: 2, x2: 3, y2: 1 }],
        blocks: [{ x: 2, y: 1 }, { x: 2, y: 3 }],
        reqLen: 2, reqInt: 0,
        geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], landmarks: [],
        hints,
    };
}

const PHASES_ALL = { baseline: true, cascade: true, swap: true, portalCascade: true, swapPortal: true, combined: true, swapCombined: true };
const BUDGETS = { attemptBudgetMs: 400, baselineBudgetMs: 2000, workBudget: 67_000_000 };

let fullHarvestPromise: ReturnType<typeof createHintAblationGenerator> | null = null;
let baselineHarvestPromise: ReturnType<typeof createHintAblationGenerator> | null = null;

function fullHarvest() {
    fullHarvestPromise ??= createHintAblationGenerator(rawForcedPortalLevel(), 1, {
        solverApi, ...BUDGETS, phases: PHASES_ALL,
    });
    return fullHarvestPromise;
}

function baselineHarvest() {
    baselineHarvestPromise ??= createHintAblationGenerator(rawForcedPortalLevel(), 1, {
        solverApi, ...BUDGETS,
        phases: { baseline: true, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: false, swapCombined: false },
    });
    return baselineHarvestPromise;
}

// Full-run integration tests: real solver search across real ablation phases is the point.
deepTest('a full run finds novel validated hints across phases, all of which use the required portal', async () => {
    const raw = rawForcedPortalLevel();
    const result = await fullHarvest();

    assert.ok(result.novel.length > 0, 'should discover at least one novel hint');
    assert.equal(result.report.haltedByWorkBudget, false);
    assert.equal(result.report.haltedByWallClock, false, 'legacy alias mirrors the work-budget field');
    assert.deepEqual(result.report.errors, []);
    assert.ok(result.report.baselineWinner, 'baseline should find a winning profile');

    // Every novel path is unique, referee-valid against the forward level, and (since the
    // portal is the only connector) actually crosses it.
    const normalizedLevel = solverApi.prepareLevelForSolver(raw, { source: 'raw', levelNumber: 1 });
    const sigs = new Set(result.novel.map(pathSignature));
    assert.equal(sigs.size, result.novel.length, 'no duplicate novel paths');
    for (const h of result.novel) {
        assert.equal(solverApi.validateCandidatePath(normalizedLevel, h).ok, true);
        assert.ok(h.length >= 3, 'path crosses the portal (gate -> portal -> ... -> goal)');
    }

    // combosTried covers the phases that actually ran, in the order phasesRun records.
    assert.deepEqual(result.report.phasesRun, ['baseline', 'cascade', 'swap', 'portalCascade', 'swapPortal', 'combined', 'swapCombined']);
    assert.ok(result.report.combosTried.cascade > 0, 'gate-direction combos were enumerated');
    assert.ok(result.report.combosTried.portalCascade > 0, 'portal-exit combos were enumerated (baseline/cascade proved the portal reachable)');
    assert.ok(result.report.combosTried.combined > 0, 'combined triples were enumerated (a hint proves gate+direction+portalDest jointly reachable)');

    // candidates are shared HintCandidateEvent objects (Component 3) with matching paths.
    assert.equal(result.candidates.length, result.novel.length);
    for (let i = 0; i < result.candidates.length; i++) {
        assert.deepEqual(result.candidates[i].path, result.novel[i]);
        assert.equal(result.candidates[i].generator, 'ablation-full');
        assert.equal(result.candidates[i].provenance.generator, 'ablation-full');
    }

    // discoveries records provenance for every considered path, including re-discoveries
    // of the same solution across phases (superset of `novel`).
    assert.ok(result.discoveries.size >= result.novel.length);
    for (const h of result.novel) assert.ok(result.discoveries.has(pathSignature(h)));
});

deepTest('already-known hints are not re-reported as novel on a second run', async () => {
    const first = await fullHarvest();
    assert.ok(first.novel.length > 0);

    const second = await createHintAblationGenerator(rawForcedPortalLevel(first.novel), 1, { solverApi, ...BUDGETS, phases: PHASES_ALL });
    const firstSigs = new Set(first.novel.map(pathSignature));
    for (const h of second.novel) {
        assert.equal(firstSigs.has(pathSignature(h)), false, 'no re-reported hint');
    }
});

test('phase toggles are honored: disabling all but baseline runs only baseline', async () => {
    const raw = rawForcedPortalLevel();
    const result = await createHintAblationGenerator(raw, 1, {
        solverApi, ...BUDGETS,
        phases: { baseline: true, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: false, swapCombined: false },
    });
    assert.deepEqual(result.report.phasesRun, ['baseline']);
    assert.equal(result.report.combosTried.cascade, 0);
    assert.equal(result.report.combosTried.portalCascade, 0);
    assert.ok(result.report.baselineWinner);
});

test('combined-only phase set finds zero triples without prior evidence, but succeeds given a seeded hint', async () => {
    const raw = rawForcedPortalLevel();
    const noEvidence = await createHintAblationGenerator(raw, 1, {
        solverApi, ...BUDGETS,
        phases: { baseline: false, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: true, swapCombined: true },
    });
    assert.equal(noEvidence.report.combosTried.combined, 0, 'no gate-portal triples proven without any hint evidence');
    assert.equal(noEvidence.novel.length, 0);

    // Seed evidence via a baseline-only run (the fixture forces every solution through the
    // portal), then re-run combined-only with that path as the level's existing hints — the
    // evidence-bounded triple must now be found and exercised.
    const forward = await baselineHarvest();
    assert.ok(forward.novel.length > 0, 'baseline should find the (forced-portal) solution');

    const withEvidence = await createHintAblationGenerator(rawForcedPortalLevel(forward.novel), 1, {
        solverApi, ...BUDGETS,
        phases: { baseline: false, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: true, swapCombined: true },
    });
    assert.deepEqual(withEvidence.report.errors, []);
    assert.ok(withEvidence.report.combosTried.combined > 0, 'evidence-bounded triple from the seeded hint was tried');
});

test('legacy wallClockDeadlineMs remains a compatibility shim for the deterministic work ceiling', async () => {
    const raw = rawForcedPortalLevel();
    const result = await createHintAblationGenerator(raw, 1, {
        solverApi,
        attemptBudgetMs: 400,
        baselineBudgetMs: 2000,
        wallClockDeadlineMs: 0,
        phases: PHASES_ALL,
    });
    assert.equal(result.report.haltedByWorkBudget, true);
    assert.equal(result.report.haltedByWallClock, true);
    assert.deepEqual(result.report.errors, []);
});

test('an exhausted work budget halts the run early with no errors', async () => {
    const raw = rawForcedPortalLevel();
    const result = await createHintAblationGenerator(raw, 1, { solverApi, attemptBudgetMs: 400, baselineBudgetMs: 2000, workBudget: 0, phases: PHASES_ALL });
    assert.equal(result.report.haltedByWorkBudget, true);
    assert.equal(result.report.haltedByWallClock, true, 'legacy alias mirrors the work-budget field');
    assert.deepEqual(result.report.errors, []);
});

// --- baseline-phase provenance distinguishes an admissible-order-search win (found and fixed
// 2026-07-25: an earlier version added an `admissibleOrder` field to the baseline consider() call
// that nothing downstream ever read back out, so it was silently dropped before ever reaching the
// persisted HintProvenanceEntry — a baseline win from admissible-order-search was indistinguishable
// from an ordinary default-profile DFS/beam win). Uses a mock solverApi (real
// prepareLevelForSolver/validateCandidatePath, a controlled .solveLevel) since the real solver only
// reaches its admissible-order-search last-resort tier on levels everything else already fails —
// not practical to force on demand, and not what this test is verifying anyway (that's
// admissible-order-search.test.ts's job; this is purely about provenance wiring). ---

test('a baseline win with admissibleOrder: true gets a distinguishing phase, not the plain "baseline" label', async () => {
    const raw = rawForcedPortalLevel();
    const realSolver = createSolver();
    // Reuse the independently exercised baseline-only harvest as the valid-path prerequisite for
    // the provenance mock; the mock itself still runs in a fresh generator instance below.
    const real = await baselineHarvest();
    assert.ok(real.novel.length > 0, 'sanity check on the fixture');
    const validPath = real.novel[0];

    const mockSolver = {
        prepareLevelForSolver: realSolver.prepareLevelForSolver,
        validateCandidatePath: realSolver.validateCandidatePath,
        solveLevel: async () => ({
            ok: true,
            solution: validPath,
            attempts: [{ ok: true, scoringProfileId: 'default', admissibleOrder: true }],
        }),
    };

    const mocked = await createHintAblationGenerator(raw, 1, {
        solverApi: mockSolver, ...BUDGETS,
        phases: { baseline: true, cascade: false, swap: false, portalCascade: false, swapPortal: false, combined: false, swapCombined: false },
    });
    assert.equal(mocked.candidates.length, 1);
    assert.equal(mocked.candidates[0].technique, 'ablation-full:baseline-admissible-order', 'the technique string must reflect the admissible-order-search win, not collapse to the plain baseline label');
    assert.equal(mocked.candidates[0].scoringProfileId, 'default', 'profile still carries the tie-break profile identity, same as before this fix');
});
