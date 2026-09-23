import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashExecutionProtocol } from './solver-experiment-contract.mjs';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-publish-'));
try {
    const primary = path.join(temp, 'result.json');
    const unrelated = path.join(temp, 'plan.json');
    const jsonl = path.join(temp, 'rows.jsonl');
    const out = path.join(temp, 'published');
    const contract = path.join(temp, 'experiment-contract.json');
    const contractDoc = { experiment: { configurationHash: 'proto-contract', resolvedSha: 'solver-contract' } };
    fs.writeFileSync(primary, JSON.stringify({ levels: [{ id: 'A', ok: false, status: 'exhausted', attempts: [{ outcome: 'exhausted', stageId: 'main' }] }] }));
    fs.writeFileSync(unrelated, JSON.stringify({ cells: [{ cellId: 'not-a-result' }] }));
    fs.writeFileSync(jsonl, `${JSON.stringify({ id: 'B', ok: false, status: 'node-budget-reached' })}\n`);
    fs.writeFileSync(contract, JSON.stringify(contractDoc));
    execFileSync('node', ['scripts/sweep-publish.mjs', `--primary=${primary}`, `--failure-source=${primary}`, `--failure-source=${jsonl}`, `--include=${unrelated}`, `--contract-file=${contract}`, `--out=${out}`], { cwd: root });
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
    const compact = JSON.parse(fs.readFileSync(path.join(out, manifest.failureEvidence.publishedPath)));
    assert.deepEqual(compact.records.map(row => row.identity), ['A', 'B']);
    assert.equal(compact.records[0].attempts[0].stageId, 'main');
    assert.equal(compact.invalidSourceFiles.length, 0, 'publication includes are not implicit failure populations');
    // protocolHash is the canonical execution-protocol identity (hashExecutionProtocol), not a
    // bare copy of configurationHash -- sweep-publish.mjs previously conflated the two
    // (scripts/solver-evidence-identity-guard.mjs now fails CI if that regresses).
    assert.equal(compact.protocolHash, hashExecutionProtocol(contractDoc));
    assert.notEqual(compact.protocolHash, contractDoc.experiment.configurationHash);
    assert.equal(compact.solverRef, 'solver-contract');

    const weakContract = path.join(temp, 'weak-contract.json');
    const weakOut = path.join(temp, 'weak-published');
    const weakContractDoc = {
        experiment: { configurationHash: 'proto-weak' },
        solverRef: 'legacy-top-level-solver',
    };
    fs.writeFileSync(weakContract, JSON.stringify(weakContractDoc));
    execFileSync('node', [
        'scripts/sweep-publish.mjs',
        `--primary=${primary}`,
        `--failure-source=${primary}`,
        `--contract-file=${weakContract}`,
        `--out=${weakOut}`,
    ], {
        cwd: root,
        env: { ...process.env, GITHUB_SHA: 'f'.repeat(40) },
    });
    const weakManifest = JSON.parse(fs.readFileSync(path.join(weakOut, 'manifest.json')));
    const weakCompact = JSON.parse(fs.readFileSync(path.join(weakOut, weakManifest.failureEvidence.publishedPath)));
    assert.equal(weakCompact.protocolHash, hashExecutionProtocol(weakContractDoc));
    assert.equal(weakCompact.solverRef, null,
        'workflow/legacy SHA metadata must not upgrade weak provenance into comparable-run solver identity');
    assert.equal(weakCompact.records[0].solverRef, null,
        'row commit aliases must not refill the missing solver identity under a document-level protocol authority');
    assert.ok(manifest.entries.some(entry => entry.source === unrelated && entry.role === 'include'));
    console.log('sweep-publish tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
