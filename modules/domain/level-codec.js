// @ts-check
// Level normalization and serialization.
// parseRawLevel is the single shared parser used by both the index-based
// normalizeLevel accessor and the direct processRawLevel API.

import { PACK, UNPACK } from './cell-key.js';
import { validateRawLevel } from './level-schema.js';
import { applyLandmark } from './landmark-rules.js';

/** @param {*} [raw] */
export const normalizeMetadata = (raw = {}) => ({
    designerName: typeof raw.designerName === 'string' ? raw.designerName : '',
    description:  typeof raw.description  === 'string' ? raw.description  : '',
    difficulty:   (raw.difficulty === null || raw.difficulty === undefined || raw.difficulty === '')
        ? null
        : Math.max(1, Math.min(10, Number(raw.difficulty) || 0)) || null
});

// Shared parser for raw-level data. Both normalizeLevel(idx) and processRawLevel(raw, id)
// delegate here. Input uses 1-based coordinates; output uses 0-based packed keys.
/** @param {any} raw  1-based wire-format level @param {number|null} [id] @returns {any} */
export function parseRawLevel(raw, id = null) {
    if (!raw || !raw.goal || !raw.gates) return null;
    /** @param {number} v */
    const adj = (v) => v - 1;
    const l = {
        id,
        grid:            { ...raw.grid },
        reqLen:          raw.reqLen,
        reqInt:          raw.reqInt,
        ...normalizeMetadata(raw),
        goalKey:         PACK(adj(raw.goal.x), adj(raw.goal.y)),
        gateKeys:        (raw.gates || []).map((/** @type {any} */ g) => PACK(adj(g.x), adj(g.y))),
        blockSet:        new Set(),
        gooseSet:        new Set(),
        falseGoalKeys:   new Set(),
        portalMap:       new Map(),
        portalVisuals:   /** @type {{ k1: number, k2: number }[]} */ ([]),
        filterMap:       new Map(),
        flippingFilterMap: new Map(),
        mustPassKeys:    (raw.mustPass  || []).map((/** @type {any} */ m) => PACK(adj(m.x), adj(m.y))),
        mustCrossKeys:   (raw.mustCross || []).map((/** @type {any} */ m) => PACK(adj(m.x), adj(m.y))),
        surroundKeys:      [],
        adjacentTurnKeys:  [],
        adjacentTurnDirs:  [],
        mustPassTurnDirs:  new Map(),
        landmarkMeta:      new Map(),
        hints:           raw.hints || [],
        hasParityBreaker: false
    };
    (raw.blocks         || []).forEach((/** @type {any} */ w) => l.blockSet.add(PACK(adj(w.x), adj(w.y))));
    (raw.geese          || []).forEach((/** @type {any} */ m) => l.gooseSet.add(PACK(adj(m.x), adj(m.y))));
    (raw.filters        || []).forEach((/** @type {any} */ f) => l.filterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
    (raw.flippingFilters|| []).forEach((/** @type {any} */ f) => l.flippingFilterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
    (raw.falseGoals     || []).forEach((/** @type {any} */ g) => l.falseGoalKeys.add(PACK(adj(g.x), adj(g.y))));
    // Landmarks: named thematic objects with mechanical roles.
    // Impassable roles (surround, adjacentTurn, decorative) are added to blockSet so
    // staticNeighbors and the solver's visited-cell tracking exclude them automatically.
    (raw.landmarks || []).forEach((/** @type {any} */ lm) => {
        if (!lm || !lm.role) return;
        const k = PACK(adj(lm.x), adj(lm.y));
        const objectType = typeof lm.objectType === 'string' ? lm.objectType : '';
        applyLandmark(l, k, objectType, lm.role, lm.turn);
    });
    (raw.portals || []).forEach((/** @type {any} */ p) => {
        const k1 = PACK(adj(p.x1), adj(p.y1));
        const k2 = PACK(adj(p.x2), adj(p.y2));
        l.portalMap.set(k1, { dest: k2 });
        l.portalMap.set(k2, { dest: k1 });
        l.portalVisuals.push({ k1, k2 });
        const p1 = UNPACK(k1), p2 = UNPACK(k2);
        if (((p1.x + p1.y) % 2) !== ((p2.x + p2.y) % 2)) l.hasParityBreaker = true;
    });
    return l;
}

/** @param {any} level @returns {any[]} */
function _denormLandmarks(level) {
    if (!level.landmarkMeta?.size) return [];
    /** @param {number} k */
    const toCoord = (k) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
    const adjTurnDirByKey = new Map((level.adjacentTurnKeys || []).map((/** @type {number} */ k, /** @type {number} */ i) => [k, (level.adjacentTurnDirs || [])[i]]));
    /** @type {any[]} */
    const out = [];
    level.landmarkMeta.forEach((/** @type {{objectType: string, role: string}} */ { objectType, role }, /** @type {number} */ k) => {
        /** @type {any} */
        const entry = { ...toCoord(k), objectType, role };
        const dir = level.mustPassTurnDirs?.get(k) ?? adjTurnDirByKey.get(k);
        if (dir) entry.turn = dir;
        out.push(entry);
    });
    out.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return out;
}

/** @param {any} level @returns {any} */
export function denormalizeLevel(level) {
    if (!level || !level.grid) return null;
    /** @param {number} k */
    const toCoord = (k) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
    /** @param {{x:number,y:number}[]} arr */
    const sortCoords = (arr) => arr.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const blocks      = sortCoords(Array.from(level.blockSet || []).map(toCoord));
    const geese       = sortCoords(Array.from(level.gooseSet || []).map(toCoord));
    const falseGoals  = sortCoords(Array.from(level.falseGoalKeys || []).map(toCoord));
    const mustPass    = sortCoords((level.mustPassKeys  || []).map(toCoord));
    const mustCross   = sortCoords((level.mustCrossKeys || []).map(toCoord));
    const filters     = sortCoords(Array.from(level.filterMap?.entries?.()         || []).map(([k, axis]) => ({ ...toCoord(k), axis })));
    const flippingFilters = sortCoords(Array.from(level.flippingFilterMap?.entries?.() || []).map(([k, axis]) => ({ ...toCoord(k), axis })));
    const seenPortals = new Set();
    /** @type {{ x1: number, y1: number, x2: number, y2: number }[]} */
    const portals = [];
    (level.portalMap || new Map()).forEach((/** @type {any} */ v, /** @type {number} */ k) => {
        if (!v || typeof v.dest !== 'number' || v.dest < 0) return;
        const pair = [k, v.dest].sort((a, b) => a - b).join(':');
        if (seenPortals.has(pair)) return;
        seenPortals.add(pair);
        const a = toCoord(k);
        const b = toCoord(v.dest);
        portals.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    });
    portals.sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1) || (a.y2 - b.y2) || (a.x2 - b.x2));
    return {
        grid:       { w: level.grid.w, h: level.grid.h },
        gates:      sortCoords((level.gateKeys || []).map(toCoord)),
        goal:       typeof level.goalKey === 'number' && level.goalKey >= 0 ? toCoord(level.goalKey) : null,
        reqLen:     level.reqLen  || 0,
        reqInt:     level.reqInt  || 0,
        designerName: level.designerName || '',
        description:  level.description  || '',
        difficulty:   level.difficulty   ?? null,
        blocks, geese, falseGoals, mustPass, mustCross, filters, flippingFilters, portals,
        landmarks: _denormLandmarks(level),
        hints:   Array.isArray(level.hints) ? level.hints : [],
        levelId: typeof level.id === 'number' ? level.id + 1 : null
    };
}

