#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['scripts', 'docs', '.github'];
const TOP_LEVEL = ['package.json', 'AGENTS.md', 'README.md'];
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.py', '.md', '.json', '.yml', '.yaml']);

function posix(file) {
  return file.split(path.sep).join('/');
}

function walk(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return out;
    throw error;
  }
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

const files = [
  ...ROOTS.flatMap(walk),
  ...TOP_LEVEL,
].filter((file, index, all) => all.indexOf(file) === index)
  .filter(file => {
    try {
      return statSync(file).isFile() && TEXT_EXTENSIONS.has(path.extname(file));
    } catch {
      return false;
    }
  })
  .filter(file => !isAuthorityOrGuard(file))
  .sort();

const failures = [];
const legacyCliOwners = [];
const canonicalHelperImporters = [];
const canonicalCliFiles = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  if (/\btroveRootArg\b/u.test(source)) {
    failures.push(`${file}: retired NC-P15-008 helper troveRootArg`);
  }
  if (/\btroveRoot\b/u.test(source)) {
    failures.push(`${file}: retired NC-P15-008 private local/parameter troveRoot`);
  }

  if (source.includes('--trove-root=')) legacyCliOwners.push(file);
  if (source.includes('variantFamilyDatasetRootArg')) canonicalHelperImporters.push(file);
  if (source.includes('--variant-family-dataset-root=')) canonicalCliFiles.push(file);
}

assert.deepEqual(
  legacyCliOwners.sort(),
  [
    'scripts/family-paths.mjs',
    'scripts/variant-family-dataset-root-node-test.mjs',
  ],
  'the temporary --trove-root alias must exist only in the one shared parser and its behavior test',
);

assert.deepEqual(
  canonicalHelperImporters.sort(),
  [
    'scripts/family-index.mjs',
    'scripts/family-parent-hint-replay-batch.mjs',
    'scripts/family-paths.mjs',
    'scripts/variant-family-dataset-root-node-test.mjs',
  ],
  'canonical root-parser ownership must be the parser, two maintained consumers, and the behavior test',
);

for (const required of [
  'docs/tooling-catalog.md',
  'docs/variant-level-research.md',
  'scripts/family-index.mjs',
]) {
  assert.ok(canonicalCliFiles.includes(required), `${required} must teach the canonical dataset-root CLI`);
}

if (failures.length) {
  console.error('Phase-15C closeout found retired private dataset-root vocabulary:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const familyPaths = readFileSync('scripts/family-paths.mjs', 'utf8');
assert.match(familyPaths, /export function variantFamilyDatasetRootArg\(/u);
assert.doesNotMatch(familyPaths, /export function troveRootArg\(/u);
assert.match(familyPaths, /const legacyPrefix = '--trove-root='/u);
assert.match(familyPaths, /conflicting variant-family dataset roots/u);

console.log(`Phase-15C closeout clean: ${files.length} maintained text surfaces contain no retired private dataset-root vocabulary; external alias ownership is exact.`);
