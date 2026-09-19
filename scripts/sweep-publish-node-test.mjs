import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-publish-'));
const primary = path.join(root, 'primary.json');
const out = path.join(root, 'published');
const failureOut = path.join(root, 'failure.json');

fs.writeFileSync(primary, JSON.stringify({
  levels: [
    { id: 'A', ok: false, status: 'work-budget-reached', workSpent: 100, nodesExpanded: 10,
      attempts: [{ stageId: 'main-search', ok: false, outcome: 'timed-out', workSpent: 100, nodesExpanded: 10, bestBadness: 3 }] },
    { id: 'B', ok: true, status: 'success', workSpent: 20, nodesExpanded: 2,
      attempts: [
        { stageId: 'main-search', ok: false, outcome: 'exhausted', workSpent: 5, nodesExpanded: 1, bestBadness: 4 },
        { stageId: 'main-search', ok: true, outcome: 'success', workSpent: 15, nodesExpanded: 1 },
      ] },
  ],
}));

execFileSync(process.execPath, [
  path.resolve('scripts/sweep-publish.mjs'),
  `--primary=${primary}`,
  `--out=${out}`,
  `--failure-out=${failureOut}`,
], { cwd: process.cwd(), stdio: 'pipe' });

const failure = JSON.parse(fs.readFileSync(failureOut, 'utf8'));
assert.equal(failure.observed, 2);
assert.equal(failure.solvedParentsWithFailedAttempts, 1);

const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
assert.equal(manifest.failureEvidence.compactPresent, true);
assert.equal(manifest.failureEvidence.summary.observed, 2);
assert.equal(manifest.failureEvidence.sourceArtifact, failureOut);

fs.rmSync(root, { recursive: true, force: true });
console.log('sweep publish wrapper tests passed');
