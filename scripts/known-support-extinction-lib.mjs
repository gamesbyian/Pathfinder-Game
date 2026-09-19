/**
 * Project known-solution-prefix survival output into compact parent-level extinction evidence.
 *
 * This is not a new first-loss taxonomy. It exposes the observer's existing "final known support
 * lost" result in a form that can join to compact failure/search-loss evidence.
 */

const REMOVAL_STAGES = new Set([
    'generated',
    'hard-pruned',
    'coarse-state-merge-removed',
    'score-width-culled',
    'mechanic-bucket-culled',
    'ints-bucket-culled',
]);

function boundaryStages(survival) {
    return (survival?.stages ?? []).filter(stage => !REMOVAL_STAGES.has(stage?.stage));
}

function lastSupportedBoundary(survival) {
    return boundaryStages(survival).filter(stage => Number(stage?.supportedCandidates) > 0).at(-1) ?? null;
}

function firstZeroAfterSupport(survival) {
    const boundaries = boundaryStages(survival);
    for (let i = 1; i < boundaries.length; i++) {
        if (Number(boundaries[i - 1]?.supportedCandidates) > 0 && Number(boundaries[i]?.supportedCandidates) === 0) {
            return { before: boundaries[i - 1], after: boundaries[i] };
        }
    }
    return null;
}

function finalZeroAfterSupport(survival) {
    const boundaries = boundaryStages(survival);
    let result = null;
    for (let i = 1; i < boundaries.length; i++) {
        if (Number(boundaries[i - 1]?.supportedCandidates) > 0 && Number(boundaries[i]?.supportedCandidates) === 0) {
            result = { before: boundaries[i - 1], after: boundaries[i] };
        }
    }
    return result;
}

export function projectKnownSupportExtinctionRow(row) {
    const survival = row?.survival ?? {};
    const first = firstZeroAfterSupport(survival);
    const final = finalZeroAfterSupport(survival);
    const last = lastSupportedBoundary(survival);
    const reportedFinal = survival?.finalSupportLoss ?? null;

    return {
        parentId: row?.levelId ?? row?.parentId ?? null,
        runId: row?.runId ?? null,
        solverRef: row?.solverRef ?? null,
        producer: row?.producer ?? null,
        scoringProfileId: row?.scoringProfileId ?? null,
        beamWidth: Number.isFinite(row?.beamWidth) ? row.beamWidth : null,
        nodeBudget: Number.isFinite(row?.nodeBudget) ? row.nodeBudget : null,
        solvedControl: typeof row?.solved === 'boolean' ? row.solved : null,
        behaviorIdentical: typeof row?.behaviorIdentical === 'boolean' ? row.behaviorIdentical : null,
        knownSolutionLabels: Number.isFinite(survival?.solutionLabels) ? survival.solutionLabels : null,
        lastKnownSupport: last ? {
            stage: last.stage ?? null,
            depth: Number.isFinite(last.depth) ? last.depth : null,
            workSpent: Number.isFinite(last.workSpent) ? last.workSpent : null,
            supportedCandidates: Number.isFinite(last.supportedCandidates) ? last.supportedCandidates : null,
            supportedPaths: Number.isFinite(last.supportedPaths) ? last.supportedPaths : null,
            supportedFamilies: Number.isFinite(last.supportedFamilies) ? last.supportedFamilies : null,
        } : null,
        firstKnownSupportLoss: first ? {
            stage: first.after?.stage ?? null,
            depth: Number.isFinite(first.after?.depth) ? first.after.depth : null,
            supportedPathsBefore: Number.isFinite(first.before?.supportedPaths) ? first.before.supportedPaths : null,
            supportedFamiliesBefore: Number.isFinite(first.before?.supportedFamilies) ? first.before.supportedFamilies : null,
        } : null,
        finalKnownSupportLoss: final || reportedFinal ? {
            stage: final?.after?.stage ?? reportedFinal?.stage ?? null,
            cause: reportedFinal?.lossCause ?? null,
            depth: Number.isFinite(final?.after?.depth) ? final.after.depth
                : (Number.isFinite(reportedFinal?.depth) ? reportedFinal.depth : null),
            supportedPathsBefore: Number.isFinite(final?.before?.supportedPaths) ? final.before.supportedPaths : null,
            supportedFamiliesBefore: Number.isFinite(final?.before?.supportedFamilies) ? final.before.supportedFamilies : null,
            supportedCandidatesBefore: Number.isFinite(final?.before?.supportedCandidates) ? final.before.supportedCandidates : null,
            workSpentBeforeLoss: Number.isFinite(final?.before?.workSpent) ? final.before.workSpent : null,
            workSpentAtLoss: Number.isFinite(final?.after?.workSpent) ? final.after.workSpent : null,
        } : null,
        workAfterFinalKnownSupport: Number.isFinite(survival?.workAfterFinalKnownSupport)
            ? survival.workAfterFinalKnownSupport
            : null,
        correctnessAlarmCount: Array.isArray(survival?.correctnessAlarms) ? survival.correctnessAlarms.length : null,
    };
}

export function projectKnownSupportExtinctionDocument(document) {
    const rows = (document?.levels ?? []).map(projectKnownSupportExtinctionRow);
    return {
        schemaVersion: 1,
        kind: 'pathfinder-known-support-extinction-projection',
        source: {
            runId: document?.runId ?? null,
            solverRef: document?.solverRef ?? null,
            levelsFile: document?.levelsFile ?? null,
            familyDefinitionVersion: document?.familyDefinitionVersion ?? null,
        },
        semantics: {
            independentUnit: 'parent level',
            support: 'referee-valid stored solution labels supplied to the unchanged-search observer',
            finalKnownSupportLoss: 'transition from positive known support to zero known support at an observed search boundary',
            caution: 'zero known support does not prove that no valid solution or unobserved solution family remains',
        },
        summary: {
            parents: rows.length,
            solvedControls: rows.filter(row => row.solvedControl === true).length,
            parentsWithFinalKnownSupportLoss: rows.filter(row => row.finalKnownSupportLoss).length,
            parentsWithMultipleKnownFamiliesAtLastSupport: rows.filter(row =>
                (row.lastKnownSupport?.supportedFamilies ?? 0) > 1).length,
            behaviorParityVerifiedParents: rows.filter(row => row.behaviorIdentical === true).length,
        },
        rows,
    };
}
