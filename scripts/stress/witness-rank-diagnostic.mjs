#!/usr/bin/env node
/**
 * Move-ordering rank diagnostic — the go/no-go for learning `scoreMove`'s weights.
 *
 * THE QUESTION. Every unsolved stress level ships a known-good solution (`stressMeta.
 * witnessSolution`), and hundreds also carry saved hints, so we possess thousands of correct
 * trajectories through levels the solver cannot rediscover. If the solver's move ordering already
 * ranks the right move first or second, ordering is not the bottleneck and there is nothing to
 * learn. If the right move is routinely ranked last, ordering is the bottleneck and its size is
 * quantified here before anyone trains anything.
 *
 * WHAT IT MEASURES. Replays every known solution through the real search state, and at each
 * distinct prefix asks `scoreAndSort` — the exact function the search uses — to order the real
 * candidate list. It then records the rank of the BEST acceptable continuation: the minimum rank
 * over every known solution that shares that prefix. Using the minimum matters. At most states
 * several moves are fine, so scoring a single witness's arbitrary choice would understate the
 * solver badly; a level with 194 recorded solutions genuinely has many right answers, and the
 * solver only has to like one of them.
 *
 * Solutions are merged into a prefix trie so each distinct prefix is scored once and the state is
 * walked with applyMove/undoMove rather than rebuilt — the same reason the search itself does this.
 *
 * THE OUTLIER THAT MATTERS MOST is `absent`: the continuation is not in getNeighbors() at all, so
 * the search cannot follow it at any budget or ordering. On a valid solution that means a prune is
 * rejecting a reachable move, which would be a correctness finding rather than a tuning one, and it
 * is reported separately for exactly that reason.
 *
 * Usage (bundled — never plain tsx):
 *   node scripts/run-bundled.mjs scripts/stress/witness-rank-diagnostic.mjs -- \
 *     --corpus=corpus2 --unsolved-only --report=reports/stress/typical-budget-corpus2.json \
 *     --limit=200 --out=reports/stress/witness-rank-corpus2.json
 *
 *   --corpus=corpus1|corpus2   which stress corpus (default corpus2)
 *   --report=<file>            a benchmark report used to classify solved vs unsolved
 *   --unsolved-only            restrict to levels the report says are UNSOLVED (the population
 *                              whose ordering we actually care about)
 *   --solved-only              the contrast group: levels the solver does find. If the rank
 *                              profile here is no better, the metric is not measuring difficulty.
 *   --sources=witness,hints    which known solutions to use (default both)
 *   --profile=<name>           SCORING_PROFILES key (default 'default')
 *   --limit=<n> --seed=<n>     sample n levels deterministically
 *   --out=<path>               per-level JSON
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove, getNeighbors, STATE_BUF_DFS } = await import('../../modules/solver/search-state.js');
const { scoreAndSort } = await import('../../modules/solver/scoring.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const flags = new Set(process.argv.slice(2).filter(a => !a.includes('=')));
// Walk up to the package root rather than hardcoding a depth: this file lives in scripts/stress/
// but always RUNS as a bundle from .solver-tools/, so any fixed '..' count is wrong in one of the
// two locations. Anchoring on package.json is correct in both.
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('could not locate the package root from ' + import.meta.url);
})();

const CORPORA = {
    corpus1: { levels: 'data/stress/stress-levels.json', hints: 'data/stress/hints' },
    corpus2: { levels: 'data/stress/stress-levels-random.json', hints: 'data/stress/hints-random' },
};
const corpusName = args.get('--corpus') || 'corpus2';
const corpus = CORPORA[corpusName];
if (!corpus) { console.error(`unknown --corpus=${corpusName}`); process.exit(2); }

const profileName = args.get('--profile') || 'default';
const profile = SCORING_PROFILES[profileName];
if (!profile) { console.error(`unknown --profile=${profileName}`); process.exit(2); }
const sources = new Set((args.get('--sources') || 'witness,hints').split(',').map(s => s.trim()));

const PACK = (x, y) => (((y << 16) | x) >>> 0);

const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;

// Solved/unsolved classification comes from a real benchmark report, never from hint presence:
// a level can carry hints it was only ever able to find at a larger budget or via a hint-guided
// technique, which is precisely the population this diagnostic is about.
let solvedIds = null;
const reportPath = args.get('--report');
if (reportPath) {
    const rep = JSON.parse(readFileSync(path.join(root, reportPath), 'utf8'));
    solvedIds = new Set((rep.levels || []).filter(r => r.ok).map(r => r.id));
}

/** Known solutions as packed-key arrays. Witness coords are 1-indexed [x,y]; hints already packed. */
function knownSolutions(raw) {
    const out = [];
    if (sources.has('witness')) {
        const w = raw?.stressMeta?.witnessSolution;
        if (Array.isArray(w) && w.length) out.push(w.map(([x, y]) => PACK(x - 1, y - 1)));
    }
    if (sources.has('hints') && raw?.id) {
        const hp = path.join(root, corpus.hints, `${raw.id}.json`);
        if (existsSync(hp)) {
            for (const h of (JSON.parse(readFileSync(hp, 'utf8')).hints || [])) {
                if (Array.isArray(h?.path) && h.path.length) out.push(h.path);
            }
        }
    }
    return out;
}

