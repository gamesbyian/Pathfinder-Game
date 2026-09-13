import { describe, expect, it } from 'vitest';
import { auditCrossHintEventCollisions } from './hint-provenance-relations.mjs';

function event(overrides: any = {}) {
    return {
        solver: {
            id: 'pathfinder-solver', version: 'abc123', technique: 'beam', scoringProfileId: 'default',
            orderingBiasId: null, beamWidth: 2000, mechanicBucketRetention: false, gateKey: 1,
            forcing: null, attemptIndex: 0,
        },
        search: {
            nodesExpanded: 100, elapsedMs: 10, budgetMs: 1000, workSpent: 100, workBudget: 1000,
            cumulativeNodesExpanded: 100, cumulativeElapsedMs: 10, cumulativeBudgetMs: 1000,
            termination: 'solved', randomSeed: 7, seedSalt: 'x',
        },
        context: { usedExistingHints: false, hintGuided: false, levelRevision: 'rev-1', isolatedTechnique: true },
        foundAt: '2026-09-12T00:00:00.000Z',
        ...overrides,
    };
}

describe('cross-hint provenance relations', () => {
    it('detects one semantic event identity attached to distinct paths on one level', () => {
        const a = event();
        const b = event({
            foundAt: '2026-09-12T00:00:01.000Z',
            search: { ...event().search, elapsedMs: 11, budgetMs: 999, cumulativeElapsedMs: 11 },
        });
        const audit = auditCrossHintEventCollisions([{
            id: 'R00001',
            hintRecords: [
                { path: [1, 2, 3], provenance: [a] },
                { path: [1, 4, 3], provenance: [b] },
            ],
        }]);
        expect(audit.levelsWithCollisions).toBe(1);
        expect(audit.collisionIdentities).toBe(1);
        expect(audit.pathMemberships).toBe(2);
        expect(audit.identitiesByOrigin['pathfinder-solver']).toBe(1);
        expect(audit.identitiesByFacet['isolated-technique']).toBe(1);
        expect(audit.identitiesByTechnique.beam).toBe(1);
        expect(audit.identitiesByProducerKey['pathfinder-solver|abc123|beam']).toBe(1);
        expect(audit.examplesByTechnique.beam).toHaveLength(1);
        expect(audit.examplesByTechnique.beam[0].pathCount).toBe(2);
        expect(audit.examplesByTechnique.beam[0].pathPreviews).toHaveLength(2);
        expect(audit.examples[0].pathLengths).toEqual([3, 3]);
    });

    it('does not call repeated recording on one path a cross-hint collision', () => {
        const a = event();
        const b = event({ foundAt: '2026-09-12T00:00:01.000Z' });
        const audit = auditCrossHintEventCollisions([{
            id: 'R00002', hintRecords: [{ path: [1, 2, 3], provenance: [a, b] }],
        }]);
        expect(audit.collisionIdentities).toBe(0);
    });

    it('keeps genuinely different event identities separate across paths', () => {
        const a = event();
        const b = event({ solver: { ...event().solver, version: 'def456' } });
        const audit = auditCrossHintEventCollisions([{
            id: 'R00003',
            hintRecords: [
                { path: [1, 2, 3], provenance: [a] },
                { path: [1, 4, 3], provenance: [b] },
            ],
        }]);
        expect(audit.collisionIdentities).toBe(0);
    });
});
