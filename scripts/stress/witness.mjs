// Stress-corpus witness engine.
//
// Generates "witness" paths — legal Pathfinder solutions built BEFORE the level exists —
// and provides the exact-validation glue that keeps every later decoration step honest.
// The walker mirrors the movement rules in modules/domain/move-rules.ts (per-cell axis
// usage, gate re-entry ban, goal-is-terminal, portal forcing/no-reuse), but nothing is
// trusted to the mirror: every witness and every decorated level is re-checked with the
// domain referee `validateCandidatePath` before acceptance. The production solver is
// never imported here.
import { PACK, UNPACK } from '../../modules/domain/cell-key.js';
import { turnDirection } from '../../modules/domain/geometry.js';
import { validateCandidatePath } from '../../modules/domain/path-validator.js';
import { validateRawLevel } from '../../modules/domain/level-schema.js';
import { normalizeRawLevel } from '../../modules/solver/normalization.js';

// ─── Deterministic RNG ───────────────────────────────────────────────────────

export function mulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Stable 32-bit hash of any list of small ints/strings — used to derive nested seeds. */
export function hashSeed(...parts) {
    let h = 2166136261 >>> 0;
    for (const part of parts) {
        const s = String(part);
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
    }
    return h >>> 0;
}

export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ─── Walker internals ────────────────────────────────────────────────────────

const AXIS_H = 1, AXIS_V = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * One randomized walk attempt. Returns the raw trace (may be longer than needed;
 * the caller picks the best legal truncation point) or null on an early dead end.
 */
function walkOnce(spec, rng) {
    const { w, h } = spec;
    const startKey = spec.startKey;
    const maxLen = spec.targetLen[1];

    const counts = new Map([[startKey, 1]]);
    const usage = new Map();          // key → {h, v}
    const terminals = new Set();      // portal terminal cells (never re-enterable)
    const path = [startKey];
    const jumps = new Set();          // path indices reached via portal jump
    const portalPairs = [];           // [{a, b}] in walk order
    const countAt = [1];              // visit count of path[i] at arrival time
    const crossAt = [0];              // cumulative crossings after arriving at path[i]
    let crossings = 0;
    let drawnLen = 0;                 // non-portal steps so far
    const drawnAt = [0];

    const hopPlan = (spec.portalHops || []).slice(); // fractions of targetLen, ascending
    const targetMid = spec.targetLen[0] + (spec.targetLen[1] - spec.targetLen[0]) / 2;

    const markAxis = (k, ax) => {
        let e = usage.get(k);
        if (!e) { e = { h: false, v: false }; usage.set(k, e); }
        if (ax === AXIS_H) e.h = true; else e.v = true;
    };

    const legalSteps = (cur, entryAxis) => {
        const cx = cur & 0xFFFF, cy = (cur >>> 16) & 0xFFFF;
        const out = [];
        for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = PACK(nx, ny);
            if (nk === startKey) continue;               // gate re-entry ban
            if (terminals.has(nk)) continue;             // used portal terminals
            const ax = dy === 0 ? AXIS_H : AXIS_V;
            const uN = usage.get(nk);
            if (uN && ((ax === AXIS_H && uN.h) || (ax === AXIS_V && uN.v))) continue;
            if (ax !== entryAxis) {
                const uC = usage.get(cur);
                if (uC && ((ax === AXIS_H && uC.h) || (ax === AXIS_V && uC.v))) continue;
            }
            out.push({ key: nk, x: nx, y: ny, axis: ax, dx, dy });
        }
        return out;
    };

    let entryAxis = 0; // axis of the move that arrived at the current cell (0 = none/jump)
    let lastDx = 0, lastDy = 0;

    while (drawnLen < maxLen) {
        const cur = path[path.length - 1];

        // Portal hop: scheduled by path-length fraction; only from a once-visited,
        // non-start cell. The pair is recorded and both cells become terminals.
        if (hopPlan.length > 0 && drawnLen >= hopPlan[0] * targetMid &&
            counts.get(cur) === 1 && cur !== startKey && !terminals.has(cur)) {
            hopPlan.shift();
            const landing = sampleHopLanding(spec, rng, { counts, terminals, startKey, cur });
            if (landing !== null) {
                portalPairs.push({ a: cur, b: landing });
                terminals.add(cur).add(landing);
                path.push(landing);
                jumps.add(path.length - 1);
                counts.set(landing, 1);
                countAt.push(1);
                crossAt.push(crossings);
                drawnAt.push(drawnLen);
                entryAxis = 0;
                lastDx = 0; lastDy = 0;
                continue;
            }
        }

        const steps = legalSteps(cur, entryAxis);
        if (steps.length === 0) break;

        // Optional two-phase pull: after `returnHome` fraction of the target length the
        // attractor snaps to the start cell (delayed-closure witnesses wander, then return).
        let attractor = spec.attractor, wAttract = spec.wAttract;
        if (spec.returnHome != null && drawnLen >= spec.returnHome * targetMid) {
            const sp = UNPACK(startKey);
            attractor = { x: sp.x, y: sp.y };
            wAttract = spec.returnPull ?? 1.2;
        }

        let best = null, bestScore = -Infinity;
        for (const s of steps) {
            const prevCount = counts.get(s.key) || 0;
            let score = rng() * spec.noise;
            if (s.dx === lastDx && s.dy === lastDy) score += spec.wStraight;
            const edgeDist = Math.min(s.x, s.y, w - 1 - s.x, h - 1 - s.y);
            score += spec.wPerimeter * (edgeDist === 0 ? 1 : edgeDist === 1 ? 0.35 : 0);
            score += spec.wInterior * Math.min(edgeDist, 3) / 3;
            if (prevCount > 0) score += spec.wCross;
            if (attractor) {
                const man = Math.abs(s.x - attractor.x) + Math.abs(s.y - attractor.y);
                score -= wAttract * man / (w + h);
            }
            if (score > bestScore) { bestScore = score; best = s; }
        }

        const prevCount = counts.get(best.key) || 0;
        counts.set(best.key, prevCount + 1);
        if (prevCount > 0) crossings++;
        markAxis(cur, best.axis);
        markAxis(best.key, best.axis);
        path.push(best.key);
        countAt.push(prevCount + 1);
        crossAt.push(crossings);
        drawnLen++;
        drawnAt.push(drawnLen);
        entryAxis = best.axis;
        lastDx = best.dx; lastDy = best.dy;
    }

    return { path, jumps, portalPairs, countAt, crossAt, drawnAt, terminals };
}

