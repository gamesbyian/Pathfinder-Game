import assert from 'node:assert/strict';
import { test } from 'vitest';
import { FEATURES, OPT_IN_FEATURES, defaultConfig } from './ablation-config.js';
import { normalizeAblationConfig } from './orchestration.js';

test('registry prose and OPT_IN_FEATURES agree wherever a production default is declared explicitly', () => {
    for (const [feature, description] of Object.entries(FEATURES)) {
        const saysOff = /Production default-OFF/i.test(description);
        const saysOn = /Production default-ON/i.test(description);
        assert.equal(saysOff && saysOn, false, `${feature} cannot declare both ON and OFF`);
        if (saysOff) assert.equal(OPT_IN_FEATURES.has(feature), true,
            `${feature} says production default-OFF but is absent from OPT_IN_FEATURES`);
        if (saysOn) assert.equal(OPT_IN_FEATURES.has(feature), false,
            `${feature} says production default-ON but is still registered opt-in`);
    }
});

test('empty normalized config resolves every registered feature to the same value as defaultConfig', () => {
    const defaults = defaultConfig();
    const normalized = normalizeAblationConfig({});
    assert.ok(normalized);
    for (const feature of Object.keys(FEATURES)) {
        assert.equal(normalized![feature], defaults[feature], feature);
        assert.equal(defaults[feature], !OPT_IN_FEATURES.has(feature), feature);
    }
});
