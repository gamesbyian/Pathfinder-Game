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
    if (!allMustPass || !allMustCross) return false;
    // Surround: all reachable 8-neighbors of each surround cell must have been visited
    if (level.surroundKeys?.length > 0) {
        const { w, h } = level.grid;
        const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
        const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        for (const sk of level.surroundKeys) {
            const sx = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
            for (let d = 0; d < 8; d++) {
                const nx = sx + _dx8[d], ny = sy + _dy8[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = ((ny << 16) | nx) >>> 0;
                if (level.blockSet.has(nk)) continue;
                if (!(state.visitedCounts.get(nk) > 0)) return false;
            }
        }
    }
    // Must-turn: each must-turn cell must have had a turn (of the required direction) at some visit
    if (level.mustPassTurnDirs?.size > 0) {
        const turnsAtMap = state.turnsAtMap;
        if (!turnsAtMap) return false;
        for (const [k, req] of level.mustPassTurnDirs) {
            const t = turnsAtMap.get(k);
            if (!t) return false;
            if (req !== 'either' && t !== req && t !== 'both') return false;
        }
    }
    // Adjacent-turn: each adj-turn object must have had a turn at one of its 8 adjacent cells
    if (level.adjacentTurnKeys?.length > 0) {
        const turnsAtMap = state.turnsAtMap;
        if (!turnsAtMap) return false;
        const { w, h } = level.grid;
        const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
        const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        for (let oi = 0; oi < level.adjacentTurnKeys.length; oi++) {
            const atk = level.adjacentTurnKeys[oi];
            const req = (level.adjacentTurnDirs || [])[oi] || 'either';
            const ax = atk & 0xFFFF, ay = (atk >>> 16) & 0xFFFF;
            let satisfied = false;
            for (let d = 0; d < 8 && !satisfied; d++) {
                const nx = ax + _dx8[d], ny = ay + _dy8[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = ((ny << 16) | nx) >>> 0;
                const t = turnsAtMap.get(nk);
                if (!t) continue;
                if (req === 'either' || t === req || t === 'both') satisfied = true;
            }
            if (!satisfied) return false;
        }
    }
    return true;
}

export function checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) {
    if (!path.length || logicState === LOGIC_HAZARD_TRIGGERED || mode === MODE_EDITOR || mode === MODE_REVIEW) return false;
    const last = path[path.length - 1];
    if (last !== level.goalKey) return false;
    return areWinMetricsSatisfied({ path, isPortalJump, visitedCounts, intersections }, level);
}
