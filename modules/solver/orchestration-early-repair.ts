// The cheap early repair probe tried before the ordinary DFS/beam main-search loop — see
// runEarlyRepairSearch's own header comment for the full rationale (wall-clock-gated search
// probes, node-budget-vs-ms determinism, seed-salt retry calibration, and the adaptive
// biased-tier node-budget shrink). See orchestration.ts's header for the split this file is part
// of; EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP/_ADAPTIVE_BIASED_BADNESS_GATE/_MIN_SCALE/_BIASED_NODE_
// BUDGET are also read directly by orchestration.ts's own solveLevel and re-exported from there
// for compatibility (scripts/tests importing them from './orchestration.js').
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig } from './types.js';
import { withSolverStage } from './stage-policy.js';
import { runAttempt } from './orchestration-run-attempt.js';
import type { Attempt, SearchResult, ShrunkBiasedTier, YieldFn } from './orchestration-contracts.js';

/** Small, strictly ADDITIONAL budgets (never subtracted from mainConfigs' timeBudgetMs or from
 *  REPAIR_ADDITIVE_BUDGET_MULTIPLIER's own later allotment) given to a cheap early probe of the
 *  repair fallback, tried BEFORE the ordinary DFS/beam main loop — see runEarlyRepairSearch.
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
 *  main loop's own ~20s of work (REPAIR_ADDITIVE_BUDGET_MULTIPLIER's own comment, S033/S043
 *  writeups), so probing it cold, before that contention, can only help.
 *
 *  Deliberately small and strictly additive: repairSearchFromGate is a pure function of
 *  (gateKey, level, prep, profile, budget) with a seed derived only from gateKey (mulberry32,
 *  never wall-clock/Math.random — see repair-search.ts), so a failed probe merely repeats a
 *  deterministic prefix of the restarts the later full-budget call performs anyway: wasted
 *  compute on levels where the probe fails to solve, never a correctness or effective-
 *  search-depth cost. This is the same reasoning that ruled out the earlier, reverted design
 *  that shrank the pool a later attempt's own budget was computed against (regressed S017 — see
 *  REPAIR_ADDITIVE_BUDGET_MULTIPLIER's comment): this probe shrinks nothing, it only ever adds an
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
 *  caught later by the full REPAIR_ADDITIVE_BUDGET_MULTIPLIER fallback loop today, same as before
 *  this change) — 6,000,000 clears S043 with a large margin while staying safely below S033's
 *  true cost, preserving which level falls through to the full fallback vs. gets caught early.
 *  Re-measure (repairSearchFromGate called directly per the recipe above, NOT the full
 *  2000-level stress corpus — too slow for this kind of per-level direct-replay measurement)
 *  before changing either value. */
const EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET = 2_000_000;
// Exported for orchestration.test.ts's STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET regression
// tests, which assert the exact scaled node budget a mocked biased-tier attempt is called with.
export const EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET = 6_000_000;

/** Per-attempt wall-clock trip-wire for `runEarlyRepairSearch` (see its own call site's comment): meant
 *  to catch only a genuinely pathological per-node cost or host distress, never to be the actual
 *  deciding factor — the node budgets above are. A flat 30-second value (this constant's value
 *  until 2026-08-12) assumed >=66,667 nodes/sec was always achievable, which measured CPU
 *  contention alone falsified: solving 5 levels at `--workers=4` on a 4-core host (not even
 *  oversubscribed — 4 processes on 4 cores) reproducibly dropped one early-repair-search attempt's
 *  throughput to ~37,000-43,000 nodes/sec, well under the old cap's implicit floor, silently
 *  truncating the attempt below its intended node budget and changing which levels solved purely
 *  as a function of how contended the host happened to be — see
 *  reports/2026-08-12-worker-count-sensitivity-early-repair-search-wallclock.md. A flat constant (rather
 *  than one derived per-attempt from `gateNodeBudget`) is sufficient here because `gateNodeBudget`
 *  is always <= EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET (6,000,000): 20 minutes for that many nodes needs
 *  only ~5,000 nodes/sec sustained, roughly 7-8x below the measured contended rate above and
 *  >100x below nominal uncontended throughput (~650,000 nodes/sec, measured on the same host) —
 *  generous enough to survive materially worse contention than what was measured, while staying a
 *  genuinely bounded backstop. Safe for the ~30s interactive latency promise (Play's "Find a
 *  Hint", Review's approval solve): both pass `repairAdditiveBudgetMultiplierOverride: 0`, which skips the
 *  probe outright (see its call site's own `repairAdditiveBudgetMultiplier !== 0` gate) rather than relying
 *  on this cap to bound it. */
