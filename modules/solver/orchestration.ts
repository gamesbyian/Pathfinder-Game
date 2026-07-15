import { PORTFOLIO_EXPERIMENT } from '../../data/config/portfolio-experiment.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import { beamSearchFromGate, dfsFromGateLDS } from './search.js';
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
    /** Repair attempts only, diagnostic-only (see runRepairProbe's multi-seed retry) — absent
     *  (equivalent to 0) for the first, ordinary-seed round; present and nonzero only for a retry
     *  round reached after every active gate already failed at every earlier seed. Not read by
     *  any solving logic, purely so external tooling can tell a retry-round win apart from an
     *  ordinary one without re-deriving it from attempt order. */
    seedSalt?: number;
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
     *  PRECISION CAVEAT: only tight (typically within tens of nodes) when nodeBudget is larger
     *  than the repair probe's own fixed internal ceilings (REPAIR_PROBE_ORDINARY_NODE_BUDGET +
     *  REPAIR_PROBE_BIASED_NODE_BUDGET, currently 8,000,000 combined) — the probe spends its own
     *  budget internally before this option gets a chance to check in. Below that, this can
     *  overshoot by up to the probe's cost. Callers needing tight enforcement at small budgets
     *  should pick nodeBudget comfortably above 8,000,000 rather than relying on precision at
     *  smaller values. */
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
}
interface SolveResult { ok: boolean; status: string; solution: number[] | null; solutions: number[][]; attempts: Attempt[]; totalMs: number; nodesExpanded: number; nodeBudgetReached?: boolean; schedulerMode?: 'legacy' | 'portfolio-experiment'; portfolio?: { solvedBeforeFallback: boolean; fallbackAttemptCount: number; repeatedAttemptElapsedMs: number; repeatedPrefixNodeUpperBound: number; runtimeBreakdown?: { prepMs: number; portfolioAttemptSearchMs: number; schedulerOverheadMs: number; fallbackSearchMs: number; totalMs: number; }; }; }

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
async function runAttempt(
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
    const { profileName, template, beamWidth, diverseBeam, repair, repairMustTurnBiased } = attemptConfig;
    const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
    // Always non-null internally so every branch below can report through the same object,
    // whether or not the caller supplied one (runRepairProbe passes its own, to also read
    // nodesExpanded back for its cross-gate node-budget accounting; ordinary callers don't).
    const searchOut = nodesOut ?? {};
    const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
    let path: number[] | null = null;
    try {
        path = repair
            ? await repairSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn, !!repairMustTurnBiased, nodeBudget, searchOut, seedSalt)
            : beamWidth
            ? await beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth, yieldFn, diverseBeam, searchOut)
            : await dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn, searchOut);
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
            ...(!path && searchOut.timedOut !== undefined ? { timedOut: searchOut.timedOut } : {}),
            ...(!path && Number.isFinite(searchOut.bestBadness) ? { bestBadness: searchOut.bestBadness } : {}),
            ...(!path && Number.isFinite(searchOut.finalBadness) ? { finalBadness: searchOut.finalBadness } : {}),
            ...(diverseBeam ? { diverseBeam: true } : {}),
            ...(repair ? { repair: true } : {}),
            ...(repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
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
            const pairShare = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR gates the per-attempt-config minimum
            // budget-share floor (long-multigate perimeter beams, must-cross diverse-beam
            // threads) — disabling it falls back to the flat even split for every config.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            const gateShare = (timeBudgetMs - elapsed) / activeGates.length;
            let attBudget = minFrac > 0
                ? Math.max(Math.floor(gateShare * minFrac), pairShare)
                : pairShare;
            if (gateProgress && ci >= 1) {
                attBudget = Math.max(50, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress)));
            }
            if (attBudget < 50) return { solution: null, attempts };

            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn);
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
            const evenShare = Math.floor(remaining / attemptsLeft);
            const attBudget = minFrac > 0
                ? Math.max(Math.floor(remaining * minFrac), evenShare)
                : evenShare;
            if (attBudget < 50) break;

            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn);
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
 *  **Width is a recall-vs-cost tradeoff, not a free correctness win — measured, not assumed.**
 *  A first version tried salts [0,1,2,3,4] (4 retries), picked from which single salt rescued each
 *  of 4 hand-checked cases (P00146 + 3 rotated siblings — needed salts 1, 2, 2, 4 respectively).
 *  That width passed `solver:bench --check` (160/160, no regressions) but a full-corpus before/after
 *  speed sweep caught what the solvability check couldn't see: total time went from 42.0s to 47.7s
 *  (+14%) at budgetMs=30000, entirely from one level (P00144) whose probe now exhausts all 4 retry
 *  seeds (never rescued at any of them) before falling through to the same fallback path that
 *  solved it before this feature existed — pure waste on that level, only partly offset by the one
 *  level in the corpus (P00146) the retries do rescue. Node-cost data per seed (measured directly,
 *  not estimated) also showed a *rescuing* seed is not reliably cheap: of the 4 calibration cases,
 *  only P00146 rescued cheaply (417,424 nodes, ~21% of the 2,000,000 budget) — the 3 siblings needed
 *  1,266,171–1,871,463 nodes (63–94% of budget) to rescue, so a smaller per-seed node budget would
 *  have missed most of the known rescues rather than saving cost cheaply.
 *  Current width [0,1,2] (2 retries) trades this down: retains the rescue for 3 of the 4
 *  calibration cases (misses only the one needing salt=4) while capping a never-rescued level's
 *  worst-case probe cost at 3x the base budget instead of 5x. Re-verify with a full-corpus
 *  before/after speed sweep (not just solver:bench --check — see CLAUDE.md's gotcha on this and
 *  docs/testing.md's "Speed, separately from solvability") before changing this list again.
 *
 *  Deliberately scoped to the ORDINARY tier only (REPAIR_PROBE_ORDINARY_NODE_BUDGET), not the
 *  must-turn-biased one: no rescue evidence was gathered for the biased tier, and its own history
 *  (see repair-search.ts's EXIT_GUIDANCE_EPSILON_BOOST comment — S030 regressed at every nonzero
 *  nudge tried, even on an independent RNG stream) shows it's unusually sensitive to any change, so
 *  widening it without specific evidence is a needless risk. Each retry salt gets the SAME node
 *  budget as the first round — strictly additive: only reached when every active gate has already
 *  failed at every earlier salt, so a level whose probe already succeeds on the first (default)
 *  seed is completely unaffected. Ablation: STRATEGY_REPAIR_PROBE_MULTI_SEED (default enabled). */
const REPAIR_PROBE_ORDINARY_SEED_SALTS = [0, 1, 2];

/** Tries each repairConfig (ordinary, then must-turn-biased if present) at a per-config node
 *  budget (REPAIR_PROBE_ORDINARY_NODE_BUDGET / _BIASED_NODE_BUDGET — see their comment) split
 *  across activeGates by nodes consumed so far (mirrors the per-gate ms-budget split the
 *  full-budget repair loop in solveLevel uses, just node-counted and at much smaller totals).
 *  The outer per-gate/per-attempt ms budget (attBudget, below) stays a generous, effectively
 *  non-binding safety net — the node budget is what actually decides the probe's outcome. The
 *  ORDINARY config is additionally retried across REPAIR_PROBE_ORDINARY_SEED_SALTS (see its own
 *  comment) before moving on to the next config or giving up — every salt after the first only
 *  runs if every active gate already failed at every earlier salt; the must-turn-biased config
 *  always runs at a single seed (salt 0), unchanged from before this retry existed. */
async function runRepairProbe(
    repairConfigs: AttemptConfig[], activeGates: number[], level: NormalizedLevel,
    prep: PrepLevel, yieldFn: YieldFn, cfg: AblationConfig | null,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    for (const repairConfig of repairConfigs) {
        const probeNodeBudget = repairConfig.repairMustTurnBiased ? REPAIR_PROBE_BIASED_NODE_BUDGET : REPAIR_PROBE_ORDINARY_NODE_BUDGET;
        const seedSalts = (!repairConfig.repairMustTurnBiased && (!cfg || cfg.STRATEGY_REPAIR_PROBE_MULTI_SEED))
            ? REPAIR_PROBE_ORDINARY_SEED_SALTS : [0];
        for (const seedSalt of seedSalts) {
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


function attemptConfigKey(config: AttemptConfig): string {
    const mode = config.beamWidth ? 'beam' : 'dfs';
    const template = config.template?.id ? `/${config.template.id}` : '';
    const beam = config.beamWidth ? `@beam${config.beamWidth}` : '';
    const diverse = config.diverseBeam ? '(diverse)' : '';
    const repair = config.repair ? ':repair' : '';
    const biased = config.repairMustTurnBiased ? '(mustTurnBiased)' : '';
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
    const cfg = opts.ablation ?? null;
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

    // Ablation config: attach to prep so all inner functions can read it.
    const cfg = opts.ablation ?? null;
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

    // The repair fallback(s) (attempts.ts's needsRepairFallback / repairMustTurnBiasedAttempt)
    // are pulled out of the normal per-config loop and run afterward, each with its own extra
    // budget (REPAIR_EXTRA_BUDGET_FRACTION) — mainConfigs excludes them so neither competes for
    // a share of timeBudgetMs. Absent on every level outside those feature gates, so mainConfigs
    // === baseConfigs there, unchanged. There can be up to two: the ordinary repair attempt, and
    // (must-turn levels only) a second, exit-guidance-biased attempt that only ever runs if the
    // first one fails on every gate — see AttemptConfig.repairMustTurnBiased.
    const repairConfigs = baseConfigs.filter(c => c.repair);
    const mainConfigs = repairConfigs.length > 0 ? baseConfigs.filter(c => !c.repair) : baseConfigs;

    // Early, strictly-additive probe of the repair fallback — see REPAIR_PROBE_ORDINARY_NODE_BUDGET
    // / REPAIR_PROBE_BIASED_NODE_BUDGET. Absent (and free) on every level outside the repair
    // feature gate, since repairConfigs is empty there.
    // Ablation: STRATEGY_REPAIR_PROBE skips only the probe (the full-budget fallback loop below
    // still runs), isolating the probe's own scheduling contribution from repair-search itself.
    const probeAttempts: Attempt[] = [];
    if (repairConfigs.length > 0 && (!cfg || cfg.STRATEGY_REPAIR_PROBE)) {
        const probe = await runRepairProbe(repairConfigs, activeGates, level, prep, yieldFn, cfg);
        probeAttempts.push(...probe.attempts);
        if (probe.solution) {
            const totalMs = Date.now() - levelStartTime;
            const nodesExpanded = prep._metrics.nodesExpanded;
            return { ok: true, status: 'success', solution: probe.solution, solutions: [probe.solution], attempts: probeAttempts, totalMs, nodesExpanded };
        }
        // The probe has its own internal node budgets (REPAIR_PROBE_ORDINARY/BIASED_NODE_BUDGET)
        // for a different purpose (probe sizing); this external nodeBudget can still be exceeded
        // by the probe alone, so re-check it before spending any more nodes in the main loop.
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

    // opts.repairBudgetFractionOverride (NOT an ablation flag — see SolveOpts's field comment for
    // why) lets offline batch tooling shrink/grow the repair fallback's extra budget for a
    // faster/bounded dev-loop run, without touching the tuned production constant — absent (the
    // common case) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly.
    const repairFractionOverride = Number(opts.repairBudgetFractionOverride);
    const repairBudgetFraction = Number.isFinite(repairFractionOverride) && repairFractionOverride >= 0
        ? repairFractionOverride
        : REPAIR_EXTRA_BUDGET_FRACTION;
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

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    const nodeBudgetReached = nodeBudget !== Infinity && nodesExpanded >= nodeBudget;
    if (result.solution) {
        return { ok: true, status: 'success', solution: result.solution, solutions: [result.solution], attempts: result.attempts, totalMs, nodesExpanded };
    }
    const status = nodeBudgetReached ? 'node-budget-reached' : (totalMs >= timeBudgetMs ? 'timeout' : 'failed');
    return { ok: false, status, solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded, nodeBudgetReached };
}
