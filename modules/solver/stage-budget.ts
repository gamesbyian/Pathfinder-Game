/**
 * Canonical solver budget policy: the tuned fraction/reserve constants for every retry-tier
 * budget extension, and the pure cascade that turns them (plus a solve's opts/cfg/config counts)
 * into the actual ceilings each stage executes against.
 *
 * This is the ONE place that computes stage budget allocation. `orchestration.ts` calls
 * `computeStageBudgetPlan` (and, once the repair probe has run, `computeShrinkRecoveryBudget`)
 * instead of deriving any of these fractions/reserves/ceilings itself — see docs/architecture-
 * unification-audit.md and stage-policy.ts's `BudgetEnvelope` for the vocabulary this plan is
 * expressed in. `orchestration.ts` re-exports the constants below for existing external
 * consumers (scripts/solver-parallel/race.mjs) so their public names/locations are unchanged.
 *
 * Every reserve here stacks in a fixed order (documented at each field), same as before this
 * module existed — this file is a behavior-preserving relocation of that cascade out of
 * orchestration.ts, not a redesign. See each constant's own comment for the calibration
 * evidence/report pointer; docs/solver-optimization-current-queue.md tracks current promotion
 * status.
 */
import { createBudgetEnvelope } from './stage-policy.js';
import type { BudgetEnvelope, SolverStageId } from './stage-policy.js';
import type { AblationConfig } from './types.js';

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

/** Fraction of the caller's external `nodeBudget` WITHHELD from every earlier tier (repair probe,
 *  main loop, repair fallback, attraction-diversity pass) and left for the admissible-order tier.
 *
 *  WHY THIS EXISTS — the tier was provisioned in one unit and starved in another. Its budget above
 *  is a TIME fraction, but what actually stops a level in a batch run is `nodeBudget`, a single
 *  CUMULATIVE ceiling every tier checks against the same running `prep._metrics.nodesExpanded`.
 *  The earlier tiers therefore consumed the whole ceiling and this tier — last in line, and reached
 *  only after 1x + up to 6x + 1x timeBudgetMs has already failed — hit its own
 *  `nodesExpanded >= nodeBudget` guard and broke out immediately, having run nothing. Measured on
 *  the 2026-07-30T114427Z typical-budget corpus-2 baseline: of the 141 unsolved levels that carry a
 *  validated admissible-order hint, ALL 141 terminated at nodesExpanded >= the 20,000,000 cap after
 *  a mean of 14.4 ladder attempts, and an admissible-order sub-pass was recorded on exactly 1 of
 *  them (the tier's 'none' profile is exclusive to it, so the attempt log is unambiguous). Giving
 *  the tier more CLOCK could never have fixed this; it was receiving no NODES.
 *
 *  Same bug shape as the 2026-07-17 repair-probe node-budget starvation (see runRepairProbe's own
 *  comment): a component sized against its own internal budget while a different, external, cumulative
 *  budget is what really governs it.
 *
 *  A RESERVE, NOT A REORDER. The tier keeps its last-resort position; it is only guaranteed a slice
 *  of the ceiling to spend once it gets there. That is the smaller behavioural change, and the one
 *  the diagnosis implies — nothing measured says this technique should run EARLIER, only that it
 *  should run at all.
 *
 *  0.25, sized from that same baseline against both directions of a zero-sum reallocation:
 *    - Upside: 78 of the 141 levels' cheapest recorded admissible-order find cost <= 5,000,000
 *      nodes (the median find is 3.4M — 17% of the cap; this is a technique that needs a slice, not
 *      a bigger cap).
 *    - Downside: only 5 of the 434 currently-solved corpus-2 levels spend more than the 15,000,000
 *      the earlier tiers would retain. Solved levels spend a MEDIAN of 0.33M nodes (1.6% of the
 *      cap), so a slice withheld from the tail is drawn almost entirely from levels already failing.
 *    - The curve knees here: 0.20 covers 75 finds for the same 5 at risk, 0.30 covers 79 for 7.
 *  Neither number is a prediction — coverage is "the find is cheap enough to fit", not "it will
 *  reproduce through the real ladder" — but they bound a reallocation whose precedents in this repo
 *  (MST tightening -12, routing-regime selection -4/-8) came up negative, and this one's asymmetry is
 *  measured rather than assumed. A/B: reports/2026-07-30-admissible-order-node-reserve.md.
 *
 *  STRICTLY A NO-OP unless a finite external `nodeBudget` is set AND this tier is actually going to
 *  run (nonzero fraction, STRATEGY_ADMISSIBLE_ORDER enabled, at least one profile configured).
 *  `nodeBudget` is offline-batch-only, so every production path — Play/Editor/Review hint solves,
 *  which pass no nodeBudget and use disableExtraBudgetPasses anyway — is bit-identical to before.
 *  See solveLevel's own reserve resolution for the guard, and note in particular that the reserve
 *  must be 0 whenever the tier is suppressed, or an exhausted early tier would start reporting
 *  status 'failed' where it used to report 'node-budget-reached'. */
export const ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25;

/** See the read site's own comment (`admissibleOrderProfileNodeReserve` in `solveLevel`) for the
 *  full derivation, the R03148 precedent this targets, and the asymmetric-risk caution specific to
 *  this mechanism. A fraction OF `admissibleOrderNodeReserve` (never of `nodeBudget` directly)
 *  withheld from the tier's dominant `'default'` profile specifically, for the other four profiles.
 *  0.15 is an unvalidated starting point, matching this session's other new reserves — opt-in,
 *  default OFF; do not promote without a dedicated A/B that specifically checks 'default'-winning
 *  levels are unaffected, not just that new solves appear. */
export const ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION = 0.15;

/** Default reserve fraction/config-count for main-loop late-suffix starvation mitigation.
 *  STRATEGY_MAIN_LOOP_LATE_RESERVE is production default-ON as of 2026-08-12; the mechanism is
 *  still a strict no-op unless a finite `nodeBudget` is supplied (offline batch tooling only —
 *  see mainLoopLateReserveEligible below), so this changed no interactive Play/Editor/Review
 *  behavior. 0.15 is the frozen level-blind population A/B's winning arm — see
 *  docs/main-loop-late-reserve-experiment.md and reports/2026-08-12-main-loop-late-reserve-population-ab.md.
 *
 *  CONFIG_COUNT raised 4->5 (2026-08-22, docs/solver-optimization-current-queue.md Priority 7 /
 *  solver-future-work.md's "must-cross-heavy diverse-beam gaps blocked on reserve-slot budget"):
 *  two must-cross-heavy sub-rules' 4-slot trailing reserve was already fully occupied by an
 *  already-validated perimeter-direction fix, leaving no room to add a missing diverse-WIDE-beam
 *  config (R02299/R02159, both genuinely never offered, not budget-starved) without evicting an
 *  already-solving level's protected config. Since this is a FRACTION of `earlyTierNodeBudget`
 *  (MAIN_LOOP_LATE_RESERVE_FRACTION, unchanged), not a fixed per-config amount, widening the
 *  protected window to 5 spreads the SAME reserve pool one slot thinner rather than growing it —
 *  confirmed a strict no-op on the published corpus with no rule content changed (160/160
 *  identical solved set, byte-identical nodesExpanded per level, count=4 vs count=5, node-budget
 *  50,000,000: see the 2026-08-22 queue entry for the local portfolio-solve-sweep evidence). Only
 *  the two must-cross-heavy rules gained a genuine 5th trailing config as part of this change;
 *  every other rule's existing last-4 configs merely gained one more protected neighbor. */
export const MAIN_LOOP_LATE_RESERVE_FRACTION = 0.15;
export const MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT = 5;

/** STRATEGY_REPAIR_FALLBACK_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated mechanism, landed
 *  2026-08-13). Withholds a slice of `earlyTierNodeBudget` from the probe and the whole main loop
 *  (early + late suffix combined), the same way ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION withholds a
 *  slice from everything before IT — except this reserve protects the repair fallback loop (and,
 *  as a side effect, whatever the attraction-diversity pass finds still available afterward) from
 *  the main loop's own consumption.
 *
 *  THE PROBLEM: the repair fallback loop and the attraction-diversity pass share `earlyTierNodeBudget`
 *  with the main loop, completely unprotected — the main loop always runs first (it's simply the
 *  next stage in solveLevel's ladder) and can consume the entire pool before either ever gets a
 *  single node. Confirmed directly on an n=8 local repair-gated Corpus-2 sample (15,000,000-node
 *  budget, `--workers=1`): 5 of 6 unsolved levels gave the repair fallback loop ZERO attempts, and
 *  all 6 gave the attraction-diversity pass ZERO attempts — while the admissible-order tier, which
 *  DOES have its own reserve, got its own slice on every one of the same 6 levels. Same clean
 *  before/after control, same starvation shape as the already-fixed repair-probe/early-main-loop
 *  bug (STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET) and the already-fixed admissible-order bug
 *  (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION), one tier boundary further down the ladder.
 *
 *  THE MECHANISM (see the read-site's own two-revision history for the full derivation): a flat
 *  carve-out, but NOT directly from `earlyTierNodeBudget` the way ADMISSIBLE_ORDER_NODE_RESERVE_
 *  FRACTION carves from ITS ceiling — two revisions found that both naive placements (before the
 *  probe's own ceiling; independently after it with a Math.max clamp) actively regressed real
 *  solves by taking budget from something already load-bearing (the probe, the main loop's own
 *  attempt shares, or the already-validated STRATEGY_MAIN_LOOP_LATE_RESERVE's entire slice). The
 *  landed mechanism instead takes this fraction OF `mainLoopLateReserve` itself — "of whatever the
 *  late suffix would get, hand some to the fallback loop instead" — which is provably safe for the
 *  probe/early-config prefix (untouched, always) and only partially reduces (not zeroes) the late
 *  suffix's own room. Not the repair-probe fix's live-signal shrink either (that fix needed live
 *  conditioning because a STATIC shrink of the PROBE itself was zero-sum — see
 *  REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE's own comment) — this is still a flat reserve, just
 *  scoped to a narrower, safer slice of the budget than the first two attempts used.
 *
 *  CALIBRATION CAVEAT: 0.15 is a starting point (a modest fraction OF the late-suffix reserve, not
 *  of the whole pool — considerably smaller in absolute terms than either existing reserve), NOT a
 *  value derived from any A/B on this specific mechanism. Landed opt-in, default OFF, specifically
 *  so it can be iterated on and measured before any promotion decision — do not promote without a
 *  dedicated A/B, per this codebase's standing discipline for every reserve/allocation mechanism
 *  above. */
export const REPAIR_FALLBACK_NODE_RESERVE_FRACTION = 0.15;

/** STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated mechanism,
 *  landed 2026-08-13, same day as and directly motivated by REPAIR_FALLBACK_NODE_RESERVE_FRACTION's
 *  own close-out). Protects the attraction-diversity pass's slice of `earlyTierNodeBudget` from the
 *  repair fallback loop specifically — not just from the main loop, which
 *  REPAIR_FALLBACK_NODE_RESERVE_FRACTION already (only incidentally) does.
 *
 *  THE PROBLEM: the repair fallback loop and the attraction-diversity pass run in that order and
 *  share one ceiling (`earlyTierNodeBudget`) — the repair loop always goes first, so it can consume
 *  every node `REPAIR_FALLBACK_NODE_RESERVE_FRACTION` freed up before the diversity pass ever gets
 *  one. That reserve's own close-out measurement (300-level GHA A/B + a 30-level local telemetry
 *  slice, see its own comment) proved this is exactly what happens in practice: every ordinary
 *  repair-fallback attempt burns its FULL node ceiling every time (near-identical ~337.5k nodes
 *  across 26/26 sampled attempts) — a plateau, not exhaustion-then-stop — so there is never anything
 *  left over for the diversity pass on a repair-gated level. The ORIGINAL n=8 measurement (quoted in
 *  REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own comment) already showed this starkly: 6/6 unsolved
 *  sample levels gave the attraction-diversity pass ZERO attempts, same as the repair loop's 5/6.
 *
 *  UNLIKE the now-closed repair-fallback reserve, this pass is a plausible beneficiary of extra room:
 *  it is not an iterated-local-search restart loop that plateaus (see
 *  docs/repair-search-stagnation-escape-plan.md) — it is a full deterministic rerun of the SAME
 *  DFS/beam mainConfigs ladder with `SCORE_GOAL_ATTRACTION` disabled, built for a DIFFERENT, already-
 *  documented failure mode (a small family of position/attraction scoring terms locking an otherwise-
 *  solvable level into a self-defeating structural commitment — see ATTRACTION_DIVERSITY_BUDGET_
 *  FRACTION's own comment). Whether real node room actually helps it is exactly what this flag's own
 *  eventual A/B must show — this comment only establishes why the starvation premise is real and why
 *  the receptor is a priori more promising than the one just closed, not that the fix works.
 *
 *  THE MECHANISM: a fraction of the ALREADY-SAFE remainder `mainLoopLateReserve - repairFallback
 *  NodeReserve` (never of `mainLoopLateReserve` or `earlyTierNodeBudget` directly) — nesting one
 *  level deeper than the repair-fallback reserve nests inside `mainLoopLateReserve`, for the exact
 *  same reason: `repairFallbackNodeReserve + attractionDiversityNodeReserve <= mainLoopLateReserve`
 *  holds BY CONSTRUCTION (both fractions clamped to [0,1]), so `mainLoopNodeBudget >=
 *  mainLoopEarlyNodeBudget` still holds without a clamp, and the probe/early-config prefix stays
 *  completely untouched — the same soundness argument REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own
 *  comment derives, one layer further down. The repair-fallback loop's own ceiling is capped at
 *  `earlyTierNodeBudget - attractionDiversityNodeReserve` (protecting the diversity pass's slice from
 *  it specifically); the diversity pass's own check is unchanged (`< earlyTierNodeBudget`), so it can
 *  spend its own reserved slice plus anything the repair loop left unused, exactly mirroring how the
 *  repair loop itself could already spend its reserve plus anything the main loop left unused.
 *
 *  CALIBRATION CAVEAT: 0.15 is a starting point copied from the repair-fallback reserve's own
 *  starting fraction, NOT derived from any A/B on this specific mechanism. Landed opt-in, default
 *  OFF, for the same reason and under the same standing discipline — do not promote without a
 *  dedicated A/B. */
export const ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION = 0.15;

/** STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY's node reserve, as a fraction of whatever
 *  `mainLoopLateReserve` remains after the repair-fallback and attraction-diversity reserves have
 *  taken their nested slices.
 *
 *  WHY THIS EXISTS: `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` shrinks a biased repair-probe
 *  tier's node budget on the evidence of the ordinary tier's `bestBadness`. That prediction is
 *  TERMINAL today — nothing ever restores the withheld nodes, and no later tier re-runs the biased
 *  config, so a mispredicted level simply loses whatever that tier would have found. Corpus-1's
 *  `R00408` is the confirmed case: ordinary badness 13 scales the biased tier to
 *  `max(0.35, 6/13) = 0.46`, cutting it from 6,000,000 to ~2,769,231 nodes, and
 *  `dfs:repair:repair(mustTurnBiased)` — that very tier — is the configuration that solves the
 *  level with the full budget in 9.97M total nodes. Shrunk, it fails and the level then exhausts a
 *  50,000,000-node ceiling. See
 *  reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md.
 *
 *  WHY A LATE TIER RATHER THAN AN IMMEDIATE RETRY: re-running the shrunk tier inside the probe
 *  would pay `granted + full` on every level whose shrink was CORRECT — strictly worse than never
 *  shrinking at all, destroying the mechanism's entire reason to exist. Running it only after the
 *  main loop, repair fallback and attraction-diversity pass have all failed inverts that: levels
 *  that go on to solve elsewhere keep the full saving (the recovery never runs), and the recovery's
 *  cost lands only on levels that were already going to burn their whole ceiling.
 *
 *  WHY A RESERVE RATHER THAN A REORDER: the same starvation that
 *  `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` documents applies verbatim — `R00408`'s own failing
 *  trace shows the main loop and admissible-order tier consuming 24.4M and 12.5M nodes and the
 *  repair fallback never running at all, so a late tier with no withheld slice would reliably get
 *  zero nodes on exactly the levels it exists to rescue.
 *
 *  The recovery re-runs the shrunk config at its FULL budget rather than only the withheld
 *  remainder, because `repairSearchFromGate` is a pure function of `(gateKey, level, prep, profile,
 *  budget)` seeded only from `gateKey` — so a larger budget's trajectory strictly EXTENDS the
 *  smaller one's (the same property runRepairProbe's own doc comment already relies on). Replaying
 *  the granted prefix is therefore wasted compute, never a different or weaker search, and it is
 *  what makes recovery of the unshrunk result guaranteed rather than merely likely.
 *
 *  CALIBRATION CAVEAT: 0.5 is chosen so a single recovered tier can actually fit (a full biased
 *  budget is 6,000,000 nodes and the surviving late-reserve remainder is typically far smaller than
 *  the 50M ceiling), NOT derived from any A/B. Landed opt-in, default OFF, under the same standing
 *  discipline as the two reserves above — do not promote without a dedicated A/B on both corpora,
 *  and note that Corpus 1 was never in any arm of the mechanism this repairs. */
export const REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION = 0.5;
// (Read as a CEILING on the reserve, not its size: the reserve is `min(actual debt, this fraction of
// earlyTierNodeBudget)`, so it only ever withholds what a shrunk tier could really use.)

/** STRATEGY_DEDUP_NEAR_TIE_RETRY (PROMOTED to default-ON, 2026-08-15 — same day as the mechanism was
 *  built, tested opt-in, and population-validated; see the PROMOTION note below for why same-day
 *  promotion is justified here rather than the usual cooldown).
 *  A whole extra rerun of the SAME mainConfigs ladder, with STRATEGY_DEDUP_NEAR_TIE_RETENTION
 *  disabled for its duration — same shape as ATTRACTION_DIVERSITY_BUDGET_FRACTION just above,
 *  toggling search.ts's DEDUP_NEAR_TIE_MARGIN retention instead of SCORE_GOAL_ATTRACTION. Exists
 *  because a full-corpus GHA A/B (see DEDUP_NEAR_TIE_MARGIN's own comment) found that flag's
 *  default-ON retention nets -7 on Corpus 2 (27 gained / 34 lost) — not a rare edge case, so
 *  reverting it outright would give back the 27 gains for no net improvement on the loss side
 *  either. Every one of the 34 losses solves cheaply (median 6.5M nodes) WITHOUT retention, and
 *  every one of the 27 gains solves via the main ladder WITH retention — i.e. never reaches this
 *  tier — so a bounded last-resort retry with retention off should recover the losses without
 *  touching the gains. Tried DEAD LAST — after the main loop, repair fallback, attraction-diversity,
 *  repair-probe-shrink-recovery, AND the admissible-order tier have all already failed on every gate
 *  (REVISION 3, see dedupRetryNodeReserve's own comment at its computation site: an earlier position
 *  before the admissible-order tier let this tier's own extended ceiling silently starve that tier's
 *  entry guard on every level that doesn't need this one, since node accounting is one shared
 *  cumulative counter every tier's own guard checks independently).
 *
 *  PROMOTION (2026-08-15, same day as REVISION 3): went from opt-in/default-OFF to default-ON after a
 *  full-corpus GHA A/B (run 31902837955, additive-reserve + run-last design) confirmed **764/1700 on
 *  Corpus 2, +40 vs. the 724 with-fix baseline, with ZERO levels lost relative to baseline** — 33/34
 *  target losses recovered, all 27 original gains intact, +7 bonus solves, 0 collateral damage.
 *  Corpus 1 exactly matched its own baseline (95/102). This is the same-day third design revision
 *  (subtractive reserve → additive reserve → run-last), each population-tested before the next was
 *  trusted — the promotion is justified by the CLEANLINESS of the final result (a strict superset of
 *  the with-fix baseline's solved set, not merely a net-positive count), not by skipping validation
 *  rigor. Every production caller that already sets `disableExtraBudgetPasses: true` (the two
 *  interactive solve UIs, `solver-controller.ts`/`review-controller.ts`) is UNAFFECTED by this
 *  promotion — that flag zeroes this tier's budget fraction regardless of the ablation flag's default,
 *  exactly as it already does for the attraction-diversity and admissible-order tiers. The practical
 *  effect of promotion is scoped to callers that solve WITHOUT that flag (offline batch tooling,
 *  hint-discovery) — the same population this session's own validation A/Bs actually exercised.
 *
 *  1.0, matching ATTRACTION_DIVERSITY_BUDGET_FRACTION's own reasoning: a full nominal budget's
 *  worth for the whole ladder rerun, not a small fraction of it — this technique's own known-good
 *  cost data (search.ts's DEDUP_NEAR_TIE_MARGIN comment: p50=6.5M, p90=8.2M, max=34.8M of a 50M
 *  ceiling) needs headroom comparable to a level's own full first attempt at the ladder, not a
 *  sliver. NOT YET VALIDATED at population scale — this is a first cut sized from the loss
 *  population's own historical cost, not a calibrated A/B result. */
