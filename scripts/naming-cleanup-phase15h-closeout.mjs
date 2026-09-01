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
    || file === 'docs/naming-and-vocabulary.md';
}

const files = [...ROOTS.flatMap(walk), ...TOP_LEVEL]
  .filter((file, index, all) => all.indexOf(file) === index)
  .filter(file => {
    try { return statSync(file).isFile() && statSync(file).size <= 2 * 1024 * 1024 && TEXT_EXTENSIONS.has(path.extname(file)); }
    catch { return false; }
  })
  .filter(file => !isAuthorityOrGuard(file))
  .sort();

const retired = ['--atlas-dir', 'ATLAS_DIR', 'atlasDir', 'atlasFiles'];
const failures = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const token of retired) {
    if (source.includes(token)) failures.push(`${file}: retired Phase-15H token ${token}`);
  }
}

const replay = readFileSync('scripts/stress/offline-replay-harness.mjs', 'utf8');
assert.match(replay, /--prune-gap-dir=reports\/stress/u);
assert.match(replay, /const PRUNE_GAP_DIR = arg\('prune-gap-dir', 'reports\/stress'\)/u);
assert.match(replay, /const pruneGapFiles = readdirSync\(path\.resolve\(root, PRUNE_GAP_DIR\)\)\.filter\(f => \/\^prune-gap-\.\*\\\.json\$\/\.test\(f\)\)/u);
assert.match(replay, /pruneGapDir: PRUNE_GAP_DIR/u);
assert.doesNotMatch(replay, /--atlas-dir|ATLAS_DIR|atlasDir|atlasFiles/u);

const crossing = readFileSync('scripts/stress/mc-crossing-slack-analysis.mjs', 'utf8');
assert.match(crossing, /--prune-gap-dir=reports\/stress/u);
assert.match(crossing, /const PRUNE_GAP_DIR = arg\('prune-gap-dir', 'reports\/stress'\)/u);
assert.match(crossing, /const pruneGapFiles = readdirSync\(pruneGapRoot\)\.filter\(f => \/\^prune-gap-\.\*\\\.json\$\/\.test\(f\)\)\.sort\(\)/u);
assert.match(crossing, /pruneGapDir: PRUNE_GAP_DIR/u);
assert.match(crossing, /pruneGapFiles: pruneGapFiles\.length/u);
assert.doesNotMatch(crossing, /--atlas-dir|ATLAS_DIR|atlasDir|atlasFiles/u);

const docs = readFileSync('docs/solver-offline-replay-harness.md', 'utf8');
assert.match(docs, /--prune-gap-dir=reports\/stress/u);
assert.doesNotMatch(docs, /--atlas-dir/u);

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const retained = ledger.phaseRetainedSurfaces?.['8'] ?? [];
assert.equal(
  retained.some(row => row.id === 'NC-RET-P08-010'),
  false,
  'Phase-8 atlas-directory retention must retire once 15H migrates every registered current owner',
);
for (const [rowId, coverage] of Object.entries(ledger.phaseCloseoutCoverage?.['8'] ?? {})) {
  assert.equal(
    (coverage.retainedSurfaceIds ?? []).includes('NC-RET-P08-010'),
    false,
    `${rowId} must not retain the retired Phase-8 atlas-directory surface`,
  );
}
for (const id of ['NC-P15-007', 'NC-P15-013']) {
  const row = ledger.entries.find(entry => entry.id === id);
  assert.ok(row, `missing ${id}`);
  assert.ok(['in-progress', 'done'].includes(row.status), `${id} must be active or done during 15H`);
  assert.equal(row.persistence, 'none', `${id} must not grow a compatibility reader`);
}

if (failures.length) {
  console.error('Phase-15H closeout found retired prune-gap directory/report vocabulary on maintained surfaces:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Phase-15H closeout clean: ${files.length} maintained text surfaces scanned; old atlas-directory/report identities are retired.`);
