import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from '../../../modules/solver/encoding.ts';
import { computeMcNeighborBudget, evaluateMcNeighborBudget } from './mc-neighbor-budget.mjs';

function makeFixture({ portals = false } = {}) {
    const gridW = 3;
    const gridH = 4;
    const mc = PACK(1, 2);              // deliberately off row 0: catches packed-key indexing
    const west = PACK(0, 2);
    const east = PACK(2, 2);
    const north = PACK(1, 1);
    const south = PACK(1, 3);
    const staticNeighborKeys = new Int32Array(gridW * gridH * 4);
    const base = (2 * gridW + 1) * 4;
    staticNeighborKeys[base + 0] = west + 1;
    staticNeighborKeys[base + 1] = east + 1;
    staticNeighborKeys[base + 2] = north + 1;
    staticNeighborKeys[base + 3] = south + 1;

    const visited = [];
    const edgeUsage = [];
    const mustCrossIndex = [];
    visited[west] = 1;
    edgeUsage[mc] = 0;
    edgeUsage[west] = 1;
    mustCrossIndex[mc] = 1;

    const portalMap = portals
        ? new Map([
            [west, { dest: PACK(0, 0) }],
            [PACK(0, 0), { dest: west }],
        ])
        : new Map();

    return {
        mc,
        west,
        state: { mustCrossMask: 1, edgeUsage, visited, ints: 0, flipperUsedMask: 0 },
        level: { mustCrossKeys: [mc], requiredIntersections: 1, portalMap },
        prep: { staticNeighborKeys, flipperIndexMap: null, mustCrossIndex, gridW },
    };
}

test('MC neighbor-budget shadow helper uses dense row-major static-neighbor indexing', () => {
    const f = makeFixture();
    const result = computeMcNeighborBudget(-1, f.state, f.level, f.prep);
    assert.deepEqual(result, { extraNeeded: 1, freeInt: 0, extraCells: [f.west] });
    assert.equal(evaluateMcNeighborBudget({ level: f.level, prep: f.prep, state: f.state, pos: -1 }).verdict, 'reject');
});

test('MC neighbor-budget shadow helper evaluates portal levels instead of blanket-abstaining', () => {
    const f = makeFixture({ portals: true });
    const result = computeMcNeighborBudget(-1, f.state, f.level, f.prep);
    assert.equal('abstain' in result, false);
    assert.deepEqual(result, { extraNeeded: 1, freeInt: 0, extraCells: [f.west] });
});

test('current-position exemption remains conservative on a portal terminal neighbor', () => {
    const f = makeFixture({ portals: true });
    const result = computeMcNeighborBudget(f.west, f.state, f.level, f.prep);
    assert.deepEqual(result, { extraNeeded: 0, freeInt: 0, extraCells: [] });
});
