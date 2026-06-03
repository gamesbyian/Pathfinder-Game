// SolverV2.js — Clean-room rewrite of the Pathfinder solver.
// Flat attempt loop: no cascade, no referee, no MITM, no near-closure rescue.
// Supports all level mechanics: portals (forced), regular filters, flipping filters,
// geese, false goals, must-pass, must-cross, intersections.
// Exports installSolverV2(APP) which sets APP.SolverV2.

// ─── Encoding ────────────────────────────────────────────────────────────────

const PACK = (x, y) => ((y << 16) | x) >>> 0;
const UNPACK = k => ({ x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF });
// Max PACK key for a 15x15 grid = PACK(14,14) = (14<<16)|14 = 917518.
// Use 1<<20 = 1048576 to cover all possible grid sizes safely.
const KEY_SPACE = 1 << 20; // 1M entries
const AXIS_H = 1; // horizontal move (dx != 0)
const AXIS_V = 2; // vertical move (dy != 0)
const AXIS_NONE = 0;

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

    // Approach-cell distance maps for must-cross 2nd visits.
    // After the 1st pass via axis A, the 2nd pass must enter from axis B.
    // We precompute BFS distances to the cells immediately adjacent on each axis
    // so the scorer/pruner can guide toward the correct perpendicular approach.
    const { w, h } = level.grid;
    const isOpen = k => {
        const kx = k & 0xFFFF, ky = (k >>> 16) & 0xFFFF;
        return kx >= 0 && kx < w && ky >= 0 && ky < h && !level.blockSet.has(k) && !level.gooseSet.has(k);
    };
    prep.mcApproachDistMaps = level.mustCrossKeys.map(mcKey => {
        const mcX = mcKey & 0xFFFF, mcY = (mcKey >>> 16) & 0xFFFF;
        // V-approach: enter MC from above or below (need to be in same column, y±1)
        const vSrc = [PACK(mcX, mcY - 1), PACK(mcX, mcY + 1)].filter(isOpen);
        // H-approach: enter MC from left or right (need to be in same row, x±1)
        const hSrc = [PACK(mcX - 1, mcY), PACK(mcX + 1, mcY)].filter(isOpen);
        return {
            v: vSrc.length > 0 ? buildDistMap(level, vSrc) : new Map(),
            h: hSrc.length > 0 ? buildDistMap(level, hSrc) : new Map(),
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
    prep.initialMustMask      = _mpN > 0 ? ((1n << BigInt(_mpN)) - 1n) : 0n;
    prep.initialMustCrossMask = _mcN > 0 ? ((1n << BigInt(_mcN)) - 1n) : 0n;

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
        mustMask:      0n,                        // DFS uses heuristic guidance; beam uses _beamResetState
        mustCrossMask: prep.initialMustCrossMask,
        crossCounts:   new Uint8Array(cn),
        portalJumps:   0,
        flipperCounts: new Uint8Array(KEY_SPACE), // how many times each flipper cell crossed
        lastWasPortalJump: false,                 // was last move a portal jump?
    };
    state.visited[startKey] = 1;
    // Apply start-cell effects
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) state.mustMask &= ~(1n << BigInt(mpIdx));
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) {
        state.crossCounts[mcIdx] = 1;
        // mustCrossMask bit stays set (still need one more visit)
    }
    if (level.flippingFilterMap.has(startKey)) state.flipperCounts[startKey]++;
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

    // Must-pass: clear bit on first visit
    const prevMustMask = state.mustMask;
    const mpIdx = prep.mustPassIndex.get(target);
    if (mpIdx !== undefined && prevVisited === 0) {
        state.mustMask &= ~(1n << BigInt(mpIdx));
    }

    // Must-cross: accumulate crosses
    const prevMustCrossMask = state.mustCrossMask;
    let prevCrossCount = 0;
    const mcIdx = prep.mustCrossIndex.get(target);
    if (mcIdx !== undefined) {
        prevCrossCount = state.crossCounts[mcIdx];
        if (state.crossCounts[mcIdx] < 255) state.crossCounts[mcIdx]++;
        if (state.crossCounts[mcIdx] >= 2) state.mustCrossMask &= ~(1n << BigInt(mcIdx));
    }

    // Flipping filter update
    const prevFlipCount = state.flipperCounts[target];
    if (level.flippingFilterMap.has(target) && !isPortalJump) state.flipperCounts[target]++;

    const prevLastWasPortalJump = state.lastWasPortalJump;
    state.lastWasPortalJump = isPortalJump;

    return {
        target, from, moveAxis, axisBit, isPortalJump,
        prevVisited, prevEdgeFrom, prevEdgeTarget,
        wasIntAdded,
        prevMustMask, mpIdx,
        prevMustCrossMask, mcIdx, prevCrossCount,
        prevFlipCount, hadFlipper: level.flippingFilterMap.has(target),
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
    state.mustMask      = undo.prevMustMask;
    state.mustCrossMask = undo.prevMustCrossMask;
    if (undo.mcIdx !== undefined) state.crossCounts[undo.mcIdx] = undo.prevCrossCount;
    if (undo.hadFlipper) state.flipperCounts[undo.target] = undo.prevFlipCount;
    state.lastWasPortalJump = undo.prevLastWasPortalJump;
}

