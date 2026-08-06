/**
 * Obligation-tour mutex probe — the harness-pluggable prototype implementation of
 * docs/solver-next-frontier-multilingual-research-update-2026-08-02.md section 4 ("bounded
 * obligation-compatibility MDD"), scoped down to the narrowest sound first cut that still tests
 * genuinely new terrain: a JOINT tour lower bound over every currently-outstanding must-pass AND
 * must-cross obligation together, rather than the two mechanic-specific MST bounds the production
 * solver already computes SEPARATELY (`mustPassLowerBound`/`mustCrossLowerBound` in
 * modules/solver/lower-bounds.ts — each independently compared against `rSteps`, matching
 * search.ts's hot loop; see docs/solver-aware-game-architecture.md's "What should the solver do
 * with this session's game-rule-alignment work?" section for the recommendation this probe tests).
 *
 * WHY THIS IS NOT REDUNDANT WITH EXISTING PRODUCTION BOUNDS. mustPassLowerBound/mustCrossLowerBound
 * each build their own MST over their OWN mechanic's remaining cells only — there is no cross-
 * mechanic edge in either MST, so neither bound can ever discover that a must-pass cell and a
 * must-cross cell are positioned such that visiting both, in any order, costs strictly more than
 * either bound alone predicts. This probe only activates when at least one outstanding must-pass
 * AND at least one outstanding must-cross obligation coexist (the population where a purely
 * per-mechanic bound is structurally blind to the interaction) — a single-mechanic case would
 * reduce to exactly what production already computes and prove nothing new.
 *
 * ALGORITHM AND SOUNDNESS ARGUMENT. Every outstanding obligation is treated as a single point
 * requiring one more visit (a must-pass cell needs one visit; a must-cross cell needing its first
 * OR second crossing is likewise treated as "needs one more visit" — deliberately not modeling
 * must-cross's own two-visits/axis-lock nuance, which `mustCrossLowerBound` already covers on its
 * own; requiring only one visit here is a valid RELAXATION of the true two-visit requirement, so it
 * cannot make this bound unsound, only slightly less tight than a version that also modeled axis
 * approach). A branch-and-bound search over point permutations finds the minimum-cost tour
 * `pos -> point[0] -> point[1] -> ... -> point[n-1] -> goal`, where every leg distance is a plain
 * BFS shortest-path distance read directly from the solver's own precomputed distance arrays
 * (`prep.mpDistArrs`/`prep.mcDistArrs`, the exact same admissible per-object distance data
 * `mustPassLowerBound`/`mustCrossLowerBound` themselves read) — ignoring filters, edge-reuse,
 * must-cross axis locks, and every other dynamic constraint. Because the true remaining path must
 * visit every outstanding obligation in SOME order and then reach the goal, and each leg's true
 * cost can only be >= the constraint-free BFS distance for that same pair of cells, the minimum
 * relaxed tour cost over ALL orderings is a valid lower bound on the true minimum cost for
 * whichever order the real solution actually uses — the same "permissive abstraction is a sound
 * relaxation" pattern this whole harness's probes already rely on (see
 * docs/mechanic-state-contracts.md and oracle.mjs's own `bfsDistances` for the same argument
 * elsewhere in this codebase). An UNREACHABLE leg (Infinity) in every single ordering is an even
 * stronger, unconditional proof: no relaxed-connectivity ordering exists at all, so the true state
 * is dead regardless of the step budget.
 *
 * SCOPE LIMITS (honest, matching this harness's established practice):
 * - Exact permutation search, not an MST/heuristic approximation — tractable only up to
 *   MAX_COMBINED_OBLIGATIONS combined points (branch-and-bound in practice explores far fewer than
 *   the full n! due to pruning, but the worst case is still n!). Above the cap, the probe abstains
 *   rather than guessing or falling back to a possibly-unsound heuristic.
 * - Must-cross's axis-approach nuance (a pending 2nd crossing needing the PERPENDICULAR axis) is
 *   deliberately not modeled — see the relaxation note above. A future version could tighten this
 *   the same way `mcMSTLowerBound`'s `_mcApproachAwareDist` does, at the cost of losing the clean
 *   single-point-per-obligation formulation this prototype relies on for tractability.
 */
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

// Branch-and-bound minimum-cost tour: pos -> visit every point in `points` (any order) -> goal.
// Returns Infinity if no BFS-connected ordering exists at all (a stronger, unconditional proof).
function minTourCost(level, prep, pos, points) {
    const n = points.length;
    let best = Infinity;
    const visited = new Array(n).fill(false);

    function recurse(lastPoint, visitedCount, accCost) {
        if (accCost >= best) return; // branch-and-bound prune
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

    const rSteps = level.reqLen - getRealLengthFromState(state);
    if (best > rSteps) {
        return {
            verdict: 'reject', abstained: false,
            reason: `joint must-pass/must-cross tour lower bound (${best}) exceeds remaining steps (${rSteps})`,
            best, rSteps, combined: points.length,
        };
    }
    return { verdict: 'pass', abstained: false, best, rSteps, combined: points.length };
}
