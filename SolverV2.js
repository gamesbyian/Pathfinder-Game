// SolverV2.js — Clean-room rewrite of the Pathfinder solver.
// Flat attempt loop: no cascade, no referee, no MITM, no near-closure rescue.
// Supports all level mechanics: portals (forced), regular filters, flipping filters,
// geese, false goals, must-pass, must-cross, intersections.

import { validateCandidatePath } from './modules/domain/path-validator.js';

// ─── Encoding ────────────────────────────────────────────────────────────────

const PACK = (x, y) => ((y << 16) | x) >>> 0;
const UNPACK = k => ({ x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF });
// Max PACK key for a 15x15 grid = PACK(14,14) = (14<<16)|14 = 917518.
// Use 1<<20 = 1048576 to cover all possible grid sizes safely.
const KEY_SPACE = 1 << 20; // 1M entries
const AXIS_H = 1; // horizontal move (dx != 0)
const AXIS_V = 2; // vertical move (dy != 0)
const AXIS_NONE = 0;

function _popcount(n) { let c = 0; for (let x = n; x; x >>>= 1) c += x & 1; return c; }

// ─── Policy profiles (exact weights from V1 SolverCore.SOLVER_POLICY_PROFILES) ──

const POLICY_PROFILES = {
    default:             { goalAttractionWeight: 1,    objectiveAttractionWeight: 1,    finishCommitmentWeight: 1,    perimeterBiasWeight: 1,    mustPassUrgencyWeight: 1,    mustCrossUrgencyWeight: 1,    intersectionSetupWeight: 1,    antiDeadCorridorWeight: 1,    antiDitherWeight: 1,    revisitPenaltyWeight: 1    },
    perimeterSweep:      { goalAttractionWeight: 0.6,  objectiveAttractionWeight: 0.95, finishCommitmentWeight: 0.45, perimeterBiasWeight: 2.05, mustPassUrgencyWeight: 1.1,  mustCrossUrgencyWeight: 1.15, intersectionSetupWeight: 1.1,  antiDeadCorridorWeight: 1.05, antiDitherWeight: 0.55, revisitPenaltyWeight: 0.65 },
    harvestThenFinish:   { goalAttractionWeight: 0.82, objectiveAttractionWeight: 1.35, finishCommitmentWeight: 0.72, perimeterBiasWeight: 1.15, mustPassUrgencyWeight: 1.35, mustCrossUrgencyWeight: 1.4,  intersectionSetupWeight: 1.15, antiDeadCorridorWeight: 1.1,  antiDitherWeight: 0.85, revisitPenaltyWeight: 0.85 },
    portalFirstTransfer: { goalAttractionWeight: 0.72, objectiveAttractionWeight: 1.2,  finishCommitmentWeight: 0.7,  perimeterBiasWeight: 0.85, mustPassUrgencyWeight: 1.25, mustCrossUrgencyWeight: 1.35, intersectionSetupWeight: 1.05, antiDeadCorridorWeight: 1.1,  antiDitherWeight: 0.95, revisitPenaltyWeight: 0.8  },
    objectiveFirst:      { goalAttractionWeight: 0.7,  objectiveAttractionWeight: 1.65, finishCommitmentWeight: 0.65, perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.85, mustCrossUrgencyWeight: 1.8,  intersectionSetupWeight: 1.2,  antiDeadCorridorWeight: 1.1,  antiDitherWeight: 1,    revisitPenaltyWeight: 0.9  },
    finishFirst:         { goalAttractionWeight: 1.45, objectiveAttractionWeight: 0.85, finishCommitmentWeight: 1.75, perimeterBiasWeight: 0.75, mustPassUrgencyWeight: 1.05, mustCrossUrgencyWeight: 1.05, intersectionSetupWeight: 0.8,  antiDeadCorridorWeight: 1.25, antiDitherWeight: 1.3,  revisitPenaltyWeight: 1.3  },
    nearClosureRescue:   { goalAttractionWeight: 1.55, objectiveAttractionWeight: 1.25, finishCommitmentWeight: 1.9,  perimeterBiasWeight: 0.8,  mustPassUrgencyWeight: 1.6,  mustCrossUrgencyWeight: 1.7,  intersectionSetupWeight: 1.2,  antiDeadCorridorWeight: 1.2,  antiDitherWeight: 1.2,  revisitPenaltyWeight: 1.1  },
    knotBuilder:         { goalAttractionWeight: 0.8,  objectiveAttractionWeight: 1,    finishCommitmentWeight: 0.7,  perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.1,  mustCrossUrgencyWeight: 1.35, intersectionSetupWeight: 1.9,  antiDeadCorridorWeight: 1,    antiDitherWeight: 0.9,  revisitPenaltyWeight: 0.8  },
    portalCommitted:     { goalAttractionWeight: 0.95, objectiveAttractionWeight: 1.2,  finishCommitmentWeight: 1,    perimeterBiasWeight: 0.9,  mustPassUrgencyWeight: 1.2,  mustCrossUrgencyWeight: 1.3,  intersectionSetupWeight: 1,    antiDeadCorridorWeight: 1.15, antiDitherWeight: 1.25, revisitPenaltyWeight: 1.1  },
    mustCrossFirst:      { goalAttractionWeight: 0.65, objectiveAttractionWeight: 1.5,  finishCommitmentWeight: 0.6,  perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.6,  mustCrossUrgencyWeight: 2.4,  intersectionSetupWeight: 1.1,  antiDeadCorridorWeight: 1.05, antiDitherWeight: 0.9,  revisitPenaltyWeight: 0.85 },
    intersectionHarvest: { goalAttractionWeight: 0.5,  objectiveAttractionWeight: 0.9,  finishCommitmentWeight: 0.45, perimeterBiasWeight: 1.15, mustPassUrgencyWeight: 0.45, mustCrossUrgencyWeight: 0.55, intersectionSetupWeight: 3.0,  antiDeadCorridorWeight: 0.9,  antiDitherWeight: 0.65, revisitPenaltyWeight: 0.6  },
    closureCommitment:   { goalAttractionWeight: 1.5,  objectiveAttractionWeight: 1.3,  finishCommitmentWeight: 2.0,  perimeterBiasWeight: 0.8,  mustPassUrgencyWeight: 2.0,  mustCrossUrgencyWeight: 2.0,  intersectionSetupWeight: 0.8,  antiDeadCorridorWeight: 1.0,  antiDitherWeight: 0.4,  revisitPenaltyWeight: 0.4  },
};

const PROFILE_ORDER = [
    'harvestThenFinish', 'objectiveFirst', 'knotBuilder', 'perimeterSweep',
    'mustCrossFirst', 'intersectionHarvest', 'finishFirst', 'nearClosureRescue',
    'portalFirstTransfer', 'portalCommitted', 'closureCommitment', 'default'
];

// ─── Structural templates (geometric traversal bias) ─────────────────────────
// Mirrors V1's structuralTemplate mechanism: adds directional perimeter bias,
// corner-harvest pull, and side-commitment constraint on top of the policy profile.

const TEMPLATES = {
    perimeterCW:    { id: 'perimeterCW',    perimeterDir: 'cw',  edgeDriftPenalty: 22, branchBiasBoost: 26, directionPenalty: 16 },
    perimeterCCW:   { id: 'perimeterCCW',   perimeterDir: 'ccw', edgeDriftPenalty: 22, branchBiasBoost: 26, directionPenalty: 16 },
    cornerHarvest:  { id: 'cornerHarvest',  prefersCorner: true, cornerMissPenalty: 14 },
    sideCommitment: { id: 'sideCommitment', prefersSide:   true, sideSwitchPenalty: 16 },
    // Side-bias templates for interior-gate levels where perimeter templates don't apply.
    // sideX: bias toward x < midX or x > midX; sideY: toward y < midY or y > midY.
    sideXLow:  { id: 'sideXLow',  sideAxis: 'x', sideDir: -1, sideBiasBoost: 14, sideViolation: 10 },
    sideXHigh: { id: 'sideXHigh', sideAxis: 'x', sideDir: +1, sideBiasBoost: 14, sideViolation: 10 },
    sideYLow:  { id: 'sideYLow',  sideAxis: 'y', sideDir: -1, sideBiasBoost: 14, sideViolation: 10 },
    sideYHigh: { id: 'sideYHigh', sideAxis: 'y', sideDir: +1, sideBiasBoost: 14, sideViolation: 10 },
};

// Ablation support: template id → ablation config key (used to filter disabled templates).
const _TEMPLATE_CFG_KEY = {
    cornerHarvest:  'TEMPLATE_CORNER_HARVEST',
    perimeterCW:    'TEMPLATE_PERIMETER_CW',
    perimeterCCW:   'TEMPLATE_PERIMETER_CCW',
    sideCommitment: 'TEMPLATE_SIDE_COMMITMENT',
    sideXLow:       'TEMPLATE_SIDE_X_LOW',
    sideXHigh:      'TEMPLATE_SIDE_X_HIGH',
    sideYLow:       'TEMPLATE_SIDE_Y_LOW',
    sideYHigh:      'TEMPLATE_SIDE_Y_HIGH',
};

// Seeded Fisher-Yates shuffle for reproducible random attempt ordering.
function _shuffleArray(arr, seed) {
    let s = (seed | 0) >>> 0;
    const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Pre-compute template bonus for a candidate move.
// Returns the bonus to add to the DFS score (higher = preferred).
function computeTemplateBonus(target, pos, level, template, rRatio) {
    if (!template) return 0;
    const { w, h } = level.grid;
    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
    const px = pos   & 0xFFFF, py = (pos   >>> 16) & 0xFFFF;
    const edgeNow  = Math.min(px, py, (w - 1) - px, (h - 1) - py);
    const edgeNext = Math.min(tx, ty, (w - 1) - tx, (h - 1) - ty);
    let bonus = 0;

    if (template.perimeterDir) {
        // Phase-aware perimeter gradient: mirrors V1's harvest→knot transition.
        // During harvest (rRatio<0.45): full perimeter pull. During knot (rRatio>0.45):
        // gradually relax so the solver can build interior intersections.
        const perimScale = rRatio > 0.45
            ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)
            : 1.0;
        if (edgeNext === 0) {
            bonus += Math.round(42 * perimScale);
        } else {
            bonus -= Math.round(edgeNext * 16 * perimScale);
        }
        // Directional bias when moving perimeter-to-perimeter (CW vs CCW)
        if (edgeNow === 0 && edgeNext === 0) {
            const cx = (w - 1) / 2, cy = (h - 1) / 2;
            const cross = (px - cx) * (ty - cy) - (py - cy) * (tx - cx);
            if (cross !== 0) {
                const correctDir = (template.perimeterDir === 'cw') ? (cross < 0) : (cross > 0);
                bonus += correctDir ? template.branchBiasBoost : -template.directionPenalty;
            }
        }
        // Penalty for leaving perimeter, scaled with phase (relaxes in knot phase)
        if (edgeNow === 0 && edgeNext > 0) {
            bonus -= Math.round(template.edgeDriftPenalty * perimScale);
        }
    }

    if (template.prefersCorner) {
        if (rRatio < 0.58) {
            const cornerDist = Math.min(tx + ty, (w - 1 - tx) + ty, tx + (h - 1 - ty), (w - 1 - tx) + (h - 1 - ty));
            if (cornerDist <= 2) {
                bonus += 48;
            } else {
                bonus -= cornerDist * 9;  // -27 at dist 3, -36 at dist 4, etc.
            }
        }
    }

    if (template.prefersSide && rRatio < 0.65 && w > 4) {
        const midX = (w - 1) / 2;
        const pSide = px - midX, tSide = tx - midX;
        const pSign = Math.sign(pSide), tSign = Math.sign(tSide);
        if (pSign !== 0) {
            if (tSign === pSign)       bonus += 22;  // reward staying on same side
            else if (tSign === -pSign) bonus -= 38;  // strongly penalise crossing
        }
    }

    if (template.sideAxis && rRatio < 0.68) {
        const mid    = template.sideAxis === 'x' ? (w - 1) / 2 : (h - 1) / 2;
        const tCoord = template.sideAxis === 'x' ? tx : ty;
        const side   = Math.sign(tCoord - mid);
        if (side === template.sideDir)       bonus += template.sideBiasBoost * 3;
        else if (side === -template.sideDir) bonus -= template.sideViolation  * 3;
    }

    return bonus;
}

// Each attempt = { profileName, template|null }.
// Trimmed to only the two templates that account for ~90% of wins in full audits
// (perimeterSweep+cornerHarvest: 78 wins, perimeterSweep+perimeterCW: 34 wins).
// Removing dead templates reduces config count from 26→15, giving each attempt ~2000ms
// instead of ~1154ms.
const ATTEMPT_CONFIGS = [
    { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest    },
    { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW      },
    { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCCW     },
    { profileName: 'perimeterSweep',    template: TEMPLATES.sideCommitment   },
    // Non-template fallbacks (all profiles)
    ...PROFILE_ORDER.map(profileName => ({ profileName, template: null })),
];

// ─── BFS / distance map ───────────────────────────────────────────────────────

