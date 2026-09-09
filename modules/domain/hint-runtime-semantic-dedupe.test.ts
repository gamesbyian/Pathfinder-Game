import { describe, expect, it } from 'vitest';
import {
    dedupeProvenanceEntries,
    mergeHints,
    provenanceEventIdentity,
    reconcileHints,
} from './hint-runtime.mjs';

function event(overrides: any = {}) {
    return {
        solver: {
            id: 'pathfinder-solver',
            version: 'abc123',
            technique: 'beam',
            scoringProfileId: 'default',
            orderingBiasId: null,
            beamWidth: 5000,
            mechanicBucketRetention: false,
            gateKey: 123,
            forcing: null,
            attemptIndex: 2,
        },
        search: {
            nodesExpanded: 12345,
            elapsedMs: 100,
            budgetMs: 8000,
            workSpent: 54321,
            workBudget: 100000,
            cumulativeNodesExpanded: 20000,
            cumulativeElapsedMs: 120,
            cumulativeBudgetMs: 8000,
            termination: 'solved',
            randomSeed: null,
            seedSalt: null,
        },
        context: {
            usedExistingHints: false,
            hintGuided: false,
            levelRevision: 'rev-1',
            isolatedTechnique: false,
        },
        foundAt: '2026-09-09T00:00:00.000Z',
        ...overrides,
    };
}

describe('semantic provenance event identity', () => {
    it('ignores host/time measurements for the same discovery event', () => {
        const a = event();
        const b = event({
            foundAt: '2026-09-09T00:00:01.000Z',
            search: {
                ...event().search,
                elapsedMs: 109,
                budgetMs: 7991,
                cumulativeNodesExpanded: 20001,
                cumulativeElapsedMs: 131,
                cumulativeBudgetMs: 7991,
            },
        });
        expect(provenanceEventIdentity(a)).toBe(provenanceEventIdentity(b));
        expect(dedupeProvenanceEntries([a, b])).toHaveLength(1);
    });

    it('preserves genuinely distinct rediscoveries', () => {
        const a = event();
        const differentCommit = event({ solver: { ...event().solver, version: 'def456' } });
        const differentWork = event({ search: { ...event().search, workSpent: 54322 } });
        expect(dedupeProvenanceEntries([a, differentCommit, differentWork])).toHaveLength(3);
    });

    it('makes mergeHints semantic-dedup safe for every producer', () => {
        const a = event();
        const b = event({ foundAt: '2026-09-09T00:00:02.000Z' });
        const merged = mergeHints(
            [{ path: [1, 2, 3], provenance: [a] }],
            [{ path: [1, 2, 3], provenance: [b] }],
        );
        expect(merged).toHaveLength(1);
        expect(merged[0].provenance).toHaveLength(1);
    });

    it('makes reconcileHints semantic-dedup safe too', () => {
        const a = event();
        const b = event({ foundAt: '2026-09-09T00:00:03.000Z' });
        const reconciled = reconcileHints(
            [[1, 2, 3]],
            [
                { path: [1, 2, 3], provenance: [a] },
                { path: [1, 2, 3], provenance: [b] },
            ],
        );
        expect(reconciled[0].provenance).toHaveLength(1);
    });
});
