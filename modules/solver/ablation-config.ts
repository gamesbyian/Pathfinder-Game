/**
 * ablation-config.ts
 *
 * Central schema for Solver ablation experiments. Every major solver capability
 * has a corresponding boolean flag. Most features default on, while experimental
 * opt-in features default off. Changing one flag preserves every other production
 * default so experiments do not accidentally activate unrelated experiments.
 *
 * IMPORTANT: OPT_IN_FEATURES records production DEFAULT POLARITY, not whether a
 * feature still has an open promotion decision. Some retained opt-ins are closed
 * negative/negligible experiments. Current dispositions and remaining gates live in
 * docs/solver-opt-in-experiment-ledger.md; do not infer a queue from this set.
 *
 * Usage:
 *   import { defaultConfig, withFeatureDisabled, FEATURES } from './ablation-config.js';
 *   const cfg = withFeatureDisabled('SCORE_GOAL_ATTRACTION');
 *   await Solver.solve(level, { timeBudgetMs, ablation: cfg });
 */


// ─── Feature registry ─────────────────────────────────────────────────────────
// Map from flag name → human-readable description.

export const FEATURES: Record<string, string> = {
    // ── Scoring terms (scoreMove) ───────────────────────────────────────────
    SCORE_GOAL_ATTRACTION:      'Goal distance reduction reward — primary navigation signal',
    SCORE_FINISH_COMMITMENT:    'End-phase bonus when remaining steps ≤ 4',
    SCORE_OBJECTIVE_ATTRACTION: 'Pull toward the nearest unsatisfied MP/MC objective',
    SCORE_MUST_PASS_URGENCY:    'Per-must-pass distance-to-go reward',
    SCORE_MUST_CROSS_URGENCY:   'Per-must-cross distance-to-go reward (1st and 2nd visit)',
    SCORE_MC_APPROACH_GUIDANCE: '2nd-visit MC guidance via perpendicular approach maps',
    SCORE_FLIPPER_URGENCY:      'Harvest-phase flipper approach-zone guidance (global-flip rule)',
    SCORE_INTERSECTION_SETUP:   'Second-visit intersection bonus + high-branching cell bonus',
    SCORE_PERIMETER_BIAS:       'Grid-edge cell preference',
    SCORE_PHASE_SCALING:        'Phase-based goal/perimeter weight scaling (harvest → finish)',
    SCORE_ANTI_DITHER:          'U-turn penalty (immediate backtrack)',
    SCORE_REVISIT_PENALTY:      'Already-visited cell penalty',
    SCORE_TEMPLATE_BONUS:       'Structural template geometric bonus (perimeter / corner / side)',
    SCORE_SURROUND_URGENCY:     'Urgency reward toward unvisited surround-landmark neighbors',
    SCORE_ADJ_TURN_URGENCY:     'Urgency reward toward unsatisfied adjacent-turn landmark objects',
    SCORE_MUST_TURN_URGENCY:    'Distance-to-cell reward toward unsatisfied must-turn landmark cells',
    SCORE_MUST_TURN_EXIT_GUIDANCE: 'Reward for choosing the specific exit that satisfies a pending must-turn direction (independent of distance urgency toward the cell itself)',
    SCORE_PORTAL_PARITY_GUIDANCE: 'Guidance toward a mismatched-parity portal when reqLen parity requires one',
    SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE: 'Production default-OFF; NEW unvalidated experiment (2026-08-23): makes SCORE_GOAL_ATTRACTION read prep.guidanceGoalDistArr (pre-6f00baf routing: geese/gates/false-goals treated as ordinary passable cells) instead of the corrected prep.goalDistArr, for move-ordering guidance only — pruning/admissible bounds are unaffected. See distance.ts\'s DistMapOpts.legacyGuidanceRouting and docs/solver-optimization-current-queue.md\'s "Distance-guidance/pruning split" entry. Do not promote without matched-work evidence that it recovers solves without new losses.',

    // ── Pruning rules (dfsFromGate + beamSearchFromGate) ─────────────────────
    PRUNE_MC_CEILING:           'Intersection ceiling: ints + pending-MC-crossings > reqInt',
    PRUNE_MC_RESERVED_WALL:     'Reserved-intersection wall: once every remaining intersection is committed to a pending must-cross crossing, visited cells are walls in the connectivity fill (portal-free levels only)',
    PRUNE_DISTANCE_BOUND:       'Goal BFS distance exceeds remaining steps',
    PRUNE_PARITY:               'Manhattan parity mismatch (portal-free levels only)',
    PRUNE_PORTAL_PARITY_ENVELOPE: 'Production default-OFF; closed retained opt-in: Manhattan parity mismatch on portal levels with at least one twist portal pair. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    PRUNE_MUST_PASS_LB:         'MST lower bound on remaining must-pass visit distance',
    PRUNE_MUST_CROSS_LB:        'MST lower bound on remaining must-cross distance (with approach maps)',
    PRUNE_INTERSECTION_DEFICIT: 'Remaining steps < intersections still needed',
    PRUNE_CONNECTIVITY:         'Flood-fill connectivity + volume check',
    PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: 'Treat both-axes-spent cells as walls in the connectivity flood fill',
    PRUNE_SURROUND_LB:          'Lower bound on steps needed to visit all surround-landmark neighbors',
    PRUNE_ADJ_TURN_LB:          'Lower bound on steps needed to satisfy all adjacent-turn landmark objects',
    PRUNE_MUST_TURN_DEADLOCK:   'Prune once a pending must-turn cell has both axis bits used (provably unsatisfiable)',
    PRUNE_MC_FORCED_NEIGHBOR:   'Prune once a pending must-cross cell\'s still-needed straight pass has a neighbor that is now a hard wall (both axis bits used, or an already-used flipper)',
    PRUNE_MC_FORCED_FIRST_MOVE: 'Force the first move out of a gate that is orthogonally adjacent to exactly one must-cross cell onto that cell (the gate can never be re-entered, so this is its only chance to serve that cell\'s pass)',
    PRUNE_MC_NEIGHBOR_BUDGET:   'Production default-ON: dynamic must-cross/intersection propagation. Excluded from repair randomized survivor selection; retained for DFS/beam and deterministic repair sub-searches. Disposition: docs/solver-opt-in-experiment-ledger.md.',

    // ── Search strategy ───────────────────────────────────────────────────────
    STRATEGY_LDS:               'Limited Discrepancy Search probe waves before full DFS',
    STRATEGY_DIVERSE_BEAM:      'Diverse beam selection bucketed by (flipperUsedMask, mustCrossMask)',
    STRATEGY_STATE_DEDUP:       'Beam state deduplication: merge same (position + constraint-state)',
    STRATEGY_DEDUP_NEAR_TIE_RETENTION: 'Production default-ON: beam dedup retains a near-tied runner-up as well as the collision winner (DEDUP_NEAR_TIE_MARGIN in search.ts). Its paired last-resort recovery is STRATEGY_DEDUP_NEAR_TIE_RETRY.',
    STRATEGY_REPAIR_ELITE_PREFIX_DFS: 'Production default-OFF; closed retained opt-in: bounded deterministic completion DFS from repair elite prefixes. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_BEAM_SEED: "Production default-OFF; closed retained opt-in: seed repair's initial elite pool from a bounded beam frontier. Current disposition: docs/solver-opt-in-experiment-ledger.md.",
    STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY: 'Production default-OFF; retained opt-in: rerun a repair-probe config at its full budget after adaptive biased-budget shrink withheld nodes. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_DEDUP_NEAR_TIE_RETRY: 'Production default-ON: dead-last, additive-budget whole-ladder retry with near-tie retention disabled. Runs only after earlier tiers fail; see orchestration.ts and the opt-in ledger for current policy/evidence.',
    STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: 'Production default-ON: dead-last additive retry of non-default admissible-order profiles, without shrinking the normal default-profile pass. See orchestration.ts and the opt-in ledger.',
    STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: 'Production default-ON: dead-last additive whole-ladder retry with PRUNE_CONNECTIVITY_AXIS_EXHAUSTED disabled. Runs only after the ordinary flag-on ladder fails.',
    STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: 'Production default-OFF; closed retained opt-in: dead-last additive repair retry with elite-prefix DFS enabled. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY: 'Production default-ON: dead-last additive whole-ladder retry forcing SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE on, after every earlier tier (including repair-late-probe) has failed. The plain global form of that flag measured net -5 across three test populations because it also breaks levels the corrected distance map already solves early; this retry-tier placement can never touch those, since a level solving earlier never reaches it. Promoted 2026-08-23 after a population-scale A/B (solver-level-blind-targeted-sweep.yml): 73-level loss population +3/-0, 90-level gain population 0/-0, published corpus unchanged. See docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_RETRY_TIER_NODE_STAIRCASE: "Production default-OFF; retained experiment: divide a ladder-rerun tier's node reserve into cumulative per-config steps so its first non-terminating config cannot starve later configs. Current disposition: docs/solver-opt-in-experiment-ledger.md.",
    STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY: 'Production default-ON: dead-last additive extension of STRATEGY_REPAIR_LATE_PROBE that retries the SAME repairConfigsCount===0 population across several more PRNG seeds (repair-late-probe itself always uses seed salt 0), each seed getting its own full REPAIR_LATE_PROBE_NODE_BUDGET reserve, positioned after goal-attraction-legacy-distance-retry. Motivated by the early ordinary repair probe\'s own calibrated seed diversity (real if modest rescues) and the 2026-08-12 CP-SAT repair-retreat finding that repair elites have zero rollback slack once diverged, so the fix has to change the commitment itself, which a different seed does. Promoted 2026-08-23 after a population-scale A/B (solver-level-blind-targeted-sweep.yml): 73-level loss population 18→23 (+5/-0, control solved set a strict subset of treatment\'s), 90-level gain population 90/90 unaffected, published corpus 160/160 unaffected. See docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_MC_NEIGHBOR_BUDGET_RETRY: 'Production default-ON: dead-last additive whole-ladder retry with PRUNE_MC_NEIGHBOR_BUDGET disabled, eligible only for levels with must-cross mechanics. Runs after the ordinary flag-on ladder fails.',
    STRATEGY_REPAIR_LATE_PROBE: 'Production default-ON: one tightly node-capped plain repair attempt, dead last, for levels whose earlier routing did not populate repair fallback configs. Promoted 2026-08-21 after a same-commit deterministic A/B (GHA 32453248184 vs 32459711208, main@e5034e8c): Corpus-1 95→96, Corpus-2 863→881, +19 net with zero regressions. Disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_NOGOOD_CACHE: 'Repair: per-call cache of exact dead-end states, short-circuiting a restart the moment it re-enters a state already proven fruitless earlier in the same call (see modules/solver/nogood-cache.ts)',
    STRATEGY_GATE_INTERLEAVING: 'Config-outer gate-inner scheduling for multi-gate levels',
    STRATEGY_PARITY_GATE_FILTER:'Pre-filter infeasible gates by parity (portal-free levels)',
    STRATEGY_REPAIR_FALLBACK:   'Iterated-local-search repair fallback attempts (extra budget, after the main loop)',
    STRATEGY_ATTRACTION_DIVERSITY: 'Last-resort attempt with one attraction/position-scoring term disabled, after the main loop and repair fallback have both failed',
    STRATEGY_ADMISSIBLE_ORDER:  'Last-resort single-path DFS ordered by admissible slack across several tie-break profiles, after the main loop, repair fallback, and attraction-diversity pass fail',
    STRATEGY_REPAIR_PROBE:      'Early small-budget repair probe before the main DFS/beam loop',
    STRATEGY_REPAIR_PROBE_MULTI_SEED: 'Retry the ordinary-tier repair probe across a few extra gate-derived PRNG seeds before falling through to the main loop',
    STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET: "Production default-ON: scale biased repair-probe node budgets from the ordinary probe's live bestBadness, bounded by the configured gate and minimum scale. Shrink recovery is separately gated.",
    STRATEGY_REPAIR_MUSTTURN_BIAS: 'Second, exit-guidance-biased repair attempt on must-turn levels',
    STRATEGY_ADAPTIVE_GATE_BUDGET: 'nodesExpanded-weighted per-gate budget skew on ≥4-gate levels',
    STRATEGY_LOWER_BOUND_MEMO:  'Exact memoization of must-pass/must-cross lower bounds (pure speed)',
    STRATEGY_ROUTING_REGIME_SELECTION: 'Feature/routing-regime ATTEMPT_POLICY rule selection — disabling forces every level through the catch-all general rule',
    STRATEGY_MIN_BUDGET_FLOOR:  'Per-attempt-config minimum budget-share floor (long-multigate perimeter beams, must-cross diverse-beam threads)',
    STRATEGY_REPAIR_ELITE_SPLICE:      'Repair-search: splice restarts from the near-miss elite pool instead of always restarting fresh from the gate',
    STRATEGY_REPAIR_STAGNATION_BURST:  'Repair-search: force a burst of fresh-from-gate restarts after a long stretch with no badness improvement',
    STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST: "Repair-search: bias the must-turn-biased attempt's exploratory branch toward the correct-direction turn exit",
    STRATEGY_REPAIR_LENGTH_GAP_CLOSE: 'Repair-search: on a dead end where every non-length/intersection objective is already satisfied, try a small bounded backtracking search to close the exact length/intersection gap instead of discarding the restart',
    STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS: 'Repair-search: additionally trigger closeLengthGap when at most LENGTH_GAP_CLOSE_STRUCTURAL_SLACK non-length objectives are still pending (not just exactly zero) — targets near-miss dead ends like "length off by 1, one pending mustTurn cell" that the strict base trigger never attempts',
    STRATEGY_REPAIR_TURN_BIAS: 'Production default-OFF; closed retained opt-in: repair attempt with turn-aware selective bias. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_FALLBACK_GATE_WIDEN: 'Production default-OFF; CLOSED NEGATIVE 2026-08-23: widens attempts.ts\'s needsRepairFallback gate to unconditionally cover isHighInt(f) (dropping the VERY_HIGH_REQINT floor) and multi-portal (545 newly-gated levels). Population-scale GHA A/B (solver-routing-regime-sample-ab.yml, 562-level sample): control 417/562, treatment 415/562 — 0 gains, 2 losses (R01944, R02474). Confirms the unconditional early repair PROBE this gate also drives (see needsRepairFallback\'s own comment) taxes more than it helps in this broad form. Current disposition: docs/solver-opt-in-experiment-ledger.md. Do not repeat this unchanged form; a descendant needs a materially different (narrower) selection mechanism.',
    STRATEGY_MAIN_LOOP_LATE_RESERVE: 'Production default-ON: reserve a fixed main-loop node slice for a late config suffix without reordering attempts (MAIN_LOOP_LATE_RESERVE_FRACTION in orchestration.ts).',
    STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: 'Production default-OFF; closed retained opt-in: reserve part of the main-loop late slice for repair fallback. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE: 'Production default-OFF; closed retained opt-in: reserve part of the main-loop late slice for attraction-diversity retry. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: 'Production default-OFF; closed retained opt-in: reserve part of the admissible-order tier for non-default profiles. Current disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: 'Production default-ON: appends plain (non-diverse) beam:intersectionHarvest@beam5000 and beam:objectiveFirst@beam5000 as trailing protected-reserve configs to attempts.ts\'s must-cross+flipper-heavy rule only (isMustCrossFlipperHeavy — the one of three must-cross-heavy rules sharing this exposure gap whose trailing-reserve window has room without displacing an existing protected config). Promoted 2026-08-27 after development A/B +3/-0, same-generator confirmation +3/-0 (confirm-residual-003), and a cross-generator topology-composition transfer attempt (confirm-transfer-topology-001) that came back a clean null with zero losses. See attempts.ts\'s STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE comment. Disposition: docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: 'Production default-OFF; CLOSED NEGATIVE 2026-08-26: widens stage-budget.ts\'s MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT by one (mirroring the validated 2026-08-22 4->5 increase) AND appends the missing plain WIDE beam to attempts.ts\'s two must-cross-heavy sibling rules ("must-cross, must-pass-heavy": beam:intersectionHarvest@beam5000; "must-cross default": beam:objectiveFirst@beam5000) that STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE\'s rule left untouched. Population-scale development A/B (solver-routing-regime-sample-ab.yml, 486-level must-cross-heavy sample): control 389/486, treatment 389/486 — 0 gains, 0 losses, with real (nonzero) work/node engagement confirming the mechanism actually ran, not a non-participation artifact. Current disposition: docs/solver-opt-in-experiment-ledger.md. Do not repeat this unchanged form (same two rules, same two beams, same reserve-widen mechanism) without materially new evidence.',
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE: 'Production default-OFF; CLOSED NEGATIVE 2026-08-28 append-last form. Selected replay was +1/-0, but the prespecified 120-level mechanics-eligible strict-67M development A/B was control 56/120 vs treatment 55/120: 0 gains, 1 loss (R02965), treatment participation 68/120, no deadline/error censoring, and +29.0M aggregate work. Mechanism: appending the new beam changed MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT=5 suffix membership and starved a previously protected beam:objectiveFirst@beam5000 winner. Do not repeat this append-last form. Separate reserve-preserving descendant has a materially new placement premise.',
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE: 'Production default-OFF development descendant: exposes the same beam:intersectionHarvest@beam2000 action as STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE, but inserts it immediately before each affected rule\'s previously protected five-config late-reserve suffix instead of appending it after that suffix. Motivated by the parent treatment\'s R02965 development regression: append-last changed suffix membership and starved the existing beam:objectiveFirst@beam5000 winner. This descendant preserves the pre-treatment protected suffix membership without widening the reserve or changing total-work policy.',

    // ── Templates ──────────────────────────────────────────────────────────────
    TEMPLATE_CORNER_HARVEST:    'cornerHarvest — pulls toward grid corners during harvest phase',
    TEMPLATE_PERIMETER_CW:      'perimeterCW — clockwise perimeter traversal bias',
    TEMPLATE_PERIMETER_CCW:     'perimeterCCW — counter-clockwise perimeter traversal bias',
    TEMPLATE_SIDE_COMMITMENT:   'sideCommitment — penalises crossing the grid midline',
    TEMPLATE_SIDE_X_LOW:        'sideXLow — bias toward x < midX (interior-gate levels)',
    TEMPLATE_SIDE_X_HIGH:       'sideXHigh — bias toward x > midX',
    TEMPLATE_SIDE_Y_LOW:        'sideYLow — bias toward y < midY',
    TEMPLATE_SIDE_Y_HIGH:       'sideYHigh — bias toward y > midY',

    // ── Profiles ──────────────────────────────────────────────────────────────
    // These are scoreMove weight vectors, not independent search algorithms. Exact current
    // values live in policy.ts; keep these labels descriptive and non-procedural.
    PROFILE_default:             'default scoring profile — tuned mixed weights from policy.ts (not an all-1.0 vector)',
    PROFILE_perimeterSweep:      'perimeterSweep scoring profile — stronger perimeter preference with reduced anti-dither/revisit pressure',
    PROFILE_harvestThenFinish:   'harvestThenFinish scoring profile — balanced objective/intersection guidance with moderate goal/finish pull; not a separate two-phase algorithm',
    PROFILE_portalFirstTransfer: 'portalFirstTransfer scoring profile — balanced objective/MC guidance with lower perimeter/revisit weighting; no dedicated portal procedure',
    PROFILE_objectiveFirst:      'objectiveFirst scoring profile — strong objective, must-pass, and must-cross urgency',
    PROFILE_finishFirst:         'finishFirst scoring profile — high goal/finish commitment with lower perimeter/intersection emphasis',
    PROFILE_nearClosureRescue:   'nearClosureRescue scoring profile — very high goal/finish commitment plus stronger objective urgency',
    PROFILE_knotBuilder:         'knotBuilder scoring profile — elevated intersection-setup weight',
    PROFILE_portalCommitted:     'portalCommitted scoring profile — balanced goal/objective/MC weights; no dedicated portal procedure',
    PROFILE_mustCrossFirst:      'mustCrossFirst scoring profile — very high must-cross urgency',
    PROFILE_intersectionHarvest: 'intersectionHarvest scoring profile — very high intersection setup with weak objective urgency',
    PROFILE_closureCommitment:   'closureCommitment scoring profile — very high finish and MP/MC urgency with low anti-dither/revisit weights',
};

