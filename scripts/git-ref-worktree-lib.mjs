import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const sleepArray = new Int32Array(new SharedArrayBuffer(4));

function withGitWorktreeMetadataLock(gitRoot, callback) {
    const commonDirRaw = execFileSync('git', ['rev-parse', '--git-common-dir'], {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const commonDir = path.resolve(gitRoot, commonDirRaw);
    const lockDir = path.join(commonDir, 'pathfinder-worktree-metadata.lock');
    const deadline = Date.now() + 15000;
    while (true) {
        try {
            mkdirSync(lockDir);
            break;
        } catch (error) {
            if (error?.code !== 'EEXIST') throw error;
            if (Date.now() >= deadline) throw new Error('timed out waiting for Pathfinder git-worktree metadata lock');
            Atomics.wait(sleepArray, 0, 0, 25);
        }
    }
    try {
        return callback();
    } finally {
        rmSync(lockDir, { recursive: true, force: true });
    }
}


export function withDetachedGitWorktree(root, ref, callback, { sparseDirectories = [], sparsePatterns = [] } = {}) {
    const gitRef = String(ref ?? '').trim();
    if (!gitRef) throw new Error('git ref is required');
    if (sparseDirectories.length && sparsePatterns.length) throw new Error('choose sparseDirectories or sparsePatterns, not both');
    if (typeof callback !== 'function') throw new Error('git worktree callback is required');

    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'pathfinder-git-ref-'));
    const worktree = path.join(tempRoot, path.basename(tempRoot));
    let added = false;

    try {
        const addArgs = ['worktree', 'add', '--detach', '--quiet'];
        if (sparseDirectories.length || sparsePatterns.length) addArgs.push('--no-checkout');
        addArgs.push(worktree, gitRef);
        withGitWorktreeMetadataLock(gitRoot, () => execFileSync('git', addArgs, {
            cwd: gitRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        }));
        added = true;
        if (sparseDirectories.length || sparsePatterns.length) {
            const sparseArgs = sparsePatterns.length
                ? ['sparse-checkout', 'set', '--no-cone', ...sparsePatterns]
                : ['sparse-checkout', 'set', '--cone', ...sparseDirectories];
            execFileSync('git', sparseArgs, {
                cwd: worktree,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            execFileSync('git', ['checkout', '--detach', '--quiet', gitRef], {
                cwd: worktree,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        }
        return callback(worktree);
    } catch (error) {
        const detail = String(error?.stderr ?? error?.message ?? error).trim();
        throw new Error('failed to materialize git ref ' + gitRef + (detail ? ': ' + detail : ''));
    } finally {
        if (added) {
            try {
                withGitWorktreeMetadataLock(gitRoot, () => execFileSync('git', ['worktree', 'remove', '--force', worktree], {
                    cwd: gitRoot,
                    stdio: ['ignore', 'pipe', 'pipe'],
                }));
            } catch {
                try {
                    execFileSync('git', ['worktree', 'prune'], {
                        cwd: gitRoot,
                        stdio: ['ignore', 'pipe', 'pipe'],
                    });
                } catch {
                    // Best-effort metadata cleanup only.
                }
            }
        }
        rmSync(tempRoot, { recursive: true, force: true });
    }
}
