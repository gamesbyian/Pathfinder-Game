import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

export function canonicalAction(action) {
    return normalizeAttemptIdentityKey(action);
}

export function canonicalPairKey(leftAction, rightAction) {
    return `${canonicalAction(leftAction)}\u0000${canonicalAction(rightAction)}`;
}

function effectMap(pair) {
    return new Map((pair.topEffects ?? []).map((effect) => [effect.feature, effect]));
}

function sign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
}

export function compareTechniqueNichePair(oldPair, freshPair, { persistentThreshold = 0.30 } = {}) {
    const oldEffects = effectMap(oldPair);
    const freshEffects = effectMap(freshPair);
    const commonFeatures = [...oldEffects.keys()].filter((feature) => freshEffects.has(feature));
    const common = commonFeatures.map((feature) => {
        const oldEffect = oldEffects.get(feature).standardizedDifference;
        const freshEffect = freshEffects.get(feature).standardizedDifference;
        const sameDirection = sign(oldEffect) === sign(freshEffect) && sign(oldEffect) !== 0;
        const persistent = sameDirection
            && Math.abs(oldEffect) >= persistentThreshold
            && Math.abs(freshEffect) >= persistentThreshold;
        return {
            feature,
            oldEffect,
            freshEffect,
            sameDirection,
            persistent,
            minAbsoluteEffect: Math.min(Math.abs(oldEffect), Math.abs(freshEffect)),
            absoluteEffectDelta: Math.abs(Math.abs(freshEffect) - Math.abs(oldEffect)),
        };
    }).sort((a, b) => b.minAbsoluteEffect - a.minAbsoluteEffect);

    const oldLeader = oldPair.topEffects?.[0] ?? null;
    const freshLeader = freshPair.topEffects?.[0] ?? null;
    const persistentFeatures = common.filter((row) => row.persistent);
    const directionalCommon = common.filter((row) => row.sameDirection);

    return {
        leftAction: canonicalAction(freshPair.leftAction),
        rightAction: canonicalAction(freshPair.rightAction),
        oldDisagreement: (oldPair.leftOnly ?? 0) + (oldPair.rightOnly ?? 0),
        freshDisagreement: (freshPair.leftOnly ?? 0) + (freshPair.rightOnly ?? 0),
        oldLeftOnly: oldPair.leftOnly ?? 0,
        oldRightOnly: oldPair.rightOnly ?? 0,
        freshLeftOnly: freshPair.leftOnly ?? 0,
        freshRightOnly: freshPair.rightOnly ?? 0,
        oldLeader: oldLeader ? { feature: oldLeader.feature, effect: oldLeader.standardizedDifference } : null,
        freshLeader: freshLeader ? { feature: freshLeader.feature, effect: freshLeader.standardizedDifference } : null,
        sameLeadingFeature: Boolean(oldLeader && freshLeader && oldLeader.feature === freshLeader.feature),
        commonTopFeatureCount: common.length,
        sameDirectionCommonTopFeatureCount: directionalCommon.length,
        persistentFeatures,
        commonTopFeatures: common,
        interpretation: persistentFeatures.length
            ? 'persistent-structural-niche'
            : common.length && directionalCommon.length === 0
                ? 'directionally-unstable'
                : 'no-persistent-top-feature-at-threshold',
        caveat: 'Each source artifact stores only its top eight univariate effects, so absence from commonTopFeatures is censored, not evidence of no effect.',
    };
}

export function compareTechniqueNicheSummaries(oldSummary, freshSummary, options = {}) {
    if (!Array.isArray(oldSummary?.pairs) || !Array.isArray(freshSummary?.pairs)) {
        throw new Error('Expected oldSummary.pairs and freshSummary.pairs arrays');
    }
    const oldByPair = new Map(oldSummary.pairs.map((pair) => [canonicalPairKey(pair.leftAction, pair.rightAction), pair]));
    const comparisons = [];
    const unmatchedFreshPairs = [];
    for (const freshPair of freshSummary.pairs) {
        const key = canonicalPairKey(freshPair.leftAction, freshPair.rightAction);
        const oldPair = oldByPair.get(key);
        if (!oldPair) {
            unmatchedFreshPairs.push({ leftAction: freshPair.leftAction, rightAction: freshPair.rightAction });
            continue;
        }
        comparisons.push(compareTechniqueNichePair(oldPair, freshPair, options));
    }
    const freshKeys = new Set(freshSummary.pairs.map((pair) => canonicalPairKey(pair.leftAction, pair.rightAction)));
    const unmatchedOldPairs = oldSummary.pairs
        .filter((pair) => !freshKeys.has(canonicalPairKey(pair.leftAction, pair.rightAction)))
        .map((pair) => ({ leftAction: pair.leftAction, rightAction: pair.rightAction }));

    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development-temporal-holdout-extension',
        persistentThreshold: options.persistentThreshold ?? 0.30,
        comparedPairCount: comparisons.length,
        persistentPairCount: comparisons.filter((row) => row.persistentFeatures.length).length,
        comparisons,
        unmatchedFreshPairs,
        unmatchedOldPairs,
        interpretationBoundary: 'Extends the existing 2026-09-05 leading-feature temporal-drift result across the stored top-eight effects. A persistent separator is stronger nomination evidence than a one-snapshot association, but remains correlational and outcome-selected; it must still earn family/mechanism/held-out evidence before production steering.',
    };
}
