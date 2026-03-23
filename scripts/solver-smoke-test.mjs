import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const helperToken = 'const deriveHeuristicFeatureFlags = (level = {}, context = {}) => {';
const helperStart = html.indexOf(helperToken);
if (helperStart < 0) {
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper in index.html');
}

const helperArrowBody = html.indexOf('=> {', helperStart);
const helperOpenBrace = helperArrowBody >= 0 ? helperArrowBody + 3 : -1;
if (helperOpenBrace < 0) {
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper body in index.html');
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
  throw new Error('Unable to locate deriveHeuristicFeatureFlags helper end in index.html');
}

const compactDefinedToken = 'const compactDefined = (obj = {}) => {';
const compactDefinedStart = html.indexOf(compactDefinedToken);
if (compactDefinedStart < 0) {
  throw new Error('Unable to locate compactDefined helper in index.html');
}
const compactDefinedArrowBody = html.indexOf('=> {', compactDefinedStart);
const compactDefinedOpenBrace = compactDefinedArrowBody >= 0 ? compactDefinedArrowBody + 3 : -1;
if (compactDefinedOpenBrace < 0) {
  throw new Error('Unable to locate compactDefined helper body in index.html');
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
  throw new Error('Unable to locate compactDefined helper end in index.html');
}

const compactDefinedSource = html.slice(compactDefinedStart, compactDefinedEnd) + ';';
const helperSource = html.slice(helperStart, helperEnd) + ';';
const startToken = 'const solveLevel = async (level, opts = {}) => {';
const start = html.indexOf(startToken);
if (start < 0) {
  throw new Error('Unable to locate solveLevel function start in index.html');
}

const arrowBody = html.indexOf('=> {', start);
const openBrace = arrowBody >= 0 ? arrowBody + 3 : -1;
if (openBrace < 0) {
  throw new Error('Unable to locate solveLevel function body in index.html');
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
  throw new Error('Unable to locate solveLevel function end in index.html');
}

const solveLevelSource = html.slice(start, end) + ';';

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
  startRun: () => null,
  finishRun: () => {},
  performance: { now: () => Date.now() },
  createCanonicalSolveResult: (result) => result,
  applyCanonicalSolutionShape: () => {},
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
vm.runInContext(`${compactDefinedSource} ${helperSource}; globalThis.__deriveHeuristicFeatureFlags = deriveHeuristicFeatureFlags;`, context, { filename: 'heuristic-helper-slice.js' });
assert.equal(typeof context.__deriveHeuristicFeatureFlags, 'function', 'deriveHeuristicFeatureFlags must be callable before smoke test level iteration.');
vm.runInContext(`${solveLevelSource}; globalThis.__solveLevel = solveLevel;`, context, { filename: 'solver-slice.js' });

const levelOne = { id: 0, grid: { w: 8, h: 8 }, gates: [{ x: 1, y: 1 }], goal: { x: 8, y: 8 } };
const result = await context.__solveLevel(levelOne, { purpose: 'hint' });

assert.equal(result?.rawStatus, 'already-running');
assert.notEqual(result?.preExpansionAbort?.code, 'unexpected-exception');

console.log('Solver smoke test passed (level 1 hint invocation did not throw unexpected pre-expansion exception).');
