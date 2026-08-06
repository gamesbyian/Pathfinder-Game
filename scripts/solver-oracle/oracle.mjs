/**
 * Independent reference/oracle solver (docs/solver-dev-tooling-plan.md Component F).
 *
 * INDEPENDENCE, BY DESIGN: this file shares ZERO implementation with modules/solver/
 * search-state.ts, solution.ts, or lower-bounds.ts. It re-derives move legality and the win
 * condition directly from the game rules (CLAUDE.md's mechanics table), cross-checked against
 * the actual production behavior only by READING it (never importing it) while writing this —
 * so a bug shared between "the thing being tested" and "the thing checking it" (the exact
 * failure mode of the real MST-bound scratch-buffer bug this repo already shipped once, see
 * CLAUDE.md's memoization gotcha) cannot silently pass both. Coordinates are plain "x,y" string
 * keys, not the packed-integer scheme modules/solver uses — a deliberately different
 * representation, not just a different file, to keep the two implementations genuinely separate.
 *
 * SCOPE: gate/goal/block/mustPass/mustCross/portal/regular-filter/flipping-filter/geese/
 * falseGoals/landmarks (surround, mustTurn incl. cw/ccw, adjacentTurn incl. cw/ccw, decorative).
 * Landmark support (2026-08-06) is independently re-derived from CLAUDE.md's landmark table and
 * from READING (never importing) path-validator.ts's post-loop landmark checks — including its
 * own `turnsAtCell` map idea, which this file re-implements from scratch rather than sharing.
 * Turn-direction geometry (this file's local `turnDirection`) is likewise re-derived rather than
 * imported from domain/geometry.ts, specifically so a bug in that shared math couldn't silently
 * pass both this oracle and the domain arm it's cross-checked against in fuzz.mjs.
 *
 * Prioritizes correctness/auditability over speed throughout (plain Maps/Sets, full state
 * clones per branch instead of undo tokens) — this file exists to be trustworthy, not fast; see
 * fuzz.mjs for why it only needs to handle small/medium levels.
 */

export const AXIS_H = 'H';
export const AXIS_V = 'V';

const key = (x, y) => `${x},${y}`;
const parseKey = (k) => k.split(',').map(Number);
const DIRS = [[1, 0, AXIS_H], [-1, 0, AXIS_H], [0, 1, AXIS_V], [0, -1, AXIS_V]];
// 8-direction deltas for surround/adjacent-turn neighbor scans. Order is arbitrary (unlike DIRS'
// axis tagging above, no code branches on WHICH of the 8 it is) but fixed for determinism.
const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

function inBounds(level, x, y) {
    return x >= 0 && y >= 0 && x < level.grid.w && y < level.grid.h;
}

// Independent re-derivation of domain/geometry.ts's turnDirection (same 3-point cross-product
// test — the only mathematically correct one for turn chirality — but not imported; see file
// doc for why this arm keeps its own copy of the turn geometry). Returns 'cw'/'ccw'/null.
function turnDirection(prevKey, fromKey, targetKey) {
    const [px, py] = parseKey(prevKey);
    const [fx, fy] = parseKey(fromKey);
    const [tx, ty] = parseKey(targetKey);
    const cross = (fx - px) * (ty - fy) - (fy - py) * (tx - fx);
    if (cross === 0) return null;
    return cross > 0 ? 'cw' : 'ccw';
}

// Structural impassability: true for every purpose, independent of path state.
function isStructurallyImpassable(level, k) {
    return level.blocks.has(k) || level.geese.has(k) || level.falseGoals.has(k);
}

// getLegalMoves' TARGET exclusion additionally forbids gates (can't re-enter once left — a
// path-stateful rule, matching staticNeighborKeys' target-side gate exclusion). NOT used for
// bfsDistances: a gate is where the path STARTS, so treating it as impassable there would make
// the admissible bound wrong at the very first step (the start cell would be "unreachable").
function isImpassable(level, k) {
    return isStructurallyImpassable(level, k) || level.gates.has(k);
}

/** Parses raw (1-indexed) wire-format level JSON into oracle's own plain representation.
 *  Independent of modules/solver/normalization.ts by design (see file doc). */
