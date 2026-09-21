import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'summarize-failure-response-'));
try {
    // technique-census-shaped combined-cells.json
    const combinedCells = path.join(temp, 'combined-cells.json');
    fs.writeFileSync(combinedCells, JSON.stringify({
        results: [
            { cellId: 'a', ok: true, workSpent: 10 },
            { cellId: 'b', ok: false, status: 'node-budget-reached', nodesExpanded: 5 },
            { cellId: 'c', ok: false, status: 'referee-invalid' },
        ],
    }));
    const out1 = path.join(temp, 'summary-1.json');
    execFileSync('node', ['scripts/summarize-solver-failure-response.mjs', `--in=${combinedCells}`, '--rows-key=results', `--out=${out1}`], { cwd: root });
    const summary1 = JSON.parse(fs.readFileSync(out1, 'utf8'));
    assert.equal(summary1.records.length, 3);
    assert.equal(summary1.records[1].identity, 'b');
    assert.equal(summary1.summary.outcomes.solved, 1);
    assert.equal(summary1.summary.outcomes.nodeLimited, 1);
    assert.equal(summary1.summary.refereeInvalid, 1);
    assert.equal(summary1.summary.selfDerivedPopulation, true, 'no populationIntegrity was supplied in the fixture');
    assert.deepEqual(summary1.sourceFiles, [combinedCells]);
    assert.deepEqual(summary1.missingSourceFiles, []);

    // contract metadata may supply protocol/solver identity even when source rows do not
    const contract = path.join(temp, 'experiment-contract.json');
    fs.writeFileSync(contract, JSON.stringify({
        experiment: { configurationHash: 'protocol-from-contract', resolvedSha: 'solver-from-contract' },
    }));
    const outContract = path.join(temp, 'summary-contract.json');
    execFileSync('node', [
        'scripts/summarize-solver-failure-response.mjs',
        `--in=${combinedCells}`,
        '--rows-key=results',
        `--contract-file=${contract}`,
        `--out=${outContract}`,
    ], { cwd: root });
    const summaryContract = JSON.parse(fs.readFileSync(outContract, 'utf8'));
    assert.equal(summaryContract.protocolHash, 'protocol-from-contract');
    assert.equal(summaryContract.solverRef, 'solver-from-contract');

    const weakContract = path.join(temp, 'weak-contract.json');
    fs.writeFileSync(weakContract, JSON.stringify({
        experiment: { configurationHash: 'protocol-only' },
        solverRef: 'legacy-contract-solver',
    }));
    const sourceWithLegacyIdentity = path.join(temp, 'source-with-legacy-identity.json');
    fs.writeFileSync(sourceWithLegacyIdentity, JSON.stringify({
        solverRef: 'source-solver',
        commitSha: 'source-commit',
        levels: [{ id: 'W1', ok: false, status: 'exhausted' }],
    }));
    const weakOut = path.join(temp, 'summary-weak-contract.json');
    execFileSync('node', [
        'scripts/summarize-solver-failure-response.mjs',
        `--in=${sourceWithLegacyIdentity}`,
        '--rows-key=levels',
        `--contract-file=${weakContract}`,
        `--out=${weakOut}`,
    ], { cwd: root, env: { ...process.env, GITHUB_SHA: 'f'.repeat(40) } });
    const weakSummary = JSON.parse(fs.readFileSync(weakOut, 'utf8'));
    assert.equal(weakSummary.protocolHash, 'protocol-only');
    assert.equal(weakSummary.solverRef, null,
        'a supplied weak contract must not borrow source/workflow SHA to become comparable-run evidence');

    const sourceOnlyOut = path.join(temp, 'summary-source-only.json');
    execFileSync('node', [
        'scripts/summarize-solver-failure-response.mjs',
        `--in=${sourceWithLegacyIdentity}`,
        '--rows-key=levels',
        `--out=${sourceOnlyOut}`,
    ], { cwd: root, env: { ...process.env, GITHUB_SHA: 'f'.repeat(40) } });
    assert.equal(JSON.parse(fs.readFileSync(sourceOnlyOut, 'utf8')).solverRef, 'source-solver',
        'without a contract, shared source-document identity remains available as contextual provenance');

    // solver-stress-refresh-shaped combined report, with its own populationIntegrity, across two files
    const report1 = path.join(temp, 'corpus1-latest.json');
    const report2 = path.join(temp, 'corpus2-latest.json');
    fs.writeFileSync(report1, JSON.stringify({ levels: [{ id: 'R1', ok: true, workSpent: 100 }] }));
    fs.writeFileSync(report2, JSON.stringify({ levels: [{ id: 'R2', ok: false, status: 'exhausted' }] }));
    const out2 = path.join(temp, 'summary-2.json');
    execFileSync('node', ['scripts/summarize-solver-failure-response.mjs', `--in=${report1},${report2}`, '--rows-key=levels', `--out=${out2}`], { cwd: root });
    const summary2 = JSON.parse(fs.readFileSync(out2, 'utf8'));
    assert.equal(summary2.records.length, 2, 'rows are concatenated across multiple source files');
    assert.equal(summary2.summary.outcomes.solved, 1);
    assert.equal(summary2.summary.outcomes.exhaustedNegative, 1);
    assert.equal(summary2.summary.selfDerivedPopulation, true, 'multiple source files never adopt a single one\'s populationIntegrity as if it covered them all');

    // a single source file's own externally-verified populationIntegrity is trusted as-is
    const reportWithIntegrity = path.join(temp, 'with-integrity.json');
    const integrity = {
        outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 },
        coverageComplete: true, decisionValidComplete: true,
    };
    fs.writeFileSync(reportWithIntegrity, JSON.stringify({ levels: [{ id: 'R3', ok: true, workSpent: 1 }], populationIntegrity: integrity }));
    const out3 = path.join(temp, 'summary-3.json');
    execFileSync('node', ['scripts/summarize-solver-failure-response.mjs', `--in=${reportWithIntegrity}`, '--rows-key=levels', `--out=${out3}`], { cwd: root });
    const summary3 = JSON.parse(fs.readFileSync(out3, 'utf8'));
    assert.equal(summary3.summary.selfDerivedPopulation, false);
    assert.equal(summary3.summary.coverageComplete, true);

    // a missing source file is reported explicitly rather than silently dropped
    const out4 = path.join(temp, 'summary-4.json');
    execFileSync('node', ['scripts/summarize-solver-failure-response.mjs', `--in=${report1},${path.join(temp, 'does-not-exist.json')}`, '--rows-key=levels', `--out=${out4}`], { cwd: root });
    const summary4 = JSON.parse(fs.readFileSync(out4, 'utf8'));
    assert.equal(summary4.records.length, 1);
    assert.equal(summary4.missingSourceFiles.length, 1);

    // Explicit inputs remain ergonomic, but arbitrary JSON is never interpreted as observations.
    const planFile = path.join(temp, 'plan.json');
    fs.writeFileSync(planFile, JSON.stringify({ cells: [{ cellId: 'not-an-observation' }] }));
    const out5 = path.join(temp, 'summary-5.json');
    execFileSync('node', ['scripts/summarize-solver-failure-response.mjs', `--in=${report1},${planFile}`, `--out=${out5}`], { cwd: root });
    const summary5 = JSON.parse(fs.readFileSync(out5, 'utf8'));
    assert.equal(summary5.records.length, 1);
    assert.deepEqual(summary5.invalidSourceFiles, [planFile]);

    console.log('summarize-solver-failure-response tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
