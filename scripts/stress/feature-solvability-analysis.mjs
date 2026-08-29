#!/usr/bin/env node
/**
 * Corpus-wide discriminative analysis: which level FEATURES actually separate solved from
 * unsolved levels in a compiled baseline. Read-only, no solving — joins an existing compiled
 * baseline's ok/failed labels against `levelFeatures()` (the same feature extractor the novelty
 * and clustering tools use, which mirrors solver/routingRegime.ts's own requiredPathCoverageRatio/routingRegime logic).
 *
 * Why this exists, and what it is NOT:
 *
 *   `cluster-unsolved-failures.mjs` reports `byRoutingRegime` COUNTS over the unsolved population.
 *   Counts alone cannot distinguish "this routingRegime is hard" from "this routingRegime is most of the
 *   corpus" — and for stress-corpus-2 the difference is decisive: `high-intersection-burden` is
 *   the majority routingRegime corpus-wide, so it dominates every failure bucket while carrying almost
 *   no difficulty signal (enrichment ~1.0x). Reading those count tables as a difficulty ranking
 *   has previously mis-aimed campaign targeting. This script reports SOLVE RATES and enrichment
 *   factors instead, so a feature's apparent prevalence in the failure set is always divided
 *   through by its prevalence in the corpus.
 *
 *   It also reports every effect CONTROLLED for requiredPathCoverageRatio, because requiredPathCoverageRatio (= reqLen /
 *   navigable area — how much of the free board the solution must consume) is both the strongest
 *   single discriminator and correlated with most mechanic counts. An uncontrolled feature effect
 *   is frequently just requiredPathCoverageRatio in disguise.
 *
 * This measures ASSOCIATION on observational data, not causation: it says which regimes the solver
 * currently fails in, never why. Use it to pick where to aim a diagnosis (witness-divergence,
 * ablation, family fragile/robust split), not as evidence that a feature is itself the mechanism.
 *
 * Usage:
 *   node scripts/stress/feature-solvability-analysis.mjs \
 *       --baseline=logs/stress-corpus2-baseline.json \
 *       --corpus=data/stress/stress-levels-random.json [--out=<file.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { levelFeatures } from './features.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const BASELINE_FILE = args.get('--baseline');
const CORPUS_FILE = args.get('--corpus');
const OUT_FILE = args.get('--out');

if (!BASELINE_FILE || !CORPUS_FILE) {
    console.error('Usage: feature-solvability-analysis.mjs --baseline=<compiled baseline> --corpus=<levels.json> [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const baseline = readJson(BASELINE_FILE);
const corpus = readJson(CORPUS_FILE);
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;

const okById = new Map(baseline.levels.map(l => [l.id, l.ok]));
const attemptsById = new Map(baseline.levels.map(l => [l.id, l.attempts || []]));

const rows = [];
for (const raw of corpusLevels) {
    const ok = okById.get(raw.id);
    if (ok === undefined) continue;
    const f = levelFeatures(raw);
    const attempts = attemptsById.get(raw.id) || [];
    const badnesses = attempts
        .map(a => a.bestBadness ?? a.finalBadness)
        .filter(v => typeof v === 'number');
    rows.push({
        id: raw.id,
        ok,
        routingRegime: f.routingRegime,
        requiredPathCoverageRatio: f.requiredPathCoverageRatio,
        reqLen: f.reqLen,
        reqInt: f.reqInt,
        area: f.area,
        blocks: f.blocks,
        mustPass: f.mustPass,
        mustCross: f.mustCross,
        portalPairs: f.portalPairs,
        flippers: f.flippers,
        geese: f.geese,
        surround: f.surround,
        mustTurn: f.mustTurn,
        adjTurn: f.adjTurn,
        // Total outstanding turn/landmark obligations. Decorative landmarks are deliberately
        // excluded: they are impassable but carry no path obligation, so they belong to
        // requiredPathCoverageRatio (via `blocks`), not to constraint load.
        turnLoad: f.mustTurn + f.adjTurn + f.surround,
        attemptCount: attempts.length,
        bestBadness: badnesses.length ? Math.min(...badnesses) : null,
    });
}

const solved = rows.filter(r => r.ok);
const unsolved = rows.filter(r => !r.ok);
const rate = (a) => (a.length ? a.filter(r => r.ok).length / a.length : NaN);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const pct = (v) => `${(v * 100).toFixed(1)}%`;

console.log(`${path.basename(BASELINE_FILE)}: ${rows.length} levels | solved ${solved.length} | unsolved ${unsolved.length}\n`);

// ─── Routing-regime solve rates + enrichment (the base-rate correction) ─────
console.log('ROUTING REGIME — solve rate and enrichment in the unsolved population');
console.log('  enrichment = share of unsolved / share of corpus.  1.0 = carries no difficulty signal.');
const routingRegimes = [...new Set(rows.map(r => r.routingRegime))];
const routingRegimeReport = routingRegimes.map(a => {
    const grp = rows.filter(r => r.routingRegime === a);
    const share = grp.length / rows.length;
    const unsolvedShare = unsolved.filter(r => r.routingRegime === a).length / unsolved.length;
    return { routingRegime: a, n: grp.length, solveRate: rate(grp), share, unsolvedShare, enrichment: unsolvedShare / share };
}).sort((x, y) => y.n - x.n);
for (const a of routingRegimeReport) {
    console.log(`  ${a.routingRegime.padEnd(26)} n=${String(a.n).padStart(4)}  solved=${pct(a.solveRate).padStart(6)}` +
        `  corpus=${pct(a.share).padStart(6)}  unsolved=${pct(a.unsolvedShare).padStart(6)}  enrichment=${a.enrichment.toFixed(3)}x`);
}

// ─── Feature separation (Cohen's d) ─────────────────────────────────────────
const FEATURES = ['requiredPathCoverageRatio', 'turnLoad', 'reqLen', 'mustCross', 'mustTurn', 'adjTurn', 'surround',
    'portalPairs', 'blocks', 'area', 'flippers', 'geese', 'reqInt', 'mustPass'];

console.log('\n\nFEATURE SEPARATION (Cohen\'s d; positive = higher in the UNSOLVED population)');
const sd = (a, m) => Math.sqrt(mean(a.map(x => (x - m) ** 2)));
const separation = FEATURES.map(f => {
    const s = solved.map(r => r[f]), u = unsolved.map(r => r[f]);
    const ms = mean(s), mu = mean(u);
    const pooled = Math.sqrt((sd(s, ms) ** 2 + sd(u, mu) ** 2) / 2);
    return { feature: f, solvedMedian: median(s), unsolvedMedian: median(u), solvedMean: ms, unsolvedMean: mu, d: pooled ? (mu - ms) / pooled : 0 };
}).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
for (const s of separation) {
    console.log(`  ${s.feature.padEnd(13)} solved med=${s.solvedMedian.toFixed(2).padStart(7)}  unsolved med=${s.unsolvedMedian.toFixed(2).padStart(7)}` +
        `  d=${s.d.toFixed(3).padStart(7)}  ${'#'.repeat(Math.min(40, Math.round(Math.abs(s.d) * 40)))}`);
}

// ─── requiredPathCoverageRatio-controlled effects ──────────────────────────────────────────
const NAV_BANDS = [[0, 0.65], [0.65, 0.75], [0.75, 0.85], [0.85, 99]];
const PREDICATES = [
    ['mustTurn >= 4', r => r.mustTurn >= 4],
    ['mustCross >= 4', r => r.mustCross >= 4],
    ['portalPairs >= 4', r => r.portalPairs >= 4],
    ['adjTurn >= 4', r => r.adjTurn >= 4],
    ['surround >= 1', r => r.surround >= 1],
    ['flippers >= 5', r => r.flippers >= 5],
    ['reqInt >= 6', r => r.reqInt >= 6],
    ['mustPass >= 4', r => r.mustPass >= 4],
];

console.log('\n\nrequiredPathCoverageRatio-CONTROLLED EFFECT (solve-rate delta in percentage points, feature present vs absent)');
console.log(`  ${'feature'.padEnd(18)}${NAV_BANDS.map(([a, b]) => `nav[${a},${b === 99 ? '+' : b})`.padStart(16)).join('')}`);
const controlled = [];
for (const [label, pred] of PREDICATES) {
    let line = `  ${label.padEnd(18)}`;
    const deltas = [];
    for (const [lo, hi] of NAV_BANDS) {
        const band = rows.filter(r => r.requiredPathCoverageRatio >= lo && r.requiredPathCoverageRatio < hi);
        const no = band.filter(r => !pred(r)), yes = band.filter(r => pred(r));
        if (no.length < 15 || yes.length < 15) { line += 'n<15'.padStart(16); deltas.push(null); continue; }
        const delta = (rate(yes) - rate(no)) * 100;
        deltas.push(Number(delta.toFixed(1)));
        line += `${delta.toFixed(1)} pp`.padStart(16);
    }
    controlled.push({ feature: label, deltasByNavBand: deltas });
    console.log(line);
}

// ─── turnLoad dose-response ─────────────────────────────────────────────────
console.log('\n\nTURN-CONSTRAINT LOAD (mustTurn + adjacentTurn + surround) — dose-response');
const LOAD_BANDS = [[0, 1], [1, 4], [4, 8], [8, 12], [12, 99]];
const loadReport = [];
for (const [lo, hi] of LOAD_BANDS) {
    const b = rows.filter(r => r.turnLoad >= lo && r.turnLoad < hi);
    if (!b.length) continue;
    loadReport.push({ band: `${lo}-${hi === 99 ? '+' : hi - 1}`, n: b.length, solveRate: rate(b) });
    console.log(`  load ${String(lo).padStart(2)}-${(hi === 99 ? '+' : hi - 1).toString().padEnd(2)}  n=${String(b.length).padStart(4)}  solved=${pct(rate(b)).padStart(6)}  ${'#'.repeat(Math.round(rate(b) * 40))}`);
}

// ─── How close does the unsolved population get? ────────────────────────────
console.log('\n\nBEST BADNESS REACHED on unsolved levels (min over every attempt in the ladder)');
const BAD_BANDS = [[0, 3, '0-2'], [3, 6, '3-5'], [6, 11, '6-10'], [11, 21, '11-20'], [21, 1e9, '21+']];
const badnessReport = [];
for (const [lo, hi, label] of BAD_BANDS) {
    const b = unsolved.filter(r => r.bestBadness !== null && r.bestBadness >= lo && r.bestBadness < hi);
    if (!b.length) continue;
    badnessReport.push({ band: label, n: b.length, meanTurnLoad: Number(mean(b.map(r => r.turnLoad)).toFixed(2)) });
    console.log(`  badness ${label.padEnd(6)} n=${String(b.length).padStart(4)}  mean turnLoad=${mean(b.map(r => r.turnLoad)).toFixed(2)}  ${'#'.repeat(Math.round(b.length / unsolved.length * 60))}`);
}
console.log(`\n  ladder depth: unsolved mean ${mean(unsolved.map(r => r.attemptCount)).toFixed(1)} attempts/level` +
    `, solved mean ${mean(solved.map(r => r.attemptCount)).toFixed(1)}`);

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
        generatedAt: new Date().toISOString(),
        baselineFile: BASELINE_FILE,
        corpusFile: CORPUS_FILE,
        total: rows.length,
        solved: solved.length,
        unsolved: unsolved.length,
        routingRegimes: routingRegimeReport,
        separation,
        requiredPathCoverageRatioControlled: { navBands: NAV_BANDS, features: controlled },
        turnLoad: loadReport,
        badness: badnessReport,
        levels: rows,
    }, null, 1));
    console.log(`\nWrote ${OUT_FILE}`);
}
