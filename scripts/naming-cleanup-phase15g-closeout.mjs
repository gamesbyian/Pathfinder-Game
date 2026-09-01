#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['scripts', 'docs', '.github'];
const TOP_LEVEL = ['package.json', 'AGENTS.md', 'README.md'];
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.py', '.md', '.json', '.yml', '.yaml']);

function posix(file) { return file.split(path.sep).join('/'); }
function walk(root) {
  const out = [];
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); }
  catch (error) { if (error?.code === 'ENOENT') return out; throw error; }
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (entry.isFile()) out.push(posix(file));
  }
  return out;
}
function isAuthorityOrGuard(file) {
  return file.startsWith('docs/archive/')
    || file.startsWith('docs/history/')
    || file.startsWith('docs/naming-cleanup-phase-records/')
    || file.startsWith('scripts/naming-cleanup-')
    || file === 'docs/naming-cleanup-plan.md'
    || file === 'docs/naming-cleanup-ledger.json'
    || file === 'docs/naming-cleanup-history-and-lessons.md'
    || file === 'docs/naming-cleanup-process-hardening.md'
    || file === 'docs/naming-cleanup-future-phase-preparation.md'
    || file === 'docs/naming-and-vocabulary.md'
    || file === 'docs/solver-research-post-naming-resumption.md'
    || file === 'scripts/check-naming-current-authorities.mjs'
    || file === 'scripts/naming-current-authorities-node-test.mjs';
}

const files = [...ROOTS.flatMap(walk), ...TOP_LEVEL]
  .filter((file, index, all) => all.indexOf(file) === index)
  .filter(file => {
    try { return statSync(file).isFile() && statSync(file).size <= 2 * 1024 * 1024 && TEXT_EXTENSIONS.has(path.extname(file)); }
    catch { return false; }
  })
  .filter(file => !isAuthorityOrGuard(file))
  .sort();

const zeroRetired = ['oracleLabel', 'oracleReason', 'oracle-unknown', 'oracle-shards', 'oracleAbstentions', 'oracleProbe'];
const allowedLegacy = new Map([
  ['oracle-abstain', new Set([
    'scripts/stress/cpsat-explicit-prefix-reference-lib.mjs',
    'scripts/stress/research-analysis-lib-check.mjs',
  ])],
]);
const retiredInputFixture = 'scripts/stress/research-analysis-lib-check.mjs';
const failures = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const token of zeroRetired) {
    if (source.includes(token)) failures.push(`${file}: retired Phase-15G token ${token}`);
  }
  for (const [token, owners] of allowedLegacy) {
    if (source.includes(token) && !owners.has(file)) failures.push(`${file}: legacy ${token} outside its one compatibility owner/test`);
  }
  if (source.includes('atlas-abstain') && file !== retiredInputFixture) {
    failures.push(`${file}: retired atlas-abstain input spelling outside its negative regression fixture`);
  }
}
for (const [token, owners] of allowedLegacy) {
  for (const file of owners) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, new RegExp(token), `${file} must retain executable coverage for ${token}`);
  }
}

const lib = readFileSync('scripts/stress/cpsat-explicit-prefix-reference-lib.mjs', 'utf8');
assert.match(lib, /normalizeExplicitPrefixCaseFormat/u);
assert.match(lib, /format === 'reference-abstain'/u);
assert.doesNotMatch(lib, /atlas-abstain/u);
assert.match(lib, /row\.label === 'reference-abstain' \|\| row\.label === 'oracle-abstain'/u);
assert.match(lib, /reason: 'reference-unknown'/u);

const writer = readFileSync('scripts/stress/cpsat-explicit-prefix-reference.mjs', 'utf8');
assert.match(writer, /schemaVersion: 2/u);
assert.match(writer, /referenceLabel/u);
assert.match(writer, /referenceReason/u);
assert.doesNotMatch(writer, /oracleLabel|oracleReason/u);

const branches = readFileSync('scripts/stress/research-analysis-lib.mjs', 'utf8');
assert.match(branches, /schemaVersion: 2/u);
assert.match(branches, /'reference-abstain'/u);
assert.doesNotMatch(branches, /'oracle-abstain'/u);

const collector = readFileSync('scripts/stress/collect-known-solution-prefix-branches.mjs', 'utf8');
assert.match(collector, /schemaVersion: 2/u);
assert.match(collector, /reference: \{ status: 'not-invoked'/u);
assert.match(collector, /unknownSiblingLabel: 'reference-abstain'/u);
assert.match(collector, /referenceAbstentions/u);
assert.doesNotMatch(collector, /oracleAbstentions|oracle: \{/u);

const repair = readFileSync('scripts/stress/repair-retreat-binary-search.mjs', 'utf8');
assert.match(repair, /function referenceProbe\(/u);
assert.match(repair, /referenceLabel/u);
assert.match(repair, /referenceReason/u);
assert.doesNotMatch(repair, /oracleProbe|oracleLabel|oracleReason/u);

const workflow = readFileSync('.github/workflows/cpsat-explicit-prefix-reference.yml', 'utf8');
assert.match(workflow, /default: 'reference-abstain'/u);
assert.match(workflow, /^  reference-shards:$/mu);
assert.match(workflow, /needs: \[plan, reference-shards\]/u);
assert.match(workflow, /row\.referenceLabel/u);
assert.match(workflow, /schemaVersion: 2/u);
assert.doesNotMatch(workflow, /oracle-shards|atlas-abstain|row\.oracleLabel/u);

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const retained = Object.fromEntries((ledger.phaseRetainedSurfaces?.['8'] ?? []).map(row => [row.id, row]));
assert.deepEqual(retained['NC-RET-P08-007']?.matches, [{
  term: 'oracle-abstain',
  files: [
    'scripts/stress/cpsat-explicit-prefix-reference-lib.mjs',
    'scripts/stress/research-analysis-lib-check.mjs',
  ],
}]);
assert.equal(retained['NC-RET-P08-008'], undefined, 'Phase 15J must retire the former atlas-abstain retained-surface exemption');
assert.match(readFileSync(retiredInputFixture, 'utf8'), /retiredAtlasFormat\s*=\s*\['atlas', 'abstain'\]\.join\('-'\)/u);

if (failures.length) {
  console.error('Phase-15G closeout found retired or mis-owned CP-SAT reference vocabulary:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Phase-15G/15J closeout clean: ${files.length} maintained text surfaces scanned; oracle-abstain remains the sole historical label compatibility and atlas-abstain is rejection-only.`);
