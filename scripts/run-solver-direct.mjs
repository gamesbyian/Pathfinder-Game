#!/usr/bin/env node
/**
 * Parity runner for solver audits.
 *
 * This script intentionally delegates execution to scripts/run-level-audit.mjs
 * so CLI and CI users get the same New Hint audit pathway as the in-browser
 * Playwright audit flow.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.split('=');
      return [k, rest.join('=') ?? ''];
    })
);
const argFlags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));

if (argFlags.has('--help') || argFlags.has('-h')) {
  console.log(`Usage:
  node scripts/run-solver-direct.mjs [run-level-audit options]

Behavior:
  - Delegates to scripts/run-level-audit.mjs with equivalent level filter.
  - Forces output to audits/local-direct/latest.json unless --output is provided.
  - Prints a compact solved/failed/error summary from the exported audit JSON.

Examples:
  node scripts/run-solver-direct.mjs --levels=all
  node scripts/run-solver-direct.mjs --levels=92 --timeout-ms=180000
`);
  process.exit(0);
}

const outputFile = argMap.get('--output') || 'audits/local-direct/latest.json';
const delegatedArgs = args.filter((arg) => !arg.startsWith('--output='));
if (![...argFlags].includes('--output')) delegatedArgs.push(`--output=${outputFile}`);

const run = (cmd, cmdArgs) => new Promise((resolve, reject) => {
  const child = spawn(cmd, cmdArgs, { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`Command failed (${code}): ${cmd} ${cmdArgs.join(' ')}`));
  });
});

const summarize = (payload) => {
  const statusCounts = payload?.statusCounts || {};
  const success = Number(statusCounts.success) || 0;
  const timeout = Number(statusCounts.timeout) || 0;
  const inconclusive = Number(statusCounts.noSolutionInconclusive) || 0;
  const proven = Number(statusCounts.noSolutionProven) || 0;
  const aborted = Number(statusCounts.aborted) || 0;
  const error = Number(statusCounts.error) || 0;
  const failed = timeout + inconclusive + proven + aborted + error;
  const attempted = Number(payload?.levelCount) || (Array.isArray(payload?.levels) ? payload.levels.length : 0);
  return { success, failed, error, attempted };
};

const main = async () => {
  console.log('[run-solver-direct] Delegating to run-level-audit.mjs for full parity.');
  await run(process.execPath, ['scripts/run-level-audit.mjs', ...delegatedArgs]);

  const outputPath = path.resolve(process.cwd(), outputFile);
  const raw = await readFile(outputPath, 'utf8');
  const payload = JSON.parse(raw);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const s = summarize(payload);
  console.log(`\nSummary: ${s.success} solved, ${s.failed} failed, ${s.error} errored (${s.attempted} attempted)`);
};

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
