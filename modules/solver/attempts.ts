import { classifyRoutingRegime, getRequiredPathCoverageRatio } from './routing regime.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER, TEMPLATE_CONFIG_KEYS, TEMPLATES } from './policy.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, AttemptConfig, StructuralTemplate } from './types.js';
import { defaultConfig } from './ablation-config.js';

/**
 * Attempt-policy selection is a **pure function of level features** — never of level identity.
 * The thresholds below name which search strategy suits which feature regime; each carries its
 * rationale. (`check:no-solver-level-numbers` forbids reintroducing level-number-keyed logic or
 * motivation, in code or comments.)
 */
const POLICY = {
    /** reqInt ≥ this needs a wide beam first — DFS can't harvest enough crossings greedily. */
    VERY_HIGH_REQINT: 7,
    /** portal pairs ≥ this → objectiveFirst guides the beam through portal transitions better than pure harvest. */
    PORTAL_DENSE_PAIRS: 2,
    /** navDensity ≥ this is near-Hamiltonian: beams collapse over the long dense walk, so DFS-perimeter leads. */
    NEAR_HAMILTONIAN_COVERAGE_THRESHOLD: 0.82,
    /** reqLen ≥ this is a "long" path (a perimeter beam needs seconds to walk it). */
    LONG_PATH_REQLEN: 90,
    /** gate count ≥ this can starve a long-path beam via per-gate budget division (→ give it a floor). */
    MULTI_GATE: 2,
    /** budget floor for the two perimeter beams on long multi-gate levels so the proven winner completes. */
    LONG_MULTIGATE_BEAM_FLOOR: 0.45,
    /** must-pass count ≥ this: objective-directed profiles must lead (scattered objectives perimeter sweeps miss). */
    OBJECTIVE_HEAVY_MUSTPASS: 3,
    /** reqInt ≤ this (with no must-pass): try a CCW sweep before CW. */
    LOW_REQINT: 4,
    /** must-cross count ≥ this (paired with COMBO_MUSTPASS): beam leads over DFS-perimeter templates. */
    COMBO_MUSTCROSS: 3,
    /** must-pass count paired with COMBO_MUSTCROSS. */
    COMBO_MUSTPASS: 2,
    /** flipping-filter count ≥ this: a progressive diverse-beam ladder is the sole strategy. */
    FLIPPER_HEAVY: 2,
    /** must-cross count ≥ this on a medium-high-int level: plain narrow beams collapse to one
     *  structural mode (all survivors share the same crossing pattern) and the DFS fallbacks
     *  can't thread the weave either — a diverse WIDE beam, bucketed by flipper/must-cross
     *  state and budget-floored against ladder fragmentation, finds the threaded solution
     *  (stress-corpus finding on mechanic-interaction levels). */
    HIGHINT_MC_DIVERSE: 2,
    /** must-cross count ≥ this AND must-pass count ≥ REPAIR_MP_MIN: append the iterated-
     *  local-search repair fallback (repair-search.ts) as a final-resort attempt. Stress-corpus
     *  finding: on this feature regime, DFS/beam's deterministic best-first ordering accumulates
     *  a cumulative discrepancy (witness-trace measured 22–59) far past what any of three
     *  independent admissible-bound tightenings could close — see data/stress/README.md. Purely
     *  additive: it only ever runs after every earlier attempt in the bundle has already failed,
     *  so it cannot turn a currently-solving level into a failure. */
    REPAIR_MC_MIN: 2,
    /** must-pass count paired with REPAIR_MC_MIN. */
    REPAIR_MP_MIN: 3,
} as const;

/**
 * Beam widths, narrowest→widest. A narrow beam converges fast when the level allows it; WIDE is
 * the fallback that trades time for breadth. The must-cross+flipper-heavy rule below used to walk
 * WIDE→WIDER(15000)→WIDEST(50000, full-budget floor), but a dedicated isolated run proved
 * width-50000 *naturally exhausts* (not budget-cut) with zero solves on the exact routing regime it
 * was built for (see data/stress/README.md's "beam search cannot solve the S031/S043 routing regime at any
 * width" finding) — beam breadth was never the bottleneck for this cluster, and the iterated-
 * local-search repair fallback has since superseded it entirely (now catching every level that
 * currently matches this rule via its own early probe, before the main loop even runs). WIDER/
 * WIDEST were removed: zero attempts across the full stress+published corpora confirmed they
 * never even get reached anymore, and WIDEST's minBudgetFraction:1.0 was starving the two DFS
 * fallbacks that follow it of all their budget on the rare occasion it did run.
 */
const BEAM = { STANDARD: 2000, WIDE: 5000 } as const;

/** The level features the attempt policy branches on (extracted once; the policy reads nothing else). */
interface LevelFeatures {
    routingRegime: string;
    requiredPathCoverageRatio: number;
    reqInt: number;
    reqLen: number;
    gates: number;
    mustPass: number;
    mustCross: number;
    portals: number;
    flippers: number;
    mustTurn: number;
}

export function extractFeatures(level: NormalizedLevel): LevelFeatures {
    return {
        routingRegime: classifyRoutingRegime(level),
        // Required path coverage uses the historical non-gate path-cell denominator.
        requiredPathCoverageRatio: getRequiredPathCoverageRatio(level),
        reqInt: level.reqInt,
        reqLen: level.reqLen,
        gates: level.gateKeys?.length ?? 0,
        mustPass: level.mustPassKeys.length,
        mustCross: level.mustCrossKeys.length,
        portals: level.portalMap?.size ?? 0,
        flippers: level.flippingFilterMap?.size ?? 0,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
    };
}

// ─── Config vocabulary ──────────────────────────────────────────────────────
// dfs(): a DFS attempt (no beamWidth). beam(): a beam attempt of the given width. Both take an
// optional template and extra fields (minBudgetFraction / diverseBeam). These replace the repeated
// inline object literals so each policy bundle reads as intent, not boilerplate.
const dfs = (profileName: string, template: StructuralTemplate | null = null): AttemptConfig => ({ profileName, template });
const beam = (
    profileName: string, beamWidth: number, template: StructuralTemplate | null = null,
    extra: { minBudgetFraction?: number; diverseBeam?: boolean } = {},
): AttemptConfig => ({ profileName, template, beamWidth, ...extra });

