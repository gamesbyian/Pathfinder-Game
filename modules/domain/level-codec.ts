// Level normalization and serialization.
// parseRawLevel is the single shared parser used by both the index-based
// normalizeLevel accessor and the direct processRawLevel API.

import { PACK, UNPACK } from './cell-key.js';
import { validateRawLevel } from './level-schema.js';
import type { EngineLevel, TurnDir } from './level-schema.js';
import { applyLandmark, flipTurnDir } from './landmark-rules.js';

export const normalizeMetadata = (raw: any = {}) => ({
    designerName: typeof raw.designerName === 'string' ? raw.designerName : '',
    description:  typeof raw.description  === 'string' ? raw.description  : '',
    difficulty:   (raw.difficulty === null || raw.difficulty === undefined || raw.difficulty === '')
        ? null
        : Math.max(1, Math.min(10, Number(raw.difficulty) || 0)) || null,
    // Explicit null (not omitted) when absent — see domain/level-provenance-types.ts. Carried
    // through both parseRawLevel (wire -> normalized) and canonicalCloneLevel (normalized ->
    // clone), since both spread this — a level opened for re-editing must keep its original
    // provenance history, not silently lose it on clone.
    provenance:   raw.provenance ?? null,
    // See EngineLevel.persistentId's doc comment for why this isn't named `id`. Same
    // explicit-null, spread-through-both-directions treatment as provenance above.
    persistentId: typeof raw.id === 'string' ? raw.id : null,
});

/**
 * Sole raw-wire reader for the two challenge metrics. Runtime callers receive expanded names;
 * wire callers keep reqLen/reqInt at serialization boundaries. The solver historically coerces
 * loose numeric inputs in direct tooling, so that behavior is explicit rather than duplicated.
 */
export function readRawChallengeMetrics(raw: any, options: { coerce?: boolean } = {}): { requiredLength: any; requiredIntersections: any } {
    if (options.coerce) {
        return {
            requiredLength: Number(raw?.reqLen) || 0,
            requiredIntersections: Number(raw?.reqInt) || 0,
        };
    }
    return {
        requiredLength: raw?.reqLen,
        requiredIntersections: raw?.reqInt,
    };
}

