#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { familyArtifactRoots, variantFamilyDatasetRootArg } from './family-paths.mjs';

assert.equal(
  variantFamilyDatasetRootArg([]),
  process.cwd(),
  'no dataset-root argument must preserve current-working-directory behavior',
);

const relativeRoot = 'tmp/phase15c-family-root';
const resolvedRoot = path.resolve(relativeRoot);
assert.equal(
  variantFamilyDatasetRootArg([`--variant-family-dataset-root=${relativeRoot}`]),
  resolvedRoot,
  'canonical dataset-root CLI must resolve through the shared parser',
);
assert.equal(
  variantFamilyDatasetRootArg([`--trove-root=${relativeRoot}`]),
  resolvedRoot,
  'the one external legacy dataset-root alias must remain readable during its transition window',
);
assert.equal(
  variantFamilyDatasetRootArg([
    `--variant-family-dataset-root=${relativeRoot}`,
    '--trove-root=./tmp/phase15c-family-root',
  ]),
  resolvedRoot,
  'canonical plus legacy spellings that resolve to the same root must be accepted',
);
assert.equal(
  variantFamilyDatasetRootArg([
    `--variant-family-dataset-root=${relativeRoot}`,
    `--variant-family-dataset-root=${relativeRoot}`,
  ]),
  resolvedRoot,
  'duplicate same-value canonical arguments must remain harmless',
);
assert.throws(
  () => variantFamilyDatasetRootArg([
    '--variant-family-dataset-root=tmp/phase15c-a',
    '--trove-root=tmp/phase15c-b',
  ]),
  /conflicting variant-family dataset roots/u,
  'canonical and legacy spellings must reject genuinely different roots',
);

assert.deepEqual(
  familyArtifactRoots(relativeRoot),
  {
    root: resolvedRoot,
    families: path.join(resolvedRoot, 'data/families'),
    census: path.join(resolvedRoot, 'logs/family-census'),
    reports: path.join(resolvedRoot, 'reports/families'),
  },
  'renaming the private root parameter must not change family artifact path semantics',
);

const temp = mkdtempSync(path.join(tmpdir(), 'phase15c-family-root-'));
try {
  const canonicalOut = path.join(temp, 'canonical-index.json');
  const legacyOut = path.join(temp, 'legacy-index.json');
  const dualOut = path.join(temp, 'dual-index.json');

  for (const args of [
    ['index', `--variant-family-dataset-root=${temp}`, `--out=${canonicalOut}`],
    ['index', `--trove-root=${temp}`, `--out=${legacyOut}`],
    ['index', `--variant-family-dataset-root=${temp}`, `--trove-root=${temp}`, `--out=${dualOut}`],
  ]) {
    execFileSync(process.execPath, ['scripts/family-index.mjs', ...args], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  }

  const indexes = [canonicalOut, legacyOut, dualOut].map(file => JSON.parse(readFileSync(file, 'utf8')));
  assert.deepEqual(indexes[1], indexes[0], 'legacy alias must select the same dataset and produce the same disposable index');
  assert.deepEqual(indexes[2], indexes[0], 'same-value dual CLI must produce the same disposable index');

  const conflict = spawnSync(process.execPath, [
    'scripts/family-index.mjs',
    'index',
    `--variant-family-dataset-root=${temp}`,
    `--trove-root=${path.join(temp, 'other')}`,
    `--out=${path.join(temp, 'conflict.json')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(conflict.status, 0, 'conflicting external root spellings must fail the real family:index entrypoint');
  assert.match(conflict.stderr, /conflicting variant-family dataset roots/u);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('Phase-15C variant-family dataset-root parser/CLI behavior passed.');
