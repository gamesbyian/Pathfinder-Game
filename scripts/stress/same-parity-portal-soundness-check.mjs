#!/usr/bin/env node
/**
 * Soundness gate for the same-parity portal parity cleanup (reports/2026-09-09-portal-restoration-
 * evidence-hardening-001.md section 4): walks every known-valid solution (stressMeta.witnessSolution
 * plus every saved hint) for the deterministic same-parity-only portal Corpus-2 population (portal
 * pairs present, zero TWIST pairs) through the ACTUAL SHIPPED production gauntlet
 * (hard-prune-pipeline.ts's evaluatePrunedMove) and asserts neither PRUNE_PARITY (now default-ON on
 * this population, no opt-in flag) nor PRUNE_PORTAL_PARITY_ENVELOPE ever verdicts 'reject' on a
 * state lying on a REAL, PLAY-valid solution. Same method as mc-neighbor-budget-soundness-check.mjs.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/same-parity-portal-soundness-check.mjs -- [--corpus=corpus2] [--limit=N]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { getRealLengthFromState } = await import('../../modules/solver/solution.js');
const { evaluatePrunedMove } = await import('../../modules/solver/hard-prune-pipeline.js');

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

/** Zero-twist-pair predicate over the RAW level record (mirrors prep.ts's parityPortalDistMaps:
 *  a portal pair is a "twist" when its two terminal cells have opposite Manhattan parity). */
function isSameParityOnlyPortalLevel(raw) {
    const portals = raw.portals || [];
    if (portals.length === 0) return false;
    return portals.every(p => (((p.x1 + p.y1) & 1) === ((p.x2 + p.y2) & 1)));
}

const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels).filter(isSameParityOnlyPortalLevel);

let levelsChecked = 0, pathsChecked = 0, steps = 0, parityStatesEvaluated = 0, envelopeStatesEvaluated = 0;
let parityViolations = 0, envelopeViolations = 0;
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
        for (let i = 1; i < p.length; i++) {
            const portal = level.portalMap.get(p[i - 1]);
            const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === p[i]);
            try { applyMove(p[i], state, level, prep, isJump); } catch { break; }
            steps++;
            if (i === p.length - 1) continue; // final node is the goal; evaluatePrunedMove's goal branch is separate
            const realLen = getRealLengthFromState(state);
            parityStatesEvaluated++;
            if (evaluatePrunedMove(p[i], realLen, state, level, prep, { PRUNE_PARITY: true }, false) === 'reject') {
                parityViolations++;
                if (bad.length < 10) bad.push(`PRUNE_PARITY ${raw.id} step ${i}/${p.length - 1}`);
            }
            envelopeStatesEvaluated++;
            if (evaluatePrunedMove(p[i], realLen, state, level, prep, { PRUNE_PORTAL_PARITY_ENVELOPE: true }, false) === 'reject') {
                envelopeViolations++;
                if (bad.length < 10) bad.push(`PRUNE_PORTAL_PARITY_ENVELOPE ${raw.id} step ${i}/${p.length - 1}`);
            }
        }
    }
}

console.log(`\nsame-parity-only portal parity cleanup (production TS) soundness — ${name}`);
console.log(`  levels ${levelsChecked} | valid paths ${pathsChecked} | steps replayed ${steps.toLocaleString()}`);
console.log(`  states evaluated: PRUNE_PARITY ${parityStatesEvaluated.toLocaleString()}, PRUNE_PORTAL_PARITY_ENVELOPE ${envelopeStatesEvaluated.toLocaleString()}`);
console.log(`  states on a REAL solution rejected: PRUNE_PARITY ${parityViolations}, PRUNE_PORTAL_PARITY_ENVELOPE ${envelopeViolations}`);
if (parityViolations || envelopeViolations) {
    console.log('  e.g. ' + bad.join('\n       '));
    console.log('UNSOUND'); process.exit(1);
}
console.log('SOUND on every known solution in this corpus.');
