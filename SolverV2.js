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
    return prep;
}

// ─── State ────────────────────────────────────────────────────────────────────

function createState(startKey, level, prep) {
    const n = prep.mustPassKeys ? level.mustPassKeys.length : 0;
    const cn = level.mustCrossKeys.length;
    const state = {
        path: [startKey],
        visited:    new Uint16Array(KEY_SPACE),   // visit count per cell
        edgeUsage:  new Uint8Array(KEY_SPACE),    // bit1=H used, bit2=V used
        ints:       0,
        mustMask:   n  > 0 ? ((1n << BigInt(n))  - 1n) : 0n,
        mustCrossMask: cn > 0 ? ((1n << BigInt(cn)) - 1n) : 0n,
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

// Lower bound: must visit every unsatisfied must-pass then reach goal.
// Uses max over all unsatisfied MPs of (dist(pos→MP) + dist(MP→goal)).
function mustPassLowerBound(pos, state, level, prep) {
    if (state.mustMask === 0n) return 0;
    const n = level.mustPassKeys.length;
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if ((state.mustMask & (1n << BigInt(i))) === 0n) continue;
        const dToMp   = prep.mustPassDistMaps[i].get(pos) ?? Infinity;
        const dMpGoal = prep.mustPassToGoalDist[i];
        if (!Number.isFinite(dToMp) || !Number.isFinite(dMpGoal)) return Infinity;
        lb = Math.max(lb, dToMp + dMpGoal);
    }
    return lb;
}

// Lower bound: must visit every unfinished must-cross at least once more, then reach goal.
// Uses max over all unfinished MCs of (dist(pos→MC) + dist(MC→goal)).
function mustCrossLowerBound(pos, state, level, prep) {
    if (state.mustCrossMask === 0n) return 0;
    const n = level.mustCrossKeys.length;
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if ((state.mustCrossMask & (1n << BigInt(i))) === 0n) continue;
        const d = prep.mustCrossDistMaps[i].get(pos) ?? Infinity;
        if (!Number.isFinite(d)) return Infinity;
        const dMcGoal = prep.mustCrossToGoalDist[i];
        if (!Number.isFinite(dMcGoal)) return Infinity;
        lb = Math.max(lb, d + dMcGoal);
    }
    return lb;
}

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE); // generation tracking (32-bit avoids wrap)

// Connectivity prune: checks that goal + unsatisfied objectives are reachable from pos.
// Flood fill traverses cells that are either unvisited, or (if intersections still needed)
// visited exactly once. Gate cells (other than starting gate) are treated as walls.
// This is a SAW-style pruning — much stronger than traversing all non-blocked cells.
function isConnected(pos, state, level, prep) {
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    // Threshold: visited count allowed to pass through
    //   0 intersections remaining: only unvisited cells
    //   N intersections remaining: cells visited up to N times may be re-entered
    const maxVisit = intNeeded > 0 ? 1 : 0;

    _reachGen++;
    const gen = _reachGen;
    let qHead = 0, qTail = 0;
    _reachGenBuf[pos] = gen;
    _reachQ[qTail++] = pos;

    while (qHead < qTail) {
        const k = _reachQ[qHead++];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        // Portal edge: if portal source is reachable, destination is too
        const portal = level.portalMap.get(k);
        if (portal) {
            const d = portal.dest;
            if (_reachGenBuf[d] !== gen && !level.blockSet.has(d) && !level.gooseSet.has(d) &&
                (state.visited[d] <= maxVisit || d === pos)) {
                _reachGenBuf[d] = gen; _reachQ[qTail++] = d;
            }
        }
        const addNeighbor = (nk) => {
            if (_reachGenBuf[nk] !== gen && !level.blockSet.has(nk) && !level.gooseSet.has(nk) &&
                !prep.gateSet.has(nk) && (state.visited[nk] <= maxVisit || nk === pos)) {
                _reachGenBuf[nk] = gen; _reachQ[qTail++] = nk;
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
    return true;
}

// ─── Move scoring ─────────────────────────────────────────────────────────────

// Score a candidate move `target` from `pos` in `state`.
// Higher score = better (explored first).
function scoreMoveV2(target, pos, state, level, prep, profile, rStepsAfterMove) {
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

    let score = 0;

    // Goal attraction: reward moves that reduce distance to goal
    const goalDistCur    = prep.distMap.get(pos)    ?? Infinity;
    const goalDistTarget = prep.distMap.get(target) ?? Infinity;
    if (Number.isFinite(goalDistCur) && Number.isFinite(goalDistTarget)) {
        const gain = goalDistCur - goalDistTarget;
        score += w * gain * 10;
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
            const d = prep.objectiveDistMaps[prep.objectiveKeys.indexOf(objKey)]?.get(target) ?? Infinity;
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
    if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * 3;

    // Anti-dither: penalise immediate U-turns
    if (state.path.length >= 2) {
        const prevPrev = state.path[state.path.length - 2];
        if (prevPrev === target) score -= wdt * 15;
    }

    // Revisit penalty
    if (state.visited[target] > 0) score -= wrv * 8;

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

// Iterative DFS from `startKey` using policy `profile`.
// levelStartTime + levelBudgetMs: hard wall-clock cap for the whole level.
// Returns the solution path (array of keys) or null on timeout/failure.
function dfsFromGate(startKey, level, prep, profile, levelBudgetMs, levelStartTime) {
    const state = createState(startKey, level, prep);

    // Stack entry: { key, children: sorted_candidates, childIdx, undoInfo }
    const children0 = getNeighbors(startKey, state, level, prep);
    scoreAndSort(children0, startKey, state, level, prep, profile);
    const stack = [{ key: startKey, children: children0, childIdx: 0, undoInfo: null }];

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

        const next = top.children[top.childIdx++];
        const portal = level.portalMap.get(top.key);
        const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);

        const undo = applyMove(next, state, level, prep, isPortalJump);

        const realLen = state.path.length - 1 - state.portalJumps;

        // Over-length prune
        if (realLen > level.reqLen) { undoMove(undo, state); continue; }

        // Over-intersection prune
        if (state.ints > level.reqInt) { undoMove(undo, state); continue; }

        // Solution check (only when at goal)
        if (next === level.goalKey) {
            if (isSolution(state, level)) return state.path.slice();
            undoMove(undo, state); continue;
        }

        const rSteps = level.reqLen - realLen;

        // Distance bound: min steps from next to goal must fit in remaining steps
        const goalDist = prep.distMap.get(next) ?? Infinity;
        if (!Number.isFinite(goalDist) || goalDist > rSteps) { undoMove(undo, state); continue; }

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

        // Connectivity: check every 128 nodes and when close to end
        if (rSteps <= 8 || (nodesExpanded & 127) === 0) {
            if (!isConnected(next, state, level, prep)) { undoMove(undo, state); continue; }
        }

        // Expand next
        const nextNeighbors = getNeighbors(next, state, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, state); continue; }
        scoreAndSort(nextNeighbors, next, state, level, prep, profile);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo });
    }
    return null;
}

