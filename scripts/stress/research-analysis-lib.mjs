const pathKey = path => path.join(',');

/** Level-balanced score/width extinction taxonomy. Saturation is intentionally narrow so a
 * crowded pool cannot disguise a candidate that is materially below the scoring boundary. */
export function classifyScoreWidthExtinction({ margin, tied, stableOrderAdmission, poolSize, beamWidth, bestRank }) {
    if (tied && stableOrderAdmission) return 'C-exact-score-tie-stable-order';
    if (margin != null && margin <= 1) return 'B-near-cutoff-weak-margin';
    if (poolSize >= beamWidth * 2 && bestRank <= Math.ceil(beamWidth * 1.25) && margin != null && margin <= 5) {
        return 'D-diversity-width-saturation';
    }
    if (margin != null && margin > 1) return 'A-clearly-mis-ranked';
    return 'E-other-ambiguous';
}

const normalizedSegmentShape = path => {
    const x0 = path[0] & 0xffff, y0 = path[0] >>> 16;
    return path.map(key => `${(key & 0xffff) - x0}:${(key >>> 16) - y0}`).join(';');
};

/** Translation-invariant but direction-preserving substitution signature. It remains conservative:
 * both complete local segment shapes, resource deltas, and obligation sequences must match. */
function exactSubstitutionSignature(a, b) {
    const shapes = [normalizedSegmentShape(a.path), normalizedSegmentShape(b.path)].sort();
    const effects = [
        `${a.length}:${a.intersectionDelta}:${a.obligations.join('>')}`,
        `${b.length}:${b.intersectionDelta}:${b.obligations.join('>')}`,
    ].sort();
    return JSON.stringify({ displacement: shapes[0].split(';').at(-1), shapes, effects });
}

export function compareProducerPopulations(beam, repair) {
    const repairByPath = new Map(repair.map(x => [pathKey(x.path), x]));
    const exact = beam.filter(x => repairByPath.has(pathKey(x.path)));
    const metricKey = x => JSON.stringify(x.metrics ?? {});
    const repairMetrics = new Set(repair.map(metricKey));
    return {
        beamCount: beam.length, repairCount: repair.length, exactPrefixOverlap: exact.length,
        metricProjectionOverlap: beam.filter(x => repairMetrics.has(metricKey(x))).length,
        beamNovel: beam.filter(x => !repairByPath.has(pathKey(x.path))).map(x => ({ path: x.path, arrivalWork: x.arrivalWork, depth: x.path.length - 1 })),
        caution: 'Metric equality is structural similarity, not state equivalence.',
    };
}

/** Cheap, conservative repeated-interface miner. Exact claims require identical caller-supplied
 * futureState keys; endpoint/interface equality alone remains approximate. */
export function mineResidualInterfaces(solutionRecords, { maxSpan = 12 } = {}) {
    const buckets = new Map();
    for (const record of solutionRecords) for (let a = 0; a < record.path.length - 2; a++) {
        for (let b = a + 2; b < Math.min(record.path.length, a + maxSpan + 1); b++) {
            const key = `${record.path[a]}>${record.path[b]}`;
            const segment = { solution: record.id, family: record.family ?? null, from: a, to: b, length: b - a, path: record.path.slice(a, b + 1),
                futureState: record.futureStates?.[b] ?? null, intersectionDelta: record.intersections?.[b] == null ? null : record.intersections[b] - record.intersections[a],
                obligations: record.obligations?.slice(a + 1, b + 1).filter(Boolean) ?? [] };
            const list = buckets.get(key) ?? []; list.push(segment); buckets.set(key, list);
        }
    }
    const repeated = [...buckets.entries()].filter(([, xs]) => xs.length > 1).map(([interfaceKey, segments]) => {
        const pairs = [];
        for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
            const a = segments[i], b = segments[j];
            if (pathKey(a.path) === pathKey(b.path)) continue;
            const sameObligationMultiset = [...a.obligations].sort().join('|') === [...b.obligations].sort().join('|');
            const commutingCandidate = sameObligationMultiset && a.obligations.join('|') !== b.obligations.join('|');
            const exactStatePreserving = a.futureState != null && a.futureState === b.futureState;
            pairs.push({ a, b, detourLike: a.length !== b.length || a.intersectionDelta !== b.intersectionDelta,
                commutingCandidate,
                exactStatePreserving,
                ...(exactStatePreserving ? { substitutionSignature: exactSubstitutionSignature(a, b) } : {}),
                equivalence: exactStatePreserving ? 'exact-future-state' : 'approximate-interface' });
        }
        return { interfaceKey, pairs };
    }).filter(x => x.pairs.length);
    const pairs = repeated.flatMap(x => x.pairs);
    const signatureMap = new Map();
    for (const pair of pairs.filter(x => x.exactStatePreserving)) {
        let support = signatureMap.get(pair.substitutionSignature);
        if (!support) signatureMap.set(pair.substitutionSignature, support = { signature: pair.substitutionSignature,
            multiplicity: 0, solutions: new Set(), families: new Set() });
        support.multiplicity++;
        support.solutions.add(pair.a.solution); support.solutions.add(pair.b.solution);
        if (pair.a.family) support.families.add(pair.a.family);
        if (pair.b.family) support.families.add(pair.b.family);
    }
    const exactSignatures = [...signatureMap.values()].map(x => ({ ...x, solutions: [...x.solutions], families: [...x.families] }));
    return { repeatedInterfaces: repeated.length, candidatePairs: pairs.length,
        detourLikePairs: pairs.filter(x => x.detourLike).length,
        commutingCandidates: pairs.filter(x => x.commutingCandidate).length,
        exactStatePreservingSubstitutions: pairs.filter(x => x.exactStatePreserving).length,
        uniqueExactSubstitutionSignatures: exactSignatures.length, exactSignatures, interfaces: repeated };
}

