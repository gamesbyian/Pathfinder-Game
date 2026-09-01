#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { variantFamilyDatasetRootArg } from './family-paths.mjs';
import { buildFamilyIndex } from './family-index-lib.mjs';
import { validateFamilyEvaluationRunManifest } from './experiment-manifest-lib.mjs';
import {
  extractExplicitPrefixCases,
  normalizeExplicitPrefixCaseFormat,
} from './stress/cpsat-explicit-prefix-reference-lib.mjs';

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const phase15 = ledger.entries.filter(row => row.phase === 15);
const byId = Object.fromEntries(phase15.map(row => [row.id, row]));

assert.equal(ledger.status, 'complete');
assert.equal(ledger.lastCompletedPhase, 15);
assert.deepEqual(ledger.batchCompletions?.['15J'], {
  status: 'merged',
  pr: 1647,
  mergeCommit: '504330dc4e474b1ebc7755e8c34f72f63fd37901',
});
assert.equal(ledger.activeExecution?.status, 'idle');
for (const key of ['phase', 'batch', 'branch', 'pr', 'baseMainSha', 'recordPath']) {
  assert.equal(ledger.activeExecution?.[key], null, `completed execution must leave ${key} null`);
}
assert.ok(phase15.every(row => row.status === 'done'), 'completed Phase 15 must leave every implementation row done');
assert.ok(
  Object.entries(ledger.batchCompletions ?? {})
    .filter(([batch]) => /^15[A-J]$/u.test(batch))
    .every(([, completion]) => completion.status === 'merged'),
  'every declared Phase-15 serial gate must be recorded merged',
);

assert.deepEqual(
  phase15.filter(row => row.persistence === 'dual-read').map(row => row.id).sort(),
  ['NC-P15-002', 'NC-P15-003', 'NC-P15-012'],
  'only permanent historical readers may remain dual-read after completion',
);
for (const id of ['NC-P15-001', 'NC-P15-011']) {
  assert.equal(byId[id]?.persistence, 'none');
  assert.equal('compatibility' in byId[id], false);
}

// Retired external spellings remain rejected.
assert.throws(
  () => variantFamilyDatasetRootArg(['--trove-root=tmp/retired-root']),
  /retired variant-family dataset-root option/u,
);
assert.throws(
  () => normalizeExplicitPrefixCaseFormat('atlas-abstain'),
  /unsupported explicit-prefix case format/u,
);

// Permanent historical reader #1: schema-v1 family-run manifest.
const familyRunV1 = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15d-family-run-manifest-v1.json',
  'utf8',
));
const normalizedRun = validateFamilyEvaluationRunManifest(familyRunV1);
assert.equal(normalizedRun.schemaVersion, 2);
assert.deepEqual(normalizedRun.variantFamilyDataset, familyRunV1.trove);
assert.equal('trove' in normalizedRun, false);

// Permanent historical reader #2: frozen wide-trove attempt discovery.
const root = mkdtempSync(path.join(tmpdir(), 'naming-final-family-index-'));
try {
  mkdirSync(path.join(root, 'data/families/corpus-a'), { recursive: true });
  mkdirSync(path.join(root, 'reports/families'), { recursive: true });
  writeFileSync(path.join(root, 'data/families/corpus-a/family-P1-sym-manifest.json'), JSON.stringify({
    schemaVersion: 1,
    familyId: 'family-P1-symmetry',
    parentLevelId: 'P1',
    parentCorpus: 'data/levels.json',
    familyMode: 'symmetry',
    variants: [{ variantId: 'V1', relation: 'symmetry' }],
  }));
  writeFileSync(path.join(root, 'reports/families/2026-08-07-wide-trove-attempts-corpus-a-part01.json'), JSON.stringify({
    levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', ok: true, workSpent: 7 }],
  }));
  const index = buildFamilyIndex(root);
  const variant = index.variants.find(row => row.variantId === 'V1');
  assert.equal(variant?.evaluated, true);
  assert.equal(variant?.solved, true);
  assert.match(variant?.evidence?.[0]?.evidencePath ?? '', /wide-trove-attempts-/u);
} finally {
  rmSync(root, { recursive: true, force: true });
}

// Permanent historical reader #3: schema-v1 oracle-abstain branch labels through canonical input.
const legacyPrefixDocument = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15-winning-prefix-v1.json',
  'utf8',
));
const legacyCases = extractExplicitPrefixCases(legacyPrefixDocument, { format: 'reference-abstain' });
assert.ok(legacyCases.length > 0);
assert.ok(legacyCases.every(row => row.sourceLabel === 'reference-abstain'));

assert.equal(existsSync('.github/workflows/naming-phase15i-closeout.yml'), false);

const status = spawnSync(process.execPath, ['scripts/naming-cleanup-status.mjs', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
assert.equal(status.status, 0, status.stderr);
const statusJson = JSON.parse(status.stdout);
assert.equal(statusJson.programStatus, 'complete');
assert.equal(statusJson.lastCompletedPhase, 15);
assert.equal(statusJson.nextPhase, null);
assert.equal(statusJson.nextBatch, null);
assert.equal(statusJson.nextBatchKind, null);
assert.equal(statusJson.nextAction, 'complete');
assert.equal(statusJson.nextScope.count, 0);
assert.equal(statusJson.activeExecution?.status, 'idle');

const agents = readFileSync('AGENTS.md', 'utf8');
assert.match(agents, /repository-wide naming cleanup is complete/u);
assert.match(agents, /do not reopen[^\n]+Phase 16/iu);
assert.doesNotMatch(agents, /While Phase 15 is active/iu);

const docsIndex = readFileSync('docs/README.md', 'utf8');
assert.match(docsIndex, /Completed\/frozen Phase-15 execution evidence/u);
assert.doesNotMatch(docsIndex, /Current Phase-15 execution\/closeout authority/u);

const plan = readFileSync('docs/naming-cleanup-plan.md', 'utf8');
assert.match(plan, /Status: \*\*complete and frozen after Phase 15\*\*/u);
assert.match(plan, /There is no next cleanup phase after Phase 15/u);

const record = readFileSync('docs/naming-cleanup-phase-records/phase-15.md', 'utf8');
assert.match(record, /Status: \*\*complete and frozen/u);
assert.match(record, /PR \*\*#1647\*\*/u);
assert.match(record, /33471986789/u);
assert.match(record, /33471986760/u);
assert.match(record, /504330dc4e474b1ebc7755e8c34f72f63fd37901/u);

const resumption = readFileSync('docs/solver-research-post-naming-resumption.md', 'utf8');
assert.match(resumption, /repository-wide naming cleanup is complete through Phase 15/u);
assert.doesNotMatch(resumption, /becomes permission[^\n]+only after final naming closeout is complete/iu);

const scriptsReadme = readFileSync('scripts/README.md', 'utf8');
assert.match(scriptsReadme, /completed naming-cleanup status\/history/iu);
assert.doesNotMatch(scriptsReadme, /active naming-cleanup status/iu);

const toolingCatalog = readFileSync('docs/tooling-catalog.md', 'utf8');
assert.match(toolingCatalog, /Completed naming-cleanup status\/history/u);
assert.doesNotMatch(toolingCatalog, /Active naming-cleanup execution state/u);

console.log('Naming-cleanup final state valid: Phase 15 complete, no next phase, permanent historical readers preserved, retired inputs rejected, and current routing is post-cleanup.');
