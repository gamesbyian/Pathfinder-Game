/**
 * Pure data-model helpers for the search-loss-evidence resource
 * (docs/solver-search-loss-evidence-implementation-plan.md, Phase 1).
 *
 * This module has no solver wiring: it only validates/identifies/collects the
 * "failure observations" and "failure annotations" layers (plan section 4).
 * The compact "failure response" layer (plan section 4.0) is a separate,
 * later Phase 3 concern and is intentionally out of scope here.
 */
import { isImmutableCommitSha, stableHash } from './solver-experiment-contract.mjs';
import { validateDecisionObservation } from './solver-decision-observation-lib.mjs';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;

export const SEARCH_LOSS_CAPTURE_KIND = 'pathfinder-search-loss-capture';
export const SEARCH_LOSS_ANNOTATION_KIND = 'pathfinder-search-loss-annotation';

export const SEARCH_LOSS_EVENT_KINDS = Object.freeze([
    'budget-terminal',
    'stage-terminal',
    'best-progress-transition',
    'score-width-cull',
    'mechanic-bucket-cull',
    'ints-bucket-cull',
    'frontier-representative',
]);
const EVENT_KINDS = new Set(SEARCH_LOSS_EVENT_KINDS);

export const SEARCH_LOSS_CAPTURE_REASONS = Object.freeze([
    'best-progress',
    'late-best-progress',
    'near-cutoff-retained',
    'near-cutoff-culled',
    'terminal-best',
    'frontier-sample',
    'progress-transition',
]);
const CAPTURE_REASONS = new Set(SEARCH_LOSS_CAPTURE_REASONS);

const DISPOSITIONS = new Set(['retained', 'culled', 'terminal', 'unknown']);
export const SEARCH_LOSS_REPLAY_BASES = Object.freeze(['replayable', 'identity-only', 'historical-unverified']);
const REPLAY_BASES = new Set(SEARCH_LOSS_REPLAY_BASES);

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const finiteNonNegative = value => Number.isFinite(value) && value >= 0;
const nonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
const cloneJsonRecord = value => JSON.parse(JSON.stringify(value));

function plainObjectOrNull(value) {
    return value === null || (typeof value === 'object' && value !== undefined && !Array.isArray(value));
}

function selectorCountIssues(base, summary) {
    const issues = [];
    if (!plainObjectOrNull(summary) || summary === null) {
        issues.push(`${base}`);
        return issues;
    }
    if (!nonNegativeInteger(summary.observed)) issues.push(`${base}.observed`);
    if (!nonNegativeInteger(summary.retained)) issues.push(`${base}.retained`);
    if (typeof summary.truncated !== 'boolean') issues.push(`${base}.truncated`);
    if (nonNegativeInteger(summary.observed) && nonNegativeInteger(summary.retained)) {
        if (summary.retained > summary.observed) issues.push(`${base}(retained>observed)`);
        if (summary.truncated === true && summary.retained >= summary.observed) issues.push(`${base}(truncated-without-loss)`);
    }
    return issues;
}

/** Canonical stable identity for a capsule, derived from semantic source fields (plan 4.2). */
export function searchLossCapsuleIdentity(row) {
    return stableHash({
        kind: 'search-loss-capsule',
        levelRevision: row?.levelRevision ?? null,
        runId: row?.runId ?? null,
        solverRef: row?.solverRef ?? null,
        protocolHash: row?.protocolHash ?? null,
        parentId: row?.parentId ?? null,
        attemptIndex: row?.attemptIndex ?? null,
        stageId: row?.stageId ?? null,
        eventKind: row?.eventKind ?? null,
        stateIdentity: row?.stateIdentity ?? null,
        pathIdentity: row?.pathIdentity ?? null,
        captureReason: row?.captureReason ?? null,
        depth: row?.depth ?? null,
    });
}

