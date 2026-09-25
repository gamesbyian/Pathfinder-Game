/**
 * Diverse-hint-search session behavior (hardening plan §1): the resumable
 * baseline → gate-direction → portal-direction pipeline, driven by the real solver on a
 * tiny portal level, plus the hint merge/count helpers the UI relies on.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';

// Fast/deep test-tier gate (see docs/testing.md's "Fast and deep gates" and
// modules/solver/lower-bounds.test.ts's identical gate for the full rationale).
const deepTest = process.env.SOLVER_DEEP_TESTS === '0' ? test.skip : test;
import { createSolver } from '../solver.js';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import {
    pathSignature, mergeUniqueHints, knownHintCount, hintButtonLabel,
    createDiversificationSession,
} from './diversification.js';

const solverApi = createSolver();

function portalLevel() {
    return normalizeRawLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }, { x: 1, y: 3 }],
        goal: { x: 5, y: 3 },
        portals: [{ x1: 2, y1: 2, x2: 4, y2: 2 }],
        reqLen: 6, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], landmarks: [], hints: [],
    });
}

function lineLevel() {
    return normalizeRawLevel({
        grid: { w: 3, h: 1 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 3, y: 1 },
        reqLen: 2, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
    });
}

const LINE_PATH = [PACK(0, 0), PACK(1, 0), PACK(2, 0)];

function makeSessionSolver({
    admissibleOrder = false,
    solveAfterFirst = false,
    respectYield = false,
}: {
    admissibleOrder?: boolean;
    solveAfterFirst?: boolean;
    respectYield?: boolean;
} = {}) {
    let calls = 0;
    return {
        prepareLevelForSolver: solverApi.prepareLevelForSolver,
        validateCandidatePath: solverApi.validateCandidatePath,
        solveLevel: async (_level: any, opts: any = {}) => {
            calls++;
            if (respectYield) await opts.yieldFn?.();
            if (calls > 1 && !solveAfterFirst) {
                return { ok: false, solution: null, attempts: [], workSpent: 1 };
            }
            return {
                ok: true,
                solution: LINE_PATH,
                workSpent: 1,
                attempts: [{
                    ok: true,
                    stageId: admissibleOrder ? 'admissible-order-fallback' : 'dfs',
                    scoringProfileId: 'default',
                    admissibleOrder,
                }],
            };
        },
    };
}

let portalHarvestPromise: Promise<{
    level: ReturnType<typeof portalLevel>;
    session: ReturnType<typeof createDiversificationSession>;
    novel: number[][];
    report: any;
    isComplete: boolean;
    events: string[];
}> | null = null;

/** One full real-solver harvest is enough to establish the shared portal fixture's known hints.
 * Follow-up tests retain their own independent session/action assertions instead of repeatedly
 * rediscovering this identical prerequisite. */
function portalHarvest() {
    if (!portalHarvestPromise) {
        portalHarvestPromise = (async () => {
            const level = portalLevel();
            const session = createDiversificationSession(level, [], {
                solverApi, attemptBudgetMs: 2000, baselineBudgetMs: 2000,
            });
            const events: string[] = [];
            const { novel, report, isComplete } = await session.runUntil(
                () => 500_000_000,
                { onProgress: (e: any) => events.push(e.type) },
            );
            return { level, session, novel, report, isComplete, events };
        })();
    }
    return portalHarvestPromise;
}

test('hint helpers: signatures, dedup merge, counts, button label', () => {
    assert.equal(pathSignature([1, 2, 3]), '1,2,3');
    const merged = mergeUniqueHints([[1, 2]], [[1, 2], [3, 4]]);
    assert.deepEqual(merged, [[1, 2], [3, 4]]);
    assert.deepEqual(mergeUniqueHints(null as any, [[5]]), [[5]], 'null base treated as empty');
    assert.equal(knownHintCount([[1, 2]], [[1, 2], [3, 4]]), 2);
    assert.equal(hintButtonLabel(0), 'Hints');
    assert.equal(hintButtonLabel(3), 'Hints (3)');
});