// ─── Neighbour generation ─────────────────────────────────────────────────────

// Returns an array of valid next-cell keys from `pos` in `state`.
// Portal entries yield ONLY the portal destination (forced teleport).
// `arrivedViaPortal` prevents chaining teleports.
function getNeighbors(pos, state, level, prep) {
    const { w, h } = level.grid;
    const x = pos & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
    const portal = level.portalMap.get(pos);
    const arrivedViaPortal = state.lastWasPortalJump;

    // Portal is forced unless we just arrived here via a portal jump
    if (portal && !arrivedViaPortal) {
        const dest = portal.dest;
        if (dest >= 0 && !level.blockSet.has(dest) && !level.gooseSet.has(dest)) return [dest];
        return [];
    }

    // Entry axis of pos (needed for exit-axis edge-usage check and filter check)
    const pathLen = state.path.length;
    let entryAxis = AXIS_NONE;
    if (pathLen >= 2) {
        const prev = state.path[pathLen - 2];
        // Check if the last step into pos was a portal jump (prev=portalSrc, pos=portalDest)
        // In that case entry axis is NONE (we teleported).
        const wasJump = arrivedViaPortal; // already handled above — but here it's always false
        if (!wasJump) {
            const px = prev & 0xFFFF, py = (prev >>> 16) & 0xFFFF;
            entryAxis = (py === y) ? AXIS_H : AXIS_V;
        }
    }

    const candidates = [];
    const dx4 = [1, -1, 0,  0];
    const dy4 = [0,  0, 1, -1];
    for (let i = 0; i < 4; i++) {
        const nx = x + dx4[i], ny = y + dy4[i];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = PACK(nx, ny);
        if (!isValidMove(pos, nk, state, level, prep, entryAxis)) continue;
        candidates.push(nk);
    }
    return candidates;
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

    // Flipping filter axis check on entry into target.
    // The axis filter only applies starting from the 2nd crossing (count >= 1).
    // On first crossing (count === 0) only the exit-guard (above) constrains direction.
    const flipTarget = level.flippingFilterMap.get(target);
    if (flipTarget !== undefined && state.flipperCounts[target] >= 1) {
        const count  = state.flipperCounts[target];
        const curAx  = (count % 2 === 0) ? flipTarget : (flipTarget === AXIS_H ? AXIS_V : AXIS_H);
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
            d = aMap.size > 0 ? ((aMap.get(pos) ?? Infinity) + 1) : (prep.mustCrossDistMaps[i].get(pos) ?? Infinity);
        } else {
            d = prep.mustCrossDistMaps[i].get(pos) ?? Infinity;
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
        const d = prep.mustPassDistMaps[remain[a]].get(pos) ?? Infinity;
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
    if (state.mustMask === 0n) return 0;
    const n = level.mustPassKeys.length;
    const remain = [];
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if ((state.mustMask & (1n << BigInt(i))) === 0n) continue;
        remain.push(i);
        const dToMp   = prep.mustPassDistMaps[i].get(pos) ?? Infinity;
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
    if (state.mustCrossMask === 0n) return 0;
    const n = level.mustCrossKeys.length;
    let lb = 0;
    const remain = [];
    for (let i = 0; i < n; i++) {
        if ((state.mustCrossMask & (1n << BigInt(i))) === 0n) continue;
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

        const d = prep.mustCrossDistMaps[i].get(pos) ?? Infinity;
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
    // Threshold: visited count allowed to pass through
    //   0 intersections remaining: only unvisited cells
    //   N intersections remaining: cells visited up to N times may be re-entered
    const maxVisit = intNeeded > 0 ? 1 : 0;
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
        if ((state.mustMask & (1n << BigInt(i))) !== 0n && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1n << BigInt(i))) !== 0n && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
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

// ─── Move scoring ─────────────────────────────────────────────────────────────

// Score a candidate move `target` from `pos` in `state`.
// Higher score = better (explored first).
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

    let score = 0;

    // Goal attraction: reward moves that reduce distance to goal
    const goalDistCur    = prep.distMap.get(pos)    ?? Infinity;
    const goalDistTarget = prep.distMap.get(target) ?? Infinity;
    if (Number.isFinite(goalDistCur) && Number.isFinite(goalDistTarget)) {
        const gain = goalDistCur - goalDistTarget;
        score += w * phaseGoalScale * gain * 10;
    }

    // Finish commitment: bonus when close to goal (small rSteps)
    if (rStepsAfterMove <= 4 && Number.isFinite(goalDistTarget)) {
        score += wf * (5 - rStepsAfterMove) * 8;
    }

    // Objective attraction: reward moves toward nearest unsatisfied objective
    if (state.mustMask !== 0n || state.mustCrossMask !== 0n) {
        let bestObjDist = Infinity;
        for (const objKey of prep.objectiveKeys) {
            const mpIdx = prep.mustPassIndex.get(objKey);
            const mcIdx = prep.mustCrossIndex.get(objKey);
            const satisfied = (mpIdx !== undefined && (state.mustMask & (1n << BigInt(mpIdx))) === 0n)
                           || (mcIdx !== undefined && (state.mustCrossMask & (1n << BigInt(mcIdx))) === 0n);
            if (satisfied) continue;
            const d = prep.objectiveDistMaps[prep.objectiveKeyToIndex.get(objKey)].get(target) ?? Infinity;
            if (Number.isFinite(d)) bestObjDist = Math.min(bestObjDist, d);
        }
        if (Number.isFinite(bestObjDist)) {
            score += wo * (10 / (1 + bestObjDist));
        }
    }

    // Must-pass urgency: bonus for moving toward must-pass
    if (state.mustMask !== 0n) {
        for (let i = 0; i < level.mustPassKeys.length; i++) {
            if ((state.mustMask & (1n << BigInt(i))) === 0n) continue;
            const dCur    = prep.mustPassDistMaps[i].get(pos)    ?? Infinity;
            const dTarget = prep.mustPassDistMaps[i].get(target) ?? Infinity;
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 5;
            }
        }
    }

    // Must-cross urgency
    if (state.mustCrossMask !== 0n) {
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
            if ((state.mustCrossMask & (1n << BigInt(i))) === 0n) continue;

            if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
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

            // 1st visit (or approach map unavailable): standard urgency toward MC cell
            const dCur    = prep.mustCrossDistMaps[i].get(pos)    ?? Infinity;
            const dTarget = prep.mustCrossDistMaps[i].get(target) ?? Infinity;
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmc * (dCur - dTarget) * 5;
            }
        }
    }

    // Intersection setup: reward second visit to a non-gate, non-goal cell if ints needed
    const intNeeded = level.reqInt - state.ints;
    if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateSet.has(target)) {
        score += wi * 12;
    } else if (intNeeded > 0) {
        // Small bonus for cells that have many neighbors (potential intersection spots)
        score += wi * 1;
    }

    // Perimeter bias: prefer cells on the grid edge
    const gw = level.grid.w, gh = level.grid.h;
    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
    if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * phasePerimScale * 3;

    // Anti-dither: penalise immediate U-turns
    if (state.path.length >= 2) {
        const prevPrev = state.path[state.path.length - 2];
        if (prevPrev === target) score -= wdt * 15;
    }

    // Revisit penalty
    if (state.visited[target] > 0) score -= wrv * 8;

    // Structural template bias (overrides/supplements profile heuristics)
    if (template) score += computeTemplateBonus(target, pos, level, template, rRatio);

    return score;
}

