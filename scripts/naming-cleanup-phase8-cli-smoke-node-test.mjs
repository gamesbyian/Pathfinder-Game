#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tmp = mkdtempSync(path.join(os.tmpdir(), 'pathfinder-phase8-smoke-'));
const emptyLevels = path.join(tmp, 'levels.json');
const emptySurvival = path.join(tmp, 'known-solution-prefix-survival.json');
const emptyReplay = path.join(tmp, 'replay.json');
writeFileSync(emptyLevels, JSON.stringify({ levels: [] }));
writeFileSync(emptySurvival, JSON.stringify({ scoreWidthForensics: [] }));
writeFileSync(emptyReplay, JSON.stringify({ levels: [] }));

function runNode(script, args = []) {
  return execFileSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function runBundled(script, args = []) {
  return execFileSync(process.execPath, [
    path.join(root, 'scripts', 'run-bundled.mjs'),
    path.join(root, script),
    ...args,
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function expectFastFailure(script, args, expected, bundled = false) {
  const argv = bundled
    ? [path.join(root, 'scripts', 'run-bundled.mjs'), path.join(root, script), ...args]
    : [path.join(root, script), ...args];
  const result = spawnSync(process.execPath, argv, {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0, `${script} should reject the synthetic invalid invocation`);
  assert.match(`${result.stdout}\n${result.stderr}`, expected);
}

// Pure/offline analyzers: real argument parsing + serializer path, synthetic zero-row data.
const survivalOut = path.join(tmp, 'known-solution-prefix-survival-out.json');
runNode('scripts/analyze-known-solution-prefix-survival.mjs', [
  `--survival=${emptySurvival}`,
  `--levels=${emptyLevels}`,
  `--out=${survivalOut}`,
]);
assert.equal(JSON.parse(readFileSync(survivalOut, 'utf8')).rows.length, 0);

const replayOut = path.join(tmp, 'portfolio-replay.json');
runBundled('scripts/legacy-latency-portfolio-replay.mjs', [
  `--inputs=${emptyReplay}`,
  `--out=${replayOut}`,
]);
assert.equal(JSON.parse(readFileSync(replayOut, 'utf8')).totalWinningAttempts, 0);

const schedulerOut = path.join(tmp, 'portfolio-report.json');
runBundled('scripts/legacy-latency-portfolio-report.mjs', [
  `--corpus=${emptyLevels}`,
  `--out=${schedulerOut}`,
  `--summary-out=${path.join(tmp, 'portfolio-report.md')}`,
]);
assert.equal(JSON.parse(readFileSync(schedulerOut, 'utf8')).levels.length, 0);

// Research collectors that can take an empty corpus. This loads their real solver/bundler seams
// while performing no search work.
for (const [script, outName] of [
  ['scripts/stress/compare-search-producer-populations.mjs', 'producer.json'],
  ['scripts/stress/census-repair-rollback-windows.mjs', 'rollback.json'],
  ['scripts/stress/analyze-residual-interfaces.mjs', 'residual.json'],
  ['scripts/stress/collect-known-solution-prefix-survival.mjs', 'known-solution-prefix-survival.json'],
  ['scripts/stress/collect-known-solution-prefix-branches.mjs', 'known-solution-prefix-branches.json'],
]) {
  const out = path.join(tmp, outName);
  runBundled(script, [`--levels=${emptyLevels}`, `--out=${out}`]);
  assert.ok(readFileSync(out, 'utf8').length > 0, `${script} should write its zero-row result`);
}

// Argument-validation exits still prove the surfaced CLI and its static/bundled imports load
// without launching an expensive research campaign.
expectFastFailure(
  'scripts/run-repair-search.mjs',
  [],
  /--level=<n> is required/u,
  true,
);
expectFastFailure(
  'scripts/stress/audit-candidate-eligibility-and-participation.mjs',
  [],
  /Usage: --pool=<path> --phase1-report=<path>/u,
  true,
);
expectFastFailure(
  'scripts/stress/analyze-equal-work-census.mjs',
  [],
  /--equal-work=.*required/u,
  false,
);

console.log('Phase-8 cheap CLI/runtime smoke coverage passed for synthetic/no-work invocations.');
