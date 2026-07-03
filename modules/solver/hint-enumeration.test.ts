/** Unit tests for the shared solution-enumeration engine. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { normalizeRawLevel } from './normalization.js';
import { enumerateFromGate, anchoredFromSeed, completeFromState } from './hint-enumeration.js';
import { createState } from './search-state.js';

// 3×3 grid, gate (1,1)→goal (3,3), exactly 4 steps, 0 intersections. Manhattan distance is 4, so every
// length-4 path is a monotone lattice path (2 rights + 2 ups) — exactly C(4,2) = 6 solutions, none
// revisiting a cell. A hand-countable complete-enumeration oracle.
function tinyLevel(overrides = {}) {
    const raw = { grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0, ...overrides };
    const level = normalizeRawLevel(raw, 1);
    return { level, prep: prepLevel(level) };
}

test('complete mode enumerates every solution and reports exhausted', async () => {
    const { level, prep } = tinyLevel();
    const sols: number[][] = [];
    const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => sols.push(p), rng: null, nodeBudget: Infinity });
    assert.equal(res.exhausted, true, 'unbounded deterministic run drains the tree');
    assert.equal(sols.length, 6, 'exactly the 6 monotone shortest paths');
    // Every solution is well-formed: gate → goal, 5 nodes (reqLen 4), all cells distinct (reqInt 0).
    for (const p of sols) {
        assert.equal(p[0], PACK(0, 0));
        assert.equal(p[p.length - 1], PACK(2, 2));
        assert.equal(p.length, 5);
        assert.equal(new Set(p).size, 5);
    }
    // Deterministic: the set is stable across runs.
    const again: number[][] = [];
    await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => again.push(p), rng: null });
    assert.deepEqual(new Set(again.map(p => p.join(','))), new Set(sols.map(p => p.join(','))));
});

test('a node budget stops early and reports NOT exhausted', async () => {
    const { level, prep } = tinyLevel();
    const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: () => {}, rng: null, nodeBudget: 3 });
    assert.equal(res.exhausted, false, 'cut short by the node budget');
});

test('shouldStop halts enumeration and reports NOT exhausted', async () => {
    const { level, prep } = tinyLevel();
    let seen = 0;
    const res = await enumerateFromGate(level, prep, PACK(0, 0), {
        onSolution: () => { seen++; }, rng: null, shouldStop: () => seen >= 2,
    });
    assert.equal(res.exhausted, false);
    assert.ok(seen >= 2 && seen < 6, 'stopped after reaching the guard, before draining');
});

test('random order finds the same solution SET as deterministic order', async () => {
    const { level, prep } = tinyLevel();
    const detSet = new Set<string>();
    await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => detSet.add(p.join(',')), rng: null });
    let a = 123456;
    const rng = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    const randSet = new Set<string>();
    const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => randSet.add(p.join(',')), rng, nodeBudget: Infinity });
    assert.equal(res.exhausted, true);
    assert.deepEqual(randSet, detSet, 'randomization changes order, not the complete result');
});

test('anchoredFromSeed completes a known prefix and stays consistent with it', async () => {
    const { level, prep } = tinyLevel();
    // Pick a concrete solution as the seed: right, right, up, up.
    const seed = [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(2, 1), PACK(2, 2)];
    const sols: number[][] = [];
    const res = await anchoredFromSeed(level, prep, seed, 2, { onSolution: p => sols.push(p), rng: null });
    assert.equal(res.exhausted, true);
    assert.ok(sols.length >= 1, 'finds at least the seed itself');
    // Every completion keeps the anchored 2-step prefix.
    for (const p of sols) assert.deepEqual(p.slice(0, 3), seed.slice(0, 3));
    assert.ok(sols.some(p => p.join(',') === seed.join(',')), 'the seed is among the completions');
});

test('completeFromState works from an arbitrary positioned state', async () => {
    const { level, prep } = tinyLevel();
    const state = createState(PACK(0, 0), level, prep);
    const sols: number[][] = [];
    const res = await completeFromState(level, prep, state, { onSolution: p => sols.push(p), rng: null });
    assert.equal(res.exhausted, true);
    assert.equal(sols.length, 6);
});
