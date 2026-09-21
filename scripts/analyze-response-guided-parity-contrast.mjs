#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSolver } from '../modules/solver.js';
import { describeStaticParityStructure } from '../modules/solver/parity-structure.js';
import {
    analyzeRelativeAdvantage,
    DEFAULT_PAIRS,
} from './analyze-technique-relative-advantage.mjs';

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

const countBy = values => {
    const out = {};
    for (const value of values) out[value] = (out[value] ?? 0) + 1;
    return out;
};

function parityFeatures(raw, Solver) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const structure = describeStaticParityStructure(level);
    const oddDemandGates = structure.gateRequiredTwistParity
        .filter(row => row.requiredTwistParity === 1).length;
    const evenDemandGates = structure.gateRequiredTwistParity.length - oddDemandGates;
    const portalPairs = structure.portalPairs.length;
    return {
        portalPairs,
        twistPortalPairs: structure.twistPortalPairs.length,
        sameParityPortalPairs: structure.sameParityPortalPairs.length,
        twistFraction: portalPairs ? structure.twistPortalPairs.length / portalPairs : 0,
        oddDemandGates,
        evenDemandGates,
        oddDemandFraction: structure.gateRequiredTwistParity.length
            ? oddDemandGates / structure.gateRequiredTwistParity.length
            : 0,
        mixedGateDemand: structure.gateDemand === 'mixed' ? 1 : 0,
        allOddGateDemand: structure.gateDemand === 'all-odd' ? 1 : 0,
        allEvenGateDemand: structure.gateDemand === 'all-even' ? 1 : 0,
        gateDemand: structure.gateDemand,
    };
}

export function analyzeResponseGuidedParityContrasts({
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
        const features = parityFeatures(raw, Solver);
        cache.set(key, features);
        return features;
    };

    const numericFeatures = [
        'portalPairs',
        'twistPortalPairs',
        'sameParityPortalPairs',
        'twistFraction',
        'oddDemandGates',
        'evenDemandGates',
        'oddDemandFraction',
        'mixedGateDemand',
        'allOddGateDemand',
        'allEvenGateDemand',
    ];

    const pairResults = relative.pairs.map(pair => {
        const left = pair.contrastPopulation.leftOnlyIds.map(featuresFor);
        const right = pair.contrastPopulation.rightOnlyIds.map(featuresFor);
        const parityEffects = numericFeatures
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
            legacyPortalCountEffect: pair.topEffects.find(effect => effect.feature === 'portals') ?? null,
            parityEffects,
            gateDemand: {
                leftOnly: countBy(left.map(row => row.gateDemand)),
                rightOnly: countBy(right.map(row => row.gateDemand)),
            },
        };
    });

    return {
        schemaVersion: 1,
        kind: 'pathfinder-response-guided-parity-contrast',
        evidenceRole: 'observational-development',
        premiseUse: 'offline-premise-nomination-only',
        interpretation: {
            allowed: 'nominate exact current-input parity/portal premises for Stage-0 testing',
            forbidden: 'production routing by historical level identity or observed winner',
        },
        pairs: pairResults,
    };
}

const unwrap = document => Array.isArray(document) ? document : document.levels;

async function main() {
    const args = new Map(process.argv.slice(2).map(arg => arg.split('=', 2)));
    const basePath = args.get('--base') ?? 'reports/stress/technique-niches/2026-09-01/level-capability.json';
    const randomPath = args.get('--random') ?? 'data/stress/stress-levels-random.json';
    const stressPath = args.get('--stress') ?? 'data/stress/stress-levels.json';
    const publishedPath = args.get('--published') ?? 'data/levels.json';
    const outPath = args.get('--out') ?? 'tmp/response-guided-parity-contrast.json';

    const base = JSON.parse(readFileSync(basePath, 'utf8'));
    const levels = [randomPath, stressPath, publishedPath]
        .flatMap(file => unwrap(JSON.parse(readFileSync(file, 'utf8'))) ?? []);

    const result = analyzeResponseGuidedParityContrasts({ base, levels });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outPath}: ${result.pairs.length} prespecified pair contrasts`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
