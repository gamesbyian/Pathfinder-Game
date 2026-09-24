#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache');
const PROD_INFO = path.join(CACHE_DIR, 'tsconfig.tsbuildinfo');
const TEST_INFO = path.join(CACHE_DIR, 'tsconfig.test.tsbuildinfo');
const PROBE_DIR = path.join(ROOT, 'modules', '__ci-typescript-cache-probes');
const PROD_PROBE = path.join(PROBE_DIR, 'production-probe.ts');
const TEST_PROBE = path.join(PROBE_DIR, 'test-probe.test.ts');

function run(name, command, args, { expect = 0 } = {}) {
  const started = process.hrtime.bigint();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;
  const code = result.status ?? 1;
  if (code !== expect) {
    console.error(`${name}: expected exit ${expect}, got ${code}`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    throw new Error(`${name} failed its expected-exit contract`);
  }
  return {
    name,
    code,
    seconds,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function tsc(config, label, options = {}) {
  const bin = process.platform === 'win32'
    ? path.join(ROOT, 'node_modules', '.bin', 'tsc.cmd')
    : path.join(ROOT, 'node_modules', '.bin', 'tsc');
  return run(label, bin, ['--noEmit', '-p', config], options);
}

function copyIfExists(source, dest) {
  if (!fs.existsSync(source)) throw new Error(`expected build info missing: ${source}`);
  fs.copyFileSync(source, dest);
}

function restore(source, dest) {
  fs.copyFileSync(source, dest);
}

function rounded(seconds) {
  return Number(seconds.toFixed(3));
}

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.rmSync(PROD_INFO, { force: true });
fs.rmSync(TEST_INFO, { force: true });
fs.rmSync(PROBE_DIR, { recursive: true, force: true });

const rows = [];
const snapshots = path.join(ROOT, 'tmp', 'ci-typescript-cache-benchmark');
fs.mkdirSync(snapshots, { recursive: true });
const prodSnapshot = path.join(snapshots, 'tsconfig.tsbuildinfo');
const testSnapshot = path.join(snapshots, 'tsconfig.test.tsbuildinfo');

try {
  rows.push(tsc('tsconfig.json', 'production-cold'));
  rows.push(tsc('tsconfig.test.json', 'tests-cold'));
  rows.push(tsc('tsconfig.json', 'production-warm'));
  rows.push(tsc('tsconfig.test.json', 'tests-warm'));

  copyIfExists(PROD_INFO, prodSnapshot);
  copyIfExists(TEST_INFO, testSnapshot);

  fs.mkdirSync(PROBE_DIR, { recursive: true });

  // Fault probe 1: a restored production build-info file must not hide a newly added source error.
  restore(prodSnapshot, PROD_INFO);
  fs.writeFileSync(
    PROD_PROBE,
    'export const productionProbe: number = "cache-must-not-hide-this";\n',
  );
  rows.push(tsc('tsconfig.json', 'production-fault-after-restore', { expect: 2 }));
  fs.rmSync(PROD_PROBE, { force: true });

  // Recover the known-good snapshot before the independent test-only probe.
  restore(prodSnapshot, PROD_INFO);
  restore(testSnapshot, TEST_INFO);
  fs.writeFileSync(
    TEST_PROBE,
    'export const testProbe: number = "test-cache-must-not-hide-this";\n',
  );

  // The production config excludes *.test.ts, while the test config must notice it.
  rows.push(tsc('tsconfig.json', 'test-only-fault-production-check', { expect: 0 }));
  rows.push(tsc('tsconfig.test.json', 'test-only-fault-test-check', { expect: 2 }));
  fs.rmSync(TEST_PROBE, { force: true });

  // Valid changed-source timing: restore the previous build info, add a new valid production file,
  // then measure how much work TypeScript reuses across the changed tree.
  restore(prodSnapshot, PROD_INFO);
  fs.writeFileSync(
    PROD_PROBE,
    'export const productionProbe = 42 as const;\n',
  );
  rows.push(tsc('tsconfig.json', 'production-valid-change-after-restore'));
  fs.rmSync(PROD_PROBE, { force: true });
} finally {
  fs.rmSync(PROBE_DIR, { recursive: true, force: true });
}

const byName = Object.fromEntries(rows.map(row => [row.name, rounded(row.seconds)]));
const ratios = {
  productionWarmSpeedup: Number((byName['production-cold'] / byName['production-warm']).toFixed(3)),
  testsWarmSpeedup: Number((byName['tests-cold'] / byName['tests-warm']).toFixed(3)),
  productionValidChangeSpeedup: Number(
    (byName['production-cold'] / byName['production-valid-change-after-restore']).toFixed(3),
  ),
};

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  node: process.version,
  timingsSeconds: byName,
  ratios,
  correctness: {
    restoredProductionCacheDetectsNewSourceError: true,
    productionConfigIgnoresTestOnlyProbe: true,
    restoredTestCacheDetectsNewTestOnlyError: true,
  },
};

const outPath = path.join(snapshots, 'result.json');
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## TypeScript incremental-cache benchmark',
    '',
    '| probe | seconds |',
    '| --- | ---: |',
    ...Object.entries(byName).map(([name, seconds]) => `| \`${name}\` | ${seconds} |`),
    '',
    `- Production unchanged warm speedup: **${ratios.productionWarmSpeedup}x**`,
    `- Test unchanged warm speedup: **${ratios.testsWarmSpeedup}x**`,
    `- Production valid-change restored-cache speedup: **${ratios.productionValidChangeSpeedup}x**`,
    '',
    'Correctness probes passed: restored build-info still detected a new production type error and a new test-only type error.',
    '',
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}