function searchLossCapsuleIssues(row, index = null) {
    const base = index === null ? 'capsule' : `capsules[${index}]`;
    const issues = [];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [base];

    for (const field of ['parentId', 'levelRevision', 'runId', 'solverRef', 'stageId']) {
        if (!nonEmpty(row[field])) issues.push(`${base}.${field}`);
    }
    if (!SHA256_RE.test(String(row.protocolHash ?? ''))) issues.push(`${base}.protocolHash`);
    if (!(row.attemptIndex === null || nonNegativeInteger(row.attemptIndex))) issues.push(`${base}.attemptIndex`);
    if (!EVENT_KINDS.has(row.eventKind)) issues.push(`${base}.eventKind`);
    if (!CAPTURE_REASONS.has(row.captureReason)) issues.push(`${base}.captureReason`);
    if (!finiteNonNegative(row.workSpent)) issues.push(`${base}.workSpent`);
    if (!(row.nodeProgress === null || finiteNonNegative(row.nodeProgress))) issues.push(`${base}.nodeProgress`);
    if (!(row.depth === null || nonNegativeInteger(row.depth))) issues.push(`${base}.depth`);
    if (!(nonEmpty(row.stateIdentity) || nonEmpty(row.pathIdentity))) issues.push(`${base}.stateIdentity/pathIdentity`);
    if (!DISPOSITIONS.has(row.disposition)) issues.push(`${base}.disposition`);
    if (!REPLAY_BASES.has(row.replayBasis)) issues.push(`${base}.replayBasis`);

    if (!row.selection || typeof row.selection !== 'object' || Array.isArray(row.selection)) {
        issues.push(`${base}.selection`);
    } else {
        if (!nonEmpty(row.selection.selectorId)) issues.push(`${base}.selection.selectorId`);
        for (const field of ['observedAtSelection', 'retainedAtSelection']) {
            if (!(row.selection[field] === null || nonNegativeInteger(row.selection[field]))) issues.push(`${base}.selection.${field}`);
        }
        if (typeof row.selection.truncated !== 'boolean') issues.push(`${base}.selection.truncated`);
        if (nonNegativeInteger(row.selection.observedAtSelection) && nonNegativeInteger(row.selection.retainedAtSelection)
            && row.selection.retainedAtSelection > row.selection.observedAtSelection) {
            issues.push(`${base}.selection(retained>observed)`);
        }
    }
    if (!plainObjectOrNull(row.stateSummary)) issues.push(`${base}.stateSummary`);
    if (!plainObjectOrNull(row.context)) issues.push(`${base}.context`);

    if (issues.length === 0 && row.capsuleId !== searchLossCapsuleIdentity(row)) issues.push(`${base}.capsuleId`);
    else if (!SHA256_RE.test(String(row.capsuleId ?? ''))) issues.push(`${base}.capsuleId`);

    return issues;
}

/** Throws with the full set of violations; returns the row unchanged when valid. */
export function validateSearchLossCapsule(row) {
    const issues = [...new Set(searchLossCapsuleIssues(row))];
    if (issues.length) throw new Error(`invalid search-loss capsule: ${issues.join(', ')}`);
    return row;
}

