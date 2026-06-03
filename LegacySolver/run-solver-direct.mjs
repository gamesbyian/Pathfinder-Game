#!/usr/bin/env node
/**
 * Direct Node-based solver driver. No Playwright, no browser. Loads Solver.js
 * via installSolver(APP) with a minimal Node shim, normalizes levels from
 * levels.js, then calls Solver.solveLevel(level, opts) for each
 * target level and writes per-level JSON results.
 *
 * Usage:
 *   node scripts/run-solver-direct.mjs --levels=92
 *   node scripts/run-solver-direct.mjs --levels=92,108,134
 *   node scripts/run-solver-direct.mjs --levels=90-95
 *   node scripts/run-solver-direct.mjs --levels=all
 *   node scripts/run-solver-direct.mjs --levels=92 --budget-ms=180000
 *   node scripts/run-solver-direct.mjs --levels=92 --forbidden-first-moves=393216
 *   node scripts/run-solver-direct.mjs --levels=92 --ordering-policy=objectiveFirst
 *
 * Output (default audits/local-direct/latest.json):
 *   {
 *     timestamp, commitSha, levelFilter, budgetMs,
 *     options: { ...optionsPassedToSolver },
 *     levels: [
 *       {
 *         level: 92,
 *         status: 'timeout',
 *         ok: false,
 *         elapsedMs: 31204,
 *         debug: { /* full debugStats including forbiddenFirstMovesOptionLength etc *\/ },
 *         attempts: [...],
 *         solution: null | [...]
 *       },
 *       ...
 *     ]
 *   }
 *
 * History: also writes audits/local-direct/history/{stamp}-{sha}-{tag}.json
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// --- CLI args ---
const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.split('=');
      return [k, rest.join('=') ?? ''];
    })
);
const argFlags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));

if (argFlags.has('--help') || argFlags.has('-h')) {
  console.log(`Usage:
  node scripts/run-solver-direct.mjs [options]

Solver options (all forwarded into Solver.solveLevel):
  --levels=SPEC                Levels to audit. Same SPEC formats as
                                 run-level-audit.mjs (single, csv, range, all).
                                 Default: all.
  --budget-ms=N                Time budget per solve (default: 180000).
  --purpose=PURPOSE            'hint' (only supported value; kept for compatibility).
  --forbidden-first-moves=LIST Cell keys (comma-separated) to forbid at depth 0.
                                 Useful for forcing different first moves on
                                 L92-style levels.
  --ordering-policy=POLICY     Override scoring archetype. Values:
                                 harvestThenFinish, objectiveFirst, knotBuilder,
                                 portalFirstTransfer, portalCommitted,
                                 perimeterSweep, finishFirst, mustCrossFirst,
                                 lengthHarvest, endurance, etc.
  --dir-order-variant=VARIANT  'default', 'alt', or 'random'.
  --root-tie-seed-offset=N     Integer offset added to root-tiebreak seed.
  --root-ordering-variant=NAME 'objective-first-bias', 'knot-first-bias',
                                 'portal-first-bias', etc.

Output options:
  --output=PATH                Output JSON (default: audits/local-direct/latest.json).
  --verbose                    Print per-attempt details.
  --no-history                 Skip writing the history copy.
  --help, -h                   This message.

Examples:
  node scripts/run-solver-direct.mjs --levels=92 --verbose
  node scripts/run-solver-direct.mjs --levels=92 --forbidden-first-moves=393216
  node scripts/run-solver-direct.mjs --levels=1,2,3
  node scripts/run-solver-direct.mjs --levels=90-95 --budget-ms=60000
`);
  process.exit(0);
}

const parseLevelSpec = (spec) => {
  if (!spec || spec === 'all') return null;
  const set = new Set();
  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [from, to] = trimmed.split('-').map((v) => Number(v.trim()));
      if (Number.isFinite(from) && Number.isFinite(to)) {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        for (let i = lo; i <= hi; i++) set.add(i);
      }
    } else {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
  }
  return set.size > 0 ? set : null;
};

const parseNumberList = (raw) => {
  if (!raw) return null;
  return raw.split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n));
};

const formatLevelTag = (levelSet) => {
  if (!levelSet) return 'all';
  const levels = [...levelSet].sort((a, b) => a - b);
  if (levels.length === 0) return 'none';

  const segments = [];
  let start = levels[0];
  let prev = levels[0];
  for (let i = 1; i < levels.length; i++) {
    const n = levels[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    segments.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  segments.push(start === prev ? `${start}` : `${start}-${prev}`);

  const compact = `L${segments.join('_')}`;
  if (compact.length <= 96) return compact;

  const digest = createHash('sha1').update(levels.join(',')).digest('hex').slice(0, 12);
  return `L${levels[0]}-${levels[levels.length - 1]}_n${levels.length}_${digest}`;
};

const levelFilter = parseLevelSpec(argMap.get('--levels'));
// Default budget is resolved after Solver.js is imported (see CANONICAL_SOLVE_TIME_BUDGET_MS
// below) so the audit harness and the UI Solve button share one source of truth.
const budgetMsArg = argMap.get('--budget-ms');
const purpose = argMap.get('--purpose') || 'hint';
const forbiddenFirstMoves = parseNumberList(argMap.get('--forbidden-first-moves'));
const orderingPolicy = argMap.get('--ordering-policy') || null;
const dirOrderVariant = argMap.get('--dir-order-variant') || null;
const rootTieSeedOffset = (() => {
  const v = argMap.get('--root-tie-seed-offset');
  return v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null;
})();
const rootOrderingVariant = argMap.get('--root-ordering-variant') || null;
const outputFile = argMap.get('--output') || 'audits/local-direct/latest.json';
const verbose = argFlags.has('--verbose');
const writeHistory = !argFlags.has('--no-history');

// --- Browser stub before loading Solver.js ---
// Solver.js installs a module-level setTimeout for auto-diagnostics. Stub
// window to disable that path; otherwise it tries to access browser APIs.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true
  };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener() {},
    getElementById: () => null,
    createElement: () => ({ classList: { add() {}, remove() {} }, style: {} })
  };
}
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./legacysolver.js');

// Default per-stage budget shared with the UI Solve path (Solver.js runGameSolver).
const budgetMs = Number(budgetMsArg || CANONICAL_SOLVE_TIME_BUDGET_MS);

// --- APP shim (extends hint-path-replay's shim with solveLevel needs) ---
const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });

const APP = {
  LevelUtils: {
    PACK,
    UNPACK,
    inBounds: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
    // Move legality (isValidMove) and movement-axis constants live in the solver
    // core now, not the host, so a solve run is identical regardless of caller.
    // Intentionally NOT stubbed here — the solver no longer reads them.
    resolvePortal: (level, key) => level?.portalMap?.get(key) || null,
    deepCloneLevel: (l) => l,
    canonicalCloneLevel: (l) => l,
    normalizeLevel: () => {
      throw new Error('normalizeLevel is not available in Node harness; pass pre-normalized levels');
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
  Data: {
    getLevels: () => [],
  },
  State: {
    ENGINE: {
      flags: {},
      isDevMode: false,
      activeSolverController: null,
      solverAbortRequested: false,
      runtime: {},
      ui: {}
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
  const windowCtx = {};
  const ctx = vm.createContext({ window: windowCtx });
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

const getCommitSha = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

// --- Main ---
const rawLevels = await loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels.`);

const levelNumbers = levelFilter
  ? [...levelFilter].filter((n) => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
  : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`Target: ${levelNumbers.length} level(s): ${levelNumbers.length <= 20 ? levelNumbers.join(',') : `${levelNumbers.slice(0, 8).join(',')}...,${levelNumbers.slice(-2).join(',')}`}`);

const buildSolveOpts = () => {
  const opts = {
    purpose,
    timeBudgetMs: budgetMs,
    debug: true,
    allowReferee: true,
  };
  if (forbiddenFirstMoves) opts.forbiddenFirstMoves = forbiddenFirstMoves.slice();
  if (orderingPolicy) opts.orderingPolicy = orderingPolicy;
  if (dirOrderVariant) opts.dirOrderVariant = dirOrderVariant;
  if (rootTieSeedOffset !== null) opts.rootTieSeedOffset = rootTieSeedOffset;
  if (rootOrderingVariant) opts.rootOrderingVariant = rootOrderingVariant;
  // The per-stage cascade hard-codes orderingPolicy/dirOrderVariant and never forwards
  // the root-seed knobs, so the bare opts above only reach telemetry, not the search.
  // experimentOverrides is the channel the solver actually honors (Solver.js
  // installExperimentOverrides): a solve-scoped override that reaches every attempt.
  const experimentOverrides = {};
  if (orderingPolicy) experimentOverrides.orderingPolicy = orderingPolicy;
  if (dirOrderVariant) experimentOverrides.dirOrderVariant = dirOrderVariant;
  if (rootTieSeedOffset !== null) experimentOverrides.rootTieSeedOffset = rootTieSeedOffset;
  if (rootOrderingVariant) experimentOverrides.rootOrderingVariant = rootOrderingVariant;
  if (Object.keys(experimentOverrides).length) opts.experimentOverrides = experimentOverrides;
  // Mirror the browser hint-ladder by also piggybacking forbiddenFirstMoves on
  // hintLadderState. The runAttempt closure (Solver.js:11987) prefers
  // hintLadderState.forbiddenFirstMoves over opts.forbiddenFirstMoves, and
  // hintLadderState is propagated through every cascade pass (the direct opts
  // entry only reaches stage 0). This gives the option a path to every inner
  // solve including recovery/rescue stages.
  if (forbiddenFirstMoves) {
    opts.hintLadderState = {
      recentTimeoutAttempts: [],
      queuedAttemptSignatureHashes: [],
      recentOutcomeTrajectoryHashes: [],
      forceFamilySwitchNextAttempt: false,
      forcedFamilySwitchReason: null,
      retryFingerprintDupes: 0,
      forbiddenFirstMoves: forbiddenFirstMoves.slice()
    };
  }
  return opts;
};

const solveOpts = buildSolveOpts();
console.log('Solver options:', JSON.stringify({
  purpose: solveOpts.purpose,
  timeBudgetMs: solveOpts.timeBudgetMs,
  forbiddenFirstMoves: solveOpts.forbiddenFirstMoves || null,
  orderingPolicy: solveOpts.orderingPolicy || null,
  dirOrderVariant: solveOpts.dirOrderVariant || null,
  rootTieSeedOffset: solveOpts.rootTieSeedOffset ?? null,
  rootOrderingVariant: solveOpts.rootOrderingVariant || null
}));

const levelResults = [];
let solvedCount = 0;
let failureCount = 0;
let errorCount = 0;

const runStart = Date.now();
for (const levelNumber of levelNumbers) {
  const raw = rawLevels[levelNumber - 1];
  if (!raw) {
    levelResults.push({ level: levelNumber, status: 'error', error: 'no-raw-level' });
    errorCount++;
    continue;
  }

  let level;
  try {
    level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
  } catch (normErr) {
    levelResults.push({ level: levelNumber, status: 'error', error: `normalize: ${normErr?.message}` });
    errorCount++;
    continue;
  }

  const levelStart = Date.now();
  let result;
  try {
    // solveLevel uses APP.State.ENGINE.activeSolverController; reset it per call.
    APP.State.ENGINE.activeSolverController = null;
    APP.State.ENGINE.solverAbortRequested = false;
    result = await Solver.universalSolveLevel(level, {
      ...solveOpts,
      resetAttemptHistory: 'level'
    });
  } catch (solveErr) {
    levelResults.push({
      level: levelNumber,
      status: 'error',
      error: `solveLevel: ${solveErr?.message}`,
      errorStack: solveErr?.stack || null,
      elapsedMs: Date.now() - levelStart
    });
    errorCount++;
    console.log(`  L${levelNumber}: ERROR — ${solveErr?.message}`);
    continue;
  }
  const elapsedMs = Date.now() - levelStart;

  const status = result?.status || (result?.ok ? 'success' : 'unknown');
  const ok = !!result?.ok;
  const debug = result?.debug || result?.stats?.debug || {};
  const attemptsRaw = Array.isArray(result?.attempts) ? result.attempts : [];

  // Trim debug to a serializable subset. The full debug contains large maps
  // / typed arrays / function references; the audit fields are what matter.
  const clipArray = (arr, max = 64) => {
    if (!Array.isArray(arr)) return arr;
    return arr.length > max ? arr.slice(0, max) : arr;
  };
  const serializeDebug = (d) => {
    if (!d || typeof d !== 'object') return null;
    const out = {};
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'function') continue;
      if (v instanceof Map || v instanceof Set) continue;
      if (ArrayBuffer.isView(v)) continue;
      if (typeof v === 'bigint') continue;
      if (typeof v === 'object' && v !== null) {
        // Shallow copy primitives only
        if (Array.isArray(v)) {
          const filtered = v.filter((x) => x === null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean' || (typeof x === 'object' && !Array.isArray(x) && !ArrayBuffer.isView(x) && !(x instanceof Map) && !(x instanceof Set)));
          out[k] = clipArray(filtered, 80);
        } else {
          try {
            JSON.stringify(v);
            out[k] = v;
          } catch {
            out[k] = `[unserializable:${k}]`;
          }
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const debugSerialized = serializeDebug(debug);
  const attemptHistory = Array.isArray(debug?.attemptHistory) ? debug.attemptHistory : [];
  const attemptHistoryTail = attemptHistory.slice(-8).map((a) => ({
    label: a?.label || null,
    status: a?.status || null,
    elapsedMs: Number.isFinite(a?.elapsedMs) ? a.elapsedMs : null,
    depthReached: Number.isFinite(a?.depthReached) ? a.depthReached : null,
    nextAttemptReason: a?.nextAttemptReason || null,
    trajectorySimilarity: Number.isFinite(a?.trajectorySimilarity) ? a.trajectorySimilarity : null,
    trajectorySimilarityPenalty: Number.isFinite(a?.trajectorySimilarityPenalty) ? a.trajectorySimilarityPenalty : null,
    trajectoryTabooHits: Number.isFinite(a?.trajectoryTabooHits) ? a.trajectoryTabooHits : null,
    revisitWithPerturbationTriggered: a?.revisitWithPerturbationTriggered === true ? true : null
  }));
  const attemptsSerialized = attemptsRaw.map((a) => {
    if (!a || typeof a !== 'object') return null;
    try {
      return JSON.parse(JSON.stringify(a, (k, v) => {
        if (typeof v === 'function') return undefined;
        if (typeof v === 'bigint') return v.toString();
        if (v instanceof Map || v instanceof Set) return undefined;
        if (ArrayBuffer.isView(v)) return undefined;
        return v;
      }));
    } catch {
      return { label: a.label, status: a.status, depthReached: a.depthReached };
    }
  }).filter(Boolean);

  if (ok) solvedCount++;
  else failureCount++;

  const entry = {
    level: levelNumber,
    status,
    ok,
    elapsedMs,
    nodesExpanded: debug?.nodesExpanded || 0,
    maxDepth: debug?.maxDepth || 0,
    // surface the key diagnostic fields directly for easy inspection
    forbiddenFirstMovesOptionLength: debug?.forbiddenFirstMovesOptionLength ?? null,
    forbiddenFirstMovesSuppressions: debug?.forbiddenFirstMovesSuppressions ?? null,
    forbiddenFirstMovesFallbackEmpty: debug?.forbiddenFirstMovesFallbackEmpty ?? null,
    effectiveOrderingPolicy: debug?.effectiveOrderingPolicy ?? null,
    effectiveRootOrderingVariant: debug?.effectiveRootOrderingVariant ?? null,
    effectiveDirOrderVariant: debug?.effectiveDirOrderVariant ?? null,
    unifiedHKBoundMaxObserved: debug?.unifiedHKBoundMaxObserved ?? null,
    unifiedHKBoundComputed: debug?.unifiedHKBoundComputed ?? null,
    endgameIDAStarTriggered: debug?.endgameIDAStarTriggered === true ? true : null,
    endgameIDAStarBestObservedDepth: debug?.endgameIDAStarBestObservedDepth ?? null,
    endgameIDAStarBestObservedBound: debug?.endgameIDAStarBestObservedBound ?? null,
    endgameIDAStarBestObservedPathPrefix: Array.isArray(debug?.endgameIDAStarBestObservedPathPrefix)
      ? debug.endgameIDAStarBestObservedPathPrefix.slice(0, 16)
      : null,
    attemptHistoryCount: attemptHistory.length,
    attemptHistoryTail,
    debug: debugSerialized,
    attempts: attemptsSerialized,
    solution: ok && Array.isArray(result?.solution) ? result.solution.slice(0, 1) : null
  };
  levelResults.push(entry);

  const briefForbidden = forbiddenFirstMoves ? `[${forbiddenFirstMoves.join(',')}]` : 'none';
  console.log(`  L${levelNumber}: ${status} (${elapsedMs}ms, nodes=${entry.nodesExpanded}, maxDepth=${entry.maxDepth}, fpOpt=${entry.forbiddenFirstMovesOptionLength}, fpSuppr=${entry.forbiddenFirstMovesSuppressions}, orderingPolicy=${entry.effectiveOrderingPolicy}, forbidden=${briefForbidden})`);
  if (verbose && attemptsSerialized.length > 0) {
    for (const a of attemptsSerialized) {
      console.log(`     attempt ${a.label || '?'}: status=${a.status} depth=${a.depthReached} fpOpt=${a.forbiddenFirstMovesOptionLength ?? 'n/a'}`);
    }
  }
}

// --- Write JSON output ---
const meta = {
  commitSha: getCommitSha(),
  timestamp: new Date().toISOString(),
  levelFilter: levelFilter ? [...levelFilter].sort((a, b) => a - b) : 'all',
  budgetMs,
  totalElapsedMs: Date.now() - runStart,
  runner: 'scripts/run-solver-direct.mjs'
};
const summary = {
  ...meta,
  options: solveOpts,
  levelCount: levelNumbers.length,
  solvedCount,
  failureCount,
  errorCount,
  levels: levelResults
};

const outputPath = path.resolve(process.cwd(), outputFile);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`\nWrote ${path.relative(process.cwd(), outputPath)}`);

if (writeHistory) {
  const historyDir = path.join(path.dirname(outputPath), 'history');
  await mkdir(historyDir, { recursive: true });
  const stamp = utcStamp();
  const shortSha = `${meta.commitSha || 'local'}`.slice(0, 12);
  const tag = formatLevelTag(levelFilter);
  const historyPath = path.join(historyDir, `${stamp}-${shortSha}-${tag}.json`);
  await writeFile(historyPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`History ${path.relative(process.cwd(), historyPath)}`);
}

console.log(`\nSummary: ${solvedCount} solved, ${failureCount} failed, ${errorCount} errored (${levelNumbers.length} attempted, ${Math.round((Date.now() - runStart) / 1000)}s total)`);
process.exit(errorCount > 0 ? 1 : 0);
