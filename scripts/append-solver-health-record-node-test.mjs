#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildHealthRecord, findPreviousCompatibleRun, summarizeStageParticipation } from './append-solver-health-record.mjs';
import { buildCapabilityMemory, compareCandidateRows, hashIds } from './solver-capability-memory-lib.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

const protocol = { corpus1_node_budget: '50000000', corpus2_node_budget: '50000000', strict_total_work_budget: 'false' };
const sampleLevels = [
    { id: 'A', ok: true, deadlineTruncated: false, attempts: [{ stageId: 'main-search', ok: true, nodesExpanded: 10, workSpent: 12 }] },
    { id: 'B', ok: false, status: 'error', attempts: [{ stageId: 'main-search', ok: false, nodesExpanded: 5, workSpent: 7 }, { stageId: 'repair-fallback', ok: false, nodesExpanded: 3, workSpent: 4 }] },
    { id: 'C', ok: false, deadlineTruncated: true, attempts: [{ stageId: 'main-search', ok: false, nodesExpanded: 20, workSpent: 25 }] },
];

test('summarizeStageParticipation aggregates reach/attempts/solves/nodesExpanded/workSpent per stage', () => {
    const stats = summarizeStageParticipation(sampleLevels);
    assert.deepEqual(stats['main-search'], { reach: 3, attempts: 3, solves: 1, nodesExpanded: 35, workSpent: 44 });
    assert.deepEqual(stats['repair-fallback'], { reach: 1, attempts: 1, solves: 0, nodesExpanded: 3, workSpent: 4 });
});

test('buildHealthRecord carries set hashes, protocol identity, and compact capability churn', () => {
    const summary = {
        runId: '12345', solverRef: 'abc123', levelBlind: true, deterministic: true, enableFlags: '', disableFlags: '', protocol,
        corpus1: { total: 3, solved: 1, nodes: 35, work: 100 }, corpus2: null,
    };
    const previous = {
        runId: '11111',
        rowsByCorpus: { corpus1: [
            { id: 'A', ok: false }, { id: 'B', ok: true }, { id: 'C', ok: false },
        ] },
    };
    const record = buildHealthRecord(summary, { 'solver-corpus1-latest.json': { levels: sampleLevels } }, previous);
    assert.equal(record.runId, '12345');
    assert.equal(record.commit, 'abc123');
    assert.equal(record.deterministic, true);
    assert.deepEqual(record.protocol, protocol);
    assert.equal(record.protocolHash.length, 64);
    assert.equal(record.truncated, 1);
    assert.equal(record.errored, 1);
    assert.equal(record.corpus1.solved, 1);
    assert.equal(record.corpus1.populationIdHash.length, 64);
    assert.equal(record.corpus1.solvedIdHash.length, 64);
    assert.deepEqual(record.capabilityChurn.corpus1, {
        comparedRunId: '11111', gained: 1, lost: 1, retained: 0,
        gainedIdHash: hashIds(['A']), lostIdHash: hashIds(['B']),
    });
});

test('workflow-dispatch event inputs provide protocol identity when summary has none', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'solver-health-event-test-'));
    const eventFile = path.join(dir, 'event.json');
    writeFileSync(eventFile, JSON.stringify({ inputs: { corpus1_node_budget: '123456', strict_total_work_budget: 'true' } }));
    const before = process.env.GITHUB_EVENT_PATH;
    process.env.GITHUB_EVENT_PATH = eventFile;
    try {
        const record = buildHealthRecord(
            { runId: 'event-run', levelBlind: true, deterministic: false, corpus1: { total: 3, solved: 1, nodes: 1, work: 1 } },
            { 'solver-corpus1-latest.json': { levels: sampleLevels } },
        );
        assert.equal(record.protocol.corpus1_node_budget, '123456');
        assert.equal(record.protocol.corpus2_node_budget, '50000000');
        assert.equal(record.protocol.strict_total_work_budget, 'true');
        assert.equal(record.protocolHash.length, 64);
    } finally {
        if (before == null) delete process.env.GITHUB_EVENT_PATH;
        else process.env.GITHUB_EVENT_PATH = before;
    }
});

