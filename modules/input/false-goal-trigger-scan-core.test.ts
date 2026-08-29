import assert from 'node:assert/strict';
import { test } from 'vitest';
import { computeParityCandidates } from './false-goal-trigger-scan-core.js';
import { PACK } from '../domain/cell-key.js';

// Minimal normalized-level shape covering everything getOccupant and
// isParityCompatibleEndpoint read.
function makeLevel(overrides: any = {}) {
    return {
        grid: { w: 4, h: 4 },
        reqLen: 6,
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(3, 3),
        falseGoalKeys: new Set<number>(),
        blockSet: new Set<number>(),
        gooseSet: new Set<number>(),
        mustPassKeys: [] as number[],
        mustCrossKeys: [] as number[],
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
        landmarkMeta: new Map(),
        ...overrides,
    };
}

test('computeParityCandidates: keeps empty parity-matching cells, drops occupied and off-parity ones', () => {
    const level = makeLevel({ blockSet: new Set([PACK(2, 0)]) });
    const candidates = computeParityCandidates(level);
    // Gate parity 0, reqLen 6 (even) → endpoints must have parity 0 (x+y even).
    assert.ok(candidates.has(PACK(1, 1)), 'empty even-parity cell is a candidate');
    assert.ok(!candidates.has(PACK(1, 0)), 'odd-parity cell is ruled out');
    assert.ok(!candidates.has(PACK(0, 0)), 'the gate is occupied');
    assert.ok(!candidates.has(PACK(3, 3)), 'the goal is occupied');
    assert.ok(!candidates.has(PACK(2, 0)), 'a block is occupied');
});

test('computeParityCandidates: an already-placed false goal stays a candidate', () => {
    const level = makeLevel({ falseGoalKeys: new Set([PACK(1, 1)]) });
    const candidates = computeParityCandidates(level);
    assert.ok(candidates.has(PACK(1, 1)), 'a placed false goal can still be a valid endpoint');
});

test('computeParityCandidates: a parity-flipping portal makes both parities candidates', () => {
    const level = makeLevel({
        portalMap: new Map([
            [PACK(0, 1), { dest: PACK(2, 2) }], // (0,1) parity 1 → (2,2) parity 0: flips
            [PACK(2, 2), { dest: PACK(0, 1) }],
        ]),
    });
    const candidates = computeParityCandidates(level);
    assert.ok(candidates.has(PACK(1, 1)), 'even-parity cell is a candidate');
    assert.ok(candidates.has(PACK(1, 0)), 'odd-parity cell is also a candidate with a flipping portal');
    assert.ok(!candidates.has(PACK(0, 1)), 'portal terminals are occupied');
});
