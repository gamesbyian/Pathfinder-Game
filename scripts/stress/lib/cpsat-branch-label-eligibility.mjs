// Shared CP-SAT branch-label eligibility. Requires a stored path to sample branches from; filters
// and flipping filters remain outside this reference-labelling scope. Portals are supported but costlier.
export function isEligibleForCpsatBranchLabeling(rawLevel) {
    const hasHint = !!(rawLevel.hintRecords || [])[0]?.path;
    const filterFree = !(rawLevel.filters && rawLevel.filters.length > 0);
    const flipperFree = !(rawLevel.flippingFilters && rawLevel.flippingFilters.length > 0);
    return hasHint && filterFree && flipperFree;
}

export function selectEligibleCpsatBranchLevels(corpusLevels) {
    return corpusLevels.filter(isEligibleForCpsatBranchLabeling);
}

/** Round-robin partition avoids positional hardness clustering across shards. */
export function selectShardByRoundRobin(eligibleLevels, shardIndex, shardCount) {
    return eligibleLevels.filter((_, i) => (i % shardCount) + 1 === shardIndex);
}

/** True when provenance already records a `cpsat-reference-probe` find for this level. */
export function isHarvestedByCpsat(rawLevel) {
    return (rawLevel.hintRecords || []).some(h =>
        (h.provenance || []).some(p => p.solver?.technique === 'cpsat-reference-probe'));
}

export function selectUnharvestedCpsatLevels(corpusLevels) {
    return selectEligibleCpsatBranchLevels(corpusLevels).filter(l => !isHarvestedByCpsat(l));
}
