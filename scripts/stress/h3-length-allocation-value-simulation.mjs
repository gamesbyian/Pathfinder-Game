#!/usr/bin/env node
/**
 * H3's own flagged open question (reports/2026-09-17-h3-repair-commitment-interface-result-001.md's
 * "Relation to existing evidence": "does not test whether length itself is an economically
 * actionable allocation signal under fixed work"). H3 found remaining length dominates
 * rescuability DESCRIPTIVELY on Card-E's population; this asks whether that fact can be turned
 * into a production ALLOCATION policy: under one shared, fixed total node budget across all 156
 * rows, does processing rows in ascending-remaining-length order solve more of them than an
 * unprioritized order?
 *
 * Zero new solver compute: this is a pure simulation over already-recorded real search costs.
 * Card-E's own sizing pass (reports/stress/card-e-sizing-cross-tab-001.json) already ran every row
 * to either a real solution (recording the exact node count needed, `reachNodes`) or to its
 * 2,000,000-node cap (non-reconstructable). Assuming the underlying search is deterministic (no
 * randomness -- searchCompletionFromPartialPath is, per Card-E's own method section), a row given
 * budget >= its recorded reachNodes would be solved; a row given less would not. This lets
 * different allocation ORDERS be simulated by replaying already-known outcomes, not by re-running
 * search.
 *
 * Usage:
 *   node scripts/stress/h3-length-allocation-value-simulation.mjs \
 *     --cross-tab=reports/stress/card-e-sizing-cross-tab-001.json \
 *     --h3-features=reports/stress/h3-repair-commitment-interface-2026-09-17.json \
 *     --out=reports/stress/h3-length-allocation-value-simulation-2026-09-17.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CROSS_TAB_FILE = arg('cross-tab', 'reports/stress/card-e-sizing-cross-tab-001.json');
const H3_FEATURES_FILE = arg('h3-features', 'reports/stress/h3-repair-commitment-interface-2026-09-17.json');
const OUT_FILE = arg('out', null);

const crossTab = JSON.parse(readFileSync(path.resolve(ROOT, CROSS_TAB_FILE), 'utf8'));
const h3 = JSON.parse(readFileSync(path.resolve(ROOT, H3_FEATURES_FILE), 'utf8'));
const h3ById = new Map(h3.rows.map((r) => [r.id, r]));

const rows = crossTab.rows.map((r) => {
    const feat = h3ById.get(r.id);
    if (!feat) throw new Error(`no H3 feature row for ${r.id}`);
    return { id: r.id, reachNodes: r.reachNodes, reconstructable: r.reconstructable, lengthRemaining: feat.commitment.lengthRemaining };
});
const solvableSum = rows.filter((r) => r.reconstructable).reduce((a, r) => a + r.reachNodes, 0);

const PER_ROW_CAP = 2_000_000; // matches Card-E's own per-row search cap, so a non-reconstructable
// row's recorded outcome ("not solved within 2,000,000 nodes") is directly reusable here.

/** Sequential allocation with a per-row cap, draining a shared pool: each row in turn gets up to
 * PER_ROW_CAP nodes (or whatever remains of the shared budget, if less). A reconstructable row
 * consumes exactly its recorded reachNodes and is solved if that fits in what it's given; a
 * non-reconstructable row is known (from Card-E's own run) to still fail even with the full cap,
 * so it consumes min(cap, remaining) and is never solved. The scheduler always moves on to the
 * next row in order -- this models "try each candidate up to a per-row limit, then move to the
 * next," not "dump the whole shared pool into the first row that doesn't finish early." */
function simulate(orderedRows, totalBudget) {
    let spent = 0;
    let solved = 0;
    for (const row of orderedRows) {
        if (spent >= totalBudget) break;
        const remaining = totalBudget - spent;
        const rowBudget = Math.min(PER_ROW_CAP, remaining);
        if (row.reconstructable && row.reachNodes <= rowBudget) {
            solved++;
            spent += row.reachNodes;
        } else {
            spent += rowBudget; // not solved within what this row was given this run
        }
    }
    return { solved, spent };
}

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
function shuffleWithSeed(arr, seedStr) {
    const rng = mulberry32(xmur3(seedStr)());
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const RANDOM_TRIALS = 50;
const randomOrders = Array.from({ length: RANDOM_TRIALS }, (_, i) => shuffleWithSeed(rows, `h3-allocation-random-${i}`));

const orders = {
    ascendingLength: [...rows].sort((a, b) => a.lengthRemaining - b.lengthRemaining),
    descendingLength: [...rows].sort((a, b) => b.lengthRemaining - a.lengthRemaining),
    datasetOrder: rows,
    oracleAscendingCost: [...rows].sort((a, b) => (a.reconstructable ? a.reachNodes : Infinity) - (b.reconstructable ? b.reachNodes : Infinity)),
};

// Budget levels expressed as a fraction of "every row gets its own full per-row cap"
// (rows.length * PER_ROW_CAP) -- the natural scale given the simulation processes rows
// sequentially at up to PER_ROW_CAP nodes each, not as a fraction of the (much smaller) sum of
// already-known-solvable costs.
const fullRowCapacityBudget = rows.length * PER_ROW_CAP;
const budgetFractions = [0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 1.0];
const results = budgetFractions.map((frac) => {
    const totalBudget = Math.round(fullRowCapacityBudget * frac);
    const row = { budgetFraction: frac, totalBudget, approxRowsAtFullCap: Math.round(totalBudget / PER_ROW_CAP) };
    for (const [name, ordered] of Object.entries(orders)) {
        row[name] = simulate(ordered, totalBudget).solved;
    }
    const randomSolvedCounts = randomOrders.map((ordered) => simulate(ordered, totalBudget).solved);
    row.randomMean = randomSolvedCounts.reduce((a, b) => a + b, 0) / randomSolvedCounts.length;
    row.randomMin = Math.min(...randomSolvedCounts);
    row.randomMax = Math.max(...randomSolvedCounts);
    return row;
});

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'H3\'s own flagged open question -- does remaining length have economically actionable ALLOCATION value under a fixed shared budget, not just descriptive correlation. Zero new solver compute: simulation over Card-E\'s already-recorded real search costs.',
    sourceCrossTab: CROSS_TAB_FILE, sourceH3Features: H3_FEATURES_FILE,
    method: 'deterministic replay: a row is "solved" under a simulated shared budget iff processed before the budget is exhausted AND its recorded reachNodes <= remaining budget at that point. Compares ascending/descending remaining-length order, the dataset\'s own (unordered) row order, and an oracle ascending-actual-cost order as an upper bound.',
    rowCount: rows.length, reconstructableCount: rows.filter((r) => r.reconstructable).length, randomTrials: RANDOM_TRIALS, perRowCap: PER_ROW_CAP,
    solvableSumNodes: solvableSum,
    budgetSimulations: results,
};
console.log(JSON.stringify(results, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