/** Merge solutions into a prefix trie so each distinct prefix is scored exactly once. */
function buildTrie(paths) {
    const root0 = { key: paths[0][0], children: new Map() };
    for (const p of paths) {
        if (p[0] !== root0.key) continue; // a different gate: its own trie, handled by the caller
        let node = root0;
        for (let i = 1; i < p.length; i++) {
            let child = node.children.get(p[i]);
            if (!child) { child = { key: p[i], children: new Map() }; node.children.set(p[i], child); }
            node = child;
        }
    }
    return root0;
}

const buckets = { rank0: 0, rank1: 0, rank2: 0, rank3plus: 0, absent: 0 };
const perLevel = [];
let levelsScored = 0, decisionsScored = 0, skipped = 0;

let targets = rawLevels.filter(r => r && (r.stressMeta?.witnessSolution || r.id));
if (solvedIds && flags.has('--unsolved-only')) targets = targets.filter(r => !solvedIds.has(r.id));
if (solvedIds && flags.has('--solved-only')) targets = targets.filter(r => solvedIds.has(r.id));

const limit = args.has('--limit') ? Number(args.get('--limit')) : Infinity;
if (Number.isFinite(limit) && targets.length > limit) {
    // Deterministic stride sample rather than a random one, so reruns are comparable.
    const stride = targets.length / limit;
    targets = Array.from({ length: limit }, (_, i) => targets[Math.floor(i * stride)]);
}

for (const raw of targets) {
    let level, prep;
    try {
        level = normalizeRawLevel(raw);
        prep = prepLevel(level);
    } catch { skipped++; continue; }

    const paths = knownSolutions(raw);
    if (!paths.length) { skipped++; continue; }

    // Group by starting gate: distinct gates are distinct search trees.
    const byGate = new Map();
    for (const p of paths) {
        if (!byGate.has(p[0])) byGate.set(p[0], []);
        byGate.get(p[0]).push(p);
    }

    const lvl = { id: raw.id ?? null, solutions: paths.length, decisions: 0, rank0: 0, rank1: 0, rank2: 0, rank3plus: 0, absent: 0 };

    for (const [gate, gatePaths] of byGate) {
        let state;
        try { state = createState(gate, level, prep, STATE_BUF_DFS); } catch { continue; }
        const trie = buildTrie(gatePaths);

        const walk = (node) => {
            if (node.children.size === 0) return;
            const pos = node.key;
            let neighbors;
            try { neighbors = getNeighbors(pos, state, level, prep); } catch { neighbors = []; }
            const ordered = neighbors.slice();
            try { scoreAndSort(ordered, pos, state, level, prep, profile, null); } catch { /* keep raw order */ }

            // Rank of the BEST acceptable continuation, not of an arbitrary one.
            let best = Infinity;
            for (const childKey of node.children.keys()) {
                const idx = ordered.indexOf(childKey);
                if (idx >= 0 && idx < best) best = idx;
            }
            lvl.decisions++; decisionsScored++;
            if (best === Infinity) { lvl.absent++; buckets.absent++; }
            else if (best === 0) { lvl.rank0++; buckets.rank0++; }
            else if (best === 1) { lvl.rank1++; buckets.rank1++; }
            else if (best === 2) { lvl.rank2++; buckets.rank2++; }
            else { lvl.rank3plus++; buckets.rank3plus++; }

            for (const child of node.children.values()) {
                const portal = level.portalMap.get(pos);
                const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === child.key);
                let undo;
                try { undo = applyMove(child.key, state, level, prep, isPortalJump); } catch { continue; }
                walk(child);
                undoMove(undo, state);
            }
        };
        walk(trie);
    }

    if (lvl.decisions > 0) { perLevel.push(lvl); levelsScored++; }
}

const total = decisionsScored || 1;
const pct = n => ((n / total) * 100).toFixed(1) + '%';
console.log(`\nRank of the BEST acceptable continuation — ${corpusName}, profile '${profileName}', sources ${[...sources].join('+')}`);
console.log(`levels scored: ${levelsScored} (skipped ${skipped}) | decisions scored: ${decisionsScored.toLocaleString()}`);
console.log(`  rank 0 (search tries it first) : ${buckets.rank0.toLocaleString()}  ${pct(buckets.rank0)}`);
console.log(`  rank 1                         : ${buckets.rank1.toLocaleString()}  ${pct(buckets.rank1)}`);
console.log(`  rank 2                         : ${buckets.rank2.toLocaleString()}  ${pct(buckets.rank2)}`);
console.log(`  rank 3+                        : ${buckets.rank3plus.toLocaleString()}  ${pct(buckets.rank3plus)}`);
console.log(`  ABSENT from getNeighbors       : ${buckets.absent.toLocaleString()}  ${pct(buckets.absent)}   <- a valid move the search cannot make at any budget`);

const outFile = args.get('--out');
if (outFile) {
    mkdirSync(path.dirname(path.join(root, outFile)), { recursive: true });
    writeFileSync(path.join(root, outFile), JSON.stringify({
        corpus: corpusName, profile: profileName, sources: [...sources],
        population: flags.has('--unsolved-only') ? 'unsolved' : flags.has('--solved-only') ? 'solved' : 'all',
        levelsScored, decisionsScored, buckets, levels: perLevel,
    }, null, 2));
    console.log(`Wrote ${outFile}`);
}
