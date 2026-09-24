#!/usr/bin/env node
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-diagnostics-central-harvest-'));
const receiptPath = path.join(temp, 'receipt.json');
try {
    const run = spawnSync(process.execPath, [
        'scripts/run-bundled.mjs',
        'scripts/harvest-solver-diagnostics-reports.mjs',
        '--',
        `--staging-dir=${temp}`,
        '--source-run-id=fixture-run',
        '--source-run-attempt=2',
        '--source-workflow=Solver diagnostics and hint capture',
        `--ingestion-receipt-out=${receiptPath}`,
    ], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.kind, 'pathfinder-hint-ingestion-receipt');
    assert.equal(receipt.source.producer, 'harvest-solver-diagnostics-reports');
    assert.equal(receipt.source.runId, 'fixture-run');
    assert.equal(receipt.source.runAttempt, '2');
    assert.equal(receipt.funnel.candidateObservations, 0);
    assert.equal(receipt.additions.paths, 0);
    assert.equal(receipt.additions.provenanceEvents, 0);
    assert.equal(receipt.additions.occurrences, 0);
    assert.match(run.stdout, /Diagnostics discovery harvest: 0 report\(s\)/);
} finally {
    rmSync(temp, { recursive: true, force: true });
}

// Regression coverage for a real defect found via a real local dual-path parity canary
// (reports/2026-09-24-hint-evidence-phase5-6-dual-path-canaries-001.md): the diagnostics report row
// has no `elapsedMs` field -- analyze-solver-diagnostics.mjs's convertDirectToRawPayload() writes the
// real solve's elapsed time into `timeMs` (and its totalSolveTimeMs/ladderTotal* siblings), never
// under the key `elapsedMs`. Reading `row.elapsedMs` silently dropped every reconstructed
// observation's cumulativeElapsedMs to null, with zero test coverage catching it because neither this
// file's own prior test nor harvest-cpsat-discovery-reports-node-test.mjs exercised a real solved row
// at all -- both only proved the empty-staging-dir path. This test uses a real, already-committed
// corpus level's real level revision and a real already-known winning path (so the main referee
// genuinely accepts it) with a synthetic but realistic diagnostics row shape, and asserts the
// reconstructed provenance's cumulativeElapsedMs actually reaches the persisted Hint record.
{
    // This test file runs under plain `node` (see package.json), so it cannot import
    // modules/domain/level-fingerprint.ts directly (a TypeScript module resolvable only through the
    // bundler harvest-solver-diagnostics-reports.mjs itself runs through). Instead of recomputing the
    // level revision, read it off an already-stored real provenance entry for this exact level -- the
    // same value getLevelFingerprint() would return, since it is stable across mechanics-preserving
    // edits and this fixture never touches the level's own definition.
    const { readLevelCorpusDocumentWithHints } = await import('./level-data-io.mjs');

    const realTemp = mkdtempSync(path.join(tmpdir(), 'pathfinder-diagnostics-real-row-'));
    const sourceCorpusPath = path.join(ROOT, 'data', 'levels.json');
    const sourceHintPath = path.join(ROOT, 'data', 'hints', 'P00001.json');
    const isolatedDataDir = path.join(realTemp, 'data');
    const isolatedHintsDir = path.join(isolatedDataDir, 'hints');
    mkdirSync(isolatedHintsDir, { recursive: true });
    const corpusPath = path.join(isolatedDataDir, 'levels.json');
    const p00001HintPath = path.join(isolatedHintsDir, 'P00001.json');
    copyFileSync(sourceCorpusPath, corpusPath);
    copyFileSync(sourceHintPath, p00001HintPath);

    const document = readLevelCorpusDocumentWithHints(corpusPath);
    const level = document.levels.find(l => l.id === 'P00001');
    assert.ok(level, 'fixture requires the real published corpus to still carry level P00001');
    const knownHint = level.hintRecords.find(h => h.provenance?.some(p => typeof p?.context?.levelRevision === 'string' && p.context.levelRevision.length > 0));
    assert.ok(knownHint, 'fixture requires an already-known hint for P00001 with a recorded levelRevision');
    const levelRevision = knownHint.provenance.find(p => typeof p?.context?.levelRevision === 'string')?.context.levelRevision;
    const knownPath = knownHint.path;
    assert.ok(Array.isArray(knownPath) && knownPath.length > 0, 'fixture requires an already-known winning path for P00001');

    const realReceiptPath = path.join(realTemp, 'receipt.json');
    // The harvester writes to this isolated sibling hint directory, never to the tracked repo.
    // This keeps the real codec/referee/provenance path while making the contract safe under
    // four-worker and cross-shard scheduling.
    try {
        const reportPath = path.join(realTemp, 'diagnostics-report.json');
        writeFileSync(reportPath, JSON.stringify({
            schemaVersion: 1,
            kind: 'pathfinder-solver-diagnostics-report',
            producer: 'solver-diagnostics',
            corpus: 'data/levels.json',
            commitSha: 'fixture-sha',
            solverRequestIdentity: 'sha256:' + 'f'.repeat(64),
            reproducibilityMode: 'deterministic-work',
            levels: [{
                level: 1,
                levelId: 'P00001',
                levelRevision,
                discoveryObservedAt: '2026-09-24T00:00:00.000Z',
                solution: knownPath,
                status: 'success',
                nodesExpanded: 4242,
                workSpent: 100,
                workBudget: 200000,
                timeMs: 777,
                totalSolveTimeMs: 777,
                attempts: [{ ok: true, outcome: 'success', scoringProfileId: 'perimeterSweep', orderingBiasId: null, nodesExpanded: 321 }],
            }],
        }, null, 2));

        const realRun = spawnSync(process.execPath, [
            'scripts/run-bundled.mjs',
            'scripts/harvest-solver-diagnostics-reports.mjs',
            '--',
            `--staging-dir=${realTemp}`,
            '--source-run-id=fixture-real-row-run',
            '--source-run-attempt=1',
            '--source-workflow=Solver diagnostics and hint capture',
            `--ingestion-receipt-out=${realReceiptPath}`,
            `--corpus-path=${corpusPath}`,
        ], { cwd: ROOT, encoding: 'utf8' });
        assert.equal(realRun.status, 0, realRun.stderr || realRun.stdout);
        assert.match(realRun.stdout, /1 report\(s\), 1 candidate\(s\), 1 eligible, 1 referee-accepted/, realRun.stdout);

        const afterDocument = readLevelCorpusDocumentWithHints(corpusPath);
        const afterLevel = afterDocument.levels.find(l => l.id === 'P00001');
        const afterHint = afterLevel.hintRecords.find(h => h.path.join(',') === knownPath.join(','));
        const newEntry = afterHint.provenance.find(p => p.search?.cumulativeElapsedMs === 777);
        assert.ok(newEntry, `expected a reconstructed provenance entry with cumulativeElapsedMs=777 from the report's timeMs field; got entries: ${JSON.stringify(afterHint.provenance.map(p => p.search?.cumulativeElapsedMs))}`);
        assert.equal(newEntry.search.nodesExpanded, 321, 'the winning attempt\'s own nodesExpanded, not the row-level cumulative figure');
        assert.equal(newEntry.search.cumulativeNodesExpanded, 4242, 'the row-level cumulative nodesExpanded');
        assert.equal(newEntry.search.workSpent, 100);
        assert.equal(newEntry.search.workBudget, 200000);
        assert.equal(newEntry.execution?.solverRequestIdentity, 'sha256:' + 'f'.repeat(64));
        assert.equal(newEntry.execution?.reproducibilityMode, 'deterministic-work');
        assert.equal(newEntry.occurrences?.[0]?.runId, 'fixture-real-row-run');
    } finally {
        rmSync(realTemp, { recursive: true, force: true });
    }
}

console.log('harvest-solver-diagnostics-reports-node-test: ok');
