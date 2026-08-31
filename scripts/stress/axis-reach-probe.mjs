#!/usr/bin/env node
/**
 * Offline test of a candidate global inference, against branches an ORACLE has already classified.
 *
 * WHY OFFLINE. reports/2026-07-31-prune-gap-localisation.md established that the search enters ~74%
 * of provably-dead branches and that no cheap per-node structural feature separates dead from alive.
 * Its verdict was "real propagation, or nothing". Building a propagator into the hot path to find
 * out whether it separates them is the expensive way round: the committed prune-gap-*.json files
 * already hold every branch, its CP-SAT verdict, and the `step` needed to reconstruct its exact
 * state. So a candidate inference can be scored against 600+ oracle-labelled branches in seconds,
 * with no CP-SAT calls and no solver changes, BEFORE anyone touches modules/solver.
 *
 * THE CANDIDATE: axis-aware reachability. topology.ts's flood fill decides traversability by visit
 * count (and, since 2026-07-31, by edgeUsage === 3). It is otherwise AXIS-BLIND: it will happily
 * route through a cell whose only free axis has no open neighbour on that axis. The real rule
 * (search-state.ts's isMoveDynamicallyValid) is per-axis —
 *   entering n along axis b requires edgeUsage[n] & b === 0,
 *   and turning at c (moveAxis !== entryAxis) additionally requires edgeUsage[c] & b === 0.
 * So reachability is properly a fixpoint over (cell, entry-axis) STATES, not over cells, and the
 * cell-level fill is a strict over-approximation of it.
 *
 * WHAT IS MEASURED. For each recorded branch: is the goal, or any still-pending must-pass /
 * must-cross cell, unreachable in the axis-aware relation? That is a candidate prune. It must fire
 * on DEAD branches (useful) and NEVER on ALIVE ones (sound). A single alive hit kills it — this
 * codebase's history is prunes that looked clean on a small sample.
 *
 * DELIBERATELY PERMISSIVE, so a fire is a real theorem: intersection budget is ignored entirely
 * (any axis-free cell may be re-entered), the start state is allowed BOTH entry axes, and flippers
 * are not modelled. Every one of those makes the relation larger, i.e. makes it fire less often.
 *
 * INTEGRITY. The probes walked `hintRecords[0].path`, and the hint corpus has been rewritten by
 * baseline refreshes since. Each record's own `from` is asserted against the replayed path, so a
 * reordered hint corpus fails loudly instead of silently scoring the wrong states.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/axis-reach-probe.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { defaultConfig } from '../../modules/solver/ablation-config.js';
import { loadProbeCorpora } from './probe-corpus-loader.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove } = await import('../../modules/solver/search-state.js');
const { evaluatePrunedMove } = await import('../../modules/solver/hard-prune-pipeline.js');
const { getRealLengthFromState } = await import('../../modules/solver/solution.js');

const ROOT = process.cwd();
/** Baseline gauntlet for the comparison: everything on, minus the flag under test.
 *
 *  The rule this probe scored (axis-aware connectivity) was implemented twice and reverted twice —
 *  net -1 on the first sample, and -2 deterministic corpus-wide on the re-test (560 vs 562 at a
 *  matched 36M node budget; see reports/2026-08-01-budget-vs-algorithm.md). Its ablation flag no
 *  longer exists, so naming it below is a no-op and the baseline is simply the current gauntlet —
 *  which is what makes the 18/238 figure below still reproducible. Kept as the template for the NEXT
 *  candidate: replace the flag name, and note the two traps it encodes.
 *
 *  The standing lesson from those two reverts: closing 7.6% of the labelled dead-branch gap at zero
 *  unsoundness is NOT sufficient evidence to ship a prune. This one paid for its rejections with per-
 *  node cost in the hottest loop in the solver, and the trade came out negative both times.
 *
 *  Trap 1: a sparse {FLAG:false} object reads every OTHER flag as undefined -> falsy and disables
 *  the whole gauntlet (CLAUDE.md's normalizeAblationConfig note — the Proxy that fixes that wraps
 *  prep._cfg at the orchestration boundary, not a cfg handed straight to evaluatePrunedMove).
 *  Measured: the sparse form inflated the reported gap from 238 to 362.
 *  Trap 2: isConnected reads prep._cfg, not this argument, so a connectivity flag must be ablated
 *  on prep as well — see the call site. Missing that scored the rule at 0.0%. */