// ─── Solution check ───────────────────────────────────────────────────────────

function isSolution(state, level) {
    if (state.path[state.path.length - 1] !== level.goalKey) return false;
    const realLen = state.path.length - 1 - state.portalJumps;
    if (realLen !== level.reqLen) return false;
    if (state.ints !== level.reqInt)         return false;
    if (state.mustMask !== 0n)               return false;
    if (state.mustCrossMask !== 0n)          return false;
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
function dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, maxDiscrepancy = Infinity) {
    const state = createState(startKey, level, prep);

    // Stack entry: { key, children, childIdx, undoInfo, disc } where disc = cumulative
    // discrepancy to REACH this node (sum of chosen child-indices along the path).
    const children0 = getNeighbors(startKey, state, level, prep);
    scoreAndSort(children0, startKey, state, level, prep, profile, template);
    const stack = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null, disc: 0 }];

    let nodesExpanded = 0;

    while (stack.length > 0) {
        // Budget check every 256 nodes (cheap enough not to dominate per-node cost)
        if ((++nodesExpanded & 255) === 0 && Date.now() - levelStartTime > levelBudgetMs) return null;

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

        // Over-length prune
        if (realLen > level.reqLen) { undoMove(undo, state); continue; }

        // Over-intersection prune
        if (state.ints > level.reqInt) { undoMove(undo, state); continue; }

        // Intersection ceiling: ints + remaining_MC_crossings must not exceed reqInt.
        // Each pending MC cell will contribute exactly 1 intersection (its 2nd-axis visit).
        // If current ints + guaranteed future MC ints already exceeds reqInt, prune.
        // This eliminates paths with non-MC crossings on levels where all intersections
        // must come from MC cells (e.g. L53: mc=3, reqInt=3 → zero non-MC crossings).
        if (state.mustCrossMask !== 0n && level.mustCrossKeys.length > 0) {
            let mcRemaining = 0;
            let m = state.mustCrossMask;
            while (m !== 0n) { mcRemaining += Number(m & 1n); m >>= 1n; }
            if (state.ints + mcRemaining > level.reqInt) { undoMove(undo, state); continue; }
        }

        // Solution check (only when at goal)
        if (next === level.goalKey) {
            if (isSolution(state, level)) return state.path.slice();
            undoMove(undo, state); continue;
        }

        const rSteps = level.reqLen - realLen;

        // Distance bound: min steps from next to goal must fit in remaining steps
        const goalDist = prep.distMap.get(next) ?? Infinity;
        if (!Number.isFinite(goalDist) || goalDist > rSteps) { undoMove(undo, state); continue; }

        // Parity pruning (V1 line 6559): on a portal-free grid every step flips (x+y)%2.
        // Always apply at depth 1 (catches globally infeasible gates, e.g. L53 gate 2).
        // Apply deep parity (full DFS) only for corridor-rich levels (≥10 blocks): these
        // levels have tightly constrained paths where parity cuts many dead-end corridors.
        // For open levels with few blocks, deep parity changes search order adversely.
        if (level.portalMap.size === 0) {
            const posP  = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
            const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
            const firstStep = (realLen === 1);
            if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
                undoMove(undo, state); continue;
            }
        }

        // Must-pass lower bound: dist(next→MP) + dist(MP→goal) ≤ rSteps
        if (state.mustMask !== 0n) {
            const mpLB = mustPassLowerBound(next, state, level, prep);
            if (!Number.isFinite(mpLB) || mpLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Must-cross lower bound: dist(next→MC) + dist(MC→goal) ≤ rSteps
        if (state.mustCrossMask !== 0n) {
            const mcLB = mustCrossLowerBound(next, state, level, prep);
            if (!Number.isFinite(mcLB) || mcLB > rSteps) { undoMove(undo, state); continue; }
        }

        // Intersection deficit: can't create more than rSteps intersections
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > rSteps) { undoMove(undo, state); continue; }

        // Connectivity + volume check: every 32 nodes and always near end.
        if (rSteps <= 10 || (nodesExpanded & 31) === 0) {
            if (!isConnected(next, state, level, prep)) { undoMove(undo, state); continue; }
        }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile, template);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
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
function dfsFromGateLDS(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template) {
    const probeCapMs = Math.min(Math.floor(levelBudgetMs * 0.5), 4000);
    for (const k of _LDS_PROBE_K) {
        if (Date.now() - levelStartTime >= probeCapMs) break;
        const w0 = Date.now();
        const path = dfsFromGate(startKey, level, prep, profile, probeCapMs, levelStartTime, template, k);
        if (_LDS_DEBUG) console.error(`    [lds] k=${k} ${Date.now()-w0}ms ${path?'SOLVED':'-'}`);
        if (path) return path;
    }
    if (Date.now() - levelStartTime >= levelBudgetMs) return null;
    const path = dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime, template, Infinity);
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
        if (ws.flipperCounts[k]) ws.flipperCounts[k] = 0;
    }
    wsP.length = 1; wsP[0] = startKey;
    ws.ints = 0; ws.portalJumps = 0; ws.lastWasPortalJump = false;
    ws.mustMask      = prep.initialMustMask;
    ws.mustCrossMask = prep.initialMustCrossMask;
    ws.crossCounts.fill(0);
    ws.visited[startKey] = 1;
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) ws.mustMask &= ~(1n << BigInt(mpIdx));
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) ws.crossCounts[mcIdx] = 1;
    if (level.flippingFilterMap.has(startKey)) ws.flipperCounts[startKey]++;
}

