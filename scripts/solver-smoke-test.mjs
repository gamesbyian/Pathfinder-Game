import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../Solver.js', import.meta.url), 'utf8');
const helperToken = 'const deriveHeuristicFeatureFlags = (level = {}, context = {}) => {';
const helperStart = html.indexOf(helperToken);
if (helperStart < 0) {
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper in Solver.js');
}

const helperArrowBody = html.indexOf('=> {', helperStart);
const helperOpenBrace = helperArrowBody >= 0 ? helperArrowBody + 3 : -1;
if (helperOpenBrace < 0) {
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper body in Solver.js');
}

let helperDepth = 0;
let helperEnd = -1;
for (let i = helperOpenBrace; i < html.length; i += 1) {
  const ch = html[i];
  if (ch === '{') helperDepth += 1;
  else if (ch === '}') {
    helperDepth -= 1;
    if (helperDepth === 0) { helperEnd = i + 1; break; }
  }
}
if (helperEnd < 0) {
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper end in Solver.js');
}

const compactDefinedToken = 'const compactDefined = (obj = {}) => {';
const compactDefinedStart = html.indexOf(compactDefinedToken);
if (compactDefinedStart < 0) {
  throw new Error('Unable to locate compactDefined helper in Solver.js');
}
const compactDefinedArrowBody = html.indexOf('=> {', compactDefinedStart);
const compactDefinedOpenBrace = compactDefinedArrowBody >= 0 ? compactDefinedArrowBody + 3 : -1;
if (compactDefinedOpenBrace < 0) {
  throw new Error('Unable to locate compactDefined helper body in Solver.js');
}
let compactDefinedDepth = 0;
let compactDefinedEnd = -1;
for (let i = compactDefinedOpenBrace; i < html.length; i += 1) {
  const ch = html[i];
  if (ch === '{') compactDefinedDepth += 1;
  else if (ch === '}') {
    compactDefinedDepth -= 1;
    if (compactDefinedDepth === 0) { compactDefinedEnd = i + 1; break; }
  }
}
if (compactDefinedEnd < 0) {
  throw new Error('Unable to locate compactDefined helper end in Solver.js');
}

const compactDefinedSource = html.slice(compactDefinedStart, compactDefinedEnd) + ';';
const helperSource = html.slice(helperStart, helperEnd) + ';';
const normalizeExecutionToken = 'const normalizeSolverExecutionMode = (modeLike, fallback = \'referee-with-compat-profiles\') => {';
const normalizeExecutionStart = html.indexOf(normalizeExecutionToken);
if (normalizeExecutionStart < 0) {
  throw new Error('Unable to locate normalizeSolverExecutionMode helper in Solver.js');
}
const normalizeExecutionArrowBody = html.indexOf('=> {', normalizeExecutionStart);
const normalizeExecutionOpenBrace = normalizeExecutionArrowBody >= 0 ? normalizeExecutionArrowBody + 3 : -1;
if (normalizeExecutionOpenBrace < 0) {
  throw new Error('Unable to locate normalizeSolverExecutionMode helper body in Solver.js');
}
let normalizeExecutionDepth = 0;
let normalizeExecutionEnd = -1;
for (let i = normalizeExecutionOpenBrace; i < html.length; i += 1) {
  const ch = html[i];
  if (ch === '{') normalizeExecutionDepth += 1;
  else if (ch === '}') {
    normalizeExecutionDepth -= 1;
    if (normalizeExecutionDepth === 0) { normalizeExecutionEnd = i + 1; break; }
  }
}
if (normalizeExecutionEnd < 0) {
  throw new Error('Unable to locate normalizeSolverExecutionMode helper end in Solver.js');
}
const normalizeExecutionSource = html.slice(normalizeExecutionStart, normalizeExecutionEnd) + ';';
const startToken = 'const solveLevel = async (level, opts = {}) => {';
const start = html.indexOf(startToken);
if (start < 0) {
  throw new Error('Unable to locate solveLevel function start in Solver.js');
}

const arrowBody = html.indexOf('=> {', start);
const openBrace = arrowBody >= 0 ? arrowBody + 3 : -1;
if (openBrace < 0) {
  throw new Error('Unable to locate solveLevel function body in Solver.js');
}