// 0-1 BFS: portals are 0-cost edges, regular moves cost 1.
function buildDistMap(level, sourceKeys) {
    const { w, h } = level.grid;
    const blockSet = level.blockSet;
    const portalMap = level.portalMap;
    const map = new Map();
    // Deque: head/tail pointers into a circular buffer
    const cap = Math.max(64, (w * h) * 2);
    const buf = new Int32Array(cap);
    let head = 0, tail = 0;
    const push_front = (k) => { head = (head - 1 + cap) % cap; buf[head] = k; };
    const push_back  = (k) => { buf[tail] = k; tail = (tail + 1) % cap; };
    const pop_front  = ()  => { const k = buf[head]; head = (head + 1) % cap; return k; };
    const empty      = ()  => head === tail;

    for (const k of sourceKeys) {
        if (k == null || k < 0 || blockSet.has(k)) continue;
        if (!map.has(k)) { map.set(k, 0); push_back(k); }
    }
    while (!empty()) {
        const k = pop_front();
        const d = map.get(k);
        // Portal edge (0-cost)
        const portal = portalMap.get(k);
        if (portal && portal.dest >= 0 && !blockSet.has(portal.dest)) {
            if (!map.has(portal.dest) || d < map.get(portal.dest)) {
                map.set(portal.dest, d);
                push_front(portal.dest);
            }
        }
        // 4-directional (cost 1)
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        if (x + 1 < w) { const nk = k + 1;       const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < map.get(nk)) { map.set(nk, nd); push_back(nk); } }
        if (x > 0)     { const nk = k - 1;       const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < map.get(nk)) { map.set(nk, nd); push_back(nk); } }
        if (y + 1 < h) { const nk = k + 0x10000; const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < map.get(nk)) { map.set(nk, nd); push_back(nk); } }
        if (y > 0)     { const nk = k - 0x10000; const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < map.get(nk)) { map.set(nk, nd); push_back(nk); } }
    }
    return map;
}

// Build a BFS distance map from approach cells on one side of a flipper or MC cell.
// ax=AXIS_V → sources above/below (cx, cy±1); ax=AXIS_H → sources left/right (cx±1, cy).
// filterFn(k) returns true for cells that qualify as approach sources.
function _buildAxisApproachMap(level, cx, cy, ax, filterFn) {
    const { w, h } = level.grid;
    const cands = ax === AXIS_V
        ? [cy > 0     ? PACK(cx, cy - 1) : -1, cy < h - 1 ? PACK(cx, cy + 1) : -1]
        : [cx > 0     ? PACK(cx - 1, cy) : -1, cx < w - 1 ? PACK(cx + 1, cy) : -1];
    const sources = cands.filter(k => k >= 0 && filterFn(k));
    return sources.length > 0 ? buildDistMap(level, sources) : new Map();
}

// ─── Level normalisation ──────────────────────────────────────────────────────

function normalizeRawLevelV2(rawLevel, levelNumber = null) {
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
    return {
        id: levelId,
        level: levelNum ?? (levelId + 1),
        grid: { w: Number(rawLevel?.grid?.w) || 0, h: Number(rawLevel?.grid?.h) || 0 },
        reqLen: Number(rawLevel?.reqLen) || 0,
        reqInt: Number(rawLevel?.reqInt) || 0,
        goalKey: pack(rawLevel.goal.x, rawLevel.goal.y),
        gateKeys: arr(rawLevel?.gates).map(g => pack(g.x, g.y)),
        blockSet: new Set(arr(rawLevel?.blocks).map(b => pack(b.x, b.y))),
        mustPassKeys: arr(rawLevel?.mustPass).map(m => pack(m.x, m.y)),
        mustCrossKeys: arr(rawLevel?.mustCross).map(m => pack(m.x, m.y)),
        falseGoalKeys: new Set(arr(rawLevel?.falseGoals).map(f => pack(f.x, f.y))),
        gooseSet: new Set(arr(rawLevel?.geese).map(g => pack(g.x, g.y))),
        portalMap, filterMap, flippingFilterMap,
        hints: arr(rawLevel?.hints),
    };
}

// ─── Pre-computation (per level) ─────────────────────────────────────────────

// Convert a Map<packedKey, distance> to a Uint16Array for O(1) array access.
// 0xFFFF is the "unreachable" sentinel (distances on a 15×15 grid never exceed 225).
function _distMapToArr(map) {
    const arr = new Uint16Array(KEY_SPACE);
    arr.fill(0xFFFF);
    for (const [k, d] of map) arr[k] = d < 0xFFFF ? d : 0xFFFE;
    return arr;
}
// Inline distance lookup: Uint16Array[key] with 0xFFFF → Infinity.
// Faster than Map.get because it avoids hash-table overhead.
function _dget(arr, k) { const v = arr[k]; return v === 0xFFFF ? Infinity : v; }

function prepLevel(level) {
    const prep = {};
    prep.distMap        = buildDistMap(level, [level.goalKey]);
    prep.mustPassIndex  = new Map(level.mustPassKeys.map((k, i) => [k, i]));
    prep.mustCrossIndex = new Map(level.mustCrossKeys.map((k, i) => [k, i]));
    prep.mustPassDistMaps  = level.mustPassKeys.map(k => buildDistMap(level, [k]));
    prep.mustCrossDistMaps = level.mustCrossKeys.map(k => buildDistMap(level, [k]));
    prep.gateSet = new Set(level.gateKeys);
    // mustPassGoalDist: BFS distance from each must-pass to goal
    prep.mustPassToGoalDist = level.mustPassKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // mustCrossToGoalDist: BFS distance from each must-cross to goal
    prep.mustCrossToGoalDist = level.mustCrossKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // Objectives = must-pass + must-cross (for scoring)
    prep.objectiveKeys = Array.from(new Set([...level.mustPassKeys, ...level.mustCrossKeys]));
    prep.objectiveDistMaps = prep.objectiveKeys.map(k => buildDistMap(level, [k]));
    prep.objectiveKeyToIndex = new Map(prep.objectiveKeys.map((k, i) => [k, i]));

    // Fast typed-array mirrors of the most-accessed dist maps.
    // Uint16Array[packedKey] instead of Map.get() cuts per-lookup cost ~10x.
    prep.goalDistArr  = _distMapToArr(prep.distMap);
    prep.mpDistArrs   = prep.mustPassDistMaps.map(_distMapToArr);
    prep.mcDistArrs   = prep.mustCrossDistMaps.map(_distMapToArr);
    prep.objDistArrs  = prep.objectiveDistMaps.map(_distMapToArr);

    // Approach-cell distance maps for must-cross 2nd visits.
    // After the 1st pass via axis A, the 2nd pass must enter from axis B.
    // We precompute BFS distances to the cells immediately adjacent on each axis
    // so the scorer/pruner can guide toward the correct perpendicular approach.
    const _mcFilter = k => !level.blockSet.has(k) && !level.gooseSet.has(k);
    prep.mcApproachDistMaps = level.mustCrossKeys.map(mcKey => {
        const mcX = mcKey & 0xFFFF, mcY = (mcKey >>> 16) & 0xFFFF;
        return {
            v: _buildAxisApproachMap(level, mcX, mcY, AXIS_V, _mcFilter),
            h: _buildAxisApproachMap(level, mcX, mcY, AXIS_H, _mcFilter),
        };
    });

    // Pairwise BFS distances between must-cross cells (for MST lower bound).
    // mcPairDist[i][j] = dist from mustCrossKeys[i] to mustCrossKeys[j].
    const mcN = level.mustCrossKeys.length;
    prep.mcPairDist = [];
    for (let i = 0; i < mcN; i++) {
        prep.mcPairDist[i] = [];
        for (let j = 0; j < mcN; j++) {
            prep.mcPairDist[i][j] = i === j ? 0 : (prep.mustCrossDistMaps[j].get(level.mustCrossKeys[i]) ?? Infinity);
        }
    }

    // Pairwise BFS distances between must-pass cells (for MST lower bound).
    const mpN = level.mustPassKeys.length;
    prep.mpPairDist = [];
    for (let i = 0; i < mpN; i++) {
        prep.mpPairDist[i] = [];
        for (let j = 0; j < mpN; j++) {
            prep.mpPairDist[i][j] = i === j ? 0 : (prep.mustPassDistMaps[j].get(level.mustPassKeys[i]) ?? Infinity);
        }
    }

    // Cache initial BigInt masks so createState / _beamResetState avoid recomputing them.
    const _mpN = level.mustPassKeys.length, _mcN = level.mustCrossKeys.length;
    prep.initialMustMask      = _mpN > 0 ? ((1 << _mpN) - 1) : 0;
    prep.initialMustCrossMask = _mcN > 0 ? ((1 << _mcN) - 1) : 0;
    // DFS must-pass scoring: sparse/medium-density levels (< 0.70) get full must-pass
    // urgency scoring via initialMustMask so the DFS is guided toward must-pass cells.
    // Near-Hamiltonian levels (density ≥ 0.70, e.g. L26 at 0.82) keep mustMask=0 to
    // avoid disrupting the tightly-ordered dense traversal; mpVisitedMask still enforces
    // must-pass correctness in isSolution/pruning for those levels.
    const _navArea = Math.max(1, level.grid.w * level.grid.h
        - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size
        - level.gateKeys.length);
    prep.mustMaskForDFS = (level.reqLen / _navArea >= 0.70) ? 0 : prep.initialMustMask;

    // Flipper index data for the global-flip mechanism.
    const _fKeys = [...level.flippingFilterMap.keys()];
    prep.flipperIndexMap  = new Map(_fKeys.map((k, i) => [k, i]));
    prep.flipperInitAxes  = new Uint8Array(_fKeys.map(k => level.flippingFilterMap.get(k)));

    // Flipper approach distance maps for urgency scoring.
    // Two entries per flipper (indexed by fi):
    //   flipperApproachEven[fi]: BFS from approach cells when usedCount is even (axis = initial)
    //   flipperApproachOdd[fi]:  BFS from approach cells when usedCount is odd  (axis = flipped)
    // Approach cells are the cells adjacent to the flipper in its required entry direction,
    // excluding blocks, other flippers, and gate cells (gates can't be re-entered as approach).
    // Empty map means the flipper is inaccessible at that parity without going through another
    // flipper first (e.g. F1 in L140 at even parity: only reachable via F2 from the west).
    prep.flipperApproachEven = [];
    prep.flipperApproachOdd  = [];
    if (_fKeys.length > 0) {
        const _fGateSet = new Set(level.gateKeys);
        const _ffFilter = k => !level.blockSet.has(k) && !level.flippingFilterMap.has(k) && !_fGateSet.has(k);
        for (let fi = 0; fi < _fKeys.length; fi++) {
            const fKey = _fKeys[fi];
            const fx = fKey & 0xFFFF, fy = (fKey >>> 16) & 0xFFFF;
            const initAx = prep.flipperInitAxes[fi];
            for (const parityOdd of [false, true]) {
                const ax = parityOdd ? (initAx === AXIS_H ? AXIS_V : AXIS_H) : initAx;
                const dmap = _buildAxisApproachMap(level, fx, fy, ax, _ffFilter);
                if (parityOdd) prep.flipperApproachOdd.push(dmap);
                else           prep.flipperApproachEven.push(dmap);
            }
        }
    }

    // Cells that can never be valid false-goal (trap spot) locations:
    // goal, gates, must-pass, must-cross, filters, flipping filters, portal terminals.
    // A false goal cannot share a cell with any other object.
    prep.trapInvalidSet = new Set([
        level.goalKey,
        ...level.gateKeys,
        ...level.mustPassKeys,
        ...level.mustCrossKeys,
        ...level.filterMap.keys(),
        ...level.flippingFilterMap.keys(),
        ...level.portalMap.keys(),
    ]);

    // Precompute static adjacency per cell. Stored as a flat Int32Array of
    // [nk, moveAxis, nk, moveAxis, ...] pairs, eliminating repeated bounds/set
    // checks in the hot getNeighbors loop. Excludes: blocks, geese, false goals,
    // gate cells, and neighbors that violate static (regular) filter constraints.
    // Flipping-filter and portal constraints remain dynamic.
    {
        const { w, h } = level.grid;
        const _dx4 = [1, -1, 0, 0];
        const _dy4 = [0, 0, 1, -1];
        prep.staticNeighbors = new Map();
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const k = PACK(x, y);
                if (level.blockSet.has(k) || level.gooseSet.has(k)) continue;
                const filterFrom = level.filterMap.get(k);
                const pairs = [];
                for (let d = 0; d < 4; d++) {
                    const nx = x + _dx4[d], ny = y + _dy4[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = PACK(nx, ny);
                    if (level.blockSet.has(nk)) continue;
                    if (level.gooseSet.has(nk)) continue;
                    if (level.falseGoalKeys.has(nk)) continue;
                    if (prep.gateSet.has(nk)) continue;
                    const moveAxis = (ny === y) ? AXIS_H : AXIS_V;
                    if (filterFrom && filterFrom !== moveAxis) continue;
                    const filterTarget = level.filterMap.get(nk);
                    if (filterTarget && filterTarget !== moveAxis) continue;
                    pairs.push(nk, moveAxis);
                }
                prep.staticNeighbors.set(k, new Int32Array(pairs));
            }
        }
    }

    return prep;
}

// ─── State ────────────────────────────────────────────────────────────────────

function createState(startKey, level, prep) {
    const cn = level.mustCrossKeys.length;
    const state = {
        path: [startKey],
        visited:    new Uint16Array(KEY_SPACE),   // visit count per cell
        edgeUsage:  new Uint8Array(KEY_SPACE),    // bit1=H used, bit2=V used
        ints:       0,
        mustMask:      prep.mustMaskForDFS,        // 0 for dense levels; initialMustMask for sparse/medium
        mustCrossMask: prep.initialMustCrossMask,
        crossCounts:   new Uint8Array(cn),
        // uint32 bitmask: bit i set when mustPassKeys[i] has been visited at least once.
        // Used by isSolution, mustPassLowerBound, isConnected. For dense levels where
        // mustMask stays 0 (no scoring activation), this is the authoritative must-pass check.
        mpVisitedMask: 0,
        portalJumps:   0,
        flipperUsedMask: 0,                       // bit i set when flipper i has been used (global-flip rule)
        lastWasPortalJump: false,                 // was last move a portal jump?
    };
    state.visited[startKey] = 1;
    // Apply start-cell effects
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) {
        state.crossCounts[mcIdx] = 1;
        // mustCrossMask bit stays set (still need one more visit)
    }
    const _fsi = prep.flipperIndexMap.get(startKey);
    if (_fsi !== undefined) state.flipperUsedMask |= (1 << _fsi);
    return state;
}

