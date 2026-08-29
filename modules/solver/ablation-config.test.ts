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

// Phase-6 derived-vocabulary rename (closeout session): repair-probe -> early-repair-search,
// main-loop -> main-search, attraction-diversity -> goal-attraction-disabled-retry. Each legacy
// STRATEGY_* spelling below must still dual-read to its canonical replacement identically.
const REPAIR_PROBE_FAMILY_ALIASES = [
    ['STRATEGY_REPAIR_PROBE', 'STRATEGY_EARLY_REPAIR_SEARCH'],
    ['STRATEGY_REPAIR_PROBE_MULTI_SEED', 'STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED'],
    ['STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET', 'STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET'],
    ['STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY', 'STRATEGY_REPAIR_SHRINK_RECOVERY'],
    ['STRATEGY_MAIN_LOOP_LATE_RESERVE', 'STRATEGY_MAIN_SEARCH_LATE_RESERVE'],
    ['STRATEGY_ATTRACTION_DIVERSITY', 'STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY'],
    ['STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE', 'STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE'],
];

for (const [legacyName, canonicalName] of REPAIR_PROBE_FAMILY_ALIASES) {
    test(`legacy ${legacyName} name normalizes to the canonical ${canonicalName}`, () => {
        assert.equal(canonicalAblationFeatureName(legacyName), canonicalName);
        assert.ok(isKnownAblationFeatureName(legacyName));
        assert.ok(canonicalName in FEATURES);
        assert.ok(!(legacyName in FEATURES), 'the legacy spelling must not be a live FEATURES key');
    });

    test(`normalizeAblationConfig dual-reads the legacy and canonical ${canonicalName} spelling identically`, () => {
        const legacy = normalizeAblationConfig({ [legacyName]: false });
        const canonical = normalizeAblationConfig({ [canonicalName]: false });
        assert.equal(legacy?.[canonicalName], canonical?.[canonicalName]);
        assert.equal(legacy?.[canonicalName], false);
    });
}
