/**
 * Unit/integration coverage for scripts/solver-parallel/ (worker-thread attempt racing).
 * These spin up real node:worker_threads and an esbuild-bundled worker, so they're slower than a
 * pure-function unit test — kept to a small number of tiny synthetic levels and short budgets to
 * stay within vitest's normal run time.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

installBrowserStubs();
const { solveLevelRaced, createRacePool, racedAttemptRecord } = await import('./solver-parallel/race.mjs');
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

function rawLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 5 },
    gates: [{ x: 1, y: 1 }],
    goal: { x: 5, y: 5 },
    reqLen: 8,
    reqInt: 0,
    blocks: [], mustPass: [], mustCross: [], falseGoals: [], geese: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [],
    designerName: '', description: '', difficulty: null, hints: [],
    ...overrides,
  };
}

test('racedAttemptRecord preserves every dispatch-identity flag in every race phase', () => {
  const job = {
    gateKey: 7,
    attemptConfig: {
      scoringProfileId: 'none', orderingBias: null, repair: true, repairTurnBiased: true,
      admissibleOrder: true, admissibleOrderNoTieBreak: true, admissibleOrderLds: true,
    },
  };
  assert.deepEqual(racedAttemptRecord(job, { ok: false, outcome: 'exhausted', elapsedMs: 12 }, { stageId: 'goal-attraction-disabled-retry' }), {
    gateKey: 7, scoringProfileId: 'none', orderingBiasId: null, beamWidth: null,
    repair: true, repairTurnBiased: true,
    admissibleOrder: true, admissibleOrderNoTieBreak: true, admissibleOrderLds: true,
    stageId: 'goal-attraction-disabled-retry',
    ok: false, outcome: 'exhausted', elapsedMs: 12, nodesExpanded: 0,
  });
});

test('racedAttemptRecord expands bounded worker errors with attempt identity', () => {
  const job = { gateKey: 7, attemptConfig: { scoringProfileId: 'default', orderingBias: { id: 'portal' }, beamWidth: 500 } };
  const record = racedAttemptRecord(job, {
    ok: false, outcome: 'error', allocatedBudgetMs: 50, elapsedMs: 3,
    error: { name: 'TypeError', message: 'dispatch failed' },
  });
  assert.equal(record.outcome, 'error');
  assert.equal(record.allocatedBudgetMs, 50);
  assert.deepEqual(record.error, {
    name: 'TypeError', message: 'dispatch failed', gateKey: 7,
    configKey: 'beam|score=default|bias=portal|width=500|retention=plain', scoringProfileId: 'default', orderingBiasId: 'portal',
  });
});

test('solveLevelRaced returns a solution that passes the PLAY referee', async () => {
  const raw = rawLevel();
  const result = await solveLevelRaced(raw, { timeBudgetMs: 3000, poolSize: 2 });
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.solution) && result.solution.length > 0);
  // The attraction-diversity phase must never engage when phase 1 already solves it — zero cost
  // to an already-solvable level (mirrors orchestration.ts's own `!result.solution` gate).
  assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);

  const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
  const check = Solver.validateCandidatePath(level, result.solution);
  assert.equal(check.ok, true, `raced solution failed the PLAY referee: ${check.reason || check.error}`);
}, 20000);

test('solveLevelRaced reports failure (not a hang or throw) for a genuinely unsolvable level', async () => {
  // reqLen=3 is unreachable from a straight-line gate-to-goal distance of 8 — no path can
  // possibly satisfy it, so every attempt must exhaust without success.
  const raw = rawLevel({ reqLen: 3 });
  const result = await solveLevelRaced(raw, { timeBudgetMs: 1500, poolSize: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.solution, null);
}, 20000);

// Same parity-preserving-but-infeasible shape as orchestration.test.ts's own attraction-diversity
// test (reqLen matches the true gate/goal distance's parity, so STRATEGY_PARITY_GATE_FILTER
// doesn't empty activeGates before phase 1 even starts — reqLen: 3 vs. distance 8 above IS
// filtered that way, which is fine for "reports failure" but wouldn't ever reach phase 2 at all).
function parityPreservingInfeasibleLevel() {
  return rawLevel({ grid: { w: 4, h: 4 }, gates: [{ x: 1, y: 1 }], goal: { x: 4, y: 4 }, reqLen: 2 });
}

test('solveLevelRaced runs the attraction-diversity phase after phase 1 exhausts', async () => {
  const raw = parityPreservingInfeasibleLevel();
  const result = await solveLevelRaced(raw, { timeBudgetMs: 500, poolSize: 2 });
  assert.equal(result.ok, false);
  const diversityAttempts = result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
  const phase1Attempts = result.attempts.filter(a => a.stageId !== 'goal-attraction-disabled-retry');
  assert.ok(diversityAttempts.length > 0, 'expected at least one attraction-diversity attempt');
  assert.ok(phase1Attempts.length > 0, 'expected at least one phase-1 attempt');
}, 20000);

test('attractionDiversityBudgetFractionOverride: 0 suppresses the raced diversity phase', async () => {
  const raw = parityPreservingInfeasibleLevel();
  const result = await solveLevelRaced(raw, {
    timeBudgetMs: 500, poolSize: 2, attractionDiversityBudgetFractionOverride: 0,
  });
  assert.equal(result.ok, false);
  assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);
}, 20000);

test('a sparse raced ablation override preserves unrelated production-default strategies', async () => {
  const result = await solveLevelRaced(parityPreservingInfeasibleLevel(), {
    timeBudgetMs: 500,
    poolSize: 2,
    ablation: { PRUNE_PARITY: false },
  });
  assert.equal(result.ok, false);
  assert.ok(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'),
    'an unrelated sparse override must not silently disable the default-on diversity phase');
}, 20000);

test('an undefined raced ablation property does not override its production default', async () => {
  const result = await solveLevelRaced(parityPreservingInfeasibleLevel(), {
    timeBudgetMs: 500,
    poolSize: 2,
    ablation: { STRATEGY_ATTRACTION_DIVERSITY: undefined },
  });
  assert.equal(result.ok, false);
  assert.ok(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'));
}, 20000);

test('solveLevelRaced works with poolSize=1 (degenerate single-worker pool)', async () => {
  const raw = rawLevel();
  const result = await solveLevelRaced(raw, { timeBudgetMs: 3000, poolSize: 1 });
  assert.equal(result.ok, true);
}, 20000);

test('solveLevelRaced finds an equally-valid solution to the same level as sequential solveLevel', async () => {
  const raw = rawLevel({ grid: { w: 6, h: 6 }, goal: { x: 6, y: 6 }, reqLen: 10 });
  const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
  const seq = await Solver.solveLevel(level, { timeBudgetMs: 3000 });
  const raced = await solveLevelRaced(raw, { timeBudgetMs: 3000, poolSize: 2 });
  assert.equal(seq.ok, true);
  assert.equal(raced.ok, true);
  // Not necessarily the SAME path (racing can pick a different winning strategy) — both must
  // independently be real, referee-valid solutions.
  const seqCheck = Solver.validateCandidatePath(level, seq.solution);
  const racedCheck = Solver.validateCandidatePath(level, raced.solution);
  assert.equal(seqCheck.ok, true);
  assert.equal(racedCheck.ok, true);
}, 20000);

test('back-to-back solveLevelRaced calls both complete cleanly (no hang from a leaked worker pool)', async () => {
  const raw = rawLevel();
  const first = await solveLevelRaced(raw, { timeBudgetMs: 2000, poolSize: 2 });
  const second = await solveLevelRaced(raw, { timeBudgetMs: 2000, poolSize: 2 });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
}, 20000);

// --- createRacePool: the persistent-pool API a batch run shares across many levels ---------

test('createRacePool: one pool solves several different levels in sequence, reusing its workers', async () => {
  const pool = createRacePool({ poolSize: 2 });
  try {
    // Deliberately different grid/goal/reqLen per call so each solveLevel() forces the workers'
    // single-entry cachedLevelKey/cachedPrep cache (worker-source.mjs) to evict and rebuild —
    // the exact cross-level reuse path this pool exists to exercise.
    const levelA = rawLevel();
    const levelB = rawLevel({ grid: { w: 6, h: 6 }, goal: { x: 6, y: 6 }, reqLen: 10 });
    const levelC = rawLevel({ grid: { w: 7, h: 4 }, gates: [{ x: 1, y: 4 }], goal: { x: 7, y: 1 }, reqLen: 9 });

    for (const raw of [levelA, levelB, levelC]) {
      const result = await pool.solveLevel(raw, { timeBudgetMs: 3000 });
      assert.equal(result.ok, true, `expected a solution for grid ${raw.grid.w}x${raw.grid.h}`);
      const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
      const check = Solver.validateCandidatePath(level, result.solution);
      assert.equal(check.ok, true, `pooled solution failed the PLAY referee: ${check.reason || check.error}`);
    }
  } finally {
    await pool.shutdown();
  }
}, 30000);

test('createRacePool: a level that exhausts all attempts does not corrupt the pool for the next level', async () => {
  const pool = createRacePool({ poolSize: 2 });
  try {
    const unsolvable = await pool.solveLevel(rawLevel({ reqLen: 3 }), { timeBudgetMs: 1200 });
    assert.equal(unsolvable.ok, false);

    const solvable = await pool.solveLevel(rawLevel(), { timeBudgetMs: 3000 });
    assert.equal(solvable.ok, true);
  } finally {
    await pool.shutdown();
  }
}, 30000);

test('createRacePool: works with poolSize=1 (degenerate single-worker pool) across two levels', async () => {
  const pool = createRacePool({ poolSize: 1 });
  try {
    const first = await pool.solveLevel(rawLevel(), { timeBudgetMs: 3000 });
    const second = await pool.solveLevel(rawLevel({ grid: { w: 6, h: 6 }, goal: { x: 6, y: 6 }, reqLen: 10 }), { timeBudgetMs: 3000 });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
  } finally {
    await pool.shutdown();
  }
}, 30000);

test('createRacePool: solveLevel() rejects after shutdown() instead of hanging', async () => {
  const pool = createRacePool({ poolSize: 1 });
  await pool.shutdown();
  await assert.rejects(() => pool.solveLevel(rawLevel(), { timeBudgetMs: 1000 }));
}, 10000);
