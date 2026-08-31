#!/usr/bin/env node
/**
 * Offline test of a candidate global inference against branches an ORACLE has already classified —
 * same discipline as axis-reach-probe.mjs / backward-exact-probe.mjs: score against the committed
 * prune-gap-*.json census (623 CP-SAT-labelled branches) before touching modules/solver.
 *
 * THE CANDIDATE: fresh-pocket bridging. isConnected's volume check (`freshVolume + intNeeded >=
 * rSteps`) only counts TOTAL reachable never-visited cells — it cannot tell "40 fresh cells in one
 * blob" from "40 fresh cells split into 3 pockets by the path's own visited trail, each needing a
 * separate paid re-entry to reach." Motivation: aggregating reports/stress/prune-gap-*.json's
 * existing `slack` field (== the volume check's own margin, verified algebraically identical) shows
 * the gap population (dead, unpruned) has median slack ~21 -- huge headroom, so raw capacity rarely
 * explains deadness. But the tight tail (slack <= 5, 51/244) is disproportionately (46/51) cases
 * where the level's never-visited cells are fragmented, not a plausible target for a capacity-only
 * refinement but a plausible target for a bridging-count refinement.
 *
 * THE BOUND. Let Z0 = cells reachable from `pos` WITHOUT any paid re-entry (maxVisit=0, pending
 * must-cross cells still open -- exactly the shipped reserved-wall's fill). If Z0 already holds
 * enough never-visited cells (needFresh), the ordinary volume check already covers this state and
 * there is nothing new to find. Otherwise, partition the REMAINING never-visited cells (reachable
 * under the current permissive maxVisit=2 fill, i.e. still in play) into pockets using ONLY
 * zero-cost adjacency (a visited cell is a wall for this partition, same as Z0's fill) -- each
 * pocket can only be entered by paying at least one ordinary intersection to cross its visited
 * boundary. Greedily accumulate pockets largest-first until the deficit (needFresh - |Z0 fresh|) is
 * covered; the number of pockets used is `minExtraInt`, a LOWER bound on additional ordinary
 * intersections required. If `minExtraInt > freeInt` (the intersection budget left over once
 * pending must-cross 2nd-crossings are already accounted for), the state is dead.
 *
 * WHY THIS IS SOUND, NOT JUST PLAUSIBLE. Every approximation below is in the permissive direction,
 * so `minExtraInt` can only UNDER-count the true requirement, never over-count it -- and an
 * under-count is the safe direction for a rejection bound (if even the most optimistic count
 * already exceeds budget, the truth, being >= this count, exceeds it too):
 *   - greedy-largest-first minimizes the number of pockets needed to cover the deficit;
 *   - each pocket is credited its FULL size for exactly one paid entry, even though a pocket with
 *     internal branching structure might need its own internal revisits to fully traverse -- this
 *     can only make minExtraInt smaller than the truth, never larger;
 *   - a pocket is only required to be crossable at all (not walked in one particular order), i.e.
 *     no chronology/ordering constraint is imposed.
 * This mirrors the discipline in the freeInt dilation and axis-aware connectivity write-ups: over-
 * approximate reachability/feasibility everywhere, so a rejection is a real theorem.
 *
 * HOW THIS DIFFERS FROM THE REVERTED freeInt DILATION. The dilation bounded REACHABILITY of
 * individual cells by paid-hop RADIUS, and failed because a single hop typically reopens almost the
 * entire far side of the path (an open board has abundant local out-and-back detours), so the
 * reachable SET barely shrunk. This bound does not touch reachability at all -- goal/must-pass/
 * must-cross reachability keeps using the existing permissive fill, unchanged. It instead counts
 * how many DISCONNECTED pockets of fresh cells must be bridged into to satisfy the level's exact
 * distinct-cell requirement, which can be small even when total reachable area is large.
 *
 * SCOPE: portal-free only (matches the census, which itself is portal-free via cpsat-reference-probe.py).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/pocket-bridge-probe.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { loadProbeCorpora } from './probe-corpus-loader.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove } = await import('../../modules/solver/search-state.js');
const { evaluatePrunedMove } = await import('../../modules/solver/hard-prune-pipeline.js');
const { getRealLengthFromState } = await import('../../modules/solver/solution.js');
const { popcount } = await import('../../modules/solver/encoding.js');

const ROOT = process.cwd();
const PACK = (x, y) => (((y << 16) | x) >>> 0);

const corpora = [
    ['data/stress/stress-levels-random.json', 'data/stress/hints-random'],
    ['data/stress/stress-levels.json', 'data/stress/hints'],
    ['data/levels.json', 'data/hints'],
];
const { levelById, hintsDirById } = loadProbeCorpora(ROOT, corpora);

/** Cells reachable from `pos` under a given wall rule. `zeroCost=true` -> maxVisit=0 with pending
 *  must-cross cells still open (Z0, the reserved wall's own fill). `zeroCost=false` -> maxVisit=2,
 *  the current production permissive fill (used only to bound which cells are "in play" at all). */
