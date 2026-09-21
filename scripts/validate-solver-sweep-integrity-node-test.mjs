import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-integrity-cli-'));
try {
  const expected = path.join(temp, 'expected.txt');
  const result = path.join(temp, 'result.json');
  const out = path.join(temp, 'integrity.json');

  fs.writeFileSync(expected, 'A\nB\n');
  fs.writeFileSync(result, JSON.stringify({
    levels: [
      { id: 'A', ok: true, status: 'success' },
      { id: 'B', ok: false, status: 'node-budget-exhausted' },
    ],
  }));

  const ok = spawnSync(process.execPath, [
    'scripts/validate-solver-sweep-integrity.mjs',
    `--expected-ids=${expected}`,
    `--result=${result}`,
    `--integrity-out=${out}`,
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  const integrity = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(integrity.expectedIds, ['A', 'B']);
  assert.equal(integrity.coverageComplete, true);
  assert.equal(integrity.decisionValidComplete, true);

  fs.writeFileSync(result, JSON.stringify({
    levels: [{ id: 'A', ok: true, status: 'success' }],
  }));
  const strict = spawnSync(process.execPath, [
    'scripts/validate-solver-sweep-integrity.mjs',
    `--expected-ids=${expected}`,
    `--result=${result}`,
    `--integrity-out=${out}`,
  ], { cwd: root, encoding: 'utf8' });
  assert.notEqual(strict.status, 0);
  assert.match(strict.stderr, /population mismatch/u);

  const incomplete = spawnSync(process.execPath, [
    'scripts/validate-solver-sweep-integrity.mjs',
    `--expected-ids=${expected}`,
    `--result=${result}`,
    '--allow-incomplete',
    `--integrity-out=${out}`,
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(incomplete.status, 0, incomplete.stderr);
  const partial = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(partial.coverageComplete, false);
  assert.equal(partial.decisionValidComplete, false);

  console.log('validate solver sweep integrity CLI tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
