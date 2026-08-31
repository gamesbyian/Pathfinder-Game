import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Tracked repository paths. Local checks may include untracked files where useful. */
export function listRepositoryFiles(root, { includeUntracked = false } = {}) {
  const args = ['ls-files', '-z'];
  if (includeUntracked) args.splice(1, 0, '--cached', '--others', '--exclude-standard');
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

/**
 * On PR merge refs, HEAD^1 is the tested base parent. Callers opt into incremental scanning with
 * PATHFINDER_PR_INCREMENTAL=1; local/manual checks intentionally return null and scan everything.
 */
export function prChangedFiles(root) {
  if (process.env.PATHFINDER_PR_INCREMENTAL !== '1') return null;
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD^1'], { cwd: root, stdio: 'ignore' });
    return execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', '-z', 'HEAD^1', 'HEAD'],
      { cwd: root, encoding: 'utf8' },
    ).split('\0').filter(Boolean);
  } catch (error) {
    throw new Error(
      'PATHFINDER_PR_INCREMENTAL requires the PR merge commit and its first parent; checkout with fetch-depth >= 2',
      { cause: error },
    );
  }
}

/** Read a path from the working tree when materialized, otherwise directly from the tested HEAD. */
export function readRepositoryText(root, relativePath) {
  const full = path.resolve(root, relativePath);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return fs.readFileSync(full, 'utf8');
  const object = `HEAD:${relativePath}`;
  const blobBytes = Number.parseInt(
    execFileSync('git', ['cat-file', '-s', object], { cwd: root, encoding: 'utf8' }).trim(),
    10,
  );
  // Node's execFileSync default maxBuffer is far smaller than some tracked report blobs.
  // Size the buffer from Git's own blob metadata so sparse-checkout readers remain correct
  // without materializing large reports merely to inspect them.
  const maxBuffer = Number.isFinite(blobBytes)
    ? Math.max(1024 * 1024, blobBytes + 1024 * 1024)
    : 64 * 1024 * 1024;
  return execFileSync('git', ['show', object], { cwd: root, encoding: 'utf8', maxBuffer });
}

/** File/directory existence that remains correct under sparse checkout. */
export function repositoryPathKind(root, relativePath, files = null) {
  const full = path.resolve(root, relativePath);
  if (fs.existsSync(full)) return fs.statSync(full).isDirectory() ? 'directory' : 'file';
  const known = files ?? listRepositoryFiles(root, { includeUntracked: true });
  if (known.includes(relativePath)) return 'file';
  const prefix = `${relativePath.replace(/\/$/, '')}/`;
  return known.some(file => file.startsWith(prefix)) ? 'directory' : null;
}