// Apply a step to state, return undo token.
// isPortalJump: current cell has portal and target is portal.dest (0-cost step).
function applyMove(target, state, level, prep, isPortalJump) {
    const from = state.path[state.path.length - 1];
    const prevVisited = state.visited[target];

    // Compute move axis and entry axis (for edge-usage)
    let moveAxis = AXIS_NONE;
    if (!isPortalJump) {
        const fx = from & 0xFFFF, fy = (from >>> 16) & 0xFFFF;
        const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
        moveAxis = (ty === fy) ? AXIS_H : AXIS_V;
    }
    const axisBit = moveAxis === AXIS_H ? 1 : (moveAxis === AXIS_V ? 2 : 0);

    const prevEdgeFrom   = state.edgeUsage[from];
    const prevEdgeTarget = state.edgeUsage[target];

    // Apply visit
    state.visited[target]++;
    state.path.push(target);
    if (isPortalJump) state.portalJumps++;

    // Edge usage update (only for non-portal moves)
    if (axisBit) {
        state.edgeUsage[from]   |= axisBit;
        state.edgeUsage[target] |= axisBit;
    }

    // Intersection: non-goal, non-gate cell visited again
    const wasIntAdded = prevVisited > 0 && target !== level.goalKey && !prep.gateSet.has(target);
    if (wasIntAdded) state.ints++;

    // Must-pass: clear mustMask bit + set mpVisitedMask bit on first visit
    const prevMustMask = state.mustMask;
    const prevMpVisitedMask = state.mpVisitedMask;
    const mpIdx = prep.mustPassIndex.get(target);
    if (mpIdx !== undefined && prevVisited === 0) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }

    // Must-cross: accumulate crosses
    const prevMustCrossMask = state.mustCrossMask;
    let prevCrossCount = 0;
    const mcIdx = prep.mustCrossIndex.get(target);
    if (mcIdx !== undefined) {
        prevCrossCount = state.crossCounts[mcIdx];
        if (state.crossCounts[mcIdx] < 255) state.crossCounts[mcIdx]++;
        if (state.crossCounts[mcIdx] >= 2) state.mustCrossMask &= ~(1 << mcIdx);
    }

    // Flipping filter update (global-flip rule: mark flipper as used)
    const prevFlipperUsedMask = state.flipperUsedMask;
    if (!isPortalJump) {
        const _fi = prep.flipperIndexMap.get(target);
        if (_fi !== undefined) state.flipperUsedMask |= (1 << _fi);
    }

    const prevLastWasPortalJump = state.lastWasPortalJump;
    state.lastWasPortalJump = isPortalJump;

    return {
        target, from, moveAxis, axisBit, isPortalJump,
        prevVisited, prevEdgeFrom, prevEdgeTarget,
        wasIntAdded,
        prevMustMask, prevMpVisitedMask, mpIdx,
        prevMustCrossMask, mcIdx, prevCrossCount,
        prevFlipperUsedMask,
        prevLastWasPortalJump,
    };
}

function undoMove(undo, state) {
    state.path.pop();
    state.visited[undo.target]    = undo.prevVisited;
    state.edgeUsage[undo.from]    = undo.prevEdgeFrom;
    state.edgeUsage[undo.target]  = undo.prevEdgeTarget;
    if (undo.isPortalJump) state.portalJumps--;
    if (undo.wasIntAdded) state.ints--;
    state.mustMask          = undo.prevMustMask;
    state.mpVisitedMask     = undo.prevMpVisitedMask;
    state.mustCrossMask     = undo.prevMustCrossMask;
    if (undo.mcIdx !== undefined) state.crossCounts[undo.mcIdx] = undo.prevCrossCount;
    state.flipperUsedMask   = undo.prevFlipperUsedMask;
    state.lastWasPortalJump = undo.prevLastWasPortalJump;
}

// ─── Neighbour generation ─────────────────────────────────────────────────────

// Returns an array of valid next-cell keys from `pos` in `state`.
// Portal entries yield ONLY the portal destination (forced teleport).
// `arrivedViaPortal` prevents chaining teleports.
// Uses precomputed staticNeighbors from prepLevel; only dynamic checks run here.
function getNeighbors(pos, state, level, prep) {
    const portal = level.portalMap.get(pos);
    const arrivedViaPortal = state.lastWasPortalJump;

    // Portal is forced unless we just arrived here via a portal jump
    if (portal && !arrivedViaPortal) {
        const dest = portal.dest;
        if (dest >= 0 && !level.blockSet.has(dest) && !level.gooseSet.has(dest)) return [dest];
        return [];
    }

    // Entry axis of pos (needed for turning check and flipping-filter check)
    const pathLen = state.path.length;
    let entryAxis = AXIS_NONE;
    if (pathLen >= 2 && !arrivedViaPortal) {
        const prev = state.path[pathLen - 2];
        const py = (prev >>> 16) & 0xFFFF;
        const y  = (pos  >>> 16) & 0xFFFF;
        entryAxis = (py === y) ? AXIS_H : AXIS_V;
    }

    const staticNbList = prep.staticNeighbors.get(pos);
    if (!staticNbList || staticNbList.length === 0) return [];

    const candidates = [];
    for (let si = 0; si < staticNbList.length; si += 2) {
        const nk       = staticNbList[si];
        const moveAxis = staticNbList[si + 1];
        if (_isMoveDynValid(pos, nk, state, level, prep, entryAxis, moveAxis)) candidates.push(nk);
    }
    return candidates;
}

// Dynamic move validity: checks that only depend on mutable state.
// Static checks (blocks, geese, false goals, gates, regular filters) are
// already applied in prepLevel's staticNeighbors; only these remain:
function _isMoveDynValid(from, target, state, level, prep, entryAxis, moveAxis) {
    // Portal terminal revisit: each portal cell can only be visited once
    if (level.portalMap.has(target) && state.visited[target] > 0) return false;

    const axisBit = moveAxis === AXIS_H ? 1 : 2;

    // Edge-axis reuse at target
    if (state.edgeUsage[target] & axisBit) return false;

    // Turning check: when exiting in a different axis than entry, the exit axis
    // must not already be used at the source cell
    if (entryAxis !== AXIS_NONE && moveAxis !== entryAxis) {
        if (state.edgeUsage[from] & axisBit) return false;
    }

    // Must-cross lock prevention: turning at an unsatisfied 1st-pass MC cell
    // would consume both axis bits, permanently blocking the required 2nd crossing
    const _mcLockIdx = prep.mustCrossIndex.get(from);
    if (_mcLockIdx !== undefined && state.crossCounts[_mcLockIdx] === 1
            && (state.mustCrossMask & (1 << _mcLockIdx)) !== 0) {
        const _eH = (state.edgeUsage[from] & AXIS_H) !== 0;
        const _eV = (state.edgeUsage[from] & AXIS_V) !== 0;
        if ((_eH && !_eV && moveAxis === AXIS_V) || (!_eH && _eV && moveAxis === AXIS_H)) return false;
    }

    // Flipping filter at from: entry and exit axis must match (no turns at flipper)
    if (level.flippingFilterMap.has(from) && entryAxis !== AXIS_NONE) {
        if (entryAxis !== moveAxis) return false;
    }

    // Flipping filter at target: must enter in the flipper's current orientation
    const fi = prep.flipperIndexMap.get(target);
    if (fi !== undefined) {
        if (state.flipperUsedMask & (1 << fi)) return false;
        const usedCount = _popcount(state.flipperUsedMask);
        const initAx    = prep.flipperInitAxes[fi];
        const curAx     = (usedCount & 1) === 0 ? initAx : (initAx === AXIS_H ? AXIS_V : AXIS_H);
        if (curAx !== moveAxis) return false;
    }

    return true;
}

// Returns true if moving from `from` to `target` is valid.
function isValidMove(from, target, state, level, prep, entryAxis) {
    if (level.blockSet.has(target))   return false;
    if (level.gooseSet.has(target))   return false;
    if (prep.gateSet.has(target))     return false; // no gate re-entry
    if (level.falseGoalKeys.has(target)) return false;
    if (from === level.goalKey)       return false; // can't move after reaching goal
    // Portal terminals can only be used once
    if (level.portalMap.has(target) && state.visited[target] > 0) return false;

    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
    const fx = from   & 0xFFFF, fy = (from   >>> 16) & 0xFFFF;
    if (Math.abs(tx - fx) + Math.abs(ty - fy) !== 1) return false; // must be adjacent

    const moveAxis = (ty === fy) ? AXIS_H : AXIS_V;
    const axisBit  = moveAxis === AXIS_H ? 1 : 2;

    // Edge usage: can't reuse an axis at target
    if (state.edgeUsage[target] & axisBit) return false;

    // Edge usage at source: turning check (exit axis must be fresh if different from entry)
    if (entryAxis !== AXIS_NONE && moveAxis !== entryAxis) {
        if (state.edgeUsage[from] & axisBit) return false;
    }

    // Must-cross cell lock prevention: if 'from' is an unsatisfied MC cell with exactly
    // 1 visit, turning here (exiting in the axis perpendicular to entry) would set both
    // axis bits on the cell — permanently blocking any future 2nd visit.
    // A valid 2nd crossing requires re-entering via the UNUSED axis, which is only
    // possible if the 1st pass was straight-through (same axis entry and exit).
    const _mcLockIdx = prep.mustCrossIndex.get(from);
    if (_mcLockIdx !== undefined && state.crossCounts[_mcLockIdx] === 1
            && (state.mustCrossMask & (1 << _mcLockIdx)) !== 0) {
        const _eH = (state.edgeUsage[from] & AXIS_H) !== 0;
        const _eV = (state.edgeUsage[from] & AXIS_V) !== 0;
        if ((_eH && !_eV && moveAxis === AXIS_V) || (!_eH && _eV && moveAxis === AXIS_H)) return false;
    }

    // Regular filter axis check
    const filterFrom   = level.filterMap.get(from);
    const filterTarget = level.filterMap.get(target);
    if (filterFrom   && filterFrom   !== moveAxis) return false;
    if (filterTarget && filterTarget !== moveAxis) return false;

    // Flipping filter: cannot turn at a flipper cell (entry and exit must use the same axis).
    // This mirrors V1's _isMoveValid guard.
    if (level.flippingFilterMap.has(from) && entryAxis !== AXIS_NONE) {
        if (entryAxis !== moveAxis) return false;
    }

    // Flipping-filter entry: must match target flipper's current orientation.
    // Global rule: using flipper i flips all OTHER unused flippers.
    // Current axis of unused flipper fi = initial_axis[fi] XOR (odd usedCount → flip).
    // Used flippers are locked (orientation frozen) and cannot be re-entered.
    const fi = prep.flipperIndexMap.get(target);
    if (fi !== undefined) {
        if (state.flipperUsedMask & (1 << fi)) return false;
        const usedCount = _popcount(state.flipperUsedMask);
        const initAx    = prep.flipperInitAxes[fi];
        const curAx     = (usedCount & 1) === 0 ? initAx : (initAx === AXIS_H ? AXIS_V : AXIS_H);
        if (curAx !== moveAxis) return false;
    }

    return true;
}

// ─── Pruning ──────────────────────────────────────────────────────────────────

// Union-find backing store for Kruskal's MST (max 6 nodes: pos + up to 5 MC cells)
const _ufPar = new Int32Array(8);
function _ufFind(x) { while (_ufPar[x] !== x) { _ufPar[x] = _ufPar[_ufPar[x]]; x = _ufPar[x]; } return x; }

