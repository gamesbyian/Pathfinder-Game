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
const { solveLevelRaced } = await import('./solver-parallel/race.mjs');
const { createSolver } = await import('../modules/Solver.js');
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

test('solveLevelRaced returns a solution that passes the PLAY referee', async () => {
  const raw = rawLevel();
  const result = await solveLevelRaced(raw, { timeBudgetMs: 3000, poolSize: 2 });
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.solution) && result.solution.length > 0);

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

test('solveLevelRaced works with poolSize=1 (degenerate single-worker pool)', async () => {
  const raw = rawLevel();
  const result = await solveLevelRaced(raw, { timeBudgetMs: 3000, poolSize: 1 });
  assert.equal(result.ok, true);
}, 20000);

test('solveLevelRaced finds an equally-valid solution to the same level as sequential solveLevel', async () => {
  const raw = rawLevel({ grid: { w: 6, h: 6 }, goal: { x: 6, y: 6 }, reqLen: 10 });
  const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
  const seq = await Solver.solve(level, { timeBudgetMs: 3000 });
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
