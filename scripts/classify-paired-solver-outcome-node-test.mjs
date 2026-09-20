import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { classifyPairedSolverOutcome } from './classify-paired-solver-outcome.mjs';

const row = (id, ok, workSpent) => ({ id, ok, workSpent });
const gate = { minGains: 1, maxLosses: 0, maxWorkDeltaPct: null };
const pairedIntegrity = ids => ({
  populationIdentityHash: 'sha256:fixture',
  expectedIds: ids,
  expectedCount: ids.length,
  observedCount: ids.length,
  coverageComplete: true,
  decisionValidComplete: true,
  complete: true,
});

let result = classifyPairedSolverOutcome(
  [row('A', true, 100), row('B', false, 100)],
  [row('A', true, 100), row('B', true, 100)],
  gate,
  pairedIntegrity(['A', 'B']),
);
assert.equal(result.researchOutcome.outcome, 'completed-positive');
assert.deepEqual(result.gained, ['B']);

result = classifyPairedSolverOutcome([row('A', true, 100)], [row('A', false, 90)], gate, pairedIntegrity(['A']));
assert.equal(result.researchOutcome.outcome, 'completed-negative');

result = classifyPairedSolverOutcome(
  [row('A', false, 100)],
  [row('A', true, 111)],
  { ...gate, maxWorkDeltaPct: 10 },
  pairedIntegrity(['A']),
);
assert.equal(result.researchOutcome.outcome, 'completed-negative');
assert.match(result.researchOutcome.reason, /frozen gate/);

assert.throws(
  () => classifyPairedSolverOutcome(
    [row('A', true, 1)], [row('B', true, 1)], gate, pairedIntegrity(['A']),
  ),
  /treatment result does not match paired integrity expectedIds/u,
);
assert.throws(
  () => classifyPairedSolverOutcome(
    [row('A', true, 1)], [row('A', true, 1)], gate,
    { ...pairedIntegrity(['A']), decisionValidComplete: false },
  ),
  /decision-valid/u,
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-outcome-cli-'));
try {
  const controlFile = path.join(temp, 'control.json');
  const treatmentFile = path.join(temp, 'treatment.json');
  const integrityFile = path.join(temp, 'integrity.json');
  const outcomeFile = path.join(temp, 'outcome.json');
  fs.writeFileSync(controlFile, JSON.stringify({
    configurationHash: `sha256:${'a'.repeat(64)}`,
    levels: [row('A', false, 10)],
  }));
  fs.writeFileSync(treatmentFile, JSON.stringify({
    configurationHash: `sha256:${'b'.repeat(64)}`,
    levels: [row('A', true, 10)],
  }));
  fs.writeFileSync(integrityFile, JSON.stringify(pairedIntegrity(['A'])));
  execFileSync(process.execPath, [
    'scripts/classify-paired-solver-outcome.mjs',
    `--control=${controlFile}`,
    `--treatment=${treatmentFile}`,
    `--integrity=${integrityFile}`,
    `--outcome-out=${outcomeFile}`,
    '--min-gains=1',
    '--max-losses=0',
    '--max-work-delta-pct=',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  const cliOutcome = JSON.parse(fs.readFileSync(outcomeFile, 'utf8'));
  assert.equal(cliOutcome.outcome, 'completed-positive',
    'CLI must parse its --key=value arguments and write the scientific outcome');
  assert.equal(cliOutcome.binding.populationIdentityHash, 'sha256:fixture');
  assert.deepEqual(cliOutcome.binding.resultConfigurationHashes, [
    `sha256:${'a'.repeat(64)}`, `sha256:${'b'.repeat(64)}`,
  ]);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('paired solver outcome classification tests passed');