/** Features whose production default is off. Shared by experiment constructors and the solver's
 * sparse-config normalizer so the two paths cannot silently disagree.
 *
 * Membership here is NOT a promotion-status signal. See
 * docs/solver-opt-in-experiment-ledger.md before deciding that an opt-in needs more testing. */
export const OPT_IN_FEATURES = new Set([
    'PRUNE_PORTAL_PARITY_ENVELOPE',
    'STRATEGY_REPAIR_ELITE_PREFIX_DFS',
    'STRATEGY_REPAIR_TURN_BIAS',
    'STRATEGY_REPAIR_FALLBACK_GATE_WIDEN',
    'SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE',
    'STRATEGY_REPAIR_FALLBACK_NODE_RESERVE',
    'STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE',
    'STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE',
    'STRATEGY_REPAIR_BEAM_SEED',
    'STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY',
    'STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY',
    'STRATEGY_RETRY_TIER_NODE_STAIRCASE',
    'STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE',
    'STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE',
    'STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE',
]);


/** Historical externally persisted flag spellings accepted on input only. */
export const LEGACY_FEATURE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
    STRATEGY_ARCHETYPE_ROUTING: 'STRATEGY_ROUTING_REGIME_SELECTION',
});

/** Normalize one historical feature name to the canonical registry key. */
export function canonicalAblationFeatureName(featureName: string): string {
    return LEGACY_FEATURE_ALIASES[featureName] ?? featureName;
}