const { perimeterCW, perimeterCCW, cornerHarvest, sideCommitment } = TEMPLATES;

/** Lead profiles first, then the rest of PROFILE_ORDER, then the non-null template configs. */
function profilesFirst(lead: string[]): AttemptConfig[] {
    const order = [...lead, ...PROFILE_ORDER.filter(p => !lead.includes(p))];
    return [
        ...order.map(p => dfs(p)),
        ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
    ];
}

/** High-intersection medium-reqInt DFS ordering: objective-directed vs perimeter-first, by feature. */
function mediumHighIntDfsOrder(f: LevelFeatures): AttemptConfig[] {
    if (f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS)
        // Scattered objectives perimeter sweeps can't find → objective-directed DFS before perimeter timeouts.
        return [dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW), dfs('knotBuilder')];
    if (f.reqInt <= POLICY.LOW_REQINT && f.mustPass === 0)
        // Low reqInt, no must-pass: CCW sweep first (wins on layouts where CW times out).
        return [dfs('perimeterSweep', perimeterCCW), dfs('perimeterSweep', perimeterCW), dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder')];
    return [dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW), dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder')];
}

const isHighInt = (f: LevelFeatures) => f.routingRegime === 'intersection-heavy';
const isMustCross = (f: LevelFeatures) => f.routingRegime === 'must-cross-heavy';
/** Shared with getAttemptConfigs's STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE application below,
 *  so the ablation-gated addition can never drift from the rule it extends — see that flag's own
 *  comment for why this rule specifically (not its must-cross-heavy siblings) was chosen. */
export const isMustCrossFlipperHeavy = (f: LevelFeatures) =>
    isMustCross(f) && f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS && f.flippers >= POLICY.FLIPPER_HEAVY;

/** Diverse WIDE beams for must-cross-threaded high-int levels — see POLICY.HIGHINT_MC_DIVERSE.
 *  Budget floors keep them viable against per-gate/per-config ladder fragmentation. */
const mcDiverseThread = (f: LevelFeatures): AttemptConfig[] => f.mustCross >= POLICY.HIGHINT_MC_DIVERSE ? [
    beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true, minBudgetFraction: 0.35 }),
    beam('objectiveFirst', BEAM.WIDE, null, { diverseBeam: true, minBudgetFraction: 0.25 }),
] : [];

/** See POLICY.REPAIR_MC_MIN/REPAIR_MP_MIN. Orchestration (solveLevel) gives this attempt its
 *  own reserved slice of the level's total time budget rather than the normal per-config even
 *  split, so it isn't diluted to near-nothing by however many attempts precede it.
 *
 *  Second clause (isHighInt + VERY_HIGH_REQINT, no must-pass/must-cross requirement): stress-
 *  corpus finding on mechanism-free high-intersection levels — DFS/beam's deterministic
 *  best-first ordering was the same blocker here as on the must-cross/must-pass cluster (beam
 *  self-terminates at any width without finding the structure; unbounded DFS needs roughly 2x
 *  the available budget to converge), confirmed by repairSearchFromGate solving two previously
 *  ~2x-budget-short mechanism-free levels in under a second each, dramatically faster than DFS's
 *  own ~28-40s. Reuses the same named VERY_HIGH_REQINT threshold the "wide beam first" rule
 *  above already uses for this routing/difficulty regime — not a threshold invented for these
 *  two levels specifically. Purely additive and risk-free for every other level exactly as the
 *  must-cross/must-pass clause is: repair only ever runs after the entire existing bundle has
 *  already failed, so a level that solves via any earlier attempt is completely unaffected.
 *
 *  This gate is NOT purely additive, though: `orchestration.ts`'s `runRepairProbe` runs
 *  unconditionally, win-or-lose, on every solve of any level this predicate matches, BEFORE the
 *  main loop (`repairConfigs.length > 0` is its own eligibility check, driven directly by this
 *  function). A level that never solves via repair still pays the probe's full bounded node cost
 *  every time — `REPAIR_PROBE_ORDINARY_NODE_BUDGET`'s own comment documents ~10.7s of measured
 *  dead-search overhead on one such level. `docs/solver-optimization-workstreams.md` Priority 7's
 *  2026-08-22 follow-up mining pass found the CURRENT (narrow) gate already taxes more levels than
 *  it helps (48 fast-solving vs 13 repair-needing, full-corpus scan) and left widening this gate to
 *  cover `portal-heavy` and the rest of `high-intersection-burden` (55 more genuinely-gapped rows)
 *  explicitly unlanded pending a population-scale/stratified-sample wall-time check — see
 *  `solver-future-work.md`'s "repair-fallback gate widening" entry. `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN`
 *  (default OFF, ablation-config.ts) below is that experiment's gate: OFF reproduces this function's
 *  pre-2026-08-23 behavior byte-for-byte; ON adds unconditional `isHighInt(f)` (dropping the
 *  VERY_HIGH_REQINT floor) and `f.routingRegime === 'multi-portal'`. **CLOSED NEGATIVE 2026-08-23:**
 *  population-scale GHA A/B (562-level sample, `solver-routing-regime-sample-ab.yml`) found 0 gains, 2
 *  losses (`R01944`, `R02474`) — see `docs/solver-opt-in-experiment-ledger.md`. Keep default OFF;
 *  do not repeat this unchanged broad form. */
const needsRepairFallback = (f: LevelFeatures, cfg: AblationConfig | null = null): boolean =>
    (f.mustCross >= POLICY.REPAIR_MC_MIN && f.mustPass >= POLICY.REPAIR_MP_MIN)
    || (isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT)
    || (!!(cfg && cfg.STRATEGY_REPAIR_FALLBACK_GATE_WIDEN === true) && (isHighInt(f) || f.routingRegime === 'multi-portal'));
// Exported for orchestration.ts's STRATEGY_REPAIR_LATE_PROBE tier, which needs to build a plain
// repair AttemptConfig itself when repairConfigs is empty (needsRepairFallback was false) — see
// that tier's own comment.
export const repairAttempt = (): AttemptConfig => ({ profileName: 'repair', template: null, repair: true });
/** A second repair attempt, appended only when the level has must-turn cells (so a level with
 *  none can never reach it) and only ever run after the ordinary repairAttempt above has already
 *  failed — see AttemptConfig.repairMustTurnBiased and data/stress/README.md's S043 writeup. */
