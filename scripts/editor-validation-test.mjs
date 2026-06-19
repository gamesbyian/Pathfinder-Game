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
  ['filter', (level) => level.filterMap.set(P(3, 3), 1)],
  ['flipping filter', (level) => level.flippingFilterMap.set(P(3, 3), 1)],
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


// Both fixtures below trap the up-left diagonal of mustCross (3,3) by blocking the
// diagonal cell itself plus every alternate turn space hasAlternateTurnSpaceAroundDiagonal
// checks: the same-row/-column extensions ((1,2),(0,2) and (2,1),(2,0)) and both mirrored
// diagonals ((4,2) and (2,4)). Gate/goal sit far away on the opposite corners so they stay
// unaffected (no surround/connectivity side effects), isolating just the diagonal-trap check.
function makeDiagonalTrapLevel() {
  return {
    ...makeBaseLevel(),
    grid: { w: 7, h: 7 },
    gateKeys: [P(6, 0)],
    goalKey: P(0, 6),
    mustCrossKeys: [P(3, 3)],
  };
}

{
  const level = makeDiagonalTrapLevel();
  level.filterMap.set(P(2, 2), 1);
  for (const [x, y] of [[1, 2], [0, 2], [2, 1], [2, 0], [4, 2], [2, 4]]) level.blockSet.add(P(x, y));
  const result = validateLevelDetailed(level);
  assert.equal(result.ok, false, 'filter diagonal with no alternate turn space should be invalid');
  assert.ok(result.reasons.includes('Diagonal obstacle traps MustCross at (4,4)'));
}

{
  const level = makeDiagonalTrapLevel();
  for (const [x, y] of [[2, 2], [1, 2], [0, 2], [2, 1], [2, 0], [4, 2], [2, 4]]) level.blockSet.add(P(x, y));
  const result = validateLevelDetailed(level);
  assert.equal(result.ok, false, 'block diagonal with all alternate turn spaces blocked should be invalid');
  assert.ok(result.reasons.includes('Diagonal obstacle traps MustCross at (4,4)'));
}

// Regression guard for the bug this file's fix addresses: a diagonal obstacle adjacent to
// mustCross used to be flagged "trapped" whenever the same-row/-column extensions were blocked,
// even when the path could still turn back via a mirrored diagonal on the opposite side of the
// row or column — confirmed independently solvable via SolverV2 on level 156 with mustCross
// relocated to (5,2). Reproduced here in isolation: the diagonal cell plus both row/column
// extensions are blocked, but both mirror diagonals are left open, so it must be valid.
{
  const level = makeDiagonalTrapLevel();
  for (const [x, y] of [[2, 2], [1, 2], [0, 2], [2, 1], [2, 0]]) level.blockSet.add(P(x, y));
  const result = validateLevelDetailed(level);
  assert.equal(result.ok, true, 'diagonal obstacle with open mirror diagonals should be valid');
}
