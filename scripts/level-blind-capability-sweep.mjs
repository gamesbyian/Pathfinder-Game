#!/usr/bin/env node
/**
 * Level-blind capability sweep.
 *
 * Canonical measurement entrypoint for the level-editor use case. Solver workers receive a
 * mechanics-only copy of each puzzle, with exact-level identity/history stripped before
 * prepareLevelForSolver is called. No baseline, saved hint, prior solution, winning config/gate/
 * seed, solved status, attempt cache, corpus position, provenance, or research metadata can enter
 * Solver.solve().
 *
 * --save-hints is output-only: after a worker finishes a solve, the main process may attach the new
 * valid path/provenance to the original corpus's external hint artifacts. Those artifacts are never
 * supplied to the worker.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseLevelPositions, readLevelCorpusDocumentWithHints } from './level-data-io.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { buildRow } from './portfolio-solve-sweep-lib.mjs';
import { runWorkerPool } from './solver-worker-pool.mjs';
import { canonicalAblationFeatureName, FEATURES } from '../modules/solver/ablation-config.js';
import { REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS } from '../modules/solver/stage-budget.js';
import { stableStringify } from '../modules/canonical-json.mjs';
import { buildCanonicalSolverRequestProjection } from '../modules/solver/solver-request-projection.js';
import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';
import { classifyReproducibilityMode } from '../modules/solver/reproducibility-mode.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [key, ...value] = a.split('=');
    return [key, value.join('=')];
}));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));
const root = new URL('..', import.meta.url).pathname;
const corpusPath = path.resolve(argMap.get('--corpus') || path.join(root, 'data', 'levels.json'));
const outFile = argMap.get('--out') || 'reports/stress/level-blind-capability-sweep.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const budgetMs = Number(argMap.get('--budget-ms') || 86400000);
// --node-budget/--work-budget are per-level STARTING allocations, not hard ceilings: additive
// fallback/retry tiers can spend several times either budget's own value once the main ladder is
// exhausted (measured 1.5x-467x on a sample; see reports/2026-08-28-additive-tier-participation-
// audit.md), unless --strict-total-work-budget is also passed.
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : undefined;
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;
const workers = Math.max(1, Number(argMap.get('--workers') || 1));
const saveHints = flags.has('--save-hints');
const strictTotalWorkBudget = flags.has('--strict-total-work-budget');
const attemptBudgetTelemetry = flags.has('--attempt-budget-telemetry');
const lifecycleTelemetry = flags.has('--lifecycle-telemetry');
const experimentId = argMap.get('--experiment-id') ?? null;
const researchQuestion = argMap.get('--research-question') ?? null;
const preflight = argMap.get('--preflight') ?? null;
const declaredStageOrder = argMap.get('--stage-order')?.split(',').map(value => value.trim()).filter(Boolean) ?? null;
const runStartedAt = new Date().toISOString();
// Current CLI vocabulary is canonical-only; retired phase-6 spellings belong only in historical artifact readers.
const mainSearchLateReserveFraction = argMap.has('--main-search-late-reserve-fraction')
    ? Number(argMap.get('--main-search-late-reserve-fraction')) : undefined;
const mainSearchLateReserveConfigCount = argMap.has('--main-search-late-reserve-config-count')
    ? Number(argMap.get('--main-search-late-reserve-config-count')) : undefined;
const admissibleOrderNodeReserveFraction = argMap.has('--admissible-order-node-reserve-fraction')
    ? Number(argMap.get('--admissible-order-node-reserve-fraction')) : undefined;
// 2026-09-04 (reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md): lets a
// matched sweep reprice admissible-order-alternate-tiebreak-retry's shared fresh work pool (default
// ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION = 1.0x workBudget) down to a smaller,
// percentile-derived fraction without editing modules/solver/orchestration.ts. Same optional/
// omitted-means-production-default shape as the sibling override flags above.
const admissibleOrderNonDefaultRetryBudgetFraction = argMap.has('--admissible-order-non-default-retry-budget-fraction')
    ? Number(argMap.get('--admissible-order-non-default-retry-budget-fraction')) : undefined;
// 2026-08-13 (docs/future-work.md item 4b): lets a matched sweep compare candidate
// EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE/_MIN_SCALE values against the production defaults
// (10, 0.35) without editing modules/solver/orchestration.ts. Same optional/omitted-means-
// production-default shape as the main-search-late-reserve flags above. Only the canonical
// --early-repair-search-adaptive-* spellings are accepted by current producers.
const earlyRepairSearchAdaptiveBadnessGate = argMap.has('--early-repair-search-adaptive-badness-gate')
    ? Number(argMap.get('--early-repair-search-adaptive-badness-gate')) : undefined;
const earlyRepairSearchAdaptiveMinScale = argMap.has('--early-repair-search-adaptive-min-scale')
    ? Number(argMap.get('--early-repair-search-adaptive-min-scale')) : undefined;
// 2026-08-22 (docs/solver-future-work.md's "repair-fallback gate widening" reconciliation): lets a
// matched sweep compare a candidate STRATEGY_REPAIR_LATE_PROBE node cap against the shipped
// REPAIR_LATE_PROBE_NODE_BUDGET default (2,000,000, stage-budget.ts) without editing that constant.
// Same optional/omitted-means-production-default shape as the flags above.
const repairLateProbeNodeBudget = argMap.has('--repair-late-probe-node-budget')
    ? Number(argMap.get('--repair-late-probe-node-budget')) : undefined;
// 2026-09-05 (reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md): lets a
// matched sweep truncate REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS to its first N entries
// (e.g. 6 -> exactly salts 1-6) for the 7-vs-6 seed-count confirmation, without editing
// modules/solver/stage-budget.ts. Same optional/omitted-means-production-default shape as the
// flags above; experiment-only, not a permanent ablation flag.
const repairLateProbeMultiSeedRetrySeedCount = argMap.has('--repair-late-probe-multi-seed-retry-seed-count')
    ? Number(argMap.get('--repair-late-probe-multi-seed-retry-seed-count')) : undefined;

if (admissibleOrderNodeReserveFraction !== undefined &&
    (!Number.isFinite(admissibleOrderNodeReserveFraction) || admissibleOrderNodeReserveFraction < 0 || admissibleOrderNodeReserveFraction > 1)) {
    console.error('--admissible-order-node-reserve-fraction must be between 0 and 1.');
    process.exit(2);
}

if (admissibleOrderNonDefaultRetryBudgetFraction !== undefined &&
    (!Number.isFinite(admissibleOrderNonDefaultRetryBudgetFraction) || admissibleOrderNonDefaultRetryBudgetFraction < 0)) {
    console.error('--admissible-order-non-default-retry-budget-fraction must be >= 0.');
    process.exit(2);
}

if (repairLateProbeMultiSeedRetrySeedCount !== undefined &&
    (!Number.isInteger(repairLateProbeMultiSeedRetrySeedCount) || repairLateProbeMultiSeedRetrySeedCount < 0
        || repairLateProbeMultiSeedRetrySeedCount > REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length)) {
    console.error(`--repair-late-probe-multi-seed-retry-seed-count must be an integer in [0, ${REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length}].`);
    process.exit(2);
}

for (const forbidden of ['--baseline', '--baseline-budget', '--prime-winner', '--prime-include-all', '--priority', '--attempt-cache', '--resume']) {
    if (args.some(a => a === forbidden || a.startsWith(`${forbidden}=`))) {
        console.error(`level-blind-capability-sweep refuses ${forbidden}: exact-level history cannot influence capability solves.`);
        process.exit(2);
    }
}

const enableFlags = argMap.has('--enable-flags')
    ? argMap.get('--enable-flags').split(',').map(s => canonicalAblationFeatureName(s.trim())).filter(Boolean) : [];
const disableFlags = argMap.has('--disable-flags')
    ? argMap.get('--disable-flags').split(',').map(s => canonicalAblationFeatureName(s.trim())).filter(Boolean) : [];
for (const flag of [...enableFlags, ...disableFlags]) {
    if (!(flag in FEATURES)) {
        console.error(`Unknown ablation flag "${flag}" (see modules/solver/ablation-config.ts FEATURES).`);
        process.exit(2);
    }
}
for (const flag of enableFlags) {
    if (disableFlags.includes(flag)) {
        console.error(`Ablation flag "${flag}" cannot be both enabled and disabled.`);
        process.exit(2);
    }
}
const ablation = enableFlags.length || disableFlags.length
    ? Object.fromEntries([...enableFlags.map(f => [f, true]), ...disableFlags.map(f => [f, false])])
    : null;

const parsedCorpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const corpusBytes = readFileSync(corpusPath);
const corpusSha256 = createHash('sha256').update(corpusBytes).digest('hex');
const rawLevels = Array.isArray(parsedCorpus) ? parsedCorpus : parsedCorpus.levels;
if (!Array.isArray(rawLevels)) throw new Error(`${corpusPath}: expected an array or {levels:[...]}`);
const targets = parseLevelPositions(argMap.get('--levels'), { maxLevel: rawLevels.length });
const targetIds = targets.map(position => rawLevels[position - 1]?.id);
if (targetIds.some(id => typeof id !== 'string' || !id)) {
    throw new Error('level-blind capability research requires persistent level ids; array position is selection/debug metadata only');
}
const sampleSha256 = createHash('sha256').update([...targetIds].sort().join('\n')).digest('hex');
const commit = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();

// Explicit allowlist of puzzle mechanics. Deliberately excludes raw `id`, `hints`, designerName,
// description, difficulty, provenance, stressMeta, generator metadata, solution witnesses, and any
// future research field. A new gameplay mechanic must be consciously added here and covered by the
// capability-boundary test; new research metadata is excluded automatically.
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
const mechanicsOnlyCorpus = rawLevels.map(mechanicsOnlyLevel);
const toolDir = path.join(root, '.solver-tools');
mkdirSync(toolDir, { recursive: true });
const solveCorpusPath = path.join(toolDir, `level-blind-corpus-${process.pid}.json`);
writeFileSync(solveCorpusPath, JSON.stringify(mechanicsOnlyCorpus));

// This tool always runs the production scheduler (it has no --scheduler-mode flag); set it
// explicitly rather than relying on solveLevel()'s implicit default so the reported label below
// matches the actually-resolved mode.
const solveOpts = { timeBudgetMs: budgetMs, schedulerMode: 'production' };
if (Number.isFinite(nodeBudget)) solveOpts.nodeBudget = nodeBudget;
if (Number.isFinite(workBudget)) solveOpts.baseWorkBudget = workBudget;
if (strictTotalWorkBudget) solveOpts.strictTotalWorkBudget = true;
if (attemptBudgetTelemetry) solveOpts.attemptBudgetTelemetry = true;
if (lifecycleTelemetry) solveOpts.lifecycleTelemetry = true;
if (Number.isFinite(mainSearchLateReserveFraction)) solveOpts.mainSearchLateReserveFractionOverride = mainSearchLateReserveFraction;
if (Number.isFinite(mainSearchLateReserveConfigCount)) solveOpts.mainSearchLateReserveConfigCountOverride = mainSearchLateReserveConfigCount;
if (Number.isFinite(admissibleOrderNodeReserveFraction)) solveOpts.admissibleOrderNodeReserveFractionOverride = admissibleOrderNodeReserveFraction;
if (Number.isFinite(admissibleOrderNonDefaultRetryBudgetFraction)) solveOpts.admissibleOrderNonDefaultRetryBudgetFractionOverride = admissibleOrderNonDefaultRetryBudgetFraction;
if (Number.isFinite(earlyRepairSearchAdaptiveBadnessGate)) solveOpts.earlyRepairSearchAdaptiveBiasedBadnessGateOverride = earlyRepairSearchAdaptiveBadnessGate;
if (Number.isFinite(earlyRepairSearchAdaptiveMinScale)) solveOpts.earlyRepairSearchAdaptiveBiasedMinScaleOverride = earlyRepairSearchAdaptiveMinScale;
if (Number.isFinite(repairLateProbeNodeBudget)) solveOpts.repairLateProbeNodeBudgetOverride = repairLateProbeNodeBudget;
if (Number.isInteger(repairLateProbeMultiSeedRetrySeedCount)) solveOpts.repairLateProbeMultiSeedRetrySeedCountOverride = repairLateProbeMultiSeedRetrySeedCount;
if (ablation) solveOpts.ablation = ablation;

// Canonical run-wide solver-request identity (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.2), dual-written alongside the legacy effectiveConfig pair below
// rather than replacing it: `effectiveConfig` mixes solver-request semantics with population identity
// (corpusSha256) and execution-protocol context (levelBlind), which the canonical projection
// deliberately keeps separate (level-specific/history-derived and observer-only fields excluded; see
// solver-request-projection.ts's own doc comment). Built from the SAME literal `solveOpts` object
// handed to the solver below, for the same reason effectiveConfig is: proving what actually reached
// the execution boundary, not what argv/CLI intent implied.
const solverRequestProjection = buildCanonicalSolverRequestProjection(solveOpts);
const solverRequestIdentity = solverRequestIdentityFromProjection(solverRequestProjection);

// Execution backend/reproducibility class (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.3/K, modules/solver/reproducibility-mode.mjs). This tool has no
// --race-pool-size flag and never can: every level dispatches through runWorkerPool for cross-LEVEL
// throughput only (parallelizing DIFFERENT levels across worker_threads), never racing multiple
// attempts at the SAME level for a first-success winner, so each individual level's solveLevel() call
// is exactly as deterministic as calling it directly on this thread. `direct` is therefore a real,
// certain fact here, not a guess -- unlike scripts/publish-solver-sweep-result.mjs and friends, which
// consume already-produced reports and genuinely do not know their upstream backend.
const backend = 'direct';
const reproducibilityMode = classifyReproducibilityMode({ schedulerMode: solveOpts.schedulerMode, backend });

// Bounded execution/run binding for hint provenance (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 4/W). No experiment contract object exists in this general-purpose
// producer, so protocolHash/executionArm stay genuinely absent; occurrenceRunId only when this run is
// a real GHA job -- a local invocation has no run to bind to.
const hintExecutionContext = {
    solverRequestIdentity, reproducibilityMode,
    ...(process.env.GITHUB_RUN_ID ? {
        occurrenceRunId: process.env.GITHUB_RUN_ID,
        ...(process.env.GITHUB_RUN_ATTEMPT ? { occurrenceRunAttempt: process.env.GITHUB_RUN_ATTEMPT } : {}),
    } : {}),
};

// Output-side hint state is deliberately distinct from mechanicsOnlyCorpus. Never pass hintLevels
// or corpusPath to the solver worker.
const hintDocument = saveHints ? readLevelCorpusDocumentWithHints(corpusPath) : null;
const hintLevels = hintDocument?.levels ?? null;
const hintCapture = await createHintCapture({ solverVersion: commit, budgetMs, enabled: saveHints, executionContext: hintExecutionContext });
if (saveHints) await hintCapture.prepare(targets.map(n => hintLevels[n - 1]));

// Effective-configuration contract (2026-09-09 historical regression-risk audit item #2): a
// workflow-dispatch input or CLI flag represents INTENT, not proof of what reached the solver.
// effectiveConfig/effectiveConfigDigest are computed from `solveOpts` itself -- the literal object
// this run hands to the solver, at the actual execution boundary -- not re-derived from argv, so a
// bug that causes solveOpts to diverge from the CLI's apparent intent (a dropped override, a
// resolved default that silently changed) still shows up here. `corpusSha256` is folded in because
// the puzzle population is as much a part of "what ran" as the solver flags. Deliberately excludes
// `workers` (parallelism only, not solve semantics) and `attemptBudgetTelemetry`/`lifecycleTelemetry`
// (diagnostic-only, add fields to results without changing the solve). scripts/check-effective-
// config-agreement.mjs consumes this to verify shard agreement within one arm and prespecified-
// dimension-only differences between a control/treatment pair.
const {
    attemptBudgetTelemetry: _attemptBudgetTelemetry,
    lifecycleTelemetry: _lifecycleTelemetry,
    ...semanticSolveOpts
} = solveOpts;
const effectiveConfig = { corpusSha256, levelBlind: true, ...semanticSolveOpts };
const effectiveConfigDigest = createHash('sha256').update(stableStringify(effectiveConfig)).digest('hex');

const rows = new Map();
let hintChanges = 0;
function writeReport() {
    const levels = [...rows.values()].sort((a, b) => a.level - b.level);
    const solved = levels.filter(r => r.ok).length;
    const summary = {
        generatedAt: new Date().toISOString(), commit,
        corpus: path.relative(root, corpusPath), corpusSha256, sampleSha256, expectedIds: targetIds,
        schedulerMode: 'production', levelBlind: true,
        solverInputFields: PUZZLE_FIELDS, historicalInputs: [], budgetMs,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        workBudget: Number.isFinite(workBudget) ? workBudget : null,
        workers, enableFlags, disableFlags, strictTotalWorkBudget, attemptBudgetTelemetry, lifecycleTelemetry,
        failureInformationTelemetry: 'compact-v1', runStartedAt,
        experimentId, researchQuestion, preflight, declaredStageOrder,
        mainSearchLateReserveFraction: Number.isFinite(mainSearchLateReserveFraction) ? mainSearchLateReserveFraction : null,
        mainSearchLateReserveConfigCount: Number.isFinite(mainSearchLateReserveConfigCount) ? mainSearchLateReserveConfigCount : null,
        admissibleOrderNodeReserveFraction: Number.isFinite(admissibleOrderNodeReserveFraction) ? admissibleOrderNodeReserveFraction : null,
        admissibleOrderNonDefaultRetryBudgetFraction: Number.isFinite(admissibleOrderNonDefaultRetryBudgetFraction)
            ? admissibleOrderNonDefaultRetryBudgetFraction : null,
        earlyRepairSearchAdaptiveBadnessGate: Number.isFinite(earlyRepairSearchAdaptiveBadnessGate) ? earlyRepairSearchAdaptiveBadnessGate : null,
        earlyRepairSearchAdaptiveMinScale: Number.isFinite(earlyRepairSearchAdaptiveMinScale) ? earlyRepairSearchAdaptiveMinScale : null,
        repairLateProbeNodeBudget: Number.isFinite(repairLateProbeNodeBudget) ? repairLateProbeNodeBudget : null,
        repairLateProbeMultiSeedRetrySeedCount: Number.isInteger(repairLateProbeMultiSeedRetrySeedCount)
            ? repairLateProbeMultiSeedRetrySeedCount : null,
        levelsRequested: targets.length, levelsRun: levels.length, solvedCount: solved,
        unsolvedCount: levels.length - solved, saveHints, hintChanges,
        artifactCompletedAt: new Date().toISOString(),
        effectiveConfig, effectiveConfigDigest,
        solverRequestProjection, solverRequestIdentity,
        backend, reproducibilityMode,
    };
    mkdirSync(path.dirname(outFile), { recursive: true });
    const artifact = JSON.stringify({ summary, levels }, null, 2) + '\n';
    writeFileSync(outFile, artifact);
    writeFileSync(`${outFile}.sha256`, `${createHash('sha256').update(artifact).digest('hex')}  ${path.basename(outFile)}\n`);
    mkdirSync(path.dirname(summaryOutFile), { recursive: true });
    writeFileSync(summaryOutFile, [
        '# Level-blind capability sweep', '',
        `Commit: ${commit}`,
        `Corpus: ${summary.corpus}`,
        'Level-blind: yes (mechanics-only input; no identity/history/hints/baseline)',
        `Budget: ${budgetMs}ms; nodes=${summary.nodeBudget ?? '(none)'}; work=${summary.workBudget ?? '(none)'}`,
        `Strict total work ceiling: ${strictTotalWorkBudget ? 'yes (experiment only)' : 'no (legacy additive-pass semantics)'}`,
        `Workers: ${workers}`,
        `Flags: enable=${enableFlags.join(',') || '(none)'} disable=${disableFlags.join(',') || '(none)'}`,
        `Admissible-order node reserve fraction: ${summary.admissibleOrderNodeReserveFraction ?? '(production default)'}`,
        `Admissible-order non-default retry budget fraction: ${summary.admissibleOrderNonDefaultRetryBudgetFraction ?? '(production default)'}`,
        `Completed: ${levels.length}/${targets.length}`,
        `Solved: ${solved}/${levels.length}`,
        `Hints saved: ${saveHints ? `yes (${hintChanges} write event(s))` : 'no'}`,
        '',
    ].join('\n'));
}

writeReport();
const workerScript = path.join(root, 'scripts', 'level-blind-capability-worker.mjs');
const tasks = targets.map(levelNumber => ({ solveCorpusPath, levelIndex: levelNumber - 1, solveOpts }));
let completed = 0;
try {
    await runWorkerPool({
        workerScript, tasks, concurrency: workers,
        onResult: (index, workerResult) => {
            const levelNumber = targets[index];
            const original = rawLevels[levelNumber - 1];
            const result = workerResult.result;
            const row = buildRow(levelNumber, original?.id ?? null, result, 'production');
            if (workerResult.failureInformation) row.failureInformation = workerResult.failureInformation;
            const lateRepair = row.stageLifecycle?.['late-repair-search'];
            const lateMustTurn = row.stageLifecycle?.['late-repair-must-turn-biased-retry'];
            const lateRepairParticipated = lateRepair?.reached === true
                && (Number(lateRepair.actualWork ?? 0) > 0 || Number(lateRepair.actualNodes ?? 0) > 0);
            row.class2ControlEligibility = {
                hasMustTurn: workerResult.researchFeatures?.hasMustTurn === true,
                ordinaryLateRepairParticipated: lateRepairParticipated,
                childStructuralEligible: lateMustTurn?.mechanicallyEligible === true,
                childInsertionPointReached: lateRepairParticipated
                    && !row.attempts.some(attempt => attempt.stageId === 'late-repair-search' && attempt.ok === true),
            };
            if (saveHints) {
                row.hintAppended = hintCapture.record(hintLevels[levelNumber - 1], result);
                if (row.hintAppended) {
                    const flush = hintCapture.flush(corpusPath, hintDocument);
                    hintChanges += flush.hintFilesChanged;
                }
            }
            rows.set(levelNumber, row);
            completed += 1;
            // refereeValid is a separate post-hoc replay check (Solver.validateCandidatePath), not
            // a gate on row.ok -- print it alongside SOLVED so a claimed solve's referee validity is
            // visible in the console log too, not only in the JSON artifact (which some sandboxed
            // environments cannot download).
            const solvedSuffix = row.ok ? ` refereeValid=${row.refereeValid}` : '';
            console.log(`[${completed}/${targets.length}] ${row.id ?? `L${levelNumber}`} ${row.ok ? 'SOLVED' : row.status}${solvedSuffix}`);
            writeReport();
        },
    });
} finally {
    rmSync(solveCorpusPath, { force: true });
}

writeReport();
const finalRows = [...rows.values()];
const solved = finalRows.filter(r => r.ok).length;
console.log(`Result: solved=${solved}/${finalRows.length}; requested=${targets.length}; levelBlind=true`);
if (finalRows.length !== targets.length) process.exitCode = 3;
