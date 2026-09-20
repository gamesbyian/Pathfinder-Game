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
const bound = validateResearchWorkflowOutcome({
  outcome: 'completed-positive',
  reason: 'bound verdict',
  binding: {
    populationIdentityHash: `sha256:${'a'.repeat(64)}`,
    resultConfigurationHashes: [`sha256:${'c'.repeat(64)}`, `sha256:${'b'.repeat(64)}`],
    resultResolvedShas: ['c'.repeat(40), 'b'.repeat(40)],
    resultContentHashes: [`sha256:${'e'.repeat(64)}`, `sha256:${'d'.repeat(64)}`],
  },
});
assert.deepEqual(bound.binding, {
  populationIdentityHash: `sha256:${'a'.repeat(64)}`,
  resultConfigurationHashes: [`sha256:${'b'.repeat(64)}`, `sha256:${'c'.repeat(64)}`],
  resultResolvedShas: ['b'.repeat(40), 'c'.repeat(40)],
  resultContentHashes: [`sha256:${'d'.repeat(64)}`, `sha256:${'e'.repeat(64)}`],
});
assert.throws(() => validateResearchWorkflowOutcome({
  outcome: 'completed-positive', reason: 'bad binding', binding: { populationIdentityHash: 'bad' },
}), /populationIdentityHash/);
assert.throws(() => validateResearchWorkflowOutcome({
  outcome: 'completed-positive', reason: 'bad revision binding', binding: { resultResolvedShas: ['not-a-sha'] },
}), /resultResolvedShas/);
assert.throws(() => validateResearchWorkflowOutcome({
  outcome: 'completed-positive', reason: 'bad content binding', binding: { resultContentHashes: ['not-a-hash'] },
}), /resultContentHashes/);

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

const directCliFile = path.join(temp, 'direct-cli-outcome.json');
const directCli = spawnSync(process.execPath, [
  'scripts/research-workflow-outcome.mjs',
  `--out=${directCliFile}`,
  '--outcome=completed-positive',
  '--reason=direct CLI fixture passed',
], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
assert.equal(directCli.status, 0, directCli.stderr);
assert.deepEqual(JSON.parse(readFileSync(directCliFile, 'utf8')), {
  schemaVersion: 1,
  outcome: 'completed-positive',
  reason: 'direct CLI fixture passed',
});

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
