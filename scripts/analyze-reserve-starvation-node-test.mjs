import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reserve-test-'));
const run = (...args) => JSON.parse(execFileSync('node', ['scripts/analyze-reserve-starvation.mjs', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
}));
try {
    const input = path.join(temp, 'input.json');
    fs.writeFileSync(input, JSON.stringify({
        only: 'admissible-order|tieBreak=default|lds=off',
        nodeBudget: 300_000_000,
        levels: [
            { id: 'A', ok: true, nodesExpanded: 80_000_000 },
            { id: 'B', ok: true, nodesExpanded: 70_000_000 },
            { id: 'C', ok: false, status: 'node-budget-reached' },
        ],
    }));
    const result = run(`--in=${input}`);
    assert.equal(result.summary.opportunities, 1);
    assert.equal(result.summary.decision, 'inconclusive-acquire-disjoint-40');

    fs.writeFileSync(input, JSON.stringify({ levels: [{ id: 'A', ok: false, deadlineTruncated: true }] }));
    assert.equal(run(`--in=${input}`).summary.decision, 'recover-censored-before-decision');

    const sample = path.join(temp, 'sample.json');
    fs.writeFileSync(sample, JSON.stringify({ kind: 'pathfinder-reserve-starvation-confirmation-sample', ids: ['A', 'B'] }));
    assert.throws(() => run(`--in=${input}`, `--sample=${sample}`), /Command failed/,
        'a partial frozen sample must fail closed rather than produce a decision');

    fs.writeFileSync(input, JSON.stringify({ only: 'wrong-profile', levels: [] }));
    assert.throws(() => run(`--in=${input}`), /Command failed/, 'profile drift must fail closed');
    console.log('reserve-starvation reducer tests passed.');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
