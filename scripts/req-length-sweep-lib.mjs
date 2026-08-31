export function parseInteger(value, name, { min = 0 } = {}) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min) {
        throw new Error(`${name} must be an integer >= ${min}`);
    }
    return parsed;
}

export function buildReqLengths(original, options = {}) {
    const step = parseInteger(options.step ?? 1, '--step', { min: 1 });
    const min = parseInteger(options.min ?? Math.max(1, original - 10), '--min', { min: 1 });
    const max = parseInteger(options.max ?? original + 10, '--max', { min: 1 });
    if (min > max) throw new Error('--min must be <= --max');

    const lengths = [];
    for (let value = min; value <= max; value += step) lengths.push(value);
    return lengths;
}

export function classifyRuns(runs, staticReason = null) {
    const solvedRuns = runs.filter(run => run.ok);
    if (solvedRuns.length > 0) return 'observed-solved';
    if (staticReason) return 'statically-infeasible';
    return 'unknown-within-budget';
}

export function classifyFeasibility(runs, validKnownWitnesses, staticReason = null) {
    if (runs.some(run => run.ok)) return 'solver-witnessed';
    if (validKnownWitnesses > 0) return 'stored-witnessed';
    if (staticReason) return 'proven-infeasible';
    return 'unknown';
}

export function summarizeRuns(runs) {
    const solved = runs.filter(run => run.ok);
    const values = key => runs.map(run => run[key]).filter(Number.isFinite);
    const median = numbers => {
        if (numbers.length === 0) return null;
        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    };
    return {
        solvedRuns: solved.length,
        totalRuns: runs.length,
        solveRate: runs.length ? solved.length / runs.length : 0,
        medianElapsedMs: median(values('elapsedMs')),
        medianNodesExpanded: median(values('nodesExpanded')),
        winningTechniques: [...new Set(solved.map(run => run.solvedBy).filter(Boolean))],
    };
}

export function portalFreeParityReason(level) {
    if (level.portalMap.size > 0) return null;
    const parity = key => ((key & 0xffff) + ((key >>> 16) & 0xffff)) & 1;
    const goalParity = parity(level.goalKey);
    const hasFeasibleGate = level.gateKeys.some(gate => {
        const gateParity = parity(gate);
        return (gateParity ^ goalParity ^ (level.requiredLength & 1)) === 0;
    });
    return hasFeasibleGate ? null : 'portal-free gate/goal parity mismatch';
}

export function summarizePoints(points, step) {
    const solvedLengths = points.filter(point => point.classification === 'observed-solved').map(point => point.reqLen);
    const ranges = [];
    for (const length of solvedLengths) {
        const last = ranges.at(-1);
        if (last && length === last.max + step) last.max = length;
        else ranges.push({ min: length, max: length });
    }
    const techniqueTransitions = [];
    let previous = null;
    for (const point of points.filter(item => item.classification === 'observed-solved')) {
        const techniques = point.winningTechniques.join(',') || 'unknown';
        if (previous && previous.techniques !== techniques) {
            techniqueTransitions.push({ afterReqLen: previous.reqLen, atReqLen: point.reqLen, from: previous.techniques, to: techniques });
        }
        previous = { reqLen: point.reqLen, techniques };
    }
    return {
        observedSolvedLengths: solvedLengths,
        observedSolvedRanges: ranges,
        unknownLengths: points.filter(point => point.classification === 'unknown-within-budget').map(point => point.reqLen),
        staticallyInfeasibleLengths: points.filter(point => point.classification === 'statically-infeasible').map(point => point.reqLen),
        storedWitnessedLengths: points.filter(point => point.feasibility === 'stored-witnessed').map(point => point.reqLen),
        techniqueTransitions,
    };
}
