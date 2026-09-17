#!/usr/bin/env node
/**
 * Statistical-power follow-up to class5-production-search-sibling-harvest.mjs: that script drew
 * exactly ONE seeded-random candidate per (parent, depth-fraction) checkpoint from the real
 * production beam frontier. Across 98 draws (73 at depth-fraction 0.35/0.55/0.75 + 25 at 0.1) the
 * result was 0 LIVE -- including on R01600/R03147, two parents independently confirmed genuinely
 * CP-SAT-feasible from just the 1-cell gate prefix. A single random draw per frontier cannot rule
 * out a LOW-BUT-NONZERO live fraction within an otherwise-mostly-dead frontier: if the true live
 * fraction were e.g. 3%, 98/98 consecutive misses still has ~5% probability under a naive binomial
 * model -- plausible, not decisive. This directly estimates the live fraction within one frontier
 * by sampling MANY distinct nodes from it instead of one, on the two parents where independent
 * gate-feasibility evidence already exists, at the shallowest tested checkpoint (depth-fraction
 * 0.1) where a live fraction would be most likely to survive if construction-method quality (not
 * genuine early self-trapping) were the explanation.
 *
 * Zero new beam-search compute beyond one fresh run per target parent to the shallow checkpoint
 * (already cheap -- the full 25-parent shallow harvest took under 2 seconds); the only added cost
 * is CP-SAT labelling K additional cases per parent.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-production-search-frontier-multi-pick.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --levels=R01600,R03147 \
 *     --depth-fraction=0.1 --picks=15 --seed=class5-fresh-sibling-pilot-001 \
 *     --profile=intersectionHarvest --width=5000 \
 *     --cases-out=reports/stress/class5-production-search-frontier-multi-pick-cases-2026-09-17.json
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const LEVEL_IDS = arg('levels', 'R01600,R03147').split(',').map((s) => s.trim()).filter(Boolean);
const DEPTH_FRACTION = Number(arg('depth-fraction', 0.1));
const PICKS = Number(arg('picks', 15));
const SEED = arg('seed', 'class5-fresh-sibling-pilot-001');
const PROFILE_NAME = arg('profile', 'intersectionHarvest');
const WIDTH = Number(arg('width', 5000));
const BUDGET_MS = Number(arg('budget-ms', 600_000));
const CASES_OUT_FILE = arg('cases-out', null);
const POP_OUT_FILE = arg('pop-out', null);

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededRng(seedStr) { const h = xmur3(seedStr); return mulberry32(h()); }
// Fisher-Yates partial shuffle: distinct indices, no replacement.
function sampleDistinctIndices(n, k, seedStr) {
    const rng = seededRng(seedStr);
    const idx = Array.from({ length: n }, (_, i) => i);
    const take = Math.min(k, n);
    for (let i = 0; i < take; i++) {
        const j = i + Math.floor(rng() * (n - i));
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, take);
}

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES } = SOLVER_TESTING_API;
const PROFILE = SCORING_PROFILES[PROFILE_NAME];

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
const corpusDoc = readJson(CORPUS_FILE);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const corpusById = new Map(corpusRows.map((row) => [row.id, row]));

function reconstructBeamPath(node) {
    const len = node.depth + 1;
    const out = new Array(len);
    let cur = node;
    for (let i = len - 1; i >= 0; i--) { out[i] = cur.key; cur = cur.prev; }
    return out;
}

const rows = [];
for (const levelId of LEVEL_IDS) {
    const raw = corpusById.get(levelId);
    if (!raw) { console.log(`${levelId}: missing from corpus, skipped`); continue; }
    const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };

    const pauseAfterPhases = Math.max(1, Math.round(level.requiredLength * DEPTH_FRACTION));
    const out = {};
    const result = await beamSearchFromGate(gate, level, prep, PROFILE, BUDGET_MS, Date.now(), null, WIDTH, null, false, out, Infinity, undefined, pauseAfterPhases);
    if (result) { console.log(`${levelId}: SOLVED before checkpoint (len ${result.length}), skipping multi-pick`); continue; }
    if (!out.pausedContinuation) { console.log(`${levelId}: naturally exhausted before checkpoint, skipping`); continue; }

    const frontier = out.pausedContinuation.frontier;
    const picks = sampleDistinctIndices(frontier.length, PICKS, `${SEED}:${levelId}:multi-pick`);
    console.log(`${levelId}: frontier=${frontier.length}, sampling ${picks.length} distinct nodes at depth ${pauseAfterPhases}`);
    for (const idx of picks) {
        const node = frontier[idx];
        const prefix = reconstructBeamPath(node);
        rows.push({ levelId, frontierIndex: idx, frontierSize: frontier.length, depth: pauseAfterPhases, score: node.score, prefix });
    }
}

if (CASES_OUT_FILE) {
    const cases = rows.map((r) => ({ id: `${r.levelId}:multi-pick-${r.frontierIndex}`, levelId: r.levelId, prefix: r.prefix }));
    const abs = path.resolve(ROOT, CASES_OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ corpus: CORPUS_FILE, cases }, null, 1));
    console.log(`Wrote ${CASES_OUT_FILE} (${cases.length} cases)`);
}
if (POP_OUT_FILE) {
    const abs = path.resolve(ROOT, POP_OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({
        generatedAt: new Date().toISOString(),
        evidenceRole: 'multi-pick frontier live-fraction estimate on independently gate-confirmed-feasible parents',
        levelIds: LEVEL_IDS, depthFraction: DEPTH_FRACTION, picksRequested: PICKS, seed: SEED,
        profile: PROFILE_NAME, width: WIDTH, rows,
    }, null, 1));
    console.log(`Wrote ${POP_OUT_FILE}`);
}
