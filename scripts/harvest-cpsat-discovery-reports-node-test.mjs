#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-cpsat-central-harvest-'));
const receiptPath = path.join(temp, 'receipt.json');
const emptyWorkspace = path.join(temp, 'workspace');
mkdirSync(path.join(emptyWorkspace, 'data'), { recursive: true });
writeFileSync(path.join(emptyWorkspace, 'data', 'levels.json'), '[]\n');
try {
    const run = spawnSync(process.execPath, [
        'scripts/run-bundled.mjs',
        'scripts/harvest-cpsat-discovery-reports.mjs',
        '--',
        `--staging-dir=${temp}`,
        '--source-run-id=fixture-run',
        '--source-run-attempt=3',
        '--source-workflow=cpsat-hint-harvest-sweep (broaden CP-SAT hint coverage)',
        `--ingestion-receipt-out=${receiptPath}`,
        `--workspace-root=${emptyWorkspace}`,
    ], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.kind, 'pathfinder-hint-ingestion-receipt');
    assert.equal(receipt.source.producer, 'harvest-cpsat-discovery-reports');
    assert.equal(receipt.source.runId, 'fixture-run');
    assert.equal(receipt.source.runAttempt, '3');
    assert.equal(receipt.funnel.candidateObservations, 0);
    assert.equal(receipt.additions.paths, 0);
    assert.equal(receipt.additions.provenanceEvents, 0);
    assert.equal(receipt.additions.occurrences, 0);
    assert.match(run.stdout, /CP-SAT discovery harvest: 0 report\(s\)/);
} finally {
    rmSync(temp, { recursive: true, force: true });
}

// Regression coverage proving a real successful row actually transports value end-to-end -- the prior
// version of this test (like harvest-solver-diagnostics-reports-node-test.mjs's own prior version)
// only ever exercised the empty-staging-dir path, which is exactly how a real field-name mismatch in
// the sibling diagnostics adapter went undetected until a real local dual-path parity canary caught it
// (reports/2026-09-24-hint-evidence-phase5-6-dual-path-canaries-001.md). This uses a real,
// already-committed published level and one of its already-known winning paths (so the main referee
// genuinely accepts it) with a synthetic but realistic CP-SAT discovery-report row.
//
// Deliberately uses a DIFFERENT real level (P00002) than harvest-solver-diagnostics-reports-node-
// test.mjs's own real-row fixture (P00001): both tests snapshot/mutate/restore a real tracked
// data/hints/<id>.json file by content, and both run concurrently under run-scripts-parallel.mjs, so
// sharing one level id let one test's write and restore race the other's -- caught for real when
// test:node ran under full parallelism and produced `got entries: [null,null,null]` nondeterministically.
{
    const { readLevelCorpusDocumentWithHints } = await import('./level-data-io.mjs');

    const sourceLevels = JSON.parse(readFileSync(path.join(ROOT, 'data', 'levels.json'), 'utf8'));
    const rawLevel = sourceLevels.find(l => l.id === 'P00002');
    assert.ok(rawLevel, 'fixture requires the real published corpus to still carry level P00002');
    const sourceHintBytes = readFileSync(path.join(ROOT, 'data', 'hints', 'P00002.json'), 'utf8');

    const realTemp = mkdtempSync(path.join(tmpdir(), 'pathfinder-cpsat-real-row-'));
    const workspaceRoot = path.join(realTemp, 'workspace');
    const fixtureCorpusPath = path.join(workspaceRoot, 'data', 'levels.json');
    const fixtureHintDir = path.join(workspaceRoot, 'data', 'hints');
    const stagingDir = path.join(realTemp, 'staging');
    const realReceiptPath = path.join(realTemp, 'receipt.json');
    mkdirSync(fixtureHintDir, { recursive: true });
    mkdirSync(stagingDir, { recursive: true });
    writeFileSync(fixtureCorpusPath, `${JSON.stringify([rawLevel], null, 2)}\n`);
    writeFileSync(path.join(fixtureHintDir, 'P00002.json'), sourceHintBytes);

    try {
        const document = readLevelCorpusDocumentWithHints(fixtureCorpusPath);
        const level = document.levels[0];
        const knownHint = level.hintRecords.find(h => h.provenance?.some(p => typeof p?.context?.levelRevision === 'string' && p.context.levelRevision.length > 0));
        assert.ok(knownHint, 'fixture requires an already-known hint for P00002 with a recorded levelRevision');
        const levelRevision = knownHint.provenance.find(p => typeof p?.context?.levelRevision === 'string')?.context.levelRevision;
        const knownPath = knownHint.path;

        const reportPath = path.join(stagingDir, 'discovery-report.json');
        writeFileSync(reportPath, JSON.stringify({
            schemaVersion: 1,
            kind: 'pathfinder-cpsat-hint-discovery-report',
            producer: 'cpsat-hint-harvest',
            corpus: 'data/levels.json',
            generatedAt: '2026-09-24T00:00:00.000Z',
            levels: [{
                id: 'P00002',
                label: 'baseline',
                solved: true,
                refereeValid: true,
                status: 'OPTIMAL',
                solution: knownPath,
                levelRevision,
                foundAt: '2026-09-24T00:00:00.000Z',
                elapsedMs: 4567,
                budgetMs: 15000,
                forcing: { forcingGateKey: 4, forcingDirection: 5 },
            }],
        }, null, 2));

        const realRun = spawnSync(process.execPath, [
            'scripts/run-bundled.mjs',
            'scripts/harvest-cpsat-discovery-reports.mjs',
            '--',
            `--staging-dir=${stagingDir}`,
            '--source-run-id=fixture-real-row-run',
            '--source-run-attempt=1',
            '--source-workflow=cpsat-hint-harvest-sweep (broaden CP-SAT hint coverage)',
            `--ingestion-receipt-out=${realReceiptPath}`,
            `--workspace-root=${workspaceRoot}`,
        ], { cwd: ROOT, encoding: 'utf8' });
        assert.equal(realRun.status, 0, realRun.stderr || realRun.stdout);
        assert.match(realRun.stdout, /1 report\(s\), 1 candidate\(s\), 1 eligible, 1 referee-accepted/, realRun.stdout);

        const afterDocument = readLevelCorpusDocumentWithHints(fixtureCorpusPath);
        const afterLevel = afterDocument.levels[0];
        const afterHint = afterLevel.hintRecords.find(h => h.path.join(',') === knownPath.join(','));
        const newEntry = afterHint.provenance.find(p => p.search?.elapsedMs === 4567);
        assert.ok(newEntry, `expected a reconstructed provenance entry with elapsedMs=4567; got entries: ${JSON.stringify(afterHint.provenance.map(p => p.search?.elapsedMs))}`);
        assert.equal(newEntry.solver.id, 'external-constraint-solver');
        assert.equal(newEntry.solver.technique, 'cpsat-reference-probe');
        assert.equal(newEntry.search.budgetMs, 15000);
        assert.equal(newEntry.solver.forcing?.gateKey, 4);
        assert.equal(newEntry.solver.forcing?.direction, 5);
        assert.equal(newEntry.occurrences?.[0]?.runId, 'fixture-real-row-run');
        assert.equal(newEntry.occurrences?.[0]?.observedAt, '2026-09-24T00:00:00.000Z');
    } finally {
        rmSync(realTemp, { recursive: true, force: true });
    }
}

console.log('harvest-cpsat-discovery-reports-node-test: ok');