// MST-based joint lower bound for ≥2 remaining must-cross cells.
// Computes a Kruskal MST of {current_pos} ∪ {remaining MC cells} and adds
// the minimum MC-to-goal distance.  Returns a lower bound on remaining steps.
// edges scratch array avoids heap allocation on the hot path.
const _mstEdges = new Float64Array(30); // weight, u, v packed as triples (max 10 edges * 3 = 30)
function mcMSTLowerBound(pos, remain, state, level, prep) {
    const k = remain.length; // k >= 2
    const nodeCount = k + 1; // 0=pos, 1..k = MC[remain[...]]

    // Compute pos→MCi distance (use approach map for 2nd-visit cells)
    let eCount = 0;
    for (let a = 0; a < k; a++) {
        const i = remain[a];
        let d;
        if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            const mcKey = level.mustCrossKeys[i];
            const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const aMap  = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
            d = aMap.size > 0 ? ((aMap.get(pos) ?? Infinity) + 1) : _dget(prep.mcDistArrs[i], pos);
        } else {
            d = _dget(prep.mcDistArrs[i], pos);
        }
        if (!Number.isFinite(d)) return Infinity;
        _mstEdges[eCount * 3]     = d;
        _mstEdges[eCount * 3 + 1] = 0;
        _mstEdges[eCount * 3 + 2] = a + 1;
        eCount++;
    }
    // MC[i] ↔ MC[j] pairwise edges
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const d = prep.mcPairDist[remain[a]][remain[b]];
            if (!Number.isFinite(d)) return Infinity;
            _mstEdges[eCount * 3]     = d;
            _mstEdges[eCount * 3 + 1] = a + 1;
            _mstEdges[eCount * 3 + 2] = b + 1;
            eCount++;
        }
    }

    // Sort edges by weight (insertion sort — tiny arrays)
    for (let i = 1; i < eCount; i++) {
        const w = _mstEdges[i * 3], u = _mstEdges[i * 3 + 1], v = _mstEdges[i * 3 + 2];
        let j = i - 1;
        while (j >= 0 && _mstEdges[j * 3] > w) {
            _mstEdges[(j + 1) * 3]     = _mstEdges[j * 3];
            _mstEdges[(j + 1) * 3 + 1] = _mstEdges[j * 3 + 1];
            _mstEdges[(j + 1) * 3 + 2] = _mstEdges[j * 3 + 2];
            j--;
        }
        _mstEdges[(j + 1) * 3]     = w;
        _mstEdges[(j + 1) * 3 + 1] = u;
        _mstEdges[(j + 1) * 3 + 2] = v;
    }

    // Kruskal's MST
    for (let i = 0; i < nodeCount; i++) _ufPar[i] = i;
    let mstW = 0, added = 0;
    for (let e = 0; e < eCount && added < nodeCount - 1; e++) {
        const pu = _ufFind(_mstEdges[e * 3 + 1]), pv = _ufFind(_mstEdges[e * 3 + 2]);
        if (pu !== pv) { _ufPar[pu] = pv; mstW += _mstEdges[e * 3]; added++; }
    }
    if (added < nodeCount - 1) return Infinity;

    // Min dist from any remaining MC cell to goal
    let minGoal = Infinity;
    for (const i of remain) {
        const d = prep.mustCrossToGoalDist[i];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// MST lower bound for must-pass: MST({pos, MP1, MP2, ...}) + minGoalDist.
// Mirrors mcMSTLowerBound — uses shared _mstEdges/_ufPar globals.
function mpMSTLowerBound(pos, remain, level, prep) {
    const k = remain.length; // k >= 2
    const nodeCount = k + 1; // 0=pos, 1..k = MP[remain[...]]
    let eCount = 0;
    for (let a = 0; a < k; a++) {
        const d = _dget(prep.mpDistArrs[remain[a]], pos);
        if (!Number.isFinite(d)) return Infinity;
        _mstEdges[eCount * 3]     = d;
        _mstEdges[eCount * 3 + 1] = 0;
        _mstEdges[eCount * 3 + 2] = a + 1;
        eCount++;
    }
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const d = prep.mpPairDist[remain[a]][remain[b]];
            if (!Number.isFinite(d)) return Infinity;
            _mstEdges[eCount * 3]     = d;
            _mstEdges[eCount * 3 + 1] = a + 1;
            _mstEdges[eCount * 3 + 2] = b + 1;
            eCount++;
        }
    }
    for (let i = 1; i < eCount; i++) {
        const w = _mstEdges[i * 3], u = _mstEdges[i * 3 + 1], v = _mstEdges[i * 3 + 2];
        let j = i - 1;
        while (j >= 0 && _mstEdges[j * 3] > w) {
            _mstEdges[(j + 1) * 3]     = _mstEdges[j * 3];
            _mstEdges[(j + 1) * 3 + 1] = _mstEdges[j * 3 + 1];
            _mstEdges[(j + 1) * 3 + 2] = _mstEdges[j * 3 + 2];
            j--;
        }
        _mstEdges[(j + 1) * 3]     = w;
        _mstEdges[(j + 1) * 3 + 1] = u;
        _mstEdges[(j + 1) * 3 + 2] = v;
    }
    for (let i = 0; i < nodeCount; i++) _ufPar[i] = i;
    let mstW = 0, added = 0;
    for (let e = 0; e < eCount && added < nodeCount - 1; e++) {
        const pu = _ufFind(_mstEdges[e * 3 + 1]), pv = _ufFind(_mstEdges[e * 3 + 2]);
        if (pu !== pv) { _ufPar[pu] = pv; mstW += _mstEdges[e * 3]; added++; }
    }
    if (added < nodeCount - 1) return Infinity;
    let minGoal = Infinity;
    for (const i of remain) {
        const d = prep.mustPassToGoalDist[i];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// Lower bound: must visit every unsatisfied must-pass then reach goal.
// Uses per-cell max bound, upgraded to MST joint bound when ≥2 MPs remain
// (same pattern as mustCrossLowerBound — MST is tighter than max-of-individual).
function mustPassLowerBound(pos, state, level, prep) {
    const n = level.mustPassKeys.length;
    if (n === 0) return 0;
    // Use mpVisitedMask (uint32) — works for both DFS (mustMask=0) and beam.
    const mpAllMask = (1 << n) - 1;
    if ((state.mpVisitedMask & mpAllMask) === mpAllMask) return 0;
    const remain = [];
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if (state.mpVisitedMask & (1 << i)) continue;
        remain.push(i);
        const dToMp   = _dget(prep.mpDistArrs[i], pos);
        const dMpGoal = prep.mustPassToGoalDist[i];
        if (!Number.isFinite(dToMp) || !Number.isFinite(dMpGoal)) return Infinity;
        lb = Math.max(lb, dToMp + dMpGoal);
    }
    if (remain.length >= 2 && prep.mpPairDist) {
        const mst = mpMSTLowerBound(pos, remain, level, prep);
        if (!Number.isFinite(mst)) return Infinity;
        lb = Math.max(lb, mst);
    }
    return lb;
}

// Lower bound: must visit every unfinished must-cross at least once more, then reach goal.
// When a MC cell has already been crossed once, the 2nd pass must approach from the
// perpendicular axis — use the precomputed approach-cell distance map for a tighter bound.
// For ≥2 remaining MC cells, also uses an MST joint lower bound (tighter than max over
// individual bounds), which prunes wrong subtrees much earlier.
function mustCrossLowerBound(pos, state, level, prep) {
    if (state.mustCrossMask === 0) return 0;
    const n = level.mustCrossKeys.length;
    let lb = 0;
    const remain = [];
    for (let i = 0; i < n; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        remain.push(i);
        const dMcGoal = prep.mustCrossToGoalDist[i];
        if (!Number.isFinite(dMcGoal)) return Infinity;

        if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            // 2nd visit needed: must reach an approach cell on the perpendicular axis first.
            const mcKey  = level.mustCrossKeys[i];
            const usedH  = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const aMap   = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
            if (aMap.size > 0) {
                const dToApproach = aMap.get(pos) ?? Infinity;
                if (!Number.isFinite(dToApproach)) return Infinity;
                // approach cell → 1 step into MC → exit → goal
                lb = Math.max(lb, dToApproach + 1 + dMcGoal);
                continue;
            }
        }

        const d = _dget(prep.mcDistArrs[i], pos);
        if (!Number.isFinite(d)) return Infinity;
        lb = Math.max(lb, d + dMcGoal);
    }

    // MST joint bound: tighter than max-of-individual when ≥2 MC cells remain.
    if (remain.length >= 2 && prep.mcPairDist) {
        const mst = mcMSTLowerBound(pos, remain, state, level, prep);
        if (!Number.isFinite(mst)) return Infinity;
        lb = Math.max(lb, mst);
    }

    return lb;
}

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE); // generation tracking (32-bit avoids wrap)

// Connectivity prune: checks that goal + unsatisfied objectives are reachable from pos,
// and (for non-MC levels) that enough fresh cells exist to complete the path.
// Flood fill traverses cells that are either unvisited, or (if intersections still needed)
// visited exactly once. Gate cells (other than starting gate) are treated as walls.
// Volume check (V1 _checkTopology): freshCells + intNeeded >= rSteps prunes branches
// that are isolated in a sub-region too small to complete the required path length.
function isConnected(pos, state, level, prep) {
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    // Threshold: visited count allowed to pass through.
    //   0 intersections remaining: only unvisited cells (path acts as hard walls).
    //   N > 0 intersections remaining: cells visited up to twice are traversable.
    //   The original maxVisit=1 was wrong: after making one intersection (visited[A]=2),
    //   cell A still needs to be passable in BFS if we have intersection budget left.
    //   Cap at 2 rather than reqInt to bound BFS cost on high-intersection levels.
    const maxVisit = intNeeded > 0 ? 2 : 0;
    const hasMC = level.mustCrossKeys.length > 0;

    _reachGen++;
    const gen = _reachGen;
    let qHead = 0, qTail = 0;
    _reachGenBuf[pos] = gen;
    _reachQ[qTail++] = pos;
    // freshVolume counts reachable fresh cells + pos itself (matching V1's _checkTopology volume count).
    // Even though pos is already visited, V1 includes the start cell in its volume tally.
    let freshVolume = 1;

    while (qHead < qTail) {
        const k = _reachQ[qHead++];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        // Portal edge: if portal source is reachable, destination is too
        const portal = level.portalMap.get(k);
        if (portal) {
            const d = portal.dest;
            if (_reachGenBuf[d] !== gen && !level.blockSet.has(d) && !level.gooseSet.has(d) &&
                (state.visited[d] <= maxVisit || d === pos)) {
                _reachGenBuf[d] = gen;
                if (state.visited[d] === 0) freshVolume++;
                _reachQ[qTail++] = d;
            }
        }
        const addNeighbor = (nk) => {
            if (_reachGenBuf[nk] !== gen && !level.blockSet.has(nk) && !level.gooseSet.has(nk) &&
                !prep.gateSet.has(nk) && (state.visited[nk] <= maxVisit || nk === pos)) {
                _reachGenBuf[nk] = gen;
                if (state.visited[nk] === 0) freshVolume++;
                _reachQ[qTail++] = nk;
            }
        };
        if (x + 1 < w) addNeighbor(k + 1);
        if (x > 0)     addNeighbor(k - 1);
        if (y + 1 < h) addNeighbor(k + 0x10000);
        if (y > 0)     addNeighbor(k - 0x10000);
    }

    if (_reachGenBuf[level.goalKey] !== gen) return false;
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
    }
    // Volume check (mirrors V1's _checkTopology): not enough accessible fresh cells to finish.
    // Disabled for portal levels only (portal jumps visit a destination cell for 0 path
    // steps, inflating freshVolume). MC levels use the same formula since intNeeded
    // accounts for the extra revisit steps — the double-count concern was unfounded.
    const hasPortal = level.portalMap.size > 0;
    if (!hasPortal) {
        const rSteps = level.reqLen - (state.path.length - 1 - state.portalJumps);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

// Like isConnected but skips goal-reachability — for trap spot enumeration where
// any cell can be the endpoint and goal reachability is not required.
function isConnectedForTrap(pos, state, level, prep) {
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 1 : 0;

    _reachGen++;
    const gen = _reachGen;
    let qHead = 0, qTail = 0;
    _reachGenBuf[pos] = gen;
    _reachQ[qTail++] = pos;
    let freshVolume = 1;

    while (qHead < qTail) {
        const k = _reachQ[qHead++];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        const portal = level.portalMap.get(k);
        if (portal) {
            const d = portal.dest;
            if (_reachGenBuf[d] !== gen && !level.blockSet.has(d) && !level.gooseSet.has(d) &&
                (state.visited[d] <= maxVisit || d === pos)) {
                _reachGenBuf[d] = gen;
                if (state.visited[d] === 0) freshVolume++;
                _reachQ[qTail++] = d;
            }
        }
        const addNeighbor = (nk) => {
            if (_reachGenBuf[nk] !== gen && !level.blockSet.has(nk) && !level.gooseSet.has(nk) &&
                !prep.gateSet.has(nk) && (state.visited[nk] <= maxVisit || nk === pos)) {
                _reachGenBuf[nk] = gen;
                if (state.visited[nk] === 0) freshVolume++;
                _reachQ[qTail++] = nk;
            }
        };
        if (x + 1 < w) addNeighbor(k + 1);
        if (x > 0)     addNeighbor(k - 1);
        if (y + 1 < h) addNeighbor(k + 0x10000);
        if (y > 0)     addNeighbor(k - 0x10000);
    }

    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
    }
    const hasPortal = level.portalMap.size > 0;
    if (!hasPortal) {
        const rSteps = level.reqLen - (state.path.length - 1 - state.portalJumps);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

// DFS from startKey recording every cell that can serve as a valid false-goal location.
// A valid trap spot is any cell where a path of exactly reqLen steps from the gate
// satisfies all win conditions (length, intersections, must-pass, must-cross).
// Adds found cells to validSpots. Returns true on full completion, false on timeout.
//
// Forced-move optimisation: after taking a move, if the reached cell has exactly one
// valid forward neighbor we follow that chain inline without pushing stack frames,
// bundling all undo tokens onto a single frame at the first real branching point.
// Corridors that previously cost O(b^20) stack frames cost O(1) after compression.
async function dfsEnumerateTrapSpots(startKey, level, prep, budgetMs, startTime, validSpots, yieldFn) {
    const state = createState(startKey, level, prep);
    const mpN = level.mustPassKeys.length;
    const mpAllMask = mpN > 0 ? (1 << mpN) - 1 : 0;
    const mcN = level.mustCrossKeys.length;

    let nodesExpanded = 0;
    let lastYield = startTime;

    // Each frame: { key, children, childIdx, undoChain }
    // undoChain holds every applyMove undo needed to reach `key` from the previous
    // frame's key; popping the frame undoes them in reverse.
    const stack = [{ key: startKey, children: getNeighbors(startKey, state, level, prep), childIdx: 0, undoChain: [] }];

    while (stack.length > 0) {
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - startTime > budgetMs) return false;
            if (yieldFn && now - lastYield >= 16) { lastYield = now; await yieldFn(); }
        }

        const top = stack[stack.length - 1];

        if (top.childIdx >= top.children.length) {
            const ch = top.undoChain;
            for (let ui = ch.length - 1; ui >= 0; ui--) undoMove(ch[ui], state);
            stack.pop();
            continue;
        }

        // ── Apply move from top.key → next ────────────────────────────────────
        const next = top.children[top.childIdx++];
        const _pt = level.portalMap.get(top.key);
        const undo = applyMove(next, state, level, prep, !!(_pt && !state.lastWasPortalJump && _pt.dest === next));
        let curRealLen = state.path.length - 1 - state.portalJumps;

        // Basic pruning for the first step
        if (curRealLen > level.reqLen || state.ints > level.reqInt) { undoMove(undo, state); continue; }
        if (state.mustCrossMask !== 0 && mcN > 0 &&
            state.ints + _popcount(state.mustCrossMask) > level.reqInt) { undoMove(undo, state); continue; }
        if (curRealLen === level.reqLen) {
            if (state.ints === level.reqInt && state.mustCrossMask === 0 &&
                (mpAllMask === 0 || (state.mpVisitedMask & mpAllMask) === mpAllMask) &&
                !prep.trapInvalidSet.has(next)) validSpots.add(next);
            undoMove(undo, state);
            continue;
        }

        // ── Forced-move chain ─────────────────────────────────────────────────
        // Follow cells with exactly one valid neighbor without creating frames.
        const undoChain = [undo];
        let cur = next;
        let chainDone = false;
        let chainNeighbors = null;

        while (true) {
            const curNeighbors = getNeighbors(cur, state, level, prep);

            if (curNeighbors.length === 0) { chainDone = true; break; }

            if (curNeighbors.length !== 1) {
                // Real branching point — run full pruning once for the whole chain
                const rSteps = level.reqLen - curRealLen;

                if (mpAllMask !== 0 && (state.mpVisitedMask & mpAllMask) !== mpAllMask) {
                    let mpLB = 0;
                    for (let i = 0; i < mpN; i++) {
                        if (state.mpVisitedMask & (1 << i)) continue;
                        const d = _dget(prep.mpDistArrs[i], cur);
                        if (!Number.isFinite(d)) { mpLB = Infinity; break; }
                        if (d > mpLB) mpLB = d;
                    }
                    if (!Number.isFinite(mpLB) || mpLB > rSteps) { chainDone = true; break; }
                }

                if (state.mustCrossMask !== 0) {
                    let mcLB = 0;
                    for (let i = 0; i < mcN; i++) {
                        if ((state.mustCrossMask & (1 << i)) === 0) continue;
                        const d = _dget(prep.mcDistArrs[i], cur);
                        if (!Number.isFinite(d)) { mcLB = Infinity; break; }
                        if (d > mcLB) mcLB = d;
                    }
                    if (!Number.isFinite(mcLB) || mcLB > rSteps) { chainDone = true; break; }
                }

                if (level.reqInt - state.ints > rSteps) { chainDone = true; break; }

                if (!isConnectedForTrap(cur, state, level, prep)) { chainDone = true; break; }

                chainNeighbors = curNeighbors;
                break;
            }

            // Forced move: exactly 1 neighbor — apply inline, no frame
            const forcedNext = curNeighbors[0];
            const _pc = level.portalMap.get(cur);
            const forcedUndo = applyMove(forcedNext, state, level, prep, !!(_pc && !state.lastWasPortalJump && _pc.dest === forcedNext));
            curRealLen = state.path.length - 1 - state.portalJumps;

            // Light pruning after each forced step
            if (curRealLen > level.reqLen || state.ints > level.reqInt) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (state.mustCrossMask !== 0 && mcN > 0 &&
                state.ints + _popcount(state.mustCrossMask) > level.reqInt) {
                undoMove(forcedUndo, state); chainDone = true; break;
            }
            if (curRealLen === level.reqLen) {
                if (state.ints === level.reqInt && state.mustCrossMask === 0 &&
                    (mpAllMask === 0 || (state.mpVisitedMask & mpAllMask) === mpAllMask) &&
                    !prep.trapInvalidSet.has(forcedNext)) validSpots.add(forcedNext);
                undoMove(forcedUndo, state); chainDone = true; break;
            }

            undoChain.push(forcedUndo);
            cur = forcedNext;
        }

        if (chainDone) {
            for (let ui = undoChain.length - 1; ui >= 0; ui--) undoMove(undoChain[ui], state);
            continue;
        }

        // Push a single frame at the branching point with the bundled undo chain
        stack.push({ key: cur, children: chainNeighbors, childIdx: 0, undoChain });
    }
    return true;
}

