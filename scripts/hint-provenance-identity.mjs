/**
 * What makes two provenance entries the SAME discovery event.
 *
 * One definition, shared by the two places that need it, because they must agree exactly:
 *   - scripts/hint-capture-lib.mjs  — refuses to append an entry that duplicates one already stored
 *     (prevents the duplicate at the source, e.g. a workflow re-run at the same commit).
 *   - scripts/dedupe-hint-provenance.mjs — removes duplicates that were stored before that guard
 *     existed.
 * A drifted second copy of this rule would mean the writer creates duplicates the cleaner does not
 * recognise, or vice versa.
 *
 * `foundAt` and the wall-clock/cumulative measurements are excluded deliberately: they describe the
 * host and the moment, not the discovery. This repo already treats `elapsedMs` as untrustworthy
 * under contention (every parallel report carries `timingTrustworthy: false`). Two entries agreeing
 * on commit, config, budget, nodesExpanded, termination, seed and forcing describe the same find; a
 * differing millisecond count does not make them two.
 *
 * This exclusion is load-bearing, not cosmetic: a first pass at the cleanup required `elapsedMs` to
 * match too and consequently found only 24 of the 47 real duplicates, missing every double-append
 * whose two writes happened to sample the clock a millisecond apart.
 *
 * NOTE what is deliberately NOT excluded: `solver.version`. Two entries identical but for the commit
 * are two genuinely distinct runs, and that pair is the entire input to
 * scripts/stress/hint-cost-drift.mjs's cross-commit cost comparison. Collapsing them would delete
 * the only retroactive cost signal the repo has.
 */
export function provenanceEventIdentity(entry) {
    if (!entry || typeof entry !== 'object') return JSON.stringify(entry ?? null);
    const { foundAt: _foundAt, ...rest } = entry;
    const search = { ...rest.search };
    delete search.elapsedMs;
    delete search.cumulativeElapsedMs;
    delete search.cumulativeNodesExpanded;
    delete search.cumulativeBudgetMs;
    // `budgetMs` is the ATTEMPT's allocated slice, not the caller's fixed timeBudgetMs: the ladder
    // divides remaining wall-clock across gates and configs, so it jitters run to run (measured on
    // P00110: 5862 vs 5872 for two runs of the same level at the same commit). It is therefore the
    // same class of host-dependent measurement as elapsedMs and must be excluded here too --
    // otherwise this guard silently fails to recognise a re-run's entry as a duplicate. Safe: an
    // entry is only a duplicate if it ALSO matches on commit, config, nodesExpanded, attemptIndex,
    // gate, termination and seed, and a materially different budget essentially never produces an
    // identical node count.
    delete search.budgetMs;
    return JSON.stringify({ ...rest, search });
}
