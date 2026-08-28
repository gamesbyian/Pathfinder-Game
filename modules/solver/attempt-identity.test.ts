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
    [{ profileName: 'default', templateId: null }, 'dfs|score=default|bias=none'],
    [{ profileName: 'default', templateId: 'cornerHarvest' }, 'dfs|score=default|bias=cornerHarvest'],
    [{ profileName: 'default', templateId: null, beamWidth: 5000 }, 'beam|score=default|bias=none|width=5000|retention=plain'],
    [{ profileName: 'objectiveFirst', templateId: null, beamWidth: 5000, diverseBeam: true }, 'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets'],
    [{ profileName: 'repair', templateId: null, repair: true }, 'repair|score=repair|guidance=standard'],
    [{ profileName: 'repair', templateId: null, repair: true, repairMustTurnBiased: true }, 'repair|score=repair|guidance=must-turn-biased'],
    [{ profileName: 'repair', templateId: null, repair: true, repairTurnBiased: true }, 'repair|score=repair|guidance=turn-biased'],
    [{ profileName: 'default', templateId: null, admissibleOrder: true }, 'admissible-order|tieBreak=default|lds=off'],
    [{ profileName: 'none', templateId: null, admissibleOrder: true, admissibleOrderNoTieBreak: true }, 'admissible-order|tieBreak=none|lds=off'],
    [{ profileName: 'default', templateId: null, admissibleOrder: true, admissibleOrderLds: true }, 'admissible-order|tieBreak=default|lds=on'],
] as const;

test('formatAttemptIdentityKey emits the canonical structured grammar for every family', () => {
    for (const [fields, key] of canonicalCases) assert.equal(formatAttemptIdentityKey(fields), key);
    assert.equal(
        formatAttemptIdentityKey({
            profileName: 'repair', templateId: null, repair: true,
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
    const repair = { profileName: 'repair', templateId: null, repair: true };
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe' }), 'repair-probe|repair|score=repair|guidance=standard|seedSalt=0');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe', seedSalt: 1 }), 'repair-probe|repair|score=repair|guidance=standard|seedSalt=1');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-fallback', seedSalt: 1 }), 'repair-fallback|repair|score=repair|guidance=standard|seedSalt=1');
    assert.equal(formatAttemptActionKey({ profileName: 'default', templateId: null, stageId: 'main-loop' }), 'main-loop|dfs|score=default|bias=none');
    assert.throws(() => formatAttemptActionKey({ profileName: 'default', templateId: null, stageId: '' }), /requires stageId/);
});

test('orchestration attemptConfigKey agrees with canonical formatter for every supported family', () => {
    const cases: AttemptConfig[] = [
        { profileName: 'default', template: null },
        { profileName: 'default', template: { id: 'perimeterCW' } },
        { profileName: 'default', template: null, beamWidth: 3000 },
        { profileName: 'default', template: null, beamWidth: 3000, diverseBeam: true },
        { profileName: 'repair', template: null, repair: true },
        { profileName: 'repair', template: null, repair: true, repairMustTurnBiased: true },
        { profileName: 'repair', template: null, repair: true, repairTurnBiased: true },
        { profileName: 'default', template: null, admissibleOrder: true },
        { profileName: 'none', template: null, admissibleOrder: true, admissibleOrderNoTieBreak: true },
        { profileName: 'default', template: null, admissibleOrder: true, admissibleOrderLds: true },
    ];
    for (const config of cases) {
        const expected = formatAttemptIdentityKey({
            profileName: config.profileName,
            templateId: config.template?.id ?? null,
            beamWidth: config.beamWidth,
            diverseBeam: config.diverseBeam,
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