// Finds all valid trap spot positions across all gates. Returns a result object
// compatible with APP.Solver.findTrapSpots: { ok, status, spots, timedOut, gatesProcessed, elapsedMs, timeLimit }.
async function findTrapSpotsV2(level, opts = {}) {
    const startTime = Date.now();
    const budgetMs = opts.timeLimit ?? 30000;
    const yieldFn = opts.yieldFn ?? null;
    const prep = prepLevel(level);
    const validSpots = new Set();
    let gatesProcessed = 0;
    let timedOut = false;

    for (const gateKey of level.gateKeys) {
        if (Date.now() - startTime >= budgetMs) { timedOut = true; break; }
        let completed;
        try {
            completed = await dfsEnumerateTrapSpots(gateKey, level, prep, budgetMs, startTime, validSpots, yieldFn);
        } catch (err) {
            if (err?.message === 'SolverV2:cancelled') {
                return { ok: false, status: 'aborted', spots: validSpots, timedOut: false, gatesProcessed, elapsedMs: Date.now() - startTime, timeLimit: budgetMs };
            }
            completed = false;
        }
        gatesProcessed++;
        if (!completed) { timedOut = true; break; }
    }

    const elapsedMs = Date.now() - startTime;
    return { ok: true, status: timedOut ? 'timeout' : 'done', spots: validSpots, timedOut, gatesProcessed, elapsedMs, timeLimit: budgetMs };
}

// ─── Move scoring ─────────────────────────────────────────────────────────────

// Score a candidate move `target` from `pos` in `state`.
// Higher score = better (explored first).
// prep._cfg: optional ablation config — null means all features enabled (default behaviour).
function scoreMoveV2(target, pos, state, level, prep, profile, rStepsAfterMove, template) {
    const w = profile.goalAttractionWeight       ?? 1;
    const wo = profile.objectiveAttractionWeight  ?? 1;
    const wf = profile.finishCommitmentWeight     ?? 1;
    const wp = profile.perimeterBiasWeight        ?? 1;
    const wmp = profile.mustPassUrgencyWeight     ?? 1;
    const wmc = profile.mustCrossUrgencyWeight    ?? 1;
    const wi = profile.intersectionSetupWeight    ?? 1;
    const wad = profile.antiDeadCorridorWeight    ?? 1;
    const wdt = profile.antiDitherWeight          ?? 1;
    const wrv = profile.revisitPenaltyWeight      ?? 1;

    const cfg = prep._cfg; // null when no ablation config (fast-path: !cfg is true → run normally)

    // Phase-based multipliers — mirroring V1's harvest/finish phase policy.
    // Harvest (early path, rRatio < 0.45): weaken goal pull so the DFS builds
    // structural layout before committing to a direction.
    // Finish (late path, rRatio > 0.82): strengthen goal pull to commit to ending.
    const rRatio = level.reqLen > 0 ? Math.max(0, 1 - rStepsAfterMove / level.reqLen) : 1;
    let phaseGoalScale = 1.0;
    if (rRatio < 0.45) {
        phaseGoalScale = 0.65 + (rRatio / 0.45) * 0.35;  // 0.65 at rRatio=0, 1.0 at 0.45
    } else if (rRatio > 0.82) {
        const t = (rRatio - 0.82) / 0.18;
        phaseGoalScale = 1.0 + t * 1.8;                   // 1.0 at 0.82, 2.8 at 1.0
    }
    // Phase-based perimeter scaling: mirrors V1's harvest→knot transition.
    // V1 drops perimeterBias from 1.65 (harvest) to 0.45 (knot) so the solver can
    // leave the perimeter to build intersections / MC crossings in the mid phase.
    // Only applies to directional CW/CCW templates to avoid disturbing non-perimeter configs.
    const phasePerimScale = (template && template.perimeterDir && rRatio > 0.45)
        ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)  // 1.0→0.22 over rRatio 0.45→1.0
        : 1.0;

    // Ablation: when SCORE_PHASE_SCALING is disabled, all phase multipliers collapse to 1.0.
    const _phaseGoalScale  = (!cfg || cfg.SCORE_PHASE_SCALING) ? phaseGoalScale  : 1.0;
    const _phasePerimScale = (!cfg || cfg.SCORE_PHASE_SCALING) ? phasePerimScale : 1.0;

    let score = 0;

    // Goal attraction: reward moves that reduce distance to goal
    const goalDistCur    = _dget(prep.goalDistArr, pos);
    const goalDistTarget = _dget(prep.goalDistArr, target);
    if (!cfg || cfg.SCORE_GOAL_ATTRACTION) {
        if (Number.isFinite(goalDistCur) && Number.isFinite(goalDistTarget)) {
            const gain = goalDistCur - goalDistTarget;
            score += w * _phaseGoalScale * gain * 10;
        }
    }

    // Finish commitment: bonus when close to goal (small rSteps)
    if (!cfg || cfg.SCORE_FINISH_COMMITMENT) {
        if (rStepsAfterMove <= 4 && Number.isFinite(goalDistTarget)) {
            score += wf * (5 - rStepsAfterMove) * 8;
        }
    }

    // Objective attraction: reward moves toward nearest unsatisfied objective
    if ((!cfg || cfg.SCORE_OBJECTIVE_ATTRACTION) && (state.mustMask !== 0 || state.mustCrossMask !== 0)) {
        let bestObjDist = Infinity;
        for (let oi = 0; oi < prep.objectiveKeys.length; oi++) {
            const objKey = prep.objectiveKeys[oi];
            const mpIdx = prep.mustPassIndex.get(objKey);
            const mcIdx = prep.mustCrossIndex.get(objKey);
            const satisfied = (mpIdx !== undefined && (state.mustMask & (1 << mpIdx)) === 0)
                           || (mcIdx !== undefined && (state.mustCrossMask & (1 << mcIdx)) === 0);
            if (satisfied) continue;
            const d = _dget(prep.objDistArrs[oi], target);
            if (Number.isFinite(d)) bestObjDist = Math.min(bestObjDist, d);
        }
        if (Number.isFinite(bestObjDist)) {
            score += wo * (10 / (1 + bestObjDist));
        }
    }

    // Must-pass urgency: bonus for moving toward must-pass
    if ((!cfg || cfg.SCORE_MUST_PASS_URGENCY) && state.mustMask !== 0) {
        for (let i = 0; i < level.mustPassKeys.length; i++) {
            if ((state.mustMask & (1 << i)) === 0) continue;
            const dCur    = _dget(prep.mpDistArrs[i], pos);
            const dTarget = _dget(prep.mpDistArrs[i], target);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 5;
            }
        }
    }

    // Must-cross urgency
    if ((!cfg || cfg.SCORE_MUST_CROSS_URGENCY) && state.mustCrossMask !== 0) {
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
            if ((state.mustCrossMask & (1 << i)) === 0) continue;

            // 2nd-visit approach guidance (independently togglable)
            if ((!cfg || cfg.SCORE_MC_APPROACH_GUIDANCE) && state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
                // 2nd visit needed: guide toward the perpendicular-axis approach cells,
                // not the MC cell itself (which is axis-blocked from the used direction).
                const mcKey = level.mustCrossKeys[i];
                const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
                const aMap  = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
                if (aMap.size > 0) {
                    const dCur    = aMap.get(pos)    ?? Infinity;
                    const dTarget = aMap.get(target) ?? Infinity;
                    if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                        score += wmc * (dCur - dTarget) * 15;
                    }
                    continue;
                }
            }

            // 1st visit (or approach map unavailable / guidance disabled): standard urgency
            const dCur    = _dget(prep.mcDistArrs[i], pos);
            const dTarget = _dget(prep.mcDistArrs[i], target);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmc * (dCur - dTarget) * 5;
            }
        }
    }

    // Flipping filter approach urgency (harvest phase only, rRatio < 0.45).
    // Rewards moves toward the entry zone of each accessible unused flipper.
    // This is critical when flipper access is order-dependent (global-flip rule):
    // e.g. L140 where F2 (axisV) must be approached from above/below before F1 becomes
    // accessible from a non-flipper cell — without this urgency the beam/DFS goes west
    // toward the nearer MC/MP cells and never reaches the east-side flippers.
    // Scale 2.0: strong enough to overcome goal-attraction bias (~6.5/step) without
    // dominating the scoring at later phases where we need intersection flexibility.
    if ((!cfg || cfg.SCORE_FLIPPER_URGENCY) && rRatio < 0.45 && prep.flipperApproachEven.length > 0) {
        const _parityOdd = (_popcount(state.flipperUsedMask) & 1) === 1;
        const _aMaps = _parityOdd ? prep.flipperApproachOdd : prep.flipperApproachEven;
        for (let _fi = 0; _fi < _aMaps.length; _fi++) {
            if (state.flipperUsedMask & (1 << _fi)) continue;
            const _aMap = _aMaps[_fi];
            if (_aMap.size === 0) continue;
            const _dCur    = _aMap.get(pos)    ?? Infinity;
            const _dTarget = _aMap.get(target) ?? Infinity;
            if (Number.isFinite(_dCur) && Number.isFinite(_dTarget)) {
                score += 2.0 * (_dCur - _dTarget) * 5;
            }
        }
    }

    // Intersection setup: reward second visit to a non-gate, non-goal cell if ints needed
    if (!cfg || cfg.SCORE_INTERSECTION_SETUP) {
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateSet.has(target)) {
            score += wi * 12;
        } else if (intNeeded > 0) {
            score += wi * 1;
        }
    }

    // Perimeter bias: prefer cells on the grid edge
    if (!cfg || cfg.SCORE_PERIMETER_BIAS) {
        const gw = level.grid.w, gh = level.grid.h;
        const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
        if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * _phasePerimScale * 3;
    }

    // Anti-dither: penalise immediate U-turns
    if ((!cfg || cfg.SCORE_ANTI_DITHER) && state.path.length >= 2) {
        const prevPrev = state.path[state.path.length - 2];
        if (prevPrev === target) score -= wdt * 15;
    }

    // Revisit penalty
    if ((!cfg || cfg.SCORE_REVISIT_PENALTY) && state.visited[target] > 0) score -= wrv * 8;

    // Structural template bias (overrides/supplements profile heuristics)
    if ((!cfg || cfg.SCORE_TEMPLATE_BONUS) && template) score += computeTemplateBonus(target, pos, level, template, rRatio);

    return score;
}

