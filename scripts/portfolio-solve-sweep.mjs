#!/usr/bin/env node
/**
 * Solve-only sweep across a level range — no paired legacy comparison call — used for probing
 * currently-unsolved stress-corpus levels, where the paired-comparison sibling tool
 * (scripts/portfolio-scheduler-report.mjs) would double the cost for no benefit (see
 * docs/fast-portfolio-scheduler-plan.md / reports/portfolio/portfolio-scheduler-decision.md).
 *
 * Two use cases, both supported by the same script:
 *  1. Probing the portfolio-scheduler idea itself (`--scheduler-mode=portfolio-experiment`,
 *     the default): `solvedBeforeFallback: true` means a portfolio pass (1/2/3/conditional)
 *     found the solution — i.e. something other than a plain full-budget legacy-equivalent
 *     search. `solvedBeforeFallback: false` with `ok: true` means only the embedded fallback
 *     phase (a fresh full-budget legacy-equivalent solve) found it, not a portfolio-specific
 *     result.
 *  2. General fast batch testing of a NEW solver feature/heuristic against the unsolved corpora
 *     (`--scheduler-mode=legacy`): the portfolio scheduler is not itself a speed mechanism (see
 *     docs/solver-architecture.md's verdict — every measured variant is slower than legacy), so
 *     for this use case prefer plain legacy mode plus the cost knobs below, rather than the
 *     portfolio tiers.
 *
 * Cost knobs (see docs/solver-architecture.md's cost-gotcha note — an earlier run took ~21
 * minutes on one repair-gated level before these existed):
 *   --node-budget=<n>            deterministic, machine-speed-independent cap (SolveOpts.nodeBudget).
 *   --repair-budget-fraction=<n> overrides REPAIR_EXTRA_BUDGET_FRACTION (default 6x) via
 *                                 SolveOpts.repairBudgetFractionOverride — a dedicated field, NOT
 *                                 an ablation flag (an earlier version of this was, and it
 *                                 silently disabled every other unset strategy toggle by making
 *                                 the ablation config object truthy — see orchestration.ts's field
 *                                 comment). Legacy-path only (plain legacy mode, portfolio's
 *                                 embedded fallback, and --race-pool-size below).
 *   --attraction-diversity-budget-fraction=<n> overrides ATTRACTION_DIVERSITY_BUDGET_FRACTION
 *                                 (default 1.0x, the 2026-07-16 fragile-group last-resort pass)
 *                                 via SolveOpts.attractionDiversityBudgetFractionOverride — a
 *                                 SEPARATE dedicated field from --repair-budget-fraction above
 *                                 (the two extensions are independently costed and independently
 *                                 overridable; see orchestration.ts's SolveOpts comment on why).
 *                                 Pass 0 here for an ordinary batch-testing sweep of an unrelated
 *                                 solver change — otherwise every still-unsolved level in the run
 *                                 silently costs up to 1x budgetMs more than before this pass
 *                                 existed, with no signal that it happened. Same legacy-path-only
 *                                 scope as --repair-budget-fraction (works with --race-pool-size).
 *
 * Batch-scale knobs, for recurring solver-feature iteration against the unsolved corpora:
 *   --resume [--checkpoint=<path>]     append each level's result to a JSONL checkpoint as it
 *                                       completes (default <out>.checkpoint.jsonl); on the next
 *                                       run with --resume, already-checkpointed levels are loaded
 *                                       from disk instead of re-solved. Survives Ctrl-C / kill.
 *   --feature-filter=<tokens>          only run levels whose features match, e.g.
 *                                       "mustCross>=2,mustPass>=3" (supported keys: reqLen,
 *                                       reqInt, gates, mustPass, mustCross, mustTurn, portals,
 *                                       filters, flippingFilters; ops >=,<=,>,<,==). Scope a
 *                                       change's test population to levels it can plausibly
 *                                       affect instead of the whole unsolved corpus.
 *   --baseline=<compiled-baseline.json> a corpus's compiled baseline (logs/stress-corpus{1,2}-
 *                                       baseline.json, or reports/stress/dev-benchmark-corpus2.json)
 *                                       — enables --priority and --attempt-cache below.
 *   --priority=<field> [--priority-order=asc|desc]
 *                                       sort the run order by a numeric baseline field (e.g.
 *                                       `badness`) or the special field `stability` (rank:
 *                                       budget-edge before known-unsolved). Default asc = closest-
 *                                       to-solved first, for fast positive/negative signal before
 *                                       spending time on deeply-unsolved levels. Requires --baseline.
 *   --workers=<n>                      solve across N child processes in parallel (real OS
 *                                       parallelism, not just concurrent promises) instead of
 *                                       one level at a time. Hint-saving still happens only in
 *                                       this main process, so concurrent workers never race on
 *                                       the hint corpus files.
 *   --race-pool-size=<n>                ALSO race each level's own attempt ladder across N
 *                                       worker_threads (scripts/solver-parallel/race.mjs's
 *                                       createRacePool — the same pool stress:benchmark:raced
 *                                       uses) — composes with --workers: each cross-level worker
 *                                       process gets its own persistent race pool of this size,
 *                                       reused across every level that worker solves, so total
 *                                       OS-level parallelism is workers x race-pool-size (logged
 *                                       at startup, with a warning if it exceeds the machine's
 *                                       core count). Requires --scheduler-mode=legacy (race.mjs
 *                                       races the plain attempt ladder, no portfolio-experiment
 *                                       tier equivalent). Not combinable with --node-budget (the
 *                                       race pool has no node-budget concept — concurrent jobs on
 *                                       separate cores, not one sequential counter);
 *                                       --repair-budget-fraction IS honored under racing.
 *   --attempt-cache=<path>             skip re-solving a level the baseline already recorded as
 *                                       unsolved, IF every attempt family relevant to that level
 *                                       (per the CURRENT code's own attempt policy) has an
 *                                       unchanged dependency-file hash since the cache was last
 *                                       written (scripts/solver-attempt-family-cache.mjs) — e.g.
 *                                       editing only repair-search.ts leaves every level whose
 *                                       policy never reaches the repair family skippable. Only
 *                                       ever reuses a NEGATIVE (still-unsolved) result — never
 *                                       fabricates a solve. Requires --baseline.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/stress-levels-random.json --levels=pos:1-1700 --scheduler-mode=legacy --budget-ms=15000 --repair-budget-fraction=1.5 --node-budget=4000000 --workers=8 --resume --baseline=logs/stress-corpus2-baseline.json --priority=badness --attempt-cache=reports/portfolio/attempt-family-cache.json --out=reports/portfolio/corpus2-sweep.json --summary-out=reports/portfolio/corpus2-sweep-summary.md --save-hints
 *
 * --save-hints persists every solved level's path into the corpus's hint corpus (data/stress/hints{,-random}/<id>.json)
 * with a proper HintProvenanceEntry, via the same modules/solver/hint-provenance.ts + scripts/level-data-io.mjs
 * machinery scripts/hint-workbench.mjs uses — so a solve found here is a real discovery event, not a
 * throwaway report row. Omit it for a dry-run report only.
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { PORTFOLIO_EXPERIMENT } from '../data/config/portfolio-experiment.js';
import { readLevelsWithHints, writeLevelsWithHints, parseLevelPositions } from './level-data-io.mjs';
import { buildRow, tallyPass, serializePortfolioExperiment } from './portfolio-solve-sweep-lib.mjs';
import { runWorkerPool, defaultConcurrency } from './solver-worker-pool.mjs';
import { createRacePool } from './solver-parallel/race.mjs';
import {
    computeCurrentFamilyHashes, loadFamilyCache, saveFamilyCache, relevantFamiliesFor, familiesUnchanged,
} from './solver-attempt-family-cache.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const root = new URL('..', import.meta.url).pathname;
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const outFile = argMap.get('--out') || 'reports/portfolio/solve-sweep.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const corpusPath = argMap.get('--corpus') || path.join(root, 'data', 'levels.json');
const saveHints = flags.has('--save-hints');
const schedulerMode = argMap.get('--scheduler-mode') === 'legacy' ? 'legacy' : 'portfolio-experiment';
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : undefined;
const repairBudgetFraction = argMap.has('--repair-budget-fraction') ? Number(argMap.get('--repair-budget-fraction')) : undefined;
const attractionDiversityBudgetFraction = argMap.has('--attraction-diversity-budget-fraction') ? Number(argMap.get('--attraction-diversity-budget-fraction')) : undefined;
const resume = flags.has('--resume');
const checkpointPath = argMap.get('--checkpoint') || `${outFile}.checkpoint.jsonl`;
const featureFilterSpec = argMap.get('--feature-filter') || null;
const baselinePath = argMap.get('--baseline') || null;
const priorityField = argMap.get('--priority') || null;
const priorityOrder = argMap.get('--priority-order') === 'desc' ? 'desc' : 'asc';
const workerCount = argMap.has('--workers') ? Math.max(1, Number(argMap.get('--workers')) || 1) : 1;
const attemptCachePath = argMap.get('--attempt-cache') || null;
let racePoolSize = argMap.has('--race-pool-size') ? Math.max(1, Number(argMap.get('--race-pool-size')) || 1) : 0;
if (racePoolSize > 0 && schedulerMode !== 'legacy') {
    console.error('--race-pool-size requires --scheduler-mode=legacy (scripts/solver-parallel/race.mjs has no portfolio-experiment equivalent — its pool races the plain attempt ladder). Ignoring --race-pool-size.');
    racePoolSize = 0;
}
if (racePoolSize > 0 && Number.isFinite(nodeBudget)) {
    console.error('--node-budget is not enforced by the race pool (scripts/solver-parallel/race.mjs has no node-budget concept — concurrent jobs on separate cores, not a single sequential node counter). It will be ignored for raced solves.');
}

function csvSet(value, fallback) {
    if (!value) return new Set(fallback);
    return new Set(value.split(',').map(s => s.trim()).filter(Boolean));
}

function experimentFromArgs() {
    return {
        pass1Ms: Number(argMap.get('--pass1-ms') || PORTFOLIO_EXPERIMENT.pass1Ms),
        pass2Ms: Number(argMap.get('--pass2-ms') || PORTFOLIO_EXPERIMENT.pass2Ms),
        pass3Ms: Number(argMap.get('--pass3-ms') || PORTFOLIO_EXPERIMENT.pass3Ms),
        pass2Configs: csvSet(argMap.get('--pass2-configs'), PORTFOLIO_EXPERIMENT.pass2Configs),
        pass3Configs: csvSet(argMap.get('--pass3-configs'), PORTFOLIO_EXPERIMENT.pass3Configs),
        conditionalPasses: PORTFOLIO_EXPERIMENT.conditionalPasses,
    };
}

function levelFeatureSummary(level) {
    return {
        reqLen: level.reqLen ?? 0,
        reqInt: level.reqInt ?? 0,
        gates: level.gateKeys?.length ?? 0,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
        portals: level.portalMap?.size ?? 0,
        filters: level.filterMap?.size ?? 0,
        flippingFilters: level.flippingFilterMap?.size ?? 0,
    };
}

const FILTER_OPS = {
    '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '==': (a, b) => a === b, '>': (a, b) => a > b, '<': (a, b) => a < b,
};
function parseFeatureFilter(spec) {
    if (!spec) return [];
    return spec.split(',').map(tok => tok.trim()).filter(Boolean).map(tok => {
        const m = tok.match(/^(\w+)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/u);
        if (!m) throw new Error(`--feature-filter: cannot parse token "${tok}" (expected e.g. mustCross>=2)`);
        return { key: m[1], op: m[2], value: Number(m[3]) };
    });
}
function matchesFeatureFilter(features, tokens) {
    return tokens.every(({ key, op, value }) => FILTER_OPS[op](Number(features[key] ?? 0), value));
}

function loadBaselineMap(baseline) {
    if (!baseline) return null;
    const parsed = JSON.parse(readFileSync(baseline, 'utf8'));
    const records = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(records)) throw new Error(`--baseline: ${baseline} has no levels array`);
    const map = new Map();
    for (const record of records) if (record?.id) map.set(record.id, record);
    return map;
}
function isBaselineUnsolved(record) {
    if (!record) return false;
    if (typeof record.ok === 'boolean') return record.ok === false;
    return typeof record.status === 'string' && record.status !== 'success';
}
const STABILITY_RANK = { 'budget-edge': 0, 'known-unsolved': 1 };
function priorityValue(record, field) {
    if (!record) return Infinity;
    if (field === 'stability') return STABILITY_RANK[record.stability] ?? 2;
    const v = Number(record[field]);
    return Number.isFinite(v) ? v : Infinity;
}

function readCheckpoint(checkpointFile) {
    const rows = new Map();
    if (!existsSync(checkpointFile)) return rows;
    const text = readFileSync(checkpointFile, 'utf8');
    for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        try {
            const row = JSON.parse(t);
            if (Number.isFinite(row.level)) rows.set(row.level, row);
        } catch { /* skip a malformed/truncated last line from an interrupted run */ }
    }
    return rows;
}
function appendCheckpoint(checkpointFile, row) {
    mkdirSync(path.dirname(checkpointFile), { recursive: true });
    appendFileSync(checkpointFile, `${JSON.stringify(row)}\n`);
}

