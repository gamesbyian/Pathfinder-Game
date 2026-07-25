/** Unit tests for the shared solution-enumeration engine. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { normalizeRawLevel } from './normalization.js';
import { enumerateFromGate, anchoredFromSeed, completeFromState, rootChildrenForGate, planGateShards } from './hint-enumeration.js';
import { createState } from './search-state.js';

// 3×3 grid, gate (1,1)→goal (3,3), exactly 4 steps, 0 intersections. Manhattan distance is 4, so every
// length-4 path is a monotone lattice path (2 rights + 2 ups) — exactly C(4,2) = 6 solutions, none
// revisiting a cell. A hand-countable complete-enumeration oracle.
function tinyLevel(overrides = {}) {
    const raw = { grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0, ...overrides };
    const level = normalizeRawLevel(raw, 1);
    return { level, prep: prepLevel(level) };
}

// 7×7 grid, gate (1,4)→goal (7,4), a must-pass cell at (4,1) that's off the direct route — forces
// a real detour, which is exactly the kind of constraint completeFromState's own weak pruning
// (over-length, over-intersection, goal-distance only) doesn't know about at all, unlike the
// full admissible gauntlet orderBy: 'admissible-slack' opts into. reqLen: 12 has exactly 300
// solutions at full exhaustion (verified) — small enough to run exhaustively in a fast unit test,
// large enough to show a real node-count gap between the two pruning strengths.
function mustPassDetourLevel(reqLen: number, overrides = {}) {
    const raw = {
        grid: { w: 7, h: 7 }, gates: [{ x: 1, y: 4 }], goal: { x: 7, y: 4 },
        mustPass: [{ x: 4, y: 1 }], reqLen, reqInt: 0, ...overrides,
    };
    const level = normalizeRawLevel(raw, 1);
    return { level, prep: prepLevel(level), gateKey: PACK(0, 3) };
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

// --- orderBy: 'admissible-slack' (rankByAdmissibleSlack + the full evaluatePrunedMove gauntlet) ---

test('admissible-slack ordering reaches the IDENTICAL solution set as default ordering, far more efficiently', async () => {
    const { level, prep, gateKey } = mustPassDetourLevel(12);
    const defaultSet = new Set<string>();
    const defaultRes = await enumerateFromGate(level, prep, gateKey, { onSolution: p => defaultSet.add(p.join(',')), rng: null, nodeBudget: Infinity });
    assert.equal(defaultRes.exhausted, true);
    assert.equal(defaultSet.size, 300, 'sanity check on the fixture\'s known solution count');

    const slackSet = new Set<string>();
    const slackRes = await enumerateFromGate(level, prep, gateKey, { onSolution: p => slackSet.add(p.join(',')), rng: null, nodeBudget: Infinity, orderBy: 'admissible-slack' });
    assert.equal(slackRes.exhausted, true);
    assert.deepEqual(slackSet, defaultSet, 'stronger pruning changes which nodes get visited, never which solutions exist');

    // The full admissible gauntlet (must-pass lower bound included) prunes dead branches this
    // module's own weak checks (over-length/over-intersection/goal-distance only) can't see at
    // all — a real, large efficiency gap, not a marginal one (measured ~10.8x on this fixture).
    assert.ok(slackRes.nodes < defaultRes.nodes / 5, `expected a large node-count reduction, got default=${defaultRes.nodes} slack=${slackRes.nodes}`);
});

test('a non-null tieBreakProfile still reaches the identical solution set (tie-breaking is ordering-only)', async () => {
    const { level, prep, gateKey } = mustPassDetourLevel(12);
    const noTieBreakSet = new Set<string>();
    await enumerateFromGate(level, prep, gateKey, { onSolution: p => noTieBreakSet.add(p.join(',')), rng: null, nodeBudget: Infinity, orderBy: 'admissible-slack' });

    const tieBreakSet = new Set<string>();
    const res = await enumerateFromGate(level, prep, gateKey, {
        onSolution: p => tieBreakSet.add(p.join(',')), rng: null, nodeBudget: Infinity,
        orderBy: 'admissible-slack', tieBreakProfile: {},
    });
    assert.equal(res.exhausted, true);
    assert.deepEqual(tieBreakSet, noTieBreakSet);
});

test('admissible-slack ordering finds a solution within a tight node budget where a fixed-seed random restart finds none', async () => {
    // A must-pass detour is exactly the case this module's own weak pruning can't see coming: a
    // branch that wanders away from the required cell isn't rejected until it dead-ends on length,
    // so blind/random exploration wastes most of a tight budget on branches the admissible gauntlet
    // would reject in O(1). Verified empirically before writing this assertion (not guessed):
    // random with this exact seed finds 0 solutions at this budget; admissible-slack finds several.
    const { level, prep, gateKey } = mustPassDetourLevel(12);
    let a = 123456;
    const rng = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    let randomFound = 0;
    await enumerateFromGate(level, prep, gateKey, { onSolution: () => { randomFound++; }, rng, nodeBudget: 100 });
    assert.equal(randomFound, 0, 'sanity check on the fixture: this seed finds nothing at this budget under default ordering');

    let slackFound = 0;
    await enumerateFromGate(level, prep, gateKey, { onSolution: () => { slackFound++; }, rng: null, nodeBudget: 100, orderBy: 'admissible-slack' });
    assert.ok(slackFound >= 1, 'admissible-slack should find at least one solution in the same budget where random found none');
});

test('orderBy defaults to unaffected (random/deterministic) behavior when omitted', async () => {
    const { level, prep, gateKey } = mustPassDetourLevel(12);
    const omittedSet = new Set<string>();
    const r1 = await enumerateFromGate(level, prep, gateKey, { onSolution: p => omittedSet.add(p.join(',')), rng: null, nodeBudget: Infinity });
    const explicitSet = new Set<string>();
    const r2 = await enumerateFromGate(level, prep, gateKey, { onSolution: p => explicitSet.add(p.join(',')), rng: null, nodeBudget: Infinity, orderBy: 'random' });
    assert.equal(r1.nodes, r2.nodes, 'omitting orderBy and explicitly passing "random" must be byte-for-byte identical');
    assert.deepEqual(omittedSet, explicitSet);
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

// --- rootChildren sharding (worker-pool partitioning) ---

test('rootChildren restricts the search to only those first moves', async () => {
    const { level, prep } = tinyLevel();
    // The gate (0,0) has exactly two real neighbors on this grid: right (1,0) and up (0,1).
    const right = PACK(1, 0);
    const sols: number[][] = [];
    const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => sols.push(p), rng: null, rootChildren: [right] });
    assert.equal(res.exhausted, true);
    assert.ok(sols.length > 0 && sols.length < 6, 'a proper subset of the full 6 solutions');
    for (const p of sols) assert.equal(p[1], right, 'every solution in this shard starts with the shard\'s move');
});

test('the union of two disjoint rootChildren shards equals the unsharded result — the partitioning is sound and complete', async () => {
    const { level, prep } = tinyLevel();
    const full = new Set<string>();
    await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => full.add(p.join(',')), rng: null });

    const right = PACK(1, 0), up = PACK(0, 1);
    const shardA = new Set<string>();
    const shardB = new Set<string>();
    const resA = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => shardA.add(p.join(',')), rng: null, rootChildren: [right] });
    const resB = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => shardB.add(p.join(',')), rng: null, rootChildren: [up] });
    assert.equal(resA.exhausted, true);
    assert.equal(resB.exhausted, true);

    // No overlap (every path diverges at cell 1, the shard's own move) — and the union recovers
    // exactly the full, unsharded solution set. This is the correctness property a worker pool
    // relies on to accumulate every shard's finds without any cross-worker dedup coordination.
    for (const sig of shardA) assert.ok(!shardB.has(sig), 'shards must not overlap');
    const union = new Set([...shardA, ...shardB]);
    assert.deepEqual(union, full);
});

test('a shard entry that is not a real neighbor is safely ignored, never widening the search', async () => {
    const { level, prep } = tinyLevel();
    const right = PACK(1, 0);
    const notANeighbor = PACK(2, 2); // the goal cell itself — not adjacent to the gate
    const sols: number[][] = [];
    const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => sols.push(p), rng: null, rootChildren: [right, notANeighbor] });
    assert.equal(res.exhausted, true);
    for (const p of sols) assert.equal(p[1], right);
});

// --- rootChildrenForGate / planGateShards (Component 8: sharding-plan primitives) ---

test('rootChildrenForGate returns the gate\'s real first-move neighbors', () => {
    const { level, prep } = tinyLevel();
    const children = rootChildrenForGate(level, prep, PACK(0, 0));
    assert.deepEqual([...children].sort((a, b) => a - b), [PACK(0, 1), PACK(1, 0)].sort((a, b) => a - b));
});

test('planGateShards partitions every child into exactly one shard (no overlap, full coverage)', () => {
    const children = [5, 2, 8, 1, 9, 3, 7];
    for (const shardCount of [1, 2, 3, 4, 10]) {
        const shards = planGateShards(children, shardCount);
        const seen = new Map<number, number>(); // child -> how many shards contain it
        for (const shard of shards) {
            assert.ok(shard.length > 0, 'no empty shards');
            for (const c of shard) seen.set(c, (seen.get(c) || 0) + 1);
        }
        assert.deepEqual([...seen.keys()].sort((a, b) => a - b), [...children].sort((a, b) => a - b), `shardCount=${shardCount}: every child covered`);
        assert.ok([...seen.values()].every(count => count === 1), `shardCount=${shardCount}: no child in more than one shard`);
    }
});

test('planGateShards never returns more shards than requested, and never more than there are children', () => {
    assert.equal(planGateShards([1, 2, 3, 4, 5], 2).length, 2);
    assert.equal(planGateShards([1, 2], 8).length, 2, 'fewer children than requested shards: one shard per child, no empty ones');
    assert.equal(planGateShards([], 4).length, 0, 'no children: no shards');
    assert.equal(planGateShards([1], 1).length, 1);
});

test('planGateShards is deterministic regardless of input order', () => {
    const a = planGateShards([5, 2, 8, 1, 9, 3, 7], 3);
    const b = planGateShards([9, 8, 7, 5, 3, 2, 1], 3); // same set, different order
    assert.deepEqual(a, b);
});

test('planGateShards output round-trips through completeFromState as a sound, complete partition', async () => {
    const { level, prep } = tinyLevel();
    const children = rootChildrenForGate(level, prep, PACK(0, 0));
    const shards = planGateShards(children, 2);
    assert.equal(shards.length, 2, 'this gate has exactly 2 real neighbors, so 2 requested shards -> 2 shards');

    const full = new Set<string>();
    await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => full.add(p.join(',')), rng: null });

    const merged = new Set<string>();
    for (const shard of shards) {
        const found = new Set<string>();
        const res = await enumerateFromGate(level, prep, PACK(0, 0), { onSolution: p => found.add(p.join(',')), rng: null, rootChildren: shard });
        assert.equal(res.exhausted, true);
        for (const sig of found) { assert.ok(!merged.has(sig), 'no cross-shard duplicate'); merged.add(sig); }
    }
    assert.deepEqual(merged, full, 'merging every shard reproduces the unsharded complete-enumeration result');
});