// ─── Solution check ───────────────────────────────────────────────────────────

function isSolution(state, level) {
    if (state.path[state.path.length - 1] !== level.goalKey) return false;
    const realLen = state.path.length - 1 - state.portalJumps;
    if (realLen !== level.reqLen) return false;
    if (state.ints !== level.reqInt)         return false;
    if (state.mustMask !== 0)               return false;
    if (state.mustCrossMask !== 0)          return false;
    // Dense-level DFS (density≥0.70) keeps mustMask=0 to avoid disrupting near-Hamiltonian
    // orderings. For those levels the mustMask check above always passes, so we enforce
    // must-pass correctness via mpVisitedMask. For all other paths this check is redundant
    // with mustMask but harmless — both fields are always kept in sync.
    const n = level.mustPassKeys.length;
    if (n > 0 && (state.mpVisitedMask & ((1 << n) - 1)) !== ((1 << n) - 1)) return false;
    return true;
}

// ─── Core DFS ─────────────────────────────────────────────────────────────────

// Iterative DFS from `startKey` using policy `profile` (and optional `template`).
// levelStartTime + levelBudgetMs: hard wall-clock cap for the whole level.
// maxDiscrepancy: Limited Discrepancy Search bound. A "discrepancy" is choosing a
//   non-greedy child; the j-th best child (0-indexed) costs j discrepancies. With
//   maxDiscrepancy=Infinity this is plain best-first DFS (original behaviour). With a
//   finite bound it explores only paths within `maxDiscrepancy` deviations of greedy —
//   recovering from a small number of wrong early ordering decisions (the diagnosed
//   failure mode) while remaining complete as the bound grows.
// Returns the solution path (array of keys) or null on timeout/failure.
async function dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, maxDiscrepancy = Infinity, yieldFn = null, out = null) {
    const state = createState(startKey, level, prep);
    const cfg = prep._cfg; // null = no ablation (all features enabled)

    // Stack entry: { key, children, childIdx, undoInfo, disc } where disc = cumulative
    // discrepancy to REACH this node (sum of chosen child-indices along the path).
    const children0 = getNeighbors(startKey, state, level, prep);
    scoreAndSort(children0, startKey, state, level, prep, profile, template);
    const stack = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;
    let lastYield = levelStartTime;

    while (stack.length > 0) {
        // Budget + yield check every 256 nodes.
        if ((++nodesExpanded & 255) === 0) {
            const now = Date.now();
            if (now - levelStartTime > levelBudgetMs) { if (out) out.timedOut = true; return null; }
            if (yieldFn && now - lastYield >= 16) {
                lastYield = now;
                await yieldFn();
            }
        }

        const top = stack[stack.length - 1];
        if (top.childIdx >= top.children.length) {
            if (top.undoInfo) undoMove(top.undoInfo, state);
            stack.pop();
            continue;
        }

        // LDS: the child at index ci costs ci discrepancies on top of this node's disc.
        // Children are sorted best-first, so once a child exceeds the budget every later
        // child does too — exhaust the node immediately.
        const ci = top.childIdx++;
        const childDisc = top.disc + ci;
        if (childDisc > maxDiscrepancy) { top.childIdx = top.children.length; continue; }

        const next = top.children[ci];
        const portal = level.portalMap.get(top.key);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);

        const undo = applyMove(next, state, level, prep, isPortalJump);

        const realLen = state.path.length - 1 - state.portalJumps;

        // Over-length prune (fundamental — always on)
        if (realLen > level.reqLen) { undoMove(undo, state); continue; }

        // Over-intersection prune (fundamental — always on)
        if (state.ints > level.reqInt) { undoMove(undo, state); continue; }

        // Intersection ceiling: ints + remaining_MC_crossings must not exceed reqInt.
        // Each pending MC cell will contribute exactly 1 intersection (its 2nd-axis visit).
        // If current ints + guaranteed future MC ints already exceeds reqInt, prune.
        // This eliminates paths with non-MC crossings on levels where all intersections
        // must come from MC cells (e.g. L53: mc=3, reqInt=3 → zero non-MC crossings).
        if ((!cfg || cfg.PRUNE_MC_CEILING) && state.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
            const mcRemaining = _popcount(state.mustCrossMask);
            if (state.ints + mcRemaining > level.reqInt) { undoMove(undo, state); continue; }
        }

        // Solution check (only when at goal)
        if (next === level.goalKey) {
            if (isSolution(state, level)) {
                if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
                return state.path.slice();
            }
            undoMove(undo, state); continue;
        }

        const rSteps = level.reqLen - realLen;

        // Distance bound: min steps from next to goal must fit in remaining steps
        if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
            const goalDist = _dget(prep.goalDistArr, next);
            if (!Number.isFinite(goalDist) || goalDist > rSteps) { undoMove(undo, state); continue; }
        }

        // Parity pruning (V1 line 6559): on a portal-free grid every step flips (x+y)%2.
        // Always apply at depth 1 (catches globally infeasible gates, e.g. L53 gate 2).
        // Apply deep parity (full DFS) only for corridor-rich levels (≥10 blocks): these
        // levels have tightly constrained paths where parity cuts many dead-end corridors.
        // For open levels with few blocks, deep parity changes search order adversely.
        if ((!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
            const posP  = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
            const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
            const firstStep = (realLen === 1);
            if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
                undoMove(undo, state); continue;
            }
        }

        // Must-pass lower bound: dist(next→MP) + dist(MP→goal) ≤ rSteps
        if ((!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
            const mpLB = mustPassLowerBound(next, state, level, prep);
            if (!Number.isFinite(mpLB) || mpLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Must-cross lower bound: dist(next→MC) + dist(MC→goal) ≤ rSteps
        if ((!cfg || cfg.PRUNE_MUST_CROSS_LB) && state.mustCrossMask !== 0) {
            const mcLB = mustCrossLowerBound(next, state, level, prep);
            if (!Number.isFinite(mcLB) || mcLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Intersection deficit: can't create more than rSteps intersections
        if (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) {
            const intNeeded = level.reqInt - state.ints;
            if (intNeeded > rSteps) { undoMove(undo, state); continue; }
        }

        // Connectivity + volume check: every 64 nodes and always near end.
        if ((!cfg || cfg.PRUNE_CONNECTIVITY) && (rSteps <= 10 || (nodesExpanded & 63) === 0)) {
            if (!isConnected(next, state, level, prep)) { undoMove(undo, state); continue; }
        }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile, template);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    if (prep._metrics) prep._metrics.nodesExpanded += nodesExpanded;
    return null;
}

// Iterative-deepening LDS wrapper. Runs a geometric ladder of discrepancy bounds —
// cheap low-k probes first (find close-to-greedy solutions fast), ending with an
// UNBOUNDED wave that is identical to plain best-first DFS. Ending unbounded guarantees
// LDS never loses plain-DFS's reach: a level whose solution is far from greedy still
// gets a full sweep in the final wave (preventing regressions like L26). Each wave
// re-explores the lower-k region (LDS redundancy), but low-k waves are cheap and the
// final unbounded wave dominates cost, so the overhead is bounded.
// Limited Discrepancy Search wrapper, two phases:
//   1. CHEAP PROBE: discrepancy bounds k ∈ {0,1,2,4,8}, hard-capped at probeCapMs total.
//      Empirically every close-to-greedy solution (L61, L79, L136, L143, L147) is found
//      by k=8 in under 1.3s, so a small cap suffices and the bounded trees exhaust fast.
//   2. UNBOUNDED FALLBACK: plain best-first DFS (k=∞) with all remaining budget. This is
//      bit-for-bit the original solver, so levels whose solution is far from greedy
//      (e.g. L26) keep essentially the full DFS budget — no regression.
// The hard cap on phase 1 is what prevents the probe waves from starving phase 2.
const _LDS_PROBE_K = [0, 1, 2, 4, 8];
const _LDS_DEBUG = typeof process !== 'undefined' && process.env && process.env.PF_LDS_DEBUG === '1';
async function dfsFromGateLDS(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, yieldFn) {
    const cfg = prep._cfg;
    // When STRATEGY_LDS is disabled, skip probe waves and run plain best-first DFS directly.
    if (cfg && !cfg.STRATEGY_LDS) {
        return dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn);
    }
    const probeCapMs = Math.min(Math.floor(levelBudgetMs * 0.5), 4000);
    for (const k of _LDS_PROBE_K) {
        if (yieldFn) await yieldFn();
        const w0 = Date.now();
        const probeOut = { timedOut: false };
        const path = await dfsFromGate(startKey, level, prep, profile, probeCapMs, levelStartTime, template, k, yieldFn, probeOut);
        if (_LDS_DEBUG) console.error(`    [lds] k=${k} ${Date.now()-w0}ms ${path?'SOLVED':probeOut.timedOut?'timeout':'exhausted'}`);
        if (path) return path;
        if (probeOut.timedOut) break;
    }
    if (Date.now() - levelStartTime >= levelBudgetMs) return null;
    if (yieldFn) await yieldFn();
    const path = await dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity, yieldFn);
    if (_LDS_DEBUG) console.error(`    [lds] k=Inf ${path?'SOLVED':'-'}`);
    return path;
}

// ─── Beam search ─────────────────────────────────────────────────────────────

// Reset ws back to start-of-level (single occupied cell: startKey).
// Zeros only the cells in ws.path (O(path_length)), not the full KEY_SPACE arrays.
function _beamResetState(ws, startKey, level, prep) {
    const wsP = ws.path, wsN = wsP.length;
    for (let i = 0; i < wsN; i++) {
        const k = wsP[i];
        ws.visited[k]   = 0;
        ws.edgeUsage[k] = 0;
    }
    wsP.length = 1; wsP[0] = startKey;
    ws.ints = 0; ws.portalJumps = 0; ws.lastWasPortalJump = false;
    ws.mustMask         = prep.initialMustMask;
    ws.mustCrossMask    = prep.initialMustCrossMask;
    ws.mpVisitedMask    = 0;
    ws.flipperUsedMask  = 0;
    ws.crossCounts.fill(0);
    ws.visited[startKey] = 1;
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) {
        ws.mustMask &= ~(1 << mpIdx);
        ws.mpVisitedMask |= (1 << mpIdx);
    }
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) ws.crossCounts[mcIdx] = 1;
    const _fsi = prep.flipperIndexMap.get(startKey);
    if (_fsi !== undefined) ws.flipperUsedMask |= (1 << _fsi);
}

// Diverse beam selection: guarantee each (flipperUsedMask, mustCrossMask) bucket
// retains at least floor(beamWidth/numBuckets) candidates. The remaining slots
// are filled from the global top of the score-sorted list.
// `sorted` must already be sorted descending by score; each entry carries `.sk`
// (stateKey = (flipperUsedMask << 4) | mustCrossMask, packed at candidate creation).
function _diverseSelect(sorted, beamWidth) {
    const buckets = new Map();
    for (const c of sorted) {
        let b = buckets.get(c.sk);
        if (!b) { b = []; buckets.set(c.sk, b); }
        b.push(c);
    }
    const nb = buckets.size;
    if (nb <= 1) return sorted.slice(0, beamWidth);

    const guaranteed = Math.max(1, Math.floor(beamWidth / nb));
    const result = [];
    const added = new Set();

    for (const bucket of buckets.values()) {
        const take = Math.min(guaranteed, bucket.length);
        for (let i = 0; i < take; i++) { result.push(bucket[i]); added.add(bucket[i]); }
    }
    for (const c of sorted) {
        if (result.length >= beamWidth) break;
        if (!added.has(c)) result.push(c);
    }
    return result;
}

