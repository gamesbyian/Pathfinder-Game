// Pure path-state manipulation: cloning, rebuilding derived counts,
// step simulation, and T-intersection hazard detection.
// AXIS_H/AXIS_V must stay in sync with APP.Core.H and APP.Core.V.
// MODE_EDITOR/MODE_REVIEW must stay in sync with APP.Core.EDITOR and APP.Core.REVIEW.

import { PACK, UNPACK, inBounds } from '../domain/cell-key.js';
import { isValidMove }            from '../domain/move-rules.js';
import { MoveContext }            from '../domain/move-context.js';
import { resolvePortal }          from '../domain/portal-utils.js';
import { areWinMetricsSatisfied } from './game-rules.js';

const AXIS_H      = 1;
const AXIS_V      = 2;
const MODE_EDITOR = 1;
const MODE_REVIEW = 2;

// Accepts either the full engineState (with .nav/.hazards sub-objects) or a flat
// clone produced by a previous call (which has all fields at the top level).
export function cloneTapRouteState(source) {
    const nav = source.nav ?? source;
    return {
        mode:                  source.mode,
        path:                  [...nav.path],
        isPortalJump:          new Set(nav.isPortalJump),
        visitedCounts:         new Map(nav.visitedCounts),
        cellUsage:             new Map(Array.from(nav.cellUsage.entries(), ([k, u]) => [k, { h: !!u.h, v: !!u.v }])),
        intersections:         nav.intersections,
        flipCount:             nav.flipCount,
        crossedFlippingFilters: new Map(nav.crossedFlippingFilters),
        activeGateKey:         nav.activeGateKey,
        turnsAtMap:            new Map(nav.turnsAtMap ?? []),
        armedFalseGoals:       new Set(source.hazards?.armedFalseGoals   ?? source.armedFalseGoals   ?? []),
        revealedGeese:         new Set(source.hazards?.revealedGeese      ?? source.revealedGeese     ?? [])
    };
}

// Resets and recomputes visitedCounts, cellUsage, intersections, flipCount,
// and crossedFlippingFilters from state.path.  Does NOT touch lastFlipTime
// (the engine wrapper handles that side effect).
function _recordTurn(turnsAtMap, at, dir) {
    const ex = turnsAtMap.get(at);
    if (!ex) turnsAtMap.set(at, dir);
    else if (ex !== dir) turnsAtMap.set(at, 'both');
}

function _detectTurns(path, isPortalJump, turnsAtMap) {
    turnsAtMap.clear();
    for (let i = 1; i < path.length - 1; i++) {
        if (isPortalJump.has(i) || isPortalJump.has(i + 1)) continue;
        const prev = path[i - 1], cur = path[i], next = path[i + 1];
        const py = (prev >>> 16) & 0xFFFF, cy = (cur  >>> 16) & 0xFFFF, ny = (next >>> 16) & 0xFFFF;
        const px = prev & 0xFFFF,           cx = cur  & 0xFFFF,          nx = next & 0xFFFF;
        const entryAxis = (cy === py) ? AXIS_H : AXIS_V;
        const exitAxis  = (ny === cy) ? AXIS_H : AXIS_V;
        if (entryAxis === exitAxis) continue;
        const cross = (cx - px) * (ny - cy) - (cy - py) * (nx - cx);
        _recordTurn(turnsAtMap, cur, cross > 0 ? 'right' : 'left');
    }
}

export function rebuildDerivedState(state, level) {
    state.visitedCounts.clear();
    state.cellUsage.clear();
    state.intersections = 0;
    state.flipCount     = 0;
    state.crossedFlippingFilters.clear();
    if (!state.turnsAtMap) state.turnsAtMap = new Map();
    _detectTurns(state.path, state.isPortalJump, state.turnsAtMap);
    for (let i = 0; i < state.path.length; i++) {
        const k = state.path[i];
        const c = state.visitedCounts.get(k) || 0;
        if (c > 0 && k !== state.activeGateKey && (level && k !== level.goalKey)) state.intersections++;
        state.visitedCounts.set(k, c + 1);
        if (i > 0 && !state.isPortalJump.has(i)) {
            const prevK = state.path[i - 1];
            const p1 = UNPACK(prevK), p2 = UNPACK(k);
            const axis = (p2.y === p1.y) ? AXIS_H : AXIS_V;
            const mark = (key, ax) => {
                const u = state.cellUsage.get(key) || { h: false, v: false };
                if (ax === AXIS_H) u.h = true; else u.v = true;
                state.cellUsage.set(key, u);
            };
            mark(prevK, axis);
            mark(k, axis);
        }
        if (level && level.flippingFilterMap.has(k) && !state.crossedFlippingFilters.has(k)) {
            state.crossedFlippingFilters.set(k, state.flipCount);
            state.flipCount++;
        }
    }
}

