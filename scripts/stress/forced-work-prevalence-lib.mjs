export function pathIdentity(path) {
    return JSON.stringify(path);
}


export function createForcedWorkCollector() {
    const expansions = new Map();
    const incoming = new Set();
    let observedGeneratedRecords = 0;

    return {
        observe(record) {
            if (record.stage === 'incoming-frontier') {
                for (const path of record.paths ?? []) incoming.add(pathIdentity(path));
                return;
            }
            if (record.stage === 'post-hard-prune') {
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
                expansions.set(id, {
                    id,
                    path: row.path,
                    depth: row.path.length - 1,
                    workSpent: Number(row.workSpent) || 0,
                    generatedCandidates: Number(row.generatedCandidates) || 0,
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
                expansions: [...expansions.values()],
            };
        },
    };
}

export function summarizeForcedWork(snapshot) {
    const rows = Array.isArray(snapshot?.expansions) ? snapshot.expansions : [];
    const incoming = new Set(snapshot?.incoming ?? []);
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
        oracleCeiling: {
            interpretation: 'upper bound only: even a perfect free forced-future mechanism cannot remove more parent-expansion canonical work than was spent at one-successor parents',
            removableExpansionWorkUpperBound: forcedWork,
            removableExpansionWorkShareUpperBound: totalWork ? forcedWork / totalWork : null,
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
    return {
        runs: valid.length,
        expandedParents,
        oneSuccessorParents,
        oneSuccessorParentRate: expandedParents ? oneSuccessorParents / expandedParents : null,
        totalExpansionWork,
        forcedExpansionWork,
        forcedExpansionWorkShare: totalExpansionWork ? forcedExpansionWork / totalExpansionWork : null,
        oracleCeiling: {
            removableExpansionWorkUpperBound: forcedExpansionWork,
            removableExpansionWorkShareUpperBound: totalExpansionWork ? forcedExpansionWork / totalExpansionWork : null,
        },
    };
}
