#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

assert.equal(ledger.status, 'active');
assert.equal(ledger.lastCompletedPhase, 14, '15J handoff must not claim Phase 15 complete before merge');
assert.equal(ledger.batchCompletions?.['15I']?.status, 'merged');
assert.equal(ledger.batchCompletions?.['15I']?.pr, 1646);
assert.equal(ledger.batchCompletions?.['15I']?.mergeCommit, '55b405b2caf511543503a7581b2457c92c06a1f9');
assert.deepEqual(ledger.batchCompletions?.['15J'], { status: 'pending', pr: null, mergeCommit: null });
assert.equal(ledger.activeExecution?.status, 'active');
assert.equal(ledger.activeExecution?.phase, 15);
assert.equal(ledger.activeExecution?.batch, '15J');
assert.equal(ledger.activeExecution?.branch, 'chatgpt/phase15j-archival-handoff-2026-08-31');
assert.ok(phase15.every(row => row.status === 'done'), '15J is rowless and must not reopen implementation rows');

assert.deepEqual(
  phase15.filter(row => row.persistence === 'dual-read').map(row => row.id).sort(),
  ['NC-P15-002', 'NC-P15-003', 'NC-P15-012'],
  'only permanent historical readers may remain dual-read after Phase-15 review',
);
for (const id of ['NC-P15-001', 'NC-P15-011']) {
  assert.equal(byId[id]?.persistence, 'none', `${id} transition alias must be retired`);
  assert.equal('compatibility' in byId[id], false, `${id} must no longer advertise compatibility ownership`);
}

// Retired external input spellings fail loudly rather than silently selecting a different/default input.
assert.throws(
  () => variantFamilyDatasetRootArg(['--trove-root=tmp/retired-root']),
  /retired variant-family dataset-root option/u,
);
assert.throws(
  () => normalizeExplicitPrefixCaseFormat('atlas-abstain'),
  /unsupported explicit-prefix case format/u,
);

// Permanent historical reader #1: authentic schema-v1 family-run manifests still normalize.
const familyRunV1 = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15d-family-run-manifest-v1.json',
  'utf8',
));
const normalizedRun = validateFamilyEvaluationRunManifest(familyRunV1);
assert.equal(normalizedRun.schemaVersion, 2);
assert.deepEqual(normalizedRun.variantFamilyDataset, familyRunV1.trove);
assert.equal('trove' in normalizedRun, false);

// Permanent historical reader #2: frozen wide-trove attempt artifacts still join through family-index.
const root = mkdtempSync(path.join(tmpdir(), 'phase15j-family-index-'));
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

// Permanent historical reader #3: schema-v1 oracle-abstain source labels remain readable through
// the canonical reference-abstain input format.
const legacyPrefixDocument = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15-winning-prefix-v1.json',
  'utf8',
));
const legacyCases = extractExplicitPrefixCases(legacyPrefixDocument, { format: 'reference-abstain' });
assert.ok(legacyCases.length > 0);
assert.ok(legacyCases.every(row => row.sourceLabel === 'reference-abstain'));

assert.equal(
  (ledger.phaseRetainedSurfaces?.['8'] ?? []).some(row => row.id === 'NC-RET-P08-008'),
  false,
  'retired atlas-abstain retained-surface exemption must be gone',
);
assert.ok(
  (ledger.phaseRetainedSurfaces?.['8'] ?? []).some(row => row.id === 'NC-RET-P08-007'),
  'permanent oracle-abstain historical-reader exemption must remain',
);

assert.equal(existsSync('.github/workflows/naming-phase15i-closeout.yml'), false,
  'temporary Phase-15I workflow must be removed during 15J handoff');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal('check:naming-cleanup-phase15i-closeout' in pkg.scripts, false);
assert.equal('test:naming-cleanup-phase15i-closeout' in pkg.scripts, false);
assert.equal(pkg.scripts['check:naming-cleanup-phase15j-handoff'], 'node scripts/naming-cleanup-phase15j-handoff.mjs');
assert.match(pkg.scripts['test:node'], /check:naming-cleanup-phase15j-handoff/u);
assert.match(pkg.scripts['check:validators'], /check:naming-cleanup-phase15j-handoff/u);

const naming = readFileSync('docs/naming-and-vocabulary.md', 'utf8');
assert.match(naming, /Phase 15J retired[\s\S]{0,180}`--trove-root`/u);
assert.match(naming, /Phase 15J retired[\s\S]{0,180}`atlas-abstain`/u);
const resumption = readFileSync('docs/solver-research-post-naming-resumption.md', 'utf8');
assert.match(resumption, /retired `--trove-root`/u);
assert.match(resumption, /retired `atlas-abstain`/u);

console.log('Phase-15J archival handoff invariants passed: transition aliases retired, permanent historical readers preserved, 15I plumbing retired, completion seal still pending.');
