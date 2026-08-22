#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeLevel, loadCorpus } from './corpus-query-lib.mjs';
import { techniqueCensusIdentityKey } from './technique-census-result-lib.mjs';

const DEFAULT_DIRECTORY = 'reports/stress/technique-census/32240161854';
const DEFAULT_PRODUCTION_RUN = 'reports/stress/capability-runs/32526927206';
const FROZEN_PRODUCTION_RUN = 'reports/stress/capability-runs/32459711208';
const DEFAULT_THRESHOLDS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
    10_000_000, 20_000_000, 50_000_000];

const levelKey = row => `${row.corpus}/${row.levelPos}`;
const pct = (value, denominator) => denominator ? `${(100 * value / denominator).toFixed(1)}%` : '—';
const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};
const techniqueFamily = technique => technique.startsWith('dfs:repair:') ? 'repair'
    : technique.split(':', 1)[0];
export const binaryMutualInformation = (both, aOnly, bOnly, neither) => {
    const total = both + aOnly + bOnly + neither;
    if (!total) return null;
    const cells = [[both, both + aOnly, both + bOnly], [aOnly, both + aOnly, aOnly + neither],
        [bOnly, bOnly + neither, both + bOnly], [neither, bOnly + neither, aOnly + neither]];
    return cells.reduce((sum, [count, rowTotal, columnTotal]) => count
        ? sum + count / total * Math.log2(count * total / (rowTotal * columnTotal)) : sum, 0);
};
export const exactDiscordancePValue = (leftOnly, rightOnly) => {
    const discordant = leftOnly + rightOnly;
    if (!discordant) return 1;
    const tail = Math.min(leftOnly, rightOnly);
    if (discordant < 1024) {
        let combination = 1;
        let cumulative = 1;
        for (let k = 1; k <= tail; k++) {
            combination = combination * (discordant - k + 1) / k;
            cumulative += combination;
        }
        return Math.min(1, 2 * cumulative / (2 ** discordant));
    }
    // Sum binomial coefficients in log space. The direct recurrence over C(n, k) overflows for
    // census-sized disagreement populations (n can exceed 1,000), turning an otherwise valid
    // exact test into NaN even though the final probability is representable.
    let logCombination = 0;
    let logCumulative = 0;
    for (let k = 1; k <= tail; k++) {
        logCombination += Math.log(discordant - k + 1) - Math.log(k);
        const high = Math.max(logCumulative, logCombination);
        logCumulative = high + Math.log(Math.exp(logCumulative - high) + Math.exp(logCombination - high));
    }
    return Math.min(1, 2 * Math.exp(logCumulative - discordant * Math.LN2));
};

