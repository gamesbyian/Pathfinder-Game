#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

function parseArgs(argv) {
  let jobs = '4,8,16,unbounded';
  let modes = 'npm';
  let repeats = 1;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--jobs') { jobs = argv[++i]; continue; }
    if (arg.startsWith('--jobs=')) { jobs = arg.slice('--jobs='.length); continue; }
    if (arg === '--modes') { modes = argv[++i]; continue; }
    if (arg.startsWith('--modes=')) { modes = arg.slice('--modes='.length); continue; }
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
  const executionModes = modes.split(',').map(value => value.trim()).filter(Boolean);
  if (!executionModes.length) throw new Error('--modes must contain at least one entry');
  for (const mode of executionModes) {
    if (!['npm', 'direct'].includes(mode)) throw new Error(`invalid mode: ${mode}`);
  }
  return { variants, executionModes, repeats };
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runVariant(variant, mode, repeat) {
  return new Promise(resolve => {
    const started = process.hrtime.bigint();
    const env = { ...process.env };
    if (variant === 'unbounded') delete env.PATHFINDER_PARALLEL_JOBS;
    else env.PATHFINDER_PARALLEL_JOBS = variant;
    if (mode === 'direct') env.PATHFINDER_DIRECT_PACKAGE_SCRIPTS = '1';
    else delete env.PATHFINDER_DIRECT_PACKAGE_SCRIPTS;
    console.log(`\n=== benchmark mode=${mode} jobs=${variant} repeat=${repeat} ===`);
    const child = spawn(npmCmd, ['run', 'test:node'], { stdio: 'inherit', env });
    child.on('error', error => {
      console.error(error.message);
      resolve({ variant, mode, repeat, code: 1, seconds: Number(process.hrtime.bigint() - started) / 1e9 });
    });
    child.on('close', code => {
      resolve({ variant, mode, repeat, code: code ?? 1, seconds: Number(process.hrtime.bigint() - started) / 1e9 });
    });
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const { variants, executionModes, repeats } = parseArgs(process.argv.slice(2));
const combinations = executionModes.flatMap(mode => variants.map(variant => ({ mode, variant })));
const rows = [];
for (let repeat = 1; repeat <= repeats; repeat += 1) {
  const shift = (repeat - 1) % combinations.length;
  const order = [...combinations.slice(shift), ...combinations.slice(0, shift)];
  console.log(
    `\n=== benchmark round ${repeat}/${repeats}: `
    + order.map(row => `${row.mode}@${row.variant}`).join(' -> '),
  );
  for (const { mode, variant } of order) rows.push(await runVariant(variant, mode, repeat));
}

const summary = combinations.map(({ mode, variant }) => {
  const runs = rows.filter(row => row.variant === variant && row.mode === mode);
  const passed = runs.filter(row => row.code === 0);
  return {
    mode,
    jobs: variant,
    runs: runs.length,
    passed: passed.length,
    medianSeconds: passed.length ? Number(median(passed.map(row => row.seconds)).toFixed(2)) : null,
    minSeconds: passed.length ? Number(Math.min(...passed.map(row => row.seconds)).toFixed(2)) : null,
    maxSeconds: passed.length ? Number(Math.max(...passed.map(row => row.seconds)).toFixed(2)) : null,
  };
});

const baseline = summary.find(row => row.mode === 'npm' && row.jobs === 'unbounded' && row.medianSeconds != null) ?? null;
for (const row of summary) {
  row.speedupVsUnbounded = baseline && row.medianSeconds
    ? Number((baseline.medianSeconds / row.medianSeconds).toFixed(3))
    : null;
  const npmSameJobs = summary.find(candidate =>
    candidate.mode === 'npm' && candidate.jobs === row.jobs && candidate.medianSeconds != null);
  row.speedupVsNpmSameJobs = npmSameJobs && row.medianSeconds
    ? Number((npmSameJobs.medianSeconds / row.medianSeconds).toFixed(3))
    : null;
}

const complete = summary.filter(row => row.passed === row.runs && row.medianSeconds != null);
const fastest = complete.length
  ? [...complete].sort((a, b) => a.medianSeconds - b.medianSeconds)[0]
  : null;
const conclusion = !fastest
  ? 'No benchmark variant completed every requested run; do not change the runner.'
  : `${fastest.mode}@jobs=${fastest.jobs} has the lowest observed median (${fastest.medianSeconds}s).`;

const output = { schemaVersion: 1, variants: summary, runs: rows, conclusion };
const outDir = 'tmp/ci-node-concurrency-benchmark';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/result.json`, `${JSON.stringify(output, null, 2)}\n`);

console.log('\n=== Node harness concurrency benchmark ===');
console.log(JSON.stringify(output, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## Node harness concurrency benchmark',
    '',
    '| mode | jobs | passed/runs | median s | min s | max s | vs npm same jobs |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...summary.map(row => `| ${row.mode} | ${row.jobs} | ${row.passed}/${row.runs} | ${row.medianSeconds ?? 'n/a'} | ${row.minSeconds ?? 'n/a'} | ${row.maxSeconds ?? 'n/a'} | ${row.speedupVsNpmSameJobs ?? 'n/a'}x |`),
    '',
    `**Observed conclusion:** ${conclusion}`,
    '',
    'All variants execute the same `npm run test:node` population sequentially on this runner; direct mode only bypasses each child script\'s npm wrapper. Variant order rotates deterministically across repeats.',
    'Use repeated runs before changing the default; runner state/order effects still make this a benchmark, not a correctness proof.',
    '',
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

if (rows.some(row => row.code !== 0)) {
  console.error('::error::One or more Node concurrency benchmark variants failed; inspect the failed variant before comparing timings.');
}

process.exit(rows.every(row => row.code === 0) ? 0 : 1);
