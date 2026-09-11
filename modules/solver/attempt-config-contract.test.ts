import assert from 'node:assert/strict';
import { test } from 'vitest';
import { validateAttemptConfigContract } from './attempt-dispatch.js';
import { STRUCTURAL_ORDERING_BIASES } from './policy.js';
import type { AttemptConfig } from './types.js';

const ok = (config: AttemptConfig) => assert.doesNotThrow(() => validateAttemptConfigContract(config));
const bad = (config: AttemptConfig, pattern: RegExp) => assert.throws(() => validateAttemptConfigContract(config), pattern);

test('canonical executable attempt families satisfy the runtime contract', () => {
    ok({ scoringProfileId: 'default', orderingBias: null });
    ok({ scoringProfileId: 'perimeterSweep', orderingBias: STRUCTURAL_ORDERING_BIASES.perimeterCW });
    ok({ scoringProfileId: 'intersectionHarvest', orderingBias: null, beamWidth: 2000 });
    ok({ scoringProfileId: 'intersectionHarvest', orderingBias: null, beamWidth: 5000, mechanicBucketRetention: true });
    ok({ scoringProfileId: 'repair', orderingBias: null, repair: true });
    ok({ scoringProfileId: 'repair', orderingBias: null, repair: true, repairMustTurnBiased: true });
    ok({ scoringProfileId: 'repair', orderingBias: null, repair: true, repairTurnBiased: true });
    ok({ scoringProfileId: 'default', orderingBias: null, admissibleOrder: true });
    ok({ scoringProfileId: 'none', orderingBias: null, admissibleOrder: true, admissibleOrderNoTieBreak: true });
    ok({ scoringProfileId: 'default', orderingBias: null, admissibleOrder: true, admissibleOrderLds: true });
});

test('unknown scoring profiles fail loudly instead of silently executing the default profile', () => {
    bad({ scoringProfileId: '__unknown__', orderingBias: null }, /unknown scoring profile/);
    bad({ scoringProfileId: '__unknown__', orderingBias: null, beamWidth: 2000 }, /unknown scoring profile/);
    bad({ scoringProfileId: '__unknown__', orderingBias: null, admissibleOrder: true }, /unknown admissible-order tie-break profile/);
});

test('search-family combinations and family-only flags cannot be silently ignored', () => {
    bad({ scoringProfileId: 'repair', orderingBias: null, repair: true, beamWidth: 2000 }, /mutually exclusive/);
    bad({ scoringProfileId: 'default', orderingBias: null, admissibleOrder: true, beamWidth: 2000 }, /mutually exclusive/);
    bad({ scoringProfileId: 'default', orderingBias: null, mechanicBucketRetention: true }, /only meaningful on a beam/);
    bad({ scoringProfileId: 'repair', orderingBias: null, repairMustTurnBiased: true }, /require repair/);
    bad({ scoringProfileId: 'default', orderingBias: null, admissibleOrderLds: true }, /require admissibleOrder/);
    bad({ scoringProfileId: 'default', orderingBias: null, admissibleOrderNoTieBreak: true }, /require admissibleOrder/);
    bad({ scoringProfileId: 'default', orderingBias: null, beamWidth: 0 }, /positive safe integer/);
    bad({ scoringProfileId: 'default', orderingBias: null, beamWidth: 1.5 }, /positive safe integer/);
});

test('identity-sensitive repair and admissible-order fields use their canonical shapes', () => {
    bad({ scoringProfileId: 'default', orderingBias: null, repair: true }, /must use scoringProfileId "repair"/);
    bad({ scoringProfileId: 'repair', orderingBias: STRUCTURAL_ORDERING_BIASES.perimeterCW, repair: true }, /cannot carry orderingBias/);
    bad({ scoringProfileId: 'repair', orderingBias: null, repair: true, repairMustTurnBiased: true, repairTurnBiased: true }, /mutually exclusive/);
    bad({ scoringProfileId: 'default', orderingBias: STRUCTURAL_ORDERING_BIASES.perimeterCW, admissibleOrder: true }, /cannot carry orderingBias/);
    bad({ scoringProfileId: 'default', orderingBias: null, admissibleOrder: true, admissibleOrderNoTieBreak: true }, /canonical scoringProfileId "none"/);
});

test('ordering-bias identity cannot hide custom same-id behavior', () => {
    bad({
        scoringProfileId: 'perimeterSweep',
        orderingBias: { ...STRUCTURAL_ORDERING_BIASES.perimeterCW, edgeDriftPenalty: 999 },
    }, /does not match the canonical policy definition/);
    bad({ scoringProfileId: 'default', orderingBias: { id: '__unknown__' } }, /unknown structural ordering bias/);
    ok({ scoringProfileId: 'perimeterSweep', orderingBias: { ...STRUCTURAL_ORDERING_BIASES.perimeterCW } });
});
