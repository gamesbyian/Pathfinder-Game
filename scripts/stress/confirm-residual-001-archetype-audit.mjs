#!/usr/bin/env node
/**
 * Diagnostic built for the confirm-residual-001 two-phase confirmation
 * (reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md,
 * reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md), retained as durable
 * tooling rather than deleted after use (see .github/workflows/README.md's "One-shot diagnostics"
 * note) -- the two problems it diagnoses are general, not specific to that one cohort:
 *
 * 1. A two-phase residual design guarantees every residual row is a CONTROL-FAILURE (survives the
 *    whole ladder). It does NOT guarantee routing regime eligibility for a given candidate's own gate
 *    (e.g. isMustCrossFlipperHeavy: arch === 'must-cross-heavy' && mustPass >= 3 && flippers >= 2)
 *    -- those are independent conditions, and a candidate's new configs can only ever execute on a
 *    level satisfying BOTH. Given a sealed pool and a sealed phase-1 combined control report, this
 *    computes exactly (via the real production extractFeatures/isMustCrossFlipperHeavy functions,
 *    not a reimplementation) how many control-failure rows also satisfy a given routing regime gate.
 * 2. Even a genuinely routing regime-eligible, control-failure row can still show zero participation for
 *    a reason that has nothing to do with routing regime classification: a scheduling/budget gap. Found
 *    for confirm-residual-001 specifically -- MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT did not protect
 *    a rule's trailing configs once a level's actual nodesExpanded overshot the nominal node_budget
 *    by ~4.5x under non-strict ("legacy additive-pass") semantics -- this script's --dump-full-
 *    attempts-for-id and direct getConfiguredAttemptConfigs call are the reusable way to tell
 *    "config list is wrong" apart from "config list is right but scheduling never reached it" for
 *    any future candidate confirmation that comes back with unexpected zero participation.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/confirm-residual-001-routing regime-audit.mjs -- \
 *     --pool=<sealed-pool.json> --phase1-report=<sealed-phase1-control-report.json> \
 *     [--phase2-treatment-report=<sealed-phase2-treatment-report.json>] \
 *     [--dump-full-attempts-for-id=<levelId>] \
 *     [--solve-direct-for-id=<levelId> [--node-budget=N] [--work-budget=N]]
 *
 * --solve-direct-for-id re-solves one pool level right here with attemptBudgetTelemetry:true, since
 * a sealed combined report never carries per-attempt allocatedNodeCeiling/allocatedWorkCeiling/
 * workSpent unless the original sweep dispatch itself passed --attempt-budget-telemetry -- this is
 * how to see exactly which ceiling (node or work) actually stopped a given attempt without
 * re-running the whole sealed cohort with telemetry on.
 */
import path from 'node:path';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const poolPath = argMap.get('--pool');
const reportPath = argMap.get('--phase1-report');
const treatmentReportPath = argMap.get('--phase2-treatment-report');
if (!poolPath || !reportPath) throw new Error('Usage: --pool=<path> --phase1-report=<path> [--phase2-treatment-report=<path>]');

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
// Use the REAL production functions directly (both now exported specifically for this audit)
// rather than reimplementing their logic, to eliminate any chance of implementation drift between
// this script's classification and what getAttemptConfigs itself actually computes and branches on.
const { extractFeatures, isMustCrossFlipperHeavy, getConfiguredAttemptConfigs } = await import('../../modules/solver/attempts.js');
const { solveLevel } = await import('../../modules/solver/orchestration.js');

// The real sweep pipeline (level-blind-capability-sweep.mjs) reduces each raw level to ONLY these
// fields before the solver ever sees it (level-blindness: no identity/history/hints/baseline).
// Reproduced here to check whether that reduction changes the computed routing regime/features versus
// computing them from the full raw pool record.
const PUZZLE_FIELDS = [
    'grid', 'gates', 'goal', 'reqLen', 'reqInt', 'blocks', 'geese', 'falseGoals', 'mustPass',
    'mustCross', 'landmarks', 'filters', 'flippingFilters', 'portals',
];
function mechanicsOnlyLevel(raw) {
    const clean = {};
    for (const key of PUZZLE_FIELDS) {
        if (raw?.[key] !== undefined) clean[key] = JSON.parse(JSON.stringify(raw[key]));
    }
    return clean;
}
function classify(rawOrReduced, levelNumber) {
    const level = normalizeRawLevel(rawOrReduced, levelNumber);
    const f = extractFeatures(level);
    const eligible = isMustCrossFlipperHeavy(f);
    return { routingRegime: f.routingRegime, mustPass: f.mustPass, flippers: f.flippers, reqInt: f.reqInt, eligible };
}

