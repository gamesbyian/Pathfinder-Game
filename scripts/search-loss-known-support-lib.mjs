/**
 * Join replayable search-loss prefixes to the persisted hint atlas.
 *
 * Hint paths are one-sided positive evidence: a matching stored path proves the prefix has at least
 * one known accepted continuation. No match is NOT evidence that the prefix is dead, because the
 * hint store is sampled unless a separate completeness contract proves otherwise.
 */

function validPath(path) {
    return Array.isArray(path) && path.length > 0 && path.every(Number.isSafeInteger);
}

export function pathHasPrefix(path, prefix) {
    if (!validPath(path) || !validPath(prefix) || prefix.length > path.length) return false;
    for (let i = 0; i < prefix.length; i++) if (path[i] !== prefix[i]) return false;
    return true;
}

export function knownHintSupportForPrefix(prefix, hints) {
    if (!validPath(prefix)) throw new Error('knownHintSupportForPrefix requires a non-empty integer prefix');

    let supportedHintCount = 0;
    let terminalHintCount = 0;
    let minRemainingMoves = null;
    let maxRemainingMoves = null;
    const nextSteps = new Set();
    const matchedHintIndices = [];

    for (const [index, hint] of (hints ?? []).entries()) {
        const path = hint?.path;
        if (!pathHasPrefix(path, prefix)) continue;
        supportedHintCount += 1;
        if (matchedHintIndices.length < 20) matchedHintIndices.push(index + 1);
        const remaining = path.length - prefix.length;
        minRemainingMoves = minRemainingMoves === null ? remaining : Math.min(minRemainingMoves, remaining);
        maxRemainingMoves = maxRemainingMoves === null ? remaining : Math.max(maxRemainingMoves, remaining);
        if (remaining === 0) terminalHintCount += 1;
        else nextSteps.add(path[prefix.length]);
    }

    return {
        support: supportedHintCount > 0 ? 'PRESENT' : 'NOT_OBSERVED',
        supportedHintCount,
        terminalHintCount,
        distinctKnownNextSteps: nextSteps.size,
        knownNextSteps: [...nextSteps].sort((a, b) => a - b),
        minRemainingMoves,
        maxRemainingMoves,
        matchedHintIndices,
        matchedHintIndicesTruncated: supportedHintCount > matchedHintIndices.length,
    };
}

/**
 * Derive per-capsule positive-support observations. resolvePrefix must return an exact prefix or
 * null; callers decide whether durable-source replay is available. resolveHints returns the
 * canonical hint records for the capsule parent.
 */
export function joinSearchLossToKnownHintSupport(capture, { resolvePrefix, resolveHints }) {
    if (!capture || !Array.isArray(capture.capsules)) throw new Error('capture.capsules is required');
    if (typeof resolvePrefix !== 'function' || typeof resolveHints !== 'function') {
        throw new Error('resolvePrefix and resolveHints are required');
    }

    const rows = capture.capsules.map(capsule => {
        if (capsule?.replayBasis !== 'replayable') {
            return {
                capsuleId: capsule?.capsuleId ?? null,
                parentId: capsule?.parentId ?? null,
                status: 'UNAVAILABLE',
                reason: 'capsule-not-replayable',
            };
        }
        const prefix = resolvePrefix(capsule);
        if (!validPath(prefix)) {
            return {
                capsuleId: capsule?.capsuleId ?? null,
                parentId: capsule?.parentId ?? null,
                status: 'UNAVAILABLE',
                reason: 'exact-prefix-unresolved',
            };
        }
        const hints = resolveHints(capsule?.parentId, capsule) ?? [];
        return {
            capsuleId: capsule?.capsuleId ?? null,
            parentId: capsule?.parentId ?? null,
            status: 'OBSERVED',
            prefixLength: prefix.length,
            ...knownHintSupportForPrefix(prefix, hints),
        };
    });

    const observed = rows.filter(row => row.status === 'OBSERVED');
    return {
        rows,
        summary: {
            capsules: rows.length,
            observed: observed.length,
            unavailable: rows.length - observed.length,
            withKnownSupport: observed.filter(row => row.support === 'PRESENT').length,
            withoutObservedSupport: observed.filter(row => row.support === 'NOT_OBSERVED').length,
            parentsWithKnownSupport: new Set(observed.filter(row => row.support === 'PRESENT').map(row => row.parentId)).size,
        },
    };
}
