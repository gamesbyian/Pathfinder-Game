import { PORTFOLIO_EXPERIMENT } from '../../data/config/portfolio-experiment.js';
import { getConfiguredAttemptConfigs, ATTRACTION_DIVERSITY_CANDIDATE_FLAGS } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { repairPrimarySeed } from './repair-search.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit } from './types.js';

type YieldFn = (() => Promise<void>) | null;
interface PortfolioExperimentDefinition {
    pass1Ms: number;
    pass2Ms: number;
    pass3Ms: number;
    pass2Configs: ReadonlySet<string>;
    pass3Configs: ReadonlySet<string>;
    conditionalPasses?: ReadonlyArray<{
        passNumber: number;
        capMs: number;
        configs: ReadonlySet<string>;
        when: {
            minReqInt?: number;
            minMustPass?: number;
            minMustCross?: number;
            minMustTurn?: number;
            minPortals?: number;
            minFlippingFilters?: number;
        };
    }>;
}
/** One recorded attempt's metadata. */
interface Attempt {
    gateKey: number; profile: string; template: string | null; beamWidth: number | null;
    ok: boolean; elapsedMs: number; allocatedBudgetMs: number;
    passNumber?: number; configKey?: string; restart?: boolean; schedulerPhase?: 'portfolio' | 'fallback';
    /** Diagnostic-only passthrough of the originating AttemptConfig's dispatch flags — not read
     *  by any solving logic, purely so external tooling (stress benchmark, audits) can tell a
     *  diverse beam / repair attempt apart from a plain one without re-deriving it from profile
     *  name and beamWidth. */
    diverseBeam?: boolean;
    repair?: boolean;
    repairMustTurnBiased?: boolean;
    /** Diagnostic-only passthrough for the experimental turn-aware bias attempt (see
     *  AttemptConfig.repairTurnBiased) — lets tooling tell it apart from an ordinary repair attempt.
     *  Not read by any solving logic. */
    repairTurnBiased?: boolean;
    /** Repair attempts only, diagnostic-only (see runRepairProbe's multi-seed retry) — absent
     *  (equivalent to 0) for the first, ordinary-seed round; present and nonzero only for a retry
     *  round reached after every active gate already failed at every earlier seed. Not read by
     *  any solving logic, purely so external tooling can tell a retry-round win apart from an
     *  ordinary one without re-deriving it from attempt order. */
    seedSalt?: number;
    /** Repair attempts only: the exact uint32 seed this attempt's randomized local search ran with
     *  (repairPrimarySeed(gateKey, seedSalt), repair-search.ts). Recorded so a fast randomized find
     *  is reproducible — the seed that drove it, which hint provenance would otherwise lose (a
     *  repair solve is not deterministic across seeds). Absent for deterministic dfs/beam attempts. */
    randomSeed?: number;
    /** Diagnostic-only, read by external tooling — not read by any solving logic. */
    nodesExpanded?: number;
    /** Failure-only: true if this attempt's search ran out of its own budget, false if it
     *  genuinely exhausted every avenue it tried within budget (dfsFromGateLDS/beamSearchFromGate
     *  distinguish these internally already; repairSearchFromGate has no exhaustion state of its
     *  own, so this is always true when present for a repair attempt). Absent on success. */
    timedOut?: boolean;
    /** Repair attempts only, failure only: the lowest computeBadness() score any restart reached
     *  (repair-search.ts) — how close the closest near-miss got to a valid solution, tracked
     *  across the WHOLE search. Absent for non-repair attempts and for successful ones. */
    bestBadness?: number;
    /** DFS/beam attempts only, timed-out failures only: a ONE-SHOT computeBadness() snapshot of
     *  wherever the search happened to be when it ran out of budget (search.ts) — NOT a tracked
     *  best-ever minimum like bestBadness above, just a single sample. Absent for repair attempts
     *  (which report bestBadness instead), for successful attempts, and for attempts that
     *  genuinely exhausted their search space rather than timing out. */
    finalBadness?: number;
    /** True only for attempts run by the 2026-07-16 attraction-diversity last-resort pass (see
     *  ATTRACTION_DIVERSITY_BUDGET_FRACTION below) — diagnostic-only passthrough, same pattern as
     *  `repair`/`repairMustTurnBiased` above, so external tooling and tests can tell these attempts
     *  apart from an ordinary main-loop attempt using the exact same config without re-deriving it
     *  from attempt order/count. Not read by any solving logic. */
    attractionDiversity?: boolean;
    /** Diagnostic-only passthrough for the admissible-order-search.ts prototype (see
     *  AttemptConfig.admissibleOrder) — not read by any solving logic, purely so external tooling
     *  (scripts/method-probe.mjs) can tell it apart from an ordinary DFS attempt. */
    admissibleOrder?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderNoTieBreak — lets tooling tell
     *  a no-tie-break admissible-order winner apart from a profile-tie-broken one. Not read by any
     *  solving logic. */
    admissibleOrderNoTieBreak?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderLds — lets tooling tell an
     *  LDS-wrapped admissible-order winner apart from the plain unbounded search. Not read by any
     *  solving logic. */
    admissibleOrderLds?: boolean;
}
interface AttemptResult { path: number[] | null; attempt: Attempt; }
interface SearchResult { solution: number[] | null; attempts: Attempt[]; }
interface SolveOpts {
    timeBudgetMs?: number | string;
    yieldFn?: (() => Promise<void>);
    ablation?: AblationConfig | null;
    forcedFirstStepKey?: number | null;
    forcedPortalExitKey?: ForcedPortalExit | null;
    /** Optional, in ADDITION to timeBudgetMs (never a substitute — every existing timeBudgetMs
     *  check and budget-share computation is completely untouched). Infinity (default) preserves
     *  prior behavior exactly for every existing caller. Offline tooling only (the level reducer,
     *  docs/solver-dev-tooling-plan.md Component G): a deterministic, machine-speed-independent
     *  cap so re-verifying a shrink candidate doesn't depend on wall-clock timing, which this
     *  session's own CPU-contention findings showed is unreliable in throttled environments. Not
     *  set by normal play/solve.
     *
     *  PRECISION CAVEAT: enforcement is fine-grained (2026-07-23) — every search primitive now
     *  self-limits against the remaining budget: the repair probe/fallback by round, and beam/DFS
     *  main-loop attempts mid-search (beam at phase boundaries + every 256 frontier nodes, DFS every
     *  256 nodes). So overshoot is bounded by ~one check interval (tens to a few hundred nodes),
     *  NOT by a whole attempt's or the repair probe's internal ceiling the way it was before this
     *  was threaded through beam/DFS. The one remaining coarse case: the repair probe still bounds
     *  each seed-salt ROUND (up to REPAIR_PROBE_BIASED_NODE_BUDGET, 6,000,000) rather than mid-round,
     *  so a budget below a single biased round's cost can still overshoot by up to that round. */
    nodeBudget?: number;
    schedulerMode?: 'legacy' | 'portfolio-experiment';
    portfolioExperiment?: PortfolioExperimentDefinition;
    /** Overrides REPAIR_EXTRA_BUDGET_FRACTION for this solve only — offline batch tooling's cost
     *  control (see docs/solver-architecture.md's cost-gotcha note). A DEDICATED top-level option,
     *  deliberately NOT an ablation flag: every existing ablation-gated strategy toggle in this
     *  file and repair-search.ts checks `(!cfg || cfg.STRATEGY_X)` — "no ablation config at all"
     *  is the only way those default enabled, so passing ANY ablation object, even a sparse one
     *  that only sets an unrelated field, silently disables every OTHER unset strategy flag
     *  (STRATEGY_GATE_INTERLEAVING, STRATEGY_MIN_BUDGET_FLOOR, STRATEGY_ADAPTIVE_GATE_BUDGET,
     *  STRATEGY_REPAIR_PROBE, and repair-search.ts's stagnation-burst/elite-splice flags). This
     *  bug shipped once already (this field was originally REPAIR_BUDGET_FRACTION_OVERRIDE inside
     *  `ablation`) and silently broke every solve that used it — caught via a cross-check against
     *  scripts/solver-parallel/race.mjs, not by the original change's own testing, since that
     *  testing happened to only exercise levels that were going to stay unsolved either way. Fixed
     *  by moving it out of `ablation` entirely, same as `nodeBudget` above. Undefined (every
     *  existing/production caller) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly. */
    repairBudgetFractionOverride?: number;
    /** Overrides ATTRACTION_DIVERSITY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as repairBudgetFractionOverride above, and for the same reason (NOT
     *  an ablation flag). Deliberately a SEPARATE override from repairBudgetFractionOverride, not
     *  reusing it: they gate two independently-costed extensions (repair's iterated-local-search
     *  retry loop vs. this pass's single fixed-budget ladder rerun), and a batch-tooling caller may
     *  legitimately want one without the other — e.g. testing/calibrating THIS mechanism cheaply
     *  requires disabling repair's 6x extension (repairBudgetFractionOverride: 0) while still
     *  letting this pass run at its normal size, which an earlier version of this field (gating
     *  the pass on repairBudgetFraction > 0 instead of its own override) made impossible: a solver-
     *  testing sweep trying to isolate this pass's own contribution ended up re-triggering the full
     *  6x repair extension too, reintroducing exactly the multi-minute-per-level cost this
     *  session's repair-budget-fraction policy (docs/solver-architecture.md) was written to avoid
     *  in solver-testing workflows. Undefined (production default, and solver-controller.ts /
     *  review-controller.ts's interactive call sites) preserves ATTRACTION_DIVERSITY_BUDGET_
     *  FRACTION exactly. */
    attractionDiversityBudgetFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape and rationale as the two overrides above (NOT an ablation flag, a
     *  THIRD independently-costed extension a batch-tooling caller may want to isolate). Undefined
     *  (production default, and solver-controller.ts/review-controller.ts's interactive call sites)
     *  preserves ADMISSIBLE_ORDER_BUDGET_FRACTION exactly. */
    admissibleOrderBudgetFractionOverride?: number;
    /** Convenience for offline batch tooling: sets repairBudgetFractionOverride,
     *  attractionDiversityBudgetFractionOverride, AND admissibleOrderBudgetFractionOverride all to 0
     *  (purely additive — an explicit value on any individual override still wins over this, so a
     *  caller can still isolate one extension's cost while suppressing the others via this flag).
     *  Exists because the individual overrides were deliberately kept separate (see
     *  attractionDiversityBudgetFractionOverride's own comment for why — a solver-testing sweep
     *  legitimately wants to disable just one of them sometimes), which means "no extra-budget-pass
     *  cost, period" requires remembering every one of them — documented in CLAUDE.md's
     *  solver-architecture gotchas as something "a future new batch tool needs to wire up... from
     *  the start, not just the historically-older repair one" (a warning this field's own addition
     *  for the admissible-order tier is a direct instance of — see that tier's own comment). This
     *  flag makes the common "suppress every extra-budget pass" case a single boolean instead of an
     *  N-field combo a caller has to remember and update every time a new pass is added, without
     *  removing the fine-grained escape hatch. Undefined (every existing caller) is a no-op — every
     *  underlying override resolves exactly as before this flag existed. */
    disableExtraBudgetPasses?: boolean;
    /** Winner-first pre-attempt (offline re-verify tooling only). Names one (configKey, gateKey)
     *  pair — from a compiled baseline's recorded winner — to try as a SINGLE attempt before the
     *  normal probe/ladder. `configKey` is matched against this level's own configured attempt list
     *  via attemptConfigKey (so the full config object, including its template/diverseBeam, is
     *  recovered from the current code, not reconstructed from the lossy baseline record); a miss
     *  (key no longer present, gate not active, or the attempt doesn't solve) falls straight through
     *  to the full flow below, having spent at most this one bounded attempt. Its `nodeBudget`
     *  bounds the miss cost (the winner, if the relevant code is unchanged, hits well under it);
     *  omitted, the prime shares the solve's own nodeBudget. VERDICT NOTE: this preserves the
     *  SOLVABILITY verdict, not cold-search ORDERING — a level whose recorded winner still solves
     *  but whose cold ladder no longer reaches it first is reported solved here where a cold run
     *  would not, so this is opt-in and only for "does the known solution still hold" runs, NEVER
     *  cold solver-capability benchmarking. Undefined (every production/normal caller) is a no-op.
     *  `seedSalt`: only meaningful when the matched config is a repair attempt (ignored otherwise —
     *  runAttemptSearch's seedSalt param has no effect on beam/DFS). repairSearchFromGate seeds its
     *  PRNG from repairPrimarySeed(gateKey, seedSalt), so a repair winner's solve is salt-dependent;
     *  the baseline's recorded winning attempt carries the exact salt it used (Attempt.seedSalt,
     *  absent/0 by convention — see its own field comment), so passing that through here replays the
     *  ACTUAL winning search, not just salt 0. Omitted (undefined), the prime uses salt 0 — the
     *  right default for a first-run baseline that predates this field, but a false-miss risk for a
     *  repair winner whose real salt was nonzero. */
    primeAttempt?: { gateKey: number; configKey: string; nodeBudget?: number; seedSalt?: number };
}
interface SolveResult { ok: boolean; status: string; solution: number[] | null; solutions: number[][]; attempts: Attempt[]; totalMs: number; nodesExpanded: number; nodeBudgetReached?: boolean; solvedByPrime?: boolean; schedulerMode?: 'legacy' | 'portfolio-experiment'; portfolio?: { solvedBeforeFallback: boolean; fallbackAttemptCount: number; repeatedAttemptElapsedMs: number; repeatedPrefixNodeUpperBound: number; runtimeBreakdown?: { prepMs: number; portfolioAttemptSearchMs: number; schedulerOverheadMs: number; fallbackSearchMs: number; totalMs: number; }; }; }

export function getTrapSpotBudgetMs(level: NormalizedLevel): number {
    const area = (level.grid?.w || 0) * (level.grid?.h || 0);
    const special = (level.mustPassKeys?.length || 0) + (level.mustCrossKeys?.length || 0) +
        (level.portalMap?.size || 0) + (level.filterMap?.size || 0) +
        (level.flippingFilterMap?.size || 0);
    // The search runs a full DFS per gate and splits the budget across them, so the
    // search-dependent cost scales with gate count — otherwise an N-gate level gets
    // the same budget as a 1-gate level of equal size and times out mid-sweep,
    // silently dropping every gate after the first.
    // Coefficients are sized for the off-thread (Web Worker) search: the sweep no
    // longer blocks interaction, so the budget errs toward complete enumeration —
    // the old main-thread values timed out on typical mid-size levels.
    const gates = Math.max(1, level.gateKeys?.length || 1);
    const perGateCost = area * 45 + (level.reqLen || 0) * 120 + special * 360;
    return Math.min(120000, Math.max(10000, 5000 + perGateCost * gates));
}

export function getActiveGates(level: NormalizedLevel, gateKeys: number[], cfg: AblationConfig | null): number[] {
    if (level.portalMap.size !== 0 || (cfg && !cfg.STRATEGY_PARITY_GATE_FILTER)) return gateKeys;

    const goalP = keyParity(level.goalKey);
    const feasible = gateKeys.filter(gk => (keyParity(gk) ^ goalP ^ (level.reqLen & 1)) === 0);
    return feasible.length > 0 ? feasible : gateKeys;
}

// nodeBudget/nodesOut: optional, repair-only (see runRepairProbe) — a deterministic,
// machine-speed-independent cap used ONLY by the early repair probe so its win/loss decision
// depends on work done, not wall-clock luck under contention (see docs/solver-architecture.md's
// "Wall-clock-gated search probes" section). Infinity/null preserve prior ms-only behavior
// exactly for every other caller (the main ladder, the full-budget repair fallback).
//
// Exported (also added to SOLVER_TESTING_API) so offline tooling can run ONE attempt config
// against ONE gate directly, bypassing getAttemptConfigs/the probe/the fallback loop entirely —
// see scripts/method-probe.mjs. Every production caller (this file's own main loop, repair probe,
// fallback loop) is unaffected by the export; it's the same function, called the same way.
export async function runAttempt(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel,
    attemptConfig: AttemptConfig, attBudget: number, attStart: number, yieldFn: YieldFn,
    nodeBudget = Infinity, nodesOut: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number; finalBadness?: number } | null = null,
    // Repair-only (see runRepairProbe's multi-seed retry) — additively XORed into
    // repairSearchFromGate's own gate-derived PRNG seed (repair-search.ts), so a retry round
    // samples a genuinely different randomized search trajectory over the exact same level/gate
    // instead of repeating byte-for-byte the same (possibly unlucky) run. 0 (default, every
    // caller but the retry round) is a no-op — behavior is byte-for-byte unchanged from before
    // this parameter existed. No effect on beam/DFS (they don't take a seedSalt at all).
    seedSalt = 0,
): Promise<AttemptResult> {
    const { profileName, template, beamWidth, diverseBeam, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
    const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
    // Always non-null internally so every branch below can report through the same object,
    // whether or not the caller supplied one (runRepairProbe passes its own, to also read
    // nodesExpanded back for its cross-gate node-budget accounting; ordinary callers don't).
    const searchOut = nodesOut ?? {};
    const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
    let path: number[] | null = null;
    try {
        path = await runAttemptSearch(attemptConfig, gateKey, level, prep, profile, attBudget, attStart, yieldFn, nodeBudget, searchOut, seedSalt);
    } catch (err) {
        if ((err as { message?: string })?.message === 'Solver:cancelled') throw err;
    }
    const attMs = Date.now() - attStart;
    const nodesAfter = prep._metrics ? prep._metrics.nodesExpanded : 0;
    return {
        path,
        attempt: {
            gateKey,
            profile: profileName,
            template: template?.id ?? null,
            beamWidth: beamWidth ?? null,
            ok: !!path,
            elapsedMs: attMs,
            allocatedBudgetMs: attBudget,
            nodesExpanded: nodesAfter - nodesBefore,
            ...(repair && seedSalt ? { seedSalt } : {}),
            ...(repair ? { randomSeed: repairPrimarySeed(gateKey, seedSalt) } : {}),
            ...(!path && searchOut.timedOut !== undefined ? { timedOut: searchOut.timedOut } : {}),
            ...(!path && Number.isFinite(searchOut.bestBadness) ? { bestBadness: searchOut.bestBadness } : {}),
            ...(!path && Number.isFinite(searchOut.finalBadness) ? { finalBadness: searchOut.finalBadness } : {}),
            ...(diverseBeam ? { diverseBeam: true } : {}),
            ...(repair ? { repair: true } : {}),
            ...(repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
            ...(repairTurnBiased ? { repairTurnBiased: true } : {}),
            ...(admissibleOrder ? { admissibleOrder: true } : {}),
            ...(admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        },
    };
}

/** Many-gate levels (≥ this) dilute budget across configs×gates faster than genuinely
 *  infeasible gates get pruned out (16 configs × 4 gates = 64 even slices on a 4-gate
 *  level — stress-corpus finding: S118). Deliberately 4, not 3: nodesExpanded is a noisy
 *  proxy (a structurally bushier dead-end gate can out-expand a constrained correct one),
 *  and a 3-gate A/B (S142) regressed solved→timeout under this weighting — so it's scoped
 *  to the population it was verified on. No published level has more than 3 gates, so this
 *  threshold means the published corpus is provably untouched by this code path. */
const ADAPTIVE_GATE_THRESHOLD = 4;
/** Floor on the per-gate weight multiplier once adaptive weighting kicks in: even a gate
 *  that shows little search activity keeps this fraction of its flat even-split share, so
 *  an efficiently-pruned-but-actually-correct gate is never starved to near zero. */
const ADAPTIVE_GATE_WEIGHT_FLOOR = 0.35;

/** Weight for `gateKey`'s next budget share, based on nodesExpanded accumulated so far
 *  (a proxy for "this gate has live search activity" vs. "attempts here prune out fast").
 *  Returns 1 (no skew) until every gate has contributed at least one data point. */
/** The solver's SINGLE attempt-budget allocation point — both attempt loops below route through it.
 *
 *  `attBudget = minBudgetFraction > 0 ? max(floor(minFloorBase * minBudgetFraction), evenShare)
 *                                     : evenShare`, where `evenShare = floor(remaining / unitsLeft)`.
 *  The two loops differ ONLY in what they pass as `minFloorBase` (the interleaved loop floors
 *  against a whole gate's share; the sequential loop against the gate's own remaining budget), which
 *  is exactly the difference that was easy to get wrong while the arithmetic lived inline twice.
 *
 *  DELIBERATELY CURRENCY-AGNOSTIC: nothing here is milliseconds. It divides a remainder of *some*
 *  budget among the units still to be served. Today every caller passes milliseconds, which is the
 *  root of the solver's run-to-run non-determinism — `remaining` is then derived from wall clock, so
 *  machine speed resizes every attempt and compounds across the ladder (84.2% of genuine repeat runs
 *  fail to reproduce their node count; see docs/solver-budget-determinism.md). Switching the
 *  currency to nodes is that document's Phase 2 and changes this function's two call sites, not this
 *  function. Extracting it is Phase 1, and is a strict no-op: the formula is unchanged.
 *
 *  Not the only budget arithmetic in the file — the repair fallback, the attraction-diversity pass
 *  and the admissible-order tier each scale `timeBudgetMs` by their own FRACTION rather than
 *  dividing a remainder, so they are a separate (and currency-agnostic-by-construction) concern. */
export function attemptBudgetShare(remaining: number, unitsLeft: number, minFloorBase: number, minBudgetFraction: number): number {
    const evenShare = Math.floor(remaining / unitsLeft);
    return minBudgetFraction > 0
        ? Math.max(Math.floor(minFloorBase * minBudgetFraction), evenShare)
        : evenShare;
}

function adaptiveGateWeight(gateKey: number, gateProgress: Map<number, number>): number {
    const total = [...gateProgress.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return 1;
    const n = gateProgress.size;
    const share = (gateProgress.get(gateKey) ?? 0) / total;
    return Math.max(ADAPTIVE_GATE_WEIGHT_FLOOR, (share * n) ** 2);
}

async function runInterleavedAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;

    // Adaptive gate weighting only engages on genuinely dilution-prone levels, and only
    // from the second full config round onward — round 0 always runs at the flat even
    // split so every gate contributes at least one real signal before any skew applies.
    // Ablation: STRATEGY_ADAPTIVE_GATE_BUDGET forces the flat even split at any gate count.
    const cfg = prep._cfg;
    const adaptive = (!cfg || cfg.STRATEGY_ADAPTIVE_GATE_BUDGET) && activeGates.length >= ADAPTIVE_GATE_THRESHOLD;
    const gateProgress = adaptive ? new Map(activeGates.map(g => [g, 0])) : null;

    for (let ci = 0; ci < baseConfigs.length; ci++) {
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - levelStartTime;
            if (elapsed >= timeBudgetMs) return { solution: null, attempts };
            if (prep._metrics && prep._metrics.nodesExpanded >= nodeBudget) return { solution: null, attempts };
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR gates the per-attempt-config minimum
            // budget-share floor (long-multigate perimeter beams, must-cross diverse-beam
            // threads) — disabling it falls back to the flat even split for every config.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            const budgetLeft = timeBudgetMs - elapsed;
            let attBudget = attemptBudgetShare(budgetLeft, pairsLeft, budgetLeft / activeGates.length, minFrac);
            if (gateProgress && ci >= 1) {
                attBudget = Math.max(50, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress)));
            }
            if (attBudget < 50) return { solution: null, attempts };

            // Remaining GLOBAL node budget, recomputed fresh before each attempt (same pattern as the
            // repair fallback below): beam/DFS count nodes LOCAL to the call, so the remainder makes a
            // single attempt stop mid-search when the cumulative budget is hit, instead of only being
            // caught by the between-attempts check above after it has already run its full time slice.
            const remainingNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn, remainingNodeBudget);
            if (gateProgress) {
                gateProgress.set(gateKey, (gateProgress.get(gateKey) ?? 0) + (result.attempt.nodesExpanded ?? 0));
            }
            attempts.push(result.attempt);
            pairsLeft--;
            if (result.path) return { solution: result.path, attempts };
        }
    }
    return { solution: null, attempts };
}