const poolParsed = JSON.parse(readFileSync(path.resolve(poolPath), 'utf8'));
const poolLevels = Array.isArray(poolParsed) ? poolParsed : poolParsed.levels;
const report = JSON.parse(readFileSync(path.resolve(reportPath), 'utf8'));
const reportRows = report.levels ?? [];
const solvedIds = new Set(reportRows.filter(r => r.ok).map(r => r.id ?? String(r.level)));

console.log(`pool: ${poolLevels.length} levels; phase1-report: ${reportRows.length} rows, ${solvedIds.size} solved`);

let archEligible = 0;
let archEligibleAndSolved = 0;
let archEligibleAndFailed = 0;
const eligibleFailedIds = [];
const routingRegimeCounts = new Map();

let mismatches = 0;
for (let i = 0; i < poolLevels.length; i++) {
    const raw = poolLevels[i];
    const rawClass = classify(raw, i + 1);
    routingRegimeCounts.set(rawClass.routingRegime, (routingRegimeCounts.get(rawClass.routingRegime) ?? 0) + 1);
    const reducedClass = classify(mechanicsOnlyLevel(raw), i + 1);
    if (reducedClass.eligible !== rawClass.eligible || reducedClass.routingRegime !== rawClass.routingRegime) {
        mismatches++;
        if (mismatches <= 5) {
            console.log(`MISMATCH ${raw.id}: raw=${JSON.stringify(rawClass)} mechanics-only=${JSON.stringify(reducedClass)}`);
        }
    }
    // The actual sweep pipeline solves the mechanics-only-reduced level (level-blindness), so that
    // is the classification that determines what really ran -- not the raw pool record.
    if (!reducedClass.eligible) continue;
    archEligible++;
    const solved = solvedIds.has(raw.id);
    if (solved) archEligibleAndSolved++;
    else { archEligibleAndFailed++; eligibleFailedIds.push(raw.id); }
}
if (mismatches > 0) console.log(`\n*** ${mismatches}/${poolLevels.length} levels classify DIFFERENTLY under raw vs. mechanics-only-reduced fields ***\n`);

console.log(`routing regime distribution: ${JSON.stringify(Object.fromEntries(routingRegimeCounts))}`);
console.log(`isMustCrossFlipperHeavy-eligible in pool: ${archEligible}/${poolLevels.length} (${(100 * archEligible / poolLevels.length).toFixed(2)}%)`);
console.log(`  of those, solved by control: ${archEligibleAndSolved}`);
console.log(`  of those, control-failure (in the residual): ${archEligibleAndFailed}`);
console.log(`routing regime-eligible-and-in-residual IDs (${eligibleFailedIds.length}): ${eligibleFailedIds.join(',')}`);

