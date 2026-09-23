#!/usr/bin/env node
/**
 * Regression coverage for scripts/level-blind-capability-sweep.mjs's reported scheduler mode:
 * the tool has no --scheduler-mode flag and never set SolveOpts.schedulerMode, so it always
 * actually ran in what orchestration.ts calls 'production' mode — yet hardcoded the removed
 * 'legacy' vocabulary into both the written report's summary.schedulerMode and every row's
 * buildRow() label. Runs the real CLI (matching scripts/family-boundary-cli-node-test.mjs's own
 * execFile pattern) against a tiny, trivially solvable fixture corpus and asserts the produced
 * report actually says 'production'.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { analyzeEqualWorkProductionReach } from './stress/analyze-equal-work-production-reach.mjs';
import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'level-blind-capability-sweep-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
const outFile = path.join(dir, 'report.json');
const summaryOutFile = path.join(dir, 'report-summary.md');
await writeFile(corpusPath, JSON.stringify([{
    id: 'FIXTURE-1',
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [],
}]));

// This tool is bundler-only by established convention (every workflow invokes it via
// `node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- ...`, never plain
// node directly), so the test matches that real contract rather than inventing a new one.
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/level-blind-capability-sweep.mjs',
    `--corpus=${corpusPath}`, '--budget-ms=5000', '--lifecycle-telemetry',
    '--experiment-id=fixture-experiment', '--research-question=fixture-question', '--preflight=reports/fixture.md',
    `--out=${outFile}`, `--summary-out=${summaryOutFile}`,
], { cwd: ROOT });

const report = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(report.summary.schedulerMode, 'production',
    'level-blind-capability-sweep.mjs has no --scheduler-mode flag and always resolves to production mode; the reported label must say so, not the removed "legacy" vocabulary');
assert.equal(report.levels.length, 1);
assert.equal(report.levels[0].ok, true, 'fixture level must be solvable for this to be a meaningful check');
assert.ok(typeof report.summary.commit === 'string' && report.summary.commit.length > 0,
    'maintained raw report wrapper must persist the solver commit');
assert.equal(report.summary.corpus, path.relative(ROOT, corpusPath),
    'maintained raw report wrapper must persist corpus identity');
assert.equal(report.summary.lifecycleTelemetry, true);
assert.equal(report.summary.failureInformationTelemetry, 'compact-v1');
assert.equal(report.levels[0].failureInformation?.schemaVersion, 1);
assert.ok(report.levels[0].failureInformation?.beamFlowCounters && typeof report.levels[0].failureInformation.beamFlowCounters === 'object');
assert.ok(report.levels[0].failureInformation?.pruneDiagnostics && typeof report.levels[0].failureInformation.pruneDiagnostics === 'object');
assert.ok(report.levels[0].failureInformation?.progress && typeof report.levels[0].failureInformation.progress === 'object');
for (const state of Object.values(report.levels[0].failureInformation.progress)) {
    assert.ok(Number.isSafeInteger(state.observed) && state.observed >= state.retained);
    assert.ok(state.retained <= 16, 'ordinary compact progress telemetry must remain bounded');
}
// Canonical solver-request identity dual-write (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.2): proves the value actually reaches the real bundled invocation
// boundary and round-trips through the plain-Node digest owner, not merely that the fields exist.
assert.equal(report.summary.solverRequestProjection?.kind, 'pathfinder-solver-request-projection');
assert.equal(report.summary.solverRequestProjection?.resourceEnvelope?.timeBudgetMs, 5000,
    '--budget-ms=5000 must reach the canonical projection unchanged');
assert.equal(report.summary.solverRequestProjection?.scheduler?.mode, 'production');
assert.equal(
    report.summary.solverRequestIdentity,
    solverRequestIdentityFromProjection(report.summary.solverRequestProjection),
    'the persisted identity must match a fresh recomputation from the persisted projection',
);
assert.notEqual(report.summary.solverRequestIdentity, report.summary.effectiveConfigDigest,
    'canonical solver-request identity and the legacy effectiveConfig digest are different identities and must not collapse to the same value');

// Execution backend/reproducibility class (modules/solver/reproducibility-mode.mjs): this tool has no
// --race-pool-size flag, so `direct`/`deterministic-work` is a certain fact here, not a guess.
assert.equal(report.summary.backend, 'direct');
assert.equal(report.summary.reproducibilityMode, 'deterministic-work');

assert.equal(report.summary.experimentId, 'fixture-experiment');
assert.equal(report.summary.researchQuestion, 'fixture-question');
assert.equal(report.summary.preflight, 'reports/fixture.md');
assert.ok(report.levels[0].stageLifecycle && typeof report.levels[0].stageLifecycle === 'object');
assert.ok(report.levels[0].attempts.length > 0);
assert.ok(report.levels[0].attempts.every(attempt => Number.isFinite(attempt.workSpent)),
    '--lifecycle-telemetry must persist per-attempt workSpent needed by the production-reach join');
assert.deepEqual(report.levels[0].class2ControlEligibility, {
    hasMustTurn: false,
    ordinaryLateRepairParticipated: false,
    childStructuralEligible: false,
    childInsertionPointReached: false,
}, 'the maintained producer must persist canonical control-side Class-2 participation evidence');

const winningConfig = report.levels[0].winningConfig;
assert.ok(typeof winningConfig === 'string' && winningConfig.length > 0);
const reachJoin = analyzeEqualWorkProductionReach({
    results: [{
        tier: 'EW1',
        corpus: report.summary.corpus,
        levelId: report.levels[0].id,
        techniqueKeys: [winningConfig],
        ok: true,
        status: 'success',
        workSpent: 1,
        workBudget: 10,
    }],
}, [report], {
    currentHead: report.summary.commit,
    requireCurrentHead: true,
});
assert.equal(reachJoin.decisionBearing, true,
    'the real level-blind report wrapper must pass the maintained production-reach reader');
assert.deepEqual(reachJoin.production.commits, [report.summary.commit]);
assert.deepEqual(reachJoin.production.corpora, [report.summary.corpus]);

console.log('level-blind-capability-sweep CLI: all tests passed');