export const EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP = 1_200_000;

/** How much of EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET the heuristically-PREDICTED technique gets when both
 *  biased tiers are present (attempts.ts's predictLikelyBiasedRepairTechnique, under
 *  STRATEGY_REPAIR_TURN_BIAS) — the other (fallback) tier gets the remainder. 0.75 chosen to keep
 *  the predicted tier close to its full pre-split calibration (see EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET's
 *  own comment) while still giving the fallback technique a real, non-zero shot. Two prior designs
 *  measured on a full corpus-2 refresh and rejected: an even 50/50 split (net -3 vs. the run before
 *  it: each half-budget attempt too weak to reproduce known wins like S043's 4.3M-node need against
 *  a 3M cap) and excluding the fallback entirely (net -2 vs. the original turn-bias-off baseline:
 *  the predictor's own ~74% accuracy means a real fraction of levels get zero chance via the
 *  technique they actually needed). See reports/2026-07-23-turnbias-corpus2-ab-validation.md's
 *  "Update" sections for both prior measurements. Needs its own corpus-2 A/B before promotion. */
const EARLY_REPAIR_SEARCH_PREDICTED_TIER_SHARE = 0.75;

/** STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET (production default-ON as of 2026-08-13, promoted
 *  — see the "PROMOTION" paragraph at the end of this comment for the decision and its caveats):
 *  a single-signal, single-recipient instance of "online failure-conditioned allocation"
 *  (docs/solver-interoperability-and-cooperation-plan.md §17, docs/future-work.md item #4).
 *
 *  BACKGROUND — this is a *refinement*, not a confirmation, of the hypothesis that motivated it.
 *  The 2026-08-12 main-search-late-reserve full-corpus sweep (635/1700, down from 694 in a since-
 *  found-confounded A/B arm) was suspected to be explained by runEarlyRepairSearch's wall-clock-fix
 *  (2bfefc660) now letting a contended probe attempt spend its FULL intended node budget instead
 *  of being silently truncated, starving `STRATEGY_MAIN_SEARCH_LATE_RESERVE`'s reserved slice —
 *  see reports/2026-08-12-main-search-late-reserve-population-ab.md's "Follow-up" section. Tracing
 *  the actual code (this file's reserve resolution, above solveLevel's probe call site) shows that
 *  hypothesis is WRONG AS STATED: both the admissible-order-fallback reserve and the main-search late reserve
 *  are computed and carved out of `nodeBudget` BEFORE the probe ever runs, and the probe's own
 *  external node ceiling (`mainSearchEarlyNodeBudget`, passed as this function's `nodeBudget` param)
 *  already excludes both — the probe is structurally incapable of spending into either reserve.
 *
 *  What IS real, confirmed directly on a small local sample (a dozen repair-gated Corpus-2 levels,
 *  15,000,000-node budget, `--workers=1`, uncontended — see
 *  reports/2026-08-12-early-repair-search-early-main-search-starvation.md): the repair probe and the
 *  "early" (pre-late-reserve) main-search configs draw from the SAME unprotected shared pool,
 *  `mainSearchEarlyNodeBudget`, with the probe going first and taking whatever it needs (up to its
 *  own fixed worst case, ~10,000,000 with one biased tier) before the early main-search configs ever
 *  get a turn. On 7 of 12 sample levels the probe alone consumed the entire pool
 *  (mainSearchEarlyNodeBudget itself, ~9,562,500 at this budget), leaving the early main-search
 *  configs exactly zero nodes. A blanket, level-blind STATIC shrink of the probe's own budget
 *  (tested locally via a scale factor matching the measured pre-fix contended-throughput ratio,
 *  ~0.55) is a real but ZERO-SUM lever on this sample: it recovered one level (R00602: probe
 *  freed ~4.06M nodes, an early main-search config then solved it in 520,775) but broke another
 *  (R02823: its own solution lay inside the biased repair tier's search at 9,308,917 nodes — a
 *  static 0.55 cap truncated it at 5,500,015, well short). This is exactly the failure mode CLAUDE.md
 *  warns a static reallocation risks, and it directly motivates conditioning the shrink on live
 *  evidence instead of applying it unconditionally.
 *
 *  THE SIGNAL: `repairSearchFromGate` already reports `bestBadness` on every failed attempt (the
 *  lowest near-miss score any restart reached — repair-search.ts) — current-invocation evidence,
 *  no exact-level history, satisfies docs/solver-level-blindness.md. On the same 12-level sample,
 *  the one level that genuinely needed the biased tier's full budget (R02823) had already shown
 *  a LOW ordinary-tier bestBadness (min 4 across its two ordinary rounds) before the biased tier
 *  ran — i.e. the ordinary tier's own live evidence already signaled "repair is close." Every
 *  other sampled level's ordinary-tier minimum badness was >= 6, mostly >= 15.
 *
 *  THE MECHANISM: after the ordinary-tier rounds fail, if a biased repair config is about to run,
 *  scale its node budget by `min(1, max(MIN_SCALE, BADNESS_GATE / ordinaryBestBadness))` — a
 *  strict no-op (scale 1) whenever the live evidence already looks promising (badness <=
 *  BADNESS_GATE, as R02823's did), and a bounded shrink (never below MIN_SCALE — a participation
 *  floor, never zero, per solver-interoperability-and-cooperation-plan.md §17.3) when it doesn't.
 *  Freeing nodes this way benefits whichever tier runs next against the same shared ceiling
 *  (mainSearchEarlyNodeBudget) — normally the early main-search configs — without touching either
 *  protected reserve or requiring a new recipient-side change.
 *
 *  CALIBRATION CAVEAT: MIN_SCALE=0.35 is still picked from the original n=12 local sample (n=1 for
 *  the "needs full budget" case) — a starting point, not a re-derived constant. Re-measure before
 *  changing it, per this file's own established discipline for tuned constants (see e.g.
 *  EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS's calibration history above). BADNESS_GATE has since been
 *  re-derived once — see GATE RECALIBRATION below.
 *
 *  PROMOTION (2026-08-13): a 300-level stratified level-blind GHA A/B (250 of the 512-level
 *  eligible population + 50 control, real 50,000,000-node production budget, matching
 *  solver-stress-refresh.yml's own default — .github/workflows/solver-early-repair-search-adaptive-
 *  sample-ab.yml) reproduced the local pilot's zero-loss shape at 25x the sample size: control
 *  108/300, treatment 109/300, net +1 (1 gained: R02719, mustCross=8/mustTurn=5/requiredIntersections=9 —
 *  squarely inside the eligible population, not a control-bucket artifact; 0 lost), nodes -1.5%,
 *  work -9.0%. Promoted to production default-ON on this evidence at the project owner's explicit
 *  direction. This is a REAL DEVIATION from this ledger's own stated bar (a dedicated
 *  full-population Corpus-2 A/B) — 300/1700 (250/512 eligible) is strong stratified supporting
 *  evidence, not the full-population result the bar calls for. Recorded here rather than glossed
 *  over: if a future full-corpus run surfaces a loss this sample didn't catch, that is the
 *  expected shape of the risk being accepted, not a surprise. See
 *  reports/2026-08-12-early-repair-search-early-main-search-starvation.md and
 *  docs/solver-opt-in-experiment-ledger.md for the full record.
 *
 *  GATE RECALIBRATION (2026-08-13): a saved-artifact audit of the promotion A/B above
 *  (reports/2026-08-13-existing-solve-data-tuning-opportunities.md) found a sharp yield gradient —
 *  ordinary-tier badness <=5 correlated with an 18.4% direct-repair win rate, falling to 0% above
 *  20 — and nominated a matched BADNESS_GATE=10/8/6 sweep (MIN_SCALE held fixed) as a follow-up.
 *  Re-running the SAME 300-level stratified sample/seed/budget as the promotion A/B, three times
 *  (blank/gate=10 baseline, gate=8, gate=6, via the same workflow's new repair_probe_adaptive_
 *  badness_gate dispatch input): baseline 88/300; gate=8 and gate=6 both 89/300, the identical gain
 *  (R02663) over baseline with zero losses at either gate. Gate=6 strictly dominated gate=8 on cost
 *  (nodes -0.7%/work -4.1% vs. baseline, vs. gate=8's -0.5%/-2.1%), so 6 was chosen over 8. Applied
 *  to production at the project owner's explicit direction, at the same evidentiary bar (sample
 *  size, real production node budget) the on/off promotion above used. See
 *  reports/2026-08-12-early-repair-search-early-main-search-starvation.md's "Gate/min-scale recalibration:
 *  GHA A/B" section for the full per-arm breakdown and run ids. */