// Synchronous beam search: maintain a frontier of up to `beamWidth` partial paths,
// all at the same depth. At each step expand every frontier state, score all valid
// one-step extensions, and keep the top-beamWidth by cumulative score.
// Uses a single reusable mutable state (KEY_SPACE arrays allocated once, cells
// zeroed per-frontier-state via _beamResetState) to avoid repeated large allocations.
function beamSearchFromGate(startKey, level, prep, profile, budgetMs, startTime, template, beamWidth) {
    const ws = createState(startKey, level, prep);
    let frontier = [{ path: [startKey], score: 0 }];

    while (frontier.length > 0) {
        if (Date.now() - startTime > budgetMs) return null;

        const cands = [];

        for (const { path, score: acc } of frontier) {
            // Reset ws to startKey state, then replay this frontier path.
            _beamResetState(ws, startKey, level, prep);
            for (let i = 1; i < path.length; i++) {
                const from = path[i - 1], to = path[i];
                const p = level.portalMap.get(from);
                const isJump = !!(p && !ws.lastWasPortalJump && p.dest === to);
                applyMove(to, ws, level, prep, isJump);
            }

            const pos = path[path.length - 1];
            if (pos === level.goalKey) {
                if (isSolution(ws, level)) return path;
                continue;
            }

            const neighbors = getNeighbors(pos, ws, level, prep);
            for (const next of neighbors) {
                const pAtPos = level.portalMap.get(pos);
                const isJump = !!(pAtPos && !ws.lastWasPortalJump && pAtPos.dest === next);
                const undo = applyMove(next, ws, level, prep, isJump);
                const realLen = ws.path.length - 1 - ws.portalJumps;
                const rSteps  = level.reqLen - realLen;
                let ok = realLen <= level.reqLen && ws.ints <= level.reqInt;

                if (ok && ws.mustCrossMask !== 0n) {
                    let mcR = 0, m = ws.mustCrossMask;
                    while (m) { mcR += Number(m & 1n); m >>= 1n; }
                    if (ws.ints + mcR > level.reqInt) ok = false;
                }
                if (ok && next === level.goalKey) {
                    if (isSolution(ws, level)) { undoMove(undo, ws); return [...path, next]; }
                    ok = false;
                }
                if (ok) {
                    const gd = prep.distMap.get(next) ?? Infinity;
                    if (!Number.isFinite(gd) || gd > rSteps) ok = false;
                }
                if (ok && level.portalMap.size === 0) {
                    const pp = ((next & 0xFFFF) + ((next >>> 16) & 0xFFFF)) & 1;
                    const gp = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
                    if ((realLen === 1 || level.blockSet.size >= 10) && ((pp ^ gp ^ (rSteps & 1)) !== 0)) ok = false;
                }
                if (ok && ws.mustMask !== 0n) {
                    const lb = mustPassLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && ws.mustCrossMask !== 0n) {
                    const lb = mustCrossLowerBound(next, ws, level, prep);
                    if (!Number.isFinite(lb) || lb > rSteps) ok = false;
                }
                if (ok && (level.reqInt - ws.ints) > rSteps) ok = false;
                // Connectivity: check near end and every 8 path steps (catches dead ends early).
                if (ok && (rSteps <= 20 || (realLen & 7) === 0)) {
                    if (!isConnected(next, ws, level, prep)) ok = false;
                }
                if (ok) {
                    const mv = scoreMoveV2(next, pos, ws, level, prep, profile, rSteps, template);
                    cands.push({ path: [...path, next], score: acc + mv });
                }
                undoMove(undo, ws);
            }
        }

        if (cands.length === 0) break;
        if (cands.length > beamWidth) {
            cands.sort((a, b) => b.score - a.score);
            frontier = cands.slice(0, beamWidth);
        } else {
            frontier = cands;
        }
    }
    return null;
}

