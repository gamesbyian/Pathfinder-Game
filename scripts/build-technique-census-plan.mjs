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
 * WHAT THIS ANSWERS: "which technique, given the FULL ladder NODE budget to itself (not shared
 * across a ladder), solves or fails on this level — and how." This is technique-local DEPTH/capability
 * evidence, not equal-compute evidence across technique families: raw nodes have different canonical
 * work cost in DFS/beam/repair. Cross-technique scheduler pricing must use workSpent or a future
 * equal-work census mode. Three active tiers (T2 retired, see
 * below), each answering a different piece of that:
 *
 *   T1 (primary, full budget, FULL POPULATION): every technique the real ladder ever generates
 *       (derived live from getConfiguredAttemptConfigs across all 3 corpora, not a hardcoded/
 *       synthetic list) x EVERY level in all 3 real corpora -- solved AND unsolved, 1,962 levels, no
 *       sampling -- each at the full 50,000,000-node budget. This is THE decision-bearing tier for
 *       "can any single isolated technique crack a level the production ladder can't," AND (since
 *       2026-08-19's full-parity revision) the only tier capable of catching a technique/flag
 *       combination that makes a level the ladder CURRENTLY solves newly fail in isolation -- exactly
 *       the shape of the PRUNE_CONNECTIVITY_AXIS_EXHAUSTED regression this run's own T1_PROMOTED_
 *       VARIANTS exist to test (see "T2 retired" below for why the original unsolved-only design
 *       couldn't see this failure mode at all).
 *   T2 -- RETIRED 2026-08-19, not reused as a tier letter (the same "gap kept, never reused"
 *       convention this codebase already applies to level/hint ids -- see CLAUDE.md's Level Stats
 *       section on P00153). Originally: every technique x every level in all 3 corpora at a small
 *       1,000,000-node budget, as a cheap breadth/redundancy fingerprint standing in for full
 *       population coverage T1 couldn't originally afford. Retired because (a) once T1 itself covers
 *       every level at the FULL budget, T2's cheap pass is strictly subsumed -- any signal it could
 *       show, T1's higher-fidelity data shows better, at zero marginal cost; (b) a real calibration
 *       check (8 solved Corpus-2 levels, non-winning techniques, full 50M budget) found 3 of 4
 *       successful solves needed 9-16M nodes -- an order of magnitude past T2's 1M cap -- meaning
 *       T2's own "near-duplicate"/"load-bearing" technique clustering on solved levels was likely
 *       measuring which techniques are cheap, not which are mechanistically redundant. Prompted by a
 *       direct question ("why only unsolved levels -- don't we need to see the effect on all levels
 *       to truly understand the results") that exposed both of these as real gaps, not just
 *       stylistic ones -- see reports/2026-08-19-technique-census-design.md's full-parity addendum.
 *   T3 (pairs): 10 curated, mechanically-complementary technique pairs (sharing ONE full budget,
 *       same cost shape as a single T1 cell) against a sub-sample of T1's own level pool -- answers
 *       "does trying A then B find something neither finds alone."
 *   T4 (flags): structural placeholder, currently empty -- see FLAG_EXPERIMENTS below. Every flag
 *       candidate that ever reached T1-scale evidence lives in T1_PROMOTED_VARIANTS instead, run
 *       against the full population directly rather than a smaller side-sample.
 *
 * Budget math (calibrated 2026-08-19 from 6 real method-probe runs at 50,000,000 nodes on unsolved
 * levels, plus 8 more on solved levels for the full-parity revision -- see
 * reports/2026-08-19-technique-census-design.md): dfs/ida/repair techniques that run to the node cap
 * cost ~35s regardless of solved/unsolved (a technique either finds the level's solution or it
 * doesn't -- solvedness of the LEVEL by some OTHER technique doesn't make a failing technique's own
 * search cheaper). A single beam config run in isolation (no ladder restarts feeding it) very often
 * EXHAUSTS its own frontier far below the cap (observed 29K-395K nodes, 1-5s) and occasionally runs
 * the full cap (~150-200s, per a production beam5000 win recorded earlier this session). The solved-
 * level calibration sample averaged modestly cheaper (~12.4s/cell vs ~18.3s/cell unsolved) but on
 * only 8 samples -- too little evidence to bank a cost discount on, so sizing below conservatively
 * uses the SAME calibrated rate for the whole population rather than assuming solved levels are
 * cheap. Sized so the total workload fits comfortably under GitHub Actions' 360-minute per-job hard
 * ceiling with a per-shard wall-clock safety wrapper as the belt-and-suspenders backstop (see the
 * workflow for the current shard count/margin, since the full-parity revision changed both).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/build-technique-census-plan.mjs -- \
 *     --baseline=reports/stress/capability-runs/31918095910/summary.json \
 *     --out=/tmp/technique-census-plan.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const BASELINE_FILE = args.get('--baseline') || 'reports/stress/capability-runs/31918095910/summary.json';
const OUT_FILE = args.get('--out') || 'reports/stress/technique-census-plan.json';
const SEED = Number(args.get('--seed') || 20260819);
// 'all' (the default, 2026-08-19 workers=2 revision): every currently-unsolved level in both real
// corpora, no sampling. Expressed as Infinity rather than a hardcoded population count (888 as of
// this baseline: 7 corpus-1 + 881 corpus-2) so a future baseline with a different unsolved count
// still gets full coverage without this file needing a matching edit. A numeric value still works
// for a smaller/faster test-drive run (local iteration, a quick plan-shape check).
const T1_SAMPLE_SIZE_ARG = args.get('--t1-sample-size');
const T1_SAMPLE_SIZE = (!T1_SAMPLE_SIZE_ARG || T1_SAMPLE_SIZE_ARG === 'all') ? Infinity : Number(T1_SAMPLE_SIZE_ARG);
const T3T4_SAMPLE_SIZE = Number(args.get('--t3t4-sample-size') || 200);
const T1_NODE_BUDGET = Number(args.get('--t1-node-budget') || 50000000);
const T3_NODE_BUDGET = Number(args.get('--t3-node-budget') || 50000000);
const T4_NODE_BUDGET = Number(args.get('--t4-node-budget') || 50000000);
// Per-attempt wall-clock cap passed to runAttempt -- a belt-and-suspenders backstop alongside the
// node budget (mirrors method-probe.mjs's own --budget-ms). Generous: the node budget is what's
// meant to bind in the overwhelming majority of cells.
const ATTEMPT_BUDGET_MS = Number(args.get('--attempt-budget-ms') || 600000);

const COMMIT_SHA = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
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

// ─── Provable-degeneracy eligibility gate (2026-08-19, per external review) ────────────────────────
// A cell is only worth spending budget on if the technique COULD mechanically behave differently
// from one already being tested. This is deliberately a narrow, code-verified list, not a general
// "unlikely to help" heuristic — a scoring PROFILE (mustCrossFirst, portalFirstTransfer, etc.)
// differs from `default` across MANY weight dimensions simultaneously (goalAttraction,
// perimeterBias, antiDither, ...), not just its namesake term, so it is NOT provably redundant on a
// level lacking that one feature — the other weight differences still produce genuinely different
// search trajectories, which is exactly the empirical question this census exists to answer rather
// than assume away. Pruning on that softer "probably not the best fit" judgment would silently hide
// the census's own most interesting possible finding (a technique winning outside its expected
// regime) — so it is deliberately NOT done here, only cells with a PROVEN, code-verified identical
// outcome are skipped.
//
// The one confirmed case: `dfs:repair:repair(mustTurnBiased)` layers a PURE ADDITIVE bias on top of
// ordinary repair (repair-search.ts) via a second, independently-seeded RNG stream (`rand2`) that is
// only ever CONSUMED when `ws.mustTurnMask !== 0` (repair-search.ts line ~359) — a bit that can never
// be set on a level with zero must-turn landmarks. The primary stream (`rand`) is seeded identically
// regardless of the bias flag. So on such a level the two searches are the SAME search, not just
// similar — verified empirically (not just read from the code) on 3 real solvable levels:
// nodesExpanded and the full solution path matched exactly (70/93/58 nodes, byte-identical paths).
// Gated the same way production's own getAttemptConfigs gates this exact config
// (`if (f.mustTurn > 0) configs = [...configs, repairMustTurnBiasedAttempt()]`) — this mirrors an
// eligibility constraint the ladder itself already enforces, not a new one invented for the census.
const TECHNIQUE_ELIGIBILITY = new Map([
    ['dfs:repair:repair(mustTurnBiased)', raw => (raw.landmarks ?? []).some(l => typeof l.role === 'string' && l.role.startsWith('mustTurn'))],
]);
function techniqueEligible(key, raw) {
    const check = TECHNIQUE_ELIGIBILITY.get(key);
    return !check || check(raw);
}

// ─── Priority levels: guaranteed T1 inclusion, not left to random draw ─────────────────────────────
// Relevant only when --t1-sample-size is a smaller test-drive number, not 'all' (the default) --
// 'all' already includes every level unconditionally, priority or not. Every Corpus-2 level
// individually named as still-open evidence in docs/future-work.md,
// docs/solver-optimization-current-queue.md, or docs/solver-heuristic-capability-gap-analysis.md,
// as of 2026-08-19 -- cross-checked against the frozen baseline so only genuinely still-unsolved
// ones are listed (most of this session's own named levels, e.g. R02248/R00156/R02960/R02114/
// R00592/R03148, have SINCE been solved by the STRATEGY_*_RETRY tiers promoted earlier this
// session, and are correctly excluded here). A random draw would likely include some of these
// anyway given a large enough sample, but "likely" isn't "guaranteed" -- these are the exact levels
// the open research threads are already asking about, so a full isolated-technique reading on them
// is close to the highest-value data this census can produce, and should not depend on a coin flip.
//   R02119, R02422 -- PRUNE_MC_NEIGHBOR_BUDGET's own two remaining unrecovered losses
//     (docs/solver-optimization-current-queue.md Priority 0 lineage; this session's own
//     STRATEGY_MC_NEIGHBOR_BUDGET_RETRY work). Already tested in isolation earlier this session
//     (confirmed recoverable/partially-recoverable) -- full T1 coverage (all 34 techniques, not just
//     the 2 already tried) is the natural completion of that investigation.
//   R02644 -- the ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE counter-example (needs 'default' to keep
//     13.2M of a 15M share; docs/solver-opt-in-experiment-ledger.md) -- still unsolved and still the
//     open half of that mechanism's double-edged-shape evidence.
// (Corpus-1's R00408 -- the STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET regression target,
// reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md -- needs no separate entry: ALL of
// Corpus-1's unsolved levels are already unconditionally in T1 below.)
const PRIORITY_LEVEL_IDS = new Set(['R02119', 'R02422', 'R02644']);

// ─── T1 sample: FULL POPULATION by default (2026-08-19 full-parity revision) -- every level in all
// 3 real corpora, solved and unsolved alike, no sampling. A numeric --t1-sample-size still draws a
// smaller test-drive sample: Corpus-1's unsolved levels + the priority levels are guaranteed in
// first (cheap: 10 levels total), the remainder is a seeded random draw from every OTHER level
// across all 3 corpora (previously drawn from corpus-2's unsolved population only -- broadened so a
// smaller sample still reflects the full solved+unsolved mix rather than skewing entirely unsolved).
const c1Unsolved = corpusLevels.corpus1.filter(l => !isSolved('corpus1', l.id));
const allLevelsFlat = Object.keys(corpusLevels).flatMap(name => corpusLevels[name].map(l => ({ corpus: name, ...l })));
const priorityLevels = allLevelsFlat.filter(l => l.corpus === 'corpus2' && PRIORITY_LEVEL_IDS.has(l.id));
const missingPriorityIds = [...PRIORITY_LEVEL_IDS].filter(id => !priorityLevels.some(l => l.id === id));
if (missingPriorityIds.length) {
    // Not fatal -- a priority id may not exist under this corpus file, which is itself useful
    // information, not a bug. Surfaced loudly so it's noticed rather than silently dropped.
    console.warn(`technique-census plan: priority level(s) not found in Corpus-2: ${missingPriorityIds.join(', ')}`);
}
const guaranteed = new Set([...c1Unsolved.map(l => `corpus1/${l.pos}`), ...priorityLevels.map(l => `corpus2/${l.pos}`)]);
const restLevels = allLevelsFlat.filter(l => !guaranteed.has(`${l.corpus}/${l.pos}`));
const rng = mulberry32(SEED);
const restShuffled = seededShuffle(restLevels, rng);
const t1Budget = Math.max(0, T1_SAMPLE_SIZE - c1Unsolved.length - priorityLevels.length);
const t1Sample = [
    ...c1Unsolved.map(l => ({ corpus: 'corpus1', ...l })),
    ...priorityLevels,
    ...restShuffled.slice(0, t1Budget),
];

// T3/T4 sample: a seeded subset of T1's OWN sample (not a fresh draw) -- guarantees every (level,
// technique) pair T3/T4 touches already has its default-flag/single-technique baseline in T1's
// results, so the combine step can join rather than needing a redundant control cell.
const t3t4Sample = seededShuffle(t1Sample, mulberry32(SEED + 1)).slice(0, Math.min(T3T4_SAMPLE_SIZE, t1Sample.length));

// ─── Flag classification (2026-08-19, per external design review) ─────────────────────────────────
// Ablation flags fall into three groups, treated differently rather than swept as an unconstrained
// flag x technique cross-product:
//   1. Production-default flags stay OFF the census entirely -- T1/T2's baseline `ablation: null`
//      already IS "production defaults," which is what "the canonical technique" should mean.
//   2. Known-complementary search-behavior flags -- ones with EXISTING evidence (from this session's
//      own work) that the toggle produces a genuinely different solve population on at least one real
//      level -- are promoted to T1_PROMOTED_VARIANTS below: full population, full budget, treated as
//      first-class portfolio members rather than a smaller side-experiment. A flag whose own
//      confirmed effect IS "this changes what a technique can solve" deserves the same fair shot
//      every other technique gets, not a token sub-sample.
//   3. Everything else -- exploratory flags with no such evidence, PLUS every budget-management/
//      orchestration flag (reserve fractions, late-tier reserves, retry-tier wrappers) -- either
//      doesn't matter here (an isolated single-technique cell has no ladder to allocate a reserve
//      against; STRATEGY_*_RETRY exists only to rerun a WHOLE ladder pass, meaningless outside one)
//      or hasn't earned T1-scale budget yet. What's left goes in FLAG_EXPERIMENTS below, at T4's
//      smaller sample.
// A flag already CLOSED NEGATIVE/NEGLIGIBLE at the ladder level with strong evidence the mechanism
// doesn't fire (PRUNE_PORTAL_PARITY_ENVELOPE: zero rejects over ~240M searched nodes,
// reports/2026-08-08-portal-parity-envelope.md) is not re-swept here at all -- isolation doesn't
// change whether a prune condition can fire, so this asks no materially new question. Reopen only
// with a formulation that's actually different, not a cleaner budget on the same one.
const T1_PROMOTED_VARIANTS = [
    { label: 'beam:mustCrossFirst@beam2000+mc-neighbor-budget-off', techniqueKey: 'beam:mustCrossFirst@beam2000', ablation: { enable: [], disable: ['PRUNE_MC_NEIGHBOR_BUDGET'] }, eligible: raw => (raw.mustCross?.length ?? 0) > 0 },
    { label: 'dfs:mustCrossFirst+mc-neighbor-budget-off', techniqueKey: 'dfs:mustCrossFirst', ablation: { enable: [], disable: ['PRUNE_MC_NEIGHBOR_BUDGET'] }, eligible: raw => (raw.mustCross?.length ?? 0) > 0 },
    { label: 'beam:intersectionHarvest@beam5000+connectivity-axis-exhausted-off', techniqueKey: 'beam:intersectionHarvest@beam5000', ablation: { enable: [], disable: ['PRUNE_CONNECTIVITY_AXIS_EXHAUSTED'] }, eligible: () => true },
    { label: 'beam:objectiveFirst@beam5000+connectivity-axis-exhausted-off', techniqueKey: 'beam:objectiveFirst@beam5000', ablation: { enable: [], disable: ['PRUNE_CONNECTIVITY_AXIS_EXHAUSTED'] }, eligible: () => true },
    { label: 'beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off', techniqueKey: 'beam:intersectionHarvest@beam5000', ablation: { enable: [], disable: ['STRATEGY_DEDUP_NEAR_TIE_RETENTION'] }, eligible: () => true },
    { label: 'beam:objectiveFirst@beam5000+dedup-near-tie-retention-off', techniqueKey: 'beam:objectiveFirst@beam5000', ablation: { enable: [], disable: ['STRATEGY_DEDUP_NEAR_TIE_RETENTION'] }, eligible: () => true },
    // dfs:repair:repair(turnBiased) does not exist without its own flag -- there is no default-arm
    // baseline to promote FROM; it's included here anyway (rather than left at T4's smaller sample)
    // because it's a genuine, cheap, distinct algorithmic variant per point 1's own framing, not
    // because a toggle comparison is meaningful for it specifically.
    //
    // ablation: null, NOT { enable: ['STRATEGY_REPAIR_TURN_BIAS'] } -- verified 2026-08-19 that the
    // flag is inert here regardless: attempt-dispatch.ts reads `repairTurnBiased` straight off the
    // AttemptConfig object (`!!repairTurnBiased`), which parseAttemptConfigKey already sets true from
    // the `(turnBiased)` marker in the key string itself, never consulting prep._cfg for it.
    // STRATEGY_REPAIR_TURN_BIAS only gates whether attempts.ts's getAttemptConfigs ADDS this config to
    // a ladder's list -- a routing decision this census never makes (it constructs the config
    // directly and calls runAttempt). Setting it would have implied the toggle does something here;
    // it doesn't, so it's omitted rather than left in as misleading decoration.
    { label: 'dfs:repair:repair(turnBiased)', techniqueKey: 'dfs:repair:repair(turnBiased)', ablation: null, eligible: raw => (raw.landmarks ?? []).some(l => typeof l.role === 'string' && l.role.startsWith('mustTurn')) },
];

// ─── T4's remaining curated flag experiments (smaller sample -- exploratory, not yet evidenced) ────
// Empty as of 2026-08-19: the one candidate here, STRATEGY_ARCHETYPE_ROUTING off (testing dfs:default
// as the catch-all fallback in isolation), was found and REMOVED after a direct architectural check,
// not a soft judgment call -- that flag is read ONLY inside attempts.ts's getAttemptConfigs, which
// decides which configs a LADDER routes to. This census never calls getAttemptConfigs; every cell
// constructs its AttemptConfig directly and calls runAttempt. So the toggle is not merely unlikely to
// matter here, it is PROVABLY inert on every cell it would have generated -- verified by tracing every
// read site of the flag (grep across modules/solver/*.ts) and confirming none of them sit in the
// runAttempt/attempt-dispatch.ts/dfsFromGate/beamSearchFromGate/repairSearchFromGate/prune-gauntlet.ts
// call graph this census actually exercises. Left as an empty list (not deleted structurally) so a
// FUTURE flag confirmed to be read from prep._cfg inside that call graph has a place to go, and so
// the "what belongs in group 3 but hasn't earned a slot yet" framing above stays meaningful. See
// reports/2026-08-19-technique-census-design.md's "Is anything else provably wasted" section for the
// full writeup, including the general check this failure mode implies: EVERY flag promoted anywhere
// in this file must be traced to a live prep._cfg read inside the actual search functions
// (search.ts/prune-gauntlet.ts/topology.ts/repair-search.ts), not merely "the flag exists and sounds
// relevant" -- the three flags in T1_PROMOTED_VARIANTS above were re-verified against exactly this
// standard the same day this was found, and all three passed.
const FLAG_EXPERIMENTS = [];

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
for (const variant of T1_PROMOTED_VARIANTS) {
    if (variant.techniqueKey.includes('(turnBiased)')) continue;
    if (!ALL_TECHNIQUE_KEYS.includes(variant.techniqueKey)) throw new Error(`T1 promoted variant "${variant.label}" references unknown technique key "${variant.techniqueKey}".`);
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

// T1: every technique x every T1-sample level, single technique per cell, PLUS every promoted
// flag variant restricted to the levels where its flag can mechanically matter (see
// T1_PROMOTED_VARIANTS's own comment above for why these get full T1 treatment rather than a
// smaller side-sample).
for (const level of t1Sample) {
    for (const key of ALL_TECHNIQUE_KEYS) {
        if (techniqueEligible(key, level.raw)) pushCell('T1', level, [key], T1_NODE_BUDGET, null);
    }
    for (const variant of T1_PROMOTED_VARIANTS) {
        if (variant.eligible(level.raw)) pushCell('T1', level, [variant.techniqueKey], T1_NODE_BUDGET, variant.ablation, { variantLabel: variant.label });
    }
}

// T2 retired 2026-08-19 -- see the file header's "T2 -- RETIRED" entry. T1 above now covers every
// level T2 used to (published + corpus1 + corpus2, solved and unsolved) at the full budget instead
// of a 1,000,000-node breadth pass, so a separate cheap tier would be pure redundant compute.

// T3: every curated pair x the T3/T4 sample, both members sharing one budget. Skipped whenever ANY
// member is TECHNIQUE_ELIGIBILITY-ineligible for this level: a pair with a provably-inert member
// degenerates to testing only the other member (method-probe's shared-budget semantics mean the
// ineligible member never gets any real nodes once the eligible one has run) -- pure duplicate
// compute with T1's own cell for that same (level, technique), not a genuine pair test. The only
// pair this currently affects is dfs:repair:repair + dfs:repair:repair(mustTurnBiased) on
// zero-must-turn levels.
for (const level of t3t4Sample) for (const pair of TECHNIQUE_PAIRS) {
    if (pair.every(k => techniqueEligible(k, level.raw))) pushCell('T3', level, pair, T3_NODE_BUDGET, null, { pairLabel: pair.join('+') });
}

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
    budgetProtocol: 'technique-local-node-depth',
    equalCostAcrossTechniques: false,
    costSemantics: 'node budgets measure within-technique depth/capability; use canonical workSpent for cross-technique allocation',
    commitSha: COMMIT_SHA,
    seed: SEED,
    baselineFile: BASELINE_FILE,
    baselineRunId: path.basename(path.dirname(path.resolve(BASELINE_FILE))),
    allTechniqueKeys: ALL_TECHNIQUE_KEYS,
    techniquePairs: TECHNIQUE_PAIRS,
    t1PromotedVariants: T1_PROMOTED_VARIANTS.map(({ eligible: _eligible, ...rest }) => rest),
    flagExperiments: FLAG_EXPERIMENTS.map(({ eligible: _eligible, ...rest }) => rest),
    population: {
        corpus1Unsolved: c1Unsolved.length,
        priorityLevels: priorityLevels.length,
        t1SampleSize: t1Sample.length,
        t3t4SampleSize: t3t4Sample.length,
        allCorporaLevels: Object.fromEntries(Object.entries(corpusLevels).map(([k, v]) => [k, v.length])),
    },
    // T2 intentionally absent -- retired 2026-08-19, gap kept rather than reused (see file header).
    tierCounts: Object.fromEntries(['T1', 'T3', 'T4'].map(t => [t, cells.filter(c => c.tier === t).length])),
    totalCells: cells.length,
    cells,
};

mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(OUT_FILE), JSON.stringify(plan));
console.log(`technique-census plan: ${ALL_TECHNIQUE_KEYS.length} technique keys, ${cells.length} total cells`);
console.log(`  T1 (full budget, FULL population -- solved + unsolved): ${plan.tierCounts.T1} cells (${t1Sample.length} levels x ${ALL_TECHNIQUE_KEYS.length} techniques)`);
console.log(`  T3 (pairs): ${plan.tierCounts.T3} cells`);
console.log(`  T4 (flags): ${plan.tierCounts.T4} cells`);
console.log(`Written to ${OUT_FILE}`);
