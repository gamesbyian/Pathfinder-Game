import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { PACK } from './encoding.js';
import { isParityCompatibleEndpoint } from './false-goal-trigger-search.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors } from './search-state.js';

function makePortalLevel(twist = false): NormalizedLevel {
    const portalA = PACK(1, 1);
    const portalB = twist ? PACK(2, 1) : PACK(3, 1);
    return {
        grid: { w: 4, h: 3 },
        gateKeys: [PACK(0, 1)],
        goalKey: PACK(3, 2),
        requiredLength: 5,
        requiredIntersections: 2,
        blockSet: new Set(),
        portalMap: new Map([
            [portalA, { dest: portalB, color: '#fff' }],
            [portalB, { dest: portalA, color: '#fff' }],
        ]),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('visited portal terminals cannot be re-entered by ordinary move generation', () => {
    const level = makePortalLevel(false);
    const prep = prepLevel(level);
    const gate = level.gateKeys[0];
    const portalA = PACK(1, 1);
    const state = createState(gate, level, prep);
    state.visited[portalA] = 1;

    assert.equal(getNeighbors(gate, state, level, prep).includes(portalA), false);
});

test('applyMove charges a visited target on a portal jump to the intersection budget', () => {
    const level = makePortalLevel(false);
    const prep = prepLevel(level);
    const portalA = PACK(1, 1);
    const portalB = PACK(3, 1);
    const state = createState(portalA, level, prep);
    state.visited[portalB] = 1;

    applyMove(portalB, state, level, prep, true);

    assert.equal(state.portalJumps, 1);
    assert.equal(state.ints, 1, 'portal-jump revisits use the same visited-cell intersection accounting');
});

test('prep records no twist portals when every portal pair preserves cell parity', () => {
    const sameParity = makePortalLevel(false);
    const twist = makePortalLevel(true);

    assert.equal(prepLevel(sameParity).parityPortalDistMaps?.length ?? 0, 0);
    assert.equal(prepLevel(twist).parityPortalDistMaps?.length ?? 0, 1);
});

test('false-goal endpoint parity already applies the ordinary invariant through same-parity portals', () => {
    const sameParity = makePortalLevel(false);
    sameParity.requiredLength = 2;
    sameParity.gateKeys = [PACK(0, 0)];
    const incompatible = PACK(1, 0); // gate parity 0 + even counted length requires endpoint parity 0
    assert.equal(isParityCompatibleEndpoint(sameParity, incompatible), false);

    const twist = makePortalLevel(true);
    twist.requiredLength = 2;
    twist.gateKeys = [PACK(0, 0)];
    assert.equal(isParityCompatibleEndpoint(twist, incompatible), true,
        'a twist portal conservatively leaves both endpoint parities possible');
});
