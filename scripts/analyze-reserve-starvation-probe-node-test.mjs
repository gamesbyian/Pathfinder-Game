import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reserve-starvation-probe-'));
try {
    const sample = path.join(temp, 'sample.json');
    fs.writeFileSync(sample, JSON.stringify({ questionId: 'Q', ids: ['A', 'B', 'C'] }));

    const writeDoc = (name, records, protocolHash = 'p1') => {
        const file = path.join(temp, name);
        fs.writeFileSync(file, JSON.stringify({
            schemaVersion: 1,
            kind: 'pathfinder-compact-failure-response',
            protocolHash,
            solverRef: 'solver-1',
            records,
            summary: { observed: records.length },
            populationIntegrity: null,
            sourceFiles: [],
            missingSourceFiles: [],
            invalidSourceFiles: [],
        }));
        return file;
    };
    const row = (id, outcome, nodesExpanded, extra = {}) => ({
        identity: id,
        parentId: id,
        levelId: id,
        outcome,
        nodesExpanded,
        attempts: [{ outcome: outcome === 'solved' ? 'solved' : outcome === 'nodeLimited' ? 'node-limited' : 'exhausted', actionKey: 'admissible-order|tieBreak=default|lds=off' }],
        ...extra,
    });
    const analyze = file => JSON.parse(execFileSync('node', [
        'scripts/analyze-reserve-starvation-probe.mjs',
        '--in=' + file,
        '--sample=' + sample,
    ], { cwd: root, encoding: 'utf8' }));

    const negative = analyze(writeDoc('negative.json', [
        row('A', 'solved', 70_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(negative.decisionReady, true);
    assert.equal(negative.opportunities, 0);
    assert.equal(negative.decision, 'close-first-recurrence-screen-negative');

    const one = analyze(writeDoc('one.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(one.decisionReady, true);
    assert.equal(one.opportunities, 1);
    assert.equal(one.decision, 'freeze-additional-disjoint-40');

    const two = analyze(writeDoc('two.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'solved', 220_000_000),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(two.decisionReady, true);
    assert.equal(two.opportunities, 2);
    assert.equal(two.decision, 'design-smallest-matched-total-work-reserve-ab');

    const censored = analyze(writeDoc('censored.json', [
        row('A', 'solved', 100_000_000),
        row('B', 'deadlineTruncated', 120_000_000, { deadlineTruncated: true }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ]));
    assert.equal(censored.decisionReady, false);
    assert.deepEqual(censored.population.abstentionIds, ['B']);
    assert.equal(censored.decision, 'recover-incomplete-or-censored');

    const unknownProtocol = analyze(writeDoc('unknown-protocol.json', [
        row('A', 'solved', 70_000_000),
        row('B', 'nodeLimited', 300_000_000, { nodeCapped: true, nodeCeiling: 300_000_000 }),
        row('C', 'exhaustedNegative', 55_000_000, { exhausted: true }),
    ], null));
    assert.equal(unknownProtocol.decisionReady, false);

    console.log('reserve starvation probe reducer tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
