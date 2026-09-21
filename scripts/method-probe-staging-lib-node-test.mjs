import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveMethodProbeShardDirs } from './method-probe-staging-lib.mjs';

function tempDir() {
  return mkdtempSync(path.join(os.tmpdir(), 'method-probe-staging-lib-'));
}

// Nested layout: several matched artifacts each land in their own subdirectory.
{
  const staging = tempDir();
  mkdirSync(path.join(staging, 'method-probe-shard-001'), { recursive: true });
  mkdirSync(path.join(staging, 'method-probe-shard-002'), { recursive: true });
  writeFileSync(path.join(staging, 'method-probe-shard-001', 'shard-001-w1.json'), '{}');
  writeFileSync(path.join(staging, 'method-probe-shard-002', 'shard-002-w1.json'), '{}');
  const dirs = resolveMethodProbeShardDirs(staging);
  assert.deepEqual(dirs.sort(), ['method-probe-shard-001', 'method-probe-shard-002']);
}

// Flat layout: exactly one matched artifact downloads directly into the staging directory with no
// per-artifact subdirectory (the observed actions/download-artifact behavior for a single match).
{
  const staging = tempDir();
  mkdirSync(staging, { recursive: true });
  writeFileSync(path.join(staging, 'shard-001-w1.json'), '{}');
  writeFileSync(path.join(staging, 'shard-001-w1.console.log'), 'worker started\n');
  writeFileSync(path.join(staging, 'shard-001-w1-summary.md'), '# summary\n');
  const dirs = resolveMethodProbeShardDirs(staging);
  assert.deepEqual(dirs, ['.']);
}

// Mixed flat/nested layout is not a third supported transport shape. If both are present,
// silently preferring the named directories could ignore stale/extra shard evidence at the root.
{
  const staging = tempDir();
  mkdirSync(path.join(staging, 'method-probe-shard-001'), { recursive: true });
  writeFileSync(path.join(staging, 'method-probe-shard-001', 'shard-001-w1.json'), '{}');
  writeFileSync(path.join(staging, 'shard-001-w1.json'), '{}');
  assert.throws(
    () => resolveMethodProbeShardDirs(staging),
    /mixes flat shard files with named outer-shard directories/u,
  );
}

// Empty/missing staging directory: no shard evidence at all.
{
  const staging = tempDir();
  assert.deepEqual(resolveMethodProbeShardDirs(staging), []);
  assert.deepEqual(resolveMethodProbeShardDirs(path.join(staging, 'does-not-exist')), []);
}

// Unrelated files in a flat layout must not be mistaken for shard evidence.
{
  const staging = tempDir();
  writeFileSync(path.join(staging, 'README.md'), 'not a shard file\n');
  assert.deepEqual(resolveMethodProbeShardDirs(staging), []);
}

console.log('method-probe staging lib tests passed');
