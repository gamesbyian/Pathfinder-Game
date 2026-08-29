#!/usr/bin/env node
/**
 * Solve-only batch sweep for stress/research levels.
 *
 * Modes:
 * - `--scheduler-mode=production`: normal solver batch runs and feature/heuristic probes.
 * - `--scheduler-mode=legacy-latency-portfolio-experiment`: historical portfolio-tier experiment with fallback.
 *
 * Prefer `--work-budget` for cross-technique comparisons. Runtime validation below reports unsupported
 * option combinations (notably race-pool/node/admissible-order interactions), and deprecated
 * `--baseline-budget` is retained only for historical reproduction. `--prime-winner` is re-verification
 * machinery, not cold-capability evidence. See docs/solver-architecture.md,
 * docs/solver-scheduling-policy.md, and docs/solver-research-operating-model.md for current policy.
 *
 * Batch controls include `--resume`, `--feature-filter`, `--baseline`, `--priority`, `--workers`,
 * `--race-pool-size`, `--attempt-cache`, sparse `--enable-flags`/`--disable-flags`, and the explicit
 * budget-fraction overrides parsed below. `--save-hints` persists solved paths with provenance;
 * omit it for report-only runs.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --levels=pos:1-1700 \
 *     --scheduler-mode=production --work-budget=1000000 --workers=8 --resume \
 *     --out=reports/portfolio/corpus2-sweep.json
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { LEGACY_LATENCY_PORTFOLIO_EXPERIMENT } from '../modules/solver/legacy-latency-portfolio-experiment.js';
import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { readLevelsWithHints, writeLevelsWithHints, parseLevelPositions } from './level-data-io.mjs';
import { buildRow, tallyPass, serializePortfolioExperiment } from './portfolio-solve-sweep-lib.mjs';
import { createHintCapture } from './hint-capture-lib.mjs';
import { runWorkerPool, defaultConcurrency } from './solver-worker-pool.mjs';
import { createRacePool } from './solver-parallel/race.mjs';
import { FEATURES } from '../modules/solver/ablation-config.js';
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
const rawSchedulerMode = argMap.get('--scheduler-mode');
const schedulerMode = rawSchedulerMode === 'legacy' || rawSchedulerMode === 'production'
    ? 'production'
    : 'legacy-latency-portfolio-experiment';
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : undefined;
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;
const repairBudgetFraction = argMap.has('--repair-budget-fraction') ? Number(argMap.get('--repair-budget-fraction')) : undefined;
const attractionDiversityBudgetFraction = argMap.has('--attraction-diversity-budget-fraction') ? Number(argMap.get('--attraction-diversity-budget-fraction')) : undefined;
const admissibleOrderBudgetFraction = argMap.has('--admissible-order-budget-fraction') ? Number(argMap.get('--admissible-order-budget-fraction')) : undefined;
const admissibleOrderNodeReserveFraction = argMap.has('--admissible-order-node-reserve-fraction') ? Number(argMap.get('--admissible-order-node-reserve-fraction')) : undefined;
const mainLoopLateReserveFraction = argMap.has('--main-loop-late-reserve-fraction') ? Number(argMap.get('--main-loop-late-reserve-fraction')) : undefined;
const mainLoopLateReserveConfigCount = argMap.has('--main-loop-late-reserve-config-count') ? Number(argMap.get('--main-loop-late-reserve-config-count')) : undefined;
const disableExtraBudgetPasses = flags.has('--disable-extra-budget-passes');
// DEPRECATED --baseline-budget: per-level adaptive node budgets scaled off recorded per-level
// nodesExpanded, instead of one flat --node-budget on every level. Rationale (measured on
// stress-corpus-2's baseline): the winning attempt is cheap (p50 68K, p90 9M nodes) but a flat
// budget exists only to give the hardest levels room, so most levels get budget they never spend.
// SolveOpts.nodeBudget is a CUMULATIVE cap across all attempts (orchestration.ts checks it against
// the running prep._metrics.nodesExpanded), and the baseline's nodesExpanded is that same cumulative
// total. The original implementation assumed K x baseline nodes represented demonstrated need;
// corpus-scale use disproved that for stochastic repair winners and caused 45 apparent regressions.
// This flag remains for historical experiments only, not as a supported regression workflow. The
// extra-budget passes
// (6x repair, attraction) are themselves gated on nodesExpanded < nodeBudget, so a tight per-level
// cap also curtails those automatically. Known-failed / not-in-baseline levels get
// --unsolved-node-budget (the discovery lever: leave it high to still find new solves, or drop it
// for a fast "did I break anything" regression pass). Requires --baseline; ignored under racing.
const baselineBudget = flags.has('--baseline-budget');
const solvedBudgetMult = argMap.has('--solved-budget-mult') ? Number(argMap.get('--solved-budget-mult')) : 3;
const minNodeBudget = argMap.has('--min-node-budget') ? Number(argMap.get('--min-node-budget')) : 2_000_000;
const unsolvedNodeBudget = argMap.has('--unsolved-node-budget')
    ? Number(argMap.get('--unsolved-node-budget'))
    : (Number.isFinite(nodeBudget) ? nodeBudget : undefined);
// --prime-winner: winner-first pre-attempt. For each level the --baseline recorded as solved, try
// exactly its recorded winning config+gate as a single attempt (SolveOpts.primeAttempt) before the
// normal ladder. On a re-verify run where the relevant solver code is unchanged, the recorded winner
// still wins, skipping the (measured ~84% of solved-level) work the ladder spends on non-winning
// configs first. A miss falls through to the full solve (see the field's verdict caveat: preserves
// solvability, not cold-search ordering — re-verify runs only, not cold-capability benchmarking).
// The prime attempt is bounded to prime-budget-mult x the winner's own recorded nodes so a miss
// costs at most one bounded attempt. Requires --baseline; ignored under racing.
const primeWinner = flags.has('--prime-winner');
const primeIncludeAll = flags.has('--prime-include-all');
const primeBudgetMult = argMap.has('--prime-budget-mult') ? Number(argMap.get('--prime-budget-mult')) : 4;
const primeMinNodeBudget = argMap.has('--prime-min-node-budget') ? Number(argMap.get('--prime-min-node-budget')) : 500_000;
const resume = flags.has('--resume');
const checkpointPath = argMap.get('--checkpoint') || `${outFile}.checkpoint.jsonl`;
const featureFilterSpec = argMap.get('--feature-filter') || null;
const baselinePath = argMap.get('--baseline') || null;
const priorityField = argMap.get('--priority') || null;
const priorityOrder = argMap.get('--priority-order') === 'desc' ? 'desc' : 'asc';
const workerCount = argMap.has('--workers') ? Math.max(1, Number(argMap.get('--workers')) || 1) : 1;
const attemptCachePath = argMap.get('--attempt-cache') || null;
// --enable-flags=FLAG1,FLAG2 turns those ablation flags ON (via SolveOpts.ablation), all others left
// at their default. The value is a SPARSE ablation object; orchestration.ts's normalizeAblationConfig
// normalizer restores every unset flag's production default, so this enables exactly the named
// flags without disabling anything else. Primary use: the corpus-2
// refresh toggling STRATEGY_REPAIR_TURN_BIAS baseline-vs-on. Validated against FEATURES to catch typos.
const enableFlags = argMap.has('--enable-flags')
    ? argMap.get('--enable-flags').split(',').map(s => s.trim()).filter(Boolean)
    : [];
for (const f of enableFlags) {
    if (!(f in FEATURES)) { console.error(`--enable-flags: unknown ablation flag "${f}" (see modules/solver/ablation-config.ts FEATURES).`); process.exit(2); }
}
// --disable-flags=FLAG1,FLAG2 is the exact counterpart: it turns the named flags OFF, leaving every
// other flag at its default. Needed because most flags DEFAULT to on, so --enable-flags cannot test
// whether an existing mechanism is load-bearing — only --disable-flags can. Same sparse-object
// safety as above means naming one flag here disables exactly that one. A flag named in both is
// rejected rather than silently resolved.
const disableFlags = argMap.has('--disable-flags')
    ? argMap.get('--disable-flags').split(',').map(s => s.trim()).filter(Boolean)
    : [];
for (const f of disableFlags) {
    if (!(f in FEATURES)) { console.error(`--disable-flags: unknown ablation flag "${f}" (see modules/solver/ablation-config.ts FEATURES).`); process.exit(2); }
    if (enableFlags.includes(f)) { console.error(`--disable-flags: "${f}" is also in --enable-flags; pick one.`); process.exit(2); }
}
const ablation = (enableFlags.length > 0 || disableFlags.length > 0)
    ? Object.fromEntries([...enableFlags.map(f => [f, true]), ...disableFlags.map(f => [f, false])])
    : null;
let racePoolSize = argMap.has('--race-pool-size') ? Math.max(1, Number(argMap.get('--race-pool-size')) || 1) : 0;
if (racePoolSize > 0 && schedulerMode !== 'production') {
    console.error('--race-pool-size requires --scheduler-mode=production (scripts/solver-parallel/race.mjs has no legacy-latency-portfolio-experiment equivalent — its pool races the plain attempt ladder). Ignoring --race-pool-size.');
    racePoolSize = 0;
}
if (racePoolSize > 0 && Number.isFinite(nodeBudget)) {
    console.error('--node-budget is not enforced by the race pool (scripts/solver-parallel/race.mjs has no node-budget concept — concurrent jobs on separate cores, not a single sequential node counter). It will be ignored for raced solves.');
}
if (racePoolSize > 0 && (Number.isFinite(admissibleOrderBudgetFraction) || Number.isFinite(admissibleOrderNodeReserveFraction) || disableExtraBudgetPasses)) {
    console.error('--admissible-order-budget-fraction / --admissible-order-node-reserve-fraction / the admissible-order half of --disable-extra-budget-passes are not honored by the race pool (scripts/solver-parallel/race.mjs reimplements the ladder and has no admissible-order tier at all, unlike the repair and attraction-diversity fractions it does read). They will be ignored for raced solves.');
}
if (Number.isFinite(admissibleOrderNodeReserveFraction) && !Number.isFinite(nodeBudget)) {
    console.error('--admissible-order-node-reserve-fraction has no effect without --node-budget: the reserve is a share of an EXTERNAL cumulative node ceiling, and with no ceiling there is nothing to withhold (orchestration.ts leaves the reserve at 0 when nodeBudget is Infinity).');
}
if (baselineBudget && !argMap.has('--baseline')) {
    console.error('--baseline-budget requires --baseline (it scales each level\'s node budget off the baseline\'s recorded per-level nodesExpanded). Ignoring --baseline-budget.');
}
if (baselineBudget) {
    console.error('WARNING: --baseline-budget is deprecated and unsound for general regression use (repair winners are stochastic and raw nodes are technique-dependent). Prefer --work-budget; this mode is retained only for historical reproduction.');
}
if (baselineBudget && racePoolSize > 0) {
    console.error('--baseline-budget has no effect under --race-pool-size (the race pool has no node-budget concept — see the --node-budget warning above). Per-level budgets are ignored for raced solves.');
}
if (primeWinner && !argMap.has('--baseline')) {
    console.error('--prime-winner requires --baseline (it replays each level\'s baseline-recorded winning config+gate). Ignoring --prime-winner.');
}
if (primeWinner && racePoolSize > 0) {
    console.error('--prime-winner has no effect under --race-pool-size (the race pool solves via race.mjs, which has no primeAttempt concept). The winner-first pre-attempt is skipped for raced solves.');
}

function csvSet(value, fallback) {
    const raw = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [...fallback];
    return new Set(raw.map(normalizeAttemptIdentityKey));
}

function experimentFromArgs() {
    return {
        pass1Ms: Number(argMap.get('--pass1-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass1Ms),
        pass2Ms: Number(argMap.get('--pass2-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Ms),
        pass3Ms: Number(argMap.get('--pass3-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Ms),
        pass2Configs: csvSet(argMap.get('--pass2-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Configs),
        pass3Configs: csvSet(argMap.get('--pass3-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Configs),
        conditionalPasses: LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.conditionalPasses,
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

function readCheckpoint(checkpointFile, expectedSignature) {
    const rows = new Map();
    if (!existsSync(checkpointFile)) return rows;
    const text = readFileSync(checkpointFile, 'utf8');
    let actualSignature = null;
    for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        try {
            const row = JSON.parse(t);
            if (row?._checkpointSignature) { actualSignature = row._checkpointSignature; continue; }
            if (Number.isFinite(row.level)) rows.set(row.level, row);
        } catch { /* skip a malformed/truncated last line from an interrupted run */ }
    }
    if (actualSignature !== expectedSignature) {
        const reason = actualSignature == null ? 'has no run signature (legacy checkpoint)' : 'belongs to a different commit or invocation';
        throw new Error(`--resume refused ${checkpointFile}: checkpoint ${reason}. Remove it or choose a new --checkpoint path.`);
    }
    return rows;
}
function appendCheckpoint(checkpointFile, row, signature) {
    mkdirSync(path.dirname(checkpointFile), { recursive: true });
    if (!existsSync(checkpointFile) || readFileSync(checkpointFile, 'utf8').trim() === '') {
        appendFileSync(checkpointFile, `${JSON.stringify({ _checkpointSignature: signature })}\n`);
    }
    appendFileSync(checkpointFile, `${JSON.stringify(row)}\n`);
}

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
// provenanceFromSolveResult / toHint / mergeHints / hintPaths / getLevelFingerprint are deliberately
// NOT imported here any more — the whole hint-merge path lives in scripts/hint-capture-lib.mjs, so
// there is exactly one implementation of it shared with run-solverv2-direct.mjs's CI audit pass.
const { getConfiguredAttemptConfigs } = await import('../modules/solver/attempts.js');
const Solver = createSolver();
// readLevelsWithHints attaches .hints/.hintRecords per level from the on-disk hint artifact
// (harmless when --save-hints is unset — we just don't write anything back).
const rawLevels = readLevelsWithHints(corpusPath);
const levelFilter = parseLevelPositions(argMap.get('--levels'));
let targets = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);
// Full 40-char SHA (not --short): this feeds the per-hint provenance solver.version, which must
// match the format hint-workbench.mjs and every other corpus writer records, so version grouping
// across the corpus stays exact rather than mixing 7-char and 40-char SHAs.
const commit = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();
// Resume is crash recovery for this exact run, not a cache across solver revisions or changed
// flags. A previous corpus-2 refresh silently did zero work because old rows were trusted after
// the code changed. Persist the commit plus behavior-affecting invocation as a checkpoint header;
// omit only --resume itself, whose presence naturally differs between an initial run and recovery.
const checkpointSignature = JSON.stringify({
    commit,
    corpusDigest: createHash('sha256').update(readFileSync(corpusPath)).digest('hex'),
    args: args.filter(arg => arg !== '--resume' && arg !== '--').sort(),
});
const legacyLatencyPortfolioExperiment = experimentFromArgs();

