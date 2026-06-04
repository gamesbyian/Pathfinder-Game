#!/usr/bin/env node
/**
 * Regression test for the dev-mode PortalBoundAssert crash.
 *
 * Background: the start-neighbor "portal-aware bound" sanity check counts a branch
 * as satisfied only when portalAwareBound <= rSteps, but the actual root prune
 * accepts bound <= rSteps * 1.05. Portal levels with legal start branches inside
 * that 5% slack therefore left satisfiedBranches at 0, and the assertion THREW
 * when APP.State.ENGINE.isDevMode was true (and not auditMode) — aborting an
 * otherwise-successful solve. Result: the Edit-mode Solve button reported
 * "no hint" on every portal level for dev users, while the non-dev path, the
 * direct script, and the audit harness all solved the identical level.
 *
 * This test runs portal levels with isDevMode = true and asserts the solver still
 * solves them (i.e. the assertion is non-fatal). It would throw [SOLVER CRASH]
 * before the fix.
 *
 * Usage: node scripts/portal-dev-mode-solve-test.mjs [--levels=4,21,92]
 */
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./LegacySolver.js');

const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >> 16 });
const APP = {
  LevelUtils: {
    PACK, UNPACK,
    inBounds: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
    resolvePortal: (level, key) => (level?.portalMap?.has(key) ? level.portalMap.get(key) : null),
    deepCloneLevel: (l) => l,
    canonicalCloneLevel: (l) => l,
    normalizeLevel: () => { throw new Error('not used'); },
    getRawLevels: () => []
  },
  Core: { PLAY: 'play', EDITOR: 'editor', HINT_ANIMATING: 'h', SOLVER_RUNNING: 's', OVERLAY_NONE: 'o' },
  Data: { getLevels: () => [] },
  // The critical knob: dev mode ON, exactly like the user's browser session.
  State: { ENGINE: { flags: {}, isDevMode: true, activeSolverController: null, solverAbortRequested: false, runtime: {}, ui: {}, levelIdx: 0 } },
  UI: { showMessage() {}, setModalContent() {}, setSolverTimerText() {}, setButtonState() {}, setSolverDetailText() {}, setSolverProgress() {}, showSolverAlreadyRunning() {} },
  Engine: { setOverlayState() {}, areWinMetricsSatisfied: () => true },
  Editor: { setWorkingLevelHintsFromSolutions() {} },
  Debug: { register() {} }
};
const Solver = installSolver(APP);

async function loadLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(await readFile(path.join(root, 'levels.js'), 'utf8'), ctx, { filename: 'levels.js' });
  return ctx.window.RAW_LEVELS;
}

const arg = process.argv.find(a => a.startsWith('--levels='));
const rawLevels = await loadLevels();
const targets = arg ? arg.split('=')[1].split(',').map(Number) : [4, 21, 92, 108, 117, 134];

let failures = 0;
for (const n of targets) {
  const raw = rawLevels[n - 1];
  if (!raw || !(Array.isArray(raw.portals) && raw.portals.length > 0)) { console.log(`L${n}: SKIP (not a portal level)`); continue; }
  const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: n });
  APP.State.ENGINE.activeSolverController = null;
  APP.State.ENGINE.solverAbortRequested = false;
  let res, threw = null;
  try {
    res = await Solver.universalSolveLevel(level, { purpose: 'hint', timeBudgetMs: CANONICAL_SOLVE_TIME_BUDGET_MS, debug: true, allowReferee: true, resetAttemptHistory: 'level' });
  } catch (e) { threw = e; }
  const ok = !!res?.ok && !threw;
  console.log(`L${n}: ${ok ? 'PASS' : 'FAIL'} (status=${res?.status || res?.finalStatus || res?.rawStatus}${threw ? `, THREW: ${threw.message}` : ''})`);
  if (!ok) failures++;
}

console.log(`\n${targets.length - failures}/${targets.length} portal levels solved with isDevMode=true.`);
if (failures > 0) { console.error(`REGRESSION: ${failures} portal level(s) failed/crashed in dev mode.`); process.exit(1); }
console.log('OK: PortalBoundAssert is non-fatal; dev-mode UI Solve matches the script.');
