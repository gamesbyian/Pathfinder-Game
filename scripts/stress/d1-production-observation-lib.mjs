import { assertResearchBlock, researchPopulationIdentity } from '../solver-research-block-lineage.mjs';

export const D1_DEVELOPMENT_PARENT_IDS = Object.freeze(['S00030', 'R00104', 'R03147']);

export function pathIdentity(path) {
    return JSON.stringify(path);
}

export function candidateRevisitCells(path, level, prep) {
    const seen = new Set();
    const out = [];
    for (const key of path) {
        if (seen.has(key)) continue;
        seen.add(key);
        if (prep.gateFlags[key]) continue;
        if (key === level.goalKey) continue;
        if (level.portalMap.has(key)) continue;
        if (level.filterMap.has(key) || level.flippingFilterMap.has(key)) continue;
        out.push(key);
    }
    return out;
}

export function isPathPrefix(prefix, path) {
    if (!Array.isArray(prefix) || !Array.isArray(path) || prefix.length > path.length) return false;
    for (let i = 0; i < prefix.length; i++) if (prefix[i] !== path[i]) return false;
    return true;
}

export function freezeD1Eligibility(decision, level, prep, { cutoffRadius = 2 } = {}) {
    if (!Number.isInteger(cutoffRadius) || cutoffRadius < 0) throw new Error('cutoffRadius must be a non-negative integer');
    const ranked = decision?.context?.rankedCandidates;
    const beamWidth = decision?.context?.beamWidth;
    if (!Array.isArray(ranked) || !Number.isInteger(beamWidth) || beamWidth < 1) {
        return { eligible: false, reason: 'missing-ranked-decision-context', candidates: [] };
    }

    const low = Math.max(1, beamWidth - cutoffRadius);
    const high = beamWidth + cutoffRadius;
    const candidates = ranked
        .filter(row => Number.isInteger(row.rank) && row.rank >= low && row.rank <= high)
        .map(row => {
            const path = JSON.parse(row.candidateId);
            const revisitCells = candidateRevisitCells(path, level, prep);
            const remainingIntersectionDeficit = Number.isFinite(row.ints)
                ? level.requiredIntersections - row.ints
                : null;
            return {
                candidateId: row.candidateId,
                rank: row.rank,
                score: row.score,
                insertionOrder: row.insertionOrder,
                retained: !!row.retained,
                ints: row.ints,
                remainingIntersectionDeficit,
                revisitCandidateCount: revisitCells.length,
                eligible: Number.isFinite(remainingIntersectionDeficit)
                    && remainingIntersectionDeficit > 0
                    && revisitCells.length > 0,
            };
        });

    const eligible = candidates.filter(row => row.eligible);
    const retained = eligible.filter(row => row.retained);
    const culled = eligible.filter(row => !row.retained);
    return {
        eligible: retained.length > 0 && culled.length > 0,
        reason: retained.length === 0 ? 'no-eligible-retained-candidate'
            : culled.length === 0 ? 'no-eligible-culled-candidate' : 'eligible',
        cutoffRadius,
        rankWindow: [low, high],
        candidates,
        eligibleCandidateIds: eligible.map(row => row.candidateId),
        eligibleRetainedCandidateIds: retained.map(row => row.candidateId),
        eligibleCulledCandidateIds: culled.map(row => row.candidateId),
    };
}

export function classifyD1CandidateQueryResults({ candidateCount, outcomes }) {
    if (!Number.isInteger(candidateCount) || candidateCount <= 0) {
        return { support: 'UNSUPPORTED', value: null, queried: 0 };
    }
    const list = Array.isArray(outcomes) ? outcomes : [];
    if (list.some(row => row.label === 'live' && row.refereeValid === true)) {
        return { support: 'SUPPORTED', value: 'NONZERO', queried: list.length };
    }
    const dead = list.filter(row => row.label === 'dead').length;
    if (dead === candidateCount && list.length === candidateCount) {
        return { support: 'SUPPORTED', value: 'ZERO', queried: list.length };
    }
    return { support: 'UNKNOWN', value: null, queried: list.length };
}

export function buildD1ResearchBlock({
    blockId = null,
    questionId,
    corpus,
    sourceRevision,
    evidenceRole = 'development',
    parentIds,
    parentContentIdentities,
    captureArtifact,
    runRef = null,
} = {}) {
    const populationIdentity = researchPopulationIdentity(parentIds, parentContentIdentities);
    const resolvedBlockId = blockId || `${questionId}:${populationIdentity.slice('sha256:'.length, 'sha256:'.length + 12)}`;
    const researchBlock = assertResearchBlock({
        blockId: resolvedBlockId,
        questionId,
        sourceRegime: corpus,
        sourceRevision,
        evidenceRole,
        independentUnit: 'parent-level',
        parentIds,
        parentContentIdentities,
        sourceArtifactRefs: [corpus, captureArtifact],
        createdBy: {
            producer: 'scripts/stress/capture-d1-production-decisions.mjs',
            manifestRef: captureArtifact,
            runRef,
        },
        generationRef: null,
        consumptionEvents: [],
    }, { populationIdentity });
    return { populationIdentity, researchBlock };
}

export function summarizeD1AnnotatedDecisions(records) {
    let eligibleDecisions = 0;
    let fullySupportedDecisions = 0;
    let cutoffCrossingDisagreements = 0;
    let rankingDisagreements = 0;
    let informationCostMs = 0;
    const parents = new Set();
    for (const record of records ?? []) {
        const eligibility = record.context?.d1Eligibility;
        if (!eligibility?.eligible) continue;
        eligibleDecisions++;
        parents.add(record.parentId);
        const results = record.annotation?.d1?.candidateResults ?? [];
        informationCostMs += results.reduce((sum, row) => sum + (Number(row.informationCostMs) || 0), 0);
        const supported = results.filter(row => row.support === 'SUPPORTED');
        if (supported.length === eligibility.eligibleCandidateIds.length) fullySupportedDecisions++;

        const byId = new Map(results.map(row => [row.candidateId, row]));
        const retainedZero = eligibility.eligibleRetainedCandidateIds
            .map(id => byId.get(id)).filter(row => row?.value === 'ZERO');
        const culledNonzero = eligibility.eligibleCulledCandidateIds
            .map(id => byId.get(id)).filter(row => row?.value === 'NONZERO');
        if (retainedZero.length && culledNonzero.length) cutoffCrossingDisagreements++;

        const ranked = (eligibility.candidates ?? []).filter(row => row.eligible)
            .map(row => ({ ...row, d1: byId.get(row.candidateId)?.value ?? null }));
        const bestNonzeroRank = Math.min(...ranked.filter(row => row.d1 === 'NONZERO').map(row => row.rank), Infinity);
        const worstZeroAbove = ranked.some(row => row.d1 === 'ZERO' && row.rank < bestNonzeroRank);
        if (worstZeroAbove) rankingDisagreements++;
    }
    return {
        eligibleDecisions,
        independentParentsWithEligibility: parents.size,
        fullySupportedDecisions,
        cutoffCrossingDisagreements,
        rankingDisagreements,
        informationCostMs,
    };
}