installBrowserStubs();
const { createSolver } = await import('../modules/Solver.js');
const { provenanceFromSolveResult } = await import('../modules/solver/hint-provenance.js');
const { toHint, mergeHints, hintPaths } = await import('../modules/domain/hint-types.js');
const { getConfiguredAttemptConfigs } = await import('../modules/solver/attempts.js');
const Solver = createSolver();
// readLevelsWithHints attaches .hints/.hintRecords per level from the on-disk hint artifact
// (harmless when --save-hints is unset — we just don't write anything back).
const rawLevels = readLevelsWithHints(corpusPath);
const levelFilter = parseLevelPositions(argMap.get('--levels'));
let targets = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);
const commit = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();
const portfolioExperiment = experimentFromArgs();

const solveOpts = { timeBudgetMs: budgetMs, schedulerMode };
if (schedulerMode === 'portfolio-experiment') solveOpts.portfolioExperiment = portfolioExperiment;
if (Number.isFinite(nodeBudget)) solveOpts.nodeBudget = nodeBudget;
if (Number.isFinite(repairBudgetFraction)) solveOpts.repairBudgetFractionOverride = repairBudgetFraction;
if (Number.isFinite(attractionDiversityBudgetFraction)) solveOpts.attractionDiversityBudgetFractionOverride = attractionDiversityBudgetFraction;