/** @param {any} src @param {{ includeHints?: boolean }} [options] @returns {any} */
export function canonicalCloneLevel(src, options = {}) {
    const includeHints = !!options.includeHints;
    const _goalKey  = typeof src?.goalKey === 'number' ? src.goalKey : -1;
    const _gateKeys = Array.isArray(src?.gateKeys) ? src.gateKeys.slice() : [];
    /** @type {any} */
    const clone = {
        id:      typeof src?.id === 'number' ? src.id : 0,
        grid:    { w: Number(src?.grid?.w) || 0, h: Number(src?.grid?.h) || 0 },
        reqLen:  Number(src?.reqLen) || 0,
        reqInt:  Number(src?.reqInt) || 0,
        ...normalizeMetadata(src),
        goalKey:  _goalKey,
        goal:     src?.goal
            ? { x: src.goal.x, y: src.goal.y }
            : (() => { const p = UNPACK(_goalKey >= 0 ? _goalKey : 0); return { x: p.x + 1, y: p.y + 1 }; })(),
        gateKeys: _gateKeys,
        gates:    Array.isArray(src?.gates)
            ? src.gates.map((/** @type {any} */ g) => ({ x: g.x, y: g.y }))
            : _gateKeys.map((/** @type {number} */ k) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; }),
        blockSet:        new Set(src?.blockSet      || []),
        gooseSet:        new Set(src?.gooseSet      || []),
        falseGoalKeys:   new Set(src?.falseGoalKeys || []),
        mustPassKeys:      Array.isArray(src?.mustPassKeys)      ? src.mustPassKeys.slice()      : [],
        mustCrossKeys:     Array.isArray(src?.mustCrossKeys)     ? src.mustCrossKeys.slice()     : [],
        surroundKeys:      Array.isArray(src?.surroundKeys)      ? src.surroundKeys.slice()      : [],
        adjacentTurnKeys:  Array.isArray(src?.adjacentTurnKeys)  ? src.adjacentTurnKeys.slice()  : [],
        adjacentTurnDirs:  Array.isArray(src?.adjacentTurnDirs)  ? src.adjacentTurnDirs.slice()  : [],
        mustPassTurnDirs:  src?.mustPassTurnDirs instanceof Map   ? new Map(src.mustPassTurnDirs) : new Map(),
        landmarkMeta:      src?.landmarkMeta instanceof Map
            ? new Map(Array.from(src.landmarkMeta.entries(), (/** @type {[any, any]} */ [k, v]) => [k, { ...v }]))
            : new Map(),
        portalMap:       new Map(),
        filterMap:       new Map(),
        flippingFilterMap: new Map()
    };
    if (src?.portalMap?.forEach)
        src.portalMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => clone.portalMap.set(k, v && typeof v === 'object' ? { dest: v.dest } : v));
    if (src?.filterMap?.forEach)
        src.filterMap.forEach((/** @type {any} */ axis, /** @type {number} */ k) => clone.filterMap.set(k, axis));
    if (src?.flippingFilterMap?.forEach)
        src.flippingFilterMap.forEach((/** @type {any} */ axis, /** @type {number} */ k) => clone.flippingFilterMap.set(k, axis));
    clone.portalVisuals = Array.isArray(src?.portalVisuals)
        ? src.portalVisuals.map((/** @type {any} */ pv) => ({ k1: pv.k1, k2: pv.k2, ...(pv.color != null ? { color: pv.color } : {}) }))
        : [];
    clone.hasParityBreaker = !!src?.hasParityBreaker;
    if (includeHints)
        clone.hints = Array.isArray(src?.hints) ? src.hints.map((/** @type {any} */ h) => Array.isArray(h) ? h.slice() : h) : [];
    return clone;
}