const solveOpts = { timeBudgetMs: budgetMs, schedulerMode };
if (schedulerMode === 'legacy-latency-portfolio-experiment') solveOpts.legacyLatencyPortfolioExperiment = legacyLatencyPortfolioExperiment;
if (Number.isFinite(nodeBudget)) solveOpts.nodeBudget = nodeBudget;
if (Number.isFinite(workBudget)) solveOpts.workBudget = workBudget;
if (Number.isFinite(repairBudgetFraction)) solveOpts.repairBudgetFractionOverride = repairBudgetFraction;
if (Number.isFinite(attractionDiversityBudgetFraction)) solveOpts.attractionDiversityBudgetFractionOverride = attractionDiversityBudgetFraction;
if (Number.isFinite(admissibleOrderBudgetFraction)) solveOpts.admissibleOrderBudgetFractionOverride = admissibleOrderBudgetFraction;
if (Number.isFinite(admissibleOrderNodeReserveFraction)) solveOpts.admissibleOrderNodeReserveFractionOverride = admissibleOrderNodeReserveFraction;
if (Number.isFinite(mainLoopLateReserveFraction)) solveOpts.mainLoopLateReserveFractionOverride = mainLoopLateReserveFraction;
if (Number.isFinite(mainLoopLateReserveConfigCount)) solveOpts.mainLoopLateReserveConfigCountOverride = mainLoopLateReserveConfigCount;
// Set LAST of the fraction group on purpose: orchestration.ts resolves each individual override with
// `?? (disableExtraBudgetPasses ? 0 : undefined)`, so an explicit --repair-budget-fraction etc. still
// wins over this flag — the additive semantics its own SolveOpts comment promises.
if (disableExtraBudgetPasses) solveOpts.disableExtraBudgetPasses = true;
if (ablation) solveOpts.ablation = ablation;

