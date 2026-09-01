#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifestLib = readFileSync('scripts/experiment-manifest-lib.mjs', 'utf8');
const producer = readFileSync('scripts/collect-variant-family-dataset-shard.mjs', 'utf8');
const familyIndex = readFileSync('scripts/family-index-lib.mjs', 'utf8');
const producerTest = readFileSync('scripts/family-run-manifest-producer-node-test.mjs', 'utf8');
const validatorTest = readFileSync('scripts/experiment-manifest-lib-check.mjs', 'utf8');
const legacyFixture = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15d-family-run-manifest-v1.json',
  'utf8',
));

assert.equal(legacyFixture.schemaVersion, 1);
assert.ok(Object.prototype.hasOwnProperty.call(legacyFixture, 'trove'));
assert.equal(Object.prototype.hasOwnProperty.call(legacyFixture, 'variantFamilyDataset'), false);

// One writer/normalizer owner. New writes are v2 canonical-only.
assert.match(manifestLib, /runId, tool, workflow, corpora, families, variantFamilyDataset,/u);
assert.match(manifestLib, /schemaVersion: 2, runId, solver,/u);
assert.match(manifestLib, /variantFamilyDataset, solverPolicy, budgets, seeds,/u);
assert.doesNotMatch(
  manifestLib,
  /schemaVersion: 1, runId, solver,[\s\S]{0,250}trove, solverPolicy/u,
  'the shared producer helper must not retain a schema-v1 write path',
);

// Permanent historical read is centralized and explicit.
assert.match(manifestLib, /manifest\.schemaVersion === 1/u);
assert.match(manifestLib, /const \{ trove, \.\.\.rest \} = manifest/u);
assert.match(manifestLib, /schemaVersion: 2, variantFamilyDataset: trove/u);
assert.match(manifestLib, /manifest\.schemaVersion === 2/u);
assert.match(manifestLib, /cannot contain both trove and variantFamilyDataset/u);

// The actual maintained producer single-writes canonical vocabulary.
assert.match(producer, /variantFamilyDataset: \{ manifest:/u);
assert.doesNotMatch(producer, /\btrove:\s*\{\s*manifest:/u);

// Family-index consumes only the normalized canonical model. Phase-15E historical filename
// discovery is intentionally not part of this row and is allowed to retain wide-trove-attempts-*.
assert.match(familyIndex, /variantFamilyDatasetRunIdentity\(/u);
assert.match(familyIndex, /variantFamilyDataset: variantFamilyDatasetRunIdentity\(shard\.variantFamilyDataset\)/u);
assert.match(familyIndex, /variantFamilyDatasetShardFiles/u);
assert.match(familyIndex, /const \{ shardFile: _shardFile, \.\.\.runIdentity \} = dataset/u);
assert.doesNotMatch(familyIndex, /\bshard\.trove\b/u);
assert.doesNotMatch(familyIndex, /\btrove:\s*shard\.trove\b/u);
assert.match(familyIndex, /wide-trove-attempts-/u);

// Tests pin all-legacy, all-canonical, mixed-era, conflict, and canonical-only writer behavior.
assert.match(producerTest, /\['v1', 'v1'\]/u);
assert.match(producerTest, /\['v2', 'v2'\]/u);
assert.match(producerTest, /\['v1', 'v2'\]/u);
assert.match(producerTest, /new producers must single-write only the canonical dataset field/u);
assert.match(validatorTest, /phase15d-family-run-manifest-v1\.json/u);
assert.match(validatorTest, /cannot contain both trove and variantFamilyDataset/u);

console.log('Phase-15D closeout clean: new family-run manifests are v2 canonical-only; v1 normalizes permanently through one owner; Phase-15E path vocabulary remains untouched.');
