import assert from 'node:assert/strict';
import { findCoreFacadeResidue } from './naming-cleanup-phase14-core-closeout.mjs';

assert.ok(findCoreFacadeResidue('modules/x.ts', 'const x = core.SOUND_BUS;').length > 0);
assert.ok(findCoreFacadeResidue('modules/x.ts', 'const x = createCore();').length > 0);
assert.ok(findCoreFacadeResidue('modules/x.ts', "import { createCore } from './core.js';").length > 0);
assert.ok(findCoreFacadeResidue('modules/x.ts', 'createThing({ core: dependency });').length > 0);

assert.deepEqual(
  findCoreFacadeResidue('modules/input/navigation-controller.ts', "import { next } from './navigation-core.js';"),
  [],
);
assert.deepEqual(
  findCoreFacadeResidue('modules/input/review-core.ts', "import { x } from './submission-core.js';"),
  [],
);

console.log('Phase-14A core facade residue negative fixtures passed.');
