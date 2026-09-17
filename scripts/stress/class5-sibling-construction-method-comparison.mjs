#!/usr/bin/env node
/**
 * Direct side-by-side of the naive goal-distance-greedy sibling constructor
 * (reports/2026-09-17-fresh-dead-sibling-harvest-result-001.md: 0/75 LIVE) against the
 * production-search-quality constructor (scripts/stress/class5-production-search-sibling-harvest.mjs)
 * on the SAME 25 parents/seed/depth-fractions -- construction method is the only varied factor.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-sibling-construction-method-comparison.mjs -- \
 *     --naive-labels=reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json \
 *     --naive-population=reports/stress/class5-fresh-sibling-harvest-population-2026-09-17.json \
 *     --prod-labels=reports/stress/class5-production-search-sibling-harvest-exact-labels-2026-09-17.json \
 *     --prod-population=reports/stress/class5-production-search-sibling-harvest-population-2026-09-17.json \
 *     --out=reports/stress/class5-sibling-construction-method-comparison-2026-09-17.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const readJson = (f) => JSON.parse(readFileSync(path.resolve(ROOT, f), 'utf8'));

const naiveLabels = readJson(arg('naive-labels', 'reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json'));
const naivePop = readJson(arg('naive-population', 'reports/stress/class5-fresh-sibling-harvest-population-2026-09-17.json'));
const prodLabels = readJson(arg('prod-labels', 'reports/stress/class5-production-search-sibling-harvest-exact-labels-2026-09-17.json'));
const prodPop = readJson(arg('prod-population', 'reports/stress/class5-production-search-sibling-harvest-population-2026-09-17.json'));
const OUT_FILE = arg('out', null);

function summarize(name, labelsDoc, popDoc) {
    const byParent = new Map();
    for (const row of labelsDoc.rows) {
        const levelId = row.levelId;
        if (!byParent.has(levelId)) byParent.set(levelId, []);
        byParent.get(levelId).push(row.referenceLabel);
    }
    const parentsWithAnyLive = [...byParent.entries()].filter(([, labels]) => labels.some((l) => l === 'live'));
    return {
        name,
        cases: labelsDoc.summary.cases,
        live: labelsDoc.summary.live,
        dead: labelsDoc.summary.dead,
        abstain: labelsDoc.summary.abstain,
        correctnessAlarms: labelsDoc.summary.correctnessAlarms,
        independentParents: labelsDoc.summary.independentParents,
        parentsWithAnyLiveSibling: parentsWithAnyLive.length,
        parentsWithAnyLiveSiblingIds: parentsWithAnyLive.map(([id]) => id),
        skippedParents: popDoc.skipped ?? [],
        solvedDuringConstruction: popDoc.solvedDuringConstruction ?? [],
    };
}

const naive = summarize('naive-goal-distance-greedy-walk', naiveLabels, naivePop);
const prod = summarize('production-beam-search-frontier-pick', prodLabels, prodPop);

const sameParents = JSON.stringify([...naivePop.parentIds].sort()) === JSON.stringify([...prodPop.parentIds].sort());

const comparison = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'sibling-construction-method comparison -- same 25 parents/seed/depth-fractions, construction method as the only varied factor',
    sameParentSet: sameParents,
    naive,
    productionSearch: prod,
    delta: {
        liveCases: prod.live - naive.live,
        parentsWithAnyLiveSibling: prod.parentsWithAnyLiveSibling - naive.parentsWithAnyLiveSibling,
    },
};

console.log(JSON.stringify(comparison, null, 2));
if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(comparison, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