export function analyzeTechniqueCensus(document, coverageRows, thresholds = DEFAULT_THRESHOLDS, descriptors = [], productionRows = [], frozenProductionRows = []) {
    const production = new Map(coverageRows.map(row => [`${row.corpus}/${row.levelId}`, row.wasSolvedByProduction]));
    const descriptorsById = new Map(descriptors.map(row => [row.id, row]));
    const cells = new Map();
    let rawT1Rows = 0;
    let excludedNonT1Rows = 0;
    let eligibleT1Rows = 0;
    let duplicateT1Rows = 0;
    for (const row of document.results ?? []) {
        if (row.tier === 'T1') rawT1Rows++;
        else { excludedNonT1Rows++; continue; }
        if (row.techniqueKeys?.length !== 1) continue;
        const technique = techniqueCensusIdentityKey(row);
        if (!technique) continue;
        eligibleT1Rows++;
        const key = `${levelKey(row)}\0${technique}`;
        const prior = cells.get(key);
        if (prior && (prior.ok !== row.ok || prior.status !== row.status || prior.nodesExpanded !== row.nodesExpanded)) {
            throw new Error(`Conflicting T1 readings for ${key}`);
        }
        if (prior) duplicateT1Rows++;
        else cells.set(key, { ...row, technique });
    }

    const byLevel = new Map();
    const byTechnique = new Map();
    for (const row of cells.values()) {
        const lk = levelKey(row);
        const solvedByProduction = production.get(`${row.corpus}/${row.levelId}`);
        const enriched = { ...row, solvedByProduction };
        if (!byLevel.has(lk)) byLevel.set(lk, []);
        if (!byTechnique.has(row.technique)) byTechnique.set(row.technique, []);
        byLevel.get(lk).push(enriched);
        byTechnique.get(row.technique).push(enriched);
    }

    const populations = {
        all: [...byLevel.keys()],
        productionSolved: [...byLevel].filter(([, rows]) => rows[0].solvedByProduction === true).map(([key]) => key),
        productionUnsolved: [...byLevel].filter(([, rows]) => rows[0].solvedByProduction === false).map(([key]) => key),
    };
    const levelSummary = populations.all.map(lk => {
        const winners = byLevel.get(lk).filter(row => row.ok).sort((a, b) => a.nodesExpanded - b.nodesExpanded);
        const costs = winners.map(row => row.nodesExpanded);
        return {
            levelKey: lk,
            solvedByProduction: byLevel.get(lk)[0].solvedByProduction,
            solverCount: winners.length,
            cheapestNodes: costs[0] ?? null,
            secondCheapestNodes: costs[1] ?? null,
            medianWinningNodes: median(costs),
            secondToFirstRatio: costs.length > 1 && costs[0] ? costs[1] / costs[0] : null,
        };
    });

    const multiplicity = {};
    for (const [name, keys] of Object.entries(populations)) {
        const rows = levelSummary.filter(row => keys.includes(row.levelKey));
        multiplicity[name] = {
            levels: rows.length,
            oracleSolved: rows.filter(row => row.solverCount > 0).length,
            zero: rows.filter(row => row.solverCount === 0).length,
            singleton: rows.filter(row => row.solverCount === 1).length,
            doubleton: rows.filter(row => row.solverCount === 2).length,
            medianSolverCountAmongSolved: median(rows.filter(row => row.solverCount).map(row => row.solverCount)),
            medianCheapestNodes: median(rows.filter(row => row.cheapestNodes != null).map(row => row.cheapestNodes)),
            medianSecondToFirstRatio: median(rows.filter(row => row.secondToFirstRatio != null).map(row => row.secondToFirstRatio * 1000)) / 1000,
        };
    }

    const perfectRouter = thresholds.map(nodeCap => ({
        nodeCap,
        productionUnsolved: levelSummary.filter(row => !row.solvedByProduction && row.cheapestNodes != null && row.cheapestNodes <= nodeCap).length,
        productionSolved: levelSummary.filter(row => row.solvedByProduction && row.cheapestNodes != null && row.cheapestNodes <= nodeCap).length,
    }));

    const techniquePairs = [];
    const techniques = [...byTechnique.keys()].sort();
    for (let i = 0; i < techniques.length; i++) for (let j = i + 1; j < techniques.length; j++) {
        const a = techniques[i], b = techniques[j];
        const aRows = new Map(byTechnique.get(a).map(row => [levelKey(row), row]));
        const bRows = new Map(byTechnique.get(b).map(row => [levelKey(row), row]));
        const common = [...aRows.keys()].filter(key => bRows.has(key));
        const aSolved = common.filter(key => aRows.get(key).ok);
        const bSolved = common.filter(key => bRows.get(key).ok);
        const intersection = aSolved.filter(key => bRows.get(key).ok).length;
        const union = new Set([...aSolved, ...bSolved]).size;
        const aOnly = aSolved.length - intersection;
        const bOnly = bSolved.length - intersection;
        const neither = common.length - union;
        techniquePairs.push({ a, b, common: common.length, aSolved: aSolved.length, bSolved: bSolved.length,
            intersection, union, jaccard: union ? intersection / union : null,
            disagreement: aOnly + bOnly,
            mutualInformationBits: binaryMutualInformation(intersection, aOnly, bOnly, neither) });
    }

    const conditional = [];
    for (const a of techniques) for (const b of techniques) {
        if (a === b) continue;
        const aRows = new Map(byTechnique.get(a).map(row => [levelKey(row), row]));
        const bRows = new Map(byTechnique.get(b).map(row => [levelKey(row), row]));
        const residual = [...aRows].filter(([key, row]) => row.solvedByProduction === false && !row.ok && bRows.has(key));
        const incremental = residual.filter(([key]) => bRows.get(key).ok).length;
        const expectedNodes = residual.reduce((sum, [key]) => sum + Number(bRows.get(key).nodesExpanded ?? 0), 0);
        conditional.push({ a, b, residual: residual.length, incremental,
            probability: residual.length ? incremental / residual.length : null,
            expectedBNodesOnResidual: residual.length ? Math.round(expectedNodes / residual.length) : null,
            incrementalPerBillionNodes: expectedNodes ? 1e9 * incremental / expectedNodes : null });
    }

    const conditionalByFailureStatus = [];
    for (const row of conditional) {
        const aRows = new Map(byTechnique.get(row.a).map(cell => [levelKey(cell), cell]));
        const bRows = new Map(byTechnique.get(row.b).map(cell => [levelKey(cell), cell]));
        for (const status of ['exhausted', 'node-budget-reached']) {
            const residual = [...aRows].filter(([key, cell]) => cell.solvedByProduction === false
                && !cell.ok && cell.status === status && bRows.has(key));
            const incremental = residual.filter(([key]) => bRows.get(key).ok).length;
            const nodes = residual.reduce((sum, [key]) => sum + Number(bRows.get(key).nodesExpanded ?? 0), 0);
            if (residual.length && incremental) conditionalByFailureStatus.push({
                a: row.a, b: row.b, failureStatus: status, residual: residual.length, incremental,
                probability: incremental / residual.length,
                expectedBNodesOnResidual: Math.round(nodes / residual.length),
                incrementalPerBillionNodes: nodes ? 1e9 * incremental / nodes : null,
            });
        }
    }

    const compare = (label, left, right, interpretation) => {
        const leftRows = new Map((byTechnique.get(left) ?? []).map(row => [levelKey(row), row]));
        const rightRows = new Map((byTechnique.get(right) ?? []).map(row => [levelKey(row), row]));
        const common = [...leftRows.keys()].filter(key => rightRows.has(key));
        const summarize = keys => ({
            common: keys.length,
            leftOnly: keys.filter(key => leftRows.get(key).ok && !rightRows.get(key).ok).length,
            rightOnly: keys.filter(key => !leftRows.get(key).ok && rightRows.get(key).ok).length,
            both: keys.filter(key => leftRows.get(key).ok && rightRows.get(key).ok).length,
            neither: keys.filter(key => !leftRows.get(key).ok && !rightRows.get(key).ok).length,
        });
        const gapKeys = common.filter(key => leftRows.get(key).solvedByProduction === false);
        const leftNodes = gapKeys.map(key => Number(leftRows.get(key).nodesExpanded ?? 0));
        const rightNodes = gapKeys.map(key => Number(rightRows.get(key).nodesExpanded ?? 0));
        const leftExhaustedNodes = gapKeys.filter(key => leftRows.get(key).status === 'exhausted')
            .map(key => Number(leftRows.get(key).nodesExpanded ?? 0));
        const rightExhaustedNodes = gapKeys.filter(key => rightRows.get(key).status === 'exhausted')
            .map(key => Number(rightRows.get(key).nodesExpanded ?? 0));
        const rightOnly = gapKeys.filter(key => !leftRows.get(key).ok && rightRows.get(key).ok).length;
        const leftOnly = gapKeys.filter(key => leftRows.get(key).ok && !rightRows.get(key).ok).length;
        const leftTotalNodes = leftNodes.reduce((sum, nodes) => sum + nodes, 0);
        const rightTotalNodes = rightNodes.reduce((sum, nodes) => sum + nodes, 0);
        return { label, left, right, interpretation, all: summarize(common),
            productionUnsolved: summarize(gapKeys),
            productionUnsolvedEconomics: {
                leftTotalNodes, rightTotalNodes, additionalNodes: rightTotalNodes - leftTotalNodes,
                leftMedianNodes: median(leftNodes), rightMedianNodes: median(rightNodes),
                leftExhausted: leftExhaustedNodes.length, rightExhausted: rightExhaustedNodes.length,
                leftMedianExhaustedNodes: median(leftExhaustedNodes),
                rightMedianExhaustedNodes: median(rightExhaustedNodes),
                additionalNodesPerRightOnlySolve: rightOnly
                    ? Math.round((rightTotalNodes - leftTotalNodes) / rightOnly) : null,
                discordancePValue: exactDiscordancePValue(leftOnly, rightOnly),
            } };
    };
    const comparisons = [
        compare('objective beam width', 'beam:objectiveFirst@beam2000', 'beam:objectiveFirst@beam5000', 'left=2K, right=5K'),
        compare('intersection beam width', 'beam:intersectionHarvest@beam2000', 'beam:intersectionHarvest@beam5000', 'left=2K, right=5K'),
        compare('objective diversity', 'beam:objectiveFirst@beam5000', 'beam:objectiveFirst@beam5000(diverse)', 'left=plain, right=diverse'),
        compare('intersection diversity', 'beam:intersectionHarvest@beam5000', 'beam:intersectionHarvest@beam5000(diverse)', 'left=plain, right=diverse'),
        compare('IDA default vs none', 'ida:none', 'ida:default', 'left=no tie-break, right=informed default'),
        compare('IDA must-cross vs none', 'ida:none', 'ida:mustCrossFirst', 'left=no tie-break, right=informed must-cross'),
        compare('beam direction', 'beam:perimeterSweep/perimeterCCW@beam2000', 'beam:perimeterSweep/perimeterCW@beam2000', 'nominally symmetric directions'),
        compare('DFS direction', 'dfs:perimeterSweep/perimeterCCW', 'dfs:perimeterSweep/perimeterCW', 'nominally symmetric directions'),
    ];

    const failureFingerprints = new Map();
    for (const row of levelSummary.filter(item => !item.solvedByProduction && item.solverCount === 0)) {
        const families = new Map();
        for (const cell of byLevel.get(row.levelKey)) {
            const family = techniqueFamily(cell.technique);
            const statuses = families.get(family) ?? new Set();
            statuses.add(cell.status);
            families.set(family, statuses);
        }
        const fingerprint = ['beam', 'dfs', 'ida', 'repair'].map(family => {
            const statuses = families.get(family);
            if (!statuses) return `${family}:not-sampled`;
            if (statuses.has('node-budget-reached')) return `${family}:node-cap`;
            if (statuses.has('exhausted')) return `${family}:exhausted`;
            return `${family}:${[...statuses].sort().join('+')}`;
        }).join('|');
        const current = failureFingerprints.get(fingerprint) ?? { fingerprint, levels: 0 };
        current.levels++;
        failureFingerprints.set(fingerprint, current);
    }

    const levelPhenotypes = new Map();
    for (const row of levelSummary.filter(item => !item.solvedByProduction)) {
        const families = [...new Set(byLevel.get(row.levelKey).filter(cell => cell.ok)
            .map(cell => techniqueFamily(cell.technique)))].sort();
        const phenotype = families.length ? families.join('+') : 'no T1 solver';
        const current = levelPhenotypes.get(phenotype) ?? { phenotype, levels: 0 };
        current.levels++;
        levelPhenotypes.set(phenotype, current);
    }

    const unsolvedPopulationSize = populations.productionUnsolved.length;
    const completeTechniques = techniques.filter(technique =>
        byTechnique.get(technique).filter(row => row.solvedByProduction === false).length === unsolvedPopulationSize);
    const summarizeDescriptors = keys => {
        const rows = keys.map(key => descriptorsById.get(byLevel.get(key)?.[0]?.levelId)).filter(Boolean);
        const mean = values => values.length
            ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)) : null;
        const mechanics = ['gates', 'falseGoals', 'blocks', 'mustPass', 'mustCross', 'filters',
            'flippers', 'portals', 'geese', 'landmarks'];
        return {
            levels: keys.length,
            described: rows.length,
            meanReqLen: mean(rows.map(row => row.req[0]).filter(Number.isFinite)),
            meanReqInt: mean(rows.map(row => row.req[1]).filter(Number.isFinite)),
            meanArea: mean(rows.map(row => row.grid[0] * row.grid[1]).filter(Number.isFinite)),
            meanObjectDensity: mean(rows.map(row => row.objectDensity).filter(Number.isFinite)),
            mechanicPrevalence: Object.fromEntries(mechanics.map(mechanic => [mechanic,
                rows.length ? Number((rows.filter(row => row.counts[mechanic] > 0).length / rows.length).toFixed(3)) : null])),
        };
    };
    const exactLevelPhenotypes = new Map();
    for (const key of populations.productionUnsolved) {
        const winners = byLevel.get(key).filter(row => row.ok && completeTechniques.includes(row.technique))
            .map(row => row.technique).sort();
        const signature = winners.join('\0');
        const current = exactLevelPhenotypes.get(signature) ?? { techniques: winners, levelKeys: [] };
        current.levelKeys.push(key);
        exactLevelPhenotypes.set(signature, current);
    }
    const levelTechniquePhenotypes = [...exactLevelPhenotypes.values()].map(row => ({
        techniques: row.techniques,
        levels: row.levelKeys.length,
        descriptors: summarizeDescriptors(row.levelKeys),
        levelIds: row.levelKeys.map(key => byLevel.get(key)[0].levelId),
    })).sort((a, b) => b.levels - a.levels
        || a.techniques.join('\0').localeCompare(b.techniques.join('\0')));
    const flagPathologies = techniques.filter(technique => technique.includes('+dedup-near-tie-retention-off'))
        .map(variant => {
            const baseline = variant.replace('+dedup-near-tie-retention-off', '');
            const baselineRows = new Map((byTechnique.get(baseline) ?? []).map(row => [levelKey(row), row]));
            const variantRows = new Map(byTechnique.get(variant).map(row => [levelKey(row), row]));
            const common = [...baselineRows.keys()].filter(key => variantRows.has(key));
            const gained = common.filter(key => !baselineRows.get(key).ok && variantRows.get(key).ok);
            const lost = common.filter(key => baselineRows.get(key).ok && !variantRows.get(key).ok);
            return { baseline, variant, common: common.length, gained: summarizeDescriptors(gained),
                lost: summarizeDescriptors(lost), jointlySolved: summarizeDescriptors(common.filter(key =>
                    baselineRows.get(key).ok && variantRows.get(key).ok)) };
        });
    const comparisonPathologies = comparisons.map(comparison => {
        const leftRows = new Map((byTechnique.get(comparison.left) ?? []).map(row => [levelKey(row), row]));
        const rightRows = new Map((byTechnique.get(comparison.right) ?? []).map(row => [levelKey(row), row]));
        const common = [...leftRows.keys()].filter(key => rightRows.has(key)
            && leftRows.get(key).solvedByProduction === false);
        const leftOnlyKeys = common.filter(key => leftRows.get(key).ok && !rightRows.get(key).ok);
        const rightOnlyKeys = common.filter(key => !leftRows.get(key).ok && rightRows.get(key).ok);
        return { label: comparison.label, interpretation: comparison.interpretation,
            leftOnly: summarizeDescriptors(leftOnlyKeys), rightOnly: summarizeDescriptors(rightOnlyKeys),
            leftOnlyLevelIds: leftOnlyKeys.map(key => byLevel.get(key)[0].levelId),
            rightOnlyLevelIds: rightOnlyKeys.map(key => byLevel.get(key)[0].levelId) };
    });

    const coverable = new Set(completeTechniques.flatMap(technique => byTechnique.get(technique)
        .filter(row => row.solvedByProduction === false && row.ok).map(levelKey)));
    const uncovered = new Set(coverable);
    const cover = [];
    while (uncovered.size) {
        const candidates = completeTechniques.map(technique => {
            const rows = byTechnique.get(technique).filter(row => !row.solvedByProduction && uncovered.has(levelKey(row)));
            const gains = rows.filter(row => row.ok).map(row => levelKey(row));
            const cost = rows.reduce((sum, row) => sum + Number(row.nodesExpanded ?? 0), 0);
            return { technique, gains, cost, score: cost ? gains.length / cost : 0 };
        }).filter(row => row.gains.length).sort((a, b) => b.score - a.score || b.gains.length - a.gains.length || a.technique.localeCompare(b.technique));
        if (!candidates.length) break;
        const winner = candidates[0];
        winner.gains.forEach(key => uncovered.delete(key));
        cover.push({ technique: winner.technique, incremental: winner.gains.length,
            cumulative: coverable.size - uncovered.size,
            residualAttemptNodes: winner.cost });
    }
    const coverageUncovered = new Set(coverable);
    const coverageCover = [];
    while (coverageUncovered.size) {
        const candidates = completeTechniques.map(technique => {
            const techniqueRows = byTechnique.get(technique).filter(row =>
                !row.solvedByProduction && row.ok && coverageUncovered.has(levelKey(row)));
            return { technique, gains: techniqueRows.map(levelKey) };
        }).filter(row => row.gains.length)
            .sort((a, b) => b.gains.length - a.gains.length || a.technique.localeCompare(b.technique));
        if (!candidates.length) break;
        const winner = candidates[0];
        winner.gains.forEach(key => coverageUncovered.delete(key));
        coverageCover.push({ technique: winner.technique, incremental: winner.gains.length,
            cumulative: coverable.size - coverageUncovered.size });
    }

    const buildPopulationCover = populationKeys => {
        const population = new Set(populationKeys);
        const union = new Set(completeTechniques.flatMap(technique => byTechnique.get(technique)
            .filter(row => population.has(levelKey(row)) && row.ok).map(levelKey)));
        const build = costWeighted => {
            const uncoveredKeys = new Set(union);
            const steps = [];
            while (uncoveredKeys.size) {
                const candidates = completeTechniques.map(technique => {
                    const residual = byTechnique.get(technique).filter(row =>
                        population.has(levelKey(row)) && uncoveredKeys.has(levelKey(row)));
                    const gains = residual.filter(row => row.ok).map(levelKey);
                    const nodes = residual.reduce((sum, row) => sum + Number(row.nodesExpanded ?? 0), 0);
                    return { technique, gains, nodes, score: nodes ? gains.length / nodes : 0 };
                }).filter(row => row.gains.length).sort((a, b) => costWeighted
                    ? b.score - a.score || b.gains.length - a.gains.length || a.technique.localeCompare(b.technique)
                    : b.gains.length - a.gains.length || a.nodes - b.nodes || a.technique.localeCompare(b.technique));
                if (!candidates.length) break;
                const winner = candidates[0];
                winner.gains.forEach(key => uncoveredKeys.delete(key));
                steps.push({ technique: winner.technique, incremental: winner.gains.length,
                    cumulative: union.size - uncoveredKeys.size, residualAttemptNodes: winner.nodes });
            }
            return steps;
        };
        return { levels: population.size, oracleUnion: union.size,
            costWeighted: build(true), coverageFirst: build(false) };
    };
    const populationCovers = {
        productionUnsolved: buildPopulationCover(populations.productionUnsolved),
        productionSolved: buildPopulationCover(populations.productionSolved),
    };

    const techniqueEconomics = completeTechniques.map(technique => {
        const techniqueRows = byTechnique.get(technique).filter(row => !row.solvedByProduction);
        const solvedKeys = techniqueRows.filter(row => row.ok).map(levelKey);
        const meanAttemptNodes = Math.round(techniqueRows.reduce((sum, row) => sum + row.nodesExpanded, 0)
            / techniqueRows.length);
        const cheaper = completeTechniques.filter(other => other !== technique &&
            byTechnique.get(other).filter(row => !row.solvedByProduction)
                .reduce((sum, row) => sum + row.nodesExpanded, 0) / unsolvedPopulationSize < meanAttemptNodes);
        const substituted = solvedKeys.filter(key => cheaper.some(other =>
            byTechnique.get(other).some(row => levelKey(row) === key && row.ok))).length;
        return { technique, solved: solvedKeys.length, meanAttemptNodes, cheaperTechniques: cheaper.length,
            substitutedByCheaper: substituted, unsharedWithCheaper: solvedKeys.length - substituted,
            substitutionRate: solvedKeys.length ? substituted / solvedKeys.length : null };
    }).filter(row => row.solved).sort((a, b) => b.substitutionRate - a.substitutionRate
        || b.meanAttemptNodes - a.meanAttemptNodes);

    const hazardBounds = [0, ...thresholds];
    const solveHazards = completeTechniques.map(technique => {
        const techniqueRows = byTechnique.get(technique).filter(row => !row.solvedByProduction);
        return {
            technique,
            solved: techniqueRows.filter(row => row.ok).length,
            intervals: hazardBounds.slice(1).map((upper, index) => {
                const lower = hazardBounds[index];
                const atRisk = techniqueRows.filter(row => row.nodesExpanded > lower).length;
                const solves = techniqueRows.filter(row => row.ok
                    && row.nodesExpanded > lower && row.nodesExpanded <= upper).length;
                return { lower, upper, atRisk, solves, hazard: atRisk ? solves / atRisk : null };
            }),
        };
    }).filter(row => row.solved).sort((a, b) => b.solved - a.solved).slice(0, 8);

    const productionByLevel = new Map(productionRows.map(row => [`${row.corpus}/${row.id}`, row]));
    const crossRunRows = levelSummary.filter(row => row.cheapestNodes != null).map(row => {
        const censusRow = byLevel.get(row.levelKey)[0];
        const productionRow = productionByLevel.get(`${censusRow.corpus}/${censusRow.levelId}`);
        if (!productionRow) return null;
        return {
            levelKey: row.levelKey,
            levelId: censusRow.levelId,
            corpus: censusRow.corpus,
            frozenProductionSolved: row.solvedByProduction,
            productionOk: productionRow.ok,
            productionStatus: productionRow.status,
            productionNodes: productionRow.nodesExpanded,
            productionWork: productionRow.workSpent,
            cheapestIsolatedNodes: row.cheapestNodes,
            nodeRatio: productionRow.nodesExpanded && row.cheapestNodes
                ? productionRow.nodesExpanded / row.cheapestNodes : null,
        };
    }).filter(Boolean);
    const ratios = crossRunRows.filter(row => row.nodeRatio != null).map(row => row.nodeRatio);
    const medianRatio = median(ratios.map(value => value * 1000));
    const frozenGapRows = crossRunRows.filter(row => !row.frozenProductionSolved);
    const productionCrossRun = {
        matchedOracleLevels: crossRunRows.length,
        productionSolved: crossRunRows.filter(row => row.productionOk).length,
        productionFailed: crossRunRows.filter(row => !row.productionOk).length,
        productionFailedWithinIsolated1M: crossRunRows.filter(row =>
            !row.productionOk && row.cheapestIsolatedNodes <= 1_000_000).length,
        frozenGapMatched: frozenGapRows.length,
        frozenGapProductionFailed: frozenGapRows.filter(row => !row.productionOk).length,
        frozenGapProductionFailedWithinIsolated1M: frozenGapRows.filter(row =>
            !row.productionOk && row.cheapestIsolatedNodes <= 1_000_000).length,
        frozenGapProductionFailedWithinIsolated2M: frozenGapRows.filter(row =>
            !row.productionOk && row.cheapestIsolatedNodes <= 2_000_000).length,
        medianProductionToIsolatedNodeRatio: medianRatio == null ? null : Number((medianRatio / 1000).toFixed(3)),
        ratiosAtLeast10x: ratios.filter(value => value >= 10).length,
        largestNodeRatios: crossRunRows.filter(row => row.nodeRatio != null)
            .sort((a, b) => b.nodeRatio - a.nodeRatio).slice(0, 30),
    };
    const multiplicityBands = [
        { label: '0', includes: count => count === 0 },
        { label: '1', includes: count => count === 1 },
        { label: '2', includes: count => count === 2 },
        { label: '3–5', includes: count => count >= 3 && count <= 5 },
        { label: '6–10', includes: count => count >= 6 && count <= 10 },
        { label: '11+', includes: count => count >= 11 },
    ];
    const productionMultiplicityRelationship = multiplicityBands.map(band => {
        const matched = levelSummary.map(row => {
            const censusRow = byLevel.get(row.levelKey)[0];
            return { ...row, production: productionByLevel.get(`${censusRow.corpus}/${censusRow.levelId}`) };
        }).filter(row => row.production && band.includes(row.solverCount));
        const nodes = matched.map(row => row.production.nodesExpanded).filter(Number.isFinite);
        const work = matched.map(row => row.production.workSpent).filter(Number.isFinite);
        const solved = matched.filter(row => row.production.ok).length;
        return { multiplicity: band.label, levels: matched.length, productionSolved: solved,
            productionFailed: matched.length - solved, productionSolveRate: matched.length ? solved / matched.length : null,
            medianProductionNodes: median(nodes), medianProductionWork: median(work) };
    }).filter(row => row.levels);
    const marginBands = [
        { label: 'singleton', includes: row => row.solverCount === 1 },
        { label: '<1.25×', includes: row => row.secondToFirstRatio != null && row.secondToFirstRatio < 1.25 },
        { label: '1.25–2×', includes: row => row.secondToFirstRatio >= 1.25 && row.secondToFirstRatio < 2 },
        { label: '2×+', includes: row => row.secondToFirstRatio >= 2 },
    ];
    const productionMarginRelationship = marginBands.map(band => {
        const matched = levelSummary.filter(band.includes).map(row => {
            const censusRow = byLevel.get(row.levelKey)[0];
            return { ...row, production: productionByLevel.get(`${censusRow.corpus}/${censusRow.levelId}`) };
        }).filter(row => row.production);
        const solved = matched.filter(row => row.production.ok).length;
        return { margin: band.label, levels: matched.length, productionSolved: solved,
            productionSolveRate: matched.length ? solved / matched.length : null,
            medianProductionNodes: median(matched.map(row => row.production.nodesExpanded).filter(Number.isFinite)),
            medianCheapestIsolatedNodes: median(matched.map(row => row.cheapestNodes).filter(Number.isFinite)) };
    }).filter(row => row.levels);
    const cheapestCostBands = [
        { label: '≤500K', includes: nodes => nodes <= 500_000 },
        { label: '500K–2M', includes: nodes => nodes > 500_000 && nodes <= 2_000_000 },
        { label: '2M–10M', includes: nodes => nodes > 2_000_000 && nodes <= 10_000_000 },
        { label: '10M+', includes: nodes => nodes > 10_000_000 },
    ];
    const fragilityBands = [
        { label: '1', includes: count => count === 1 },
        { label: '2', includes: count => count === 2 },
        { label: '3–5', includes: count => count >= 3 && count <= 5 },
        { label: '6+', includes: count => count >= 6 },
    ];
    const productionFragilityMatrix = cheapestCostBands.flatMap(costBand => fragilityBands.map(fragilityBand => {
        const matched = levelSummary.filter(row => row.cheapestNodes != null
            && costBand.includes(row.cheapestNodes) && fragilityBand.includes(row.solverCount)).map(row => {
            const censusRow = byLevel.get(row.levelKey)[0];
            return { ...row, production: productionByLevel.get(`${censusRow.corpus}/${censusRow.levelId}`) };
        }).filter(row => row.production);
        const solved = matched.filter(row => row.production.ok).length;
        return { cheapestCost: costBand.label, multiplicity: fragilityBand.label, levels: matched.length,
            productionSolved: solved, productionSolveRate: matched.length ? solved / matched.length : null,
            medianProductionNodes: median(matched.map(row => row.production.nodesExpanded).filter(Number.isFinite)) };
    })).filter(row => row.levels);
    const frozenRowsById = new Map(frozenProductionRows.map(row => [`${row.corpus}/${row.id}`, row]));
    const reverseOracleLevels = coverageRows.filter(row => row.wasSolvedByProduction && row.solvedByT1.length === 0)
        .map(row => {
            const productionRow = frozenRowsById.get(`${row.corpus}/${row.levelId}`);
            const matchingIsolated = productionRow?.winningConfig
                ? byTechnique.get(productionRow.winningConfig)?.find(cell => cell.levelId === row.levelId
                    && cell.corpus === row.corpus) : null;
            return {
                corpus: row.corpus, levelId: row.levelId,
                productionOk: productionRow?.ok ?? null,
                productionWinningConfig: productionRow?.winningConfig ?? null,
                lifecycleWinningTechnique: productionRow?.lifecycleWinningTechnique ?? null,
                productionAttemptCount: productionRow?.attemptCount ?? null,
                productionNodes: productionRow?.nodesExpanded ?? null,
                matchingIsolatedStatus: matchingIsolated?.status ?? null,
                matchingIsolatedNodes: matchingIsolated?.nodesExpanded ?? null,
            };
        });
    const reverseWinnerCounts = new Map();
    for (const row of reverseOracleLevels) if (row.lifecycleWinningTechnique) {
        reverseWinnerCounts.set(row.lifecycleWinningTechnique,
            (reverseWinnerCounts.get(row.lifecycleWinningTechnique) ?? 0) + 1);
    }
    const reverseOracle = {
        levels: reverseOracleLevels.length,
        reproducedProductionSolved: reverseOracleLevels.filter(row => row.productionOk).length,
        winnerCounts: [...reverseWinnerCounts].map(([technique, levels]) => ({ technique, levels }))
            .sort((a, b) => b.levels - a.levels),
        rows: reverseOracleLevels,
    };

    return {
        schemaVersion: 1,
        sourceCells: cells.size,
        inputAudit: {
            rawRows: document.results?.length ?? 0,
            rawT1Rows,
            eligibleT1Rows,
            uniqueT1Cells: cells.size,
            duplicateT1Rows,
            excludedNonT1Rows,
        },
        techniques: techniques.length,
        populations: Object.fromEntries(Object.entries(populations).map(([name, keys]) => [name, keys.length])),
        multiplicity,
        perfectRouter,
        closestTechniquePairs: techniquePairs.filter(row => row.union && row.common >= 900)
            .sort((a, b) => b.jaccard - a.jaccard || a.disagreement - b.disagreement).slice(0, 20),
        mostDistinctTechniquePairs: techniquePairs.filter(row => row.aSolved && row.bSolved && row.common >= 900)
            .sort((a, b) => a.jaccard - b.jaccard || b.union - a.union).slice(0, 20),
        highestMutualInformationPairs: techniquePairs.filter(row => row.union && row.common >= 900)
            .sort((a, b) => b.mutualInformationBits - a.mutualInformationBits
                || a.disagreement - b.disagreement).slice(0, 20),
        bestConditionalSuccess: conditional.filter(row => row.residual >= 500 && row.incremental)
            .sort((a, b) => b.incrementalPerBillionNodes - a.incrementalPerBillionNodes).slice(0, 30),
        bestConditionalByFailureStatus: conditionalByFailureStatus.filter(row => row.residual >= 100)
            .sort((a, b) => b.incrementalPerBillionNodes - a.incrementalPerBillionNodes).slice(0, 30),
        controlledComparisons: comparisons,
        failureFingerprints: [...failureFingerprints.values()].sort((a, b) => b.levels - a.levels),
        levelFamilyPhenotypes: [...levelPhenotypes.values()].sort((a, b) => b.levels - a.levels),
        levelTechniquePhenotypes,
        flagPathologies,
        comparisonPathologies,
        greedyCostWeightedCover: cover,
        greedyCoverageFirstCover: coverageCover,
        populationCovers,
        isolatedTechniqueEconomics: techniqueEconomics,
        solveHazards,
        productionCrossRun,
        productionMultiplicityRelationship,
        productionMarginRelationship,
        productionFragilityMatrix,
        reverseOracle,
        completeTechniqueCover: { eligibleTechniques: completeTechniques.length, coverableLevels: coverable.size },
        fragileLevels: levelSummary.filter(row => row.solverCount > 0 && row.solverCount <= 2)
            .sort((a, b) => a.solverCount - b.solverCount || b.cheapestNodes - a.cheapestNodes),
    };
}