/** True for canonical feature names and supported historical aliases. */
export function isKnownAblationFeatureName(featureName: string): boolean {
    return canonicalAblationFeatureName(featureName) in FEATURES;
}

// ─── Template → config key mapping ────────────────────────────────────────────

/** @type {Record<string, string>} */
export const TEMPLATE_CONFIG_KEY: Record<string, string> = {
    cornerHarvest:  'TEMPLATE_CORNER_HARVEST',
    perimeterCW:    'TEMPLATE_PERIMETER_CW',
    perimeterCCW:   'TEMPLATE_PERIMETER_CCW',
    sideCommitment: 'TEMPLATE_SIDE_COMMITMENT',
    sideXLow:       'TEMPLATE_SIDE_X_LOW',
    sideXHigh:      'TEMPLATE_SIDE_X_HIGH',
    sideYLow:       'TEMPLATE_SIDE_Y_LOW',
    sideYHigh:      'TEMPLATE_SIDE_Y_HIGH',
};

// ─── Profile → config key mapping ────────────────────────────────────────────

/** @type {Record<string, string>} */
export const PROFILE_CONFIG_KEY: Record<string, string> = {
    default:             'PROFILE_default',
    perimeterSweep:      'PROFILE_perimeterSweep',
    harvestThenFinish:   'PROFILE_harvestThenFinish',
    portalFirstTransfer: 'PROFILE_portalFirstTransfer',
    objectiveFirst:      'PROFILE_objectiveFirst',
    finishFirst:         'PROFILE_finishFirst',
    nearClosureRescue:   'PROFILE_nearClosureRescue',
    knotBuilder:         'PROFILE_knotBuilder',
    portalCommitted:     'PROFILE_portalCommitted',
    mustCrossFirst:      'PROFILE_mustCrossFirst',
    intersectionHarvest: 'PROFILE_intersectionHarvest',
    closureCommitment:   'PROFILE_closureCommitment',
};

