import { provenanceEventIdentity } from './hint-provenance-identity.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';

export function hintDiscoveryInputIdentity(entry) {
    const solver = entry?.solver ?? {};
    const search = entry?.search ?? {};
    const context = entry?.context ?? {};
    const execution = entry?.execution ?? {};
    return stableStringify({
        execution: {
            solverRequestIdentity: execution.solverRequestIdentity ?? null,
            protocolHash: execution.protocolHash ?? null,
            reproducibilityMode: execution.reproducibilityMode ?? null,
            arm: execution.arm ?? null,
        },
        solver: {
            id: solver.id ?? null,
            version: solver.version ?? null,
            technique: solver.technique ?? null,
            beamWidth: solver.beamWidth ?? null,
            gateKey: solver.gateKey ?? null,
            forcing: solver.forcing ?? null,
            attemptIndex: solver.attemptIndex ?? null,
            scoringProfileId: solver.scoringProfileId ?? null,
            orderingBiasId: solver.orderingBiasId ?? null,
            mechanicBucketRetention: solver.mechanicBucketRetention ?? null,
        },
        search: {
            workBudget: search.workBudget ?? null,
            randomSeed: search.randomSeed ?? null,
            seedSalt: search.seedSalt ?? null,
        },
        context: {
            usedExistingHints: context.usedExistingHints ?? null,
            hintGuided: context.hintGuided ?? null,
            levelRevision: context.levelRevision ?? null,
            isolatedTechnique: context.isolatedTechnique ?? null,
            techniqueCensusCell: context.techniqueCensusCell ?? null,
        },
    });
}

function randomizedTechnique(technique) {
    const value = String(technique ?? '');
    return value === 'repair' || value.includes('random') || value.includes('enumerat') || value.includes('prefix-anchored');
}

// Historical entries still expose only attempt-level recorded input and therefore remain a
// candidate screen requiring source-run reconciliation. Fresh Phase-3 entries can additionally
// carry execution.solverRequestIdentity; those groups are marked canonical-solver-request. A
// first-success race is explicitly excluded because that reproducibility mode does not promise a
// stable winning path even when its request identity matches.
export function inputComparability(entry) {
    const solver = entry?.solver ?? {};
    const search = entry?.search ?? {};
    const context = entry?.context ?? {};
    const execution = entry?.execution ?? {};
    if (solver.id !== 'pathfinder-solver') return { comparable: false, reason: 'non-pathfinder-producer' };
    if (!solver.version) return { comparable: false, reason: 'missing-solver-version' };
    if (!context.levelRevision) return { comparable: false, reason: 'missing-level-revision' };
    if (context.usedExistingHints !== false || context.hintGuided !== false) {
        return { comparable: false, reason: 'hint-dependent-or-ambiguous' };
    }
    if (execution.reproducibilityMode === 'first-success-race') {
        return { comparable: false, reason: 'first-success-race-not-path-deterministic' };
    }
    if (!Number.isFinite(search.workBudget)) return { comparable: false, reason: 'missing-deterministic-work-budget' };
    if (randomizedTechnique(solver.technique) && !Number.isFinite(search.randomSeed)) {
        return { comparable: false, reason: 'missing-random-seed' };
    }
    const identityBasis = typeof execution.solverRequestIdentity === 'string' && execution.solverRequestIdentity.length > 0
        ? 'canonical-solver-request'
        : 'legacy-recorded-input';
    return { comparable: true, reason: 'deterministic-input-envelope', identityBasis };
}

function addObservation(map, key, pathSignature, entry, identityBasis = null) {
    let group = map.get(key);
    if (!group) {
        group = { paths: new Set(), foundAt: new Set(), observations: 0, example: entry, identityBasis };
        map.set(key, group);
    }
    group.paths.add(pathSignature);
    if (entry?.foundAt) group.foundAt.add(entry.foundAt);
    group.observations += 1;
}

export function auditHintFile(levelId, hints) {
    const exact = new Map();
    const inputs = new Map();
    const reasonCounts = new Map();
    let provenanceEvents = 0;
    let comparableEvents = 0;
    let canonicalComparableEvents = 0;
    let legacyComparableEvents = 0;

    for (const hint of hints ?? []) {
        const pathSignature = (hint?.path ?? []).join(',');
        for (const entry of hint?.provenance ?? []) {
            provenanceEvents += 1;
            addObservation(exact, provenanceEventIdentity(entry), pathSignature, entry);
            const comparison = inputComparability(entry);
            if (!comparison.comparable) {
                reasonCounts.set(comparison.reason, (reasonCounts.get(comparison.reason) ?? 0) + 1);
                continue;
            }
            comparableEvents += 1;
            if (comparison.identityBasis === 'canonical-solver-request') canonicalComparableEvents += 1;
            else legacyComparableEvents += 1;
            addObservation(inputs, hintDiscoveryInputIdentity(entry), pathSignature, entry, comparison.identityBasis);
        }
    }

    const exactEventCrossPath = [];
    for (const [identity, group] of exact) {
        if (group.paths.size > 1) exactEventCrossPath.push({
            levelId, identity, paths: group.paths.size, runTimestamps: group.foundAt.size,
            observations: group.observations, identityBasis: group.identityBasis ?? null, example: group.example,
        });
    }

    const repeatRunRecordedInputCollision = [];
    const repeatRunStable = [];
    for (const [identity, group] of inputs) {
        if (group.foundAt.size < 2) continue;
        const row = {
            levelId, identity, paths: group.paths.size, runTimestamps: group.foundAt.size,
            observations: group.observations, identityBasis: group.identityBasis ?? null, example: group.example,
        };
        if (group.paths.size > 1) repeatRunRecordedInputCollision.push(row);
        else repeatRunStable.push(row);
    }

    return {
        levelId,
        hints: hints?.length ?? 0,
        provenanceEvents,
        comparableEvents,
        canonicalComparableEvents,
        legacyComparableEvents,
        excludedReasons: Object.fromEntries([...reasonCounts].sort()),
        exactEventCrossPath,
        repeatRunRecordedInputCollision,
        repeatRunStable,
    };
}
