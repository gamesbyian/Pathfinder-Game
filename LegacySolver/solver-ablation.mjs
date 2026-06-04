#!/usr/bin/env node
/**
 * Solver ablation lab.
 *
 * Runs controlled solver variants to determine which techniques carry weight,
 * which are redundant, and whether budget reallocation could replace complex
 * later fallbacks with simpler earlier ones.
 *
 * EXPERIMENT MODES
 *   baseline         Standard solver unchanged. Run this first.
 *   disable-one      Each technique disabled in turn — reveals regressions.
 *   solo             Each technique run alone with full budget — reveals standalone reach.
 *   budget-sweep     Global budget ×[0.25, 0.5, 2, 4] — shows global solve-rate curve.
 *   technique-budget Each technique alone at ×[0.5, 1.5, 2, 3] budget — per-technique curves.
 *   full             baseline + disable-one + solo + budget-sweep.
 *   custom           Manual control via --disable / --allow / --budget-multiplier flags.
 *
 * USAGE
 *   node scripts/solver-ablation.mjs --experiment=baseline --levels=all
 *   node scripts/solver-ablation.mjs --experiment=disable-one --levels=all
 *   node scripts/solver-ablation.mjs --experiment=full --output-dir=audits/ablation/run1
 *   node scripts/solver-ablation.mjs --experiment=custom --disable=archetype
 *   node scripts/solver-ablation.mjs --experiment=custom --allow=structural-modern --global-budget-multiplier=2
 *   node scripts/solver-ablation.mjs --experiment=technique-budget --techniques=structural-modern,template
 *   node scripts/solver-ablation.mjs --dry-run --experiment=full
 *
 * OUTPUT
 *   {output-dir}/manifest.json            — list of all variants run
 *   {output-dir}/baseline.json            — baseline results
 *   {output-dir}/disable-{tech}.json      — disable-one per technique
 *   {output-dir}/solo-{tech}.json         — solo per technique
 *   {output-dir}/budget-{mult}x.json      — global budget sweep
 *   {output-dir}/tech-budget-{tech}-{m}x.json — per-technique budget sweep
 *
 * ANALYSIS
 *   After collecting results, run:
 *     node scripts/analyze-ablation.mjs --input-dir=audits/ablation/run1
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = new Map(
  args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; })
);
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

if (argFlags.has('--help') || argFlags.has('-h')) {
  console.log(`Usage: node scripts/solver-ablation.mjs [options]

  --experiment=MODE        baseline|disable-one|solo|budget-sweep|technique-budget|full|custom
  --levels=SPEC            Level spec (default: all). Same format as run-solver-direct.mjs.
  --budget-ms=N            Time budget per level (default: canonical solver budget).
  --techniques=LIST        Comma-separated technique IDs to include (default: all).
                           Available: template, archetype, all-escalation, escalation-tier-1..5,
                           template-corner-harvest, template-perimeter, template-side-commitment,
                           template-portal-bridge-first, archetype-high-intersection-burden,
                           archetype-portal-mustcross-constrained, archetype-sparse-near-closure
  --group=NAME             Run only techniques in a group (coarse|escalation|template-detail|archetype-detail)
  --budget-multipliers=LIST  Comma-separated multipliers for budget-sweep (default: 0.25,0.5,2,4).
  --output-dir=PATH        Output directory (default: audits/ablation/{timestamp}).
  --dry-run                Print variants without running.
  --verbose                Per-attempt detail.
  --no-history             Skip manifest history copy.
  --purpose=PURPOSE        hint (default; solve is no longer supported).
  --max-level-wall-ms=N    Wall-time cap per level (default: 5× budget). Prevents
                           virtual/wall divergence on pathological solo runs.

  Custom mode flags:
  --disable=t1,t2          Disable these technique prefixes.
  --allow=t1,t2            Whitelist: run only these technique prefixes.
  --global-budget-multiplier=N  Multiply all attempt budgets by N.
  --attempt-budget-multipliers=t1:N1,t2:N2  Per-technique budget multipliers.
  --branch-disable=id1,id2 Disable REFEREE_BRANCH_DEFAULTS entries by ID.
                           e.g. referee.adaptation.mitmConnector,referee.adaptation.nearClosureFloodRescue
`);
  process.exit(0);
}

const parseLevelSpec = (spec) => {
  if (!spec || spec === 'all') return null;
  const set = new Set();
  for (const part of spec.split(',')) {
    const t = part.trim();
    if (!t) continue;
    if (t.includes('-')) {
      const [a, b] = t.split('-').map(v => Number(v.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) for (let i = Math.min(a,b); i <= Math.max(a,b); i++) set.add(i);
    } else {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
  }
  return set.size > 0 ? set : null;
};

const parseList = (s) => s ? s.split(',').map(v => v.trim()).filter(Boolean) : [];

const experiment = argMap.get('--experiment') || 'baseline';
const levelFilter = parseLevelSpec(argMap.get('--levels'));
const budgetMsArg = argMap.get('--budget-ms');
const purpose = argMap.get('--purpose') || 'hint';
const dryRun = argFlags.has('--dry-run');
const verbose = argFlags.has('--verbose');
const requestedTechniques = parseList(argMap.get('--techniques') || '');
const requestedGroup = argMap.get('--group') || null;
const requestedMultipliers = parseList(argMap.get('--budget-multipliers') || '').map(Number).filter(Number.isFinite).filter(m => m > 0);
const outputDirArg = argMap.get('--output-dir') || null;

// Custom mode flags
const customDisable = parseList(argMap.get('--disable') || '');
const customAllow = parseList(argMap.get('--allow') || '');
const customGlobalMultiplier = argMap.get('--global-budget-multiplier') ? Number(argMap.get('--global-budget-multiplier')) : null;
const maxLevelWallMsArg = argMap.get('--max-level-wall-ms') ? Number(argMap.get('--max-level-wall-ms')) : null;
const branchDisableIds = parseList(argMap.get('--branch-disable') || '');

const customAttemptMults = (() => {
  const raw = argMap.get('--attempt-budget-multipliers') || '';
  if (!raw) return {};
  const out = {};
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split(':');
    if (k && v && Number.isFinite(Number(v))) out[k.trim()] = Number(v.trim());
  }
  return out;
})();

// ─── Technique definitions ────────────────────────────────────────────────────
// Groups: 'coarse' = top-level components; 'escalation' = individual tiers;
//         'template-detail' = individual template types; 'archetype-detail' = individual archetypes.
// Use --techniques=ID1,ID2 to run a subset, or --group=NAME to run a whole group.
const ALL_TECHNIQUES = [
  // Coarse-grained top-level components
  { id: 'template',  prefix: 'template',  group: 'coarse', desc: 'All template-guided warmup passes' },
  { id: 'archetype', prefix: 'archetype', group: 'coarse', desc: 'All archetype-dispatched prepended passes' },
  // Escalation tier granularity
  { id: 'all-escalation',    prefix: 'escalation-tier',   group: 'escalation', desc: 'All escalation tiers (1-5)' },
  { id: 'escalation-tier-1', prefix: 'escalation-tier-1', group: 'escalation', desc: 'Escalation T1: memo disabled' },
  { id: 'escalation-tier-2', prefix: 'escalation-tier-2', group: 'escalation', desc: 'Escalation T2: bounds relaxed' },
  { id: 'escalation-tier-3', prefix: 'escalation-tier-3', group: 'escalation', desc: 'Escalation T3: portal relaxed' },
  { id: 'escalation-tier-4', prefix: 'escalation-tier-4', group: 'escalation', desc: 'Escalation T4: diversified order' },
  { id: 'escalation-tier-5', prefix: 'escalation-tier-5', group: 'escalation', desc: 'Escalation T5: near-closure rescue' },
  // Individual template types
  { id: 'template-corner-harvest',      prefix: 'template-corner-harvest',      group: 'template-detail', desc: 'Template: corner-harvest' },
  { id: 'template-perimeter',           prefix: 'template-perimeter',           group: 'template-detail', desc: 'Template: perimeter (cw + ccw)' },
  { id: 'template-side-commitment',     prefix: 'template-side-commitment',     group: 'template-detail', desc: 'Template: side-commitment' },
  { id: 'template-portal-bridge-first', prefix: 'template-portal-bridge-first', group: 'template-detail', desc: 'Template: portal-bridge-first' },
  // Individual archetypes
  { id: 'archetype-high-intersection-burden',    prefix: 'archetype-high-intersection-burden',    group: 'archetype-detail', desc: 'Archetype: high-intersection-burden' },
  { id: 'archetype-portal-mustcross-constrained',prefix: 'archetype-portal-mustcross-constrained',group: 'archetype-detail', desc: 'Archetype: portal-mustcross-constrained' },
  { id: 'archetype-sparse-near-closure',         prefix: 'archetype-sparse-near-closure',         group: 'archetype-detail', desc: 'Archetype: sparse-near-closure' },
];

const techniques = requestedTechniques.length > 0
  ? ALL_TECHNIQUES.filter(t => requestedTechniques.includes(t.id))
  : requestedGroup
    ? ALL_TECHNIQUES.filter(t => t.group === requestedGroup)
    : ALL_TECHNIQUES;

// ─── Variant builder ──────────────────────────────────────────────────────────
function buildVariants() {
  const variants = [];

  const budgetMultipliers = requestedMultipliers.length > 0
    ? requestedMultipliers
    : [0.25, 0.5, 2.0, 4.0];

  if (experiment === 'custom') {
    const config = {};
    if (customDisable.length > 0) config.disabledAttemptLabels = customDisable;
    if (customAllow.length > 0) config.allowedAttemptLabels = customAllow;
    if (customGlobalMultiplier != null && Number.isFinite(customGlobalMultiplier)) config.globalBudgetMultiplier = customGlobalMultiplier;
    if (Object.keys(customAttemptMults).length > 0) config.attemptBudgetMultipliers = customAttemptMults;
    if (branchDisableIds.length > 0) {
      config.refereeBranchControls = Object.fromEntries(branchDisableIds.map(id => [id, { enabled: false }]));
    }
    const desc = [
      customDisable.length > 0 ? `disable=[${customDisable.join(',')}]` : null,
      customAllow.length > 0 ? `allow=[${customAllow.join(',')}]` : null,
      customGlobalMultiplier != null ? `globalMult=${customGlobalMultiplier}` : null,
      branchDisableIds.length > 0 ? `branchDisable=[${branchDisableIds.join(',')}]` : null,
    ].filter(Boolean).join(', ') || 'no modifications';
    variants.push({ id: 'custom', desc: `Custom: ${desc}`, config, outputFile: 'custom.json' });
    return variants;
  }

  if (['baseline', 'full'].includes(experiment)) {
    const baseConfig = {};
    if (branchDisableIds.length > 0) {
      baseConfig.refereeBranchControls = Object.fromEntries(branchDisableIds.map(id => [id, { enabled: false }]));
    }
    const baseDesc = branchDisableIds.length > 0
      ? `Baseline with branchDisable=[${branchDisableIds.join(',')}]`
      : 'Baseline (standard solver)';
    variants.push({ id: 'baseline', desc: baseDesc, config: baseConfig, outputFile: 'baseline.json' });
  }

  if (['disable-one', 'full'].includes(experiment)) {
    for (const t of techniques) {
      variants.push({
        id: `disable-${t.id}`,
        desc: `Disable: ${t.desc}`,
        config: { disabledAttemptLabels: [t.prefix] },
        outputFile: `disable-${t.id}.json`,
        technique: t.id,
      });
    }
  }

  if (['solo', 'full'].includes(experiment)) {
    for (const t of techniques) {
      variants.push({
        id: `solo-${t.id}`,
        desc: `Solo (full budget): ${t.desc}`,
        // globalBudgetMultiplier=2 compensates for the technique receiving only its fraction of total budget.
        // Most techniques get 10–54% of total; ×2 ensures the solo technique gets at least its full natural share
        // and in many cases approaches the full total budget.
        config: { allowedAttemptLabels: [t.prefix], globalBudgetMultiplier: 2.0 },
        outputFile: `solo-${t.id}.json`,
        technique: t.id,
      });
    }
  }

  if (['budget-sweep', 'full'].includes(experiment)) {
    for (const m of budgetMultipliers) {
      const tag = `${m}x`.replace('.', 'p');
      variants.push({
        id: `budget-${tag}`,
        desc: `Global budget ×${m} (all techniques)`,
        config: { globalBudgetMultiplier: m },
        outputFile: `budget-${tag}.json`,
        budgetMultiplier: m,
      });
    }
  }

  if (experiment === 'technique-budget') {
    const techBudgetMults = requestedMultipliers.length > 0 ? requestedMultipliers : [0.5, 1.5, 2.0, 3.0];
    for (const t of techniques) {
      for (const m of techBudgetMults) {
        const tag = `${m}x`.replace('.', 'p');
        variants.push({
          id: `tech-budget-${t.id}-${tag}`,
          desc: `Solo ×${m} budget: ${t.desc}`,
          config: { allowedAttemptLabels: [t.prefix], globalBudgetMultiplier: m },
          outputFile: `tech-budget-${t.id}-${tag}.json`,
          technique: t.id,
          budgetMultiplier: m,
        });
      }
    }
  }

  return variants;
}

const variants = buildVariants();

if (dryRun) {
  console.log(`Dry run: ${variants.length} variant(s) would be executed against ${levelFilter ? [...levelFilter].length : 'all'} level(s).\n`);
  for (const v of variants) {
    console.log(`  [${v.id}]  ${v.desc}`);
    console.log(`    config: ${JSON.stringify(v.config)}`);
    console.log(`    output: ${v.outputFile}`);
  }
  process.exit(0);
}

// ─── Solver bootstrap (mirrors run-solver-direct.mjs) ─────────────────────────
if (typeof globalThis.window === 'undefined') globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined') globalThis.document = { addEventListener() {}, getElementById: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { installSolver, CANONICAL_SOLVE_TIME_BUDGET_MS } = await import('./LegacySolver.js');
const budgetMs = Number(budgetMsArg || CANONICAL_SOLVE_TIME_BUDGET_MS);
const maxLevelWallMs = maxLevelWallMsArg ?? (budgetMs * 5);

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

const getCommitSha = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};
const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

// ─── Level classification helper ──────────────────────────────────────────────
function classifyLevel(raw) {
  return {
    hasPortals: (raw.portals?.length || 0) > 0,
    hasMustCross: (raw.mustCross?.length || 0) > 0,
    hasMustPass: (raw.mustPass?.length || 0) > 0,
    hasGeese: (raw.geese?.length || 0) > 0,
    hasFilters: ((raw.filters?.length || 0) + (raw.flippingFilters?.length || 0)) > 0,
    hasFalseGoals: (raw.falseGoals?.length || 0) > 0,
    multiGate: (raw.gates?.length || 0) > 1,
    reqLen: raw.reqLen || 0,
    reqInt: raw.reqInt || 0,
    gridArea: (raw.grid?.w || 8) * (raw.grid?.h || 8),
  };
}

// ─── Per-level solve helper ────────────────────────────────────────────────────
async function solveLevel(levelNumber, raw, variantConfig) {
  let level;
  try {
    level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
  } catch (e) {
    return { level: levelNumber, status: 'error', error: `normalize: ${e?.message}`, ok: false, elapsedMs: 0, attempts: [] };
  }

  const experimentOverrides = Object.keys(variantConfig).length > 0 ? { ...variantConfig } : null;
  const opts = {
    purpose,
    timeBudgetMs: budgetMs,
    debug: true,
    allowReferee: true,
    resetAttemptHistory: 'level',
    // Thread the wall cap into the solver so the DFS self-terminates via realCeilingMs
    // when a single attempt runs long, rather than relying solely on Promise.race which
    // can only fire at await boundaries between attempts.
    wallCeilingMs: maxLevelWallMs,
    ...(experimentOverrides ? { experimentOverrides } : {}),
  };

  APP.State.ENGINE.activeSolverController = null;
  APP.State.ENGINE.solverAbortRequested = false;

  const t0 = Date.now();
  let result;
  try {
    const wallGuard = new Promise(res => setTimeout(() => res({ ok: false, status: 'wall-timeout', _wallTimeout: true }), maxLevelWallMs));
    result = await Promise.race([Solver.universalSolveLevel(level, opts), wallGuard]);
    if (result?._wallTimeout) {
      const elapsed = Date.now() - t0;
      console.warn(`  L${levelNumber} WALL-TIMEOUT after ${elapsed}ms (cap=${maxLevelWallMs}ms)`);
      return { level: levelNumber, ok: false, status: 'wall-timeout', elapsedMs: elapsed, nodesExpanded: 0, maxDepth: 0, firstSolvingAttempt: null, solvingAttemptIdx: -1, overheadBeforeSolveMs: 0, solveAttemptMs: 0, attemptCount: 0, attemptSummary: [] };
    }
  } catch (e) {
    return { level: levelNumber, status: 'error', error: `solve: ${e?.message}`, ok: false, elapsedMs: Date.now() - t0, attempts: [] };
  }
  const elapsedMs = Date.now() - t0;

  const ok = !!result?.ok;
  const status = result?.status || (ok ? 'solved' : 'timeout');
  const debug = result?.debug || {};

  // Extract per-attempt data from result.attempts (populated by runBaselineStage)
  // stagesTried gives cross-stage history; attempts is the winning stage's attempts
  const rawStagesTried = Array.isArray(result?.stagesTried) ? result.stagesTried : [];
  const rawAttempts = Array.isArray(result?.attempts) ? result.attempts : [];
  const attemptSummary = rawAttempts
    .filter(a => a && !a.__carriedFromHintLadder)
    .map(a => ({
      label: a.label || null,
      solved: !!a.solved,
      elapsedMs: Number.isFinite(a.elapsedMs) ? a.elapsedMs : null,
      budgetMs: Number.isFinite(a.budgetMs) ? a.budgetMs : null,
      depthReached: Number.isFinite(a.depthReached) ? a.depthReached : null,
      policyProfile: a.policyProfile || null,
      scoringMode: a.scoringMode || null,
      status: a.status || null,
      nodesExpanded: Number.isFinite(a.quality?.nodesExpanded) ? a.quality.nodesExpanded : null,
      timeoutEscalationTier: Number.isFinite(a.timeoutEscalationTier) ? a.timeoutEscalationTier : 0,
      safetyValveApplied: a.__safetyValveApplied === true ? true : undefined,
    }));

  // Derive solve-attribution fields
  const solvingAttemptIdx = attemptSummary.findIndex(a => a.solved);
  const firstSolvingAttempt = solvingAttemptIdx >= 0 ? attemptSummary[solvingAttemptIdx].label : null;
  const overheadBeforeSolveMs = solvingAttemptIdx > 0
    ? attemptSummary.slice(0, solvingAttemptIdx).reduce((s, a) => s + (a.elapsedMs || 0), 0)
    : 0;
  const solveAttemptMs = solvingAttemptIdx >= 0 ? (attemptSummary[solvingAttemptIdx].elapsedMs || 0) : 0;

  return {
    level: levelNumber,
    ok,
    status,
    elapsedMs,
    nodesExpanded: debug?.nodesExpanded || 0,
    maxDepth: debug?.maxDepth || 0,
    firstSolvingAttempt,
    solvingAttemptIdx,
    overheadBeforeSolveMs,
    solveAttemptMs,
    attemptCount: attemptSummary.length,
    attemptSummary,
    stagesTriedCount: rawStagesTried.length,
  };
}

// ─── Variant runner ───────────────────────────────────────────────────────────
async function runVariant(variant, levelNumbers, rawLevels) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`[${variant.id}] ${variant.desc}`);
  console.log(`  config: ${JSON.stringify(variant.config)}`);
  console.log(`  levels: ${levelNumbers.length}  budget: ${budgetMs}ms`);

  const variantStart = Date.now();
  const levelResults = [];
  let solvedCount = 0, failureCount = 0, errorCount = 0;

  for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    if (!raw) { levelResults.push({ level: levelNumber, status: 'error', error: 'no-raw-level', ok: false, elapsedMs: 0, attempts: [] }); errorCount++; continue; }

    const result = await solveLevel(levelNumber, raw, variant.config);
    levelResults.push(result);

    if (result.status === 'error') errorCount++;
    else if (result.ok) solvedCount++;
    else failureCount++;

    const solveTag = result.ok ? '✓' : (result.status === 'error' ? '!' : '✗');
    const techTag = result.firstSolvingAttempt ? ` [${result.firstSolvingAttempt}]` : '';
    const overheadTag = result.overheadBeforeSolveMs > 0 ? ` overhead=${result.overheadBeforeSolveMs}ms` : '';
    process.stdout.write(`  L${String(levelNumber).padStart(3)} ${solveTag} ${result.elapsedMs}ms${techTag}${overheadTag}\n`);
    if (verbose && result.attemptSummary.length > 0) {
      for (const a of result.attemptSummary) {
        const s = a.solved ? '✓' : '·';
        process.stdout.write(`       ${s} ${a.label||'?'} ${a.elapsedMs||0}ms depth=${a.depthReached||0}\n`);
      }
    }
  }

  const totalMs = Date.now() - variantStart;
  const summary = { solved: solvedCount, failed: failureCount, errors: errorCount, total: levelNumbers.length, totalMs };
  console.log(`  → ${solvedCount}/${levelNumbers.length} solved in ${(totalMs/1000).toFixed(1)}s`);
  return { ...variant, levels: levelResults, summary };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
const rawLevels = await loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels.`);

const levelNumbers = levelFilter
  ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
  : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`Levels: ${levelNumbers.length}   Budget: ${budgetMs}ms   Experiment: ${experiment}`);
console.log(`Variants to run: ${variants.length}`);
for (const v of variants) console.log(`  [${v.id}] ${v.desc}`);

const stamp = utcStamp();
const sha = getCommitSha();
const outputDir = outputDirArg || path.join('audits', 'ablation', `${stamp.slice(0,16)}-${sha.slice(0,8)}`);
await mkdir(outputDir, { recursive: true });
console.log(`\nOutput → ${outputDir}`);

const levelClassifications = {};
for (const n of levelNumbers) {
  const raw = rawLevels[n - 1];
  if (raw) levelClassifications[n] = classifyLevel(raw);
}

const manifest = {
  experiment,
  timestamp: new Date().toISOString(),
  commitSha: sha,
  budgetMs,
  purpose,
  levelCount: levelNumbers.length,
  levels: levelNumbers,
  levelClassifications,
  techniques: techniques.map(t => ({ id: t.id, prefix: t.prefix, desc: t.desc })),
  variants: variants.map(v => ({ id: v.id, desc: v.desc, config: v.config, outputFile: v.outputFile })),
};
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const overallStart = Date.now();
const completedVariants = [];

for (const variant of variants) {
  const variantResult = await runVariant(variant, levelNumbers, rawLevels);
  const output = {
    variantId: variant.id,
    desc: variant.desc,
    config: variant.config,
    commitSha: sha,
    timestamp: new Date().toISOString(),
    budgetMs,
    levelCount: levelNumbers.length,
    summary: variantResult.summary,
    levels: variantResult.levels,
  };
  const outPath = path.join(outputDir, variant.outputFile);
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  completedVariants.push({ variantId: variant.id, outputFile: variant.outputFile, summary: variantResult.summary });
  console.log(`  Saved ${variant.outputFile}`);
}

// Update manifest with completion info
const finalManifest = {
  ...manifest,
  completedAt: new Date().toISOString(),
  totalElapsedMs: Date.now() - overallStart,
  completedVariants,
};
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(finalManifest, null, 2) + '\n', 'utf8');

console.log(`\n${'═'.repeat(72)}`);
console.log(`Ablation complete: ${variants.length} variant(s), ${levelNumbers.length} level(s)`);
console.log(`Total time: ${((Date.now() - overallStart)/1000).toFixed(1)}s`);
console.log(`Output: ${outputDir}`);
console.log(`\nNext step: node scripts/analyze-ablation.mjs --input-dir=${outputDir}`);
