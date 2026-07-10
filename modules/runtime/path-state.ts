// Pure path-state manipulation: cloning, rebuilding derived counts,
// step simulation, and T-intersection hazard detection.
// AXIS_H/AXIS_V must stay in sync with APP.Core.H and APP.Core.V.
// MODE_EDITOR/MODE_REVIEW must stay in sync with APP.Core.EDITOR and APP.Core.REVIEW.

import { PACK, UNPACK, inBounds } from '../domain/cell-key.js';
import { isValidMove }            from '../domain/move-rules.js';
import { MoveContext }            from '../domain/move-context.js';
import { resolvePortal }          from '../domain/portal-utils.js';
import { turnDirection }          from '../domain/geometry.js';
import { areWinMetricsSatisfied } from './game-rules.js';
import type { NavStepState, NormalizedLevel, TapRouteState } from '../domain/types.js';

/** Outcome of a single tap-route step. */
type StepResult = 'valid' | 'portal' | 'goose' | 'detonate';
interface StepOutcome { state: TapRouteState; result: StepResult; }

const AXIS_H      = 1;
const AXIS_V      = 2;
const MODE_EDITOR = 1;
const MODE_REVIEW = 2;

// Accepts either the full engineState (with .nav/.hazards sub-objects) or a flat
// clone produced by a previous call (which has all fields at the top level).
/** @param source  full engineState or a flat clone (nested-or-flat boundary) */
export function cloneTapRouteState(source: any): TapRouteState {
    const nav = source.nav ?? source;
    return {
        mode:                  source.mode,
        path:                  [...nav.path],
        isPortalJump:          new Set(nav.isPortalJump),
        visitedCounts:         new Map(nav.visitedCounts),
        cellUsage:             new Map<number, { h: boolean; v: boolean }>(
            Array.from(nav.cellUsage.entries(), ([k, u]: [any, any]): [number, { h: boolean; v: boolean }] => [k, { h: !!u.h, v: !!u.v }]),
        ),
        intersections:         nav.intersections,
        flipCount:             nav.flipCount,
        crossedFlippingFilters: new Map(nav.crossedFlippingFilters),
        activeGateKey:         nav.activeGateKey,
        turnsAtMap:            new Map(nav.turnsAtMap ?? []),
        armedFalseGoals:       new Set(source.hazards?.armedFalseGoals   ?? source.armedFalseGoals   ?? []),
        revealedGeese:         new Set(source.hazards?.revealedGeese      ?? source.revealedGeese     ?? []),
    };
}

// Resets and recomputes visitedCounts, cellUsage, intersections, flipCount,
// and crossedFlippingFilters from state.path.  Does NOT touch lastFlipTime
// (the engine wrapper handles that side effect).
function _recordTurn(turnsAtMap: Map<number, string>, at: number, dir: string): void {
    const ex = turnsAtMap.get(at);
    if (!ex) turnsAtMap.set(at, dir);
    else if (ex !== dir) turnsAtMap.set(at, 'both');
}

function _detectTurns(path: number[], isPortalJump: Set<number>, turnsAtMap: Map<number, string>): void {
    turnsAtMap.clear();
    for (let i = 1; i < path.length - 1; i++) {
        if (isPortalJump.has(i) || isPortalJump.has(i + 1)) continue;
        const dir = turnDirection(path[i - 1], path[i], path[i + 1]);
        if (dir) _recordTurn(turnsAtMap, path[i], dir);
    }
}

export function rebuildDerivedState(state: TapRouteState, level: NormalizedLevel | null): void {
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
            const mark = (key: number, ax: number) => {
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

export function pushStep(state: NavStepState, key: number, isJump: boolean, level: NormalizedLevel): void {
    if (!state.turnsAtMap) state.turnsAtMap = new Map();
    const lastK = state.path[state.path.length - 1] as number | undefined;
    if (lastK !== undefined && !isJump) {
        const p1 = UNPACK(lastK), p2 = UNPACK(key);
        const axis = (p2.y === p1.y) ? AXIS_H : AXIS_V;
        const mark = (k: number, ax: number) => {
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
            const dir = turnDirection(prevK, lastK, key);
            if (dir) _recordTurn(state.turnsAtMap, lastK, dir);
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

export function wouldCreateBlockedTIntersection(state: TapRouteState, key: number, level: NormalizedLevel): boolean {
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

// Replay a sequence of move targets through the pure tap-route step transition, starting from
// `baseState`. Returns the final state plus the per-step outcome list ('valid' | 'portal' |
// 'goose' | 'detonate' | 'invalid'). An illegal move (simulateTapRouteStep → null) is recorded
// as 'invalid' and leaves the state unchanged, so replay continues. This is the command-sequence
// replay helper for unit tests (modernization-plan §2 Phase 4): it lets tests express "play these
// moves, then assert the resulting path / intersections / win-state" declaratively against the
// real movement transition, with no DOM/engine boot.
export function replayMoves(baseState: any, targetKeys: number[], level: NormalizedLevel): { state: TapRouteState; outcomes: (StepResult | 'invalid')[] } {
    let current = cloneTapRouteState(baseState);
    const outcomes: (StepResult | 'invalid')[] = [];
    for (const key of targetKeys) {
        const res = simulateTapRouteStep(current, key, level);
        if (!res) { outcomes.push('invalid'); continue; }
        current = res.state;
        outcomes.push(res.result);
    }
    return { state: current, outcomes };
}

export function simulateTapRouteStep(baseState: any, key: number, level: NormalizedLevel, options: { skipTIntersectionCheck?: boolean } = {}): StepOutcome | null {
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
    // The armedFalseGoals check on portal.dest is defense-in-depth, not evidence a portal
    // destination can coincide with a false goal in valid data — one object per cell is an
    // absolute invariant (enforced by validateRawLevel; see CLAUDE.md's "Cell occupancy is an
    // absolute invariant" note), so this should never actually fire on a schema-valid level.
    const portal = resolvePortal(level, key);
    if (portal && portal.dest !== -1) {
        pushStep(nextState, portal.dest, true, level);
        if (nextState.armedFalseGoals.has(portal.dest) && areWinMetricsSatisfied(nextState, level))
            return { state: nextState, result: 'detonate' };
        return { state: nextState, result: 'portal' };
    }
    return { state: nextState, result: 'valid' };
}
