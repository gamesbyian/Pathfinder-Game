export function pathIdentity(path) {
    return JSON.stringify(path);
}


export function createForcedWorkCollector() {
    const expansions = new Map();
    const incoming = new Set();
    const phases = [];
    let currentPhase = null;
    let observedGeneratedRecords = 0;

    return {
        observe(record) {
            if (record.stage === 'incoming-frontier') {
                const paths = record.paths ?? [];
                for (const path of paths) incoming.add(pathIdentity(path));
                currentPhase = {
                    incomingCount: paths.length,
                    expandedParents: 0,
                    expansionWork: 0,
                    zeroSuccessorParents: 0,
                    oneSuccessorParents: 0,
                    branchingParents: 0,
                    postHardPruneCount: null,
                };
                phases.push(currentPhase);
                return;
            }
            if (record.stage === 'post-hard-prune') {
                if (currentPhase) currentPhase.postHardPruneCount = (record.paths ?? []).length;
                const childrenByParent = new Map();
                for (const child of record.paths ?? []) {
                    if (!Array.isArray(child) || child.length < 2) continue;
                    const parentId = pathIdentity(child.slice(0, -1));
                    const bucket = childrenByParent.get(parentId) ?? [];
                    bucket.push(child);
                    childrenByParent.set(parentId, bucket);
                }
                for (const [parentId, children] of childrenByParent) {
                    const expansion = expansions.get(parentId);
                    if (!expansion) continue;
                    expansion.uniqueChildId = children.length === 1 ? pathIdentity(children[0]) : null;
                }
                return;
            }
            if (record.stage !== 'generated') return;
            const rows = record.details?.parentExpansions;
            if (!Array.isArray(rows)) return;
            observedGeneratedRecords++;
            for (const row of rows) {
                if (!Array.isArray(row.path)) continue;
                const id = pathIdentity(row.path);
                const workSpent = Number(row.workSpent) || 0;
                const generatedCandidates = Number(row.generatedCandidates) || 0;
                // rawNeighborCount: neighbors offered to hard pruning, before any candidate is
                // evaluated. Absent on older captures (pre-2026-09-25) -- null, not 0, so a
                // one-successor row without this field is excluded from the earlyRecognition
                // split below rather than silently miscounted as a dead end.
                const rawNeighborCount = row.rawNeighborCount === undefined ? null : Number(row.rawNeighborCount);
                if (currentPhase) {
                    currentPhase.expandedParents++;
                    currentPhase.expansionWork += workSpent;
                    if (generatedCandidates === 0) currentPhase.zeroSuccessorParents++;
                    else if (generatedCandidates === 1) currentPhase.oneSuccessorParents++;
                    else currentPhase.branchingParents++;
                }
                expansions.set(id, {
                    id,
                    path: row.path,
                    depth: row.path.length - 1,
                    workSpent,
                    generatedCandidates,
                    rawNeighborCount,
                    // Filled from the later post-hard-prune stage. The generated-stage path list
                    // intentionally includes hard-pruned diagnostic candidates, so deriving the
                    // unique survivor from it would corrupt chain anatomy while leaving prevalence
                    // counts intact.
                    uniqueChildId: null,
                });
            }
        },
        snapshot() {
            return {
                observedGeneratedRecords,
                incoming: [...incoming],
                phases: phases.map(row => ({ ...row })),
                expansions: [...expansions.values()],
            };
        },
    };
}

