#!/usr/bin/env node
/**
 * Deterministic offline join of the frozen T1 technique census to legal static level features.
 * This is development/observational evidence: level ids are replay keys, never routing inputs.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { levelFeatures } from './stress/features.mjs';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const quantile = (xs, q) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor((s.length - 1) * q)];
};
const familyOf = (key) => key.startsWith('beam:') ? 'beam'
    : key.startsWith('ida:') ? 'ida'
        : key.startsWith('dfs:repair:') ? 'repair'
            : key.startsWith('dfs:') ? 'dfs' : 'other';

function serializableFeatures(raw) {
    const f = levelFeatures(raw);
    const navigableArea = Math.max(1, raw.reqLen / f.requiredPathCoverageRatio);
    const constrainedObjects = f.mustPass + f.mustCross + f.portalPairs * 2 + f.flippers
        + f.surround + f.mustTurn + f.adjTurn;
    return {
        width: f.w, height: f.h, area: f.area, navigableArea,
        requiredPathLength: f.reqLen, requiredIntersections: f.reqInt,
        requiredPathCoverageRatio: f.requiredPathCoverageRatio,
        objectDensity: (f.area - navigableArea) / f.area,
        constrainedObjects, constrainedObjectDensity: constrainedObjects / navigableArea,
        gates: f.gates, falseGoals: f.falseGoals, blocks: f.blocks,
        mustPass: f.mustPass, mustCross: f.mustCross, filters: f.staticFilters,
        flippingFilters: f.flippers, portals: f.portalPairs, geese: f.geese,
        surround: f.surround, mustTurn: f.mustTurn, adjacentTurn: f.adjTurn,
        turnConstraintLoad: f.surround + f.mustTurn + f.adjTurn + f.mustPass + f.mustCross,
        routingRegime: f.routingRegime,
    };
}

const effect = (supported, unsupported, key) => {
    const a = supported.map((r) => r.features[key]);
    const b = unsupported.map((r) => r.features[key]);
    const ma = mean(a), mb = mean(b);
    const variance = (xs, m) => mean(xs.map((x) => (x - m) ** 2));
    const pooled = Math.sqrt((variance(a, ma) + variance(b, mb)) / 2);
    return { feature: key, supportedMean: ma, unsupportedMean: mb, standardizedDifference: pooled ? (mb - ma) / pooled : 0 };
};

export function analyze({ cells, coverage, levels, sourceIdentities = {} }) {
    const rawById = new Map(levels.map((level) => [level.id, level]));
    const t1 = cells.filter((cell) => cell.tier === 'T1');
    const cellsByLevel = new Map();
    for (const cell of t1) {
        const key = `${cell.corpus}:${cell.levelId}`;
        if (!cellsByLevel.has(key)) cellsByLevel.set(key, []);
        cellsByLevel.get(key).push(cell);
    }
    const rows = coverage.map((entry) => {
        const levelCells = cellsByLevel.get(`${entry.corpus}:${entry.levelId}`) || [];
        const successful = levelCells.filter((cell) => cell.ok && cell.refereeValid !== false);
        // Coverage was produced by the reconciled census analyzer and attributes compound cells to
        // the actual winner. Crediting every member of a successful pair would create false solves.
        const solvingActions = [...new Set(entry.solvedByT1 ?? successful.map((cell) => cell.winningConfigKey).filter(Boolean))].sort();
        const solvingFamilies = [...new Set(solvingActions.map(familyOf))].sort();
        const solverCount = solvingActions.length;
        const raw = rawById.get(entry.levelId);
        if (!raw) throw new Error(`Missing static level ${entry.levelId}`);
        const failures = levelCells.filter((cell) => !cell.ok);
        const exhaustedFailures = failures.filter((cell) => cell.status === 'exhausted').length;
        const cappedFailures = failures.filter((cell) => cell.status !== 'exhausted').length;
        const productionSolved = Boolean(entry.wasSolvedByProduction);
        const isolatedOracleSolved = solverCount > 0;
        const supportedClass = !isolatedOracleSolved ? 'no-current-technique'
            : !productionSolved ? 'production-miss-isolated-solvable'
                : solverCount <= 2 ? 'thin-boundary' : 'broadly-supported';
        const solveNodes = successful.map((cell) => cell.nodesExpanded).filter(Number.isFinite);
        return {
            levelId: entry.levelId, corpus: entry.corpus, productionSolved, isolatedOracleSolved,
            solverCount, solvingFamilies, solvingActions,
            singleton: solverCount === 1, doubleton: solverCount === 2, supportedClass,
            cheapestObservedSolveNodes: quantile(solveNodes, 0), deepestObservedSolveNodes: quantile(solveNodes, 1),
            failureCensoring: { failedCells: failures.length, naturallyExhausted: exhaustedFailures, budgetOrOtherCensored: cappedFailures },
            familyId: raw.stressMeta?.familyId ?? null, parentId: raw.stressMeta?.parentId ?? null,
            features: serializableFeatures(raw),
        };
    });

    const actions = [...new Set(rows.flatMap((row) => row.solvingActions).concat(t1.flatMap((cell) => cell.techniqueKeys)))].sort().map((action) => {
        const eligible = t1.filter((cell) => cell.techniqueKeys.includes(action));
        const wins = rows.filter((row) => row.solvingActions.includes(action));
        const successCells = eligible.filter((cell) => cell.ok && (cell.winningConfigKey === action || (cell.techniqueKeys.length === 1 && !cell.winningConfigKey)));
        const failedCells = eligible.filter((cell) => !cell.ok);
        return {
            action, family: familyOf(action), eligibleCells: eligible.length, solvedLevels: wins.length,
            exclusiveLevels: wins.filter((row) => row.solverCount === 1).length,
            thinBoundaryLevels: wins.filter((row) => row.solverCount <= 2).length,
            productionMissWins: wins.filter((row) => !row.productionSolved).length,
            successfulNodes: { median: quantile(successCells.map((c) => c.nodesExpanded).filter(Number.isFinite), .5), p90: quantile(successCells.map((c) => c.nodesExpanded).filter(Number.isFinite), .9) },
            failedNodes: { median: quantile(failedCells.map((c) => c.nodesExpanded).filter(Number.isFinite), .5), p90: quantile(failedCells.map((c) => c.nodesExpanded).filter(Number.isFinite), .9) },
        };
    });
    const supported = rows.filter((r) => r.isolatedOracleSolved);
    const unsupported = rows.filter((r) => !r.isolatedOracleSolved);
    const numeric = Object.keys(rows[0].features).filter((key) => typeof rows[0].features[key] === 'number');
    const routingRegimes = [...new Set(rows.map((r) => r.features.routingRegime))].sort().map((routingRegime) => {
        const all = rows.filter((r) => r.features.routingRegime === routingRegime);
        const no = all.filter((r) => !r.isolatedOracleSolved);
        return { routingRegime, levels: all.length, unsupported: no.length, unsupportedRate: no.length / all.length,
            unsupportedEnrichment: (no.length / unsupported.length) / (all.length / rows.length) };
    });
    return {
        schemaVersion: 1, evidenceRole: 'observational-development', sourceIdentities,
        summary: {
            levels: rows.length, productionSolved: rows.filter((r) => r.productionSolved).length,
            productionUnsolved: rows.filter((r) => !r.productionSolved).length,
            isolatedOracleSolved: supported.length, noCurrentTechnique: unsupported.length,
            productionMissIsolatedSolvable: rows.filter((r) => r.supportedClass === 'production-miss-isolated-solvable').length,
            singleton: rows.filter((r) => r.singleton).length, doubleton: rows.filter((r) => r.doubleton).length,
        },
        supportedVsUnsupportedEffects: numeric.map((key) => effect(supported, unsupported, key)).sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference)),
        routingRegimes, actions, levels: rows,
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const cellsPath = args.get('--cells') ?? 'reports/stress/technique-census/32240161854/combined-cells.json';
    const coveragePath = args.get('--coverage') ?? 'reports/stress/technique-census/32240161854/level-technique-coverage.json';
    const randomPath = args.get('--random') ?? 'data/stress/stress-levels-random.json';
    const stressPath = args.get('--stress') ?? 'data/stress/stress-levels.json';
    const publishedPath = args.get('--published') ?? 'data/levels.json';
    const outPath = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-01/level-capability.json';
    const read = (p) => readFileSync(p, 'utf8');
    const unwrap = (text) => { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : parsed.levels; };
    const texts = Object.fromEntries([cellsPath, coveragePath, randomPath, stressPath, publishedPath].map((p) => [p, read(p)]));
    const result = analyze({
        cells: JSON.parse(texts[cellsPath]).results, coverage: JSON.parse(texts[coveragePath]),
        levels: [...unwrap(texts[randomPath]), ...unwrap(texts[stressPath]), ...unwrap(texts[publishedPath])],
        sourceIdentities: Object.fromEntries(Object.entries(texts).map(([p, text]) => [p, `sha256:${sha256(text)}`])),
    });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outPath}: ${result.summary.levels} levels, ${result.summary.noCurrentTechnique} unsupported`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
