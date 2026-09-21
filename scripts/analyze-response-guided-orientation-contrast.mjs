#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSolver } from '../modules/solver.js';
import { UNPACK } from '../modules/domain/cell-key.js';
import {
    analyzeRelativeAdvantage,
    DEFAULT_PAIRS,
} from './analyze-technique-relative-advantage.mjs';

export function describeStaticOrientationStructure(level) {
    const emptySummary = () => ({
        observations: 0, left: 0, right: 0, onAxis: 0,
        sideBalance: 0, signedMoment: 0, absoluteMoment: 0,
    });
    const summarize = pointKeys => {
        const points = [...pointKeys];
        if (!level.gateKeys.length || !points.length) return emptySummary();
        let observations = 0, left = 0, right = 0, onAxis = 0, crossSum = 0, absCrossSum = 0;
        const goal = UNPACK(level.goalKey);
        const scale = Math.max(1, level.grid.w * level.grid.h);
        for (const gateKey of level.gateKeys) {
            const gate = UNPACK(gateKey);
            const dx = goal.x - gate.x, dy = goal.y - gate.y;
            for (const pointKey of points) {
                const point = UNPACK(pointKey);
                const cross = dx * (point.y - gate.y) - dy * (point.x - gate.x);
                observations++;
                crossSum += cross;
                absCrossSum += Math.abs(cross);
                if (cross > 0) left++;
                else if (cross < 0) right++;
                else onAxis++;
            }
        }
        return {
            observations, left, right, onAxis,
            sideBalance: (left - right) / observations,
            signedMoment: crossSum / (observations * scale),
            absoluteMoment: absCrossSum / (observations * scale),
        };
    };

    const goal = UNPACK(level.goalKey);
    const gateVectors = level.gateKeys.map(key => {
        const gate = UNPACK(key);
        return { dx: goal.x - gate.x, dy: goal.y - gate.y };
    });
    const centerX2 = level.grid.w - 1, centerY2 = level.grid.h - 1;
    let centerLeft = 0, centerRight = 0;
    for (const gateKey of level.gateKeys) {
        const gate = UNPACK(gateKey);
        const cross = 2 * (goal.x - gate.x) * (centerY2 - 2 * gate.y)
            - 2 * (goal.y - gate.y) * (centerX2 - 2 * gate.x);
        if (cross > 0) centerLeft++;
        else if (cross < 0) centerRight++;
    }

    const portals = [...level.portalMap.keys()].sort((a, b) => a - b);
    const flippers = [...level.flippingFilterMap.keys()];
    const constrained = new Set([
        ...level.mustPassKeys, ...level.mustCrossKeys, ...portals, ...flippers,
        ...(level.surroundKeys ?? []), ...(level.adjacentTurnKeys ?? []),
    ]);

    return {
        gateCount: level.gateKeys.length,
        gateGoalDxMean: gateVectors.length ? gateVectors.reduce((sum, row) => sum + row.dx, 0) / gateVectors.length : 0,
        gateGoalDyMean: gateVectors.length ? gateVectors.reduce((sum, row) => sum + row.dy, 0) / gateVectors.length : 0,
        gateGoalCenterSideBalance: level.gateKeys.length ? (centerLeft - centerRight) / level.gateKeys.length : 0,
        blocks: summarize(level.blockSet),
        mustPass: summarize(level.mustPassKeys),
        mustCross: summarize(level.mustCrossKeys),
        portalTerminals: summarize(portals),
        flippers: summarize(flippers),
        constrained: summarize(constrained),
    };
}

const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const variance = (values, m) => values.length
    ? values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length
    : null;

function standardizedDifference(left, right, feature) {
    const a = left.map(row => row[feature]).filter(Number.isFinite);
    const b = right.map(row => row[feature]).filter(Number.isFinite);
    if (!a.length || !b.length) return null;
    const ma = mean(a), mb = mean(b);
    const pooled = Math.sqrt((variance(a, ma) + variance(b, mb)) / 2);
    return {
        feature,
        leftMean: ma,
        rightMean: mb,
        standardizedDifference: pooled ? (ma - mb) / pooled : 0,
    };
}