function sampleHopLanding(spec, rng, ctx) {
    const { w, h } = spec;
    const curP = UNPACK(ctx.cur);
    for (let tries = 0; tries < 40; tries++) {
        const x = randInt(rng, 0, w - 1), y = randInt(rng, 0, h - 1);
        const k = PACK(x, y);
        if ((ctx.counts.get(k) || 0) > 0 || ctx.terminals.has(k) || k === ctx.startKey) continue;
        const man = Math.abs(x - curP.x) + Math.abs(y - curP.y);
        if (spec.hopStyle === 'far' && man < Math.floor((w + h) / 3)) continue;
        if (spec.hopStyle === 'near' && man > 3) continue;
        return k;
    }
    return null;
}

/**
 * Generate a witness path for `spec`. Restarts the stochastic walk until a legal
 * truncation point satisfies the length/crossing targets, then confirms the whole
 * thing against the domain referee on a bare derived level.
 *
 * spec: {
 *   w, h, startKey, targetLen: [min,max], targetInt: [min,max],
 *   wStraight, wPerimeter, wInterior, wCross, wAttract, noise, attractor: {x,y}|null,
 *   portalHops: [fraction,...], hopStyle: 'far'|'near'|'any',
 *   endPref: (x, y, spec) => number  — higher is a better goal cell, -Infinity forbids,
 *   restarts,
 * }
 * Returns null if no witness found, else
 *   { path, jumps, portalPairs, reqLen, reqInt, startKey, goalKey, w, h }
 */