// Sort neighbors in-place: best-first at index 0 (DFS iterates with childIdx++).
function scoreAndSort(neighbors, pos, state, level, prep, profile) {
    if (neighbors.length <= 1) return;
    const realLen = state.path.length - 1 - state.portalJumps;
    const portalEntry = level.portalMap.get(pos);
    const scored = neighbors.map(nk => {
        const isJump = !!(portalEntry && portalEntry.dest === nk);
        const nLen = realLen + (isJump ? 0 : 1);
        const nRSteps = level.reqLen - nLen;
        return [nk, scoreMoveV2(nk, pos, state, level, prep, profile, nRSteps)];
    });
    scored.sort((a, b) => b[1] - a[1]); // descending: children[0] = best = explored first
    for (let i = 0; i < neighbors.length; i++) neighbors[i] = scored[i][0];
}

// ─── Archetype detection ──────────────────────────────────────────────────────

function detectArchetype(level) {
    const area = level.grid.w * level.grid.h;
    const density = area > 0 ? level.reqLen / area : 0;
    if (level.reqInt >= 5 && density >= 0.55) return 'high-intersection-burden';
    if (level.mustCrossKeys.length >= 2 && level.reqInt >= 2) return 'must-cross-heavy';
    if ((level.portalMap?.size || 0) >= 4) return 'portal-heavy';
    return 'default';
}

// Return profile names in priority order for this level's archetype.
function getProfileOrder(level) {
    const arch = detectArchetype(level);
    if (arch === 'high-intersection-burden') {
        return ['intersectionHarvest', 'knotBuilder', 'closureCommitment', ...PROFILE_ORDER.filter(p => p !== 'intersectionHarvest' && p !== 'knotBuilder' && p !== 'closureCommitment')];
    }
    if (arch === 'must-cross-heavy') {
        return ['mustCrossFirst', 'harvestThenFinish', 'knotBuilder', ...PROFILE_ORDER.filter(p => p !== 'mustCrossFirst' && p !== 'harvestThenFinish' && p !== 'knotBuilder')];
    }
    if (arch === 'portal-heavy') {
        return ['portalFirstTransfer', 'portalCommitted', ...PROFILE_ORDER.filter(p => p !== 'portalFirstTransfer' && p !== 'portalCommitted')];
    }
    return PROFILE_ORDER.slice();
}

// ─── Main solver ──────────────────────────────────────────────────────────────

async function solveLevelV2(level, opts = {}) {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const levelStartTime = Date.now();
    const prep         = prepLevel(level);
    const profileOrder = getProfileOrder(level);
    const gateKeys     = Array.isArray(level.gateKeys) ? level.gateKeys : [];

    const attempts = [];
    let solution   = null;

    // Budget scheme: divide total budget equally among gates, then let profiles
    // within each gate share the gate's budget naturally (each profile uses
    // whatever time remains in the gate's budget).
    const perGateBudgetMs = Math.floor(timeBudgetMs / Math.max(1, gateKeys.length));

    outer:
    for (const gateKey of gateKeys) {
        const gateElapsed = Date.now() - levelStartTime;
        if (gateElapsed >= timeBudgetMs) break outer;

        const gateStartTime = Date.now();
        const gateBudget    = Math.min(perGateBudgetMs, timeBudgetMs - gateElapsed);

        for (const profileName of profileOrder) {
            // Stop gate when its budget is used up
            if (Date.now() - gateStartTime >= gateBudget) break;

            const profile   = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
            const attemptStart = Date.now();

            let path = null;
            try {
                // Each profile within a gate shares the gate's budget via gateStartTime
                path = dfsFromGate(gateKey, level, prep, profile, gateBudget, gateStartTime);
            } catch (_) { /* ignore */ }

            const attemptMs = Date.now() - attemptStart;
            attempts.push({ gateKey, profile: profileName, ok: !!path, elapsedMs: attemptMs });

            if (path) { solution = path; break outer; }
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
