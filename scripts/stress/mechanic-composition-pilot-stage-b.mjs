#!/usr/bin/env node
/**
 * Mechanic-composition transfer pilot, Stage B: observer manipulation check. Runs the existing
 * joint-obligation observer with pruning DISABLED (ablation PRUNE_MC_PORTAL_FORCED_NEIGHBOR=false,
 * pure logging) on each original/decoupled sibling pair from Stage A, under matched execution
 * semantics (same budgets, same ablation, same search). Per the frozen design
 * (reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md), the primary manipulation
 * check (structural cluster identity) is already proven by Stage A; this asks whether rejection
 * opportunities attributable to the targeted cluster's own (mustCrossIndex, axis) identity actually
 * appear on the original sibling's real search (confirming dynamic relevance, not just static
 * presence) and are structurally absent on the decoupled sibling (guaranteed by Stage A's own
 * cluster-set check, reconfirmed here from the live observer rather than assumed).
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/mechanic-composition-pilot-stage-b.mjs -- \
 *     --stage-a=reports/stress/mechanic-composition-pilot-001/stage-a.json \
 *     --node-budget=5000000 --out=reports/stress/mechanic-composition-pilot-001/stage-b.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        try { readFileSync(path.join(dir, 'package.json')); return dir; } catch { /* keep climbing */ }
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const stageAPath = path.join(root, args.get('--stage-a') || 'reports/stress/mechanic-composition-pilot-001/stage-a.json');
const outPath = path.join(root, args.get('--out') || 'reports/stress/mechanic-composition-pilot-001/stage-b.json');
const NODE_BUDGET = Number(args.get('--node-budget') || 5_000_000);
const BUDGET_MS = Number(args.get('--budget-ms') || 60_000);

const stageA = JSON.parse(readFileSync(stageAPath, 'utf8'));
const byId = new Map(stageA.results.map(r => [r.parentId, r]));
const cohort = stageA.cohort;

const CORPUS_FILE = path.join(root, 'data/stress/stress-levels-random.json');
const rawFile = JSON.parse(readFileSync(CORPUS_FILE, 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;
const rawById = new Map(rawLevels.map(l => [String(l.id), l]));

function runObserved(raw) {
    const { hints, hintRecords, ...rest } = raw;
    void hints; void hintRecords;
    const level = Solver.prepareLevelForSolver(rest, { source: 'raw' });
    const prep = api.prepLevel(level);
    const clusters = api.findObligationClusters(level, prep);

    const byMcAxis = {}; // key `${mustCrossIndex}:${axis}` -> {pass,reject,abstain}
    const observer = {
        observe(record) {
            // clusterId format from joint-obligation-propagation.ts: `mc${i}:${h|v}:${neighborKey}`
            const [mcPart, axisPart] = record.clusterId.split(':');
            const key = `${mcPart}:${axisPart}`;
            byMcAxis[key] ??= { pass: 0, reject: 0, abstain: 0 };
            byMcAxis[key][record.verdict] = (byMcAxis[key][record.verdict] ?? 0) + 1;
        },
    };

    return { level, prep, clusters, byMcAxis, observer };
}

async function runPair(parentId) {
    const entry = byId.get(parentId);
    const originalRaw = rawById.get(parentId);
    if (!originalRaw) throw new Error(`${parentId} not found in corpus2`);
    const decoupledRaw = entry.editedRaw;

    const orig = runObserved(originalRaw);
    const dec = runObserved(decoupledRaw);

    const targetedAxisLetter = entry.targetedCluster.axis === 'H' ? 'h' : 'v';
    // Identify the targeted cluster's mustCrossIndex by coordinates (stable across the edit since
    // relocating a portal terminal never reorders level.mustCrossKeys).
    const targetMc = entry.targetedCluster.mc; // {x,y} 1-indexed
    const mcIdx = orig.level.mustCrossKeys.findIndex((k) => {
        const x = (k & 0xFFFF) + 1, y = (k >>> 16) + 1;
        return x === targetMc.x && y === targetMc.y;
    });
    const targetKey = `mc${mcIdx}:${targetedAxisLetter}`;

    const ablation = { PRUNE_MC_PORTAL_FORCED_NEIGHBOR: false };
    const [origResult, decResult] = await Promise.all([
        Solver.solveLevel(orig.level, {
            nodeBudget: NODE_BUDGET, timeBudgetMs: BUDGET_MS, ablation,
            jointObligationObserver: orig.observer,
        }),
        Solver.solveLevel(dec.level, {
            nodeBudget: NODE_BUDGET, timeBudgetMs: BUDGET_MS, ablation,
            jointObligationObserver: dec.observer,
        }),
    ]);

    const origTargetCounts = orig.byMcAxis[targetKey] || { pass: 0, reject: 0, abstain: 0 };
    const decTargetCounts = dec.byMcAxis[targetKey] || { pass: 0, reject: 0, abstain: 0 };
    const decHasTargetCluster = dec.clusters.some(c => c.mustCrossIndex === mcIdx && (c.axis === 1 ? 'h' : 'v') === targetedAxisLetter);

    return {
        parentId,
        mcIdx, targetedAxis: targetedAxisLetter,
        original: { ok: origResult.ok, status: origResult.status, targetClusterVerdicts: origTargetCounts, totalClusters: orig.clusters.length },
        decoupled: { ok: decResult.ok, status: decResult.status, targetClusterVerdicts: decTargetCounts, totalClusters: dec.clusters.length, decHasTargetCluster },
        manipulationValid: !decHasTargetCluster && origTargetCounts.reject > 0,
        note: decHasTargetCluster
            ? 'UNEXPECTED: decoupled level still structurally has the targeted cluster'
            : (origTargetCounts.reject === 0
                ? 'null observer manipulation: original search never rejected on the targeted cluster at this budget'
                : 'clean: targeted cluster rejects on original, structurally absent on decoupled'),
    };
}

const rows = [];
for (const parentId of cohort) {
    console.log(`Running observer pair for ${parentId}...`);
    const row = await runPair(parentId);
    rows.push(row);
    console.log(`  ${parentId}: original reject=${row.original.targetClusterVerdicts.reject} pass=${row.original.targetClusterVerdicts.pass} | `
        + `decoupled hasCluster=${row.decoupled.decHasTargetCluster} | ${row.note}`);
}

const manipulationValid = rows.filter(r => r.manipulationValid).map(r => r.parentId);
console.log(`\nManipulation-valid siblings (eligible for Stage C): ${manipulationValid.length}/${rows.length} — ${manipulationValid.join(', ') || 'none'}`);

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ nodeBudget: NODE_BUDGET, budgetMs: BUDGET_MS, rows, manipulationValid }, null, 2));
console.log(`\nWrote ${outPath}`);