export function pushStep(state, key, isJump, level) {
    if (!state.turnsAtMap) state.turnsAtMap = new Map();
    const lastK = state.path[state.path.length - 1];
    if (lastK !== undefined && !isJump) {
        const p1 = UNPACK(lastK), p2 = UNPACK(key);
        const axis = (p2.y === p1.y) ? AXIS_H : AXIS_V;
        const mark = (k, ax) => {
            const u = state.cellUsage.get(k) || { h: false, v: false };
            if (ax === AXIS_H) u.h = true; else u.v = true;
            state.cellUsage.set(k, u);
        };
        mark(lastK, axis);
        mark(key, axis);
    }
    // Detect turn at lastK (cell being departed) when adding a non-portal step
    if (lastK !== undefined && !isJump && state.path.length >= 2) {
        const prevK = state.path[state.path.length - 2];
        const wasJump = state.isPortalJump.has(state.path.length - 1);
        if (!wasJump) {
            const py = (prevK >>> 16) & 0xFFFF, ly = (lastK >>> 16) & 0xFFFF, ky = (key >>> 16) & 0xFFFF;
            const px = prevK & 0xFFFF,           lx = lastK & 0xFFFF,          kx = key & 0xFFFF;
            const entryAxis = (ly === py) ? AXIS_H : AXIS_V;
            const exitAxis  = (ky === ly) ? AXIS_H : AXIS_V;
            if (entryAxis !== exitAxis) {
                const cross = (lx - px) * (ky - ly) - (ly - py) * (kx - lx);
                _recordTurn(state.turnsAtMap, lastK, cross > 0 ? 'right' : 'left');
            }
        }
    }
    const count = state.visitedCounts.get(key) || 0;
    if (count > 0 && key !== state.activeGateKey && (level && key !== level.goalKey)) state.intersections++;
    state.visitedCounts.set(key, count + 1);
    state.path.push(key);
    if (isJump) state.isPortalJump.add(state.path.length - 1);
    if (level && level.flippingFilterMap.has(key) && !state.crossedFlippingFilters.has(key)) {
        state.crossedFlippingFilters.set(key, state.flipCount);
        state.flipCount++;
    }
}

export function wouldCreateBlockedTIntersection(state, key, level) {
    if (!state || !level || state.path.length === 0) return false;
    const lastK = state.path[state.path.length - 1];
    const from = UNPACK(lastK);
    const to   = UNPACK(key);
    const axis = (to.y === from.y) ? AXIS_H : AXIS_V;
    const usageAtTarget  = state.cellUsage.get(key) || { h: false, v: false };
    const revisitCount   = state.visitedCounts.get(key) || 0;
    const perpendicularUsed  = axis === AXIS_H ? usageAtTarget.v : usageAtTarget.h;
    const currentAxisUsed    = axis === AXIS_H ? usageAtTarget.h : usageAtTarget.v;
    if (revisitCount <= 0 || !perpendicularUsed || currentAxisUsed) return false;

    const dirX     = Math.sign(to.x - from.x);
    const dirY     = Math.sign(to.y - from.y);
    const forwardX = to.x + dirX;
    const forwardY = to.y + dirY;
    if (!inBounds(forwardX, forwardY, level.grid.w, level.grid.h)) return true;

    const forwardKey          = PACK(forwardX, forwardY);
    const simulatedAfterEnter = simulateTapRouteStep(state, key, level, { skipTIntersectionCheck: true });
    if (!simulatedAfterEnter) return false;
    const simulatedForward    = simulateTapRouteStep(simulatedAfterEnter.state, forwardKey, level, { skipTIntersectionCheck: true });
    if (!simulatedForward) return true;
    if (simulatedForward.result === 'goose') return state.revealedGeese?.has(forwardKey) || false;
    return false;
}

export function simulateTapRouteStep(baseState, key, level, options = {}) {
    const nextState = cloneTapRouteState(baseState);
    if (nextState.path.length > 1 && key === nextState.path[nextState.path.length - 2]) {
        nextState.path.pop();
        const prevLen = nextState.path.length;
        nextState.isPortalJump = new Set(Array.from(nextState.isPortalJump).filter(i => i < prevLen));
        rebuildDerivedState(nextState, level);
        return { state: nextState, result: 'valid' };
    }
    if (!isValidMove(key, nextState, level, MoveContext.TAP_ROUTE)) return null;
    if (!options.skipTIntersectionCheck && wouldCreateBlockedTIntersection(nextState, key, level)) return null;
    if (nextState.mode !== MODE_EDITOR && nextState.mode !== MODE_REVIEW && level.gooseSet.has(key))
        return { state: nextState, result: 'goose' };
    pushStep(nextState, key, false, level);
    if (nextState.armedFalseGoals.has(key) && areWinMetricsSatisfied(nextState, level))
        return { state: nextState, result: 'detonate' };
    const portal = resolvePortal(level, key);
    if (portal && portal.dest !== -1) {
        pushStep(nextState, portal.dest, true, level);
        if (nextState.armedFalseGoals.has(portal.dest) && areWinMetricsSatisfied(nextState, level))
            return { state: nextState, result: 'detonate' };
        return { state: nextState, result: 'portal' };
    }
    return { state: nextState, result: 'valid' };
}
