#!/usr/bin/env node
/**
 * PG-B feasibility audit: pairwise overlap of the frozen intervention-evaluation populations under data/stress.
 * A residual response atlas needs levels observed under several interventions; this reports how many exist.
 * Usage: node scripts/stress/intervention-population-overlap.mjs [--out=<file.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const NAMES = [
    'bc1-prune-ab-001',
    'cid-0027-near-hamiltonian-residual-unsolved-104',
    'cid-0028-very-high-int-residual-unsolved-96',
    'ws2-repair-deadline-solved-control-confirmation-150',
    'ws2-class4-allocation-113',
    'portal-coarse-state-merge-ab-001',
    'goal-attraction-fresh-work-pool-confirmation-001',
    'admissible-order-non-default-retry-production-ab-001',
    'mc-neighbor-budget-portal-ab-001',
    'repair-late-probe-six-seed-confirmation-001',
    'ws2-class2-frozen-cohort-001',
];
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
const ids = name => new Set(readFileSync(`data/stress/${name}-ids.txt`, 'utf8').match(/\b[A-Z]{1,3}\d{3,6}\b/g) ?? []);
const pops = Object.fromEntries(NAMES.map(n => [n, ids(n)]));
const matrix = NAMES.map(a => NAMES.map(b => [...pops[a]].filter(x => pops[b].has(x)).length));
const covered = new Map();
for (const n of NAMES) for (const id of pops[n]) covered.set(id, (covered.get(id) ?? 0) + 1);
const multiplicity = {};
for (const c of covered.values()) multiplicity[c] = (multiplicity[c] ?? 0) + 1;
const doc = { populations: Object.fromEntries(NAMES.map(n => [n, pops[n].size])), names: NAMES, overlapMatrix: matrix,
    distinctLevels: covered.size, levelsByNumberOfPopulationsContainingThem: multiplicity };
if (out) writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ distinctLevels: doc.distinctLevels, multiplicity }, null, 1));
NAMES.forEach((n, i) => console.log(n.padEnd(54), matrix[i].join(' ')));
