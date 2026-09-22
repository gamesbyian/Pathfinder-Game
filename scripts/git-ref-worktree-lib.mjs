import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function withDetachedGitWorktree(root, ref, callback) {
    const gitRef = String(ref ?? '').trim();
    if (!gitRef) throw new Error('git ref is required');
    if (typeof callback !== 'function') throw new Error('git worktree callback is required');

    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'pathfinder-git-ref-'));
    const worktree = path.join(tempRoot, 'repo');
    let added = false;

    try {
        execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktree, gitRef], {
            cwd: gitRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        added = true;
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