// Sort neighbors in-place: best-first at index 0 (DFS iterates with childIdx++).
function scoreAndSort(neighbors, pos, state, level, prep, profile, template) {
    if (neighbors.length <= 1) return;
    const realLen = state.path.length - 1 - state.portalJumps;
    const portalEntry = level.portalMap.get(pos);
    const scored = neighbors.map(nk => {
        const isJump = !!(portalEntry && portalEntry.dest === nk);
        const nLen = realLen + (isJump ? 0 : 1);
        const nRSteps = level.reqLen - nLen;
        return [nk, scoreMoveV2(nk, pos, state, level, prep, profile, nRSteps, template)];
    });
    scored.sort((a, b) => b[1] - a[1]); // descending: children[0] = best = explored first
    for (let i = 0; i < neighbors.length; i++) neighbors[i] = scored[i][0];
}

// ─── Archetype detection ──────────────────────────────────────────────────────

function detectArchetype(level) {
    const area = level.grid.w * level.grid.h;
    const density = area > 0 ? level.reqLen / area : 0;
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
    const area    = level.grid.w * level.grid.h;
    const density = area > 0 ? level.reqLen / area : 0;

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
            // Very high reqInt (L61=8, L92=8, L138=8, L139=11).
            // V1 needed 20s (L92), 14.5s (L138), 5.6s (L139) using beam search.
            // Beam search placed first so it receives maximum budget; DFS fallbacks
            // cover L61 (solves in 75ms via DFS intersectionHarvest).
            return [
                { profileName: 'intersectionHarvest', template: null, beamWidth: 5000 },
                { profileName: 'objectiveFirst',      template: null, beamWidth: 5000 },
                { profileName: 'intersectionHarvest', template: null },
                { profileName: 'objectiveFirst',      template: null },
            ];
        }
        // Medium-high reqInt (L130=6, L143=5, L147=4).
        // V1 solved L130 in 362ms via perimeterCW template; L143 via perimeterCCW 1.7s.
        // Beam variants placed first so they receive the larger share of budget;
        // DFS fallbacks cover L143/L147 which already pass via DFS.
        return [
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW,  beamWidth: 2000 },
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW, beamWidth: 2000 },
            { profileName: 'intersectionHarvest', template: null,                   beamWidth: 2000 },
            { profileName: 'objectiveFirst',      template: null,                   beamWidth: 2000 },
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCW  },
            { profileName: 'perimeterSweep',      template: TEMPLATES.perimeterCCW },
            { profileName: 'objectiveFirst',      template: null                   },
            { profileName: 'intersectionHarvest', template: null                   },
            { profileName: 'knotBuilder',         template: null                   },
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
    if (arch === 'must-cross-heavy') {
        return [
            { profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest    },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW      },
            { profileName: 'mustCrossFirst',    template: null                       },
            { profileName: 'objectiveFirst',    template: null                       },
            { profileName: 'harvestThenFinish', template: null                       },
            { profileName: 'mustCrossFirst',    template: null,                    beamWidth: 2000 },
            { profileName: 'objectiveFirst',    template: null,                    beamWidth: 2000 },
            { profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW,   beamWidth: 2000 },
        ];
    }

    // Default: trimmed template set first, then all profiles.
    return [
        ...ATTEMPT_CONFIGS.filter(c => c.template !== null),
        ...PROFILE_ORDER.map(p => ({ profileName: p, template: null })),
    ];
}