// Synchronous beam search using parent-pointer frontier nodes to eliminate
// O(depth) path-array copies. Each frontier entry is { key, prev, depth, score };
// depth is stored to avoid a length-counting pass during reconstruction.
// The path is reconstructed into a reusable scratch array only when needed.
// diverseBeam: if true, use _diverseSelect to maintain candidate diversity across
// flipper and must-cross constraint states (prevents beam collapse to one structural mode).
async function beamSearchFromGate(startKey, level, prep, profile, budgetMs, startTime, template, beamWidth, yieldFn, diverseBeam) {
    const ws = createState(startKey, level, prep);
    const cfg = prep._cfg;
    // State dedup: safe when there are no portals (portals aren't captured in sc).
    // Ablation: STRATEGY_STATE_DEDUP can disable this optimisation independently.
    const useStateDedup = level.portalMap.size === 0 && (!cfg || cfg.STRATEGY_STATE_DEDUP);
    // Ablation: STRATEGY_DIVERSE_BEAM can disable diverse selection even when the config requests it.
    const effectiveDiverseBeam = diverseBeam && (!cfg || cfg.STRATEGY_DIVERSE_BEAM);
    // Root node: prev=null, key=startKey, depth=0
    let frontier = [{ key: startKey, prev: null, depth: 0, score: 0, sc: 0 }];
    let lastYield = startTime;
    // Work-based budget: beam search terminates in at most reqLen + portal-pair phases.
    const maxPhases = level.reqLen + Math.floor(level.portalMap.size / 2);
    let phasesCompleted = 0;
    // Reusable scratch array for path reconstruction from parent pointers
    const _scratch = [];

    const yieldIfNeeded = async () => {
        if (!yieldFn) return false;
        const now = Date.now();
        if (now - lastYield < 16) return false;
        lastYield = now;
        await yieldFn(); // throws on cancellation
        return true;
    };

    while (frontier.length > 0) {
        if (phasesCompleted >= maxPhases) return null;
        phasesCompleted++;
        if (yieldFn) {
            await yieldFn(); // yield between beam passes; throws on cancellation
            lastYield = Date.now();
        }

        const cands = [];
        let frontierIndex = 0;

        for (const node of frontier) {
            if (((++frontierIndex) & 255) === 0) {
                await yieldIfNeeded();
            }

            // Reconstruct path from parent-pointer chain into _scratch.
            // node.depth stores path length-1, so one traversal suffices (no length-count pass).
            const len = node.depth + 1;
            _scratch.length = len;
            let cur = node;
            for (let i = len - 1; i >= 0; i--) { _scratch[i] = cur.key; cur = cur.prev; }

            // Reset ws to startKey state, then replay the reconstructed path
            _beamResetState(ws, startKey, level, prep);
            for (let i = 1; i < len; i++) {
                const from = _scratch[i - 1], to = _scratch[i];
                const p = level.portalMap.get(from);
                const isJump = !!(p && !ws.lastWasPortalJump && p.dest === to);
                applyMove(to, ws, level, prep, isJump);
            }

            const pos = node.key;
            if (pos === level.goalKey) {
                if (isSolution(ws, level)) return _scratch.slice();
                continue;
            }

            const neighbors = getNeighbors(pos, ws, level, prep);
            let _beamNeighborCount = neighbors.length;
            for (const next of neighbors) {
                const pAtPos = level.portalMap.get(pos);
                const isJump = !!(pAtPos && !ws.lastWasPortalJump && pAtPos.dest === next);
                const undo = applyMove(next, ws, level, prep, isJump);
                const realLen = ws.path.length - 1 - ws.portalJumps;
                const rSteps  = level.reqLen - realLen;
                let ok = realLen <= level.reqLen && ws.ints <= level.reqInt; // fundamental, always on

                if (ok && (!cfg || cfg.PRUNE_MC_CEILING) && ws.mustCrossMask !== 0) {
                    if (ws.ints + _popcount(ws.mustCrossMask) > level.reqInt) ok = false;
                }
                if (ok && next === level.goalKey) {
                    if (isSolution(ws, level)) {
                        // ws.path is already [startKey, ..., pos, next] — return it
                        const sol = ws.path.slice();
                        undoMove(undo, ws);
                        if (prep._metrics) prep._metrics.nodesExpanded += frontierIndex + _beamNeighborCount;
                        return sol;
                    }
                    ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_DISTANCE_BOUND)) {
                    const gd = _dget(prep.goalDistArr, next);
                    if (!Number.isFinite(gd) || gd > rSteps) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
                    const pp = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
                    const gp = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
                    if ((realLen === 1 || level.blockSet.size >= 10) && ((pp ^ gp ^ (rSteps & 1)) !== 0)) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
                    const lb = mustPassLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_MUST_CROSS_LB) && ws.mustCrossMask !== 0) {
                    const lb = mustCrossLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) && (level.reqInt - ws.ints) > rSteps) ok = false;
                // Connectivity: check near end and every 8 path steps
                if (ok && (!cfg || cfg.PRUNE_CONNECTIVITY) && (rSteps <= 20 || (realLen & 7) === 0)) {
                    if (!isConnected(next, ws, level, prep)) ok = false;
                }
                if (ok) {
                    const mv = scoreMoveV2(next, pos, ws, level, prep, profile, rSteps, template);
                    const sc = (ws.flipperUsedMask << 12) | (ws.mustCrossMask << 8) | (ws.mpVisitedMask << 4) | (ws.ints & 0xF);
                    // Parent-pointer node — O(1) instead of O(depth) path copy.
                    // sk = stateKey: (flipperUsedMask<<4)|mustCrossMask — used by _diverseSelect
                    // to bucket candidates and prevent beam collapse to one constraint-state mode.
                    if (effectiveDiverseBeam) {
                        cands.push({ key: next, prev: node, depth: node.depth + 1, score: node.score + mv,
                                     sk: (ws.flipperUsedMask << 4) | (ws.mustCrossMask & 0xF), sc });
                    } else {
                        cands.push({ key: next, prev: node, depth: node.depth + 1, score: node.score + mv, sc });
                    }
                }
                undoMove(undo, ws);
            }
        }

        if (cands.length === 0) break;
        await yieldIfNeeded();
        if (cands.length > beamWidth) {
            // State-based deduplication: candidates sharing (position, constraint-state) are merged —
            // only the highest-scoring path to each (cell, flipper+MC+MP+ints) combo survives.
            // Uses a single float64 Map key: key + sc * KEY_SPACE (exact for key<2^20, sc<2^16).
            // Disabled for portal levels — portal usage isn't captured in sc, so merging would be
            // incorrect (two paths at the same cell may have used different portals).
            let pool = cands;
            if (useStateDedup) {
                const dm = new Map();
                for (const c of cands) {
                    const dk = c.key + c.sc * KEY_SPACE;
                    const p = dm.get(dk);
                    if (!p || c.score > p.score) dm.set(dk, c);
                }
                if (dm.size < cands.length) pool = [...dm.values()];
            }
            pool.sort((a, b) => b.score - a.score);
            await yieldIfNeeded();
            frontier = effectiveDiverseBeam ? _diverseSelect(pool, beamWidth) : pool.slice(0, beamWidth);
        } else {
            frontier = cands;
        }
    }
    if (prep._metrics) prep._metrics.nodesExpanded += frontierIndex;
    return null;
}

// Reusable scratch buffer for scoreAndSort (max 4 neighbors on a 4-directional grid).
const _sas = new Float64Array(4); // scores indexed by neighbor position
// Sort neighbors in-place: best-first at index 0 (DFS iterates with childIdx++).
function scoreAndSort(neighbors, pos, state, level, prep, profile, template) {
    const n = neighbors.length;
    if (n <= 1) return;
    const realLen = state.path.length - 1 - state.portalJumps;
    const portalEntry = level.portalMap.get(pos);
    for (let i = 0; i < n; i++) {
        const nk = neighbors[i];
        const isJump = !!(portalEntry && portalEntry.dest === nk);
        const nRSteps = level.reqLen - realLen - (isJump ? 0 : 1);
        _sas[i] = scoreMoveV2(nk, pos, state, level, prep, profile, nRSteps, template);
    }
    // Insertion sort (tiny arrays ≤4)
    for (let i = 1; i < n; i++) {
        const si = _sas[i], ki = neighbors[i];
        let j = i - 1;
        while (j >= 0 && _sas[j] < si) { _sas[j + 1] = _sas[j]; neighbors[j + 1] = neighbors[j]; j--; }
        _sas[j + 1] = si; neighbors[j + 1] = ki;
    }
}

// ─── Archetype detection ──────────────────────────────────────────────────────

function detectArchetype(level) {
    const _navArea = Math.max(1, level.grid.w * level.grid.h
        - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size
        - level.gateKeys.length);
    const density = level.reqLen / _navArea;
    // Near-closure: sparse path needing at most 1 intersection — essentially a near-loop.
    // Classify before portal-heavy so sparse 2-portal levels aren't mis-routed.
    if (level.reqInt <= 1 && density < 0.35) return 'near-closure';
    // High-intersection: dense AND many intersections, OR extreme intersection count.
    // Second clause catches density 0.45-0.54 with reqInt≥5 (e.g. L61, L143)
    // and near-Hamiltonian density≥0.55 with reqInt≥4 (e.g. L147).
    if ((level.reqInt >= 5 && density >= 0.45) || (level.reqInt >= 4 && density >= 0.55) || level.reqInt >= 10) return 'high-intersection-burden';
    if (level.mustCrossKeys.length >= 2 && level.reqInt >= 2) return 'must-cross-heavy';
    if ((level.portalMap?.size || 0) >= 4) return 'portal-heavy';
    return 'default';
}