export function parseOracleLevel(raw) {
    const adj = (v) => Number(v) - 1;
    const grid = { w: Number(raw.grid?.w) || 0, h: Number(raw.grid?.h) || 0 };
    const blocks = new Set((raw.blocks || []).map((b) => key(adj(b.x), adj(b.y))));
    const geese = new Set((raw.geese || []).map((g) => key(adj(g.x), adj(g.y))));
    const falseGoals = new Set((raw.falseGoals || []).map((g) => key(adj(g.x), adj(g.y))));
    const gates = new Set((raw.gates || []).map((g) => key(adj(g.x), adj(g.y))));
    const goal = key(adj(raw.goal.x), adj(raw.goal.y));
    const mustPass = new Set((raw.mustPass || []).map((m) => key(adj(m.x), adj(m.y))));
    const mustCross = new Set((raw.mustCross || []).map((m) => key(adj(m.x), adj(m.y))));
    const portalMap = new Map();
    (raw.portals || []).forEach((p) => {
        const k1 = key(adj(p.x1), adj(p.y1)), k2 = key(adj(p.x2), adj(p.y2));
        portalMap.set(k1, k2);
        portalMap.set(k2, k1);
    });
    const filters = new Map();
    (raw.filters || []).forEach((f) => filters.set(key(adj(f.x), adj(f.y)), Number(f.axis) === 2 ? AXIS_V : AXIS_H));
    const flippingFilters = new Map();
    (raw.flippingFilters || []).forEach((f) => flippingFilters.set(key(adj(f.x), adj(f.y)), Number(f.axis) === 2 ? AXIS_V : AXIS_H));

    // Landmarks: independently re-derived wire-format parsing (own switch, not importing
    // domain/landmark-rules.ts's applyLandmark/resolveLandmarkTurn/baseLandmarkRole) — see file
    // doc. surroundKeys/adjacentTurn are impassable (folded into `blocks`); mustTurn cells are
    // passable must-visit cells with a turn requirement (folded into `mustPass` too, matching the
    // game rule that a must-turn cell is also a must-pass cell).
    const surroundKeys = new Set();
    const mustPassTurnDirs = new Map();   // key -> 'either'|'cw'|'ccw'
    const adjacentTurn = new Map();       // key -> 'either'|'cw'|'ccw'
    const hasLandmarks = Array.isArray(raw.landmarks) && raw.landmarks.length > 0;
    (raw.landmarks || []).forEach((lm) => {
        if (!lm || !lm.role) return;
        const k = key(adj(lm.x), adj(lm.y));
        const turnDir = lm.role === 'mustTurnCcw' || lm.role === 'adjacentTurnCcw' ? 'ccw'
            : lm.role === 'mustTurnCw' || lm.role === 'adjacentTurnCw' ? 'cw'
            : (lm.turn === 'cw' || lm.turn === 'ccw') ? lm.turn : 'either';
        const role = lm.role === 'mustTurnCw' || lm.role === 'mustTurnCcw' ? 'mustTurn'
            : lm.role === 'adjacentTurnCw' || lm.role === 'adjacentTurnCcw' ? 'adjacentTurn'
            : lm.role;
        switch (role) {
            case 'surround':
                surroundKeys.add(k);
                blocks.add(k);
                break;
            case 'mustPass':
                mustPass.add(k);
                break;
            case 'mustTurn':
                mustPass.add(k);
                mustPassTurnDirs.set(k, turnDir);
                break;
            case 'adjacentTurn':
                adjacentTurn.set(k, turnDir);
                blocks.add(k);
                break;
            case 'decorative':
            default:
                blocks.add(k);
                break;
        }
    });

    const gateKeys = [...gates];
    return {
        grid, blocks, geese, falseGoals, gates, goal, mustPass, mustCross,
        portalMap, filters, flippingFilters, hasLandmarks, gateKeys,
        surroundKeys, mustPassTurnDirs, adjacentTurn,
        reqLen: Number(raw.reqLen), reqInt: Number(raw.reqInt),
    };
}

export function createOracleState(level, startKey) {
    return {
        path: [startKey],
        visited: new Map([[startKey, 1]]),
        edgeUsage: new Map(),
        ints: 0,
        portalJumps: 0,
        lastWasPortalJump: false,
        mpVisited: new Set(level.mustPass.has(startKey) ? [startKey] : []),
        crossCounts: new Map(level.mustCross.has(startKey) ? [[startKey, 1]] : []),
        flipperUsed: new Set(),
        flipperUsedCount: 0,
        turnsAtCell: new Map(),   // key -> 'cw'|'ccw'|'both', mirrors path-validator.ts's own map
    };
}

