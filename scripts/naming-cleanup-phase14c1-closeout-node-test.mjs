import assert from 'node:assert/strict';
import { findPhase14C1Residue } from './naming-cleanup-phase14c1-closeout.mjs';

for (const source of [
  'interface HinterState {}',
  'const x = createHinterState();',
  'function publicDrawPath() {}',
  'runtime.pendingAction = fn;',
  'engine.setPendingAction(fn);',
  'engine.clearPendingAction();',
  'engine.executePendingAction();',
  'setRuntimePendingAction(state, fn);',
]) {
  assert.ok(findPhase14C1Residue('fixture.ts', source).length > 0, source);
}

assert.deepEqual(
  findPhase14C1Residue(
    'fixture.ts',
    'interface HintDisplayState {}\nfunction drawPathWithCurrentOrientation() {}\nruntime.pendingConfirmationAction = fn;\nengine.setPendingConfirmationAction(fn);',
  ),
  [],
);

console.log('Phase-14C1 local-name residue negative fixtures passed.');