/** @param {any} src @returns {any} */
export function deepCloneLevel(src) {
    const l = canonicalCloneLevel(src, { includeHints: true });
    l.portalVisuals = Array.isArray(src?.portalVisuals)
        ? src.portalVisuals.map((/** @type {any} */ pv) => ({ k1: pv.k1, k2: pv.k2 }))
        : [];
    l.hasParityBreaker = !!src?.hasParityBreaker;
    return l;
}

/** @param {any} l @returns {{ minX: number, minY: number, maxX: number, maxY: number }|null} */
export function getLevelBounds(l) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    /** @param {number} k */
    const update = (k) => {
        if (k === -1) return;
        const p = UNPACK(k);
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    };
    if (l.goalKey !== -1) update(l.goalKey);
    l.gateKeys.forEach(update);
    l.falseGoalKeys.forEach(update);
    l.blockSet.forEach(update);
    l.gooseSet.forEach(update);
    l.mustPassKeys.forEach(update);
    l.mustCrossKeys.forEach(update);
    (l.surroundKeys     || []).forEach(update);
    (l.adjacentTurnKeys || []).forEach(update);
    l.filterMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => update(k));
    l.flippingFilterMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => update(k));
    l.portalMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => update(k));
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
}

/** @param {any} level @returns {void} */
export function assertLevelShape(level) {
    if (!level) throw new Error('Level object is null');
    if (level.goalKey === undefined || level.goalKey === -1) throw new Error('Level missing goal');
    if (!Array.isArray(level.gateKeys) || level.gateKeys.length === 0) throw new Error('Level missing gates');
    if (!level.grid || !level.grid.w || !level.grid.h) throw new Error('Grid dimensions missing');
}

/**
 * Combined validate-and-parse for raw level data.
 * Prefers this over calling validateRawLevel + parseRawLevel separately.
 *
 * @param {unknown} raw
 * @param {number|null} [id]
 * @returns {{ ok: boolean, level: import('./level-schema.js').NormalizedLevel|null, errors: string[] }}
 */
export function parseRawLevelDetailed(raw, id = null) {
    const { ok, errors } = validateRawLevel(raw);
    if (!ok) return { ok: false, level: null, errors };
    const level = parseRawLevel(raw, id);
    if (!level) return { ok: false, level: null, errors: ['parse failed unexpectedly after validation passed'] };
    return { ok: true, level, errors: [] };
}