function cloneState(state) {
    return {
        path: state.path.slice(),
        visited: new Map(state.visited),
        edgeUsage: new Map([...state.edgeUsage].map(([k, v]) => [k, new Set(v)])),
        ints: state.ints,
        portalJumps: state.portalJumps,
        lastWasPortalJump: state.lastWasPortalJump,
        mpVisited: new Set(state.mpVisited),
        crossCounts: new Map(state.crossCounts),
        flipperUsed: new Set(state.flipperUsed),
        flipperUsedCount: state.flipperUsedCount,
        turnsAtCell: new Map(state.turnsAtCell),
    };
}

/** Re-derives modules/solver/search-state.ts's getNeighbors + isMoveDynamicallyValid rules
 *  independently (see that file's exact logic for the rules this mirrors, understood by
 *  reading — not importing — it): portal forcing, regular/flipping-filter axis restriction,
 *  per-cell per-axis single-use ("edge usage"), the must-cross-lock turn restriction, and the
 *  global flipping-filter parity rule. Returns an array of candidate keys (string "x,y"). */
export function getLegalMoves(level, state) {
    const pos = state.path[state.path.length - 1];

    // Portal forced move: bypasses every other rule, exactly like getNeighbors' own forced
    // branch — including not re-checking whether dest was already visited (matches production).
    if (level.portalMap.has(pos) && !state.lastWasPortalJump) {
        const dest = level.portalMap.get(pos);
        return isImpassable(level, dest) ? [] : [dest];
    }

    const [px, py] = parseKey(pos);
    let entryAxis = null;
    if (state.path.length >= 2 && !state.lastWasPortalJump) {
        const [, prevY] = parseKey(state.path[state.path.length - 2]);
        entryAxis = prevY === py ? AXIS_H : AXIS_V;
    }

    const legal = [];
    for (const [dx, dy, moveAxis] of DIRS) {
        const nx = px + dx, ny = py + dy;
        if (!inBounds(level, nx, ny)) continue;
        const nk = key(nx, ny);
        if (isImpassable(level, nk)) continue;

        // Regular (static) filter axis restriction, both leaving and entering.
        const filterFrom = level.filters.get(pos);
        if (filterFrom && filterFrom !== moveAxis) continue;
        const filterTarget = level.filters.get(nk);
        if (filterTarget && filterTarget !== moveAxis) continue;

        // Portal terminal revisit: any portal cell may only ever be visited once.
        if (level.portalMap.has(nk) && state.visited.has(nk)) continue;

        // Per-cell per-axis single use: a cell may be entered/exited along a given axis at
        // most once across the whole path (this is the general mechanic must-cross's "two
        // crossings, one per axis" flavor text is a special case of).
        const targetAxes = state.edgeUsage.get(nk);
        if (targetAxes && targetAxes.has(moveAxis)) continue;

        // Turning re-use: exiting `pos` via a different axis than we entered it requires that
        // exit axis to not already be used at `pos`.
        if (entryAxis !== null && moveAxis !== entryAxis) {
            const fromAxes = state.edgeUsage.get(pos);
            if (fromAxes && fromAxes.has(moveAxis)) continue;
        }

        // Must-cross lock prevention: turning at a 1st-pass (not-yet-satisfied) must-cross
        // cell would use both axis bits in one visit, permanently blocking the required 2nd
        // (different-axis) crossing — so such a turn is illegal.
        if (level.mustCross.has(pos) && (state.crossCounts.get(pos) || 0) === 1) {
            const fromAxes = state.edgeUsage.get(pos) || new Set();
            const eH = fromAxes.has(AXIS_H), eV = fromAxes.has(AXIS_V);
            if ((eH && !eV && moveAxis === AXIS_V) || (!eH && eV && moveAxis === AXIS_H)) continue;
        }

        // Flipping filter at source: cannot turn there at all.
        if (level.flippingFilters.has(pos) && entryAxis !== null && entryAxis !== moveAxis) continue;

        // Flipping filter at target: single-use, must match its CURRENT axis (global parity:
        // every still-unused flipper shares the same current axis, flipping each time ANY
        // flipper anywhere in the level is used).
        if (level.flippingFilters.has(nk)) {
            if (state.flipperUsed.has(nk)) continue;
            const initAxis = level.flippingFilters.get(nk);
            const curAxis = state.flipperUsedCount % 2 === 0 ? initAxis : (initAxis === AXIS_H ? AXIS_V : AXIS_H);
            if (curAxis !== moveAxis) continue;
        }

        legal.push(nk);
    }
    return legal;
}

/** Mutates `state` in place to apply a move already confirmed legal by getLegalMoves.
 *  Mirrors search-state.ts's applyMove bookkeeping, independently re-derived. */