const featureFilterTokens = parseFeatureFilter(featureFilterSpec);
const baselineMap = loadBaselineMap(baselinePath);
if ((priorityField || attemptCachePath) && !baselineMap) {
    console.error('--priority and --attempt-cache require --baseline; ignoring both.');
}

// Deprecated adaptive per-level node budgets are active only with both --baseline-budget and a loaded baseline,
// and never under racing (the race pool ignores node budgets). When inactive, nodeBudgetFor() returns
// the flat global nodeBudget so every code path can call it unconditionally.
const adaptiveBudget = baselineBudget && !!baselineMap && racePoolSize === 0;
const globalNodeBudget = Number.isFinite(nodeBudget) ? nodeBudget : undefined;
/** Per-level cumulative node budget (undefined => no node cap, time budget only). Known-solved
 *  levels get max(minNodeBudget, ceil(mult x baseline nodesExpanded)); everything else (known-failed
 *  or absent from the baseline) gets unsolvedNodeBudget. */
function nodeBudgetFor(id) {
    if (!adaptiveBudget) return globalNodeBudget;
    const rec = id ? baselineMap.get(id) : null;
    const recNodes = Number(rec?.nodesExpanded);
    if (rec && !isBaselineUnsolved(rec) && Number.isFinite(recNodes) && recNodes > 0) {
        return Math.max(minNodeBudget, Math.ceil(solvedBudgetMult * recNodes));
    }
    return unsolvedNodeBudget;
}
// Winner-first pre-attempt is active only with both --prime-winner and a loaded baseline, never
// under racing. Composes with --baseline-budget but is independent of it.
const primeWinnerActive = primeWinner && !!baselineMap && racePoolSize === 0;
/** The primeAttempt (SolveOpts) for a level, from its baseline-recorded winner — or undefined when
 *  the baseline has no solved record for it. By DEFAULT the prime shares the solve's own node budget
 *  (no explicit cap): the winner, on unchanged code, solves well under it, and a beam winner's
 *  recorded per-attempt nodesExpanded (credited at the solving frontier node) is an unreliable
 *  predictor of its run-FIRST cost — measured: a level whose winner recorded 2 nodes actually took
 *  ~142K run-first, so a mult-of-recorded-nodes cap starved genuine winners into false misses.
 *  --prime-budget-mult opts into a tighter cap = mult x the winner's recorded nodes, which bounds a
 *  genuine miss's cost but reintroduces that false-miss risk — use only when you know the winner's
 *  recorded cost is representative (e.g. a DFS/repair winner, not a first-phase beam solve). */