export function renderTechniqueCensusSecondOrder(result, sourceDirectory, sources = {}) {
    const u = result.multiplicity.productionUnsolved;
    const s = result.multiplicity.productionSolved;
    const rows = (items, formatter) => items.map(formatter).join('\n');
    const productionRun = sources.productionRun ?? path.basename(DEFAULT_PRODUCTION_RUN);
    const frozenProductionRun = sources.frozenProductionRun ?? path.basename(FROZEN_PRODUCTION_RUN);
    const coverMilestones = (population, strategy) => {
        const cover = result.populationCovers[population][strategy];
        return [1, 3, 5, 10, cover.length].filter((step, index, all) => step >= 1 && step <= cover.length
            && all.indexOf(step) === index).map(step => ({ step, cumulative: cover[step - 1].cumulative }));
    };
    return `# Technique census: second-order existing-data analysis

<!-- report-metadata: generated -->

Generated by \`scripts/technique-census-second-order.mjs\` from \`${sourceDirectory}\`.

## Scope and caveats

This is a deterministic re-analysis of ${result.inputAudit.uniqueT1Cells} unique T1 isolated cells (${result.inputAudit.eligibleT1Rows} eligible rows with ${result.inputAudit.duplicateT1Rows} exact duplicates removed); the combined input also contains ${result.inputAudit.excludedNonT1Rows} non-T1 rows excluded from this analysis. It is not a current-code rerun and does not test production routing. Cost means reported \`nodesExpanded\`, not wall time or the production work metric. Conditional rows simulate “run B after A fails” from isolated outcomes; they do not establish that a live handoff preserves those outcomes. Partially sampled techniques are compared only on common evaluated levels.

## Multiplicity and capability margin

| population | levels | oracle solved | zero | singleton | doubleton | median solvers | median cheapest nodes | median second/first |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| production-unsolved | ${u.levels} | ${u.oracleSolved} | ${u.zero} | ${u.singleton} | ${u.doubleton} | ${u.medianSolverCountAmongSolved} | ${u.medianCheapestNodes} | ${u.medianSecondToFirstRatio}× |
| production-solved | ${s.levels} | ${s.oracleSolved} | ${s.zero} | ${s.singleton} | ${s.doubleton} | ${s.medianSolverCountAmongSolved} | ${s.medianCheapestNodes} | ${s.medianSecondToFirstRatio}× |

Low multiplicity is common in the capability-gap population: ${u.singleton + u.doubleton}/${u.oracleSolved} (${pct(u.singleton + u.doubleton, u.oracleSolved)}) oracle solves have only one or two recorded T1 winners. These are useful capability-boundary fixtures, but the census alone cannot test instability or correlation with production cost because the frozen baseline contributes only a solved/unsolved label.

## Perfect-router bound

| per-technique node cap | production-unsolved solved | production-solved solved |
|---:|---:|---:|
${rows(result.perfectRouter, row => `| ${row.nodeCap.toLocaleString('en-US')} | ${row.productionUnsolved} | ${row.productionSolved} |`)}

The curve is an oracle bound, not implementable routing: it chooses the cheapest winning technique using hindsight. It nevertheless separates cheap routing opportunity from deep-search capability.

## Technique phenotypes

Closest success vectors by Jaccard similarity (minimum 900 common evaluated levels):

| A | B | common | A solved | B solved | intersection | union | Jaccard | disagreements |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${rows(result.closestTechniquePairs.slice(0, 12), row => `| \`${row.a}\` | \`${row.b}\` | ${row.common} | ${row.aSolved} | ${row.bSolved} | ${row.intersection} | ${row.union} | ${row.jaccard.toFixed(3)} | ${row.disagreement} |`)}

