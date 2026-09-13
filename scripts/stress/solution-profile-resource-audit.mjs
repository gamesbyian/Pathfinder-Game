#!/usr/bin/env node

/**
 * Empirical audit probe for the solution-profile research resource.
 *
 * This is intentionally diagnostic-only. It measures sampling/provenance sensitivity of the
 * current profile representation and compares current nearest-profile distance with a conservative
 * support-aware interpretation. It does not alter solver/runtime policy or persisted hints.
 */

import { PACK } from '../../modules/domain/cell-key.ts';
import { NEAR_HAMILTONIAN_COVERAGE_THRESHOLD } from '../../modules/domain/path-features.ts';
import { mustCrossKeysOf, requiredPathCoverageRatio } from '../../modules/domain/hint-novelty.ts';
import { readLevelsWithHints } from '../level-data-io.mjs';
import {
    PROFILE_DISTANCE_WEIGHTS,
    buildBucketProfile,
    extractObjectives,
    profileDistance,
    profileDistanceTerms,
} from './solution-profile-lib.mjs';
import {
    classifyProvenanceOrigin,
    provenanceDependencyStratum,
} from './provenance-source-taxonomy.mjs';

const CORPORA = [
    { id: 'published', path: 'data/levels.json', library: true },
    { id: 'corpus1', path: 'data/stress/stress-levels.json', library: true },
    { id: 'corpus2', path: 'data/stress/stress-levels-random.json', library: false },
];
const PREFIX_SIZES = [1, 2, 3, 5, 10];
const SELF_RANK_PREFIXES = [1, 3, 5];
const TOTAL_DISTANCE_WEIGHT = Object.values(PROFILE_DISTANCE_WEIGHTS).reduce((sum, v) => sum + v, 0);