// Build ordered attempt configs for this level's archetype.
// Template attempts lead (matches V1's winning strategy for most grid levels).
function getAttemptConfigs(level) {
    const arch = detectArchetype(level);
    // Walkable density: excludes blocks/geese/false-goals/gates — same formula as detectArchetype.
    const _navArea = Math.max(1, level.grid.w * level.grid.h - level.blockSet.size
        - level.gooseSet.size - level.falseGoalKeys.size - level.gateKeys.length);
    const navDensity = level.reqLen / _navArea;

    // Near-closure: the path is a near-loop — goal attraction dominates.
    // harvestThenFinish placed 2nd (after nearClosureRescue) to handle single-gate
    // near-closure levels like L108 without wasting budget on finishFirst/perimeterSweep.
    if (arch === 'near-closure') {
        const closureFirst = ['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep',
            ...PROFILE_ORDER.filter(p => !['nearClosureRescue', 'harvestThenFinish', 'finishFirst', 'perimeterSweep'].includes(p))];
        return [
            ...closureFirst.map(p => ({ profileName: p, template: null })),
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
        ];
    }

    // High-intersection: two sub-cases split by reqInt.
    if (arch === 'high-intersection-burden') {
        if (level.reqInt >= 7) {
            // Very high reqInt (L136=8, L144=11, L146=8).
            // Beam search first for maximum budget; DFS fallbacks for levels that
            // beam can't find directly (L136: DFS intersectionHarvest wins in 66ms).
            // Portal-dense levels (L146: portals=4): objectiveFirst guides the beam
            // toward portal transitions better than pure intersection harvest.
            // Non-portal levels (L136, L144): intersectionHarvest bw=5000 wins directly.
            if ((level.portalMap?.size || 0) >= 2) {
                return [
                    { profileName: 'objectiveFirst',      template: null, beamWidth: 5000 },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 5000 },
                    { profileName: 'objectiveFirst',      template: null },
                    { profileName: 'intersectionHarvest', template: null },
                ];
            }
            return [
                { profileName: 'intersectionHarvest', template: null, beamWidth: 5000 },
                { profileName: 'objectiveFirst',      template: null, beamWidth: 5000 },
                { profileName: 'intersectionHarvest', template: null },
                { profileName: 'objectiveFirst',      template: null },
            ];
        }
        // Medium-high reqInt (L130=5, L147=6).
        // V1 solved L130 in 362ms via perimeterCW template; L143 via perimeterCCW 1.7s.
        // Beam variants placed first so they receive the larger share of budget;
        // DFS fallbacks cover L143/L147 which already pass via DFS.
        //
        // Long-path multi-gate levels (L149: 15×15, reqLen=125, 3 gates) starve the
        // leading perimeter beam: the gate budget is divided by the gate count, and the
        // even per-config share then divides by the config count, so the winning
        // perimeterCW beam (needs ~3.3s to walk 125 depths) gets only ~budget/(gates·9)
        // ≈ 1.1s at the 30s default and times out — even though it solves outright in
        // 3.3s when given room. Give the two perimeter beams a budget floor in this case
        // so the proven winner completes. The floor is gated on reqLen≥90 AND gates≥2 so
        // the single-gate levels in this bucket (L130/L143/L147) keep their even-share and
        // their DFS fallbacks are not squeezed.
        const longMultiGate = level.reqLen >= 90 && (level.gateKeys?.length || 0) >= 2;
        const beamFloor = longMultiGate ? 0.45 : 0;

        // Near-Hamiltonian levels (navDensity ≥ 0.82): reqLen fills nearly all walkable
        // cells. Beam search fails to keep the correct path alive at w=2000 over 80+ steps
        // of densely-constrained space (L110: w×h 90% full, L140: 3-gate near-Hamiltonian).
        // Skip leading beams; use DFS with perimeter template — both CW and CCW tried so
        // a lucky direction wins quickly without waiting for the other to time out.
        if (navDensity >= 0.82) {
            return [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW,  beamWidth: 2000 },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW, beamWidth: 2000 },
            ];
        }

        // Must-pass-heavy levels (≥3 must-pass, e.g. L130: 3mp+10blocks): the solution
        // path threads through scattered objectives that perimeter sweeps can't find. Put
        // objectiveFirst and intersectionHarvest DFS before perimeterSweep DFS so the
        // objective-directed profiles get the budget rather than burning it on two
        // perimeter timeouts first (saves ~11s on L130).
        const dfsOrder = level.mustPassKeys.length >= 3
            ? [
                { profileName: 'objectiveFirst',      template: null },
                { profileName: 'intersectionHarvest', template: null },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'knotBuilder',         template: null },
              ]
            // Low-reqInt (≤4), no must-pass: CCW sweep first (wins on L110 in 230ms where
            // CW times out; CW is tried second as fallback).
            // Higher reqInt or must-pass: CW first (wins on L141).
            : level.reqInt <= 4 && level.mustPassKeys.length === 0
            ? [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
              ]
            : [
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
                { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
                { profileName: 'objectiveFirst',      template: null                   },
                { profileName: 'intersectionHarvest', template: null                   },
                { profileName: 'knotBuilder',         template: null                   },
              ];

        return [
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW,  beamWidth: 2000, minBudgetFraction: beamFloor },
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW, beamWidth: 2000, minBudgetFraction: beamFloor },
            { profileName: 'intersectionHarvest', template: null,                   beamWidth: 2000 },
            { profileName: 'objectiveFirst',      template: null,                   beamWidth: 2000 },
            ...dfsOrder,
        ];
    }

    // For portal-heavy levels, lead with portal profiles then templates
    if (arch === 'portal-heavy') {
        const portalFirst = ['portalFirstTransfer', 'portalCommitted',
            ...PROFILE_ORDER.filter(p => p !== 'portalFirstTransfer' && p !== 'portalCommitted')];
        return [
            ...portalFirst.map(p => ({ profileName: p, template: null })),
            ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
        ];
    }

    // Must-cross-heavy: DFS first (cornerHarvest solves L62/L75/L114; perimeterCW solves
    // L64/L128; mustCrossFirst solves L136; objectiveFirst solves L105).
    // Beam fallbacks for L53 (all DFS fail): mustCrossFirst (strong wmc=2.4 pull toward
    // diagonal MC cells), objectiveFirst, perimeterCW (V1 solved L53 via CW in 1.976s).
    //
    // For levels with many must-pass constraints (≥3, e.g. L140: 4mp+2mc+4flippers on 14×14),
    // the path is long (reqLen=75) so beam sweeps need ~3s each to complete 75 steps.
    // With only 8 configs at 30s budget: 3750ms each — enough for the beam to finish.
    // Beam width 2000: narrow enough for speed while still keeping the correct path alive
    // (flipper approach urgency in scoreMoveV2 makes the correct east-first path top-ranked).
    if (arch === 'must-cross-heavy') {
        if (level.mustPassKeys.length >= 3) {
            // Flipper-heavy levels (≥2 flipping filters) with many objectives need a wide-beam
            // intersectionHarvest as the sole config so it receives the full time budget.
            // Empirically: beam[50000] intersectionHarvest solves L140 in ~20s; any split
            // reduces the per-attempt budget below that threshold and the level times out.
            if (level.flippingFilterMap.size >= 2) {
                // Progressive beam widening with diverse-beam selection for flipper-heavy levels
                // (L145: 4 flippers + 4mp + 2mc). The diverse beam buckets candidates by
                // (flipperUsedMask, mustCrossMask) so all valid flipper orderings stay alive
                // even at narrow widths where a uniform beam would collapse to one mode.
                // bw=5000/15000 diverse: fast probes (~2s/~7s) that may solve outright.
                // bw=50000 fallback: full-budget non-diverse beam, proven to work (L145 baseline).
                // DFS fallbacks consume any leftover budget if the beam finishes early.
                return [
                    { profileName: 'intersectionHarvest', template: null, beamWidth:  5000, diverseBeam: true },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 15000, diverseBeam: true },
                    { profileName: 'intersectionHarvest', template: null, beamWidth: 50000, minBudgetFraction: 1.0 },
                    { profileName: 'objectiveFirst',      template: null },
                    { profileName: 'intersectionHarvest', template: null },
                ];
            }
            return [
                { profileName: 'objectiveFirst',     template: null,                   beamWidth: 2000 },
                { profileName: 'mustCrossFirst',     template: null,                   beamWidth: 2000 },
                { profileName: 'perimeterSweep',     template: TEMPLATES.perimeterCCW, beamWidth: 2000 },
                { profileName: 'intersectionHarvest',template: null,                   beamWidth: 2000 },
                { profileName: 'harvestThenFinish',  template: null,                   beamWidth: 2000 },
                { profileName: 'knotBuilder',        template: null,                   beamWidth: 2000 },
                { profileName: 'objectiveFirst',     template: null },  // DFS fallback
                { profileName: 'intersectionHarvest',template: null },  // DFS fallback
            ];
        }
        // Heavy combined MC+MP burden (≥3 must-cross AND ≥2 must-pass, e.g. L129: 3mc+2mp
        // diagonal): DFS perimeter templates fail to thread the combined constraints.
        // Lead with beam so the correct path is found without burning two DFS timeouts first.
        if (level.mustCrossKeys.length >= 3 && level.mustPassKeys.length >= 2) {
            return [
                { profileName: 'mustCrossFirst',    template: null,            beamWidth: 2000 },
                { profileName: 'objectiveFirst',    template: null,            beamWidth: 2000 },
                { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest         },
                { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW           },
                { profileName: 'mustCrossFirst',    template: null                            },
                { profileName: 'objectiveFirst',    template: null                            },
                { profileName: 'harvestThenFinish', template: null                            },
                { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW, beamWidth: 2000 },
            ];
        }
        // Template DFS first (solves simple MC levels fast: cornerHarvest→L62/L75/L114,
        // perimeterCW→L64/L128), then beams before DFS profile attempts.
        return [
            { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest              },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW                },
            { profileName: 'mustCrossFirst',    template: null,            beamWidth: 2000 },
            { profileName: 'objectiveFirst',    template: null,            beamWidth: 2000 },
            { profileName: 'mustCrossFirst',    template: null                             },
            { profileName: 'objectiveFirst',    template: null                             },
            { profileName: 'harvestThenFinish', template: null                             },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW, beamWidth: 2000 },
        ];
    }

    // Default: template sweep first, then all profiles.
    // No-must-pass levels: CCW before CW (L133: 15×15, CCW wins in 186ms; CW times out).
    // Must-pass levels: keep CW before CCW (L142: 4 mp, CW wins quickly).
    const templateConfigs = level.mustPassKeys.length === 0
        ? [
            { profileName: 'perimeterSweep', template: TEMPLATES.cornerHarvest  },
            { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCCW   },
            { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCW    },
            { profileName: 'perimeterSweep', template: TEMPLATES.sideCommitment },
          ]
        : ATTEMPT_CONFIGS.filter(c => c.template !== null);
    return [
        ...templateConfigs,
        ...PROFILE_ORDER.map(p => ({ profileName: p, template: null })),
    ];
}

// ─── Main solver ──────────────────────────────────────────────────────────────

async function solveLevelV2(level, opts = {}) {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const yieldFn      = typeof opts.yieldFn === 'function' ? opts.yieldFn : null;
    const levelStartTime = Date.now();
    const prep         = prepLevel(level);
    const gateKeys     = Array.isArray(level.gateKeys) ? level.gateKeys : [];

    // Ablation config: attach to prep so all inner functions can read it.
    const cfg = opts.ablation ?? null;
    prep._cfg     = cfg;
    prep._metrics = { nodesExpanded: 0 };

    // Build attempt configs, then filter by disabled profiles/templates.
    let baseConfigs = getAttemptConfigs(level);
    if (cfg) {
        const filtered = baseConfigs.filter(c => {
            if (c.template) {
                const tKey = _TEMPLATE_CFG_KEY[c.template.id];
                if (tKey && !cfg[tKey]) return false;
            }
            const pKey = `PROFILE_${c.profileName}`;
            if (pKey in cfg && !cfg[pKey]) return false;
            return true;
        });
        if (filtered.length > 0) baseConfigs = filtered;
        // Apply attempt order override
        if (cfg.ATTEMPT_ORDER === 'reverse') {
            baseConfigs = [...baseConfigs].reverse();
        } else if (cfg.ATTEMPT_ORDER === 'random') {
            baseConfigs = _shuffleArray([...baseConfigs], cfg._randomSeed ?? 42);
        } else if (cfg.ATTEMPT_ORDER === 'profile-grouped') {
            baseConfigs = [
                ...baseConfigs.filter(c => !c.template && !c.beamWidth),
                ...baseConfigs.filter(c => !!c.template),
                ...baseConfigs.filter(c => c.beamWidth && !c.template),
            ];
        }
    }

    const attempts = [];
    let solution   = null;

    // Pre-filter gates by parity feasibility on portal-free grids.
    // A gate is infeasible if (gate_parity ^ goal_parity ^ reqLen_parity) != 0.
    // Filtering infeasible gates concentrates the budget on gates that can succeed,
    // avoiding the case where a slow-to-exhaust infeasible gate consumes half the budget.
    let activeGates = gateKeys;
    if (level.portalMap.size === 0 && (!cfg || cfg.STRATEGY_PARITY_GATE_FILTER)) {
        const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
        const feasible = gateKeys.filter(gk => {
            const gP = ((gk & 0xFFFF) + ((gk >>> 16) & 0xFFFF)) & 1;
            return (gP ^ goalP ^ (level.reqLen & 1)) === 0;
        });
        if (feasible.length > 0) activeGates = feasible;
    }

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible
    // (e.g. near-closure L21/L106/L111, or L74 where Gate 2 solves instantly on Config 1
    // while Gate 1 never solves). Applies to all archetypes with multiple active gates.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    if (useInterleaving && activeGates.length > 1) {
        let pairsLeft = baseConfigs.length * activeGates.length;
        outer:
        for (let ci = 0; ci < baseConfigs.length; ci++) {
            for (let gi = 0; gi < activeGates.length; gi++) {
                const elapsed = Date.now() - levelStartTime;
                if (elapsed >= timeBudgetMs) break outer;
                const pairShare  = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
                const minFrac    = baseConfigs[ci].minBudgetFraction ?? 0;
                const gateShare  = (timeBudgetMs - elapsed) / activeGates.length;
                const attBudget  = minFrac > 0
                    ? Math.max(Math.floor(gateShare * minFrac), pairShare)
                    : pairShare;
                if (attBudget < 50) break outer;

                const gateKey = activeGates[gi];
                const { profileName, template, beamWidth, diverseBeam } = baseConfigs[ci];
                const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
                const attStart = Date.now();
                let path = null;
                try {
                    path = beamWidth
                        ? await beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth, yieldFn, diverseBeam)
                        : await dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn);
                } catch (err) {
                    if (err?.message === 'SolverV2:cancelled') throw err;
                }
                const attMs = Date.now() - attStart;
                attempts.push({ gateKey, profile: profileName, template: template?.id ?? null, beamWidth: beamWidth ?? null, ok: !!path, elapsedMs: attMs });
                pairsLeft--;
                if (path) { solution = path; break outer; }
            }
        }
    } else {
        // Budget scheme: fair-share per gate with redistribution.
        // Each gate gets floor(remaining_time / remaining_gates). Fast-finishing gates
        // donate their saved time to later gates.
        outer:
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey     = activeGates[gi];
            const gateElapsed = Date.now() - levelStartTime;
            if (gateElapsed >= timeBudgetMs) break outer;

            const gateStart  = Date.now();
            const timeLeft   = timeBudgetMs - gateElapsed;
            const gatesLeft  = activeGates.length - gi;
            const gateBudget = Math.floor(timeLeft / gatesLeft);

            for (let ci = 0; ci < baseConfigs.length; ci++) {
                const elapsed = Date.now() - gateStart;
                if (elapsed >= gateBudget) break;

                const remaining    = gateBudget - elapsed;
                const attemptsLeft = baseConfigs.length - ci;
                const minFrac      = baseConfigs[ci].minBudgetFraction ?? 0;
                const evenShare    = Math.floor(remaining / attemptsLeft);
                const attBudget    = minFrac > 0
                    ? Math.max(Math.floor(remaining * minFrac), evenShare)
                    : evenShare;
                if (attBudget < 50) break;

                const { profileName, template, beamWidth, diverseBeam } = baseConfigs[ci];
                const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
                const attStart = Date.now();
                let path = null;
                try {
                    path = beamWidth
                        ? await beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth, yieldFn, diverseBeam)
                        : await dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn);
                } catch (err) {
                    if (err?.message === 'SolverV2:cancelled') throw err;
                }

                const attMs = Date.now() - attStart;
                attempts.push({ gateKey, profile: profileName, template: template?.id ?? null, beamWidth: beamWidth ?? null, ok: !!path, elapsedMs: attMs });
                if (path) { solution = path; break outer; }
            }
        }
    }

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    if (solution) {
        return { ok: true, status: 'success', solution, solutions: [solution], attempts, totalMs, nodesExpanded };
    }
    return { ok: false, status: totalMs >= timeBudgetMs ? 'timeout' : 'failed', solution: null, solutions: [], attempts, totalMs, nodesExpanded };
}

// ─── Public API ───────────────────────────────────────────────────────────────

function createSolverV2() {
    const prepareLevelForSolverV2 = (rawLevel, opts = {}) => {
        if (!rawLevel || typeof rawLevel !== 'object') throw new Error('SolverV2: missing level');
        // Raw normalisation — applied when opts.source === 'raw' or the level is in raw wire format.
        if ((opts.source === 'raw') || (rawLevel?.goal && Array.isArray(rawLevel?.gates) && !Array.isArray(rawLevel?.gateKeys))) {
            return normalizeRawLevelV2(rawLevel, opts.levelNumber ?? opts.level ?? null);
        }
        return rawLevel;
    };

    const universalSolveLevel = (level, opts = {}) => solveLevelV2(level, opts);

    return {
        prepareLevelForSolver: prepareLevelForSolverV2,
        universalSolveLevel,
        solveLevel: universalSolveLevel,
        solve: (level, opts = {}) => solveLevelV2(level, opts),
        findTrapSpots: (level, opts = {}) => findTrapSpotsV2(level, opts),
        getTrapSpotBudgetMs: (level) => {
            const area = (level.grid?.w || 0) * (level.grid?.h || 0);
            const special = (level.mustPassKeys?.length || 0) + (level.mustCrossKeys?.length || 0) +
                (level.portalMap?.size || 0) + (level.filterMap?.size || 0) +
                (level.flippingFilterMap?.size || 0);
            return Math.min(120000, Math.max(3000, 2500 + area * 15 + (level.reqLen || 0) * 40 + special * 120));
        },
        validateCandidatePath,
        // Expose internals for testing / ablation analysis
        _normalizeRawLevel: normalizeRawLevelV2,
        _buildDistMap: buildDistMap,
        _detectArchetype: detectArchetype,
        _getAttemptConfigs: getAttemptConfigs,
        _prepLevel: prepLevel,
    };
}

export { createSolverV2 };
