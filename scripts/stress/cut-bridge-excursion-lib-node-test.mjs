import assert from 'node:assert/strict';

import {
    findBridgeExcursionConflicts,
    findMultigraphBridges,
} from './cut-bridge-excursion-lib.mjs';

const nodes = ['current', 'goal', 'pocket'];
const pocketGraph = [
    { id: 'near', a: 'current', b: 'goal', kind: 'cardinal' },
    { id: 'bridge', a: 'current', b: 'pocket', kind: 'cardinal' },
];

const positive = findBridgeExcursionConflicts({
    nodes,
    edges: pocketGraph,
    current: 'current',
    goal: 'goal',
    pendingMandatory: ['pocket'],
});
assert.equal(positive.eligible, true);
assert.deepEqual(positive.conflicts.map(row => row.edgeId), ['bridge']);
assert.deepEqual(positive.conflicts[0].farPendingIds, ['pocket']);

// Goal across the bridge: one traversal is enough, so this theorem must not reject.
const goalAcross = findBridgeExcursionConflicts({
    nodes,
    edges: pocketGraph,
    current: 'current',
    goal: 'pocket',
    pendingMandatory: [],
});
assert.deepEqual(goalAcross.conflicts, []);

// Two distinct interfaces form a cycle, so there is no single-use bridge excursion conflict.
const cycleGraph = [
    { id: 'c1', a: 'current', b: 'pocket', kind: 'cardinal' },
    { id: 'c2', a: 'current', b: 'aux', kind: 'cardinal' },
    { id: 'c3', a: 'aux', b: 'pocket', kind: 'cardinal' },
    { id: 'cg', a: 'current', b: 'goal', kind: 'cardinal' },
];
assert.deepEqual(
    findBridgeExcursionConflicts({
        nodes: ['current', 'goal', 'pocket', 'aux'],
        edges: cycleGraph,
        current: 'current',
        goal: 'goal',
        pendingMandatory: ['pocket'],
    }).conflicts,
    [],
);

// Critical multigraph counterexample: cardinal + portal are parallel transition resources.
// Collapsing by endpoint pair would incorrectly manufacture a bridge.
const parallel = [
    { id: 'cardinal', a: 'current', b: 'pocket', kind: 'cardinal' },
    { id: 'portal', a: 'current', b: 'pocket', kind: 'portal' },
    { id: 'goal-edge', a: 'current', b: 'goal', kind: 'cardinal' },
];
assert.deepEqual(
    findMultigraphBridges(['current', 'goal', 'pocket'], parallel).map(edge => edge.id),
    ['goal-edge'],
);
assert.deepEqual(
    findBridgeExcursionConflicts({
        nodes: ['current', 'goal', 'pocket'],
        edges: parallel,
        current: 'current',
        goal: 'goal',
        pendingMandatory: ['pocket'],
    }).conflicts,
    [],
);

// Nested bridges can both independently certify the same far mandatory target.
const nested = findBridgeExcursionConflicts({
    nodes: ['current', 'goal', 'mid', 'far'],
    edges: [
        { id: 'goal-edge', a: 'current', b: 'goal' },
        { id: 'outer', a: 'current', b: 'mid' },
        { id: 'inner', a: 'mid', b: 'far' },
    ],
    current: 'current',
    goal: 'goal',
    pendingMandatory: ['far'],
});
assert.deepEqual(nested.conflicts.map(row => row.edgeId), ['inner', 'outer']);

// Ordinary reachability failures are not counted as incremental bridge-excursion evidence.
const disconnected = findBridgeExcursionConflicts({
    nodes: ['current', 'goal', 'pocket'],
    edges: [{ id: 'goal-edge', a: 'current', b: 'goal' }],
    current: 'current',
    goal: 'goal',
    pendingMandatory: ['pocket'],
});
assert.equal(disconnected.eligible, false);
assert.equal(disconnected.reason, 'ordinary-connectivity-fails');
assert.deepEqual(disconnected.unreachableIds, ['pocket']);

// Input ordering must not change the theorem result.
const reversed = findBridgeExcursionConflicts({
    nodes: [...nodes].reverse(),
    edges: [...pocketGraph].reverse(),
    current: 'current',
    goal: 'goal',
    pendingMandatory: ['pocket'],
});
assert.deepEqual(reversed.conflicts, positive.conflicts);

assert.throws(
    () => findBridgeExcursionConflicts({
        nodes,
        edges: [
            { id: 'dup', a: 'current', b: 'goal' },
            { id: 'dup', a: 'current', b: 'pocket' },
        ],
        current: 'current',
        goal: 'goal',
    }),
    /duplicate edge id/u,
);

console.log('cut bridge-excursion theorem tests passed');