async function runGateSerialAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const cfg = prep._cfg;

    for (let gi = 0; gi < activeGates.length; gi++) {
        const gateKey = activeGates[gi];
        const gateElapsed = Date.now() - levelStartTime;
        if (gateElapsed >= timeBudgetMs) return { solution: null, attempts };
        if (prep._metrics && prep._metrics.nodesExpanded >= nodeBudget) return { solution: null, attempts };

        const gateStart = Date.now();
        const timeLeft = timeBudgetMs - gateElapsed;
        const gatesLeft = activeGates.length - gi;
        const gateBudget = Math.floor(timeLeft / gatesLeft);

        for (let ci = 0; ci < baseConfigs.length; ci++) {
            const elapsed = Date.now() - gateStart;
            if (elapsed >= gateBudget) break;

            const remaining = gateBudget - elapsed;
            const attemptsLeft = baseConfigs.length - ci;
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR — see runInterleavedAttempts's identical gate.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            const attBudget = attemptBudgetShare(remaining, attemptsLeft, remaining, minFrac);
            if (attBudget < 50) break;

            // Remaining GLOBAL node budget — see runInterleavedAttempts's identical recompute.
            const remainingNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn, remainingNodeBudget);
            attempts.push(result.attempt);
            if (result.path) return { solution: result.path, attempts };
        }
    }
    return { solution: null, attempts };
}