const featureFilterTokens = parseFeatureFilter(featureFilterSpec);
const baselineMap = loadBaselineMap(baselinePath);
if ((priorityField || attemptCachePath) && !baselineMap) {
    console.error('--priority and --attempt-cache require --baseline; ignoring both.');
}

// Prepared-level cache for the pre-pipeline (feature-filter / attempt-cache family check) — the
// worker pool re-prepares independently in its own process, this is only for the main process's
// own filtering/ordering decisions before dispatch.
const preparedCache = new Map();
function getPrepared(levelNumber) {
    let level = preparedCache.get(levelNumber);
    if (!level) {
        level = Solver.prepareLevelForSolver(rawLevels[levelNumber - 1], { source: 'raw', levelNumber });
        preparedCache.set(levelNumber, level);
    }
    return level;
}

/** Mirrors scripts/stress/benchmark.mjs's referee check: the solver intentionally ignores
 *  geese/false goals (MoveContext.SOLVER), so a solved-but-not-refereeValid path on a
 *  hazard-padded level is a real finding, not a bug — badness/stability tooling downstream
 *  (rank-levels.mjs, classify-stability.mjs) needs this to not miscount such a level as solved.
 *  Mutates result.refereeValid in place so it flows into buildRow() without extra plumbing. */
function attachRefereeValid(levelNumber, result) {
    if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
        result.refereeValid = Solver.validateCandidatePath(getPrepared(levelNumber), result.solution).ok;
    }
    return result;
}

