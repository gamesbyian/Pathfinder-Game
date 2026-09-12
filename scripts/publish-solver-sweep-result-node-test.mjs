import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-solver-result-'));
try {
  const primary = path.join(temp, 'result.json');
  const integrity = path.join(temp, 'integrity.json');
  const outcome = path.join(temp, 'outcome.json');
  const out = path.join(temp, 'published');
  fs.writeFileSync(primary, JSON.stringify({ producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family', configurationHash: 'sha256:configuration', execution: { levelBlind: true, historyAware: false, schedulerMode: 'production' }, levels: [{ id: 'A', ok: true, status: 'success' }] }));
  fs.writeFileSync(integrity, JSON.stringify({ complete: true, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 }, populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  fs.writeFileSync(outcome, JSON.stringify({ schemaVersion: 1, outcome: 'completed-positive', reason: 'frozen gate passed' }));
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--out=${out}`], { cwd: root });
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.population.expectedCount, 1);
  assert.equal(manifest.population.identityHash, `sha256:${'a'.repeat(64)}`);
  assert.equal(manifest.coverage.populationIntegrity.complete, true);
  assert.equal(manifest.experiment.configurationHash, 'sha256:configuration');
  assert.equal(manifest.execution.levelBlind, true);
  assert.equal(manifest.decisionBearing, true);
  assert.deepEqual(manifest.sideEffects, { hints: 'unknown', canonicalBaseline: 'unknown', telemetry: 'unknown', reports: 'unknown' });

  const noOutcomeOut = path.join(temp, 'no-outcome');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--out=${noOutcomeOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(noOutcomeOut, 'manifest.json'))).decisionBearing, false, 'generic publisher must not infer a verdict from complete coverage');
  console.log('publish solver sweep result tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
