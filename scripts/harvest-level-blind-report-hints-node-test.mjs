#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

// Regression coverage for a real defect found via a real local dual-path parity canary
// (reports/2026-09-24-hint-evidence-phase6-level-blind-family-retirement-001.md): the pre-existing
// scripts/harvest-level-blind-selection-manifest-node-test.mjs only ever exercised unsolved rows
// (ok: false), so no test here ever proved a real accepted row's fields actually reach the persisted
// Hint. summary.workBudget only echoes an EXPLICIT --work-budget/--node-budget override; a run with
// neither still derives and uses a real, non-null work budget internally, which the direct-write
// route's real SolveResult carries but summary.workBudget stays null for -- silently reconstructing
// search.workBudget as null on every ordinary run. Fixed by preferring
// summary.solverRequestProjection.resourceEnvelope.baseWorkBudget, which always resolves the real
// effective value. This test uses a real, already-committed stress-corpus level and one of its real
// already-known winning paths (so the main referee genuinely accepts it) with a synthetic but
// realistic level-blind sweep report shape carrying no explicit workBudget override, proving the
// reconstructed provenance's search.workBudget still lands correctly from the projection.
const { readLevelCorpusDocumentWithHints, hintFilePathFor } = await import('./level-data-io.mjs');

const corpusRelPath = 'data/stress/stress-levels.json';
const publishedCorpusPath = path.join(ROOT, corpusRelPath);
const document = readLevelCorpusDocumentWithHints(publishedCorpusPath);
const level = document.levels.find(l => Array.isArray(l.hintRecords) && l.hintRecords.length > 0);
assert.ok(level, 'fixture requires at least one stress-corpus-1 level with an already-known hint');
const knownPath = level.hintRecords[0].path;

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-level-blind-real-row-'));
const receiptPath = path.join(temp, 'receipt.json');
// Keep the fixture's real published stress-level mechanics and real persisted Hint, but isolate the
// physical corpus. The old test rewrote data/stress/hints/<id>.json in place while 211 Node
// contracts could be reading the same store concurrently.
const corpusPath = path.join(temp, 'stress-levels.json');
const { hints: _hints, hintRecords: _hintRecords, ...rawLevel } = level;
writeFileSync(corpusPath, JSON.stringify([rawLevel], null, 2) + '\n');
const isolatedHintPath = hintFilePathFor(corpusPath, level.id);
mkdirSync(path.dirname(isolatedHintPath), { recursive: true });
writeFileSync(
    isolatedHintPath,
    readFileSync(path.join(ROOT, 'data', 'stress', 'hints', `${level.id}.json`), 'utf8'),
);
const corpusSha256 = createHash('sha256').update(readFileSync(corpusPath)).digest('hex');
try {
    writeFileSync(path.join(temp, 'report.json'), JSON.stringify({
        summary: {
            levelBlind: true,
            corpus: corpusRelPath,
            corpusSha256,
            commit: 'a'.repeat(40),
            budgetMs: 10000,
            // Deliberately no explicit workBudget/nodeBudget override -- this is the ordinary case
            // the bug affected. solverRequestProjection carries the real derived value regardless.
            workBudget: null,
            nodeBudget: null,
            solverRequestProjection: {
                schemaVersion: 1,
                kind: 'pathfinder-solver-request-projection',
                resourceEnvelope: { timeBudgetMs: 10000, nodeBudget: null, baseWorkBudget: 33500000, strictTotalWorkBudget: false },
            },
        },
        levels: [{
            id: level.id,
            ok: true,
            status: 'success',
            solution: knownPath,
            nodesExpanded: 4242,
            workSpent: 100,
            totalMs: 321,
            attempts: [{ ok: true, outcome: 'success', scoringProfileId: 'perimeterSweep', orderingBiasId: null, nodesExpanded: 321 }],
        }],
    }, null, 2));

    const run = spawnSync(process.execPath, [
        'scripts/run-bundled.mjs',
        'scripts/harvest-level-blind-report-hints.mjs',
        '--',
        `--staging-dir=${temp}`,
        `--stress-corpus=${corpusPath}`,
        '--source-run-id=fixture-real-row-run',
        '--source-run-attempt=1',
        '--source-workflow=Solver stress-corpus refresh (level-blind capability)',
        `--selection-manifest-out=${path.join(temp, 'selection.json')}`,
        `--ingestion-receipt-out=${receiptPath}`,
    ], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.match(run.stdout, /1 report\(s\), 1 merged, 1 source row\(s\), 1 solved row\(s\), 1 referee-accepted row\(s\)/, run.stdout);

    const afterDocument = readLevelCorpusDocumentWithHints(corpusPath);
    const afterLevel = afterDocument.levels.find(l => l.id === level.id);
    const afterHint = afterLevel.hintRecords.find(h => h.path.join(',') === knownPath.join(','));
    const newEntry = afterHint.provenance.find(p => p.search?.workBudget === 33500000);
    assert.ok(newEntry, `expected a reconstructed provenance entry with search.workBudget=33500000 from the projection; got entries: ${JSON.stringify(afterHint.provenance.map(p => p.search?.workBudget))}`);
    assert.equal(newEntry.search.nodesExpanded, 321, 'the winning attempt\'s own nodesExpanded, not the row-level cumulative figure');
    assert.equal(newEntry.search.cumulativeNodesExpanded, 4242);
    assert.equal(newEntry.search.workSpent, 100);
    assert.equal(newEntry.occurrences?.[0]?.runId, 'fixture-real-row-run');

    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.kind, 'pathfinder-hint-ingestion-receipt');
    assert.equal(receipt.source.producer, 'harvest-level-blind-report-hints');
    assert.equal(receipt.funnel.refereeAcceptedObservations, 1);
} finally {
    rmSync(temp, { recursive: true, force: true });
}

console.log('harvest-level-blind-report-hints-node-test: ok');
