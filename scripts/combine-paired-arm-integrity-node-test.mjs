import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { combinePairedArmIntegrity } from './combine-paired-arm-integrity.mjs';

const expectedIds = Array.from({ length: 10 }, (_, index) => `R${String(index + 1).padStart(5, '0')}`);
const base = {
  populationIdentityHash: 'sha256:abc',
  expectedIds,
  expectedCount: expectedIds.length,
  observedCount: expectedIds.length,
  coverageComplete: true,
  decisionValidComplete: true,
};

const bothValid = combinePairedArmIntegrity(base, base);
assert.equal(bothValid.coverageComplete, true);
assert.equal(bothValid.decisionValidComplete, true);
assert.equal(bothValid.populationIdentityHash, 'sha256:abc');
assert.deepEqual(bothValid.expectedIds, expectedIds);
assert.equal(bothValid.expectedCount, expectedIds.length);
assert.equal(bothValid.observedCount, expectedIds.length);

const oneIndeterminate = combinePairedArmIntegrity(base, { ...base, decisionValidComplete: false });
assert.equal(oneIndeterminate.coverageComplete, true);
assert.equal(oneIndeterminate.decisionValidComplete, false, 'one indeterminate arm must not make the pair decision-valid');

const oneIncomplete = combinePairedArmIntegrity(base, { ...base, coverageComplete: false, decisionValidComplete: false });
assert.equal(oneIncomplete.coverageComplete, false);
assert.equal(oneIncomplete.decisionValidComplete, false);

assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, populationIdentityHash: 'sha256:different' }),
  /different populations/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, expectedCount: 9 }),
  /expectedCount/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, observedCount: 9 }),
  /observedCount/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, expectedIds: [...expectedIds].reverse() }),
  /exact expectedIds/,
);
assert.throws(
  () => combinePairedArmIntegrity({ ...base, expectedCount: 9 }, { ...base, expectedCount: 9 }),
  /expectedCount .* expectedIds length/u,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, populationIdentityHash: null }),
  /different populations/,
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-integrity-cli-'));
try {
  const left = path.join(temp, 'left.json');
  const right = path.join(temp, 'right.json');
  const out = path.join(temp, 'out.json');
  fs.writeFileSync(left, JSON.stringify(base));
  fs.writeFileSync(right, JSON.stringify(base));
  execFileSync(process.execPath, [
    'scripts/combine-paired-arm-integrity.mjs',
    `--left=${left}`, `--right=${right}`, `--out=${out}`,
  ], { cwd: process.cwd(), stdio: 'pipe' });
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).decisionValidComplete, true);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('combine paired arm integrity tests passed');
