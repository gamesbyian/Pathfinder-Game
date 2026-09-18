import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { auditResearchIntegration } from './research-integration-audit-lib.mjs';

const result = auditResearchIntegration(process.cwd());
assert.equal(result.errorCount, 0, JSON.stringify(result.errors, null, 2));
assert.equal(result.premiseCount, 148);
assert.equal(result.premiseRelationCount, 184);
assert.ok(result.questionCount >= 27);

const run = spawnSync(process.execPath, ['scripts/research-integration-audit.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
});
assert.equal(run.status, 0, run.stderr);
assert.equal(JSON.parse(run.stdout).errorCount, 0);

console.log('research-integration-audit-node-test: ok');