test('findPreviousCompatibleRun skips incompatible flag/protocol snapshots', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'solver-health-prev-test-'));
    const runs = path.join(dir, 'capability-runs');
    mkdirSync(path.join(runs, 'old-good'), { recursive: true });
    mkdirSync(path.join(runs, 'old-bad'), { recursive: true });
    const baseSummary = { levelBlind: true, deterministic: 'true', enableFlags: '', disableFlags: '', protocol, corpus1: { total: 3 }, corpus2: null };
    writeFileSync(path.join(runs, 'old-good', 'per-level-corpus1.json'), JSON.stringify({ rows: sampleLevels }));
    writeFileSync(path.join(runs, 'old-bad', 'per-level-corpus1.json'), JSON.stringify({ rows: sampleLevels }));
    const goodRecord = buildHealthRecord({ ...baseSummary, runId: 'old-good' }, { 'solver-corpus1-latest.json': { levels: sampleLevels } });
    const badRecord = buildHealthRecord({ ...baseSummary, runId: 'old-bad', protocol: { ...protocol, corpus1_node_budget: '25000000' } }, { 'solver-corpus1-latest.json': { levels: sampleLevels } });
    const timeline = path.join(dir, 'timeline.jsonl');
    writeFileSync(timeline, `${JSON.stringify(goodRecord)}\n${JSON.stringify(badRecord)}\n`);
    const currentSummary = { ...baseSummary, runId: 'current' };
    const found = findPreviousCompatibleRun({
        timelineFile: timeline,
        currentSummary,
        currentCombinedByCorpus: { 'solver-corpus1-latest.json': { levels: sampleLevels } },
        capabilityRunsDir: runs,
    });
    assert.equal(found.runId, 'old-good');
});

test('legacy timeline records without protocol identity abstain from churn comparison', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'solver-health-legacy-test-'));
    const runs = path.join(dir, 'capability-runs');
    mkdirSync(path.join(runs, 'legacy'), { recursive: true });
    writeFileSync(path.join(runs, 'legacy', 'per-level-corpus1.json'), JSON.stringify({ rows: sampleLevels }));
    const timeline = path.join(dir, 'timeline.jsonl');
    writeFileSync(timeline, `${JSON.stringify({ runId: 'legacy', levelBlind: true, deterministic: true, corpus1: { total: 3 } })}\n`);
    const currentSummary = { runId: 'current', levelBlind: true, deterministic: true, enableFlags: '', disableFlags: '', protocol, corpus1: { total: 3 }, corpus2: null };
    const found = findPreviousCompatibleRun({ timelineFile: timeline, currentSummary, currentCombinedByCorpus: { corpus1: { levels: sampleLevels } }, capabilityRunsDir: runs });
    assert.equal(found, null);
});

test('CLI appends compact longitudinal churn once a prior tracked snapshot exists', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'solver-health-record-test-'));
    const runs = path.join(dir, 'capability-runs');
    const outFile = path.join(dir, 'nested', 'solver-health-timeline.jsonl');
    const combinedFile = path.join(dir, 'solver-corpus1-latest.json');
    writeFileSync(combinedFile, JSON.stringify({ levels: sampleLevels }));

    mkdirSync(path.join(runs, 'r0'), { recursive: true });
    const priorLevels = [{ id: 'A', ok: false }, { id: 'B', ok: true }, { id: 'C', ok: false }];
    const priorSummary = { runId: 'r0', solverRef: 'sha0', levelBlind: true, deterministic: true, enableFlags: '', disableFlags: '', protocol, corpus1: { total: 3, solved: 1, nodes: 1, work: 1, solvedIds: ['B'] } };
    writeFileSync(path.join(runs, 'r0', 'per-level-corpus1.json'), JSON.stringify({ rows: priorLevels }));
    mkdirSync(path.dirname(outFile), { recursive: true });
    const priorRecord = buildHealthRecord(priorSummary, { 'solver-corpus1-latest.json': { levels: priorLevels } });
    writeFileSync(outFile, `${JSON.stringify(priorRecord)}\n`);

    const summaryFile = path.join(dir, 'summary.json');
    writeFileSync(summaryFile, JSON.stringify({ runId: 'r1', solverRef: 'sha1', levelBlind: true, deterministic: true, enableFlags: '', disableFlags: '', protocol, corpus1: { total: 3, solved: 1, nodes: 35, work: 100, solvedIds: ['A'] } }));
    execFileSync('node', ['scripts/append-solver-health-record.mjs', `--summary=${summaryFile}`, `--combined=${combinedFile}`, `--out=${outFile}`, `--capability-runs-dir=${runs}`], { encoding: 'utf8' });
    const lines = readFileSync(outFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);
    const record = JSON.parse(lines[1]);
    assert.equal(record.runId, 'r1');
    assert.equal(record.capabilityChurn.corpus1.gained, 1);
    assert.equal(record.capabilityChurn.corpus1.lost, 1);
    assert.equal(record.capabilityChurn.corpus1.gainedIdHash, hashIds(['A']));
    assert.equal(record.capabilityChurn.corpus1.lostIdHash, hashIds(['B']));
    assert.equal('gainedIds' in record.capabilityChurn.corpus1, false);
    assert.equal('lostIds' in record.capabilityChurn.corpus1, false);
});

