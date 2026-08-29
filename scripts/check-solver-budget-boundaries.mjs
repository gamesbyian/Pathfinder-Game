#!/usr/bin/env node
/**
 * Ratchet for solver budget semantics.
 *
 * This does not claim every historical budget path is already ideal. It makes the remaining debt
 * explicit and prevents new clock-derived allocation logic from appearing casually. When one of
 * the approved legacy sites is migrated to work, simply remove it from the source; this check does
 * not require the old line to remain.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const orchestration = read('modules/solver/orchestration.ts');
const stageBudget = read('modules/solver/stage-budget.ts');
const stagePolicy = read('modules/solver/stage-policy.ts');
const stagePlan = read('modules/solver/stage-plan.ts');
const portfolio = read('modules/solver/legacy-latency-portfolio-experiment.ts');
const hintGenerator = read('modules/solver/hint-ablation-generator.ts');
const hintWorkbench = read('scripts/hint-workbench.mjs');
const methodProbe = read('scripts/method-probe.mjs');

for (const [path, source] of [
    ['modules/solver/stage-budget.ts', stageBudget],
    ['modules/solver/stage-policy.ts', stagePolicy],
    ['modules/solver/stage-plan.ts', stagePlan],
]) {
    assert.equal(/\b(?:Date|performance)\.(?:now)\s*\(/u.test(source), false,
        `${path} is policy/allocation code and must stay independent of live clock reads`);
}

for (const [path, source] of [
    ['modules/solver/orchestration.ts', orchestration],
    ['modules/solver/hint-ablation-generator.ts', hintGenerator],
    ['scripts/hint-workbench.mjs', hintWorkbench],
]) {
    assert.equal(source.includes('3350'), false,
        `${path} must use modules/solver/budget-units.ts rather than copying the legacy calibration`);
}

const approvedLegacyTimeDerivedAllocations = new Set([
    'const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairBudgetFraction);',
    'totalBudgetMs: Math.floor(timeBudgetMs * diversityBudgetFraction),',
    'const admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction);',
    'const coarseStateNearTieRetentionRetryTotalBudget = Math.floor(timeBudgetMs * coarseStateNearTieRetentionRetryBudgetFraction);',
    'const nonDefaultRetryTotalBudget = Math.floor(timeBudgetMs * nonDefaultRetryBudgetFraction);',
    'const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);',
    'const repairElitePrefixDfsRetryTotalBudget = Math.floor(timeBudgetMs * repairElitePrefixDfsRetryBudgetFraction);',
    'const mcNeighborBudgetRetryTotalBudget = Math.floor(timeBudgetMs * mcNeighborBudgetRetryBudgetFraction);',
    'const goalAttractionGuidanceDistanceRetryTotalBudget = Math.floor(timeBudgetMs * goalAttractionGuidanceDistanceRetryBudgetFraction);',
]);
const liveLegacyLines = orchestration.split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('//') && /\btimeBudgetMs\s*\*/u.test(line));
const unapprovedLegacyLines = liveLegacyLines.filter(line => !approvedLegacyTimeDerivedAllocations.has(line));
assert.deepEqual(unapprovedLegacyLines, [],
    `new wall-derived allocation site(s) found: ${unapprovedLegacyLines.join(' | ')}. Use work, or explicitly document/migrate the debt rather than extending it.`);

const approvedDirectMsToWorkSites = new Set([
    'const workBudget = explicitBaseWorkBudget ?? legacyWorkBudget ?? legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);',
    'const roundWorkBudget = legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);',
]);
const directMsToWorkLines = orchestration.split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('legacyMsToWork(timeBudgetMs'));
assert.deepEqual(directMsToWorkLines.filter(line => !approvedDirectMsToWorkSites.has(line)), [],
    'new direct timeBudgetMs -> work conversion added inside orchestration; normalize only at an intentional compatibility boundary');

// 2026-08-28+: queue #2 step-3 migrated sites no longer re-derive their own work pool from
// timeBudgetMs via legacyMsToWork — each now scales the solve's own resolved `workBudget` instead
// (see budget-units.ts's scaledStageWorkBudget and each tier's own call-site comment in
// orchestration.ts). Each site's own `*TotalBudget` (ms) line stays timeBudgetMs-derived and stays
// in approvedLegacyTimeDerivedAllocations above — that is now a WALL-DEADLINE sizing line only
// (a genuine, permanent use of timeBudgetMs), distinct from the work-dose debt the still-unmigrated
// sites in that set carry. Guard against silently reintroducing the old work-dose pattern for each
// migrated tier. See reports/2026-08-28-dedup-near-tie-retry-work-dose-migration.md for the full
// account of what this pattern does and does not preserve.
const migratedWorkDoseSites = ['coarseStateNearTieRetentionRetryTotalBudget', 'repairFallbackTotalBudget', 'nonDefaultRetryTotalBudget'];
for (const site of migratedWorkDoseSites) {
    assert.equal(orchestration.includes(`legacyMsToWork(${site}`), false,
        `${site}'s work dose regressed back to a timeBudgetMs-derived legacyMsToWork conversion`);
}

assert.match(portfolio, /LEGACY WALL-CLOCK SCHEDULER EXPERIMENT/u,
    'the old ms portfolio must remain visibly quarantined until it is work-normalized or removed');

for (const required of ['--work-budget', 'deadlineTruncated', 'validDeterministicEvidence', 'prep._workCap']) {
    assert.ok(methodProbe.includes(required), `method-probe deterministic research contract lost ${required}`);
}

console.log(`Solver budget boundary check passed; ${liveLegacyLines.length} approved legacy ms-derived allocation site(s) remain.`);
