#!/usr/bin/env node
/** Phase-13 reqLen/reqInt ownership ratchet. Permanent raw-wire allowlist after the 13B runtime migration. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const requestedNormalizedClean = process.argv.includes('--require-normalized-clean');
const BASELINE_PATH = 'docs/naming-cleanup-level-metric-boundaries.json';
const SELF = 'scripts/audit-level-metric-boundaries.mjs';
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
if (baseline.schemaVersion !== 2) throw new Error(`Unsupported ${BASELINE_PATH} schemaVersion`);
const requireNormalizedClean = requestedNormalizedClean || baseline.normalizedMigrationComplete === true;

const categories = [
  ['raw/wire-boundary', 'rawWireBoundary'],
  ['normalized-runtime-consumer', 'normalizedRuntimeConsumer'],
  ['mixed raw+normalized', 'mixedRawAndNormalized'],
  ['retained non-normalized use', 'retainedNonNormalizedUse'],
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

const ROOTS = ['modules', 'scripts', 'docs', 'reports', 'logs', '.github'];
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.md', '.yml', '.yaml']);
const MAX_BYTES = 2 * 1024 * 1024;
const METRIC_PATTERN = /\b(?:reqLen|reqInt)\b/;

function collectMetricHits(root) {
  const hits = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return hits;
    throw error;
  }

  for (const entry of entries) {
    const file = path.posix.join(root.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) {
      hits.push(...collectMetricHits(file));
      continue;
    }
    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (statSync(file).size > MAX_BYTES) continue;
    if (METRIC_PATTERN.test(readFileSync(file, 'utf8'))) hits.push(file);
  }
  return hits;
}

const hits = ROOTS.flatMap(collectMetricHits);
const current = new Set(hits.filter(file => file !== SELF && !/^(?:docs\/(?:archive|history)|reports|logs|data)\//.test(file)));

for (const file of current) if (!owners.has(file)) failures.push(`${file} is a new unclassified metric access`);
for (const file of owners.keys()) if (!current.has(file)) failures.push(`${file} is a stale baseline entry (remove or reclassify it)`);
for (const [label, key] of categories) {
  console.log(`${label}: ${(baseline[key] || []).length} explicitly owned file(s)`);
  if (label === 'ambiguous/unclassified' || label === 'mixed raw+normalized') {
    for (const file of baseline[key] || []) console.log(`  - ${file}`);
  }
}
console.log(`frozen/history: ${hits.length - current.size - (hits.includes(SELF) ? 1 : 0)} automatically retained file(s)`);
if (requireNormalizedClean && baseline.normalizedRuntimeConsumer.length) {
  failures.push(`${baseline.normalizedRuntimeConsumer.length} normalized runtime consumer(s) still use raw metric spellings`);
}
if (requireNormalizedClean && baseline.mixedRawAndNormalized.length) {
  failures.push(`${baseline.mixedRawAndNormalized.length} mixed raw+normalized file(s) still require explicit post-migration reclassification`);
}
if (baseline.ambiguousUnclassified.length) {
  failures.push(`${baseline.ambiguousUnclassified.length} metric-access file(s) remain ambiguous/unclassified`);
}
if (failures.length) {
  console.error('Phase-13 level-metric boundary audit failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Phase-13 level-metric boundary inventory valid${requireNormalizedClean ? '; normalized runtime is clean and mixed legacy ownership is resolved' : '; current accesses match the reviewed ownership inventory'}.`);
