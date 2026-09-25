#!/usr/bin/env node
/**
 * Regression coverage for scripts/run-solver-direct.mjs:
 *
 *   1. `--work-budget` was silently broken: it passed the retired `workBudget` SolveOpts key
 *      straight through (orchestration.ts throws "retired SolveOpts.workBudget input; use
 *      baseWorkBudget"), so every level run with it errored out instead of solving. Fixed by routing
 *      through the same literal `solveOpts` object now also used for the canonical projection below.
 *   2. This producer had no canonical solverRequestIdentity/backend/reproducibilityMode dual-write
 *      at all (docs/hint-evidence-execution-identity-storage-consolidation-plan.md sections 3.2/3.3).
 *
 * Runs the real bundled CLI (matching level-blind-capability-sweep-cli-node-test.mjs's own execFile
 * pattern) against a single real, already-committed level, never with --save-hints, so this test never
 * mutates data/levels.json or its hint artifacts.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'run-solver-direct-cli-'));
const outputFile = path.join(dir, 'out.json');

// This tool is bundler-only by established convention (it imports from modules/), matching every
// other real-CLI test in this program. --work-budget is the regression this test exists to catch:
// before the fix, this exact invocation reported an 'error' status for the level instead of solving it.
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/run-solver-direct.mjs',
    '--levels=pos:1', '--budget-ms=5000', '--work-budget=5000000', `--output=${outputFile}`,
], { cwd: ROOT });

const out = JSON.parse(await readFile(outputFile, 'utf8'));
assert.equal(out.levels.length, 1);
assert.notEqual(out.levels[0].status, 'error', '--work-budget must reach solveLevel() as baseWorkBudget, not the retired workBudget key');
assert.doesNotMatch(String(out.levels[0].error ?? ''), /retired SolveOpts\.workBudget/,
    'the retired-key error must never appear again once --work-budget is routed correctly');
assert.equal(out.workBudget, 5000000);
assert.equal(out.kind, 'pathfinder-direct-solver-report');
assert.equal(out.producer, 'run-solver-direct');
assert.equal(out.corpus, 'data/levels.json');
if (out.levels[0].ok === true) {
    assert.ok(Array.isArray(out.levels[0].solution) && out.levels[0].solution.length > 0,
        'a successful direct observation must persist its exact accepted path for central replay');
    assert.equal(typeof out.levels[0].levelRevision, 'string');
    assert.ok(out.levels[0].levelRevision.length > 0);
    assert.equal(typeof out.levels[0].discoveryObservedAt, 'string');
    assert.ok(Number.isFinite(Date.parse(out.levels[0].discoveryObservedAt)));
    assert.equal(out.levels[0].workBudget, 5000000);
}

// Canonical solver-request identity dual-write (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 3.2): proves the value actually reaches the real bundled invocation
// boundary and round-trips through the plain-Node digest owner, not merely that the fields exist.
assert.equal(out.solverRequestProjection?.kind, 'pathfinder-solver-request-projection');
assert.equal(out.solverRequestProjection?.resourceEnvelope?.timeBudgetMs, 5000, '--budget-ms=5000 must reach the canonical projection unchanged');
assert.equal(out.solverRequestProjection?.resourceEnvelope?.baseWorkBudget, 5000000, '--work-budget=5000000 must reach the canonical projection as baseWorkBudget, not be dropped');
assert.equal(out.solverRequestIdentity, solverRequestIdentityFromProjection(out.solverRequestProjection),
    'the persisted identity must match a fresh recomputation from the persisted projection');

// Execution backend/reproducibility class (modules/solver/reproducibility-mode.mjs): levels run
// sequentially on the main thread, one solveLevel() call at a time -- a certain fact, not a guess.
assert.equal(out.backend, 'direct');
assert.equal(out.reproducibilityMode, 'deterministic-work');

// Partial-failure durability: kill the driver immediately after its first atomic checkpoint and
// prove the already-observed row remains recoverable instead of disappearing with the process.
const partialOutput = path.join(dir, 'partial.json');
let injectedFailure = null;
try {
    await execFile(process.execPath, [
        'scripts/run-bundled.mjs', 'scripts/run-solver-direct.mjs',
        '--levels=pos:1-2', '--budget-ms=1000', '--work-budget=500000', `--output=${partialOutput}`,
    ], {
        cwd: ROOT,
        env: { ...process.env, PATHFINDER_TEST_FAIL_AFTER_COMPLETED: '1' },
    });
} catch (error) {
    injectedFailure = error;
}
assert.ok(injectedFailure, 'fault injection must terminate the driver after the first checkpoint');
const partial = JSON.parse(await readFile(partialOutput, 'utf8'));
assert.equal(partial.complete, false);
assert.equal(partial.completed, 1);
assert.equal(partial.total, 2);
assert.equal(partial.levels.length, 1);
assert.equal(partial.levels[0].level, 1);

console.log('run-solver-direct CLI: --work-budget fix and solver-request identity dual-write verified');