// Full-session integration tests: real solver search across real diversification phases is the
// point (proving the plumbing actually finds/dedupes/halts on real work), not something a stub
// could stand in for.
deepTest('a full session run finds novel validated hints across phases and completes', async () => {
    const { level, session, novel, report, isComplete, events } = await portalHarvest();

    assert.ok(novel.length > 0, 'session should discover at least one hint');
    assert.equal(isComplete, true);
    assert.equal(session.isComplete, true);
    // Every discovery is unique and referee-valid.
    const sigs = new Set(novel.map(pathSignature));
    assert.equal(sigs.size, novel.length, 'no duplicate hints');
    for (const h of novel) {
        assert.equal(solverApi.validateCandidatePath(level, h).ok, true);
    }
    assert.ok(report.combosTried > 0, 'gate-direction combos were enumerated');
    assert.equal(report.novelFound, novel.length);
    assert.ok(events.includes('hint-found'));
    assert.ok(events.includes('phase-done'));
    assert.equal(report.haltedByCancel, false);
});

test('already-known hints are not re-reported as novel', async () => {
    const level = lineLevel();
    const sessionSolver = makeSessionSolver();
    const second = createDiversificationSession(level, [LINE_PATH], {
        solverApi: sessionSolver, attemptBudgetMs: 1, baselineBudgetMs: 1,
    });
    const secondRun = await second.runUntil(() => 100, {});
    assert.deepEqual(secondRun.novel, []);
    assert.ok(secondRun.rediscovered.length > 0, 'known valid path is recorded as rediscovered, never novel');
});

test('an exhausted work ceiling halts the session early and marks it resumable (not complete)', async () => {
    const level = lineLevel();
    const session = createDiversificationSession(level, [], {
        solverApi: makeSessionSolver(), attemptBudgetMs: 1, baselineBudgetMs: 1,
    });
    // This assertion is about session-local accounting/resume state, not search effectiveness.
    const res = await session.runUntil(() => -1, {});
    assert.equal(res.isComplete, false);
    assert.equal(session.isComplete, false);
    assert.equal(res.report.haltedByWorkBudget, true);
    assert.equal(res.report.haltedByWallClock, true, 'legacy alias mirrors the work-budget field');

    const resumed = await session.runUntil(() => 100, {});
    assert.equal(resumed.isComplete, true);
});

test('maxHints caps the harvest and reports the halt', async () => {
    const level = lineLevel();
    const session = createDiversificationSession(level, [], {
        solverApi: makeSessionSolver(), attemptBudgetMs: 1, baselineBudgetMs: 1,
    });
    const res = await session.runUntil(() => 100, { maxHints: 1 });
    assert.deepEqual(res.novel, [LINE_PATH]);
    assert.equal(res.report.haltedByMaxHints, true);
    assert.equal(res.isComplete, false, 'capped run leaves the session resumable');
});

test('cancellation is observed and reported without an error entry', async () => {
    const level = lineLevel();
    const session = createDiversificationSession(level, [], {
        solverApi: makeSessionSolver({ solveAfterFirst: true, respectYield: true }),
        attemptBudgetMs: 1,
        baselineBudgetMs: 1,
    });
    let calls = 0;
    const res = await session.runUntil(
        () => 100,
        { isCancelled: () => ++calls > 3 },
    );
    assert.equal(res.report.haltedByCancel, true);
    assert.equal(res.isComplete, false);
    assert.deepEqual(res.report.errors, [], 'cancellation is not an error');
});

// See hint-ablation-generator.test.ts's identical fix/test for the full incident writeup (found
// and fixed 2026-07-25): an earlier version of this file's baseline-phase provenance added an
// admissibleOrder field nothing downstream ever read, so it was silently dropped before reaching
// persisted provenance. Uses a mock solverApi for the same reason that file's test does — the real
// solver only reaches admissible-order-search on levels everything else already fails.
test('a baseline win with admissibleOrder: true gets a distinguishing phase in its provenance event', async () => {
    const mockedLevel = lineLevel();
    const mocked = createDiversificationSession(mockedLevel, [], {
        solverApi: makeSessionSolver({ admissibleOrder: true }),
        attemptBudgetMs: 1,
        baselineBudgetMs: 1,
    });
    const provenanceEvents: any[] = [];
    const res = await mocked.runUntil(() => 100, {
        maxHints: 1,
        onProgress: (e: any) => { if (e.type === 'hint-found') provenanceEvents.push(e.provenance); },
    });
    assert.deepEqual(res.novel, [LINE_PATH]);
    assert.equal(provenanceEvents[0].phase, 'baseline-admissible-order', 'the phase must reflect the admissible-order-search win, not collapse to the plain baseline label');
    assert.equal(provenanceEvents[0].scoringProfileId, 'default');
});
