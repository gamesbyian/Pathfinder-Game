// Shadow/helper form of the shipped must-cross neighbor-budget bound.
// For every pending must-cross cell, each still-unused axis requires both neighboring cells. A
// required neighbor already visited must be revisited, costing an intersection beyond the pending
// must-cross cell's own reserved second crossing. Count DISTINCT such cells, not requirements, to
// avoid double-counting shared neighbors. Reject when this lower bound exceeds free intersections:
//   freeInt = requiredIntersections - ints - popcount(mustCrossMask)
// Abstain on flipper neighbors and pending-MC neighbors because their future revisit cost is not
// independently established here; skip hard walls because PRUNE_MC_FORCED_NEIGHBOR owns them.
//
// Portal levels are in scope. A still-open must-cross axis still requires both CARDINAL neighbors;
// a portal may alter what happens immediately before or after occupying one of those neighbors but
// cannot remove that occupancy requirement. An unvisited portal terminal can therefore be usable
// as a required neighbor. Once visited, a portal terminal is actually stricter than this bound:
// ordinary move generation forbids re-entering any visited portal terminal, so counting it as only
// one additional intersection underestimates the remaining obligation rather than overestimating
// it. The `pos` exemption remains conservative because the current cell can already be serving the
// required interface; if forced portal semantics make it unusable, skipping it only under-prunes.
// Portal-jump arrivals use applyMove's same visited-cell intersection accounting as ordinary moves,
// so portal transitions cannot create an uncharged revisit that would invalidate freeInt.
//
// IMPORTANT representation contract: prep.staticNeighborKeys is row-major dense-indexed, not
// packed-key-indexed. Use denseIndex(mcKey, prep.gridW) exactly as production lower-bounds.ts does.
// Evidence/derivation: reports/2026-08-08-mc-neighbor-budget-propagation.md and
// reports/2026-09-09-portal-restoration-evidence-hardening-001.md.
import { denseIndex } from '../../../modules/solver/distance.ts';
import { AXIS_H, AXIS_V } from '../../../modules/solver/encoding.ts';

const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

function popcount(n) {
    let c = 0;
    for (let x = n; x; x >>>= 1) c += x & 1;
    return c;
}

/** @returns {{ extraNeeded: number, freeInt: number, extraCells: number[] } | { abstain: string }} */
export function computeMcNeighborBudget(pos, state, level, prep) {
    if (state.mustCrossMask === 0) return { abstain: 'no pending must-cross cells' };

    const mcKeys = level.mustCrossKeys;
    const eu = state.edgeUsage;
    const staticNeighborKeys = prep.staticNeighborKeys;
    const flipperIndexMap = prep.flipperIndexMap;
    const mustCrossIndex = prep.mustCrossIndex;

    const extraCells = new Set();
    for (let i = 0; i < mcKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        const mcKey = mcKeys[i];
        const usedAxes = eu[mcKey] || 0;
        const base = denseIndex(mcKey, prep.gridW) * 4;
        for (let d = 0; d < 4; d++) {
            if (usedAxes & NEIGHBOR_AXIS[d]) continue;
            const nk = staticNeighborKeys[base + d] - 1;
            if (nk < 0 || nk === pos) continue;
            if (flipperIndexMap && flipperIndexMap[nk] !== 0) continue;
            if (eu[nk] === (AXIS_H | AXIS_V)) continue;
            if (mustCrossIndex[nk] !== 0 && (state.mustCrossMask & (1 << (mustCrossIndex[nk] - 1))) !== 0) continue;
            if ((state.visited[nk] || 0) > 0) extraCells.add(nk);
        }
    }

    const freeInt = level.requiredIntersections - state.ints - popcount(state.mustCrossMask);
    return { extraNeeded: extraCells.size, freeInt, extraCells: [...extraCells] };
}

export function evaluateMcNeighborBudget({ level, prep, state, pos }) {
    const r = computeMcNeighborBudget(pos, state, level, prep);
    if ('abstain' in r) return { verdict: 'pass', abstained: true, reason: r.abstain };
    if (r.extraNeeded === 0) return { verdict: 'pass', abstained: false, extraNeeded: 0, freeInt: r.freeInt };
    if (r.freeInt < r.extraNeeded) {
        return {
            verdict: 'reject', abstained: false,
            reason: `${r.extraNeeded} distinct already-visited must-cross-forced neighbor(s) each need one more (unreserved) intersection, but only ${r.freeInt} free intersections remain`,
            extraNeeded: r.extraNeeded, freeInt: r.freeInt, extraCells: r.extraCells,
        };
    }
    return { verdict: 'pass', abstained: false, extraNeeded: r.extraNeeded, freeInt: r.freeInt };
}
