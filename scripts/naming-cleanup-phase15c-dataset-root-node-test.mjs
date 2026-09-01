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
  variantFamilyDatasetRootArg([
    `--variant-family-dataset-root=${relativeRoot}`,
    `--variant-family-dataset-root=${relativeRoot}`,
  ]),
  resolvedRoot,
  'duplicate same-value canonical arguments must remain harmless',
);
assert.throws(
  () => variantFamilyDatasetRootArg([
    '--variant-family-dataset-root=tmp/phase15j-a',
    '--variant-family-dataset-root=tmp/phase15j-b',
  ]),
  /conflicting variant-family dataset roots/u,
  'conflicting canonical roots must still fail explicitly',
);
assert.throws(
  () => variantFamilyDatasetRootArg(['--trove-root=tmp/phase15j-retired']),
  /retired variant-family dataset-root option/u,
  'Phase 15J must reject the retired external dataset-root spelling instead of silently falling back',
);

assert.deepEqual(
  familyArtifactRoots(relativeRoot),
  {
    root: resolvedRoot,
    families: path.join(resolvedRoot, 'data/families'),
    census: path.join(resolvedRoot, 'logs/family-census'),
    reports: path.join(resolvedRoot, 'reports/families'),
  },
  'canonical dataset-root vocabulary must not change family artifact path semantics',
);

const temp = mkdtempSync(path.join(tmpdir(), 'phase15j-family-root-'));
try {
  const canonicalOut = path.join(temp, 'canonical-index.json');
  execFileSync(process.execPath, [
    'scripts/family-index.mjs',
    'index',
    `--variant-family-dataset-root=${temp}`,
    `--out=${canonicalOut}`,
  ], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  const canonicalIndex = JSON.parse(readFileSync(canonicalOut, 'utf8'));
  assert.equal(canonicalIndex.schemaVersion, 4);

  const retired = spawnSync(process.execPath, [
    'scripts/family-index.mjs',
    'index',
    `--trove-root=${temp}`,
    `--out=${path.join(temp, 'retired.json')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(retired.status, 0, 'retired dataset-root CLI must fail the real family:index entrypoint');
  assert.match(retired.stderr, /retired variant-family dataset-root option/u);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('Phase-15C/15J variant-family dataset-root canonical-only behavior passed.');
