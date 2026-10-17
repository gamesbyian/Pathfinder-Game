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
/**
 * Count *game counted* moves along a current search prefix. Portal jumps are
 * zero-cost; a portal cannot chain again on the immediately following move.
 * Reconstruct the exact current-state portal-jump rule, not a raw-depth proxy.
 */
export function countedPathSteps(path, portalMap) {
    if (!Array.isArray(path) || !portalMap || typeof portalMap.get !== 'function') {
        throw new Error('countedPathSteps requires a prefix array and current portalMap');
    }
    let steps = 0, portalJumps = 0, lastWasPortalJump = false;
    for (let i = 1; i < path.length; i++) {
        const from = path[i - 1], to = path[i];
        const jump = !lastWasPortalJump && portalMap.get(from)?.dest === to;
        if (jump) portalJumps++;
        else steps++;
        lastWasPortalJump = jump;
    }
    return { countedSteps: steps, portalJumps };
}

export function selectSemanticForcednessCaptureGroups(groups, maxStates, mode = 'first', context = null) {
    if (!Array.isArray(groups) || !Number.isSafeInteger(maxStates) || maxStates < 1) {
        throw new Error('groups and positive maxStates required');
    }
    if (mode === 'first') return groups.slice(0, maxStates);
    if (mode === 'deepest') return groups.map((group, ordinal) => ({ group, ordinal }))
        .sort((a, b) => Number(b.group.depth) - Number(a.group.depth) || a.ordinal - b.ordinal)
        .slice(0, maxStates).map(row => row.group);
    if (mode !== 'middle-counted') throw new Error('selection mode must be first, deepest or middle-counted');
    const required = Number(context?.requiredLength);
    if (!Number.isSafeInteger(required) || required <= 0 || !context?.portalMap) {
        throw new Error('middle-counted requires current requiredLength and portalMap');
    }
    // Strict admissibility window, no opportunistic fallback to near-terminal
    // states if the sample is sparse. Enrichment only by current state.
    const eligible = groups.map((group, ordinal) => {
        const count = countedPathSteps(group.parentPath, context.portalMap);
        const remaining = required - count.countedSteps;
        const remainingFraction = remaining / required;
        return {group, ordinal, ...count, remaining, remainingFraction};
    }).filter(row => row.remainingFraction >= 0.25 && row.remainingFraction <= 0.75);
    eligible.sort((a, b) => Math.abs(a.remainingFraction - 0.5) - Math.abs(b.remainingFraction - 0.5) || a.ordinal - b.ordinal);
    return eligible.slice(0, maxStates).map(row => ({
        ...row.group,
        countedDepth: row.countedSteps,
        portalJumps: row.portalJumps,
        remainingCountedSteps: row.remaining,
        remainingCountedFraction: row.remainingFraction,
    }));
}
