import assert from 'node:assert/strict';
import { analyze, CLASSIFICATIONS } from './analyze-repair-reconstruction-static-features.mjs';

const level = (id, overrides = {}) => ({
    id, grid: { w: 10, h: 10 }, gates: [{ x: 1, y: 1 }], goal: { x: 8, y: 8 },
    falseGoals: [], reqLen: 20, reqInt: 2, blocks: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [], geese: [], landmarks: [], ...overrides,
});

// Build a synthetic corpus covering every classified level id with a feature that clearly
// separates the two outcome groups (reqInt higher for operator-incapable) so the effect-size and
// correlation machinery can be checked deterministically.
const byId = new Map();
let i = 0;
for (const [id, cls] of Object.entries(CLASSIFICATIONS)) {
    // Small jitter (i % 3) keeps within-group variance nonzero so standardizedDifference is defined,
    // while the +8 group offset still dominates it.
    byId.set(id, level(id, { reqInt: (cls.outcome === 'operator-incapable' ? 10 : 2) + (i++ % 3) }));
}

const result = analyze(byId);

assert.equal(result.n, Object.keys(CLASSIFICATIONS).length);
assert.equal(result.reconstructableCount + result.operatorIncapableCount, result.n);
assert.equal(result.reconstructableCount, 8); // R00630, R02449, R02257, R02426, R02134, R02344, R02990, R03104

const reqIntEffect = result.operatorIncapableVsReconstructableEffects.find((e) => e.feature === 'reqInt');
assert.ok(reqIntEffect.groupAMean > reqIntEffect.groupBMean); // operator-incapable (group A) has the higher synthetic reqInt
assert.ok(Math.abs(reqIntEffect.standardizedDifference) > 1); // large, clean synthetic separation

assert.equal(result.costSampleSize, Object.values(CLASSIFICATIONS).filter((c) => Number.isFinite(c.costMultiple)).length);

assert.throws(() => analyze(new Map()), /not found in corpus/);

console.log('analyze-repair-reconstruction-static-features tests passed');
