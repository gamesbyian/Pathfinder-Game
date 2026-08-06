/**
 * Shared eligibility filter for atlas-growing tools (atlas-sweep.mjs / prune-gap-probe.mjs
 * batch driving): a level is only worth spending a shard's CP-SAT budget on if it can actually
 * produce a labelled branch.
 *
 * WHY (filters/flippingFilters). Confirmed empirically 2026-08-05 (see
 * docs/solver-shadow-eval-harness.md's Part 5): every level in a 340-level real sweep sample with
 * flippingFilters>0 returned CP-SAT 'unknown' on every sampled branch in 1-2 seconds (nowhere near
 * the 45s oracle_limit) -- meaning cpsat-full-probe.py's model fails/errors fast on that mechanic
 * rather than reasoning about it, a structural scope gap no amount of oracle budget fixes. Filters
 * (non-flipping) were never independently reproduced failing in that sample -- this exclusion
 * follows the sibling oracle-comparison probes' documented scope (axis-reach-probe.mjs,
 * backward-exact-probe.mjs, pocket-bridge-probe.mjs) rather than a directly observed failure for
 * that specific mechanic; revisit if that ever needs re-checking. A level with no stored hint is
 * separately unusable regardless of mechanics: prune-gap-probe.mjs needs a known solution to walk
 * and sample sibling branches from.
 *
 * PORTALS ARE NOW ADMITTED (2026-08-05). cpsat-full-probe.py gained real portal support (padded
 * horizon + goal-absorbing rule, two under-constraint bugs found and fixed) -- validated by two
 * genuinely cold, unpinned solves (one 4-pair level, one 6-pair level) independently accepted by
 * validateCandidatePath, though on a small sample, not exhaustively (see that file's own
 * "VALIDATION STATUS" docstring note). Portal levels use a measurably larger model (up to +7
 * padded timesteps) than portal-free ones, so expect them to run slower and time out more often at
 * the same oracle_limit -- a real cost, not a bug, and worth watching in sweep results rather than
 * assuming it behaves identically to the mechanic-light population this filter used to select for
 * exclusively.
 */
export function isEligibleForCpsatAtlas(rawLevel) {
    const hasHint = !!(rawLevel.hintRecords || [])[0]?.path;
    const filterFree = !(rawLevel.filters && rawLevel.filters.length > 0);
    const flipperFree = !(rawLevel.flippingFilters && rawLevel.flippingFilters.length > 0);
    return hasHint && filterFree && flipperFree;
}

export function selectEligibleAtlasLevels(corpusLevels) {
    return corpusLevels.filter(isEligibleForCpsatAtlas);
}

/**
 * Round-robin partition: level i (0-indexed, within the ALREADY-FILTERED eligible list) goes to
 * shard (i % shardCount) + 1. Deliberately not a contiguous range -- if any positional clustering
 * of "hard" vs "trivial" levels exists in the corpus (e.g. generation-batch groupings), a
 * contiguous slice could hand one shard a run of duds while another gets a run of gold; modulo
 * assignment spreads whatever the eligible list's actual ordering happens to contain evenly across
 * every shard regardless of shard_count.
 */
export function selectShardByRoundRobin(eligibleLevels, shardIndex, shardCount) {
    return eligibleLevels.filter((_, i) => (i % shardCount) + 1 === shardIndex);
}

/**
 * Has this level already been run through cpsat-hint-harvest.mjs? Checked by provenance, not by
 * mere hint presence -- a level's existing hint(s) may all come from the heuristic solver, and a
 * level already covered by CP-SAT should stay covered even after gaining a NEW non-CP-SAT hint
 * later. `solver.technique` is exactly the field makeProvenanceEntry('cpsat-full-probe', ...)
 * sets (modules/domain/hint-types.ts), so this is the same identity check hint-cost-drift.mjs and
 * friends use for provenance-based classification, not a re-derivation of it.
 */
export function isHarvestedByCpsat(rawLevel) {
    return (rawLevel.hintRecords || []).some(h =>
        (h.provenance || []).some(p => p.solver?.technique === 'cpsat-full-probe'));
}

export function selectUnharvestedCpsatLevels(corpusLevels) {
    return selectEligibleAtlasLevels(corpusLevels).filter(l => !isHarvestedByCpsat(l));
}
