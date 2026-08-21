// Pure move-legality rules for the Pathfinder grid.
// These constant values MUST stay in sync with APP.Core.AXIS and APP.Core.MODES.
// If those enums change, update here as well.

import { UNPACK, inBounds } from './cell-key.js';
import { resolvePortal } from './portal-utils.js';
import type { NormalizedLevel, MoveState, MoveOptions } from './types.js';

const AXIS_H    = 1;   // APP.Core.H
const AXIS_V    = 2;   // APP.Core.V
const AXIS_NONE = 0;   // APP.Core.NONE
const MODE_EDITOR = 1; // APP.Core.EDITOR

/** Single source of truth for whether stepping onto `targetKey` is legal in the given state. */
export function isValidMove(
    targetKey: number,
    state: MoveState | null | undefined,
    level: NormalizedLevel | undefined,
    options: MoveOptions = {},
): boolean {
    const {
        isStrict       = false,
        allowJump      = true,
        forbidPortals  = false,
        mode           = state?.mode,
        armedFalseGoals = state?.hazards?.armedFalseGoals ?? state?.armedFalseGoals,
        _flipCount     = state?.nav?.flipCount ?? state?.flipCount ?? 0,
        crossedSet     = state?.nav?.crossedFlippingFilters ?? state?.crossedSet ?? state?.crossedFlippingFilters ?? new Map(),
        checkHazards   = isStrict,
        checkFalseGoals = isStrict,
        checkWinMetrics = isStrict,
        disabledPrunes = [],
        diagnostics    = null
    } = options;

    const setReason = (reasonCode: string, detail: string | null = null): false => {
        if (!diagnostics || typeof diagnostics !== 'object') return false;
        diagnostics.reasonCode = reasonCode;
        if (detail !== null && detail !== undefined) diagnostics.reasonDetail = detail;
        return false;
    };

    if (!level) return false;
    // Support both nested engineState (with .nav sub-object) and flat state objects.
    const nav    = state?.nav;
    const path   = nav?.path    ?? state?.path  ?? [];
    const counts = nav?.visitedCounts ?? state?.visitedCounts ?? state?.counts ?? new Map();
    const usage  = nav?.cellUsage     ?? state?.cellUsage     ?? state?.usage  ?? new Map();
    const jumpSet = nav?.isPortalJump ?? state?.isPortalJump  ?? state?.jumpSet ?? new Set();

    const { x, y } = UNPACK(targetKey);
    const { w, h } = level.grid;
    if (!inBounds(x, y, w, h)) return setReason('invalid-oob');
    if (level.blockSet.has(targetKey)) return setReason('invalid-blocked');
    if (forbidPortals && level.portalMap?.has(targetKey)) return setReason('invalid-portal-legality', 'portal-terminal-forbidden');

    if (mode === MODE_EDITOR && checkHazards && level.gooseSet.has(targetKey)) return setReason('invalid-goose-hazard');

    const lastK = path[path.length - 1] as number | undefined;
    if (lastK === undefined) {
        if (diagnostics && typeof diagnostics === 'object') diagnostics.reasonCode = 'valid';
        return true;
    }

    const lastP = UNPACK(lastK);
    const isPortalJumpCandidate = allowJump && level.portalMap.has(lastK) &&
        resolvePortal(level, lastK)?.dest === targetKey;

    if (mode !== MODE_EDITOR) {
        if (lastK === level.goalKey) return setReason('invalid-after-goal');
        if (checkFalseGoals && armedFalseGoals?.has(lastK)) return setReason('invalid-false-goal-lock');
        if (level.gateKeys.includes(targetKey)) return setReason('invalid-gate-reentry');
    } else if (path.length > 1 && level.gateKeys.includes(lastK)) {
        return setReason('invalid-editor-gate-reentry');
    }

    if (allowJump && level.portalMap.has(lastK) && !jumpSet.has(path.length - 1) && !isPortalJumpCandidate)
        return setReason('invalid-portal-legality');

    if (mode !== MODE_EDITOR && level.portalMap?.has(targetKey) && (counts.get(targetKey) || 0) > 0)
        return setReason('invalid-portal-legality', 'portal-terminal-already-used');

    if (!isPortalJumpCandidate && Math.abs(x - lastP.x) + Math.abs(y - lastP.y) !== 1)
        return setReason('invalid-adjacency');

    const axis = (y === lastP.y) ? AXIS_H : AXIS_V;
    // Entry axis into lastK (the cell we're about to leave) — needed both for the edge-reuse-origin
    // check below and for the must-cross-lock check (a turn at a still-pending must-cross cell).
    let entryAxis = AXIS_NONE;
    if (path.length > 1 && !jumpSet.has(path.length - 1)) {
        const prevP  = UNPACK(path[path.length - 2]);
        const lastPC = UNPACK(lastK);
        entryAxis = (prevP.y === lastPC.y) ? AXIS_H : AXIS_V;
    }
    if (!isPortalJumpCandidate) {
        const u = usage.get(targetKey);
        if (u && ((axis === AXIS_H && u.h) || (axis === AXIS_V && u.v)))
            return setReason('invalid-edge-reuse-target');

        const uLast = usage.get(lastK);
        if (uLast && axis !== entryAxis) {
            if ((axis === AXIS_H && uLast.h) || (axis === AXIS_V && uLast.v))
                return setReason('invalid-edge-reuse-origin');
        }
    }

    // Must-cross lock: a must-cross cell must be crossed straight through (entered and exited on
    // the same axis) while its requirement is still pending (fewer than 2 visits so far) — turning
    // there would consume both axis bits, making the required 2nd straight crossing permanently
    // impossible. Mirrors search-state.ts's isMoveDynamicallyValid (CLAUDE.md's "Must-cross lock"
    // gotcha) — that check was solver-only until this fix; live play enforced no such restriction.
    if (!isPortalJumpCandidate && entryAxis !== AXIS_NONE && axis !== entryAxis
            && level.mustCrossKeys.includes(lastK) && (counts.get(lastK) || 0) === 1) {
        return setReason('invalid-must-cross-turn');
    }

    // Flipping-filter single-use: a flipping filter may be crossed at most once, ever — not
    // enforced by the axis-matching checks below on their own (2026-08-06 design ruling: once
    // the line has crossed a flipping filter, a second crossing is impossible in practice anyway,
    // since (a) the filter's required axis has flipped, so re-entering via the original axis is
    // already an axis mismatch, and (b) re-entering via the new required axis would require the
    // line to travel along an edge it has already used at that cell — but that's an emergent
    // consequence of two separate rules, not an explicit one, so state it directly here rather
    // than relying on the axis/edge-reuse checks to coincidentally combine into it). Mirrors the
    // solver's `flipperUsedMask` (search-state.ts), which already bans this outright.
    if (!isPortalJumpCandidate && level.flippingFilterMap.has(targetKey) && (counts.get(targetKey) || 0) > 0) {
        return setReason('invalid-flipper-reentry');
    }

    if (!isPortalJumpCandidate) {
        let filterLast = level.filterMap.get(lastK);
        if (filterLast === undefined && level.flippingFilterMap.has(lastK) && crossedSet.has(lastK)) {
            const relevantFlipCount = crossedSet.get(lastK) ?? 0;
            filterLast = (relevantFlipCount % 2 !== 0)
                ? (level.flippingFilterMap.get(lastK) === AXIS_H ? AXIS_V : AXIS_H)
                : level.flippingFilterMap.get(lastK);
        }
        if (!disabledPrunes.includes('filterAxisStrict')) {
            if (filterLast && filterLast !== axis)
                return setReason('invalid-by-filter-axis', 'origin-filter-axis-mismatch');
        }

        let filterTarget = level.filterMap.get(targetKey);
        if (filterTarget === undefined && level.flippingFilterMap.has(targetKey)) {
            // A flipping filter not yet in crossedSet is being entered for the first time in
            // this path — crossedSet can never contain it yet (it's only recorded once the step
            // onto it has already been committed), so its axis must come from the live global
            // flip counter instead. A value already in crossedSet (re-entering the same cell) is
            // authoritative and takes precedence, matching the fixed axis established on the
            // cell's first crossing.
            const relevantFlipCount = crossedSet.has(targetKey) ? (crossedSet.get(targetKey) ?? 0) : _flipCount;
            const baseAxis = level.flippingFilterMap.get(targetKey);
            filterTarget = (relevantFlipCount % 2 !== 0)
                ? (baseAxis === AXIS_H ? AXIS_V : AXIS_H)
                : baseAxis;
        }
        if (!disabledPrunes.includes('filterAxisStrict')) {
            if (filterTarget && filterTarget !== axis)
                return setReason('invalid-by-filter-axis', 'target-filter-axis-mismatch');
        }
    }

    if (checkHazards && mode !== MODE_EDITOR && level.gooseSet.has(targetKey))
        return setReason('invalid-goose-hazard');

    if (checkWinMetrics && mode !== MODE_EDITOR && targetKey === level.goalKey) {
        const nextCounts = counts;
        const mustPassOk  = level.mustPassKeys.every(k => (nextCounts.get(k) || 0) > 0 || k === targetKey);
        const mustCrossOk = level.mustCrossKeys.every(k => ((nextCounts.get(k) || 0) + (k === targetKey ? 1 : 0)) >= 2);
        if (!mustPassOk || !mustCrossOk) return setReason('invalid-must-cross-impossibility');

        // Surround: all valid 8-neighbors of each surround landmark must have been visited.
        // A neighbor equal to targetKey counts as visited (the path is stepping there now).
        const surroundKeys = level.surroundKeys;
        if (surroundKeys && surroundKeys.length > 0) {
            const { w, h } = level.grid;
            const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
            const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
            for (const sk of surroundKeys) {
                const sx = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
                for (let d = 0; d < 8; d++) {
                    const nx = sx + _dx8[d], ny = sy + _dy8[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = ((ny << 16) | nx) >>> 0;
                    if (level.blockSet.has(nk) || level.gooseSet.has(nk)) continue;
                    if (!((nextCounts.get(nk) ?? 0) > 0) && nk !== targetKey)
                        return setReason('invalid-must-cross-impossibility');
                }
            }
        }

        // Must-turn: each must-turn cell must have had a turn (of the required direction) at some
        // visit. Mirrors runtime/game-rules.ts's areWinMetricsSatisfied exactly — that function is
        // the actual arbiter of live-play wins and was already correct; this block (checkWinMetrics)
        // had silently drifted from it, missing this check entirely. Not a live bug: the referee
        // (path-validator.ts, the only real caller with checkWinMetrics on) has its own independent
        // post-loop must-turn check using a turnsAtCell map it builds itself — but path-validator.ts
        // doesn't pass a turnsAtMap into this function's state either, so both this check and the
        // adjacent-turn one below conservatively skip for that caller today, same as before this
        // fix. Closing the drift here anyway so a future caller that DOES supply turnsAtMap gets a
        // complete, correct answer, rather than one that's silently missing must-turn.
        const mustPassTurnDirs = level.mustPassTurnDirs;
        if (mustPassTurnDirs && mustPassTurnDirs.size > 0) {
            const turnsAtMapForMustTurn = state?.nav?.turnsAtMap ?? state?.turnsAtMap;
            if (turnsAtMapForMustTurn) {
                for (const [k, req] of mustPassTurnDirs) {
                    const t = turnsAtMapForMustTurn.get(k);
                    if (!t) return setReason('invalid-must-cross-impossibility');
                    if (req !== 'either' && t !== req && t !== 'both') return setReason('invalid-must-cross-impossibility');
                }
            }
        }

        // Adjacent-turn: each adj-turn landmark must have had a qualifying turn at an adjacent cell.
        // turnsAtMap is available in engine nav state; omitted contexts skip this check conservatively.
        const adjacentTurnKeys = level.adjacentTurnKeys;
        if (adjacentTurnKeys && adjacentTurnKeys.length > 0) {
            const turnsAtMap = state?.nav?.turnsAtMap ?? state?.turnsAtMap;
            if (turnsAtMap) {
                const { w, h } = level.grid;
                const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
                const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
                for (let oi = 0; oi < adjacentTurnKeys.length; oi++) {
                    const atk = adjacentTurnKeys[oi];
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
                    if (!satisfied) return setReason('invalid-must-cross-impossibility');
                }
            }
        }
    }

    if (diagnostics && typeof diagnostics === 'object') diagnostics.reasonCode = 'valid';
    return true;
}
