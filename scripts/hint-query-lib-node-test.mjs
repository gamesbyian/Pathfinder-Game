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

console.log('hint-query-lib: all tests passed');
