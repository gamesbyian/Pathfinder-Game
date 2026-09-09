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
    PROVENANCE_ORIGINS,
    PROVENANCE_FACETS,
    bucketHintsByOrigin,
    bucketHintsByFacet,
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

function countsFromBuckets(buckets) {
    return Object.fromEntries([...buckets].map(([name, bucket]) => [name, bucket.length]));
}

function profilesFromBuckets(buckets, level, objectives, mcKeys, useCrossings) {
    const result = {};
    for (const [name, bucket] of buckets) {
        result[name] = bucket.length >= minHints
            ? buildBucketProfile(bucket, level, objectives, mcKeys, useCrossings, seed)
            : { pathCount: bucket.length, insufficientData: true };
    }
    return result;
}

function buildLevel(level, index) {
    const hints = level?.hintRecords || [];
    const originBuckets = bucketHintsByOrigin(hints);
    const facetBuckets = bucketHintsByFacet(hints);
    if (!hints.length) {
        return {
            level: level?.id || index + 1,
            hintCount: 0,
            originCounts: Object.fromEntries(PROVENANCE_ORIGINS.map(origin => [origin, 0])),
            facetCounts: Object.fromEntries(PROVENANCE_FACETS.map(facet => [facet, 0])),
            combined: null,
            byOrigin: {},
            byFacet: {},
        };
    }

    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    return {
        level: level.id || index + 1,
        hintCount: hints.length,
        originCounts: countsFromBuckets(originBuckets),
        facetCounts: countsFromBuckets(facetBuckets),
        combined: buildBucketProfile(hints, level, objectives, mcKeys, useCrossings, seed),
        byOrigin: profilesFromBuckets(originBuckets, level, objectives, mcKeys, useCrossings),
        byFacet: profilesFromBuckets(facetBuckets, level, objectives, mcKeys, useCrossings),
    };
}

function coverage(names, countField, profiles) {
    return Object.fromEntries(names.map(name => [
        name,
        profiles.filter(profile => (profile[countField]?.[name] || 0) >= minHints).length,
    ]));
}

function paths(names, countField, profiles) {
    return Object.fromEntries(names.map(name => [
        name,
        profiles.reduce((sum, profile) => sum + (profile[countField]?.[name] || 0), 0),
    ]));
}

const profiles = levels.map(buildLevel);
const output = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 2,
    source: levelsJson,
    taxonomy: {
        origins: PROVENANCE_ORIGINS,
        facets: PROVENANCE_FACETS,
        capabilityAdmissibility: 'scripts/stress/provenance-classes.mjs',
    },
    minHintsPerBucket: minHints,
    seed,
    summary: {
        levels: profiles.length,
        levelsWithHints: profiles.filter(profile => profile.hintCount > 0).length,
        hints: profiles.reduce((sum, profile) => sum + profile.hintCount, 0),
        originCoverage: coverage(PROVENANCE_ORIGINS, 'originCounts', profiles),
        originPaths: paths(PROVENANCE_ORIGINS, 'originCounts', profiles),
        facetCoverage: coverage(PROVENANCE_FACETS, 'facetCounts', profiles),
        facetPaths: paths(PROVENANCE_FACETS, 'facetCounts', profiles),
    },
    levels: profiles,
};

const json = JSON.stringify(output);
const out = args.get('--out');
if (out) writeFileSync(out, `${json}\n`);
else console.log(json);
