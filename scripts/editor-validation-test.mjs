import assert from 'node:assert/strict';
import { PACK } from '../modules/domain/cell-key.js';
import { validateLevelDetailed } from '../modules/domain/level-validation.js';

const P = PACK;

function makeBaseLevel() {
  return {
    grid: { w: 5, h: 5 },
    gateKeys: [P(0, 0)],
    goalKey: P(4, 4),
    falseGoalKeys: new Set(),
    blockSet: new Set(),
    gooseSet: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [P(2, 2)],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
  };
}

for (const [label, applyObstacle] of [
  ['block', (level) => level.blockSet.add(P(3, 3))],
  ['goose', (level) => level.gooseSet.add(P(3, 3))],
  ['false goal', (level) => level.falseGoalKeys.add(P(3, 3))],
]) {
  const level = makeBaseLevel();
  applyObstacle(level);
  const result = validateLevelDetailed(level);
  assert.equal(
    result.ok,
    true,
    `${label} diagonally adjacent to MustCross should be valid: ${result.reasons.join(', ')}`,
  );
}

{
  const level = makeBaseLevel();
  level.blockSet.add(P(3, 2));
  const result = validateLevelDetailed(level);
  assert.equal(result.ok, false, 'orthogonal block adjacent to MustCross should still be invalid');
  assert.ok(result.reasons.includes('Block adjacent to MustCross at (3,3)'));
}
