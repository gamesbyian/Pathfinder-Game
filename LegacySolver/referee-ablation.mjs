#!/usr/bin/env node
/**
 * Referee branch ablation — disable individual Referee strategy branches one at
 * a time across a set of levels and measure which branches carry unique
 * solve contribution.
 *
 * Each run disables ONE branch (e.g. referee.rescue.hardHintFallback) and checks
 * whether the level still solves. A regression means that branch was the sole
 * path to a solution for that level.
 *
 * Usage:
 *   node scripts/referee-ablation.mjs --levels=1-140
 *   node scripts/referee-ablation.mjs --levels=1-140 --output-dir=audits/ablation/referee-branches
 *   node scripts/referee-ablation.mjs --levels=1-140 --branches=referee.rescue.hardHintFallback,referee.portal.agnosticAttempt
 *   node scripts/referee-ablation.mjs --dry-run --levels=all
 *
 * OUTPUT
 *   {output-dir}/manifest.json            — list of all variants run
 *   {output-dir}/baseline.json            — baseline (all branches enabled)
 *   {output-dir}/disable-{branch}.json    — per-branch disable result
 *   {output-dir}/branch-report.json       — aggregated per-branch contribution table
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  node scripts/referee-ablation.mjs --levels=1-140
  node scripts/referee-ablation.mjs --levels=all --branches=referee.rescue.hardHintFallback

Options:
  --levels=RANGE           Level range: 1-140, all, or comma list.
  --branches=LIST          Comma-separated branch IDs to test (default: all).
  --budget-ms=N            Virtual budget per level (default: canonical).
  --output-dir=PATH        Output directory (default: audits/ablation/{timestamp}).
  --dry-run                Print plan without running.
  --json                   Output machine-readable JSON.

Branch IDs (all enabled by default):
  referee.guardrail.retryStop
  referee.portal.agnosticAttempt
  referee.baseline.stage0Core
  referee.blueprint.planningStageEarly
  referee.blueprint.planningStageSecond
  referee.recovery.rapidCollapseDetect
  referee.recovery.rapidCollapseFallback
  referee.recovery.preExpansion
  referee.recovery.harvestThenFinish
  referee.recovery.knotBuilder
  referee.recovery.lowExpansionFallback
  referee.recovery.mustCrossKnot
  referee.recovery.objectiveOrdering
  referee.recovery.goalSuppression
  referee.recovery.healthyExpansionEndurance
  referee.recovery.telemetryFamilySwitch
  referee.recovery.unknownFallback
  referee.rescue.preExpansionRescue
  referee.rescue.memoRelaxedProfile
  referee.rescue.hardHintFallback
`);
  process.exit(0);
}

const argMap = new Map(args.filter(a => a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const levelsArg = argMap.get('--levels') || 'all';
const budgetMsArg = argMap.get('--budget-ms') || null;
const outputDirArg = argMap.get('--output-dir') || null;
const requestedBranches = (argMap.get('--branches') || '').split(',').map(s => s.trim()).filter(Boolean);
const dryRun = argFlags.has('--dry-run');
const purpose = 'hint';

// ─── Branch definitions ───────────────────────────────────────────────────────
const ALL_REFEREE_BRANCHES = [
  { id: 'referee.guardrail.retryStop',              desc: 'Guardrail abort after too many retries' },
  { id: 'referee.portal.agnosticAttempt',           desc: 'Portal-agnostic attempt (portals optional, try without)' },
  { id: 'referee.blueprint.planningStageEarly',     desc: 'Blueprint planning (early pass, before failure recovery)' },
  { id: 'referee.blueprint.planningStageSecond',    desc: 'Blueprint planning (second pass, after failure recovery)' },
  { id: 'referee.recovery.rapidCollapseFallback',   desc: 'Rapid-collapse stage-1 fallback (memoRelaxed + interaction-fallback root)' },
  { id: 'referee.recovery.preExpansion',            desc: 'Pre-expansion failure recovery (contradiction-recovery)' },
  { id: 'referee.recovery.harvestThenFinish',       desc: 'Low-expansion recovery: harvestThenFinish + knotBuilder policies' },
  { id: 'referee.recovery.lowExpansionFallback',    desc: 'Low-expansion stage-3 fallback (root-diversity-recovery)' },
  { id: 'referee.recovery.mustCrossKnot',           desc: 'Healthy-timeout recovery: mustCross-knot (knotBuilder for reqInt≥3)' },
  { id: 'referee.recovery.objectiveOrdering',       desc: 'Healthy-timeout recovery: objective ordering (objectiveFirst)' },
  { id: 'referee.recovery.goalSuppression',         desc: 'Healthy-timeout recovery: goal suppression (finishFirst)' },
  { id: 'referee.recovery.healthyExpansionEndurance', desc: 'Healthy-timeout recovery: endurance mode (stage 4)' },
  { id: 'referee.recovery.telemetryFamilySwitch',   desc: 'Healthy-timeout recovery: telemetry-driven family switch (stage 5)' },
  { id: 'referee.recovery.unknownFallback',         desc: 'Unknown failure category: conservative fallback' },
  { id: 'referee.rescue.preExpansionRescue',        desc: 'Rescue stage: pre-expansion rescue (interaction-fallback root)' },
  { id: 'referee.rescue.memoRelaxedProfile',        desc: 'Rescue stage: memo-relaxed profile fallback' },
  { id: 'referee.rescue.hardHintFallback',          desc: 'Hard-hint final fallback (stage 6, portalFirstTransfer)' },
];

const branches = requestedBranches.length > 0
  ? ALL_REFEREE_BRANCHES.filter(b => requestedBranches.includes(b.id))
  : ALL_REFEREE_BRANCHES;

// ─── Browser shims (Node.js environment) ─────────────────────────────────────
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

// ─── Solver setup ─────────────────────────────────────────────────────────────
const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./LegacySolver.js');
const budgetMs = Number(budgetMsArg || CANONICAL_SOLVE_TIME_BUDGET_MS);
const maxLevelWallMs = budgetMs * 5;

const PACK = (x, y) => (y << 16) | x;
const UNPACK = (k) => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });
const APP = {
  LevelUtils: { PACK, UNPACK, inBounds: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h, resolvePortal: (l, k) => l?.portalMap?.get(k) || null, deepCloneLevel: l => l, canonicalCloneLevel: l => l, normalizeLevel: () => { throw new Error('not available'); }, getRawLevels: () => [] },
  Core: { PLAY: 'play', EDITOR: 'editor', HINT_ANIMATING: 'hint-animating', SOLVER_RUNNING: 'solver-running', OVERLAY_NONE: 'overlay-none' },
  Data: { getLevels: () => [] },
  State: { ENGINE: { flags: {}, isDevMode: false, activeSolverController: null, solverAbortRequested: false, runtime: {}, ui: {} } },
  UI: { showMessage() {}, setModalContent() {}, setSolverTimerText() {}, setButtonState() {}, setSolverDetailText() {}, setSolverProgress() {} },
  Engine: { setOverlayState() {}, areWinMetricsSatisfied: () => true },
  Editor: { setWorkingLevelHintsFromSolutions() {} },
  Debug: { register() {} }
};
const Solver = installSolver(APP);

async function loadAllLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const ctx = { window: {} };
  const vmCtx = vm.createContext(ctx);
  const filePath = path.join(root, 'levels.js');
  if (!existsSync(filePath)) throw new Error('levels.js not found');
  vm.runInContext(await readFile(filePath, 'utf8'), vmCtx, { filename: 'levels.js' });
  const levels = ctx.window.RAW_LEVELS;
  if (!Array.isArray(levels) || !levels.length) throw new Error('Failed to load RAW_LEVELS');
  return levels;
}

function getCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
}

// ─── Level filter ─────────────────────────────────────────────────────────────
function parseLevelFilter(raw, maxLevel) {
  if (!raw || raw === 'all') return null;
  const nums = new Set();
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const lo = Number(m[1]), hi = m[2] ? Number(m[2]) : lo;
    for (let i = lo; i <= Math.min(hi, maxLevel); i++) nums.add(i);
  }
  return nums.size > 0 ? nums : null;
}

// ─── Solve one level ──────────────────────────────────────────────────────────
async function solveLevel(levelNumber, raw, refereeBranchControls = {}) {
  let level;
  try {
    level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
  } catch (e) {
    return { level: levelNumber, status: 'error', error: `normalize: ${e?.message}`, ok: false, elapsedMs: 0, branchReport: [] };
  }

  const opts = {
    purpose,
    timeBudgetMs: budgetMs,
    debug: true,
    allowReferee: true,
    resetAttemptHistory: 'level',
    wallCeilingMs: maxLevelWallMs,
    refereeBranchControls,
  };

  APP.State.ENGINE.activeSolverController = null;
  APP.State.ENGINE.solverAbortRequested = false;

  const t0 = Date.now();
  let result;
  try {
    const wallGuard = new Promise(res => setTimeout(() => res({ ok: false, status: 'wall-timeout', _wallTimeout: true }), maxLevelWallMs));
    result = await Promise.race([Solver.universalSolveLevel(level, opts), wallGuard]);
    if (result?._wallTimeout) {
      return { level: levelNumber, ok: false, status: 'wall-timeout', elapsedMs: Date.now() - t0, branchReport: [] };
    }
  } catch (e) {
    return { level: levelNumber, status: 'error', error: `solve: ${e?.message}`, ok: false, elapsedMs: Date.now() - t0, branchReport: [] };
  }

  return {
    level: levelNumber,
    ok: !!result?.ok,
    status: result?.status || (result?.ok ? 'solved' : 'timeout'),
    elapsedMs: Date.now() - t0,
    branchReport: result?.refereeBranchReport ?? [],
  };
}

// ─── Run variant ──────────────────────────────────────────────────────────────
async function runVariant(variantId, desc, branchControls, levelNumbers, rawLevels) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`[${variantId}] ${desc}`);
  console.log(`  levels: ${levelNumbers.length}  budget: ${budgetMs}ms`);

  const results = [];
  let solved = 0, failed = 0;
  for (const n of levelNumbers) {
    const raw = rawLevels[n - 1];
    if (!raw) { console.warn(`  L${n} not found, skipping`); continue; }
    const r = await solveLevel(n, raw, branchControls);
    results.push(r);
    if (r.ok) { solved++; process.stdout.write(`  L${n} ✓ ${r.elapsedMs}ms\n`); }
    else      { failed++; process.stdout.write(`  L${n} ✗ ${r.status}\n`); }
  }
  console.log(`  Done: ${solved} solved, ${failed} failed of ${levelNumbers.length}`);
  return { variantId, desc, levels: results, solved, failed, budgetMs };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const allRaw = await loadAllLevels();
const levelFilter = parseLevelFilter(levelsArg, allRaw.length);
const levelNumbers = (levelFilter ? [...levelFilter] : allRaw.map((_, i) => i + 1)).filter(n => n >= 1 && n <= allRaw.length);

const variants = [
  { id: 'baseline', desc: 'Baseline (all branches enabled)', controls: {} },
  ...branches.map(b => ({
    id: `disable-${b.id.replace(/\./g, '-')}`,
    desc: `Disable: ${b.desc}`,
    branchId: b.id,
    controls: { [b.id]: { enabled: false } },
  })),
];

if (dryRun) {
  console.log(`Dry run: ${variants.length} variant(s) × ${levelNumbers.length} level(s)\n`);
  for (const v of variants) console.log(`  [${v.id}]  ${v.desc}`);
  process.exit(0);
}

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
const outputDir = outputDirArg || path.join('audits', 'ablation', `referee-${utcStamp()}`);
await mkdir(outputDir, { recursive: true });

console.log(`\nReferee Branch Ablation`);
console.log(`Levels: ${levelNumbers.length}   Budget: ${budgetMs}ms   Variants: ${variants.length}`);
console.log(`Output → ${outputDir}\n`);

const commitSha = getCommitSha();
const completedVariants = [];

for (const variant of variants) {
  const data = await runVariant(variant.id, variant.desc, variant.controls, levelNumbers, allRaw);
  const outFile = `${variant.id}.json`;
  await writeFile(path.join(outputDir, outFile), JSON.stringify({ ...data, commitSha, timestamp: new Date().toISOString() }, null, 2));
  completedVariants.push({ variantId: variant.id, desc: variant.desc, outputFile: outFile, branchId: variant.branchId || null });
}

// ─── Build aggregated branch contribution table ───────────────────────────────
const baselineData = completedVariants.find(v => v.variantId === 'baseline');
const baselineFile = baselineData ? JSON.parse(await readFile(path.join(outputDir, baselineData.outputFile), 'utf8')) : null;
const baselineLevelMap = new Map((baselineFile?.levels || []).map(l => [l.level, l]));

const branchTable = [];
for (const variant of completedVariants.filter(v => v.branchId)) {
  const varData = JSON.parse(await readFile(path.join(outputDir, variant.outputFile), 'utf8'));
  const regressions = varData.levels.filter(l => {
    const base = baselineLevelMap.get(l.level);
    return base?.ok && !l.ok;
  });
  const verdict = regressions.length === 0 ? 'REDUNDANT' : regressions.length <= 2 ? 'SITUATIONAL' : 'INDISPENSABLE';
  branchTable.push({
    branchId: variant.branchId,
    verdict,
    regressions: regressions.length,
    regressionLevels: regressions.map(l => l.level),
    levelsTotal: varData.levels.length,
    levelsSolved: varData.solved,
  });
}
branchTable.sort((a, b) => b.regressions - a.regressions || a.branchId.localeCompare(b.branchId));

// Write manifest
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({
  type: 'referee-ablation',
  timestamp: new Date().toISOString(),
  commitSha,
  budgetMs,
  levels: levelNumbers,
  completedVariants,
}, null, 2));

// Write aggregated branch report
await writeFile(path.join(outputDir, 'branch-report.json'), JSON.stringify({ branchTable, generatedAt: new Date().toISOString() }, null, 2));

// Print summary
console.log(`\n${'═'.repeat(72)}`);
console.log(`Referee Branch Ablation — Summary`);
console.log(`${'═'.repeat(72)}`);
console.log(`\n  ${'Branch'.padEnd(45)} ${'Verdict'.padEnd(14)} Regressions`);
console.log(`  ${'─'.repeat(72)}`);
for (const t of branchTable) {
  const reg = t.regressions > 0 ? `L${t.regressionLevels.slice(0,5).join(', L')}${t.regressionLevels.length > 5 ? '…' : ''}` : 'none';
  console.log(`  ${t.branchId.padEnd(45)} ${t.verdict.padEnd(14)} ${t.regressions}  ${reg}`);
}

const indispensable = branchTable.filter(t => t.verdict === 'INDISPENSABLE').map(t => t.branchId);
const situational   = branchTable.filter(t => t.verdict === 'SITUATIONAL').map(t => t.branchId);
const redundant     = branchTable.filter(t => t.verdict === 'REDUNDANT').map(t => t.branchId);
console.log(`\nINDISPENSABLE (≥3): ${indispensable.join(', ') || 'none'}`);
console.log(`SITUATIONAL (1-2):  ${situational.join(', ') || 'none'}`);
console.log(`REDUNDANT (0):      ${redundant.join(', ') || 'none'}`);
console.log(`\nOutput: ${outputDir}`);
console.log(`Next step: review ${outputDir}/branch-report.json`);
