#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateSweepIntegrity } from './validate-solver-sweep-integrity.mjs';

const expectedIds = ['R00001', 'R00002', 'R00003'];
const levels = [
  { id: 'R00001', attempts: [{ stageId: 'late-retry', workSpent: 12, nodesExpanded: 4 }] },
  { id: 'R00002', attempts: [{ stageId: 'late-retry', workSpent: 0, nodesExpanded: 0 }] },
  { id: 'R00003', attempts: [] },
];

const ok = validateSweepIntegrity({ expectedIds, levels, requiredStage: 'late-retry', minParticipatingLevels: 1 });
assert.equal(ok.complete, true);
assert.equal(ok.participation.participatingLevels, 1);
assert.equal(ok.participation.workSpent, 12);

assert.throws(
  () => validateSweepIntegrity({ expectedIds, levels: levels.slice(0, 2) }),
  /missing results: R00003/,
);
assert.throws(
  () => validateSweepIntegrity({ expectedIds, levels: [...levels, { id: 'R99999' }] }),
  /unexpected results: R99999/,
);
assert.throws(
  () => validateSweepIntegrity({ expectedIds, levels: [...levels, levels[0]] }),
  /duplicate results: R00001/,
);
assert.throws(
  () => validateSweepIntegrity({ expectedIds, levels, requiredStage: 'late-retry', minParticipatingLevels: 2 }),
  /participated on 1 level\(s\), below required minimum 2/,
);

console.log('validate-solver-sweep-integrity-node-test: ok');
