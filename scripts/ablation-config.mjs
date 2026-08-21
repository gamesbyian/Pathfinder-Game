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
    STRATEGY_DEDUP_NEAR_TIE_RETENTION: 'production default-ON as of 2026-08-15 (DEDUP_NEAR_TIE_MARGIN, search.ts): beam state dedup keeps a collision\'s near-tied runner-up alongside its winner instead of discarding it outright. Recovers R02248, but a full-corpus GHA A/B at the real 50M node budget found this is NOT narrow -- net -7 on Corpus 2 (731 -> 724): 27 gained (R02248 among them), 34 lost, every flip in either direction sharing the same beam:intersectionHarvest@beam5000/beam:objectiveFirst@beam5000 signature (a level that used to solve in 4-35M nodes now exhausts the full 50M budget, or vice versa). Kept default-ON anyway pending STRATEGY_DEDUP_NEAR_TIE_RETRY below, which is meant to recover the 34 losses without giving back the 27 gains. See search.ts\'s DEDUP_NEAR_TIE_MARGIN comment and reports/2026-08-15-connectivity-axis-exhausted-regression.md.',
    STRATEGY_REPAIR_ELITE_PREFIX_DFS: 'production default-OFF; CLOSED for promotion in its current form / retained opt-in negative: bounded deterministic completion DFS from elite prefixes is sound and mechanistically real, but the dedicated equal-budget test was ON 4/20 vs OFF 5/20 with a confirmed shared-budget displacement. Do not buy a full Corpus-2 A/B for unchanged constants merely because the historical report listed one; reopen only after a materially cheaper/more selective variant clears a small retest. See reports/2026-08-07-repair-elite-prefix-dfs.md and docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_BEAM_SEED: 'production default-OFF; CLOSED, not promoted (2026-08-13): seeds repair\'s initial elite pool from a small, cheap beam search\'s surviving frontier (repairSearchFromGate\'s enableBeamSeed param, BEAM_SEED_WIDTH/BEAM_SEED_NODE_BUDGET/BEAM_SEED_TOP_K in repair-search.ts). An isolated repairSearchFromGate counterfactual (n=13, matched 2,000,000-node budget, bypassing the full ladder) found what looked like a real win (R00701: stuck at badness 2 without, fully solved with; 0 solve losses) -- but re-tested through the real solveLevel() ladder on the SAME sample at production-realistic budget (25M nodes), R00701 was ALREADY solved by ordinary repair fallback with the flag OFF: the isolated test\'s 2M-node direct budget was far more constrained than what ordinary repair actually gets inside the full ladder (REPAIR_EXTRA_BUDGET_FRACTION=6.0). Full-ladder result: 2/13 solved in both arms, byte-identical, +3.5% nodes for zero benefit. Sound and safe (zero regressions) but no full-ladder capability gain found. See docs/solver-opt-in-experiment-ledger.md.',
    STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY: 'production default-OFF; NEW/UNVALIDATED (2026-08-14): makes STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET recoverable instead of terminal. That mechanism shrinks a biased repair-probe tier on the ordinary tier\'s bestBadness, and nothing ever restores the withheld nodes -- no later tier re-runs the biased config -- so a mispredicted level loses whatever that tier would have found. Confirmed on Corpus-1 R00408 (ordinary badness 13 -> scale 0.46 -> 2.77M of 6M nodes; the shrunken tier IS the winning config, which solves in 9.97M total with the full budget and otherwise burns a 50M ceiling): matched level-blind A/B 93/102 ON vs 94/102 OFF. This flag re-runs each shrunk config at its FULL budget, but only AFTER the main loop, repair fallback and attraction-diversity pass have all failed, so levels that solve elsewhere keep the shrink\'s saving and the recovery cost lands only on levels already burning their whole ceiling. Carries its own node reserve (REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION) because a late tier without one is reliably starved. See reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md.',
    STRATEGY_DEDUP_NEAR_TIE_RETRY: 'PROMOTED to production default-ON (2026-08-15, same day as built): last-resort whole-ladder rerun with STRATEGY_DEDUP_NEAR_TIE_RETENTION disabled, tried DEAD LAST -- after the main loop, repair fallback, attraction-diversity, repair-probe-shrink-recovery, AND the admissible-order tier have all already failed on every gate (an earlier position before the admissible-order tier let this tier\'s own extended node ceiling silently starve that tier instead). Exists to recover the 34 Corpus-2 losses STRATEGY_DEDUP_NEAR_TIE_RETENTION\'s own full-corpus A/B found (see that flag\'s own comment) without giving back its 27 gains. Went through two more same-day design revisions before promotion: the FIRST shipped design (subtractive node reserve, ran before the admissible-order tier) population-tested at 707/1700 -- 33/34 losses recovered but 65 UNRELATED levels newly failed via an unconditional node-reserve tax on the whole corpus. Fixed by making the reserve ADDITIVE (extends the tier\'s own ceiling past nodeBudget instead of shrinking everyone else\'s) and moving the tier to run last. Re-validated at population scale (run 31902837955): 764/1700, +40 vs. the 724 with-fix baseline, with ZERO levels lost relative to baseline -- a strict superset of the baseline\'s solved set. Carries its own node reserve (DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION, orchestration.ts), additive as of the same promotion. See reports/2026-08-15-connectivity-axis-exhausted-regression.md.',
    STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: 'PROMOTED to production default-ON (2026-08-15, same day as built): applies STRATEGY_DEDUP_NEAR_TIE_RETRY\'s validated "run dead last, additive-only budget" pattern to ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION\'s own known double-edged shape -- that reserve recovers R03148 (\'none\' solves it cheaply reserve-off, never runs reserve-on since \'default\' eats the whole pool) but turns R02644 from SOLVED to unsolved at the same fraction, because \'default\' there genuinely needed the room the reserve shrinks. Instead of shrinking \'default\'\'s ceiling in the tier\'s own unreserved pass (so R02644-shaped levels are fully unaffected), this tier reruns ONLY the non-\'default\' profiles afterward, dead last (after even STRATEGY_DEDUP_NEAR_TIE_RETRY), with a fresh additive node ceiling (ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION, orchestration.ts) and a fresh additive prep._workCap override -- necessary even though this tier calls runAttempt directly rather than through the shared-pool runInterleavedAttempts/runGateSerialAttempts machinery dedup-retry\'s own work-starvation bug came from, since prep._workCap is a single mutable field neither function resets fresh for a runAttempt-direct caller this late in the ladder. Local validation found the mechanism\'s founding evidence (a 2026-07-30 report) had decayed -- \'default\' now needs ~7x more nodes than it did 16 days ago, unrelated to this change -- and corrected the reserve fraction from an initial useless 0.25 to 0.5 before any GHA spend. Population-scale GHA A/B (run 31910836458, against the 764/1700 STRATEGY_DEDUP_NEAR_TIE_RETRY-promoted baseline) confirmed 809/1700, +45, with ZERO levels lost relative to baseline -- a strict superset of the baseline\'s solved set, on the FIRST population attempt (no revision cycle needed, unlike STRATEGY_DEDUP_NEAR_TIE_RETRY\'s own two-revision history). See reports/2026-08-15-connectivity-axis-exhausted-regression.md.',
    STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: 'PROMOTED to production default-ON (2026-08-16, built the same day as STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY and directly modeled on both that tier and STRATEGY_DEDUP_NEAR_TIE_RETRY): applies the same "run dead last, additive-only budget" pattern to PRUNE_CONNECTIVITY_AXIS_EXHAUSTED itself -- the root flag this whole investigation started from. A single-attempt-config comparison (reports/2026-08-15-connectivity-axis-exhausted-regression.md\'s "This is not isolated to R02248" section) found disabling this flag entirely recovers R02114 and R00592 (referee-valid) -- the two originally-confirmed regressions STRATEGY_DEDUP_NEAR_TIE_RETRY\'s own near-tie retention does not reach -- but the same test found R03248 goes the OTHER way (solves flag-on, fails flag-off). Reruns the same mainConfigs ladder as STRATEGY_DEDUP_NEAR_TIE_RETRY, with PRUNE_CONNECTIVITY_AXIS_EXHAUSTED disabled via a Proxy override, a fresh additive node ceiling (CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION, orchestration.ts), and a fresh additive work allocation. R03248 is structurally protected the same way R02644 was: it already solves via the normal flag-on ladder, so this tier\'s own !result.solution guard skips it entirely. Population-validated (2026-08-16, GHA run 31918095910, vs the 31910836458 baseline): corpus1 95/95 identical solved-ID set (zero change); corpus2 809 to 819, +10 solves, ZERO regressions (R02114/R00592 both recovered as predicted, plus 8 more; R03248 confirmed unaffected). Cost rose more than either prior tier -- corpus1 nodes +18.7%/work +12.2%, corpus2 nodes +28.2%/work +22.1% -- reflecting that this flag gates a much hotter code path than either prior tier\'s own target; promoted anyway since the ladder\'s promotion bar is solved-count gain plus zero regressions, not cost neutrality. See reports/2026-08-15-connectivity-axis-exhausted-regression.md.',
    STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: 'production default-OFF; CLOSED, not promoted (2026-08-19): applies the "run dead last, additive-only budget" pattern (built 2026-08-16, the fourth application this session, modeled on the three promoted retry tiers) to STRATEGY_REPAIR_ELITE_PREFIX_DFS itself. That mechanism (reports/2026-08-07-repair-elite-prefix-dfs.md) is sound and mechanistically real (confirmed badness-improvement feedback loop) but net-negative in its own 20-level A/B (4/20 vs 5/20 with it off) due to a confirmed shared-node-budget displacement (R02239 solves via ordinary repair at 14,194,203 nodes with the mechanism off, exhausts the SAME repair call\'s own 15,000,000-node budget without solving when it\'s on). Reruns repairConfigs via the same per-config/per-gate manual loop shape as the ordinary repair fallback loop, with prep._cfg Proxy-overridden to force STRATEGY_REPAIR_ELITE_PREFIX_DFS: true (the OPPOSITE polarity from its three sibling tiers, which each disable a flag), a fresh additive node ceiling stacked on STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY\'s own ceiling, and a fresh additive prep._workCap override -- structurally eliminating the displacement (the ordinary loop always runs first, unaffected, at its own untouched budget). Validated on the original 20-level closest-miss sample at TWO retry budgets (7.5M and the full 15M matching the original report\'s own ON-arm scale): ZERO recoveries at either budget (scripts/stress/elite-prefix-dfs-retry-validate.mjs, run sharded across 10 parallel GHA jobs via .github/workflows/solver-elite-prefix-dfs-retry-validate.yml). Doubling the budget changed nothing, ruling out under-provisioning. Confirms the mechanism\'s real limitation was never budget competition (now structurally removed) but that elitePrefixDfsRepair itself lacks the power to close these particular gaps at these budgets -- the original report\'s own evidence (badness improving 4->3) was always intermediate progress, never an actual extra solve, so this negative result is consistent with, not a reversal of, that report\'s own findings. Kept in the codebase (opt-in, zero production risk, sound reusable infrastructure) but NOT a promotion candidate without a materially different approach to the underlying operator itself. See reports/2026-08-07-repair-elite-prefix-dfs.md\'s "Follow-up (2026-08-19)" section and reports/2026-08-15-connectivity-axis-exhausted-regression.md.',
    STRATEGY_RETRY_TIER_NODE_STAIRCASE: 'production default-OFF (NEW, 2026-08-19): gives every config in a LADDER-RERUN tier its own slice of that tier\'s node reserve, instead of letting the first config consume all of it. Applies to the attraction-diversity pass and the two promoted whole-ladder retry tiers (STRATEGY_DEDUP_NEAR_TIE_RETRY, STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY); STRATEGY_MC_NEIGHBOR_BUDGET_RETRY already has this unconditionally. THE DEFECT: those runners divide budget BETWEEN configs in WORK units, but treat the node ceiling as a single shared ABSOLUTE cap with no per-config subdivision, and each tier sizes its fresh work budget as timeBudgetMs * fraction * DEFAULT_WORK_PER_MS -- where timeBudgetMs is a deliberately NON-BINDING 24h deadline under the capability protocol (deterministic=true). The work pool is then ~2.9e11 units, the work division never bites, and a non-terminating first config runs until the tier\'s node ceiling is gone. Measured per-attempt elapsed ms on R02119: main loop (which passes the EXTERNAL, binding work budget) divided correctly at 10782/473/496/482/1561, while diversity ran 685+0x7, dedup-near-tie 10896+0x7 and connectivity 21319+0x7. Same "denominated in TIME but stopped by nodeBudget" trap CLAUDE.md documents for the admissible-order tier, at a new call site. A 14-level sample of unsolved corpus-2 levels found the defect on a substantial minority: the rest have a first config that exhausts naturally, so the ladder proceeds normally and this flag is a no-op for them. THE MECHANISM: reuses the staircase the main loop\'s own late-reserve wiring already provides (lateConfigStart = 0, earlyConfigNodeBudget = cumulative nodes at tier entry), giving config i the cumulative cap entry + reserve*(i+1)/N; a config past its step is skipped rather than starving the rest, and later configs absorb whatever earlier ones left unused. THIS IS A REDISTRIBUTION, NOT A FREE WIN, and that is why it is opt-in: it caps the FIRST config at reserve/N, so a level whose retry-tier win came from config #1 spending the whole reserve would REGRESS. Both directions are real; only a full-corpus A/B on both corpora can price them. Do not promote on the strength of the mechanism argument alone.',
    STRATEGY_MC_NEIGHBOR_BUDGET_RETRY: 'PROMOTED to production default-ON (2026-08-19, same day as built): applies the validated "run dead last, additive-only budget" pattern (STRATEGY_DEDUP_NEAR_TIE_RETRY / STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY / STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY) to a FOURTH known double-edged mechanism: PRUNE_MC_NEIGHBOR_BUDGET. That prune was promoted default-ON on a strong population result (611/1700 OFF -> 665/1700 ON, 59 gained / 5 lost), and its five losses were individually diagnosed in reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md: the exact deterministic beam attempt that wins under OFF is still tried under ON, runs to a similar node count, and fails -- a bounded-width diverse-beam effect, not budget exhaustion. Three of those five (R00635, R02823, R02867) have since been recovered by unrelated solver work; R02119 and R02422 remained unsolved at the 2026-08-16 capability baseline (run 31918095910, 819/1700), and an isolated single-attempt-config comparison found BOTH recover at HEAD when the prune is disabled -- referee-valid, via exactly the winning configs that diagnosis named (beam:mustCrossFirst@beam2000 and beam:intersectionHarvest@beam5000(diverse)). Reruns the same mainConfigs ladder as its three sibling tiers with PRUNE_MC_NEIGHBOR_BUDGET disabled via a Proxy override, a fresh additive node ceiling stacked on the preceding tier\'s own ceiling (MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION, orchestration.ts), and a fresh additive work allocation. Unlike its three siblings it also carries a SOUNDNESS-BASED eligibility gate: prune-gauntlet.ts only ever reaches this prune when state.mustCrossMask !== 0, so on a level with prep.initialMustCrossMask === 0 the rerun would be bit-identical to the ladder that already ran and is skipped outright -- free on 44% of the unsolved Corpus-2 population (389 of 881). Levels the prune HELPS are structurally protected the same way R02644/R03248 were for the two prior tiers: they already solve via the normal flag-on ladder, so this tier\'s own !result.solution guard skips them entirely. Population-validated (2026-08-19, GHA run 32224200709, vs the 31918095910 baseline): corpus1 95/102 identical solved-ID set (zero change); corpus2 819 to 828, +9 solves (R02119, R02128, R02132, R02401, R02512, R02783, R02835, R02947, R03361), ZERO regressions. R02119 recovered as the isolated test predicted; R02422 did NOT recover in the population run. Re-verified directly (2026-08-19, post-promotion): the originally-claimed isolated recovery (beam:intersectionHarvest@beam5000(diverse) solving in 50,333,677 nodes) does NOT reproduce at HEAD -- a fresh isolated re-run of that exact config against R02422 (PRUNE_MC_NEIGHBOR_BUDGET explicitly disabled) exhausts its own frontier naturally at 304,635 nodes, and a fresh trace of the SAME config inside the actual promoted retry tier (prune disabled via the tier\'s own Proxy) exhausts at 304,932 nodes -- functionally identical, ruling out both budget-starvation (the tier\'s reserve was never the constraint; the search ran dry on its own) and the prune setting itself (near-identical exhaustion whether PRUNE_MC_NEIGHBOR_BUDGET is on or off). The originally-recorded 50M-node figure does not currently reproduce; not established whether it was a documentation/attribution error or whether unrelated solver changes since it was recorded have altered this level\'s beam behavior -- not investigated further, since it does not affect the promotion decision (which rests on the independently-verified population A/B above, not on this one level\'s backstory). Cost: corpus1 nodes +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% -- comparable to (and on corpus2, cheaper than) STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY\'s own promoted cost (+18.7%/+12.2% corpus1, +28.2%/+22.1% corpus2); promoted per the same established bar -- solved-count gain plus zero regressions, not cost neutrality.',
    STRATEGY_REPAIR_LATE_PROBE: 'PROMOTED to production default-ON (2026-08-21, one day after being built). Priority 7 (docs/solver-optimization-current-queue.md): needsRepairFallback structurally excludes 94 of 158 currently-unsolved Corpus-2 levels where repair wins in the census (18 of those in <=1,000,000 nodes), and widening that gate directly was rejected -- a matched-comparison feature analysis found no single/pair feature cleanly separates the winning population from the much larger ineligible population that never wins. This tier sidesteps the "which levels" question by trying a single plain repair attempt on every level repairConfigs left empty, but ONLY dead last, after the entire rest of the ladder (including STRATEGY_MC_NEIGHBOR_BUDGET_RETRY, the current true end) has already failed -- unlike the existing early repair PROBE (runRepairProbe), which already documented the cost of running unconditionally before the main loop ("burns its FULL node budget as pure dead search every single solve" on a level that never succeeds, confirmed on R02401, ~10.7s of unconditional overhead per solve). Dead-last placement means a level that solves via any earlier technique never reaches this tier at all, so it costs nothing there regardless of budget size; the cost lands only on levels already reporting unsolved. Sized as a flat REPAIR_LATE_PROBE_NODE_BUDGET (2,000,000 nodes, orchestration.ts) -- not a fraction of nodeBudget/timeBudgetMs like the five whole-ladder-rerun tiers above it, since this tier is meant to be cheap and tightly bounded, not thorough (mirroring REPAIR_PROBE_ORDINARY_NODE_BUDGET\'s own flat-constant shape). Population-validated (2026-08-21, GHA runs 32453248184 flag-on vs 32459711208 flag-off, both main@e5034e8c, deterministic): corpus1 96/102 vs 95/102, corpus2 881/1700 vs 863/1700 -- +19 net gains (+1 corpus1, +18 corpus2), ZERO regressions on either corpus. Promoted per the established bar (solved-count gain plus zero regressions).',
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
    STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: 'production default-OFF; CLOSED NEGATIVE, population-validated (2026-08-13 built, 2026-08-19 population-tested): withholds a slice of the admissible-order tier\'s own node reserve (ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION, orchestration.ts) from the tier\'s dominant \'default\' profile (ADMISSIBLE_ORDER_PROFILES, attempts.ts), which runs first and can otherwise consume the tier\'s entire pool before \'none\'/\'mustCrossFirst\'/\'intersectionHarvest\'/\'nearClosureRescue\' ever get a node. Direct single-level tests confirmed the mechanism genuinely works (R03148: unsolved at fraction 0.15, solved at 0.40) and is genuinely double-edged (R02644: SOLVED to unsolved at fraction 0.15, needing 13.2M of a 15M share \'default\' no longer gets) -- but the full-corpus GHA A/B at the shipped fraction (0.15) this double-edged evidence called for (run 32252988428, vs the 32224200709 baseline) settles it cleanly negative: corpus1 95/102 unchanged; corpus2 828 -> 824, **0 gained, 4 lost** (R00059/R01504/R02623/R03266 -- neither R03148 nor R02644 among the flip set, since both were already solved/unsolved respectively before this flag was even applied at this baseline, independent of it). Node/work cost essentially flat (-0.02%/-0.05%, noise). Fails the promotion bar decisively -- zero gains means there is nothing to build a recovery mechanism for; the fix is simply staying default-OFF, which is already the case. See docs/solver-opt-in-experiment-ledger.md. Reopen only with a materially different fraction/formulation, not a re-run at 0.15.',

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
    'STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY',
    'STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY',
    'STRATEGY_RETRY_TIER_NODE_STAIRCASE',
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
