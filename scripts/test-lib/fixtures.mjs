// Shared test fixtures/factories (modernization-plan §6 Phase 3). These centralize the small
// amount of setup that genuinely recurs across the domain/solver/app suites. Suite-specific
// fakes (e.g. a particular Firebase client shape) stay local to that suite — the goal is to
// remove *repeated* ad hoc setup, not to force a single mega-fixture.

/**
 * A minimal, valid raw (wire-format, 1-indexed) level. Spread `overrides` to customize.
 * Produces a level `normalizeRawLevel` / `parseRawLevel` accept: a straight corridor on a
 * `w×h` grid with one gate (top-left) and goal at the far cell, length/intersection targets set.
 *
 * @param {Partial<{ grid: { w: number, h: number }, gates: {x:number,y:number}[],
 *   goal: {x:number,y:number}, reqLen: number, reqInt: number,
 *   blocks: any[], geese: any[], falseGoals: any[], mustPass: any[], mustCross: any[],
 *   filters: any[], flippingFilters: any[], portals: any[], landmarks: any[], hints: number[][] }>} [overrides]
 * @returns {object}
 */
export function makeRawLevel(overrides = {}) {
  const grid = overrides.grid || { w: 5, h: 1 };
  return {
    grid,
    gates: [{ x: 1, y: 1 }],
    goal: { x: grid.w, y: 1 },
    reqLen: grid.w - 1,
    reqInt: 0,
    blocks: [],
    geese: [],
    falseGoals: [],
    mustPass: [],
    mustCross: [],
    filters: [],
    flippingFilters: [],
    portals: [],
    landmarks: [],
    hints: [],
    ...overrides,
  };
}

/**
 * A deterministic, injectable timer scheduler for controllers that take a `scheduleTimer` dep
 * (hazard-controller, level-flow, …). Captures scheduled callbacks instead of using real timers
 * so tests can advance them explicitly.
 *
 * @returns {{ scheduleTimer: (id: any, ms: number, fn: () => void) => any,
 *   pending: () => { id: any, ms: number, fn: () => void }[], runAll: () => number,
 *   runId: (id: any) => number, clear: () => void }}
 */
export function createFakeScheduler() {
  /** @type {{ id: any, ms: number, fn: () => void }[]} */
  let timers = [];
  return {
    scheduleTimer(id, ms, fn) {
      timers.push({ id, ms, fn });
      return id;
    },
    pending() {
      return timers.slice();
    },
    runAll() {
      const due = timers;
      timers = [];
      for (const t of due) t.fn();
      return due.length;
    },
    runId(id) {
      const due = timers.filter((t) => t.id === id);
      timers = timers.filter((t) => t.id !== id);
      for (const t of due) t.fn();
      return due.length;
    },
    clear() {
      timers = [];
    },
  };
}

/**
 * One deliberately over-specified solver Attempt.  Keep this in lockstep with orchestration.ts's
 * Attempt interface: projection tests use its own keys as a tripwire when a new field is added.
 * The error outcome is intentional; provenance tests turn the same record into a successful win.
 */
export const MAXIMALLY_POPULATED_SOLVER_ATTEMPT = Object.freeze({
  gateKey: 589833,
  profile: 'perimeterSweep',
  template: 'perimeterCW',
  beamWidth: 2000,
  ok: false,
  elapsedMs: 321,
  allocatedBudgetMs: 8000,
  outcome: 'error',
  error: Object.freeze({
    name: 'TypeError', message: 'fixture dispatch failure', gateKey: 589833,
    configKey: 'beam:perimeterSweep/perimeterCW@beam2000(diverse)',
    profile: 'perimeterSweep', template: 'perimeterCW',
  }),
  passNumber: 3,
  configKey: 'beam:perimeterSweep/perimeterCW@beam2000(diverse)',
  restart: true,
  schedulerPhase: 'portfolio',
  diverseBeam: true,
  repair: true,
  repairMustTurnBiased: true,
  repairTurnBiased: true,
  seedSalt: 7,
  randomSeed: 4272716209,
  nodesExpanded: 4567,
  timedOut: true,
  bestBadness: 4,
  finalBadness: 6,
  attractionDiversity: true,
  admissibleOrder: true,
  admissibleOrderNoTieBreak: true,
  admissibleOrderLds: true,
  mainLoopLateReserve: true,
  repairProbe: true,
  dedupNearTieRetry: true,
  admissibleOrderNonDefaultRetry: true,
  connectivityAxisExhaustedRetry: true,
  mcNeighborBudgetRetry: true,
  repairElitePrefixDfsRetry: true,
  repairLateProbe: true,
});
