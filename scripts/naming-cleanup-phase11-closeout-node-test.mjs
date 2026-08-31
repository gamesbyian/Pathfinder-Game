import assert from 'node:assert/strict';
import { findPhase11RuntimeResidue } from './naming-cleanup-phase11-closeout.mjs';

assert.deepEqual(findPhase11RuntimeResidue('fixture.ts', 'const orientation = eng.orientation; setOrientation(state, orientation);'), []);
assert.ok(findPhase11RuntimeResidue('fixture.ts', 'setVariant(state, 3);').length > 0);
assert.ok(findPhase11RuntimeResidue('fixture.ts', 'const value = eng.variant;').length > 0);
assert.ok(findPhase11RuntimeResidue('fixture.ts', 'function transformPoint(x, y, variant) {}').length > 0);
assert.ok(findPhase11RuntimeResidue('fixture.ts', "test('all eight transform variants', () => {});").length > 0);

console.log('Phase-11 runtime residue guard negative fixtures passed.');