These pairs nominate behavioral substitutes. Similarity is outcome-only and should not be read as implementation equivalence.

Mutual information also accounts for joint failures, avoiding Jaccard's omission of the often-large neither-solves population:

| A | B | common | mutual information (bits) | Jaccard | disagreements |
|---|---|---:|---:|---:|---:|
${rows(result.highestMutualInformationPairs.slice(0, 12), row => `| \`${row.a}\` | \`${row.b}\` | ${row.common} | ${row.mutualInformationBits.toFixed(3)} | ${row.jaccard.toFixed(3)} | ${row.disagreement} |`)}

High mutual information means the two binary outcomes are predictive of one another, not necessarily that both techniques solve the same levels: anti-correlated pairs can also score highly. Read it alongside Jaccard and disagreement rather than as another substitute ranking.

## Conditional value after observed failure

Top cost-weighted ordered pairs on the production-unsolved population, requiring at least 500 common A-failure rows:

| failed A | then B | residual | incremental solves | P(B solves \| A failed) | mean B nodes | solves / billion B nodes |
|---|---|---:|---:|---:|---:|---:|
${rows(result.bestConditionalSuccess.slice(0, 15), row => `| \`${row.a}\` | \`${row.b}\` | ${row.residual} | ${row.incremental} | ${pct(row.incremental, row.residual)} | ${row.expectedBNodesOnResidual} | ${row.incrementalPerBillionNodes.toFixed(2)} |`)}

