#!/usr/bin/env node
/**
 * Scores the EXACT backward-distance oracle against oracle-labelled branches, offline.
 *
 * THE CANDIDATE. `PRUNE_DISTANCE_BOUND` rejects a move when the goal's BFS distance exceeds the
 * remaining steps — a MINIMUM-distance test. `PRUNE_PARITY` separately rejects a wrong-parity
 * remainder on portal-free grids. Neither asks the exact question: *is `rSteps` a length at which
 * the goal can be reached from here at all?* On an open grid the achievable set from a cell is
 * {d, d+2, d+4, ...} and the two existing prunes cover it exactly — but in a pocket or a narrow
 * corridor the path cannot always burn two extra steps, so some `d + 2j` are unreachable and both
 * existing prunes miss it.
 *
 * SOUNDNESS. The backward layered BFS runs on the STATIC graph: it ignores visited counts, edge-axis
 * usage, must-cross locks and flipper state. Every one of those omissions makes the achievable set
 * LARGER, so `achievable(pos)` is a superset of the real remaining-path lengths. Rejecting only when
 * `rSteps` is absent from a superset can therefore never reject a reachable state. This is the same
 * over-approximation discipline the connectivity fill already relies on.
 *
 * This is the "backward search as an ORACLE rather than a stored frontier" variant recorded in
 * docs/solver-future-work.md — it stores O(K x cells) layers, not a meet-in-the-middle frontier, so none of
 * the frontier-size objection applies. Portal-free only: a jump advances position at zero path
 * length, which breaks the layer/length correspondence.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/backward-exact-probe.mjs [--maxK=60]
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
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const MAX_K = Number(args.get('--maxK') || 60);
const PACK = (x, y) => (((y << 16) | x) >>> 0);
const FULL = defaultConfig();

const corpora = [
    ['data/stress/stress-levels-random.json', 'data/stress/hints-random'],
    ['data/stress/stress-levels.json', 'data/stress/hints'],
    ['data/levels.json', 'data/hints'],
];
const { levelById, hintsDirById } = loadProbeCorpora(ROOT, corpora);

/** achievable[cell] = Uint8Array over d in [0, MAX_K]: can the goal be reached in EXACTLY d steps? */
function buildAchievable(level, prep) {
    const { w, h } = level.grid;
    const cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = PACK(x, y);
        if (prep.reachBlockedArr[k] === 0 || k === level.goalKey) cells.push(k);
    }
    const table = new Map(cells.map(k => [k, new Uint8Array(MAX_K + 1)]));
    // layer d = the set of cells from which the goal is reachable in exactly d static steps
    let layer = new Set([level.goalKey]);
    if (table.has(level.goalKey)) table.get(level.goalKey)[0] = 1;
    for (let d = 1; d <= MAX_K; d++) {
        const next = new Set();
        for (const k of layer) {
            const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = PACK(nx, ny);
                if (!table.has(nk)) continue;
                next.add(nk);
            }
        }
        for (const k of next) table.get(k)[d] = 1;
        layer = next;
        if (layer.size === 0) break;
    }
    return table;
}

let totDead = 0, totAlive = 0, gap = 0, fireGap = 0, fireAlive = 0;
const aliveHits = [], caught = [], gapR = [];

for (const f of readdirSync(path.join(ROOT, 'reports/stress')).filter(x => /^prune-gap-.*\.json$/.test(x))) {
    const rec = JSON.parse(readFileSync(path.join(ROOT, 'reports/stress', f), 'utf8'));
    const id = rec.level;
    const rawLevel = levelById.get(id);
    if (!rawLevel) continue;
    if ((rawLevel.portals || []).length) continue;         // layer<->length correspondence needs portal-free
    let level, prep;
    try { level = normalizeRawLevel(rawLevel); prep = prepLevel(level); } catch { continue; }
    const hp = path.join(ROOT, hintsDirById.get(id), `${id}.json`);
    if (!existsSync(hp)) continue;
    const solution = (JSON.parse(readFileSync(hp, 'utf8')).hints || [])[0]?.path;
    if (!solution) continue;

    const achievable = buildAchievable(level, prep);
    const byStep = new Map();
    for (const b of (rec.branches || [])) { if (!byStep.has(b.step)) byStep.set(b.step, []); byStep.get(b.step).push(b); }

    const state = createState(solution[0], level, prep);
    for (let step = 1; step < solution.length; step++) {
        const pos = solution[step - 1];
        for (const b of (byStep.get(step) || [])) {
            if (PACK(b.from[0] - 1, b.from[1] - 1) !== pos) { step = solution.length; break; }
            const alt = PACK(b.alt[0] - 1, b.alt[1] - 1);
            let undo;
            try { undo = applyMove(alt, state, level, prep, false); } catch { continue; }
            prep._cfg = FULL;
            const prunedNow = evaluatePrunedMove(alt, getRealLengthFromState(state), state, level, prep, FULL, true) === 'reject';
            prep._cfg = null;
            const rSteps = level.requiredLength - getRealLengthFromState(state);
            const row = achievable.get(alt);
            const fires = rSteps >= 0 && rSteps <= MAX_K && (!row || row[rSteps] === 0);
            undoMove(undo, state);

            if (b.dead) { totDead++; if (!prunedNow) { gap++; gapR.push(b.rSteps); if (fires) { fireGap++; caught.push(b.rSteps); } } }
            else { totAlive++; if (fires) { fireAlive++; aliveHits.push(`${id} step ${step} alt ${b.alt} rSteps=${rSteps}`); } }
        }
        if (step >= solution.length) break;
        applyMove(solution[step], state, level, prep, false);
    }
}

const q = (a) => { const v = [...a].sort((x, y) => x - y); return v.length ? `min ${v[0]} / med ${v[v.length >> 1]} / max ${v[v.length - 1]}` : '-'; };
console.log('\nexact backward-distance oracle, scored against CP-SAT-labelled branches (portal-free)\n');
console.log(`  dead branches scored          ${totDead}`);
console.log(`  dead AND currently passed     ${gap}   <- the gap`);
console.log(`  ...it fires on                ${fireGap}  (${gap ? (100 * fireGap / gap).toFixed(1) : 0}% of the gap closed)`);
console.log(`  alive branches scored         ${totAlive}`);
console.log(`  ...it fires on                ${fireAlive}   <- MUST BE 0`);
console.log(`\n  rSteps of the whole gap   : ${q(gapR)}`);
console.log(`  rSteps of what it CATCHES : ${q(caught)}`);
if (fireAlive) { console.log('\n  UNSOUND on this sample:'); for (const a of aliveHits.slice(0, 8)) console.log('    ' + a); process.exit(1); }
console.log('\n  no alive branch rejected on this sample.');