/** Conservative known-trajectory rollback proxy: longest common prefix to any valid label. It
 * demonstrates where a labelled continuation diverges; it does not prove minimal edit distance. */
export function rollbackCensus(nearMisses, knownSolutions, requiredLength) {
    const rows = nearMisses.map(miss => {
        let best = 0, label = null;
        for (const solution of knownSolutions) {
            let n = 0; while (n < miss.path.length && n < solution.path.length && miss.path[n] === solution.path[n]) n++;
            if (n > best) { best = n; label = solution.id; }
        }
        const rollbackSteps = Math.max(0, miss.path.length - best);
        return { id: miss.id, matchedSolution: label, commonPrefixSteps: best, rollbackSteps,
            rollbackFractionReqLen: rollbackSteps / Math.max(1, requiredLength), meaning: 'known-trajectory divergence proxy' };
    });
    return { rows, medianRollbackSteps: rows.length ? [...rows].sort((a, b) => a.rollbackSteps - b.rollbackSteps)[Math.floor(rows.length / 2)].rollbackSteps : null };
}

export function enumerateKnownPrefixBranches({ api, level, prep, knownSolutions, depths }) {
    const prefixGroups = new Map();
    for (const solution of knownSolutions) for (const depth of depths) {
        if (depth < 0 || depth >= solution.path.length - 1) continue;
        const prefix = solution.path.slice(0, depth + 1);
        const key = pathKey(prefix);
        let group = prefixGroups.get(key);
        if (!group) prefixGroups.set(key, group = { prefix, depth, continuations: new Set(), solutionIds: new Set(), provenances: new Set() });
        group.continuations.add(solution.path[depth + 1]);
        group.solutionIds.add(solution.id);
        group.provenances.add(solution.provenance);
    }
    const rows = [];
    const replay = prefix => {
        const state = api.createState(prefix[0], level, prep);
        let valid = true;
        for (let i = 1; i < prefix.length; i++) {
            const from = state.path.at(-1), to = prefix[i];
            if (!api.getNeighbors(from, state, level, prep).includes(to)) { valid = false; break; }
            const portal = level.portalMap.get(from); api.applyMove(to, state, level, prep, !!(portal && portal.dest === to));
        }
        return valid ? state : null;
    };
    for (const group of prefixGroups.values()) {
        const state = replay(group.prefix);
        if (!state) continue;
        const pos = state.path.at(-1);
        const legal = api.getNeighbors(pos, state, level, prep);
        const ranked = [...legal];
        if (ranked.length > 1 && api.scoreAndSort && api.SCORING_PROFILES) {
            api.scoreAndSort(ranked, pos, state, level, prep, api.SCORING_PROFILES.default, null);
        }
        for (const child of legal) {
            const childState = replay(group.prefix);
            const portal = level.portalMap.get(pos);
            api.applyMove(child, childState, level, prep, !!(portal && portal.dest === child));
            rows.push({
                schemaVersion: 1, solutionIds: [...group.solutionIds], provenances: [...group.provenances],
                depth: group.depth, prefix: [...group.prefix], child,
                label: group.continuations.has(child) ? 'known-valid-continuation' : 'oracle-abstain',
                knownContinuationChildren: [...group.continuations], scoreRank: ranked.indexOf(child) + 1,
                neutral: { remainingSteps: level.requiredLength - group.depth - 1, remainingIntersections: level.requiredIntersections - childState.ints,
                    intersections: childState.ints, mustPassVisitedMask: childState.mpVisitedMask,
                    mustCrossMask: childState.mustCrossMask, mustTurnMask: childState.mustTurnMask,
                    surroundMask: childState.surroundMask, adjacentTurnMask: childState.adjTurnMask,
                    flipperUsedMask: childState.flipperUsedMask, lastWasPortalJump: childState.lastWasPortalJump },
            });
        }
    }
    return rows;
}
