/**
 * ablation-config.mjs
 *
 * Central schema for Solver ablation experiments. Every major solver capability
 * has a corresponding boolean flag. The default config has all flags = true (all
 * features enabled). Setting a flag to false disables that feature for one run.
 *
 * Usage:
 *   import { defaultConfig, withFeatureDisabled, FEATURES } from './ablation-config.mjs';
 *   const cfg = withFeatureDisabled('SCORE_GOAL_ATTRACTION');
 *   await Solver.solve(level, { timeBudgetMs, ablation: cfg });
 */

// @ts-check

// ─── Feature registry ─────────────────────────────────────────────────────────
// Map from flag name → human-readable description.

/** @type {Record<string, string>} */
export const FEATURES = {
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

    // ── Pruning rules (dfsFromGate + beamSearchFromGate) ─────────────────────
    PRUNE_MC_CEILING:           'Intersection ceiling: ints + pending-MC-crossings > reqInt',
    PRUNE_DISTANCE_BOUND:       'Goal BFS distance exceeds remaining steps',
    PRUNE_PARITY:               'Manhattan parity mismatch (portal-free levels only)',
    PRUNE_MUST_PASS_LB:         'MST lower bound on remaining must-pass visit distance',
    PRUNE_MUST_CROSS_LB:        'MST lower bound on remaining must-cross distance (with approach maps)',
    PRUNE_INTERSECTION_DEFICIT: 'Remaining steps < intersections still needed',
    PRUNE_CONNECTIVITY:         'Flood-fill connectivity + volume check',
    PRUNE_SURROUND_LB:          'Lower bound on steps needed to visit all surround-landmark neighbors',
    PRUNE_ADJ_TURN_LB:          'Lower bound on steps needed to satisfy all adjacent-turn landmark objects',
    PRUNE_MUST_TURN_DEADLOCK:   'Prune once a pending must-turn cell has both axis bits used (provably unsatisfiable)',

    // ── Search strategy ───────────────────────────────────────────────────────
    STRATEGY_LDS:               'Limited Discrepancy Search probe waves before full DFS',
    STRATEGY_DIVERSE_BEAM:      'Diverse beam selection bucketed by (flipperUsedMask, mustCrossMask)',
    STRATEGY_STATE_DEDUP:       'Beam state deduplication: merge same (position + constraint-state)',
    STRATEGY_GATE_INTERLEAVING: 'Config-outer gate-inner scheduling for multi-gate levels',
    STRATEGY_PARITY_GATE_FILTER:'Pre-filter infeasible gates by parity (portal-free levels)',
    STRATEGY_REPAIR_FALLBACK:   'Iterated-local-search repair fallback attempts (extra budget, after the main loop)',
    STRATEGY_ATTRACTION_DIVERSITY: 'Last-resort attempt with one attraction/position-scoring term (from the fragile-group family found 2026-07-16) disabled, after the main loop and repair fallback have both failed',
    STRATEGY_REPAIR_PROBE:      'Early small-budget repair probe before the main DFS/beam loop',
    STRATEGY_REPAIR_PROBE_MULTI_SEED: 'Retry the ordinary-tier repair probe across a few extra gate-derived PRNG seeds before falling through to the main loop',
    STRATEGY_REPAIR_MUSTTURN_BIAS: 'Second, exit-guidance-biased repair attempt on must-turn levels',
    STRATEGY_ADAPTIVE_GATE_BUDGET: 'nodesExpanded-weighted per-gate budget skew on ≥4-gate levels',
    STRATEGY_LOWER_BOUND_MEMO:  'Exact memoization of must-pass/must-cross lower bounds (pure speed)',
    STRATEGY_ARCHETYPE_ROUTING: 'Feature/archetype-based ATTEMPT_POLICY rule selection — disabling forces every level through the catch-all default rule',
    STRATEGY_MIN_BUDGET_FLOOR:  'Per-attempt-config minimum budget-share floor (long-multigate perimeter beams, must-cross diverse-beam threads)',
    STRATEGY_REPAIR_ELITE_SPLICE:      'Repair-search: splice restarts from the near-miss elite pool instead of always restarting fresh from the gate',
    STRATEGY_REPAIR_STAGNATION_BURST:  'Repair-search: force a burst of fresh-from-gate restarts after a long stretch with no badness improvement',
    STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST: "Repair-search: bias the must-turn-biased attempt's exploratory branch toward the correct-direction turn exit",

    // ── Templates ─────────────────────────────────────────────────────────────
    TEMPLATE_CORNER_HARVEST:    'cornerHarvest — pulls toward grid corners during harvest phase',
    TEMPLATE_PERIMETER_CW:      'perimeterCW — clockwise perimeter traversal bias',
    TEMPLATE_PERIMETER_CCW:     'perimeterCCW — counter-clockwise perimeter traversal bias',
    TEMPLATE_SIDE_COMMITMENT:   'sideCommitment — penalises crossing the grid midline',
    TEMPLATE_SIDE_X_LOW:        'sideXLow — bias toward x < midX (interior-gate levels)',
    TEMPLATE_SIDE_X_HIGH:       'sideXHigh — bias toward x > midX',
    TEMPLATE_SIDE_Y_LOW:        'sideYLow — bias toward y < midY',
    TEMPLATE_SIDE_Y_HIGH:       'sideYHigh — bias toward y > midY',

    // ── Profiles ──────────────────────────────────────────────────────────────
    PROFILE_default:             'default profile — all weights = 1.0',
    PROFILE_perimeterSweep:      'perimeterSweep — high perimeter bias, low goal pull',
    PROFILE_harvestThenFinish:   'harvestThenFinish — objective-then-goal two-phase strategy',
    PROFILE_portalFirstTransfer: 'portalFirstTransfer — portal-activation priority',
    PROFILE_objectiveFirst:      'objectiveFirst — strong MP/MC urgency, low goal pull',
    PROFILE_finishFirst:         'finishFirst — high goal + finish commitment, low perimeter',
    PROFILE_nearClosureRescue:   'nearClosureRescue — near-loop recovery, very high finish',
    PROFILE_knotBuilder:         'knotBuilder — intersection-focused, high intersectionSetup',
    PROFILE_portalCommitted:     'portalCommitted — balanced portal-aware weights',
    PROFILE_mustCrossFirst:      'mustCrossFirst — very high MC urgency (2.4×)',
    PROFILE_intersectionHarvest: 'intersectionHarvest — pure intersection farming (3.0×)',
    PROFILE_closureCommitment:   'closureCommitment — maximum finish + MP/MC urgency (2.0×)',
};

