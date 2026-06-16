import { PACK } from './encoding.js';

// Normalize raw 1-indexed level wire data into SolverV2's packed-key shape.
// This is intentionally dependency-free so tests and tooling can validate solver
// input contracts without importing the full search implementation.
export function normalizeRawLevelV2(rawLevel, levelNumber = null) {
    const adj  = v => Number(v) - 1;
    const pack = (x, y) => PACK(adj(x), adj(y));
    const arr  = v => Array.isArray(v) ? v : [];
    const ax   = a => (Number(a) === 2 ? 2 : 1);
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
    const surroundKeys      = [];
    const adjacentTurnKeys  = [];
    const adjacentTurnDirs  = [];
    const mustPassTurnDirs  = new Map();
    const landmarkMeta      = new Map();
    arr(rawLevel?.landmarks).forEach(lm => {
        if (!lm || !lm.role) return;
        const k = pack(lm.x, lm.y);
        const role       = lm.role;
        const objectType = typeof lm.objectType === 'string' ? lm.objectType : '';
        landmarkMeta.set(k, { objectType, role });
        const turnDir = (role === 'mustTurnLeft'    || role === 'adjacentTurnLeft')  ? 'left'
                      : (role === 'mustTurnRight'   || role === 'adjacentTurnRight') ? 'right'
                      : (lm.turn === 'left' || lm.turn === 'right')                 ? lm.turn
                      : 'either';
        switch (role) {
            case 'surround':
                surroundKeys.push(k);
                blockSet.add(k);
                break;
            case 'mustPass':
                if (!mustPassKeys.includes(k)) mustPassKeys.push(k);
                break;
            case 'mustTurn': case 'mustTurnLeft': case 'mustTurnRight':
                if (!mustPassKeys.includes(k)) mustPassKeys.push(k);
                mustPassTurnDirs.set(k, turnDir);
                break;
            case 'adjacentTurn': case 'adjacentTurnLeft': case 'adjacentTurnRight':
                adjacentTurnKeys.push(k);
                adjacentTurnDirs.push(turnDir);
                blockSet.add(k);
                break;
            case 'decorative':
            default:
                blockSet.add(k);
                break;
        }
    });
    return {
        id: levelId,
        level: levelNum ?? (levelId + 1),
        grid: { w: Number(rawLevel?.grid?.w) || 0, h: Number(rawLevel?.grid?.h) || 0 },
        reqLen: Number(rawLevel?.reqLen) || 0,
        reqInt: Number(rawLevel?.reqInt) || 0,
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
