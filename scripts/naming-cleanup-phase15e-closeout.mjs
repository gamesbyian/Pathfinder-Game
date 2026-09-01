#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const familyIndex = readFileSync('scripts/family-index-lib.mjs', 'utf8');
const merger = readFileSync('scripts/merge-variant-family-dataset-shards.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/collect-variant-family-dataset.yml', 'utf8');
const mergerTest = readFileSync('scripts/naming-cleanup-phase15e-merge-node-test.mjs', 'utf8');
const indexTest = readFileSync('scripts/family-index-lib-check.mjs', 'utf8');

// NC-P15-003: one discovery owner reads both eras and reconciles exact logical variant rows.
// Canonical evidence wins only an exact overlap; a partial canonical aggregate must not suppress
// historical-only rows elsewhere in the same corpus.
assert.match(familyIndex, /FAMILY_ATTEMPT_ARTIFACT_RE/u);
assert.match(familyIndex, /variant-family-dataset/u);
assert.match(familyIndex, /wide-trove/u);
assert.match(familyIndex, /reconcileFamilyAttemptAggregateEvidence/u);
assert.match(familyIndex, /familyAttemptLogicalRowKey/u);
assert.match(familyIndex, /historicalDuplicateRowsReplacedByCanonical/u);
assert.match(familyIndex, /historicalRowsPreservedFromPartialCanonical/u);
assert.match(familyIndex, /historicalConflictingRowsPreserved/u);
assert.doesNotMatch(familyIndex, /selectFamilyAttemptEvidenceFiles/u,
    'corpus-wide canonical filename precedence must not return');
assert.match(indexTest, /historical aggregate evidence/u);
assert.match(indexTest, /2026-08-07-wide-trove-attempts-corpus-a-part01/u,
    'permanent historical discovery proof must use the authentic dated wide-trove convention');
assert.match(indexTest, /partial canonical aggregate must not hide historical-only logical rows/u);
assert.match(indexTest, /historicalRowsPreservedFromPartialCanonical/u);
assert.match(indexTest, /different observations for the same logical variant must both survive/u);

// NC-P15-009: every current writer/workflow output uses stable canonical paths.
assert.match(merger, /reports\/families\/variant-family-dataset-summary\.md/u);
assert.match(merger, /variant-family-dataset-attempts-/u);
assert.doesNotMatch(merger, /reports\/families\/2026-08-07-wide-trove-summary\.md/u);
assert.doesNotMatch(merger, /2026-08-07-wide-trove-attempts-\$\{corpus\}/u);
assert.match(merger, /CANONICAL_ATTEMPT_RE/u);
assert.match(merger, /unlinkSync/u);

for (const canonical of [
    'reports/families/variant-family-dataset-summary.md',
    'reports/families/variant-family-dataset-attempts-*.json',
    'reports/families/variant-family-dataset-source-run.json',
]) {
    assert.ok(workflow.includes(canonical), `workflow must use canonical current artifact path ${canonical}`);
}
for (const retiredCurrent of [
    'reports/families/2026-08-07-wide-trove-summary.md',
    'reports/families/2026-08-07-wide-trove-attempts-*.json',
    'reports/families/2026-08-07-wide-trove-source-run.json',
]) {
    assert.equal(workflow.includes(retiredCurrent), false,
        `workflow must not manufacture dated historical path ${retiredCurrent}`);
}
assert.match(workflow, /git add -A -- 'reports\/families\/variant-family-dataset-attempts-\*\.json'/u,
    'workflow must stage stale canonical chunk deletions as well as new chunks');
assert.match(mergerTest, /stale prior canonical chunks/u);
assert.match(mergerTest, /writer must never delete frozen wide-trove historical evidence/u);

console.log('Phase-15E closeout clean: mixed-era attempt discovery reconciles exact logical rows, canonical current outputs are single-write, and stale stable chunks cannot survive reruns.');
