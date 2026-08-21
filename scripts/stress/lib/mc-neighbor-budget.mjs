/**
 * Must-cross dynamic neighbor-budget propagation — the shared derivation behind
 * `scripts/stress/probes/mc-neighbor-budget-probe.mjs` (harness-pluggable shadow probe) and
 * `scripts/stress/mc-neighbor-budget-soundness-check.mjs` (full-corpus stored-solution replay).
 * Prototypes docs/solver-heuristic-capability-gap-analysis.md's item 3 ("Must-cross/intersection
 * propagation: proven family, narrowed frontier") — "bounded dynamic propagation over forced
 * interfaces and remaining free intersection budget" — as a SHADOW (non-pruning-by-default)
 * check, scored by unique catches beyond the shipped gauntlet before any hot-path integration is
 * considered, per that doc's own recommended sequence.
 *
 * WHAT'S ALREADY SHIPPED, AND WHY THIS ISN'T A RETRY. See
 * reports/2026-07-31-mustcross-forced-structure.md and reports/2026-07-31-reserved-intersection-wall.md:
 * - PRUNE_MC_CEILING (prune-gauntlet.ts): `ints + popcount(mustCrossMask) <= reqInt` — each pending
 *   must-cross cell reserves exactly ONE future intersection (its own second crossing).
 * - PRUNE_MC_RESERVED_WALL (topology.ts's isConnected): once `freeInt = reqInt - ints -
 *   popcount(mustCrossMask)` hits 0, every visited ORDINARY cell becomes a hard wall in the
 *   connectivity flood fill — but the flood fill only asks "is must-cross cell i ITSELF
 *   reachable", never "is the SPECIFIC neighbor still-needed for i's unused axis reachable" — a
 *   must-cross cell can look reachable (via its already-used-axis side) while the exact neighbor
 *   its still-open crossing needs is unreachable.
 * - PRUNE_MC_FORCED_NEIGHBOR (lower-bounds.ts's mustCrossForcedNeighborDeadlocked): catches the
 *   HARD-wall case of that gap — a still-needed axis's neighbor with edgeUsage already at both
 *   bits (or an already-used flipper) can never be entered again, full stop.
 * - Forced-edge propagation (a STATIC claim that a cell adjacent to >=2 must-cross cells has both
 *   its OTHER edges unusable) was independently derived and FALSIFIED twice (broad: 63,496
 *   violations/1.1M edges; narrowed to both-axes-claimed cells: 5,206/225,094) — the "leaving
 *   along a used axis is legal when going straight" exemption, and P00124's 2x2-must-cross-block
 *   case where a single cell can legitimately serve two different crossings via two structurally
 *   distinct valid completions with no shared invariant beyond what PRUNE_MC_FORCED_NEIGHBOR
 *   already checks.
 *
 * THE UNTRIED GAP THIS TARGETS. Between "hard wall" (PRUNE_MC_FORCED_NEIGHBOR) and "no
 * constraint" there is a SOFT case neither shipped check reasons about: a still-needed axis's
 * required neighbor N that is *not* a hard wall, but has ALREADY been visited. Completing that
 * axis's crossing later necessarily means re-entering N — a genuine, unavoidable intersection
 * (the game's own rule: "entering a previously visited cell, excluding gate and goal revisits").
 * That intersection is NOT the one already reserved by PRUNE_MC_CEILING/PRUNE_MC_RESERVED_WALL
 * (that reservation pays for the must-cross cell's OWN second entry, not any neighbor's revisit).
 * This is DYNAMIC (depends on `state.visited`, not a static level fact) in exactly the way the
 * gap-analysis doc asks for, and it derives a fact the reserved wall's plain reachability check
 * cannot see (the wall asks "reachable at all", not "reachable via THIS specific required edge").
 *
 * SOUNDNESS ARGUMENT (necessary-condition lower bound on ADDITIONAL required intersections,
 * beyond the ones PRUNE_MC_CEILING already reserves).
 * 1. Per reports/2026-07-31-mustcross-forced-structure.md's derivation (falsified against 15,032
 *    stored solutions / 50,086 must-cross instances, 0 violations): a pending must-cross cell's
 *    still-unused axis's crossing REQUIRES both of that axis's two neighbors to become
 *    immediately path-adjacent to the must-cross cell (one entry, one exit of a straight pass).
 * 2. If such a required neighbor N has `state.visited[N] > 0` and is not the current position
 *    (which might be about to serve as exactly this neighbor right now — no revisit needed) and
 *    is not already a hard wall (that's PRUNE_MC_FORCED_NEIGHBOR's job), then N's future
 *    reappearance in the path is, by construction, at least its 2nd visit — an intersection the
 *    game rule does not exempt (N is neither a gate — structurally impossible, staticNeighborKeys
 *    excludes every gate cell as a target — nor the goal, which is never visited before the path
 *    terminates there).
 * 3. DISTINCT-CELL DEDUPLICATION IS WHAT KEEPS THIS SOUND WHERE THE FALSIFIED STATIC RULE WASN'T.
 *    The falsified forced-edge rule summed claims PER (must-cross cell, direction) and so could
 *    double-count a single shared neighbor cell serving two different crossings' needs at once
 *    (P00124's 2x2 block). This derivation instead collects the SET of distinct already-visited
 *    required-neighbor cells across every pending must-cross cell's every still-open axis. A
 *    single future revisit "event" at a cell N has exactly one predecessor and one successor in
 *    the path, so it can satisfy at most... whatever it satisfies, but N ITSELF still needs at
 *    least ONE more visit regardless of how many different must-cross cells would like to use
 *    that one revisit for their own purposes — the SET's cardinality (not a per-requirement sum)
 *    is what's proven, and cardinality-of-a-set-of-cells-each-independently-known-to-need->=1-
 *    revisit is a valid lower bound on total extra revisits needed, with no double-duty escape
 *    hatch: two different cells are still two different cells.
 * 4. EXCLUSIONS, each because the claim isn't safely derived for that case (abstain, don't guess):
 *    - Portal levels (`level.portalMap.size > 0`): entering a portal cell forces an immediate jump
 *      (CLAUDE.md's portal forced-move rule) — whether that "visits" the cell in the sense this
 *      derivation needs, and what a jump does to `freeInt`'s own `reqInt == nodes - distinctCells`
 *      identity, is exactly the case reports/2026-07-31-reserved-intersection-wall.md's own step-4
 *      follow-up flags as needing separate validation. Out of scope for this prototype.
 *    - Flipper neighbors (`prep.flipperIndexMap[nk] !== 0`): a flipper's traversable axis is
 *      dynamic, state/parity-dependent data this derivation does not model (same exclusion
 *      CLAUDE.md's must-cross gotcha documents for the shipped forced-neighbor check's own
 *      static-propagation sibling) — skip rather than assume re-entry is possible OR impossible.
 *    - A required neighbor that is ITSELF a pending must-cross cell
 *      (`prep.mustCrossIndex[nk] !== 0` and its own mask bit still set): its own eventual
 *      re-entry is already the ONE intersection PRUNE_MC_CEILING reserves for it. If that same
 *      physical re-entry event also happens to be immediately path-adjacent to the must-cross
 *      cell that named it as a required neighbor (plausible exactly in the adjacent-must-cross-
 *      cells shape that falsified the static rule), counting it AGAIN here would double-count a
 *      single intersection against two different obligations — so it is excluded from this bound
 *      entirely rather than risk an unsound overcount.
 *    - A required neighbor already a HARD wall (`edgeUsage[nk] === 3`): that's
 *      PRUNE_MC_FORCED_NEIGHBOR's unconditional catch already; excluded here so this probe's own
 *      catch count measures only its genuinely NEW (soft-budget) contribution.
 *
 * THE CHECK. `extraNeeded` = size of the deduplicated set described above. The must-cross-only
 * "free" intersection budget (reports/2026-07-31-reserved-intersection-wall.md) is
 * `freeInt = reqInt - ints - popcount(mustCrossMask)`. If `freeInt < extraNeeded`, the state is
 * provably dead: there is not enough unreserved intersection budget left to pay for even the
 * cheapest possible completion of every still-open must-cross axis.
 */
