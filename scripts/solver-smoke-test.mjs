import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSolver } from '../solver.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.includes("import { createSolver } from './solver.js';"), 'index.html should import createSolver from solver.js');
assert.ok(html.includes('APP.Solver = createSolver({ APP });'), 'index.html should initialize APP.Solver via createSolver factory');

const buildApp = () => ({
  Debug: { register() {} },
  Core: { PLAY: 'play' },
  State: {
    ENGINE: {
      activeSolverController: null,
      solverAbortRequested: false,
      isDevMode: false,
      levelIdx: 0
    }
  },
  UI: {
    setModalContent() {},
    setButtonState() {},
    showMessage() {}
  },
  Engine: {
    setOverlayState() {}
  },
  Editor: {
    setWorkingLevelHintsFromSolutions() {}
  },
  LevelUtils: {
    PACK: (x, y) => ((x & 0xffff) << 16) | (y & 0xffff)
  }
});

const app = buildApp();

globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
const solver = createSolver({ APP: app });
app.Solver = solver;

for (const method of [
  'solveLevel',
  'findTrapSpots',
  'getTrapSpotBudgetMs',
  'applySolutionsToEngine',
  'cancel',
  'isRunning',
  'getStatus',
  'runGameSolver',
  'getHint',
  'startHintAnimation',
  'stopHintAnimation',
  'validateCandidatePath',
  'toAuditAttemptSummary',
  'clearAttemptHistory'
]) {
  assert.equal(typeof solver[method], 'function', `solver API should expose ${method}()`);
}

assert.deepEqual(
  solver.validateCandidatePath({ grid: { w: 3, h: 3 }, gateKeys: [app.LevelUtils.PACK(0, 0)] }, [[1]]),
  { ok: false, reason: 'Path must contain at least 2 nodes.' },
  'validateCandidatePath should reject too-short path arrays'
);

assert.deepEqual(
  solver.validateCandidatePath({ grid: { w: 3, h: 3 }, gateKeys: [app.LevelUtils.PACK(0, 0)] }, [{ nope: true }, [2, 2]]),
  { ok: false, reason: 'Invalid path coordinate format.' },
  'validateCandidatePath should reject malformed nodes'
);

assert.deepEqual(
  solver.validateCandidatePath({ grid: { w: 3, h: 3 }, gateKeys: [app.LevelUtils.PACK(0, 0)] }, [[2, 2], [2, 3]]),
  { ok: false, reason: 'Path must start on a gate.' },
  'validateCandidatePath should enforce gate start contract'
);

const activeController = { aborted: false, abort() { this.aborted = true; } };
app.State.ENGINE.activeSolverController = activeController;
solver.cancel();
assert.equal(activeController.aborted, true, 'cancel should abort active solver controller');
assert.equal(app.State.ENGINE.solverAbortRequested, true, 'cancel should set solverAbortRequested flag');
assert.equal(solver.isRunning(), true, 'isRunning should reflect active solver controller');
assert.equal(solver.getStatus().active, true, 'getStatus().active should reflect running state');

app.State.ENGINE.mode = 'play';
app.State.ENGINE.hinter = { pathList: [], currentPathIdx: 0, source: 'none' };
app.State.ENGINE.foundHintsSinceLoad = [];
solver.applySolutionsToEngine([[[1, 1], [1, 2], [1, 3]]], 'hint');
assert.equal(app.State.ENGINE.hinter.pathList.length, 1, 'applySolutionsToEngine should treat coordinate tuples as one hint path');
assert.deepEqual(app.State.ENGINE.hinter.pathList[0], [[1, 1], [1, 2], [1, 3]], 'applySolutionsToEngine should preserve tuple-based hint path shape');

console.log('Solver smoke test passed (factory API + behavior contracts).');
