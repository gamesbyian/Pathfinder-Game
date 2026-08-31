import assert from 'node:assert/strict';
import { findPhase12Residue } from './naming-cleanup-phase12-closeout.mjs';

assert.deepEqual(
  findPhase12Residue('fixture.ts', 'if (event.type === GameEventType.WIN) onWin();'),
  [],
);
assert.ok(findPhase12Residue('fixture.ts', 'if (event.type === ActionType.WIN) onWin();').length > 0);
assert.ok(findPhase12Residue('fixture.ts', 'export const GameCommandType = Object.freeze({ MOVE: "MOVE" });').length > 0);

console.log('Phase-12 runtime vocabulary residue guard negative fixtures passed.');
