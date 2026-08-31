import assert from 'node:assert/strict';
import { findPhase14BResidue } from './naming-cleanup-phase14-level-utils-closeout.mjs';

assert.deepEqual(
  findPhase14BResidue('fixture.ts', "import { PACK } from './domain/cell-key.js'; const levelData = {};"),
  [],
);
assert.ok(findPhase14BResidue('fixture.ts', "import { createLevelUtils } from './level-utils.js';").length > 0);
assert.ok(findPhase14BResidue('fixture.ts', 'const levelUtils = deps.levelUtils;').length > 0);
assert.ok(findPhase14BResidue('fixture.ts', 'function f(x: LevelUtils) { return x; }').length > 0);

console.log('Phase-14B LevelUtils residue negative fixtures passed.');
