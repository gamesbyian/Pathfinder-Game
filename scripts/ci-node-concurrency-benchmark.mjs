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
for (let repeat = 1; repeat <= repeats; repeat += 1) {
  const shift = (repeat - 1) % variants.length;
  const order = [...variants.slice(shift), ...variants.slice(0, shift)];
  console.log(`\n=== benchmark round ${repeat}/${repeats}: ${order.join(' -> ')} ===`);
  for (const variant of order) rows.push(await runVariant(variant, repeat));
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

const baseline = summary.find(row => row.jobs === 'unbounded' && row.medianSeconds != null) ?? null;
for (const row of summary) {
  row.speedupVsUnbounded = baseline && row.medianSeconds
    ? Number((baseline.medianSeconds / row.medianSeconds).toFixed(3))
    : null;
}

const complete = summary.filter(row => row.passed === row.runs && row.medianSeconds != null);
const fastest = complete.length
  ? [...complete].sort((a, b) => a.medianSeconds - b.medianSeconds)[0]
  : null;
const conclusion = !fastest
  ? 'No worker-pool variant completed every requested run; do not change the default.'
  : fastest.jobs === 'unbounded'
    ? 'The historical unbounded fan-out has the lowest observed median in this run.'
    : baseline
      ? `jobs=${fastest.jobs} has the lowest observed median (${fastest.medianSeconds}s), `
        + `${fastest.speedupVsUnbounded}x versus unbounded (${baseline.medianSeconds}s).`
      : `jobs=${fastest.jobs} has the lowest observed median (${fastest.medianSeconds}s); `
        + 'no unbounded baseline was included.';

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
    `**Observed conclusion:** ${conclusion}`,
    '',
    'All variants execute the same `npm run test:node` population sequentially on this runner. Variant order rotates deterministically across repeats to reduce warm-cache/order bias.',
    'Use repeated runs before changing the default; runner state/order effects still make this a benchmark, not a correctness proof.',
    '',
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

if (rows.some(row => row.code !== 0)) {
  console.error('::error::One or more Node concurrency benchmark variants failed; inspect the failed variant before comparing timings.');
}

process.exit(rows.every(row => row.code === 0) ? 0 : 1);