// Feature groups for convenience in experiment definitions
export const FEATURE_GROUPS = {
    scoring:   Object.keys(FEATURES).filter(k => k.startsWith('SCORE_')),
    pruning:   Object.keys(FEATURES).filter(k => k.startsWith('PRUNE_')),
    strategy:  Object.keys(FEATURES).filter(k => k.startsWith('STRATEGY_')),
    templates: Object.keys(FEATURES).filter(k => k.startsWith('TEMPLATE_')),
    profiles:  Object.keys(FEATURES).filter(k => k.startsWith('PROFILE_')),
};

export type AblationConfig = Record<string, boolean | string | number>;

// ─── Config constructors ──────────────────────────────────────────────────────

/** Production defaults — the reference configuration. @returns {Record<string, any>} */
export function defaultConfig(): AblationConfig {
    return Object.fromEntries(Object.keys(FEATURES).map(k => [k, !OPT_IN_FEATURES.has(k)]));
}

/** One feature disabled, all others at production defaults. @param {string} featureName @returns {Record<string, any>} */
export function withFeatureDisabled(featureName: string): AblationConfig {
    const canonical = canonicalAblationFeatureName(featureName);
    if (!(canonical in FEATURES)) throw new Error(`Unknown feature: ${featureName}`);
    const cfg = defaultConfig();
    cfg[canonical] = false;
    return cfg;
}

