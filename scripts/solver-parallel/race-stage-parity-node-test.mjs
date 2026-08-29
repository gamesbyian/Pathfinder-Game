#!/usr/bin/env node
/**
 * Race/direct stage parity: race.mjs (the raced engine) and orchestration.ts (the sequential
 * engine) must agree on stage IDs and budget-fraction constants for every stage they BOTH
 * support — see race.mjs's own RACE_SUPPORTED_STAGE_IDS comment for which stages that is and why
 * the rest are sequential-only by design, not an accidental gap. Plain node/tsx script (matching
 * scripts/portfolio-solve-sweep-lib-node-test.mjs's own pattern) rather than a vitest .test.ts,
 * since importing race.mjs (a loose, untyped script) into a strictly-typed test file pulls it into
 * tsconfig.test.json's checked set and fails `check:types:tests` on its own pre-existing untyped
 * code — not a regression this parity check should be coupled to.
 */
import assert from 'node:assert/strict';
import { RACE_SUPPORTED_STAGE_IDS } from './race.mjs';
import { SOLVER_STAGE_IDS, solverStageSpec } from '../../modules/solver/stage-policy.js';
import { REPAIR_EXTRA_BUDGET_FRACTION, ATTRACTION_DIVERSITY_BUDGET_FRACTION } from '../../modules/solver/orchestration.js';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.message}`); process.exitCode = 1; }
}

test('every stage race.mjs claims to support is a real, canonical SolverStageId', () => {
    for (const id of RACE_SUPPORTED_STAGE_IDS) {
        assert.ok(SOLVER_STAGE_IDS.includes(id), `${id} is not a canonical stage id`);
        solverStageSpec(id); // throws for an unknown id
    }
});

test('race.mjs intentionally supports a documented SUBSET of the full sequential ladder, not a silently different one', () => {
    const unraced = SOLVER_STAGE_IDS.filter(id => !RACE_SUPPORTED_STAGE_IDS.includes(id));
    assert.deepEqual(unraced, [
        'explicit-prime', 'early-repair-search', 'repair-shrink-recovery', 'admissible-order-fallback',
        'coarse-state-near-tie-retention-disabled-retry', 'admissible-order-alternate-tiebreak-retry', 'connectivity-axis-prune-disabled-retry',
        'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',
        'guidance-goal-distance-retry', 'late-repair-multiseed-retry',
        'legacy-latency-portfolio-pass', 'legacy-latency-portfolio-fallback',
    ]);
});

test('race.mjs\'s repair/diversity budget-fraction constants come from orchestration.ts\'s own re-export, not a second hardcoded copy', () => {
    assert.equal(typeof REPAIR_EXTRA_BUDGET_FRACTION, 'number');
    assert.equal(typeof ATTRACTION_DIVERSITY_BUDGET_FRACTION, 'number');
    assert.ok(REPAIR_EXTRA_BUDGET_FRACTION > 0);
    assert.ok(ATTRACTION_DIVERSITY_BUDGET_FRACTION > 0);
});

console.log(`\nrace-stage-parity tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
