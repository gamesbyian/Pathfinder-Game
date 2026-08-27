import { test } from 'vitest';

import { runDeadlockSoundnessRoot } from './lower-bounds-test-support.test.js';

const deepTest =
  process.env.SOLVER_DEEP_TESTS === '0' || process.env.SOLVER_DEADLOCK_PROOF_SKIP === '1'
    ? test.skip
    : test;

deepTest('property: deadlock helpers only report independently unsatisfiable reachable states (root 1)', () => {
  runDeadlockSoundnessRoot(1);
});
