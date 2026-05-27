#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

if (typeof globalThis.window === 'undefined') {
  globalThis.window = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
}

const { installSolver } = await import('../Solver.js');

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.split('='); return [k, v ?? '']; }));
const outputFile = argMap.get('--output') || 'audits/hint-validation/runtime-latest.json';
const verbose = argMap.has('--verbose');
const levelsFilter = (() => {
  const raw = argMap.get('--levels');
  if (!raw) return null;
  return new Set(raw.split(',').map(v => Number(v.trim())).filter(n => Number.isFinite(n) && n > 0));
})();

function extractIifeAssignment(source, token) {
  const start = source.indexOf(token);
  if (start < 0) throw new Error(`Unable to locate token: ${token}`);
  const openBrace = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const semicolon = source.indexOf(';', end);
  return source.slice(start, semicolon + 1);
}

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const coreSource = extractIifeAssignment(html, 'APP.Core = (() => {');
const levelUtilsSource = extractIifeAssignment(html, 'APP.LevelUtils = (() => {');

const runtimeCtx = {
  APP: { State: { ENGINE: { moveFailureReason: null } } },
  window: {},
  document: {},
  console,
  setTimeout,
  clearTimeout
};
vm.createContext(runtimeCtx);
vm.runInContext(coreSource, runtimeCtx, { filename: 'core-slice.js' });
vm.runInContext(levelUtilsSource, runtimeCtx, { filename: 'levelutils-slice.js' });

const APP = {
  Core: runtimeCtx.APP.Core,
  LevelUtils: {
    ...runtimeCtx.APP.LevelUtils,
    deepCloneLevel(src) {
      const clone = {
        ...src,
        grid: { ...src.grid },
        gateKeys: [...(src.gateKeys || [])],
        mustPassKeys: [...(src.mustPassKeys || [])],
        mustCrossKeys: [...(src.mustCrossKeys || [])],
        hints: Array.isArray(src.hints) ? src.hints.map(h => Array.isArray(h) ? h.slice() : h) : [],
        blockSet: new Set(src.blockSet || []),
        gooseSet: new Set(src.gooseSet || []),
        falseGoalKeys: new Set(src.falseGoalKeys || []),
        portalMap: new Map(),
        portalVisuals: Array.isArray(src.portalVisuals) ? src.portalVisuals.map(v => ({ ...v })) : [],
        filterMap: new Map(src.filterMap || []),
        flippingFilterMap: new Map(src.flippingFilterMap || [])
      };
      if (src.portalMap?.forEach) src.portalMap.forEach((v, k) => clone.portalMap.set(k, v && typeof v === 'object' ? { ...v } : v));
      return clone;
    }
  },
  Engine: {
    setOverlayState() {},
    areWinMetricsSatisfied(state, level) {
      if (!level || !state.path.length) return false;
      const curLen = state.path.length > 0 ? state.path.length - 1 - state.isPortalJump.size : 0;
      if (curLen !== level.reqLen || state.intersections !== level.reqInt) return false;
      const allMustPass = level.mustPassKeys.every(k => state.visitedCounts.get(k) > 0);
      const allMustCross = level.mustCrossKeys.every(k => (state.visitedCounts.get(k) || 0) >= 2);
      return allMustPass && allMustCross;
    }
  },
  UI: { showMessage() {}, setModalContent() {}, setSolverTimerText() {}, setButtonState() {}, setSolverDetailText() {}, setSolverProgress() {} },
  State: { ENGINE: { flags: {}, isDevMode: false, activeSolverController: null, solverAbortRequested: false } },
  Editor: { setWorkingLevelHintsFromSolutions() {} },
  Debug: { register() {} }
};

const Solver = installSolver(APP);

async function loadRawLevels() {
  const src = await readFile(new URL('../levels.js', import.meta.url), 'utf8');
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(src, ctx, { filename: 'levels.js' });
  return ctx.window.RAW_LEVELS;
}

