#!/usr/bin/env node
/**
 * Runs independent package.json scripts concurrently, buffering each script's
 * output and printing it whole as each finishes (no interleaving).
 *
 * Used by `npm run ci` to run its three phases (`check`, `test:coverage`,
 * `test:node`) in parallel: the phases are mutually independent — static
 * checks, the vitest coverage run, and the node validators share no writable
 * paths (`.solver-tools/` bundling only happens inside `test:node`, which
 * stays internally sequential) — so the gate's wall time is max(phase) instead
 * of sum(phase). Unlike the old `&&` chain, every phase runs to completion
 * even when another fails (strictly more failure signal per run); the exit
 * code is still nonzero if any phase failed, so nothing passes that the
 * sequential form would have caught.
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
