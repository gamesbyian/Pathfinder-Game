#!/usr/bin/env node
/**
 * Soundness gate for PRUNE_MC_STRAIGHT_CORRIDOR (and any future must-cross prune).
 *
 * A hard prune is unsound the moment it rejects a state lying on a REAL solution, and unit tests
 * do not establish that — the degree prune tried earlier the same day happened to be caught by an
 * existing fixture, which was luck rather than method. This walks every known-valid solution we
 * possess (each level's stressMeta.witnessSolution plus every saved hint) through the actual search
 * state and asserts isConnected() stays true at every single step along it. Any `false` is a state
 * on a path the game itself accepts, so the prune would have cut a reachable solution.
 *
 * Restricted to must-cross levels, since that is the only population the prune can fire on.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/mc-prune-soundness-check.mjs -- [--corpus=corpus2] [--limit=N]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { isConnected } = await import('../../modules/solver/topology.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const CORPORA = {
    corpus1: { levels: 'data/stress/stress-levels.json', hints: 'data/stress/hints' },
    corpus2: { levels: 'data/stress/stress-levels-random.json', hints: 'data/stress/hints-random' },
    published: { levels: 'data/levels.json', hints: 'data/hints' },
};
const name = args.get('--corpus') || 'corpus2';
const corpus = CORPORA[name];
const limit = args.has('--limit') ? Number(args.get('--limit')) : Infinity;
const PACK = (x, y) => (((y << 16) | x) >>> 0);

const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels).filter(l => (l.mustCross || []).length > 0 || (l.mustPass || []).length > 0);

let levelsChecked = 0, pathsChecked = 0, steps = 0, violations = 0;
const bad = [];

for (const raw of rawLevels.slice(0, Number.isFinite(limit) ? limit : undefined)) {
    let level, prep;
    try { level = normalizeRawLevel(raw); prep = prepLevel(level); } catch { continue; }

    const paths = [];
    const w = raw?.stressMeta?.witnessSolution;
    if (Array.isArray(w) && w.length) paths.push(w.map(([x, y]) => PACK(x - 1, y - 1)));
    const hp = path.join(root, corpus.hints, `${raw.id}.json`);
    if (raw.id && existsSync(hp)) {
        for (const h of (JSON.parse(readFileSync(hp, 'utf8')).hints || [])) {
            if (Array.isArray(h?.path) && h.path.length) paths.push(h.path);
        }
    }
    if (!paths.length) continue;
    levelsChecked++;

    for (const p of paths) {
        let state;
        try { state = createState(p[0], level, prep); } catch { continue; }
        pathsChecked++;
        let ok = true;
        for (let i = 1; i < p.length && ok; i++) {
            const portal = level.portalMap.get(p[i - 1]);
            const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === p[i]);
            try { applyMove(p[i], state, level, prep, isJump); } catch { ok = false; break; }
            steps++;
            // The final node is the goal; the prune is about still-pending crossings before then.
            if (i < p.length - 1 && !isConnected(p[i], state, level, prep)) {
                violations++;
                if (bad.length < 10) bad.push(`${raw.id} step ${i}/${p.length - 1}`);
                ok = false;
            }
        }
    }
}

console.log(`\nmust-cross prune soundness — ${name}`);
console.log(`  levels ${levelsChecked} | valid paths ${pathsChecked} | steps replayed ${steps.toLocaleString()}`);
console.log(`  states on a REAL solution that the prune rejected: ${violations}`);
if (violations) { console.log('  e.g. ' + bad.join(', ')); console.log('UNSOUND'); process.exit(1); }
console.log('SOUND on every known solution in this corpus.');