The leading rows put a cheap beam after a failed, deep DFS or IDA search. Read as a scheduling clue, this nominates reversing that order so the beam acts as a screen; the matrix itself does not measure the reversed ladder's total work. A candidate ladder still needs matched production-work validation.

Failure-status stratification (minimum 100 residual rows) shows whether A's termination mode changes that ranking:

| failed A | status | then B | residual | incremental | probability | solves / billion B nodes |
|---|---|---|---:|---:|---:|---:|
${rows(result.bestConditionalByFailureStatus.slice(0, 12), row => `| \`${row.a}\` | ${row.failureStatus} | \`${row.b}\` | ${row.residual} | ${row.incremental} | ${pct(row.incremental, row.residual)} | ${row.incrementalPerBillionNodes.toFixed(2)} |`)}

## Controlled inversions and directionality

“Left only” and “right only” are outcome inversions, not statistical noise: every cell uses the census's deterministic isolated protocol. Width/diversity labels describe nominal strength only; neither arm dominates in practice.

| comparison | arms | common gap levels | left only | right only | both | neither | exact paired p |
|---|---|---:|---:|---:|---:|---:|---:|
${rows(result.controlledComparisons, row => `| ${row.label} | ${row.interpretation} | ${row.productionUnsolved.common} | ${row.productionUnsolved.leftOnly} | ${row.productionUnsolved.rightOnly} | ${row.productionUnsolved.both} | ${row.productionUnsolved.neither} | ${row.productionUnsolvedEconomics.discordancePValue.toPrecision(3)} |`)}