function finiteFoundAt(hint) {
    const values = (hint?.provenance || [])
        .map((entry) => Date.parse(entry?.foundAt))
        .filter(Number.isFinite);
    return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

function discoveryOrderedHints(hints) {
    return [...hints]
        .map((hint, index) => ({ hint, index, foundAt: finiteFoundAt(hint) }))
        .sort((a, b) => (a.foundAt - b.foundAt) || (a.index - b.index))
        .map(({ hint }) => hint);
}

function buildProfile(level, hints) {
    if (!hints.length) return null;
    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    return buildBucketProfile(hints, level, objectives, mcKeys, useCrossings);
}

function quantile(values, q) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function summarizeNumeric(values) {
    const clean = values.filter(Number.isFinite);
    return {
        n: clean.length,
        median: quantile(clean, 0.5),
        p90: quantile(clean, 0.9),
        mean: clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : null,
    };
}

function supportAwareDistance(a, b) {
    const terms = profileDistanceTerms(a, b);

    if ((a.prefixDiversity?.pathsSampled ?? 0) < 2 || (b.prefixDiversity?.pathsSampled ?? 0) < 2) {
        terms.prefixDiversity = null;
    }
    if ((a.pairwiseDistinctiveness?.pairsCompared ?? 0) < 1 || (b.pairwiseDistinctiveness?.pairsCompared ?? 0) < 1) {
        terms.pairwiseDistinctiveness = null;
    }
    if (a.discoverySaturation?.plateauFraction == null || b.discoverySaturation?.plateauFraction == null) {
        terms.discoverySaturation = null;
    }
    if ((a.pathCount ?? 0) < 2 || (b.pathCount ?? 0) < 2) {
        terms.mustCrossRigidity = null;
    }
    if ((a.turnDistribution?.turnRateMean ?? 0) === 0 || (b.turnDistribution?.turnRateMean ?? 0) === 0) {
        terms.turnChirality = null;
    }

    let weighted = 0;
    let weight = 0;
    let axes = 0;
    for (const [name, value] of Object.entries(terms)) {
        if (value == null || Number.isNaN(value)) continue;
        const w = PROFILE_DISTANCE_WEIGHTS[name];
        weighted += w * Math.min(1, value);
        weight += w;
        axes += 1;
    }
    return {
        distance: weight ? weighted / weight : 1,
        comparableWeight: weight,
        comparableWeightFraction: weight / TOTAL_DISTANCE_WEIGHT,
        comparableAxes: axes,
        terms,
    };
}

function hintSupport(hints) {
    const strata = new Set();
    const origins = new Set();
    let events = 0;
    let datedHints = 0;
    for (const hint of hints) {
        if (Number.isFinite(finiteFoundAt(hint))) datedHints += 1;
        for (const entry of hint?.provenance || []) {
            events += 1;
            strata.add(provenanceDependencyStratum(entry));
            origins.add(classifyProvenanceOrigin(entry));
        }
    }
    return {
        hints: hints.length,
        provenanceEvents: events,
        dependencyStrata: strata.size,
        origins: origins.size,
        datedHints,
    };
}

function corpusInventory(corpus) {
    const hintCounts = corpus.entries.map((entry) => entry.hints.length);
    const support = corpus.entries.map((entry) => hintSupport(entry.hints));
    const eventCounts = support.map((s) => s.provenanceEvents);
    const stratumCounts = support.map((s) => s.dependencyStrata);
    const eventToStratumRatios = support
        .filter((s) => s.provenanceEvents > 0 && s.dependencyStrata > 0)
        .map((s) => s.provenanceEvents / s.dependencyStrata);
    return {
        levels: corpus.entries.length,
        levelsWithHints: hintCounts.filter((n) => n > 0).length,
        hintCount: summarizeNumeric(hintCounts.filter((n) => n > 0)),
        levelsByMinimumHintCount: Object.fromEntries(PREFIX_SIZES.map((k) => [k, hintCounts.filter((n) => n >= k).length])),
        provenanceEventCount: summarizeNumeric(eventCounts.filter((n) => n > 0)),
        dependencyStratumCount: summarizeNumeric(stratumCounts.filter((n) => n > 0)),
        provenanceEventsPerDependencyStratum: summarizeNumeric(eventToStratumRatios),
        levelsWithMultipleOrigins: support.filter((s) => s.origins >= 2).length,
        levelsWithAllHintsDated: support.filter((s) => s.hints > 0 && s.datedHints === s.hints).length,
    };
}

function convergenceAudit(corpora) {
    const buckets = Object.fromEntries(PREFIX_SIZES.map((k) => [k, {
        currentDistances: [],
        supportAwareDistances: [],
        supportAwareCoverage: [],
        rigidityEligible: 0,
        apparentRigidThenNonRigid: 0,
        noTurnChiralityComparisons: 0,
    }]));

    for (const corpus of corpora) {
        for (const entry of corpus.entries) {
            if (entry.hints.length < 2) continue;
            const ordered = discoveryOrderedHints(entry.hints);
            const full = buildProfile(entry.level, ordered);
            if (!full) continue;
            for (const k of PREFIX_SIZES) {
                if (ordered.length < k || k === ordered.length) continue;
                const partial = buildProfile(entry.level, ordered.slice(0, k));
                const bucket = buckets[k];
                bucket.currentDistances.push(profileDistance(partial, full));
                const conservative = supportAwareDistance(partial, full);
                bucket.supportAwareDistances.push(conservative.distance);
                bucket.supportAwareCoverage.push(conservative.comparableWeightFraction);
                if ((partial.turnDistribution?.turnRateMean ?? 0) === 0 || (full.turnDistribution?.turnRateMean ?? 0) === 0) {
                    bucket.noTurnChiralityComparisons += 1;
                }
                if (partial.mustCrossOrder && full.mustCrossOrder && partial.mustCrossOrder.rigid) {
                    bucket.rigidityEligible += 1;
                    if (!full.mustCrossOrder.rigid) bucket.apparentRigidThenNonRigid += 1;
                }
            }
        }
    }

    return Object.fromEntries(Object.entries(buckets).map(([k, b]) => [k, {
        currentDistanceToFull: summarizeNumeric(b.currentDistances),
        supportAwareDistanceToFull: summarizeNumeric(b.supportAwareDistances),
        supportAwareComparableWeightFraction: summarizeNumeric(b.supportAwareCoverage),
        apparentRigidThenNonRigid: b.apparentRigidThenNonRigid,
        apparentRigidPrefixCases: b.rigidityEligible,
        apparentRigidityFailureRate: b.rigidityEligible ? b.apparentRigidThenNonRigid / b.rigidityEligible : null,
        comparisonsWhereChiralityWasUndefinedOnOneSide: b.noTurnChiralityComparisons,
    }]));
}

function makeLibraryPool(corpora) {
    const pool = [];
    for (const corpus of corpora.filter((c) => c.library)) {
        for (const entry of corpus.entries) {
            if (!entry.hints.length) continue;
            const ordered = discoveryOrderedHints(entry.hints);
            const profile = buildProfile(entry.level, ordered);
            if (!profile) continue;
            pool.push({
                id: entry.id,
                level: entry.level,
                hints: ordered,
                profile,
            });
        }
    }
    return pool;
}

function rankOfSelf(targetProfile, selfId, pool, distanceFn) {
    const ranked = pool
        .map((candidate) => ({ id: candidate.id, d: distanceFn(targetProfile, candidate.profile) }))
        .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id));
    return ranked.findIndex((row) => row.id === selfId) + 1;
}

