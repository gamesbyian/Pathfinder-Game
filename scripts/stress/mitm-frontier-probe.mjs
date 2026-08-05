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
 * REWRITE 2026-08-05 — two independent problems in the original version, fixed together:
 *
 * 1. UNSOUND KEY (undercounts states, biasing the whole measurement toward false optimism).
 *    The original key was `position + visited-count-per-cell + mustPassMask + mustCrossMask + ints`
 *    — a pure multiset, no move-order information. But `isMoveDynamicallyValid`'s general rule
 *    (search-state.ts: `if (state.edgeUsage[target] & axisBit) return false`) means a cell entered
 *    once via axis H can NEVER be re-entered via H again — this applies to EVERY cell, not just
 *    must-cross ones. Two states with the identical visited-cell multiset but a different entry
 *    axis at some once-visited cell have genuinely different future legality, and the old key
 *    silently merged them. This is the exact class of bug CLAUDE.md's memoization gotcha warns
 *    about generally (mustCrossLowerBound's own cache key already had to encode axis for the same
 *    reason) — it just hadn't been applied to this probe's own key yet. Fixed by keying each
 *    visited cell on (count, edgeUsage) instead of count alone, which subsumes the must-cross axis
 *    tracking future-work.md separately called out as missing ("~256 states, base-4 digit per
 *    cell") — no special-casing needed once every cell tracks its own axis bits.
 *    Also restored: `entryAxis` at the CURRENT position (needed by getNeighbors/applyMove to judge
 *    the next move's turn legality — not recoverable from edgeUsage alone once a cell has been
 *    visited twice, since a fully-exhausted edgeUsage value doesn't reveal which axis was used
 *    LAST), `lastWasPortalJump` (portal forcing branches on this), `portalJumps` (counted-length
 *    bookkeeping a merge must reconcile), `flipperUsedMask`, `mustTurnMask`, `adjTurnMask`,
 *    `surroundMask` — all present in `SolverSearchState` and all absent from the old key. A level
 *    with none of these mechanics is unaffected; a level with any of them was being under-keyed.
 *
 * 2. O(depth) PER SUCCESSOR (the reason the original died at depth ~20). It stored path arrays and
 *    reconstructed a fresh `createState` (two fresh KEY_SPACE = 2^20-element typed arrays, ~3MB)
 *    plus a full move-by-move replay for EVERY frontier entry at EVERY depth. Fixed by doing a
 *    single DFS over the search tree using the real `applyMove`/`undoMove` (O(1) amortized per
 *    step, exactly as the production solver uses them), with a `Set<string>` of already-seen keys
 *    PER DEPTH: when a key seen at depth d has already been recorded, that subtree is a duplicate
 *    of one already fully explored from an equivalent state, so recursion stops there. This
 *    produces the exact same distinct-states-per-depth counts an explicit BFS-with-merge would,
 *    without ever storing more than one live state or allocating a KEY_SPACE-sized array per node.
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
const { AXIS_H } = await import('../../modules/solver/encoding.js');

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

const maxDepth = Number(arg('max-depth', String(Math.ceil(level.reqLen / 2))));
const nFlippers = (raw.flippingFilters || []).length;
const nPortals = (raw.portals || []).length;
const nMustCross = (raw.mustCross || []).length;
console.log(`${levelId}: reqLen=${level.reqLen} reqInt=${level.reqInt} grid=${level.grid.w}x${level.grid.h} ` +
    `flippingFilters=${nFlippers} portals=${nPortals} mustCross=${nMustCross}; meet depth ${maxDepth}, cap ${CAP.toLocaleString()}`);

// Sound dedup key: position + entry axis at position + lastWasPortalJump + (count,edgeUsage) per
// visited cell + every scalar/mask SolverSearchState field that isn't fully derivable from those.
// See the file header for why each field is here. `visitedList` is OUR OWN incrementally
// maintained list of ever-visited cell keys (mirrors state.path in spirit) — needed because
// state.visited/edgeUsage are KEY_SPACE=2^20-sized dense arrays and scanning either one per key
// build would cost ~1M ops per node; pushing/popping in lockstep with applyMove/undoMove (using the
// returned undo token's prevVisited to know whether THIS move was a first visit) keeps key
// construction O(depth) — the unavoidable minimum, since the key has to encode that much anyway.
function entryAxisAt(state) {
    const len = state.path.length;
    if (len < 2 || state.lastWasPortalJump) return 0;
    const prev = state.path[len - 2], pos = state.path[len - 1];
    const py = (prev >>> 16) & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
    return py === y ? AXIS_H : (AXIS_H === 1 ? 2 : 1);
}
function buildKey(state, visitedList) {
    const pos = state.path[state.path.length - 1];
    const cells = new Array(visitedList.length);
    for (let i = 0; i < visitedList.length; i++) {
        const k = visitedList[i];
        cells[i] = `${k}:${state.visited[k]}:${state.edgeUsage[k]}`;
    }
    cells.sort();
    return [
        pos, entryAxisAt(state), state.lastWasPortalJump ? 1 : 0,
        cells.join(','),
        state.mustMask, state.mustCrossMask, state.ints, state.portalJumps,
        state.flipperUsedMask, state.mustTurnMask, state.adjTurnMask, state.surroundMask,
    ].join('|');
}

const gate = level.gateKeys[0];
const state = createState(gate, level, prep);
const visitedList = [gate];
const seenAtDepth = [];
for (let d = 0; d <= maxDepth; d++) seenAtDepth.push(new Set());
let overflow = false, overflowDepth = -1;

function dfs(depth) {
    if (overflow) return;
    const key = buildKey(state, visitedList);
    const seen = seenAtDepth[depth];
    if (seen.has(key)) return;   // duplicate of an already-fully-explored equivalent state
    seen.add(key);
    if (seen.size > CAP) { overflow = true; overflowDepth = depth; return; }
    if (depth >= maxDepth) return;
    const pos = state.path[state.path.length - 1];
    for (const nk of getNeighbors(pos, state, level, prep)) {
        const portalHere = level.portalMap.get(pos);
        const isJump = !!(portalHere && !state.lastWasPortalJump && portalHere.dest === nk);
        const undo = applyMove(nk, state, level, prep, isJump);
        const wasFirstVisit = undo.prevVisited === 0;
        if (wasFirstVisit) visitedList.push(nk);
        dfs(depth + 1);
        if (wasFirstVisit) visitedList.pop();
        undoMove(undo, state);
        if (overflow) return;
    }
}

const t0 = Date.now();
dfs(0);
const elapsedMs = Date.now() - t0;

const counts = seenAtDepth.map(s => s.size);
for (let d = 0; d <= maxDepth; d++) {
    console.log(`  depth ${String(d).padStart(2)}  distinct states ${counts[d].toLocaleString()}` +
        (overflow && d === overflowDepth ? '   <- CAP HIT, stopping' : ''));
}
const ratios = [];
for (let d = 1; d < counts.length; d++) if (counts[d - 1] > 0) ratios.push(counts[d] / counts[d - 1]);
console.log(`${levelId}: done in ${elapsedMs}ms. ${overflow ? `CAP HIT at depth ${overflowDepth}` : `reached full meet depth ${maxDepth}`}.`);
if (ratios.length) console.log(`  growth ratios: ${ratios.map(r => r.toFixed(2)).join(', ')}`);

if (outFile) {
    const abs = path.resolve(root, outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({
        level: levelId, reqLen: level.reqLen, reqInt: level.reqInt,
        grid: { w: level.grid.w, h: level.grid.h },
        flippingFilters: nFlippers, portals: nPortals, mustCross: nMustCross,
        maxDepth, cap: CAP, elapsedMs,
        counts, ratios, overflow, overflowDepth,
    }, null, 1));
    console.log(`Wrote ${outFile}`);
}
