import assert from 'node:assert/strict';
import { analyzeTechniqueCensus, binaryMutualInformation,
    exactDiscordancePValue, renderTechniqueCensusSecondOrder,
    validateTechniqueBudgetCurves } from './technique-census-second-order.mjs';

const result = analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'a', levelPos: 1, techniqueKeys: ['beam|score=a|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 90 },
    // Exact duplicate input rows are audited and collapsed rather than inflating the analysis.
    { tier: 'T1', corpus: 'corpus2', levelId: 'a', levelPos: 1, techniqueKeys: ['beam|score=a|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 90 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'a', levelPos: 1, techniqueKeys: ['dfs|score=b|bias=none'], ok: false, status: 'node-budget-reached', nodesExpanded: 500 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'b', levelPos: 2, techniqueKeys: ['beam|score=a|bias=none|width=2000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 40 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'b', levelPos: 2, techniqueKeys: ['dfs|score=b|bias=none'], ok: true, status: 'success', nodesExpanded: 200 },
    // A partial technique must not receive an artificially favorable cover score.
    { tier: 'T1', corpus: 'corpus2', levelId: 'a', levelPos: 1, techniqueKeys: ['beam|score=partial|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 1 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'c', levelPos: 3, techniqueKeys: ['beam|score=a|bias=none|width=2000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 30 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'c', levelPos: 3, techniqueKeys: ['dfs|score=b|bias=none'], ok: false, status: 'node-budget-reached', nodesExpanded: 500 },
    { tier: 'T3', corpus: 'corpus2', levelId: 'c', levelPos: 3, techniqueKeys: ['beam|score=a|bias=none|width=2000|retention=plain', 'dfs|score=b|bias=none'], ok: false, status: 'exhausted', nodesExpanded: 10 },
] }, [
    { corpus: 'corpus2', levelId: 'a', wasSolvedByProduction: false },
    { corpus: 'corpus2', levelId: 'b', wasSolvedByProduction: false },
    { corpus: 'corpus2', levelId: 'c', wasSolvedByProduction: false },
], [100, 250], [], [
    { corpus: 'corpus2', id: 'a', ok: false, status: 'node-budget-reached', nodesExpanded: 900, workSpent: 1000 },
    { corpus: 'corpus2', id: 'b', ok: true, status: 'success', nodesExpanded: 400, workSpent: 500 },
]);

assert.deepEqual(result.inputAudit, {
    rawRows: 9, rawT1Rows: 8, eligibleT1Rows: 8, uniqueT1Cells: 7,
    duplicateT1Rows: 1, excludedNonT1Rows: 1,
});
assert.equal(result.multiplicity.productionUnsolved.levels, 3);
assert.equal(result.multiplicity.productionUnsolved.oracleSolved, 2);
assert.deepEqual(result.perfectRouter.map(row => row.productionUnsolved), [1, 2]);
assert.equal(binaryMutualInformation(40, 10, 10, 40).toFixed(3), '0.278');
assert.equal(binaryMutualInformation(0, 1, 1, 1).toFixed(3), '0.252');
assert.equal(exactDiscordancePValue(1, 20).toPrecision(3), '0.0000210');
assert.equal(exactDiscordancePValue(4, 4), 1);
assert.equal(exactDiscordancePValue(1000, 1000), 1,
    'large balanced census populations remain finite instead of overflowing binomial coefficients');
assert.ok(Number.isFinite(exactDiscordancePValue(900, 1100)) && exactDiscordancePValue(900, 1100) > 0,
    'large imbalanced populations retain a representable nonzero exact p-value');
assert.equal(result.completeTechniqueCover.eligibleTechniques, 2);
assert.deepEqual(result.greedyCostWeightedCover.map(row => row.technique), ['beam|score=a|bias=none|width=2000|retention=plain', 'dfs|score=b|bias=none']);
assert.deepEqual(result.greedyCoverageFirstCover.map(row => row.technique), ['beam|score=a|bias=none|width=2000|retention=plain', 'dfs|score=b|bias=none']);
assert.equal(result.populationCovers.productionUnsolved.oracleUnion, 2);
assert.deepEqual(result.populationCovers.productionUnsolved.coverageFirst.map(row => row.technique),
    ['beam|score=a|bias=none|width=2000|retention=plain', 'dfs|score=b|bias=none']);