function primeAttemptFor(id) {
    if (!primeWinnerActive) return undefined;
    const rec = id ? baselineMap.get(id) : null;
    if (!rec || isBaselineUnsolved(rec) || typeof rec.winningConfig !== 'string' || !Number.isFinite(Number(rec.gateKey))) return undefined;
    const winnerAttempt = Array.isArray(rec.attempts) ? rec.attempts.find(a => a?.ok) : null;
    // Prime NORMAL-scoring beam/DFS winners, and repair winners whose baseline recorded a real
    // randomSeed (attemptRecord persists it as of 2026-07-23 — an older baseline predating that fix
    // has no seed data at all) AND whose own recorded elapsedMs fits within THIS run's budgetMs.
    // Both conditions were needed to get a clean hit rate (measured on a 6-level repair-winner
    // sample: normal winners separately measured 8/8):
    //   - Seed: repair-search is seeded per gate+seedSalt (repairPrimarySeed) and is otherwise an
    //     iterated local search, so a salt-0 replay (no recorded seed) only sometimes reproduces the
    //     winning trajectory (measured 3/6) and a miss is expensive (the prime's own repair attempt
    //     runs before the full ladder).
    //   - Budget fit: replaying with the CORRECT seed alone still isn't sufficient — repair search
    //     needs real wall-clock/iteration budget to converge, so a winner whose own attempt took
    //     LONGER than the prime's granted timeBudgetMs cannot reproduce even with the right seed
    //     (confirmed directly: two seed-correct, config-key-correct replays still missed, and their
    //     recorded elapsedMs — 84.8s and 57.3s — both exceeded the 30s the prime replay was run at,
    //     while all 4 seed-correct HITS had elapsedMs of 1-30.5s). Gating on
    //     `winnerAttempt.elapsedMs <= budgetMs` (this run's own base budget, the same value the prime
    //     step actually grants) reflects that directly, rather than guessing a fixed margin.
    // attraction-diversity winners only solve with goal-attraction scoring DISABLED (the last-resort
    // AD pass), which a plain config replay can't reproduce, so they always miss (measured 0/4) —
    // threading an AD-scoring flag through primeAttempt is future work.
    // --prime-include-all opts into priming every winner kind regardless (accepting the lower hit
    // rate and miss cost on repair winners that fail either gate, and on AD winners) for experiments.
    const winnerKind = winnerAttempt?.attractionDiversity ? 'ad' : winnerAttempt?.repair ? 'repair' : 'normal';
    const repairSeedKnown = winnerKind === 'repair' && winnerAttempt?.randomSeed !== undefined;
    // Eligibility gate (default, non-include-all path): seed known AND its own recorded cost fits
    // this run's budget. Deliberately separate from repairSeedKnown above — under --prime-include-all
    // we still want to USE a known seed even when it fails this fit check (it's strictly better than
    // guessing salt 0, even if unlikely to reproduce within budget), so seed inclusion below is keyed
    // on repairSeedKnown alone, not this stricter gate.
    const repairSeedFits = repairSeedKnown
        && Number.isFinite(Number(winnerAttempt.elapsedMs)) && Number(winnerAttempt.elapsedMs) <= budgetMs;
    if (!primeIncludeAll && winnerKind !== 'normal' && !repairSeedFits) return undefined;
    let primeNodeBudget;
    if (argMap.has('--prime-budget-mult')) {
        const winnerNodes = Number(winnerAttempt?.nodesExpanded);
        if (Number.isFinite(winnerNodes) && winnerNodes > 0) {
            primeNodeBudget = Math.max(primeMinNodeBudget, Math.ceil(primeBudgetMult * winnerNodes));
        }
    }
    return {
        gateKey: Number(rec.gateKey),
        configKey: normalizeAttemptIdentityKey(rec.winningConfig),
        ...(repairSeedKnown ? { seedSalt: winnerAttempt.seedSalt ?? 0 } : {}),
        ...(primeNodeBudget ? { nodeBudget: primeNodeBudget } : {}),
    };
}
/** Clone the shared solveOpts with this level's adaptive nodeBudget and/or winner-first primeAttempt.
 *  Returns the shared object unchanged when neither mode is active, so the common path allocates
 *  nothing extra. */
