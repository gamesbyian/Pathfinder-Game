import assert from 'node:assert/strict';

import { formatAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';

const parser = makeAttemptConfigKeyParser({
    STRUCTURAL_ORDERING_BIASES: { cornerHarvest: { id: 'cornerHarvest' } },
    SCORING_PROFILES: { default: {} },
    attemptConfigKey: config => formatAttemptIdentityKey({
        scoringProfileId: config.scoringProfileId,
        orderingBiasId: config.orderingBias?.id ?? null,
        beamWidth: config.beamWidth,
        mechanicBucketRetention: config.mechanicBucketRetention,
        repair: config.repair,
        repairMustTurnBiased: config.repairMustTurnBiased,
        repairTurnBiased: config.repairTurnBiased,
        admissibleOrder: config.admissibleOrder,
        admissibleOrderNoTieBreak: config.admissibleOrderNoTieBreak,
        admissibleOrderLds: config.admissibleOrderLds,
    }),
});

const canonical = parser('dfs|score=default|bias=cornerHarvest');
assert.equal(canonical.scoringProfileId, 'default');
assert.equal(canonical.orderingBias?.id, 'cornerHarvest');
assert.throws(() => parser('dfs:default/cornerHarvest'), /valid canonical attempt identity/);

console.log('attempt-config-key-node-test: ok');
