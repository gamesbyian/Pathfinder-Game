import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  RESEARCH_WORKFLOW_OUTCOMES,
  readResearchWorkflowOutcome,
  validateResearchWorkflowOutcome,
  writeResearchWorkflowOutcome,
} from './research-workflow-outcome.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'pathfinder-research-outcome-'));
const outcomeFile = path.join(temp, 'outcome.json');
for (const outcome of RESEARCH_WORKFLOW_OUTCOMES) {
  const expected = { schemaVersion: 1, outcome, reason: `test ${outcome}` };
  assert.deepEqual(writeResearchWorkflowOutcome(outcomeFile, expected), expected);
  assert.deepEqual(readResearchWorkflowOutcome(outcomeFile), expected);
}
assert.throws(() => validateResearchWorkflowOutcome({ outcome: 'success', reason: 'ambiguous' }), /unknown research outcome/);
assert.throws(() => validateResearchWorkflowOutcome({ outcome: 'completed-negative', reason: '' }), /non-empty/);
assert.throws(() => validateResearchWorkflowOutcome({ schemaVersion: 2, outcome: 'completed-negative', reason: 'no' }), /schemaVersion/);
assert.throws(() => validateResearchWorkflowOutcome({ outcome: 'harness-error', reason: 'line one\nline two' }), /single line/);

const primary = path.join(temp, 'primary.json');
writeFileSync(primary, '{"levels":[]}\n');
writeResearchWorkflowOutcome(outcomeFile, {
  outcome: 'completed-negative',
  reason: 'The hypothesis was tested and found no gain.',
});
const out = path.join(temp, 'published');
const published = spawnSync(process.execPath, [
  'scripts/publish-solver-sweep-result.mjs',
  `--primary=${primary}`,
  `--out=${out}`,
  `--outcome-file=${outcomeFile}`,
], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
assert.equal(published.status, 0, published.stderr);
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
assert.equal(manifest.researchOutcome.outcome, 'completed-negative');
assert.match(readFileSync(path.join(out, 'summary.md'), 'utf8'), /Research outcome: \*\*completed-negative\*\*/);

writeFileSync(outcomeFile, '{"outcome":"made-up","reason":"bad"}\n');
const invalid = spawnSync(process.execPath, [
  'scripts/publish-solver-sweep-result.mjs',
  `--primary=${primary}`,
  `--out=${out}`,
  `--outcome-file=${outcomeFile}`,
], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
assert.equal(invalid.status, 2);
assert.match(invalid.stderr, /invalid --outcome-file/);

console.log('research workflow outcome tests passed');
