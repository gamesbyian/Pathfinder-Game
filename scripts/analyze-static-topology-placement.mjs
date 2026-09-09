#!/usr/bin/env node
/**
 * Derive legal, level-blind static topology/placement features and test whether they add held-out
 * predictive value beyond the existing coarse structural features. This is offline observational
 * analysis only: level IDs define a deterministic interleaved split and are never candidate solver
 * inputs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LEVELS = 'data/stress/stress-levels-random.json';
const DEFAULT_CAPABILITY = 'reports/stress/technique-niches/2026-09-03/level-capability.json';
const DEFAULT_PRODUCTION = 'reports/stress/solver-corpus2-latest.json';
const DEFAULT_RESCUES = 'reports/stress/cpsat-rescue-cohorts-2026-09-08.json';
const DEFAULT_OUTPUT = 'reports/stress/static-topology-placement-2026-09-08.json';

const BASELINE_FEATURES = [
    'requiredPathLength', 'requiredIntersections', 'requiredPathCoverageRatio',
    'constrainedObjects', 'portals', 'turnConstraintLoad', 'area',
];

const TOPOLOGY_FEATURES = [
    'gateGoalManhattanMinNorm', 'gateGoalCardinalDistanceMinNorm',
    'gateGoalPortalRelaxedDistanceMinNorm', 'gateGoalPortalBenefitNorm',
    'articulationCountNorm', 'bridgeCountNorm', 'degreeOneFraction', 'degreeTwoFraction',
    'maxDegreeTwoComponentFraction', 'obligationNearestNeighborMeanNorm',
    'obligationNearestNeighborMaxNorm', 'obligationClusterFraction',
    'obligationGoalDistanceMeanNorm', 'obligationGateDistanceMeanNorm',
    'obligationGateDistanceSpreadNorm', 'obligationNearArticulationFraction',
    'portalSpanMeanNorm', 'portalCrossRegionFraction',
];

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const keyOf = (x, y) => `${x},${y}`;
const pointOf = (key) => key.split(',').map(Number);
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function blockedKeys(raw) {
    const blocked = new Set();
    for (const entry of [...(raw.blocks ?? []), ...(raw.geese ?? []), ...(raw.falseGoals ?? [])])
        blocked.add(keyOf(entry.x, entry.y));
    for (const landmark of raw.landmarks ?? []) {
        if (/^(surround|adjacentTurn|decorative)/.test(landmark.role ?? ''))
            blocked.add(keyOf(landmark.x, landmark.y));
    }
    return blocked;
}

function buildCardinalGraph(raw) {
    const blocked = blockedKeys(raw);
    const graph = new Map();
    for (let y = 1; y <= raw.grid.h; y++) {
        for (let x = 1; x <= raw.grid.w; x++) {
            const key = keyOf(x, y);
            if (!blocked.has(key)) graph.set(key, []);
        }
    }
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [key, neighbors] of graph) {
        const [x, y] = pointOf(key);
        for (const [dx, dy] of directions) {
            const neighbor = keyOf(x + dx, y + dy);
            if (graph.has(neighbor)) neighbors.push(neighbor);
        }
    }
    return graph;
}

function articulationAndBridges(graph) {
    const discovery = new Map(), low = new Map(), parent = new Map();
    const articulation = new Set(), bridges = [];
    let time = 0;
    function visit(node) {
        discovery.set(node, ++time);
        low.set(node, discovery.get(node));
        let children = 0;
        for (const next of graph.get(node) ?? []) {
            if (!discovery.has(next)) {
                parent.set(next, node);
                children++;
                visit(next);
                low.set(node, Math.min(low.get(node), low.get(next)));
                if (!parent.has(node) && children > 1) articulation.add(node);
                if (parent.has(node) && low.get(next) >= discovery.get(node)) articulation.add(node);
                if (low.get(next) > discovery.get(node)) bridges.push([node, next]);
            } else if (parent.get(node) !== next) {
                low.set(node, Math.min(low.get(node), discovery.get(next)));
            }
        }
    }
    for (const node of graph.keys()) if (!discovery.has(node)) visit(node);
    return { articulation, bridges };
}

function bfsDistance(graph, starts, extraEdges = new Map()) {
    const distance = new Map(), queue = [];
    for (const start of starts) {
        if (!graph.has(start) || distance.has(start)) continue;
        distance.set(start, 0);
        queue.push(start);
    }
    for (let index = 0; index < queue.length; index++) {
        const current = queue[index], nextDistance = distance.get(current) + 1;
        for (const next of [...(graph.get(current) ?? []), ...(extraEdges.get(current) ?? [])]) {
            if (!graph.has(next) || distance.has(next)) continue;
            distance.set(next, nextDistance);
            queue.push(next);
        }
    }
    return distance;
}

function degreeTwoMaxComponent(graph) {
    const eligible = new Set([...graph].filter(([, neighbors]) => neighbors.length === 2).map(([key]) => key));
    const seen = new Set();
    let largest = 0;
    for (const start of eligible) {
        if (seen.has(start)) continue;
        const queue = [start];
        seen.add(start);
        let size = 0;
        for (let index = 0; index < queue.length; index++) {
            const current = queue[index];
            size++;
            for (const next of graph.get(current) ?? []) {
                if (!eligible.has(next) || seen.has(next)) continue;
                seen.add(next);
                queue.push(next);
            }
        }
        largest = Math.max(largest, size);
    }
    return largest;
}

function componentsWithoutArticulations(graph, articulation) {
    const component = new Map();
    let componentId = 0;
    for (const start of graph.keys()) {
        if (articulation.has(start) || component.has(start)) continue;
        const queue = [start];
        component.set(start, componentId);
        for (let index = 0; index < queue.length; index++) {
            for (const next of graph.get(queue[index]) ?? []) {
                if (articulation.has(next) || component.has(next)) continue;
                component.set(next, componentId);
                queue.push(next);
            }
        }
        componentId++;
    }
    return component;
}

function obligationPoints(raw) {
    const points = [];
    const add = (entries) => { for (const entry of entries ?? []) points.push([entry.x, entry.y]); };
    add(raw.mustPass);
    add(raw.mustCross);
    add(raw.filters);
    add(raw.flippingFilters);
    for (const portal of raw.portals ?? []) {
        points.push([portal.x1, portal.y1], [portal.x2, portal.y2]);
    }
    for (const landmark of raw.landmarks ?? []) {
        if (/^(surround|mustTurn|adjacentTurn)/.test(landmark.role ?? '')) points.push([landmark.x, landmark.y]);
    }
    return [...new Map(points.map((point) => [keyOf(...point), point])).values()];
}

const manhattan = (left, right) => Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]);
const minimumDistance = (point, targets) => targets.length ? Math.min(...targets.map((target) => manhattan(point, target))) : 0;

export function topologyPlacementFeatures(raw) {
    const graph = buildCardinalGraph(raw);
    const { articulation, bridges } = articulationAndBridges(graph);
    const areaScale = Math.max(1, raw.grid.w + raw.grid.h - 2);
    const liveScale = Math.max(1, graph.size);
    const gates = (raw.gates ?? []).map((entry) => [entry.x, entry.y]);
    const goal = [raw.goal.x, raw.goal.y];
    const gateKeys = gates.map((point) => keyOf(...point));
    const goalKey = keyOf(...goal);
    const cardinalDistances = bfsDistance(graph, gateKeys);
    const portalEdges = new Map();
    for (const portal of raw.portals ?? []) {
        const left = keyOf(portal.x1, portal.y1), right = keyOf(portal.x2, portal.y2);
        if (!portalEdges.has(left)) portalEdges.set(left, []);
        if (!portalEdges.has(right)) portalEdges.set(right, []);
        portalEdges.get(left).push(right);
        portalEdges.get(right).push(left);
    }
    const portalDistances = bfsDistance(graph, gateKeys, portalEdges);
    const cardinalGoal = cardinalDistances.get(goalKey) ?? areaScale * 2;
    const portalGoal = portalDistances.get(goalKey) ?? areaScale * 2;
    const degrees = [...graph.values()].map((neighbors) => neighbors.length);
    const obligations = obligationPoints(raw);
    const nearestNeighborDistances = obligations.map((point, index) => {
        const others = obligations.filter((_, other) => other !== index);
        return minimumDistance(point, others);
    });
    const gateDistances = obligations.map((point) => minimumDistance(point, gates));
    const gateDistanceMean = mean(gateDistances);
    const gateDistanceSpread = gateDistances.length
        ? Math.max(...gateDistances) - Math.min(...gateDistances) : 0;
    const closeObligations = nearestNeighborDistances.filter((distance) => distance <= 2).length;
    const nearArticulation = obligations.filter((point) => [...articulation].some((key) => {
        const articulationPoint = pointOf(key);
        return manhattan(point, articulationPoint) <= 1;
    })).length;
    const components = componentsWithoutArticulations(graph, articulation);
    let portalCrossRegion = 0;
    for (const portal of raw.portals ?? []) {
        const left = keyOf(portal.x1, portal.y1), right = keyOf(portal.x2, portal.y2);
        if (articulation.has(left) || articulation.has(right) || components.get(left) !== components.get(right))
            portalCrossRegion++;
    }
    const portalSpans = (raw.portals ?? []).map((portal) =>
        manhattan([portal.x1, portal.y1], [portal.x2, portal.y2]));

    return {
        gateGoalManhattanMinNorm: minimumDistance(goal, gates) / areaScale,
        gateGoalCardinalDistanceMinNorm: cardinalGoal / areaScale,
        gateGoalPortalRelaxedDistanceMinNorm: portalGoal / areaScale,
        gateGoalPortalBenefitNorm: Math.max(0, cardinalGoal - portalGoal) / areaScale,
        articulationCountNorm: articulation.size / liveScale,
        bridgeCountNorm: bridges.length / liveScale,
        degreeOneFraction: degrees.filter((degree) => degree <= 1).length / liveScale,
        degreeTwoFraction: degrees.filter((degree) => degree === 2).length / liveScale,
        maxDegreeTwoComponentFraction: degreeTwoMaxComponent(graph) / liveScale,
        obligationNearestNeighborMeanNorm: mean(nearestNeighborDistances) / areaScale,
        obligationNearestNeighborMaxNorm: (nearestNeighborDistances.length ? Math.max(...nearestNeighborDistances) : 0) / areaScale,
        obligationClusterFraction: obligations.length ? closeObligations / obligations.length : 0,
        obligationGoalDistanceMeanNorm: mean(obligations.map((point) => manhattan(point, goal))) / areaScale,
        obligationGateDistanceMeanNorm: gateDistanceMean / areaScale,
        obligationGateDistanceSpreadNorm: gateDistanceSpread / areaScale,
        obligationNearArticulationFraction: obligations.length ? nearArticulation / obligations.length : 0,
        portalSpanMeanNorm: mean(portalSpans) / areaScale,
        portalCrossRegionFraction: portalSpans.length ? portalCrossRegion / portalSpans.length : 0,
    };
}

function sigmoid(value) {
    if (value < -35) return 0;
    if (value > 35) return 1;
    return 1 / (1 + Math.exp(-value));
}

function fitLogistic(rows, featureNames, steps = 1800, learningRate = 0.08, lambda = 0.02) {
    const means = featureNames.map((feature) => mean(rows.map((row) => row.features[feature])));
    const scales = featureNames.map((feature, index) => {
        const variance = mean(rows.map((row) => (row.features[feature] - means[index]) ** 2));
        return Math.sqrt(variance) || 1;
    });
    const normalized = rows.map((row) => [1, ...featureNames.map((feature, index) =>
        (row.features[feature] - means[index]) / scales[index])]);
    const weights = new Array(featureNames.length + 1).fill(0);
    const positives = rows.filter((row) => row.label).length;
    const positiveWeight = rows.length / Math.max(1, 2 * positives);
    const negativeWeight = rows.length / Math.max(1, 2 * (rows.length - positives));
    for (let step = 0; step < steps; step++) {
        const gradient = new Array(weights.length).fill(0);
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const values = normalized[rowIndex];
            const prediction = sigmoid(values.reduce((sum, value, index) => sum + value * weights[index], 0));
            const sampleWeight = rows[rowIndex].label ? positiveWeight : negativeWeight;
            const error = (prediction - Number(rows[rowIndex].label)) * sampleWeight;
            for (let index = 0; index < weights.length; index++) gradient[index] += error * values[index];
        }
        for (let index = 1; index < weights.length; index++) gradient[index] += lambda * weights[index];
        for (let index = 0; index < weights.length; index++) weights[index] -= learningRate * gradient[index] / rows.length;
    }
    return { featureNames, means, scales, weights };
}

function predict(model, row) {
    let score = model.weights[0];
    for (let index = 0; index < model.featureNames.length; index++) {
        const value = (row.features[model.featureNames[index]] - model.means[index]) / model.scales[index];
        score += model.weights[index + 1] * value;
    }
    return sigmoid(score);
}

function auc(scored) {
    const sorted = [...scored].sort((left, right) => left.score - right.score);
    let rankSum = 0, rank = 1, positives = 0;
    for (let index = 0; index < sorted.length;) {
        let end = index + 1;
        while (end < sorted.length && sorted[end].score === sorted[index].score) end++;
        const averageRank = (rank + (rank + end - index - 1)) / 2;
        for (let item = index; item < end; item++) {
            if (sorted[item].label) { rankSum += averageRank; positives++; }
        }
        rank += end - index;
        index = end;
    }
    const negatives = sorted.length - positives;
    return positives && negatives ? (rankSum - positives * (positives + 1) / 2) / (positives * negatives) : null;
}

function standardizedEffects(rows, featureNames) {
    const positive = rows.filter((row) => row.label), negative = rows.filter((row) => !row.label);
    return featureNames.map((feature) => {
        const positiveValues = positive.map((row) => row.features[feature]);
        const negativeValues = negative.map((row) => row.features[feature]);
        const positiveMean = mean(positiveValues), negativeMean = mean(negativeValues);
        const variance = (values, valueMean) => mean(values.map((value) => (value - valueMean) ** 2));
        const pooled = Math.sqrt((variance(positiveValues, positiveMean) + variance(negativeValues, negativeMean)) / 2);
        return { feature, positiveMean, negativeMean, standardizedDifference: pooled ? (positiveMean - negativeMean) / pooled : 0 };
    }).sort((left, right) => Math.abs(right.standardizedDifference) - Math.abs(left.standardizedDifference));
}

function evaluateCrossFit(rows, featureNames) {
    const halves = [
        { train: rows.filter((row) => row.split === 'even'), test: rows.filter((row) => row.split === 'odd'), label: 'even-to-odd' },
        { train: rows.filter((row) => row.split === 'odd'), test: rows.filter((row) => row.split === 'even'), label: 'odd-to-even' },
    ];
    const folds = halves.map((fold) => {
        const model = fitLogistic(fold.train, featureNames);
        return {
            fold: fold.label,
            trainN: fold.train.length,
            trainPositives: fold.train.filter((row) => row.label).length,
            testN: fold.test.length,
            testPositives: fold.test.filter((row) => row.label).length,
            holdoutAuc: auc(fold.test.map((row) => ({ label: row.label, score: predict(model, row) }))),
        };
    });
    return { folds, meanHoldoutAuc: mean(folds.map((fold) => fold.holdoutAuc).filter(Number.isFinite)) };
}

function analyzeLabel(rows, labelName, labelOf) {
    const labelled = rows.filter((row) => labelOf(row) !== null).map((row) => ({ ...row, label: labelOf(row) }));
    const allFeatures = [...BASELINE_FEATURES, ...TOPOLOGY_FEATURES];
    return {
        label: labelName,
        population: labelled.length,
        positives: labelled.filter((row) => row.label).length,
        effects: {
            all: standardizedEffects(labelled, allFeatures),
            even: standardizedEffects(labelled.filter((row) => row.split === 'even'), allFeatures),
            odd: standardizedEffects(labelled.filter((row) => row.split === 'odd'), allFeatures),
        },
        models: {
            baseline: evaluateCrossFit(labelled, BASELINE_FEATURES),
            topologyPlacement: evaluateCrossFit(labelled, TOPOLOGY_FEATURES),
            combined: evaluateCrossFit(labelled, allFeatures),
        },
    };
}

export function analyzeTopologyPlacement({ levels, capability, production, rescues }) {
    const rawById = new Map(levels.map((row) => [row.id, row]));
    const capabilityById = new Map(capability.levels.filter((row) => row.corpus === 'corpus2')
        .map((row) => [row.levelId, row]));
    const productionById = new Map(production.levels.map((row) => [row.id, row]));
    assert(rawById.size === 1700 && capabilityById.size === 1700 && productionById.size === 1700,
        `Expected aligned 1700-level inputs; got ${rawById.size}/${capabilityById.size}/${productionById.size}`);
    const rescueIds = new Set(rescues.cohorts.productionUnsolved);
    const rows = [...rawById].sort(([left], [right]) => left.localeCompare(right)).map(([id, raw]) => {
        const capabilityRow = capabilityById.get(id), productionRow = productionById.get(id);
        assert(capabilityRow && productionRow, `Missing joined evidence for ${id}`);
        const suffix = Number(id.slice(1));
        const features = { ...capabilityRow.features, ...topologyPlacementFeatures(raw) };
        for (const feature of [...BASELINE_FEATURES, ...TOPOLOGY_FEATURES])
            assert(Number.isFinite(features[feature]), `${id} has non-finite ${feature}`);
        return {
            levelId: id,
            split: suffix % 2 === 0 ? 'even' : 'odd',
            productionSolved: productionRow.ok === true,
            isolatedOracleSolved: capabilityRow.isolatedOracleSolved,
            cpsatRescue: rescueIds.has(id),
            features,
        };
    });
    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development-cross-fit',
        featureDefinitions: {
            baseline: BASELINE_FEATURES,
            topologyPlacement: TOPOLOGY_FEATURES,
            notes: [
                'Cardinal topology excludes blocks, geese, false goals, and impassable landmarks.',
                'Portal-relaxed gate/goal distance adds optional bidirectional portal edges; it is a descriptor, not an exact legality bound.',
                'Articulation and bridge metrics use the static cardinal graph before portal edges.',
                'Even/odd level suffix is an interleaved analysis split, never a solver input.',
            ],
        },
        analyses: [
            analyzeLabel(rows, 'current-production-unsolved', (row) => !row.productionSolved),
            analyzeLabel(rows.filter((row) => !row.productionSolved), 'no-isolated-winner-among-current-production-misses',
                (row) => !row.isolatedOracleSolved),
            analyzeLabel(rows.filter((row) => !row.productionSolved), 'cpsat-rescue-among-current-production-misses',
                (row) => row.cpsatRescue),
        ],
        rowMaterialization: 'Omitted from the committed artifact; rerun this script to rebuild joined per-level rows.',
    };
}

function parseArgs(argv) {
    return new Map(argv.map((raw) => {
        const separator = raw.indexOf('=');
        if (separator < 0) throw new Error(`Expected --key=value, received ${raw}`);
        return [raw.slice(0, separator), raw.slice(separator + 1)];
    }));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const levelsPath = args.get('--levels') ?? DEFAULT_LEVELS;
    const capabilityPath = args.get('--capability') ?? DEFAULT_CAPABILITY;
    const productionPath = args.get('--production') ?? DEFAULT_PRODUCTION;
    const rescuesPath = args.get('--rescues') ?? DEFAULT_RESCUES;
    const outputPath = args.get('--out') ?? DEFAULT_OUTPUT;
    const result = analyzeTopologyPlacement({
        levels: JSON.parse(readFileSync(levelsPath, 'utf8')).levels,
        capability: JSON.parse(readFileSync(capabilityPath, 'utf8')),
        production: JSON.parse(readFileSync(productionPath, 'utf8')),
        rescues: JSON.parse(readFileSync(rescuesPath, 'utf8')),
    });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outputPath}`);
    for (const analysis of result.analyses) {
        console.log(`${analysis.label}: n=${analysis.population}, positives=${analysis.positives}, `
            + `AUC baseline/topology/combined=${analysis.models.baseline.meanHoldoutAuc.toFixed(3)}/`
            + `${analysis.models.topologyPlacement.meanHoldoutAuc.toFixed(3)}/${analysis.models.combined.meanHoldoutAuc.toFixed(3)}`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
