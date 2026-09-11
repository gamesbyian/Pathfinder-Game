#!/usr/bin/env node
/**
 * Independent local reproduction/referee-validation of the PRUNE_MC_PORTAL_FORCED_NEIGHBOR A/B's
 * treatment-arm gains (reports/2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md). The GHA
 * artifact host is not reachable from this session's egress policy, so this reruns each claimed
 * gain locally with the flag enabled and validates the returned solution through the canonical
 * referee (Solver.validateCandidatePath), independent of the GHA run's own bookkeeping.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/verify-joint-obligation-ab-gains.mjs
 */
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();

const GAIN_IDS = [
    'R01489', 'R02162', 'R02832', 'R02654', 'R02036', 'R01882', 'R02060', 'R00726', 'R02707',
    'R03336', 'R02479', 'R01849', 'R02823', 'R02932', 'R02864', 'R02546', 'R01274', 'R03106',
    'R03097', 'R03254', 'R02389',
];

const cfg = { ...defaultConfig(), PRUNE_MC_PORTAL_FORCED_NEIGHBOR: true };

const rawLevels = readLevelsWithHints('data/stress/stress-levels-random.json');
const byId = new Map(rawLevels.map(l => [String(l.id), l]));

let solved = 0, refereeValid = 0, failed = [];
for (const id of GAIN_IDS) {
    const raw = byId.get(id);
    if (!raw) { console.log(`${id}: MISSING FROM CORPUS`); failed.push(id); continue; }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const result = await Solver.solveLevel(level, { nodeBudget: 50000000, timeBudgetMs: 300000, ablation: cfg });
    if (!result.ok || !Array.isArray(result.solution)) {
        console.log(`${id}: NOT SOLVED locally (status=${result.status}) -- ab gain NOT reproduced`);
        failed.push(id);
        continue;
    }
    solved++;
    const verdict = Solver.validateCandidatePath(level, result.solution);
    if (verdict.ok) {
        refereeValid++;
        console.log(`${id}: solved, referee-valid, nodesExpanded=${result.nodesExpanded}`);
    } else {
        console.log(`${id}: solved but REFEREE REJECTED: ${verdict.reason}`);
        failed.push(id);
    }
}

console.log(`\n${solved}/${GAIN_IDS.length} reproduced locally, ${refereeValid}/${GAIN_IDS.length} referee-valid`);
if (failed.length) {
    console.log(`FAILED/UNREPRODUCED: ${failed.join(', ')}`);
    process.exitCode = 1;
} else {
    console.log('ALL CLAIMED GAINS INDEPENDENTLY REPRODUCED AND REFEREE-VALID.');
}