/** Extra wall-clock budget granted to the repair fallback (see attempts.ts's
 *  needsRepairFallback) ON TOP of the level's normal timeBudgetMs — never carved out of the
 *  main DFS/beam loop's share. A first version reserved a fraction of the ORIGINAL budget for
 *  repair up front (shrinking mainBudgetMs before the main loop ran); that quietly regressed a
 *  previously-solid fix elsewhere on this exact feature gate whose fix WAS a tight budget race
 *  (won by getting more of the existing pool, not less) — confirmed via a clean A/B against the
 *  pre-repair code (see data/stress/README.md). Extending the total budget instead costs the main
 *  loop nothing on any level, ever — repair only ever adds wall time on levels where every
 *  earlier attempt has already failed. 3.0 (not 1.0): the stagnation-burst diversification in
 *  repair-search.ts needs a full anti-stagnation cycle to escape a plateau on some levels —
 *  measured 25-38s of pure repairSearchFromGate compute to solve S030/S033/S039 in isolation,
 *  and running through the full orchestration flow (after the main loop's own ~20s of DFS/beam
 *  work) was measurably slower than that isolated figure at the same nominal budget — so 3.0
 *  (60s) budgets in real margin rather than the bare isolated minimum.
 *
 *  6.0 (not 3.0): S043 (the must-turn/portal-parity double-guidance fix — see
 *  data/stress/README.md) needs its correct-direction turn AND its parity-mandatory portal to land
 *  in an order-dependent way that only some restarts hit, and reaching one of those restarts
 *  measured ~93s of pure repairSearchFromGate compute even from a cold, uncontended isolated
 *  call — already past the 60s (3.0×20000ms) budget the rest of the cluster needed. Confirmed
 *  via the full solveLevel() orchestration (not just isolated) at a scaled-up budget: S043
 *  solved in ~93s of repair's own time (132.9s total, including the main loop's unchanged
 *  beam attempts) — consistent with, not faster than, the isolated figure, so 3.0's
 *  isolated-vs-orchestration slowdown margin still applies on top. 6.0 (120s at the standard
 *  20s test budget) covers this with room to spare without changing anything about the main
 *  DFS/beam loop's own budget or timing on any level. */
export const REPAIR_EXTRA_BUDGET_FRACTION = 6.0;

/** Strictly-additional budget (same shape as REPAIR_EXTRA_BUDGET_FRACTION above, just a separate,
 *  much smaller fraction) for one extra pass of the SAME main-loop attempt ladder (mainConfigs),
 *  with attempts.ts's ATTRACTION_DIVERSITY_CANDIDATE_FLAGS disabled for the whole pass — tried only
 *  after BOTH the main loop AND the repair fallback have already failed on every active gate.
 *  Exists for the 2026-07-16 fragile-group finding (reports/2026-07-16-phase-d-fragile-group-
 *  ablation-diagnosis.md): a small family of position/attraction scoring terms can each, on their
 *  own level-specific orientations, lock an otherwise-solvable level into a self-defeating
 *  structural commitment; disabling the right one of them rescues the case, but which term is
 *  level-specific.
 *
 *  A WHOLE extra pass of the ladder, not one narrow attempt: the diagnosis that found each rescue
 *  disabled the flag globally across every profile/template attempt.ts's policy selects for that
 *  level (via opts.ablation, not a single attempt config), so a fix that only tries the flag off in
 *  one specific profile/template combination under-delivers relative to what was actually proven —
 *  confirmed empirically: an earlier version of this mechanism using a single default-profile DFS
 *  attempt rescued only 2 of 6 known-rescuable fragile variants (both from R02795, the one case
 *  whose winning profile happens to be the default one); switching to a full extra ladder pass (this
 *  version) is required to reach the R00156/R02960 cases, whose diagnosed rescue needs a
 *  beam/template attempt the single-attempt version never tried.
 *
 *  1.0 (not 0.15): the diagnosis's own ablation sweep gave the WHOLE main-loop ladder (not one
 *  attempt) a full 8s budget at --repair-budget-fraction=0 to find every rescue — i.e. the same
 *  shape of run this pass performs, just at the standard 20s test budget's own nominal size, not a
 *  fraction of it. An earlier version of this fraction (0.15, giving mainConfigs' ~16-way split
 *  only ~3s total) was measured to under-deliver: it rescued only 2 of 6 known-rescuable variants
 *  (both from R02795, whose winning config happens to be fast/early in the ladder), missing every
 *  R00156/R02960 case the diagnosis proved rescuable. Raising the fraction to 1.0 gives the pass
 *  the SAME size budget the diagnosis itself used, not a smaller one — see reports/2026-07-16-
 *  phase-d-attraction-diversity-implementation.md for the verification numbers this was checked
 *  against. Still far smaller than REPAIR_EXTRA_BUDGET_FRACTION's 6.0 (an iterated-local-search
 *  retry loop that benefits from more time in a way a single fixed-budget ladder rerun does not),
 *  and this pass only ever runs on a level that has ALREADY spent 1x + up to 6x timeBudgetMs
 *  failing everything else — the goal is a bounded last check, not another expensive tier. */
export const ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0;

