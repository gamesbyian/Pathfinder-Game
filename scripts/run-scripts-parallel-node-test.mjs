#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const runner = path.join(root, 'scripts', 'run-scripts-parallel.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-parallel-runner-'));

function run(names, env = {}) {
  return spawnSync(process.execPath, [runner, ...names], {
    cwd: temp,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATHFINDER_DIRECT_PACKAGE_SCRIPTS: '1',
      ...env,
    },
  });
}

try {
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    scripts: {
      pass: `${JSON.stringify(process.execPath)} -e "console.log('PASS_STDOUT')"`,
      fail: `${JSON.stringify(process.execPath)} -e "console.error('FAIL_STDERR'); process.exit(7)"`,
      first: `${JSON.stringify(process.execPath)} -e "require('node:fs').appendFileSync('order.txt','first\\n')"`,
      second: `${JSON.stringify(process.execPath)} -e "require('node:fs').appendFileSync('order.txt','second\\n')"`,
      third: `${JSON.stringify(process.execPath)} -e "require('node:fs').appendFileSync('order.txt','third\\n')"`,
    },
  }, null, 2));

  const quietPass = run(['pass'], { PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary' });
  assert.equal(quietPass.status, 0);
  assert.doesNotMatch(quietPass.stdout, /PASS_STDOUT/u);
  assert.match(quietPass.stdout, /PASS\s+pass/u);
  assert.match(quietPass.stdout, /success-output=summary/u);

  const quietFail = run(['fail'], { PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary' });
  assert.equal(quietFail.status, 1);
  assert.match(quietFail.stdout, /FAIL_STDERR/u);
  assert.match(quietFail.stdout, /FAIL\s+fail/u);

  const verbosePass = run(['pass'], { PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'all' });
  assert.equal(verbosePass.status, 0);
  assert.match(verbosePass.stdout, /PASS_STDOUT/u);
  assert.match(verbosePass.stdout, /success-output=all/u);

  const timingPath = path.join(temp, 'timings', 'parallel.json');
  const timedPass = run(['pass'], {
    PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary',
    PATHFINDER_PARALLEL_TIMING_JSON: timingPath,
  });
  assert.equal(timedPass.status, 0);
  const timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
  assert.equal(timing.schemaVersion, 1);
  assert.equal(timing.mode, 'direct');
  assert.equal(timing.requestedCount, 1);
  assert.equal(timing.results.length, 1);
  assert.equal(timing.results[0].name, 'pass');
  assert.equal(timing.results[0].code, 0);
  assert.equal(typeof timing.results[0].seconds, 'number');
  assert.equal(typeof timing.wallSeconds, 'number');

  const orderPath = path.join(temp, 'order.txt');
  const prioritized = run(['first', 'second', 'third'], {
    PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary',
    PATHFINDER_PARALLEL_JOBS: '1',
    PATHFINDER_PARALLEL_PRIORITY: 'third, second',
  });
  assert.equal(prioritized.status, 0, prioritized.stderr || prioritized.stdout);
  assert.deepEqual(fs.readFileSync(orderPath, 'utf8').trim().split('\n'), ['third', 'second', 'first']);
  assert.match(prioritized.stdout, /priority=2/u);
  assert.match(prioritized.stdout, /PASS\s+first[\s\S]*PASS\s+second[\s\S]*PASS\s+third/u,
    'summary order remains the caller request order');

  const npmFallbackPass = run(['pass'], {
    PATHFINDER_DIRECT_PACKAGE_SCRIPTS: '0',
    PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary',
  });
  assert.equal(npmFallbackPass.status, 0);
  assert.match(npmFallbackPass.stdout, /PASS\s+pass/u);
  assert.match(npmFallbackPass.stdout, /mode=npm/u);

  const npmFallbackFail = run(['fail'], {
    PATHFINDER_DIRECT_PACKAGE_SCRIPTS: '0',
    PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'summary',
  });
  assert.equal(npmFallbackFail.status, 1);
  assert.match(npmFallbackFail.stdout, /FAIL_STDERR/u);
  assert.match(npmFallbackFail.stdout, /mode=npm/u);

  const invalidMode = run(['pass'], { PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'nope' });
  assert.equal(invalidMode.status, 2);
  assert.match(invalidMode.stderr, /must be "all" or "summary"/u);

  console.log('run-scripts-parallel output policy: all tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
