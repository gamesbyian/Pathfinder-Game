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
