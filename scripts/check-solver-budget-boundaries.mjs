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
    'const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairAdditiveBudgetMultiplier);',
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

// There is exactly one legitimate wall-ms -> work compatibility boundary inside orchestration:
// resolution of solveLevel's caller-facing legacy time budget into the solve's canonical workBudget.
// Every later stage/retry allocation must derive from that resolved work budget. This intentionally
// scans every live legacyMsToWork(...) invocation rather than selected variable names: the older
// name-based ratchet missed repairLateProbeTotalBudget because that site's wall budget had a
// different syntactic shape, allowing the same work-dose defect to survive until a behavioral test
// found it. Arbitrary future variable names must not be able to bypass this boundary again.
const approvedDirectMsToWorkSite =
    'const workBudget = explicitBaseWorkBudget ?? legacyWorkBudget ?? legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);';
const directMsToWorkLines = orchestration.split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('//') && /\blegacyMsToWork\s*\(/u.test(line));
assert.deepEqual(directMsToWorkLines, [approvedDirectMsToWorkSite],
    'orchestration must have exactly one legacyMsToWork(...) call: solve-level compatibility normalization. Stage/retry work doses must scale the resolved workBudget instead.');

assert.match(portfolio, /LEGACY WALL-CLOCK SCHEDULER EXPERIMENT/u,
    'the old ms portfolio must remain visibly quarantined until it is work-normalized or removed');

for (const required of ['--work-budget', 'deadlineTruncated', 'validDeterministicEvidence', 'prep._workCap']) {
    assert.ok(methodProbe.includes(required), `method-probe deterministic research contract lost ${required}`);
}

console.log(`Solver budget boundary check passed; ${liveLegacyLines.length} approved legacy ms-derived allocation site(s) remain.`);
