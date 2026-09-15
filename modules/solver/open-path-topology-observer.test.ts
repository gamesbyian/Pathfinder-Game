import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { PACK } from './encoding.js';
import { observeOpenPathTopology, observeOpenPathTopologyGaugeFixture } from './open-path-topology-observer.js';

function level(): NormalizedLevel {
    return { grid: { w: 7, h: 7 }, gateKeys: [PACK(0, 3)], goalKey: PACK(6, 3), requiredLength: 6,
        requiredIntersections: 0, blockSet: new Set([PACK(3, 3)]), gooseSet: new Set(), portalMap: new Map(),
        filterMap: new Map(), flippingFilterMap: new Map(), falseGoalKeys: new Set(), mustPassKeys: [], mustCrossKeys: [], requiredItems: [], allowedExitDirs: null } as unknown as NormalizedLevel;
}
const K = (x: number, y: number) => PACK(x, y);

test('endpoint-fixed grid homotopy preserves lifted open-path phase without endpoint closure', () => {
    const a = [K(0, 3), K(1, 3), K(1, 2), K(2, 2), K(3, 2), K(4, 2), K(5, 2), K(5, 3), K(6, 3)];
    const b = [K(0, 3), K(0, 2), K(1, 2), K(2, 2), K(3, 2), K(4, 2), K(5, 2), K(6, 2), K(6, 3)];
    const oa = observeOpenPathTopology(level(), a), ob = observeOpenPathTopology(level(), b);
    assert.equal(oa.endpointGeometryKey, ob.endpointGeometryKey);
    assert.ok(Math.abs(oa.phases[0].phaseTurns - ob.phases[0].phaseTurns) < 1e-12);
    assert.notEqual(oa.phases[0].phaseTurns, Math.round(oa.phases[0].phaseTurns), 'open phase must not be rounded to winding');
});

test('branch perturbation is a pure gauge shift and leaves the integrated phase invariant', () => {
    const path = [K(0, 3), K(1, 3), K(1, 2), K(2, 2), K(3, 2), K(4, 2), K(5, 2), K(6, 2), K(6, 3)];
    const a = observeOpenPathTopologyGaugeFixture(level(), path, 0), b = observeOpenPathTopologyGaugeFixture(level(), path, 0.5);
    assert.equal(a.phases[0].phaseTurns, b.phases[0].phaseTurns);
    const startShift = b.phases[0].liftedStartTurns - a.phases[0].liftedStartTurns;
    const endShift = b.phases[0].liftedEndTurns - a.phases[0].liftedEndTurns;
    assert.ok(Math.abs(startShift - endShift) < 1e-12, 'gauge shift must be identical at both endpoints');
});

test('endpoint identity conditions the observation and a portal jump abstains', () => {
    const a = observeOpenPathTopology(level(), [K(0, 3), K(1, 3), K(1, 2)]);
    const b = observeOpenPathTopology(level(), [K(0, 3), K(1, 3), K(2, 3)]);
    assert.notEqual(a.endpointGeometryKey, b.endpointGeometryKey);
    const portal = level(); portal.portalMap = new Map([[K(0, 3), { dest: K(6, 3) }], [K(6, 3), { dest: K(0, 3) }]]);
    const excluded = observeOpenPathTopology(portal, [K(0, 3), K(6, 3)]);
    assert.equal(excluded.portalExcluded, true);
    assert.deepEqual(excluded.phases, []);
});
