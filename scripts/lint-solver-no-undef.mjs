import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const startToken = 'const solveLevel = async (level, opts = {}) => {';
const start = html.indexOf(startToken);
if (start < 0) {
  console.error('Unable to locate solveLevel function start in index.html');
  process.exit(1);
}

const arrowBody = html.indexOf('=> {', start);
const openBrace = arrowBody >= 0 ? arrowBody + 3 : -1;
if (openBrace < 0) {
  console.error('Unable to locate solveLevel function body in index.html');
  process.exit(1);
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
  console.error('Unable to locate solveLevel function end in index.html');
  process.exit(1);
}

const solveLevelSource = html.slice(start, end) + ';';

const prelude = `
const SavedHintArchitecture = { toHintBlindSolverLevel: (level) => level };
const APP = {
  State: { ENGINE: { flags: {}, activeSolverController: null, solverAbortRequested: false, isDevMode: false } },
  UI: { showMessage() {}, setModalContent() {}, setSolverTimerText() {}, setButtonState() {} },
  Engine: { setOverlayState() {} },
  Core: { SOLVER_RUNNING: 'solver-running', OVERLAY_NONE: 'overlay-none' }
};
const Referee = { solve: async () => ({}) };
const attemptHistory = {};
const getLevelAttemptKey = () => 'stub-level-key';
const startRun = () => ({});
const finishRun = () => {};
const performance = { now: () => 0 };
const createCanonicalSolveResult = (result) => result;
const applyCanonicalSolutionShape = () => {};
const deriveCompatibilityAliasesFromAttempts = () => ({
  executionPath: 'referee-only', solverPath: 'referee', finalSolvedBy: 'none',
  winningEngine: null, winningStage: null, winningStageNumber: null, winningElapsedMs: null,
  refereeAttemptCount: 0, legacyFallbackTried: false, legacyFallbackStatus: null,
  legacyFallbackSolved: false, legacyFallbackTimeMs: null
});
const validateSolveAttributionConsistency = () => {};
const getPreExpansionAbort = () => null;
const setInterval = () => 1;
const clearInterval = () => {};
`;

const tempDir = await mkdtemp(join(tmpdir(), 'solver-lint-'));
const tempFile = join(tempDir, 'solver-slice.js');
await writeFile(tempFile, `${prelude}\n${solveLevelSource}`, 'utf8');

try {
  await execFileAsync('eslint', [
    '--no-config-lookup',
    '--rule', 'no-undef:error',
    '--parser-options', '{"ecmaVersion":2022,"sourceType":"script"}',
    tempFile
  ]);
  console.log('Solver no-undef check passed.');
} catch (error) {
  process.stdout.write(error.stdout || '');
  process.stderr.write(error.stderr || '');
  process.exit(error.code || 1);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
