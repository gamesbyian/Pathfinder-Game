// Canonical typed transport boundary between full SolveOpts (as accepted by the sequential
// Solver.solveLevel / orchestration.ts) and race.mjs's createRacePool().solveLevel(), which
// reimplements only a narrow subset of the sequential ladder (see race.mjs's own
// RACE_SUPPORTED_STAGE_IDS doc comment: main-search + repair-fallback + goal-attraction-
// disabled-retry only — no node-budget, static-portfolio, admissible-order, or main-search-
// late-reserve concept at all).
//
// Historically every call site into the race pool (scripts/portfolio-solve-sweep.mjs's
// single-worker path, scripts/portfolio-solve-sweep-worker.mjs's forked-worker path, and
// scripts/stress/benchmark.mjs's --engine=raced path) built this subset by hand, inline, as a
// fresh object literal. That let two classes of bug ship silently:
//   - a SolveOpts field race.mjs never reads at all (e.g. workBudget, nodeBudget,
//     mainSearchLateReserveFractionOverride, admissibleOrder*) gets threaded into the literal by
//     a caller who assumes it's honored (scripts/stress/benchmark.mjs actually did this for
//     --work-budget), and race.mjs silently ignores it -- no warning, no error -- while any
//     report written afterwards still records the REQUESTED value as though it took effect.
//   - a field race.mjs reads under one canonical name but a caller only copies its legacy alias
//     (the 2026-08-29 goalAttractionDisabledRetryBudgetFractionOverride regression covered by
//     portfolio-solve-sweep-worker-node-test.mjs).
//
// RACE_LEVEL_OPTS_FIELDS is the exhaustive allowlist of SolveOpts fields race.mjs's
// createRacePool/runOneLevel actually consumes. toRaceLevelOpts() builds the transported object
// from that allowlist alone and THROWS on any other SolveOpts field a caller set to a
// non-undefined value, rather than dropping it -- so an option race.mjs can't honor either gets
// removed from the caller's request (drop it, or drop --race-pool-size/--engine=raced for that
// run) or blocks the run with a clear message; it can never again just silently vanish.
export const RACE_LEVEL_OPTS_FIELDS = Object.freeze([
    'timeBudgetMs',
    'ablation',
    'repairAdditiveBudgetMultiplierOverride',
    'goalAttractionDisabledRetryBudgetFractionOverride',
    // Legacy alias for the field above; race.mjs's runOneLevel dual-reads both (`??`), matching
    // the dual-read convention scripts/check-solveopts-transport-parity.mjs enforces elsewhere.
    'attractionDiversityBudgetFractionOverride',
]);

// Fields that are meaningful on the caller's SolveOpts but deliberately NOT forwarded to race.mjs
// because they are constant/implied for every raced call, not because race.mjs silently ignores
// a live value: every existing --race-pool-size caller already rejects schedulerMode values other
// than 'production' before racing is even attempted (race.mjs itself always races the production
// ladder and has no schedulerMode field of its own). Distinct from RACE_LEVEL_OPTS_FIELDS so a
// caller can still pass schedulerMode through the same shared solveOpts object used for the
// sequential branch without tripping the unsupported-field failure below.
const IGNORED_CONSTANT_FIELDS = Object.freeze(['schedulerMode']);

/**
 * Project a full SolveOpts-shaped object down to exactly the fields race.mjs's createRacePool
 * consumes. Throws loudly (rather than silently dropping) when the input carries any other
 * SolveOpts field set to a defined value, since that field would otherwise be dropped without a
 * trace and the resulting raced solve would not match what the caller actually requested.
 *
 * @param {object} solveOpts - the caller's full requested SolveOpts.
 * @returns {object} the exact options object to pass to createRacePool(...).solveLevel().
 */
export function toRaceLevelOpts(solveOpts = {}) {
    if (solveOpts.schedulerMode !== undefined && solveOpts.schedulerMode !== 'production') {
        throw new Error(
            `toRaceLevelOpts: schedulerMode "${solveOpts.schedulerMode}" was requested, but the raced engine always races the `
            + 'production ladder and has no schedulerMode concept of its own — racing this request would silently ignore the '
            + 'requested scheduler mode. Use schedulerMode: "production", or do not race this request.',
        );
    }
    const out = {};
    const rejected = [];
    for (const [key, value] of Object.entries(solveOpts)) {
        if (value === undefined) continue;
        if (IGNORED_CONSTANT_FIELDS.includes(key)) continue;
        if (RACE_LEVEL_OPTS_FIELDS.includes(key)) { out[key] = value; continue; }
        rejected.push(key);
    }
    if (rejected.length > 0) {
        throw new Error(
            `toRaceLevelOpts: SolveOpts field(s) not supported by the raced engine were requested and would be silently dropped: ${rejected.sort().join(', ')}. `
            + 'scripts/solver-parallel/race.mjs reimplements only main-search + repair-fallback + goal-attraction-disabled-retry '
            + '(see its RACE_SUPPORTED_STAGE_IDS) and has no nodeBudget/workBudget, static-portfolio, admissible-order, or '
            + 'main-search-late-reserve concept. Either omit these option(s) for this run, or do not race it '
            + '(drop --race-pool-size / use --engine=sequential).',
        );
    }
    return out;
}