function normalizeRaw(raw, idx) {
  const adj = (v) => v - 1;
  const P = (x, y) => APP.LevelUtils.PACK(adj(x), adj(y));
  const l = {
    id: idx,
    grid: { ...raw.grid },
    reqLen: raw.reqLen,
    reqInt: raw.reqInt,
    goalKey: P(raw.goal.x, raw.goal.y),
    gateKeys: (raw.gates || []).map(g => P(g.x, g.y)),
    blockSet: new Set((raw.blocks || []).map(b => P(b.x, b.y))),
    gooseSet: new Set((raw.geese || []).map(g => P(g.x, g.y))),
    falseGoalKeys: new Set((raw.falseGoals || []).map(g => P(g.x, g.y))),
    portalMap: new Map(),
    portalVisuals: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    mustPassKeys: (raw.mustPass || []).map(m => P(m.x, m.y)),
    mustCrossKeys: (raw.mustCross || []).map(m => P(m.x, m.y)),
    hints: Array.isArray(raw.hints) ? raw.hints.map(h => h.slice()) : []
  };
  (raw.portals || []).forEach(p => {
    const k1 = P(p.x1, p.y1), k2 = P(p.x2, p.y2);
    l.portalMap.set(k1, { dest: k2 });
    l.portalMap.set(k2, { dest: k1 });
    l.portalVisuals.push({ k1, k2, color: p.color || '#d946ef' });
  });
  (raw.filters || []).forEach(f => l.filterMap.set(P(f.x, f.y), f.axis));
  (raw.flippingFilters || []).forEach(f => l.flippingFilterMap.set(P(f.x, f.y), f.axis));
  return l;
}

const raws = await loadRawLevels();
const results = [];
let levelsWithInvalidFresh = 0;
let levelsWithInvalidShared = 0;
let totalInvalidFresh = 0;
let totalInvalidShared = 0;
let levelsWithReuseDivergence = 0;

for (let i = 0; i < raws.length; i++) {
  const levelNumber = i + 1;
  if (levelsFilter && !levelsFilter.has(levelNumber)) continue;
  const raw = raws[i];
  const hints = Array.isArray(raw?.hints) ? raw.hints : [];
  if (!hints.length) {
    results.push({ levelNumber, status: 'no-hints' });
    continue;
  }
  const canonical = normalizeRaw(raw, i);
  const sharedValidationLevel = APP.LevelUtils.deepCloneLevel(canonical);

  const hintAnalyses = hints.map((hintPath, hintIndex) => {
    const fresh = Solver.validateCandidatePath(APP.LevelUtils.deepCloneLevel(canonical), hintPath);
    const shared = Solver.validateCandidatePath(sharedValidationLevel, hintPath);
    return {
      hintIndex,
      fresh: { ok: !!fresh?.ok, reason: fresh?.reason || null },
      shared: { ok: !!shared?.ok, reason: shared?.reason || null },
      divergedByReuse: (!!fresh?.ok) !== (!!shared?.ok) || (fresh?.reason || null) !== (shared?.reason || null)
    };
  });

  const invalidFreshCount = hintAnalyses.filter(h => !h.fresh.ok).length;
  const invalidSharedCount = hintAnalyses.filter(h => !h.shared.ok).length;
  const hasReuseDivergence = hintAnalyses.some(h => h.divergedByReuse);
  if (invalidFreshCount > 0) levelsWithInvalidFresh++;
  if (invalidSharedCount > 0) levelsWithInvalidShared++;
  if (hasReuseDivergence) levelsWithReuseDivergence++;
  totalInvalidFresh += invalidFreshCount;
  totalInvalidShared += invalidSharedCount;

  if (verbose && (invalidFreshCount > 0 || invalidSharedCount > 0 || hasReuseDivergence)) {
    console.log(`L${levelNumber}: invalidFresh=${invalidFreshCount}/${hints.length}, invalidShared=${invalidSharedCount}/${hints.length}, reuseDivergence=${hasReuseDivergence}`);
  }

  results.push({ levelNumber, totalHints: hints.length, invalidFreshCount, invalidSharedCount, hasReuseDivergence, hintAnalyses });
}

const report = {
  summary: {
    timestamp: new Date().toISOString(),
    levelsChecked: results.length,
    levelsWithInvalidFresh,
    levelsWithInvalidShared,
    totalInvalidFresh,
    totalInvalidShared,
    levelsWithReuseDivergence
  },
  results
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');
console.log('Runtime hint validation complete:', report.summary);
console.log(`Results written to ${outputFile}`);