export const EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE = 6;
export const EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE = 0.35;

/** Additional seeds (see runAttempt's seedSalt param) to retry an already-failed ORDINARY probe
 *  round with, before falling through to the full (much more expensive) ladder.
 *  repairSearchFromGate's randomized local search is seeded from the gate's own coordinates
 *  (repair-search.ts's `rand`), so its outcome on a given (level, gate) is one sample from a
 *  genuinely high-variance distribution, not a deterministic verdict on that level's real
 *  difficulty — confirmed directly with scripts/run-repair-search.mjs's --races flag and by
 *  calling repairSearchFromGate directly per seed (see
 *  reports/families/2026-07-15-{symmetry-orientation-bias,re-embedded-cousin-grid-growth}.md for
 *  the investigation this grew out of). A whole-level rotation or a grid re-embedding incidentally
 *  changes this seed by changing the gate's coordinates — which is the leading explanation for why
 *  those two sibling/cousin generation modes showed the strongest early-repair-search sensitivity in that
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
 *  siblings — needed salts 1, 2, 2, 4 respectively). That width passed `solver:regression --check`
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
 *  Deliberately scoped to the ORDINARY tier only (EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET), not the
 *  must-turn-biased one: no rescue evidence was gathered for the biased tier, and its own history
 *  (see repair-search.ts's EXIT_GUIDANCE_EPSILON_BOOST comment — S030 regressed at every nonzero
 *  nudge tried, even on an independent RNG stream) shows it's unusually sensitive to any change, so
 *  widening it without specific evidence is a needless risk. Each retry salt gets the SAME node
 *  budget as the first round — strictly additive: only reached when every active gate has already
 *  failed at every earlier salt, so a level whose probe already succeeds on the first (default)
 *  seed is completely unaffected. Ablation: STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED (default enabled).
 *  Re-verify with a full-corpus before/after speed sweep (not just solver:regression --check — see
 *  CLAUDE.md's gotcha on this and docs/testing.md's "Speed, separately from solvability") before
 *  changing this list again. */
const EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS = [0, 1];

/** Tries each repairConfig (ordinary, then must-turn-biased if present) at a per-config node
 *  budget (EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET / _BIASED_NODE_BUDGET — see their comment) split
 *  across activeGates by nodes consumed so far (mirrors the per-gate ms-budget split the
 *  full-budget repair loop in solveLevel uses, just node-counted and at much smaller totals).
 *  The outer per-gate/per-attempt ms budget (attBudget, below) stays a generous, effectively
 *  non-binding safety net — the node budget is what actually decides the probe's outcome. The
 *  ORDINARY config is additionally retried across EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS (see its own
 *  comment) before moving on to the next config or giving up — every salt after the first only
 *  runs if every active gate already failed at every earlier salt; the must-turn-biased config
 *  always runs at a single seed (salt 0), unchanged from before this retry existed.
 *
 *  BUG FIXED 2026-07-17: `nodeBudget` (the caller's EXTERNAL SolveOpts.nodeBudget, offline-tooling
 *  only — see that field's own comment) was never threaded into this function at all, so the probe
 *  always ran its full internal worst case (ordinary tier up to EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS.
 *  length × EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET, plus EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET on must-turn
 *  levels — up to ~10,000,000 nodes combined) regardless of how small an external budget the caller
 *  asked for. solveLevel()'s own re-check *after* the probe returns (`if
 *  (prep._metrics.nodesExpanded >= nodeBudget) ...`) only ever reports the overshoot, it can't
 *  prevent it. Confirmed at scale on the real corpus-2 batch workflow (`.github/workflows/solver-
 *  corpus2-batch-*.yml`'s `--node-budget=8000000` default): 621/621 repair-gated levels that hit
 *  `status: 'node-budget-reached'` had burned the probe's ~10,000,000-node worst case (exceeding
 *  the 8,000,000 external budget by ~25% every time) with EVERY attempt tagged `repair` — meaning
 *  the main DFS/beam loop, the full-budget repair fallback, and the goal-attraction-disabled-retry pass never
 *  ran AT ALL on any of them. This is the entire `repair-close`+`repair-far` unsolved-cluster
 *  population (`reports/stress/unsolved-failure-clusters.json`: 114 + 507 = 621, an exact match) —
 *  their "badness" telemetry and cluster classification reflect only how close the PROBE got, not
 *  the full pipeline. See reports/2026-07-17-early-repair-search-node-budget-starvation.md for the full
 *  investigation. Fixed by checking the external nodeBudget before each seed-salt round (the
 *  smallest independently-costed probe unit) and bailing out early if it's already exhausted —
 *  same granularity/precision caveat as every other nodeBudget check in this file (can still
 *  overshoot by up to one seed-salt round's own cost, never by the full combined worst case). */