import { AXIS_H, AXIS_V } from '../../../modules/solver/encoding.ts';

const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

function popcount(n) {
    let c = 0;
    for (let x = n; x; x >>>= 1) c += x & 1;
    return c;
}

/**
 * @returns {{ extraNeeded: number, freeInt: number, extraCells: number[] } | { abstain: string }}
 */
export function computeMcNeighborBudget(pos, state, level, prep) {
    if (state.mustCrossMask === 0) return { abstain: 'no pending must-cross cells' };
    if (level.portalMap.size > 0) return { abstain: 'portal levels out of scope (see file doc)' };

    const mcKeys = level.mustCrossKeys;
    const eu = state.edgeUsage;
    const staticNeighborKeys = prep.staticNeighborKeys;
    const flipperIndexMap = prep.flipperIndexMap;
    const mustCrossIndex = prep.mustCrossIndex;

    const extraCells = new Set();
    for (let i = 0; i < mcKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        const mcKey = mcKeys[i];
        const usedAxes = eu[mcKey];
        const base = mcKey * 4;
        for (let d = 0; d < 4; d++) {
            if (usedAxes & NEIGHBOR_AXIS[d]) continue; // that pass is already satisfied
            const nk = staticNeighborKeys[base + d] - 1; // undo the +1 "absent" bias
            if (nk < 0 || nk === pos) continue; // absent, or exempt (may be about to serve as this neighbor right now)
            if (flipperIndexMap && flipperIndexMap[nk] !== 0) continue; // dynamic axis state — abstain, don't guess
            if (eu[nk] === (AXIS_H | AXIS_V)) continue; // hard wall — PRUNE_MC_FORCED_NEIGHBOR's job already
            if (mustCrossIndex[nk] !== 0 && (state.mustCrossMask & (1 << (mustCrossIndex[nk] - 1))) !== 0) continue; // pending-MC-adjacent-to-MC — avoid double-counting its own reservation
            if ((state.visited[nk] || 0) > 0) extraCells.add(nk);
        }
    }

    const freeInt = level.reqInt - state.ints - popcount(state.mustCrossMask);
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