let depth = 0;
let end = -1;
for (let i = openBrace; i < html.length; i += 1) {
  const ch = html[i];
  if (ch === '{') depth += 1;
  else if (ch === '}') {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}

if (end < 0) {
  throw new Error('Unable to locate solveLevel function end in Solver.js');
}

const solveLevelSource = html.slice(start, end) + ';';

let invokedEngine = null;
const context = {
  SavedHintArchitecture: { toHintBlindSolverLevel: (level) => level },
  APP: {
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
      setButtonState() {}
    },
    Engine: {
      setOverlayState() {}
    },
    Core: {
      SOLVER_RUNNING: 'solver-running',
      OVERLAY_NONE: 'overlay-none'
    }
  },
  Referee: {
    async solve() {
      invokedEngine = 'referee';
      return {
        ok: false,
        status: 'no-solution-inconclusive',
        rawStatus: 'no-solution-inconclusive',
        solution: [],
        stagesTried: [],
        debug: {
          nodesExpanded: 1,
          branchesTried: 1,
          status: 'no-solution-inconclusive'
        }
      };
    }
  },
  attemptHistory: {},
  getLevelAttemptKey: () => '1-hint',
  startRun: () => ({ signal: { aborted: false } }),
  finishRun: () => {},
  performance: { now: () => Date.now() },
  createCanonicalSolveResult: (result) => result,
  applyCanonicalSolutionShape: () => {},
  isNoSolutionTrulyProven: () => false,
  ensureDepthZeroDebug: () => null,
  hasDepthZeroPayload: () => false,
  buildSearchDiagnostics: () => null,
  makeZeroExpansionSummary: () => null,
  makeRootSearchSummary: () => null,
  classifySolveStructure: () => null,
  isGoalReachableFromAnyGate: () => true,
  createSolverDebugStats: () => ({}),
  setDepthZeroReason: () => {},
  setPreExpansionAbort: () => {},
  finalizeSolverDebugStats: () => {},
  deriveCompatibilityAliasesFromAttempts: () => ({
    executionPath: 'referee-only',
    solverPath: 'referee',
    finalSolvedBy: 'none',
    winningEngine: null,
    winningStage: null,
    winningStageNumber: null,
    winningElapsedMs: null,
    refereeAttemptCount: 1,
    legacyFallbackTried: false,
    legacyFallbackStatus: null,
    legacyFallbackSolved: false,
    legacyFallbackTimeMs: null
  }),
  validateSolveAttributionConsistency: () => {},
  getPreExpansionAbort: (debug) => debug?.preExpansionAbort || null,
  console,
  setInterval: () => 1,
  clearInterval: () => {}
};

vm.createContext(context);
vm.runInContext(`${compactDefinedSource} ${helperSource} ${normalizeExecutionSource}; globalThis.__deriveHeuristicFeatureFlags = deriveHeuristicFeatureFlags;`, context, { filename: 'heuristic-helper-slice.js' });
assert.equal(typeof context.__deriveHeuristicFeatureFlags, 'function', 'deriveHeuristicFeatureFlags must be callable before smoke test level iteration.');
vm.runInContext(`${solveLevelSource}; globalThis.__solveLevel = solveLevel;`, context, { filename: 'solver-slice.js' });

const levelOne = { id: 0, grid: { w: 8, h: 8 }, gates: [{ x: 1, y: 1 }], goal: { x: 8, y: 8 } };
const result = await context.__solveLevel(levelOne, { purpose: 'hint' });

assert.equal(result?.rawStatus, 'no-solution-inconclusive');
assert.notEqual(result?.preExpansionAbort?.code, 'unexpected-exception');
assert.equal(invokedEngine, 'referee', 'solver smoke should invoke Referee.solve engine');
assert.ok(
  ['referee-only', 'referee-with-compat-profiles'].includes(result?.executionPath),
  `executionPath should report a referee runtime mode, got ${result?.executionPath}`
);

console.log('Solver smoke test passed (level 1 hint invocation used referee engine and reported compatible execution path).');