// ─── Template → config key mapping ───────────────────────────────────────────

/** @type {Record<string, string>} */
export const TEMPLATE_CONFIG_KEY = {
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
export const PROFILE_CONFIG_KEY = {
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

// ─── Config constructors ──────────────────────────────────────────────────────

/** All features enabled — the reference configuration. @returns {Record<string, any>} */
export function defaultConfig() {
    return Object.fromEntries(Object.keys(FEATURES).map(k => [k, true]));
}

/** One feature disabled, all others enabled. @param {string} featureName @returns {Record<string, any>} */
export function withFeatureDisabled(featureName) {
    if (!(featureName in FEATURES)) throw new Error(`Unknown feature: ${featureName}`);
    const cfg = defaultConfig();
    cfg[featureName] = false;
    return cfg;
}

/** Multiple features disabled simultaneously. @param {string[]} featureNames @returns {Record<string, any>} */
export function withFeaturesDisabled(featureNames) {
    const cfg = defaultConfig();
    for (const f of featureNames) {
        if (!(f in FEATURES)) throw new Error(`Unknown feature: ${f}`);
        cfg[f] = false;
    }
    return cfg;
}

/** Only the listed features enabled, everything else disabled. @param {string[]} featureNames @returns {Record<string, any>} */
export function soloConfig(featureNames) {
    const cfg = Object.fromEntries(Object.keys(FEATURES).map(k => [k, false]));
    for (const f of featureNames) {
        if (!(f in FEATURES)) throw new Error(`Unknown feature: ${f}`);
        cfg[f] = true;
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
export function buildExperimentList(phase = 'full') {
    /** @type {any[]} */
    const experiments = [];

    // ── Baseline ──────────────────────────────────────────────────────────────
    experiments.push({
        name: 'baseline',
        label: 'Baseline (all features enabled)',
        config: null,
        tags: ['baseline'],
    });

    if (phase === 'baseline') return experiments;

    // ── Single-feature ablations ──────────────────────────────────────────────
    if (phase === 'single-feature' || phase === 'full') {
        for (const [key, desc] of Object.entries(FEATURES)) {
            experiments.push({
                name: `disable:${key}`,
                label: `Disable ${key} — ${desc}`,
                config: withFeatureDisabled(key),
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

    // ── Template-only ablations ───────────────────────────────────────────────
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
function _groupOf(key) {
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
export function computeImportanceScore(ablation, baseline) {
    const solveLoss = Math.max(0, baseline.summary.solved - ablation.summary.solved);
    const solveGain = Math.max(0, ablation.summary.solved - baseline.summary.solved);

    const baseMs = baseline.summary.totalMs || 1;
    const ablMs  = ablation.summary.totalMs  || 1;
    const runtimeRatio = Math.max(0, (ablMs - baseMs) / baseMs);

    const baseNodes = baseline.summary.nodesExpanded || 1;
    const ablNodes  = ablation.summary.nodesExpanded  || 1;
    const nodeRatio = Math.max(0, (ablNodes - baseNodes) / baseNodes);

    return solveLoss * 100 + runtimeRatio * 50 + nodeRatio * 20 - solveGain * 20;
}

/** Classify a feature by its importance score into one of four tiers.
 * @param {number} importanceScore @param {number} solveLoss @returns {string} */
export function classifyFeature(importanceScore, solveLoss) {
    if (solveLoss > 0)           return 'critical';   // any solve loss = critical
    if (importanceScore >= 15)   return 'strong';     // significant slowdown
    if (importanceScore <= -5)   return 'negative';   // removing helps
    if (importanceScore <= 5)    return 'neutral';    // no measurable impact
    return 'helpful';                                  // modest positive contribution
}