const repairMustTurnBiasedAttempt = (): AttemptConfig => ({ profileName: 'repair', template: null, repair: true, repairMustTurnBiased: true });
/** A third repair attempt (turn-aware selective bias, see AttemptConfig.repairTurnBiased). Added ONLY
 *  under an explicit STRATEGY_REPAIR_TURN_BIAS flag (default-off in production) and only on must-turn
 *  levels, placed FIRST among the repair configs (see the append site below) so it solves fast rather
 *  than being buried; pending corpus-2 validation. */
const repairTurnBiasedAttempt = (): AttemptConfig => ({ profileName: 'repair', template: null, repair: true, repairTurnBiased: true });

/** admissible-order-search.ts winners as a last-resort tier — orchestration.ts's solveLevel pulls
 *  these out of the returned config list (same pattern as repairConfigs) and runs each ENTRY as its
 *  own sequential sub-pass with its own full, unshared budget slice (divided across gates only,
 *  never diluted by sibling entries — see that call site's own comment), ONLY after the main
 *  ladder, repair fallback, and attraction-diversity pass have all already failed. `profileName`
 *  selects the TIE-BREAK profile (admissible slack is always the primary ordering — see that file's
 *  own doc), not a DFS/beam scoring profile in the usual sense; 'none' is a sentinel meaning "no
 *  tie-break at all" (admissibleOrderAttempt below sets admissibleOrderNoTieBreak for it instead of
 *  doing a real POLICY_PROFILES lookup).
 *
 *  Order matters: the call site stops at the first entry that solves, so this list is ordered by
 *  validated yield, most first (reports/2026-07-24-admissible-order-search-corpus2-validation.md):
 *  'default' (103 of the first 115 corpus-2 solves), 'none' (all 52 of a DISJOINT population —
 *  levels the tie-break-enabled code, including 'default', could no longer reproduce at all once
 *  the tie-break became unconditional; 'none' reproduces the technique's original ordering from
 *  before that same-day change), then the 3 lower-yield tie-break profiles ('mustCrossFirst',
 *  'intersectionHarvest', 'nearClosureRescue', a handful each from a full-corpus GitHub Actions
 *  sweep). A first version of this list gave every entry ONE combined budget total (the
 *  attraction-diversity pass's shared-rerun shape), which starved 'default' below the full,
 *  unshared per-entry budget every validated solve actually used (method-probe.mjs's standalone
 *  `--only=ida:<key>` runs, never multiple entries sharing one call) — fixed by giving each entry
 *  its own sequential sub-pass instead (see orchestration.ts's call site).
 *
 *  The remaining 8 PROFILE_ORDER entries scored 0 hits on local sampling and were never validated at
 *  full-corpus scale — left out until that validation exists. Unconditional (not feature-gated): the
 *  validated wins span multiple routing regimes with no single predictive feature found yet, mirroring
 *  ATTRACTION_DIVERSITY_CANDIDATE_FLAGS's own "no shared structural predictor found" reasoning above.
 *  Gated only by ablation flag STRATEGY_ADMISSIBLE_ORDER (default-on — absent/null cfg enables it,
 *  matching every other stable strategy flag's polarity). */
export const ADMISSIBLE_ORDER_PROFILES = ['default', 'none', 'mustCrossFirst', 'intersectionHarvest', 'nearClosureRescue'] as const;
const admissibleOrderAttempt = (profileName: string): AttemptConfig => profileName === 'none'
    ? { profileName: 'none', template: null, admissibleOrder: true, admissibleOrderNoTieBreak: true }
    : { profileName, template: null, admissibleOrder: true };

/** Which of the two biased repair techniques is more LIKELY to be the level's real winner, when
 *  STRATEGY_REPAIR_TURN_BIAS is on — used only to decide ORDER (which runs first) and probe-budget
 *  WEIGHT (see REPAIR_PROBE_PREDICTED_TIER_SHARE in orchestration.ts), never to exclude the other
 *  technique outright.
 *
 *  History of this decision (see reports/2026-07-23-turnbias-corpus2-ab-validation.md's "Update"
 *  sections for the full data): an earlier *exclusive* version of this function picked exactly ONE
 *  technique and never tried the other at all — measured on a full corpus-2 refresh to be WORSE than
 *  the split-budget approach it replaced (8 genuine gains vs. 10 genuine losses, net -2), because the
 *  underlying classifier's real-world accuracy (~74% on the 31-level training sample below) means a
 *  meaningful fraction of levels get the WRONG technique picked, and exclusive selection gives a
 *  misclassified level zero chance via the technique it actually needed — confirmed directly: 5 of
 *  the measured losses were levels with reqInt 7-12 that needed mustTurnBiased despite the heuristic
 *  (correctly, by the numbers) predicting turnBiased for high-reqInt levels. This priority-ordered,
 *  non-exclusive version keeps the same feature signal but always tries BOTH: the predicted one first
 *  (larger budget share, and its own documented latency benefit if it's turnBiased), the other one
 *  still gets a real, smaller fallback shot rather than none.
 *
 *  Threshold derived from a 31-level sample of historical mustTurnBiased/turnBiased winners across
 *  all 3 corpora (script not committed — one-off analysis, see the report above): of every single
 *  LevelFeatures field checked, `reqInt <= 3` was the best single-feature predictor of a
 *  mustTurnBiased win (74% accuracy vs. a 58% majority-class baseline). This is a small-sample
 *  heuristic, not a proven causal mechanism — mechanistically plausible (mustTurnBiased's narrower
 *  exit-guidance nudge suffices on simpler, low-crossing-count levels; turnBiased's more aggressive
 *  single-move bias earns its keep on more tangled, higher-reqInt ones) but NOT independently
 *  verified beyond the threshold search itself. Needs its own corpus-2 A/B before promotion — see
 *  the report's standing verification bar for this class of change. */
const REQINT_MUSTTURNBIASED_THRESHOLD = 3;
function predictLikelyBiasedRepairTechnique(f: LevelFeatures): 'mustTurnBiased' | 'turnBiased' {
    return f.reqInt <= REQINT_MUSTTURNBIASED_THRESHOLD ? 'mustTurnBiased' : 'turnBiased';
}

