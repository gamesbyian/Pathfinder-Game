// Snapshot of all APP state needed for one render frame.
// Returns a plain object — no APP references escape into the canvas layer.

import { UNPACK }                   from '../domain/cell-key.js';
import { transformPoint }           from '../domain/geometry.js';
import { hasParitySwitchingPortal } from '../domain/portal-utils.js';
import { getRealLength }            from '../runtime/game-rules.js';

export function createRenderModel(APP, reqLenPreview = null) {
    const eng  = APP.State.ENGINE;
    const core = APP.Core;

    const isPlayMode   = eng.mode === core.PLAY;
    const isEditorMode = eng.mode === core.EDITOR;
    const isReviewMode = eng.mode === core.REVIEW;

    const level = isPlayMode ? eng.level : eng.editor.workingLevel;
    const theme = APP.Themes.THEMES[APP.Themes.getCurrentTheme()];

    // --- Parity warnings ---
    let reqLen = 0, showParityWarnings = false, targetParity = 0, hasFlippingPortal = false;
    if ((isEditorMode || isReviewMode || eng.cheatActive) && level && level.goalKey !== -1) {
        reqLen = (isEditorMode || isReviewMode)
            ? (reqLenPreview || level.reqLen || 0)
            : level.reqLen;
        if (reqLen > 0 || eng.path.length > 0 || eng.cheatActive) {
            showParityWarnings = true;
            const gp = UNPACK(level.goalKey);
            targetParity    = (gp.x + gp.y + reqLen) % 2;
            hasFlippingPortal = hasParitySwitchingPortal(level);
        }
    }

    // --- Hint overlay ---
    const hintActive = eng.overlayState === core.HINT_ANIMATING && eng.hinter.pathList.length > 0;
    const hintCrossedFlippingFilters = new Map();
    let hintDisplayFlipCount = 0;
    let hintPath = [];
    let hintDisplayPath = [];
    if (hintActive && level) {
        hintPath        = eng.hinter.pathList[eng.hinter.currentPathIdx] || [];
        hintDisplayPath = hintPath.slice(0, Math.floor(eng.hinter.index));
        for (const key of hintDisplayPath) {
            if (level.flippingFilterMap.has(key) && !hintCrossedFlippingFilters.has(key)) {
                hintCrossedFlippingFilters.set(key, hintDisplayFlipCount);
                hintDisplayFlipCount++;
            }
        }
    }

    // --- mustPass: split into on-canvas vs overflow-overlay ---
    const mustPassOnCanvas  = [];
    const mustPassInOverlay = [];
    if (level) {
        level.mustPassKeys.forEach(k => {
            const p    = UNPACK(k);
            const isHit = (eng.visitedCounts.get(k) || 0) > 0;
            const { ty } = transformPoint(p.x, p.y, eng.variant, level.grid.w, level.grid.h);
            if (ty === 0) {
                mustPassInOverlay.push({ x: p.x, y: p.y, isHit });
            } else {
                mustPassOnCanvas.push({ x: p.x, y: p.y, isHit });
            }
        });
    }

    return {
        // display geometry
        viewport: eng.viewport,
        // mode flags
        isPlayMode, isEditorMode, isReviewMode,
        // level and transform
        level,
        variant: eng.variant,
        // theme
        theme,
        // path state
        path:                   eng.path,
        isPortalJump:           eng.isPortalJump,
        visitedCounts:          eng.visitedCounts,
        intersections:          eng.intersections,
        crossedFlippingFilters: eng.crossedFlippingFilters,
        flipCount:              eng.flipCount,
        visualFlipCount:        eng.visualFlipCount,
        activeGateKey:          eng.activeGateKey,
        armedFalseGoals:        eng.armedFalseGoals,
        detonatedFalseGoals:    eng.detonatedFalseGoals,
        revealedGeese:          eng.revealedGeese,
        cheatActive:            eng.cheatActive,
        // ripples (already filtered by facade before this call)
        ripples: eng.ripples,
        // path stroke style resolved here so canvas layer needs no state read
        strokeStyle: eng.rainbowActive ? 'rainbow' : (theme ? theme.path : '#ffffff'),
        // parity
        reqLen, showParityWarnings, targetParity, hasFlippingPortal,
        // hint
        hintActive,
        hintPath,
        hintDisplayPath,
        hintCrossedFlippingFilters,
        hintDisplayFlipCount,
        hintAlpha: eng.hinter.alpha,
        // mustPass split
        mustPassOnCanvas,
        mustPassInOverlay,
        // editor
        editorValidTrapSpots: eng.editor.validTrapSpots,
        editorPendingPortal:  eng.editor.pendingPortal,
        // HUD metrics (consumed by facade after canvas render, not by canvas layer)
        currentLen: getRealLength(eng),
    };
}
