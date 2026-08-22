import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver } from '../solver.js';

const solver = createSolver();

function puzzle(extra: any = {}) {
    return {
        grid: { w: 4, h: 4 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 4 },
        reqLen: 6,
        reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        landmarks: [], filters: [], flippingFilters: [], portals: [],
        ...extra,
    };
}

function stableAttemptShape(result: any) {
    return (result.attempts ?? []).map((attempt: any) => ({
        gateKey: attempt.gateKey,
        profile: attempt.profile,
        template: attempt.template,
        beamWidth: attempt.beamWidth,
        ok: attempt.ok,
        nodesExpanded: attempt.nodesExpanded,
        repair: !!attempt.repair,
        randomSeed: attempt.randomSeed ?? null,
        seedSalt: attempt.seedSalt ?? null,
    }));
}

test('runtime solve is invariant to saved hints and non-mechanical exact-level metadata', async () => {
    const cleanRaw = puzzle();
    const historyLoadedRaw = puzzle({
        id: 'EXACT-LEVEL-HISTORY-ID',
        hints: [
            [123, 456, 789],
            [999, 888, 777],
        ],
        hintRecords: [{ path: [1, 2, 3], provenance: [{ technique: 'historical-winner' }] }],
        provenance: { origin: 'historical-test' },
        stressMeta: { witnessSolution: [42], previousWinner: 'do-not-use' },
        designerName: 'history should not matter',
        description: 'history should not matter',
        difficulty: 999,
    });

    const clean = solver.prepareLevelForSolver(cleanRaw, { source: 'raw' });
    const loaded = solver.prepareLevelForSolver(historyLoadedRaw, { source: 'raw' });
    // The normalizer currently retains raw `hints` in the normalized shape for other application
    // surfaces. This test intentionally does not require the prepared objects to be identical; it
    // requires the actual solve to be independent of that retained historical field.
    assert.notDeepEqual(clean.hints, loaded.hints);

    const opts = { timeBudgetMs: 10_000, nodeBudget: 500_000, workBudget: 1_000_000 };
    const a = await solver.solve(clean, opts);
    const b = await solver.solve(loaded, opts);

    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.deepEqual(b.solution, a.solution);
    assert.equal(b.nodesExpanded, a.nodesExpanded);
    // workSpent is emitted runtime telemetry but is not currently part of SolveResult's public type.
    assert.equal((b as any).workSpent, (a as any).workSpent);
    assert.deepEqual(stableAttemptShape(b), stableAttemptShape(a));
});