if (treatmentReportPath) {
    const treatment = JSON.parse(readFileSync(path.resolve(treatmentReportPath), 'utf8'));
    const treatmentRows = treatment.levels ?? [];
    const byId = new Map(treatmentRows.map(r => [r.id ?? String(r.level), r]));
    console.log('\n--- treatment-arm attempt detail for each routing regime-eligible-and-residual row ---');
    for (const id of eligibleFailedIds) {
        const row = byId.get(id);
        if (!row) { console.log(`${id}: NOT FOUND in treatment report`); continue; }
        const attempts = row.attempts ?? [];
        const repairAttempts = attempts.filter(a => a.repair);
        const repairWork = repairAttempts.reduce((n, a) => n + (a.nodesExpanded || 0), 0);
        const newConfigAttempts = attempts.filter(a => {
            const key = a.actionKey || '';
            return key.includes('|beam|score=intersectionHarvest|bias=none|width=5000|retention=plain')
                || key.includes('|beam|score=objectiveFirst|bias=none|width=5000|retention=plain');
        });
        console.log(`${id}: ok=${row.ok} workSpent=${row.workSpent} nodesExpanded=${row.nodesExpanded} attemptCount=${attempts.length} repairAttempts=${repairAttempts.length} repairNodesExpanded=${repairWork} newCandidateConfigAttempts=${newConfigAttempts.length}${newConfigAttempts.length ? ' [' + newConfigAttempts.map(a => `${a.actionKey}:outcome=${a.outcome}:nodes=${a.nodesExpanded}`).join(' | ') + ']' : ''}`);
    }
    const dumpId = argMap.get('--dump-full-attempts-for-id');
    if (dumpId) {
        const row = byId.get(dumpId);
        console.log(`\n--- full attempt sequence for ${dumpId} ---`);
        console.log(JSON.stringify((row?.attempts ?? []).map(a => ({
            stageId: a.stageId, actionKey: a.actionKey, scoringProfileId: a.scoringProfileId, orderingBiasId: a.orderingBiasId ?? null, beamWidth: a.beamWidth, mechanicBucketRetention: a.mechanicBucketRetention ?? false,
            outcome: a.outcome, allocatedBudgetMs: a.allocatedBudgetMs, nodesExpanded: a.nodesExpanded,
            ok: a.ok, timedOut: a.timedOut,
        })), null, 1));

        const rawDump = poolLevels.find(l => l.id === dumpId);
        if (rawDump) {
            const levelNumber = poolLevels.indexOf(rawDump) + 1;
            const classification = classify(rawDump, levelNumber);
            console.log(`\n--- ${dumpId} classification (via real extractFeatures/isMustCrossFlipperHeavy) ---`);
            console.log(JSON.stringify(classification));
            const normalized = normalizeRawLevel(rawDump, levelNumber);
            const directConfigs = getConfiguredAttemptConfigs(normalized, { STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: true });
            console.log(`\n--- ${dumpId}: getConfiguredAttemptConfigs(level, {STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: true}) called directly, right here, right now ---`);
            console.log(JSON.stringify(directConfigs.map(c => ({ scoringProfileId: c.scoringProfileId, beamWidth: c.beamWidth ?? null, orderingBiasId: c.orderingBias?.id ?? null, mechanicBucketRetention: c.mechanicBucketRetention ?? null, repair: c.repair ?? null }))));
        } else {
            console.log(`\n${dumpId} not found in pool levels (checked ${poolLevels.length} raw records by .id)`);
        }
    }
}

// --solve-direct-for-id=<id> [--node-budget=N] [--work-budget=N]: re-solve one level directly, right
// here, with attemptBudgetTelemetry:true, to see the ACTUAL per-attempt allocatedNodeCeiling/
// allocatedWorkCeiling/workSpent the real scheduler computed -- the combined report's own attempts
// array (used by --dump-full-attempts-for-id above) never carries this telemetry unless the original
// sweep dispatch itself passed --attempt-budget-telemetry, so re-running locally with it turned on is
// the only way to see exactly which ceiling (node or work) actually stopped a given attempt, without
// re-running the whole sealed cohort. Mirrors level-blind-capability-sweep.mjs's own solveOpts
// construction so the reproduction is faithful to the real dispatch.
const solveDirectId = argMap.get('--solve-direct-for-id');
if (solveDirectId) {
    const rawDump = poolLevels.find(l => l.id === solveDirectId);
    if (!rawDump) {
        console.log(`\n${solveDirectId} not found in pool levels (checked ${poolLevels.length} raw records by .id)`);
    } else {
        const levelNumber = poolLevels.indexOf(rawDump) + 1;
        const normalized = normalizeRawLevel(mechanicsOnlyLevel(rawDump), levelNumber);
        const nodeBudget = Number(argMap.get('--node-budget')) || 50000000;
        const workBudget = Number(argMap.get('--work-budget')) || Math.floor(nodeBudget * 134 / 100);
        console.log(`\n--- solving ${solveDirectId} directly with nodeBudget=${nodeBudget}, workBudget=${workBudget}, attemptBudgetTelemetry=true ---`);
        const result = await solveLevel(normalized, {
            timeBudgetMs: 86400000,
            nodeBudget,
            workBudget,
            ablation: { STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: true },
            attemptBudgetTelemetry: true,
        });
        console.log(`ok=${result.ok} status=${result.status} nodesExpanded=${result.nodesExpanded} workSpent=${result.workSpent}`);
        console.log(JSON.stringify(result.attempts.map(a => ({
            stageId: a.stageId, actionKey: a.actionKey, outcome: a.outcome,
            nodesExpanded: a.nodesExpanded, allocatedNodeCeiling: a.allocatedNodeCeiling ?? null,
            allocatedWorkCeiling: a.allocatedWorkCeiling ?? null, workSpent: a.workSpent ?? null,
            mainLoopLateReserve: a.mainLoopLateReserve ?? null, timedOut: a.timedOut ?? null,
        })), null, 1));
    }
}