// Shared parser for raw-level data. Both normalizeLevel(idx) and processRawLevel(raw, id)
// delegate here. Input uses 1-based coordinates; output uses 0-based packed keys.
/** @param raw  1-based wire-format level */
export function parseRawLevel(raw: any, id: number | null = null): EngineLevel | null {
    if (!raw || !raw.goal || !raw.gates) return null;
    const adj = (v: number) => v - 1;
    const l = {
        id,
        grid:            { ...raw.grid },
        ...readRawChallengeMetrics(raw),
        ...normalizeMetadata(raw),
        goalKey:         PACK(adj(raw.goal.x), adj(raw.goal.y)),
        gateKeys:        (raw.gates || []).map((g: any) => PACK(adj(g.x), adj(g.y))),
        blockSet:        new Set<number>(),
        gooseSet:        new Set<number>(),
        falseGoalKeys:   new Set<number>(),
        portalMap:       new Map<number, { dest: number }>(),
        portalVisuals:   [] as { k1: number; k2: number }[],
        filterMap:       new Map<number, any>(),
        flippingFilterMap: new Map<number, any>(),
        mustPassKeys:    (raw.mustPass  || []).map((m: any) => PACK(adj(m.x), adj(m.y))),
        mustCrossKeys:   (raw.mustCross || []).map((m: any) => PACK(adj(m.x), adj(m.y))),
        surroundKeys:      [] as number[],
        adjacentTurnKeys:  [] as number[],
        adjacentTurnDirs:  [] as TurnDir[],
        mustPassTurnDirs:  new Map<number, TurnDir>(),
        landmarkMeta:      new Map<number, { objectType: string; role: string }>(),
        hints:           raw.hints || [],
        hasParityBreaker: false,
    };
    (raw.blocks         || []).forEach((w: any) => l.blockSet.add(PACK(adj(w.x), adj(w.y))));
    (raw.geese          || []).forEach((m: any) => l.gooseSet.add(PACK(adj(m.x), adj(m.y))));
    (raw.filters        || []).forEach((f: any) => l.filterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
    (raw.flippingFilters|| []).forEach((f: any) => l.flippingFilterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
    (raw.falseGoals     || []).forEach((g: any) => l.falseGoalKeys.add(PACK(adj(g.x), adj(g.y))));
    // Landmarks: named thematic objects with mechanical roles.
    // Impassable roles (surround, adjacentTurn, decorative) are added to blockSet so
    // staticNeighbors and the solver's visited-cell tracking exclude them automatically.
    (raw.landmarks || []).forEach((lm: any) => {
        if (!lm || !lm.role) return;
        const k = PACK(adj(lm.x), adj(lm.y));
        const objectType = typeof lm.objectType === 'string' ? lm.objectType : '';
        applyLandmark(l, k, objectType, lm.role, lm.turn);
    });
    (raw.portals || []).forEach((p: any) => {
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

function _denormLandmarks(level: any): any[] {
    if (!level.landmarkMeta?.size) return [];
    const toCoord = (k: number) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
    const adjTurnDirByKey = new Map<number, any>(
        (level.adjacentTurnKeys || []).map((k: number, i: number): [number, any] => [k, (level.adjacentTurnDirs || [])[i]]),
    );
    const out: any[] = [];
    level.landmarkMeta.forEach(({ objectType, role }: { objectType: string; role: string }, k: number) => {
        const entry: any = { ...toCoord(k), objectType, role };
        const dir = level.mustPassTurnDirs?.get(k) ?? adjTurnDirByKey.get(k);
        if (dir) entry.turn = dir;
        out.push(entry);
    });
    out.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return out;
}

export function denormalizeLevel(level: any): any {
    if (!level || !level.grid) return null;
    const toCoord = (k: any) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
    const sortCoords = (arr: { x: number; y: number }[]) => arr.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const blocks      = sortCoords((Array.from(level.blockSet || []) as any[]).map(toCoord));
    const geese       = sortCoords((Array.from(level.gooseSet || []) as any[]).map(toCoord));
    const falseGoals  = sortCoords((Array.from(level.falseGoalKeys || []) as any[]).map(toCoord));
    const mustPass    = sortCoords((level.mustPassKeys  || []).map(toCoord));
    const mustCross   = sortCoords((level.mustCrossKeys || []).map(toCoord));
    const filters     = sortCoords((Array.from(level.filterMap?.entries?.()         || []) as any[]).map(([k, axis]: [any, any]) => ({ ...toCoord(k), axis })));
    const flippingFilters = sortCoords((Array.from(level.flippingFilterMap?.entries?.() || []) as any[]).map(([k, axis]: [any, any]) => ({ ...toCoord(k), axis })));
    const seenPortals = new Set<string>();
    const portals: { x1: number; y1: number; x2: number; y2: number }[] = [];
    (level.portalMap || new Map()).forEach((v: any, k: number) => {
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
        reqLen:     level.requiredLength  || 0,
        reqInt:     level.requiredIntersections  || 0,
        designerName: level.designerName || '',
        description:  level.description  || '',
        difficulty:   level.difficulty   ?? null,
        blocks, geese, falseGoals, mustPass, mustCross, filters, flippingFilters, portals,
        landmarks: _denormLandmarks(level),
        hints:   Array.isArray(level.hints) ? level.hints : [],
        // Explicit null (not omitted) when absent — an unmistakable "we don't have this" rather
        // than a silently-dropped key. See domain/level-provenance-types.ts.
        provenance: level.provenance ?? null,
        levelId: typeof level.id === 'number' ? level.id + 1 : null,
        // The level's permanent id (EngineLevel.persistentId), wire field name `id` — see
        // docs/archive/level-id-unification-plan.md. Distinct from `levelId` just above (position-
        // derived, stripped by default in buildWireLevelData); this one is stable, so it's never
        // stripped.
        id: level.persistentId ?? null,
    };
}


export interface WireLevelDataOptions {
    requiredLength?: number;
    requiredIntersections?: number;
    hints?: any[];
    provenance?: any;
    includeLevelId?: boolean;
}

function omitUndefinedFields(obj: any): any {
    return Object.fromEntries(Object.entries(obj || {}).filter(([, value]) => value !== undefined));
}

export function buildWireLevelData(level: any, options: WireLevelDataOptions = {}): any {
    const wire = denormalizeLevel(level);
    if (!wire) throw new Error('Cannot serialize invalid level');

    const { levelId: _levelId, ...withoutLevelId } = wire;
    const out: any = options.includeLevelId ? { ...wire } : { ...withoutLevelId };

    if (options.requiredLength !== undefined) out.reqLen = options.requiredLength;
    if (options.requiredIntersections !== undefined) out.reqInt = options.requiredIntersections;
    if (options.hints !== undefined) out.hints = options.hints;
    if (options.provenance !== undefined) out.provenance = options.provenance;

    return omitUndefinedFields(out);
}

export function canonicalCloneLevel(src: any, options: { includeHints?: boolean } = {}): EngineLevel {
    const includeHints = !!options.includeHints;
    const _goalKey  = typeof src?.goalKey === 'number' ? src.goalKey : -1;
    const _gateKeys = Array.isArray(src?.gateKeys) ? src.gateKeys.slice() : [];
    const clone: any = {
        id:      typeof src?.id === 'number' ? src.id : 0,
        grid:    { w: Number(src?.grid?.w) || 0, h: Number(src?.grid?.h) || 0 },
        requiredLength:  Number(src?.requiredLength) || 0,
        requiredIntersections:  Number(src?.requiredIntersections) || 0,
        ...normalizeMetadata(src),
        goalKey:  _goalKey,
        goal:     src?.goal
            ? { x: src.goal.x, y: src.goal.y }
            : (() => { const p = UNPACK(_goalKey >= 0 ? _goalKey : 0); return { x: p.x + 1, y: p.y + 1 }; })(),
        gateKeys: _gateKeys,
        gates:    Array.isArray(src?.gates)
            ? src.gates.map((g: any) => ({ x: g.x, y: g.y }))
            : _gateKeys.map((k: number) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; }),
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
            ? new Map(Array.from(src.landmarkMeta.entries(), ([k, v]: [any, any]) => [k, { ...v }]))
            : new Map(),
        portalMap:       new Map(),
        filterMap:       new Map(),
        flippingFilterMap: new Map(),
    };
    if (src?.portalMap?.forEach)
        src.portalMap.forEach((v: any, k: number) => clone.portalMap.set(k, v && typeof v === 'object' ? { dest: v.dest } : v));
    if (src?.filterMap?.forEach)
        src.filterMap.forEach((axis: any, k: number) => clone.filterMap.set(k, axis));
    if (src?.flippingFilterMap?.forEach)
        src.flippingFilterMap.forEach((axis: any, k: number) => clone.flippingFilterMap.set(k, axis));
    clone.portalVisuals = Array.isArray(src?.portalVisuals)
        ? src.portalVisuals.map((pv: any) => ({ k1: pv.k1, k2: pv.k2, ...(pv.color != null ? { color: pv.color } : {}) }))
        : [];
    clone.hasParityBreaker = !!src?.hasParityBreaker;
    if (includeHints)
        clone.hints = Array.isArray(src?.hints) ? src.hints.map((h: any) => Array.isArray(h) ? h.slice() : h) : [];
    return clone;
}

export function deepCloneLevel(src: any): EngineLevel {
    const l = canonicalCloneLevel(src, { includeHints: true });
    l.portalVisuals = Array.isArray(src?.portalVisuals)
        ? src.portalVisuals.map((pv: any) => ({ k1: pv.k1, k2: pv.k2 }))
        : [];
    l.hasParityBreaker = !!src?.hasParityBreaker;
    return l;
}

// Deep-clone a level and override its length/intersection requirements. The
// review/submission flows solve or validate against the *challenge* requiredLength/
// requiredIntersections rather than the level's own values, so they need a mutable copy with
// those two fields swapped in — this is that idiom in one place.
export function cloneLevelWithReq(src: any, requiredLength: any, requiredIntersections: any): EngineLevel {
    const l = deepCloneLevel(src);
    l.requiredLength = requiredLength;
    l.requiredIntersections = requiredIntersections;
    return l;
}

/**
 * Single source of truth for the level fields that carry packed cell keys, grouped by
 * container shape. Every structural walk over a level's coordinates ({@link remapLevelKeys},
 * {@link forEachLevelKey}) is derived from this list, so adding a coordinate-bearing field
 * here once makes shifts, grid resizes, and bounds all pick it up — instead of silently
 * dropping it, as the landmark fields (`surroundKeys`/`adjacentTurnKeys`/`landmarkMeta`/
 * `mustPassTurnDirs`) once were on shift/resize. `portalMap` (Map<key,{dest}>) and
 * `portalVisuals` ([{k1,k2}]) carry keys in a bespoke shape and are handled explicitly by the
 * walkers below. `adjacentTurnDirs` is a parallel array to `adjacentTurnKeys` and carries no
 * keys of its own (order is preserved, so it stays aligned).
 */
export const LEVEL_KEY_FIELDS = Object.freeze({
    /** number-valued key (or -1 when absent) */
    scalarKeys: Object.freeze(['goalKey']),
    /** number[] of keys */
    keyArrays:  Object.freeze(['gateKeys', 'mustPassKeys', 'mustCrossKeys', 'surroundKeys', 'adjacentTurnKeys']),
    /** Set<key> */
    keySets:    Object.freeze(['falseGoalKeys', 'blockSet', 'gooseSet']),
    /** Map<key, axis> — the value is a filter axis, remapped through `axisMap` on grid transforms */
    axisMaps:   Object.freeze(['filterMap', 'flippingFilterMap']),
    /** Map<key, value> — the key is a coordinate; the value carries no keys and is preserved as-is */
    keyedMaps:  Object.freeze(['landmarkMeta']),
    /** Map<key, TurnDir> — the value is a turn-chirality requirement, flipped on reflection */
    turnDirMaps: Object.freeze(['mustPassTurnDirs']),
});

/**
 * Remap every packed cell key in `level` in place through `mapKey` (a no-op on the -1
 * "absent" sentinel). Filter axes pass through `opts.axisMap` (identity by default) — grid
 * rotations/reflections use it to swap H↔V. `opts.reflect` (false by default) flips stored
 * turn-direction (cw/ccw) requirements — a reflection reverses chirality, so a "turn cw"
 * requirement becomes "turn ccw" under a mirrored grid, while a pure rotation must leave it
 * unchanged. Field coverage comes from {@link LEVEL_KEY_FIELDS}, so it cannot fall out of sync
 * with the level shape. Does not touch grid dimensions or hints — callers own those.
 */
export function remapLevelKeys(level: any, mapKey: (k: number) => number, opts: { axisMap?: (axis: any) => any; reflect?: boolean } = {}): void {
    if (!level) return;
    const axisMap = opts.axisMap ?? ((a: any) => a);
    const reflect = opts.reflect ?? false;
    const mk = (k: number) => (k === -1 ? -1 : mapKey(k));

    for (const f of LEVEL_KEY_FIELDS.scalarKeys)
        if (typeof level[f] === 'number') level[f] = mk(level[f]);
    for (const f of LEVEL_KEY_FIELDS.keyArrays)
        if (Array.isArray(level[f])) level[f] = level[f].map(mk);
    for (const f of LEVEL_KEY_FIELDS.keySets)
        if (level[f] instanceof Set) level[f] = new Set(Array.from(level[f] as Set<number>, mk));
    for (const f of LEVEL_KEY_FIELDS.axisMaps) {
        if (!(level[f] instanceof Map)) continue;
        const next = new Map();
        level[f].forEach((axis: any, k: number) => next.set(mk(k), axisMap(axis)));
        level[f] = next;
    }
    for (const f of LEVEL_KEY_FIELDS.keyedMaps) {
        if (!(level[f] instanceof Map)) continue;
        const next = new Map();
        level[f].forEach((v: any, k: number) => next.set(mk(k), v));
        level[f] = next;
    }
    for (const f of LEVEL_KEY_FIELDS.turnDirMaps) {
        if (!(level[f] instanceof Map)) continue;
        const next = new Map();
        level[f].forEach((dir: any, k: number) => next.set(mk(k), reflect ? flipTurnDir(dir) : dir));
        level[f] = next;
    }
    if (Array.isArray(level.adjacentTurnDirs) && reflect)
        level.adjacentTurnDirs = level.adjacentTurnDirs.map(flipTurnDir);
    if (level.portalMap instanceof Map) {
        const next = new Map();
        level.portalMap.forEach((v: any, k: number) => next.set(mk(k), { dest: v && v.dest === -1 ? -1 : mk(v.dest) }));
        level.portalMap = next;
    }
    if (Array.isArray(level.portalVisuals))
        level.portalVisuals = level.portalVisuals.map((pv: any) => ({ k1: mk(pv.k1), k2: mk(pv.k2) }));
}

/**
 * Visit every packed cell key in `level` (for bounds/occupancy). Derived from the same
 * {@link LEVEL_KEY_FIELDS} declaration as {@link remapLevelKeys}. Every landmark key is also
 * present in blockSet/mustPassKeys/surroundKeys/adjacentTurnKeys, so the keyed-map and
 * portal-dest keys are redundant for a bounding box but keep the visitor exhaustive.
 */
export function forEachLevelKey(level: any, fn: (k: number) => void): void {
    if (!level) return;
    for (const f of LEVEL_KEY_FIELDS.scalarKeys) if (typeof level[f] === 'number') fn(level[f]);
    for (const f of LEVEL_KEY_FIELDS.keyArrays) (level[f] || []).forEach(fn);
    for (const f of LEVEL_KEY_FIELDS.keySets) if (level[f]) level[f].forEach(fn);
    for (const f of [...LEVEL_KEY_FIELDS.axisMaps, ...LEVEL_KEY_FIELDS.keyedMaps, ...LEVEL_KEY_FIELDS.turnDirMaps])
        if (level[f] instanceof Map) level[f].forEach((_v: any, k: number) => fn(k));
    if (level.portalMap instanceof Map)
        level.portalMap.forEach((v: any, k: number) => { fn(k); if (typeof v?.dest === 'number') fn(v.dest); });
}

export function getLevelBounds(l: any): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    forEachLevelKey(l, (k: number) => {
        if (k === -1) return;
        const p = UNPACK(k);
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    });
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
}

export function assertLevelShape(level: any): void {
    if (!level) throw new Error('Level object is null');
    if (level.goalKey === undefined || level.goalKey === -1) throw new Error('Level missing goal');
    if (!Array.isArray(level.gateKeys) || level.gateKeys.length === 0) throw new Error('Level missing gates');
    if (!level.grid || !level.grid.w || !level.grid.h) throw new Error('Grid dimensions missing');
}

/**
 * Combined validate-and-parse for raw level data.
 * Prefers this over calling validateRawLevel + parseRawLevel separately.
 */
export function parseRawLevelDetailed(raw: unknown, id: number | null = null): { ok: boolean; level: EngineLevel | null; errors: string[] } {
    const { ok, errors } = validateRawLevel(raw);
    if (!ok) return { ok: false, level: null, errors };
    const level = parseRawLevel(raw, id);
    if (!level) return { ok: false, level: null, errors: ['parse failed unexpectedly after validation passed'] };
    return { ok: true, level, errors: [] };
}