function reach(pos, state, level, prep, zeroCost) {
    const { w, h } = level.grid;
    const eu = state.edgeUsage;
    const seen = new Set([pos]);
    const queue = [pos];
    while (queue.length) {
        const k = queue.pop();
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = PACK(nx, ny);
            if (seen.has(nk)) continue;
            if (prep.reachBlockedArr[nk] !== 0) continue;
            const fi = prep.flipperIndexMap ? prep.flipperIndexMap[nk] - 1 : -1;
            if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) continue;
            if (eu[nk] === 3) continue;
            const mcIdx = level.mustCrossIndexByKey ? level.mustCrossIndexByKey.get(nk) : undefined;
            const isPendingMc = mcIdx !== undefined && ((state.mustCrossMask >> mcIdx) & 1) !== 0;
            if (zeroCost) {
                if (state.visited[nk] > 0 && !isPendingMc) continue;   // paid re-entry: not zero-cost
            } else {
                if (state.visited[nk] > 2) continue;                  // production maxVisit=2 rule
            }
            seen.add(nk);
            queue.push(nk);
        }
    }
    return seen;
}

/** Connected components of NEVER-VISITED cells within `universe`, using zero-cost adjacency only
 *  (a visited cell can never be a stepping stone between two pockets in this partition — that is
 *  exactly what makes crossing between pockets cost a paid re-entry). */
function pockets(universe, state) {
    const fresh = [...universe].filter(k => state.visited[k] === 0);
    const freshSet = new Set(fresh);
    const seen = new Set();
    const comps = [];
    for (const start of fresh) {
        if (seen.has(start)) continue;
        const comp = [];
        const q = [start]; seen.add(start);
        while (q.length) {
            const k = q.pop(); comp.push(k);
            const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nk = PACK(x + dx, y + dy);
                if (freshSet.has(nk) && !seen.has(nk)) { seen.add(nk); q.push(nk); }
            }
        }
        comps.push(comp);
    }
    return comps;
}

let totDead = 0, totAlive = 0, gap = 0, fireGap = 0, fireAlive = 0, candidates = 0;
const caughtSlack = [], firedLevels = new Map();

