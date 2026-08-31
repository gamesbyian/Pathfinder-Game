// Exact relaxed joint-tour lower bound over outstanding must-pass and must-cross obligations.
// Existing production bounds treat the two mechanic families separately. Here each outstanding
// obligation is relaxed to one required visit; BFS leg distances ignore dynamic constraints, so the
// minimum pos -> all obligations -> goal tour is admissible. Infinity proves no relaxed ordering.
// Active only when both families remain; abstains above 8 combined obligations. Must-cross axis
// approach/two-visit detail is deliberately omitted, weakening but not invalidating the bound.
import { getDistanceFromArray } from '../../../modules/solver/distance.ts';
import { getRealLengthFromState } from '../../../modules/solver/solution.ts';

export const name = 'obligation-tour-mutex';
export const soundnessClass = 'sound prune (necessary-condition lower bound over a joint must-pass/must-cross tour)';

const MAX_COMBINED_OBLIGATIONS = 8;

function pointKey(level, p) {
    return p.kind === 'mp' ? level.mustPassKeys[p.idx] : level.mustCrossKeys[p.idx];
}

function distFromPos(prep, pos, p) {
    const arr = p.kind === 'mp' ? prep.mpDistArrs[p.idx] : prep.mcDistArrs[p.idx];
    return getDistanceFromArray(arr, pos, prep.gridW);
}

function distToGoal(prep, p) {
    return p.kind === 'mp' ? prep.mustPassToGoalDist[p.idx] : prep.mustCrossToGoalDist[p.idx];
}

function distBetween(level, prep, a, b) {
    const arr = a.kind === 'mp' ? prep.mpDistArrs[a.idx] : prep.mcDistArrs[a.idx];
    return getDistanceFromArray(arr, pointKey(level, b), prep.gridW);
}

/** Branch-and-bound minimum tour cost; Infinity means no BFS-connected ordering exists. */
function minTourCost(level, prep, pos, points) {
    const n = points.length;
    let best = Infinity;
    const visited = new Array(n).fill(false);

    function recurse(lastPoint, visitedCount, accCost) {
        if (accCost >= best) return;
        if (visitedCount === n) {
            const toGoal = distToGoal(prep, lastPoint);
            if (Number.isFinite(toGoal)) best = Math.min(best, accCost + toGoal);
            return;
        }
        for (let i = 0; i < n; i++) {
            if (visited[i]) continue;
            const leg = lastPoint === null ? distFromPos(prep, pos, points[i]) : distBetween(level, prep, lastPoint, points[i]);
            if (!Number.isFinite(leg)) continue;
            visited[i] = true;
            recurse(points[i], visitedCount + 1, accCost + leg);
            visited[i] = false;
        }
    }

    recurse(null, 0, 0);
    return best;
}

export function evaluate({ level, prep, state, pos }) {
    const mpN = level.mustPassKeys.length;
    const outstandingMP = [];
    for (let i = 0; i < mpN; i++) if ((state.mpVisitedMask & (1 << i)) === 0) outstandingMP.push({ kind: 'mp', idx: i });

    const mcN = level.mustCrossKeys.length;
    const outstandingMC = [];
    for (let i = 0; i < mcN; i++) if ((state.mustCrossMask & (1 << i)) !== 0) outstandingMC.push({ kind: 'mc', idx: i });

    if (outstandingMP.length === 0 || outstandingMC.length === 0) {
        return { verdict: 'pass', abstained: true, reason: 'no cross-mechanic obligation pair outstanding (single-mechanic case is already covered by production bounds)' };
    }

    const points = [...outstandingMP, ...outstandingMC];
    if (points.length > MAX_COMBINED_OBLIGATIONS) {
        return { verdict: 'pass', abstained: true, reason: `combined obligation count ${points.length} exceeds the exact-search cap ${MAX_COMBINED_OBLIGATIONS}` };
    }

    const best = minTourCost(level, prep, pos, points);
    if (best === Infinity) {
        return {
            verdict: 'reject', abstained: false,
            reason: 'no relaxed (constraint-free) ordering can visit every outstanding must-pass/must-cross obligation and reach the goal',
            combined: points.length,
        };
    }

    const rSteps = level.requiredLength - getRealLengthFromState(state);
    if (best > rSteps) {
        return {
            verdict: 'reject', abstained: false,
            reason: `joint must-pass/must-cross tour lower bound (${best}) exceeds remaining steps (${rSteps})`,
            best, rSteps, combined: points.length,
        };
    }
    return { verdict: 'pass', abstained: false, best, rSteps, combined: points.length };
}