// ─── Main solver ──────────────────────────────────────────────────────────────

async function solveLevelV2(level, opts = {}) {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const levelStartTime = Date.now();
    const prep         = prepLevel(level);
    const gateKeys     = Array.isArray(level.gateKeys) ? level.gateKeys : [];
    const baseConfigs  = getAttemptConfigs(level);

    const attempts = [];
    let solution   = null;

    // Pre-filter gates by parity feasibility on portal-free grids.
    // A gate is infeasible if (gate_parity ^ goal_parity ^ reqLen_parity) != 0.
    // Filtering infeasible gates concentrates the budget on gates that can succeed,
    // avoiding the case where a slow-to-exhaust infeasible gate consumes half the budget.
    let activeGates = gateKeys;
    if (level.portalMap.size === 0) {
        const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
        const feasible = gateKeys.filter(gk => {
            const gP = ((gk & 0xFFFF) + ((gk >>> 16) & 0xFFFF)) & 1;
            return (gP ^ goalP ^ (level.reqLen & 1)) === 0;
        });
        if (feasible.length > 0) activeGates = feasible;
    }

    // Near-closure with multiple gates: interleave configs across gates (config-outer,
    // gate-inner). This prevents Gate 1 exhausting its full budget before Gate 2 ever
    // gets to try Config 1 — crucial when Gate 1 is structurally infeasible but parity-
    // feasible (L21, L106, L111): Gate 2 solves in ~10ms via nearClosureRescue but would
    // otherwise wait 15s while Gate 1 cycles through all 16 configs.
    const arch = detectArchetype(level);
    if (arch === 'near-closure' && activeGates.length > 1) {
        let pairsLeft = baseConfigs.length * activeGates.length;
        outer:
        for (let ci = 0; ci < baseConfigs.length; ci++) {
            for (let gi = 0; gi < activeGates.length; gi++) {
                const elapsed = Date.now() - levelStartTime;
                if (elapsed >= timeBudgetMs) break outer;
                const attBudget = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
                if (attBudget < 50) break outer;

                const gateKey = activeGates[gi];
                const { profileName, template, beamWidth } = baseConfigs[ci];
                const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
                const attStart = Date.now();
                let path = null;
                try {
                    path = beamWidth
                        ? beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth)
                        : dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template);
                } catch (_) {}
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
                const attBudget    = Math.floor(remaining / attemptsLeft);
                if (attBudget < 50) break;

                const { profileName, template, beamWidth } = baseConfigs[ci];
                const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
                const attStart = Date.now();
                let path = null;
                try {
                    path = beamWidth
                        ? beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth)
                        : dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template);
                } catch (_) {}

                const attMs = Date.now() - attStart;
                attempts.push({ gateKey, profile: profileName, template: template?.id ?? null, beamWidth: beamWidth ?? null, ok: !!path, elapsedMs: attMs });
                if (path) { solution = path; break outer; }
            }
        }
    }

    const totalMs = Date.now() - levelStartTime;
    if (solution) {
        return { ok: true, status: 'success', solution, solutions: [solution], attempts, totalMs };
    }
    return { ok: false, status: totalMs >= timeBudgetMs ? 'timeout' : 'failed', solution: null, solutions: [], attempts, totalMs };
}

