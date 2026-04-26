import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../Solver.js', import.meta.url), 'utf8');
const levelsJs = await readFile(new URL('../levels.js', import.meta.url), 'utf8');

const levelsCtx = { window: {} };
vm.createContext(levelsCtx);
vm.runInContext(levelsJs, levelsCtx, { filename: 'levels.js' });
const rawLevels = levelsCtx.window.RAW_LEVELS;

const start = html.indexOf('const detectRapidCollapseSignature = ({ baselineResult = null } = {}) => {');
const end = html.indexOf('function withZeroExpansionSummary(entry = {}, statusPath = \'unknown\', droppedBy = \'unknown\') {');
if (start < 0 || end < 0 || end <= start) throw new Error('Unable to locate root fallback helper functions in Solver.js');
const helperSource = html.slice(start, end);

const ctx = {
  getPreExpansionAbort: (debug = {}) => debug?.preExpansionAbortObj || null,
  getDepthZeroReason: (debug = {}) => debug?.depthZeroReason || null,
  buildSearchDiagnostics: (debug = {}, status = 'unknown') => ({
    nodesExpanded: Math.max(0, Number(debug?.nodesExpanded) || 0),
    returnedWithoutExpansion: (Math.max(0, Number(debug?.nodesExpanded) || 0) === 0) || status === 'no-solution-inconclusive'
  }),
  makeRootSearchSummary: (debug = {}) => ({
    rootCandidatesGenerated: Math.max(0, Number(debug?.rootCandidatesGenerated) || 0),
    rootCandidatesExpanded: Math.max(0, Number(debug?.rootCandidatesExpanded) || 0)
  })
};
vm.createContext(ctx);
vm.runInContext(`${helperSource}\n;globalThis.__hasRootInteractionComplexity = hasRootInteractionComplexity;globalThis.__shouldActivateInteractionRootFallback = shouldActivateInteractionRootFallback;`, ctx, { filename: 'root-fallback-helpers.js' });

const toNormalizedShape = (raw) => ({
  filterMap: new Map((raw.filters || []).map((f, idx) => [idx, f.axis])),
  flippingFilterMap: new Map((raw.flippingFilters || []).map((f, idx) => [idx, f.axis])),
  portalMap: new Map((raw.portals || []).flatMap((p, idx) => [[idx * 2, { dest: idx * 2 + 1 }], [idx * 2 + 1, { dest: idx * 2 }]])),
  mustPassKeys: raw.mustPass || [],
  mustCrossKeys: raw.mustCross || []
});

for (const levelNum of [24, 45, 87, 95]) {
  const level = toNormalizedShape(rawLevels[levelNum - 1]);
  const baselineCollapse = {
    status: 'no-solution-inconclusive',
    diagnosticsSummary: { nodesExpanded: 0, returnedWithoutExpansion: true },
    rootSearchSummary: { rootCandidatesGenerated: 0, rootCandidatesExpanded: 0 }
  };
  const collapseDecision = ctx.__shouldActivateInteractionRootFallback({ baselineResult: baselineCollapse, level });
  const interaction = ctx.__hasRootInteractionComplexity(level);
  assert.equal(collapseDecision.interactionComplex, interaction, `interaction classification mismatch for L${levelNum}`);
  assert.equal(collapseDecision.activate, true, `collapse activation mismatch for L${levelNum}`);

  const healthyBaseline = {
    status: 'no-solution-inconclusive',
    diagnosticsSummary: { nodesExpanded: 50, returnedWithoutExpansion: false },
    rootSearchSummary: { rootCandidatesGenerated: 6, rootCandidatesExpanded: 4 }
  };
  const healthyDecision = ctx.__shouldActivateInteractionRootFallback({ baselineResult: healthyBaseline, level });
  assert.equal(healthyDecision.activate, false, `healthy baseline should not activate fallback for L${levelNum}`);
}

console.log('Pre-expansion root fallback smoke checks passed for levels 24, 45, 87, and 95.');
