#!/usr/bin/env node
/**
 * Real-search collection for the joint-obligation must-cross/portal observer pilot
 * (reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md). Runs the actual
 * production solveLevel() over the opportunity-eligible levels in class 4 (near-control) and
 * class 5 (frontier) from the post-1,029 residual atlas, with the observer attached — never
 * pruning, only logging. Purpose: measure whether real search actually FIRES this mechanism
 * differentially between the two classes (not merely whether the static geometry is present —
 * see analyze-joint-obligation-opportunity.mjs, which already found class 4 has the higher static
 * opportunity rate), and spot-check every reject event against the level's own stored hints for a
 * live-prefix false reject.
 *
 * Deliberately aggregates counts rather than retaining every record: an active cluster can be
 * evaluated at every node while its must-cross cell stays pending, which can be a large fraction
 * of a long search. Retains only a bounded sample of reject events (with path) per level for the
 * soundness spot-check.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/collect-joint-obligation-observations.mjs -- \
 *     --atlas=reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json \
 *     --budget-ms=8000 --out=reports/stress/joint-obligation-observer-pilot-001.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const ATLAS = arg('atlas', 'reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json');
const CORPUS = arg('corpus', 'data/stress/stress-levels-random.json');
const BUDGET_MS = Number(arg('budget-ms', 8000));
const NODE_BUDGET = Number(arg('node-budget', 400000));
const OUT = arg('out', 'reports/stress/joint-obligation-observer-pilot-001.json');
const LIMIT_PER_CLASS = arg('limit-per-class', null);

const atlas = JSON.parse(readFileSync(path.resolve(ATLAS), 'utf8'));
const rawLevels = readLevelsWithHints(CORPUS);
const rawById = new Map(rawLevels.map((level, idx) => [String(level.id), { raw: level, idx }]));

function opportunityLevelsForClass(primaryClass) {
    const rows = atlas.rows.filter(r => r.primaryClass === primaryClass);
    const withClusters = [];
    for (const row of rows) {
        const found = rawById.get(String(row.id));
        if (!found) throw new Error(`level ${row.id} missing from ${CORPUS}`);
        const level = Solver.prepareLevelForSolver(found.raw, { source: 'raw', levelNumber: found.idx + 1 });
        const prep = api.prepLevel(level);
        const clusters = api.findObligationClusters(level, prep);
        if (clusters.length > 0) withClusters.push({ id: row.id, raw: found.raw, clusterCount: clusters.length });
    }
    return LIMIT_PER_CLASS ? withClusters.slice(0, Number(LIMIT_PER_CLASS)) : withClusters;
}

async function runLevel(raw) {
    const { hints, hintRecords, ...rest } = raw;
    void hintRecords;
    const level = Solver.prepareLevelForSolver(rest, { source: 'raw' });

    const counts = { pass: 0, reject: 0, abstain: 0 };
    const byReasonFamily = {};
    const rejectSamples = [];
    const observer = {
        observe(record) {
            counts[record.verdict] = (counts[record.verdict] ?? 0) + 1;
            byReasonFamily[record.reasonFamily] = (byReasonFamily[record.reasonFamily] ?? 0) + 1;
            if (record.verdict === 'reject' && rejectSamples.length < 20) {
                rejectSamples.push({ path: record.path, depth: record.depth, work: record.work, clusterId: record.clusterId });
            }
        },
    };

    const t0 = Date.now();
    const result = await Solver.solveLevel(level, {
        timeBudgetMs: BUDGET_MS, nodeBudget: NODE_BUDGET, jointObligationObserver: observer,
    });
    const elapsedMs = Date.now() - t0;

    // Soundness spot-check: does any reject sample's path prefix a stored, referee-valid hint or
    // this run's own found solution? A hit here would be a live-prefix false reject.
    const knownSolutions = [];
    if (result.ok && Array.isArray(result.solution)) knownSolutions.push(result.solution);
    for (const h of hints || []) if (Array.isArray(h)) knownSolutions.push(h);
    const keyOf = p => p.join(',');
    const knownPrefixes = new Set();
    for (const sol of knownSolutions) for (let n = 1; n <= sol.length; n++) knownPrefixes.add(keyOf(sol.slice(0, n)));
    const falseRejects = rejectSamples.filter(r => knownPrefixes.has(keyOf(r.path)));

    return {
        id: raw.id, solved: !!result.ok, status: result.status, elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        counts, byReasonFamily,
        rejectSampleCount: rejectSamples.length,
        falseRejectCount: falseRejects.length,
        falseRejectSamples: falseRejects,
    };
}

async function runClass(primaryClass) {
    const levels = opportunityLevelsForClass(primaryClass);
    const rows = [];
    for (const { id, raw, clusterCount } of levels) {
        const row = await runLevel(raw);
        row.clusterCount = clusterCount;
        rows.push(row);
        console.log(`  class${primaryClass} ${id}: solved=${row.solved} pass=${row.counts.pass} reject=${row.counts.reject} abstain=${row.counts.abstain} falseRejects=${row.falseRejectCount}`);
    }
    const fired = rows.filter(r => r.counts.reject > 0);
    const totalFalseRejects = rows.reduce((a, r) => a + r.falseRejectCount, 0);
    return {
        primaryClass,
        opportunityLevels: rows.length,
        firedLevels: fired.length,
        firedRate: rows.length ? fired.length / rows.length : null,
        totalReject: rows.reduce((a, r) => a + r.counts.reject, 0),
        totalPass: rows.reduce((a, r) => a + r.counts.pass, 0),
        totalAbstain: rows.reduce((a, r) => a + r.counts.abstain, 0),
        solvedInThisRun: rows.filter(r => r.solved).length,
        totalFalseRejects,
        rows,
    };
}

console.log(`Running joint-obligation observer pilot: budget-ms=${BUDGET_MS}${LIMIT_PER_CLASS ? ` limit-per-class=${LIMIT_PER_CLASS}` : ''}`);
const class4 = await runClass(4);
const class5 = await runClass(5);

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'observer-only real-search pilot (no pruning; class-4 near-control vs class-5 frontier)',
    atlas: ATLAS,
    corpus: CORPUS,
    budgetMs: BUDGET_MS,
    class4: { ...class4, rows: undefined },
    class5: { ...class5, rows: undefined },
    class4Rows: class4.rows,
    class5Rows: class5.rows,
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2) + '\n');

console.log(`\nclass4: ${class4.firedLevels}/${class4.opportunityLevels} fired (${(100 * (class4.firedRate ?? 0)).toFixed(1)}%), reject=${class4.totalReject} pass=${class4.totalPass} abstain=${class4.totalAbstain} falseRejects=${class4.totalFalseRejects}`);
console.log(`class5: ${class5.firedLevels}/${class5.opportunityLevels} fired (${(100 * (class5.firedRate ?? 0)).toFixed(1)}%), reject=${class5.totalReject} pass=${class5.totalPass} abstain=${class5.totalAbstain} falseRejects=${class5.totalFalseRejects}`);
console.log(`Wrote ${OUT}`);
if (class4.totalFalseRejects > 0 || class5.totalFalseRejects > 0) {
    console.log('\n!! FALSE REJECT DETECTED — see falseRejectSamples in the output. SOUNDNESS VIOLATED.');
    process.exitCode = 1;
}