/** Multiple features disabled, all others at production defaults. @param {string[]} featureNames @returns {Record<string, any>} */
export function withFeaturesDisabled(featureNames: string[]): AblationConfig {
    const cfg = defaultConfig();
    for (const f of featureNames) {
        const canonical = canonicalAblationFeatureName(f);
        if (!(canonical in FEATURES)) throw new Error(`Unknown feature: ${f}`);
        cfg[canonical] = false;
    }
    return cfg;
}

/** Only the listed features enabled, everything else disabled. @param {string[]} featureNames @returns {Record<string, any>} */
export function soloConfig(featureNames: string[]): AblationConfig {
    const cfg = Object.fromEntries(Object.keys(FEATURES).map(k => [k, false]));
    for (const f of featureNames) {
        const canonical = canonicalAblationFeatureName(f);
        if (!(canonical in FEATURES)) throw new Error(`Unknown feature: ${f}`);
        cfg[canonical] = true;
    }
    return cfg;
}

// ─── Experiment catalogue ─────────────────────────────────────────────────────

/**
 * Returns the list of ablation experiments for a given phase.
 * Each entry: { name, label, config, tags }
 *   name   — unique machine-readable id for the run
 *   label  — human-readable description
 *   config — ablation config (null = baseline = all enabled)
 *   tags   — array of category tags
 */

