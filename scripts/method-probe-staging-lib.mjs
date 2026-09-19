import { readdirSync } from 'node:fs';

// method-probe-sweep.yml's combine job downloads every `method-probe-shard-*` outer-shard
// artifact with actions/download-artifact's `pattern` matcher (merge-multiple: false). When
// several artifacts match, each artifact's files land under `<staging-dir>/<artifact-name>/`, and
// combine-method-probe-shards.mjs's per-directory scan finds them correctly. When exactly one
// artifact matches — every shard_count=1 dispatch, such as a single-level execution-family canary
// — the observed behavior is different: the artifact's files land directly inside `staging-dir`
// with no per-artifact subdirectory at all. A directory-name-only scan then sees zero
// `method-probe-shard-*` entries and silently reports "0 tested, 0 solved, 0 missing", which
// reads as an empty/negative result even though the worker actually ran and wrote a real result.
// Detect that flat layout and treat the staging directory itself as one synthetic shard directory
// so single-outer-shard sweeps are not lost.
const SHARD_RESULT_FILE_PATTERN = /^shard-\d+-w\d+\.(json|console\.log|exit-status)$/u;

/**
 * Resolve the set of "one shard directory per outer GitHub Actions job" entries under a
 * method-probe-sweep staging directory, tolerating both the per-artifact-subdirectory layout
 * (several matched artifacts) and the flat layout (exactly one matched artifact). Returned entries
 * are directory names relative to `stagingDir`; `'.'` means the staging directory itself.
 */
export function resolveMethodProbeShardDirs(stagingDir) {
  let entries;
  try {
    entries = readdirSync(stagingDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const namedDirs = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('method-probe-shard-'))
    .map(entry => entry.name);
  if (namedDirs.length > 0) return namedDirs;

  const hasFlatShardFiles = entries.some(entry => entry.isFile() && SHARD_RESULT_FILE_PATTERN.test(entry.name));
  return hasFlatShardFiles ? ['.'] : [];
}