/** The small family of position/attraction-dependent scoring terms found (2026-07-16, reports/
 *  2026-07-16-phase-d-fragile-group-ablation-diagnosis.md) to each, on their own level-specific
 *  orientations, occasionally combine with an early greedy trajectory into a self-defeating
 *  structural commitment on an otherwise-solvable level. Which term is responsible varies per
 *  level (5 levels, 4 distinct culprits found so far) — SCORE_GOAL_ATTRACTION is the one used
 *  below because it showed the best within-level generalization in that diagnosis (2/2 for
 *  R02795, 2/3 for R00156), not because it's known to be the most broadly useful; the others are
 *  listed here for whoever widens this later, not currently used. Consumed by orchestration.ts's
 *  solveLevel — see ATTRACTION_DIVERSITY_BUDGET_FRACTION there for how it's scoped (a whole extra
 *  rerun of the main-loop ladder with these flags off, own separate small budget, only ever run
 *  after the entire normal ladder AND repair fallback have already failed, so it costs nothing on
 *  any level that solves earlier). Not gated by level features (unlike needsRepairFallback) — the
 *  5 known fragile cases span 4 different routing regimes with no shared structural predictor found yet
 *  (same report), so an unconditional last-resort tier is the defensible starting point; narrow it
 *  to a feature gate once/if a real one is found. */
export const ATTRACTION_DIVERSITY_CANDIDATE_FLAGS = ['SCORE_GOAL_ATTRACTION'] as const;
// ['SCORE_OBJECTIVE_ATTRACTION', 'SCORE_INTERSECTION_SETUP', 'SCORE_SURROUND_URGENCY', 'SCORE_PERIMETER_BIAS']

/** One attempt-policy rule: a feature predicate + the config bundle it selects. First match wins. */
interface PolicyRule {
    when: (f: LevelFeatures) => boolean;
    /** cfg is only read by the two must-cross-heavy sibling rules gated by
     *  STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE (see their own comments); every other rule
     *  ignores the second parameter, which TypeScript allows for a narrower callback signature. */
    build: (f: LevelFeatures, cfg?: AblationConfig | null) => AttemptConfig[];
    why: string;
}

/**
 * The attempt policy as ordered, feature-guarded rules — evaluated top-to-bottom, first match wins.
 * Each rule's predicate references only {@link LevelFeatures}; later rules assume earlier ones did
 * not match (e.g. the must-cross rules all sit behind `isMustCross`, ending in a catch-all).
 */