/** @param {string} [phase] @returns {any[]} */
export function buildExperimentList(phase = 'full'): any[] {
    const experiments: any[] = [];

    // ── Baseline ──────────────────────────────────────────────────────────────
    experiments.push({
        name: 'baseline',
        label: 'Baseline (production defaults)',
        config: null,
        tags: ['baseline'],
    });

    if (phase === 'baseline') return experiments;

    // ── Single-feature ablations ──────────────────────────────────────────────
    if (phase === 'single-feature' || phase === 'full') {
        for (const [key, desc] of Object.entries(FEATURES)) {
            const optIn = OPT_IN_FEATURES.has(key);
            experiments.push({
                name: `${optIn ? 'enable' : 'disable'}:${key}`,
                label: `${optIn ? 'Enable' : 'Disable'} ${key} — ${desc}`,
                config: optIn ? { ...defaultConfig(), [key]: true } : withFeatureDisabled(key),
                tags: [_groupOf(key), 'single-feature'],
            });
        }
    }

    // ── Attempt order analysis ─────────────────────────────────────────────────
    if (phase === 'order' || phase === 'full') {
        for (const order of ['reverse', 'random', 'profile-grouped']) {
            const cfg = defaultConfig();
            cfg.ATTEMPT_ORDER = order;
            if (order === 'random') cfg._randomSeed = 12345;
            experiments.push({
                name: `order:${order}`,
                label: `Attempt order: ${order}`,
                config: cfg,
                tags: ['order'],
            });
        }
        // Several random seeds to sample order sensitivity
        for (const seed of [1, 7, 42, 99, 314]) {
            const cfg = defaultConfig();
            cfg.ATTEMPT_ORDER = 'random';
            cfg._randomSeed = seed;
            experiments.push({
                name: `order:random:seed${seed}`,
                label: `Attempt order: random (seed ${seed})`,
                config: cfg,
                tags: ['order', 'random'],
            });
        }
    }

    // ── Profile-only ablations ────────────────────────────────────────────────
    if (phase === 'profiles' || phase === 'full') {
        for (const profileName of Object.keys(PROFILE_CONFIG_KEY)) {
            const key = PROFILE_CONFIG_KEY[profileName];
            experiments.push({
                name: `profile-off:${profileName}`,
                label: `Profile removed: ${profileName}`,
                config: withFeatureDisabled(key),
                tags: ['profile', 'single-feature'],
            });
        }
        // Solo: only one profile enabled
        for (const profileName of Object.keys(PROFILE_CONFIG_KEY)) {
            const key = PROFILE_CONFIG_KEY[profileName];
            const cfg = defaultConfig();
            // Disable all profiles except this one
            for (const pk of Object.values(PROFILE_CONFIG_KEY)) cfg[pk] = false;
            cfg[key] = true;
            experiments.push({
                name: `profile-solo:${profileName}`,
                label: `Solo profile: ${profileName} only`,
                config: cfg,
                tags: ['profile', 'solo'],
            });
        }
    }

    // ── Template-only ablations ────────────────────────────────────────────────
    if (phase === 'templates' || phase === 'full') {
        for (const [templateName, key] of Object.entries(TEMPLATE_CONFIG_KEY)) {
            experiments.push({
                name: `template-off:${templateName}`,
                label: `Template removed: ${templateName}`,
                config: withFeatureDisabled(key),
                tags: ['template', 'single-feature'],
            });
        }
        // All templates disabled
        experiments.push({
            name: 'templates-all-off',
            label: 'All templates disabled',
            config: withFeaturesDisabled(Object.values(TEMPLATE_CONFIG_KEY)),
            tags: ['template', 'combination'],
        });
    }

    // ── Combination testing ───────────────────────────────────────────────────
    if (phase === 'pairs' || phase === 'full') {
        // Predefined interesting pairs: mechanisms that might be redundant
        const interestingPairs = [
            // Both distance-guidance mechanisms
            ['SCORE_GOAL_ATTRACTION', 'SCORE_OBJECTIVE_ATTRACTION'],
            // Both urgency mechanisms
            ['SCORE_MUST_PASS_URGENCY', 'SCORE_MUST_CROSS_URGENCY'],
            // Both "anti-noise" mechanisms
            ['SCORE_ANTI_DITHER', 'SCORE_REVISIT_PENALTY'],
            // Perimeter direction pair
            ['TEMPLATE_PERIMETER_CW', 'TEMPLATE_PERIMETER_CCW'],
            // Both lower bound types
            ['PRUNE_MUST_PASS_LB', 'PRUNE_MUST_CROSS_LB'],
            // LDS + connectivity (both reduce wasted search)
            ['STRATEGY_LDS', 'PRUNE_CONNECTIVITY'],
            // Gate scheduling + parity filtering
            ['STRATEGY_GATE_INTERLEAVING', 'STRATEGY_PARITY_GATE_FILTER'],
            // Both beam optimisations
            ['STRATEGY_DIVERSE_BEAM', 'STRATEGY_STATE_DEDUP'],
            // Approach guidance pair
            ['SCORE_MC_APPROACH_GUIDANCE', 'SCORE_FLIPPER_URGENCY'],
            // Phase scaling + finish commitment (both end-game mechanics)
            ['SCORE_PHASE_SCALING', 'SCORE_FINISH_COMMITMENT'],
            // Template bonus + perimeter bias (overlapping perimeter guidance)
            ['SCORE_TEMPLATE_BONUS', 'SCORE_PERIMETER_BIAS'],
        ];
        for (const [a, b] of interestingPairs) {
            experiments.push({
                name: `pair-off:${a}+${b}`,
                label: `Both disabled: ${a} + ${b}`,
                config: withFeaturesDisabled([a, b]),
                tags: ['pair', 'combination'],
            });
        }
        // Group ablations: disable entire categories
        for (const [group, keys] of Object.entries(FEATURE_GROUPS)) {
            if (group === 'profiles' || group === 'templates') continue; // too disruptive
            experiments.push({
                name: `group-off:${group}`,
                label: `Entire ${group} group disabled`,
                config: withFeaturesDisabled(keys),
                tags: [group, 'group'],
            });
        }
    }

    return experiments;
}

