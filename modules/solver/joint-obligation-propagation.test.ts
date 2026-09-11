import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { AXIS_H } from './encoding.js';
import { evaluatePrunedMove } from './hard-prune-pipeline.js';
import { evaluateObligationClusters, findObligationClusters } from './joint-obligation-propagation.js';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { createState } from './search-state.js';
import type { JointObligationRecord } from './types.js';

/** A must-cross cell at (1,1) whose H-axis neighbors are (0,1) [plain] and (2,1) [a portal
 *  terminal paired with (3,1)]. No other mechanics — isolates the joint-obligation derivation
 *  from every other prune. */
function makeLevel(): NormalizedLevel {
    const mcKey = PACK(1, 1);
    const portalNeighbor = PACK(2, 1);
    const portalFar = PACK(3, 1);
    return {
        grid: { w: 5, h: 3 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(4, 2),
        requiredLength: 10,
        requiredIntersections: 1,
        blockSet: new Set(),
        portalMap: new Map([
            [portalNeighbor, { dest: portalFar, color: '#fff' }],
            [portalFar, { dest: portalNeighbor, color: '#fff' }],
        ]),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [mcKey],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('finds the must-cross/portal-terminal obligation cluster from level geometry alone', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const clusters = findObligationClusters(level, prep);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].kind, 'must-cross-portal-forced-neighbor');
    assert.equal(clusters[0].mustCrossKey, PACK(1, 1));
    assert.equal(clusters[0].neighborKey, PACK(2, 1));
    assert.equal(clusters[0].axis, AXIS_H);
});

test('rejects when the forced-neighbor portal terminal is already visited', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);
    state.visited[PACK(2, 1)] = 1; // portal terminal already visited elsewhere in the path

    const results = evaluateObligationClusters(PACK(1, 2), state, level, prep);
    assert.equal(results.length, 1);
    assert.equal(results[0].verdict, 'reject');
    assert.equal(results[0].reasonFamily, 'visited-portal-terminal-forced-neighbor');
});

test('passes when the forced-neighbor portal terminal is not yet visited', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);

    const results = evaluateObligationClusters(PACK(1, 2), state, level, prep);
    assert.equal(results.length, 1);
    assert.equal(results[0].verdict, 'pass');
});

test('is inactive once the must-cross cell is satisfied', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);
    state.visited[PACK(2, 1)] = 1;
    state.mustCrossMask = 0; // satisfied

    assert.deepEqual(evaluateObligationClusters(PACK(1, 2), state, level, prep), []);
});

test('is inactive once this axis is already used', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);
    state.visited[PACK(2, 1)] = 1;
    state.edgeUsage[PACK(1, 1)] |= AXIS_H;

    assert.deepEqual(evaluateObligationClusters(PACK(1, 2), state, level, prep), []);
});

test('exempts pos itself from the forced-neighbor check', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);
    state.visited[PACK(2, 1)] = 1;

    // The just-landed cell IS the forced neighbor: it may be serving that role right now.
    assert.deepEqual(evaluateObligationClusters(PACK(2, 1), state, level, prep), []);
});

test('abstains when the forced-neighbor portal terminal is itself a pending must-cross cell', () => {
    const mcKey = PACK(1, 1);
    const portalNeighbor = PACK(2, 1); // also a must-cross cell in this variant
    // portalFar is deliberately far from both must-cross cells so it forms no cluster of its own —
    // isolates the one compound cluster this test targets (mcKey's forced neighbor is itself
    // must-cross) from the unrelated "portalNeighbor's own neighbors" clusters that would appear
    // if portalFar were adjacent to it too.
    const portalFar = PACK(4, 0);
    const level = {
        ...makeLevel(),
        portalMap: new Map([
            [portalNeighbor, { dest: portalFar, color: '#fff' }],
            [portalFar, { dest: portalNeighbor, color: '#fff' }],
        ]),
        mustCrossKeys: [mcKey, portalNeighbor],
    } as unknown as NormalizedLevel;
    const prep = prepLevel(level);
    const state = createState(PACK(0, 0), level, prep);
    state.visited[portalNeighbor] = 1;

    const results = evaluateObligationClusters(PACK(1, 2), state, level, prep);
    assert.equal(results.length, 1);
    assert.equal(results[0].verdict, 'abstain');
    assert.equal(results[0].reasonFamily, 'neighbor-also-pending-must-cross');
});

test('observer-only: attaching the observer never changes evaluatePrunedMove\'s own verdict', () => {
    const level = makeLevel();
    const runOnce = (withObserver: boolean) => {
        const prep = prepLevel(level);
        prep._cfg = null;
        const observed: JointObligationRecord[] = [];
        if (withObserver) prep._jointObligationObserver = { observe: (r) => observed.push(r) };
        const state = createState(PACK(0, 0), level, prep);
        state.visited[PACK(2, 1)] = 1;
        const verdict = evaluatePrunedMove(PACK(1, 2), 1, state, level, prep, null, false);
        return { verdict, observedCount: observed.length };
    };
    const off = runOnce(false);
    const on = runOnce(true);
    assert.equal(on.verdict, off.verdict, 'observer presence must never change the prune verdict');
    assert.equal(on.observedCount, 1, 'the active cluster on this fixture is expected to be observed exactly once');
});
