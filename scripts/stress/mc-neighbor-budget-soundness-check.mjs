#!/usr/bin/env node
/**
 * Soundness gate for the must-cross neighbor-budget propagator — validates the ACTUAL SHIPPED
 * production function (modules/solver/lower-bounds.ts's mustCrossNeighborBudgetDeadlocked, wired
 * in behind the opt-in PRUNE_MC_NEIGHBOR_BUDGET ablation flag), not just the harness-side
 * prototype in scripts/stress/lib/mc-neighbor-budget.mjs. Same method and bar as
 * scripts/stress/mc-prune-soundness-check.mjs (which this script is deliberately modeled on)
 * applied to PRUNE_MC_RESERVED_WALL/PRUNE_MC_FORCED_NEIGHBOR: walk every known-valid solution we
 * possess (each level's stressMeta.witnessSolution plus every saved hint) through real search
 * state and assert the new check never verdicts 'reject' on a state lying on a REAL, PLAY-valid
 * solution. This is the harness's ~5,518-branch atlas's stronger sibling — full corpora, tens of
 * thousands of paths — because a must-cross rejection rule gets no benefit of the doubt in this
 * codebase without it (CLAUDE.md's must-cross lower-bound/deadlock gotchas).
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/mc-neighbor-budget-soundness-check.mjs -- [--corpus=corpus2] [--limit=N]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { mustCrossNeighborBudgetDeadlocked } = await import('../../modules/solver/lower-bounds.js');

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
const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels).filter(l => (l.mustCross || []).length > 0);

let levelsChecked = 0, pathsChecked = 0, steps = 0, violations = 0;
let firedCount = 0;
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
            // The final node is the goal; the check is about still-pending crossings before then.
            if (i < p.length - 1 && state.mustCrossMask !== 0) {
                firedCount++;
                if (mustCrossNeighborBudgetDeadlocked(p[i], state, level, prep)) {
                    violations++;
                    if (bad.length < 10) bad.push(`${raw.id} step ${i}/${p.length - 1}`);
                }
            }
        }
    }
}

console.log(`\nmc-neighbor-budget-propagation (production TS) soundness — ${name}`);
console.log(`  levels ${levelsChecked} | valid paths ${pathsChecked} | steps replayed ${steps.toLocaleString()}`);
console.log(`  states evaluated (pending must-cross) ${firedCount.toLocaleString()}`);
console.log(`  states on a REAL solution that mustCrossNeighborBudgetDeadlocked rejected: ${violations}`);
if (violations) {
    console.log('  e.g. ' + bad.join('\n       '));
    console.log('UNSOUND'); process.exit(1);
}
console.log('SOUND on every known solution in this corpus.');