export async function runEarlyRepairSearch(
    repairConfigs: AttemptConfig[], activeGates: number[], level: NormalizedLevel,
    prep: PrepLevel, yieldFn: YieldFn, cfg: AblationConfig | null, nodeBudget = Infinity,
    badnessGate = EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, minScale = EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const shrunkBiased: ShrunkBiasedTier[] = [];
    // EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET was calibrated (see its own comment) against exactly one
    // biased tier's worst case (repairMustTurnBiased, the only one that existed at the time). When a
    // second biased tier is also present (repairTurnBiased, under STRATEGY_REPAIR_TURN_BIAS, in
    // attempts.ts's non-exclusive predicted-then-fallback order), weight the fixed budget between
    // them by EARLY_REPAIR_SEARCH_PREDICTED_TIER_SHARE (see its own comment for why a plain 50/50 split and
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
        if (biasedConfigCount <= 1) return EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET;
        const share = indexAmongBiased === 0 ? EARLY_REPAIR_SEARCH_PREDICTED_TIER_SHARE : 1 - EARLY_REPAIR_SEARCH_PREDICTED_TIER_SHARE;
        return Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * share);
    };
    let biasedSeen = 0;
    for (const repairConfig of repairConfigs) {
        // The turn-biased attempt, like the must-turn-biased one, is a heavier single-seed search
        // (see repair-search.ts) — give it the biased probe budget and a single seed salt.
        const isBiased = repairConfig.repairMustTurnBiased || repairConfig.repairTurnBiased;
        let fixedProbeNodeBudget = isBiased ? biasedNodeBudgetForTier(biasedSeen++) : EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET;
        // STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET (production default-ON as of 2026-08-13 —
        // see EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE's own comment for the full derivation):
        // scale the biased tier's node budget down when the ordinary tier's own live bestBadness
        // evidence (already reported by repairSearchFromGate on every failed attempt,
        // current-invocation only) shows no sign repair is close. Strict no-op whenever the
        // ordinary tier hasn't run, reported no finite badness, or already looks promising
        // (badness <= the gate). Standard (!cfg || cfg.FLAG) convention, NOT opt-in (cfg &&
        // cfg.FLAG === true) — matching PRUNE_MC_NEIGHBOR_BUDGET's and
        // STRATEGY_MAIN_SEARCH_LATE_RESERVE's own promotions and the wiring-gap lesson both shipped
        // with (docs/solver-opt-in-experiment-ledger.md): the opt-in convention stays inert
        // whenever cfg is null, which is every production interactive solve and any CLI run
        // without --enable-flags.
        if (isBiased && (!cfg || cfg.STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET)) {
            const ordinaryBestBadness = attempts.reduce((min, a) => (
                a.repair && !a.repairMustTurnBiased && !a.repairTurnBiased && Number.isFinite(a.bestBadness)
                    ? Math.min(min, a.bestBadness as number) : min
            ), Infinity);
            if (Number.isFinite(ordinaryBestBadness)) {
                const scale = Math.min(1, Math.max(
                    minScale,
                    badnessGate / ordinaryBestBadness,
                ));
                const fullNodeBudget = fixedProbeNodeBudget;
                fixedProbeNodeBudget = Math.floor(fixedProbeNodeBudget * scale);
                // Record what was withheld so STRATEGY_REPAIR_SHRINK_RECOVERY can restore it
                // if every other tier later fails. Recorded even when the flag is off — this is
                // pure bookkeeping on an already-computed value, it changes no search behavior, and
                // making it conditional would mean the recovery tier's eligibility depended on two
                // flags instead of one.
                if (fixedProbeNodeBudget < fullNodeBudget) {
                    shrunkBiased.push({ config: repairConfig, fullNodeBudget, grantedNodeBudget: fixedProbeNodeBudget });
                }
            }
        }
        const seedSalts = (!isBiased && (!cfg || cfg.STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED))
            ? EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS : [0];
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
            if (probeNodeBudget < 50) return { solution: null, attempts, shrunkBiased };
            let nodesUsed = 0;
            for (let gi = 0; gi < activeGates.length; gi++) {
                const gateKey = activeGates[gi];
                const gatesLeft = activeGates.length - gi;
                const gateNodeBudget = Math.floor((probeNodeBudget - nodesUsed) / gatesLeft);
                if (gateNodeBudget < 50) break;
                // attBudget (ms) is a generous safety-net trip-wire only, well above any observed
                // real-world cost for a probe-worthy (node-budget-bounded) win — the node budget
                // above is the actual decision; this only guards against a pathological
                // per-node-cost level or a bug in the node-count mechanism itself. See
                // EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP's own comment: it must be generous enough to survive
                // real CPU contention too, not just a fast/idle host.
                const nodesOut: { nodesExpanded?: number } = {};
                const r = await runAttempt(gateKey, level, prep, repairConfig, EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP, Date.now(), yieldFn, gateNodeBudget, nodesOut, seedSalt);
                // stageId is the canonical persisted identity; historical readers may still accept
                // earlyRepairSearch, but current writers do not emit that legacy boolean.
                attempts.push(withSolverStage(r.attempt, 'early-repair-search'));
                nodesUsed += nodesOut.nodesExpanded ?? gateNodeBudget;
                if (r.path) return { solution: r.path, attempts, shrunkBiased };
            }
        }
    }
    return { solution: null, attempts, shrunkBiased };
}