/** Per-PROFILE budget (same shape as the two fractions above, but applied once per
 *  attempts.ts ADMISSIBLE_ORDER_PROFILES entry, not once for the whole tier — see that call site's
 *  own comment for why: each profile runs as its own sequential sub-pass with this FULL fraction to
 *  itself, not a shared total split across profiles) for admissible-order-search.ts, a complete DFS
 *  variant that reuses the existing sound admissible-pruning gauntlet but orders children by
 *  admissible slack instead of soft heuristic score. Tried only after the main loop, repair
 *  fallback, AND attraction-diversity pass have all already failed on every active gate — mirroring
 *  their own last-resort placement, and stopping at the first profile that solves.
 *
 *  1.0 per profile, matching ATTRACTION_DIVERSITY_BUDGET_FRACTION's own reasoning: this technique's
 *  corpus-2 validation (reports/2026-07-24-admissible-order-search-corpus2-validation.md) ran EACH
 *  profile standalone at 8000ms, unshared, against levels the full production ladder had already
 *  failed — a budget on the same order as the standard 20-30s test budget's own nominal size, not a
 *  small fraction of it, and not divided among sibling profiles. Giving every one of
 *  ADMISSIBLE_ORDER_PROFILES this same full fraction (4 profiles today) means this tier's own
 *  worst-case cost is up to 4x timeBudgetMs, not 1x — accepted deliberately (see that array's own
 *  comment for the calibration bug this fixes) since a level only pays for MORE than one profile's
 *  worth when it has already failed every earlier profile too, and — same as the rest of this tier —
 *  it only runs at all after 1x + up to 6x + 1x timeBudgetMs has already been spent failing
 *  everything else. Batch/interactive callers that can't afford this keep the same escape hatch
 *  (admissibleOrderBudgetFractionOverride / disableExtraBudgetPasses) regardless of how many
 *  profiles are listed. Not yet tuned per-profile (all 4 currently share this one constant even
 *  though 'default' contributed far more of the validated solves than the other 3 combined) — a
 *  smaller dedicated fraction for the lower-yield profiles is a reasonable future refinement, but
 *  needs the same full-corpus-through-the-real-ladder validation this file's comment discipline
 *  requires before changing, not a guess. */
export const ADMISSIBLE_ORDER_BUDGET_FRACTION = 1.0;

/** Small, strictly ADDITIONAL budgets (never subtracted from mainConfigs' timeBudgetMs or from
 *  REPAIR_EXTRA_BUDGET_FRACTION's own later allotment) given to a cheap early probe of the
 *  repair fallback, tried BEFORE the ordinary DFS/beam main loop — see runRepairProbe.
 *
 *  Stress-corpus finding: on the repair-gated feature regime (attempts.ts's
 *  needsRepairFallback), the winning repair attempt itself typically finishes in well under
 *  these allotments (measured across the known cluster: several ordinary wins under 1.2s; the
 *  two levels that need the must-turn-biased attempt specifically, S033/S043, took ~3.4s/~4.1s
 *  cold) while the main loop ahead of it burns its full ~20s budget on strategies that provably
 *  exhaust their own search space without succeeding (see data/stress/README.md item 6's
 *  full-instrumentation finding — none of those attempts are cut off by budget, they run out of
 *  search space on their own) — i.e. for most of this regime, the main loop's own budget is
 *  pure scheduling tax on top of repair's real work, not search that matters. A bonus, not the
 *  design basis: repairSearchFromGate also measurably degrades in throughput when run after the
 *  main loop's own ~20s of work (REPAIR_EXTRA_BUDGET_FRACTION's own comment, S033/S043
 *  writeups), so probing it cold, before that contention, can only help.
 *
 *  Deliberately small and strictly additive: repairSearchFromGate is a pure function of
 *  (gateKey, level, prep, profile, budget) with a seed derived only from gateKey (mulberry32,
 *  never wall-clock/Math.random — see repair-search.ts), so a failed probe merely repeats a
 *  deterministic prefix of the restarts the later full-budget call performs anyway: wasted
 *  compute on levels where the probe fails to solve, never a correctness or effective-
 *  search-depth cost. This is the same reasoning that ruled out the earlier, reverted design
 *  that shrank the pool a later attempt's own budget was computed against (regressed S017 — see
 *  REPAIR_EXTRA_BUDGET_FRACTION's comment): this probe shrinks nothing, it only ever adds an
 *  extra chance to exit early. Levels outside the repair feature gate never see this code path
 *  at all (repairConfigs is empty, checked before the probe runs), so it is provably a no-op on
 *  the published corpus, exactly as the full-budget repair loop already is.
 *
 *  Sized small on purpose, and split into two tiers after measuring a real tax/benefit
 *  trade-off: the repair feature gate (needsRepairFallback) is far broader than the levels that
 *  actually need repair in the stress corpus — a full-corpus scan found 48 levels that match
 *  the gate but already solve fast via the ordinary main loop (repair never engages for them)
 *  against only 13 that actually need it, so every level in the 48 pays whatever this probe
 *  costs as pure tax. A single flat 5000ms budget (tested first) caught the full known cluster
 *  including S033/S043, but pushed the aggregate tax on the 48 to roughly the size of the
 *  cluster's own savings. A single flat 1500ms budget shrank the tax a lot but missed S033/S043
 *  entirely (their win needs the must-turn-biased attempt specifically, which only exists on
 *  must-turn levels — a full-corpus scan found only 9 of the 48 tax-paying levels have one).
 *  Splitting the two tiers gets both: the ordinary tier stays small (low tax on all 48), the
 *  biased tier stays large enough to reliably catch S033/S043 while only the 9 must-turn
 *  members of the 48 pay its larger tax.
 *
 *  NODE-COUNT, not ms (see docs/solver-architecture.md's "Wall-clock-gated search probes"
 *  section for the full determinism rationale and the specific published-corpus repro this
 *  fixed, per the Determinism Report): the probe's original ms-based race could
 *  non-deterministically return one of two different, both-valid solutions on a
 *  repair-gated level depending on CPU/memory contention at solve time — a probe that would
 *  succeed within its ms window on an uncontended run could miss it on a contended one, since
 *  the same nominal ms window covers fewer actual search nodes under contention. Node count
 *  is a pure function of (gateKey, level, prep, profile) given repairSearchFromGate's own
 *  seeded-per-gate determinism, so the SAME probe decision is reached regardless of machine
 *  speed or contention.
 *
 *  Calibrated by direct measurement (not by converting the old ms constants via an assumed
 *  nodes/ms rate, which would reintroduce a guess) via repairSearchFromGate called directly
 *  on the winning (gate, config) pair, isolated from the rest of the ladder's own node cost:
 *  ordinary-tier observed winners across the published corpus + the known stress cluster —
 *  pub#136 1,267,700 nodes (~1365ms, the largest observed — notably already close to the old
 *  1500ms ceiling), pub#146 172,978, pub#144 41,446, S039 149,513 — so 2,000,000 comfortably
 *  covers the largest observed case with ~58% headroom. Biased-tier: S043 972,527 nodes
 *  (~2179ms) is the only known must-turn-biased win that should be caught this early; S033
 *  needs 10,190,617 nodes (~25s) even cold and is NOT meant to be caught by this probe (it's
 *  caught later by the full REPAIR_EXTRA_BUDGET_FRACTION fallback loop today, same as before
 *  this change) — 6,000,000 clears S043 with a large margin while staying safely below S033's
 *  true cost, preserving which level falls through to the full fallback vs. gets caught early.
 *  Re-measure (repairSearchFromGate called directly per the recipe above, NOT the full
 *  2000-level stress corpus — too slow for this kind of per-level direct-replay measurement)
 *  before changing either value. */
const REPAIR_PROBE_ORDINARY_NODE_BUDGET = 2_000_000;
const REPAIR_PROBE_BIASED_NODE_BUDGET = 6_000_000;

/** How much of REPAIR_PROBE_BIASED_NODE_BUDGET the heuristically-PREDICTED technique gets when both
 *  biased tiers are present (attempts.ts's predictLikelyBiasedRepairTechnique, under
 *  STRATEGY_REPAIR_TURN_BIAS) — the other (fallback) tier gets the remainder. 0.75 chosen to keep
 *  the predicted tier close to its full pre-split calibration (see REPAIR_PROBE_BIASED_NODE_BUDGET's
 *  own comment) while still giving the fallback technique a real, non-zero shot. Two prior designs
 *  measured on a full corpus-2 refresh and rejected: an even 50/50 split (net -3 vs. the run before
 *  it: each half-budget attempt too weak to reproduce known wins like S043's 4.3M-node need against
 *  a 3M cap) and excluding the fallback entirely (net -2 vs. the original turn-bias-off baseline:
 *  the predictor's own ~74% accuracy means a real fraction of levels get zero chance via the
 *  technique they actually needed). See reports/2026-07-23-turnbias-corpus2-ab-validation.md's
 *  "Update" sections for both prior measurements. Needs its own corpus-2 A/B before promotion. */
const REPAIR_PROBE_PREDICTED_TIER_SHARE = 0.75;