/** Throws with the full set of violations; returns the document unchanged when valid. */
export function validateSearchLossCapture(document) {
    const issues = [];
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new Error('invalid search-loss capture: document');
    }
    if (document.schemaVersion !== 1) issues.push('schemaVersion');
    if (document.kind !== SEARCH_LOSS_CAPTURE_KIND) issues.push('kind');
    if (document.researchEnrichmentKind !== 'observation') issues.push('researchEnrichmentKind');

    const run = document.run;
    if (!run || typeof run !== 'object' || Array.isArray(run)) {
        issues.push('run');
    } else {
        for (const field of ['runId', 'solverRef', 'producer']) {
            if (!nonEmpty(run[field])) issues.push(`run.${field}`);
        }
        if (!(run.resolvedSha === null || isImmutableCommitSha(run.resolvedSha))) issues.push('run.resolvedSha');
        if (!SHA256_RE.test(String(run.protocolHash ?? ''))) issues.push('run.protocolHash');
        if (!SHA256_RE.test(String(run.configurationHash ?? ''))) issues.push('run.configurationHash');
        if (typeof run.levelBlind !== 'boolean') issues.push('run.levelBlind');
    }

    const population = document.population;
    if (!population || typeof population !== 'object' || Array.isArray(population)) {
        issues.push('population');
    } else {
        if (!nonEmpty(population.source)) issues.push('population.source');
        if (!SHA256_RE.test(String(population.populationIdentity ?? ''))) issues.push('population.populationIdentity');
        if (!(Number.isSafeInteger(population.parentCount) && population.parentCount > 0)) issues.push('population.parentCount');
    }

    const capture = document.capture;
    if (!capture || typeof capture !== 'object' || Array.isArray(capture)) {
        issues.push('capture');
    } else {
        if (!nonEmpty(capture.captureProfileId)) issues.push('capture.captureProfileId');
        if (typeof capture.observerParityVerified !== 'boolean') issues.push('capture.observerParityVerified');
        if (!capture.selectorSummaries || typeof capture.selectorSummaries !== 'object' || Array.isArray(capture.selectorSummaries)) {
            issues.push('capture.selectorSummaries');
        } else {
            for (const [selectorId, summary] of Object.entries(capture.selectorSummaries)) {
                issues.push(...selectorCountIssues(`capture.selectorSummaries.${selectorId}`, summary));
            }
        }
    }

    if (!Array.isArray(document.capsules)) {
        issues.push('capsules');
    } else {
        const seenIds = new Set();
        document.capsules.forEach((row, index) => {
            issues.push(...searchLossCapsuleIssues(row, index));
            const id = row?.capsuleId;
            if (nonEmpty(id)) {
                if (seenIds.has(id)) issues.push(`capsules[${index}].capsuleId(duplicate)`);
                seenIds.add(id);
            }
        });
    }

    const unique = [...new Set(issues)];
    if (unique.length) throw new Error(`invalid search-loss capture: ${unique.join(', ')}`);
    return document;
}

/** Drops capsules that share an already-seen semantic identity (plan 4.2: "deduplicate semantically"). */
export function dedupeSearchLossCapsules(capsules) {
    const seen = new Map();
    let duplicates = 0;
    for (const row of Array.isArray(capsules) ? capsules : []) {
        const id = row?.capsuleId;
        if (id != null && seen.has(id)) { duplicates++; continue; }
        seen.set(id ?? Symbol(), row);
    }
    return { capsules: [...seen.values()], duplicates };
}

/**
 * Bounded, per-selector, production-inert collector (plan 4.1 "capture" + Phase 1 "Collector
 * requirements"). Each observed capsule counts toward its selector's `observed` denominator even
 * when truncated or semantically deduplicated, so truncation/denominator reporting stays exact.
 */
