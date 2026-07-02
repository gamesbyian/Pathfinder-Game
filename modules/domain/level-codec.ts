// Level normalization and serialization.
// parseRawLevel is the single shared parser used by both the index-based
// normalizeLevel accessor and the direct processRawLevel API.

import { PACK, UNPACK } from './cell-key.js';
import { validateRawLevel } from './level-schema.js';
import type { NormalizedLevel } from './level-schema.js';
import { applyLandmark } from './landmark-rules.js';

export const normalizeMetadata = (raw: any = {}) => ({
    designerName: typeof raw.designerName === 'string' ? raw.designerName : '',
    description:  typeof raw.description  === 'string' ? raw.description  : '',
    difficulty:   (raw.difficulty === null || raw.difficulty === undefined || raw.difficulty === '')
        ? null
        : Math.max(1, Math.min(10, Number(raw.difficulty) || 0)) || null,
});

// Shared parser for raw-level data. Both normalizeLevel(idx) and processRawLevel(raw, id)
// delegate here. Input uses 1-based coordinates; output uses 0-based packed keys.
/** @param raw  1-based wire-format level */
export function parseRawLevel(raw: any, id: number | null = null): any {
    if (!raw || !raw.goal || !raw.gates) return null;
    const adj = (v: number) => v - 1;
    const l = {
        id,
        grid:            { ...raw.grid },
        reqLen:          raw.reqLen,
        reqInt:          raw.reqInt,
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
        adjacentTurnDirs:  [] as string[],
        mustPassTurnDirs:  new Map<number, string>(),
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
        reqLen:     level.reqLen  || 0,
        reqInt:     level.reqInt  || 0,
        designerName: level.designerName || '',
        description:  level.description  || '',
        difficulty:   level.difficulty   ?? null,
        blocks, geese, falseGoals, mustPass, mustCross, filters, flippingFilters, portals,
        landmarks: _denormLandmarks(level),
        hints:   Array.isArray(level.hints) ? level.hints : [],
        levelId: typeof level.id === 'number' ? level.id + 1 : null,
    };
}

export function canonicalCloneLevel(src: any, options: { includeHints?: boolean } = {}): any {
    const includeHints = !!options.includeHints;
    const _goalKey  = typeof src?.goalKey === 'number' ? src.goalKey : -1;
    const _gateKeys = Array.isArray(src?.gateKeys) ? src.gateKeys.slice() : [];
    const clone: any = {
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

export function deepCloneLevel(src: any): any {
    const l = canonicalCloneLevel(src, { includeHints: true });
    l.portalVisuals = Array.isArray(src?.portalVisuals)
        ? src.portalVisuals.map((pv: any) => ({ k1: pv.k1, k2: pv.k2 }))
        : [];
    l.hasParityBreaker = !!src?.hasParityBreaker;
    return l;
}

// Deep-clone a level and override its length/intersection requirements. The
// review/submission flows solve or validate against the *challenge* reqLen/reqInt
// rather than the level's own values, so they need a mutable copy with those two
// fields swapped in — this is that idiom in one place.
export function cloneLevelWithReq(src: any, reqLen: any, reqInt: any): any {
    const l = deepCloneLevel(src);
    l.reqLen = reqLen;
    l.reqInt = reqInt;
    return l;
}

export function getLevelBounds(l: any): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const update = (k: number) => {
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
    l.filterMap.forEach((v: any, k: number) => update(k));
    l.flippingFilterMap.forEach((v: any, k: number) => update(k));
    l.portalMap.forEach((v: any, k: number) => update(k));
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
export function parseRawLevelDetailed(raw: unknown, id: number | null = null): { ok: boolean; level: NormalizedLevel | null; errors: string[] } {
    const { ok, errors } = validateRawLevel(raw);
    if (!ok) return { ok: false, level: null, errors };
    const level = parseRawLevel(raw, id);
    if (!level) return { ok: false, level: null, errors: ['parse failed unexpectedly after validation passed'] };
    return { ok: true, level, errors: [] };
}
