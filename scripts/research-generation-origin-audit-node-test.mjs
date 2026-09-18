import assert from 'node:assert/strict';
import { auditOriginRecognizability } from './research-generation-origin-audit-lib.mjs';

function level(id, size, reqLen, reqInt) {
  return {
    id,
    grid: { w: size, h: size },
    reqLen,
    reqInt,
    gates: [{ x: 1, y: 1 }],
    goal: { x: size, y: size },
    blocks: [],
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

const separated = auditOriginRecognizability([
  { name: 'small', levels: Array.from({ length: 10 }, (_, i) => level(`A${i}`, 6, 12 + i % 2, 0)) },
  { name: 'large', levels: Array.from({ length: 10 }, (_, i) => level(`B${i}`, 14, 90 + i % 2, 8)) },
], { dimensions: ['area', 'reqLen', 'reqInt'], folds: 5 });
assert.equal(separated.tested, 20);
assert.equal(separated.accuracy, 1);
assert.equal(separated.chanceBaseline, 0.5);
assert.equal(separated.dimensionSeparation.length, 3);

assert.throws(() => auditOriginRecognizability([
  { name: 'a', levels: [level('A', 6, 12, 0)] },
  { name: 'b', levels: [level('B', 6, 12, 0)] },
]), /at least two levels/);

console.log('research-generation-origin-audit-node-test: ok');