function orientationFeatures(raw, Solver) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const structure = describeStaticOrientationStructure(level);
    const out = {
        gateGoalDxMean: structure.gateGoalDxMean,
        gateGoalDyMean: structure.gateGoalDyMean,
        gateGoalCenterSideBalance: structure.gateGoalCenterSideBalance,
    };
    for (const category of ['blocks', 'mustPass', 'mustCross', 'portalTerminals', 'flippers', 'constrained']) {
        const row = structure[category];
        out[`${category}SideBalance`] = row.sideBalance;
        out[`${category}SignedMoment`] = row.signedMoment;
        out[`${category}AbsoluteMoment`] = row.absoluteMoment;
    }
    return out;
}

export function analyzeResponseGuidedOrientationContrasts({
    base,
    levels,
    pairs = DEFAULT_PAIRS,
} = {}) {
    if (!Array.isArray(base?.levels) || !base.levels.length) {
        throw new Error('Expected non-empty base.levels');
    }
    if (!Array.isArray(levels) || !levels.length) {
        throw new Error('Expected non-empty raw levels');
    }

    const rawById = new Map();
    for (const level of levels) {
        const id = String(level?.id ?? '');
        if (!id) throw new Error('raw level is missing id');
        if (rawById.has(id)) throw new Error(`duplicate raw level id: ${id}`);
        rawById.set(id, level);
    }

    const relative = analyzeRelativeAdvantage(base, pairs);
    const Solver = createSolver();
    const cache = new Map();
    const featuresFor = id => {
        const key = String(id);
        if (cache.has(key)) return cache.get(key);
        const raw = rawById.get(key);
        if (!raw) throw new Error(`missing raw level for contrast id: ${key}`);
        const features = orientationFeatures(raw, Solver);
        cache.set(key, features);
        return features;
    };

    const pairResults = relative.pairs.map(pair => {
        const left = pair.contrastPopulation.leftOnlyIds.map(featuresFor);
        const right = pair.contrastPopulation.rightOnlyIds.map(featuresFor);
        const featureNames = [...new Set([...left, ...right].flatMap(row => Object.keys(row)))].sort();
        const effects = featureNames
            .map(feature => standardizedDifference(left, right, feature))
            .filter(Boolean)
            .sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference));

        return {
            leftAction: pair.leftAction,
            rightAction: pair.rightAction,
            evidenceRole: 'outcome-selected-development',
            premiseUse: 'offline-premise-nomination-only',
            contrastPopulation: pair.contrastPopulation,
            support: {
                leftOnly: pair.leftOnly,
                rightOnly: pair.rightOnly,
                both: pair.both,
                neither: pair.neither,
            },
            legacyMaxAbsoluteStandardizedDifference: pair.maxAbsoluteStandardizedDifference,
            orientationEffects: effects,
        };
    });

    return {
        schemaVersion: 1,
        kind: 'pathfinder-response-guided-orientation-contrast',
        evidenceRole: 'observational-development',
        premiseUse: 'offline-premise-nomination-only',
        interpretation: {
            allowed: 'nominate transformation-aware geometry premises or selected traces',
            forbidden: 'production routing by historical level identity, observed winner, or mined threshold',
        },
        transformLaw: 'signed side balances/moments reverse under reflection; absolute moments are reflection-invariant',
        pairs: pairResults,
    };
}

const unwrap = document => Array.isArray(document) ? document : document.levels;

async function main() {
    const args = new Map(process.argv.slice(2).map(arg => arg.split('=', 2)));
    const basePath = args.get('--base') ?? 'reports/stress/technique-niches/2026-09-03/level-capability.json';
    const randomPath = args.get('--random') ?? 'data/stress/stress-levels-random.json';
    const stressPath = args.get('--stress') ?? 'data/stress/stress-levels.json';
    const publishedPath = args.get('--published') ?? 'data/levels.json';
    const outPath = args.get('--out') ?? 'tmp/response-guided-orientation-contrast.json';

    const base = JSON.parse(readFileSync(basePath, 'utf8'));
    const levels = [randomPath, stressPath, publishedPath]
        .flatMap(file => unwrap(JSON.parse(readFileSync(file, 'utf8'))) ?? []);

    const result = analyzeResponseGuidedOrientationContrasts({ base, levels });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outPath}: ${result.pairs.length} prespecified pair contrasts`);
}

if (process.argv[1] && ['analyze-response-guided-orientation-contrast.mjs', 'analyze-response-guided-orientation-contrast.bundle.mjs'].includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