if (featureFilterTokens.length > 0) {
    const before = targets.length;
    targets = targets.filter(n => matchesFeatureFilter(levelFeatureSummary(getPrepared(n)), featureFilterTokens));
    console.log(`--feature-filter=${featureFilterSpec}: ${targets.length}/${before} levels match.`);
}

// --resume: split into already-checkpointed (loaded, not re-solved) vs still to do.
const checkpointRows = resume ? readCheckpoint(checkpointPath) : new Map();
const toRun = targets.filter(n => !checkpointRows.has(n));
const skippedByResume = targets.length - toRun.length;
if (resume && skippedByResume > 0) console.log(`--resume: ${skippedByResume} level(s) already checkpointed in ${checkpointPath}, skipping.`);

if (priorityField && baselineMap) {
    toRun.sort((a, b) => {
        const ra = baselineMap.get(rawLevels[a - 1]?.id);
        const rb = baselineMap.get(rawLevels[b - 1]?.id);
        const va = priorityValue(ra, priorityField);
        const vb = priorityValue(rb, priorityField);
        return priorityOrder === 'desc' ? vb - va : va - vb;
    });
    console.log(`--priority=${priorityField} (${priorityOrder}): run order re-sorted.`);
}

// --attempt-cache: skip levels the baseline says are unsolved, when every relevant attempt
// family's dependency hash is unchanged since the cache was last written. Only ever reuses a
// NEGATIVE (still-unsolved) baseline result.
const cachedSkipRows = [];
let toActuallyRun = toRun;
let attemptCacheHashes = null;
let attemptCachePrevious = null;
if (attemptCachePath && baselineMap) {
    attemptCacheHashes = computeCurrentFamilyHashes();
    attemptCachePrevious = loadFamilyCache(attemptCachePath);
    const stillToRun = [];
    for (const levelNumber of toRun) {
        const raw = rawLevels[levelNumber - 1];
        const record = baselineMap.get(raw?.id);
        if (!isBaselineUnsolved(record)) { stillToRun.push(levelNumber); continue; }
        const families = relevantFamiliesFor(getPrepared(levelNumber), getConfiguredAttemptConfigs);
        if (familiesUnchanged(families, attemptCachePrevious, attemptCacheHashes)) {
            const row = buildRow(levelNumber, raw?.id, { ok: false, status: 'cached-unsolved' }, schedulerMode);
            row.skippedCached = true;
            cachedSkipRows.push(row);
        } else {
            stillToRun.push(levelNumber);
        }
    }
    toActuallyRun = stillToRun;
    if (cachedSkipRows.length > 0) {
        console.log(`--attempt-cache: ${cachedSkipRows.length}/${toRun.length} level(s) skipped (baseline unsolved + no relevant code change since last cache write).`);
    }
}

