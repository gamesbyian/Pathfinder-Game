import assert from 'node:assert/strict';
import { test } from 'vitest';
import { canonicalAblationFeatureName, isKnownAblationFeatureName, withFeatureDisabled, FEATURES } from './ablation-config.js';
import { normalizeAblationConfig } from './orchestration.js';

test('legacy STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY name normalizes to the canonical STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY', () => {
    assert.equal(
        canonicalAblationFeatureName('STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY'),
        'STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY',
    );
    assert.ok(isKnownAblationFeatureName('STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY'));
    assert.ok('STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY' in FEATURES);
    assert.ok(!('STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY' in FEATURES), 'the legacy spelling must not be a live FEATURES key');
});

test('withFeatureDisabled accepts the legacy flag name and disables the canonical feature', () => {
    const cfg = withFeatureDisabled('STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY');
    assert.equal(cfg.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY, false);
});

test('normalizeAblationConfig dual-reads the legacy and canonical STRATEGY_GOAL_ATTRACTION_*_DISTANCE_RETRY spelling identically', () => {
    const legacy = normalizeAblationConfig({ STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY: false });
    const canonical = normalizeAblationConfig({ STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false });
    assert.equal(legacy?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY, canonical?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY);
    assert.equal(legacy?.STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY, false);
});
