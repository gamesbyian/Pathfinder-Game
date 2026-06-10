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

export function installLevelUtils(APP) {
    APP.LevelUtils = (() => {
        const getRawLevels = () => APP.Data.getLevels();

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
            const canvas = APP.Renderer.getCanvas();
            const rect   = canvas.getBoundingClientRect();
            const l = APP.State.ENGINE.mode === APP.Core.PLAY
                ? APP.State.ENGINE.level
                : APP.State.ENGINE.editor.workingLevel;
            if (!l) return { x: 0, y: 0 };
            const gridW = APP.State.ENGINE.viewport.swapped ? l.grid.h : l.grid.w;
            const gridH = APP.State.ENGINE.viewport.swapped ? l.grid.w : l.grid.h;
            const tx = Math.max(0, Math.min(gridW - 1,
                Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / APP.State.ENGINE.viewport.cellW)));
            const ty = Math.max(0, Math.min(gridH - 1,
                Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / APP.State.ENGINE.viewport.cellH)));
            return APP.LevelUtils.inverseTransformPoint(tx, ty, APP.State.ENGINE.variant, l.grid.w, l.grid.h);
        }

        // Mutates level in place and updates APP path/editor/engine state.
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
            if (APP.State.ENGINE.editor.pendingPortal)
                APP.State.ENGINE.editor.pendingPortal = shift(APP.State.ENGINE.editor.pendingPortal);
            APP.State.ENGINE.path = APP.State.ENGINE.path.map(shift);
            APP.Engine.rebuildDerivedPathState(APP.State.ENGINE);
            l.hints = [];
            APP.State.ENGINE.hinter.pathList = [];
        }

        // Changes the grid size for the editor working level.
        function changeGridSize(delta) {
            if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return;
            const l = APP.State.ENGINE.editor.workingLevel;
            const newSize = l.grid.w + delta;
            if (newSize < 6 || newSize > 15) {
                APP.UI.showMessage('Size limit reached', 'text-amber-500 font-bold');
                return;
            }
            const bounds = APP.LevelUtils.getLevelBounds(l);
            let shiftX = 0, shiftY = 0;
            if (bounds) {
                const width  = bounds.maxX - bounds.minX + 1;
                const height = bounds.maxY - bounds.minY + 1;
                if (newSize < width || newSize < height) {
                    APP.UI.showMessage('Cannot shrink: items blocking', 'text-red-500 font-bold');
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
                APP.UI.showMessage('Cannot shrink: MustCross near edge', 'text-red-500 font-bold');
                return;
            }
            APP.Editor.saveEditorState();
            if (shiftX !== 0 || shiftY !== 0) {
                APP.LevelUtils.shiftLevel(l, shiftX, shiftY);
                APP.State.ENGINE.editor.validTrapSpots.clear();
            }
            l.grid.w = newSize;
            l.grid.h = newSize;
            const pathOutOfBounds = APP.State.ENGINE.path.some(k => {
                const p = UNPACK(k);
                return p.x < 0 || p.y < 0 || p.x >= newSize || p.y >= newSize;
            });
            if (pathOutOfBounds) APP.Engine.PathNavigator.clear(APP.State.ENGINE);
            APP.State.ENGINE.editor.isModified = true;
            APP.UI.updateViewport();
            APP.State.ENGINE.isDirty = true;
            APP.UI.showMessage(`Grid: ${newSize}x${newSize}`, 'text-sky-600 font-bold');
        }

        // Applies a coordinate mapping transform to the editor working level.
        function transformLevel(l, coordMap, newW, newH, axisMap) {
            APP.Editor.saveEditorState();
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
            if (APP.State.ENGINE.editor.pendingPortal)
                APP.State.ENGINE.editor.pendingPortal = mapKey(APP.State.ENGINE.editor.pendingPortal);
            APP.State.ENGINE.path = APP.State.ENGINE.path.map(mapKey);
            if (APP.State.ENGINE.activeGateKey)
                APP.State.ENGINE.activeGateKey = mapKey(APP.State.ENGINE.activeGateKey);
            APP.Engine.rebuildDerivedPathState(APP.State.ENGINE);
            l.grid.w = newW;
            l.grid.h = newH;
            l.hints  = [];
            APP.State.ENGINE.hinter.pathList = [];
            APP.State.ENGINE.editor.validTrapSpots.clear();
            APP.State.ENGINE.editor.isModified = true;
            APP.UI.updateViewport();
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
    })();
}
