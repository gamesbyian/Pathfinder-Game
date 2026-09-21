import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    canonicalAblationFeatureName,
    isKnownAblationFeatureName,
    isKnownHistoricalAblationFeatureName,
    normalizeHistoricalAblationFeatureName,
    withFeatureDisabled,
    FEATURES,
} from './ablation-config.js';
import { normalizeAblationConfig, normalizeHistoricalAblationConfig } from './orchestration.js';

test('current feature-name APIs reject retired goal-attraction spelling; historical decoder normalizes it', () => {
    const legacy = 'STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY';
    const canonical = 'STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY';
    assert.throws(() => canonicalAblationFeatureName(legacy), /Unknown canonical feature/);
    assert.equal(normalizeHistoricalAblationFeatureName(legacy), canonical);
    assert.equal(isKnownAblationFeatureName(legacy), false);
    assert.equal(isKnownHistoricalAblationFeatureName(legacy), true);
    assert.ok(canonical in FEATURES);
    assert.ok(!(legacy in FEATURES), 'the legacy spelling must not be a live FEATURES key');
});

test('current experiment constructors reject retired feature names', () => {
    assert.throws(
        () => withFeatureDisabled('STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY'),
        /Unknown canonical feature/,
    );
});

test('historical config decoder reads retired goal-attraction spelling; current normalizer rejects it', () => {
    const legacy = normalizeHistoricalAblationConfig({ STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY: false });
    const canonical = normalizeAblationConfig({ STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false });
    assert.equal(legacy?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY, canonical?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY);
    assert.equal(legacy?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY, false);
    assert.throws(
        () => normalizeAblationConfig({ STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY: false } as any),
        /Unknown canonical feature/,
    );
});

// Historical phase-6 derived vocabulary remains readable only through explicit historical decoders.
const REPAIR_PROBE_FAMILY_ALIASES = [
    ['STRATEGY_REPAIR_PROBE', 'STRATEGY_EARLY_REPAIR_SEARCH'],
    ['STRATEGY_REPAIR_PROBE_MULTI_SEED', 'STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED'],
    ['STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET', 'STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET'],
    ['STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY', 'STRATEGY_REPAIR_SHRINK_RECOVERY'],
    ['STRATEGY_MAIN_LOOP_LATE_RESERVE', 'STRATEGY_MAIN_SEARCH_LATE_RESERVE'],
    ['STRATEGY_ATTRACTION_DIVERSITY', 'STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY'],
    ['STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE', 'STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE'],
] as const;

for (const [legacyName, canonicalName] of REPAIR_PROBE_FAMILY_ALIASES) {
    test(`historical ${legacyName} decodes to canonical ${canonicalName}; current feature APIs reject it`, () => {
        assert.equal(normalizeHistoricalAblationFeatureName(legacyName), canonicalName);
        assert.equal(isKnownAblationFeatureName(legacyName), false);
        assert.equal(isKnownHistoricalAblationFeatureName(legacyName), true);
        assert.ok(canonicalName in FEATURES);
        assert.ok(!(legacyName in FEATURES), 'the legacy spelling must not be a live FEATURES key');
        assert.throws(() => canonicalAblationFeatureName(legacyName), /Unknown canonical feature/);
    });

    test(`historical config decoder reads ${legacyName}; current config normalizer rejects it`, () => {
        const legacy = normalizeHistoricalAblationConfig({ [legacyName]: false });
        const canonical = normalizeAblationConfig({ [canonicalName]: false });
        assert.equal(legacy?.[canonicalName], canonical?.[canonicalName]);
        assert.equal(legacy?.[canonicalName], false);
        assert.throws(() => normalizeAblationConfig({ [legacyName]: false } as any), /Unknown canonical feature/);
    });
}

test('non-feature ablation control keys remain valid on both current and historical paths', () => {
    const current = normalizeAblationConfig({ ATTEMPT_ORDER: 'reverse', _randomSeed: 7 });
    const historical = normalizeHistoricalAblationConfig({ ATTEMPT_ORDER: 'reverse', _randomSeed: 7 });
    assert.equal(current?.ATTEMPT_ORDER, 'reverse');
    assert.equal(current?._randomSeed, 7);
    assert.equal(historical?.ATTEMPT_ORDER, 'reverse');
    assert.equal(historical?._randomSeed, 7);
});
