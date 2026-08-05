/**
 * Shared eligibility filter for atlas-growing tools (atlas-sweep.mjs / prune-gap-probe.mjs
 * batch driving): a level is only worth spending a shard's CP-SAT budget on if it can actually
 * produce a labelled branch.
 *
 * WHY. Confirmed empirically 2026-08-05 (see docs/solver-shadow-eval-harness.md's Part 5): every
 * level in a 340-level real sweep sample with portals>0 or flippingFilters>0 returned CP-SAT
 * 'unknown' on every sampled branch in 1-2 seconds (nowhere near the 45s oracle_limit) -- meaning
 * cpsat-full-probe.py's model fails/errors fast on those mechanics rather than reasoning about
 * them, a structural scope gap no amount of oracle budget fixes (matches the same
 * portals/filters/flipping-filters carve-out already documented for the sibling oracle-comparison
 * probes -- axis-reach-probe.mjs, backward-exact-probe.mjs, pocket-bridge-probe.mjs). A level with
 * no stored hint is separately unusable: prune-gap-probe.mjs needs a known solution to walk and
 * sample sibling branches from.
 *
 * Filters (non-flipping) were not independently reproduced failing in that sample -- this
 * exclusion follows the sibling probes' documented scope rather than a directly observed failure
 * for that specific mechanic. Revisit if that ever needs re-checking.
 */
export function isEligibleForCpsatAtlas(rawLevel) {
    const hasHint = !!(rawLevel.hintRecords || [])[0]?.path;
    const portalFree = !(rawLevel.portals && rawLevel.portals.length > 0);
    const filterFree = !(rawLevel.filters && rawLevel.filters.length > 0);
    const flipperFree = !(rawLevel.flippingFilters && rawLevel.flippingFilters.length > 0);
    return hasHint && portalFree && filterFree && flipperFree;
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
