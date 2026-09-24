#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    assertSolverRequestIdentity,
    solverRequestIdentityFromProjection,
} from './solver-request-identity-lib.mjs';

const projection = {
    schemaVersion: 1,
    kind: 'pathfinder-solver-request-projection',
    scheduler: { mode: 'production' },
    resourceEnvelope: { baseWorkBudget: 1000, nodeBudget: null, timeBudgetMs: 30000 },
};
const reordered = {
    resourceEnvelope: { timeBudgetMs: 30000, nodeBudget: null, baseWorkBudget: 1000 },
    kind: 'pathfinder-solver-request-projection',
    scheduler: { mode: 'production' },
    schemaVersion: 1,
};

const identity = solverRequestIdentityFromProjection(projection);
assert.match(identity, /^sha256:[0-9a-f]{64}$/u);
assert.equal(solverRequestIdentityFromProjection(reordered), identity,
    'object key insertion order must not affect request identity');
assert.equal(assertSolverRequestIdentity(projection, identity), identity);

assert.throws(
    () => assertSolverRequestIdentity(projection, 'sha256:' + '0'.repeat(64)),
    /identity mismatch/,
);
assert.throws(
    () => solverRequestIdentityFromProjection({ schemaVersion: 1, kind: 'wrong-kind' }),
    /unsupported solver request projection kind/,
);
assert.throws(
    () => solverRequestIdentityFromProjection({ schemaVersion: 0, kind: 'pathfinder-solver-request-projection' }),
    /positive integer schemaVersion/,
);

console.log('solver-request-identity-lib-node-test: ok');
