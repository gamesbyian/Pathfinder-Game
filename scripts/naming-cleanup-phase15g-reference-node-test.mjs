#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('Phase-15G explicit-prefix writer smoke passed: real CLI output is schema v2/reference-only.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
