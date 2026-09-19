import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-publish-'));
try {
    const primary = path.join(temp, 'result.json');
    const unrelated = path.join(temp, 'plan.json');
    const jsonl = path.join(temp, 'rows.jsonl');
    const out = path.join(temp, 'published');
    fs.writeFileSync(primary, JSON.stringify({ levels: [{ id: 'A', ok: false, status: 'exhausted', attempts: [{ outcome: 'exhausted', stageId: 'main' }] }] }));
    fs.writeFileSync(unrelated, JSON.stringify({ cells: [{ cellId: 'not-a-result' }] }));
    fs.writeFileSync(jsonl, `${JSON.stringify({ id: 'B', ok: false, status: 'node-budget-reached' })}\n`);
    execFileSync('node', ['scripts/sweep-publish.mjs', `--primary=${primary}`, `--failure-source=${primary}`, `--failure-source=${jsonl}`, `--include=${unrelated}`, `--out=${out}`], { cwd: root });
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
    const compact = JSON.parse(fs.readFileSync(path.join(out, manifest.failureEvidence.publishedPath)));
    assert.deepEqual(compact.records.map(row => row.identity), ['A', 'B']);
    assert.equal(compact.records[0].attempts[0].stageId, 'main');
    assert.equal(compact.invalidSourceFiles.length, 0, 'publication includes are not implicit failure populations');
    assert.ok(manifest.entries.some(entry => entry.source === unrelated && entry.role === 'include'));
    console.log('sweep-publish tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
