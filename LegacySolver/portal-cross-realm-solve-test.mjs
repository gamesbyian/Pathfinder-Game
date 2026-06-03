#!/usr/bin/env node
/**
 * Regression test: portal levels must solve even when the level's Map/Set
 * collections were constructed in a different JS realm than Solver.js.
 *
 * Background: the solver's portal-family analysis used to be gated on
 * `level.portalMap instanceof Map`. `instanceof` is realm-fragile — a Map built
 * by a different global (e.g. the host page that constructs the level vs. the
 * Solver.js module) is NOT `instanceof` the checking realm's Map, so the guard
 * silently treated portal levels as portal-free. Portal-heavy puzzles (e.g. L92)
 * then became unsolvable through the affected entry point while the in-module
 * script path still worked — the reported "Solve button can't solve portal
 * levels, but the script can" asymmetry.
 *
 * This test rebuilds real portal levels with their collections allocated in a
 * separate vm realm (so `instanceof Map`/`instanceof Set` are false from
 * Solver.js's perspective) and asserts the solver still solves them.
 *
 * Usage: node scripts/portal-cross-realm-solve-test.mjs [--levels=4,21,92]
 */
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

// Browser-ish stubs so Solver.js's module-level code is inert in Node.
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./legacysolver.js');

const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });
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
  State: { ENGINE: { flags: {}, isDevMode: false, activeSolverController: null, solverAbortRequested: false, runtime: {}, ui: {}, levelIdx: 0 } },
  UI: { showMessage() {}, setModalContent() {}, setSolverTimerText() {}, setButtonState() {}, setSolverDetailText() {}, setSolverProgress() {}, showSolverAlreadyRunning() {} },
  Engine: { setOverlayState() {}, areWinMetricsSatisfied: () => true },
  Editor: { setWorkingLevelHintsFromSolutions() {} },
  Debug: { register() {} }
};
const Solver = installSolver(APP);

// A separate realm whose Map/Set constructors differ from this module's.
const otherRealm = vm.createContext({});
const ForeignMap = vm.runInContext('Map', otherRealm);
const ForeignSet = vm.runInContext('Set', otherRealm);
// Sanity: foreign collections must NOT be instanceof this realm's Map/Set.
if (new ForeignMap() instanceof Map) { console.error('Test harness invalid: foreign Map is instanceof local Map'); process.exit(2); }

async function loadLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(await readFile(path.join(root, 'levels.js'), 'utf8'), ctx, { filename: 'levels.js' });
  return ctx.window.RAW_LEVELS;
}

// Normalize a raw level into a solver level whose collections live in the foreign realm.
function normalizeCrossRealm(raw, idx) {
  const adj = (v) => v - 1;
  const fm = () => new ForeignMap();
  const fs = () => new ForeignSet();
  const l = {
    id: idx, grid: { ...raw.grid }, reqLen: raw.reqLen, reqInt: raw.reqInt,
    goalKey: PACK(adj(raw.goal.x), adj(raw.goal.y)),
    goal: { x: raw.goal.x, y: raw.goal.y },
    gateKeys: raw.gates.map(g => PACK(adj(g.x), adj(g.y))),
    gates: raw.gates.map(g => ({ x: g.x, y: g.y })),
    blockSet: fs(), gooseSet: fs(), falseGoalKeys: fs(),
    portalMap: fm(), portalVisuals: [], filterMap: fm(), flippingFilterMap: fm(),
    mustPassKeys: raw.mustPass?.map(m => PACK(adj(m.x), adj(m.y))) || [],
    mustCrossKeys: raw.mustCross?.map(m => PACK(adj(m.x), adj(m.y))) || [],
    hints: [], hasParityBreaker: false
  };
  (raw.blocks || []).forEach(w => l.blockSet.add(PACK(adj(w.x), adj(w.y))));
  raw.geese?.forEach(m => l.gooseSet.add(PACK(adj(m.x), adj(m.y))));
  raw.filters?.forEach(f => l.filterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
  raw.flippingFilters?.forEach(f => l.flippingFilterMap.set(PACK(adj(f.x), adj(f.y)), f.axis));
  raw.falseGoals?.forEach(g => l.falseGoalKeys.add(PACK(adj(g.x), adj(g.y))));
  raw.portals?.forEach(p => {
    const k1 = PACK(adj(p.x1), adj(p.y1)), k2 = PACK(adj(p.x2), adj(p.y2));
    l.portalMap.set(k1, { dest: k2 }); l.portalMap.set(k2, { dest: k1 });
    l.portalVisuals.push({ k1, k2 });
  });
  return l;
}

const arg = process.argv.find(a => a.startsWith('--levels='));
const rawLevels = await loadLevels();
const portalLevels = rawLevels.map((lv, i) => ({ lv, n: i + 1 })).filter(x => Array.isArray(x.lv.portals) && x.lv.portals.length > 0).map(x => x.n);
// Default: a representative set of portal levels incl. the hard L92.
const targets = arg ? arg.split('=')[1].split(',').map(Number) : [4, 21, 92, 108, 117, 134];

let failures = 0;
for (const n of targets) {
  const raw = rawLevels[n - 1];
  if (!raw || !(Array.isArray(raw.portals) && raw.portals.length > 0)) { console.log(`L${n}: SKIP (not a portal level)`); continue; }
  const level = normalizeCrossRealm(raw, n - 1);
  APP.State.ENGINE.activeSolverController = null;
  APP.State.ENGINE.solverAbortRequested = false;
  let res;
  try {
    res = await Solver.universalSolveLevel(level, { purpose: 'hint', timeBudgetMs: CANONICAL_SOLVE_TIME_BUDGET_MS, debug: true, allowReferee: true, resetAttemptHistory: 'level' });
  } catch (e) {
    console.log(`L${n}: FAIL (threw: ${e?.message})`);
    failures++;
    continue;
  }
  const ok = !!res?.ok;
  console.log(`L${n}: ${ok ? 'PASS' : 'FAIL'} (status=${res?.status || res?.finalStatus || res?.rawStatus}, nodes=${res?.debug?.nodesExpanded || 0})`);
  if (!ok) failures++;
}

console.log(`\n${targets.length - failures}/${targets.length} portal levels solved with cross-realm collections.`);
if (failures > 0) { console.error(`REGRESSION: ${failures} portal level(s) failed to solve with cross-realm Maps.`); process.exit(1); }
console.log('OK: portal-family analysis is realm-robust.');
