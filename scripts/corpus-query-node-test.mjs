#!/usr/bin/env node
import assert from 'node:assert/strict';
import { describeLevel, deterministicSample, filterLevelDescriptors, summarizeDescriptors } from './corpus-query-lib.mjs';

const levels = [
    { id: 'A', grid: { w: 5, h: 5 }, reqLen: 12, reqInt: 1, gates: [{ x: 1, y: 1 }], portals: [], mustCross: [], stressMeta: { featureTags: ['small'], generationBatch: 'A' } },
    { id: 'B', grid: { w: 10, h: 10 }, reqLen: 80, reqInt: 8, gates: [{ x: 1, y: 1 }], portals: [{ x1: 1, y1: 2, x2: 9, y2: 9 }], mustCross: [{ x: 5, y: 5 }], stressMeta: { featureTags: ['portals', 'crossing-rich'], archetype: 'hard-crossing' } },
    { id: 'C', grid: { w: 8, h: 8 }, reqLen: 60, reqInt: 6, gates: [{ x: 1, y: 1 }], portals: [], mustCross: [{ x: 4, y: 4 }], stressMeta: { featureTags: ['crossing-rich'] } },
];
const items = levels.map(describeLevel);
assert.deepEqual(items[1].grid, [10, 10]);
assert.equal(items[1].counts.portals, 1);
assert.deepEqual(filterLevelDescriptors(items, { minReqInt: 7 }).map(item => item.id), ['B']);
assert.deepEqual(filterLevelDescriptors(items, { mechanic: 'portal' }).map(item => item.id), ['B']);
assert.equal(deterministicSample(items, 2, 'x').length, 2);
assert.deepEqual(deterministicSample(items, 2, 'x').map(x => x.id), deterministicSample(items, 2, 'x').map(x => x.id));
const summary = summarizeDescriptors(items);
assert.equal(summary.levels, 3);
assert.equal(summary.mechanics.gates, 3);
assert.equal(summary.mechanics.mustCross, 2);

// Corpora written before the routing-regime rename carry stressMeta.archetype/navDensity;
// current generate.mjs output carries stressMeta.routingRegime/requiredPathCoverageRatio.
// describeLevel() must dual-read both directions and normalize a recognized legacy regime value.
const legacyItem = describeLevel({ id: 'L', grid: { w: 4, h: 4 }, reqLen: 4, reqInt: 0, gates: [], portals: [], mustCross: [],
    stressMeta: { archetype: 'near-closure', navDensity: 0.5 } });
assert.equal(legacyItem.routingRegime, 'sparse-low-intersection', 'a legacy archetype value must normalize to its canonical routing regime');
assert.equal(legacyItem.requiredPathCoverageRatio, 0.5);

const canonicalItem = describeLevel({ id: 'M', grid: { w: 4, h: 4 }, reqLen: 4, reqInt: 0, gates: [], portals: [], mustCross: [],
    stressMeta: { routingRegime: 'multi-portal', requiredPathCoverageRatio: 0.75 } });
assert.equal(canonicalItem.routingRegime, 'multi-portal');
assert.equal(canonicalItem.requiredPathCoverageRatio, 0.75);

console.log('corpus query check passed');
