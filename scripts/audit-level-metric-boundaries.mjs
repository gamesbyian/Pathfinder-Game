#!/usr/bin/env node
/** Phase-13 reqLen/reqInt ownership ratchet. Rename-neutral today; zero-leakage gate in 13B. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const requireNormalizedClean = process.argv.includes('--require-normalized-clean');
const BASELINE_PATH = 'docs/naming-cleanup-level-metric-boundaries.json';
const SELF = 'scripts/audit-level-metric-boundaries.mjs';
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
if (baseline.schemaVersion !== 1) throw new Error(`Unsupported ${BASELINE_PATH} schemaVersion`);

const categories = [
  ['raw/wire-boundary', 'rawWireBoundary'],
  ['normalized-runtime-consumer', 'normalizedRuntimeConsumer'],
  ['ambiguous/unclassified', 'ambiguousUnclassified'],
];
const owners = new Map();
const failures = [];
for (const [label, key] of categories) {
  if (!Array.isArray(baseline[key])) failures.push(`${key} must be an array`);
  for (const file of baseline[key] || []) {
    if (owners.has(file)) failures.push(`${file} is classified twice (${owners.get(file)} and ${label})`);
    owners.set(file, label);
  }
}

const hits = execFileSync('rg', [
  '-l', '--max-filesize', '2M', '--glob', '*.{js,cjs,mjs,ts,mts,tsx,md,yml,yaml}',
  '\\b(reqLen|reqInt)\\b', 'modules', 'scripts', 'docs', 'reports', 'logs', '.github',
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
const current = new Set(hits.filter(file => file !== SELF && !/^(?:docs\/archive|reports|logs|data)\//.test(file)));

for (const file of current) if (!owners.has(file)) failures.push(`${file} is a new unclassified metric access`);
for (const file of owners.keys()) if (!current.has(file)) failures.push(`${file} is a stale baseline entry (remove or reclassify it)`);
for (const [label, key] of categories) {
  console.log(`${label}: ${(baseline[key] || []).length} explicitly owned file(s)`);
  if (label === 'ambiguous/unclassified') {
    for (const file of baseline[key] || []) console.log(`  - ${file}`);
  }
}
console.log(`frozen/history: ${hits.length - current.size - (hits.includes(SELF) ? 1 : 0)} automatically retained file(s)`);
if (requireNormalizedClean && baseline.normalizedRuntimeConsumer.length) {
  failures.push(`${baseline.normalizedRuntimeConsumer.length} normalized runtime consumer(s) still use raw metric spellings`);
}
if (failures.length) {
  console.error('Phase-13 level-metric boundary audit failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Phase-13 level-metric boundary inventory valid${requireNormalizedClean ? '; normalized runtime is clean' : '; current accesses match the reviewed baseline'}.`);