function solveOptsFor(baseOpts, id) {
    let opts = baseOpts;
    if (adaptiveBudget) {
        const nb = nodeBudgetFor(id);
        if (nb === undefined) {
            const { nodeBudget: _drop, ...rest } = opts;
            opts = rest;
        } else {
            opts = { ...opts, nodeBudget: nb };
        }
    }
    if (primeWinnerActive) {
        const pa = primeAttemptFor(id);
        if (pa) opts = { ...opts, primeAttempt: pa };
    }
    return opts;
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
const checkpointRows = resume ? readCheckpoint(checkpointPath, checkpointSignature) : new Map();
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

// Merge itself lives in scripts/hint-capture-lib.mjs, shared with run-solverv2-direct.mjs (the CI
// audit pass). Only the SCHEDULING of writes stays here -- this tool persists incrementally after
// every level so a killed multi-hour run keeps its finds, which is deliberately different from the
// capture module's own flush-at-end (see persistHintsIfEnabled below).
function mergeSolvedHint(raw, result) {
    return hintCapture.record(raw, result);
}

const levelRows = new Map();
for (const row of checkpointRows.values()) levelRows.set(row.level, row);
for (const row of cachedSkipRows) levelRows.set(row.level, row);
let hintsAppended = 0;

// Level-shape fingerprints (for each solved hint's provenance.levelRevision, so a stored hint can't
// silently keep pointing at a since-edited level) are precomputed by hintCapture.prepare() rather
// than derived per solve: getLevelFingerprint is async, and the worker-pool onResult callback that
// merges hints is NOT awaited (solver-worker-pool.mjs), so the merge path must stay synchronous.
const hintCapture = await createHintCapture({ solverVersion: commit, budgetMs, enabled: saveHints });
if (saveHints) await hintCapture.prepare(toActuallyRun.map(n => rawLevels[n - 1]));
let totalHintFilesChanged = 0;
let solvedCount = 0;
let solvedBeforeFallbackCount = 0;
let fallbackOnlyCount = 0;
let unsolvedCount = 0;
let primeHitCount = 0;
let processedForConsole = 0;
const passCounts = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, production: 0, unsolved: 0 };

