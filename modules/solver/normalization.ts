import { PACK } from './encoding.js';
import { applyLandmark } from '../domain/landmark-rules.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { TurnDir } from '../domain/level-schema.js';
import { readRawChallengeMetrics } from '../domain/level-codec.js';

// Normalize raw 1-indexed level wire data into Solver's packed-key shape.
// Challenge-metric wire compatibility is owned by domain/level-codec.ts; this module consumes
// its canonical projection so Solver does not become a second raw-field compatibility boundary.
/**
 * @param rawLevel  untrusted wire-format level (1-indexed); validated elsewhere
 */
export function normalizeRawLevel(rawLevel: any, levelNumber: number | null = null): NormalizedLevel {
    const adj  = (v: any) => Number(v) - 1;
    const pack = (x: any, y: any) => PACK(adj(x), adj(y));
    const arr  = (v: any): any[] => Array.isArray(v) ? v : [];
    const ax   = (a: any) => (Number(a) === 2 ? 2 : 1);
    const levelNum = Number.isFinite(Number(levelNumber)) ? Number(levelNumber) : null;
    const levelId  = levelNum != null ? Math.max(0, levelNum - 1)
                   : (Number.isFinite(Number(rawLevel?.id)) ? Number(rawLevel.id) : 0);
    const portalMap = new Map();
    arr(rawLevel?.portals).forEach(p => {
        const k1 = pack(p.x1, p.y1), k2 = pack(p.x2, p.y2);
        portalMap.set(k1, { dest: k2, color: p.color || '#d946ef' });
        portalMap.set(k2, { dest: k1, color: p.color || '#d946ef' });
    });
    const filterMap         = new Map();
    const flippingFilterMap = new Map();
    arr(rawLevel?.filters).forEach(f => filterMap.set(pack(f.x, f.y), ax(f.axis)));
    arr(rawLevel?.flippingFilters).forEach(f => flippingFilterMap.set(pack(f.x, f.y), ax(f.axis)));
    const blockSet       = new Set(arr(rawLevel?.blocks).map(b => pack(b.x, b.y)));
    const mustPassKeys   = arr(rawLevel?.mustPass).map(m => pack(m.x, m.y));
    const surroundKeys: number[]      = [];
    const adjacentTurnKeys: number[]  = [];
    const adjacentTurnDirs: TurnDir[]  = [];
    const mustPassTurnDirs = new Map<number, TurnDir>();
    const landmarkMeta = new Map<number, { objectType: string; role: string }>();
    const challengeMetrics = readRawChallengeMetrics(rawLevel, { coerce: true });
    const landmarkFields = { blockSet, mustPassKeys, mustPassTurnDirs, surroundKeys, adjacentTurnKeys, adjacentTurnDirs, landmarkMeta };
    arr(rawLevel?.landmarks).forEach(lm => {
        if (!lm || !lm.role) return;
        const k = pack(lm.x, lm.y);
        const objectType = typeof lm.objectType === 'string' ? lm.objectType : '';
        applyLandmark(landmarkFields, k, objectType, lm.role, lm.turn);
    });
    return {
        id: levelId,
        level: levelNum ?? (levelId + 1),
        grid: { w: Number(rawLevel?.grid?.w) || 0, h: Number(rawLevel?.grid?.h) || 0 },
        ...challengeMetrics,
        goalKey: pack(rawLevel.goal.x, rawLevel.goal.y),
        gateKeys: arr(rawLevel?.gates).map(g => pack(g.x, g.y)),
        blockSet,
        mustPassKeys,
        mustCrossKeys: arr(rawLevel?.mustCross).map(m => pack(m.x, m.y)),
        falseGoalKeys: new Set(arr(rawLevel?.falseGoals).map(f => pack(f.x, f.y))),
        gooseSet: new Set(arr(rawLevel?.geese).map(g => pack(g.x, g.y))),
        portalMap, filterMap, flippingFilterMap,
        surroundKeys, adjacentTurnKeys, adjacentTurnDirs, mustPassTurnDirs, landmarkMeta,
        hints: arr(rawLevel?.hints),
    };
}
