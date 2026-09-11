// Joint-obligation propagation, first concrete instantiation (observer-only pilot per
// reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md and
// reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md).
//
// The existing must-cross forced-neighbor checks (lower-bounds.ts's mustCrossForcedNeighborDeadlocked
// and mustCrossNeighborBudgetDeadlocked) already establish: a pending must-cross cell's still-unused
// axis requires BOTH cardinal neighbors on that axis to remain enterable. Both existing checks reason
// about that requirement in isolation from what KIND of cell the neighbor is — a hard wall (both
// edgeUsage axis bits spent) is treated as an immediate deadlock; anything else, including an
// already-visited PORTAL TERMINAL, is only charged as a soft "one more free-intersection unit" cost.
//
// But search-state.ts's isMoveDynamicallyValid encodes a THIRD, unconditional rule neither existing
// check models: "each portal cell can only be visited once" — a visited portal terminal can never be
// entered again, at ANY price, regardless of its edgeUsage bits. That is a strictly stronger fact than
// "costs one intersection." So when a pending must-cross cell's required neighbor is itself a visited
// portal terminal, the must-cross obligation and the portal obligation are each individually reasoned
// about correctly elsewhere, but their COMBINATION is a provable hard deadlock that neither existing
// check catches — exactly the "individually feasible, jointly incompatible" shape the joint-obligation
// hypothesis describes. This is the first obligation-cluster kind this pilot instantiates: a two-cell
// cluster {pending must-cross cell, portal-terminal forced neighbor}.
//
// Soundness argument: search-state.ts:361's rule is unconditional (checked before any edge-axis
// state), so "neighbor is a portal terminal AND already visited" implies "neighbor can never be
// entered again" with no exception — the same certainty class as the existing hard-wall check, not a
// heuristic. The `pos` exemption mirrors mustCrossForcedNeighborDeadlocked's own (the current cell may
// already be serving as this exact neighbor). A neighbor that is ALSO itself a pending must-cross cell
// abstains rather than guesses (compound portal+must-cross identity is a genuinely unsupported
// combination this derivation does not reason about, mirroring mustCrossNeighborBudgetDeadlocked's own
// abstain-on-flipper-neighbor discipline).
//
// Representation contract: prep.staticNeighborKeys is row-major dense-indexed — use
// denseIndex(mcKey, prep.gridW), exactly as production lower-bounds.ts / mc-neighbor-budget.mjs do.
import { denseIndex } from '../../../modules/solver/distance.ts';
import { AXIS_H, AXIS_V } from '../../../modules/solver/encoding.ts';

const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

/**
 * Static (level-only, no dynamic state) opportunity-population predicate: does this level contain
 * at least one obligation cluster this mechanism can ever fire on — a must-cross cell with a portal
 * terminal as one of its cardinal neighbors? Used for opportunity sizing (docs/solver-experiment-
 * opportunity-sizing.md) before spending any real-search compute: a level with zero clusters can
 * only ever abstain, regardless of how the search unfolds.
 * @returns {{ mcKey: number, neighborKey: number, axis: 'H'|'V' }[]}
 */
export function findStaticObligationClusters(level, prep) {
    if (level.mustCrossKeys.length === 0 || level.portalMap.size === 0) return [];
    const clusters = [];
    for (const mcKey of level.mustCrossKeys) {
        const base = denseIndex(mcKey, prep.gridW) * 4;
        for (let d = 0; d < 4; d++) {
            const nk = prep.staticNeighborKeys[base + d] - 1;
            if (nk < 0) continue;
            if (level.portalMap.has(nk)) clusters.push({ mcKey, neighborKey: nk, axis: d < 2 ? 'H' : 'V' });
        }
    }
    return clusters;
}

/** @returns {{ dead: true, mcKey: number, neighborKey: number, axis: 'H'|'V' } | { dead: false } | { abstain: string }} */
export function computeJointObligationPortalDeadlock(pos, state, level, prep) {
    if (state.mustCrossMask === 0) return { abstain: 'no pending must-cross cells' };
    if (level.portalMap.size === 0) return { abstain: 'no portals on this level' };

    const mcKeys = level.mustCrossKeys;
    const eu = state.edgeUsage;
    const staticNeighborKeys = prep.staticNeighborKeys;
    const mustCrossIndex = prep.mustCrossIndex;
    let compoundReason = null;

    for (let i = 0; i < mcKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        const mcKey = mcKeys[i];
        const usedAxes = eu[mcKey] || 0;
        const base = denseIndex(mcKey, prep.gridW) * 4;
        for (let d = 0; d < 4; d++) {
            if (usedAxes & NEIGHBOR_AXIS[d]) continue; // that pass is already done
            const nk = staticNeighborKeys[base + d] - 1; // undo +1 "absent" bias
            if (nk < 0 || nk === pos) continue; // absent, or exempt (may serve as this neighbor right now)
            if (!level.portalMap.has(nk)) continue; // only portal-terminal neighbors are in scope here
            if (mustCrossIndex[nk] !== 0 && (state.mustCrossMask & (1 << (mustCrossIndex[nk] - 1))) !== 0) {
                compoundReason = compoundReason
                    || `neighbor ${nk} is both a portal terminal and a pending must-cross cell (unsupported compound obligation)`;
                continue;
            }
            if ((state.visited[nk] || 0) > 0) {
                return { dead: true, mcKey, neighborKey: nk, axis: d < 2 ? 'H' : 'V' };
            }
        }
    }
    if (compoundReason) return { abstain: compoundReason };
    return { dead: false };
}

export function evaluateJointObligationPortalDeadlock({ level, prep, state, pos }) {
    const r = computeJointObligationPortalDeadlock(pos, state, level, prep);
    if ('abstain' in r) return { verdict: 'pass', abstained: true, reason: r.abstain };
    if (r.dead) {
        return {
            verdict: 'reject', abstained: false,
            reason: `must-cross cell ${r.mcKey}'s still-open ${r.axis} axis requires forced neighbor ${r.neighborKey}, `
                + 'a portal terminal that is already visited and can never be entered again',
            mcKey: r.mcKey, neighborKey: r.neighborKey, axis: r.axis,
        };
    }
    return { verdict: 'pass', abstained: false };
}
