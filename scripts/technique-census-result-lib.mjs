import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

function canonicalFlagName(flag) {
    return String(flag)
        .replace(/^(?:PRUNE|STRATEGY|SCORE)_/, '')
        .toLowerCase()
        .replaceAll('_', '-');
}

export function normalizeTechniqueCensusIdentityLabel(label) {
    if (!label) return null;
    const [base, ...suffixes] = String(label).split('+');
    let canonicalBase;
    try { canonicalBase = normalizeAttemptIdentityKey(base); }
    catch { return String(label); }
    return suffixes.length ? canonicalBase + '+' + suffixes.join('+') : canonicalBase;
}

export function inferredVariantLabel(result) {
    if (result.variantLabel) return normalizeTechniqueCensusIdentityLabel(result.variantLabel);
    if (result.tier !== 'T1' || (result.techniqueKeys?.length ?? 0) !== 1 || !result.ablation) return null;
    const enabled = [...(result.ablation.enable ?? [])].sort().map(flag => `${canonicalFlagName(flag)}-on`);
    const disabled = [...(result.ablation.disable ?? [])].sort().map(flag => `${canonicalFlagName(flag)}-off`);
    const suffixes = [...enabled, ...disabled];
    const base = normalizeAttemptIdentityKey(result.techniqueKeys[0]);
    return suffixes.length ? base + '+' + suffixes.join('+') : null;
}

export function techniqueCensusIdentityKey(result) {
    return inferredVariantLabel(result)
        ?? (result.techniqueKeys?.[0] ? normalizeAttemptIdentityKey(result.techniqueKeys[0]) : null);
}

export function canonicalizeTechniqueCensusResult(result) {
    if (!result || typeof result !== 'object') return result;
    const techniqueKeys = Array.isArray(result.techniqueKeys)
        ? result.techniqueKeys.map(normalizeAttemptIdentityKey)
        : result.techniqueKeys;
    const normalized = { ...result, ...(techniqueKeys ? { techniqueKeys } : {}) };
    if (result.variantLabel) normalized.variantLabel = normalizeTechniqueCensusIdentityLabel(result.variantLabel);
    return normalized;
}

function comparablePayload(result) {
    result = canonicalizeTechniqueCensusResult(result);
    const {
        totalMs: _totalMs,
        variantLabel: _variantLabel,
        attempts: _attempts,
        ...stable
    } = result;
    return {
        ...stable,
        // Per-attempt wall time, like totalMs, varies with runner load for identical deterministic
        // work and is deliberately excluded from duplicate equality.
        attempts: result.attempts?.map(({ elapsedMs: _elapsedMs, ...rest }) => rest),
    };
}

export function dedupeTechniqueCensusResults(results) {
    const byCellId = new Map();
    let duplicatesRemoved = 0;
    for (const rawResult of results) {
        const result = canonicalizeTechniqueCensusResult(rawResult);
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
