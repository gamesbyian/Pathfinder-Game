#!/usr/bin/env node
/**
 * Mechanic-composition transfer pilot, Stage C: matched-work prune on/off comparison. Only
 * manipulation-valid sibling pairs from Stage B proceed here, per the frozen design
 * (reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md). Compares each sibling to
 * its own parent counterpart (control/treatment on original vs. control/treatment on decoupled),
 * not generated levels to an aggregate corpus. Diagnostic pilot: does not claim a population-scale
 * effect size.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/mechanic-composition-pilot-stage-c.mjs -- \
 *     --stage-a=reports/stress/mechanic-composition-pilot-001/stage-a.json \
 *     --stage-b=reports/stress/mechanic-composition-pilot-001/stage-b.json \
 *     --node-budget=20000000 --out=reports/stress/mechanic-composition-pilot-001/stage-c.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.ts');
const Solver = createSolver();

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const stageA = JSON.parse(readFileSync(path.join(root, args.get('--stage-a') || 'reports/stress/mechanic-composition-pilot-001/stage-a.json'), 'utf8'));
const stageB = JSON.parse(readFileSync(path.join(root, args.get('--stage-b') || 'reports/stress/mechanic-composition-pilot-001/stage-b.json'), 'utf8'));
const outPath = path.join(root, args.get('--out') || 'reports/stress/mechanic-composition-pilot-001/stage-c.json');
const NODE_BUDGET = Number(args.get('--node-budget') || 20_000_000);
const BUDGET_MS = Number(args.get('--budget-ms') || 300_000);

const byId = new Map(stageA.results.map(r => [r.parentId, r]));
const CORPUS_FILE = path.join(root, 'data/stress/stress-levels-random.json');
const rawFile = JSON.parse(readFileSync(CORPUS_FILE, 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;
const rawById = new Map(rawLevels.map(l => [String(l.id), l]));

async function solveOne(raw, ablation) {
    const { hints, hintRecords, ...rest } = raw;
    void hints; void hintRecords;
    const level = Solver.prepareLevelForSolver(rest, { source: 'raw' });
    const result = await Solver.solveLevel(level, { nodeBudget: NODE_BUDGET, timeBudgetMs: BUDGET_MS, ablation });
    let refereeValid = null;
    if (result.ok && result.solution) {
        const verdict = Solver.validateCandidatePath(level, result.solution);
        refereeValid = verdict.ok;
    }
    return {
        ok: result.ok, status: result.status, workSpent: result.workSpent ?? null,
        nodesExpanded: result.nodesExpanded ?? null, refereeValid,
    };
}

const rows = [];
for (const parentId of stageB.manipulationValid) {
    console.log(`Stage C for ${parentId}...`);
    const originalRaw = rawById.get(parentId);
    const decoupledRaw = byId.get(parentId).editedRaw;

    const [origControl, origTreatment, decControl, decTreatment] = await Promise.all([
        solveOne(originalRaw, { PRUNE_MC_PORTAL_FORCED_NEIGHBOR: false }),
        solveOne(originalRaw, { PRUNE_MC_PORTAL_FORCED_NEIGHBOR: true }),
        solveOne(decoupledRaw, { PRUNE_MC_PORTAL_FORCED_NEIGHBOR: false }),
        solveOne(decoupledRaw, { PRUNE_MC_PORTAL_FORCED_NEIGHBOR: true }),
    ]);

    const originalRescue = !origControl.ok && origTreatment.ok; // matches the original A/B's own gain definition
    const decoupledRescuePersists = !decControl.ok && decTreatment.ok;
    const decoupledRescueDisappears = originalRescue && !decoupledRescuePersists;

    const row = {
        parentId, original: { control: origControl, treatment: origTreatment },
        decoupled: { control: decControl, treatment: decTreatment },
        originalRescueConfirmed: originalRescue,
        decoupledRescuePersists, decoupledRescueDisappears,
    };
    rows.push(row);
    console.log(`  original control=${origControl.status}/${origControl.ok} treatment=${origTreatment.status}/${origTreatment.ok} | `
        + `decoupled control=${decControl.status}/${decControl.ok} treatment=${decTreatment.status}/${decTreatment.ok} | `
        + `rescue: original=${originalRescue} decoupledPersists=${decoupledRescuePersists}`);
}

const summary = {
    total: rows.length,
    originalRescueConfirmed: rows.filter(r => r.originalRescueConfirmed).length,
    decoupledRescuePersists: rows.filter(r => r.decoupledRescuePersists).length,
    decoupledRescueDisappears: rows.filter(r => r.decoupledRescueDisappears).length,
};
console.log(`\nSummary: ${JSON.stringify(summary)}`);

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ nodeBudget: NODE_BUDGET, budgetMs: BUDGET_MS, rows, summary }, null, 2));
console.log(`Wrote ${outPath}`);
