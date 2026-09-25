import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { withDetachedGitWorktree } from './git-ref-worktree-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'git-ref-worktree-test-'));
const git = (...args) => execFileSync('git', args, {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  git('init', '--quiet');
  git('config', 'user.email', 'ci@example.test');
  git('config', 'user.name', 'CI Test');

  mkdirSync(path.join(root, 'kept'), { recursive: true });
  mkdirSync(path.join(root, 'excluded'), { recursive: true });
  writeFileSync(path.join(root, 'root.txt'), 'root\n');
  writeFileSync(path.join(root, 'kept', 'value.txt'), 'kept\n');
  writeFileSync(path.join(root, 'excluded', 'value.txt'), 'excluded\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');

  const observed = withDetachedGitWorktree(root, 'HEAD', worktree => ({
    root: existsSync(path.join(worktree, 'root.txt')),
    kept: existsSync(path.join(worktree, 'kept', 'value.txt')),
    excluded: existsSync(path.join(worktree, 'excluded', 'value.txt')),
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: worktree, encoding: 'utf8' }).trim(),
  }), { sparseDirectories: ['kept'] });

  assert.equal(observed.root, true, 'cone sparse checkout preserves root files');
  assert.equal(observed.kept, true, 'requested directory is materialized');
  assert.equal(observed.excluded, false, 'unrequested directory is not materialized');
  assert.equal(observed.head, git('rev-parse', 'HEAD').trim(), 'detached sparse worktree resolves the requested ref');

  console.log('git-ref-worktree sparse checkout test passed');
} finally {
  rmSync(root, { recursive: true, force: true });
}