// ─── Public API ───────────────────────────────────────────────────────────────

function installSolverV2(APP) {
    const prepareLevelForSolverV2 = (rawLevel, opts = {}) => {
        if (!rawLevel || typeof rawLevel !== 'object') throw new Error('SolverV2: missing level');
        const source = opts.source || 'auto';
        // If V1 is loaded, try to use its normalisation first (handles canonical clone path)
        if (source !== 'raw' && typeof APP?.Solver?.prepareLevelForSolver === 'function') {
            return APP.Solver.prepareLevelForSolver(rawLevel, opts);
        }
        // Raw normalisation
        if (source === 'raw' || (rawLevel?.goal && Array.isArray(rawLevel?.gates) && !Array.isArray(rawLevel?.gateKeys))) {
            return normalizeRawLevelV2(rawLevel, opts.levelNumber ?? opts.level ?? null);
        }
        return rawLevel;
    };

    const universalSolveLevel = (level, opts = {}) => solveLevelV2(level, opts);

    APP.SolverV2 = {
        prepareLevelForSolver: prepareLevelForSolverV2,
        universalSolveLevel,
        solveLevel: universalSolveLevel,
        solve: (level, opts = {}) => solveLevelV2(level, opts),
        // Expose internals for testing
        _normalizeRawLevel: normalizeRawLevelV2,
        _buildDistMap: buildDistMap,
        _detectArchetype: detectArchetype,
    };

    return APP.SolverV2;
}

export { installSolverV2 };