export const DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_DEDUP_NEAR_TIE_RETRY's own last-resort tier, as
 *  a fraction of `nodeBudget` — `dedupRetryNodeCeiling = nodeBudget + nodeBudget * this fraction`,
 *  NOT withheld from any earlier tier. See dedupRetryNodeReserve's own comment at its computation
 *  site (REVISION 2) for the full derivation and why this differs from every sibling reserve in this
 *  file (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION included), all of which subtract from
 *  `earlyTierNodeBudget` instead.
 *
 *  REVISION 2 (2026-08-15, same day as REVISION 1): the withheld-up-front design shipped, was
 *  population-validated (full-corpus GHA, `enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`), and turned
 *  out to be a net -17 (707 vs. the 724 baseline) — it hit its target exactly (33/34 losses
 *  recovered, 0/27 gains broken) but cost 65 unrelated levels whose main-loop ceiling was shrunk by
 *  this reserve even though they never needed the retry tier at all. Fixed by making the reserve
 *  ADDITIVE instead of subtractive (see dedupRetryNodeReserve's own comment for the mechanism) — safe
 *  by construction for production, where `nodeBudget` is always `Infinity` and this fraction is
 *  already forced to 0 regardless. Full data:
 *  reports/2026-08-15-connectivity-axis-exhausted-regression.md's "retry pass at population scale"
 *  section. RE-VALIDATED the same day, combined with REVISION 3's run-last reordering below (run
 *  31902837955): **764/1700, +40 vs. the 724 baseline, ZERO levels lost** — see
 *  DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION's own PROMOTION note above for the full result. This additive
 *  design plus REVISION 3's positioning is what's actually shipped, so that population run IS this
 *  revision's own validation, not a still-open follow-up.
 *
 *  REVISION 1 (2026-08-15, same day): an earlier version of this constant used a "floor at the
 *  tier's own call site" design instead (self-contained, no edit to the shared earlyTierNodeBudget
 *  chain) — deliberately chosen to avoid touching that chain's history of shipping regressions from
 *  exactly this kind of edit (see REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own "REVISION 1"/
 *  "REVISION 2"). That version was caught locally, before any GHA spend: the floor was
 *  `max(remainder, nodeBudget * fraction)` capped by `nodeBudget - nodesExpanded` — and every one of
 *  this tier's 34 target levels reports `node-budget-reached` under the shipped default, i.e. the
 *  main loop alone already spends the ENTIRE nodeBudget, so the cap neutralized the floor to ~0 in
 *  precisely the case the floor exists to fix. Confirmed directly: R00180 reproduced its exact GHA
 *  node count (50,000,148) locally, then the retry pass received 0 nodes and could not run. REVISION
 *  1 switched to withholding the reserve up front instead (subtractive, sibling to
 *  ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION) — this genuinely gave the tier its reserved nodes, but at
 *  the population-scale cost REVISION 2 above fixes.
 *
 *  0.25: the loss population's own cost distribution (n=34, search.ts's DEDUP_NEAR_TIE_MARGIN
 *  comment) has p90=8.2M of the 50M production ceiling — 12.5M (0.25 * 50M) covers 33 of 34 with
 *  room to spare, missing only one outlier (34.8M, itself an atypical perimeterSweep@beam2000
 *  winner, not this population's dominant intersectionHarvest/objectiveFirst@beam5000 shape). Under
 *  REVISION 2 this is no longer withheld from anyone, so this sizing only controls how much EXTRA
 *  total node spend a flagged run accepts, not a redistribution tradeoff.
 *
 *  LOCAL SPOT-CHECK (2026-08-15, real solveLevel() through the full production ladder, 50M node /
 *  86.4M-work-per-ms budget, referee-validated, under REVISION 1's subtractive design): R00180 and
 *  R00901 (both typical-cost losses, needing 5.1M/4.3M nodes respectively in the control arm) are
 *  recovered by this tier exactly as predicted — R02110 (the 34.8M outlier) is not, also exactly as
 *  predicted, since 12.5M < 34.8M. This also caught and fixed a SEPARATE bug (see
 *  dedupRetryWorkStart/dedupRetryWorkBudget at the tier's call site): the node reserve alone was not
 *  sufficient — the retry pass shares runGateSerialAttempts/runInterleavedAttempts's WORK-based
 *  attemptBudgetShare split with every earlier tier by default, and that shared pool was already ~66%
 *  spent by the time this tier ran, starving its own attempts of work even with a full node reserve
 *  genuinely available. This 3-level spot-check should still hold under REVISION 2 (the tier's own
 *  ceiling only grew), but full re-validation is population-scale-only — see REVISION 2 above. */
export const DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION = 0.25;

/** STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY (PROMOTED to default-ON, 2026-08-15 — built and
 *  population-validated the same day, directly modeled on STRATEGY_DEDUP_NEAR_TIE_RETRY).
 *
 *  Applies that tier's now-validated "run dead last, additive-only budget" pattern to a SECOND
 *  known double-edged mechanism in this file: ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION
 *  (see that constant's own comment). That reserve withholds a slice of the admissible-order tier's
 *  own node budget from `'default'` (the dominant profile, which runs first) to give the OTHER
 *  profiles (`'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/`'nearClosureRescue'`) a genuine
 *  chance — `reports/2026-07-30-admissible-order-node-reserve.md` §4 found this recovers `R03148`
 *  (`'none'` solves it at 1.97M nodes when the reserve is OFF but never runs at all when it's ON and
 *  `'default'` eats the whole pool) — but a direct test also found the SAME reserve, at the SAME
 *  fraction, turns `R02644` from SOLVED to unsolved, because `'default'` there genuinely needed more
 *  than its reserve-shrunk ceiling. Real gain, real loss, same knob — exactly the shape a bounded
 *  last-resort retry is suited to, rather than a global reserve.
 *
 *  MECHANISM: instead of shrinking `'default'`'s ceiling in the tier's own (unreserved, unchanged)
 *  pass — so `R02644`-shaped levels keep their full, already-validated chance — this tier reruns
 *  ONLY the non-`'default'` profiles, with a FRESH additive node ceiling (`nodeBudget +
 *  ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION`, mirroring dedupRetryNodeCeiling) and a
 *  fresh, additive `prep._workCap` override (see the tier's own call-site comment for why this is
 *  necessary even though the admissible-order tier's own per-profile loop calls `runAttempt`
 *  directly rather than through the shared-pool `runInterleavedAttempts`/`runGateSerialAttempts`
 *  machinery dedup-retry's own work-starvation bug came from — `prep._workCap` is itself a single
 *  mutable field on `prep`, last set by whichever of those two functions most recently dispatched an
 *  attempt, so it is NOT reliably fresh for a `runAttempt`-direct caller positioned this late in the
 *  ladder either). `'default'` is never rerun here at all — it already got its full, unreduced shot
 *  in the tier's own earlier pass and failed, so repeating it with LESS effective room (this tier's
 *  reserve fraction, however sized) would only waste budget.
 *
 *  Positioned dead last, AFTER STRATEGY_DEDUP_NEAR_TIE_RETRY (same reasoning as that tier's own
 *  REVISION 3: nothing may run after this one that still checks an unextended `nodeBudget`/
 *  `earlyTierNodeBudget`-derived ceiling, or its own extension would starve that later tier exactly
 *  the way an earlier draft of the dedup-retry tier starved the admissible-order tier itself).
 *
 *  VALIDATED then PROMOTED (2026-08-15, same day): local spot-check confirmed `R03148` recovers
 *  (1,914,111 nodes for `'none'`, referee-valid) and `R02644` is unaffected at both a solving budget
 *  (60M, byte-identical `'default'` attempt in both arms) and a non-solving one (50M, identical
 *  failure in both arms). Population-scale GHA A/B (run 31910836458, against the `764/1700`
 *  `STRATEGY_DEDUP_NEAR_TIE_RETRY`-promoted baseline) confirmed **809/1700, +45, with ZERO levels
 *  lost relative to baseline** — a strict superset of the baseline's solved set, the same clean shape
 *  that justified promoting `STRATEGY_DEDUP_NEAR_TIE_RETRY`. Unlike that tier, this one's reserve
 *  fraction held up cleanly at population scale on the FIRST population attempt (no REVISION-2/
 *  REVISION-3-style correction needed after the initial local-validation fix from 0.25 to 0.5 — see
 *  ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own comment). See
 *  reports/2026-08-15-connectivity-axis-exhausted-regression.md's "Applying the pattern elsewhere"
 *  section for the full validation writeup. Both interactive solve UIs
 *  (`solver-controller.ts`/`review-controller.ts`) are unaffected by this promotion — they already
 *  set `disableExtraBudgetPasses: true`, which zeroes this tier's budget fraction regardless of the
 *  ablation flag's default. */
export const ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own
 *  last-resort tier, as a fraction of `nodeBudget` — same ADDITIVE (not withheld-from-anyone) design
 *  as DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION, adopted from the start here rather than arrived at
 *  after a REVISION 2 correction, since that correction's lesson is now established practice for any
 *  NEW last-resort tier in this file.
 *
 *  CORRECTION (2026-08-15, same day, local testing before any GHA spend): an initial 0.25 (matching
 *  DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own starting fraction) was tried first and found
 *  useless — `R03148` still failed to recover at `nodeBudget=50M` (`+12.5M` reserve). Tracing why
 *  found real, unrelated baseline drift since `reports/2026-07-30-admissible-order-node-reserve.md`
 *  was written (16+ days, many intervening solver changes): at EVERY node-budget scale tested (20M,
 *  100M), the earlier tiers (main loop/repair/diversity) now exhaust their full `earlyTierNodeBudget`
 *  share and `'default'` then exhausts its own full remaining share too, WITHOUT EITHER SOLVING —
 *  `'default'`'s own historical 6.87M-node need (that report's own figure) has grown to ~12.5-25M
 *  depending on scale, byte-identical whether this flag is on or off (confirming the drift is
 *  unrelated to this mechanism). A diagnostic run with an artificially large reserve
 *  (`admissibleOrderNonDefaultRetryNodeReserveFractionOverride: 2.0`, giving up to +100M on a 50M
 *  budget) DID recover `R03148` — `'none'` still only needs **1,914,111 nodes**, essentially
 *  unchanged from the historical 1.97M figure, referee-valid — confirming the double-edged shape and
 *  the mechanism itself are both still real; only the reserve needed to actually REACH that cheap
 *  solve had grown, because the ladder now spends far more before this tier's turn ever comes.
 *
 *  0.5 (doubled from the 0.25 first cut): still NOT derived from a proper A/B — a single successful
 *  data point (R03148 needed roughly 14.4M of additional room past a 50M ceiling to reach `'none'`'s
 *  turn and solve, once dedup-retry's own extension is accounted for) informs the direction (bigger
 *  than 0.25) but not a rigorous size. Population-scale validation is what determines whether 0.5 is
 *  enough, too little, or (following DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own precedent of a
 *  12.5M reserve missing exactly one 34.8M outlier) simply insufficient for some other level's own
 *  need — same asymmetric-risk caution as every other reserve fraction in this file. See
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Applying the pattern elsewhere"
 *  section for the full local validation writeup, R02644's confirmed non-regression, and R03148's
 *  before/after data. */
export const ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY (PROMOTED to production default-ON, 2026-08-16 —
 *  built the same day as STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY and directly modeled on both
 *  that tier and STRATEGY_DEDUP_NEAR_TIE_RETRY).
 *
 *  Applies the same "run dead last, additive-only budget" pattern to a THIRD known double-edged
 *  mechanism, and this one is the root flag this whole investigation started from:
 *  `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` (topology.ts's `isConnected`/`isConnectedForTrap`, read via
 *  `prep._cfg` at the connectivity-flood-fill call site shared by DFS, beam, repair, and
 *  admissible-order search through `prune-gauntlet.ts`'s move-pruning gauntlet). Default-ON, it
 *  treats both-axes-spent cells as walls in the flood-fill reachability check — a legitimate,
 *  usually-correct tightening, but the exact beam-width-threshold timing artifact this report traces
 *  (see "The mechanism, fully traced" above) means it occasionally prunes away the eventual winning
 *  lineage. The report's own single-attempt-config comparison (`reports/2026-08-15-connectivity-
 *  axis-exhausted-regression.md`'s "This is not isolated to R02248" section) found disabling this
 *  flag entirely recovers `R02114` and `R00592` (referee-valid) — the two originally-confirmed
 *  regressions `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own near-tie retention does NOT reach, because their
 *  blocking collision is a different depth/shape a single runner-up slot doesn't cover — but the SAME
 *  single-attempt test found `R03248` goes the OTHER way: it solves WITH the flag on and fails
 *  WITHOUT it. Real gain (`R02114`/`R00592`), real loss (`R03248`), same knob — exactly the double-
 *  edged shape a bounded last-resort retry is suited to, for the third time in this file.
 *
 *  MECHANISM: identical shape to STRATEGY_DEDUP_NEAR_TIE_RETRY — reruns the SAME `mainConfigs` ladder
 *  (every DFS/beam attempt config) via `runInterleavedAttempts`/`runGateSerialAttempts`, with
 *  `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` disabled through a Proxy override on `prep._cfg`, a fresh
 *  additive node ceiling (`nodeBudget + CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION`),
 *  and a fresh additive work allocation (own `prep._workMeter.units` mark, sized via `DEFAULT_WORK_PER_MS`
 *  from this tier's own ms allocation — the exact fix DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's
 *  own history needed after its first shipped design shared the depleting pool). `R03248` is
 *  structurally protected the same way `R02644` was for the admissible-order tier: it already solves
 *  via the normal, flag-ON ladder, so `result.solution` is set and this tier's own `!result.solution`
 *  guard skips it entirely — it should never reach this tier at all.
 *
 *  Positioned dead last — AFTER STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY, the current true end of
 *  the ladder — for the identical reason both prior tiers were placed there: nothing may run after
 *  this one that still checks an unextended `nodeBudget`/`earlyTierNodeBudget`-derived ceiling, or
 *  this tier's own additive extension would starve it exactly the way an earlier draft of the
 *  dedup-retry tier starved the admissible-order tier itself.
 *
 *  POPULATION-VALIDATED AND PROMOTED (2026-08-16, GHA run 31918095910, solver ref
 *  `fc3040cb3959e499a9a8df56348e43cb4300b077`, vs the 31910836458 baseline): corpus1 95/95 — exactly
 *  the same solved-ID set, zero change. corpus2 809→819, **+10 solves, zero regressions**
 *  (`R00296`, `R00592`, `R02068`, `R02088`, `R02114`, `R02491`, `R02690`, `R02878`, `R03195`,
 *  `R03357`) — both originally-targeted levels (`R02114`, `R00592`) recovered as predicted, plus 8
 *  more the local spot-check never tested for. `R03248` (the local single-attempt-config counter-
 *  example) was NOT lost, confirming the `!result.solution` skip-guard protected it at population
 *  scale as designed.
 *
 *  Unlike the two prior (also promoted) tiers, `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` gates a much
 *  hotter, more frequently-hit code path (every connectivity check across every search technique) —
 *  this showed up as a real, meaningfully larger cost increase, not just a solved-count question:
 *  corpus1 nodes +18.7% (936.8M → 1,111.8M), work +12.2% (1,415.8M → 1,588.3M); corpus2 nodes +28.2%
 *  (78.50B → 100.61B), work +22.1% (97.23B → 118.72B). Promoted anyway per explicit user direction
 *  (the promotion bar for this file's retry-tier ladder is solved-count gain + zero regressions, not
 *  cost neutrality — every tier in this ladder is inherently a cost/coverage trade by construction),
 *  but this is the largest cost delta of the three promoted tiers by a wide margin and is the first
 *  data point worth watching if a FOURTH tier is ever stacked on top of this one: the ladder's
 *  worst-case multiplier on `nodeBudget` is now higher, and each additional tier's own headroom has
 *  to be judged against an already-more-expensive baseline. See
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Population-scale confirmation"
 *  section for the full writeup. */
export const CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own
 *  last-resort tier, as a fraction of `nodeBudget` — same ADDITIVE (not withheld-from-anyone) design
 *  as DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION/ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_
 *  FRACTION, adopted from the start here rather than arrived at after a correction, since that
 *  lesson is now established practice for any new last-resort tier in this file.
 *
 *  CORRECTION (2026-08-16, local testing before any GHA spend): an initial 0.25 (matching
 *  DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own original starting point) was tried first and
 *  found insufficient — both `R02114`/`R00592` still failed (`node-budget-reached` at the 75M
 *  ceiling). This tier is now the THIRD retry tier in the ladder, stacked after both
 *  `STRATEGY_DEDUP_NEAR_TIE_RETRY` (its own reserve up to +0.25×`nodeBudget`) and
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` (+0.5×`nodeBudget`) — in the worst case the ladder
 *  can already sit at up to `nodeBudget × 1.75` by the time this tier's own entry guard is checked,
 *  before this tier's own additive room even begins. A diagnostic run with an artificially large
 *  reserve override (2.0) DID recover both — `R02114` at 204,993 nodes and `R00592` at 220,726 nodes
 *  for the winning attempt (`objectiveFirst@2000` in both cases), essentially IDENTICAL to the
 *  original single-attempt-config figures — confirming the technique itself is exactly as cheap as
 *  that evidence suggested; the reserve simply needs to be large enough to let the tier's turn
 *  actually arrive, not to fund an expensive search once it does. Doubled the default to 0.5,
 *  matching ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own final value, and
 *  re-validated at that exact shipped setting (not the diagnostic override) before shipping — see
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Applying the pattern elsewhere"
 *  section for the full validation writeup. Population-validated at 0.5 (2026-08-16, run 31918095910):
 *  +10 corpus2 solves, zero regressions on either corpus — see this constant's sibling comment on
 *  `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION` for the full population result. */
export const CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY (opt-in, default OFF — NEW, unvalidated mechanism,
 *  2026-08-16, built the same day as the three tiers above and directly modeled on them, but
 *  applied to a DIFFERENT known double-edged mechanism than any of the three: `STRATEGY_REPAIR_
 *  ELITE_PREFIX_DFS` (repair-search.ts's `elitePrefixDfsRepair`, gated by `attempt-dispatch.ts`'s
 *  own opt-in-only `enableElitePrefixDfs` read, NOT the `!cfg || cfg.FLAG` convention).
 *
 *  `reports/2026-08-07-repair-elite-prefix-dfs.md` found this mechanism sound and mechanistically
 *  real (a confirmed badness-improvement feedback loop, debug-traced), but net-negative in its own
 *  20-level A/B (4/20 solved vs. 5/20 with it off) — with ONE confirmed cause: `R02239` solves via
 *  ordinary repair at 14,194,203 nodes with the mechanism off, but exhausts the SAME repair call's
 *  own 15,000,000-node budget without solving when it's on. This is the identical "scarce shared
 *  node budget, zero-sum reallocation" shape `STRATEGY_DEDUP_NEAR_TIE_RETRY`/`STRATEGY_ADMISSIBLE_
 *  ORDER_NON_DEFAULT_RETRY`/`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` were each built to fix —
 *  the report's own "what would need to change" section proposed shrinking the mechanism's own
 *  constants or narrowing its attempt grid, but never considered running it as an ADDITIVE,
 *  DEAD-LAST retry instead of inline within the ordinary repair fallback loop's own shared budget.
 *
 *  MECHANISM: unlike the three tiers above (which rerun `mainConfigs`), this reruns `repairConfigs`
 *  — the same per-config/per-gate manual loop shape as the ordinary repair fallback loop (and
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s own per-profile loop) rather than
 *  `runInterleavedAttempts`/`runGateSerialAttempts`. `prep._cfg` is Proxy-overridden to force
 *  `STRATEGY_REPAIR_ELITE_PREFIX_DFS: true` (the OPPOSITE polarity from the three tiers above,
 *  which each disable a flag — this one ENABLES one), which `attempt-dispatch.ts`'s `runAttemptSearch`
 *  reads to set `enableElitePrefixDfs` for `repairSearchFromGate`. Because the ordinary repair
 *  fallback loop above already ran to completion with the flag OFF and its own UNTOUCHED node
 *  ceiling, `R02239`-shaped levels are structurally protected exactly the way `R02644`/`R03248` were
 *  for the other two tiers: the ordinary loop's own budget is never shared with this tier, so a
 *  level that solves there is unaffected regardless of what this tier does afterward. Within THIS
 *  tier's own fresh additive budget, the elite-prefix-DFS sub-search still competes with ordinary
 *  repair exploration for nodes exactly as the original report described — that internal cost is
 *  accepted as this specific technique's own price of admission, the same way a whole-ladder rerun
 *  is accepted as `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own cost; what changes is that the cost is no
 *  longer paid by a DIFFERENT, otherwise-successful attempt.
 *
 *  Positioned dead last — AFTER `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`, the current true end
 *  of the ladder — for the identical reason all three tiers above were placed there: nothing may
 *  run after this one that still checks an unextended ceiling, or this tier's own additive
 *  extension would starve it.
 *
 *  CLOSED, NOT PROMOTED (2026-08-19). Validated on the original 20-level closest-miss sample at
 *  TWO retry budgets (7.5M and the full 15M matching the original report's own ON-arm scale, via
 *  `scripts/stress/elite-prefix-dfs-retry-validate.mjs`, sharded across 10 parallel GHA jobs):
 *  **zero recoveries at either budget** — the protected (flag-off) loop alone solved 5/20
 *  (`R00342`/`R00877`/`R02022`/`R02220`/`R02239`, byte-identical at both budgets), and of the 15
 *  that failed there, none were rescued by a fresh, fully-uncontested retry pass either. Doubling
 *  the retry budget changed nothing, ruling out under-provisioning. This confirms the mechanism's
 *  real limitation was never the shared-budget displacement this tier structurally eliminates —
 *  `elitePrefixDfsRepair` itself doesn't have enough power to close these particular gaps at these
 *  budgets, full stop; the original report's own "badness improved from 4 to 3" evidence was always
 *  intermediate progress, never an actual extra solve, so this negative result is consistent with
 *  that report's own findings, not a reversal of them. Kept in the codebase (opt-in, default-OFF,
 *  zero production risk, sound reusable infrastructure) but NOT a promotion candidate without a
 *  materially different approach to the underlying operator itself. See
 *  `reports/2026-08-07-repair-elite-prefix-dfs.md`'s "Follow-up (2026-08-19)" section for the full
 *  writeup and data table. */
export const REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY's own last-resort
 *  tier, as a fraction of the PRECEDING tier's own ceiling (`connectivityRetryNodeCeiling`) — same
 *  "stack on the immediately-preceding tier's own ceiling" design `CONNECTIVITY_AXIS_EXHAUSTED_
 *  RETRY_NODE_RESERVE_FRACTION`'s own comment derives and explains (restarting from plain
 *  `nodeBudget` risks landing on the exact same absolute ceiling as an earlier tier at a
 *  coincidentally-equal fraction, giving this tier zero real headroom) — adopted from the start
 *  here rather than arrived at after a correction, since that lesson is now established practice
 *  for any new last-resort tier in this file. Starting value matches the three siblings' own final
 *  (post-correction) value; not yet locally or population validated at this exact setting. */
export const REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_MC_NEIGHBOR_BUDGET_RETRY (NEW, opt-in, default OFF — 2026-08-19). The FIFTH application
 *  of the "run dead last, additive-only budget" pattern, and the fourth distinct double-edged
 *  mechanism it has been pointed at: `PRUNE_MC_NEIGHBOR_BUDGET`.
 *
 *  WHY THIS MECHANISM. That prune was promoted default-ON on a strong level-blind population result
 *  (611/1700 OFF -> 665/1700 ON, 59 gained / 5 lost). The five losses were then individually
 *  diagnosed (`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`): four of them share one
 *  clean mechanism — the exact deterministic beam attempt that WINS under OFF is still tried under
 *  ON, runs to a similar node count, and fails. Not budget exhaustion, not the already-fixed
 *  repair-seed reindexing issue: a bounded-width diverse-beam retention effect. That promotion
 *  deliberately accepted those five as "a small, bounded, already-understood cost" because no
 *  mechanism existed to recover them without giving back the 59 gains. This tier is that mechanism.
 *
 *  WHY NOW, AND WHAT IS CONFIRMED. Three of the five (`R00635`, `R02823`, `R02867`) have since been
 *  recovered by unrelated solver work and are solved at the 2026-08-16 capability baseline (run
 *  `31918095910`, 819/1700). The remaining two, `R02119` and `R02422`, are still unsolved there;
 *  `R02119` recovers at HEAD when the prune is disabled — referee-valid, level-blind, at the
 *  production 50M-node protocol, via `beam:mustCrossFirst@beam2000` at 25,863,058 nodes, matching the
 *  2026-08-12 diagnosis. `R02422` was ALSO reported to recover this way (via
 *  `beam:intersectionHarvest@beam5000(diverse)` at 50,333,677 nodes) but that finding does NOT
 *  reproduce — see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION's own promotion comment below for the
 *  2026-08-19 re-verification (the config exhausts naturally at ~304,900 nodes regardless of this
 *  prune's setting; not a budget story). So the diagnosed mechanism is confirmed live only via
 *  `R02119` 8 days and ~95 corpus-2 solves later, not via both originally-claimed levels.
 *
 *  WHY LEVELS THE PRUNE HELPS ARE SAFE. Structurally protected exactly the way `R02644` was for
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` and `R03248` for
 *  `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`: a level that benefits from the prune already solves
 *  via the normal flag-on ladder, so this tier's own `!result.solution` guard skips it entirely. The
 *  59 gains are never at risk, because this tier never runs on a level that solved.
 *
 *  THE ELIGIBILITY GATE — the one thing this tier does that its four predecessors do not.
 *  `prune-gauntlet.ts` only ever reaches `PRUNE_MC_NEIGHBOR_BUDGET` when `state.mustCrossMask !== 0`.
 *  A level whose `prep.initialMustCrossMask` is 0 therefore can never have had a single move rejected
 *  by this prune, so rerunning the ladder with it disabled is provably BIT-IDENTICAL to the ladder
 *  that already ran and failed — pure waste, not a second chance. Gating on that is sound (a
 *  soundness argument, not a heuristic predictor) and free (one field read at prep time, no hot-path
 *  instrumentation). It skips 389 of the 881 unsolved Corpus-2 levels outright — 44%.
 *
 *  This matters because the pattern's cost is compounding while its returns decay: the tiers landed
 *  +40, +45, +10, and 0 solves respectively, and the third alone cost +28.2% Corpus-2 nodes / +22.1%
 *  work, because each tier stacks another additive ceiling on the last (at `nodeBudget` 50M a failing
 *  level already runs to 100M). The three shipped tiers each pay their full cost on every unsolved
 *  level. Making the newest one pay only where it could possibly help is the cheapest available brake
 *  — and if this gate holds up at population scale, the same soundness-gate treatment is the obvious
 *  follow-up for reclaiming part of the cost already paid by the three tiers above.
 *
 *  1.0 = one full `timeBudgetMs` window, same as all four sibling tiers.
 *
 *  POPULATION-VALIDATED AND PROMOTED (2026-08-19, GHA run 32224200709 vs the 31918095910 baseline):
 *  corpus1 95/102 identical solved-ID set (zero change); corpus2 819→828, +9 solves (R02119,
 *  R02128, R02132, R02401, R02512, R02783, R02835, R02947, R03361), ZERO regressions. R02119
 *  recovered as predicted; R02422 did NOT recover in this shared-ladder-rerun population run despite
 *  the isolated single-config test above showing it recoverable — an open, non-blocking discrepancy
 *  (see ablation-config.ts's own comment), most likely the shared additive-budget rerun not giving
 *  `beam:intersectionHarvest@beam5000(diverse)` enough of the tier's reserve. Cost: corpus1 nodes
 *  +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% — comparable to (cheaper on corpus2 than)
 *  STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own promoted cost; promoted per the same established
 *  bar (solved-count gain plus zero regressions, not cost neutrality). */
export const MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own ceiling, as a
 *  fraction of the PRECEDING tier's own ceiling (`repairElitePrefixDfsRetryNodeCeiling`), never
 *  withheld from any earlier tier.
 *
 *  STACKED ON THE PRECEDING TIER'S CEILING, not `nodeBudget` — the lesson
 *  `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION`'s own comment paid for the hard way
 *  (two tiers whose fractions coincide compute the identical absolute ceiling, so the later one gets
 *  literally zero headroom no matter what fraction it is given), applied here from the start rather
 *  than rediscovered a fifth time.
 *
 *  SIZING (historical basis, not re-derived after the 2026-08-19 correction below). `R02422` was
 *  originally reported to need 50,333,677 cumulative nodes to solve in a from-scratch prune-off
 *  solve at the 50M protocol -- that figure does not reproduce (see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_
 *  FRACTION's own promotion comment), but the fraction below was never retuned to a smaller number on
 *  the strength of that correction, since the actual population A/B (which supersedes any single-
 *  level sizing estimate) already validated the fraction as shipped. At 0.5 of a
 *  `repairElitePrefixDfsRetryNodeCeiling` that is itself 100M at `nodeBudget` 50M (both preceding
 *  retry tiers default-ON, elite-prefix-DFS retry default-OFF and contributing 0), that is 50M of
 *  genuine additive headroom. Calibrated to the confirmed targets, NOT to an A/B — expect to retune
 *  it downward once a population run shows what the tier actually spends, exactly as
 *  `ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION` was corrected from 0.25 to 0.5 before
 *  any GHA spend. Strictly a no-op when `nodeBudget` is `Infinity` (every production path) or the
 *  tier is ineligible/suppressed. */
export const MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_REPAIR_LATE_PROBE (default ON — promoted 2026-08-21 on a same-commit,
 *  deterministic A/B at main@e5034e8c: GHA runs 32453248184 (flag on) vs 32459711208 (flag off)
 *  read Corpus-1 96/102 vs 95/102 and Corpus-2 881/1700 vs 863/1700, i.e. +19 net gains and zero
 *  losses across both corpora). Priority 7 (docs/solver-
 *  optimization-current-queue.md): the census found 94 of 158 currently-unsolved Corpus-2 levels
 *  where repair wins in isolation are structurally excluded from EVER trying repair, because
 *  `needsRepairFallback` (`mustCross >= 2 AND mustPass >= 3`, or very-high reqInt) never matches
 *  them — `repairConfigs` is empty for the whole level, so neither the early probe
 *  (runRepairProbe) nor the ordinary fallback loop below ever run, regardless of budget or
 *  ordering. Widening `needsRepairFallback` itself was rejected (matched-comparison analysis found
 *  no single/pair feature cleanly separates "repair wins cheaply here" from the much larger
 *  ineligible population that never wins) — this tier sidesteps the "which levels" question
 *  entirely by trying repair ANYWAY, cheaply and unconditionally, on every level `repairConfigs`
 *  left untouched, but ONLY as the true dead-last tier, after every other technique has already
 *  failed.
 *
 *  WHY DEAD LAST, NOT EARLY (the shape this tier deliberately avoids): the existing repair PROBE
 *  (`runRepairProbe`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET`) is already a small, bounded repair
 *  attempt — but it runs unconditionally BEFORE the main loop, on every solve of an eligible level,
 *  win or lose. Its own code comments document the resulting cost on a level where repair never
 *  succeeds: "the probe instead burns its FULL node budget as pure dead search every single
 *  solve" (confirmed on R02401, ~10.7s of unconditional overhead, the exact bug
 *  `repairBudgetFractionOverride: 0` was supposed to prevent). Naively widening THAT probe's
 *  eligibility would import the identical tax onto every newly-eligible level's EVERY solve, not
 *  just its failures. A dead-last placement instead means a level that already solves via any
 *  earlier technique — the overwhelming majority of any corpus — never reaches this tier at all,
 *  so it costs nothing there regardless of budget size; the "dead search" cost is paid only by
 *  levels that were already going to report unsolved.
 *
 *  SIZING: flat 2,000,000-node cap (REPAIR_LATE_PROBE_NODE_BUDGET below), deliberately NOT a
 *  fraction of `timeBudgetMs`/`nodeBudget` like the five whole-ladder-rerun tiers above — this
 *  tier's entire premise is being cheap and tightly bounded, not thorough (mirroring
 *  REPAIR_PROBE_ORDINARY_NODE_BUDGET's own flat-constant shape, not the fractional-reserve shape).
 *  Population-scale quantification (docs/solver-optimization-current-queue.md, same section): at a
 *  2,000,000-node cap, 26 of the 314 currently-unsolved Corpus-2 levels this tier can reach solve
 *  within budget (8.3%) — a real but modest recovery rate, with the large majority of newly-probed
 *  levels paying the full capped cost for nothing. Because of the dead-last placement, that cost
 *  is confined to already-failing levels (a batch/regression-timing cost), never a solve a player
 *  could otherwise win.
 *
 *  Positioned dead last — AFTER the must-cross-neighbor-budget retry tier above, the current true
 *  end of the ladder — for the identical reason as its five predecessors: nothing may run after
 *  this one that still checks an unextended ceiling, or this tier's own additive extension would
 *  starve it.
 *
 *  Default-ON (promoted 2026-08-21, see the population-scale A/B cited above): the flag check at
 *  this tier's own run condition below now uses the standard convention (`!cfg ||
 *  cfg.STRATEGY_REPAIR_LATE_PROBE`), matching every other default-on tier, so it runs for every
 *  production/interactive caller (cfg null) and any ablation config that doesn't explicitly
 *  disable it. Disable via `STRATEGY_REPAIR_LATE_PROBE: false` to get the pre-promotion shape
 *  back for an A/B.
 *
 *  CAP RAISED 2,000,000 -> 5,000,000 (2026-08-22, docs/solver-optimization-current-queue.md
 *  Priority 7's "REPAIR_LATE_PROBE_NODE_BUDGET" lead): a local 13-level hand-picked sample of
 *  confirmed-still-unsolved `hi:medium-high-catchall` Corpus-2 levels found 1/13 newly solved at
 *  2.5x the shipped cap, consistent with but not sufficient evidence beyond this tier's own
 *  original 8.3% figure to promote a corpus-wide constant change. Ran the real population-scale A/B
 *  the queue entry called for instead of promoting on that sample alone: `solver-routing-regime-sample-
 *  ab.yml` dispatched twice (same seed `repair-late-probe-budget-ab`, same ref, differing only in
 *  `--repair-late-probe-node-budget`) with every `classifyRoutingRegime()` value listed as "eligible" —
 *  this tier isn't routing-regime-scoped, so that reduces to a genuine uniform-random 300-level Corpus-2
 *  sample plus the full Corpus-1 (102) and published (160) invariant, 562 levels total. Control (GHA
 *  32564849428, cap 2,000,000): 421/562 solved, nodes=22,027,848,723, work=26,971,498,356. Treatment
 *  (GHA 32564853928, cap 5,000,000): 424/562 solved, nodes=22,147,270,137, work=27,365,379,188. Exact
 *  per-level diff: **+3 net gains (R00477, R02271, R03045), zero losses** — R02271 independently
 *  reproduces the local sample's own single hit. Cost: +0.54% nodes, +1.46% work across the full
 *  562-level sample, confined entirely to levels already failing either way (this tier's dead-last
 *  placement guarantees a level solved by any earlier technique is completely unaffected by this
 *  cap, at any size). Zero losses is the meaningful result here, not just the gain count: this tier
 *  is purely additive by construction (see WHY DEAD LAST above), so a loss would have meant a bug
 *  in that invariant, not ordinary variance — finding none confirms the mechanism works as designed
 *  at the larger cap too. */
export const REPAIR_LATE_PROBE_NODE_BUDGET = 5_000_000;

/** STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY (promoted default-ON 2026-08-23). Dead-last
 *  additive whole-ladder retry (same `runWholeLadderRetryTier` shape as
 *  STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY) forcing SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE on
 *  for its own rerun of `mainConfigs`, positioned AFTER `repair-late-probe`, the current true end
 *  of the ladder. See docs/solver-optimization-current-queue.md Priority 7 and ablation-config.ts's
 *  own comment on the flag for the full rationale: the plain global form of that flag measured net
 *  -5 (73-level loss population +9/-3; 90-level gain population 0/-11; published corpus unchanged)
 *  because it forces the legacy distance map even on levels the corrected map already solves early
 *  in the ordinary ladder. This dead-last placement cannot touch that loss population by
 *  construction — a level solving earlier never reaches this tier — so it is purely additive, same
 *  reasoning as every other dead-last retry tier in this file. Promoted after a population-scale
 *  A/B (solver-level-blind-targeted-sweep.yml, commit 95927c6df): 73-level loss population
 *  15/73 -> 18/73 (+3/-0); 90-level gain population 90/90 -> 90/90 (0/-0); published corpus
 *  unchanged. 1.0/0.5 constants match STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own (the
 *  closest structural analog); recovers only 3 of the global form's 9 gains since this tier only
 *  gets a fraction of the node ceiling the global form had from move zero — see
 *  docs/solver-opt-in-experiment-ledger.md before raising the reserve fraction further. */
export const GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_BUDGET_FRACTION = 1.0;
export const GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY (promoted, default ON — 2026-08-23). Dead-last
 *  additive extension of STRATEGY_REPAIR_LATE_PROBE, positioned AFTER
 *  goal-attraction-legacy-distance-retry (the current true end of the ladder). For the exact same
 *  `repairConfigsCount === 0` population repair-late-probe already targets (levels attempts.ts's
 *  routing never even offered a repair config to), retry `repairAttempt()` across
 *  REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS extra PRNG seeds — repair-late-probe itself
 *  always uses seed salt 0, so this tier starts at salt 1 — each seed getting its OWN full
 *  REPAIR_LATE_PROBE_NODE_BUDGET reserve, stacked additively.
 *
 *  Two established findings motivate spending a genuinely large amount of extra budget here
 *  specifically, rather than on yet another routing/reserve tweak: (1)
 *  REPAIR_PROBE_ORDINARY_SEED_SALTS (orchestration.ts) already found real, if modest, additional
 *  rescues from extra seeds on the EARLY small-budget probe (n=9, calibrated carefully); (2) the
 *  2026-08-12 CP-SAT repair-retreat investigation
 *  (reports/2026-08-12-repair-retreat-cpsat.md) found that in every case it could resolve, a
 *  repair elite has ZERO rollback slack once its trajectory diverges from every valid solution —
 *  CP-SAT proves the very next cell is already infeasible. That rules out "backtrack further after
 *  the fact" as a fix (STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY tried exactly that shape and found
 *  zero recoveries — see the opt-in ledger). It does NOT rule out a fix at the commitment point
 *  itself: a different PRNG seed makes a different choice at that same decision point, which is a
 *  different commitment, not a recovery from the same one. This tier is the cheapest way to test
 *  that hypothesis at real scale — reusing the exact same full-budget plain-repair primitive
 *  repair-late-probe already validated, just sampled from more independent starting points.
 *
 *  Reached only after repair-late-probe's own single seed has already failed, so a level that
 *  solves on the first seed (or reaches this tier via any other, e.g. repairConfigsCount > 0) is
 *  completely unaffected — purely additive by construction, same reasoning as every other
 *  dead-last tier in this file. Promoted 2026-08-23 after a population-scale A/B
 *  (solver-level-blind-targeted-sweep.yml): 73-level loss population 18→23 (+5/-0, control's
 *  solved set a strict subset of treatment's), 90-level gain population 90/90 unaffected,
 *  published corpus 160/160 unaffected. See docs/solver-opt-in-experiment-ledger.md. */
export const REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS = [1, 2, 3, 4, 5, 6, 7];


// ─── Stage budget plan: the canonical cascade ────────────────────────────────
//
// computeStageBudgetPlan is a behavior-preserving relocation of what was previously ~560 lines
// of sequential const declarations inline in orchestration.ts's solveLevel(). Every fraction/
// reserve/ceiling below is unchanged; only the home and the explicit input/output shape are new.
// See each override field's own comment on SolveOpts (orchestration.ts) for its rationale.
import type { SolveOpts } from './orchestration.js';

export interface StageBudgetPlanInput {
    opts: Pick<SolveOpts,
        | 'repairBudgetFractionOverride' | 'disableExtraBudgetPasses'
        | 'attractionDiversityBudgetFractionOverride'
        | 'dedupNearTieRetryBudgetFractionOverride' | 'dedupNearTieRetryNodeReserveFractionOverride'
        | 'admissibleOrderNonDefaultRetryBudgetFractionOverride' | 'admissibleOrderNonDefaultRetryNodeReserveFractionOverride'
        | 'connectivityAxisExhaustedRetryBudgetFractionOverride' | 'connectivityAxisExhaustedRetryNodeReserveFractionOverride'
        | 'repairElitePrefixDfsRetryBudgetFractionOverride' | 'repairElitePrefixDfsRetryNodeReserveFractionOverride'
        | 'mcNeighborBudgetRetryBudgetFractionOverride' | 'mcNeighborBudgetRetryNodeReserveFractionOverride'
        | 'admissibleOrderBudgetFractionOverride' | 'admissibleOrderNodeReserveFractionOverride'
        | 'repairLateProbeNodeBudgetOverride' | 'admissibleOrderProfileNodeReserveFractionOverride'
        | 'mainLoopLateReserveFractionOverride' | 'mainLoopLateReserveConfigCountOverride'
        | 'repairFallbackNodeReserveFractionOverride' | 'repairProbeShrinkRecoveryNodeReserveFractionOverride'
        | 'attractionDiversityNodeReserveFractionOverride'
    >;
    cfg: AblationConfig | null;
    nodeBudget: number;
    timeBudgetMs: number;
    repairConfigsCount: number;
    admissibleOrderConfigsCount: number;
    admissibleOrderNonDefaultConfigsCount: number;
    mainConfigsCount: number;
    initialMustCrossMask: number;
}

/** Every retry-tier budget fraction, node reserve, and stacked node ceiling for one solve —
 *  the single canonical derivation every stage's eligibility/dispatch reads from. Pure function
 *  of its input; no I/O, no mutation. Call once per solveLevel(), before the repair probe runs
 *  (the shrink-recovery reserve, which depends on the probe's own result, is a separate second
 *  step — see computeShrinkRecoveryBudget below). */
export function computeStageBudgetPlan(input: StageBudgetPlanInput) {
    // timeBudgetMs is NOT read here: every fraction below is dimensionless; the ms multiplication
    // happens per-dispatch in orchestration.ts (`Math.floor(timeBudgetMs * plan.xBudgetFraction)`),
    // matching that each tier's ms allocation is re-derived fresh from "elapsed since this tier
    // started", which this once-per-solve plan does not model (see buildStageBudgetEnvelopes's own
    // doc). Still part of StageBudgetPlanInput/buildStageBudgetEnvelopes's own input, which does
    // need it for the envelope's `wall` currency.
    const { opts, cfg, nodeBudget, repairConfigsCount, admissibleOrderConfigsCount,
        admissibleOrderNonDefaultConfigsCount, mainConfigsCount, initialMustCrossMask } = input;
    const repairFractionOverride = Number(opts.repairBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairBudgetFraction = Number.isFinite(repairFractionOverride) && repairFractionOverride >= 0
        ? repairFractionOverride
        : REPAIR_EXTRA_BUDGET_FRACTION;

    // opts.attractionDiversityBudgetFractionOverride — same shape/rationale as repairBudgetFraction's
    // own resolution just above. Hoisted here (rather than only just before the diversity pass itself
    // runs, much further down) for the SAME reason repairBudgetFraction was hoisted before the probe:
    // ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's own eligibility check, below, needs to know whether
    // the diversity pass would run at all before deciding whether reserving nodes for it is real or a
    // strand.
    const diversityFractionOverride = Number(opts.attractionDiversityBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const diversityBudgetFraction = Number.isFinite(diversityFractionOverride) && diversityFractionOverride >= 0
        ? diversityFractionOverride
        : ATTRACTION_DIVERSITY_BUDGET_FRACTION;

    // opts.dedupNearTieRetryBudgetFractionOverride — same shape/rationale/hoisting reason as
    // diversityBudgetFraction just above. STRATEGY_DEDUP_NEAR_TIE_RETRY is default-ON as of the
    // PROMOTION (see that flag's own comment) — `disableExtraBudgetPasses: true` (both interactive
    // solve UIs) still zeroes this fraction, same as every other extra-budget tier.
    const dedupRetryFractionOverride = Number(opts.dedupNearTieRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const dedupRetryBudgetFraction = Number.isFinite(dedupRetryFractionOverride) && dedupRetryFractionOverride >= 0
        ? dedupRetryFractionOverride
        : DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION;
    const dedupRetryNodeReserveFractionRaw = Number(opts.dedupNearTieRetryNodeReserveFractionOverride);
    const dedupRetryNodeReserveFraction = Number.isFinite(dedupRetryNodeReserveFractionRaw) && dedupRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, dedupRetryNodeReserveFractionRaw)
        : DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION;

    // opts.admissibleOrderNonDefaultRetryBudgetFractionOverride — same shape/rationale/hoisting
    // reason as dedupRetryBudgetFraction just above. PROMOTED to default-ON (see
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION's own comment) — `disableExtraBudgetPasses:
    // true` (both interactive solve UIs) still zeroes this fraction, same as every other extra-budget
    // tier.
    const nonDefaultRetryFractionOverride = Number(opts.admissibleOrderNonDefaultRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const nonDefaultRetryBudgetFraction = Number.isFinite(nonDefaultRetryFractionOverride) && nonDefaultRetryFractionOverride >= 0
        ? nonDefaultRetryFractionOverride
        : ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION;
    const nonDefaultRetryNodeReserveFractionRaw = Number(opts.admissibleOrderNonDefaultRetryNodeReserveFractionOverride);
    const nonDefaultRetryNodeReserveFraction = Number.isFinite(nonDefaultRetryNodeReserveFractionRaw) && nonDefaultRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, nonDefaultRetryNodeReserveFractionRaw)
        : ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION;

    // opts.connectivityAxisExhaustedRetryBudgetFractionOverride — same shape/rationale/hoisting
    // reason as dedupRetryBudgetFraction/nonDefaultRetryBudgetFraction above. PROMOTED to
    // default-ON (see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION's own comment), so the
    // `!cfg ||` check below is the standard promoted-default convention, matching its two promoted
    // siblings, not an opt-in check.
    const connectivityRetryFractionOverride = Number(opts.connectivityAxisExhaustedRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const connectivityRetryBudgetFraction = Number.isFinite(connectivityRetryFractionOverride) && connectivityRetryFractionOverride >= 0
        ? connectivityRetryFractionOverride
        : CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION;
    const connectivityRetryNodeReserveFractionRaw = Number(opts.connectivityAxisExhaustedRetryNodeReserveFractionOverride);
    const connectivityRetryNodeReserveFraction = Number.isFinite(connectivityRetryNodeReserveFractionRaw) && connectivityRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, connectivityRetryNodeReserveFractionRaw)
        : CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION;

    // opts.repairElitePrefixDfsRetryBudgetFractionOverride — same shape/hoisting reason as the
    // three above. Opt-in/default-OFF (NEW, unvalidated mechanism — see REPAIR_ELITE_PREFIX_DFS_
    // RETRY_BUDGET_FRACTION's own comment), so the `cfg &&` ... `=== true` check below (where this
    // tier's run condition is computed) is the opt-in convention, not the standard `!cfg || cfg.FLAG`
    // shape — matching every tier's own pre-promotion lifecycle stage. The convenience switch must
    // still suppress an explicitly selected experimental config: batch callers use it to mean no
    // additive work at all. As with the promoted tiers, an explicit per-tier override wins.
    const repairElitePrefixDfsRetryFractionOverride = Number(opts.repairElitePrefixDfsRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairElitePrefixDfsRetryBudgetFraction = Number.isFinite(repairElitePrefixDfsRetryFractionOverride) && repairElitePrefixDfsRetryFractionOverride >= 0
        ? repairElitePrefixDfsRetryFractionOverride
        : REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION;
    const repairElitePrefixDfsRetryNodeReserveFractionRaw = Number(opts.repairElitePrefixDfsRetryNodeReserveFractionOverride);
    const repairElitePrefixDfsRetryNodeReserveFraction = Number.isFinite(repairElitePrefixDfsRetryNodeReserveFractionRaw) && repairElitePrefixDfsRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, repairElitePrefixDfsRetryNodeReserveFractionRaw)
        : REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION;

    // opts.mcNeighborBudgetRetryBudgetFractionOverride — same shape/hoisting reason as the four
    // above. This tier is now default-ON, so omitting the convenience fallback here would make
    // disableExtraBudgetPasses leak an entire additive ladder rerun on must-cross levels.
    const mcNeighborBudgetRetryFractionOverride = Number(opts.mcNeighborBudgetRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const mcNeighborBudgetRetryBudgetFraction = Number.isFinite(mcNeighborBudgetRetryFractionOverride) && mcNeighborBudgetRetryFractionOverride >= 0
        ? mcNeighborBudgetRetryFractionOverride
        : MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION;
    const mcNeighborBudgetRetryNodeReserveFractionRaw = Number(opts.mcNeighborBudgetRetryNodeReserveFractionOverride);
    const mcNeighborBudgetRetryNodeReserveFraction = Number.isFinite(mcNeighborBudgetRetryNodeReserveFractionRaw) && mcNeighborBudgetRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, mcNeighborBudgetRetryNodeReserveFractionRaw)
        : MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION;

    // Admissible-order tier's NODE RESERVE (see ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION). Resolved
    // here, before the probe, because it has to shrink the ceiling every EARLIER tier runs against —
    // that is the whole mechanism. `earlyTierNodeBudget` replaces `nodeBudget` for the probe, the
    // main loop, the repair fallback and the attraction-diversity pass; the tier itself keeps the
    // full `nodeBudget`, so the nodes it can spend are exactly what the earlier tiers were denied.
    //
    // The reserve is deliberately computed from the tier's REAL run condition (fraction, ablation
    // flag, and a non-empty config list — the same three things its own loop below checks), not just
    // from the fraction: reserving nodes for a tier that will not run would strand them, turning a
    // 'node-budget-reached' result into a 'failed' one and silently shrinking the effective budget
    // of every disableExtraBudgetPasses caller — i.e. exactly the interactive UI paths whose bounded
    // cost REPAIR_PROBE's own 2026-07-17 fix was about restoring.
    const admissibleOrderFractionOverride = Number(opts.admissibleOrderBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const admissibleOrderBudgetFraction = Number.isFinite(admissibleOrderFractionOverride) && admissibleOrderFractionOverride >= 0
        ? admissibleOrderFractionOverride
        : ADMISSIBLE_ORDER_BUDGET_FRACTION;
    const admissibleOrderTierWillRun = admissibleOrderBudgetFraction > 0
        && (!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER)
        && admissibleOrderConfigsCount > 0;
    const reserveFractionOverride = Number(opts.admissibleOrderNodeReserveFractionOverride);
    const admissibleOrderNodeReserveFraction = Number.isFinite(reserveFractionOverride) && reserveFractionOverride >= 0
        ? reserveFractionOverride
        : ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION;
    const admissibleOrderNodeReserve = (admissibleOrderTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * admissibleOrderNodeReserveFraction)
        : 0;

    // STRATEGY_DEDUP_NEAR_TIE_RETRY's own node reserve.
    //
    // REVISION 2 (2026-08-15, same day as REVISION 1 below): the withheld-up-front design (REVISION 1)
    // shipped, was population-validated via GHA, and turned out to be a net -17 (707 vs. the 724
    // baseline), not a recovery. It hit its actual target exactly as designed — 33 of 34 losses
    // recovered, 0 of 27 gains broken — but cost 65 UNRELATED levels (solved both with and without
    // the original retention fix) that now report `node-budget-reached`. Root cause: subtracting
    // `dedupRetryNodeReserve` from `earlyTierNodeBudget` shrinks the main loop's ceiling for EVERY
    // Corpus-2 level the instant the flag is globally on, not just the 34 that actually reach this
    // tier — any level whose real winning solve needed more than `nodeBudget - dedupRetryNodeReserve`
    // in the main loop now gets cut off before finding it. Full data:
    // reports/2026-08-15-connectivity-axis-exhausted-regression.md's "retry pass at population scale"
    // section.
    //
    // Fixed by making the reserve ADDITIVE instead of subtractive — the exact "extend, don't carve
    // from the existing pool" philosophy this tier's own WORK budget already uses (see
    // dedupRetryWorkStart/dedupRetryWorkBudget's own comment at the call site below, fixed the same
    // day for the same reason). `earlyTierNodeBudget` no longer includes this reserve at all — every
    // earlier tier (probe, main loop, repair fallback, attraction-diversity) keeps the FULL `nodeBudget`
    // (minus only `admissibleOrderNodeReserve`, unaffected by this change) exactly as if this tier
    // didn't exist. This tier gets its own EXTENDED ceiling, `dedupRetryNodeCeiling = nodeBudget +
    // dedupRetryNodeReserve`, used both for its entry guard and its call-site node-budget parameter
    // (previously plain `nodeBudget` in both places — a stale reference now that earlier tiers are no
    // longer shrunk, which would otherwise make this tier immediately skip: nodesExpanded can already
    // sit at or above the ORIGINAL nodeBudget by the time this tier is reached).
    //
    // SAFE BY CONSTRUCTION for production: `nodeBudget` is `Infinity` on every production path (Play/
    // Editor/Review/hint-discovery), where `dedupRetryNodeReserve` is already forced to 0 regardless
    // of this change (see below) — so `dedupRetryNodeCeiling === nodeBudget === Infinity` there,
    // unchanged. The cost of this fix is real total node spend ONLY on finite-nodeBudget offline batch
    // runs with the flag on — this tier's reserve is no longer "free" (redistributed from elsewhere),
    // it is a genuine addition to that run's per-level node ceiling, same tradeoff already accepted
    // for the WORK budget.
    //
    // REVISION 1 (2026-08-15, same day): the first shipped design withheld this reserve straight off
    // `nodeBudget`, SIBLING to admissibleOrderNodeReserve (both subtracted independently, not nested)
    // — chosen over an even earlier "floor at the tier's own call site" attempt, which was a no-op the
    // moment an earlier tier had already spent the entire nodeBudget (confirmed locally: R00180
    // reproduced its exact GHA node count, 50,000,148, then the retry pass got 0 nodes). REVISION 1
    // fixed that no-op — the tier genuinely got its reserved nodes — but at the population-scale cost
    // described above, which REVISION 2 fixes by no longer taking those nodes FROM anyone.
    // PROMOTED to default-ON (see the constant's own comment) — standard `(!cfg || cfg.FLAG)`
    // convention, same as admissibleOrderTierWillRun just below, not the opt-in `cfg && ... === true`
    // shape this used before promotion.
    const dedupRetryTierWillRun = dedupRetryBudgetFraction > 0 && !!(!cfg || cfg.STRATEGY_DEDUP_NEAR_TIE_RETRY);
    const dedupRetryNodeReserve = (dedupRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * dedupRetryNodeReserveFraction)
        : 0;
    const dedupRetryNodeCeiling = nodeBudget === Infinity ? Infinity : nodeBudget + dedupRetryNodeReserve;

    // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own node reserve — additive from the start (see
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. `admissibleOrderNonDefaultConfigsCount > 0`
    // guards against reserving for a tier with nothing to run (every profile besides 'default' absent
    // — e.g. STRATEGY_ADMISSIBLE_ORDER disabled entirely, though that already zeroes
    // admissibleOrderConfigs itself, or a hypothetical future config list containing only 'default').
    // PROMOTED to default-ON (see the constant's own comment) — standard `(!cfg || cfg.FLAG)`
    // convention, same as dedupRetryTierWillRun above, not the opt-in `cfg && ... === true` shape
    // this used before promotion.
    const nonDefaultRetryTierWillRun = nonDefaultRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY)
        && admissibleOrderNonDefaultConfigsCount > 0;
    const nonDefaultRetryNodeReserve = (nonDefaultRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * nonDefaultRetryNodeReserveFraction)
        : 0;
    const nonDefaultRetryNodeCeiling = nodeBudget === Infinity ? Infinity : nodeBudget + nonDefaultRetryNodeReserve;

    // STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own node reserve — additive from the start (see
    // CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. PROMOTED to default-ON (2026-08-16, run
    // 31918095910): corpus1 95/95 identical solved set (zero change), corpus2 809→819 (+10, zero
    // regressions) — see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION's own comment.
    const connectivityRetryTierWillRun = connectivityRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY);
    const connectivityRetryNodeReserve = (connectivityRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * connectivityRetryNodeReserveFraction)
        : 0;
    // STACKED on `nonDefaultRetryNodeCeiling` (the immediately-preceding tier's own ceiling), NOT
    // `nodeBudget` directly — found necessary by local testing before any GHA spend: at matching
    // fractions (both 0.5), `nodeBudget + connectivityRetryNodeReserve` computes to the EXACT SAME
    // absolute value as `nonDefaultRetryNodeCeiling` (both `1.5 × nodeBudget`), so the instant that
    // preceding tier maxes out its own ceiling on a failing attempt, this tier's entry guard
    // (`nodesExpanded < connectivityRetryNodeCeiling`) is already false — zero real headroom,
    // regardless of this tier's own reserve fraction. Confirmed directly: `R02114`/`R00592` both
    // recovered with an artificially large reserve override (2.0) but STILL failed at the shipped 0.5
    // default until this fix, landing at exactly the SAME `75,000,003`/`75,000,198` node counts either
    // way — proof the tier was never actually getting more room as the fraction changed. Stacking on
    // the preceding tier's own ceiling instead guarantees genuine additive headroom regardless of what
    // fraction that tier happens to use, rather than relying on the two fractions coincidentally
    // differing (which is what let `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s own 0.5 vs.
    // `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s 0.25 avoid this exact bug by accident, not by design — not
    // retroactively changed here, since both are already population-validated and shipped as-is).
    const connectivityRetryNodeCeiling = nonDefaultRetryNodeCeiling === Infinity ? Infinity : nonDefaultRetryNodeCeiling + connectivityRetryNodeReserve;

    // STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY's own node reserve — additive from the start (see
    // REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. Opt-in convention (`cfg && ... === true`) —
    // this is a NEW, unvalidated mechanism, unlike its three promoted siblings above.
    const repairElitePrefixDfsRetryTierWillRun = repairElitePrefixDfsRetryBudgetFraction > 0
        && !!(cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY === true)
        && repairConfigsCount > 0;
    const repairElitePrefixDfsRetryNodeReserve = (repairElitePrefixDfsRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(connectivityRetryNodeCeiling * repairElitePrefixDfsRetryNodeReserveFraction)
        : 0;
    // STACKED on `connectivityRetryNodeCeiling` (the immediately-preceding tier's own ceiling), NOT
    // `nodeBudget` directly — this tier is built with that lesson already applied from the start
    // (see REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION's own comment), rather than
    // discovering the same starvation bug a fourth time.
    const repairElitePrefixDfsRetryNodeCeiling = connectivityRetryNodeCeiling === Infinity
        ? Infinity
        : connectivityRetryNodeCeiling + repairElitePrefixDfsRetryNodeReserve;

    // STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own node reserve — additive from the start (see
    // MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. PROMOTED to default-ON (2026-08-19, GHA run
    // 32224200709 vs the 31918095910 baseline): corpus1 95/102 identical solved-ID set (zero change),
    // corpus2 819→828 (+9: R02119/R02128/R02132/R02401/R02512/R02783/R02835/R02947/R03361), ZERO
    // regressions. Cost: corpus1 nodes +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% —
    // comparable to (cheaper on corpus2 than) STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own
    // promoted cost. Standard opt-OUT convention (`!cfg || cfg.FLAG`), matching its three promoted
    // siblings — NOT the opt-in `cfg && cfg.FLAG === true` shape STRATEGY_REPAIR_ELITE_PREFIX_DFS_
    // RETRY above still uses (that one remains closed/opt-in). See ablation-config.ts's own comment
    // for the full mechanism and the R02422 non-recovery caveat.
    //
    // `initialMustCrossMask !== 0` is this tier's SOUNDNESS-BASED eligibility gate, and the one
    // structural difference from its four predecessors. prune-gauntlet.ts reaches
    // PRUNE_MC_NEIGHBOR_BUDGET only when `state.mustCrossMask !== 0`, which can never hold on a level
    // that starts with no must-cross obligations — so on such a level the prune rejected exactly zero
    // moves, and rerunning the ladder with it disabled is provably BIT-IDENTICAL to the ladder that
    // just failed. Skipping it is therefore free in solves and free in cost, not a heuristic bet.
    // Folded into the reserve's own predicate (not just the loop guard) so an ineligible level does
    // not strand reserved nodes it will never spend — the lockstep requirement
    // ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history documents.
    const mcNeighborBudgetRetryTierWillRun = mcNeighborBudgetRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_MC_NEIGHBOR_BUDGET_RETRY)
        && initialMustCrossMask !== 0;
    const mcNeighborBudgetRetryNodeReserve = (mcNeighborBudgetRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(repairElitePrefixDfsRetryNodeCeiling * mcNeighborBudgetRetryNodeReserveFraction)
        : 0;
    // STACKED on `repairElitePrefixDfsRetryNodeCeiling` (the immediately-preceding tier's own
    // ceiling), NOT `nodeBudget` directly — same reason as its two stacked predecessors.
    const mcNeighborBudgetRetryNodeCeiling = repairElitePrefixDfsRetryNodeCeiling === Infinity
        ? Infinity
        : repairElitePrefixDfsRetryNodeCeiling + mcNeighborBudgetRetryNodeReserve;

    // STRATEGY_REPAIR_LATE_PROBE — see REPAIR_LATE_PROBE_NODE_BUDGET's own comment for the full
    // rationale. `repairConfigsCount === 0` is USUALLY exactly "needsRepairFallback was false for
    // this level" (the same eligibility signal the early probe and ordinary fallback loop already
    // gate on) — this tier exists specifically FOR that population, so it is the opposite polarity
    // of every other repairConfigsCount check in this function. Default-ON (promoted
    // 2026-08-21) — same standard convention as its five predecessors.
    //
    // NOT a safe substitute for needsRepairFallback in general, though: `applyAttemptConfigOptions`
    // (attempts.ts) also empties `repairConfigs` when an ablation explicitly sets
    // `STRATEGY_REPAIR_FALLBACK: false` — a level a caller deliberately routed AWAY from repair, not
    // one repair was never eligible for. Fixed 2026-08-20: without the extra guard below, an
    // experiment combining `STRATEGY_REPAIR_LATE_PROBE: true` with `STRATEGY_REPAIR_FALLBACK: false`
    // (a natural pairing — "does the new tier's gain hold with the old fallback disabled") would
    // silently reintroduce repair through this tier, defeating the ablation's own purpose.
    const repairLateProbeNodeBudgetRaw = Number(opts.repairLateProbeNodeBudgetOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairLateProbeNodeBudget = Number.isFinite(repairLateProbeNodeBudgetRaw) && repairLateProbeNodeBudgetRaw >= 0
        ? repairLateProbeNodeBudgetRaw
        : REPAIR_LATE_PROBE_NODE_BUDGET;
    const repairLateProbeTierWillRun = repairLateProbeNodeBudget > 0
        && !!(!cfg || cfg.STRATEGY_REPAIR_LATE_PROBE)
        && repairConfigsCount === 0
        && !(cfg && 'STRATEGY_REPAIR_FALLBACK' in cfg && cfg.STRATEGY_REPAIR_FALLBACK === false);
    // Flat additive reserve, NOT scaled by nodeBudget/the preceding tier's ceiling — see
    // REPAIR_LATE_PROBE_NODE_BUDGET's own comment for why this tier's shape deliberately differs
    // from the five whole-ladder-rerun tiers above. Still stacked on the preceding tier's own
    // ceiling (never restarting from nodeBudget directly), for the same reason as its predecessors.
    const repairLateProbeNodeReserve = repairLateProbeTierWillRun ? repairLateProbeNodeBudget : 0;
    const repairLateProbeNodeCeiling = mcNeighborBudgetRetryNodeCeiling === Infinity
        ? Infinity
        : mcNeighborBudgetRetryNodeCeiling + repairLateProbeNodeReserve;

    // STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY (promoted default-ON 2026-08-23: population-
    // scale A/B produced +3 net with zero regressions across the 73-loss/90-gain/published
    // populations — see docs/solver-opt-in-experiment-ledger.md) — see
    // GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_BUDGET_FRACTION's own comment above. No override
    // plumbing yet (first-landing scope) — always the two constants below, subject only to the
    // flag itself and disableExtraBudgetPasses.
    const goalAttractionLegacyDistanceRetryBudgetFraction = opts.disableExtraBudgetPasses
        ? 0 : GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_BUDGET_FRACTION;
    const goalAttractionLegacyDistanceRetryTierWillRun = goalAttractionLegacyDistanceRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY);
    const goalAttractionLegacyDistanceRetryNodeReserve = (goalAttractionLegacyDistanceRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(repairLateProbeNodeCeiling * GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_NODE_RESERVE_FRACTION)
        : 0;
    const goalAttractionLegacyDistanceRetryNodeCeiling = repairLateProbeNodeCeiling === Infinity
        ? Infinity
        : repairLateProbeNodeCeiling + goalAttractionLegacyDistanceRetryNodeReserve;

    // STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY (promoted, default ON) — see
    // REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS's own comment above. Requires
    // repairLateProbeTierWillRun itself (running more seeds of a tier that wouldn't even run once
    // makes no sense, and this transitively respects opts.disableExtraBudgetPasses /
    // repairLateProbeNodeBudgetOverride, both of which repairLateProbeTierWillRun already checks).
    // Stacked on goalAttractionLegacyDistanceRetryNodeCeiling, the current true end of the ladder —
    // NOT on repairLateProbeNodeCeiling directly, so it never contends with that tier's own budget.
    const repairLateProbeMultiSeedRetryTierWillRun = repairLateProbeTierWillRun
        && !!(!cfg || cfg.STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY);
    // Flat additive reserve (like repairLateProbeNodeReserve itself): each seed gets its own full
    // REPAIR_LATE_PROBE_NODE_BUDGET, not a fraction split across seeds — diluting an already-
    // calibrated per-seed budget would confound "does more seeds help" with "does less budget per
    // seed hurt."
    const repairLateProbeMultiSeedRetryNodeReserve = repairLateProbeMultiSeedRetryTierWillRun
        ? repairLateProbeNodeBudget * REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length
        : 0;
    const repairLateProbeMultiSeedRetryNodeCeiling = goalAttractionLegacyDistanceRetryNodeCeiling === Infinity
        ? Infinity
        : goalAttractionLegacyDistanceRetryNodeCeiling + repairLateProbeMultiSeedRetryNodeReserve;

    // STRATEGY_RETRY_TIER_NODE_STAIRCASE (opt-in, default OFF) — whether the attraction-diversity pass
    // and the two promoted whole-ladder retry tiers subdivide their node reserve per config instead of
    // letting the first config consume all of it. See the flag's own comment in ablation-config.ts
    // for the measured defect, and STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own call site for the fix this
    // generalizes (that tier does it unconditionally, since it never shipped without it).
    //
    // Opt-in specifically because it is a REDISTRIBUTION, not a free win: capping the first config at
    // reserve/N can lose a level whose retry-tier win came from that config spending the whole
    // reserve. Both directions are real and only a full-corpus A/B can price them.
    const retryTierStaircase = !!(cfg && cfg.STRATEGY_RETRY_TIER_NODE_STAIRCASE === true);

    const earlyTierNodeBudget = nodeBudget === Infinity ? Infinity : nodeBudget - admissibleOrderNodeReserve;

    // STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated
    // mechanism, landed 2026-08-13). Protects the admissible-order tier's own non-'default' profiles
    // (`ADMISSIBLE_ORDER_PROFILES`'s `'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/
    // `'nearClosureRescue'`) from `'default'`, which runs first in that tier's own sequential loop
    // and can consume the tier's ENTIRE guaranteed pool (`admissibleOrderNodeReserve`) before any
    // other profile gets a single node — a documented real regression mode, not a hypothesis:
    // `reports/2026-07-30-admissible-order-node-reserve.md` §4 found R03148 solved by `'none'` at
    // 1.97M nodes when the tier's node reserve was OFF, but with it ON, `'default'` ate the whole
    // 20M-node slice and `'none'` never ran at all. That report explicitly declined to fix this
    // ("the obvious refinement — sub-slicing the reserve per profile instead of first-come-first-
    // served — is not made here... needs its own A/B, not a guess").
    //
    // ASYMMETRIC RISK, unlike this session's two prior reserves: `'default'` is this tier's dominant
    // contributor (CLAUDE.md: 103 of 115 validated solves; the same report: 21 of the 22 measured
    // gains). A reserve sized carelessly here can trade a large, PROVEN win for a small, speculative
    // one — the report's own explicit caution. Mitigated by nesting this reserve INSIDE
    // `admissibleOrderNodeReserve` (a fraction OF it, not of `nodeBudget` directly), so `'default'`
    // is guaranteed at least `earlyTierNodeBudget` worth of headroom (its full pre-reserve share)
    // PLUS the majority of the tier's own reserve — never less than
    // `(1 - ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION)` of it — by construction, same soundness
    // shape as REPAIR_FALLBACK_NODE_RESERVE_FRACTION/ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's own
    // nesting. Scoped narrowly to protecting the non-'default' profiles COLLECTIVELY from 'default'
    // specifically (they still compete first-come-first-served among themselves for the withheld
    // slice, same shape as the repair-fallback loop's own repairConfigs list) — this does NOT attempt
    // to guarantee fairness among 'none'/'mustCrossFirst'/'intersectionHarvest'/'nearClosureRescue'
    // relative to each other; that would be a separate, deeper question without current evidence.
    //
    // CALIBRATION CAVEAT: 0.15 is a starting point matching this session's other new reserves' own
    // starting fraction, NOT derived from any A/B on this specific mechanism — and given the
    // asymmetric risk above, a promotion decision needs explicit evidence that 'default'-winning
    // levels (not just currently-unsolved ones) are unaffected, not just that new solves appear.
    const admissibleOrderProfileNodeReserveEnabled = !!(cfg && cfg.STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE === true);
    const admissibleOrderProfileNodeReserveFractionRaw = Number(opts.admissibleOrderProfileNodeReserveFractionOverride);
    const admissibleOrderProfileNodeReserveFraction = Number.isFinite(admissibleOrderProfileNodeReserveFractionRaw) && admissibleOrderProfileNodeReserveFractionRaw >= 0
        ? Math.min(1, admissibleOrderProfileNodeReserveFractionRaw)
        : ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION;
    const admissibleOrderProfileNodeReserveEligible = admissibleOrderProfileNodeReserveEnabled
        && admissibleOrderProfileNodeReserveFraction > 0
        && admissibleOrderConfigsCount > 1
        && admissibleOrderNodeReserve > 0;
    const admissibleOrderProfileNodeReserve = admissibleOrderProfileNodeReserveEligible
        ? Math.floor(admissibleOrderNodeReserve * admissibleOrderProfileNodeReserveFraction)
        : 0;
    // The ceiling the tier's 'default' profile specifically may reach — always >= earlyTierNodeBudget
    // by construction (see above), so no clamp is needed. Every OTHER profile in the tier keeps
    // checking against the full `nodeBudget`, unchanged — mirroring `repairFallbackNodeCeiling`'s
    // identical pattern one tier up.
    const admissibleOrderDefaultProfileCeiling = nodeBudget === Infinity
        ? Infinity
        : nodeBudget - admissibleOrderProfileNodeReserve;

    // Ordinary main-loop late-suffix reserve. Production default-ON as of 2026-08-12 (fraction 0.15,
    // reports/2026-08-12-main-loop-late-reserve-population-ab.md) — standard `(!cfg || cfg.FLAG)`
    // convention, matching admissibleOrderTierWillRun above and every other non-opt-in flag, NOT the
    // opt-in `cfg && cfg.FLAG === true` convention (which stays inert whenever cfg is null — every
    // production interactive solve and any CLI run without --enable-flags — the exact wiring gap the
    // neighbor-budget promotion shipped with and had to fix separately; see
    // docs/solver-opt-in-experiment-ledger.md's "wiring gap" notes). Unlike a reorder, this retains
    // the exact config/gate iteration order: the repair probe and early config prefix see a reduced
    // absolute ceiling, while the final N ordinary configs see the ordinary tier's whole envelope
    // (`earlyTierNodeBudget`, which already excludes the independent admissible-order reserve).
    // After the ordinary main loop has offered that suffix its slice, repair/diversity may use any
    // remainder, so an inexpensive/exhausted suffix never strands budget. Still a strict no-op
    // without a finite `nodeBudget` (see `mainLoopLateReserveEligible` below), so this only affects
    // offline batch tooling, never interactive Play/Editor/Review solves.
    const mainLoopLateReserveEnabled = !!(!cfg || cfg.STRATEGY_MAIN_LOOP_LATE_RESERVE);
    const mainLoopLateReserveFractionRaw = Number(opts.mainLoopLateReserveFractionOverride);
    const mainLoopLateReserveFraction = Number.isFinite(mainLoopLateReserveFractionRaw) && mainLoopLateReserveFractionRaw >= 0
        ? Math.min(1, mainLoopLateReserveFractionRaw)
        : MAIN_LOOP_LATE_RESERVE_FRACTION;
    // Ablation: STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE (default-OFF — see ablation-config.ts
    // and attempts.ts's two must-cross-heavy sibling rules that read this same flag to append a 9th
    // trailing config). Mirrors the validated 2026-08-22 4->5 increase (this comment's own history
    // above): widening the protected window one more slot is a FRACTION of earlyTierNodeBudget spread
    // one slot thinner, not a fixed amount, so every OTHER rule's existing last-N configs merely gain
    // one more protected neighbor — confirmed a strict no-op there before, and unvalidated only for
    // the two rules whose 9th config this flag also adds. An explicit opts override still wins.
    const mainLoopLateReserveConfigCountDefault = (cfg && cfg.STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE === true)
        ? MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT + 1
        : MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT;
    const mainLoopLateReserveCountRaw = Number(opts.mainLoopLateReserveConfigCountOverride);
    const mainLoopLateReserveConfigCount = Number.isFinite(mainLoopLateReserveCountRaw) && mainLoopLateReserveCountRaw >= 0
        ? Math.min(mainConfigsCount, Math.floor(mainLoopLateReserveCountRaw))
        : Math.min(mainConfigsCount, mainLoopLateReserveConfigCountDefault);
    const mainLoopLateReserveEligible = mainLoopLateReserveEnabled
        && mainLoopLateReserveFraction > 0
        && mainLoopLateReserveConfigCount > 0
        && earlyTierNodeBudget !== Infinity;
    const mainLoopLateReserve = mainLoopLateReserveEligible
        ? Math.floor(earlyTierNodeBudget * mainLoopLateReserveFraction)
        : 0;
    // A tiny finite ceiling can round the requested fraction to zero. Treat that as fully inert:
    // no telemetry marker, no altered status, and no pretend beneficiary with a zero-node slice.
    const mainLoopLateReserveWillRun = mainLoopLateReserve > 0;
    // The repair probe's own ceiling, AND the main loop's early-config-prefix ceiling (see
    // runInterleavedAttempts/runGateSerialAttempts's `earlyConfigNodeBudget` param) — deliberately
    // untouched by the repair-fallback reserve below. See that reserve's own comment for why: an
    // earlier version of this reserve derived this value from an already-shrunk pool, which starved
    // the probe and the main loop's own attempts instead of purely reallocating idle capacity —
    // confirmed as a real, measured regression (see REPAIR_FALLBACK_NODE_RESERVE_FRACTION's comment).
    const mainLoopEarlyNodeBudget = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - mainLoopLateReserve;
    const mainLoopLateConfigStart = mainLoopLateReserveWillRun
        ? mainConfigsCount - mainLoopLateReserveConfigCount
        : mainConfigsCount;

    // Repair-fallback node reserve (STRATEGY_REPAIR_FALLBACK_NODE_RESERVE, opt-in, default OFF —
    // unvalidated new mechanism, see this constant's own comment). The repair fallback loop and the
    // attraction-diversity pass share `earlyTierNodeBudget` with the WHOLE main loop (early + late
    // suffix combined), completely unprotected: the main loop always runs first and can consume the
    // entire pool before either ever gets a single node. Same starvation shape as the already-fixed
    // repair-probe/early-main-loop bug (STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET) and the
    // already-fixed admissible-order/everything-before-it bug (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION),
    // one tier boundary further down the ladder — same mechanism as the admissible-order reserve
    // (a flat carve-out from the ceiling the PRODUCER runs against, computed before the producer
    // runs), not the repair-probe fix's live-signal shrink, because here the receptor (the fallback
    // loop) needs a share of the pool it's currently denied entirely, not a scale-down of an
    // over-consuming producer's own budget.
    //
    // REVISION 1 (2026-08-13): the first version of this reserve reduced `earlyTierNodeBudget`
    // BEFORE deriving `mainLoopEarlyNodeBudget` — which is also the repair probe's own ceiling, and
    // (via the late-suffix budget-share formula in runInterleavedAttempts/runGateSerialAttempts)
    // also shrank every main-loop attempt's own node share, not just the late-suffix ones. Measured
    // directly on this session's n=12 local sample: net −2 (0 gained, 2 lost — R02823's probe
    // attempt truncated from 5,308,905 to 4,128,152 nodes, short of the 5,308,905 it needed to win;
    // R00602's winning beam attempt truncated from 282,246 to 9,990). Taking budget from the probe
    // and main loop is not "reallocating idle capacity" the way the admissible-order reserve does —
    // that pool is already load-bearing.
    //
    // REVISION 2 (2026-08-13): fixing revision 1 by computing this reserve as a fraction of
    // `earlyTierNodeBudget` directly, then clamping `mainLoopNodeBudget` to never drop below
    // `mainLoopEarlyNodeBudget` (Math.max), traded one bug for another: with both this fraction and
    // `mainLoopLateReserveFraction` at their same 0.15 default, `earlyTierNodeBudget -
    // repairFallbackNodeReserve` landed EXACTLY at `mainLoopEarlyNodeBudget` (both are 15% of the
    // same base), so the Math.max clamp silently zeroed the late suffix's entire
    // `mainLoopLateReserve` room every time — not a rare edge case, the default-parameter case.
    // Measured directly: R01856's winner (`beam:intersectionHarvest@beam5000`, a LATE-suffix config,
    // 175,097 cheap nodes in baseline) got zero main-loop attempts at all once this reserve claimed
    // the exact room the late reserve needed — a NEW regression this revision's own fix introduced,
    // caught by re-running the same n=12 sample rather than trusting the first fix's logic alone.
    //
    // THE FIX: this reserve is now a fraction of `mainLoopLateReserve` itself (the room ALREADY
    // set aside for the late suffix), not an independent claim on `earlyTierNodeBudget` — i.e. "of
    // whatever the late suffix would get, hand some of it to the fallback loop instead" rather than
    // two reserves independently competing for the same base pool. This makes `mainLoopNodeBudget
    // >= mainLoopEarlyNodeBudget` true BY CONSTRUCTION (repairFallbackNodeReserve <=
    // mainLoopLateReserve always, since the fraction is clamped to [0,1]) — no clamp needed, and the
    // late suffix keeps a share proportional to (1 - this fraction) rather than losing it outright.
    // ACCEPTED COUPLING: this reserve is a strict no-op whenever `mainLoopLateReserve` is 0 (whether
    // because STRATEGY_MAIN_LOOP_LATE_RESERVE is off, or its own config-count/fraction rounds to
    // zero) — there is nothing to carve from without repeating revision 1's mistake. Since
    // STRATEGY_MAIN_LOOP_LATE_RESERVE is production default-ON, this only matters for a caller that
    // explicitly disables it while enabling this flag; not fixed here (would need a second,
    // independent floor computation) per CLAUDE.md's smallest-change guidance — flagged, not solved.
    //
    // Gated on the SAME real-run condition the fallback loop's own `for` loop below already checks
    // (repairConfigsCount > 0 && repairBudgetFraction !== 0) — no separate ablation flag guards
    // that loop today, so this reserve's eligibility mirrors it exactly. Reserving for a level with
    // no repair fallback to protect would strand nodes, shrinking every disableExtraBudgetPasses
    // caller's effective budget for nothing — the same reasoning the admissible-order reserve's own
    // comment documents.
    //
    // OPT-IN convention (`cfg && cfg.FLAG === true`), NOT the standard `!cfg || cfg.FLAG` every
    // OTHER reserve/promoted flag in this file uses — deliberately: this is a brand-new, unvalidated
    // mechanism (see the constant's own comment), registered opt-in/default-OFF in
    // modules/solver/ablation-config.ts's OPT_IN_FEATURES, so it must stay OFF whenever `cfg` is null
    // (every production interactive solve and any CLI run without --enable-flags) — the exact
    // opposite-direction mismatch of the wiring-gap bug documented throughout
    // docs/solver-opt-in-experiment-ledger.md would result from using the standard convention here.
    const repairFallbackNodeReserveEnabled = !!(cfg && cfg.STRATEGY_REPAIR_FALLBACK_NODE_RESERVE === true);
    const repairFallbackNodeReserveFractionRaw = Number(opts.repairFallbackNodeReserveFractionOverride);
    const repairFallbackNodeReserveFraction = Number.isFinite(repairFallbackNodeReserveFractionRaw) && repairFallbackNodeReserveFractionRaw >= 0
        ? Math.min(1, repairFallbackNodeReserveFractionRaw)
        : REPAIR_FALLBACK_NODE_RESERVE_FRACTION;
    const repairFallbackNodeReserveEligible = repairFallbackNodeReserveEnabled
        && repairFallbackNodeReserveFraction > 0
        && repairConfigsCount > 0
        && repairBudgetFraction !== 0
        && mainLoopLateReserve > 0;
    const repairFallbackNodeReserve = repairFallbackNodeReserveEligible
        ? Math.floor(mainLoopLateReserve * repairFallbackNodeReserveFraction)
        : 0;

    // STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE (see ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's
    // own comment for the full derivation). Nests one level deeper than repairFallbackNodeReserve
    // just above: a fraction OF the remainder `mainLoopLateReserve - repairFallbackNodeReserve`, so
    // `repairFallbackNodeReserve + attractionDiversityNodeReserve <= mainLoopLateReserve` holds by
    // construction (both fractions clamped to [0,1]) — no clamp needed, same soundness argument as
    // the reserve it nests inside. Same opt-in convention and same real-run-condition eligibility
    // shape (diversityBudgetFraction/STRATEGY_ATTRACTION_DIVERSITY mirror repairConfigsCount>0/
    // repairBudgetFraction!==0 above) so a level where the diversity pass would never run doesn't
    // strand nodes reserving for it.
    const attractionDiversityNodeReserveEnabled = !!(cfg && cfg.STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE === true);
    const attractionDiversityNodeReserveFractionRaw = Number(opts.attractionDiversityNodeReserveFractionOverride);
    const attractionDiversityNodeReserveFraction = Number.isFinite(attractionDiversityNodeReserveFractionRaw) && attractionDiversityNodeReserveFractionRaw >= 0
        ? Math.min(1, attractionDiversityNodeReserveFractionRaw)
        : ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION;
    const attractionDiversityNodeReserveEligible = attractionDiversityNodeReserveEnabled
        && attractionDiversityNodeReserveFraction > 0
        && diversityBudgetFraction !== 0
        && (!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY)
        && mainLoopLateReserve > repairFallbackNodeReserve;
    const attractionDiversityNodeReserve = attractionDiversityNodeReserveEligible
        ? Math.floor((mainLoopLateReserve - repairFallbackNodeReserve) * attractionDiversityNodeReserveFraction)
        : 0;

    // STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY (see REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION's
    // own comment for the full derivation). Only the ENABLE/fraction decision can be made here: the
    // reserve's SIZE depends on what the probe actually shrinks, which is not known until the probe
    // has run, so it is computed below once `shrunkBiasedTiers` is populated.
    //
    // OPT-IN convention (`cfg && cfg.FLAG === true`), matching the two new reserves above and NOT
    // the standard `!cfg || cfg.FLAG` the promoted flags use: brand-new and unvalidated, registered
    // in modules/solver/ablation-config.ts's OPT_IN_FEATURES, so it must stay OFF whenever `cfg` is null.
    const shrinkRecoveryEnabled = !!(cfg && cfg.STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY === true)
        && repairConfigsCount > 0
        && repairBudgetFraction !== 0
        && (!cfg || cfg.STRATEGY_REPAIR_PROBE)
        && (!cfg || cfg.STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET);
    const shrinkRecoveryFractionRaw = Number(opts.repairProbeShrinkRecoveryNodeReserveFractionOverride);
    const shrinkRecoveryFraction = Number.isFinite(shrinkRecoveryFractionRaw) && shrinkRecoveryFractionRaw >= 0
        ? Math.min(1, shrinkRecoveryFractionRaw)
        : REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION;

    // The ceiling the main loop's LATE SUFFIX may additionally reach beyond `mainLoopEarlyNodeBudget`
    // — always >= mainLoopEarlyNodeBudget by construction (see above), so no clamp is needed here.
    // `earlyTierNodeBudget` itself is unchanged and remains what the repair fallback loop and the
    // attraction-diversity pass check against below, so what they may spend is exactly what these two
    // reserves withheld from the main loop's late suffix specifically — never from the probe or the
    // early config prefix.
    const mainLoopNodeBudget = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - repairFallbackNodeReserve - attractionDiversityNodeReserve;
    // The ceiling the repair-fallback loop itself may reach — `earlyTierNodeBudget` minus the slice
    // withheld specifically for the diversity pass, so the fallback loop (which the close-out
    // measurement confirmed always spends everything it's allowed to) cannot eat the room this
    // reserve exists to protect. Equals `earlyTierNodeBudget` whenever the reserve is ineligible
    // (default OFF), so this is a strict no-op in that case, same as every other reserve here.
    const repairFallbackNodeCeilingBase = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - attractionDiversityNodeReserve;

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

    // Named eligibility for the three stages whose real dispatch condition (orchestration.ts) is a
    // simple boolean rather than a node-reserve cascade — extracted verbatim from that condition so
    // telemetry (orchestration.ts's `finish()`) can read the SAME value instead of re-deriving it.
    const repairProbeTierWillRun = repairConfigsCount > 0 && repairBudgetFraction !== 0 && !!(!cfg || cfg.STRATEGY_REPAIR_PROBE);
    const repairFallbackTierWillRun = repairConfigsCount > 0 && repairBudgetFraction !== 0;
    const diversityTierWillRun = diversityBudgetFraction > 0 && !!(!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY);

    return {
        repairProbeTierWillRun, repairFallbackTierWillRun, diversityTierWillRun,
        repairBudgetFraction, diversityBudgetFraction, dedupRetryBudgetFraction, dedupRetryNodeReserveFraction,
        nonDefaultRetryBudgetFraction, nonDefaultRetryNodeReserveFraction, connectivityRetryBudgetFraction,
        connectivityRetryNodeReserveFraction, repairElitePrefixDfsRetryBudgetFraction, repairElitePrefixDfsRetryNodeReserveFraction,
        mcNeighborBudgetRetryBudgetFraction, mcNeighborBudgetRetryNodeReserveFraction, admissibleOrderBudgetFraction,
        admissibleOrderTierWillRun, admissibleOrderNodeReserveFraction, admissibleOrderNodeReserve,
        dedupRetryTierWillRun, dedupRetryNodeReserve, dedupRetryNodeCeiling,
        nonDefaultRetryTierWillRun, nonDefaultRetryNodeReserve, nonDefaultRetryNodeCeiling,
        connectivityRetryTierWillRun, connectivityRetryNodeReserve, connectivityRetryNodeCeiling,
        repairElitePrefixDfsRetryTierWillRun, repairElitePrefixDfsRetryNodeReserve, repairElitePrefixDfsRetryNodeCeiling,
        mcNeighborBudgetRetryTierWillRun, mcNeighborBudgetRetryNodeReserve, mcNeighborBudgetRetryNodeCeiling,
        repairLateProbeNodeBudget, repairLateProbeTierWillRun, repairLateProbeNodeReserve, repairLateProbeNodeCeiling,
        goalAttractionLegacyDistanceRetryBudgetFraction, goalAttractionLegacyDistanceRetryTierWillRun,
        goalAttractionLegacyDistanceRetryNodeReserve, goalAttractionLegacyDistanceRetryNodeCeiling,
        repairLateProbeMultiSeedRetryTierWillRun, repairLateProbeMultiSeedRetryNodeReserve,
        repairLateProbeMultiSeedRetryNodeCeiling,
        retryTierStaircase, earlyTierNodeBudget,
        admissibleOrderProfileNodeReserveEligible, admissibleOrderProfileNodeReserve, admissibleOrderDefaultProfileCeiling,
        mainLoopLateReserveEnabled, mainLoopLateReserveFraction, mainLoopLateReserveConfigCount,
        mainLoopLateReserveEligible, mainLoopLateReserve, mainLoopLateReserveWillRun,
        mainLoopEarlyNodeBudget, mainLoopLateConfigStart,
        repairFallbackNodeReserveEligible, repairFallbackNodeReserve,
        attractionDiversityNodeReserveEligible, attractionDiversityNodeReserve,
        shrinkRecoveryEnabled, shrinkRecoveryFraction,
        mainLoopNodeBudget, repairFallbackNodeCeilingBase,
    };
}
export type StageBudgetPlan = ReturnType<typeof computeStageBudgetPlan>;

/** Second step, run only after the repair probe: sizes STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY's
 *  reserve to the ACTUAL debt the probe's adaptive biased-budget shrink left behind, and drops
 *  every post-probe early-tier ceiling by that reserve. Strict no-op (returns the plan's own
 *  pre-shrink ceilings unchanged) whenever nothing was shrunk. */
export function computeShrinkRecoveryBudget(plan: StageBudgetPlan, shrunkBiasedTiers: ReadonlyArray<{ fullNodeBudget: number }>) {
    const { shrinkRecoveryEnabled, shrinkRecoveryFraction, earlyTierNodeBudget, mainLoopNodeBudget, repairFallbackNodeCeilingBase } = plan;
    const shrinkRecoveryDebt = shrinkRecoveryEnabled
        ? shrunkBiasedTiers.reduce((sum, t) => sum + t.fullNodeBudget, 0) : 0;
    const shrinkRecoveryNodeReserve = (shrinkRecoveryDebt > 0 && earlyTierNodeBudget !== Infinity)
        ? Math.min(shrinkRecoveryDebt, Math.floor(earlyTierNodeBudget * shrinkRecoveryFraction))
        : 0;
    // Every post-probe early tier's ceiling drops by the reserve; each equals its pre-reserve value
    // whenever the reserve is 0 (default OFF, or nothing shrunk), so this is a strict no-op then.
    const mainLoopNodeBudgetFinal = mainLoopNodeBudget === Infinity ? Infinity : mainLoopNodeBudget - shrinkRecoveryNodeReserve;
    const repairFallbackNodeCeiling = repairFallbackNodeCeilingBase === Infinity
        ? Infinity : repairFallbackNodeCeilingBase - shrinkRecoveryNodeReserve;
    const diversityNodeCeiling = earlyTierNodeBudget === Infinity
        ? Infinity : earlyTierNodeBudget - shrinkRecoveryNodeReserve;
    return { shrinkRecoveryDebt, shrinkRecoveryNodeReserve, mainLoopNodeBudgetFinal, repairFallbackNodeCeiling, diversityNodeCeiling };
}

// ─── Budget envelopes: the plan's stage-keyed BudgetEnvelope projection ───────────────────────
//
// buildStageBudgetEnvelopes turns the plan above into one BudgetEnvelope (stage-policy.ts) per
// stage — the canonical object stage dispatch reads its NODE ceiling from (envelopeNodeCeiling
// below converts its `nodes.ceiling` back to the Infinity a search call expects). Wall/ms budgets
// remain a `timeBudgetMs * plan.xBudgetFraction` projection computed at each dispatch site (same
// single source, plan.xBudgetFraction, that built the envelope's own `wall` currency) rather than
// routed through the envelope object — the ladder's ms allocation is itself re-derived every dispatch
// from "elapsed since this tier started", which the envelope (a per-solve snapshot) does not model.

/** `BudgetEnvelope.nodes.ceiling` is `null` for an uncapped currency (see createBudgetEnvelope) —
 *  this converts that back to the `Infinity` every search entry point (runAttempt,
 *  runInterleavedAttempts, runGateSerialAttempts) expects for "no ceiling". */
export function envelopeNodeCeiling(envelope: BudgetEnvelope): number {
    return envelope.nodes.ceiling ?? Infinity;
}

/** One BudgetEnvelope per policy stage this plan covers, built directly from the plan's own
 *  numbers (never a second, independent computation) — see stage-policy.ts's SolverStageId for
 *  the full stage vocabulary; portfolio-only stages are covered by portfolio-experiment.ts's own
 *  scheduler, not this cascade. */
export function buildStageBudgetEnvelopes(plan: StageBudgetPlan, input: { timeBudgetMs: number; nodeBudget: number }): Partial<Record<SolverStageId, BudgetEnvelope>> {
    const { timeBudgetMs, nodeBudget } = input;
    const envelope = (stageId: SolverStageId, wallMs: number | undefined, nodeCeiling: number, headroom: BudgetEnvelope['headroom']) =>
        createBudgetEnvelope({ stageId, wallMs, nodeCeiling: nodeCeiling === Infinity ? undefined : nodeCeiling, scope: 'stage-local', headroom });
    const none: BudgetEnvelope['headroom'] = { kind: 'none', amount: 0, sourceStageId: null };
    return {
        'main-loop': envelope('main-loop', timeBudgetMs, plan.mainLoopEarlyNodeBudget, none),
        'repair-fallback': envelope('repair-fallback', Math.floor(timeBudgetMs * plan.repairBudgetFraction), plan.repairFallbackNodeCeilingBase, none),
        'attraction-diversity': envelope('attraction-diversity', Math.floor(timeBudgetMs * plan.diversityBudgetFraction), plan.earlyTierNodeBudget,
            plan.attractionDiversityNodeReserve > 0 ? { kind: 'withheld', amount: plan.attractionDiversityNodeReserve, sourceStageId: 'main-loop' } : none),
        'admissible-order': envelope('admissible-order', Math.floor(timeBudgetMs * plan.admissibleOrderBudgetFraction), nodeBudget,
            plan.admissibleOrderNodeReserve > 0 ? { kind: 'withheld', amount: plan.admissibleOrderNodeReserve, sourceStageId: 'main-loop' } : none),
        'dedup-near-tie-retry': envelope('dedup-near-tie-retry', Math.floor(timeBudgetMs * plan.dedupRetryBudgetFraction), plan.dedupRetryNodeCeiling,
            plan.dedupRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.dedupRetryNodeReserve, sourceStageId: 'admissible-order' } : none),
        'admissible-order-non-default-retry': envelope('admissible-order-non-default-retry', Math.floor(timeBudgetMs * plan.nonDefaultRetryBudgetFraction), plan.nonDefaultRetryNodeCeiling,
            plan.nonDefaultRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.nonDefaultRetryNodeReserve, sourceStageId: 'dedup-near-tie-retry' } : none),
        'connectivity-axis-exhausted-retry': envelope('connectivity-axis-exhausted-retry', Math.floor(timeBudgetMs * plan.connectivityRetryBudgetFraction), plan.connectivityRetryNodeCeiling,
            plan.connectivityRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.connectivityRetryNodeReserve, sourceStageId: 'admissible-order-non-default-retry' } : none),
        'repair-elite-prefix-dfs-retry': envelope('repair-elite-prefix-dfs-retry', Math.floor(timeBudgetMs * plan.repairElitePrefixDfsRetryBudgetFraction), plan.repairElitePrefixDfsRetryNodeCeiling,
            plan.repairElitePrefixDfsRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.repairElitePrefixDfsRetryNodeReserve, sourceStageId: 'connectivity-axis-exhausted-retry' } : none),
        'mc-neighbor-budget-retry': envelope('mc-neighbor-budget-retry', Math.floor(timeBudgetMs * plan.mcNeighborBudgetRetryBudgetFraction), plan.mcNeighborBudgetRetryNodeCeiling,
            plan.mcNeighborBudgetRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.mcNeighborBudgetRetryNodeReserve, sourceStageId: 'repair-elite-prefix-dfs-retry' } : none),
        'repair-late-probe': envelope('repair-late-probe', timeBudgetMs, plan.repairLateProbeNodeCeiling,
            plan.repairLateProbeNodeReserve > 0 ? { kind: 'additive', amount: plan.repairLateProbeNodeReserve, sourceStageId: 'mc-neighbor-budget-retry' } : none),
        'goal-attraction-legacy-distance-retry': envelope('goal-attraction-legacy-distance-retry', Math.floor(timeBudgetMs * plan.goalAttractionLegacyDistanceRetryBudgetFraction), plan.goalAttractionLegacyDistanceRetryNodeCeiling,
            plan.goalAttractionLegacyDistanceRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.goalAttractionLegacyDistanceRetryNodeReserve, sourceStageId: 'repair-late-probe' } : none),
        'repair-late-probe-multi-seed-retry': envelope('repair-late-probe-multi-seed-retry', timeBudgetMs, plan.repairLateProbeMultiSeedRetryNodeCeiling,
            plan.repairLateProbeMultiSeedRetryNodeReserve > 0 ? { kind: 'additive', amount: plan.repairLateProbeMultiSeedRetryNodeReserve, sourceStageId: 'goal-attraction-legacy-distance-retry' } : none),
        'repair-probe-shrink-recovery': envelope('repair-probe-shrink-recovery', undefined, plan.earlyTierNodeBudget, none),
    };
}