function recordRow(row, { fromCheckpointOrCache = false } = {}) {
    levelRows.set(row.level, row);
    if (row.ok) solvedCount += 1;
    if (row.solvedBeforeFallback) solvedBeforeFallbackCount += 1;
    if (row.solvedByFallback) fallbackOnlyCount += 1;
    if (row.solvedByPrime) primeHitCount += 1;
    if (!row.ok) unsolvedCount += 1;
    tallyPass(passCounts, row, schedulerMode);
    if (!fromCheckpointOrCache && resume) appendCheckpoint(checkpointPath, row, checkpointSignature);
}
// Pre-existing checkpoint/cache rows already reflect a completed (or safely-skipped) outcome —
// tally them but never re-append to the checkpoint file (idempotent resume).
for (const row of checkpointRows.values()) recordRow(row, { fromCheckpointOrCache: true });
for (const row of cachedSkipRows) recordRow(row, { fromCheckpointOrCache: true });

const effectiveParallelism = workerCount * Math.max(1, racePoolSize);
const cpuCount = os.cpus().length;
console.log(`portfolio-solve-sweep: corpus=${path.relative(root, corpusPath)} levels=${targets.length} (${toActuallyRun.length} to solve) scheduler-mode=${schedulerMode} budget=${budgetMs}ms${Number.isFinite(nodeBudget) ? ` node-budget=${nodeBudget}` : ''}${Number.isFinite(repairBudgetFraction) ? ` repair-budget-fraction=${repairBudgetFraction}` : ''}${Number.isFinite(attractionDiversityBudgetFraction) ? ` attraction-diversity-budget-fraction=${attractionDiversityBudgetFraction}` : ''}${Number.isFinite(admissibleOrderBudgetFraction) ? ` admissible-order-budget-fraction=${admissibleOrderBudgetFraction}` : ''}${Number.isFinite(admissibleOrderNodeReserveFraction) ? ` admissible-order-node-reserve-fraction=${admissibleOrderNodeReserveFraction}` : ''}${Number.isFinite(mainLoopLateReserveFraction) ? ` main-loop-late-reserve-fraction=${mainLoopLateReserveFraction}` : ''}${Number.isFinite(mainLoopLateReserveConfigCount) ? ` main-loop-late-reserve-config-count=${mainLoopLateReserveConfigCount}` : ''}${disableExtraBudgetPasses ? ' disable-extra-budget-passes' : ''} workers=${workerCount}${racePoolSize > 0 ? ` race-pool-size=${racePoolSize} (${workerCount} x ${racePoolSize} = ${effectiveParallelism} concurrent OS-level units)` : ''}${enableFlags.length > 0 ? ` enable-flags=${enableFlags.join(',')}` : ''} save-hints=${saveHints}`);
if (adaptiveBudget) {
    const assigned = toActuallyRun.map(n => nodeBudgetFor(rawLevels[n - 1]?.id));
    const capped = assigned.filter(b => b !== undefined).sort((a, b) => a - b);
    const uncapped = assigned.length - capped.length;
    const med = capped.length ? capped[Math.floor(capped.length / 2)] : null;
    const solvedInBaseline = toActuallyRun.filter(n => {
        const rec = baselineMap.get(rawLevels[n - 1]?.id);
        return rec && !isBaselineUnsolved(rec);
    }).length;
    console.log(`  adaptive budgets: mult=${solvedBudgetMult}x floor=${minNodeBudget.toLocaleString()} unsolved=${unsolvedNodeBudget === undefined ? '(no cap)' : unsolvedNodeBudget.toLocaleString()} | ${solvedInBaseline} known-solved scaled (min ${capped[0]?.toLocaleString() ?? '—'} / med ${med?.toLocaleString() ?? '—'} / max ${capped[capped.length - 1]?.toLocaleString() ?? '—'} nodes)${uncapped ? `, ${uncapped} uncapped` : ''}`);
}
if (primeWinnerActive) {
    const primed = toActuallyRun.filter(n => primeAttemptFor(rawLevels[n - 1]?.id) !== undefined).length;
    console.log(`  winner-first: ${primeIncludeAll ? 'all winner kinds' : 'normal + seeded-repair winners'}${argMap.has('--prime-budget-mult') ? ` cap=${primeBudgetMult}x/${primeMinNodeBudget.toLocaleString()}` : ' (shares solve budget)'} | ${primed}/${toActuallyRun.length} levels will be primed`);
}
if (effectiveParallelism > cpuCount) {
    console.error(`  !! effective parallelism (${effectiveParallelism}) exceeds this machine's ${cpuCount} cores — expect contention, not a ${effectiveParallelism}x speedup.`);
}

