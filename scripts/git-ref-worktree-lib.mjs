import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
        execFileSync('git', addArgs, {
            cwd: gitRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
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
                execFileSync('git', ['worktree', 'remove', '--force', worktree], {
                    cwd: gitRoot,
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
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