export function generateWitness(spec, rng) {
    const restarts = spec.restarts ?? 200;
    for (let attempt = 0; attempt < restarts; attempt++) {
        const trace = walkOnce(spec, rng);
        if (!trace || trace.path.length < 3) continue;
        const cut = chooseEnd(spec, trace, rng);
        if (cut === null) continue;
        const witness = finalizeWitness(spec, trace, cut);
        if (!witness) continue;
        const referee = refereeCheck(witness);
        if (referee.ok) return witness;
    }
    return null;
}

/** Pick the best legal truncation index for the walk trace, or null. */
function chooseEnd(spec, trace, rng) {
    const { path, jumps, countAt, crossAt, drawnAt, terminals } = trace;
    const [minLen, maxLen] = spec.targetLen;
    const [minInt, maxInt] = spec.targetInt;
    const candidates = [];
    for (let i = 2; i < path.length; i++) {
        const len = drawnAt[i];
        if (len < minLen || len > maxLen) continue;
        if (crossAt[i] < minInt || crossAt[i] > maxInt) continue;
        if (countAt[i] !== 1) continue; // goal must be a first visit (later visits are truncated away)
        // The goal must never be a portal terminal (source or destination): one object per
        // cell is an absolute invariant of the game model. A cut landing on a jump's
        // destination is exactly the bug this guard closes — see finalizeWitness's comment.
        if (terminals.has(path[i])) continue;
        const p = UNPACK(path[i]);
        const pref = spec.endPref ? spec.endPref(p.x, p.y, spec, { index: i, viaJump: jumps.has(i) }) : 0;
        if (pref === -Infinity) continue;
        candidates.push({ i, score: pref + rng() * 0.25 });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].i;
}

/** Truncate the trace at `cut`, drop unused portal pairs, derive level requirements. */
function finalizeWitness(spec, trace, cut) {
    const path = trace.path.slice(0, cut + 1);
    const jumps = new Set([...trace.jumps].filter(i => i <= cut));
    // Keep only portal pairs whose jump survived the cut, in walk order.
    const keptPairs = [];
    let jumpCount = 0;
    for (const i of [...trace.jumps].sort((a, b) => a - b)) {
        if (i <= cut) { keptPairs.push(trace.portalPairs[jumpCount]); }
        jumpCount++;
    }
    const goalKey = path[path.length - 1];
    // The goal can never be a *dropped* pair's cell (outside the prefix by construction, since
    // terminals are never re-entered) or a *kept* pair's entry/destination — chooseEnd rejects
    // any cut landing on a portal terminal (see its `terminals.has(path[i])` guard) precisely so
    // this can't happen. (History: a missing guard here once let a generated level's portal
    // destination silently coincide with the goal cell — one object per cell is an absolute
    // invariant, not a heuristic — see validateRawLevel's cross-object occupancy check, which
    // now also gates every witness via validateWitnessOnRaw below as a second, independent net.)
    const reqLen = path.length - 1 - jumps.size;
    const reqInt = trace.crossAt[cut];
    if (reqLen < 2) return null;
    return {
        path, jumps, portalPairs: keptPairs,
        reqLen, reqInt,
        startKey: spec.startKey, goalKey,
        w: spec.w, h: spec.h,
    };
}

// ─── Raw-level assembly + exact validation ──────────────────────────────────

const PORTAL_COLORS = ['#84cc16', '#d946ef', '#f97316', '#0ea5e9'];

const to1 = (key) => { const p = UNPACK(key); return { x: p.x + 1, y: p.y + 1 }; };

/** Witness path (packed keys) → serializable 1-indexed [[x,y],…]. */
export function witnessToPairs(path) {
    return path.map(k => { const p = UNPACK(k); return [p.x + 1, p.y + 1]; });
}

