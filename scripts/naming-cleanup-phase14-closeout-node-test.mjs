import assert from 'node:assert/strict';
import {
  RETAINED_QUALIFIED_CORES,
  RETAINED_CORE_ACTIONS,
  classifyPhase14CorePath,
} from './naming-cleanup-phase14-closeout.mjs';

assert.equal(classifyPhase14CorePath('modules/core.ts'), 'retired-top-level-facade');
assert.equal(classifyPhase14CorePath('modules/input/navigation-core.ts'), 'retained-qualified-core');
assert.equal(classifyPhase14CorePath(RETAINED_CORE_ACTIONS), 'retained-core-state-actions');
assert.equal(classifyPhase14CorePath('modules/app-constants.ts'), 'unrelated');
assert.equal(RETAINED_QUALIFIED_CORES.length, 7);
assert.ok(RETAINED_QUALIFIED_CORES.every(path => path.endsWith('-core.ts')));

console.log('Phase-14 retained core terminology classification fixtures passed.');
