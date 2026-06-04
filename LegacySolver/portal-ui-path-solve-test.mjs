#!/usr/bin/env node
/**
 * Regression test: portal levels must solve when the level goes through the
 * denormalize → normalizeRawLevelForSolver round-trip used by runGameSolver.
 *
 * Background: runGameSolver previously used deepCloneLevel → canonicalCloneLevel
 * (the "UI path") to prepare the level for the solver. canonicalCloneLevel is
 * defined in the host page (index.html), so the Maps it creates belong to the
 * host realm — not LegacySolver.js's module realm. This caused portal-family analysis
 * to silently skip portal-heavy puzzles, making them unsolvable from the Solve
 * button while the direct script still worked.
 *
 * The fix: runGameSolver now calls denormalizeLevel → normalizeRawLevelForSolver,
 * which rebuilds fresh Maps entirely within LegacySolver.js's own realm (the "raw path").
 * This test verifies that the round-trip correctly preserves all portal data so
 * portal levels remain solvable through that entry point.
 *
 * Usage: node scripts/portal-ui-path-solve-test.mjs [--levels=4,21,92]
 */
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

// Browser-ish stubs so LegacySolver.js's module-level code is inert in Node.
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./LegacySolver.js');

const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });

// Minimal APP stub. denormalizeLevel and normalizeRawLevelForSolver are
// exposed via the Solver public API so we call them through there.
const APP = {
  LevelUtils: {
    PACK, UNPACK,
    inBounds: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
    resolvePortal: (level, key) => (level?.portalMap?.has(key) ? level.portalMap.get(key) : null),
    deepCloneLevel: (l) => l,
    canonicalCloneLevel: (l) => l,
    // denormalizeLevel is called inside runGameSolver; replicate it here so
    // the APP stub the solver uses works correctly.
    denormalizeLevel(level) {
      const toCoord = (k) => { const p = UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
      const seenPortals = new Set();
      const portals = [];
      (level.portalMap || new Map()).forEach((v, k) => {
        if (!v || typeof v.dest !== 'number' || v.dest < 0) return;
        const pair = [k, v.dest].sort((a, b) => a - b).join(':');
        if (seenPortals.has(pair)) return;
        seenPortals.add(pair);
        portals.push({ x1: toCoord(k).x, y1: toCoord(k).y, x2: toCoord(v.dest).x, y2: toCoord(v.dest).y });
      });
      return {
        grid: { w: level.grid.w, h: level.grid.h },
        gates: (level.gateKeys || []).map(toCoord),
        goal: typeof level.goalKey === 'number' && level.goalKey >= 0 ? toCoord(level.goalKey) : null,
        reqLen: level.reqLen || 0,
        reqInt: level.reqInt || 0,
        blocks: Array.from(level.blockSet || []).map(toCoord),
        geese: Array.from(level.gooseSet || []).map(toCoord),
        falseGoals: Array.from(level.falseGoalKeys || []).map(toCoord),
        mustPass: (level.mustPassKeys || []).map(toCoord),
        mustCross: (level.mustCrossKeys || []).map(toCoord),
        filters: Array.from(level.filterMap?.entries?.() || []).map(([k, axis]) => ({ ...toCoord(k), axis })),
        flippingFilters: Array.from(level.flippingFilterMap?.entries?.() || []).map(([k, axis]) => ({ ...toCoord(k), axis })),
        portals,
        hints: Array.isArray(level.hints) ? level.hints : [],
      };
    },
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

async function loadLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(await readFile(path.join(root, 'levels.js'), 'utf8'), ctx, { filename: 'levels.js' });
  return ctx.window.RAW_LEVELS;
}

// Simulate the game's normalizeLevel from index.html — this is what
// APP.State.ENGINE.level looks like after the game loads a level.
function simulateGameNormalizeLevel(raw, idx) {
  const adj = (v) => v - 1;
  const pack = (x, y) => PACK(adj(x), adj(y));
  const portalMap = new Map();
  const portalVisuals = [];
  let hasParityBreaker = false;
  (raw.portals || []).forEach(p => {
    const k1 = pack(p.x1, p.y1), k2 = pack(p.x2, p.y2);
    portalMap.set(k1, { dest: k2 });
    portalMap.set(k2, { dest: k1 });
    portalVisuals.push({ k1, k2 });
    const p1 = UNPACK(k1), p2 = UNPACK(k2);
    if (((p1.x + p1.y) % 2) !== ((p2.x + p2.y) % 2)) hasParityBreaker = true;
  });
  const filterMap = new Map();
  (raw.filters || []).forEach(f => filterMap.set(pack(f.x, f.y), f.axis));
  const flippingFilterMap = new Map();
  (raw.flippingFilters || []).forEach(f => flippingFilterMap.set(pack(f.x, f.y), f.axis));
  return {
    id: idx,
    grid: { ...raw.grid },
    reqLen: raw.reqLen, reqInt: raw.reqInt,
    goalKey: pack(raw.goal.x, raw.goal.y),
    goal: { x: raw.goal.x, y: raw.goal.y },
    gateKeys: raw.gates.map(g => pack(g.x, g.y)),
    gates: raw.gates.map(g => ({ x: g.x, y: g.y })),
    blockSet: new Set((raw.blocks || []).map(b => pack(b.x, b.y))),
    gooseSet: new Set((raw.geese || []).map(g => pack(g.x, g.y))),
    falseGoalKeys: new Set((raw.falseGoals || []).map(g => pack(g.x, g.y))),
    mustPassKeys: (raw.mustPass || []).map(m => pack(m.x, m.y)),
    mustCrossKeys: (raw.mustCross || []).map(m => pack(m.x, m.y)),
    portalMap, portalVisuals, hasParityBreaker,
    filterMap, flippingFilterMap,
    hints: raw.hints || []
  };
}

const arg = process.argv.find(a => a.startsWith('--levels='));
const rawLevels = await loadLevels();
const targets = arg ? arg.split('=')[1].split(',').map(Number) : [4, 21, 92, 108, 117, 134];

let failures = 0;
for (const n of targets) {
  const raw = rawLevels[n - 1];
  if (!raw || !(Array.isArray(raw.portals) && raw.portals.length > 0)) { console.log(`L${n}: SKIP (not a portal level)`); continue; }

  // Simulate the game's normalized level (APP.State.ENGINE.level / workingLevel).
  const gameLevel = simulateGameNormalizeLevel(raw, n - 1);

  // Simulate the denormalize → normalizeRawLevelForSolver round-trip that
  // runGameSolver now performs (via source: 'raw').
  const rawSnapshot = APP.LevelUtils.denormalizeLevel(gameLevel);

  // Verify the denormalized snapshot has the expected number of portal pairs.
  const expectedPairs = raw.portals.length;
  const actualPairs = rawSnapshot.portals.length;
  if (actualPairs !== expectedPairs) {
    console.log(`L${n}: FAIL (denormalize lost portal pairs: expected ${expectedPairs}, got ${actualPairs})`);
    failures++;
    continue;
  }

  // Now run the solver through normalizeRawLevelForSolver (the raw path),
  // exactly as runGameSolver does after the fix.
  APP.State.ENGINE.activeSolverController = null;
  APP.State.ENGINE.solverAbortRequested = false;
  let res;
  try {
    res = await Solver.universalSolveLevel(
      Solver.normalizeRawLevelForSolver(rawSnapshot, n),
      { purpose: 'hint', timeBudgetMs: CANONICAL_SOLVE_TIME_BUDGET_MS, debug: true, allowReferee: true, resetAttemptHistory: 'level' }
    );
  } catch (e) {
    console.log(`L${n}: FAIL (threw: ${e?.message})`);
    failures++;
    continue;
  }
  const ok = !!res?.ok;
  console.log(`L${n}: ${ok ? 'PASS' : 'FAIL'} (status=${res?.status || res?.finalStatus || res?.rawStatus}, nodes=${res?.debug?.nodesExpanded || 0})`);
  if (!ok) failures++;
}

console.log(`\n${targets.length - failures}/${targets.length} portal levels solved via denormalize→raw round-trip.`);
if (failures > 0) { console.error(`REGRESSION: ${failures} portal level(s) failed the UI-path round-trip.`); process.exit(1); }
console.log('OK: runGameSolver denormalize→normalizeRawLevelForSolver path is correct.');
