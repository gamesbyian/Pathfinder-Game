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

/**
 * Technique-census hint capture historically persisted only `isolatedTechnique: true` plus the
 * winning solver attempt. That loses whether the solve came from base T1, a T1 variant/ablation,
 * a T3 pair, etc. The combine path already has the authoritative cell row in memory, so attach a
 * non-enumerable carrier to each attempt before hint capture. It deliberately does NOT serialize
 * back into combined-cells.json; the cell row already owns this information there and duplicating it
 * inside every attempt would substantially bloat the matrix. hint-provenance.ts consumes the carrier
 * and persists the compact source-cell object exactly once on the Hint provenance entry.
 */
function attachTechniqueCensusCellContext(result) {
    if (!Array.isArray(result?.attempts)) return result;
    const techniqueKeys = Array.isArray(result.techniqueKeys)
        ? result.techniqueKeys.map(normalizeAttemptIdentityKey)
        : [];
    const context = {
        cellId: result.cellId ?? null,
        tier: result.tier ?? null,
        variantLabel: inferredVariantLabel({ ...result, techniqueKeys }) ?? null,
        pairLabel: result.pairLabel ?? null,
        flagExperiment: result.flagExperiment ?? null,
        ablation: result.ablation ?? null,
        techniqueKeys,
    };
    const attempts = result.attempts.map(attempt => {
        if (!attempt || typeof attempt !== 'object') return attempt;
        const copy = { ...attempt };
        Object.defineProperty(copy, 'techniqueCensusCell', {
            value: context,
            enumerable: false,
            configurable: false,
            writable: false,
        });
        return copy;
    });
    return { ...result, attempts };
}

export function canonicalizeTechniqueCensusResult(result) {
    if (!result || typeof result !== 'object') return result;
    const techniqueKeys = Array.isArray(result.techniqueKeys)
        ? result.techniqueKeys.map(normalizeAttemptIdentityKey)
        : result.techniqueKeys;
    const normalized = { ...result, ...(techniqueKeys ? { techniqueKeys } : {}) };
    if (result.variantLabel) normalized.variantLabel = normalizeTechniqueCensusIdentityLabel(result.variantLabel);
    return attachTechniqueCensusCellContext(normalized);
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
        // work and is deliberately excluded from duplicate equality. The non-enumerable
        // techniqueCensusCell carrier also stays out of duplicate identity and persisted matrices.
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
