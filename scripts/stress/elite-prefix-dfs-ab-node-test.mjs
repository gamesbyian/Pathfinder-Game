#!/usr/bin/env node
/**
 * Regression coverage for elite-prefix-dfs-ab.mjs's flip-recording branch: it used to read
 * `repairConfig.profileName`, a field AttemptConfig (modules/solver/types.ts) renamed to
 * `scoringProfileId` in Phase 5 — repairConfig here is an in-memory object with no dual-read
 * fallback, so every flip row this diagnostic ever printed silently reported `scoringProfile: undefined`.
 */
import assert from 'node:assert/strict';
import { buildFlipRecord } from './elite-prefix-dfs-ab.mjs';

const onResult = { path: [1, 2, 3] };
const offResult = { path: null };
const repairConfig = { repair: true, scoringProfileId: 'repair', profileName: undefined };

const flip = buildFlipRecord('R00042', onResult, offResult, 500, 900, repairConfig);
assert.equal(flip.scoringProfile, 'repair', 'flip record must read the current scoringProfileId field, not the removed profileName');
assert.notEqual(flip.scoringProfile, undefined);
assert.equal(flip.id, 'R00042');
assert.equal(flip.solvedOn, true);
assert.equal(flip.solvedOff, false);
assert.equal(flip.nodesOn, 500);
assert.equal(flip.nodesOff, 900);

assert.equal(buildFlipRecord(null, onResult, offResult, 0, 0, repairConfig).id, '(no id)');

console.log('elite-prefix-dfs-ab: all tests passed');
