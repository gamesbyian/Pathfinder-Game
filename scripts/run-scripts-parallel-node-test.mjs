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

  const invalidMode = run(['pass'], { PATHFINDER_PARALLEL_SUCCESS_OUTPUT: 'nope' });
  assert.equal(invalidMode.status, 2);
  assert.match(invalidMode.stderr, /must be "all" or "summary"/u);

  console.log('run-scripts-parallel output policy: all tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
