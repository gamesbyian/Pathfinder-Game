#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import { troveRootArg } from './family-paths.mjs';
import { extractExplicitPrefixCases } from './stress/cpsat-explicit-prefix-reference-lib.mjs';

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const record = readFileSync('docs/naming-cleanup-phase-records/phase-15.md', 'utf8');

assert.equal(ledger.lastCompletedPhase, 14, '15A must not advance Phase 15 completion');
assert.equal(ledger.phaseExecutionRecords?.['15'], 'docs/naming-cleanup-phase-records/phase-15.md');
assert.deepEqual(ledger.phaseBatches?.['15'], ['15A','15B','15C','15D','15E','15F','15G','15H','15I','15J']);
assert.equal(ledger.phaseBatchKinds?.['15']?.['15A'], 'specification-gate');
assert.equal(ledger.phaseBatchKinds?.['15']?.['15I'], 'merged-tree-closeout');
assert.equal(ledger.phaseBatchKinds?.['15']?.['15J'], 'finalization');
assert.equal(ledger.activeExecution?.phase, 15);
assert.equal(ledger.activeExecution?.batch, '15B');
assert.equal(ledger.activeExecution?.recordPath, 'docs/naming-cleanup-phase-records/phase-15.md');

const phase15 = ledger.entries.filter(row => row.phase === 15);
assert.equal(phase15.length, 13, '15A should resolve to thirteen homogeneous implementation rows');
assert.equal(ledger.batchCompletions?.['15A']?.status, 'merged');\nassert.equal(ledger.batchCompletions?.['15A']?.pr, 1638);\nassert.equal(ledger.batchCompletions?.['15A']?.mergeCommit, '4b61b59dfba6dada48f316edcdb6e9b4daa6683e');\nassert.equal(phase15.find(row => row.id === 'NC-P15-006')?.status, 'in-progress');\nassert.ok(phase15.filter(row => row.id !== 'NC-P15-006').every(row => row.status === 'pending'), '15B must leave later implementation rows pending');

const byId = Object.fromEntries(phase15.map(row => [row.id, row]));
assert.deepEqual(
  phase15.filter(row => row.persistence === 'dual-read').map(row => row.id).sort(),
  ['NC-P15-001', 'NC-P15-002', 'NC-P15-003', 'NC-P15-011', 'NC-P15-012'],
  '15A must keep dual-read only for boundaries with an identified current legacy reader/caller',
);
assert.equal(byId['NC-P15-002'].compatibility?.mode, 'permanent-historical-read');
assert.match(byId['NC-P15-002'].new, /schemaVersion 2/u);
assert.equal(byId['NC-P15-004'].persistence, 'none', 'application-local fingerprint rename must not invent a persisted generic-field adapter');
assert.equal(byId['NC-P15-007'].persistence, 'none', 'prune-gap CLI rename must not invent an unproven compatibility reader');
assert.match(byId['NC-P15-005'].new, /schemaVersion 2/u);
assert.equal(byId['NC-P15-005'].persistence, 'none', 'same-run CP-SAT result combiner must not imply a nonexistent historical reader');
assert.equal('compatibility' in byId['NC-P15-005'], false, 'NC-P15-005 must not carry a synthetic dual-read policy');
assert.match(byId['NC-P15-012'].new, /schemaVersion 2/u);
assert.equal(byId['NC-P15-013'].migrationClass, 'current-surface-rename-preserve-frozen-history');
assert.match(record, /separately deferred vocabulary debt/u);
assert.match(record, /repairLateProbe/u);

// 15A is specification-only. These checks deliberately pin the old executable surfaces so an
// accidental implementation rename cannot hide inside the entry/control-plane PR.
const familyPaths = readFileSync('scripts/family-paths.mjs', 'utf8');
assert.match(familyPaths, /--trove-root=/u);
assert.match(familyPaths, /troveRootArg/u);
assert.doesNotMatch(familyPaths, /--variant-family-dataset-root=/u);
assert.equal(
  troveRootArg(['--trove-root=tmp/phase15-legacy-family-root']),
  path.resolve('tmp/phase15-legacy-family-root'),
  'current shared dataset-root parser must still execute the legacy CLI before 15C',
);

const manifestLib = readFileSync('scripts/experiment-manifest-lib.mjs', 'utf8');
assert.match(manifestLib, /'trove'/u);
assert.match(manifestLib, /manifest\.schemaVersion !== 1/u);

const mergeFamily = readFileSync('scripts/merge-variant-family-dataset-shards.mjs', 'utf8');
assert.match(mergeFamily, /2026-08-07-wide-trove/u);

assert.ok(existsSync('scripts/stress/lib/atlas-eligibility.mjs'));
assert.ok(!existsSync('scripts/stress/lib/cpsat-branch-label-eligibility.mjs'));

const cpsatReference = readFileSync('scripts/stress/cpsat-explicit-prefix-reference.mjs', 'utf8');
assert.match(cpsatReference, /oracleLabel/u);
assert.match(cpsatReference, /oracleReason/u);

const cpsatWorkflow = readFileSync('.github/workflows/cpsat-explicit-prefix-reference.yml', 'utf8');
assert.match(cpsatWorkflow, /oracle-shards:/u);
assert.match(cpsatWorkflow, /atlas-abstain/u);

const prefixCollector = readFileSync('scripts/stress/collect-known-solution-prefix-branches.mjs', 'utf8');
assert.match(prefixCollector, /schemaVersion: 1/u);
assert.match(prefixCollector, /oracle-abstain/u);

const legacyPrefixDocument = JSON.parse(readFileSync('docs/naming-cleanup-phase-records/fixtures/phase15-winning-prefix-v1.json', 'utf8'));
const legacyPrefixCases = extractExplicitPrefixCases(legacyPrefixDocument, { format: 'atlas-abstain' });
assert.ok(legacyPrefixCases.length > 0, 'committed v1 prefix fixture must execute through the current historical reader');
assert.ok(legacyPrefixCases.every(row => row.sourceLabel === 'oracle-abstain'),
  'legacy atlas-abstain reader must select the historical oracle-abstain branch population');

const replay = readFileSync('scripts/stress/offline-replay-harness.mjs', 'utf8');
assert.match(replay, /--atlas-dir=/u);
assert.match(replay, /atlasDir/u);

const crossing = readFileSync('scripts/stress/mc-crossing-slack-analysis.mjs', 'utf8');
assert.match(crossing, /--atlas-dir=/u);
assert.match(crossing, /atlasFiles/u);

const submissionRepo = readFileSync('modules/persistence/level-submission-repository.ts', 'utf8');
assert.match(submissionRepo, /levelFingerprint/u);
assert.match(submissionRepo, /fingerprintVersion/u);

const ratingManager = readFileSync('modules/engine/level-rating-manager.ts', 'utf8');
assert.match(ratingManager, /fingerprint/u);

const orchestration = readFileSync('modules/solver/orchestration.ts', 'utf8');
assert.match(orchestration, /repairLateProbe/u);
assert.match(orchestration, /STRATEGY_REPAIR_LATE_PROBE/u);

console.log('Phase-15A contract decomposition/source-freeze inventory passed.');
