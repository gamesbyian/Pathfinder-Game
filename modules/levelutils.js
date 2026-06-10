// Domain imports — pure functions live in modules/domain/
import { PACK, UNPACK, inBounds }                                         from './domain/cell-key.js';
import { normalizeMetadata, parseRawLevel, denormalizeLevel,
         canonicalCloneLevel, deepCloneLevel,
         getLevelBounds, assertLevelShape }                               from './domain/level-codec.js';
import { canonicalLevelFingerprintPayload, getLevelFingerprintSource,
         getLevelFingerprint, isSameLevelStructure }                      from './domain/level-fingerprint.js';
import { isValidMove as isValidMoveImpl }                                 from './domain/move-rules.js';
import { resolvePortal, getPortalPairIndex, getPortalDisplayColor,
         expCoords, hasParitySwitchingPortal, getParityInvalidKeys }      from './domain/portal-utils.js';
import { transformPoint, inverseTransformPoint, transformAxis }           from './domain/geometry.js';

export function createLevelUtils({ core, data, getState, getRenderer, getEngine, getEditor, getUI }) {
    const getRawLevels = () => data.getLevels();

    // Index-based accessor — wraps the shared parseRawLevel parser.
    function normalizeLevel(idx) {
        const levels = getRawLevels();
        if (idx < 0 || idx >= levels.length) return null;
        const raw = levels[idx];
        if (!raw) return null;
        return parseRawLevel(raw, idx);
    }

    // Pointer-to-grid coordinate conversion — reads DOM, canvas, and app state.
    function getGridCoord(e) {
        const canvas = getRenderer().getCanvas();
        const rect   = canvas.getBoundingClientRect();
        const eng    = getState();
        const l = eng.mode === core.PLAY
            ? eng.level
            : eng.editor.workingLevel;
        if (!l) return { x: 0, y: 0 };
        const gridW = eng.viewport.swapped ? l.grid.h : l.grid.w;
        const gridH = eng.viewport.swapped ? l.grid.w : l.grid.h;
        const tx = Math.max(0, Math.min(gridW - 1,
            Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / eng.viewport.cellW)));
        const ty = Math.max(0, Math.min(gridH - 1,
            Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / eng.viewport.cellH)));
        return inverseTransformPoint(tx, ty, eng.variant, l.grid.w, l.grid.h);
    }

    // Mutates level in place and updates path/editor/engine state.
    function shiftLevel(l, dx, dy) {
        if (dx === 0 && dy === 0) return;
        const shift = (k) => {
            if (k === -1) return -1;
            const p = UNPACK(k);
            return PACK(p.x + dx, p.y + dy);
        };
        l.goalKey         = shift(l.goalKey);
        l.gateKeys        = l.gateKeys.map(shift);
        l.falseGoalKeys   = new Set(Array.from(l.falseGoalKeys).map(shift));
        l.blockSet        = new Set(Array.from(l.blockSet).map(shift));
        l.gooseSet        = new Set(Array.from(l.gooseSet).map(shift));
        l.mustPassKeys    = l.mustPassKeys.map(shift);
        l.mustCrossKeys   = l.mustCrossKeys.map(shift);
        const newFilterMap = new Map();
        l.filterMap.forEach((v, k) => newFilterMap.set(shift(k), v));
        l.filterMap = newFilterMap;
        const newFlipMap = new Map();
        l.flippingFilterMap.forEach((v, k) => newFlipMap.set(shift(k), v));
        l.flippingFilterMap = newFlipMap;
        const newPortalMap = new Map();
        l.portalMap.forEach((v, k) => {
            newPortalMap.set(shift(k), { dest: v.dest === -1 ? -1 : shift(v.dest) });
        });
        l.portalMap    = newPortalMap;
        l.portalVisuals = l.portalVisuals.map(pv => ({ k1: shift(pv.k1), k2: shift(pv.k2) }));
        const eng = getState();
        if (eng.editor.pendingPortal)
            eng.editor.pendingPortal = shift(eng.editor.pendingPortal);
        eng.path = eng.path.map(shift);
        getEngine().rebuildDerivedPathState(eng);
        l.hints = [];
        eng.hinter.pathList = [];
    }

    // Changes the grid size for the editor working level.
    function changeGridSize(delta) {
        const eng = getState();
        if (eng.overlayState !== core.OVERLAY_NONE || !eng.editor.workingLevel) return;
        const l = eng.editor.workingLevel;
        const newSize = l.grid.w + delta;
        if (newSize < 6 || newSize > 15) {
            getUI().showMessage('Size limit reached', 'text-amber-500 font-bold');
            return;
        }
        const bounds = getLevelBounds(l);
        let shiftX = 0, shiftY = 0;
        if (bounds) {
            const width  = bounds.maxX - bounds.minX + 1;
            const height = bounds.maxY - bounds.minY + 1;
            if (newSize < width || newSize < height) {
                getUI().showMessage('Cannot shrink: items blocking', 'text-red-500 font-bold');
                return;
            }
            if (bounds.maxX >= newSize) shiftX = newSize - 1 - bounds.maxX;
            if (bounds.maxY >= newSize) shiftY = newSize - 1 - bounds.maxY;
        }
        if (delta < 0 && l.mustCrossKeys.some(k => {
            const p = UNPACK(k);
            const nx = p.x + shiftX;
            const ny = p.y + shiftY;
            return nx === 0 || nx === newSize - 1 || ny === 0 || ny === newSize - 1;
        })) {
            getUI().showMessage('Cannot shrink: MustCross near edge', 'text-red-500 font-bold');
            return;
        }
        getEditor().saveEditorState();
        if (shiftX !== 0 || shiftY !== 0) {
            shiftLevel(l, shiftX, shiftY);
            eng.editor.validTrapSpots.clear();
        }
        l.grid.w = newSize;
        l.grid.h = newSize;
        const pathOutOfBounds = eng.path.some(k => {
            const p = UNPACK(k);
            return p.x < 0 || p.y < 0 || p.x >= newSize || p.y >= newSize;
        });
        if (pathOutOfBounds) getEngine().PathNavigator.clear(eng);
        eng.editor.isModified = true;
        getUI().updateViewport();
        eng.isDirty = true;
        getUI().showMessage(`Grid: ${newSize}x${newSize}`, 'text-sky-600 font-bold');
    }

    // Applies a coordinate mapping transform to the editor working level.
    function transformLevel(l, coordMap, newW, newH, axisMap) {
        getEditor().saveEditorState();
        const mapKey = (k) => {
            if (k === -1) return -1;
            const p  = UNPACK(k);
            const tp = coordMap(p.x, p.y);
            return PACK(tp.x, tp.y);
        };
        l.goalKey       = mapKey(l.goalKey);
        l.gateKeys      = l.gateKeys.map(mapKey);
        l.falseGoalKeys = new Set(Array.from(l.falseGoalKeys).map(mapKey));
        l.blockSet      = new Set(Array.from(l.blockSet).map(mapKey));
        l.gooseSet      = new Set(Array.from(l.gooseSet).map(mapKey));
        l.mustPassKeys  = l.mustPassKeys.map(mapKey);
        l.mustCrossKeys = l.mustCrossKeys.map(mapKey);
        const newFilterMap = new Map();
        l.filterMap.forEach((v, k) => newFilterMap.set(mapKey(k), axisMap(v)));
        l.filterMap = newFilterMap;
        const newFlipMap = new Map();
        l.flippingFilterMap.forEach((v, k) => newFlipMap.set(mapKey(k), axisMap(v)));
        l.flippingFilterMap = newFlipMap;
        const newPortalMap = new Map();
        l.portalMap.forEach((v, k) => {
            newPortalMap.set(mapKey(k), { dest: v.dest === -1 ? -1 : mapKey(v.dest) });
        });
        l.portalMap     = newPortalMap;
        l.portalVisuals = l.portalVisuals.map(pv => ({ k1: mapKey(pv.k1), k2: mapKey(pv.k2) }));
        const eng = getState();
        if (eng.editor.pendingPortal)
            eng.editor.pendingPortal = mapKey(eng.editor.pendingPortal);
        eng.path = eng.path.map(mapKey);
        if (eng.activeGateKey)
            eng.activeGateKey = mapKey(eng.activeGateKey);
        getEngine().rebuildDerivedPathState(eng);
        l.grid.w = newW;
        l.grid.h = newH;
        l.hints  = [];
        eng.hinter.pathList = [];
        eng.editor.validTrapSpots.clear();
        eng.editor.isModified = true;
        getUI().updateViewport();
    }

    return {
        PACK, UNPACK, inBounds, expCoords,
        transformPoint, inverseTransformPoint, transformAxis,
        getGridCoord,
        canonicalCloneLevel, deepCloneLevel,
        normalizeLevel, denormalizeLevel,
        shiftLevel, changeGridSize, transformLevel,
        getLevelBounds, assertLevelShape,
        processRawLevel: parseRawLevel,
        getRawLevels,
        resolvePortal, getPortalDisplayColor,
        isValidMove: isValidMoveImpl,
        normalizeMetadata,
        hasParitySwitchingPortal, getParityInvalidKeys,
        canonicalLevelFingerprintPayload, getLevelFingerprintSource,
        getLevelFingerprint, isSameLevelStructure
    };
}
