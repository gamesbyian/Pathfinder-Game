import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { queryabilityBenchmarkIssues, runResearchQueryabilityAudit } from './research-queryability-audit-lib.mjs';

assert.deepEqual(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        { id: 'QB-X', question: 'Does X work?', kind: 'coverage', expected: 'supported' },
    ],
}), []);
assert.ok(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        { id: 'QB-X', question: 'One', kind: 'coverage', expected: 'supported' },
        { id: 'QB-X', question: 'Two', kind: 'mystery-view', expected: 'mostly' },
    ],
}).some(issue => issue.includes('duplicates QB-X')));
assert.ok(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        { id: 'QB-X', question: 'One', kind: 'coverage', expected: 'supported' },
        { id: 'QB-X2', question: 'Two', kind: 'mystery-view', expected: 'mostly' },
    ],
}).some(issue => issue.includes('kind is unknown')));
assert.ok(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        { id: 'QB-X', question: 'One', kind: 'coverage', expected: 'mostly' },
    ],
}).some(issue => issue.includes('expected is unknown')));

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
