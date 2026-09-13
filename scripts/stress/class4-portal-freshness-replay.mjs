#!/usr/bin/env node
/**
 * Class-4 portal coarse-state-merge freshness replay (docs/solver-optimization-workstreams.md
 * WS2 gate 1). Replays a tiny prespecified sample of current class-4 residual rows nominated by
 * the closed STRATEGY_PORTAL_COARSE_STATE_MERGE referee-valid gain set
 * (data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt) under the existing
 * default-off treatment flag, current code, and production-shaped work semantics
 * (nodeBudget=50,000,000 / workBudget=67,000,000 / timeBudgetMs=86,400,000 /
 * schedulerMode='production' — matching the current production boundary run 34683011115's own
 * corpus2_node_budget=50,000,000, strict_total_work_budget=false).
 *
 * Sample selection (prespecified before running, see tmp/class4-freshness-sample.json
 * derivation): stratified by routingRegime proportional to the 88/11/14 intersection-heavy/
 * multi-portal/must-cross-heavy split among the 113 class-4 nominations, evenly spaced by sorted
 * id within each stratum (4 intersection-heavy, 2 multi-portal, 2 must-cross-heavy). This asks
 * only whether the September 9 positive basin still exists -- not a promotion attempt.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class4-portal-freshness-replay.mjs
 */
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();

const SAMPLE_IDS = [
    'R00082', 'R02173', 'R02807', 'R03365', // intersection-heavy
    'R00466', 'R03228', // multi-portal
    'R00329', 'R03303', // must-cross-heavy
];

const cfg = { ...defaultConfig(), STRATEGY_PORTAL_COARSE_STATE_MERGE: true };

const rawLevels = readLevelsWithHints('data/stress/stress-levels-random.json');
const byId = new Map(rawLevels.map(l => [String(l.id), l]));

let solved = 0, refereeValid = 0;
const rows = [];
for (const id of SAMPLE_IDS) {
    const raw = byId.get(id);
    if (!raw) { console.log(`${id}: MISSING FROM CORPUS`); rows.push({ id, status: 'missing' }); continue; }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const result = await Solver.solveLevel(level, {
        nodeBudget: 50000000, workBudget: 67000000, timeBudgetMs: 86400000,
        schedulerMode: 'production', ablation: cfg,
    });
    if (!result.ok || !Array.isArray(result.solution)) {
        console.log(`${id}: NOT SOLVED (status=${result.status}, nodesExpanded=${result.nodesExpanded}) -- basin STALE on this level`);
        rows.push({ id, status: result.status, ok: false, nodesExpanded: result.nodesExpanded ?? null });
        continue;
    }
    solved++;
    const verdict = Solver.validateCandidatePath(level, result.solution);
    if (verdict.ok) {
        refereeValid++;
        console.log(`${id}: SOLVED, referee-valid, nodesExpanded=${result.nodesExpanded} -- basin FRESH on this level`);
        rows.push({ id, status: result.status, ok: true, refereeValid: true, nodesExpanded: result.nodesExpanded });
    } else {
        console.log(`${id}: solved but REFEREE REJECTED: ${verdict.reason}`);
        rows.push({ id, status: result.status, ok: true, refereeValid: false, reason: verdict.reason });
    }
}

console.log(`\n${solved}/${SAMPLE_IDS.length} solved locally under STRATEGY_PORTAL_COARSE_STATE_MERGE, ${refereeValid}/${SAMPLE_IDS.length} referee-valid.`);
process.stdout.write(`${JSON.stringify({ sampleIds: SAMPLE_IDS, solved, refereeValid, rows }, null, 2)}\n`);
