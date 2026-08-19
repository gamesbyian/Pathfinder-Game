#!/usr/bin/env node
/**
 * technique-census: plan builder.
 *
 * Generates the flat, deterministic cell list for the isolated single-/paired-/flag-technique
 * census (scripts/technique-census.mjs runs it; .github/workflows/technique-census.yml shards it).
 * Not committed to git — the "plan" job in that workflow runs this fresh at the dispatched commit
 * and uploads the result as a build artifact every shard downloads, the same way
 * solver-stress-refresh.yml computes shard ranges arithmetically rather than checking in an
 * enumeration. Deterministic (fixed seed) so a local run reproduces byte-identical to CI's.
 *
 * WHAT THIS ANSWERS: "which technique, given the FULL ladder node budget to itself (not shared
 * across a ladder), solves or fails on this level — and how." Four tiers, each answering a
 * different piece of that:
 *
 *   T1 (primary, full budget): every technique the real ladder ever generates (derived live from
 *       getConfiguredAttemptConfigs across all 3 corpora, not a hardcoded/synthetic list) x a large
 *       sample of CURRENTLY UNSOLVED levels (all of corpus-1's unsolved + a seeded random sample of
 *       corpus-2's), each at the full 50,000,000-node budget. This is THE decision-bearing tier for
 *       "can any single isolated technique crack a level the production ladder can't."
 *   T2 (breadth, cheap budget): every technique x EVERY level in all 3 real corpora (solved and
 *       unsolved), at a small budget -- a coarse capability/redundancy fingerprint across the whole
 *       game, cheap enough to run exhaustively.
 *   T3 (pairs): 10 curated, mechanically-complementary technique pairs (sharing ONE full budget,
 *       same cost shape as a single T1 cell) against a sub-sample of T1's own level pool -- answers
 *       "does trying A then B find something neither finds alone."
 *   T4 (flags): 6 curated ablation-flag experiments, each gated to the levels where the flag is
 *       mechanically reachable (e.g. PRUNE_MC_NEIGHBOR_BUDGET only reaches must-cross levels), run
 *       against the SAME sub-sample T3 uses. Only the flag-toggled arm is a new cell -- the default
 *       arm for the same (technique, level) pair is already in T1's data (T3/T4's sample is a strict
 *       subset of T1's), so results join against T1 rather than duplicating a control run.
 *
 * Budget math (calibrated 2026-08-19 from 6 real method-probe runs at 50,000,000 nodes -- see
 * reports/2026-08-19-technique-census-design.md): dfs/ida/repair techniques that run to the node
 * cap cost ~35s; a single beam config run in isolation (no ladder restarts feeding it) very often
 * EXHAUSTS its own frontier far below the cap (observed 29K-395K nodes, 1-5s) and occasionally runs
 * the full cap (~150-200s, per a production beam5000 win recorded earlier this session) -- blended
 * ~45s/cell average. Sized so the total workload fits comfortably under GitHub Actions' 360-minute
 * per-job hard ceiling across 60 shards (~4.9h/shard average, ~18% margin) with a per-shard wall-
 * clock safety wrapper as the belt-and-suspenders backstop (see the workflow).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/build-technique-census-plan.mjs -- \
 *     --baseline=reports/stress/capability-runs/31918095910/summary.json \
 *     --out=/tmp/technique-census-plan.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const BASELINE_FILE = args.get('--baseline') || 'reports/stress/capability-runs/31918095910/summary.json';
const OUT_FILE = args.get('--out') || 'reports/stress/technique-census-plan.json';
const SEED = Number(args.get('--seed') || 20260819);
const T1_SAMPLE_SIZE = Number(args.get('--t1-sample-size') || 600);
const T3T4_SAMPLE_SIZE = Number(args.get('--t3t4-sample-size') || 200);
const T1_NODE_BUDGET = Number(args.get('--t1-node-budget') || 50000000);
const T2_NODE_BUDGET = Number(args.get('--t2-node-budget') || 1000000);
const T3_NODE_BUDGET = Number(args.get('--t3-node-budget') || 50000000);
const T4_NODE_BUDGET = Number(args.get('--t4-node-budget') || 50000000);
// Per-attempt wall-clock cap passed to runAttempt -- a belt-and-suspenders backstop alongside the
// node budget (mirrors method-probe.mjs's own --budget-ms). Generous: the node budget is what's
// meant to bind in the overwhelming majority of cells.
const ATTEMPT_BUDGET_MS = Number(args.get('--attempt-budget-ms') || 600000);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/Solver.js');
// getAttemptConfigs, not getConfiguredAttemptConfigs: the latter additionally applies
// applyAttemptConfigOptions (ablation filtering/reordering), which is a no-op for a null cfg
// (`if (!cfg) return baseConfigs;`) -- equivalent here, and getAttemptConfigs is the one exposed on
// SOLVER_TESTING_API.
const { getAttemptConfigs, attemptConfigKey } = SOLVER_TESTING_API;
const Solver = createSolver();

// ─── Deterministic PRNG (mulberry32) -- reproducible sampling without an external dependency ──────
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededShuffle(arr, rng) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// ─── Load the 3 real corpora + the frozen capability baseline ─────────────────────────────────────
const CORPORA = [
    { name: 'published', file: 'data/levels.json' },
    { name: 'corpus1', file: 'data/stress/stress-levels.json' },
    { name: 'corpus2', file: 'data/stress/stress-levels-random.json' },
];

const baseline = JSON.parse(readFileSync(path.resolve(BASELINE_FILE), 'utf8'));
const solvedIds = {
    corpus1: new Set(baseline.corpus1?.solvedIds ?? []),
    corpus2: new Set(baseline.corpus2?.solvedIds ?? []),
};

const corpusLevels = {}; // name -> array of { pos, id, raw }
for (const { name, file } of CORPORA) {
    const raw = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const levels = Array.isArray(raw) ? raw : raw.levels;
    corpusLevels[name] = levels.map((entry, i) => ({ pos: i + 1, id: entry.id ?? null, raw: entry }));
}

function isSolved(corpusName, id) {
    if (corpusName === 'published') return true; // solver:bench --check invariant: always 160/160
    return solvedIds[corpusName].has(id);
}

// ─── T1's technique-key universe: derived LIVE from the real ladder generator, not hardcoded ──────
// Self-updating if getAttemptConfigs's routing/config set ever changes -- this is what "every
// available technique" means in a grounded sense (every config the production ladder can actually
// generate for SOME level in the real corpora), not a synthetic profile x template x width
// cross-product that includes combinations the ladder never produces.
const techniqueKeySet = new Set();
for (const name of Object.keys(corpusLevels)) {
    for (const { raw } of corpusLevels[name]) {
        const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        for (const c of getAttemptConfigs(level, null)) techniqueKeySet.add(attemptConfigKey(c));
    }
}
const ALL_TECHNIQUE_KEYS = [...techniqueKeySet].sort();

// ─── T1 sample: all currently-unsolved corpus-1 levels + a seeded sample of corpus-2's ────────────
const c1Unsolved = corpusLevels.corpus1.filter(l => !isSolved('corpus1', l.id));
const c2Unsolved = corpusLevels.corpus2.filter(l => !isSolved('corpus2', l.id));
const rng = mulberry32(SEED);
const c2UnsolvedShuffled = seededShuffle(c2Unsolved, rng);
const t1Budget = Math.max(0, T1_SAMPLE_SIZE - c1Unsolved.length);
const t1Sample = [
    ...c1Unsolved.map(l => ({ corpus: 'corpus1', ...l })),
    ...c2UnsolvedShuffled.slice(0, t1Budget).map(l => ({ corpus: 'corpus2', ...l })),
];

// T3/T4 sample: a seeded subset of T1's OWN sample (not a fresh draw) -- guarantees every (level,
// technique) pair T3/T4 touches already has its default-flag/single-technique baseline in T1's
// results, so the combine step can join rather than needing a redundant control cell.
const t3t4Sample = seededShuffle(t1Sample, mulberry32(SEED + 1)).slice(0, Math.min(T3T4_SAMPLE_SIZE, t1Sample.length));

// ─── T4's curated flag experiments ─────────────────────────────────────────────────────────────
// Each: a technique (or techniques) the flag is documented to affect, the ablation toggle, and a
// mechanical eligibility predicate over the RAW level so the run only spends budget where the flag
// can possibly matter. Picked for direct continuity with currently-open threads in
// docs/solver-opt-in-experiment-ledger.md / docs/solver-optimization-current-queue.md rather than
// an unconstrained flag x technique cross-product.
const FLAG_EXPERIMENTS = [
    {
        name: 'mc-neighbor-budget-off',
        disable: ['PRUNE_MC_NEIGHBOR_BUDGET'],
        techniqueKeys: ['beam:mustCrossFirst@beam2000', 'dfs:mustCrossFirst'],
        eligible: raw => (raw.mustCross?.length ?? 0) > 0,
        note: 'Extends the 2026-08-19 STRATEGY_MC_NEIGHBOR_BUDGET_RETRY investigation (2 confirmed targets) to full coverage over the sample’s must-cross levels.',
    },
    {
        name: 'connectivity-axis-exhausted-off',
        disable: ['PRUNE_CONNECTIVITY_AXIS_EXHAUSTED'],
        techniqueKeys: ['beam:intersectionHarvest@beam5000', 'beam:objectiveFirst@beam5000'],
        eligible: () => true,
        note: 'Extends the R02248/R02114/R00592 regression-mining (2026-08-15) beyond the ~215 provenance-mined candidates to a fresh, unbiased sample.',
    },
    {
        name: 'repair-turn-bias-on',
        enable: ['STRATEGY_REPAIR_TURN_BIAS'],
        techniqueKeys: ['dfs:repair:repair(turnBiased)'],
        eligible: raw => (raw.landmarks ?? []).some(l => typeof l.role === 'string' && l.role.startsWith('mustTurn')),
        note: 'This technique key does not exist without the flag -- no default-arm baseline to join against; the cell itself is the whole answer to "does this variant ever win here."',
    },
    {
        name: 'dedup-near-tie-retention-off',
        disable: ['STRATEGY_DEDUP_NEAR_TIE_RETENTION'],
        techniqueKeys: ['beam:intersectionHarvest@beam5000', 'beam:objectiveFirst@beam5000'],
        eligible: () => true,
        note: 'Isolated single-technique read on the mechanism a full-corpus GHA A/B already found net -7/+27 at the ladder level (2026-08-15) -- a different vantage on the same regression.',
    },
    {
        name: 'portal-parity-envelope-on',
        enable: ['PRUNE_PORTAL_PARITY_ENVELOPE'],
        techniqueKeys: ['dfs:portalFirstTransfer', 'dfs:portalCommitted'],
        eligible: raw => (raw.portals?.length ?? 0) > 0,
        note: 'Closed-negligible at the ladder level (2026-08-08, zero rejects over ~240M nodes) -- checks whether isolation changes that reading.',
    },
    {
        name: 'archetype-routing-off',
        disable: ['STRATEGY_ARCHETYPE_ROUTING'],
        techniqueKeys: ['dfs:default'],
        eligible: () => true,
        note: 'Isolates the catch-all fallback config from the feature-routing that normally surrounds it.',
    },
];

// ─── T3's curated complementary pairs ───────────────────────────────────────────────────────────
// Each pair shares ONE budget (method-probe.mjs's own --only=A,B semantics: cumulative across the
// list) -- same cost shape as a single T1 cell, not double. Picked to contrast mechanically
// different approaches to the same archetype (DFS vs. beam vs. admissible-order under the same
// profile emphasis), not an exhaustive cross-product.
const TECHNIQUE_PAIRS = [
    ['dfs:objectiveFirst', 'beam:objectiveFirst@beam5000(diverse)'],
    ['dfs:mustCrossFirst', 'ida:mustCrossFirst'],
    ['dfs:perimeterSweep/cornerHarvest', 'beam:perimeterSweep/perimeterCW@beam2000'],
    ['beam:intersectionHarvest@beam5000', 'beam:intersectionHarvest@beam5000(diverse)'],
    ['dfs:repair:repair', 'dfs:repair:repair(mustTurnBiased)'],
    ['ida:default', 'ida:none'],
    ['dfs:harvestThenFinish', 'beam:harvestThenFinish@beam2000'],
    ['dfs:knotBuilder', 'beam:knotBuilder@beam2000'],
    ['dfs:nearClosureRescue', 'ida:nearClosureRescue'],
    ['dfs:portalFirstTransfer', 'dfs:portalCommitted'],
];
for (const pair of TECHNIQUE_PAIRS) for (const k of pair) {
    if (!ALL_TECHNIQUE_KEYS.includes(k)) throw new Error(`T3 pair references unknown technique key "${k}" -- not in the live-derived ALL_TECHNIQUE_KEYS list.`);
}
for (const exp of FLAG_EXPERIMENTS) for (const k of exp.techniqueKeys) {
    if (k.includes('(turnBiased)')) continue; // only reachable WITH its own flag -- can't appear in the live-derived default-ladder list
    if (!ALL_TECHNIQUE_KEYS.includes(k)) throw new Error(`T4 experiment "${exp.name}" references unknown technique key "${k}".`);
}

// ─── Build the flat cell list ───────────────────────────────────────────────────────────────────
// Interleaved (technique varies fastest within a tier) so any contiguous shard slice contains a
// representative mix of cheap (beam, often exhausts early) and expensive (dfs/ida/repair, usually
// runs to the node cap) cells -- balances per-shard wall-clock instead of clumping all-expensive or
// all-cheap cells into the same shard.
const cells = [];
let cellSeq = 0;
function pushCell(tier, level, techniqueKeys, nodeBudget, ablation, extra = {}) {
    cellSeq += 1;
    cells.push({
        cellId: `${tier}-${String(cellSeq).padStart(7, '0')}`,
        tier, corpus: level.corpus, levelPos: level.pos, levelId: level.id,
        techniqueKeys, nodeBudget, budgetMs: ATTEMPT_BUDGET_MS,
        ablation: ablation ?? null,
        ...extra,
    });
}

// T1: every technique x every T1-sample level, single technique per cell.
for (const level of t1Sample) for (const key of ALL_TECHNIQUE_KEYS) pushCell('T1', level, [key], T1_NODE_BUDGET, null);

// T2: every technique x every level in all 3 corpora, single technique per cell, small budget.
for (const name of Object.keys(corpusLevels)) {
    for (const l of corpusLevels[name]) {
        const level = { corpus: name, pos: l.pos, id: l.id };
        for (const key of ALL_TECHNIQUE_KEYS) pushCell('T2', level, [key], T2_NODE_BUDGET, null);
    }
}

// T3: every curated pair x the T3/T4 sample, both members sharing one budget.
for (const level of t3t4Sample) for (const pair of TECHNIQUE_PAIRS) pushCell('T3', level, pair, T3_NODE_BUDGET, null, { pairLabel: pair.join('+') });

// T4: every curated flag experiment x its mechanically-eligible subset of the T3/T4 sample.
for (const exp of FLAG_EXPERIMENTS) {
    const eligible = t3t4Sample.filter(l => exp.eligible(l.raw));
    for (const level of eligible) {
        const ablation = { enable: exp.enable ?? [], disable: exp.disable ?? [] };
        pushCell('T4', level, exp.techniqueKeys, T4_NODE_BUDGET, ablation, { flagExperiment: exp.name });
    }
}

const plan = {
    generatedAt: new Date().toISOString(),
    seed: SEED,
    baselineFile: BASELINE_FILE,
    baselineRunId: path.basename(path.dirname(path.resolve(BASELINE_FILE))),
    allTechniqueKeys: ALL_TECHNIQUE_KEYS,
    techniquePairs: TECHNIQUE_PAIRS,
    flagExperiments: FLAG_EXPERIMENTS.map(({ eligible: _eligible, ...rest }) => rest),
    population: {
        corpus1Unsolved: c1Unsolved.length,
        corpus2Unsolved: c2Unsolved.length,
        t1SampleSize: t1Sample.length,
        t3t4SampleSize: t3t4Sample.length,
        allCorporaLevels: Object.fromEntries(Object.entries(corpusLevels).map(([k, v]) => [k, v.length])),
    },
    tierCounts: Object.fromEntries(['T1', 'T2', 'T3', 'T4'].map(t => [t, cells.filter(c => c.tier === t).length])),
    totalCells: cells.length,
    cells,
};

mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(OUT_FILE), JSON.stringify(plan));
console.log(`technique-census plan: ${ALL_TECHNIQUE_KEYS.length} technique keys, ${cells.length} total cells`);
console.log(`  T1 (full budget, unsolved sample): ${plan.tierCounts.T1} cells (${t1Sample.length} levels x ${ALL_TECHNIQUE_KEYS.length} techniques)`);
console.log(`  T2 (breadth, all levels, small budget): ${plan.tierCounts.T2} cells`);
console.log(`  T3 (pairs): ${plan.tierCounts.T3} cells`);
console.log(`  T4 (flags): ${plan.tierCounts.T4} cells`);
console.log(`Written to ${OUT_FILE}`);