/** @param {string} key @returns {string} */
function _groupOf(key: string): string {
    if (key.startsWith('SCORE_'))    return 'scoring';
    if (key.startsWith('PRUNE_'))    return 'pruning';
    if (key.startsWith('STRATEGY_')) return 'strategy';
    if (key.startsWith('TEMPLATE_')) return 'template';
    if (key.startsWith('PROFILE_'))  return 'profile';
    return 'other';
}

// ─── Importance scoring ───────────────────────────────────────────────────────

/**
 * Compute an importance score for an ablation result relative to baseline.
 * Returns a number where higher = more important (removing this feature hurts more).
 *
 *   solve_loss:      each failed level that baseline solves       → +100 points
 *   runtime_ratio:   fractional runtime increase                  → +50 * ratio points
 *   node_ratio:      fractional node-expansion increase           → +20 * ratio points
 *   solve_gain:      each level newly solved by ablation          → −20 points (negative importance)
 */
/** @param {any} ablation @param {any} baseline @returns {number} */
export function computeImportanceScore(ablation: any, baseline: any): number {
    const solveLoss = Math.max(0, baseline.summary.solved - ablation.summary.solved);
    const solveGain = Math.max(0, ablation.summary.solved - baseline.summary.solved);

    const baseMs = baseline.summary.totalMs || 1;
    const ablMs  = ablation.summary.totalMs  || 1;
    const runtimeRatio = Math.max(0, (ablMs - baseMs) / baseMs);

    const baseNodes = baseline.summary.nodesExpanded || 1;
    const ablNodes  = ablation.summary.nodesExpanded || 1;
    const nodeRatio = Math.max(0, (ablNodes - baseNodes) / baseNodes);

    return solveLoss * 100 + runtimeRatio * 50 + nodeRatio * 20 - solveGain * 20;
}

/** Classify a feature by its importance score into one of four tiers.
 * @param {number} importanceScore @param {number} solveLoss @returns {string} */
export function classifyFeature(importanceScore: number, solveLoss: number): string {
    if (solveLoss > 0)           return 'critical';   // any solve loss = critical
    if (importanceScore >= 15)   return 'strong';     // significant slowdown
    if (importanceScore <= -5)   return 'negative';   // removing helps
    if (importanceScore <= 5)    return 'neutral';    // no measurable impact
    return 'helpful';                                  // modest positive contribution
}
