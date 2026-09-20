#!/usr/bin/env node
// Prints the number of observed outer-shard directories under a method-probe-sweep staging
// directory, using the same flat/nested-layout-tolerant detection as
// combine-method-probe-shards.mjs (see method-probe-staging-lib.mjs). method-probe-sweep.yml's
// combine job uses this instead of `find <dir> -mindepth 1 -maxdepth 1 -type d | wc -l`, which
// undercounts a single-outer-shard dispatch whose one matched artifact downloads flat with no
// subdirectory.
//
// Usage: node scripts/count-method-probe-shard-dirs.mjs --staging-dir=artifact-staging
import { resolveMethodProbeShardDirs } from './method-probe-staging-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const [k, ...v] = a.split('=');
  return [k.slice(2), v.join('=')];
}));
const stagingDir = args.get('staging-dir') || 'artifact-staging';
console.log(resolveMethodProbeShardDirs(stagingDir).length);
