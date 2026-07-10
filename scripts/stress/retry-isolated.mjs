/**
 * Re-solves a single level in a FRESH child process (not just a second call in the current
 * process) before a caller reports it as a genuine regression — the highest-priority item from
 * the "cheap tail" of the original regression-testing brainstorm: a suspicious failure should be
 * isolated-retried, not trusted on a single in-process result, since CPU-throttled sandboxes make
 * wall-clock-edge outcomes noisy and a fresh process also rules out any same-process
 * contamination (GC pressure, module-level cache state) from levels solved earlier in the run.
 *
 * Plain JS, no TS imports — this file itself never needs esbuild bundling, only the child it
 * spawns (scripts/stress/solve-one.mjs) does, via the same run-bundled.mjs wrapper every other
 * solver-importing CLI in this repo uses.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

/**
 * @param {{ corpusFile: string, levelId: string, budgetMs?: number, root?: string }} opts
 * @returns {{ id: string, status: string, ok: boolean, refereeValid: boolean|null,
 *             elapsedMs?: number, nodesExpanded?: number|null, error?: string }}
 */
export function retryLevelIsolated({ corpusFile, levelId, budgetMs = 20000, root = process.cwd() }) {
    const runBundled = path.resolve(root, 'scripts/run-bundled.mjs');
    const entry = path.resolve(root, 'scripts/stress/solve-one.mjs');
    let stdout;
    try {
        stdout = execFileSync(process.execPath, [
            runBundled, entry,
            `--corpus=${corpusFile}`, `--id=${levelId}`, `--budget-ms=${budgetMs}`,
        ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
        return { id: levelId, status: 'error', ok: false, refereeValid: null, error: `retry process failed: ${err?.message}` };
    }
    const lastLine = stdout.trim().split('\n').pop();
    try {
        return JSON.parse(lastLine);
    } catch {
        return { id: levelId, status: 'error', ok: false, refereeValid: null, error: `unparseable retry output: ${lastLine}` };
    }
}
