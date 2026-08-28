import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    formatAttemptActionKey,
    formatAttemptIdentityKey,
    normalizeAttemptIdentityKey,
    parseAttemptIdentityKey,
} from './attempt-identity.mjs';
import { attemptConfigKey } from './orchestration.js';
import type { AttemptConfig } from './types.js';

const canonicalCases = [
    [{ scoringProfileId: 'default', templateId: null }, 'dfs|score=default|bias=none'],
    [{ scoringProfileId: 'default', templateId: 'cornerHarvest' }, 'dfs|score=default|bias=cornerHarvest'],
    [{ scoringProfileId: 'default', templateId: null, beamWidth: 5000 }, 'beam|score=default|bias=none|width=5000|retention=plain'],
    [{ scoringProfileId: 'objectiveFirst', templateId: null, beamWidth: 5000, mechanicBucketRetention: true }, 'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets'],
    [{ scoringProfileId: 'repair', templateId: null, repair: true }, 'repair|score=repair|guidance=standard'],
    [{ scoringProfileId: 'repair', templateId: null, repair: true, repairMustTurnBiased: true }, 'repair|score=repair|guidance=must-turn-biased'],
    [{ scoringProfileId: 'repair', templateId: null, repair: true, repairTurnBiased: true }, 'repair|score=repair|guidance=turn-biased'],
    [{ scoringProfileId: 'default', templateId: null, admissibleOrder: true }, 'admissible-order|tieBreak=default|lds=off'],
    [{ scoringProfileId: 'none', templateId: null, admissibleOrder: true, admissibleOrderNoTieBreak: true }, 'admissible-order|tieBreak=none|lds=off'],
    [{ scoringProfileId: 'default', templateId: null, admissibleOrder: true, admissibleOrderLds: true }, 'admissible-order|tieBreak=default|lds=on'],
] as const;

test('formatAttemptIdentityKey emits the canonical structured grammar for every family', () => {
    for (const [fields, key] of canonicalCases) assert.equal(formatAttemptIdentityKey(fields), key);
    assert.equal(
        formatAttemptIdentityKey({
            scoringProfileId: 'repair', templateId: null, repair: true,
            repairMustTurnBiased: true, repairTurnBiased: true,
        }),
        'repair|score=repair|guidance=must-turn-biased',
    );
});

test('canonical attempt identities parse and format deterministically', () => {
    for (const [, key] of canonicalCases) {
        const parsed = parseAttemptIdentityKey(key);
        assert.equal(formatAttemptIdentityKey(parsed), key);
        assert.equal(normalizeAttemptIdentityKey(key), key);
    }
});

test('historical attempt identities normalize to exactly one canonical identity', () => {
    const fixtures = new Map([
        ['ida:none', 'admissible-order|tieBreak=none|lds=off'],
        ['ida:default(lds)', 'admissible-order|tieBreak=default|lds=on'],
        ['dfs:perimeterSweep/perimeterCW', 'dfs|score=perimeterSweep|bias=perimeterCW'],
        ['beam:intersectionHarvest@beam5000(diverse)', 'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'],
        ['dfs:repair:repair', 'repair|score=repair|guidance=standard'],
        ['dfs:repair:repair(mustTurnBiased)', 'repair|score=repair|guidance=must-turn-biased'],
        ['dfs:repair:repair(turnBiased)', 'repair|score=repair|guidance=turn-biased'],
    ]);
    for (const [legacy, canonical] of fixtures) {
        assert.equal(normalizeAttemptIdentityKey(legacy), canonical, legacy);
        assert.equal(formatAttemptIdentityKey(parseAttemptIdentityKey(legacy)), canonical, legacy);
    }
});

test('distinct supported behavior shapes have unique canonical identities', () => {
    const keys = canonicalCases.map(([fields]) => formatAttemptIdentityKey(fields));
    assert.equal(new Set(keys).size, keys.length);
});

test('malformed or contradictory identities are rejected rather than guessed', () => {
    for (const bad of [
        '',
        'beam:default',
        'dfs:default@beam5000',
        'beam|score=default|bias=none|retention=plain',
        'beam|score=default|bias=none|width=0|retention=plain',
        'beam|score=default|bias=none|width=5000|retention=diverse',
        'repair|score=default|guidance=standard',
        'admissible-order|tieBreak=default|lds=maybe',
        'dfs:default:repair',
        'beam:repair@beam5000:repair',
    ]) assert.throws(() => parseAttemptIdentityKey(bad), bad);
});

test('formatAttemptActionKey layers stage and deterministic repair seed over canonical config identity', () => {
    const repair = { scoringProfileId: 'repair', templateId: null, repair: true };
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe' }), 'repair-probe|repair|score=repair|guidance=standard|seedSalt=0');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe', seedSalt: 1 }), 'repair-probe|repair|score=repair|guidance=standard|seedSalt=1');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-fallback', seedSalt: 1 }), 'repair-fallback|repair|score=repair|guidance=standard|seedSalt=1');
    assert.equal(formatAttemptActionKey({ scoringProfileId: 'default', templateId: null, stageId: 'main-loop' }), 'main-loop|dfs|score=default|bias=none');
    assert.throws(() => formatAttemptActionKey({ scoringProfileId: 'default', templateId: null, stageId: '' }), /requires stageId/);
});

test('orchestration attemptConfigKey agrees with canonical formatter for every supported family', () => {
    const cases: AttemptConfig[] = [
        { scoringProfileId: 'default', orderingBias: null },
        { scoringProfileId: 'default', orderingBias: { id: 'perimeterCW' } },
        { scoringProfileId: 'default', orderingBias: null, beamWidth: 3000 },
        { scoringProfileId: 'default', orderingBias: null, beamWidth: 3000, mechanicBucketRetention: true },
        { scoringProfileId: 'repair', orderingBias: null, repair: true },
        { scoringProfileId: 'repair', orderingBias: null, repair: true, repairMustTurnBiased: true },
        { scoringProfileId: 'repair', orderingBias: null, repair: true, repairTurnBiased: true },
        { scoringProfileId: 'default', orderingBias: null, admissibleOrder: true },
        { scoringProfileId: 'none', orderingBias: null, admissibleOrder: true, admissibleOrderNoTieBreak: true },
        { scoringProfileId: 'default', orderingBias: null, admissibleOrder: true, admissibleOrderLds: true },
    ];
    for (const config of cases) {
        const expected = formatAttemptIdentityKey({
            scoringProfileId: config.scoringProfileId,
            templateId: config.orderingBias?.id ?? null,
            beamWidth: config.beamWidth,
            mechanicBucketRetention: config.mechanicBucketRetention,
            repair: config.repair,
            repairMustTurnBiased: config.repairMustTurnBiased,
            repairTurnBiased: config.repairTurnBiased,
            admissibleOrder: config.admissibleOrder,
            admissibleOrderNoTieBreak: config.admissibleOrderNoTieBreak,
            admissibleOrderLds: config.admissibleOrderLds,
        });
        assert.equal(attemptConfigKey(config), expected);
    }
});
