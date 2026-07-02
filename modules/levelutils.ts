// Domain imports — pure functions live in modules/domain/
import { PACK, UNPACK, inBounds }                                         from './domain/cell-key.js';
import { normalizeMetadata, parseRawLevel, parseRawLevelDetailed, denormalizeLevel,
         canonicalCloneLevel, deepCloneLevel, cloneLevelWithReq,
         getLevelBounds, assertLevelShape, remapLevelKeys }               from './domain/level-codec.js';
import { canonicalLevelFingerprintPayload, getLevelFingerprintSource,
         getLevelFingerprint, isSameLevelStructure }                      from './domain/level-fingerprint.js';
import { isValidMove as isValidMoveImpl }                                 from './domain/move-rules.js';
import { resolvePortal, getPortalDisplayColor,
         expCoords, hasParitySwitchingPortal, getParityInvalidKeys }      from './domain/portal-utils.js';
import { transformPoint, inverseTransformPoint, transformAxis }           from './domain/geometry.js';
import { activeLevel }                                                     from './state.js';

export function createLevelUtils({ core, data, getState, getRenderer }: any) {
    const getRawLevels = () => data.getLevels();

    // Index-based accessor — validates and parses raw level data.
    // Returns null on failure and logs specific errors rather than failing silently.
    // The returned level object is shallow-frozen: top-level properties and the grid
    // sub-object cannot be replaced. Set/Map/Array contents remain mutable (callers
    // needing mutable copies should use deepCloneLevel).
    function normalizeLevel(idx: any) {
        const levels = getRawLevels();
        if (idx < 0 || idx >= levels.length) return null;
        const raw = levels[idx];
        if (!raw) return null;
        const { ok, level, errors } = parseRawLevelDetailed(raw, idx);
        if (!ok) {
            console.error(`Level ${idx + 1}: validation failed`, errors);
            return null;
        }
        if (!level) return null;
        Object.freeze(level.grid);
        Object.freeze(level.gateKeys);
        Object.freeze(level.mustPassKeys);
        Object.freeze(level.mustCrossKeys);
        Object.freeze(level.hints);
        Object.freeze(level.portalVisuals);
        Object.freeze(level);
        return level;
    }

    // Pointer-to-grid coordinate conversion — reads DOM, canvas, and app state.
    function getGridCoord(e: any) {
        const canvas = getRenderer().getCanvas();
        const rect   = canvas.getBoundingClientRect();
        const eng    = getState();
        const l = activeLevel(eng, core);
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
    function shiftLevelCoords(l: any, dx: any, dy: any) {
        if (dx === 0 && dy === 0) return;
        const shift = (k: number) => { const p = UNPACK(k); return PACK(p.x + dx, p.y + dy); };
        remapLevelKeys(l, shift);
        l.hints = [];
    }

    // Pure: applies a coordinate mapping transform to all keys in a level object.
    // Resizes the grid to newW × newH and remaps filter axes via axisMap.
    // Does NOT touch engine/editor state — caller handles path/state updates.
    function applyCoordMapToLevel(l: any, coordMap: any, newW: any, newH: any, axisMap: any) {
        const mapKey = (k: number) => { const p = UNPACK(k); const tp = coordMap(p.x, p.y); return PACK(tp.x, tp.y); };
        remapLevelKeys(l, mapKey, { axisMap });
        l.grid.w = newW;
        l.grid.h = newH;
        l.hints  = [];
    }

    return {
        PACK, UNPACK, inBounds, expCoords,
        transformPoint, inverseTransformPoint, transformAxis,
        getGridCoord,
        canonicalCloneLevel, deepCloneLevel, cloneLevelWithReq,
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
