#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { normalizeSolverStageId } from '../modules/solver/stage-id-normalization.mjs';
import { normalizeRoutingRegime } from '../modules/solver/routing-regime-normalization.mjs';

assert.equal(
  normalizeAttemptIdentityKey('beam:intersectionHarvest@beam5000(diverse)'),
  'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
);
assert.equal(
  normalizeAttemptIdentityKey('beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'),
  'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
);

assert.equal(normalizeSolverStageId('main-loop'), 'main-search');
assert.equal(normalizeSolverStageId('repair-probe'), 'early-repair-search');
assert.equal(normalizeSolverStageId('portfolio-pass'), 'legacy-latency-portfolio-pass');
assert.equal(normalizeSolverStageId('main-search'), 'main-search');

assert.equal(normalizeRoutingRegime('default'), 'general');
assert.equal(normalizeRoutingRegime('high-intersection-burden'), 'intersection-heavy');
assert.equal(normalizeRoutingRegime('portal-heavy'), 'multi-portal');
assert.equal(normalizeRoutingRegime('intersection-heavy'), 'intersection-heavy');

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
for (const current of ['solver:regression', 'solver:measure-speed', 'stress:measure-solver', 'solver:direct']) {
  assert.equal(typeof pkg.scripts?.[current], 'string', `current command missing: ${current}`);
}
const retiredCommands = [
  ['solver:', 'bench'].join(''),
  ['solver:', 'speed-', 'probe'].join(''),
  ['stress:', 'bench', 'mark'].join(''),
];
for (const retired of retiredCommands) {
  assert.equal(pkg.scripts?.[retired], undefined, `retired command unexpectedly live: ${retired}`);
}
assert.match(pkg.scripts['solver:direct'], /run-solver-direct\.mjs/u);
assert.ok(!pkg.scripts['solver:direct'].includes(['run-solver', 'v2-direct.mjs'].join('')));

const bridge = readFileSync(new URL('../docs/solver-research-post-naming-resumption.md', import.meta.url), 'utf8');
for (const required of [
  'normalizeAttemptIdentityKey',
  'normalizeSolverStageId',
  'normalizeRoutingRegime',
  'readRawChallengeMetrics',
  'solver:regression',
  'NC-P15-001',
  'NC-P15-002',
  'NC-P15-003',
  'NC-P15-004',
  'NC-P15-005',
  'NC-P15-006',
  'NC-P15-007',
]) {
  assert.ok(bridge.includes(required), `resumption bridge missing required contract reference: ${required}`);
}

console.log('solver research resumption bridge: historical identities normalize and current command vocabulary is live.');
