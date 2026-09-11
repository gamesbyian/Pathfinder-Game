#!/usr/bin/env node
/**
 * Defense-in-depth coverage for hint-query-lib.mjs's retryTier normalization: no legacy retryTier
 * value is currently persisted in data/hints/, but queryHintRecords/summarizeHintRecords route it
 * through normalizeSolverStageId() anyway so a historical hint record carrying a legacy stage id
 * is grouped/matched under its canonical form rather than as a separate value.
 */
import assert from 'node:assert/strict';
import { compactHintRecord, queryHintRecords, summarizeHintRecords } from './hint-query-lib.mjs';

const legacyHint = { path: [1, 2], provenance: [{ solver: { id: 's', forcing: { retryTier: 'repair-late-probe' } } }] };
const canonicalHint = { path: [1, 2], provenance: [{ solver: { id: 's', forcing: { retryTier: 'late-repair-search' } } }] };

const compact = compactHintRecord(legacyHint, 0);
assert.deepEqual(compact.retryTiers, ['late-repair-search'], 'a legacy retryTier value must normalize to its canonical form');

const summary = summarizeHintRecords([legacyHint, canonicalHint]);
assert.deepEqual(summary.retryTiers, { 'late-repair-search': 2 },
    'legacy and canonical retryTier values must collapse to one count, not two separate entries');

const byLegacyQuery = queryHintRecords([legacyHint, canonicalHint], { retryTier: 'repair-late-probe' });
assert.equal(byLegacyQuery.length, 2, 'querying by the legacy retryTier name must still match canonically-tagged records');
const byCanonicalQuery = queryHintRecords([legacyHint, canonicalHint], { retryTier: 'late-repair-search' });
assert.equal(byCanonicalQuery.length, 2);

const cold = {
    path: [1, 3],
    provenance: [{
        solver: { id: 'pathfinder-solver', version: 'v2', technique: 'dfs', forcing: null },
        search: { workSpent: 10 },
        context: { isolatedTechnique: false, hintGuided: false, usedExistingHints: false },
        foundAt: '2026-01-01T00:00:00Z',
    }],
};
const current = queryHintRecords([legacyHint, cold], {
    evidencePurpose: 'current-production-capability',
    evidenceApplicability: 'admissible',
    comparableSolverVersions: ['v2'],
});
assert.equal(current.length, 1, 'purpose query admits only evidence from an explicitly comparable regime');
assert.equal(current[0].compact.evidence.admissibleDependencyStrata, 1);
assert.equal(queryHintRecords([cold], {
    evidencePurpose: 'current-production-capability', evidenceApplicability: 'admissible',
}).length, 0, 'capability query without a comparison regime fails closed');

const unattributedAtlas = compactHintRecord({ path: [1, 4], provenance: [] }, 0, {
    evidencePurpose: 'solution-atlas',
});
assert.equal(unattributedAtlas.evidence.applicabilityCounts.admissible, 1,
    'an unattributed referee-valid path remains atlas evidence');

console.log('hint-query-lib: all tests passed');
