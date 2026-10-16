export function classifySemanticForcedness(labels) {
    const live = labels.filter(label => label === 'live').length;
    const dead = labels.filter(label => label === 'dead').length;
    const unknown = labels.filter(label => label !== 'live' && label !== 'dead').length;
    let classification;
    if (unknown > 0) classification = 'unresolved';
    else if (live === 1) classification = 'semantically-forced';
    else if (live >= 2) classification = 'genuinely-branching';
    else classification = 'semantically-dead';
    return { classification, live, dead, unknown };
}

export function summarizeSemanticForcedness(states) {
    const rows = Array.isArray(states) ? states : [];
    const resolved = rows.filter(row => row.classification !== 'unresolved');
    const forced = resolved.filter(row => row.classification === 'semantically-forced');
    const branching = resolved.filter(row => row.classification === 'genuinely-branching');
    const dead = resolved.filter(row => row.classification === 'semantically-dead');
    const totalResolvedWork = resolved.reduce((sum, row) => sum + (Number(row.parentExpansionWork) || 0), 0);
    const forcedWork = forced.reduce((sum, row) => sum + (Number(row.parentExpansionWork) || 0), 0);
    const deadWork = dead.reduce((sum, row) => sum + (Number(row.parentExpansionWork) || 0), 0);
    const parents = new Set(rows.map(row => row.levelId).filter(Boolean));
    const forcedParents = new Set(forced.map(row => row.levelId).filter(Boolean));
    return {
        states: rows.length,
        parents: parents.size,
        resolvedStates: resolved.length,
        unresolvedStates: rows.length - resolved.length,
        semanticallyForcedStates: forced.length,
        genuinelyBranchingStates: branching.length,
        semanticallyDeadStates: dead.length,
        semanticallyForcedResolvedRate: resolved.length ? forced.length / resolved.length : null,
        semanticallyDeadResolvedRate: resolved.length ? dead.length / resolved.length : null,
        forcedParents: forcedParents.size,
        resolvedParentExpansionWork: totalResolvedWork,
        semanticallyForcedParentExpansionWork: forcedWork,
        semanticallyDeadParentExpansionWork: deadWork,
        semanticallyForcedWorkShare: totalResolvedWork ? forcedWork / totalResolvedWork : null,
        semanticallyDeadWorkShare: totalResolvedWork ? deadWork / totalResolvedWork : null,
    };
}

/**
 * Outcome-blind bounded state selection for a semantic-forcedness reference pilot.
 * The ranked depth is a search-produced current-state fact; exact LIVE/DEAD
 * outcomes are unknown at selection. Ties keep production observation order.
 */
export function selectSemanticForcednessCaptureGroups(groups, maxStates, mode = 'first') {
    if (!Array.isArray(groups) || !Number.isSafeInteger(maxStates) || maxStates < 1) {
        throw new Error('groups and positive maxStates required');
    }
    if (mode === 'first') return groups.slice(0, maxStates);
    if (mode !== 'deepest') throw new Error('selection mode must be first or deepest');
    return groups.map((group, ordinal) => ({ group, ordinal }))
        .sort((a, b) => Number(b.group.depth) - Number(a.group.depth) || a.ordinal - b.ordinal)
        .slice(0, maxStates).map(row => row.group);
}
