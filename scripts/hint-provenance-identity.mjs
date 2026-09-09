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
// Deterministic, property-insertion-order-independent serialization: JSON.stringify preserves
// each object's own key insertion order, so two entries that are semantically identical but built
// by different producers (a freshly constructed makeProvenanceEntry() vs. a legacy persisted
// record round-tripped through upgradeProvenanceEntry()'s `{ ...raw, solver, search }` spread, or
// simply re-serialized after a JSON round-trip through a different engine/library) can carry the
// SAME fields in a DIFFERENT order and hash to two different identity strings here -- silently
// defeating the duplicate guard both call sites rely on. Sorting every object's own keys
// (recursively, at every nesting level -- `solver.forcing` is itself a nested object) removes that
// dependency entirely while keeping array element ORDER significant, which matters because arrays
// in this shape represent meaningful sequences (`forcingDisabledFeatures`, `forcingFlippedFilters`)
// where reordering elements changes what actually happened.
function stableStringify(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(v => stableStringify(v) ?? 'null').join(',')}]`;
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function provenanceEventIdentity(entry) {
    if (!entry || typeof entry !== 'object') return stableStringify(entry ?? null);
    const { foundAt: _foundAt, ...rest } = entry;
    const {
        elapsedMs: _elapsedMs,
        cumulativeElapsedMs: _cumulativeElapsedMs,
        cumulativeNodesExpanded: _cumulativeNodesExpanded,
        cumulativeBudgetMs: _cumulativeBudgetMs,
        // `budgetMs` is the ATTEMPT's allocated slice, not the caller's fixed timeBudgetMs: the
        // ladder divides remaining wall-clock across gates and configs, so it jitters run to run
        // (measured on P00110: 5862 vs 5872 for two runs of the same level at the same commit). It
        // is therefore the same class of host-dependent measurement as elapsedMs and must be
        // excluded here too -- otherwise this guard silently fails to recognise a re-run's entry as
        // a duplicate. Safe: an entry is only a duplicate if it ALSO matches on commit, config,
        // nodesExpanded, attemptIndex, gate, termination and seed, and a materially different
        // budget essentially never produces an identical node count.
        budgetMs: _budgetMs,
        ...search
    } = rest.search || {};
    return stableStringify({ ...rest, search });
}
