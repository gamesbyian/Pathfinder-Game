import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

assert.deepEqual(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        {
            id: 'QB-GAP',
            question: 'Can a future unimplemented query class be recorded?',
            kind: 'future-unimplemented-kind',
            expected: 'known-gap',
            gap: 'No implementation exists yet.',
        },
    ],
}), []);
assert.ok(queryabilityBenchmarkIssues({
    schemaVersion: 1,
    benchmarks: [
        {
            id: 'QB-GAP',
            question: 'Missing gap explanation',
            kind: 'future-unimplemented-kind',
            expected: 'known-gap',
        },
    ],
}).some(issue => issue.includes('gap is required')));

const result = runResearchQueryabilityAudit(process.cwd(), { discoverArtifacts: false });
assert.equal(result.failed, 0, JSON.stringify(result.results.filter(row => row.status === 'failed'), null, 2));
assert.equal(result.knownGaps, 0);
assert.equal(result.partial, 2);
assert.equal(result.conditional, 0);
assert.equal(result.benchmarkCount, 13);
assert.equal(result.passed, 11);
assert.equal(result.graphDiagnostics.unresolvedEdgeCount, 0);

const answerability = result.results.find(row => row.id === 'QB-003');
assert.equal(answerability?.status, 'passed');
assert.equal(answerability?.summary?.unclassified, 0);

const p204 = result.results.find(row => row.id === 'QB-001');
assert.equal(p204?.status, 'passed');

const cliFixtureDir = path.join(process.cwd(), 'tmp', 'research-queryability-cli-smoke');
const cliFixturePath = path.join(cliFixtureDir, 'benchmarks.json');
fs.mkdirSync(cliFixtureDir, { recursive: true });
fs.writeFileSync(cliFixturePath, JSON.stringify({
    schemaVersion: 1,
    benchmarks: [{
        id: 'QB-CLI-SMOKE',
        question: 'Can the CLI load and report a supplied benchmark registry?',
        kind: 'future-unimplemented-kind',
        expected: 'known-gap',
        gap: 'CLI smoke intentionally avoids rebuilding the full repository model.',
    }],
}, null, 2));
const cli = spawnSync(process.execPath, [
    'scripts/research-queryability-audit.mjs',
    '--benchmarks=tmp/research-queryability-cli-smoke/benchmarks.json',
], {
    cwd: process.cwd(),
    encoding: 'utf8',
});
fs.rmSync(cliFixtureDir, { recursive: true, force: true });
assert.equal(cli.status, 0, cli.stderr);
const cliResult = JSON.parse(cli.stdout);
assert.equal(cliResult.failed, 0);
assert.equal(cliResult.knownGaps, 1);
assert.equal(cliResult.benchmarkCount, 1);
assert.equal(cliResult.graphDiagnostics, null, 'known-gap-only CLI smoke should not build the research graph');

console.log('research-queryability-audit-node-test: ok');
