/**
 * Measures the frontier a meet-in-the-middle / bidirectional search would have to STORE.
 *
 * WHY THIS EXISTS. Bidirectional search has been proposed as "the lever with the right shape" at
 * least twice in committed reports (2026-07-30-move-ordering-not-the-bottleneck.md,
 * 2026-07-31-mustcross-forced-structure.md) and rejected in conversation more times than that, with
 * the rejection never written down — so it kept being re-proposed. This is the measurement that
 * settles the scale half of the question. The structural half (three further blockers, none of them
 * about size) is in docs/future-work.md; read that first, because a good idea about frontier
 * compression does NOT reopen the case.
 *
 * WHAT IT DOES. Exhaustive BFS by depth from the gate, deduping on the FULL state any sound merge
 * would have to key on: position + visited multiset + must-pass mask + must-cross mask +
 * intersection count. Anything less is unsound to merge — you cannot check a future revisit, or the
 * exact reqInt, without knowing which cells the other half used.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/mitm-frontier-probe.mjs [levelId]
 */
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove, getNeighbors } = await import('../../modules/solver/search-state.js');
const id = process.argv[2] || 'R00044';
const corpus = JSON.parse(readFileSync('data/stress/stress-levels-random.json','utf8'));
const raw = (Array.isArray(corpus)?corpus:corpus.levels).find(l=>l.id===id);
const level = normalizeRawLevel(raw); const prep = prepLevel(level);
prep._cfg = null; prep._metrics = { nodesExpanded: 0 };
console.log(`${id}: reqLen=${level.reqLen} reqInt=${level.reqInt} grid=${level.grid.w}x${level.grid.h}`);
// Exhaustive BFS by depth, deduping on the FULL state a merge would have to key on:
// position + visited multiset + the constraint masks. Anything less is unsound to merge.
const CAP = 3_000_000;
let frontier = new Map();
const gate = level.gateKeys[0];
const st0 = createState(gate, level, prep);
frontier.set('seed', st0.path.slice());
for (let depth = 1; depth <= 40; depth++) {
    const next = new Map();
    let overflow = false;
    for (const pathArr of frontier.values()) {
        const st = createState(pathArr[0], level, prep);
        for (let i = 1; i < pathArr.length; i++) applyMove(pathArr[i], st, level, prep, false);
        for (const nk of getNeighbors(st.path[st.path.length-1], st, level, prep)) {
            const undo = applyMove(nk, st, level, prep, false);
            const vis = []; for (let k = 0; k < st.visited.length; k++) if (st.visited[k]) vis.push(k + ':' + st.visited[k]);
            const key = nk + '|' + vis.join(',') + '|' + st.mpVisitedMask + '|' + st.mustCrossMask + '|' + st.ints;
            if (!next.has(key)) next.set(key, st.path.slice());
            undoMove(undo, st);
            if (next.size > CAP) { overflow = true; break; }
        }
        if (overflow) break;
    }
    console.log(`  depth ${String(depth).padStart(2)}  distinct states ${next.size.toLocaleString()}${overflow ? '   <- CAP HIT, stopping' : ''}`);
    if (overflow) break;
    frontier = next;
    if (frontier.size === 0) break;
}