function logProgress(row) {
    processedForConsole += 1;
    console.log(`  [${processedForConsole}/${toActuallyRun.length}] L${row.level}${row.id ? ` (${row.id})` : ''} ok=${row.ok ? '✓' : '✗'}${row.phaseLabel ? ` ${row.phaseLabel}` : ''}${row.solvedByPrime ? ' [primed]' : ''}${row.solvedBeforeFallback ? ' <-- PORTFOLIO FIND' : ''}${row.hintAppended ? ' [hint saved]' : ''}`);
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
        // The machine-independent budget this sweep ran under. Recorded so a combined report is
        // self-describing: without it there is no way to tell whether two sweeps are comparable,
        // which is exactly the gap that made pre-migration cost numbers unreadable.
        workBudget: Number.isFinite(workBudget) ? workBudget : null,
        repairBudgetFraction: Number.isFinite(repairBudgetFraction) ? repairBudgetFraction : null,
        adaptiveBudget: adaptiveBudget
            ? { solvedBudgetMult, minNodeBudget, unsolvedNodeBudget: unsolvedNodeBudget ?? null }
            : null,
        primeWinner: primeWinnerActive
            ? { includeAll: primeIncludeAll, primeBudgetMult: argMap.has('--prime-budget-mult') ? primeBudgetMult : null, primeMinNodeBudget, primeHits: primeHitCount }
            : null,
        workers: workerCount,
        resume,
        checkpointPath: resume ? checkpointPath : null,
        resumedLevels: skippedByResume,
        featureFilter: featureFilterSpec,
        baseline: baselinePath,
        priority: priorityField ? { field: priorityField, order: priorityOrder } : null,
        attemptCache: attemptCachePath,
        attemptCacheSkipped: cachedSkipRows.length,
        legacyLatencyPortfolioExperiment: schedulerMode === 'legacy-latency-portfolio-experiment' ? {
            pass1Ms: legacyLatencyPortfolioExperiment.pass1Ms,
            pass2Ms: legacyLatencyPortfolioExperiment.pass2Ms,
            pass3Ms: legacyLatencyPortfolioExperiment.pass3Ms,
            pass2Configs: [...legacyLatencyPortfolioExperiment.pass2Configs],
            pass3Configs: [...legacyLatencyPortfolioExperiment.pass3Configs],
            conditionalPasses: (legacyLatencyPortfolioExperiment.conditionalPasses ?? []).map(pass2 => ({
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
        `- Production (plain production solve): ${passCounts.production}`,
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
                    // NOT threaded here, deliberately: race.mjs reimplements the attempt ladder and
                    // has no admissible-order tier and no nodeBudget handling at all (grep it — the
                    // fields simply have no reader). Passing them would look like support and change
                    // nothing, so the admissible-order overrides and the node reserve are documented
                    // as not applying under --race-pool-size instead. The banner below warns when a
                    // run combines the two.
                    ablation: solveOpts.ablation, // race.mjs reads levelOpts.ablation; must be threaded explicitly here
                })
                : await Solver.solveLevel(getPrepared(levelNumber), solveOptsFor(solveOpts, raw?.id));
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
    const workerSolveOpts = solveOpts.legacyLatencyPortfolioExperiment
        ? { ...solveOpts, legacyLatencyPortfolioExperiment: serializePortfolioExperiment(solveOpts.legacyLatencyPortfolioExperiment) }
        : solveOpts;
    // racePoolSize travels with each task: portfolio-solve-sweep-worker.mjs lazily creates ONE
    // persistent race pool per forked worker process (not per task) and reuses it across every
    // level that worker is dispatched, for the same spin-up-cost reason noted above.
    const tasks = toActuallyRun.map(levelNumber => ({
        corpusPath,
        levelNumber,
        solveOpts: solveOptsFor(workerSolveOpts, rawLevels[levelNumber - 1]?.id),
        racePoolSize,
    }));
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