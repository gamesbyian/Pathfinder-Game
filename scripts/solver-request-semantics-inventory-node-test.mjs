#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RACE_LEVEL_OPTS_FIELDS } from './solver-parallel/race-opts.mjs';

const contracts = fs.readFileSync('modules/solver/orchestration-contracts.ts', 'utf8');
const inventory = JSON.parse(fs.readFileSync('docs/solver-request-semantics-inventory.json', 'utf8'));

const start = contracts.indexOf('export interface SolveOpts');
assert.notEqual(start, -1, 'SolveOpts interface not found');
const tail = contracts.slice(start);
const end = tail.indexOf('\n}');
assert.notEqual(end, -1, 'SolveOpts interface end not found');
const block = tail.slice(0, end + 2);
const fields = [...block.matchAll(/^\s{4}([A-Za-z0-9_]+)\??\s*:/gm)].map(m => m[1]);
const rows = inventory.commonSolveOpts ?? [];
const invFields = rows.map(row => row.field);

assert.deepEqual([...invFields].sort(), [...fields].sort(),
  'SolveOpts membership changed without updating docs/solver-request-semantics-inventory.json');

for (const row of rows) {
  assert.equal(typeof row.semanticClass, 'string', `${row.field}: semanticClass missing`);
  assert.equal(typeof row.effect, 'string', `${row.field}: effect missing`);
  assert.equal(typeof row.canonicalDefaultSemantics, 'string', `${row.field}: canonicalDefaultSemantics missing`);
  assert.equal(typeof row.identityParticipation, 'string', `${row.field}: identityParticipation missing`);
  assert.equal(typeof row.backendSupport?.direct, 'string', `${row.field}: direct backend classification missing`);
  assert.equal(typeof row.backendSupport?.webWorker, 'string', `${row.field}: worker backend classification missing`);
  assert.equal(typeof row.backendSupport?.raced, 'string', `${row.field}: raced backend classification missing`);
}

const raceCommon = RACE_LEVEL_OPTS_FIELDS.filter(field => field !== 'overallBudgetMs').sort();
assert.deepEqual([...(inventory.backendRequests?.raced?.supportedCommonFields ?? [])].sort(), raceCommon,
  'RACE_LEVEL_OPTS_FIELDS changed without updating the raced semantic inventory');
const raceSpecific = new Set((inventory.backendRequests?.raced?.backendSpecificFields ?? []).map(row => row.field));
assert(raceSpecific.has('overallBudgetMs'), 'raced backend must classify overallBudgetMs');
assert(raceSpecific.has('poolSize'), 'raced backend must classify poolSize');
for (const row of inventory.backendRequests.raced.backendSpecificFields) {
  assert.equal(typeof row.canonicalDefaultSemantics, 'string', `raced.${row.field}: canonicalDefaultSemantics missing`);
  assert.equal(typeof row.identityParticipation, 'string', `raced.${row.field}: identityParticipation missing`);
}

console.log(`solver request semantics inventory: ${fields.length} SolveOpts fields classified; raced boundary classified`);
