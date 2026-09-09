#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { mustCrossKeysOf, requiredPathCoverageRatio } from '../../modules/domain/hint-novelty.ts';
import { NEAR_HAMILTONIAN_COVERAGE_THRESHOLD } from '../../modules/domain/path-features.ts';
import {
    buildBucketProfile,
    extractObjectives,
} from './solution-profile-lib.mjs';
import {
    PROVENANCE_SOURCES,
    bucketHintsBySource,
} from './provenance-source-taxonomy.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));

const aliases = {
    published: 'data/levels.json',
    stress1: 'data/stress/stress-levels.json',
    corpus1: 'data/stress/stress-levels.json',
    stress2: 'data/stress/stress-levels-random.json',
    corpus2: 'data/stress/stress-levels-random.json',
};
const corpus = args.get('--corpus') || 'stress2';
const levelsJson = args.get('--levels-json') || aliases[corpus] || corpus;
const minHints = Number(args.get('--min-hints') || 3);
const seed = Number(args.get('--seed') || 20260703);
const levels = readLevelsWithHints(levelsJson);

function buildLevel(level, index) {
    const hints = level?.hintRecords || [];
    const sourceBuckets = bucketHintsBySource(hints);
    if (!hints.length) {
        return {
            level: level?.id || index + 1,
            hintCount: 0,
            sourceCounts: Object.fromEntries(PROVENANCE_SOURCES.map(source => [source, 0])),
            combined: null,
            bySource: {},
        };
    }

    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    const bySource = {};
    for (const [source, bucket] of sourceBuckets) {
        bySource[source] = bucket.length >= minHints
            ? buildBucketProfile(bucket, level, objectives, mcKeys, useCrossings, seed)
            : { pathCount: bucket.length, insufficientData: true };
    }
    return {
        level: level.id || index + 1,
        hintCount: hints.length,
        sourceCounts: Object.fromEntries([...sourceBuckets].map(([source, bucket]) => [source, bucket.length])),
        combined: buildBucketProfile(hints, level, objectives, mcKeys, useCrossings, seed),
        bySource,
    };
}

const profiles = levels.map(buildLevel);
const sourceCoverage = Object.fromEntries(PROVENANCE_SOURCES.map(source => [
    source,
    profiles.filter(profile => (profile.sourceCounts?.[source] || 0) >= minHints).length,
]));
const sourcePaths = Object.fromEntries(PROVENANCE_SOURCES.map(source => [
    source,
    profiles.reduce((sum, profile) => sum + (profile.sourceCounts?.[source] || 0), 0),
]));

const output = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    source: levelsJson,
    taxonomy: PROVENANCE_SOURCES,
    minHintsPerSource: minHints,
    seed,
    summary: {
        levels: profiles.length,
        levelsWithHints: profiles.filter(profile => profile.hintCount > 0).length,
        hints: profiles.reduce((sum, profile) => sum + profile.hintCount, 0),
        sourceCoverage,
        sourcePaths,
    },
    levels: profiles,
};

const json = JSON.stringify(output);
const out = args.get('--out');
if (out) writeFileSync(out, `${json}\n`);
else console.log(json);
