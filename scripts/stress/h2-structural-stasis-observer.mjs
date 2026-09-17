#!/usr/bin/env node
/**
 * H2 -- marginal information velocity / structural stasis, per reports/2026-09-16-class5-cross-
 * resource-hypothesis-harvest-001.md's frozen "smallest falsifying observer": "at prespecified
 * canonical-workSpent checkpoints record compact legal current-solve summaries of newly reached
 * search structure... The quantity of interest is new decision-relevant structural response per
 * unit of additional workSpent, joined to marginal outcome." Advancement bar: "a compact legal
 * stasis signal predicts near-zero marginal continuation value beyond generic difficulty/depth/
 * work controls on independent rows."
 *
 * Reuses two already-committed matched-work repair-elite censuses (30,000 and 300,000 node
 * budgets, same 28-level first-loss-frontier population, same `census-repair-rollback-windows.mjs`
 * tool, unmodified) from reports/2026-09-11-repair-side-first-loss-exposure-001.md -- zero new
 * solver compute. That population was itself already split into 14 dev-sample ids (from
 * reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md) and 14 confirmation-
 * sample ids (from reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), so this
 * script reuses that existing dev/confirmation provenance rather than inventing a new split:
 * candidate stasis signals are inspected on dev, then evaluated for real predictive power on the
 * untouched confirmation half, matching H2's own "independent rows" requirement.
 *
 * Two compact, cheap-to-observe stasis signals are computed from the 30k-node run ALONE (i.e.
 * observable before ever paying for a 300k-node run):
 *   - stasisFraction: 1 - (arrivalNodes of the run's best-badness elite / nodeBudget), i.e. how
 *     much of the 30k budget was spent after the last badness improvement (high = early stasis).
 *   - distinctBadness: count of distinct badness values across the run's sampled elites (a raw
 *     novelty-count proxy for "new decision-relevant structural response").
 * Marginal outcome: whether (and by how much) a fresh, unmodified 10x-larger-budget run (300k)
 * finds a strictly better best-badness than the 30k run for the same level -- this is the
 * "marginal continuation value" H2's advancement bar asks the stasis signal to predict.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const census30File = args.get('--census-30k') ?? 'reports/stress/first-loss-frontier-repair-rollback-census-001.json';
const census300File = args.get('--census-300k') ?? 'reports/stress/first-loss-frontier-repair-rollback-census-300k-001.json';
const outFile = args.get('--out') ?? 'reports/stress/h2-structural-stasis-observer-results.json';

// Provenance: reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md (dev sample).
const DEV_IDS = new Set([
    'R03101', 'R00329', 'R03275', 'R02530', 'R02309', 'R03351', 'R01190',
    'R01632', 'R03088', 'R01097', 'R03229', 'R03197', 'R02185', 'R02733',
]);
// Provenance: reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md (confirmation sample).
const CONFIRMATION_IDS = new Set([
    'R02438', 'R02590', 'R02897', 'R03223', 'R00786', 'R03083', 'R01023',
    'R00139', 'R02801', 'R02170', 'R02210', 'R02025', 'R01290', 'R02324',
]);

const census30 = JSON.parse(readFileSync(census30File, 'utf8'));
const census300 = JSON.parse(readFileSync(census300File, 'utf8'));
const byId30 = new Map(census30.levels.map(l => [l.levelId, l]));
const byId300 = new Map(census300.levels.map(l => [l.levelId, l]));

function bestBadness(level) {
    let best = Infinity, atNode = null;
    for (const row of level.census.rows) {
        if (row.badness < best) { best = row.badness; atNode = row.arrivalNodes; }
    }
    return { best, atNode };
}

const rows = [];
for (const [id, level30] of byId30) {
    const level300 = byId300.get(id);
    if (!level300) throw new Error(`${id}: no matching 300k entry`);
    if (!DEV_IDS.has(id) && !CONFIRMATION_IDS.has(id)) throw new Error(`${id}: not in either dev or confirmation split`);

    const { best: best30, atNode: lastImproveNode } = bestBadness(level30);
    const { best: best300 } = bestBadness(level300);
    const distinctBadness = new Set(level30.census.rows.map(r => r.badness)).size;
    const stasisFraction = 1 - lastImproveNode / level30.nodeBudget;
    const delta = best30 - best300; // positive = 300k run found lower (better) badness

    rows.push({
        id, split: DEV_IDS.has(id) ? 'dev' : 'confirmation',
        nodeBudget30: level30.nodeBudget, nodeBudget300: level300.nodeBudget,
        best30, best300, delta, improved: delta > 0,
        stasisFraction: Number(stasisFraction.toFixed(4)), distinctBadness,
    });
}

function pearson(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
    return dx === 0 || dy === 0 ? null : Number((num / Math.sqrt(dx * dy)).toFixed(4));
}

function summarize(rowsSubset) {
    const n = rowsSubset.length;
    const improved = rowsSubset.filter(r => r.improved).length;
    const meanDelta = Number((rowsSubset.reduce((a, r) => a + r.delta, 0) / n).toFixed(3));
    return {
        n, improved, improvedFraction: Number((improved / n).toFixed(3)), meanDelta,
        corrStasisFractionVsDelta: pearson(rowsSubset.map(r => r.stasisFraction), rowsSubset.map(r => r.delta)),
        corrDistinctBadnessVsDelta: pearson(rowsSubset.map(r => r.distinctBadness), rowsSubset.map(r => r.delta)),
    };
}

const dev = rows.filter(r => r.split === 'dev');
const confirmation = rows.filter(r => r.split === 'confirmation');

const document = {
    schemaVersion: 1, kind: 'h2-structural-stasis-observer', generatedAt: new Date().toISOString(),
    hypothesis: 'reports/2026-09-16-class5-cross-resource-hypothesis-harvest-001.md#H2',
    sourcePopulation: {
        census30File, census300File,
        note: '28-level first-loss-frontier population, reused unmodified from reports/2026-09-11-repair-side-first-loss-exposure-001.md; dev/confirmation split reused unmodified from its own two source phenotyping/confirmation reports.',
    },
    summary: { all: summarize(rows), dev: summarize(dev), confirmation: summarize(confirmation) },
    rows,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
