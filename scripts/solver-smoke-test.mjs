import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
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
vm.runInContext(`${solveLevelSource}; globalThis.__solveLevel = solveLevel;`, context, { filename: 'solver-slice.js' });

const levelOne = { id: 0, grid: { w: 8, h: 8 }, gates: [{ x: 1, y: 1 }], goal: { x: 8, y: 8 } };
const result = await context.__solveLevel(levelOne, { purpose: 'hint' });

assert.equal(result?.rawStatus, 'already-running');
assert.notEqual(result?.preExpansionAbort?.code, 'unexpected-exception');

console.log('Solver smoke test passed (level 1 hint invocation did not throw unexpected pre-expansion exception).');