/** Assemble a raw wire-format level (1-indexed) around a witness. Extras are optional. */
export function buildRawLevel(witness, extras = {}) {
    const raw = {
        grid: { w: witness.w, h: witness.h },
        gates: [to1(witness.startKey), ...(extras.decoyGates || []).map(to1)],
        goal: to1(witness.goalKey),
        falseGoals: (extras.falseGoals || []).map(to1),
        reqLen: witness.reqLen,
        reqInt: witness.reqInt,
        blocks: (extras.blocks || []).map(to1),
        mustPass: (extras.mustPass || []).map(to1),
        mustCross: (extras.mustCross || []).map(to1),
        filters: [], // static filters are forbidden in the stress corpus by design
        flippingFilters: (extras.flippingFilters || []).map(f => ({ ...to1(f.key), axis: f.axis })),
        portals: [...witness.portalPairs, ...(extras.decoyPortals || [])].map((p, i) => {
            const a = to1(p.a), b = to1(p.b);
            return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: PORTAL_COLORS[i % PORTAL_COLORS.length] };
        }),
        geese: (extras.geese || []).map(to1),
        designerName: 'stress-generator',
        description: extras.description || '',
        difficulty: null,
    };
    if (extras.landmarks && extras.landmarks.length > 0) {
        raw.landmarks = extras.landmarks.map(lm => {
            const p = to1(lm.key);
            const entry = { x: p.x, y: p.y, objectType: lm.objectType, role: lm.role };
            if (lm.turn) entry.turn = lm.turn;
            return entry;
        });
    }
    return raw;
}

/**
 * Exact witness validation: check raw schema/structural invariants (including cross-object
 * occupancy — see validateRawLevel's comment), then normalize and run the domain referee
 * (PLAY-mode rules — the strictest context) over the witness path. The schema check catches
 * structural defects (like an object overlap) that the path referee has no way to see, since it
 * only validates move legality along the witness path, not whether the level's object placements
 * are individually well-formed — this is what should have caught the portal-onto-goal bug (see
 * chooseEnd/finalizeWitness's comments) directly, rather than relying solely on prevention there.
 */
export function validateWitnessOnRaw(raw, witnessPath) {
    const schema = validateRawLevel(raw);
    if (!schema.ok) return { ok: false, reason: `schema: ${schema.errors.join('; ')}` };
    let normalized;
    try {
        normalized = normalizeRawLevel(raw, null);
    } catch (err) {
        return { ok: false, reason: `normalize: ${err?.message}` };
    }
    const result = validateCandidatePath(normalized, witnessPath);
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

/** Referee check for a bare (undecorated) witness. */
function refereeCheck(witness) {
    return validateWitnessOnRaw(buildRawLevel(witness), witness.path);
}

// ─── Witness-derived cell sets (decoration targets) ─────────────────────────

/** Per-witness cell/turn bookkeeping used by the decoration passes. */
export function witnessCellData(witness) {
    const { path, jumps, w, h } = witness;
    const counts = new Map();
    for (const k of path) counts.set(k, (counts.get(k) || 0) + 1);
    const visitedOnce = [], visitedTwice = [];
    for (const [k, c] of counts) {
        if (c === 1) visitedOnce.push(k);
        else visitedTwice.push(k);
    }
    const unvisited = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = PACK(x, y);
        if (!counts.has(k)) unvisited.push(k);
    }
    // Turns mirroring the referee: recorded at path[i-1] only when both the arrival
    // at path[i-1] and the departure to path[i] are drawn (non-jump) steps.
    const turnsAtCell = new Map();
    for (let i = 2; i < path.length; i++) {
        if (jumps.has(i) || jumps.has(i - 1)) continue;
        const dir = turnDirection(path[i - 2], path[i - 1], path[i]);
        if (!dir) continue;
        const existing = turnsAtCell.get(path[i - 1]);
        turnsAtCell.set(path[i - 1], !existing ? dir : existing !== dir ? 'both' : existing);
    }
    // Straight-through cells (candidate flipping-filter sites): entered and left on
    // the same axis on every drawn traversal — the referee forbids turning on a flipper.
    const straightThrough = [];
    for (const k of visitedOnce.concat(visitedTwice)) {
        if (k === path[0] || k === path[path.length - 1]) continue;
        if (turnsAtCell.has(k)) continue;
        let isTerminal = false;
        for (const p of witness.portalPairs) if (p.a === k || p.b === k) { isTerminal = true; break; }
        if (!isTerminal) straightThrough.push(k);
    }
    const terminalSet = new Set();
    for (const p of witness.portalPairs) terminalSet.add(p.a).add(p.b);
    return { counts, visitedOnce, visitedTwice, unvisited, turnsAtCell, straightThrough, terminalSet };
}