/** Additional seeds (see runAttempt's seedSalt param) to retry an already-failed ORDINARY probe
 *  round with, before falling through to the full (much more expensive) ladder.
 *  repairSearchFromGate's randomized local search is seeded from the gate's own coordinates
 *  (repair-search.ts's `rand`), so its outcome on a given (level, gate) is one sample from a
 *  genuinely high-variance distribution, not a deterministic verdict on that level's real
 *  difficulty — confirmed directly with scripts/repair-direct-probe.mjs's --races flag and by
 *  calling repairSearchFromGate directly per seed (see
 *  reports/families/2026-07-15-{symmetry-orientation-bias,re-embedded-cousin-grid-growth}.md for
 *  the investigation this grew out of). A whole-level rotation or a grid re-embedding incidentally
 *  changes this seed by changing the gate's coordinates — which is the leading explanation for why
 *  those two sibling/cousin generation modes showed the strongest repair-probe sensitivity in that
 *  investigation, despite changing nothing about the puzzle's actual difficulty. Retrying the SAME
 *  (gate, level) with a few additional seeds targets that variance directly, independent of
 *  orientation.
 *
 *  **Width is a recall-vs-cost tradeoff, not a free correctness win — measured, not assumed —
 *  and re-measured after repair-search.ts's elite-splice pool was fixed (it had gone silently
 *  dead from a July 10 correctness fix — see CLAUDE.md's repair-search gotcha and
 *  reports/2026-07-16-repair-search-elite-splice-regression.md), since that fix changed
 *  single-seed convergence enough to invalidate the original calibration below.**
 *
 *  Original calibration (pre-elite-splice-fix, repair-search effectively never spliced from a
 *  near-miss — every restart fresh-started from the gate): salts [0,1,2,3,4] (4 retries) were
 *  picked from which single salt rescued each of 4 hand-checked cases (P00146 + 3 rotated
 *  siblings — needed salts 1, 2, 2, 4 respectively). That width passed `solver:bench --check`
 *  (160/160, no regressions) but a full-corpus before/after speed sweep caught what the
 *  solvability check couldn't see: total time went from 42.0s to 47.7s (+14%) at
 *  budgetMs=30000, entirely from one level (P00144) whose probe exhausted all 4 retry seeds
 *  (never rescued at any of them) before falling through to the same fallback path that solved
 *  it anyway — pure waste, only partly offset by the one level (P00146) the retries did rescue.
 *  Narrowed to [0,1,2] (2 retries) in response, restoring the corpus to a ~0.5% wash.
 *
 *  **Re-calibration after the elite-splice fix landed** (same method — repairSearchFromGate
 *  called directly per seed, 2,000,000-node budget, same P00146 + 3 rotated siblings, plus all 4
 *  actual repair-gated published levels: P00136/P00144/P00145/P00146, the full population
 *  `needsRepairFallback` currently selects): the picture changed completely. Every one of the 3
 *  rotated siblings and 3 of the 4 real levels (P00136, P00144, P00146) now solve on **seed 0
 *  alone** — cheaply (7k-256k nodes, well under the budget) — meaning the retry loop never even
 *  reaches salt 1 for any of them anymore; splicing from the elite pool was doing exactly the job
 *  the retries used to compensate for. Only one real level, P00145, still needs a retry: seed 0
 *  fails (exhausts the full budget), but seed 1 rescues it cheaply (805,745 nodes) — no case in
 *  this re-calibration (9 total: 4 real levels + the 1 parent + 3 siblings the width was
 *  originally tuned on) needs salt 2 to rescue. Narrowed further to [0,1] (1 retry) on this
 *  basis: keeps the one known rescue (P00145, at salt 1) at zero cost for the 3 levels that no
 *  longer need any retry at all, and caps a still-unrescuable level's worst-case probe cost at 2x
 *  the base budget instead of 3x. This is still a small sample (n=9, mostly one family plus the
 *  tiny 4-level real population) — re-measure with the same rigor before widening or narrowing
 *  again, especially if a *different* repair-gated level (a new publish, or a stress-corpus case)
 *  is found needing a seed beyond 1.
 *
 *  Deliberately scoped to the ORDINARY tier only (REPAIR_PROBE_ORDINARY_NODE_BUDGET), not the
 *  must-turn-biased one: no rescue evidence was gathered for the biased tier, and its own history
 *  (see repair-search.ts's EXIT_GUIDANCE_EPSILON_BOOST comment — S030 regressed at every nonzero
 *  nudge tried, even on an independent RNG stream) shows it's unusually sensitive to any change, so
 *  widening it without specific evidence is a needless risk. Each retry salt gets the SAME node
 *  budget as the first round — strictly additive: only reached when every active gate has already
 *  failed at every earlier salt, so a level whose probe already succeeds on the first (default)
 *  seed is completely unaffected. Ablation: STRATEGY_REPAIR_PROBE_MULTI_SEED (default enabled).
 *  Re-verify with a full-corpus before/after speed sweep (not just solver:bench --check — see
 *  CLAUDE.md's gotcha on this and docs/testing.md's "Speed, separately from solvability") before
 *  changing this list again. */
const REPAIR_PROBE_ORDINARY_SEED_SALTS = [0, 1];

/** Tries each repairConfig (ordinary, then must-turn-biased if present) at a per-config node
 *  budget (REPAIR_PROBE_ORDINARY_NODE_BUDGET / _BIASED_NODE_BUDGET — see their comment) split
 *  across activeGates by nodes consumed so far (mirrors the per-gate ms-budget split the
 *  full-budget repair loop in solveLevel uses, just node-counted and at much smaller totals).
 *  The outer per-gate/per-attempt ms budget (attBudget, below) stays a generous, effectively
 *  non-binding safety net — the node budget is what actually decides the probe's outcome. The
 *  ORDINARY config is additionally retried across REPAIR_PROBE_ORDINARY_SEED_SALTS (see its own
 *  comment) before moving on to the next config or giving up — every salt after the first only
 *  runs if every active gate already failed at every earlier salt; the must-turn-biased config
 *  always runs at a single seed (salt 0), unchanged from before this retry existed.
 *
 *  BUG FIXED 2026-07-17: `nodeBudget` (the caller's EXTERNAL SolveOpts.nodeBudget, offline-tooling
 *  only — see that field's own comment) was never threaded into this function at all, so the probe
 *  always ran its full internal worst case (ordinary tier up to REPAIR_PROBE_ORDINARY_SEED_SALTS.
 *  length × REPAIR_PROBE_ORDINARY_NODE_BUDGET, plus REPAIR_PROBE_BIASED_NODE_BUDGET on must-turn
 *  levels — up to ~10,000,000 nodes combined) regardless of how small an external budget the caller
 *  asked for. solveLevel()'s own re-check *after* the probe returns (`if
 *  (prep._metrics.nodesExpanded >= nodeBudget) ...`) only ever reports the overshoot, it can't
 *  prevent it. Confirmed at scale on the real corpus-2 batch workflow (`.github/workflows/solver-
 *  corpus2-batch-*.yml`'s `--node-budget=8000000` default): 621/621 repair-gated levels that hit
 *  `status: 'node-budget-reached'` had burned the probe's ~10,000,000-node worst case (exceeding
 *  the 8,000,000 external budget by ~25% every time) with EVERY attempt tagged `repair` — meaning
 *  the main DFS/beam loop, the full-budget repair fallback, and the attraction-diversity pass never
 *  ran AT ALL on any of them. This is the entire `repair-close`+`repair-far` unsolved-cluster
 *  population (`reports/stress/unsolved-failure-clusters.json`: 114 + 507 = 621, an exact match) —
 *  their "badness" telemetry and cluster classification reflect only how close the PROBE got, not
 *  the full pipeline. See reports/2026-07-17-repair-probe-node-budget-starvation.md for the full
 *  investigation. Fixed by checking the external nodeBudget before each seed-salt round (the
 *  smallest independently-costed probe unit) and bailing out early if it's already exhausted —
 *  same granularity/precision caveat as every other nodeBudget check in this file (can still
 *  overshoot by up to one seed-salt round's own cost, never by the full combined worst case). */
async function runRepairProbe(
    repairConfigs: AttemptConfig[], activeGates: number[], level: NormalizedLevel,
    prep: PrepLevel, yieldFn: YieldFn, cfg: AblationConfig | null, nodeBudget = Infinity,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    // REPAIR_PROBE_BIASED_NODE_BUDGET was calibrated (see its own comment) against exactly one
    // biased tier's worst case (repairMustTurnBiased, the only one that existed at the time). When a
    // second biased tier is also present (repairTurnBiased, under STRATEGY_REPAIR_TURN_BIAS, in
    // attempts.ts's non-exclusive predicted-then-fallback order), weight the fixed budget between
    // them by REPAIR_PROBE_PREDICTED_TIER_SHARE (see its own comment for why a plain 50/50 split and
    // full exclusion were both tried and rejected) instead of granting each the full amount — two
    // full-budget biased tiers running sequentially would otherwise burn double the calibrated cost
    // before the main loop/fallback ever gets a share of a bounded external nodeBudget (confirmed:
    // this starved the main loop's own attempts on a 2026-07-23 corpus-2 A/B — see
    // reports/2026-07-23-turnbias-corpus2-ab-validation.md). Byte-identical to before when only one
    // (or zero) biased tier is present, the common/production case. `biasedSeen` counts biased tiers
    // as they're encountered in `repairConfigs`' own order, which attempts.ts always builds
    // predicted-tier-first — so index 0 here always means "the predicted one," never an arbitrary
    // first-in-array accident.
    const biasedConfigCount = repairConfigs.filter(c => c.repairMustTurnBiased || c.repairTurnBiased).length;
    const biasedNodeBudgetForTier = (indexAmongBiased: number): number => {
        if (biasedConfigCount <= 1) return REPAIR_PROBE_BIASED_NODE_BUDGET;
        const share = indexAmongBiased === 0 ? REPAIR_PROBE_PREDICTED_TIER_SHARE : 1 - REPAIR_PROBE_PREDICTED_TIER_SHARE;
        return Math.floor(REPAIR_PROBE_BIASED_NODE_BUDGET * share);
    };
    let biasedSeen = 0;
    for (const repairConfig of repairConfigs) {
        // The turn-biased attempt, like the must-turn-biased one, is a heavier single-seed search
        // (see repair-search.ts) — give it the biased probe budget and a single seed salt.
        const isBiased = repairConfig.repairMustTurnBiased || repairConfig.repairTurnBiased;
        const fixedProbeNodeBudget = isBiased ? biasedNodeBudgetForTier(biasedSeen++) : REPAIR_PROBE_ORDINARY_NODE_BUDGET;
        const seedSalts = (!isBiased && (!cfg || cfg.STRATEGY_REPAIR_PROBE_MULTI_SEED))
            ? REPAIR_PROBE_ORDINARY_SEED_SALTS : [0];
        for (const seedSalt of seedSalts) {
            // Cap THIS round's own node budget by whatever's left of the external ceiling, not just
            // check whether it's already been exceeded — a single round can cost up to
            // fixedProbeNodeBudget (2,000,000 ordinary / 6,000,000 biased) on its own, so a
            // start-of-round-only check that doesn't shrink the round's OWN budget would still let
            // one round blow straight through a much smaller remaining headroom (this was the
            // original version of this fix, caught by direct reproduction before landing: it left
            // nodesExpanded at 10,000,084 against an 8,000,000 external nodeBudget, unchanged from
            // the pre-fix behavior, because the check before the last round saw "4,000,038 used,
            // 8,000,000 budget, plenty of room" without accounting for the round's own 6,000,000 cost).
            const nodesSoFar = prep._metrics ? prep._metrics.nodesExpanded : 0;
            const remainingExternal = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - nodesSoFar);
            const probeNodeBudget = Math.min(fixedProbeNodeBudget, remainingExternal);
            if (probeNodeBudget < 50) return { solution: null, attempts };
            let nodesUsed = 0;
            for (let gi = 0; gi < activeGates.length; gi++) {
                const gateKey = activeGates[gi];
                const gatesLeft = activeGates.length - gi;
                const gateNodeBudget = Math.floor((probeNodeBudget - nodesUsed) / gatesLeft);
                if (gateNodeBudget < 50) break;
                // attBudget (ms) is a generous safety-net trip-wire only, well above any observed
                // real-world cost for a probe-worthy (node-budget-bounded) win — the node budget
                // above is the actual, contention-independent decision; this only guards against
                // a pathological per-node-cost level or a bug in the node-count mechanism itself.
                const nodesOut: { nodesExpanded?: number } = {};
                const r = await runAttempt(gateKey, level, prep, repairConfig, 30000, Date.now(), yieldFn, gateNodeBudget, nodesOut, seedSalt);
                attempts.push(r.attempt);
                nodesUsed += nodesOut.nodesExpanded ?? gateNodeBudget;
                if (r.path) return { solution: r.path, attempts };
            }
        }
    }
    return { solution: null, attempts };
}