export function summarizeForcedWork(snapshot) {
    const rows = Array.isArray(snapshot?.expansions) ? snapshot.expansions : [];
    const incoming = new Set(snapshot?.incoming ?? []);
    const phases = Array.isArray(snapshot?.phases) ? snapshot.phases : [];
    const resolvedPhases = phases.filter(row => Number.isInteger(row.postHardPruneCount));
    const singletonOutcomePhases = resolvedPhases.filter(row => row.postHardPruneCount === 1);
    const singletonToSingletonPhases = singletonOutcomePhases.filter(row => row.incomingCount === 1);
    const allParentsForcedPhases = resolvedPhases.filter(row =>
        row.expandedParents > 0
        && row.oneSuccessorParents === row.expandedParents);
    const singletonOutcomeDiscoveryWork = singletonOutcomePhases.reduce(
        (sum, row) => sum + (Number(row.expansionWork) || 0), 0);

    const byId = new Map(rows.map(row => [row.id, row]));
    const predecessor = new Map();

    for (const row of rows) {
        if (row.generatedCandidates !== 1 || !row.uniqueChildId) continue;
        if (!incoming.has(row.uniqueChildId) || !byId.has(row.uniqueChildId)) continue;
        predecessor.set(row.uniqueChildId, row.id);
    }

    const totalWork = rows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);
    const forcedRows = rows.filter(row => row.generatedCandidates === 1);
    const forcedWork = forcedRows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);
    const deadRows = rows.filter(row => row.generatedCandidates === 0);
    const deadWork = deadRows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);
    const branchRows = rows.filter(row => row.generatedCandidates > 1);
    const branchWork = branchRows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);

    const chains = [];
    for (const row of forcedRows) {
        if (predecessor.has(row.id)) continue;
        const pathIds = [];
        let cur = row;
        while (cur && cur.generatedCandidates === 1) {
            pathIds.push(cur.id);
            const nextId = cur.uniqueChildId;
            if (!nextId || !incoming.has(nextId)) break;
            const next = byId.get(nextId);
            if (!next || next.generatedCandidates !== 1) break;
            cur = next;
        }
        const tail = byId.get(pathIds[pathIds.length - 1]);
        const childId = tail?.uniqueChildId ?? null;
        const next = childId && incoming.has(childId) ? byId.get(childId) : null;
        chains.push({
            length: pathIds.length,
            workSpent: pathIds.reduce((sum, id) => sum + (byId.get(id)?.workSpent ?? 0), 0),
            startDepth: byId.get(pathIds[0])?.depth ?? null,
            endDepth: tail?.depth ?? null,
            termination: !childId ? 'no-surviving-child-id'
                : !incoming.has(childId) ? 'forced-child-not-retained'
                : !next ? 'forced-child-not-expanded'
                : next.generatedCandidates === 0 ? 'dead-end'
                : next.generatedCandidates > 1 ? 'branch'
                : 'unknown',
        });
    }

    // Earlier-recognition split (seam audit numerator 2, reports/2026-09-21-forced-work-capture-
    // economics-seam-audit-001.md): among one-successor parents, how many were ALREADY structurally
    // forced before any hard-pruning verdict (rawNeighborCount === 1, a dead-end corridor -- free to
    // recognize from getNeighbors alone) versus narrowed to one survivor only by hard pruning
    // (rawNeighborCount > 1)? Rows missing rawNeighborCount (older captures) are excluded from both
    // buckets, not folded into either, so a partial-coverage capture cannot inflate the free-signal share.
    const forcedRowsWithRawCount = forcedRows.filter(row => Number.isInteger(row.rawNeighborCount));
    const triviallyForcedRows = forcedRowsWithRawCount.filter(row => row.rawNeighborCount === 1);
    const pruneNarrowedRows = forcedRowsWithRawCount.filter(row => row.rawNeighborCount > 1);
    const triviallyForcedWork = triviallyForcedRows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);
    const pruneNarrowedWork = pruneNarrowedRows.reduce((sum, row) => sum + (Number(row.workSpent) || 0), 0);

    const chainLengths = chains.map(row => row.length).sort((a, b) => a - b);
    const percentile = q => {
        if (!chainLengths.length) return null;
        return chainLengths[Math.min(chainLengths.length - 1, Math.floor(q * (chainLengths.length - 1)))];
    };
    const maxChain = chains.reduce((best, row) => !best || row.length > best.length ? row : best, null);
    const terminations = {};
    for (const row of chains) terminations[row.termination] = (terminations[row.termination] ?? 0) + 1;

    return {
        expandedParents: rows.length,
        totalExpansionWork: totalWork,
        zeroSuccessorParents: deadRows.length,
        oneSuccessorParents: forcedRows.length,
        branchingParents: branchRows.length,
        oneSuccessorParentRate: rows.length ? forcedRows.length / rows.length : null,
        forcedExpansionWork: forcedWork,
        forcedExpansionWorkShare: totalWork ? forcedWork / totalWork : null,
        deadEndExpansionWork: deadWork,
        branchingExpansionWork: branchWork,
        grossForcedWorkReservoir: {
            interpretation: 'prevalence reservoir, not post-prune removable work: ordinary parent expansion and hard pruning have already occurred by the time one-successor status is knowable at this observation seam',
            expansionWorkAtOneSuccessorParents: forcedWork,
            expansionWorkShareAtOneSuccessorParents: totalWork ? forcedWork / totalWork : null,
        },
        phaseEconomics: {
            resolvedPhases: resolvedPhases.length,
            singletonOutcomePhases: singletonOutcomePhases.length,
            singletonOutcomePhaseRate: resolvedPhases.length ? singletonOutcomePhases.length / resolvedPhases.length : null,
            singletonToSingletonPhases: singletonToSingletonPhases.length,
            singletonToSingletonPhaseRate: resolvedPhases.length ? singletonToSingletonPhases.length / resolvedPhases.length : null,
            allParentsForcedPhases: allParentsForcedPhases.length,
            allParentsForcedPhaseRate: resolvedPhases.length ? allParentsForcedPhases.length / resolvedPhases.length : null,
            singletonOutcomeDiscoveryWork,
            interpretation: 'singleton-outcome discovery work has already been spent; these counts nominate replay/retention/bookkeeping-safe islands and earlier-recognition questions, not retroactive canonical-work savings',
        },
        earlyRecognition: {
            forcedParentsWithRawCount: forcedRowsWithRawCount.length,
            triviallyForcedParents: triviallyForcedRows.length,
            triviallyForcedParentRate: forcedRowsWithRawCount.length ? triviallyForcedRows.length / forcedRowsWithRawCount.length : null,
            triviallyForcedWork,
            pruneNarrowedParents: pruneNarrowedRows.length,
            pruneNarrowedParentRate: forcedRowsWithRawCount.length ? pruneNarrowedRows.length / forcedRowsWithRawCount.length : null,
            pruneNarrowedWork,
            interpretation: 'triviallyForced (rawNeighborCount===1) parents are structural dead ends, knowable from getNeighbors alone with zero hard-pruning cost -- a real free earlier-recognition signal if common; pruneNarrowed parents (rawNeighborCount>1) had multiple raw options and were narrowed to one only by paying the hard-pruning verdict for each, so no free signal exists for them without a separate cheaper sound test',
        },
        chains: {
            count: chains.length,
            meanLength: chains.length ? chains.reduce((sum, row) => sum + row.length, 0) / chains.length : null,
            p50Length: percentile(0.5),
            p90Length: percentile(0.9),
            maxLength: maxChain?.length ?? null,
            maxWorkSpent: chains.reduce((max, row) => Math.max(max, row.workSpent), null),
            terminations,
        },
    };
}

