#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'scripts/naming-cleanup-phase8-closeout.mjs');
const sourceLedger = JSON.parse(readFileSync(path.join(root, 'docs/naming-cleanup-ledger.json'), 'utf8'));

for (const id of ['NC-P08-024', 'NC-P08-025']) {
  const row = sourceLedger.entries.find(entry => entry.id === id);
  assert.equal(row?.persistence, 'none', `${id} must not claim persisted compatibility`);
  assert.equal(row?.compatibility, undefined, `${id} must not claim a historical reader`);
  assert.equal(sourceLedger.phaseCloseoutCoverage['8'][id]?.kind, 'literal-legacy-surface');
}
const temp = mkdtempSync(path.join(tmpdir(), 'phase8-closeout-'));

function run(ledgerPath, scanRoot = root) {
  return spawnSync(process.execPath, [checker, `--ledger=${ledgerPath}`, `--scan-root=${scanRoot}`], { encoding: 'utf8' });
}

try {
  const missing = JSON.parse(JSON.stringify(sourceLedger));
  delete missing.phaseCloseoutCoverage['8']['NC-P08-002'];
  const missingPath = path.join(temp, 'missing.json');
  writeFileSync(missingPath, JSON.stringify(missing));
  let result = run(missingPath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NC-P08-002/);

  const drift = JSON.parse(JSON.stringify(sourceLedger));
  drift.entries.find(row => row.id === 'NC-P08-045').old = '.github/workflows/changed-without-coverage.yml';
  const driftPath = path.join(temp, 'drift.json');
  writeFileSync(driftPath, JSON.stringify(drift));
  result = run(driftPath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /coverage drift/);

  const missingRetained = JSON.parse(JSON.stringify(sourceLedger));
  missingRetained.phaseRetainedSurfaces['8'] = missingRetained.phaseRetainedSurfaces['8']
    .filter(entry => entry.id !== 'NC-RET-P08-007');
  const missingRetainedPath = path.join(temp, 'missing-retained.json');
  writeFileSync(missingRetainedPath, JSON.stringify(missingRetained));
  result = run(missingRetainedPath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown retained-surface reference/);

  const invalidOwner = JSON.parse(JSON.stringify(sourceLedger));
  invalidOwner.phaseRetainedSurfaces['8'].find(entry => entry.id === 'NC-RET-P08-001')
    .ownerRowIds.push('NC-P15-999');
  const invalidOwnerPath = path.join(temp, 'invalid-owner.json');
  writeFileSync(invalidOwnerPath, JSON.stringify(invalidOwner));
  result = run(invalidOwnerPath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid retained-surface structured owner/);

  // A tiny maintained-tree fixture proves the literal pattern derived from NC-P08-002 catches a
  // reintroduced legacy filename even though that row was absent from the old hand-written list.
  const fixture = path.join(temp, 'fixture');
  for (const dir of ['modules/solver', 'modules/persistence', 'scripts/stress', 'docs', '.github/workflows']) mkdirSync(path.join(fixture, dir), { recursive: true });
  cpSync(path.join(root, 'modules/solver/operational-research-types.d.ts'), path.join(fixture, 'modules/solver/operational-research-types.d.ts'));
  cpSync(path.join(root, 'scripts/import-published-levels.mjs'), path.join(fixture, 'scripts/import-published-levels.mjs'));
  cpSync(path.join(root, 'scripts/stress/elite-prefix-dfs-ab.mjs'), path.join(fixture, 'scripts/stress/elite-prefix-dfs-ab.mjs'));
  cpSync(path.join(root, 'scripts/stress/solution-profile-lib.mjs'), path.join(fixture, 'scripts/stress/solution-profile-lib.mjs'));
  cpSync(path.join(root, 'modules/solver/known-solution-prefix-survival.ts'), path.join(fixture, 'modules/solver/known-solution-prefix-survival.ts'));
  for (const file of [
    'modules/data.ts', 'modules/dev-corpus.ts', 'modules/input/review-controller.ts',
    'modules/input/solver-controller.ts', 'modules/input/submission-controller.test.ts',
    'modules/input/submission-controller.ts', 'modules/input/submission-core.test.ts',
    'modules/input/submission-core.ts', 'modules/persistence/level-rating-repository.ts',
    'modules/persistence/level-submission-repository.ts',
    'modules/persistence/local-level-hints-repository.ts', 'modules/persistence/review-repository.ts',
    'modules/ports.ts', 'modules/state-slices.ts', 'modules/state/actions/rating-actions.test.ts',
    'modules/state/actions/rating-actions.ts',
  ]) {
    const destination = path.join(fixture, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(root, file), destination);
  }
  cpSync(path.join(root, 'scripts/experiment-manifest-lib.mjs'), path.join(fixture, 'scripts/experiment-manifest-lib.mjs'));
  cpSync(path.join(root, 'scripts/validate-variant-family-dataset-worktree.mjs'), path.join(fixture, 'scripts/validate-variant-family-dataset-worktree.mjs'));
  cpSync(path.join(root, 'scripts/stress/cpsat-explicit-prefix-reference.mjs'), path.join(fixture, 'scripts/stress/cpsat-explicit-prefix-reference.mjs'));
  cpSync(path.join(root, '.github/workflows/collect-prune-gap-labels.yml'), path.join(fixture, '.github/workflows/collect-prune-gap-labels.yml'));
  cpSync(path.join(root, '.github/workflows/cpsat-explicit-prefix-reference.yml'), path.join(fixture, '.github/workflows/cpsat-explicit-prefix-reference.yml'));
  const regressionPath = path.join(fixture, 'scripts/regression.mjs');
  writeFileSync(regressionPath, 'const legacy = "analyze-lineage-mechanics.mjs";\n');
  const cleanLedgerPath = path.join(temp, 'ledger.json');
  writeFileSync(cleanLedgerPath, JSON.stringify(sourceLedger));
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NC-P08-002 ledger legacy surface/);
  assert.doesNotMatch(result.stderr, /missing canonical 8H contract/);
  unlinkSync(regressionPath);

  // A retired diagnostic field in an explanatory comment is still residue, not evidence of a
  // compatibility reader. Construct the token from fragments so this test source remains clean.
  const diagnosticsCommentPath = path.join(fixture, 'scripts/diagnostics-comment-regression.mjs');
  const retiredDiagnosticField = ['known', 'Hard', 'Cluster'].join('');
  writeFileSync(diagnosticsCommentPath, `// historical compatibility read: ${retiredDiagnosticField}\n`);
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NC-P08-024 ledger legacy surface/);
  unlinkSync(diagnosticsCommentPath);

  const datasetBranchFixture = path.join(fixture, 'scripts/validate-variant-family-dataset-worktree.mjs');
  const datasetBranchCanonicalSource = readFileSync(datasetBranchFixture, 'utf8');
  writeFileSync(datasetBranchFixture, datasetBranchCanonicalSource.replaceAll('VARIANT_FAMILY_DATASET_BRANCH', 'DATASET_BRANCH'));
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NC-P08-054 canonical target missing|NC-P08-054 substituted noncanonical target/);
  writeFileSync(datasetBranchFixture, datasetBranchCanonicalSource);

  const fingerprintExpansion = path.join(fixture, 'modules/input/unowned-fingerprint.ts');
  writeFileSync(fingerprintExpansion, 'export interface Unowned { fingerprint: string }\n');
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unqualified application level-fingerprint identifier/);
  unlinkSync(fingerprintExpansion);

  const profileExpansion = path.join(fixture, 'modules/solver/unowned-profile.ts');
  writeFileSync(profileExpansion, 'export interface Unowned { profile?: string }\n');
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unclassified naked profile declaration/);
  unlinkSync(profileExpansion);

  const exportedTypedProfileExpansion = path.join(fixture, 'modules/solver/unowned-exported-typed-profile.ts');
  writeFileSync(exportedTypedProfileExpansion, 'export interface Unowned { profile: ScoringProfile }\n');
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exported naked ScoringProfile property/);
  unlinkSync(exportedTypedProfileExpansion);

  const familyExpansion = path.join(fixture, 'modules/solver/unowned-family.ts');
  writeFileSync(familyExpansion, 'export interface Unowned { family?: string }\n');
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unclassified naked family declaration/);

  unlinkSync(familyExpansion);
  const retainedExpansion = path.join(fixture, 'scripts/unowned-oracle-source-label.mjs');
  writeFileSync(retainedExpansion, 'export const legacyLabel = "oracle-abstain";\n');
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NC-RET-P08-007 retained surface: oracle-abstain/);

  unlinkSync(retainedExpansion);

  const staleCasePath = path.join(fixture, 'scripts/stale-case-import.mjs');
  const staleImportSource = ['import', ' "../modules/', 'Solver.ts"', ';\n'].join('');
  writeFileSync(staleCasePath, staleImportSource);
  result = run(cleanLedgerPath, fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stale case-sensitive solver module path/);

  console.log('Phase-8 closeout coverage negative fixtures passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
