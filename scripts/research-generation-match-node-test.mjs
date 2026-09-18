import assert from 'node:assert/strict';
import { buildMatchedGroups, staticMatchDistance } from './research-generation-match-lib.mjs';

function level(id, reqLen, reqInt, blocks = 0) {
  return {
    id,
    grid: { w: 10, h: 10 },
    reqLen,
    reqInt,
    gates: [{ x: 1, y: 1 }],
    goal: { x: 10, y: 10 },
    blocks: Array.from({ length: blocks }, (_, i) => ({ x: i + 2, y: 2 })),
    mustPass: [],
    mustCross: [],
    portals: [],
    flippingFilters: [],
    filters: [],
    geese: [],
    falseGoals: [],
    landmarks: [],
  };
}

assert.equal(staticMatchDistance(
  { area: 100, reqLen: 40 },
  { area: 100, reqLen: 40 },
  ['area', 'reqLen'],
), 0);

const result = buildMatchedGroups([
  { name: 'a', levels: [level('A1', 40, 2), level('A2', 70, 5)] },
  { name: 'b', levels: [level('Bfar', 71, 5), level('Bnear', 41, 2)] },
], {
  count: 2,
  dimensions: ['area', 'reqLen', 'reqInt', 'blocks'],
});
assert.equal(result.matchedCount, 2);
assert.equal(result.groups[0].members[1].id, 'Bnear');
assert.equal(result.groups[1].members[1].id, 'Bfar');

const caliper = buildMatchedGroups([
  { name: 'a', levels: [level('A', 20, 0)] },
  { name: 'b', levels: [level('B', 90, 9)] },
], {
  count: 1,
  maxDistance: 0.05,
  dimensions: ['reqLen', 'reqInt'],
});
assert.equal(caliper.matchedCount, 0);

console.log('research-generation-match-node-test: ok');