function selfRetrievalAudit(pool) {
    const result = {};
    for (const k of SELF_RANK_PREFIXES) {
        const currentRanks = [];
        const supportAwareRanks = [];
        for (const entry of pool) {
            if (entry.hints.length < Math.max(5, k + 1)) continue;
            const partial = buildProfile(entry.level, entry.hints.slice(0, k));
            currentRanks.push(rankOfSelf(partial, entry.id, pool, profileDistance));
            supportAwareRanks.push(rankOfSelf(partial, entry.id, pool, (a, b) => supportAwareDistance(a, b).distance));
        }
        const summarizeRanks = (ranks) => ({
            n: ranks.length,
            top1: ranks.filter((r) => r === 1).length,
            top5: ranks.filter((r) => r <= 5).length,
            top10: ranks.filter((r) => r <= 10).length,
            top1Rate: ranks.length ? ranks.filter((r) => r === 1).length / ranks.length : null,
            top5Rate: ranks.length ? ranks.filter((r) => r <= 5).length / ranks.length : null,
            medianRank: quantile(ranks, 0.5),
            p90Rank: quantile(ranks, 0.9),
        });
        result[k] = {
            currentDistance: summarizeRanks(currentRanks),
            supportAwareDistance: summarizeRanks(supportAwareRanks),
        };
    }
    return result;
}

function corpus2WitnessRankingAudit(corpus2, pool) {
    const currentTop = [];
    const supportTop = [];
    const top5Overlap = [];
    let targetCount = 0;
    let targetsWithUnsupportedCurrentAxes = 0;

    for (const entry of corpus2.entries) {
        const pairs = entry.level?.stressMeta?.witnessSolution;
        if (!Array.isArray(pairs) || !pairs.length) continue;
        targetCount += 1;
        const witnessHint = {
            path: pairs.map(([x, y]) => PACK(x - 1, y - 1)),
            provenance: [],
        };
        const profile = buildProfile(entry.level, [witnessHint]);
        const rawTerms = profileDistanceTerms(profile, pool[0]?.profile || profile);
        if ((profile.prefixDiversity?.pathsSampled ?? 0) < 2 ||
            (profile.pairwiseDistinctiveness?.pairsCompared ?? 0) < 1 ||
            profile.discoverySaturation?.plateauFraction == null ||
            (profile.turnDistribution?.turnRateMean ?? 0) === 0) {
            targetsWithUnsupportedCurrentAxes += 1;
        }

        const currentRanked = pool
            .map((candidate) => ({ id: candidate.id, d: profileDistance(profile, candidate.profile) }))
            .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id));
        const supportRanked = pool
            .map((candidate) => ({ id: candidate.id, d: supportAwareDistance(profile, candidate.profile).distance }))
            .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id));
        currentTop.push(currentRanked[0]?.id || null);
        supportTop.push(supportRanked[0]?.id || null);
        const a = new Set(currentRanked.slice(0, 5).map((r) => r.id));
        const b = new Set(supportRanked.slice(0, 5).map((r) => r.id));
        top5Overlap.push([...a].filter((id) => b.has(id)).length / 5);
    }

    const changedTop1 = currentTop.filter((id, i) => id !== supportTop[i]).length;
    return {
        targets: targetCount,
        targetsWithAtLeastOneUnsupportedCurrentAxisByConstruction: targetsWithUnsupportedCurrentAxes,
        top1ChangedWhenUnsupportedAxesAreSkipped: changedTop1,
        top1ChangeRate: targetCount ? changedTop1 / targetCount : null,
        top5SetOverlap: summarizeNumeric(top5Overlap),
    };
}

function loadCorpora() {
    return CORPORA.map((spec) => {
        const levels = readLevelsWithHints(spec.path);
        return {
            ...spec,
            entries: levels.map((level, index) => ({
                id: `${spec.id}#${level?.id || index + 1}`,
                level,
                hints: level?.hintRecords || [],
            })),
        };
    });
}

function main() {
    const corpora = loadCorpora();
    const libraryPool = makeLibraryPool(corpora);
    const corpus2 = corpora.find((c) => c.id === 'corpus2');

    const report = {
        generatedAt: new Date().toISOString(),
        purpose: 'diagnostic-only solution-profile research-resource audit',
        corpusInventory: Object.fromEntries(corpora.map((c) => [c.id, corpusInventory(c)])),
        samplingConvergence: convergenceAudit(corpora),
        librarySelfRetrieval: selfRetrievalAudit(libraryPool),
        corpus2SingleWitnessRankingSensitivity: corpus2WitnessRankingAudit(corpus2, libraryPool),
        notes: [
            'Discovery-prefix analyses use earliest persisted provenance foundAt; undated hints retain artifact order after dated hints.',
            'Dependency strata reuse the shared provenance taxonomy and are conservative aggregation units, not claims of statistical independence.',
            'The support-aware distance is an audit counterfactual only: it skips axes whose current representation has insufficient support; it is not proposed as a production policy.',
            'Self-retrieval asks whether a partial sample from a level recognizes that same level’s full profile among the library; it is a representation-stability diagnostic, not a solver-performance metric.',
        ],
    };
    console.log(JSON.stringify(report, null, 2));
}

main();
