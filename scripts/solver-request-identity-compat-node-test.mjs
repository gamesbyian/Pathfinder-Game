#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stableStringify } from '../modules/canonical-json.mjs';
import {
    requireCanonicalSolverRequestIdentity,
    solverRequestIdentityAvailability,
} from './solver-request-identity-compat.mjs';
import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';

const projection = {
    schemaVersion: 1,
    kind: 'pathfinder-solver-request-projection',
    resourceEnvelope: { timeBudgetMs: 30000, nodeBudget: null, baseWorkBudget: 100500000 },
    scheduler: { mode: 'production' },
};
const identity = solverRequestIdentityFromProjection(projection);

assert.deepEqual(
    solverRequestIdentityAvailability({
        solverRequestProjection: projection,
        solverRequestIdentity: identity,
    }),
    {
        status: 'canonical',
        solverRequestIdentity: identity,
        solverRequestProjection: projection,
    },
);

const derived = solverRequestIdentityAvailability({ solverRequestProjection: projection });
assert.equal(derived.status, 'canonical');
assert.equal(derived.solverRequestIdentity, identity);

const badCanonical = solverRequestIdentityAvailability({
    solverRequestProjection: projection,
    solverRequestIdentity: 'sha256:' + '0'.repeat(64),
});
assert.equal(badCanonical.status, 'invalid-canonical');

const effectiveConfig = { schedulerMode: 'production', workBudget: 1000 };
const effectiveConfigDigest = createHash('sha256').update(stableStringify(effectiveConfig)).digest('hex');
const legacy = solverRequestIdentityAvailability({ effectiveConfig, effectiveConfigDigest });
assert.equal(legacy.status, 'legacy-only');
assert.equal(legacy.effectiveConfigDigest, effectiveConfigDigest);
assert.equal(legacy.solverRequestIdentity, undefined,
    'legacy effectiveConfig evidence must not be silently promoted to canonical solver-request identity');

assert.equal(
    solverRequestIdentityAvailability({
        effectiveConfig,
        effectiveConfigDigest: '0'.repeat(64),
    }).status,
    'invalid-legacy',
);

assert.deepEqual(
    solverRequestIdentityAvailability({}),
    { status: 'unavailable', reason: 'no-solver-request-identity-evidence' },
);

assert.equal(requireCanonicalSolverRequestIdentity({
    solverRequestProjection: projection,
    solverRequestIdentity: identity,
}).solverRequestIdentity, identity);
assert.throws(
    () => requireCanonicalSolverRequestIdentity({ effectiveConfig, effectiveConfigDigest }),
    /canonical solver request identity unavailable: legacy-only/,
);

console.log('solver-request-identity-compat-node-test: ok');