The exact two-sided paired p-value conditions on discordant levels (a sign/McNemar-style test under equal left/right odds). It measures outcome imbalance, not effect value, and is reported without multiple-comparison correction; use it to prioritize mechanisms, not to declare a production winner.

Whole-population isolated-node economics show what the right arm costs relative to the left arm. “Nodes / right-only solve” charges the total node delta across all common gap levels against gross right-only gains; it is negative when the right arm is cheaper overall and does not credit left-only losses.

| comparison | left median nodes | right median nodes | total node delta (right − left) | right-only solves | left-only losses | nodes / right-only solve |
|---|---:|---:|---:|---:|---:|---:|
${rows(result.controlledComparisons, row => `| ${row.label} | ${row.productionUnsolvedEconomics.leftMedianNodes} | ${row.productionUnsolvedEconomics.rightMedianNodes} | ${row.productionUnsolvedEconomics.additionalNodes} | ${row.productionUnsolved.rightOnly} | ${row.productionUnsolved.leftOnly} | ${row.productionUnsolvedEconomics.additionalNodesPerRightOnlySolve ?? '—'} |`)}

For beam comparisons, exhausted-search node counts proxy the explored frontier size. They are not memory measurements, and success rows are excluded because they are right-censored before frontier exhaustion.

| comparison | left exhausted | left median exhaustion nodes | right exhausted | right median exhaustion nodes |
|---|---:|---:|---:|---:|
${rows(result.controlledComparisons.filter(row => row.label.includes('beam') || row.label.includes('diversity')), row => `| ${row.label} | ${row.productionUnsolvedEconomics.leftExhausted} | ${row.productionUnsolvedEconomics.leftMedianExhaustedNodes ?? '—'} | ${row.productionUnsolvedEconomics.rightExhausted} | ${row.productionUnsolvedEconomics.rightMedianExhaustedNodes ?? '—'} |`)}

The CW/CCW rows quantify direction sensitivity without claiming a geometric symmetry test: rotated/mirrored family joins are still required to separate puzzle orientation from iteration-order bias.

Structural summaries of the inversion-only populations provide nominations for those controlled replays:

| comparison | side-only population | levels | mean reqLen | mean area | mean density | must-cross prevalence |
|---|---|---:|---:|---:|---:|---:|
${rows(result.comparisonPathologies.flatMap(row => [
    { label: row.label, side: 'left only', summary: row.leftOnly },
    { label: row.label, side: 'right only', summary: row.rightOnly },
]).filter(row => row.summary.levels), row => `| ${row.label} | ${row.side} | ${row.summary.levels} | ${row.summary.meanReqLen ?? '—'} | ${row.summary.meanArea ?? '—'} | ${row.summary.meanObjectDensity ?? '—'} | ${row.summary.mechanicPrevalence.mustCross ?? '—'} |`)}

These means are descriptive and overlap across rows; they do not establish a threshold router. The exact inversion IDs in JSON are better replay fixtures than population averages are policy features.

## Level family phenotypes

This compact clustering ignores implementation labels within the four broad families and groups production-unsolved levels by which families have any winner.

| winning families | levels |
|---|---:|
${rows(result.levelFamilyPhenotypes, row => `| ${row.phenotype} | ${row.levels} |`)}

Exact success-vector phenotypes preserve configuration-level distinctions across the ${result.completeTechniqueCover.eligibleTechniques} techniques evaluated on every gap level. Partially sampled techniques are excluded so missing cells cannot masquerade as failures. The table shows the largest groups; JSON retains every group and its exact level IDs for follow-up joins.

