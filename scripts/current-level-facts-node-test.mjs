import assert from 'node:assert/strict';
import { deriveCurrentLevelFacts, renderCurrentLevelFacts } from './current-level-facts-lib.mjs';

const level = (id, overrides = {}) => ({
  id, grid: { w: 3, h: 3 }, mustPass: [], mustCross: [], portals: [], flippingFilters: [], landmarks: [], ...overrides,
});
const published = [
  level('P00001'),
  level('P00003', { grid: { w: 5, h: 5 }, mustPass: [{}, {}], portals: [{}], flippingFilters: [{}, {}], landmarks: [{}] }),
];
const facts = deriveCurrentLevelFacts(published, [[level('S00001', { mustCross: [{}, {}, {}], portals: [{}, {}] })]]);
assert.equal(facts.publishedCount, 2);
assert.deepEqual(facts.withdrawnIds, ['P00002']);
assert.equal(facts.lastIdAlignedPosition, 1);
assert.deepEqual(facts.publishedMaxima.flippingFilterLevelIds, ['P00003']);
assert.equal(facts.stressMaxima.mustCross, 3);
const rendered = renderCurrentLevelFacts(facts);
assert.match(rendered, /`P00002` withdrawn; ID != array position after 1/);
assert.match(rendered, /flipping filters 2 \(`P00003`\)/);
console.log('current-level-facts tests passed');
