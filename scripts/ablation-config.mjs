/**
 * ablation-config.mjs
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
    PRUNE_MC_RESERVED_WALL:     'Reserved-intersection wall: once every remaining intersection is committed to a pending must-cross crossing, visited cells are walls in the connectivity fill (portal-free levels only)',
    PRUNE_DISTANCE_BOUND:       'Goal BFS distance exceeds remaining steps',
    PRUNE_PARITY:               'Manhattan parity mismatch (portal-free levels only)',
    PRUNE_PORTAL_PARITY_ENVELOPE: 'production default-OFF; CLOSED/retained opt-in: Manhattan parity mismatch on portal levels with >=1 twist portal pair. Sound, but a live A/B saw zero rejects and zero node-count change across ~240M searched nodes on 40 relevant levels; no promotion gate remains without materially stronger new evidence. See reports/2026-08-08-portal-parity-envelope.md and docs/solver-opt-in-experiment-ledger.md.',
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
    PRUNE_MC_NEIGHBOR_BUDGET:   'production default-ON as of 2026-08-12 (promoted, read-site convention fix included): dynamic must-cross/intersection propagation, revised wiring (excluded from repair\'s seeded-random takePly survivor selection since commit a113d47, retained for DFS/beam and deterministic repair sub-searches). Sound on 97,812 stored-valid paths (0 violations), 19 unique oracle-atlas catches beyond the existing gauntlet. 2026-08-11 level-blind full-population A/B (matched flags, no exact-level history): 0 regressions on the published 160-level corpus, 0 on corpus-1 (94/102 both arms), corpus-2 611→665 (+54 net, 59 gained / 5 lost, 7.4:1+ ratio). The 2026-08-12 five-loss diagnosis found four of the five residual losses share a distinct, understood mechanism (a bounded-width diverse-beam retention effect, not repair-seed-related) -- see reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md. The registry-only promotion initially left prune-gauntlet.ts\'s read site on the opt-in convention (cfg && cfg.FLAG === true), which stays inert whenever cfg is null (every production interactive solve and any CLI run without --enable-flags) -- fixed by switching the read site to the standard (!cfg || cfg.FLAG) convention used by every other non-opt-in rule in the gauntlet. See reports/2026-08-08-mc-neighbor-budget-propagation.md, reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md, and docs/solver-opt-in-experiment-ledger.md.',

    // ── Search strategy ───────────────────────────────────────────────────────
    STRATEGY_LDS:               'Limited Discrepancy Search probe waves before full DFS',
    STRATEGY_DIVERSE_BEAM:      'Diverse beam selection bucketed by (flipperUsedMask, mustCrossMask)',
    STRATEGY_STATE_DEDUP:       'Beam state deduplication: merge same (position + constraint-state)',
    STRATEGY_REPAIR_ELITE_PREFIX_DFS: 'production default-OFF; CLOSED for promotion in its current form / retained opt-in negative: bounded deterministic completion DFS from elite prefixes is sound and mechanistically real, but the dedicated equal-budget test was ON 4/20 vs OFF 5/20 with a confirmed shared-budget displacement. Do not buy a full Corpus-2 A/B for unchanged constants merely because the historical report listed one; reopen only after a materially cheaper/more selective variant clears a small retest. See reports/2026-08-07-repair-elite-prefix-dfs.md and docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_BEAM_SEED: 'production default-OFF; NEW, unvalidated (landed 2026-08-13): seeds repair\'s initial elite pool from a small, cheap beam search\'s surviving frontier (repairSearchFromGate\'s enableBeamSeed param, BEAM_SEED_WIDTH/BEAM_SEED_NODE_BUDGET/BEAM_SEED_TOP_K in repair-search.ts), validated through the real state transition machinery and budget-charged against repair\'s own node counter. Motivated by the 2026-08-13 stratified beam/repair producer-population pilot (25 levels, zero exact-prefix / zero metric-projection overlap between beam survivors and repair\'s own elites -- reports/2026-08-11-beam-repair-producer-population-pilot.md). An isolated repairSearchFromGate counterfactual (n=13 plateaued repair-gated levels, matched 2,000,000-node budget, bypassing the full ladder) found 1 solve gained (R00701: stuck at badness 2 without, fully solved with) and 0 solve losses, but a mixed badness signal otherwise (4 levels better, 8 worse) -- the fixed beam-seed cost is a real tax that only pays off when the survivor happens to unstick repair\'s specific plateau. Needs a full-ladder solveLevel() sample before any promotion decision -- the isolated test bypasses everything upstream of repair fallback.',
    STRATEGY_REPAIR_NOGOOD_CACHE: 'Repair: per-call cache of exact dead-end states, short-circuiting a restart the moment it re-enters a state already proven fruitless earlier in the same call (see modules/solver/nogood-cache.ts)',
    STRATEGY_GATE_INTERLEAVING: 'Config-outer gate-inner scheduling for multi-gate levels',
    STRATEGY_PARITY_GATE_FILTER:'Pre-filter infeasible gates by parity (portal-free levels)',
    STRATEGY_REPAIR_FALLBACK:   'Iterated-local-search repair fallback attempts (extra budget, after the main loop)',
    STRATEGY_ATTRACTION_DIVERSITY: 'Last-resort attempt with one attraction/position-scoring term (from the fragile-group family found 2026-07-16) disabled, after the main loop and repair fallback have both failed',
    STRATEGY_ADMISSIBLE_ORDER:  'Last-resort admissible-order-search tier (2026-07-24) — a single-path DFS ordered by an admissible slack heuristic across several tie-break profiles, tried after the main loop, repair fallback, and attraction-diversity pass have all failed',
    STRATEGY_REPAIR_PROBE:      'Early small-budget repair probe before the main DFS/beam loop',
    STRATEGY_REPAIR_PROBE_MULTI_SEED: 'Retry the ordinary-tier repair probe across a few extra gate-derived PRNG seeds before falling through to the main loop',
    STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET: 'production default-ON as of 2026-08-13 (promoted): scales the repair probe\'s biased-tier node budget down when the ordinary tier\'s own live bestBadness evidence (current-invocation only, no exact-level history) shows no sign repair is close, freeing shared mainLoopEarlyNodeBudget headroom for the early main-loop configs the probe otherwise runs ahead of unconditionally. A single-signal, single-recipient instance of online failure-conditioned allocation (docs/future-work.md item #4, docs/solver-interoperability-and-cooperation-plan.md §17) -- motivated by tracing a since-refined starvation hypothesis to its real mechanism (the probe and early main-loop configs share one unprotected pool; the late-reserve/admissible-order reserves are NOT actually reachable by the probe, contrary to the hypothesis that first suggested this). Calibrated from an n=12 local sample (n=1 for the "needs full budget" case); confirmed at larger scale by a 300-level stratified level-blind GHA A/B at the real production node budget (net +1, 1 gained / 0 lost, nodes -1.5%, work -9.0%) -- promoted on that evidence at the project owner\'s explicit direction, though a full-population Corpus-2 A/B (this ledger\'s usual promotion bar) was not run. See reports/2026-08-12-repair-probe-early-main-loop-starvation.md, docs/solver-opt-in-experiment-ledger.md, and REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE\'s own comment in orchestration.ts.',
    STRATEGY_REPAIR_MUSTTURN_BIAS: 'Second, exit-guidance-biased repair attempt on must-turn levels',
    STRATEGY_ADAPTIVE_GATE_BUDGET: 'nodesExpanded-weighted per-gate budget skew on ≥4-gate levels',
    STRATEGY_LOWER_BOUND_MEMO:  'Exact memoization of must-pass/must-cross lower bounds (pure speed)',
    STRATEGY_ARCHETYPE_ROUTING: 'Feature/archetype-based ATTEMPT_POLICY rule selection — disabling forces every level through the catch-all default rule',
    STRATEGY_MIN_BUDGET_FLOOR:  'Per-attempt-config minimum budget-share floor (long-multigate perimeter beams, must-cross diverse-beam threads)',
    STRATEGY_REPAIR_ELITE_SPLICE:      'Repair-search: splice restarts from the near-miss elite pool instead of always restarting fresh from the gate',
    STRATEGY_REPAIR_STAGNATION_BURST:  'Repair-search: force a burst of fresh-from-gate restarts after a long stretch with no badness improvement',
    STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST: "Repair-search: bias the must-turn-biased attempt's exploratory branch toward the correct-direction turn exit",
    STRATEGY_REPAIR_LENGTH_GAP_CLOSE: 'Repair-search: on a dead end where every non-length/intersection objective is already satisfied, try a small bounded backtracking search to close the exact length/intersection gap instead of discarding the restart',
    STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS: 'Repair-search: additionally trigger closeLengthGap when at most LENGTH_GAP_CLOSE_STRUCTURAL_SLACK non-length objectives are still pending (not just exactly zero) — targets near-miss dead ends like "length off by 1, one pending mustTurn cell" that the strict base trigger never attempts',
    STRATEGY_REPAIR_TURN_BIAS: 'production default-OFF; CLOSED negative / retained opt-in: repair turn-aware selective-bias attempt. A clean deterministic Corpus-2 A/B after the sparse-ablation confound fix reproduced baseline 725/1700 vs ON 718/1700 (net −7; 5 gained/12 lost), byte-identical to the prior result; disabling the nogood cache gave −8 and falsified that proposed interaction. Do not promote or repeat without materially new evidence. See reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md and docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_MAIN_LOOP_LATE_RESERVE: 'production default-ON as of 2026-08-12 at fraction 0.15 (MAIN_LOOP_LATE_RESERVE_FRACTION, orchestration.ts): reserve-not-reorder treatment for main-loop attempt starvation. The frozen 4-arm level-blind A/B (workers=1, deterministic=true) showed Corpus-2 control 617/1700 -> 0.05: 687 -> 0.10: 692 -> 0.15: 694, but this control-vs-treatment comparison was found CONFOUNDED after the fact: the control arm\'s blank --enable-flags left ablation=null (so PRUNE_MC_NEIGHBOR_BUDGET read OFF under its then-unfixed opt-in read site) while every treatment arm\'s non-null ablation object made PRUNE_MC_NEIGHBOR_BUDGET read ON via the Proxy default-fallback -- mixing a large share of that flag\'s own already-known +54 effect into the 617-vs-694 gap. The unconfounded 687->692->694 treatment-vs-treatment trend (PRUNE_MC_NEIGHBOR_BUDGET constant ON throughout) still supports a real, if smaller, effect, and the mechanism pilot separately recovered 1/14 hard historical matches. Kept promoted (not reverted) pending a single full corpus-1+corpus-2 sweep with everything correctly default-on (now that both flags\' read sites are fixed) to directly observe the achieved solved count. See docs/main-loop-late-reserve-experiment.md, reports/2026-08-12-main-loop-late-reserve-population-ab.md, and docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: 'production default-OFF; CLOSED, not promoted (2026-08-13): withholds a slice of earlyTierNodeBudget (REPAIR_FALLBACK_NODE_RESERVE_FRACTION, orchestration.ts) from the probe and the WHOLE main loop, protecting the repair fallback loop from the main loop\'s own consumption -- same mechanism as ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION, one tier boundary further down the ladder. A 300-level stratified GHA A/B confirmed the mechanism works as designed (fallback-loop participation 20/300 -> 146/300) but produced ZERO additional solves in either arm (132/300 both, byte-identical ids): every fallback attempt burns its full node ceiling while stalled on a fixed badness plateau -- the same structural wall docs/repair-search-stagnation-escape-plan.md already found for plain repairSearchFromGate restarts, independent of node budget. Sound and safe (zero regressions) but does not move solved-count; kept opt-in, not promoted. See docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE: 'production default-OFF; CLOSED, not promoted, no GHA spend (2026-08-13): withholds a slice of the main loop\'s late-suffix reserve specifically FROM the repair fallback loop, protecting the attraction-diversity pass\'s own room (ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION, orchestration.ts). A 20-level local sample at two node-budget scales (5M, 25M) across 4 flag combinations found the mechanism sound and safe (byte-identical solved sets in every arm/scale, zero regressions) but diversity-pass participation stayed flat at 1/20 regardless of scale or which reserve was on, with zero diversity-attributable wins -- unlike the sibling reserve\'s own pilot, which showed a stark participation shift before its GHA run, this one showed almost no movement at two scales, so no GHA A/B was dispatched. See docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: 'production default-OFF; CLOSED, not promoted (2026-08-13): withholds a slice of the admissible-order tier\'s own node reserve (ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION, orchestration.ts) from the tier\'s dominant \'default\' profile (ADMISSIBLE_ORDER_PROFILES, attempts.ts), which runs first and can otherwise consume the tier\'s entire pool before \'none\'/\'mustCrossFirst\'/\'intersectionHarvest\'/\'nearClosureRescue\' ever get a node. Direct tests confirmed the mechanism genuinely works (R03148: unsolved at fraction 0.15, solved at 0.40, matching the original report\'s 1.97M figure) -- but a targeted hunt for a \'default\'-winning level found a real regression on the FIRST candidate tried: R02644 (60M nodes) goes from SOLVED to unsolved at fraction 0.15 because \'default\' needed 13.2M of its 15M share and the reserve shrinks it to 12.75M. Double-edged, not just uncalibrated: real gains (R03148) and real losses (R02644) both exist at the same fraction. See docs/solver-opt-in-experiment-ledger.md -- needs population-scale gain/loss measurement across both failure shapes before any promotion decision, a materially larger investment not undertaken this session.',

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

/** Features whose production default is off. Shared by experiment constructors and the solver's
 * sparse-config normalizer so the two paths cannot silently disagree.
 *
 * Membership here is NOT a promotion-status signal. See
 * docs/solver-opt-in-experiment-ledger.md before deciding that an opt-in needs more testing. */
export const OPT_IN_FEATURES = new Set([
    'PRUNE_PORTAL_PARITY_ENVELOPE',
    'STRATEGY_REPAIR_ELITE_PREFIX_DFS',
    'STRATEGY_REPAIR_TURN_BIAS',
    'STRATEGY_REPAIR_FALLBACK_NODE_RESERVE',
    'STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE',
    'STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE',
    'STRATEGY_REPAIR_BEAM_SEED',
]);

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

/** Production defaults — the reference configuration. @returns {Record<string, any>} */
export function defaultConfig() {
    return Object.fromEntries(Object.keys(FEATURES).map(k => [k, !OPT_IN_FEATURES.has(k)]));
}

/** One feature disabled, all others at production defaults. @param {string} featureName @returns {Record<string, any>} */
export function withFeatureDisabled(featureName) {
    if (!(featureName in FEATURES)) throw new Error(`Unknown feature: ${featureName}`);
    const cfg = defaultConfig();
    cfg[featureName] = false;
    return cfg;
}

/** Multiple features disabled, all others at production defaults. @param {string[]} featureNames @returns {Record<string, any>} */
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
