import assert from 'node:assert/strict';
import { findPhase14C2Residue } from './naming-cleanup-phase14c2-closeout.mjs';

const old = 'state.' + 'ENGINE.mode = PLAY; window.APP.State.' + 'ENGINE.muted = false;';
assert.ok(findPhase14C2Residue('fixture.ts', old).length > 0);
assert.deepEqual(
  findPhase14C2Residue('fixture.ts', 'state.engineState.mode = PLAY; window.APP.State.engineState.muted = false;'),
  [],
);
console.log('Phase-14C2 engine-state root residue negative fixtures passed.');
