#!/usr/bin/env node
/**
 * Measures the frontier a meet-in-the-middle / bidirectional search would have to STORE.
 *
 * WHY THIS EXISTS. Bidirectional search has been proposed as "the lever with the right shape" at
 * least twice in committed reports (2026-07-30-move-ordering-not-the-bottleneck.md,
 * 2026-07-31-mustcross-forced-structure.md) and rejected in conversation more times than that, with
 * the rejection never written down — so it kept being re-proposed. This is the measurement that
 * settles the scale half of the question. The structural half is in docs/future-work.md; read that
 * first, because a good idea about frontier compression does NOT reopen the case.
 *
 * REWRITE 2026-08-05, TWICE — the first rewrite fixed the dedup key, the second (this one) fixed
 * the resulting memory profile after it OOM'd in CI:
 *
 * 1. UNSOUND KEY (undercounts states, biasing the whole measurement toward false optimism).
 *    The original key was `position + visited-count-per-cell + mustPassMask + mustCrossMask + ints`
 *    — a pure multiset, no move-order information. But `isMoveDynamicallyValid`'s general rule
 *    (search-state.ts: `if (state.edgeUsage[target] & axisBit) return false`) means a cell entered
 *    once via axis H can NEVER be re-entered via H again — this applies to EVERY cell, not just
 *    must-cross ones. Two states with the identical visited-cell multiset but a different entry
 *    axis at some once-visited cell have genuinely different future legality, and the old key
 *    silently merged them. Fixed by keying each visited cell on (count, edgeUsage) instead of count
 *    alone, plus `entryAxis` at the current position, `lastWasPortalJump`, `portalJumps`,
 *    `flipperUsedMask`, `mustTurnMask`, `adjTurnMask`, `surroundMask` — all present in
 *    `SolverSearchState` and all absent from the old key.
 *
 * 2. O(depth) PER SUCCESSOR in the ORIGINAL script (why it died at depth ~20): it reconstructed a
 *    fresh `createState` (two fresh KEY_SPACE = 2^20-element typed arrays, ~3MB) plus a full
 *    move-by-move replay for every frontier entry at every depth.
 *
 * 3. UNBOUNDED MEMORY in the FIRST rewrite of this file (why it OOM'd in CI at cap=5,000,000): it
 *    fixed #2 by doing a single DFS with a `Set<string>` of seen keys PER DEPTH — correct and fast,
 *    but every depth's Set has to stay live for the ENTIRE traversal (a late DFS branch can still
 *    be the first to reach an early depth), so real memory was the SUM across all ~40 depths, not
 *    the capped one. A cap sized against "one depth's Set" therefore let total memory run to
 *    several times the cap before the check ever fired.
 *
 * FIXED (this version) by going back to an explicit BFS — genuinely only 2 depths resident at
 * once (the frontier being expanded, and the next one being built; the old one is simply dropped
 * and GC'd) — while avoiding the original script's O(depth) replay by storing a COMPACT SNAPSHOT
 * per frontier entry instead of a path array: the visited cells as a sorted `Int32Array` of
 * `(key<<4)|(visitedCount<<2)|edgeUsage` (visitedCount ≤2, edgeUsage ≤3, both 2 bits — this is
 * exactly the sound key's own per-cell content, just packed), plus the small scalar/array fields.
 * "Hydrating" a snapshot into a single reusable pair of KEY_SPACE-sized buffers (mirroring
 * search-state.ts's own `_stateBufs` pattern) is then a handful of direct array writes — no
 * game-logic replay — after which the REAL `applyMove`/`getNeighbors`/`undoMove` explore all of
 * that state's children with ordinary O(1) DFS-style push/pop, each child re-snapshotted before
 * the buffers are reused for the next frontier entry.
 *
 * Dedup keys are SHA-1 hex digests of the same canonical content the old raw-string key used, not
 * the raw string itself — a growing raw string (up to ~1-2KB at depth 40+) as the STORED Map key
 * for millions of entries was itself a real memory cost; a 40-char digest is a large, fixed-size
 * saving with a collision probability (~states²/2^161) that stays negligible at any depth this
 * probe will ever reach. The KEY *CONTENT* — what must and must not distinguish two states — is
 * unchanged from the previous rewrite; only its representation for storage changed.
 *
 * WHAT IT DOES NOT DO. This is still an OVER-approximation of the "storable" state count in one
 * sense: it enumerates every state reachable via the real move-legality rules, without asking
 * whether that state can still reach the goal (a live "is this branch already dead" filter would
 * shrink it further, but conflating that question with the frontier-SIZE question is exactly what
 * future-work.md's method note warns against — measure the frontier, not solvability).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/mitm-frontier-probe.mjs -- \
 *     --level=R00044 [--corpus=data/stress/stress-levels-random.json] [--max-depth=<n>]
 *     [--cap=<n>] [--out=reports/stress/mitm-frontier-R00044.json]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove, getNeighbors } = await import('../../modules/solver/search-state.js');
const { AXIS_H, KEY_SPACE } = await import('../../modules/solver/encoding.js');

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const levelId = arg('level', process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'R00044');
const corpusFile = arg('corpus', 'data/stress/stress-levels-random.json');
const CAP = Number(arg('cap', '3000000'));
const outFile = arg('out', null);

const levels = readLevelsWithHints(path.join(root, corpusFile));
const raw = levels.find(l => l.id === levelId);
if (!raw) { console.error(`${levelId}: not in ${corpusFile}.`); process.exit(1); }
const level = normalizeRawLevel(raw);
const prep = prepLevel(level);
prep._cfg = null;
prep._metrics = { nodesExpanded: 0 };

const maxDepth = Number(arg('max-depth', String(Math.ceil(level.requiredLength / 2))));
const nFlippers = (raw.flippingFilters || []).length;
const nPortals = (raw.portals || []).length;
const nMustCross = (raw.mustCross || []).length;
console.log(`${levelId}: requiredLength=${level.requiredLength} requiredIntersections=${level.requiredIntersections} grid=${level.grid.w}x${level.grid.h} ` +
    `flippingFilters=${nFlippers} portals=${nPortals} mustCross=${nMustCross}; meet depth ${maxDepth}, cap ${CAP.toLocaleString()}`);

function entryAxisAt(state) {
    const len = state.path.length;
    if (len < 2 || state.lastWasPortalJump) return 0;
    const prev = state.path[len - 2], pos = state.path[len - 1];
    const py = (prev >>> 16) & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
    return py === y ? AXIS_H : (AXIS_H === 1 ? 2 : 1);
}

// Compact per-cell packing for both the snapshot payload and the key material: visitedCount ≤2,
// edgeUsage ≤3 -- 2 bits each -- packed onto the 20-bit cell key. See file header.
function packCells(state, visitedList) {
    const out = new Int32Array(visitedList.length);
    for (let i = 0; i < visitedList.length; i++) {
        const k = visitedList[i];
        out[i] = (k << 4) | (state.visited[k] << 2) | state.edgeUsage[k];
    }
    out.sort();
    return out;
}

function snapshotFrom(state, visitedList) {
    const pathLen = state.path.length;
    return {
        pos: state.path[pathLen - 1],
        prevPos: pathLen >= 2 ? state.path[pathLen - 2] : null,
        lastWasPortalJump: state.lastWasPortalJump,
        cellsPacked: packCells(state, visitedList),
        visitedList,
        mustMask: state.mustMask, mustCrossMask: state.mustCrossMask,
        crossCounts: state.crossCounts.slice(), mpVisitedMask: state.mpVisitedMask,
        ints: state.ints, portalJumps: state.portalJumps,
        flipperUsedMask: state.flipperUsedMask,
        surroundMask: state.surroundMask, surroundNeighborRemainingMasks: state.surroundNeighborRemainingMasks.slice(),
        mustTurnMask: state.mustTurnMask, adjTurnMask: state.adjTurnMask,
    };
}

function hashKeyOf(snapshot, entryAxis) {
    const h = createHash('sha1');
    h.update(new Int32Array([
        snapshot.pos, entryAxis, snapshot.lastWasPortalJump ? 1 : 0,
        snapshot.mustMask, snapshot.mustCrossMask, snapshot.ints, snapshot.portalJumps,
        snapshot.flipperUsedMask, snapshot.mustTurnMask, snapshot.adjTurnMask, snapshot.surroundMask,
    ]));
    h.update(snapshot.cellsPacked);
    return h.digest('hex');
}

// One reusable KEY_SPACE-sized buffer pair, hydrated in place per frontier entry -- mirrors
// search-state.ts's own `_stateBufs` reuse pattern (see that file's comment on why: allocating and
// zero-filling a fresh 3MB pair per state is the cost this avoids). `hydratedCells` tracks what's
// currently written so the NEXT hydration only has to clear those cells, not the whole array.
const visitedBuf = new Uint16Array(KEY_SPACE);
const edgeUsageBuf = new Uint8Array(KEY_SPACE);
let hydratedCells = [];
const shared = {
    path: [], visited: visitedBuf, edgeUsage: edgeUsageBuf,
    mustMask: 0, mustCrossMask: 0, crossCounts: new Uint8Array(0), mpVisitedMask: 0,
    ints: 0, portalJumps: 0, flipperUsedMask: 0, lastWasPortalJump: false,
    surroundMask: 0, surroundNeighborRemainingMasks: new Uint8Array(0),
    mustTurnMask: 0, adjTurnMask: 0,
};
function hydrate(snapshot) {
    for (const k of hydratedCells) { visitedBuf[k] = 0; edgeUsageBuf[k] = 0; }
    const cells = snapshot.cellsPacked;
    const next = new Array(cells.length);
    for (let i = 0; i < cells.length; i++) {
        const packed = cells[i];
        const k = packed >>> 4;
        visitedBuf[k] = (packed >>> 2) & 3;
        edgeUsageBuf[k] = packed & 3;
        next[i] = k;
    }
    hydratedCells = next;
    shared.path = snapshot.prevPos != null ? [snapshot.prevPos, snapshot.pos] : [snapshot.pos];
    shared.mustMask = snapshot.mustMask;
    shared.mustCrossMask = snapshot.mustCrossMask;
    shared.crossCounts = snapshot.crossCounts;
    shared.mpVisitedMask = snapshot.mpVisitedMask;
    shared.ints = snapshot.ints;
    shared.portalJumps = snapshot.portalJumps;
    shared.flipperUsedMask = snapshot.flipperUsedMask;
    shared.lastWasPortalJump = snapshot.lastWasPortalJump;
    shared.surroundMask = snapshot.surroundMask;
    shared.surroundNeighborRemainingMasks = snapshot.surroundNeighborRemainingMasks;
    shared.mustTurnMask = snapshot.mustTurnMask;
    shared.adjTurnMask = snapshot.adjTurnMask;
}

const gate = level.gateKeys[0];
const seedState = createState(gate, level, prep);
let frontier = new Map();
{
    const snap = snapshotFrom(seedState, [gate]);
    frontier.set(hashKeyOf(snap, 0), snap);
}
const counts = [1];
let overflow = false, overflowDepth = -1;

const t0 = Date.now();
for (let depth = 1; depth <= maxDepth && !overflow; depth++) {
    const next = new Map();
    for (const snapshot of frontier.values()) {
        hydrate(snapshot);
        const pos = snapshot.pos;
        for (const nk of getNeighbors(pos, shared, level, prep)) {
            const portalHere = level.portalMap.get(pos);
            const isJump = !!(portalHere && !shared.lastWasPortalJump && portalHere.dest === nk);
            const undo = applyMove(nk, shared, level, prep, isJump);
            const wasFirstVisit = undo.prevVisited === 0;
            const childVisitedList = wasFirstVisit ? [...snapshot.visitedList, nk] : snapshot.visitedList;
            const childSnap = snapshotFrom(shared, childVisitedList);
            const key = hashKeyOf(childSnap, entryAxisAt(shared));
            if (!next.has(key)) next.set(key, childSnap);
            undoMove(undo, shared);
        }
        if (next.size > CAP) { overflow = true; overflowDepth = depth; break; }
    }
    counts.push(next.size);
    frontier = next;   // old frontier is now unreachable and can be GC'd -- only 2 depths resident
    const rssMb = (process.memoryUsage().rss / (1 << 20)).toFixed(0);
    console.log(`  depth ${String(depth).padStart(2)}  distinct states ${next.size.toLocaleString()}  rss=${rssMb}MB` +
        (overflow ? '   <- CAP HIT, stopping' : ''));
    if (frontier.size === 0) break;
}
const elapsedMs = Date.now() - t0;

const ratios = [];
for (let d = 1; d < counts.length; d++) if (counts[d - 1] > 0) ratios.push(counts[d] / counts[d - 1]);
console.log(`${levelId}: done in ${elapsedMs}ms. ${overflow ? `CAP HIT at depth ${overflowDepth}` : `reached full meet depth ${maxDepth}`}.`);
if (ratios.length) console.log(`  growth ratios: ${ratios.map(r => r.toFixed(2)).join(', ')}`);

if (outFile) {
    const abs = path.resolve(root, outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({
        level: levelId, requiredLength: level.requiredLength, requiredIntersections: level.requiredIntersections,
        grid: { w: level.grid.w, h: level.grid.h },
        flippingFilters: nFlippers, portals: nPortals, mustCross: nMustCross,
        maxDepth, cap: CAP, elapsedMs,
        counts, ratios, overflow, overflowDepth,
    }, null, 1));
    console.log(`Wrote ${outFile}`);
}
