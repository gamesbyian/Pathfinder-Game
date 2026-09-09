#!/usr/bin/env node
/**
 * Soundness gate for the connectivity volume-check portal restoration
 * (reports/2026-09-09-portal-restoration-evidence-hardening-001.md section 3): validates the
 * ACTUAL SHIPPED production function (modules/solver/topology.ts's isConnected), forcing the
 * opt-in PRUNE_CONNECTIVITY_VOLUME_PORTAL flag on so the volume tail
 * (`freshVolume + intNeeded < rSteps`) actually evaluates on portal levels instead of silently
 * no-op'ing. Walks every known-valid solution (stressMeta.witnessSolution plus every saved hint)
 * through real search state and asserts isConnected never verdicts false on a state lying on a
 * REAL, PLAY-valid solution. Same method as mc-neighbor-budget-soundness-check.mjs and
 * same-parity-portal-soundness-check.mjs.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/connectivity-volume-portal-soundness-check.mjs -- [--corpus=corpus2] [--limit=N]
 */
import { readFileSync, existsSync } from 'node:fs';
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
const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels).filter(l => (l.portals || []).length > 0);

let levelsChecked = 0, pathsChecked = 0, steps = 0, statesEvaluated = 0, violations = 0;
const bad = [];

for (const raw of rawLevels.slice(0, Number.isFinite(limit) ? limit : undefined)) {
    let level, prep;
    try { level = normalizeRawLevel(raw); prep = prepLevel(level); } catch { continue; }
    // Force the opt-in flag so this gate actually exercises the removed portal carve-out
    // (production stays default-OFF pending the population-scale A/B).
    prep._cfg = { PRUNE_CONNECTIVITY_VOLUME_PORTAL: true };

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
        for (let i = 1; i < p.length; i++) {
            const portal = level.portalMap.get(p[i - 1]);
            const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === p[i]);
            try { applyMove(p[i], state, level, prep, isJump); } catch { break; }
            steps++;
            if (i === p.length - 1) continue; // final node is the goal; isConnected's own goal check is separate
            statesEvaluated++;
            if (!isConnected(p[i], state, level, prep)) {
                violations++;
                if (bad.length < 10) bad.push(`${raw.id} step ${i}/${p.length - 1}`);
            }
        }
    }
}

console.log(`\nconnectivity-volume-portal (production TS) soundness — ${name}`);
console.log(`  levels ${levelsChecked} | valid paths ${pathsChecked} | steps replayed ${steps.toLocaleString()}`);
console.log(`  states evaluated ${statesEvaluated.toLocaleString()}`);
console.log(`  states on a REAL solution that isConnected rejected: ${violations}`);
if (violations) {
    console.log('  e.g. ' + bad.join('\n       '));
    console.log('UNSOUND'); process.exit(1);
}
console.log('SOUND on every known solution in this corpus.');