export function createSearchLossCollector({ captureProfileId, selectorLimits = {} } = {}) {
    if (!nonEmpty(captureProfileId)) throw new Error('captureProfileId is required');
    const bySelector = new Map();
    const seenCapsuleIds = new Set();

    function stateFor(selectorId) {
        if (!bySelector.has(selectorId)) bySelector.set(selectorId, { observed: 0, retained: 0, capsules: [] });
        return bySelector.get(selectorId);
    }

    return Object.freeze({
        observe(row) {
            validateSearchLossCapsule(row);
            const selectorId = row.selection.selectorId;
            const state = stateFor(selectorId);
            state.observed += 1;
            if (seenCapsuleIds.has(row.capsuleId)) return;
            const limit = Number.isSafeInteger(selectorLimits[selectorId]) && selectorLimits[selectorId] >= 0
                ? selectorLimits[selectorId]
                : Infinity;
            if (state.capsules.length < limit) {
                state.capsules.push(cloneJsonRecord(row));
                state.retained += 1;
                seenCapsuleIds.add(row.capsuleId);
            }
        },
        snapshot() {
            const selectorSummaries = {};
            const capsules = [];
            for (const [selectorId, state] of [...bySelector.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                selectorSummaries[selectorId] = {
                    observed: state.observed,
                    retained: state.retained,
                    truncated: state.observed > state.retained,
                };
                capsules.push(...state.capsules);
            }
            return {
                captureProfileId,
                observerParityVerified: false,
                selectorSummaries,
                capsules: cloneJsonRecord(capsules),
            };
        },
    });
}

/** Aggregate view of an already-valid capture document; does not itself validate. */
export function summarizeSearchLossCapture(document) {
    const capsules = Array.isArray(document?.capsules) ? document.capsules : [];
    const byEventKind = {};
    const byDisposition = {};
    const byReplayBasis = {};
    const parents = new Set();
    for (const row of capsules) {
        byEventKind[row.eventKind] = (byEventKind[row.eventKind] ?? 0) + 1;
        byDisposition[row.disposition] = (byDisposition[row.disposition] ?? 0) + 1;
        byReplayBasis[row.replayBasis] = (byReplayBasis[row.replayBasis] ?? 0) + 1;
        if (row.parentId != null) parents.add(row.parentId);
    }
    return {
        capsules: capsules.length,
        independentParentsObserved: parents.size,
        byEventKind,
        byDisposition,
        byReplayBasis,
        selectorSummaries: document?.capture?.selectorSummaries ?? {},
    };
}

const DECISION_STAGE_TO_EVENT_KIND = Object.freeze({
    'score-width-culled': 'score-width-cull',
    'mechanic-bucket-culled': 'mechanic-bucket-cull',
    'ints-bucket-culled': 'ints-bucket-cull',
});

/**
 * Adapts an already-validated shared DecisionObservation (solver-decision-observation-lib.mjs) for
 * a supported beam cull stage into a search-loss capsule (plan 6.2: reuse candidate ordering,
 * retention, and work-boundary semantics rather than duplicating them). Returns null for
 * unsupported stages or observations missing canonical workSpent, matching
 * beamResearchRecordToDecisionObservation's null-for-unsupported convention.
 */
export function decisionObservationToSearchLossCapsule(observation, {
    levelRevision,
    runId,
    solverRef,
    protocolHash,
    captureReason,
    disposition,
    replayBasis = 'identity-only',
} = {}) {
    validateDecisionObservation(observation);
    const eventKind = DECISION_STAGE_TO_EVENT_KIND[observation.stageId];
    if (!eventKind) return null;

    const row = {
        capsuleId: null,
        parentId: String(observation.parentId),
        levelRevision: String(levelRevision),
        runId: String(runId),
        solverRef: String(solverRef),
        protocolHash,
        attemptIndex: null,
        stageId: observation.stageId,
        eventKind,
        captureReason,
        workSpent: observation.workSpentAfter,
        nodeProgress: Number.isFinite(observation.context?.nodeProgress) ? observation.context.nodeProgress : null,
        depth: Number.isFinite(observation.context?.depth) ? observation.context.depth : null,
        stateIdentity: null,
        pathIdentity: observation.decisionId,
        disposition,
        selection: {
            selectorId: eventKind,
            observedAtSelection: observation.candidateIds.length,
            retainedAtSelection: observation.retainedCandidateIds.length,
            truncated: observation.retainedCandidateIds.length < observation.candidateIds.length,
        },
        stateSummary: {
            beamWidth: observation.context?.beamWidth ?? null,
            cutoffScore: observation.context?.cutoffScore ?? null,
        },
        context: observation.context ?? {},
        replayBasis,
    };
    row.capsuleId = searchLossCapsuleIdentity(row);
    return validateSearchLossCapsule(row);
}