export function attemptConfigKey(config: AttemptConfig): string {
    if (config.admissibleOrder) {
        const base = config.admissibleOrderNoTieBreak ? 'ida:none' : `ida:${config.profileName}`;
        return config.admissibleOrderLds ? `${base}(lds)` : base;
    }
    const mode = config.beamWidth ? 'beam' : 'dfs';
    const template = config.template?.id ? `/${config.template.id}` : '';
    const beam = config.beamWidth ? `@beam${config.beamWidth}` : '';
    const diverse = config.diverseBeam ? '(diverse)' : '';
    const repair = config.repair ? ':repair' : '';
    const biased = config.repairMustTurnBiased ? '(mustTurnBiased)' : config.repairTurnBiased ? '(turnBiased)' : '';
    return `${mode}:${config.profileName}${template}${beam}${diverse}${repair}${biased}`;
}

function portfolioFeatureSummary(level: NormalizedLevel): Record<string, number> {
    return {
        reqInt: level.reqInt ?? 0,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
        portals: level.portalMap?.size ?? 0,
        flippingFilters: level.flippingFilterMap?.size ?? 0,
    };
}

function portfolioFeatureGateMatches(level: NormalizedLevel, gate: NonNullable<PortfolioExperimentDefinition['conditionalPasses']>[number]['when']): boolean {
    const f = portfolioFeatureSummary(level);
    return (gate.minReqInt == null || f.reqInt >= gate.minReqInt)
        && (gate.minMustPass == null || f.mustPass >= gate.minMustPass)
        && (gate.minMustCross == null || f.mustCross >= gate.minMustCross)
        && (gate.minMustTurn == null || f.mustTurn >= gate.minMustTurn)
        && (gate.minPortals == null || f.portals >= gate.minPortals)
        && (gate.minFlippingFilters == null || f.flippingFilters >= gate.minFlippingFilters);
}

/**
 * Normalizes an externally-supplied ablation config into the one shape every downstream read
 * site can safely assume: either `null` (no ablation — the production/default fast path,
 * preserved byte-for-byte via `!cfg` checks throughout this file/repair-search.ts/scoring.ts/
 * prune-gauntlet.ts) or a fully-defaulted object where every flag not explicitly set by the
 * caller reads as enabled.
 *
 * Every one of those `(!cfg || cfg.SOME_FLAG)` read sites treats "no ablation config at all" as
 * the ONLY way an unset flag defaults to `true` — so a caller-supplied PARTIAL object (e.g.
 * `{ STRATEGY_REPAIR_PROBE: true }`) makes every OTHER unset flag read as `undefined` (falsy),
 * silently disabling it. This is exactly the bug SolveOpts's repairBudgetFractionOverride field
 * comment documents shipping to production once already, and the reason this file's own
 * attraction-diversity pass below builds its overlay config through a hand-rolled Proxy instead
 * of a plain `{ ...cfg }` spread. Both of `solveLevel`/`runPortfolioExperiment` funnel every
 * externally-supplied `opts.ablation` through here before it ever reaches `prep._cfg` — the only
 * place any read site ever gets a cfg from — so a sparse override is safe from ANY entry point
 * (production call, orchestration.test.ts, scripts/repair-direct-probe.mjs, future tooling)
 * without every call site needing to remember to build it via ablation-config.mjs's
 * `defaultConfig()`/`withFeatureDisabled()` helpers first.
 *
 * A Proxy, not a plain merged object: the flag set isn't enumerated here (scripts/ablation-
 * config.mjs's FEATURES list is the canonical registry, but it's Node-tooling-only and duplicating
 * it into this browser-bundled runtime module would just be a second list to keep in sync on
 * every new flag — the exact class of drift CLAUDE.md's LEVEL_KEY_FIELDS/fingerprint-version
 * gotchas warn about). Falls through to the real object for `ATTEMPT_ORDER`/`_randomSeed`
 * (non-boolean, attempts.ts-only fields whose absence must stay `undefined`, not `true`) and
 * implements `has`/`getOwnPropertyDescriptor`/`ownKeys` so `'FLAG' in cfg`,
 * `Object.prototype.hasOwnProperty.call(cfg, 'FLAG')`, and `{ ...cfg }` all still faithfully
 * reflect the caller's original object (attempts.ts's `PROFILE_*`/`TEMPLATE_*` checks, and this
 * file's own diversity-pass Proxy, both rely on exactly this).
 *
 * Exported (also re-exported from `testing-api.ts`) so external diagnostic tooling that needs to
 * hand-build a `prep._cfg` override — e.g. `scripts/stress/hint-divergence.mjs`'s per-flag
 * ablation sweep — gets this same provably-correct sparse-override behavior directly, rather than
 * reimplementing it by hand-listing every flag from `scripts/ablation-config.mjs`'s `FEATURES`
 * (an earlier version of that tool did exactly this, complete only for the `SCORE_*` subset it
 * happened to need — harmless there since nothing in its own call path reads `PRUNE_*`/`STRATEGY_*`
 * flags, but a real instance of the exact footgun this comment describes, latent rather than
 * active only by accident of which functions it called). Prefer this over listing flags by hand
 * in any new tooling.
 */
const ABLATION_NON_FLAG_KEYS = new Set(['ATTEMPT_ORDER', '_randomSeed']);
export function normalizeAblationConfig(raw: AblationConfig | null | undefined): AblationConfig | null {
    if (raw == null) return null;
    const hasOwn = (prop: string) => Object.prototype.hasOwnProperty.call(raw, prop);
    return new Proxy({} as AblationConfig, {
        get(_target, prop) {
            if (typeof prop !== 'string') return undefined;
            if (hasOwn(prop)) return raw[prop];
            return ABLATION_NON_FLAG_KEYS.has(prop) ? undefined : true;
        },
        has(_target, prop) {
            return typeof prop === 'string' && hasOwn(prop);
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (typeof prop !== 'string' || !hasOwn(prop)) return undefined;
            return { value: raw[prop], writable: true, enumerable: true, configurable: true };
        },
        ownKeys() {
            return Reflect.ownKeys(raw);
        },
    });
}

async function runAttemptSlice(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel, attemptConfig: AttemptConfig,
    capMs: number, yieldFn: YieldFn, metadata: Pick<Attempt, 'passNumber' | 'restart' | 'schedulerPhase'> = {},
): Promise<AttemptResult> {
    const result = await runAttempt(gateKey, level, prep, attemptConfig, capMs, Date.now(), yieldFn);
    result.attempt.configKey = attemptConfigKey(attemptConfig);
    Object.assign(result.attempt, metadata);
    return result;
}

async function runPortfolioExperiment(
    level: NormalizedLevel, opts: SolveOpts, timeBudgetMs: number, yieldFn: YieldFn,
): Promise<SolveResult> {
    const experiment = opts.portfolioExperiment ?? PORTFOLIO_EXPERIMENT;
    const portfolioStart = Date.now();
    const prepStart = Date.now();
    const prep = prepLevel(level);
    const prepMs = Date.now() - prepStart;
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, Array.isArray(level.gateKeys) ? level.gateKeys : [], cfg);
    const attempts: Attempt[] = [];
    const seen = new Map<string, Attempt>();
    let repeatedAttemptElapsedMs = 0;
    let repeatedPrefixNodeUpperBound = 0;

    const runPass = async (passNumber: number, capMs: number, allow: ((key: string) => boolean)): Promise<number[] | null> => {
        for (const attemptConfig of baseConfigs) {
            const configKey = attemptConfigKey(attemptConfig);
            if (!allow(configKey)) continue;
            for (const gateKey of activeGates) {
                const sliceKey = `${configKey}#${gateKey}`;
                const previous = seen.get(sliceKey);
                const result = await runAttemptSlice(gateKey, level, prep, attemptConfig, capMs, yieldFn, {
                    passNumber,
                    restart: !!previous,
                    schedulerPhase: 'portfolio',
                });
                if (previous) {
                    repeatedAttemptElapsedMs += previous.elapsedMs;
                    repeatedPrefixNodeUpperBound += previous.nodesExpanded ?? 0;
                }
                seen.set(sliceKey, result.attempt);
                attempts.push(result.attempt);
                if (result.path) return result.path;
            }
        }
        return null;
    };

    let solution = await runPass(1, experiment.pass1Ms, () => true);
    if (!solution) solution = await runPass(2, experiment.pass2Ms, key => experiment.pass2Configs.has(key));
    if (!solution) solution = await runPass(3, experiment.pass3Ms, key => experiment.pass3Configs.has(key));
    if (!solution && experiment.conditionalPasses) {
        for (const conditionalPass of experiment.conditionalPasses) {
            if (!portfolioFeatureGateMatches(level, conditionalPass.when)) continue;
            solution = await runPass(conditionalPass.passNumber, conditionalPass.capMs, key => conditionalPass.configs.has(key));
            if (solution) break;
        }
    }

    const portfolioAttemptSearchMs = () => attempts.reduce((sum, attempt) => sum + attempt.elapsedMs, 0);
    const portfolioRuntimeBreakdown = (totalMs: number, fallbackSearchMs = 0) => ({
        prepMs,
        portfolioAttemptSearchMs: portfolioAttemptSearchMs(),
        schedulerOverheadMs: Math.max(0, totalMs - prepMs - portfolioAttemptSearchMs() - fallbackSearchMs),
        fallbackSearchMs,
        totalMs,
    });

    if (solution) {
        const totalMs = Date.now() - portfolioStart;
        return {
            ok: true,
            status: 'success',
            solution,
            solutions: [solution],
            attempts,
            totalMs,
            nodesExpanded: prep._metrics.nodesExpanded,
            schedulerMode: 'portfolio-experiment',
            portfolio: { solvedBeforeFallback: true, fallbackAttemptCount: 0, repeatedAttemptElapsedMs, repeatedPrefixNodeUpperBound, runtimeBreakdown: portfolioRuntimeBreakdown(totalMs) },
        };
    }

    const fallback = await solveLevel(level, { ...opts, schedulerMode: 'legacy', timeBudgetMs });
    const fallbackAttempts = fallback.attempts.map(attempt => ({ ...attempt, schedulerPhase: 'fallback' as const }));
    const totalMs = Date.now() - portfolioStart;
    return {
        ...fallback,
        attempts: [...attempts, ...fallbackAttempts],
        totalMs,
        nodesExpanded: prep._metrics.nodesExpanded + fallback.nodesExpanded,
        schedulerMode: 'portfolio-experiment',
        portfolio: {
            solvedBeforeFallback: false,
            fallbackAttemptCount: fallback.attempts.length,
            repeatedAttemptElapsedMs,
            repeatedPrefixNodeUpperBound,
            runtimeBreakdown: portfolioRuntimeBreakdown(totalMs, fallback.totalMs),
        },
    };
}