for (const f of readdirSync(path.join(ROOT, 'reports/stress')).filter(x => /^prune-gap-.*\.json$/.test(x))) {
    const rec = JSON.parse(readFileSync(path.join(ROOT, 'reports/stress', f), 'utf8'));
    const id = rec.level;
    const rawLevel = levelById.get(id);
    if (!rawLevel) continue;
    if ((rawLevel.portals || []).length) continue;
    let level, prep;
    try { level = normalizeRawLevel(rawLevel); prep = prepLevel(level); } catch { continue; }
    level.mustCrossIndexByKey = new Map(level.mustCrossKeys.map((k, i) => [k, i]));

    const hp = path.join(ROOT, hintsDirById.get(id), `${id}.json`);
    let solution;
    try { solution = (JSON.parse(readFileSync(hp, 'utf8')).hints || [])[0]?.path; } catch { continue; }
    if (!solution) continue;

    const byStep = new Map();
    for (const b of (rec.branches || [])) { if (!byStep.has(b.step)) byStep.set(b.step, []); byStep.get(b.step).push(b); }

    const state = createState(solution[0], level, prep);
    for (let step = 1; step < solution.length; step++) {
        const pos = solution[step - 1];
        for (const b of (byStep.get(step) || [])) {
            const posXY = [(pos & 0xFFFF) + 1, ((pos >>> 16) & 0xFFFF) + 1];
            if (posXY[0] !== b.from[0] || posXY[1] !== b.from[1]) { step = solution.length; break; }
            const alt = PACK(b.alt[0] - 1, b.alt[1] - 1);
            let undo;
            try { undo = applyMove(alt, state, level, prep, false); } catch { continue; }

            const rSteps = level.requiredLength - getRealLengthFromState(state);
            const intNeeded = level.requiredIntersections - state.ints;
            const freeInt = intNeeded - popcount(state.mustCrossMask);
            const needFresh = rSteps - intNeeded;

            let fires = false, minExtraInt = 0;
            if (needFresh > 0 && freeInt >= 0) {
                const z0 = reach(alt, state, level, prep, true);
                const zeroFresh = [...z0].filter(k => state.visited[k] === 0).length;
                if (zeroFresh < needFresh) {
                    const full = reach(alt, state, level, prep, false);
                    const comps = pockets(full, state).sort((a, b2) => b2.length - a.length);
                    // The pos-native pocket (z0's fresh cells) is already counted in zeroFresh;
                    // walk the OTHER pockets largest-first until the deficit is covered.
                    const z0Fresh = new Set([...z0].filter(k => state.visited[k] === 0));
                    let covered = zeroFresh;
                    for (const comp of comps) {
                        if (comp.some(k => z0Fresh.has(k))) continue;   // already counted in zeroFresh
                        if (covered >= needFresh) break;
                        covered += comp.length;
                        minExtraInt++;
                    }
                    fires = minExtraInt > freeInt;
                    if (process.env.PBP_DEBUG && b.dead && !fires) {
                        console.log(`  DEBUG candidate-no-fire: ${id} step ${b.step} alt ${b.alt} freeInt=${freeInt} minExtraInt=${minExtraInt} deficit=${needFresh - zeroFresh} slack=${b.slack}`);
                    }
                }
            }
            if (fires) candidates++;

            const prunedNow = evaluatePrunedMove(alt, getRealLengthFromState(state), state, level, prep, null, true) === 'reject';
            undoMove(undo, state);

            if (b.dead) {
                totDead++;
                if (!prunedNow) {
                    gap++;
                    if (fires) { fireGap++; caughtSlack.push(b.slack); firedLevels.set(id, (firedLevels.get(id) || 0) + 1); }
                }
            } else {
                totAlive++;
                if (fires) fireAlive++;
            }
        }
        if (step >= solution.length) break;
        applyMove(solution[step], state, level, prep, false);
    }
}

const q = (a) => { const v = [...a].sort((x, y) => x - y); return v.length ? `min ${v[0]} / med ${v[v.length >> 1]} / max ${v[v.length - 1]}` : '-'; };
console.log('\npocket-bridge bound, scored against CP-SAT-labelled branches (portal-free)\n');
console.log(`  dead branches scored          ${totDead}`);
console.log(`  dead AND currently passed     ${gap}   <- the gap`);
console.log(`  ...it fires on                ${fireGap}  (${gap ? (100 * fireGap / gap).toFixed(1) : 0}% of the gap closed)`);
console.log(`  alive branches scored         ${totAlive}`);
console.log(`  ...it fires on                ${fireAlive}   <- MUST BE 0`);
console.log(`  total fire (dead+alive)       ${candidates}`);
console.log(`\n  slack of what it CATCHES : ${q(caughtSlack)}`);
console.log(`  levels with >=1 catch: ${[...firedLevels.entries()].map(([k, v]) => `${k}(${v})`).join(', ') || '-'}`);
if (fireAlive) { console.log('\n  UNSOUND on this sample -- do not proceed.'); process.exit(1); }
console.log('\n  no alive branch rejected on this sample.');
