#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const dir = mkdtempSync(path.join(tmpdir(), 'cpsat-explicit-prefix-reference-'));
try {
  const corpusFile = path.join(dir, 'levels.json');
  const casesFile = path.join(dir, 'cases.json');
  const outFile = path.join(dir, 'result.json');
  writeFileSync(corpusFile, JSON.stringify([{
    id: 'REFERENCE_PIPELINE',
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
    cases: [{
      id: 'native-illegal',
      levelId: 'REFERENCE_PIPELINE',
      prefix: [[999, 999]],
      source: { cutSignature: 'REFERENCE_PIPELINE:1,2', cutCells: [1, 2] },
    }],
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
  assert.deepEqual(result.rows[0].source, { cutSignature: 'REFERENCE_PIPELINE:1,2', cutCells: [1, 2] },
    'structured case source metadata must survive the exact/reference runner');
  assert.equal('oracleLabel' in result.rows[0], false);
  assert.equal('oracleReason' in result.rows[0], false);
  assert.equal(result.summary.cases, 1);
  assert.equal(result.summary.abstain, 1);
  assert.equal(result.summary.inputAlarms, 1);

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
  assert.deepEqual(combined.rows[0].source, { cutSignature: 'REFERENCE_PIPELINE:1,2', cutCells: [1, 2] },
    'structured case source metadata must survive shard recombination');
  assert.equal('oracleLabel' in combined.rows[0], false);

  const partitionStaging = path.join(dir, 'partition-staging');
  mkdirSync(partitionStaging, { recursive: true });
  const basePartition = {
    schemaVersion: 2,
    solverRef: 'a'.repeat(40),
    technique: 'cpsat-reference-probe-explicit-prefix',
    sourceCases: 'cases.json',
    sourceFormat: 'cases',
    coordinateConvention: 'raw-level-1-based',
    requestedTimeLimitSec: 1,
    shardCount: 2,
    selectedCaseCount: 3,
    caution: 'fixture',
  };
  const row = (caseId) => ({
    schemaVersion: 2,
    caseId,
    referenceLabel: 'timeout/abstain',
    referenceReason: 'reference-unknown',
    correctnessAlarm: false,
    inputAlarm: false,
  });
  const writePartitionShard = (index, rows, overrides = {}) => {
    const doc = {
      ...basePartition,
      shardIndex: index,
      rows,
      summary: { cases: rows.length, live: 0, dead: 0, abstain: rows.length, correctnessAlarms: 0, inputAlarms: 0 },
      ...overrides,
    };
    writeFileSync(
      path.join(partitionStaging, `cpsat-explicit-prefix-reference-shard-${String(index).padStart(3, '0')}.json`),
      JSON.stringify(doc),
    );
  };
  writePartitionShard(1, [row('A'), row('C')]);
  writePartitionShard(2, [row('B')]);
  const partitionOut = path.join(dir, 'partition-combined.json');
  await run(process.execPath, [
    path.join(process.cwd(), 'scripts/combine-cpsat-explicit-prefix-reference-shards.mjs'),
    `--in-dir=${partitionStaging}`,
    '--shards=2',
    `--out=${partitionOut}`,
  ], { cwd: dir, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(JSON.parse(readFileSync(partitionOut, 'utf8')).summary.cases, 3);

  writePartitionShard(2, [row('B')], { shardCount: 3 });
  await assert.rejects(
    () => run(process.execPath, [
      path.join(process.cwd(), 'scripts/combine-cpsat-explicit-prefix-reference-shards.mjs'),
      `--in-dir=${partitionStaging}`,
      '--shards=2',
      `--out=${partitionOut}`,
    ], { cwd: dir, maxBuffer: 16 * 1024 * 1024 }),
    /declares shardCount=3; expected 2/u,
  );
  writePartitionShard(2, [row('B')]);
  writePartitionShard(1, [row('A')]);
  await assert.rejects(
    () => run(process.execPath, [
      path.join(process.cwd(), 'scripts/combine-cpsat-explicit-prefix-reference-shards.mjs'),
      `--in-dir=${partitionStaging}`,
      '--shards=2',
      `--out=${partitionOut}`,
    ], { cwd: dir, maxBuffer: 16 * 1024 * 1024 }),
    /incomplete shard 1: found 1\/2/u,
  );

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
  assert.equal(published.artifactCoverage?.complete, true);
  assert.equal(published.sourceArtifact, 'cpsat-explicit-prefix-reference-fixture');

  const workflow = readFileSync(path.join(process.cwd(), '.github/workflows/cpsat-explicit-prefix-reference.yml'), 'utf8');
  assert.match(workflow, /RECOMBINE_RUN_ID: \$\{\{ inputs\.recombine_run_id \}\}/u);
  assert.match(workflow, /kind: 'recombine-only'/u);
  assert.match(workflow, /acquisitionRecomputed: false/u);
  assert.match(workflow, /sourceRuns: \[recombineRunId\]/u,
    'recombine dispatch must publish the original acquisition run as recovery provenance');
  assert.equal(workflow.includes('cat > reports/stress/cpsat-explicit-prefix-reference-contract-spec.json <<SPEC'), false,
    'contract spec should be JSON.stringify-built rather than shell-heredoc JSON');

  console.log('CP-SAT explicit-prefix reference pipeline contract passed.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