| winning techniques | levels | mean reqLen | mean area | mean density | must-cross prevalence |
|---|---:|---:|---:|---:|---:|
${rows(result.levelTechniquePhenotypes.slice(0, 15), row => {
    const names = row.techniques.length === 0 ? 'none' : row.techniques.slice(0, 3).map(name => `\`${name}\``).join('<br>')
        + (row.techniques.length > 3 ? `<br>+${row.techniques.length - 3} more` : '');
    return `| ${names} | ${row.levels} | ${row.descriptors.meanReqLen ?? '—'} | ${row.descriptors.meanArea ?? '—'} | ${row.descriptors.meanObjectDensity ?? '—'} | ${row.descriptors.mechanicPrevalence.mustCross ?? '—'} |`;
})}

Exact vectors fragment quickly beyond the no-solver group. Treat repeated groups as regression cohorts and singleton vectors as boundary fixtures, not as evidence for identity-based routing.

## No-oracle failure fingerprints

Fingerprints collapse each family's observed failures to node-cap when any member hits the cap, otherwise exhaustion; partially sampled repair variants do not turn an otherwise sampled repair family into “not sampled.”

| fingerprint | levels |
|---|---:|
${rows(result.failureFingerprints, row => `| \`${row.fingerprint}\` | ${row.levels} |`)}

## Dedup-near-tie outcome pathology

The flag-off variants both gain and lose deterministic isolated solves. Existing structural descriptors provide only nominations; causal retention claims still require early-search and winning-lineage telemetry.

| baseline | transition | levels | mean reqLen | mean reqInt | mean area | mean object density | must-cross prevalence | portal prevalence |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${rows(result.flagPathologies.flatMap(row => [
    { baseline: row.baseline, transition: 'flag-off gained', summary: row.gained },
    { baseline: row.baseline, transition: 'flag-off lost', summary: row.lost },
]), row => `| \`${row.baseline}\` | ${row.transition} | ${row.summary.levels} | ${row.summary.meanReqLen ?? '—'} | ${row.summary.meanReqInt ?? '—'} | ${row.summary.meanArea ?? '—'} | ${row.summary.meanObjectDensity ?? '—'} | ${row.summary.mechanicPrevalence.mustCross ?? '—'} | ${row.summary.mechanicPrevalence.portals ?? '—'} |`)}

Both profiles show the same descriptive direction: flag-off gains have longer requirements, larger grids, and lower object density than flag-off losses. The must-cross prevalence difference is small for objective-first and reverses for intersection-harvest, so it is not a shared predictor. These are population means without uncertainty adjustment or family independence and nominate—not justify—a size/density-conditioned telemetry rerun.

## Greedy minimum-cost cover approximation

This greedy heuristic repeatedly chooses incremental oracle-union solves per residual isolated node cost. It is an approximation, not an exact minimum set cover. To avoid making partial samples look artificially cheap, it admits only the ${result.completeTechniqueCover.eligibleTechniques} techniques evaluated on all ${u.levels} production-unsolved levels; their union covers ${result.completeTechniqueCover.coverableLevels}/${u.oracleSolved} census-oracle solves.

| step | technique | incremental | cumulative / ${u.oracleSolved} | residual attempt nodes |
|---:|---|---:|---:|---:|
${rows(result.greedyCostWeightedCover, (row, index) => `| ${index + 1} | \`${row.technique}\` | ${row.incremental} | ${row.cumulative} | ${row.residualAttemptNodes} |`)}

For comparison, a coverage-first greedy cover ignores cost and shows how quickly a small technique set approaches the same ${result.completeTechniqueCover.coverableLevels}-level complete-technique union:

| step | technique | incremental | cumulative / ${result.completeTechniqueCover.coverableLevels} |
|---:|---|---:|---:|
${rows(result.greedyCoverageFirstCover, (row, index) => `| ${index + 1} | \`${row.technique}\` | ${row.incremental} | ${row.cumulative} |`)}

The same fully sampled technique set behaves differently on the historically production-solved population. These curves compare coverage at fixed portfolio sizes; they do not simulate production ordering or shared work.

| population | greedy objective | oracle union | techniques used | coverage milestones (techniques: levels) |
|---|---|---:|---:|---|
${rows(['productionUnsolved', 'productionSolved'].flatMap(population => ['coverageFirst', 'costWeighted'].map(strategy => ({
    population, strategy, summary: result.populationCovers[population], milestones: coverMilestones(population, strategy),
}))), row => `| ${row.population} | ${row.strategy} | ${row.summary.oracleUnion} | ${row.summary[row.strategy].length} | ${row.milestones.map(item => `${item.step}: ${item.cumulative}`).join(', ')} |`)}

## Isolated substitutability

This is an isolated-work screen, not production substitutability. A solve is “substituted” when any complete-population technique with lower mean attempt nodes also solves that level.

| technique | solves | mean attempt nodes | cheaper techniques | substituted | unshared with cheaper | substitution rate |
|---|---:|---:|---:|---:|---:|---:|
${rows(result.isolatedTechniqueEconomics.slice(0, 15), row => `| \`${row.technique}\` | ${row.solved} | ${row.meanAttemptNodes} | ${row.cheaperTechniques} | ${row.substitutedByCheaper} | ${row.unsharedWithCheaper} | ${pct(row.substitutedByCheaper, row.solved)} |`)}

## Solve-hazard curves

The T1 matrix supports a censored node-band estimate: a row remains at risk only while its reported search has expanded beyond the lower bound. Exhausted beams therefore leave the risk set rather than being treated as 50M-node failures. These are isolated-node hazards, not production-stage hazards.

| technique | node band | at risk | solves in band | conditional hazard |
|---|---:|---:|---:|---:|
${rows(result.solveHazards.flatMap(row => row.intervals
    .filter(interval => interval.solves > 0).map(interval => ({ technique: row.technique, ...interval }))),
row => `| \`${row.technique}\` | ${row.lower.toLocaleString('en-US')}–${row.upper.toLocaleString('en-US')} | ${row.atRisk} | ${row.solves} | ${pct(row.solves, row.atRisk)} |`)}

The curve distinguishes cheap beam screens, whose risk sets disappear on exhaustion, from repair/IDA searches that retain a large censored population into deep bands. Plain repair's conditional hazard rises from 1.7% at 2–5M to 2.6% at 5–10M, 2.4% at 10–20M, and 4.6% at 20–50M. That supports protecting a genuinely deep repair pass but provides no “dead middle” interval to remove. Any cap change still needs matched-work validation because changing a stage budget also changes downstream allocation.

## Multiplicity versus later production outcome

