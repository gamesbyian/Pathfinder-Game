/**
 * WS2-CUT-BALANCE-PROJECTION (BC1) theorem port: same counterexample suite as
 * scripts/stress/cut-bridge-excursion-lib-node-test.mjs's Stage-A tests, translated to the
 * numeric-node-id shape `connectivityResearchSnapshot` actually produces, to cross-validate this
 * TS copy against the original offline theorem helper.
 */
import { describe, expect, test } from 'vitest';
import { findBridgeExcursionConflicts, findMultigraphBridges } from './topology.js';

const CURRENT = 1, GOAL = 2, POCKET = 3, AUX = 4;
const pocketGraph = [
    { id: 'near', a: CURRENT, b: GOAL, kind: 'cardinal' as const },
    { id: 'bridge', a: CURRENT, b: POCKET, kind: 'cardinal' as const },
];

describe('findBridgeExcursionConflicts (BC1)', () => {
    test('bridge-pocket positive: stranding a pending cell behind the only interface is a conflict', () => {
        const positive = findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET], edges: pocketGraph, current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        });
        expect(positive.eligible).toBe(true);
        expect(positive.conflicts.map(row => row.edgeId)).toEqual(['bridge']);
        expect(positive.conflicts[0].farPendingIds).toEqual([POCKET]);
    });

    test('goal across the bridge: one traversal suffices, must not reject', () => {
        const goalAcross = findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET], edges: pocketGraph, current: CURRENT, goal: POCKET, pendingMandatory: [],
        });
        expect(goalAcross.conflicts).toEqual([]);
    });

    test('two-interface cycle: no single-use bridge exists', () => {
        const cycleGraph = [
            { id: 'c1', a: CURRENT, b: POCKET, kind: 'cardinal' as const },
            { id: 'c2', a: CURRENT, b: AUX, kind: 'cardinal' as const },
            { id: 'c3', a: AUX, b: POCKET, kind: 'cardinal' as const },
            { id: 'cg', a: CURRENT, b: GOAL, kind: 'cardinal' as const },
        ];
        expect(findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET, AUX], edges: cycleGraph, current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        }).conflicts).toEqual([]);
    });

    test('parallel cardinal + portal multiedge is not a bridge (critical multigraph counterexample)', () => {
        const parallel = [
            { id: 'cardinal', a: CURRENT, b: POCKET, kind: 'cardinal' as const },
            { id: 'portal', a: CURRENT, b: POCKET, kind: 'portal' as const },
            { id: 'goal-edge', a: CURRENT, b: GOAL, kind: 'cardinal' as const },
        ];
        expect(findMultigraphBridges([CURRENT, GOAL, POCKET], parallel).map(edge => edge.id)).toEqual(['goal-edge']);
        expect(findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET], edges: parallel, current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        }).conflicts).toEqual([]);
    });

    test('nested bridges can both independently certify the same far mandatory target', () => {
        const MID = 5, FAR = 6;
        const nested = findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, MID, FAR],
            edges: [
                { id: 'goal-edge', a: CURRENT, b: GOAL, kind: 'cardinal' as const },
                { id: 'outer', a: CURRENT, b: MID, kind: 'cardinal' as const },
                { id: 'inner', a: MID, b: FAR, kind: 'cardinal' as const },
            ],
            current: CURRENT, goal: GOAL, pendingMandatory: [FAR],
        });
        expect(nested.conflicts.map(row => row.edgeId)).toEqual(['inner', 'outer']);
    });

    test('ordinary reachability failures are reported as ineligible, not incremental evidence', () => {
        const disconnected = findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET], edges: [{ id: 'goal-edge', a: CURRENT, b: GOAL, kind: 'cardinal' as const }],
            current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        });
        expect(disconnected.eligible).toBe(false);
        expect(disconnected.reason).toBe('ordinary-connectivity-fails');
        expect(disconnected.unreachableIds).toEqual([POCKET]);
    });

    test('input ordering does not change the result', () => {
        const positive = findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET], edges: pocketGraph, current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        });
        const reversed = findBridgeExcursionConflicts({
            nodes: [...[CURRENT, GOAL, POCKET]].reverse(), edges: [...pocketGraph].reverse(),
            current: CURRENT, goal: GOAL, pendingMandatory: [POCKET],
        });
        expect(reversed.conflicts).toEqual(positive.conflicts);
    });

    test('rejects a duplicate edge id', () => {
        expect(() => findBridgeExcursionConflicts({
            nodes: [CURRENT, GOAL, POCKET],
            edges: [
                { id: 'dup', a: CURRENT, b: GOAL, kind: 'cardinal' as const },
                { id: 'dup', a: CURRENT, b: POCKET, kind: 'cardinal' as const },
            ],
            current: CURRENT, goal: GOAL, pendingMandatory: [],
        })).toThrow(/duplicate bridge-excursion edge id/u);
    });
});