function mergeSolvedHint(raw, result) {
    if (!saveHints || !result.ok || !Array.isArray(result.solution) || result.solution.length === 0) return false;
    const provenance = provenanceFromSolveResult(result, { solverVersion: commit, budgetMs, usedExistingHints: false, randomSeed: null, levelRevision: null });
    const before = (raw.hintRecords ?? []).length;
    raw.hintRecords = mergeHints(raw.hintRecords ?? [], [toHint(result.solution, [provenance])]);
    raw.hints = hintPaths(raw.hintRecords);
    return raw.hintRecords.length !== before || (raw.hintRecords.find(h => h.path.join(',') === result.solution.join(','))?.provenance.length ?? 0) > 1;
}

const levelRows = new Map();
for (const row of checkpointRows.values()) levelRows.set(row.level, row);
for (const row of cachedSkipRows) levelRows.set(row.level, row);
let hintsAppended = 0;
let totalHintFilesChanged = 0;
let solvedCount = 0;
let solvedBeforeFallbackCount = 0;
let fallbackOnlyCount = 0;
let unsolvedCount = 0;
let processedForConsole = 0;
const passCounts = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, legacy: 0, unsolved: 0 };

function recordRow(row, { fromCheckpointOrCache = false } = {}) {
    levelRows.set(row.level, row);
    if (row.ok) solvedCount += 1;
    if (row.solvedBeforeFallback) solvedBeforeFallbackCount += 1;
    if (row.solvedByFallback) fallbackOnlyCount += 1;
    if (!row.ok) unsolvedCount += 1;
    tallyPass(passCounts, row, schedulerMode);
    if (!fromCheckpointOrCache && resume) appendCheckpoint(checkpointPath, row);
}
// Pre-existing checkpoint/cache rows already reflect a completed (or safely-skipped) outcome —
// tally them but never re-append to the checkpoint file (idempotent resume).
for (const row of checkpointRows.values()) recordRow(row, { fromCheckpointOrCache: true });
for (const row of cachedSkipRows) recordRow(row, { fromCheckpointOrCache: true });

