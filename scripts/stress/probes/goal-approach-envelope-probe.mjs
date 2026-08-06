/**
 * Goal-approach envelope probe — the harness-pluggable prototype implementation of
 * docs/solver-next-frontier-multilingual-research-update-2026-08-02.md section 13 ("backward
 * multi-resolution compatibility envelopes"), scoped down to the narrowest sound instance of the
 * B1/B2 layers (exact-resource-and-arrival-axis / local obligation envelope): a level whose goal
 * has exactly ONE structurally-viable grid-adjacent entry cell forces every solution's
 * second-to-last cell to be that one neighbor. If that neighbor has already been visited by the
 * current partial path (and isn't a gate, whose revisits are exempt from intersection counting),
 * reaching the goal later necessarily means re-entering it — a forced future intersection the
 * production solver's own intersection-deficit check (`PRUNE_INTERSECTION_DEFICIT`, a coarse
 * "deficit vs. remaining steps" comparison) has no way to know about, since it never reasons about
 * a SPECIFIC forthcoming forced revisit tied to level topology.
 *
 * SOUNDNESS ARGUMENT.
 * 1. `computeGoalViableEntryNeighbors` finds every grid-adjacent cell from which stepping onto the
 *    goal would be structurally legal — in-bounds, not a block/goose/false-goal, and (if the
 *    neighbor carries a regular filter) axis-compatible with the neighbor-to-goal move. This is a
 *    STATIC, state-independent fact about the level (computed fresh per call for simplicity, not
 *    cached — cheap, at most 4 neighbor checks). If a portal's destination is the goal itself, this
 *    probe abstains unconditionally: a portal-jump arrival doesn't have a "neighbor cell" in the
 *    ordinary sense, and its presence means the goal is NOT exclusively reachable via grid
 *    adjacency, invalidating the single-neighbor forcing argument below.
 * 2. If more than one (or zero) grid neighbor is viable, there is no forcing to exploit — abstain.
 * 3. With exactly one viable neighbor G', every real solution's path is `... -> G' -> goal`
 *    (G' is not itself a gate — checked separately, since a gate revisit is exempt from
 *    intersection counting and would invalidate the deduction). If the CURRENT state has already
 *    visited G' at least once (`state.visited[G'] > 0`) and is not currently standing on it, the
 *    path must leave and later return to G' before finishing — a genuine re-entry, which
 *    unconditionally counts as an intersection under the game's own rule ("entering a previously
 *    visited cell, excluding gate and goal revisits" — G' is neither). This holds regardless of how
 *    many more times the path visits G' before then (each additional visit only adds MORE forced
 *    intersections, never fewer), so "at least 1 more intersection than the current count" is a
 *    valid necessary condition, not merely a heuristic guess.
 * 4. If the level's remaining intersection budget (`level.reqInt - state.ints`) is already 0 (or
 *    negative), that forced future intersection cannot be paid for — a real, sound rejection.
 *
 * SCOPE LIMITS (honest). This is the single-neighbor, one-forced-revisit case only — it says
 * nothing about levels where the goal has 2+ viable neighbors (the common case), nor does it
 * attempt the fuller B1 envelope (joint length + intersections + arrival-axis reachable-tuple set)
 * the research doc describes; that would need an actual backward BFS/DP layer this prototype
 * doesn't build. A goal this constrained may simply be rare on the corpus this harness measures
 * against — if so, that is itself the honest, valuable result the shadow-eval harness is designed
 * to surface (see docs/solver-shadow-eval-harness.md's Part 4 for the established precedent of a
 * real, sound, narrow-population probe being a legitimate outcome).
 */

const AXIS_H = 1;
const AXIS_V = 2;
const DIRS = [[1, 0, AXIS_H], [-1, 0, AXIS_H], [0, 1, AXIS_V], [0, -1, AXIS_V]];

function computeGoalViableEntryNeighbors(level) {
    // Any portal jumping directly INTO the goal invalidates the "grid-adjacency-only" forcing
    // argument entirely — signal this back to the caller via a sentinel rather than silently
    // omitting it from the neighbor count.
    for (const entry of level.portalMap.values()) {
        if (entry.dest === level.goalKey) return null;
    }

    const gx = level.goalKey & 0xFFFF, gy = (level.goalKey >>> 16) & 0xFFFF;
    const { w, h } = level.grid;
    const viable = [];
    for (const [dx, dy, axis] of DIRS) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ((ny << 16) | nx) >>> 0;
        if (level.blockSet.has(nk) || level.gooseSet.has(nk) || level.falseGoalKeys.has(nk)) continue;
        const filterAxis = level.filterMap.get(nk);
        if (filterAxis !== undefined && filterAxis !== axis) continue;
        viable.push(nk);
    }
    return viable;
}

export const name = 'goal-approach-envelope';
export const soundnessClass = 'sound prune (forced-revisit necessary condition from a single-neighbor goal approach)';

export function evaluate({ level, state, pos }) {
    const viable = computeGoalViableEntryNeighbors(level);
    if (viable === null) {
        return { verdict: 'pass', abstained: true, reason: 'goal is also reachable via a portal jump — single-neighbor forcing does not apply' };
    }
    if (viable.length !== 1) {
        return { verdict: 'pass', abstained: true, reason: `goal has ${viable.length} viable grid-adjacent entry neighbors (need exactly 1 to force anything)` };
    }

    const gPrime = viable[0];
    if (level.gateKeys.includes(gPrime)) {
        return { verdict: 'pass', abstained: true, reason: 'the sole goal-entry neighbor is itself a gate cell, whose revisits are exempt from intersection counting' };
    }
    if (pos === gPrime) {
        return { verdict: 'pass', abstained: true, reason: 'currently standing on the sole goal-entry neighbor — not yet clear this is not the final approach' };
    }
    if ((state.visited[gPrime] || 0) === 0) {
        return { verdict: 'pass', abstained: true, reason: 'sole goal-entry neighbor not yet visited — no forced revisit yet' };
    }

    const remainingInts = level.reqInt - state.ints;
    if (remainingInts < 1) {
        return {
            verdict: 'reject', abstained: false,
            reason: `sole goal-entry neighbor (already visited) forces at least 1 more intersection before reaching the goal, but only ${remainingInts} remain in budget`,
            gPrime, remainingInts,
        };
    }
    return { verdict: 'pass', abstained: false, gPrime, remainingInts };
}
