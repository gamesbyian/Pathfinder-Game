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

// ── Gate + goal flanking a MustCross on opposite sides (infeasible) ──────────────
// A MustCross needs one H pass AND one V pass; if a gate sits on one orthogonal side and the goal
// on the directly-opposite side, the axis through that pair can never be crossed twice (gate cells
// can't be re-entered; the goal is the terminus). Verified infeasible via SolverV2. A gate OR goal
// alone on one side stays solvable, so both-and-opposite is required to flag.
function makeFlankLevel({ gates, goal, mustCross }) {
  return {
    grid: { w: 5, h: 5 },
    gateKeys: gates,
    goalKey: goal,
    falseGoalKeys: new Set(),
    blockSet: new Set(),
    gooseSet: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [mustCross],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
  };
}
const FLANK_REASON = 'Gate and goal flank MustCross on opposite sides at (3,3)';

// Horizontal flank: gate left (1,2)=P(1,2), goal right (3,2)=P(3,2), mustCross (2,2)=P(2,2). (0-indexed)
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(1, 2)], goal: P(3, 2), mustCross: P(2, 2) }));
  assert.ok(r.reasons.includes(FLANK_REASON), `H gate/goal flank must be flagged: ${r.reasons.join(', ')}`);
}
// Vertical flank: gate top (2,1), goal bottom (2,3), mustCross (2,2).
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(2, 1)], goal: P(2, 3), mustCross: P(2, 2) }));
  assert.ok(r.reasons.includes(FLANK_REASON), `V gate/goal flank must be flagged: ${r.reasons.join(', ')}`);
}
// Swapped (goal left, gate right) — same infeasibility, must also flag.
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(3, 2)], goal: P(1, 2), mustCross: P(2, 2) }));
  assert.ok(r.reasons.includes(FLANK_REASON), `swapped gate/goal flank must be flagged: ${r.reasons.join(', ')}`);
}
// CONTROL — gate adjacent but goal NOT opposite (goal far): must NOT flag the flank reason (solvable).
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(1, 2)], goal: P(4, 4), mustCross: P(2, 2) }));
  assert.ok(!r.reasons.includes(FLANK_REASON), `gate alone must not be flagged as flank: ${r.reasons.join(', ')}`);
}
// CONTROL — goal adjacent but gate NOT opposite (gate far): must NOT flag the flank reason (solvable).
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(0, 0)], goal: P(3, 2), mustCross: P(2, 2) }));
  assert.ok(!r.reasons.includes(FLANK_REASON), `goal alone must not be flagged as flank: ${r.reasons.join(', ')}`);
}
// CONTROL — gate + goal flank on PERPENDICULAR sides (not opposite): solvable, must NOT flag.
{
  const r = validateLevelDetailed(makeFlankLevel({ gates: [P(1, 2)], goal: P(2, 1), mustCross: P(2, 2) }));
  assert.ok(!r.reasons.includes(FLANK_REASON), `perpendicular flank must not be flagged: ${r.reasons.join(', ')}`);
}

console.log('editor-validation: gate/goal-flank MustCross checks passed');
