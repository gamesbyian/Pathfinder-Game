/**
 * PG-I default-OFF research selection: protect a fixed globally top-scored
 * prefix, then grant the remaining beam seats in the ORIGINAL bucket-selected
 * order. Does not query witnesses, source IDs, depth, score thresholds or
 * external history. Source beam supplies already canonical ranked candidates.
 */
export function scoreProtectedBucketOverlay<T extends object>(
    globallyRanked: readonly T[],
    originallyBucketSelected: readonly T[],
    width: number,
    protectedTopCount: number,
): T[] {
    if (!Number.isSafeInteger(width) || width <= 0
        || !Number.isSafeInteger(protectedTopCount)
        || protectedTopCount < 0 || protectedTopCount > width) {
        throw new Error('PG-I source-only top-score protection has invalid width/floor');
    }
    const chosen = globallyRanked.slice(0, protectedTopCount);
    const retained = new Set(chosen);
    for (const candidate of originallyBucketSelected) {
        if (chosen.length >= width) break;
        if (retained.has(candidate)) continue;
        chosen.push(candidate);
        retained.add(candidate);
    }
    for (const candidate of globallyRanked) {
        if (chosen.length >= width) break;
        if (retained.has(candidate)) continue;
        chosen.push(candidate);
        retained.add(candidate);
    }
    return chosen;
}
