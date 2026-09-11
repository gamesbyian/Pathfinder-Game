#!/usr/bin/env node
/**
 * Soundness gate for the joint-obligation must-cross/portal propagator — validates the ACTUAL
 * SHIPPED production function (modules/solver/joint-obligation-propagation.ts's
 * evaluateObligationClusters), not just the harness-side shadow mirror in scripts/stress/lib/
 * joint-obligation-mc-portal.mjs. Same method and bar as mc-neighbor-budget-soundness-check.mjs
 * (deliberately modeled on it): walk every known-valid solution we possess (each level's
 * stressMeta.witnessSolution plus every saved hint) through real search state and assert the new
 * check never verdicts 'reject' on a state lying on a REAL, referee-valid solution.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/joint-obligation-mc-portal-soundness-check.mjs -- [--corpus=corpus2] [--limit=N]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { evaluateObligationClusters } = await import('../../modules/solver/joint-obligation-propagation.js');

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
const names = args.has('--corpus') ? [args.get('--corpus')] : Object.keys(CORPORA);
const limit = args.has('--limit') ? Number(args.get('--limit')) : Infinity;
const PACK = (x, y) => (((y << 16) | x) >>> 0);

let totalLevelsChecked = 0, totalPathsChecked = 0, totalSteps = 0, totalActive = 0, totalViolations = 0;
const bad = [];

for (const name of names) {
    const corpus = CORPORA[name];
    if (!corpus) throw new Error(`unknown --corpus=${name}`);
    const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
    const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels)
        .filter(l => (l.mustCross || []).length > 0 && (l.portals || []).length > 0);

    let levelsChecked = 0, pathsChecked = 0, steps = 0, active = 0, violations = 0;

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
                if (i < p.length - 1 && state.mustCrossMask !== 0) {
                    const verdicts = evaluateObligationClusters(p[i], state, level, prep);
                    if (verdicts.length > 0) active++;
                    for (const v of verdicts) {
                        if (v.verdict === 'reject') {
                            violations++;
                            if (bad.length < 10) bad.push(`${raw.id} step ${i}/${p.length - 1} cluster ${v.clusterId}`);
                        }
                    }
                }
            }
        }
    }

    console.log(`\njoint-obligation-mc-portal (production TS) soundness — ${name}`);
    console.log(`  portal+must-cross levels with a stored solution: ${levelsChecked} | valid paths ${pathsChecked} | steps replayed ${steps.toLocaleString()}`);
    console.log(`  active cluster evaluations: ${active.toLocaleString()}`);
    console.log(`  states on a REAL solution that evaluateObligationClusters rejected: ${violations}`);

    totalLevelsChecked += levelsChecked; totalPathsChecked += pathsChecked; totalSteps += steps;
    totalActive += active; totalViolations += violations;
}

console.log(`\nTOTAL across ${names.join(', ')}: levels ${totalLevelsChecked} | paths ${totalPathsChecked} | steps ${totalSteps.toLocaleString()} | active evaluations ${totalActive.toLocaleString()} | violations ${totalViolations}`);
if (totalViolations) {
    console.log('  e.g. ' + bad.join('\n       '));
    console.log('UNSOUND'); process.exit(1);
}
console.log('SOUND on every known solution across the checked corpora.');