const effectiveParallelism = workerCount * Math.max(1, racePoolSize);
const cpuCount = os.cpus().length;
console.log(`portfolio-solve-sweep: corpus=${path.relative(root, corpusPath)} levels=${targets.length} (${toActuallyRun.length} to solve) scheduler-mode=${schedulerMode} budget=${budgetMs}ms${Number.isFinite(nodeBudget) ? ` node-budget=${nodeBudget}` : ''}${Number.isFinite(repairBudgetFraction) ? ` repair-budget-fraction=${repairBudgetFraction}` : ''}${Number.isFinite(attractionDiversityBudgetFraction) ? ` attraction-diversity-budget-fraction=${attractionDiversityBudgetFraction}` : ''} workers=${workerCount}${racePoolSize > 0 ? ` race-pool-size=${racePoolSize} (${workerCount} x ${racePoolSize} = ${effectiveParallelism} concurrent OS-level units)` : ''} save-hints=${saveHints}`);
if (effectiveParallelism > cpuCount) {
    console.error(`  !! effective parallelism (${effectiveParallelism}) exceeds this machine's ${cpuCount} cores — expect contention, not a ${effectiveParallelism}x speedup.`);
}

function logProgress(row) {
    processedForConsole += 1;
    console.log(`  [${processedForConsole}/${toActuallyRun.length}] L${row.level}${row.id ? ` (${row.id})` : ''} ok=${row.ok ? '✓' : '✗'}${row.phaseLabel ? ` ${row.phaseLabel}` : ''}${row.solvedBeforeFallback ? ' <-- PORTFOLIO FIND' : ''}${row.hintAppended ? ' [hint saved]' : ''}`);
}

// Persist hints to disk after EVERY level, not just once at the very end -- a long-running sweep
// (hours, e.g. under a CI job with a hard wall-clock cutoff) that gets killed mid-run must not
// lose every solve found before the kill. writeLevelsWithHints only rewrites a level's hint file
// when its content actually changed (see level-data-io.mjs), so calling it after a level that
// found nothing new is a cheap no-op, not a redundant full-corpus rewrite -- safe to call
// unconditionally rather than only when this specific row appended a hint.
function persistHintsIfEnabled() {
    if (!saveHints) return;
    totalHintFilesChanged += writeLevelsWithHints(corpusPath, rawLevels).hintFilesChanged;
}

