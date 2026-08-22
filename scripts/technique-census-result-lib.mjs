function canonicalFlagName(flag) {
    return String(flag)
        .replace(/^(?:PRUNE|STRATEGY|SCORE)_/, '')
        .toLowerCase()
        .replaceAll('_', '-');
}

export function inferredVariantLabel(result) {
    if (result.variantLabel) return result.variantLabel;
    if (result.tier !== 'T1' || (result.techniqueKeys?.length ?? 0) !== 1 || !result.ablation) return null;
    const enabled = [...(result.ablation.enable ?? [])].sort().map(flag => `${canonicalFlagName(flag)}-on`);
    const disabled = [...(result.ablation.disable ?? [])].sort().map(flag => `${canonicalFlagName(flag)}-off`);
    const suffixes = [...enabled, ...disabled];
    return suffixes.length ? `${result.techniqueKeys[0]}+${suffixes.join('+')}` : null;
}

export function techniqueCensusIdentityKey(result) {
    return inferredVariantLabel(result) ?? result.techniqueKeys?.[0] ?? null;
}

function comparablePayload(result) {
    const {
        totalMs: _totalMs,
        variantLabel: _variantLabel,
        ...stable
    } = result;
    return stable;
}

export function dedupeTechniqueCensusResults(results) {
    const byCellId = new Map();
    let duplicatesRemoved = 0;
    for (const result of results) {
        if (!result?.cellId) throw new Error('Technique census result is missing cellId');
        const prior = byCellId.get(result.cellId);
        if (!prior) {
            byCellId.set(result.cellId, result);
            continue;
        }
        if (JSON.stringify(comparablePayload(prior)) !== JSON.stringify(comparablePayload(result))) {
            throw new Error(`Conflicting duplicate technique-census result for ${result.cellId}`);
        }
        duplicatesRemoved++;
        // Keep the lower measured wall time only as a stable representative; wall time is deliberately
        // excluded from duplicate equality because identical deterministic work can vary with runner load.
        if ((result.totalMs ?? Infinity) < (prior.totalMs ?? Infinity)) byCellId.set(result.cellId, result);
    }
    return { results: [...byCellId.values()], duplicatesRemoved };
}
