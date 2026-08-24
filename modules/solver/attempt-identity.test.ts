import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatAttemptActionKey, formatAttemptIdentityKey } from './attempt-identity.mjs';
import { attemptConfigKey } from './orchestration.js';
import type { AttemptConfig } from './types.js';

test('formatAttemptIdentityKey covers every supported attempt family', () => {
    assert.equal(formatAttemptIdentityKey({ profileName: 'default', templateId: null }), 'dfs:default');
    assert.equal(formatAttemptIdentityKey({ profileName: 'default', templateId: 'cornerHarvest' }), 'dfs:default/cornerHarvest');
    assert.equal(formatAttemptIdentityKey({ profileName: 'default', templateId: null, beamWidth: 5000 }), 'beam:default@beam5000');
    assert.equal(formatAttemptIdentityKey({ profileName: 'objectiveFirst', templateId: null, beamWidth: 5000, diverseBeam: true }), 'beam:objectiveFirst@beam5000(diverse)');
    assert.equal(formatAttemptIdentityKey({ profileName: 'repair', templateId: null, repair: true }), 'dfs:repair:repair');
    assert.equal(formatAttemptIdentityKey({ profileName: 'repair', templateId: null, repair: true, repairMustTurnBiased: true }), 'dfs:repair:repair(mustTurnBiased)');
    assert.equal(formatAttemptIdentityKey({ profileName: 'repair', templateId: null, repair: true, repairTurnBiased: true }), 'dfs:repair:repair(turnBiased)');
    // repairMustTurnBiased takes precedence over repairTurnBiased when both are set.
    assert.equal(formatAttemptIdentityKey({ profileName: 'repair', templateId: null, repair: true, repairMustTurnBiased: true, repairTurnBiased: true }), 'dfs:repair:repair(mustTurnBiased)');
    assert.equal(formatAttemptIdentityKey({ profileName: 'default', templateId: null, admissibleOrder: true }), 'ida:default');
    assert.equal(formatAttemptIdentityKey({ profileName: 'none', templateId: null, admissibleOrder: true, admissibleOrderNoTieBreak: true }), 'ida:none');
    assert.equal(formatAttemptIdentityKey({ profileName: 'default', templateId: null, admissibleOrder: true, admissibleOrderLds: true }), 'ida:default(lds)');
});

test('formatAttemptActionKey separates stage and deterministic repair seed without changing config identity', () => {
    const repair = { profileName: 'repair', templateId: null, repair: true };
    assert.equal(formatAttemptIdentityKey(repair), 'dfs:repair:repair');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe' }), 'repair-probe|dfs:repair:repair|seedSalt=0');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-probe', seedSalt: 1 }), 'repair-probe|dfs:repair:repair|seedSalt=1');
    assert.equal(formatAttemptActionKey({ ...repair, stageId: 'repair-fallback', seedSalt: 1 }), 'repair-fallback|dfs:repair:repair|seedSalt=1');

    // Non-randomized searches have no meaningless seed suffix, but stage remains part of action identity.
    assert.equal(formatAttemptActionKey({ profileName: 'default', templateId: null, stageId: 'main-loop' }), 'main-loop|dfs:default');
    assert.equal(formatAttemptActionKey({ profileName: 'default', templateId: null, stageId: 'dedup-near-tie-retry' }), 'dedup-near-tie-retry|dfs:default');
    assert.throws(() => formatAttemptActionKey({ profileName: 'default', templateId: null, stageId: '' }), /requires stageId/);
});

test('orchestration.ts attemptConfigKey (live AttemptConfig) agrees with formatAttemptIdentityKey for every family', () => {
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
            profileName: config.profileName, templateId: config.template?.id ?? null,
            beamWidth: config.beamWidth, diverseBeam: config.diverseBeam, repair: config.repair,
            repairMustTurnBiased: config.repairMustTurnBiased, repairTurnBiased: config.repairTurnBiased,
            admissibleOrder: config.admissibleOrder, admissibleOrderNoTieBreak: config.admissibleOrderNoTieBreak,
            admissibleOrderLds: config.admissibleOrderLds,
        });
        assert.equal(attemptConfigKey(config), expected);
    }
});