const ATTEMPT_POLICY: PolicyRule[] = [
    {
        why: 'near-closure: near-loop, goal attraction dominates — closure/harvest profiles first',
        when: f => f.routingRegime === 'sparse-low-intersection',
        build: () => profilesFirst(['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep']),
    },
    {
        // Must-cross-threaded levels: the diverse beams are the ones that actually solve this
        // routing regime (the plain WIDE beams never do — stress-corpus finding, same reasoning as
        // the non-portal sibling rule below) — put them first so the 0.35/0.25 minBudgetFraction
        // floors are computed against the full remaining budget instead of being squeezed by two
        // non-diverse beams that each burn a full even share first. Mirrors the shipped
        // diverse-beam-first reorder for the non-portal rule (see data/stress/README.md's S017
        // writeup); this rule had the same plain-beams-first ordering bug, just undiscovered
        // until a portal-dense + must-cross-threaded stress level (S049) surfaced it. No-op on
        // levels below POLICY.HIGHINT_MC_DIVERSE (mcDiverseThread returns [] there), so their
        // config list — and therefore their timing — is unchanged.
        why: 'very-high reqInt + portal-dense: objectiveFirst beam guides through portal transitions',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT && f.portals >= POLICY.PORTAL_DENSE_PAIRS,
        build: (f, cfg) => [
            ...mcDiverseThread(f),
            // Reserve-preserving descendant: insert the experimental STANDARD-IH beam before
            // this rule's pre-existing protected five-config suffix. The append-last parent
            // changed suffix membership and starved a formerly protected winner under fixed work.
            ...(cfg && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE === true
                ? [beam('intersectionHarvest', BEAM.STANDARD)] : []),
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
            // Cross-referencing the 2026-08-20 technique census (run 32240161854) against the
            // 2026-08-21 capability run (32526927206) surfaced a residual beam-routing gap on this
            // routing regime (docs/solver-optimization-workstreams.md): this rule offered no
            // perimeter beam at all, and `beam:perimeterSweep/perimeterCCW@beam2000` was the cheap
            // (sub-200K-node) isolated-technique winner on several still-unsolved levels here. Trailing
            // placement (not leading) for the same protected-late-reserve reason documented on the
            // sibling rules below — this is a genuinely different technique family from the two beams
            // already above, not a width variant of them, so it costs nothing on levels those beams
            // already solve.
            beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
            // Current-residual missing-exposure pilot (2026-08-28): the frozen T1 census still
            // contains cheap STANDARD intersectionHarvest wins in this very-high-reqInt regime,
            // while production offers only the WIDE form. Keep it trailing and opt-in so the
            // strict-total-work development pilot charges any displacement it causes.
            ...(cfg && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE === true
                && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE !== true
                ? [beam('intersectionHarvest', BEAM.STANDARD)] : []),
        ],
    },
    {
        // Must-cross-threaded levels: the diverse beams are the ones that actually solve this
        // routing regime (the plain WIDE beams never do — stress-corpus finding) — put them first so
        // the 0.35/0.25 minBudgetFraction floors are computed against the full remaining budget
        // instead of being squeezed by two non-diverse beams that each burn a full even share first.
        why: 'very-high reqInt, non-portal: intersectionHarvest beam wins directly, DFS fallbacks follow',
        when: f => isHighInt(f) && f.reqInt >= POLICY.VERY_HIGH_REQINT,
        build: (f, cfg) => [
            ...mcDiverseThread(f),
            beam('intersectionHarvest', BEAM.WIDE),
            // The pre-treatment protected suffix begins at objectiveFirst WIDE in this rule.
            // Put the descendant immediately before it so all five old protected configs retain
            // their suffix membership; the new action competes only in the earlier prefix.
            ...(cfg && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE === true
                ? [beam('intersectionHarvest', BEAM.STANDARD)] : []),
            beam('objectiveFirst', BEAM.WIDE),
            dfs('intersectionHarvest'), dfs('objectiveFirst'),
            // Same residual beam-routing gap as this rule's portal-dense sibling above (see its
            // comment) — cross-referencing the 2026-08-20 census against the 2026-08-21 capability
            // run found perimeterSweep@beam2000 (both directions) as the cheap isolated winner on
            // several still-unsolved levels this rule never offered any perimeter beam for. Trailing,
            // protected-reserve placement; a different technique family from the two beams above.
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
            ...(cfg && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE === true
                && cfg.STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE !== true
                ? [beam('intersectionHarvest', BEAM.STANDARD)] : []),
        ],
    },
    {
        why: 'near-Hamiltonian: beams collapse over the long dense walk — DFS perimeter (both directions) leads',
        when: f => isHighInt(f) && f.requiredPathCoverageRatio >= POLICY.NEAR_HAMILTONIAN_COVERAGE_THRESHOLD,
        build: () => [
            dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW),
            dfs('objectiveFirst'), dfs('intersectionHarvest'), dfs('knotBuilder'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
            // Cross-referencing the 2026-08-20 census against the 2026-08-21 capability run
            // (docs/solver-optimization-workstreams.md) found this rule offers only
            // perimeter beams — objectiveFirst/intersectionHarvest appear only in DFS form here, and
            // their WIDE beam counterparts were the cheap isolated-technique winner on several
            // still-unsolved levels of this routing regime. Trailing, protected-reserve placement — same
            // reasoning as every other beam-added-here fix in this file: costs nothing where the DFS/
            // perimeter-beam attempts above already win, only reached where they exhaust first.
            beam('intersectionHarvest', BEAM.WIDE), beam('objectiveFirst', BEAM.WIDE),
            // Follow-up (2026-08-22 mining pass, docs/solver-optimization-workstreams.md
            // Priority 7): this rule offers `sideCommitment` nowhere — neither as DFS nor beam —
            // unlike the default routing regime rules, which both include it. `dfs:perimeterSweep/
            // sideCommitment` was independently the cheap-to-moderate isolated winner on multiple
            // still-unsolved levels of this routing regime (R02858, R03226, R02903), the single best-
            // coverage candidate technique found for this rule. Trailing, protected-reserve
            // placement — lands in the 5th slot the MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT 4->5
            // increase opened up, so it adds coverage without evicting anything protected before
            // this session's changes (see stage-budget.ts's own comment on that increase).
            dfs('perimeterSweep', sideCommitment),
        ],
    },
    {
        why: 'medium-high reqInt: perimeter/objective beams first (budget-floored on long multi-gate levels), then feature-ordered DFS',
        when: isHighInt,
        build: f => {
            // Long multi-gate levels starve the leading perimeter beam (gate budget ÷ gates ÷ configs);
            // floor the two perimeter beams so the proven winner completes without squeezing DFS fallbacks.
            const beamFloor = (f.reqLen >= POLICY.LONG_PATH_REQLEN && f.gates >= POLICY.MULTI_GATE) ? POLICY.LONG_MULTIGATE_BEAM_FLOOR : 0;
            return [
                beam('perimeterSweep', BEAM.STANDARD, perimeterCW, { minBudgetFraction: beamFloor }),
                beam('perimeterSweep', BEAM.STANDARD, perimeterCCW, { minBudgetFraction: beamFloor }),
                // Must-cross-threaded: diverse WIDE beams right after the proven perimeter winners.
                ...mcDiverseThread(f),
                beam('intersectionHarvest', BEAM.STANDARD),
                beam('objectiveFirst', BEAM.STANDARD),
                ...mediumHighIntDfsOrder(f),
                // Cross-referencing the 2026-08-20 census against the 2026-08-21 capability run
                // (docs/solver-optimization-workstreams.md): this catch-all only offered
                // STANDARD-width intersectionHarvest/objectiveFirst beams, but their WIDE counterparts
                // were independently the cheap isolated-technique winner (well under 1M nodes) on
                // several still-unsolved levels of this routing regime — a genuinely different technique
                // from the STANDARD beams above, not a retry of them. Trailing, protected-reserve
                // placement (same reasoning as every other beam-added-here fix in this file): reached
                // only after the STANDARD beams and DFS fallbacks above have already exhausted.
                beam('intersectionHarvest', BEAM.WIDE), beam('objectiveFirst', BEAM.WIDE),
            ];
        },
    },
    {
        // Beam added here too (technique census, run 32240161854 — docs/solver-optimization-current-
        // queue.md Priority 7): this turned out to be the DOMINANT contributor to the beam-routing
        // gap (43 of 69 zero-beam oracle-union levels, vs. 26 across the two sibling default rules
        // fixed above) — profilesFirst() built this routing regime's list purely from DFS profiles and
        // templates too, with no beam offered at all. Placed as the LAST two configs deliberately
        // (not first): mainConfigs' last MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT (stage-budget.ts, 5)
        // entries get a protected node-budget reserve regardless of what earlier configs consume, so
        // this placement recovers previously-unsolved levels (where earlier DFS attempts can burn
        // their full allocated time without concluding) while costing nothing on already-solving
        // levels — the main loop exits on first success, so an already-fast template/profile win
        // never even reaches these trailing beam configs. A first attempt at leading with beam
        // instead recovered the same levels but cost every already-solving level in this routing regime
        // 1-6+ seconds of needless beam search first (measured on the published corpus: +94% total
        // wall time, 66/160 levels meaningfully slower) — reverted in favor of this placement.
        // Follow-up (technique census, run 32240161854 — docs/solver-optimization-workstreams.md
        // Priority 7): objectiveFirst/intersectionHarvest WIDE alone left a further gap on THIS
        // routing regime specifically — `beam:perimeterSweep/perimeterCW@beam2000` and its CCW sibling are
        // each independently the cheap census winner on more of this routing regime's oracle-union
        // population than either WIDE config. Added at the same trailing position for the same
        // late-reserve-protection reason.
        why: 'portal-heavy: portal-transfer profiles, remaining profiles/templates, beams last (protected reserve slice)',
        when: f => f.routingRegime === 'multi-portal',
        build: () => [
            dfs('portalFirstTransfer'), dfs('portalCommitted'),
            ...PROFILE_ORDER.filter(p => p !== 'portalFirstTransfer' && p !== 'portalCommitted').map(p => dfs(p)),
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
        ],
    },
    {
        why: 'must-cross + flipper-heavy with many objectives: diverse beam, then DFS fallbacks (see BEAM comment above — wider tiers removed, proven not to help this routing regime)',
        when: isMustCrossFlipperHeavy,
        build: () => [
            // Diverse beam buckets candidates by (flipperUsedMask, mustCrossMask) so all valid flipper
            // orderings stay alive. The repair fallback (attempts.ts's needsRepairFallback, always
            // present here — this rule's predicate implies it) now solves nearly everything in this
            // routing regime via its own early probe before this main loop even runs.
            beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true }),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
            // Cross-referencing the 2026-08-20 technique census against the 2026-08-21 capability
            // run (docs/solver-optimization-workstreams.md) found this rule offers no
            // perimeter beam at all, unlike every sibling must-cross rule — R02515's cheap
            // (120,635-node) isolated win here was perimeterSweep/perimeterCW@beam2000. Trailing,
            // protected-reserve placement, same reasoning as the other beam-added-here fixes in this
            // file.
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW),
        ],
    },
    {
        why: 'must-cross, must-pass-heavy: objective/must-cross beams lead, DFS fallbacks follow',
        when: f => isMustCross(f) && f.mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS,
        build: (f, cfg) => [
            beam('objectiveFirst', BEAM.STANDARD), beam('mustCrossFirst', BEAM.STANDARD),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCCW), beam('intersectionHarvest', BEAM.STANDARD),
            beam('harvestThenFinish', BEAM.STANDARD), beam('knotBuilder', BEAM.STANDARD),
            dfs('objectiveFirst'), dfs('intersectionHarvest'),
            // Same census cross-reference as this rule's flipper-heavy sibling above: this rule has
            // a perimeter BEAM (CCW) but no perimeter DFS at all in either direction, unlike the
            // default/combo must-cross rules below — R02788's cheap (1,483,636-node) isolated win
            // here was plain dfs:perimeterSweep/perimeterCW. Trailing, protected-reserve placement.
            dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', perimeterCCW),
            // Follow-up (docs/solver-optimization-workstreams.md / solver-future-work.md
            // "must-cross-heavy diverse-beam gaps"): this rule never offers a diverse WIDE beam at all
            // (mcDiverseThread isn't used here) — R02299's cheap (281,990-node) isolated win was
            // beam:objectiveFirst@beam5000(diverse). Previously left open because this rule's
            // MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT-4 reserve window was already fully spent on the
            // perimeter-DFS fix directly above; landed together with the reserve count's validated
            // 4->5 increase (stage-budget.ts) so this 5th trailing config gets the same protection
            // without displacing dfs:perimeterSweep/perimeterCW out of the window.
            beam('objectiveFirst', BEAM.WIDE, null, { diverseBeam: true }),
            // Ablation: STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE (default-OFF, NEW unvalidated
            // pilot, 2026-08-26 — see that flag's own comment in ablation-config.ts). This rule's
            // window is once again fully spent (the 8th config above already fills the 5-slot
            // protected reserve), so this 9th trailing config only gets protection when
            // stage-budget.ts's paired reserve-count widen is also active — same flag, same reasoning
            // as the historical 4->5 increase this mirrors. The plain WIDE intersectionHarvest beam
            // is the missing exposure gap this rule shares with its flipper-heavy sibling (post-976
            // rejoin, reports/2026-08-25-post-976-portfolio-exposure-rejoin.md): 28 of the 62 not-
            // offered levels route here.
            ...(cfg && cfg.STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE === true ? [beam('intersectionHarvest', BEAM.WIDE)] : []),
        ],
    },
    {
        why: 'heavy combined must-cross + must-pass: beam leads so the threaded path is found without two DFS timeouts',
        when: f => isMustCross(f) && f.mustCross >= POLICY.COMBO_MUSTCROSS && f.mustPass >= POLICY.COMBO_MUSTPASS,
        build: () => [
            beam('mustCrossFirst', BEAM.STANDARD), beam('objectiveFirst', BEAM.STANDARD),
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCW),
            dfs('mustCrossFirst'), dfs('objectiveFirst'), dfs('harvestThenFinish'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW),
        ],
    },
    {
        why: 'must-cross default: template DFS solves simple MC levels fast, then beams, then DFS profiles',
        when: isMustCross,
        build: (f, cfg) => [
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCW),
            beam('mustCrossFirst', BEAM.STANDARD), beam('objectiveFirst', BEAM.STANDARD),
            dfs('mustCrossFirst'), dfs('objectiveFirst'), dfs('harvestThenFinish'),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW),
            // Same census cross-reference as the flipper-heavy/must-pass-heavy must-cross rules
            // above (docs/solver-optimization-workstreams.md): this catch-all offers
            // perimeterCW but never perimeterCCW, unlike most other routing regime rules that offer both
            // directions — R02131's cheap (106,547-node) isolated win here was
            // perimeterSweep/perimeterCCW@beam2000. Trailing, protected-reserve placement.
            beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
            // Follow-up (docs/solver-optimization-workstreams.md / solver-future-work.md
            // "must-cross-heavy diverse-beam gaps"): this catch-all never offers a diverse WIDE beam
            // either (mcDiverseThread isn't used here) — R02159's cheap (578,428-node) isolated win
            // was beam:intersectionHarvest@beam5000(diverse). Previously left open for the same
            // full-reserve-window reason as this rule's must-pass-heavy sibling above; landed together
            // with the validated MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT 4->5 increase.
            beam('intersectionHarvest', BEAM.WIDE, null, { diverseBeam: true }),
            // Ablation: STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE (default-OFF, NEW unvalidated
            // pilot, 2026-08-26 — see that flag's own comment in ablation-config.ts and this rule's
            // must-pass-heavy sibling above, which shares the identical reasoning). Window full again
            // at 8 configs; this 9th trailing config only gets reserve protection when stage-budget.ts's
            // paired reserve-count widen is also active. The plain WIDE objectiveFirst beam is the
            // missing exposure gap this catch-all shares with its two must-cross-heavy siblings
            // (post-976 rejoin, reports/2026-08-25-post-976-portfolio-exposure-rejoin.md): 4 of the 62
            // not-offered levels route here.
            ...(cfg && cfg.STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE === true ? [beam('objectiveFirst', BEAM.WIDE)] : []),
        ],
    },
    {
        // Beam added here (technique census, run 32240161854 — docs/solver-optimization-current-
        // queue.md Priority 7): this rule previously built its list purely from DFS templates and
        // profiles, so it never offered beam search at all — a real capability gap on exactly the
        // open, low-constraint levels this rule matches, where beam disproportionately wins cheaply.
        // Placed as the LAST two configs deliberately (not first, not right after the templates):
        // mainConfigs' last MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT (stage-budget.ts, 5) entries get a
        // protected node-budget reserve regardless of what earlier configs consume, so this placement
        // recovers previously-unsolved levels (where the 4 template DFS attempts can each burn their
        // full ~20-30s allocated slice without concluding, otherwise starving anything placed right
        // after them) while costing nothing on already-solving levels — the main loop exits on first
        // success, so an already-fast template/profile win never even reaches these trailing beam
        // configs. Two earlier placements were tried and reverted: right after the 4 templates (beam
        // never got a real node share, 0/25 sampled recoveries) and leading the whole list (recovered
        // levels, but cost every already-solving level in this routing regime 1-6+ seconds of needless
        // beam search first — measured on the published corpus: +94% total wall time, 66/160 levels
        // meaningfully slower).
        // Follow-up (technique census, run 32240161854 — docs/solver-optimization-workstreams.md
        // Priority 7): same additional gap as the portal-heavy rule's own follow-up comment —
        // beam:perimeterSweep/perimeterCW(CCW)@beam2000 is independently the cheap census winner on
        // more of this routing regime's oracle-union population than the WIDE configs alone reach.
        why: 'default, no must-pass: CCW template before CW (open grids where CW times out), then profiles, beams last (protected reserve slice)',
        when: f => f.mustPass === 0,
        build: () => [
            dfs('perimeterSweep', cornerHarvest), dfs('perimeterSweep', perimeterCCW),
            dfs('perimeterSweep', perimeterCW), dfs('perimeterSweep', sideCommitment),
            ...PROFILE_ORDER.map(p => dfs(p)),
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
        ],
    },
    {
        // Same beam-routing-gap fix and same late-placement reasoning as the sibling rule above (see
        // its comment) — this catch-all previously never offered beam search either.
        why: 'default: standard template sweep, then all profiles, beams last (protected reserve slice)',
        when: () => true,
        build: () => [
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
            ...PROFILE_ORDER.map(p => dfs(p)),
            beam('objectiveFirst', BEAM.WIDE), beam('intersectionHarvest', BEAM.WIDE),
            beam('perimeterSweep', BEAM.STANDARD, perimeterCW), beam('perimeterSweep', BEAM.STANDARD, perimeterCCW),
        ],
    },
];