// Writes the --out/--summary-out report from CURRENT levelRows/counters, not just once at the
// very end -- the same "a mid-run kill must not lose everything" rationale as
// persistHintsIfEnabled() above, applied to the report itself (previously only written once,
// after the whole run finished, so a killed run's --out file stayed whatever the pre-run
// placeholder was even though the checkpoint/hints already had the real per-level results).
// Cheap: small JSON/markdown writes, not a re-solve.
function writeReport() {
    const levels = [...levelRows.values()].sort((a, b) => a.level - b.level);
    const newFinds = levels.filter(f => f.solvedBeforeFallback);

    const summary = {
        generatedAt: new Date().toISOString(),
        commit,
        corpus: path.relative(root, corpusPath),
        schedulerMode,
        budgetMs,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        repairBudgetFraction: Number.isFinite(repairBudgetFraction) ? repairBudgetFraction : null,
        workers: workerCount,
        resume,
        checkpointPath: resume ? checkpointPath : null,
        resumedLevels: skippedByResume,
        featureFilter: featureFilterSpec,
        baseline: baselinePath,
        priority: priorityField ? { field: priorityField, order: priorityOrder } : null,
        attemptCache: attemptCachePath,
        attemptCacheSkipped: cachedSkipRows.length,
        portfolioExperiment: schedulerMode === 'portfolio-experiment' ? {
            pass1Ms: portfolioExperiment.pass1Ms,
            pass2Ms: portfolioExperiment.pass2Ms,
            pass3Ms: portfolioExperiment.pass3Ms,
            pass2Configs: [...portfolioExperiment.pass2Configs],
            pass3Configs: [...portfolioExperiment.pass3Configs],
            conditionalPasses: (portfolioExperiment.conditionalPasses ?? []).map(pass2 => ({
                passNumber: pass2.passNumber, capMs: pass2.capMs, configs: [...pass2.configs], when: pass2.when,
            })),
        } : null,
        levelsRun: levels.length,
        solvedCount,
        solvedBeforeFallbackCount,
        fallbackOnlyCount,
        unsolvedCount,
        passDistribution: passCounts,
        newFinds: newFinds.map(f => ({ level: f.level, id: f.id, pass: f.pass, winningConfig: f.winningConfig, gateKey: f.gateKey, totalMs: f.totalMs })),
        saveHints,
        hintsAppended,
        hintFilesChanged: totalHintFilesChanged,
    };

    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ summary, levels }, null, 2) + '\n');
    const md = [
        '# Portfolio solve-only sweep',
        '',
        `Generated: ${summary.generatedAt}`,
        `Commit: ${summary.commit}`,
        `Corpus: ${summary.corpus}`,
        `Scheduler mode: ${summary.schedulerMode}`,
        `Budget: ${summary.budgetMs}ms`,
        `Node budget: ${summary.nodeBudget ?? '(none)'}`,
        `Repair budget fraction override: ${summary.repairBudgetFraction ?? '(default, 6x)'}`,
        `Workers: ${summary.workers}`,
        `Resume: ${summary.resume ? `yes (${summary.resumedLevels} level(s) loaded from ${summary.checkpointPath})` : 'no'}`,
        `Feature filter: ${summary.featureFilter ?? '(none)'}`,
        `Priority: ${summary.priority ? `${summary.priority.field} (${summary.priority.order})` : '(none)'}`,
        `Attempt cache: ${summary.attemptCache ? `${summary.attemptCache} (${summary.attemptCacheSkipped} level(s) skipped)` : '(none)'}`,
        `Levels run: ${summary.levelsRun}`,
        '',
        `- Solved (any phase): ${solvedCount}`,
        `- Solved before fallback (portfolio-tier find): ${solvedBeforeFallbackCount}`,
        `- Solved by fallback/legacy path only: ${fallbackOnlyCount}`,
        `- Unsolved: ${unsolvedCount}`,
        `- Hints saved: ${saveHints ? `yes (${hintsAppended} level(s), ${totalHintFilesChanged} hint file(s) changed)` : 'no (pass --save-hints)'}`,
        '',
        '## Pass distribution',
        '',
        `- Pass 1: ${passCounts.pass1}`,
        `- Pass 2: ${passCounts.pass2}`,
        `- Pass 3: ${passCounts.pass3}`,
        `- Conditional: ${passCounts.conditional}`,
        `- Fallback (portfolio mode's embedded legacy-equivalent phase): ${passCounts.fallback}`,
        `- Legacy (plain legacy-mode solve): ${passCounts.legacy}`,
        `- Unsolved: ${passCounts.unsolved}`,
        '',
        '## Portfolio-tier finds (solvedBeforeFallback)',
        '',
        newFinds.length === 0 ? '- None' : newFinds.map(f => `- Level ${f.level}${f.id ? ` (${f.id})` : ''}: pass ${f.pass}, ${f.winningConfig}, gate=${f.gateKey}`).join('\n'),
        '',
    ].join('\n');
    writeFileSync(summaryOutFile, md);
    return { levels, solvedCount };
}