const ABLATED = { ...defaultConfig(), PRUNE_CONNECTIVITY_AXIS_AWARE: false };
const PACK = (x, y) => (((y << 16) | x) >>> 0);
const AXIS_H = 1, AXIS_V = 2;

const corpora = [
    ['data/stress/stress-levels-random.json', 'data/stress/hints-random'],
    ['data/stress/stress-levels.json', 'data/stress/hints'],
    ['data/levels.json', 'data/hints'],
];
const { levelById, hintsDirById } = loadProbeCorpora(ROOT, corpora);

/** Reachability over (cell, entry-axis) states — the relation the real move rules define. */
function axisAwareReach(pos, state, level, prep) {
    const { w, h } = level.grid;
    const eu = state.edgeUsage;
    // seen[cell] is a 2-bit mask of entry axes the path can arrive at `cell` with.
    const seen = new Map();
    const stack = [];
    // The start cell is occupied NOW, so allow leaving it as if arrived by either axis (permissive).
    seen.set(pos, AXIS_H | AXIS_V);
    stack.push(pos);
    while (stack.length) {
        const c = stack.pop();
        const arrived = seen.get(c);
        const cx = c & 0xFFFF, cy = (c >>> 16) & 0xFFFF;
        for (const [dx, dy, b] of [[1, 0, AXIS_H], [-1, 0, AXIS_H], [0, 1, AXIS_V], [0, -1, AXIS_V]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const n = PACK(nx, ny);
            if (prep.reachBlockedArr[n] !== 0) continue;   // blocks u geese u gates
            if ((eu[n] & b) !== 0) continue;               // entry rule at n
            // turning rule at c: leaving on an axis different from the one we arrived on needs that
            // axis free at c. Satisfied if ANY arrival axis we can hold at c permits it.
            const straightOk = (arrived & b) !== 0;                  // arrived on b, leaving on b
            const turnOk = (arrived & ~b & (AXIS_H | AXIS_V)) !== 0 && (eu[c] & b) === 0;
            if (!straightOk && !turnOk) continue;
            const prev = seen.get(n) || 0;
            if ((prev & b) !== 0) continue;
            seen.set(n, prev | b);
            stack.push(n);
        }
    }
    return seen;
}

let totDead = 0, totAlive = 0, fireDead = 0, fireAlive = 0, fireDeadPassed = 0, totDeadPassed = 0;
const aliveHits = [], mismatches = [], unsoundNow = [];
const gapRSteps = [], caughtRSteps = [];

for (const f of readdirSync(path.join(ROOT, 'reports/stress')).filter(x => /^prune-gap-.*\.json$/.test(x))) {
    const rec = JSON.parse(readFileSync(path.join(ROOT, 'reports/stress', f), 'utf8'));
    const id = rec.level;
    const rawLevel = levelById.get(id);
    if (!rawLevel) { mismatches.push(`${id}: level not found`); continue; }
    let level, prep;
    try { level = normalizeRawLevel(rawLevel); prep = prepLevel(level); } catch { mismatches.push(`${id}: prep failed`); continue; }

    const hp = path.join(ROOT, hintsDirById.get(id), `${id}.json`);
    if (!existsSync(hp)) { mismatches.push(`${id}: no hint file`); continue; }
    const solution = (JSON.parse(readFileSync(hp, 'utf8')).hints || [])[0]?.path;
    if (!solution) { mismatches.push(`${id}: no hint[0]`); continue; }

    const byStep = new Map();
    for (const b of (rec.branches || [])) {
        if (!byStep.has(b.step)) byStep.set(b.step, []);
        byStep.get(b.step).push(b);
    }

    const state = createState(solution[0], level, prep);
    let bad = false;
    for (let step = 1; step < solution.length && !bad; step++) {
        const pos = solution[step - 1];
        const here = byStep.get(step);
        if (here) {
            for (const b of here) {
                const fromKey = PACK(b.from[0] - 1, b.from[1] - 1);
                if (fromKey !== pos) { mismatches.push(`${id} step ${step}: recorded from ${b.from} != replayed path`); bad = true; break; }
                const alt = PACK(b.alt[0] - 1, b.alt[1] - 1);
                let undo;
                try { undo = applyMove(alt, state, level, prep, false); } catch { continue; }
                // Recompute the gauntlet's verdict with the CURRENT code rather than trusting the
                // recorded `pruned` — these files predate later prunes (the axis-exhaustion rule
                // among them), so a stale field would overstate how much gap is left to close.
                // isConnected reads prep._cfg, NOT the cfg threaded through evaluatePrunedMove, so the flag
                // has to be ablated on prep or the baseline silently includes the rule under test (which
                // scored it at 0.0%). Recomputed live rather than trusting the recorded `pruned` field,
                // which predates later prunes.
                prep._cfg = ABLATED;
                const prunedNow = evaluatePrunedMove(alt, getRealLengthFromState(state), state, level, prep, ABLATED, true) === 'reject';
                prep._cfg = null;
                const seen = axisAwareReach(alt, state, level, prep);
                let fires = !seen.has(level.goalKey);
                if (!fires) {
                    for (let i = 0; i < level.mustPassKeys.length && !fires; i++)
                        if (!(state.mpVisitedMask & (1 << i)) && !seen.has(level.mustPassKeys[i])) fires = true;
                    for (let i = 0; i < level.mustCrossKeys.length && !fires; i++)
                        if ((state.mustCrossMask & (1 << i)) !== 0 && !seen.has(level.mustCrossKeys[i])) fires = true;
                }
                undoMove(undo, state);

                if (b.dead) { totDead++; if (!prunedNow) { totDeadPassed++; gapRSteps.push(b.rSteps); } if (fires) { fireDead++; if (!prunedNow) { fireDeadPassed++; caughtRSteps.push(b.rSteps); } } }
                else {
                    totAlive++;
                    if (fires) { fireAlive++; aliveHits.push(`${id} step ${step} alt ${b.alt}`); }
                    if (prunedNow) unsoundNow.push(`${id} step ${step} alt ${b.alt}`);   // free audit of the live gauntlet
                }
            }
        }
        applyMove(solution[step], state, level, prep, false);
    }
}

console.log('\naxis-aware reachability, scored against oracle-labelled branches\n');
if (mismatches.length) {
    console.log(`INTEGRITY FAILURES (${mismatches.length}) — these levels were skipped or aborted:`);
    for (const m of mismatches.slice(0, 10)) console.log('  ' + m);
    console.log('');
}
console.log(`  dead branches scored        ${totDead}`);
console.log(`  ...it fires on              ${fireDead}  (${totDead ? (100 * fireDead / totDead).toFixed(1) : 0}%)`);
console.log(`  dead AND currently passed   ${totDeadPassed}   <- the gap`);
console.log(`  ...it fires on              ${fireDeadPassed}  (${totDeadPassed ? (100 * fireDeadPassed / totDeadPassed).toFixed(1) : 0}% of the gap closed)`);
console.log(`  alive branches scored       ${totAlive}`);
console.log(`  ...it fires on              ${fireAlive}   <- MUST BE 0`);
if (fireAlive) {
    console.log('\n  UNSOUND on this sample. Examples:');
    for (const a of aliveHits.slice(0, 8)) console.log('    ' + a);
    process.exit(1);
}
console.log('\n  no alive branch rejected on this sample.');
// Depth is the question the prune-gap report says decides whether a catch is worth anything: its
// expensive misses are the EARLY ones, which can absorb an enormous subtree.
const q = (a) => { const v = [...a].sort((x, y) => x - y); return v.length ? `min ${v[0]} / med ${v[v.length >> 1]} / max ${v[v.length - 1]}` : '-'; };
console.log(`\n  rSteps of the whole gap  : ${q(gapRSteps)}`);
console.log(`  rSteps of what it CATCHES: ${q(caughtRSteps)}`);
console.log(`  deep catches (rSteps >= 40): ${caughtRSteps.filter(r => r >= 40).length} of ${gapRSteps.filter(r => r >= 40).length} deep gap branches`);
console.log(`\n  (free audit) live gauntlet rejecting an ALIVE branch: ${unsoundNow.length}`);
for (const u of unsoundNow.slice(0, 5)) console.log('    ' + u);
