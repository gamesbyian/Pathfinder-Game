export const STATIC_FEATURE_KEYS = [
    'w', 'h', 'area', 'aspect', 'reqLen', 'reqInt', 'requiredPathCoverageRatio',
    'gates', 'blocks', 'mustPass', 'mustCross', 'portalPairs', 'flippers', 'staticFilters',
    'geese', 'falseGoals', 'surround', 'mustTurn', 'adjTurn',
];

export const PRODUCTION_NUMERIC_KEYS = ['productionNodes', 'productionWork', 'productionAttemptCount'];

const mean = xs => xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null;
const stddev = (xs, m) => xs.length ? Math.sqrt(mean(xs.map(x => (x - m) ** 2))) : null;

export function numericEffect(controlRows, frontierRows, accessor, feature) {
    const control = controlRows.map(accessor).filter(Number.isFinite);
    const frontier = frontierRows.map(accessor).filter(Number.isFinite);
    const controlMean = mean(control);
    const frontierMean = mean(frontier);
    if (controlMean === null || frontierMean === null) {
        return { feature, controlN: control.length, frontierN: frontier.length, controlMean, frontierMean, standardizedDifference: null };
    }
    const controlSd = stddev(control, controlMean);
    const frontierSd = stddev(frontier, frontierMean);
    const pooled = Math.sqrt((((controlSd ?? 0) ** 2) + ((frontierSd ?? 0) ** 2)) / 2);
    return {
        feature,
        controlN: control.length,
        frontierN: frontier.length,
        controlMean,
        frontierMean,
        standardizedDifference: pooled ? (frontierMean - controlMean) / pooled : 0,
    };
}

export function binaryContrast(controlRows, frontierRows, predicate, feature) {
    const controlYes = controlRows.filter(predicate).length;
    const frontierYes = frontierRows.filter(predicate).length;
    const controlNo = controlRows.length - controlYes;
    const frontierNo = frontierRows.length - frontierYes;
    const controlRate = controlRows.length ? controlYes / controlRows.length : null;
    const frontierRate = frontierRows.length ? frontierYes / frontierRows.length : null;
    let a = frontierYes, b = frontierNo, c = controlYes, d = controlNo;
    const continuityCorrected = [a, b, c, d].some(x => x === 0);
    if (continuityCorrected) { a += 0.5; b += 0.5; c += 0.5; d += 0.5; }
    const oddsRatio = (a * d) / (b * c);
    return {
        feature,
        controlN: controlRows.length,
        frontierN: frontierRows.length,
        controlYes,
        frontierYes,
        controlRate,
        frontierRate,
        rateDifference: frontierRate === null || controlRate === null ? null : frontierRate - controlRate,
        oddsRatioFrontierVsControl: oddsRatio,
        continuityCorrected,
    };
}

function categoryCounts(subset, accessor) {
    const counts = {};
    for (const row of subset) {
        const value = accessor(row) ?? '(null)';
        counts[value] = (counts[value] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

export function buildFrontierContrast(controlRows, frontierRows, controlLabel) {
    const staticNumericEffects = STATIC_FEATURE_KEYS.map(key =>
        numericEffect(controlRows, frontierRows, row => row.staticFeatures?.[key], key))
        .sort((a, b) => Math.abs(b.standardizedDifference ?? 0) - Math.abs(a.standardizedDifference ?? 0));
    const productionTelemetryEffects = PRODUCTION_NUMERIC_KEYS.map(key =>
        numericEffect(controlRows, frontierRows, row => row[key], key))
        .sort((a, b) => Math.abs(b.standardizedDifference ?? 0) - Math.abs(a.standardizedDifference ?? 0));

    const presencePredicates = {
        portalBearing: row => (row.staticFeatures?.portalPairs ?? 0) > 0,
        mustCrossBearing: row => (row.staticFeatures?.mustCross ?? 0) > 0,
        mustPassBearing: row => (row.staticFeatures?.mustPass ?? 0) > 0,
        blockBearing: row => (row.staticFeatures?.blocks ?? 0) > 0,
        flipperBearing: row => (row.staticFeatures?.flippers ?? 0) > 0,
        staticFilterBearing: row => (row.staticFeatures?.staticFilters ?? 0) > 0,
        gooseBearing: row => (row.staticFeatures?.geese ?? 0) > 0,
        falseGoalBearing: row => (row.staticFeatures?.falseGoals ?? 0) > 0,
        surroundBearing: row => (row.staticFeatures?.surround ?? 0) > 0,
        mustTurnBearing: row => (row.staticFeatures?.mustTurn ?? 0) > 0,
        adjacentTurnBearing: row => (row.staticFeatures?.adjTurn ?? 0) > 0,
        triplePortalMustCrossIntersectionHeavy: row => (row.staticFeatures?.portalPairs ?? 0) > 0
            && (row.staticFeatures?.mustCross ?? 0) > 0 && row.routingRegime === 'intersection-heavy',
    };
    const staticPresenceContrasts = Object.entries(presencePredicates)
        .map(([feature, predicate]) => binaryContrast(controlRows, frontierRows, predicate, feature))
        .sort((a, b) => Math.abs(b.rateDifference ?? 0) - Math.abs(a.rateDifference ?? 0));

    const routingRegimes = [...new Set(controlRows.concat(frontierRows).map(row => row.routingRegime))].sort();
    const routingRegimeContrasts = routingRegimes
        .map(regime => binaryContrast(controlRows, frontierRows, row => row.routingRegime === regime, regime))
        .sort((a, b) => Math.abs(b.rateDifference ?? 0) - Math.abs(a.rateDifference ?? 0));

    return {
        controlLabel,
        controlN: controlRows.length,
        frontierLabel: 'class 5: no known rescuer after cross-evidence reconciliation',
        frontierN: frontierRows.length,
        interpretation: 'development contrast only; effects nominate mechanisms and strata, not production routing features',
        staticNumericEffects,
        staticPresenceContrasts,
        routingRegimeContrasts,
        productionTelemetryEffects,
        lifecycleBucketCounts: {
            control: categoryCounts(controlRows, row => row.bucket),
            frontier: categoryCounts(frontierRows, row => row.bucket),
        },
        bestBadnessTechniqueCounts: {
            control: categoryCounts(controlRows, row => row.bestBadnessTechnique),
            frontier: categoryCounts(frontierRows, row => row.bestBadnessTechnique),
        },
    };
}