if (workerCount <= 1) {
    // racePool: within-level attempt racing (scripts/solver-parallel/race.mjs) — one persistent
    // pool shared across every level in this sequential run, same lifecycle rationale as that
    // module's own doc comment (per-level spin-up cost would dominate otherwise).
    const racePool = racePoolSize > 0 ? createRacePool({ poolSize: racePoolSize }) : null;
    for (const levelNumber of toActuallyRun) {
        const raw = rawLevels[levelNumber - 1];
        const t0 = Date.now();
        let result;
        try {
            result = racePool
                ? await racePool.solveLevel(raw, {
                    timeBudgetMs: budgetMs,
                    repairBudgetFractionOverride: solveOpts.repairBudgetFractionOverride,
                    attractionDiversityBudgetFractionOverride: solveOpts.attractionDiversityBudgetFractionOverride,
                })
                : await Solver.solve(getPrepared(levelNumber), solveOpts);
            attachRefereeValid(levelNumber, result);
        } catch (err) {
            // One bad level (a solver exception, not just a failed-to-solve result) must not take
            // down the whole run -- matches scripts/stress/benchmark.mjs's own solveEntry try/catch.
            // Whatever was already checkpointed/persisted for prior levels stays safe either way,
            // but without this a single throw would end the batch early instead of moving on.
            result = { ok: false, status: 'error', error: err?.message ?? String(err), totalMs: Date.now() - t0, attempts: [] };
        }
        const row = buildRow(levelNumber, raw?.id, result, schedulerMode);
        row.hintAppended = mergeSolvedHint(raw, result);
        if (row.hintAppended) hintsAppended += 1;
        recordRow(row);
        logProgress(row);
        persistHintsIfEnabled();
        writeReport();
    }
    if (racePool) await racePool.shutdown();
} else {
    const workerScript = path.join(root, 'scripts', 'portfolio-solve-sweep-worker.mjs');
    const workerSolveOpts = solveOpts.portfolioExperiment
        ? { ...solveOpts, portfolioExperiment: serializePortfolioExperiment(solveOpts.portfolioExperiment) }
        : solveOpts;
    // racePoolSize travels with each task: portfolio-solve-sweep-worker.mjs lazily creates ONE
    // persistent race pool per forked worker process (not per task) and reuses it across every
    // level that worker is dispatched, for the same spin-up-cost reason noted above.
    const tasks = toActuallyRun.map(levelNumber => ({ corpusPath, levelNumber, solveOpts: workerSolveOpts, racePoolSize }));
    await runWorkerPool({
        workerScript,
        tasks,
        concurrency: Math.min(workerCount, defaultConcurrency() > 0 ? workerCount : workerCount),
        onResult: (index, workerResult) => {
            const levelNumber = toActuallyRun[index];
            const raw = rawLevels[levelNumber - 1];
            const { id, result } = workerResult;
            attachRefereeValid(levelNumber, result);
            const row = buildRow(levelNumber, id ?? raw?.id, result, schedulerMode);
            row.hintAppended = mergeSolvedHint(raw, result);
            if (row.hintAppended) hintsAppended += 1;
            recordRow(row);
            logProgress(row);
            persistHintsIfEnabled();
            writeReport();
        },
    });
}

if (saveHints) {
    console.log(`Hints: appended to ${hintsAppended} level(s); ${totalHintFilesChanged} hint file(s) changed on disk.`);
}
if (attemptCachePath && baselineMap) {
    saveFamilyCache(attemptCachePath, attemptCacheHashes);
    console.log(`Attempt cache: wrote current family hashes to ${attemptCachePath}.`);
}

// Final write: authoritative even for a fully-empty run (nothing left to solve after
// checkpoint/attempt-cache loading) where the loop/worker-pool body above never executed at all.
const { levels } = writeReport();
console.log(`Result: solved=${solvedCount}/${levels.length}, solvedBeforeFallback=${solvedBeforeFallbackCount}, fallbackOnly=${fallbackOnlyCount}, unsolved=${unsolvedCount}`);
console.log(`Wrote ${outFile}`);
console.log(`Wrote ${summaryOutFile}`);
