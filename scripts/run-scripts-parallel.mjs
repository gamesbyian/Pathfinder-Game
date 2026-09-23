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
 * typical 4-core box on its own (`test:node` has grown past 160 child scripts;
 * by default this runner still starts all requested scripts, while
 * PATHFINDER_PARALLEL_JOBS provides an opt-in bounded pool for measurement;
 * `check` fans out over a dozen; vitest spawns its own
 * worker pool), so stacking all three at once oversubscribes the machine
 * several times over and made a timing-sensitive solver test fail under the
 * resulting contention in local testing — not a flaky test, a real
 * scheduling artifact of demanding 40+-way concurrency from 4 cores. Real
 * three-way parallelism for those phases needs three separate runners (see
 * .github/workflows/ci.yml's parallel jobs), not one process fanning out
 * further on the same box.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const requestedNames = process.argv.slice(2);
if (requestedNames.length === 0) {
  console.error('usage: node scripts/run-scripts-parallel.mjs <script> [<script> ...]');
  process.exit(2);
}

const names = requestedNames;
const directPackageScripts = process.env.PATHFINDER_DIRECT_PACKAGE_SCRIPTS === '1';
const packageScripts = directPackageScripts
  ? JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).scripts ?? {}
  : null;

function concurrencyLimit() {
  const raw = process.env.PATHFINDER_PARALLEL_JOBS?.trim();
  if (!raw) return names.length;
  if (!/^\d+$/u.test(raw)) {
    console.error('PATHFINDER_PARALLEL_JOBS must be a positive integer');
    process.exit(2);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    console.error('PATHFINDER_PARALLEL_JOBS must be a positive integer');
    process.exit(2);
  }
  return Math.min(parsed, names.length);
}

const jobs = concurrencyLimit();

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function spawnPackageScript(name) {
  if (!directPackageScripts) {
    return spawn(npmCmd, ['run', name], { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  const command = packageScripts?.[name];
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error(`package script is missing: ${name}`);
  }
  const binDir = path.join(process.cwd(), 'node_modules', '.bin');
  const env = {
    ...process.env,
    PATH: [binDir, process.env.PATH ?? ''].filter(Boolean).join(path.delimiter),
  };
  return spawn(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env,
  });
}

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
    let child;
    try {
      child = spawnPackageScript(name);
    } catch (error) {
      chunks.push(Buffer.from(`${error.message}\n`));
      finish(1);
      return;
    }
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    child.on('error', (error) => {
      chunks.push(Buffer.from(`${error.message}\n`));
      finish(1);
    });
    child.on('close', (code) => finish(code ?? 1));
  });
}

const results = new Array(names.length);
let nextIndex = 0;

async function worker() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= names.length) return;
    results[index] = await runScript(names[index]);
  }
}

await Promise.all(Array.from({ length: jobs }, () => worker()));

console.log(`\n--- parallel run summary (mode=${directPackageScripts ? 'direct' : 'npm'}, jobs=${jobs}/${names.length}) ---`);
for (const { name, code, seconds } of results) {
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name} (${seconds}s)`);
}

process.exit(results.every(({ code }) => code === 0) ? 0 : 1);
