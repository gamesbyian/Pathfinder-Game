#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const dir = mkdtempSync(path.join(tmpdir(), 'phase15g-explicit-prefix-'));
try {
  const corpusFile = path.join(dir, 'levels.json');
  const casesFile = path.join(dir, 'cases.json');
  const outFile = path.join(dir, 'result.json');
  writeFileSync(corpusFile, JSON.stringify([{
    id: 'PHASE15G',
    grid: { w: 3, h: 3 },
    reqLen: 2,
    reqInt: 0,
    gates: [{ x: 1, y: 1 }],
    goal: { x: 3, y: 1 },
    blocks: [],
    mustPass: [],
    mustCross: [],
    falseGoals: [],
    geese: [],
    portals: [],
    filters: [],
    flippingFilters: [],
    landmarks: [],
  }]));
  writeFileSync(casesFile, JSON.stringify({
    corpus: corpusFile,
    cases: [{ id: 'phase15g-native-illegal', levelId: 'PHASE15G', prefix: [[999, 999]] }],
  }));

  let exitCode = 0;
  try {
    await run(process.execPath, [
      'scripts/run-bundled.mjs',
      'scripts/stress/cpsat-explicit-prefix-reference.mjs',
      '--',
      `--cases=${casesFile}`,
      '--format=cases',
      '--time-limit=1',
      '--max-cases=1',
      `--out=${outFile}`,
    ], { maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    exitCode = error.code;
  }
  assert.equal(exitCode, 2, 'native-illegal input is an intentional input alarm and should exit 2 after writing evidence');

  const result = JSON.parse(readFileSync(outFile, 'utf8'));
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].schemaVersion, 2);
  assert.equal(result.rows[0].referenceLabel, 'timeout/abstain');
  assert.equal(result.rows[0].referenceReason, 'native-prefix-illegal');
  assert.equal('oracleLabel' in result.rows[0], false);
  assert.equal('oracleReason' in result.rows[0], false);
  assert.equal(result.summary.cases, 1);
  assert.equal(result.summary.abstain, 1);
  assert.equal(result.summary.inputAlarms, 1);

  // Faithful workflow harness: feed the real writer output through the same combiner script now
  // called by cpsat-explicit-prefix-reference.yml, then publish the standard solver-sweep result.
  const staging = path.join(dir, 'artifact-staging');
  mkdirSync(staging, { recursive: true });
  const shardFile = path.join(staging, 'cpsat-explicit-prefix-reference-shard-001.json');
  writeFileSync(shardFile, readFileSync(outFile));

  const combinedFile = path.join(dir, 'cpsat-explicit-prefix-reference-fixture.json');
  let combineExit = 0;
  try {
    await run(process.execPath, [
      path.join(process.cwd(), 'scripts/combine-cpsat-explicit-prefix-reference-shards.mjs'),
      `--in-dir=${staging}`,
      '--shards=1',
      `--out=${combinedFile}`,
    ], { cwd: dir, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    combineExit = error.code;
  }
  assert.equal(combineExit, 2, 'input-alarm shard should preserve the workflow combiner alarm exit after writing output');
  const combined = JSON.parse(readFileSync(combinedFile, 'utf8'));
  assert.equal(combined.schemaVersion, 2);
  assert.equal(combined.shardCount, 1);
  assert.equal(combined.summary.cases, 1);
  assert.equal(combined.summary.inputAlarms, 1);
  assert.equal(combined.rows[0].referenceLabel, 'timeout/abstain');
  assert.equal('oracleLabel' in combined.rows[0], false);

  await run(process.execPath, [
    path.join(process.cwd(), 'scripts/publish-solver-sweep-result.mjs'),
    `--primary=${combinedFile}`,
    '--shards-expected=1',
    '--shards-observed=1',
    '--source-artifact=cpsat-explicit-prefix-reference-fixture',
  ], {
    cwd: dir,
    env: {
      ...process.env,
      GITHUB_WORKFLOW: 'cpsat-explicit-prefix-reference',
      GITHUB_RUN_ID: '15',
      GITHUB_RUN_ATTEMPT: '1',
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_REPOSITORY: 'gamesbyian/Pathfinder-Game',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REF: 'refs/heads/fixture',
      GITHUB_REF_NAME: 'fixture',
      GITHUB_SHA: '1111111111111111111111111111111111111111',
    },
    maxBuffer: 16 * 1024 * 1024,
  });
  const published = JSON.parse(readFileSync(path.join(dir, 'logs/solver-sweep-result/manifest.json'), 'utf8'));
  assert.equal(published.status, 'published');
  assert.equal(published.shardCompleteness?.complete, true);
  assert.equal(published.sourceArtifact, 'cpsat-explicit-prefix-reference-fixture');

  console.log('Phase-15G explicit-prefix workflow harness passed: real writer -> shard combiner -> standard publisher is schema-v2/reference-only.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
