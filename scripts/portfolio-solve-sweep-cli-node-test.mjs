#!/usr/bin/env node
/**
 * Regression coverage for scripts/portfolio-solve-sweep.mjs's canonical solver-request identity
 * dual-write: proves the real bundled CLI (matching level-blind-capability-sweep-cli-node-test.mjs's
 * own execFile pattern) persists solverRequestProjection/solverRequestIdentity in its report summary,
 * alongside the existing legacy effectiveConfig/effectiveConfigDigest pair, and that a distinctive
 * --node-budget sentinel actually reaches the persisted projection rather than only proving shape.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';
import { readLevelCorpusDocumentWithHints } from './level-data-io.mjs';
import { buildBundle } from './run-bundled.mjs';

// portfolio-hint-reconstruction-lib.mjs imports modules/solver/hint-provenance.js, a TypeScript
// module resolvable only through the bundler (this test file runs under plain node) -- same class
// of issue documented in harvest-solver-diagnostics-reports-node-test.mjs. buildBundle() resolves
// and inlines the .ts dependency into a plain-JS bundle this process can import directly, without
// spawning a subprocess just to call one pure function.
const { reconstructPortfolioHintProvenance } = await import(buildBundle('scripts/portfolio-hint-reconstruction-lib.mjs'));

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'portfolio-solve-sweep-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
const outFile = path.join(dir, 'report.json');
const summaryOutFile = path.join(dir, 'report-summary.md');
const checkpointPath = path.join(dir, 'checkpoint.jsonl');
await writeFile(corpusPath, JSON.stringify([{
    id: 'FIXTURE-1',
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [],
}]));

// This tool is bundler-only by established convention (every workflow invokes it via
// `node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- ...`, never plain node
// directly), matching level-blind-capability-sweep-cli-node-test.mjs's own real-CLI contract.
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/portfolio-solve-sweep.mjs',
    `--corpus=${corpusPath}`, '--scheduler-mode=production', '--budget-ms=5000', '--node-budget=12345',
    `--checkpoint=${checkpointPath}`,
    `--out=${outFile}`, `--summary-out=${summaryOutFile}`,
], { cwd: ROOT });

const report = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(report.levels.length, 1);
assert.equal(report.levels[0].ok, true, 'fixture level must be solvable for this to be a meaningful check');

// Canonical solver-request identity dual-write (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.2): proves the value actually reaches the real bundled invocation
// boundary and round-trips through the plain-Node digest owner, not merely that the fields exist.
assert.equal(report.summary.solverRequestProjection?.kind, 'pathfinder-solver-request-projection');
assert.equal(report.summary.solverRequestProjection?.resourceEnvelope?.timeBudgetMs, 5000,
    '--budget-ms=5000 must reach the canonical projection unchanged');
assert.equal(report.summary.solverRequestProjection?.resourceEnvelope?.nodeBudget, 12345,
    '--node-budget=12345 must reach the canonical projection unchanged');
assert.equal(report.summary.solverRequestProjection?.scheduler?.mode, 'production');
assert.equal(
    report.summary.solverRequestIdentity,
    solverRequestIdentityFromProjection(report.summary.solverRequestProjection),
    'the persisted identity must match a fresh recomputation from the persisted projection',
);
assert.notEqual(report.summary.solverRequestIdentity, report.summary.effectiveConfigDigest,
    'canonical solver-request identity and the legacy effectiveConfig digest are different identities and must not collapse to the same value');
assert.ok(typeof report.summary.effectiveConfig === 'object' && report.summary.effectiveConfig,
    'legacy effectiveConfig must still be present; this is a dual-write, not a replacement');

// Execution backend/reproducibility class (modules/solver/reproducibility-mode.mjs): sequential
// dispatch is a certain, known fact at this producer, not a guess.
assert.equal(report.summary.executionRuntime?.nodeVersion, process.version);
assert.equal(report.summary.executionRuntime?.platform, process.platform);
assert.equal(report.summary.executionRuntime?.arch, process.arch);
assert.equal(report.summary.backend, 'direct');
assert.equal(report.summary.reproducibilityMode, 'deterministic-work');

// This is the one currently-maintained producer that can actually race -- proves --race-pool-size
// really does flip the canonical backend/reproducibilityMode, matching the legacy engine:'raced' fact
// it already reports, rather than the canonical fields staying stuck on their sequential default.
const racedOutFile = path.join(dir, 'raced-report.json');
const racedSummaryOutFile = path.join(dir, 'raced-report-summary.md');
const racedCheckpointPath = path.join(dir, 'raced-checkpoint.jsonl');
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/portfolio-solve-sweep.mjs',
    `--corpus=${corpusPath}`, '--scheduler-mode=production', '--budget-ms=5000', '--race-pool-size=2',
    `--checkpoint=${racedCheckpointPath}`,
    `--out=${racedOutFile}`, `--summary-out=${racedSummaryOutFile}`,
], { cwd: ROOT });
const racedReport = JSON.parse(await readFile(racedOutFile, 'utf8'));
assert.equal(racedReport.summary.engine, 'raced', 'sanity check: the legacy field must also agree this run raced');
assert.equal(racedReport.summary.backend, 'raced');
assert.equal(racedReport.summary.reproducibilityMode, 'first-success-race');

// Bounded execution/run binding on hint provenance (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 4/W): --save-hints under a real GITHUB_RUN_ID must persist both the
// run's solverRequestIdentity/reproducibilityMode AND a real occurrence lineage record, proving the
// whole path end-to-end through the real bundled invocation rather than a unit-level shape check alone.
const hintsCorpusPath = path.join(dir, 'hints-corpus.json');
await writeFile(hintsCorpusPath, await readFile(corpusPath, 'utf8'));
const hintsOutFile = path.join(dir, 'hints-report.json');
const hintsSummaryOutFile = path.join(dir, 'hints-report-summary.md');
const hintsCheckpointPath = path.join(dir, 'hints-checkpoint.jsonl');
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/portfolio-solve-sweep.mjs',
    `--corpus=${hintsCorpusPath}`, '--scheduler-mode=production', '--budget-ms=5000', '--save-hints',
    `--checkpoint=${hintsCheckpointPath}`,
    `--out=${hintsOutFile}`, `--summary-out=${hintsSummaryOutFile}`,
], { cwd: ROOT, env: { ...process.env, GITHUB_RUN_ID: '998877', GITHUB_RUN_ATTEMPT: '1' } });
const hintsReport = JSON.parse(await readFile(hintsOutFile, 'utf8'));
const hintsDocument = readLevelCorpusDocumentWithHints(hintsCorpusPath);
const savedHintRecords = hintsDocument.levels[0].hintRecords;
assert.equal(savedHintRecords?.length, 1, '--save-hints must persist exactly the one solved path');
const savedProvenance = savedHintRecords[0].provenance[0];
assert.deepEqual(savedProvenance.execution, {
    schemaVersion: 1,
    solverRequestIdentity: hintsReport.summary.solverRequestIdentity,
    protocolHash: null,
    reproducibilityMode: hintsReport.summary.reproducibilityMode,
    arm: null,
}, 'the persisted hint provenance execution capsule must match this run\'s own reported identity/reproducibilityMode');
assert.equal(savedProvenance.occurrences?.length, 1, 'a real GITHUB_RUN_ID must produce a real occurrence record, not leave it absent');
assert.equal(savedProvenance.occurrences[0].runId, '998877', '--save-hints must bind the real GITHUB_RUN_ID, not a guessed value');
assert.equal(savedProvenance.occurrences[0].runAttempt, '1');
assert.equal(hintsReport.summary.producer, 'portfolio-solve-sweep');
assert.equal(hintsReport.summary.levelBlind, false);
assert.equal(hintsReport.summary.historyAware, true);
assert.equal(typeof hintsReport.levels[0].levelRevision, 'string');
assert.ok(hintsReport.levels[0].levelRevision.length > 0);
assert.equal(typeof hintsReport.levels[0].discoveryObservedAt, 'string');
assert.ok(Number.isFinite(Date.parse(hintsReport.levels[0].discoveryObservedAt)));
assert.ok(Number.isFinite(hintsReport.levels[0].workBudget),
    'the solved row must carry the actual effective work budget, not require run-wide inference');
assert.deepEqual(
    reconstructPortfolioHintProvenance(hintsReport.summary, hintsReport.levels[0], {
        sourceRunId: '998877',
        sourceRunAttempt: '1',
    }),
    savedProvenance,
    'central report reconstruction must be semantically identical to the real direct --save-hints provenance event',
);

console.log('portfolio-solve-sweep CLI: solver request identity dual-write verified');