This joins frozen-census solver multiplicity to later level-blind run \`${productionRun}\`. It tests the proposed fragility proxy historically, not stability under repeated same-code runs.

| T1 solver count | matched levels | production solved | failed | solve rate | median production nodes | median production work |
|---:|---:|---:|---:|---:|---:|---:|
${rows(result.productionMultiplicityRelationship, row => `| ${row.multiplicity} | ${row.levels} | ${row.productionSolved} | ${row.productionFailed} | ${pct(row.productionSolved, row.levels)} | ${row.medianProductionNodes} | ${row.medianProductionWork} |`)}

Multiplicity is strongly associated with later production outcome and cost, but it is not an independent level feature: easier levels naturally admit more winners. Use singleton/doubleton rows as sharp regression nominations, not as a production routing input or a causal stability claim.

Capability-margin bands compare the second-cheapest isolated winner with the cheapest:

| winner margin | matched levels | production solved | solve rate | median production nodes | median cheapest isolated nodes |
|---|---:|---:|---:|---:|---:|
${rows(result.productionMarginRelationship, row => `| ${row.margin} | ${row.levels} | ${row.productionSolved} | ${pct(row.productionSolved, row.levels)} | ${row.medianProductionNodes} | ${row.medianCheapestIsolatedNodes} |`)}

This ratio does not isolate routing difficulty from absolute level difficulty; interpret it together with multiplicity and cheapest cost rather than as a standalone policy feature.

Crossing absolute cheapest isolated cost with multiplicity separates cheap narrow-key levels from broadly expensive ones. Small cells are descriptive nominations, not stable rate estimates.

| cheapest isolated winner | T1 solver count | matched levels | later production solved | solve rate | median production nodes |
|---|---:|---:|---:|---:|---:|
${rows(result.productionFragilityMatrix, row => `| ${row.cheapestCost} | ${row.multiplicity} | ${row.levels} | ${row.productionSolved} | ${pct(row.productionSolved, row.levels)} | ${row.medianProductionNodes} |`)}

## Cross-run routing-regret nominations

This historical join compares census isolated node counts with level-blind production run \`${productionRun}\`, a later solver commit and policy. It is not a matched-code A/B and nodes are not the production work metric; use it only to nominate current-code reproductions.

- ${result.productionCrossRun.matchedOracleLevels} isolated-oracle levels matched the production run: ${result.productionCrossRun.productionSolved} production-solved and ${result.productionCrossRun.productionFailed} production-failed.
- ${result.productionCrossRun.productionFailedWithinIsolated1M} production failures have an isolated census winner within 1M nodes.
- Restricting to the re-derived census's frozen production-unsolved population, ${result.productionCrossRun.frozenGapProductionFailed}/${result.productionCrossRun.frozenGapMatched} remain production failures, including ${result.productionCrossRun.frozenGapProductionFailedWithinIsolated1M} with a winner within 1M nodes and ${result.productionCrossRun.frozenGapProductionFailedWithinIsolated2M} within 2M. This is one level above the queue's earlier 151-level read from the pre-re-derivation matrix and should be reconciled before using exact nominations.
- The median production/cheapest-isolated node ratio is ${result.productionCrossRun.medianProductionToIsolatedNodeRatio}×; ${result.productionCrossRun.ratiosAtLeast10x} matched levels are at least 10×.

| level | production result | production nodes | cheapest isolated nodes | node ratio |
|---|---|---:|---:|---:|
${rows(result.productionCrossRun.largestNodeRatios.slice(0, 15), row => `| \`${row.corpus}/${row.levelId}\` | ${row.productionOk ? 'solved' : row.productionStatus} | ${row.productionNodes} | ${row.cheapestIsolatedNodes} | ${row.nodeRatio.toFixed(1)}× |`)}

## Reverse-oracle mechanism narrowing

All ${result.reverseOracle.reproducedProductionSolved}/${result.reverseOracle.levels} frozen reverse-oracle levels are present as production solves in level-blind run \`${frozenProductionRun}\`. Canonical lifecycle attribution assigns ${result.reverseOracle.winnerCounts.map(row => `${row.levels} \`${row.technique}\``).join(', ')}. Production succeeds after 2–19 attempts.

| level | lifecycle winner | collapsed winningConfig | attempt count | production nodes | same-label T1 outcome |
|---|---|---|---:|---:|---|
${rows(result.reverseOracle.rows, row => `| \`${row.corpus}/${row.levelId}\` | \`${row.lifecycleWinningTechnique}\` | \`${row.productionWinningConfig}\` | ${row.productionAttemptCount} | ${row.productionNodes} | ${row.matchingIsolatedStatus} (${row.matchingIsolatedNodes} nodes) |`)}

This identifies an attribution trap in the original “same technique” framing: all eight rows reported as diverse-beam \`winningConfig\` values were actually won in the \`admissible-order\` lifecycle stage, while all six repair-labelled rows were won by \`repair-probe\`. Subsequent exact-production-commit fresh controls, recorded in the linked diagnosis, establish that all eight admissible-order wins depend on preceding ladder activity or equivalent unprojected context rather than random restart or standalone budget. The five repair-probe rows other than the independently reproduced \`R01936\` seed-diversification win do not reproduce at salts 1/2 on current code.

## Recorded follow-ups

1. Continue the reverse-oracle provenance work recorded in [\`reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md\`](../../../2026-08-22-technique-census-reverse-oracle-diagnosis.md): first reproduce an unmodified historical full-ladder winner locally, then pair it with lower-bound-cache clearing and progressively shorter attempt prefixes to identify the mutable state enabling the eight admissible-order wins. Reopen the five non-reproducing repair-probe rows only with a historical-commit replay or a current production win.
2. Reproduce the cross-run regret nominations on one current commit and join attempt-level lifecycle work to distinguish work before the relevant technique from total production work.
3. Join early/depth telemetry to the now-stratified failure-status matrix; final status alone does not expose cheap versus deep failure.
4. Inspect the generated singleton/doubleton JSON rows as regression-fixture nominations, then reproduce them on current code before adopting them.
5. Keep reverse-oracle diagnosis and flag-flip mechanism telemetry separate: both require targeted reruns rather than further outcome-matrix arithmetic.
`;
}

function main() {
    const argv = process.argv.slice(2);
    const positional = argv.filter(argument => !argument.startsWith('--'));
    const value = name => argv.find(argument => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
    const check = argv.includes('--check');
    const directory = positional[0] ?? DEFAULT_DIRECTORY;
    const productionRunDirectory = value('production-run') ?? DEFAULT_PRODUCTION_RUN;
    const frozenProductionRunDirectory = value('frozen-production-run') ?? FROZEN_PRODUCTION_RUN;
    const jsonOutput = positional[1] ?? path.join(directory, 'second-order-analysis.json');
    const markdownOutput = positional[2] ?? path.join(directory, 'second-order-analysis.md');
    const document = JSON.parse(readFileSync(path.join(directory, 'combined-cells.json'), 'utf8'));
    const coverage = JSON.parse(readFileSync(path.join(directory, 'level-technique-coverage.json'), 'utf8'));
    const descriptors = ['published', 'stress1', 'stress2'].flatMap(source =>
        loadCorpus(process.cwd(), source).levels.map(describeLevel));
    const productionRows = ['corpus1', 'corpus2'].flatMap(corpus => {
        const file = path.join(productionRunDirectory, `per-level-${corpus}.json`);
        return JSON.parse(readFileSync(file, 'utf8')).rows.map(row => ({ ...row, corpus }));
    });
    const frozenProductionRows = ['corpus1', 'corpus2'].flatMap(corpus => {
        const file = path.join(frozenProductionRunDirectory, `per-level-${corpus}.json`);
        const lifecycleFile = path.join(frozenProductionRunDirectory, `lifecycle-failure-map-${corpus}.json`);
        const lifecycle = new Map(JSON.parse(readFileSync(lifecycleFile, 'utf8')).levels
            .map(row => [row.id, row.winningTechnique]));
        return JSON.parse(readFileSync(file, 'utf8')).rows.map(row => ({
            ...row, corpus, lifecycleWinningTechnique: lifecycle.get(row.id) ?? null,
        }));
    });
    const result = analyzeTechniqueCensus(document, coverage, DEFAULT_THRESHOLDS, descriptors,
        productionRows, frozenProductionRows);
    const json = `${JSON.stringify(result, null, 2)}\n`;
    const markdown = renderTechniqueCensusSecondOrder(result, directory, {
        productionRun: path.basename(productionRunDirectory),
        frozenProductionRun: path.basename(frozenProductionRunDirectory),
    });
    if (check) {
        const stale = [[jsonOutput, json], [markdownOutput, markdown]]
            .filter(([file, expected]) => readFileSync(file, 'utf8') !== expected).map(([file]) => file);
        if (stale.length) throw new Error(`Stale second-order generated output: ${stale.join(', ')}`);
        console.log(`Second-order generated outputs are current (${result.sourceCells} T1 cells)`);
        return;
    }
    writeFileSync(jsonOutput, json);
    writeFileSync(markdownOutput, markdown);
    console.log(`Analyzed ${result.sourceCells} T1 cells across ${result.techniques} techniques; wrote ${jsonOutput} and ${markdownOutput}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
