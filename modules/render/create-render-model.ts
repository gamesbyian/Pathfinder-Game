// Snapshot of all APP state needed for one render frame.
// Every mutable collection is copied so the canvas layer sees a stable value.

import { UNPACK }                   from '../domain/cell-key.js';
import { transformPoint }           from '../domain/geometry.js';
import { heatmapToCells }           from '../domain/heatmap.js';
import { hasParitySwitchingPortal } from '../domain/portal-utils.js';
import { getRealLength }            from '../runtime/game-rules.js';
import { activeLevel }              from '../state.js';

export function createRenderModel({ eng, core, themes }: any, reqLenPreview: any = null) {
    const isPlayMode   = eng.mode === core.PLAY;
    const isEditorMode = eng.mode === core.EDITOR;
    const isReviewMode = eng.mode === core.REVIEW;

    const level = activeLevel(eng, core);
    const theme = themes.THEMES[themes.getCurrentTheme()];

    const { nav, hazards } = eng;

    // --- Parity warnings ---
    let requiredLength = 0, showParityWarnings = false, targetParity = 0, hasFlippingPortal = false;
    if ((isEditorMode || isReviewMode || eng.cheatActive) && level && level.goalKey !== -1) {
        requiredLength = (isEditorMode || isReviewMode)
            ? (reqLenPreview || level.requiredLength || 0)
            : level.requiredLength;
        if (requiredLength > 0 || nav.path.length > 0 || eng.cheatActive) {
            showParityWarnings = true;
            const gp = UNPACK(level.goalKey);
            targetParity    = (gp.x + gp.y + requiredLength) % 2;
            hasFlippingPortal = hasParitySwitchingPortal(level);
        }
    }

    // --- Hint overlay ---
    const hintActive = eng.overlayState === core.HINT_ANIMATING && eng.hinter.pathList.length > 0;
    const hintCrossedFlippingFilters = new Map();
    let hintDisplayFlipCount = 0;
    let hintPath: any[] = [];
    let hintDisplayPath: any[] = [];
    if (hintActive && level) {
        const dispIdx   = eng.hinter.displayIndices?.[eng.hinter.currentPathIdx] ?? eng.hinter.currentPathIdx;
        hintPath        = [...(eng.hinter.pathList[dispIdx] || [])];
        hintDisplayPath = hintPath.slice(0, Math.floor(eng.hinter.index));
        for (const key of hintDisplayPath) {
            if (level.flippingFilterMap.has(key) && !hintCrossedFlippingFilters.has(key)) {
                hintCrossedFlippingFilters.set(key, hintDisplayFlipCount);
                hintDisplayFlipCount++;
            }
        }
    }

    // --- mustPass: split into on-canvas vs overflow-overlay ---
    const mustPassOnCanvas: any[]  = [];
    const mustPassInOverlay: any[] = [];
    if (level) {
        level.mustPassKeys.forEach((k: any) => {
            // Must-turn cells are also must-pass cells (mustPassTurnDirs), but they're already
            // drawn as their own mustTurnLandmark icon — a pin here would just overlap it.
            if (level.landmarkMeta?.has(k)) return;
            const p    = UNPACK(k);
            const isHit = (nav.visitedCounts.get(k) || 0) > 0;
            const { ty } = transformPoint(p.x, p.y, eng.orientation, level.grid.w, level.grid.h);
            if (ty === 0) {
                mustPassInOverlay.push({ x: p.x, y: p.y, isHit });
            } else {
                mustPassOnCanvas.push({ x: p.x, y: p.y, isHit });
            }
        });
    }

    // --- Landmark constraint state ---
    const unsatisfiedSurroundNeighbors = new Set();
    const landmarkSatisfiedState = new Map();
    if (level) {
        const { w, h } = level.grid;
        const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
        const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        // Surround: find unvisited neighbors
        for (const sk of (level.surroundKeys || [])) {
            const sx = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
            let allVisited = true;
            for (let d = 0; d < 8; d++) {
                const nx = sx + _dx8[d], ny = sy + _dy8[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = ((ny << 16) | nx) >>> 0;
                if (level.blockSet.has(nk) || level.gooseSet.has(nk)) continue;
                if (!((nav.visitedCounts.get(nk) || 0) > 0)) {
                    unsatisfiedSurroundNeighbors.add(nk);
                    allVisited = false;
                }
            }
            landmarkSatisfiedState.set(sk, allVisited);
        }
        // Adjacent-turn: check if each object has had a valid turn adjacent to it
        const turnsAtMap = nav.turnsAtMap;
        for (let i = 0; i < (level.adjacentTurnKeys || []).length; i++) {
            const atk = level.adjacentTurnKeys[i];
            const req = (level.adjacentTurnDirs || [])[i] || 'either';
            const ax = atk & 0xFFFF, ay = (atk >>> 16) & 0xFFFF;
            let satisfied = false;
            if (turnsAtMap) {
                for (let d = 0; d < 8 && !satisfied; d++) {
                    const nx = ax + _dx8[d], ny = ay + _dy8[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = ((ny << 16) | nx) >>> 0;
                    const t = turnsAtMap.get(nk);
                    if (t && (req === 'either' || t === req || t === 'both')) satisfied = true;
                }
            }
            landmarkSatisfiedState.set(atk, satisfied);
        }
        // Must-turn: check if each cell has had the required turn
        if (level.mustPassTurnDirs?.size > 0 && turnsAtMap) {
            for (const [k, req] of level.mustPassTurnDirs) {
                const t = turnsAtMap.get(k);
                landmarkSatisfiedState.set(k, !!t && (req === 'either' || t === req || t === 'both'));
            }
        }
    }

    // --- Persisted hint ---
    const persistedHintActive = eng.hinter.persistedPath.length > 0;
    const persistedHintPath   = persistedHintActive ? [...eng.hinter.persistedPath] : [];

    // --- Persisted heat map ---
    const persistedHeatmapPathCount = eng.hinter.persistedHeatmapPathCount;
    const persistedHeatmapActive    = !!eng.hinter.persistedHeatmap && persistedHeatmapPathCount > 1;
    const persistedHeatmapCells     = persistedHeatmapActive
        ? heatmapToCells(eng.hinter.persistedHeatmap, persistedHeatmapPathCount)
        : [];

    // --- Heat map (live, mirrors hint overlay activity/alpha) ---
    // A heat map with only 1 path is just that path redrawn (every visited cell at
    // 100% intensity) — never render it as a heat map in that case. Suppressed while a
    // heat map is pinned so cycling through subsequent hints doesn't layer a second,
    // un-pinned heat map on top of the persisted one.
    const heatmapPathCount = eng.hinter.pathList.length;
    const heatmapActive    = hintActive && heatmapPathCount > 1 && !persistedHeatmapActive;
    const heatmapCells     = heatmapActive ? heatmapToCells(eng.hinter.heatmap, heatmapPathCount) : [];
    const heatmapAlpha     = eng.hinter.alpha;

    return {
        // display geometry
        viewport: { ...eng.viewport },
        // mode flags
        isPlayMode, isEditorMode, isReviewMode,
        // level and transform
        level,
        orientation: eng.orientation,
        // theme
        theme,
        // path state
        path:                   [...nav.path],
        isPortalJump:           new Set(nav.isPortalJump),
        visitedCounts:          new Map(nav.visitedCounts),
        intersections:          nav.intersections,
        crossedFlippingFilters: new Map(nav.crossedFlippingFilters),
        flipCount:              nav.flipCount,
        visualFlipCount:        nav.visualFlipCount,
        activeGateKey:          nav.activeGateKey,
        armedFalseGoals:        new Set(hazards.armedFalseGoals),
        detonatedFalseGoals:    new Set(hazards.detonatedFalseGoals),
        revealedGeese:          new Set(hazards.revealedGeese),
        cheatActive:            eng.cheatActive,
        // ripples (already filtered by facade before this call)
        ripples: [...eng.ripples],
        // path stroke style resolved here so canvas layer needs no state read
        strokeStyle: themes.getCurrentTheme() === 'classic' ? 'rainbow' : (theme ? theme.path : '#ffffff'), // theme-exempt: last-resort fallback if the theme object itself failed to load
        // parity
        requiredLength, showParityWarnings, targetParity, hasFlippingPortal,
        // hint
        hintActive,
        hintPath,
        hintDisplayPath,
        hintCrossedFlippingFilters,
        hintDisplayFlipCount,
        hintAlpha: eng.hinter.alpha,
        // persisted hint
        persistedHintActive,
        persistedHintPath,
        // heat map
        heatmapActive,
        heatmapCells,
        heatmapPathCount,
        heatmapAlpha,
        // persisted heat map
        persistedHeatmapActive,
        persistedHeatmapCells,
        persistedHeatmapPathCount,
        // mustPass split
        mustPassOnCanvas,
        mustPassInOverlay,
        // editor
        editorTriggerableFalseGoalCells: new Set(eng.editor.triggerableFalseGoalCells),
        editorFalseGoalTriggerParityCandidates: new Set(eng.editor.falseGoalTriggerParityCandidates),
        editorPendingPortal:  eng.editor.pendingPortal,
        // landmark constraint state
        unsatisfiedSurroundNeighbors,
        landmarkSatisfiedState,
        // HUD metrics (consumed by facade after canvas render, not by canvas layer)
        currentLen: getRealLength(nav),
    };
}