/**
 * Build ordered attempt configs for this level, selected purely from level *features*
 * (see {@link ATTEMPT_POLICY}). First matching rule wins.
 */
export function getAttemptConfigs(level: NormalizedLevel, cfg: AblationConfig | null = null): AttemptConfig[] {
    const f = extractFeatures(level);
    let configs: AttemptConfig[] | null = null;
    // Ablation: STRATEGY_ROUTING_REGIME_SELECTION — disabling forces every level through the catch-all
    // rule below regardless of classified routing regime/features, isolating how much the feature-based
    // routing itself contributes (vs. the config bundles it selects among).
    if (!cfg || cfg.STRATEGY_ROUTING_REGIME_SELECTION) {
        for (const rule of ATTEMPT_POLICY) {
            if (rule.when(f)) { configs = rule.build(f, cfg); break; }
        }
    }
    // Unreachable under normal routing (the last rule matches everything); reached directly when
    // STRATEGY_ROUTING_REGIME_SELECTION is disabled above. Also kept for total-function safety.
    if (!configs) configs = ATTEMPT_POLICY[ATTEMPT_POLICY.length - 1].build(f, cfg);
    // Ablation: STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE (default-ON, promoted 2026-08-27).
    // Applied centrally rather than inline in the rule's build() so the addition is a single
    // reviewable diff, matching needsRepairFallback's pattern below.
    //
    // Promotion evidence: development A/B +3/-0 (486-level must-cross-heavy sample), same-generator
    // confirmation +3/-0 on an untouched control-failure residual (confirm-residual-003), and a
    // cross-generator topology-composition transfer attempt (confirm-transfer-topology-001) that
    // came back a clean null with zero losses (ceiling-limited by that sample's own 99.7% control
    // solve rate, not evidence against the mechanism). See
    // reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md for the full record.
    //
    // docs/solver-optimization-workstreams.md Priority 1's post-976 portfolio rejoin
    // (reports/2026-08-25-post-976-portfolio-exposure-rejoin.md) found `beam:intersectionHarvest@
    // beam5000` and `beam:objectiveFirst@beam5000` (the PLAIN WIDE beams, not their `(diverse)`
    // siblings already used elsewhere in this file) each absent from production on exactly the same
    // 62 current Corpus-2 misses, with isolated census wins at the cheapest observed nodes/solve of
    // any beam identity in that report's exposure-economics table. A follow-up classification
    // (2026-08-26) found all 62 are `must-cross-heavy`, split across three ATTEMPT_POLICY rules —
    // this one (isMustCrossFlipperHeavy, 30/62), "must-cross, must-pass-heavy" (28/62), and
    // "must-cross default" (4/62). Only THIS rule's build() has fewer than
    // MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT (stage-budget.ts, 5) existing entries (4): appending both
    // plain WIDE beams here still fits entirely inside the protected trailing-reserve window at no
    // cost to (no eviction of) any existing protected config, unlike its two sibling rules whose
    // windows are already full — see stage-budget.ts's own 4->5 reserve-count-increase comment for
    // why displacing an already-validated protected config is not a free change. The two fuller
    // sibling rules are deliberately NOT touched by this flag: promoting them would need either
    // accepting that displacement or a further reserve-count increase, a second dimension this pilot
    // did not test. See docs/solver-opt-in-experiment-ledger.md for current disposition.
    if ((!cfg || cfg.STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE) && isMustCrossFlipperHeavy(f)) {
        configs = [...configs, beam('intersectionHarvest', BEAM.WIDE), beam('objectiveFirst', BEAM.WIDE)];
    }
    // Applied centrally (not per-rule) since the feature gate cuts across several routing regimes
    // (must-cross-heavy and high-intersection-burden rules both match batch-B cluster levels —
    // see POLICY.REPAIR_MC_MIN/REPAIR_MP_MIN).
    if (needsRepairFallback(f, cfg)) {
        // Experimental turn-aware bias attempt: default-OFF (production passes null cfg → not added),
        // so this is byte-identical to before unless a caller explicitly enables
        // STRATEGY_REPAIR_TURN_BIAS. The shared opt-in registry keeps it off in both production and
        // ordinary ablation configs; an A/B arm must explicitly set it true.
        if (f.mustTurn > 0 && cfg && cfg.STRATEGY_REPAIR_TURN_BIAS === true) {
            // Both techniques are added (never excluded — see predictLikelyBiasedRepairTechnique's own
            // comment for why exclusive selection was tried and reverted), ordered by which one the
            // heuristic predicts is more likely correct: the predicted one goes FIRST (before ordinary
            // repair, for the early-probe latency win — the same reasoning turnBiased's original,
            // flag-independent placement used, now applied to whichever technique is actually
            // predicted); the other becomes a genuine fallback AFTER ordinary repair (a real, if
            // smaller, shot — see REPAIR_PROBE_PREDICTED_TIER_SHARE in orchestration.ts for how the
            // probe budget is weighted between the two).
            const predicted = predictLikelyBiasedRepairTechnique(f);
            const predictedAttempt = predicted === 'turnBiased' ? repairTurnBiasedAttempt() : repairMustTurnBiasedAttempt();
            const fallbackAttempt = predicted === 'turnBiased' ? repairMustTurnBiasedAttempt() : repairTurnBiasedAttempt();
            configs = [...configs, predictedAttempt, repairAttempt(), fallbackAttempt];
        } else {
            configs = [...configs, repairAttempt()];
            // The biased second attempt only ever runs after the ordinary repair attempt above has
            // already failed, and only exists in the list at all for must-turn levels — see
            // repairMustTurnBiasedAttempt. Production's unconditional, single-technique behavior,
            // unchanged from before turn-bias existed.
            if (f.mustTurn > 0) configs = [...configs, repairMustTurnBiasedAttempt()];
        }
    }
    // admissible-order-search last-resort tier — see ADMISSIBLE_ORDER_PROFILES's own comment for why
    // this is unconditional (not feature-gated) and appended regardless of whether repair fallback
    // applies above. Ablation: STRATEGY_ADMISSIBLE_ORDER (default-on).
    if (!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER) {
        configs = [...configs, ...ADMISSIBLE_ORDER_PROFILES.map(admissibleOrderAttempt)];
    }
    return configs;
}


