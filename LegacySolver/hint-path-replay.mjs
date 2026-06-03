#!/usr/bin/env node
/**
 * Hint-Path Replay Harness (Node-native version)
 *
 * Drives APP.Solver.replayHintPath for each level's first hint path. The replay
 * uses the production solver's level-init code and the same bound estimators
 * the search consults, then walks the hint path step-by-step and reports per
 * step the lower-bound components and whether any hard prune would fire.
 *
 * Two purposes:
 *
 *   1. Regression-safe-engineering gate: no hard prune may fire on a hint-path
 *      prefix. Non-zero exit code if any prune fires anywhere.
 *
 *   2. Heuristic-quality diagnostic: per-step bound trace feeds offline
 *      analysis tooling for plateau / sign-inversion bug investigation.
 *
 * Usage:
 *   node scripts/hint-path-replay.mjs [--levels=92,108,134] [--output=path.json] [--verbose]
 *
 * Exit code: 0 = no prune fires, 1 = at least one prune fire (regression risk).
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

// Solver.js references `window` for runtime feature flags (auto-diagnostic timer
// etc.). Provide a stub before import so the module-level setTimeout doesn't
// crash. We disable auto-diagnostics; the replay path doesn't need them.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
}

const { installSolver } = await import('./legacysolver.js');

// --- CLI args ---
const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.split('=');
      return [k, v ?? ''];
    })
);
const verbose = argMap.has('--verbose');
const outputFile = argMap.get('--output') || 'audits/hint-path-replay/latest.json';
const filterLevels = (() => {
  const raw = argMap.get('--levels');
  if (!raw) return null;
  return new Set(raw.split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n) && n > 0));
})();

// --- Minimal APP shim ---
const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });
const APP = {
  LevelUtils: {
    PACK,
    UNPACK,
    inBounds: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
    // Move legality and axis constants live in the solver core, not the host.
    resolvePortal: (level, key) => level?.portalMap?.get(key) || null,
    deepCloneLevel: (l) => l, // not invoked on replay path
    normalizeLevel: () => {
      throw new Error('normalizeLevel is not available in the Node harness; pass pre-normalized levels');
    },
    getRawLevels: () => []
  },
  Core: {
    PLAY: 'play',
    EDITOR: 'editor',
    HINT_ANIMATING: 'hint-animating',
    SOLVER_RUNNING: 'solver-running',
    OVERLAY_NONE: 'overlay-none'
  },
  State: {
    ENGINE: {
      flags: {},
      isDevMode: false,
      activeSolverController: null,
      solverAbortRequested: false
    }
  },
  UI: {
    showMessage() {},
    setModalContent() {},
    setSolverTimerText() {},
    setButtonState() {},
    setSolverDetailText() {},
    setSolverProgress() {}
  },
  Engine: {
    setOverlayState() {},
    areWinMetricsSatisfied: () => true
  },
  Editor: {
    setWorkingLevelHintsFromSolutions() {}
  },
  Debug: {
    register() {}
  }
};

const Solver = installSolver(APP);

// --- Load levels from levels.js ---
async function loadAllLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const window = {};
  const ctx = vm.createContext({ window });
  const file = 'levels.js';
  const filePath = path.join(root, file);
  if (!existsSync(filePath)) throw new Error('levels.js not found');
  const src = await readFile(filePath, 'utf8');
  vm.runInContext(src, ctx, { filename: file });
  const levels = ctx.window.RAW_LEVELS;
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error('Failed to load RAW_LEVELS from levels.js');
  }
  return levels;
}

// --- Normalize a raw level into the shape Solver.js expects ---
// Mirrors index.html's normalizeLevel: 1-indexed coords → 0-indexed packed keys.
function normalizeRaw(raw) {
  const adj = (v) => v - 1;
  const pack = (x, y) => PACK(adj(x), adj(y));

  const portalMap = new Map();
  const portalVisuals = [];
  for (const p of raw.portals || []) {
    const k1 = pack(p.x1, p.y1);
    const k2 = pack(p.x2, p.y2);
    const color = p.color || '#d946ef';
    portalMap.set(k1, { dest: k2, color });
    portalMap.set(k2, { dest: k1, color });
    portalVisuals.push({ k1, k2, color });
  }
  const flippingFilterMap = new Map();
  for (const f of raw.flippingFilters || []) flippingFilterMap.set(pack(f.x, f.y), f.axis || APP.Core.H);
  const filterMap = new Map();
  for (const f of raw.filters || []) filterMap.set(pack(f.x, f.y), f.axis || APP.Core.H);

  return {
    grid: raw.grid,
    reqLen: raw.reqLen || 0,
    reqInt: raw.reqInt || 0,
    goalKey: pack(raw.goal.x, raw.goal.y),
    gates: (raw.gates || []).map((g) => ({ x: g.x, y: g.y })),
    gateKeys: (raw.gates || []).map((g) => pack(g.x, g.y)),
    goal: { x: raw.goal.x, y: raw.goal.y },
    blockSet: new Set((raw.blocks || []).map((b) => pack(b.x, b.y))),
    mustPassKeys: (raw.mustPass || []).map((m) => pack(m.x, m.y)),
    mustCrossKeys: (raw.mustCross || []).map((m) => pack(m.x, m.y)),
    falseGoalKeys: new Set((raw.falseGoals || []).map((f) => pack(f.x, f.y))),
    gooseSet: new Set((raw.geese || []).map((g) => pack(g.x, g.y))),
    portalMap,
    portalVisuals,
    flippingFilterMap,
    filterMap
  };
}

// --- Main ---
const rawLevels = await loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels.`);

const levelNumbers = filterLevels
  ? [...filterLevels].filter((n) => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
  : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

const results = [];
const firePerLevel = {};
let pruneFireCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const levelNumber of levelNumbers) {
  const raw = rawLevels[levelNumber - 1];
  if (!raw) {
    results.push({ levelNumber, skipped: 'no-raw-level' });
    skippedCount++;
    continue;
  }
  if (!Array.isArray(raw.hints) || raw.hints.length === 0) {
    results.push({ levelNumber, skipped: 'no-hints' });
    skippedCount++;
    if (verbose) console.log(`  L${levelNumber}: skipped (no-hints)`);
    continue;
  }
  const hintPath = raw.hints[0];
  if (!Array.isArray(hintPath) || hintPath.length < 2) {
    results.push({ levelNumber, skipped: 'hint-too-short' });
    skippedCount++;
    continue;
  }

  let level;
  try {
    level = normalizeRaw(raw);
    level.id = levelNumber - 1;
    // Build solverProfile for portal-hint structure (provablyMandatoryFamilies etc.).
    try {
      level.solverProfile = Solver.Referee.normalizeSolverProfile(Solver.Referee.buildLevelProfile(level));
    } catch (profileErr) {
      results.push({
        levelNumber,
        error: { phase: 'profile-build', message: String(profileErr?.message || profileErr) }
      });
      errorCount++;
      console.error(`  L${levelNumber}: profile-build ERROR — ${profileErr?.message || profileErr}`);
      continue;
    }
  } catch (normErr) {
    results.push({ levelNumber, error: { phase: 'normalize', message: String(normErr?.message || normErr) } });
    errorCount++;
    console.error(`  L${levelNumber}: normalize ERROR — ${normErr?.message || normErr}`);
    continue;
  }

  let replay;
  try {
    replay = await Solver.replayHintPath(level, hintPath);
  } catch (replayErr) {
    results.push({
      levelNumber,
      error: {
        phase: 'replay',
        message: String(replayErr?.message || replayErr),
        stack: replayErr?.stack || null
      }
    });
    errorCount++;
    console.error(`  L${levelNumber}: replay ERROR — ${replayErr?.message || replayErr}`);
    continue;
  }

  const diag = replay?.replayHintPathDiagnostics || null;
  const entry = { levelNumber, status: replay?.status || 'unknown', ok: !!replay?.ok, diagnostics: diag, hintLen: hintPath.length };
  results.push(entry);

  if (diag?.anyHardPruneFiresOnPath) {
    pruneFireCount++;
    firePerLevel[levelNumber] = { firstPruneStep: diag.firstPruneStep, summary: diag.summary };
    const fp = diag.firstPruneStep || {};
    const fires = Object.entries(fp.pruneFires || {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    console.log(
      `  L${levelNumber}: PRUNE FIRE at step ${fp.i} (depth=${fp.stepDepth}, rSteps=${fp.rSteps})` +
        ` — prunes: [${fires}], bounds:` +
        ` goal=${fp.bounds?.goalDist} must=${fp.bounds?.mustBound} cross=${fp.bounds?.crossBound} portal=${fp.bounds?.portalBound}`
    );
  } else if (verbose && diag) {
    const s = diag.summary || {};
    console.log(
      `  L${levelNumber}: ok, ${s.stepCount} steps (${s.portalJumpsSoFar} portal jumps)` +
        `, final mp/mc/portal remaining=${s.finalMustPassRemaining}/${s.finalMustCrossRemaining}/${s.finalPortalCoverageRemaining}` +
        `, intersections=${s.finalIntersections}`
    );
  }
}

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      levelsProcessed: levelNumbers.length,
      skippedCount,
      errorCount,
      pruneFireCount,
      firePerLevel,
      results
    },
    null,
    2
  )
);

const cleanCount = levelNumbers.length - pruneFireCount - skippedCount - errorCount;
console.log(
  `\nHint-path replay: ${cleanCount} clean, ${pruneFireCount} prune-fires, ${errorCount} errors, ${skippedCount} skipped (of ${levelNumbers.length} levels)`
);
console.log(`Results written to ${outputFile}`);

if (pruneFireCount > 0 || errorCount > 0) {
  console.error(
    `\nFAIL: ${pruneFireCount} hint path(s) trigger prune-fires${errorCount ? ` (+${errorCount} errors)` : ''}.`
  );
  process.exit(1);
}
