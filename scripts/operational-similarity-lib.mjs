/** Pure, bounded reducers for solver operational-similarity research. */
export function compareSiblingRankings(left, right) {
    if (left.length !== right.length || left.length < 2 || left.length > 4) {
        throw new Error('Ranking comparisons require the same 2–4 candidate ids');
    }
    const ids = left.map(row => row.id);
    if (new Set(ids).size !== ids.length || right.some((row, index) => row.id !== ids[index])) {
        throw new Error('Ranking comparisons require the same unique candidate ids in original candidate order');
    }
    const stableRank = rows => [...rows].sort((a, b) => b.score - a.score || ids.indexOf(a.id) - ids.indexOf(b.id));
    const l = stableRank(left), r = stableRank(right);
    let concordant = 0, discordant = 0, tied = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        const ld = left.find(x => x.id === a).score - left.find(x => x.id === b).score;
        const rd = right.find(x => x.id === a).score - right.find(x => x.id === b).score;
        if (ld === 0 || rd === 0) tied++;
        else if (Math.sign(ld) === Math.sign(rd)) concordant++;
        else discordant++;
    }
    const comparable = concordant + discordant;
    return {
        candidateCount: ids.length,
        topChoiceAgreement: l[0].id === r[0].id,
        fullRankingAgreement: l.every((row, index) => row.id === r[index].id),
        kendallAgreement: comparable ? (concordant - discordant) / comparable : null,
        tiedPairCount: tied,
        leftTopMargin: l[0].score - l[1].score,
        rightTopMargin: r[0].score - r[1].score,
        leftOrder: l.map(x => x.id), rightOrder: r.map(x => x.id),
    };
}

export function orderByAdmissibleSlack(candidates, softScores = null) {
    return candidates.map((candidate, index) => ({ ...candidate, index }))
        .sort((a, b) => a.slack - b.slack
            || (softScores ? (softScores[b.id] ?? 0) - (softScores[a.id] ?? 0) : 0)
            || a.index - b.index)
        .map(({ index: _index, ...candidate }) => candidate);
}

export function createBoundedSignatureCollector(limit = 4096) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Collector limit must be positive');
    const signatures = [];
    let observed = 0;
    return Object.freeze({
        observe(signature) { observed++; if (signatures.length < limit) signatures.push(String(signature)); },
        snapshot() { return { observed, retained: signatures.length, truncated: observed > limit, signatures: [...signatures] }; },
    });
}

export function compareBeamTraceBuckets(leftBuckets, rightBuckets) {
    const right = new Map(rightBuckets.map(bucket => [`${bucket.stage}@${bucket.depth}`, bucket]));
    return leftBuckets.filter(bucket => right.has(`${bucket.stage}@${bucket.depth}`)).map(left => {
        const peer = right.get(`${left.stage}@${left.depth}`);
        const a = new Set(left.signatures), b = new Set(peer.signatures);
        const intersection = [...a].filter(signature => b.has(signature)).length;
        const union = new Set([...a, ...b]).size;
        return { stage: left.stage, depth: left.depth,
            leftObserved: left.observed, rightObserved: peer.observed,
            leftRetainedUnique: a.size, rightRetainedUnique: b.size,
            signatureIntersection: intersection, signatureUnion: union,
            retainedSignatureJaccard: union ? intersection / union : null,
            censored: !!left.truncated || !!peer.truncated };
    });
}

function arraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function deterministicEventSignature(event) {
    return JSON.stringify([event.family, event.depth, event.candidates, event.activeOrder]);
}

/**
 * Compare two bounded deterministic decision-event streams.
 *
 * This reducer deliberately treats event-index alignment as authoritative only until the first
 * mismatch. Once deterministic searches diverge, later equal-looking sibling sets are merely
 * signature overlap and are NOT called reconvergence without a shared state identity.
 */
export function compareDeterministicDecisionTraces(leftTrace, rightTrace) {
    const leftEvents = leftTrace.events ?? [];
    const rightEvents = rightTrace.events ?? [];
    const sharedRetained = Math.min(leftEvents.length, rightEvents.length);
    let commonEventPrefix = 0;
    while (commonEventPrefix < sharedRetained
        && deterministicEventSignature(leftEvents[commonEventPrefix]) === deterministicEventSignature(rightEvents[commonEventPrefix])) {
        commonEventPrefix++;
    }

    let firstDivergence = null;
    if (commonEventPrefix < sharedRetained) {
        const left = leftEvents[commonEventPrefix];
        const right = rightEvents[commonEventPrefix];
        const sameFamilyDepth = left.family === right.family && left.depth === right.depth;
        const sameCandidates = sameFamilyDepth && arraysEqual(left.candidates, right.candidates);
        const reason = sameCandidates && !arraysEqual(left.activeOrder, right.activeOrder)
            ? 'ordering'
            : sameFamilyDepth ? 'candidate-set' : 'traversal-context';
        firstDivergence = { retainedIndex: commonEventPrefix, reason, left, right };
    } else if (leftEvents.length !== rightEvents.length) {
        firstDivergence = {
            retainedIndex: commonEventPrefix,
            reason: 'trace-length',
            left: leftEvents[commonEventPrefix] ?? null,
            right: rightEvents[commonEventPrefix] ?? null,
        };
    }

    const leftSignatures = new Set(leftEvents.map(deterministicEventSignature));
    const rightSignatures = new Set(rightEvents.map(deterministicEventSignature));
    const signatureIntersection = [...leftSignatures].filter(signature => rightSignatures.has(signature)).length;
    const signatureUnion = new Set([...leftSignatures, ...rightSignatures]).size;
    const censored = !!leftTrace.truncated || !!rightTrace.truncated;

    return {
        status: firstDivergence ? 'diverged-within-retained-bound'
            : censored ? 'no-divergence-observed-within-censored-bound'
                : 'identical-retained-trace',
        commonEventPrefix,
        firstDivergence,
        retainedEventOverlap: {
            leftUniqueSignatures: leftSignatures.size,
            rightUniqueSignatures: rightSignatures.size,
            signatureIntersection,
            signatureUnion,
            eventSignatureJaccard: signatureUnion ? signatureIntersection / signatureUnion : null,
            interpretation: 'post-divergence signature overlap is not semantic reconvergence without shared state identity',
        },
        left: { observed: leftTrace.observed ?? leftEvents.length, retained: leftEvents.length, truncated: !!leftTrace.truncated },
        right: { observed: rightTrace.observed ?? rightEvents.length, retained: rightEvents.length, truncated: !!rightTrace.truncated },
        censored,
    };
}