function shuffleAttemptConfigs(configs: AttemptConfig[], seed = 42): AttemptConfig[] {
    // Zero is a valid uint32 seed. Do not use `|| 42` here: that silently made an explicit
    // `_randomSeed: 0` run the seed-42 ordering, corrupting experiment reproducibility metadata.
    const numericSeed = Number(seed);
    let state = Number.isFinite(numericSeed) ? numericSeed >>> 0 : 42;
    const out = [...configs];
    for (let i = out.length - 1; i > 0; i--) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const j = state % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function applyAttemptConfigOptions(baseConfigs: AttemptConfig[], cfg: AblationConfig | null = null): AttemptConfig[] {
    if (!cfg) return baseConfigs;
    const filtered = baseConfigs.filter(c => {
        // Repair machinery flags: STRATEGY_REPAIR_FALLBACK drops both repair attempts (and with
        // them the early probe, which iterates the same configs); STRATEGY_REPAIR_MUSTTURN_BIAS
        // drops only the biased second attempt. Checked before the profile filter because the
        // repair profile is deliberately outside PROFILE_ORDER/PROFILE_CONFIG_KEY.
        if (c.repair && 'STRATEGY_REPAIR_FALLBACK' in cfg && !cfg.STRATEGY_REPAIR_FALLBACK) return false;
        if (c.repairMustTurnBiased && 'STRATEGY_REPAIR_MUSTTURN_BIAS' in cfg && !cfg.STRATEGY_REPAIR_MUSTTURN_BIAS) return false;
        if (c.template && c.template.id) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && tKey in cfg && !cfg[tKey]) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (pKey in cfg && !cfg[pKey]) return false;
        return true;
    });
    // An empty result is meaningful: callers may deliberately disable every eligible profile.
    // Falling back to baseConfigs here silently undid the ablation exactly when its filtering was
    // comprehensive, making an "all profiles off" run execute the unmodified attempt ladder.
    let configs = filtered;
    if (cfg.ATTEMPT_ORDER === 'reverse') {
        configs = [...configs].reverse();
    } else if (cfg.ATTEMPT_ORDER === 'random') {
        configs = shuffleAttemptConfigs(configs, cfg._randomSeed ?? 42);
    } else if (cfg.ATTEMPT_ORDER === 'profile-grouped') {
        configs = [
            ...configs.filter(c => !c.template && !c.beamWidth),
            ...configs.filter(c => !!c.template),
            ...configs.filter(c => c.beamWidth && !c.template),
        ];
    }
    return configs;
}

export function getConfiguredAttemptConfigs(level: NormalizedLevel, cfg: AblationConfig | null = null): AttemptConfig[] {
    // This helper is also a public testing/tooling boundary, so it cannot assume callers already
    // passed through orchestration.ts's Proxy normalizer. Materialize production defaults here;
    // otherwise a sparse or explicit-undefined config silently disables unrelated routing tiers.
    const normalizedCfg = cfg == null
        ? null
        : {
            ...defaultConfig(),
            ...Object.fromEntries(Object.entries(cfg).filter(([, value]) => value !== undefined)),
        };
    return applyAttemptConfigOptions(getAttemptConfigs(level, normalizedCfg), normalizedCfg);
}
