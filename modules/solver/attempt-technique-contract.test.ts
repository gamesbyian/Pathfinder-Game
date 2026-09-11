import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatAttemptIdentityKey } from './attempt-identity.mjs';
import { runAttemptSearch } from './attempt-dispatch.js';
import { PACK } from './encoding.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import type { AttemptConfig } from './types.js';
import type { NormalizedLevel } from '../domain/types.js';

function tinyLevel(): NormalizedLevel {
    return {
        grid: { w: 3, h: 1 },
        requiredLength: 2,
        requiredIntersections: 0,
        goalKey: PACK(2, 0),
        gateKeys: [PACK(0, 0)],
        blockSet: new Set(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
    } as unknown as NormalizedLevel;
}

test('canonical repair identity rejects a dual-guidance hybrid it cannot represent', () => {
    assert.throws(() => formatAttemptIdentityKey({
        scoringProfileId: 'repair',
        orderingBiasId: null,
        repair: true,
        repairMustTurnBiased: true,
        repairTurnBiased: true,
    }), /cannot represent both must-turn-biased and turn-biased guidance/);
});

test('attempt dispatch rejects the same unidentifiable dual-guidance hybrid', async () => {
    const level = tinyLevel();
    const prep = prepLevel(level);
    const config: AttemptConfig = {
        scoringProfileId: 'repair',
        orderingBias: null,
        repair: true,
        repairMustTurnBiased: true,
        repairTurnBiased: true,
    };
    await assert.rejects(
        () => runAttemptSearch(config, PACK(0, 0), level, prep, SCORING_PROFILES.repair, 100, Date.now(), null),
        /mutually exclusive attempt techniques/,
    );
});