export async function solveLevel(level: NormalizedLevel, opts: SolveOpts = {}): Promise<SolveResult> {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const nodeBudget = Number(opts.nodeBudget) > 0 ? Number(opts.nodeBudget) : Infinity;
    const yieldFn = typeof opts.yieldFn === 'function' ? opts.yieldFn : null;
    if (opts.schedulerMode === 'portfolio-experiment') {
        return runPortfolioExperiment(level, opts, timeBudgetMs, yieldFn);
    }
    const levelStartTime = Date.now();
    const prep = prepLevel(level);
    const gateKeys = Array.isArray(level.gateKeys) ? level.gateKeys : [];

    // Ablation config: attach to prep so all inner functions can read it. Normalized (see
    // normalizeAblationConfig above) so a caller-supplied PARTIAL config can never silently
    // disable every other unset flag.
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    // Offline tooling hook (hint-diversification audits): when set, the very first
    // move out of a gate is restricted to this single packed cell key. Read by
    // getNeighbors()'s callers in search.js only when pos === the gate it started from.
    // No effect on normal play/solve — opts.forcedFirstStepKey is never set in production.
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    // Same offline tooling hook, for the move immediately after a portal jump instead of
    // the gate. { from: portalDestKey, to: forcedNextKey }. Read by getNeighbors() in
    // search-state.js. No effect on normal play/solve — never set in production.
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    // Build attempt configs, then apply ablation profile/template filters and ordering overrides.
    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, gateKeys, cfg);

    // Winner-first pre-attempt (opts.primeAttempt — offline re-verify tooling only; see the field's
    // own comment for the semantics and the solvability-vs-ordering verdict caveat). Runs exactly the
    // one baseline-recorded winning config at its gate before the probe/ladder; a hit skips all the
    // non-winning configs the ladder would otherwise try first. A miss (config key not in this
    // level's list, gate not active, or the attempt fails within its own bounded budget) falls
    // through to the normal probe/ladder — its node spend already counts toward the cumulative
    // budget like any other attempt, and (below) its own Attempt record is also preserved in
    // telemetry, not silently dropped. No effect when opts.primeAttempt is undefined (every
    // production/normal caller).
    // A missed prime's own attempt is recorded here and merged into every subsequent return path
    // below via probeAttempts (see its declaration a few lines down) — so a miss's search work is
    // fully visible in telemetry (attempts/nodesExpanded), not silently absorbed into "the ladder
    // just happened to run a bit longer."
    let primeMissAttempt: Attempt | null = null;
    if (opts.primeAttempt) {
        const primeConfig = baseConfigs.find(c => attemptConfigKey(c) === opts.primeAttempt!.configKey);
        if (primeConfig && activeGates.includes(opts.primeAttempt.gateKey)) {
            const primeNodeBudget = Number(opts.primeAttempt.nodeBudget) > 0 ? Number(opts.primeAttempt.nodeBudget) : nodeBudget;
            const primeSeedSalt = Number.isFinite(opts.primeAttempt.seedSalt) ? Number(opts.primeAttempt.seedSalt) : 0;
            const primeResult = await runAttempt(opts.primeAttempt.gateKey, level, prep, primeConfig, timeBudgetMs, Date.now(), yieldFn, primeNodeBudget, null, primeSeedSalt);
            primeResult.attempt.configKey = opts.primeAttempt.configKey;
            if (primeResult.path) {
                const totalMs = Date.now() - levelStartTime;
                return { ok: true, status: 'success', solution: primeResult.path, solutions: [primeResult.path], attempts: [primeResult.attempt], totalMs, nodesExpanded: prep._metrics.nodesExpanded, solvedByPrime: true };
            }
            primeMissAttempt = primeResult.attempt;
        }
    }

    // The repair fallback(s) (attempts.ts's needsRepairFallback / repairMustTurnBiasedAttempt) and
    // the admissible-order-search tier (attempts.ts's ADMISSIBLE_ORDER_PROFILES) are both pulled out
    // of the normal per-config loop and run afterward, each with its own extra budget
    // (REPAIR_EXTRA_BUDGET_FRACTION / ADMISSIBLE_ORDER_BUDGET_FRACTION) — mainConfigs excludes both
    // so neither competes for a share of timeBudgetMs. repairConfigs is absent on every level outside
    // its feature gate; admissibleOrderConfigs is present on every level (see that tier's own
    // unconditional-placement comment) unless STRATEGY_ADMISSIBLE_ORDER is explicitly disabled.
    const repairConfigs = baseConfigs.filter(c => c.repair);
    const admissibleOrderConfigs = baseConfigs.filter(c => c.admissibleOrder);
    const mainConfigs = baseConfigs.filter(c => !c.repair && !c.admissibleOrder);

    // opts.repairBudgetFractionOverride (NOT an ablation flag — see SolveOpts's field comment for
    // why) lets offline batch tooling shrink/grow the repair fallback's extra budget for a
    // faster/bounded dev-loop run, without touching the tuned production constant — absent (the
    // common case) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly. Resolved here, before the early
    // probe below, rather than only just before the full-budget fallback loop further down: an
    // explicit 0 override means "no repair-related cost at all," and the probe is a repair-related
    // cost too (see its gate's own comment for why this matters).
    const repairFractionOverride = Number(opts.repairBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairBudgetFraction = Number.isFinite(repairFractionOverride) && repairFractionOverride >= 0
        ? repairFractionOverride
        : REPAIR_EXTRA_BUDGET_FRACTION;

    // Early, strictly-additive probe of the repair fallback — see REPAIR_PROBE_ORDINARY_NODE_BUDGET
    // / REPAIR_PROBE_BIASED_NODE_BUDGET. Absent (and free) on every level outside the repair
    // feature gate, since repairConfigs is empty there. Also skipped when the caller has explicitly
    // asked for zero repair-related cost (repairBudgetFractionOverride: 0).
    //
    // BUG FIXED 2026-07-17 (see reports/2026-07-17-attraction-diversity-dose-response.md's flagged
    // "unexplained observation" and the follow-up audit report): the probe's real cost is bounded
    // by its own fixed NODE budgets (REPAIR_PROBE_ORDINARY_NODE_BUDGET, up to
    // REPAIR_PROBE_ORDINARY_SEED_SALTS.length times, plus REPAIR_PROBE_BIASED_NODE_BUDGET on
    // must-turn levels) — NOT by timeBudgetMs and NOT by repairBudgetFractionOverride, which was
    // only ever wired into the LATER full-budget fallback loop below. Those node budgets were
    // calibrated against levels where the probe WINS quickly (see their own comment's "observed
    // winners" data); on a level where repair never succeeds at all, the probe instead burns its
    // FULL node budget as pure dead search every single solve, and on a heavily-constrained level
    // (many must-pass/must-cross/landmark checks raise real per-node cost) that dead search alone
    // can cost several seconds of wall time with zero way for a caller to suppress it — confirmed
    // directly on R02401 (repair-gated, mustCross:6/mustPass:8, never solved by repair): both
    // ordinary-tier probe attempts (2,000,000 nodes each, one per REPAIR_PROBE_ORDINARY_SEED_SALTS
    // entry) ran to completion, ~5.5s + ~5.2s, entirely unaffected by
    // repairBudgetFractionOverride: 0 — the exact ~10.7s this dose-response run's overshoot traced
    // to. This silently broke the documented cost guarantee for the two interactive UI callers too
    // (solver-controller.ts's "Find 1 Hint", review-controller.ts's review-approval solve, both of
    // which pass repairBudgetFractionOverride: 0 specifically to bound their ~30s progress-bar
    // promise) — the probe was never covered by that override at all, on any repair-gated level a
    // real player could hit. Fixed by skipping the probe outright when the resolved fraction is
    // exactly 0, the same "no repair-related cost, period" signal the later fallback loop already
    // honors. Every other value (undefined/production-default, or any nonzero override) leaves the
    // probe's own fixed node-budget behavior completely unchanged from before this fix.
    // Ablation: STRATEGY_REPAIR_PROBE skips only the probe (the full-budget fallback loop below
    // still runs), isolating the probe's own scheduling contribution from repair-search itself.
    const probeAttempts: Attempt[] = primeMissAttempt ? [primeMissAttempt] : [];
    if (repairConfigs.length > 0 && repairBudgetFraction !== 0 && (!cfg || cfg.STRATEGY_REPAIR_PROBE)) {
        const probe = await runRepairProbe(repairConfigs, activeGates, level, prep, yieldFn, cfg, nodeBudget);
        probeAttempts.push(...probe.attempts);
        if (probe.solution) {
            const totalMs = Date.now() - levelStartTime;
            const nodesExpanded = prep._metrics.nodesExpanded;
            return { ok: true, status: 'success', solution: probe.solution, solutions: [probe.solution], attempts: probeAttempts, totalMs, nodesExpanded };
        }
        // The probe now self-limits against the external nodeBudget (see runRepairProbe's own
        // comment) but only between seed-salt rounds, its smallest independently-costed unit — it
        // can still overshoot by up to one round's own cost, so re-check before spending any more
        // nodes in the main loop.
        if (prep._metrics.nodesExpanded >= nodeBudget) {
            const totalMs = Date.now() - levelStartTime;
            return { ok: false, status: 'node-budget-reached', solution: null, solutions: [], attempts: probeAttempts, totalMs, nodesExpanded: prep._metrics.nodesExpanded, nodeBudgetReached: true };
        }
    }

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    //
    // Deliberately timed from mainLoopStartTime (now), NOT levelStartTime: both main-loop
    // runners compute each attempt's share as timeBudgetMs minus elapsed-since-start, so
    // timing them from the original levelStartTime would let the probe's wall-clock silently
    // shrink the main loop's own budget — reintroducing exactly the "reserve budget up front"
    // regression mechanism REPAIR_EXTRA_BUDGET_FRACTION's own comment documents (S017). A
    // first version of this probe used levelStartTime here and was caught by a full-corpus
    // regression sweep: several fast main-loop solves (S038, S050, S026, S027, S110, S023,
    // S018) lost just enough of their first attempt's budget to fail it, cascading into the
    // full repair fallback chain (some 50-100x slower). mainLoopStartTime gives the main loop
    // its full, untouched timeBudgetMs window regardless of how long the probe ran.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    const mainLoopStartTime = Date.now();
    const result = useInterleaving && activeGates.length > 1
        ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, nodeBudget)
        : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, nodeBudget);
    result.attempts = [...probeAttempts, ...result.attempts];

    // repairBudgetFraction was already resolved above (before the early probe) — reused here
    // unchanged for the full-budget fallback loop, same as before this fix.
    for (const repairConfig of repairConfigs) {
        if (result.solution) break;
        if (prep._metrics.nodesExpanded >= nodeBudget) break;
        const repairTotalBudget = Math.floor(timeBudgetMs * repairBudgetFraction);
        const repairStart = Date.now();
        for (let gi = 0; gi < activeGates.length; gi++) {
            if (prep._metrics.nodesExpanded >= nodeBudget) break;
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - repairStart;
            const gatesLeft = activeGates.length - gi;
            const repairBudget = Math.floor((repairTotalBudget - elapsed) / gatesLeft);
            if (repairBudget < 50) break;
            // Remaining GLOBAL node budget, recomputed fresh before each call: repairSearchFromGate's
            // own nodeBudget param counts nodes LOCAL to that one call (nodesExpandedLocal starts at
            // 0 each time), so passing the external total directly would compare a per-call counter
            // against a whole-solve target — recomputing the remainder keeps it correct regardless
            // of how many nodes earlier attempts already spent.
            const remainingNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - prep._metrics.nodesExpanded);
            const r = await runAttempt(gateKey, level, prep, repairConfig, repairBudget, Date.now(), yieldFn, remainingNodeBudget);
            result.attempts.push(r.attempt);
            if (r.path) { result.solution = r.path; break; }
        }
    }

    // Last-resort attraction-diversity pass (ATTRACTION_DIVERSITY_BUDGET_FRACTION, attempts.ts's
    // ATTRACTION_DIVERSITY_CANDIDATE_FLAGS) — a whole extra rerun of the SAME mainConfigs ladder,
    // with the candidate scoring flag(s) disabled for its duration, only after the main loop AND
    // repair fallback have both already failed on every gate. See the fraction constant's own
    // comment for why a whole-ladder rerun (not one narrow attempt) is needed, and why the budget
    // is small and strictly additive, same pattern as the repair loop just above.
    //
    // opts.attractionDiversityBudgetFractionOverride is its OWN dedicated override, deliberately
    // separate from repairBudgetFractionOverride (see that field's own comment on SolveOpts for
    // why) — solver-controller.ts / review-controller.ts pass 0 for both, to keep their interactive
    // progress bar's ~30s promise; a solver-testing sweep can pass 0 for just this one to isolate
    // repair's own cost, or 0 for repair's while leaving this one at its default to isolate this
    // pass's own cost. opts.disableExtraBudgetPasses is a purely-additive convenience that sets
    // 0 for both at once (see its own comment on SolveOpts) — prefer it over remembering both
    // individual overrides unless a sweep specifically needs to isolate just one.
    const diversityFractionOverride = Number(opts.attractionDiversityBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const diversityBudgetFraction = Number.isFinite(diversityFractionOverride) && diversityFractionOverride >= 0
        ? diversityFractionOverride
        : ATTRACTION_DIVERSITY_BUDGET_FRACTION;
    if (!result.solution && diversityBudgetFraction > 0 && (!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY) && prep._metrics.nodesExpanded < nodeBudget) {
        const diversityBudget = Math.floor(timeBudgetMs * diversityBudgetFraction);
        // SCORE_* flags don't affect getConfiguredAttemptConfigs's config selection (only
        // STRATEGY_*/PROFILE_*/TEMPLATE_* do), so reusing mainConfigs (built under the original
        // cfg) under this overridden prep._cfg selects the exact same attempts the diagnosis's own
        // full re-solve-with-ablation would have selected.
        //
        // A Proxy, NOT a plain `{ ...(originalCfg ?? {}) }` spread: every ablation-gated check in
        // this file and repair-search.ts/attempts.ts reads `(!cfg || cfg.SOME_FLAG)` — "no ablation
        // object at all" is the only way an unset flag defaults to enabled. `originalCfg` is most
        // commonly `null` (the production default), so a plain spread produces a SPARSE object
        // ({ SCORE_GOAL_ATTRACTION: false } and nothing else) — a non-null object whose every OTHER
        // flag now reads as `undefined` (falsy), silently disabling STRATEGY_GATE_INTERLEAVING,
        // STRATEGY_MIN_BUDGET_FLOOR, STRATEGY_ARCHETYPE_ROUTING, etc. for the whole pass. This is
        // the exact bug SolveOpts's repairBudgetFractionOverride field comment already documents
        // shipping once before ("passing ANY ablation object... silently disables every OTHER unset
        // strategy flag") — caught here empirically: an initial version using the plain-spread form
        // failed to rescue any of the 3 known R00156/R02960 variants even at a full extra 15s
        // budget, while a standalone plain-ablation call (bypassing this pass entirely) rescued one
        // of them in 788ms — isolating the difference to exactly this. The Proxy instead falls
        // through to `true` for any flag not explicitly named here or already set on originalCfg,
        // faithfully reproducing "originalCfg's own settings, plus these candidate flags off, plus
        // everything else exactly as if no ablation config were present" regardless of whether
        // originalCfg itself was null or a real (sparse-or-not) config object.
        const originalCfg = prep._cfg;
        const diversityCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if ((ATTRACTION_DIVERSITY_CANDIDATE_FLAGS as readonly string[]).includes(prop)) return false;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                return true;
            },
        });
        prep._cfg = diversityCfg;
        try {
            const diversityStart = Date.now();
            // Pass the ABSOLUTE nodeBudget here, NOT a remaining/relative value — unlike the repair
            // loop just above (which calls runAttempt -> repairSearchFromGate, whose own nodeBudget
            // param counts nodes LOCAL to that one call, starting fresh at 0, so a remaining-budget
            // value is correct there), runInterleavedAttempts/runGateSerialAttempts check nodeBudget
            // directly against prep._metrics.nodesExpanded — the GLOBAL cumulative counter, already
            // carrying the main loop's own nodes — exactly as the main loop's own call to these same
            // functions does a few lines above (passing raw `nodeBudget`, not a remainder, since
            // nodesExpanded is 0 when IT runs). An earlier version of this copied the repair loop's
            // remaining-budget pattern without checking that these two callees have different
            // (absolute vs. local-relative) nodeBudget semantics — caught by a unit test: passing a
            // remaining value of e.g. 112 when 288 nodes were already globally spent made the check
            // `288 >= 112` true immediately, silently skipping the whole pass on any level where the
            // main loop's own node spend already exceeded the REMAINDER (even though plenty of
            // absolute budget was left).
            const diversityResult = useInterleaving && activeGates.length > 1
                ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, diversityBudget, diversityStart, yieldFn, nodeBudget)
                : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, diversityBudget, diversityStart, yieldFn, nodeBudget);
            for (const attempt of diversityResult.attempts) attempt.attractionDiversity = true;
            result.attempts.push(...diversityResult.attempts);
            if (diversityResult.solution) result.solution = diversityResult.solution;
        } finally {
            prep._cfg = originalCfg;
        }
    }

    // Last-resort admissible-order-search tier (ADMISSIBLE_ORDER_BUDGET_FRACTION, attempts.ts's
    // ADMISSIBLE_ORDER_PROFILES), only after the main loop, repair fallback, AND attraction-diversity
    // pass have all already failed on every gate. EACH profile gets its OWN full, unshared budget
    // slice, divided across gates only (never diluted by sibling profiles) — same per-config,
    // per-gate-division, early-exit shape as the repair fallback loop above, NOT the attraction-
    // diversity pass's single combined rerun. This matters because every one of this technique's
    // validated solves was found with its own full per-profile budget standalone (method-probe.mjs's
    // `--only=ida:<one profile>` runs, never multiple profiles sharing one call) — an earlier version
    // of this wiring ran every listed profile through ONE combined runInterleavedAttempts/
    // runGateSerialAttempts call sharing ADMISSIBLE_ORDER_BUDGET_FRACTION's single total, which
    // starved 'default' (this technique's largest contributor, 103 of 115 validated solves) well
    // below its validated condition — confirmed directly: several already-validated 'default'-profile
    // solves failed to reproduce through the real solveLevel() ladder until this per-config
    // restructure. See that constant's own comment for the worst-case-time tradeoff this accepts.
    const admissibleOrderFractionOverride = Number(opts.admissibleOrderBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const admissibleOrderBudgetFraction = Number.isFinite(admissibleOrderFractionOverride) && admissibleOrderFractionOverride >= 0
        ? admissibleOrderFractionOverride
        : ADMISSIBLE_ORDER_BUDGET_FRACTION;
    if (admissibleOrderBudgetFraction > 0 && (!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER)) {
        for (const admissibleOrderConfig of admissibleOrderConfigs) {
            if (result.solution) break;
            if (prep._metrics.nodesExpanded >= nodeBudget) break;
            const admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction);
            const admissibleOrderStart = Date.now();
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics.nodesExpanded >= nodeBudget) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - admissibleOrderStart;
                const gatesLeft = activeGates.length - gi;
                const admissibleOrderBudget = Math.floor((admissibleOrderTotalBudget - elapsed) / gatesLeft);
                if (admissibleOrderBudget < 50) break;
                // Remaining GLOBAL node budget — see the repair fallback loop's identical recompute.
                const remainingNodeBudget = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - prep._metrics.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, admissibleOrderBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(r.attempt);
                if (r.path) { result.solution = r.path; break; }
            }
        }
    }

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    const nodeBudgetReached = nodeBudget !== Infinity && nodesExpanded >= nodeBudget;
    if (result.solution) {
        return { ok: true, status: 'success', solution: result.solution, solutions: [result.solution], attempts: result.attempts, totalMs, nodesExpanded };
    }
    const status = nodeBudgetReached ? 'node-budget-reached' : (totalMs >= timeBudgetMs ? 'timeout' : 'failed');
    return { ok: false, status, solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded, nodeBudgetReached };
}
