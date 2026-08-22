// Sound single-neighbor goal-approach probe. If exactly one structurally viable grid neighbor can
// enter the goal, every grid-arrival solution must use it. If that non-gate neighbor was already
// visited and is not the current position, finishing forces at least one future intersection.
// Abstain when a portal can enter the goal or when the grid entry is not uniquely forced.

const AXIS_H = 1;
const AXIS_V = 2;
const DIRS = [[1, 0, AXIS_H], [-1, 0, AXIS_H], [0, 1, AXIS_V], [0, -1, AXIS_V]];

function computeGoalViableEntryNeighbors(level) {
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
