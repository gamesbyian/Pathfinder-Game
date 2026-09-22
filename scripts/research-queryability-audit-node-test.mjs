import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { runResearchQueryabilityAudit } from './research-queryability-audit-lib.mjs';

const result = runResearchQueryabilityAudit(process.cwd(), { discoverArtifacts: false });
assert.equal(result.failed, 0, JSON.stringify(result.results.filter(row => row.status === 'failed'), null, 2));
assert.equal(result.knownGaps, 0);
assert.equal(result.partial, 2);
assert.equal(result.conditional, 1);
assert.equal(result.benchmarkCount, 13);
assert.equal(result.passed, 10);
assert.equal(result.graphDiagnostics.unresolvedEdgeCount, 0);

const answerability = result.results.find(row => row.id === 'QB-003');
assert.equal(answerability?.status, 'passed');
assert.equal(answerability?.summary?.unclassified, 0);

const p204 = result.results.find(row => row.id === 'QB-001');
assert.equal(p204?.status, 'passed');

const cli = spawnSync(process.execPath, ['scripts/research-queryability-audit.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
});
assert.equal(cli.status, 0, cli.stderr);
assert.equal(JSON.parse(cli.stdout).failed, 0);

console.log('research-queryability-audit-node-test: ok');