assert.equal(result.populationCovers.productionSolved.oracleUnion, 0);
assert.equal(result.isolatedTechniqueEconomics.find(row => row.technique === 'dfs|score=b|bias=none').substitutedByCheaper, 0);
assert.equal(result.fragileLevels.length, 2);
assert.deepEqual(result.levelTechniquePhenotypes.map(row => [row.techniques, row.levels]), [
    [[], 1], [['beam|score=a|bias=none|width=2000|retention=plain'], 1], [['dfs|score=b|bias=none'], 1],
]);
assert.deepEqual(result.failureFingerprints, [
    { fingerprint: 'beam:exhausted|dfs:node-cap|admissible-order:not-sampled|repair:not-sampled', levels: 1 },
]);
assert.equal(result.bestConditionalByFailureStatus.length, 0, 'fixture strata stay below the 100-row report threshold');
assert.equal(result.productionCrossRun.matchedOracleLevels, 2);
assert.equal(result.productionCrossRun.productionFailedWithinIsolated1M, 1);
assert.equal(result.productionCrossRun.medianProductionToIsolatedNodeRatio, 451);
assert.deepEqual(result.solveHazards.find(row => row.technique === 'beam|score=a|bias=none|width=2000|retention=plain').intervals[0], {
    lower: 0, upper: 100, atRisk: 3, solves: 1, hazard: 1 / 3,
});
const gapCurves = result.techniqueBudgetCurves.populations.productionUnsolved;
const beamCurve = gapCurves.techniques.find(row => row.technique === 'beam|score=a|bias=none|width=2000|retention=plain');
const dfsCurve = gapCurves.techniques.find(row => row.technique === 'dfs|score=b|bias=none');
const partialCurve = gapCurves.techniques.find(row => row.technique === 'beam|score=partial|bias=none|width=2000|retention=plain');
assert.deepEqual(beamCurve.terminationCounts, { exhausted: 2, success: 1 });
assert.equal(beamCurve.maxObservedNodes, 90);
assert.equal(beamCurve.maxSolvedNodes, 90);
assert.deepEqual(beamCurve.caps.map(row => [row.nodeCap, row.solvesRetained, row.solvesLost]), [
    [100, 1, 0], [250, 1, 0],
], 'a success before the first cap remains retained');
assert.deepEqual(dfsCurve.caps.map(row => [row.nodeCap, row.solvesRetained, row.solvesLost]), [
    [100, 0, 1], [250, 1, 0],
], 'a later success is lost at the early cap and retained later');
assert.equal(dfsCurve.caps[0].simulatedCappedNodeSpend, 300,
    'node-capped failures contribute min(observed nodes, cap)');
assert.deepEqual(dfsCurve.tranches.map(row => row.simulatedIncrementalCappedNodeSpend), [300, 400],
    'incremental tranche spend is the exact change in simulated capped spend');
assert.equal(dfsCurve.tranches.reduce((sum, row) => sum + row.simulatedIncrementalCappedNodeSpend, 0),
    dfsCurve.caps.at(-1).simulatedCappedNodeSpend,
    'successive tranche expenditures reconcile to the final simulated capped spend');
assert.deepEqual(beamCurve.tranches.map(row => [row.atRiskAtStart, row.solvesInTranche]), [
    [3, 1], [0, 0],
], 'exhausted searches leave later risk sets at their actual frontier');
assert.deepEqual(dfsCurve.tranches.map(row => [row.atRiskAtStart, row.solvesInTranche]), [
    [3, 0], [3, 1],
], 'tranche hazards use only rows still at risk at the tranche start');
assert.equal(partialCurve.fullySampled, false);
assert.equal(partialCurve.caps[0].exclusiveSolvesAtEqualCap, null,
    'partial techniques are not treated as full-population equal-cap competitors');
assert.deepEqual(beamCurve.caps.map(row => row.exclusiveSolvesAtEqualCap), [1, 1],
    'equal-cap exclusivity ignores excluded partial cells but compares every complete technique');
assert.deepEqual(gapCurves.comparisonUniverse.excludedPartiallySampledTechniques, ['beam|score=partial|bias=none|width=2000|retention=plain']);
assert.equal(validateTechniqueBudgetCurves(result.techniqueBudgetCurves), result.techniqueBudgetCurves);
assert.throws(() => analyzeTechniqueCensus({ results: [] }, [], [250, 100]),
    /positive, strictly increasing safe integers/);
const invalidCurves = JSON.parse(JSON.stringify(result.techniqueBudgetCurves));
invalidCurves.populations.productionUnsolved.techniques[0].tranches[1]
    .simulatedIncrementalCappedNodeSpend++;
assert.throws(() => validateTechniqueBudgetCurves(invalidCurves), /Invalid budget curve/,
    'curve validation detects cumulative spend that no longer reconciles');
assert.deepEqual(result.productionMultiplicityRelationship.map(row => [row.multiplicity, row.productionSolveRate]), [
    ['1', 1], ['2', 0],
]);
assert.deepEqual(result.productionMarginRelationship.map(row => [row.margin, row.productionSolveRate]), [
    ['singleton', 1], ['2×+', 0],
]);
assert.deepEqual(result.productionFragilityMatrix.map(row =>
    [row.cheapestCost, row.multiplicity, row.productionSolveRate]), [
    ['≤500K', '1', 1], ['≤500K', '2', 0],
]);
const renderedFixture = renderTechniqueCensusSecondOrder(result, 'fixture');
assert.equal(renderTechniqueCensusSecondOrder(result, 'fixture'), renderedFixture,
    'deterministic input produces deterministic Markdown');
