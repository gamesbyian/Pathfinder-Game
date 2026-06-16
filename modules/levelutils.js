// Domain imports — pure functions live in modules/domain/
import { PACK, UNPACK, inBounds }                                         from './domain/cell-key.js';
import { normalizeMetadata, parseRawLevel, parseRawLevelDetailed, denormalizeLevel,
         canonicalCloneLevel, deepCloneLevel,
         getLevelBounds, assertLevelShape }                               from './domain/level-codec.js';
import { canonicalLevelFingerprintPayload, getLevelFingerprintSource,
         getLevelFingerprint, isSameLevelStructure }                      from './domain/level-fingerprint.js';
import { isValidMove as isValidMoveImpl }                                 from './domain/move-rules.js';
import { resolvePortal, getPortalDisplayColor,
         expCoords, hasParitySwitchingPortal, getParityInvalidKeys }      from './domain/portal-utils.js';
import { transformPoint, inverseTransformPoint, transformAxis }           from './domain/geometry.js';

export function createLevelUtils({ core, data, getState, getRenderer }) {
    const getRawLevels = () => data.getLevels();

    // Index-based accessor — validates and parses raw level data.
    // Returns null on failure and logs specific errors rather than failing silently.
    function normalizeLevel(idx) {
        const levels = getRawLevels();
        if (idx < 0 || idx >= levels.length) return null;
        const raw = levels[idx];
        if (!raw) return null;
        const { ok, level, errors } = parseRawLevelDetailed(raw, idx);
        if (!ok) {
            console.error(`Level ${idx + 1}: validation failed`, errors);
            return null;
        }
        return level;
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

    // Pure: applies a (dx, dy) shift to all coordinate keys in a level object.
    // Does NOT touch engine/editor state — caller handles path/state updates.
    function shiftLevelCoords(l, dx, dy) {
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
        l.portalMap     = newPortalMap;
        l.portalVisuals = l.portalVisuals.map(pv => ({ k1: shift(pv.k1), k2: shift(pv.k2) }));
        l.hints = [];
    }

    // Pure: applies a coordinate mapping transform to all keys in a level object.
    // Resizes the grid to newW × newH and remaps filter axes via axisMap.
    // Does NOT touch engine/editor state — caller handles path/state updates.
    function applyCoordMapToLevel(l, coordMap, newW, newH, axisMap) {
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
        l.grid.w = newW;
        l.grid.h = newH;
        l.hints  = [];
    }

    return {
        PACK, UNPACK, inBounds, expCoords,
        transformPoint, inverseTransformPoint, transformAxis,
        getGridCoord,
        canonicalCloneLevel, deepCloneLevel,
        normalizeLevel, denormalizeLevel,
        shiftLevelCoords, applyCoordMapToLevel,
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
