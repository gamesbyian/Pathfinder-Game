// Pure win-condition and path-metric rules.
// These constants MUST stay in sync with APP.Core.MODES and APP.Core.LogicStatus.

const MODE_EDITOR            = 1;
const MODE_REVIEW            = 2;
const LOGIC_HAZARD_TRIGGERED = 'HAZARD_TRIGGERED';

export function getRealLength(state) {
    return state.path.length > 0 ? state.path.length - 1 - state.isPortalJump.size : 0;
}

export function areWinMetricsSatisfied(state, level) {
    if (!level || !state.path.length) return false;
    const curLen = getRealLength(state);
    if (curLen !== level.reqLen || state.intersections !== level.reqInt) return false;
    const allMustPass  = level.mustPassKeys.every(k => state.visitedCounts.get(k) > 0);
    const allMustCross = level.mustCrossKeys.every(k => (state.visitedCounts.get(k) || 0) >= 2);
    return allMustPass && allMustCross;
}

export function checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) {
    if (!path.length || logicState === LOGIC_HAZARD_TRIGGERED || mode === MODE_EDITOR || mode === MODE_REVIEW) return false;
    const last = path[path.length - 1];
    if (last !== level.goalKey) return false;
    return areWinMetricsSatisfied({ path, isPortalJump, visitedCounts, intersections }, level);
}
