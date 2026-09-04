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
import { readLevelsWithHints } from './level-data-io.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { buildRow } from './portfolio-solve-sweep-lib.mjs';
import { runWorkerPool } from './solver-worker-pool.mjs';
import { canonicalAblationFeatureName, FEATURES } from '../modules/solver/ablation-config.js';

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
const runStartedAt = new Date().toISOString();
// --main-search-late-reserve-* is canonical; --main-loop-late-reserve-* is accepted as a legacy
// alias for one migration window (naming-cleanup-ledger.json), same dual-read shape as the
// SolveOpts override fields these flags feed.
const mainSearchLateReserveFraction = argMap.has('--main-search-late-reserve-fraction')
    ? Number(argMap.get('--main-search-late-reserve-fraction'))
    : argMap.has('--main-loop-late-reserve-fraction') ? Number(argMap.get('--main-loop-late-reserve-fraction')) : undefined;
const mainSearchLateReserveConfigCount = argMap.has('--main-search-late-reserve-config-count')
    ? Number(argMap.get('--main-search-late-reserve-config-count'))
    : argMap.has('--main-loop-late-reserve-config-count') ? Number(argMap.get('--main-loop-late-reserve-config-count')) : undefined;
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
// production-default shape as the main-search-late-reserve flags above. --early-repair-search-
// adaptive-* is canonical; --repair-probe-adaptive-* is accepted as a legacy alias.
const earlyRepairSearchAdaptiveBadnessGate = argMap.has('--early-repair-search-adaptive-badness-gate')
    ? Number(argMap.get('--early-repair-search-adaptive-badness-gate'))
    : argMap.has('--repair-probe-adaptive-badness-gate') ? Number(argMap.get('--repair-probe-adaptive-badness-gate')) : undefined;
const earlyRepairSearchAdaptiveMinScale = argMap.has('--early-repair-search-adaptive-min-scale')
    ? Number(argMap.get('--early-repair-search-adaptive-min-scale'))
    : argMap.has('--repair-probe-adaptive-min-scale') ? Number(argMap.get('--repair-probe-adaptive-min-scale')) : undefined;
// 2026-08-22 (docs/solver-future-work.md's "repair-fallback gate widening" reconciliation): lets a
// matched sweep compare a candidate STRATEGY_REPAIR_LATE_PROBE node cap against the shipped
// REPAIR_LATE_PROBE_NODE_BUDGET default (2,000,000, stage-budget.ts) without editing that constant.
// Same optional/omitted-means-production-default shape as the flags above.
const repairLateProbeNodeBudget = argMap.has('--repair-late-probe-node-budget')
    ? Number(argMap.get('--repair-late-probe-node-budget')) : undefined;

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

function parseLevelSpec(spec, total) {
    if (!spec) return Array.from({ length: total }, (_, i) => i + 1);
    const normalized = spec.startsWith('pos:') ? spec.slice(4) : spec;
    const selected = new Set();
    for (const token of normalized.split(',').map(s => s.trim()).filter(Boolean)) {
        const range = token.match(/^(\d+)-(\d+)$/u);
        if (range) {
            const a = Number(range[1]), b = Number(range[2]);
            for (let n = Math.min(a, b); n <= Math.max(a, b); n++) selected.add(n);
        } else if (/^\d+$/u.test(token)) selected.add(Number(token));
        else throw new Error(`Cannot parse --levels token "${token}".`);
    }
    return [...selected].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
}

const parsedCorpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const corpusBytes = readFileSync(corpusPath);
const corpusSha256 = createHash('sha256').update(corpusBytes).digest('hex');
const rawLevels = Array.isArray(parsedCorpus) ? parsedCorpus : parsedCorpus.levels;
if (!Array.isArray(rawLevels)) throw new Error(`${corpusPath}: expected an array or {levels:[...]}`);
const targets = parseLevelSpec(argMap.get('--levels'), rawLevels.length);
const sampleSha256 = createHash('sha256').update(targets.join('\n')).digest('hex');
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
if (Number.isFinite(workBudget)) solveOpts.workBudget = workBudget;
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
if (ablation) solveOpts.ablation = ablation;

// Output-side hint state is deliberately distinct from mechanicsOnlyCorpus. Never pass hintLevels
// or corpusPath to the solver worker.
const hintLevels = saveHints ? readLevelsWithHints(corpusPath) : null;
const hintCapture = await createHintCapture({ solverVersion: commit, budgetMs, enabled: saveHints });
if (saveHints) await hintCapture.prepare(targets.map(n => hintLevels[n - 1]));

const rows = new Map();
let hintChanges = 0;
function writeReport() {
    const levels = [...rows.values()].sort((a, b) => a.level - b.level);
    const solved = levels.filter(r => r.ok).length;
    const summary = {
        generatedAt: new Date().toISOString(), commit,
        corpus: path.relative(root, corpusPath), corpusSha256, sampleSha256,
        schedulerMode: 'production', levelBlind: true,
        solverInputFields: PUZZLE_FIELDS, historicalInputs: [], budgetMs,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        workBudget: Number.isFinite(workBudget) ? workBudget : null,
        workers, enableFlags, disableFlags, strictTotalWorkBudget, attemptBudgetTelemetry, lifecycleTelemetry, runStartedAt,
        mainSearchLateReserveFraction: Number.isFinite(mainSearchLateReserveFraction) ? mainSearchLateReserveFraction : null,
        mainSearchLateReserveConfigCount: Number.isFinite(mainSearchLateReserveConfigCount) ? mainSearchLateReserveConfigCount : null,
        admissibleOrderNodeReserveFraction: Number.isFinite(admissibleOrderNodeReserveFraction) ? admissibleOrderNodeReserveFraction : null,
        earlyRepairSearchAdaptiveBadnessGate: Number.isFinite(earlyRepairSearchAdaptiveBadnessGate) ? earlyRepairSearchAdaptiveBadnessGate : null,
        earlyRepairSearchAdaptiveMinScale: Number.isFinite(earlyRepairSearchAdaptiveMinScale) ? earlyRepairSearchAdaptiveMinScale : null,
        repairLateProbeNodeBudget: Number.isFinite(repairLateProbeNodeBudget) ? repairLateProbeNodeBudget : null,
        levelsRequested: targets.length, levelsRun: levels.length, solvedCount: solved,
        unsolvedCount: levels.length - solved, saveHints, hintChanges,
        artifactCompletedAt: new Date().toISOString(),
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
            if (saveHints) {
                row.hintAppended = hintCapture.record(hintLevels[levelNumber - 1], result);
                if (row.hintAppended) {
                    const flush = hintCapture.flush(corpusPath, hintLevels);
                    hintChanges += flush.hintFilesChanged;
                }
            }
            rows.set(levelNumber, row);
            completed += 1;
            console.log(`[${completed}/${targets.length}] ${row.id ?? `L${levelNumber}`} ${row.ok ? 'SOLVED' : row.status}`);
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
