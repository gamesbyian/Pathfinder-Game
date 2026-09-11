#!/usr/bin/env node
/**
 * Opportunity-population sizing for the joint-obligation must-cross/portal observer pilot
 * (reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md), per
 * docs/solver-experiment-opportunity-sizing.md's rule: define the population that can actually
 * express the treatment BEFORE spending any real-search compute. A level with zero static
 * obligation clusters (findStaticObligationClusters) can only ever abstain, regardless of how
 * search unfolds, so this is a pure static/geometric join — no solving.
 *
 * Reuses the checked post-1,029 residual atlas (class 4/class 5 membership) and the corpus's own
 * prepLevel — no new labelling.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/analyze-joint-obligation-opportunity.mjs -- \
 *     --atlas=reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json \
 *     --out=tmp/joint-obligation-opportunity.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { findStaticObligationClusters } from './lib/joint-obligation-mc-portal.mjs';

installBrowserStubs();
const Solver = createSolver();
const { prepLevel } = SOLVER_TESTING_API;

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const ATLAS = arg('atlas', 'reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json');
const CORPUS = arg('corpus', 'data/stress/stress-levels-random.json');
const OUT = arg('out', 'tmp/joint-obligation-opportunity.json');

const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const atlas = readJson(ATLAS);
const corpusDoc = readJson(CORPUS);
const corpus = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const rawById = new Map(corpus.map((level, idx) => [level.id, { raw: level, idx }]));

function classify(primaryClass) {
    const rows = atlas.rows.filter(r => r.primaryClass === primaryClass);
    const withOpportunity = [];
    const clusterCounts = [];
    for (const row of rows) {
        const found = rawById.get(row.id);
        if (!found) throw new Error(`level ${row.id} missing from ${CORPUS}`);
        const level = Solver.prepareLevelForSolver(found.raw, { source: 'raw', levelNumber: found.idx + 1 });
        const prep = prepLevel(level);
        const clusters = findStaticObligationClusters(level, prep);
        if (clusters.length > 0) withOpportunity.push({ id: row.id, clusters: clusters.length });
        clusterCounts.push(clusters.length);
    }
    return {
        primaryClass,
        n: rows.length,
        opportunityLevels: withOpportunity.length,
        opportunityRate: rows.length ? withOpportunity.length / rows.length : null,
        totalClusters: clusterCounts.reduce((a, b) => a + b, 0),
        levels: withOpportunity,
    };
}

const class4 = classify(4);
const class5 = classify(5);

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'opportunity-population sizing (static/geometric join, no solving)',
    atlas: ATLAS,
    corpus: CORPUS,
    class4,
    class5,
    note: 'A level counts as "opportunity" only if it has >=1 static must-cross/portal-terminal-neighbor cluster; this is necessary but not sufficient for the mechanism to ever fire (the neighbor must also become visited before the must-cross cell\'s axis is used).',
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2) + '\n');

console.log(`class4: ${class4.opportunityLevels}/${class4.n} opportunity levels (${(100 * (class4.opportunityRate ?? 0)).toFixed(1)}%), ${class4.totalClusters} total clusters`);
console.log(`class5: ${class5.opportunityLevels}/${class5.n} opportunity levels (${(100 * (class5.opportunityRate ?? 0)).toFixed(1)}%), ${class5.totalClusters} total clusters`);
console.log(`Wrote ${OUT}`);
