import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
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

  const patternObserved = withDetachedGitWorktree(root, 'HEAD', worktree => ({
    root: existsSync(path.join(worktree, 'root.txt')),
    kept: existsSync(path.join(worktree, 'kept', 'value.txt')),
    excluded: existsSync(path.join(worktree, 'excluded', 'value.txt')),
  }), { sparsePatterns: ['/root.txt', '/kept/value.txt'] });

  assert.equal(patternObserved.root, true, 'explicit root-file pattern is materialized');
  assert.equal(patternObserved.kept, true, 'explicit nested-file pattern is materialized');
  assert.equal(patternObserved.excluded, false, 'unmatched file-pattern path is excluded');

  // Regression for CI execution-owner sharding: independent Node contracts may materialize
  // historical refs concurrently from the same checkout. Git's first sparse worktree setup can
  // mutate shared .git/config, so the helper must serialize only that shared metadata boundary.
  const helperUrl = new URL('./git-ref-worktree-lib.mjs', import.meta.url).href;
  const childSource = `
    import { withDetachedGitWorktree } from ${JSON.stringify(helperUrl)};
    const [root] = process.argv.slice(1);
    withDetachedGitWorktree(root, 'HEAD', () => {
      const until = Date.now() + 100;
      while (Date.now() < until) {}
    }, { sparsePatterns: ['/root.txt'] });
  `;
  const runChild = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', childSource, root], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(null) : reject(new Error(stderr || `child exited ${code}`)));
  });
  await Promise.all([runChild(), runChild()]);

  assert.throws(
    () => withDetachedGitWorktree(root, 'HEAD', () => null, {
      sparseDirectories: ['kept'],
      sparsePatterns: ['/root.txt'],
    }),
    /choose sparseDirectories or sparsePatterns/,
  );

  console.log('git-ref-worktree sparse checkout test passed');
} finally {
  rmSync(root, { recursive: true, force: true });
}