assert.equal(JSON.stringify(analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'x', levelPos: 1, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 5 },
] }, [{ corpus: 'corpus2', levelId: 'x', wasSolvedByProduction: false }], [10])),
JSON.stringify(analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'x', levelPos: 1, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 5 },
] }, [{ corpus: 'corpus2', levelId: 'x', wasSolvedByProduction: false }], [10])),
'deterministic input produces deterministic derived JSON');

const pathology = analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'gain', levelPos: 1, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 10 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'gain', levelPos: 1, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], variantLabel: 'beam|score=x|bias=none|width=2000|retention=plain+dedup-near-tie-retention-off', ok: true, status: 'success', nodesExpanded: 10 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'loss', levelPos: 2, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 10 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'loss', levelPos: 2, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], variantLabel: 'beam|score=x|bias=none|width=2000|retention=plain+dedup-near-tie-retention-off', ok: false, status: 'exhausted', nodesExpanded: 10 },
] }, [
    { corpus: 'corpus2', levelId: 'gain', wasSolvedByProduction: false },
    { corpus: 'corpus2', levelId: 'loss', wasSolvedByProduction: false },
], [100], [
    { id: 'gain', req: [20, 3], grid: [5, 6], objectDensity: 0.2, counts: { mustCross: 1, portals: 0 } },
    { id: 'loss', req: [10, 2], grid: [4, 5], objectDensity: 0.4, counts: { mustCross: 0, portals: 1 } },
]);
assert.equal(pathology.flagPathologies[0].gained.meanReqLen, 20);
assert.equal(pathology.flagPathologies[0].lost.meanObjectDensity, 0.4);
assert.equal(pathology.flagPathologies[0].gained.mechanicPrevalence.mustCross, 1);

const economics = analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'one', levelPos: 1, techniqueKeys: ['beam|score=objectiveFirst|bias=none|width=2000|retention=plain'], ok: true, status: 'success', nodesExpanded: 100 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'one', levelPos: 1, techniqueKeys: ['beam|score=objectiveFirst|bias=none|width=5000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 300 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'two', levelPos: 2, techniqueKeys: ['beam|score=objectiveFirst|bias=none|width=2000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 200 },
    { tier: 'T1', corpus: 'corpus2', levelId: 'two', levelPos: 2, techniqueKeys: ['beam|score=objectiveFirst|bias=none|width=5000|retention=plain'], ok: true, status: 'success', nodesExpanded: 400 },
] }, [
    { corpus: 'corpus2', levelId: 'one', wasSolvedByProduction: false },
    { corpus: 'corpus2', levelId: 'two', wasSolvedByProduction: false },
]);
const widthEconomics = economics.controlledComparisons.find(row => row.label === 'objective beam width');
assert.equal(widthEconomics.productionUnsolvedEconomics.additionalNodes, 400);
assert.equal(widthEconomics.productionUnsolvedEconomics.additionalNodesPerRightOnlySolve, 400);
assert.equal(widthEconomics.productionUnsolvedEconomics.leftMedianExhaustedNodes, 200);
assert.equal(widthEconomics.productionUnsolvedEconomics.rightMedianExhaustedNodes, 300);

const reverse = analyzeTechniqueCensus({ results: [
    { tier: 'T1', corpus: 'corpus2', levelId: 'reverse', levelPos: 1, techniqueKeys: ['beam|score=x|bias=none|width=2000|retention=plain'], ok: false, status: 'exhausted', nodesExpanded: 20 },
] }, [
    { corpus: 'corpus2', levelId: 'reverse', wasSolvedByProduction: true, solvedByT1: [] },
], [100], [], [], [
    { corpus: 'corpus2', id: 'reverse', ok: true, winningConfig: 'beam|score=x|bias=none|width=2000|retention=plain', lifecycleWinningTechnique: 'admissible-order', attemptCount: 3, nodesExpanded: 40 },
]);
assert.equal(reverse.reverseOracle.reproducedProductionSolved, 1);
assert.equal(reverse.reverseOracle.rows[0].matchingIsolatedStatus, 'exhausted');
assert.deepEqual(reverse.reverseOracle.winnerCounts, [{ technique: 'admissible-order', levels: 1 }]);
const renderedReverse = renderTechniqueCensusSecondOrder(reverse, 'fixture', {
    productionRun: 'later', frozenProductionRun: 'frozen',
});
assert.match(renderedReverse, /exact-production-commit fresh controls/i);
assert.match(renderedReverse, /lower-bound-cache clearing and progressively shorter attempt prefixes/);
assert.doesNotMatch(renderedReverse, /still need exact winning-attempt isolated controls/,
    'generated follow-up must not regress behind the completed exact-commit controls');

// Frozen census outputs remain research evidence. This harness owns the analyzer/math/rendering
// contracts using synthetic inputs; byte-for-byte regeneration of a dated run is an on-demand
// reproducibility operation, not an ordinary software-CI requirement.
console.log('technique-census second-order analyzer tests passed');
