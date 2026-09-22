#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

function parseArgs(argv) {
  let jobs = '4,8,16,unbounded';
  let repeats = 1;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--jobs') { jobs = argv[++i]; continue; }
    if (arg.startsWith('--jobs=')) { jobs = arg.slice('--jobs='.length); continue; }
    if (arg === '--repeats') { repeats = Number(argv[++i]); continue; }
    if (arg.startsWith('--repeats=')) { repeats = Number(arg.slice('--repeats='.length)); continue; }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 10) throw new Error('--repeats must be an integer from 1 to 10');
  const variants = jobs.split(',').map(value => value.trim()).filter(Boolean);
  if (!variants.length) throw new Error('--jobs must contain at least one entry');
  for (const variant of variants) {
    if (variant === 'unbounded') continue;
    if (!/^\d+$/u.test(variant) || Number(variant) < 1) throw new Error(`invalid jobs value: ${variant}`);
  }
  return { variants, repeats };
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runVariant(variant, repeat) {
  return new Promise(resolve => {
    const started = process.hrtime.bigint();
    const env = { ...process.env };
    if (variant === 'unbounded') delete env.PATHFINDER_PARALLEL_JOBS;
    else env.PATHFINDER_PARALLEL_JOBS = variant;
    console.log(`\n=== benchmark jobs=${variant} repeat=${repeat} ===`);
    const child = spawn(npmCmd, ['run', 'test:node'], { stdio: 'inherit', env });
    child.on('error', error => {
      console.error(error.message);
      resolve({ variant, repeat, code: 1, seconds: Number(process.hrtime.bigint() - started) / 1e9 });
    });
    child.on('close', code => {
      resolve({ variant, repeat, code: code ?? 1, seconds: Number(process.hrtime.bigint() - started) / 1e9 });
    });
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const { variants, repeats } = parseArgs(process.argv.slice(2));
const rows = [];
for (const variant of variants) {
  for (let repeat = 1; repeat <= repeats; repeat += 1) rows.push(await runVariant(variant, repeat));
}

const summary = variants.map(variant => {
  const runs = rows.filter(row => row.variant === variant);
  const passed = runs.filter(row => row.code === 0);
  return {
    jobs: variant,
    runs: runs.length,
    passed: passed.length,
    medianSeconds: passed.length ? Number(median(passed.map(row => row.seconds)).toFixed(2)) : null,
    minSeconds: passed.length ? Number(Math.min(...passed.map(row => row.seconds)).toFixed(2)) : null,
    maxSeconds: passed.length ? Number(Math.max(...passed.map(row => row.seconds)).toFixed(2)) : null,
  };
});

console.log('\n=== Node harness concurrency benchmark ===');
console.log(JSON.stringify({ schemaVersion: 1, variants: summary, runs: rows }, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## Node harness concurrency benchmark',
    '',
    '| jobs | passed/runs | median s | min s | max s |',
    '|---:|---:|---:|---:|---:|',
    ...summary.map(row => `| ${row.jobs} | ${row.passed}/${row.runs} | ${row.medianSeconds ?? 'n/a'} | ${row.minSeconds ?? 'n/a'} | ${row.maxSeconds ?? 'n/a'} |`),
    '',
    'All variants execute the same `npm run test:node` population sequentially on this runner. ',
    'Use repeated runs before changing the default; runner state/order effects still make this a benchmark, not a correctness proof.',
    '',
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

process.exit(rows.every(row => row.code === 0) ? 0 : 1);
