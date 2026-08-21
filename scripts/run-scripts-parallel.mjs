#!/usr/bin/env node
/**
 * Runs independent package.json scripts concurrently, buffering each script's
 * output and printing it whole as each finishes (no interleaving), tagged
 * with its own elapsed time — a per-command timing report as a side effect of
 * running things in parallel, not an extra step.
 *
 * Used by `check` and `test:node` to fan out their own independent
 * sub-checks/sub-validators (replacing `run-p`, which gives none of that
 * timing/output attribution — see the "parallel run summary" each produces).
 *
 * Deliberately NOT used to run `check`/`test:coverage`/`test:node` themselves
 * in parallel inside `npm run ci`: each of those three already saturates a
 * typical 4-core box on its own (`test:node` alone fans out ~30 concurrent
 * child processes; `check` fans out over a dozen; vitest spawns its own
 * worker pool), so stacking all three at once oversubscribes the machine
 * several times over and made a timing-sensitive solver test fail under the
 * resulting contention in local testing — not a flaky test, a real
 * scheduling artifact of demanding 40+-way concurrency from 4 cores. Real
 * three-way parallelism for those phases needs three separate runners (see
 * .github/workflows/ci.yml's parallel jobs), not one process fanning out
 * further on the same box.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('usage: node scripts/run-scripts-parallel.mjs <script> [<script> ...]');
  process.exit(2);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runScript(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    const chunks = [];
    const finish = (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      process.stdout.write(`\n=== ${name} (exit ${code}, ${seconds}s) ===\n`);
      process.stdout.write(Buffer.concat(chunks));
      resolve({ name, code, seconds });
    };
    const child = spawn(npmCmd, ['run', name], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    child.on('error', (error) => {
      chunks.push(Buffer.from(`${error.message}\n`));
      finish(1);
    });
    child.on('close', (code) => finish(code ?? 1));
  });
}

const results = await Promise.all(names.map(runScript));

console.log('\n--- parallel run summary ---');
for (const { name, code, seconds } of results) {
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name} (${seconds}s)`);
}

process.exit(results.every(({ code }) => code === 0) ? 0 : 1);