export function applyOracleMove(level, state, nextKey) {
    const pos = state.path[state.path.length - 1];
    const isPortalJump = level.portalMap.has(pos) && !state.lastWasPortalJump && level.portalMap.get(pos) === nextKey;

    let moveAxis = null;
    if (!isPortalJump) {
        const [, py] = parseKey(pos);
        const [, ny] = parseKey(nextKey);
        moveAxis = ny === py ? AXIS_H : AXIS_V;
    }

    const prevVisited = state.visited.get(nextKey) || 0;
    state.visited.set(nextKey, prevVisited + 1);
    state.path.push(nextKey);
    if (isPortalJump) state.portalJumps++;

    if (moveAxis) {
        if (!state.edgeUsage.has(pos)) state.edgeUsage.set(pos, new Set());
        if (!state.edgeUsage.has(nextKey)) state.edgeUsage.set(nextKey, new Set());
        state.edgeUsage.get(pos).add(moveAxis);
        state.edgeUsage.get(nextKey).add(moveAxis);
    }

    if (prevVisited > 0 && nextKey !== level.goal && !level.gates.has(nextKey)) state.ints++;
    if (level.mustPass.has(nextKey) && prevVisited === 0) state.mpVisited.add(nextKey);
    if (level.mustCross.has(nextKey)) state.crossCounts.set(nextKey, (state.crossCounts.get(nextKey) || 0) + 1);
    if (!isPortalJump && level.flippingFilters.has(nextKey)) {
        state.flipperUsed.add(nextKey);
        state.flipperUsedCount++;
    }

    // Turn tracking at `pos` (the cell being exited): independently re-derives
    // path-validator.ts's turnsAtCell bookkeeping — a turn happens AT pos when the entry step
    // (prevOfPos -> pos) and the exit step (pos -> nextKey) are both real (non-portal) moves and
    // aren't colinear. Feeds mustTurn/adjacentTurn win-condition checks in isOracleSolution.
    if (!isPortalJump && !state.lastWasPortalJump && state.path.length >= 3) {
        const prevOfPos = state.path[state.path.length - 3];
        const dir = turnDirection(prevOfPos, pos, nextKey);
        if (dir) {
            const existing = state.turnsAtCell.get(pos);
            state.turnsAtCell.set(pos, !existing ? dir : existing !== dir ? 'both' : existing);
        }
    }

    state.lastWasPortalJump = isPortalJump;
    return state;
}

// Passable, non-structurally-impassable 8-adjacent neighbor keys of `k` (surround/adjacent-turn
// neighbor scans share this — both only care about cells the path could actually have visited).
function passableNeighbors8(level, k) {
    const [x, y] = parseKey(k);
    const out = [];
    for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(level, nx, ny)) continue;
        const nk = key(nx, ny);
        if (isStructurallyImpassable(level, nk)) continue;
        out.push(nk);
    }
    return out;
}

/** Independently re-derives solution.ts's isSolutionState, plus (2026-08-06) the landmark
 *  win-condition checks independently re-derived from path-validator.ts's post-loop logic. */
export function isOracleSolution(level, state) {
    const pos = state.path[state.path.length - 1];
    if (pos !== level.goal) return false;
    const realLen = state.path.length - 1 - state.portalJumps;
    if (realLen !== level.reqLen) return false;
    if (state.ints !== level.reqInt) return false;
    for (const mp of level.mustPass) if (!state.mpVisited.has(mp)) return false;
    for (const mc of level.mustCross) if ((state.crossCounts.get(mc) || 0) < 2) return false;

    // Surround: every passable 8-neighbor of each surround landmark must have been visited.
    for (const sk of level.surroundKeys) {
        for (const nk of passableNeighbors8(level, sk)) {
            if (!state.visited.has(nk)) return false;
        }
    }

    // Must-turn: each must-turn cell needs a turn of the required direction at some visit.
    for (const [k, req] of level.mustPassTurnDirs) {
        const t = state.turnsAtCell.get(k);
        if (!t) return false;
        if (req !== 'either' && t !== req && t !== 'both') return false;
    }

    // Adjacent-turn: each adj-turn landmark needs the required turn at ONE of its 8 neighbors.
    for (const [ak, req] of level.adjacentTurn) {
        let satisfied = false;
        for (const nk of passableNeighbors8(level, ak)) {
            const t = state.turnsAtCell.get(nk);
            if (t && (req === 'either' || t === req || t === 'both')) { satisfied = true; break; }
        }
        if (!satisfied) return false;
    }

    return true;
}

