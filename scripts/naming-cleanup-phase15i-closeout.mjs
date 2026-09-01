#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  findDerivedIdentityHits,
  hasExecutableToken,
  isLikelyTestOrNamingGuard,
} from './naming-cleanup-phase15i-closeout-lib.mjs';

const ROOT = process.cwd();
const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const phase15 = ledger.entries.filter(row => row.phase === 15);

assert.equal(ledger.lastCompletedPhase, 14, '15I must not finalize Phase 15');
assert.equal(ledger.activeExecution?.phase, 15);
assert.equal(ledger.activeExecution?.batch, '15I');
for (const batch of ['15A','15B','15C','15D','15E','15F','15G','15H']) {
  assert.equal(ledger.batchCompletions?.[batch]?.status, 'merged', `${batch} must be merged before hostile closeout`);
}
assert.ok(phase15.length >= 14);
assert.ok(phase15.every(row => row.status === 'done'), 'all Phase-15 implementation rows must be done before 15I');

// Reconciliation must now be side-specific: the five real compatibility owners remain mixed;
// every non-compatibility Phase-15 row is canonical-only on maintained surfaces.
const inventoryRaw = execFileSync(process.execPath, [
  'scripts/naming-cleanup-surface-inventory.mjs', '--json', '--phase=15',
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const inventory = JSON.parse(inventoryRaw);
const byId = Object.fromEntries(inventory.ledgerEntries.map(row => [row.id, row]));
const mixedOwners = new Set(['NC-P15-001','NC-P15-002','NC-P15-003','NC-P15-011','NC-P15-012']);
for (const row of phase15) {
  const observed = byId[row.id];
  assert.ok(observed, `inventory missing ${row.id}`);
  if (mixedOwners.has(row.id)) {
    assert.equal(observed.reconciliationState, 'mixed-old-and-canonical', `${row.id} must expose its real legacy reader/alias and canonical side`);
    assert.ok(observed.oldReferenceFiles.length > 0);
    assert.ok(observed.newReferenceFiles.length > 0);
  } else {
    assert.equal(observed.reconciliationState, 'canonical-live', `${row.id} must have no maintained legacy identity`);
    assert.deepEqual(observed.oldReferenceFiles, []);
    assert.ok(observed.newReferenceFiles.length > 0);
  }
}

// Complete Phase 1-15 census: legacy live references on direct-rename rows may not survive in
// runtime/application/public/workflow/package surfaces. Historical docs/tests are classified
// separately by the phase records and dedicated closeout guards.
const allRaw = execFileSync(process.execPath, [
  'scripts/naming-cleanup-surface-inventory.mjs', '--json', '--phase=1-15',
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const allInventory = JSON.parse(allRaw);
const forbiddenLiveCategories = new Set([
  'application','solver-internal','public-port','worker-transport','workflow','package-command',
]);
const crossPhaseLeaks = [];
for (const row of allInventory.ledgerEntries) {
  if (row.persistence !== 'none' || row.oldReferenceFiles.length === 0) continue;
  const badCategories = row.oldReferenceCategories.filter(category => forbiddenLiveCategories.has(category));
  if (badCategories.length) crossPhaseLeaks.push(`${row.id}: ${badCategories.join(',')} -> ${row.oldReferenceFiles.join(',')}`);
}
assert.deepEqual(crossPhaseLeaks, [], `direct-renamed legacy identities remain on live runtime/control surfaces:\n${crossPhaseLeaks.join('\n')}`);

// Independent executable-source scan catches exact, plural/derived, and simple masked string
// construction shapes for retired Phase-15 identities. Naming guards and tests are not treated as
// implementation consumers.
function walk(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (entry.isFile()) out.push(file.split(path.sep).join('/'));
  }
  return out;
}
const sourceFiles = [
  ...walk('modules'),
  ...walk('scripts'),
  ...walk('.github/workflows'),
].filter(file => /\.(?:js|mjs|ts|tsx|py|yml|yaml)$/u.test(file))
  .filter(file => statSync(file).size <= 2 * 1024 * 1024)
  .filter(file => !isLikelyTestOrNamingGuard(file));

const retiredExecutableTokens = [
  'troveRootArg','troveRoot',
  'oracleLabel','oracleReason','oracleProbe',
  'atlas-eligibility.mjs','selectEligibleAtlasLevels','isEligibleForCpsatAtlas',
  '--atlas-dir','ATLAS_DIR','atlasDir','atlasFiles',
  'oracle-shards',
  '2026-08-07-wide-trove-summary','2026-08-07-wide-trove-source-run',
];
const retiredHits = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  for (const token of findDerivedIdentityHits(source, retiredExecutableTokens)) {
    retiredHits.push(`${file}: ${token}`);
  }
}
assert.deepEqual(retiredHits, [], `retired Phase-15 executable identity survives in maintained source:\n${retiredHits.join('\n')}`);

// Claimed compatibility must be executable, not comment-only.
const compatibilityOwners = [
  ['NC-P15-001','scripts/family-paths.mjs','--trove-root','--variant-family-dataset-root'],
  ['NC-P15-002','scripts/experiment-manifest-lib.mjs','trove','variantFamilyDataset'],
  ['NC-P15-003','scripts/family-index-lib.mjs','wide-trove-attempts-','variant-family-dataset-attempts-'],
  ['NC-P15-011','scripts/stress/cpsat-explicit-prefix-reference-lib.mjs','atlas-abstain','reference-abstain'],
  ['NC-P15-012','scripts/stress/cpsat-explicit-prefix-reference-lib.mjs','oracle-abstain','reference-abstain'],
];
for (const [id,file,legacy,canonical] of compatibilityOwners) {
  const source = readFileSync(file, 'utf8');
  assert.equal(hasExecutableToken(source, legacy), true, `${id} claimed legacy form exists only in comments or disappeared from owner ${file}`);
  assert.equal(hasExecutableToken(source, canonical), true, `${id} owner lacks canonical executable form ${canonical}`);
}

// Current authorities must agree semantically, including physical table rows and the resolved
// no-historical-reader decision for NC-P15-005.
execFileSync(process.execPath, ['scripts/check-naming-current-authorities.mjs'], { cwd: ROOT, stdio: 'pipe' });

// Representative frozen historical source remains byte-identical to its recorded Phase-15 entry
// blob SHA. Compute Git's blob object ID directly so shallow CI checkout depth is irrelevant.
const frozenPath = 'reports/stress/winning-prefix-atlas-pilot-2026-08-11.json';
const frozen = execFileSync('git', ['show', `HEAD:${frozenPath}`], {
  cwd: ROOT,
  encoding: null,
  maxBuffer: 32 * 1024 * 1024,
});
const blobHeader = Buffer.from(`blob ${frozen.length}\0`);
const blobSha = createHash('sha1').update(blobHeader).update(frozen).digest('hex');
assert.equal(blobSha, '3de81cc8f95862c7f7142511e06f7bdb72710d52');

// The separately deferred repairLateProbe family remains deliberately classified rather than
// accidentally half-renamed during Phase 15.
const phaseRecord = readFileSync('docs/naming-cleanup-phase-records/phase-15.md', 'utf8');
assert.match(phaseRecord, /separately deferred vocabulary debt/u);
assert.match(phaseRecord, /repairLateProbe/u);

// 15I records the transition-alias review but leaves actual retirement to 15J.
for (const id of ['NC-P15-001','NC-P15-011']) {
  const row = phase15.find(candidate => candidate.id === id);
  assert.equal(row.compatibility?.mode, 'external-config-transition');
  assert.equal(row.compatibility?.retireWhen, 'phase-15-review');
}
assert.match(phaseRecord, /15J[^\n]{0,200}retir/iu);

console.log(`Phase-15I hostile closeout guard passed: ${allInventory.ledgerEntries.length} Phase-1-15 rows censused, ${sourceFiles.length} maintained executable surfaces scanned, Phase-15 compatibility ownership is executable and frozen source blob is unchanged.`);