test('candidate comparison abstains when either baseline or candidate row is censored', () => {
    const baseline = [{ id: 'A', ok: false, deadlineTruncated: true }, { id: 'B', ok: false }];
    const candidate = [{ id: 'A', ok: true }, { id: 'B', ok: true }];
    const paired = compareCandidateRows(baseline, candidate);
    assert.deepEqual(paired.gainIds, ['B']);
    assert.deepEqual(paired.inconclusiveIds, ['A']);
    const memory = buildCapabilityMemory({ baselineRows: { levels: baseline }, candidates: [{ id: 'candidate', rows: candidate }] });
    assert.equal(memory.baseline.population, 2);
    assert.equal(memory.baseline.residual, 1);
    assert.equal(memory.baseline.unknown, 1);
    assert.deepEqual(memory.union.nominatedIds, ['B']);
});

test('capability-memory comparisons preserve negative verdicts while exposing complementary gains', () => {
    const baseline = { levels: [
        { id: 'A', ok: true }, { id: 'B', ok: false }, { id: 'C', ok: false }, { id: 'D', ok: true },
    ] };
    const candidate = { levels: [
        { id: 'A', ok: true, workSpent: 10 }, { id: 'B', ok: true, workSpent: 20 },
        { id: 'C', ok: false, deadlineTruncated: true, workSpent: 30 }, { id: 'D', ok: false, workSpent: 40 },
    ] };
    const paired = compareCandidateRows(baseline.levels, candidate.levels);
    assert.deepEqual(paired.gainIds, ['B']);
    assert.deepEqual(paired.lossIds, ['D']);
    assert.deepEqual(paired.inconclusiveIds, ['C']);
    const memory = buildCapabilityMemory({
        baselineId: 'current', baselineRows: baseline, candidates: [
            { id: 'live-negative', rows: candidate, disposition: 'closed-negative' },
            { id: 'old-policy', signature: { gainIds: ['B', 'C'], lossIds: ['A'] }, disposition: 'closed-negative' },
        ],
    });
    const historical = memory.candidates.find(x => x.id === 'old-policy');
    assert.deepEqual(historical.currentResidualNominationIds, ['B', 'C']);
    assert.equal(historical.currentResidualConfirmedGains, 0);
    assert.ok(historical.warning.includes('may not steer production'));
});

test('capability-memory CLI materializes JSON and human summary without solver compute', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'capability-memory-cli-test-'));
    writeFileSync(path.join(dir, 'baseline.json'), JSON.stringify({ levels: [{ id: 'A', ok: true }, { id: 'B', ok: false }, { id: 'C', ok: false, deadlineTruncated: true }] }));
    writeFileSync(path.join(dir, 'candidate.json'), JSON.stringify({ levels: [{ id: 'A', ok: true }, { id: 'B', ok: true, workSpent: 25 }, { id: 'C', ok: true }] }));
    writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
        schemaVersion: 1,
        baseline: { id: 'current', path: 'baseline.json' },
        candidates: [
            { id: 'row-policy', path: 'candidate.json', disposition: 'closed-negative' },
            { id: 'historical-policy', signature: { gainIds: ['B', 'C'], lossIds: [] }, disposition: 'closed-negative' },
        ],
    }));
    const out = path.join(dir, 'memory.json');
    const summaryOut = path.join(dir, 'memory.md');
    execFileSync('node', ['scripts/solver-capability-memory.mjs', `--manifest=${path.join(dir, 'manifest.json')}`, `--out=${out}`, `--summary-out=${summaryOut}`], { encoding: 'utf8' });
    const result = JSON.parse(readFileSync(out, 'utf8'));
    const summaryText = readFileSync(summaryOut, 'utf8');
    assert.equal(result.baseline.residual, 1);
    assert.equal(result.baseline.unknown, 1);
    assert.equal(result.candidates.find(x => x.id === 'row-policy').currentResidualConfirmedGains, 1);
    assert.deepEqual(result.candidates.find(x => x.id === 'historical-policy').currentResidualNominationIds, ['B']);
    assert.equal(result.candidates.find(x => x.id === 'historical-policy').currentResidualConfirmedGains, 0);
    assert.ok(summaryText.includes('residual 1; unknown 1'));
    assert.ok(summaryText.includes('baseline unknown/censored rows are excluded'));
});

console.log(`\nappend-solver-health-record tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