/** Portal-aware 0-1 BFS over passable cells, ignoring every OTHER dynamic constraint (filter
 *  axes, edge-usage, flipper state, gate re-entry). This can only ever UNDER-count true
 *  remaining COUNTED distance (fewer constraints ⇒ an equal-or-more-connected graph, and a
 *  portal jump is genuinely free), so it is trivially admissible as a lower bound — the only
 *  pruning rule this oracle uses, deliberately nothing resembling the MST bound (see file doc).
 *
 *  Portals MUST be modeled here, not just ignored: a portal can genuinely shorten the true
 *  counted distance below what plain grid-adjacency BFS would compute, so ignoring it would make
 *  this bound an OVERESTIMATE on portal-bearing levels — unsound, not just imprecise, since it
 *  could then wrongly prune a real solution. A portal step costs 0 (matching the real game's
 *  "portal jumps are free"), so this is a 0-1 BFS: portal edges relax at the SAME distance as the
 *  current cell (processed via an in-order deque), grid-adjacency edges at distance+1. */
export function bfsDistances(level, fromKey) {
    const dist = new Map([[fromKey, 0]]);
    const deque = [fromKey];
    let head = 0;
    while (head < deque.length) {
        const cur = deque[head++];
        const curDist = dist.get(cur);

        // Zero-cost portal edge: relax at the same distance, process at the FRONT (before any
        // already-queued distance+1 grid neighbors) — standard 0-1 BFS ordering.
        const portalDest = level.portalMap.get(cur);
        if (portalDest !== undefined && !isStructurallyImpassable(level, portalDest)) {
            if (!dist.has(portalDest) || dist.get(portalDest) > curDist) {
                dist.set(portalDest, curDist);
                deque.splice(head, 0, portalDest);
            }
        }

        const [x, y] = parseKey(cur);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(level, nx, ny)) continue;
            const nk = key(nx, ny);
            if (isStructurallyImpassable(level, nk)) continue;
            if (dist.has(nk)) continue;
            dist.set(nk, curDist + 1);
            deque.push(nk);
        }
    }
    return dist;
}

/** Small brute-force DFS (full-state-clone per branch, not undo tokens — see file doc) with
 *  exactly one admissible pruning rule (bfsDistances). Returns one of three verdicts, never a
 *  bare "unsolvable" (see docs/solver-dev-tooling-plan.md Component F's invariants):
 *    - { verdict: 'solved', path, nodesExpanded }
 *    - { verdict: 'unsolvable-within-searched-space', nodesExpanded } — the search exhausted
 *      every avenue within nodeBudget without reaching the node cap mid-branch.
 *    - { verdict: 'inconclusive', reason, nodesExpanded } — node budget reached.
 */
export function oracleSolve(level, startKey, { nodeBudget = 2_000_000 } = {}) {
    const goalDist = bfsDistances(level, level.goal);
    let nodes = 0;
    let hitBudget = false;

    // Explicit stack (not recursion) to avoid JS call-stack depth concerns on long reqLen.
    // Each frame owns its own state snapshot (see cloneState) — simple, not fast, by design.
    const initial = createOracleState(level, startKey);
    const stack = [{ state: initial, moves: null, idx: 0 }];

    while (stack.length > 0) {
        if (hitBudget) break;
        const frame = stack[stack.length - 1];
        if (frame.moves === null) {
            nodes++;
            if (nodes > nodeBudget) { hitBudget = true; break; }
            if (isOracleSolution(level, frame.state)) {
                return { verdict: 'solved', path: frame.state.path.slice(), nodesExpanded: nodes };
            }
            const pos = frame.state.path[frame.state.path.length - 1];
            const realLen = frame.state.path.length - 1 - frame.state.portalJumps;
            const remaining = level.reqLen - realLen;
            if (remaining < 0) { stack.pop(); continue; }
            const gd = goalDist.get(pos);
            if (gd === undefined || gd > remaining) { stack.pop(); continue; }
            frame.moves = getLegalMoves(level, frame.state);
            frame.idx = 0;
        }
        if (frame.idx >= frame.moves.length) { stack.pop(); continue; }
        const nextKey = frame.moves[frame.idx++];
        const childState = cloneState(frame.state);
        applyOracleMove(level, childState, nextKey);
        stack.push({ state: childState, moves: null, idx: 0 });
    }

    return hitBudget
        ? { verdict: 'inconclusive', reason: `node budget (${nodeBudget}) reached`, nodesExpanded: nodes }
        : { verdict: 'unsolvable-within-searched-space', nodesExpanded: nodes };
}