export function summarizeForcedWorkAcrossRuns(runs) {
    const valid = (runs ?? []).filter(row => row?.summary);
    const totalExpansionWork = valid.reduce((sum, row) => sum + (row.summary.totalExpansionWork ?? 0), 0);
    const forcedExpansionWork = valid.reduce((sum, row) => sum + (row.summary.forcedExpansionWork ?? 0), 0);
    const expandedParents = valid.reduce((sum, row) => sum + (row.summary.expandedParents ?? 0), 0);
    const oneSuccessorParents = valid.reduce((sum, row) => sum + (row.summary.oneSuccessorParents ?? 0), 0);
    const resolvedPhases = valid.reduce((sum, row) => sum + (row.summary.phaseEconomics?.resolvedPhases ?? 0), 0);
    const singletonOutcomePhases = valid.reduce((sum, row) => sum + (row.summary.phaseEconomics?.singletonOutcomePhases ?? 0), 0);
    const singletonToSingletonPhases = valid.reduce((sum, row) => sum + (row.summary.phaseEconomics?.singletonToSingletonPhases ?? 0), 0);
    const allParentsForcedPhases = valid.reduce((sum, row) => sum + (row.summary.phaseEconomics?.allParentsForcedPhases ?? 0), 0);
    const singletonOutcomeDiscoveryWork = valid.reduce((sum, row) => sum + (row.summary.phaseEconomics?.singletonOutcomeDiscoveryWork ?? 0), 0);
    const forcedParentsWithRawCount = valid.reduce((sum, row) => sum + (row.summary.earlyRecognition?.forcedParentsWithRawCount ?? 0), 0);
    const triviallyForcedParents = valid.reduce((sum, row) => sum + (row.summary.earlyRecognition?.triviallyForcedParents ?? 0), 0);
    const triviallyForcedWork = valid.reduce((sum, row) => sum + (row.summary.earlyRecognition?.triviallyForcedWork ?? 0), 0);
    const pruneNarrowedParents = valid.reduce((sum, row) => sum + (row.summary.earlyRecognition?.pruneNarrowedParents ?? 0), 0);
    const pruneNarrowedWork = valid.reduce((sum, row) => sum + (row.summary.earlyRecognition?.pruneNarrowedWork ?? 0), 0);
    return {
        runs: valid.length,
        expandedParents,
        oneSuccessorParents,
        oneSuccessorParentRate: expandedParents ? oneSuccessorParents / expandedParents : null,
        totalExpansionWork,
        forcedExpansionWork,
        forcedExpansionWorkShare: totalExpansionWork ? forcedExpansionWork / totalExpansionWork : null,
        grossForcedWorkReservoir: {
            expansionWorkAtOneSuccessorParents: forcedExpansionWork,
            expansionWorkShareAtOneSuccessorParents: totalExpansionWork ? forcedExpansionWork / totalExpansionWork : null,
        },
        phaseEconomics: {
            resolvedPhases,
            singletonOutcomePhases,
            singletonOutcomePhaseRate: resolvedPhases ? singletonOutcomePhases / resolvedPhases : null,
            singletonToSingletonPhases,
            singletonToSingletonPhaseRate: resolvedPhases ? singletonToSingletonPhases / resolvedPhases : null,
            allParentsForcedPhases,
            allParentsForcedPhaseRate: resolvedPhases ? allParentsForcedPhases / resolvedPhases : null,
            singletonOutcomeDiscoveryWork,
        },
        earlyRecognition: {
            forcedParentsWithRawCount,
            triviallyForcedParents,
            triviallyForcedParentRate: forcedParentsWithRawCount ? triviallyForcedParents / forcedParentsWithRawCount : null,
            triviallyForcedWork,
            pruneNarrowedParents,
            pruneNarrowedParentRate: forcedParentsWithRawCount ? pruneNarrowedParents / forcedParentsWithRawCount : null,
            pruneNarrowedWork,
        },
    };
}
