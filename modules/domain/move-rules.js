// Pure move-legality rules for the Pathfinder grid.
// These constant values MUST stay in sync with APP.Core.AXIS and APP.Core.MODES.
// If those enums change, update here as well.

import { UNPACK, inBounds } from './cell-key.js';
import { resolvePortal } from './portal-utils.js';

const AXIS_H    = 1;   // APP.Core.H
const AXIS_V    = 2;   // APP.Core.V
const AXIS_NONE = 0;   // APP.Core.NONE
const MODE_EDITOR = 1; // APP.Core.EDITOR

export function isValidMove(targetKey, state, level, options = {}) {
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

    const setReason = (reasonCode, detail = null) => {
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

    const lastK = path[path.length - 1];
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
    if (!isPortalJumpCandidate) {
        const u = usage.get(targetKey);
        if (u && ((axis === AXIS_H && u.h) || (axis === AXIS_V && u.v)))
            return setReason('invalid-edge-reuse-target');

        const uLast = usage.get(lastK);
        if (uLast) {
            let entryAxis = AXIS_NONE;
            if (path.length > 1 && !jumpSet.has(path.length - 1)) {
                const prevP  = UNPACK(path[path.length - 2]);
                const lastPC = UNPACK(lastK);
                entryAxis = (prevP.y === lastPC.y) ? AXIS_H : AXIS_V;
            }
            if (axis !== entryAxis) {
                if ((axis === AXIS_H && uLast.h) || (axis === AXIS_V && uLast.v))
                    return setReason('invalid-edge-reuse-origin');
            }
        }
    }

    if (!isPortalJumpCandidate) {
        let filterLast = level.filterMap.get(lastK);
        if (filterLast === undefined && level.flippingFilterMap.has(lastK) && crossedSet.has(lastK)) {
            const relevantFlipCount = crossedSet.get(lastK);
            filterLast = (relevantFlipCount % 2 !== 0)
                ? (level.flippingFilterMap.get(lastK) === AXIS_H ? AXIS_V : AXIS_H)
                : level.flippingFilterMap.get(lastK);
        }
        if (!disabledPrunes.includes('filterAxisStrict')) {
            if (filterLast && filterLast !== axis)
                return setReason('invalid-by-filter-axis', 'origin-filter-axis-mismatch');
        }

        let filterTarget = level.filterMap.get(targetKey);
        if (filterTarget === undefined && level.flippingFilterMap.has(targetKey) && crossedSet.has(targetKey)) {
            const relevantFlipCount = crossedSet.get(targetKey);
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
    }

    if (diagnostics && typeof diagnostics === 'object') diagnostics.reasonCode = 'valid';
    return true;
}
