import { describe, expect, it } from 'vitest';

import {
    buildMap,
    classifyRow,
    lifecycleTechniqueOrder,
} from '../scripts/stress/lifecycle-failure-map.mjs';

function stage({ reached = false, exhausted = false, nodes = 0, work = 0 } = {}) {
    return {
        mechanicallyEligible: true,
        instantiated: true,
        reached,
        skippedBecauseSolvedEarlier: false,
        starvedByNodeBudget: false,
        starvedByWorkBudget: false,
        skippedByRoutingOrConfiguration: false,
        exhaustedSearchSpace: exhausted,
        attempts: reached ? 1 : 0,
        actualNodes: nodes,
        actualWork: work,
        bestProgress: [],
    };
}

describe('lifecycle failure map stage discovery', () => {
    it('attributes a solve to a later stage unknown to older analyzers', () => {
        const row = {
            id: 'R02088-fixture',
            ok: true,
            status: 'solved',
            nodesExpanded: 100,
            workSpent: 200,
            techniqueLifecycle: {
                'repair-probe': stage({ reached: true, exhausted: true, nodes: 10, work: 20 }),
                'main-ladder': stage({ reached: true, exhausted: true, nodes: 20, work: 40 }),
                'admissible-order': stage({ reached: true, exhausted: true, nodes: 30, work: 60 }),
                'dedup-near-tie-retry': stage(),
                'admissible-order-non-default-retry': stage({ reached: true, exhausted: true, nodes: 15, work: 30 }),
                'connectivity-axis-exhausted-retry': stage({ reached: true, nodes: 25, work: 50 }),
                'future-stage-added-after-this-test': stage(),
            },
        };

        expect(classifyRow(row).winningTechnique).toBe('connectivity-axis-exhausted-retry');
        expect(buildMap([row]).winningTechnique).toEqual({
            'connectivity-axis-exhausted-retry': 1,
        });
    });

    it('discovers and aggregates stages from artifact telemetry instead of a fixed registry', () => {
        const oldRow = {
            id: 'old',
            ok: false,
            status: 'node-budget-reached',
            nodesExpanded: 10,
            workSpent: 20,
            techniqueLifecycle: {
                'repair-probe': stage({ reached: true, nodes: 10, work: 20 }),
                'main-ladder': stage(),
            },
        };
        const newerRow = {
            id: 'new',
            ok: false,
            status: 'node-budget-reached',
            nodesExpanded: 30,
            workSpent: 60,
            techniqueLifecycle: {
                'repair-probe': stage({ reached: true, nodes: 10, work: 20 }),
                'main-ladder': stage({ reached: true, nodes: 10, work: 20 }),
                'brand-new-retry-stage': stage({ reached: true, nodes: 10, work: 20 }),
            },
        };

        expect(lifecycleTechniqueOrder([oldRow, newerRow])).toEqual([
            'repair-probe',
            'main-ladder',
            'brand-new-retry-stage',
        ]);

        const map = buildMap([oldRow, newerRow]);
        expect(map.techniqueOrder).toContain('brand-new-retry-stage');
        expect(map.techniques['brand-new-retry-stage'].reached).toBe(1);
        expect(map.techniques['brand-new-retry-stage'].nodes).toBe(10);
    });
});
