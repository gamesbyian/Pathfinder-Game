#!/usr/bin/env node
import assert from 'node:assert/strict';
import { benchmarkSparseLevelDocument, sparseLevelCandidate } from './level-sparse-serialization-benchmark.mjs';

const level = {
  id:'L1', grid:{w:5,h:5}, gates:[{x:1,y:1}], goal:{x:5,y:5}, reqLen:8, reqInt:0,
  blocks:[], geese:[], falseGoals:[], mustPass:[], mustCross:[], landmarks:[],
  filters:[], flippingFilters:[], portals:[],
};
const sparse = sparseLevelCandidate(level);
for (const field of ['blocks','geese','falseGoals','mustPass','mustCross','landmarks','filters','flippingFilters','portals']) {
  assert.equal(Object.hasOwn(sparse, field), false);
}
const report = benchmarkSparseLevelDocument([level]);
assert.equal(report.levels,1);
assert.equal(report.omittedEmptyArrays,9);
assert.ok(report.targetBytes < report.sourceBytes);
console.log('level-sparse-serialization-benchmark-node-test: ok');
