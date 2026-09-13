export const RESIDUAL_CLASSIFICATION_SCHEMA_VERSION = 1;

export const RESIDUAL_CLASS_LABELS = Object.freeze({
    1: 'known rescuer not offered',
    2: 'known rescuer offered but not reached or materially starved',
    3: 'known rescuer reached with comparable work but failed',
    4: 'no T1 winner but a historical production-context candidate exists',
    5: 'no known rescuer after cross-evidence reconciliation',
});

const FAMILY_STAGES = Object.freeze({
    repair: Object.freeze(['early-repair-search', 'late-repair-search', 'repair-fallback', 'late-repair-multiseed-retry', 'repair-elite-prefix-dfs-retry']),
    'admissible-order': Object.freeze(['admissible-order-fallback', 'admissible-order-alternate-tiebreak-retry']),
});

// variantLabel is bookkeeping, not a modified-condition signal. The corrected atlas deliberately
// keeps clean promoted entries such as turn-biased repair; ablation is the exclusionary condition.
export function isBaseT1CensusRow(row) {
    return row?.corpus === 'corpus2'
        && row.tier === 'T1'
        && row.techniqueKeys?.length === 1
        && !row.flagExperiment
        && !row.pairLabel
        && !row.ablation;
}

export function classifyKnownRescuer(win, { offeredLadder = new Set(), dispatchedIdentities = new Set(), reachedSet = new Set(), starvedSet = new Set() } = {}) {
    const family = String(win.identity).split('|', 1)[0];
    const dispatched = dispatchedIdentities.has(win.identity);
    let classification;
    let familyReached = null;
    let familyStarved = null;
    let offered = null;

    if (family === 'beam' || family === 'dfs') {
        offered = offeredLadder.has(win.identity);
        if (!offered) classification = 1;
        else if (!dispatched) classification = 2;
        else classification = 3;
    } else {
        const stages = FAMILY_STAGES[family] ?? [];
        familyReached = stages.some(stage => reachedSet.has(stage));
        familyStarved = stages.some(stage => starvedSet.has(stage));
        if (!familyReached && !dispatched) classification = 1;
        else if (dispatched && !familyStarved) classification = 3;
        else classification = 2;
    }

    return { ...win, family, offered, dispatched, familyReached, familyStarved, class: classification };
}

export function classifyResidualLevel({
    t1Wins = [], provenanceRescuer = null, offeredLadder = new Set(), dispatchedIdentities = new Set(),
    reachedSet = new Set(), starvedSet = new Set(),
} = {}) {
    const classifiedWins = t1Wins.map(win => classifyKnownRescuer(win, {
        offeredLadder, dispatchedIdentities, reachedSet, starvedSet,
    }));
    const hasClass1 = classifiedWins.some(win => win.class === 1);
    const hasClass2 = classifiedWins.some(win => win.class === 2);
    const hasClass3 = classifiedWins.some(win => win.class === 3);
    const noT1Winner = t1Wins.length === 0;
    const hasClass4 = noT1Winner && provenanceRescuer != null;
    const hasClass5 = noT1Winner && provenanceRescuer == null;
    const primaryClass = hasClass1 ? 1 : hasClass2 ? 2 : hasClass3 ? 3 : hasClass4 ? 4 : 5;

    return {
        schemaVersion: RESIDUAL_CLASSIFICATION_SCHEMA_VERSION,
        t1WinMultiplicity: t1Wins.length,
        t1Wins: classifiedWins,
        provenanceRescuer,
        primaryClass,
        classes: { 1: hasClass1, 2: hasClass2, 3: hasClass3, 4: hasClass4, 5: hasClass5 },
    };
}

export function summarizeResidualClasses(rows) {
    const count = predicate => rows.filter(predicate).length;
    return Object.fromEntries([1, 2, 3, 4, 5].map(cls => [cls, {
        label: RESIDUAL_CLASS_LABELS[cls],
        primary: count(row => row.primaryClass === cls),
        any: count(row => row.classes?.[cls] === true),
    }]));
}
