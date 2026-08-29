/** Shared real-search-state path replay used by hint and family-pair diagnostics. */
export function tracePathRanks({ api, level, prep, path, scoringProfile, orderingBias = null, configOverride = null }) {
    if (!Array.isArray(path) || path.length < 2) {
        return { error: 'path must contain at least two keys', cumulativeDiscrepancy: null, perStep: [], finalIsSolution: false };
    }
    const { createState, getNeighbors, applyMove, scoreAndSort, isSolutionState } = api;
    const localPrep = configOverride == null ? prep : { ...prep, _cfg: configOverride };
    let state;
    try {
        state = createState(path[0], level, localPrep);
    } catch (error) {
        return { error: error?.message ?? String(error), cumulativeDiscrepancy: null, perStep: [], finalIsSolution: false };
    }
    let cumulativeDiscrepancy = 0;
    const perStep = [];
    for (let i = 1; i < path.length; i++) {
        const pos = state.path[state.path.length - 1];
        const nextKey = path[i];
        const neighbors = getNeighbors(pos, state, level, localPrep);
        if (!neighbors.includes(nextKey)) {
            return {
                error: `path step ${i} is not a candidate`,
                invalidAtStep: i,
                cumulativeDiscrepancy,
                perStep: [...perStep, { step: i, invalid: true, nCandidates: neighbors.length }],
                finalIsSolution: false,
            };
        }
        const arr = [...neighbors];
        if (arr.length > 1) scoreAndSort(arr, pos, state, level, localPrep, scoringProfile, orderingBias);
        const rank = arr.indexOf(nextKey);
        cumulativeDiscrepancy += Math.max(0, rank);
        perStep.push({ step: i, rank: Math.max(0, rank), topChoice: arr[0] ?? null, nCandidates: arr.length });
        const portalEntry = level.portalMap.get(pos);
        applyMove(nextKey, state, level, localPrep, !!(portalEntry && portalEntry.dest === nextKey));
    }
    return {
        error: null,
        invalidAtStep: null,
        cumulativeDiscrepancy,
        maxStepRank: Math.max(0, ...perStep.map(step => step.rank)),
        worstRankedSteps: [...perStep].sort((a, b) => b.rank - a.rank || a.step - b.step).slice(0, 10),
        perStep,
        finalIsSolution: isSolutionState(state, level),
    };
}

export function scoreFlagAblation({ trace, scoreFlags, normalizeConfig }) {
    const baseline = trace(null);
    if (baseline.error) return { baseline, flags: [] };
    const flags = [...scoreFlags].sort().map(flag => {
        const result = trace(normalizeConfig({ [flag]: false }));
        return {
            flag,
            discrepancy: result.cumulativeDiscrepancy,
            delta: result.error ? null : result.cumulativeDiscrepancy - baseline.cumulativeDiscrepancy,
            error: result.error ?? null,
        };
    });
    return { baseline, flags };
}

export function comparePathTraces(left, right, { meaningfulRankDelta = 1 } = {}) {
    if (left.error || right.error) {
        return { valid: false, error: left.error ? `left: ${left.error}` : `right: ${right.error}`, left, right };
    }
    const byStep = [];
    const count = Math.max(left.perStep.length, right.perStep.length);
    for (let i = 0; i < count; i++) {
        const leftStep = left.perStep[i] ?? null;
        const rightStep = right.perStep[i] ?? null;
        byStep.push({
            step: i + 1,
            leftRank: leftStep?.rank ?? null,
            rightRank: rightStep?.rank ?? null,
            rankDelta: leftStep && rightStep ? rightStep.rank - leftStep.rank : null,
            leftCandidates: leftStep?.nCandidates ?? null,
            rightCandidates: rightStep?.nCandidates ?? null,
            candidateDelta: leftStep && rightStep ? rightStep.nCandidates - leftStep.nCandidates : null,
        });
    }
    return {
        valid: true,
        left,
        right,
        cumulativeDiscrepancyDelta: right.cumulativeDiscrepancy - left.cumulativeDiscrepancy,
        firstMeaningfulDivergence: byStep.find(s => s.rankDelta !== null && Math.abs(s.rankDelta) >= meaningfulRankDelta) ?? null,
        worstDifferentials: [...byStep].filter(step => step.rankDelta !== null)
            .sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta) || a.step - b.step).slice(0, 10),
        byStep,
    };
}

export function compareAblations(left, right) {
    const rightByFlag = new Map(right.flags.map(entry => [entry.flag, entry]));
    return left.flags.map(leftEntry => {
        const rightEntry = rightByFlag.get(leftEntry.flag);
        return {
            flag: leftEntry.flag,
            leftDelta: leftEntry.delta,
            rightDelta: rightEntry?.delta ?? null,
            differential: leftEntry.delta == null || rightEntry?.delta == null ? null : rightEntry.delta - leftEntry.delta,
        };
    }).sort((a, b) => {
        const bMagnitude = b.differential == null ? -1 : Math.abs(b.differential);
        const aMagnitude = a.differential == null ? -1 : Math.abs(a.differential);
        return bMagnitude - aMagnitude || a.flag.localeCompare(b.flag);
    });
}

/** Compare symmetry-mapped semantic snapshots. Directional ordering-bias fields are annotations, not
 * invariant claims. Callers build snapshots through SOLVER_TESTING_API and canonical geometry. */
export function compareSemanticSnapshots(left, right, mapKey = key => key) {
    const normalize = values => [...new Set((values ?? []).map(mapKey))].sort((a, b) => a - b);
    const fields = ['mechanicMask', 'lowerBounds', 'pruneVerdicts', 'neutralMetrics', 'scoreComponents'];
    const differences = [];
    const leftLegal = normalize(left.legalCandidates);
    const rightLegal = [...new Set(right.legalCandidates ?? [])].sort((a, b) => a - b);
    if (JSON.stringify(leftLegal) !== JSON.stringify(rightLegal)) differences.push({ field: 'legalCandidates', left: leftLegal, right: rightLegal });
    for (const field of fields) if (JSON.stringify(left[field] ?? null) !== JSON.stringify(right[field] ?? null)) {
        differences.push({ field, left: left[field] ?? null, right: right[field] ?? null });
    }
    const directional = [...new Set([...(left.directionalPolicies ?? []), ...(right.directionalPolicies ?? [])])];
    return {
        schemaVersion: 1, equivariant: differences.length === 0, differences,
        intentionalDirectionalPolicies: directional,
        classification: differences.length ? 'semantic-equivariance-violation'
            : directional.length ? 'intentional-directional-strategy-asymmetry' : 'semantically-equivariant',
    };
}
