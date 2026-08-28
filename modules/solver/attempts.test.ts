/** Unit tests for Solver attempt-order selection. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../solver.js';
import { ADMISSIBLE_ORDER_PROFILES, applyAttemptConfigOptions, getAttemptConfigs, getConfiguredAttemptConfigs } from './attempts.js';
import { PACK } from './encoding.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER } from './policy.js';
import { defaultConfig } from './ablation-config.js';
import type { NormalizedLevel } from '../domain/types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 10, h: 10 },
    reqLen: 50,
    reqInt: 2,
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

test('repairTurnBiased attempt is default-off; under STRATEGY_REPAIR_TURN_BIAS BOTH biased techniques are tried, ordered by which the heuristic predicts', () => {
  // Must-turn repair-fallback level (mustCross≥2 & mustPass≥3 → needsRepairFallback; mustPassTurnDirs
  // non-empty → mustTurn>0), so the ordinary + biased repair attempt(s) are present.
  const lowReqIntLevel = makeLevel({
    reqLen: 40, reqInt: 2,
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassTurnDirs: new Map([[PACK(1, 1), 'either']]),
  });
  const off = getAttemptConfigs(lowReqIntLevel, null);
  assert.equal(off.some(c => c.repairMustTurnBiased), true, 'sanity: this is a must-turn repair level');
  assert.equal(off.some(c => c.repairTurnBiased), false, 'not added with null cfg (production default)');
  assert.equal(off.filter(c => c.repair).length, 2, 'production: exactly ordinary + mustTurnBiased, never turnBiased');

  // reqInt=2 (<= the heuristic's threshold): predicts mustTurnBiased. Non-exclusive design (see
  // predictLikelyBiasedRepairTechnique) — BOTH techniques are still added, never just one; the
  // predicted one goes first (before ordinary repair), the other becomes a genuine fallback (after
  // ordinary repair) rather than being excluded outright.
  const onLowReqInt = getAttemptConfigs(lowReqIntLevel, { ...defaultConfig(), STRATEGY_REPAIR_TURN_BIAS: true });
  const lowRepairs = onLowReqInt.filter(c => c.repair);
  assert.equal(lowRepairs.length, 3, 'low reqInt: predicted + ordinary + fallback, all three present');
  assert.equal(lowRepairs[0].repairMustTurnBiased, true, 'low reqInt: predicted (mustTurnBiased) goes first');
  assert.equal(lowRepairs[1].repair && !lowRepairs[1].repairMustTurnBiased && !lowRepairs[1].repairTurnBiased, true, 'ordinary repair second');
  assert.equal(lowRepairs[2].repairTurnBiased, true, 'low reqInt: turnBiased is the fallback, still tried, placed last');

  // reqInt=9 (above threshold): predicts turnBiased instead — same non-exclusive shape, reversed.
  const highReqIntLevel = makeLevel({
    reqLen: 40, reqInt: 9,
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassTurnDirs: new Map([[PACK(1, 1), 'either']]),
  });
  const onHighReqInt = getAttemptConfigs(highReqIntLevel, { ...defaultConfig(), STRATEGY_REPAIR_TURN_BIAS: true });
  const highRepairs = onHighReqInt.filter(c => c.repair);
  assert.equal(highRepairs.length, 3, 'high reqInt: predicted + ordinary + fallback, all three present');
  assert.equal(highRepairs[0].repairTurnBiased, true, 'high reqInt: predicted (turnBiased) goes first (early-probe latency)');
  assert.equal(highRepairs[2].repairMustTurnBiased, true, 'high reqInt: mustTurnBiased is the fallback, still tried, placed last');
});

test('default attempt order keeps template sweep before profile fallbacks, with beams trailing last', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), ATTEMPT_CONFIGS.slice(0, 4).map(c => c.template?.id));
  // Excludes the admissible-order-search last-resort tier appended at the very end (see
  // ADMISSIBLE_ORDER_PROFILES) -- this assertion is specifically about the main DFS/beam profile
  // ordering, not that unconditionally-appended, always-last tier.
  const nonAdmissibleOrder = attempts.filter(c => !c.admissibleOrder);
  assert.deepEqual(nonAdmissibleOrder.slice(4, 16).map(c => c.profileName), PROFILE_ORDER);
  // Beam-routing-gap fix (technique census, run 32240161854): the catch-all rule now offers beam
  // search too, placed LAST (within the main loop's protected late-reserve config-count window --
  // see the rule's own comment for why leading with beam was tried and reverted). A follow-up pass
  // added perimeterSweep CW/CCW STANDARD beams after the original WIDE pair, same trailing position.
  assert.deepEqual(nonAdmissibleOrder.slice(16).map(c => [c.profileName, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
  assert.deepEqual(attempts.filter(c => c.admissibleOrder).map(c => c.profileName), ADMISSIBLE_ORDER_PROFILES);
});

test('default no-must-pass levels prefer perimeterCCW before perimeterCW, with beams trailing last', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [] }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), [
    'cornerHarvest',
    'perimeterCCW',
    'perimeterCW',
    'sideCommitment',
  ]);
  const nonAdmissibleOrder = attempts.filter(c => !c.admissibleOrder);
  assert.deepEqual(nonAdmissibleOrder.slice(-4).map(c => [c.profileName, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
});

test('near-closure attempts prioritize closure rescue profiles before templates', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 10, reqInt: 1 }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.profileName), [
    'nearClosureRescue',
    'harvestThenFinish',
    'finishFirst',
    'perimeterSweep',
  ]);
  assert.equal(attempts.slice(0, 4).every(c => c.template === null), true);
  assert.equal(attempts.some(c => c.template?.id === 'cornerHarvest'), true);
});

test('portal-heavy levels lead with portal profiles, with beam configs trailing last', () => {
  // portalMap.size >= 4 (2+ pairs) triggers the portal-heavy archetype (archetype.ts); reqInt kept
  // low enough to avoid the high-intersection-burden rule matching first.
  const attempts = getAttemptConfigs(makeLevel({
    reqLen: 40, reqInt: 2,
    portalMap: new Map([[PACK(1, 1), PACK(2, 2)], [PACK(2, 2), PACK(1, 1)], [PACK(3, 3), PACK(4, 4)], [PACK(4, 4), PACK(3, 3)]]),
  }));
  assert.deepEqual(attempts.slice(0, 2).map(c => c.profileName), ['portalFirstTransfer', 'portalCommitted']);
  // Beam-routing-gap fix (technique census, run 32240161854): beam search trails last (within the
  // main loop's protected late-reserve config-count window -- see the rule's own comment for why
  // leading with beam was tried and reverted). A follow-up pass added perimeterSweep CW/CCW
  // STANDARD beams after the original WIDE pair, same trailing position.
  const nonAdmissibleOrder = attempts.filter(c => !c.admissibleOrder);
  assert.deepEqual(nonAdmissibleOrder.slice(-4).map(c => [c.profileName, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
});

test('high-intersection dense levels lead with beam configs', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 60, reqInt: 7 }));
  assert.deepEqual(attempts.slice(0, 2).map(c => [c.profileName, c.beamWidth]), [
    ['intersectionHarvest', 5000],
    ['objectiveFirst', 5000],
  ]);
});


test('STRATEGY_ARCHETYPE_ROUTING disabled forces the catch-all rule regardless of features', () => {
  const level = makeLevel({ reqLen: 60, reqInt: 7 });
  const routed = getAttemptConfigs(level);
  assert.deepEqual(routed.slice(0, 2).map(c => [c.profileName, c.beamWidth]), [
    ['intersectionHarvest', 5000],
    ['objectiveFirst', 5000],
  ]);

  const forcedDefault = getAttemptConfigs(level, { STRATEGY_ARCHETYPE_ROUTING: false });
  assert.deepEqual(forcedDefault.slice(0, 4).map(c => c.template?.id), [
    'cornerHarvest', 'perimeterCW', 'perimeterCCW', 'sideCommitment',
  ]);
  // This level is also repair-eligible (isHighInt && reqInt>=7), so a repair attempt gets appended
  // after the rule's own list too -- filter both trailing tiers to isolate the rule's own ordering.
  const forcedNonAdmissibleOrder = forcedDefault.filter(c => !c.admissibleOrder && !c.repair);
  assert.deepEqual(forcedNonAdmissibleOrder.slice(-4).map(c => [c.profileName, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
  assert.notDeepEqual(forcedDefault.map(c => c.profileName), routed.map(c => c.profileName));

  // Passing no ablation config at all (the production call shape) must stay byte-identical
  // to the pre-existing routed behavior.
  assert.deepEqual(getAttemptConfigs(level, null), routed);
});

test('applyAttemptConfigOptions filters disabled templates and profiles', () => {
  const base = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  const filtered = applyAttemptConfigOptions(base, {
    TEMPLATE_CORNER_HARVEST: false,
    PROFILE_default: false,
  });
  assert.equal(filtered.some(c => c.template?.id === 'cornerHarvest'), false);
  assert.equal(filtered.some(c => c.profileName === 'default'), false);
  assert.equal(filtered.length < base.length, true);
});

test('applyAttemptConfigOptions does not restore the base ladder when every config is disabled', () => {
  const base = [{ profileName: 'default', template: null }];
  assert.deepEqual(applyAttemptConfigOptions(base, { PROFILE_default: false }), []);
});

test('applyAttemptConfigOptions supports reverse, random, and profile-grouped ordering', () => {
  const base = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  assert.deepEqual(applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'reverse' }), [...base].reverse());

  const randomA = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 123 });
  const randomB = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 123 });
  assert.deepEqual(randomA, randomB, 'same seed should produce stable order');
  assert.notDeepEqual(randomA.map(c => [c.profileName, c.template?.id ?? null]), base.map(c => [c.profileName, c.template?.id ?? null]));

  const seedZero = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 0 });
  const seedFortyTwo = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 42 });
  assert.notDeepEqual(seedZero, seedFortyTwo, 'seed zero must not silently fall back to seed 42');

  const grouped = applyAttemptConfigOptions([
    { profileName: 'a', template: { id: 't' } },
    { profileName: 'b', template: null, beamWidth: 2000 },
    { profileName: 'c', template: null },
  ], { ATTEMPT_ORDER: 'profile-grouped' });
  assert.deepEqual(grouped.map(c => c.profileName), ['c', 'a', 'b']);
});

test('getConfiguredAttemptConfigs combines base ordering with ablation options', () => {
  const level = makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] });
  const cfg = { TEMPLATE_CORNER_HARVEST: false };
  const configured = getConfiguredAttemptConfigs(level, { ...cfg, ATTEMPT_ORDER: 'reverse' });
  assert.equal(configured.some(c => c.template?.id === 'cornerHarvest'), false);
  const normalized = { ...defaultConfig(), ...cfg };
  assert.deepEqual(configured, [...applyAttemptConfigOptions(getAttemptConfigs(level, normalized), normalized)].reverse());
});

test('getConfiguredAttemptConfigs normalizes sparse and undefined overrides at its public boundary', () => {
  const level = makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] });
  const baseline = getConfiguredAttemptConfigs(level, null);
  const sparse = getConfiguredAttemptConfigs(level, { PRUNE_PARITY: false, PROFILE_default: undefined });
  assert.equal(sparse.length, baseline.length, 'unrelated sparse flags must not collapse the attempt ladder');
  assert.equal(sparse.some(c => c.profileName === 'default'), true, 'undefined profile flag means no override');
  assert.equal(sparse.some(c => c.admissibleOrder), baseline.some(c => c.admissibleOrder), 'default-on tiers remain present');
});

test('STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE adds only the missing STANDARD intersection-harvest beam to very-high-reqInt high-intersection rules', () => {
  const nonPortal = makeLevel({ reqLen: 60, reqInt: 8 });
  const off = getAttemptConfigs(nonPortal, null);
  assert.equal(off.some(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam), false,
    'production default leaves the STANDARD intersection-harvest beam absent in the very-high-reqInt rule');

  const on = getAttemptConfigs(nonPortal, {
    ...defaultConfig(),
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE: true,
  });
  const added = on.filter(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam);
  assert.equal(added.length, 1, 'treatment adds exactly one STANDARD intersection-harvest beam');
  const withoutAdded = on.filter(c => !(c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam));
  assert.deepEqual(withoutAdded, off, 'treatment is purely additive inside the selected rule');

  const portalDense = makeLevel({
    reqLen: 60, reqInt: 8,
    portalMap: new Map([
      [PACK(1, 1), PACK(2, 2)], [PACK(2, 2), PACK(1, 1)],
      [PACK(3, 3), PACK(4, 4)], [PACK(4, 4), PACK(3, 3)],
    ]),
  });
  const portalOff = getAttemptConfigs(portalDense, null);
  const portalOn = getAttemptConfigs(portalDense, {
    ...defaultConfig(),
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE: true,
  });
  assert.equal(portalOff.some(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam), false);
  assert.equal(portalOn.filter(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam).length, 1,
    'portal-dense sibling rule gets the same single missing action');

  // Below VERY_HIGH_REQINT, the medium-high-int rule already contains the STANDARD beam.
  // The experimental flag must not duplicate or otherwise perturb that existing exposure.
  const mediumHigh = makeLevel({ reqLen: 55, reqInt: 5 });
  const mediumOff = getAttemptConfigs(mediumHigh, null);
  const mediumOn = getAttemptConfigs(mediumHigh, {
    ...defaultConfig(),
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE: true,
  });
  assert.deepEqual(mediumOn, mediumOff, 'flag has no effect outside the two very-high-reqInt rules');
});

test('reserve-preserving high-int STANDARD intersection-harvest exposure keeps the old protected five-config suffix intact', () => {
  const sig = (c: any) => [c.profileName, c.template?.id ?? null, c.beamWidth ?? null, !!c.diverseBeam];

  const assertPreservesSuffix = (level: any) => {
    const off = getAttemptConfigs(level, null);
    const on = getAttemptConfigs(level, {
      ...defaultConfig(),
      STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE: true,
    });
    const candidates = on.filter(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam);
    assert.equal(candidates.length, 1, 'descendant exposes exactly one STANDARD intersection-harvest beam');

    // The reserve applies to ordinary main-loop configs only; getAttemptConfigs() appends
    // repair/admissible-order configs afterward, so compare the same scope stage-budget prices.
    const offMain = off.filter(c => !c.repair && !c.admissibleOrder);
    const onMain = on.filter(c => !c.repair && !c.admissibleOrder);
    assert.deepEqual(onMain.slice(-5).map(sig), offMain.slice(-5).map(sig),
      'all five main-loop configs protected before treatment remain the final five main-loop configs after treatment');
    const candidateIndex = onMain.findIndex(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam);
    assert.equal(candidateIndex, Math.max(0, offMain.length - 5),
      'candidate is inserted immediately before the old protected main-loop suffix');
    assert.deepEqual(onMain.filter((_, index) => index !== candidateIndex).map(sig), offMain.map(sig),
      'removing the inserted action reproduces the production main-loop config order exactly');
  };

  assertPreservesSuffix(makeLevel({ reqLen: 60, reqInt: 8 }));
  assertPreservesSuffix(makeLevel({
    reqLen: 60, reqInt: 8,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
  }));
  assertPreservesSuffix(makeLevel({
    reqLen: 60, reqInt: 8,
    portalMap: new Map([
      [PACK(1, 1), PACK(2, 2)], [PACK(2, 2), PACK(1, 1)],
      [PACK(3, 3), PACK(4, 4)], [PACK(4, 4), PACK(3, 3)],
    ]),
  }));
  assertPreservesSuffix(makeLevel({
    reqLen: 60, reqInt: 8,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    portalMap: new Map([
      [PACK(1, 1), PACK(2, 2)], [PACK(2, 2), PACK(1, 1)],
      [PACK(3, 3), PACK(4, 4)], [PACK(4, 4), PACK(3, 3)],
    ]),
  }));

  const both = getAttemptConfigs(makeLevel({ reqLen: 60, reqInt: 8 }), {
    ...defaultConfig(),
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE: true,
    STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE: true,
  });
  assert.equal(both.filter(c => c.profileName === 'intersectionHarvest' && c.beamWidth === 2000 && !c.diverseBeam).length, 1,
    'descendant supersedes append-last parent if both experimental flags are supplied');
});

test('STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE is default-ON (promoted 2026-08-27) and appends the plain WIDE beams only for the must-cross+flipper-heavy rule', () => {
  // mustCross>=2 & reqInt=4 & density<0.55 -> must-cross-heavy (not high-intersection-burden);
  // mustPass>=OBJECTIVE_HEAVY_MUSTPASS(3) & flippers>=FLIPPER_HEAVY(2) -> the flipper-heavy rule.
  const level = makeLevel({
    reqLen: 40, reqInt: 4,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    flippingFilterMap: new Map([[PACK(6, 6), 1], [PACK(7, 7), 1]]),
  });

  // Production default: both a genuinely absent ablation config (null, the real no-override
  // production path — see getConfiguredAttemptConfigs's own comment) and an explicit defaultConfig()
  // must include the plain WIDE beams now that this flag is default-ON.
  const on = getAttemptConfigs(level, null);
  const onExplicit = getAttemptConfigs(level, defaultConfig());
  const plainWide = on.filter(c => c.beamWidth === 5000 && !c.diverseBeam);
  assert.deepEqual(plainWide.map(c => c.profileName), ['intersectionHarvest', 'objectiveFirst'],
    'production default now appends exactly the two plain WIDE beams, trailing, in this order');
  assert.deepEqual(onExplicit.filter(c => c.beamWidth === 5000 && !c.diverseBeam).map(c => c.profileName),
    plainWide.map(c => c.profileName), 'null cfg and explicit defaultConfig() agree');
  assert.equal(on.some(c => c.beamWidth === 5000 && c.diverseBeam), true, 'sanity: the existing diverse WIDE beam is untouched');

  const off = getAttemptConfigs(level, { ...defaultConfig(), STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: false });
  assert.equal(off.some(c => c.beamWidth === 5000 && !c.diverseBeam), false,
    'explicitly disabling restores the pre-promotion ladder');
  // The two configs are inserted right after the archetype-rule's own main-loop configs, before
  // repair-fallback/admissible-order are appended (getAttemptConfigs's own ordering) — so removing
  // them from `on` must reproduce `off` exactly: purely additive, nothing else moved.
  const withoutPlainWide = on.filter(c => !(c.beamWidth === 5000 && !c.diverseBeam && !c.repair));
  assert.deepEqual(withoutPlainWide, off, 'the flag is purely additive; nothing existing is reordered or removed');

  // A must-cross-heavy level that does NOT match the flipper-heavy sub-rule (flippers < FLIPPER_HEAVY)
  // must stay untouched even with the flag on: this is a single-rule promotion, not archetype-wide.
  const nonFlipperLevel = makeLevel({
    reqLen: 40, reqInt: 4,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
  });
  const nonFlipperOn = getAttemptConfigs(nonFlipperLevel, null);
  assert.equal(nonFlipperOn.some(c => c.beamWidth === 5000 && !c.diverseBeam), false,
    'flag has no effect outside isMustCrossFlipperHeavy');
});

test('STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE appends one plain WIDE beam to each of the other two must-cross-heavy sibling rules, and only those', () => {
  // isMustCross & mustPass>=3, flippers<FLIPPER_HEAVY(2) -> "must-cross, must-pass-heavy" rule
  // (not the flipper-heavy rule, which STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE already covers).
  const mustPassHeavyLevel = makeLevel({
    reqLen: 40, reqInt: 4,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
  });
  const mustPassHeavyOff = getAttemptConfigs(mustPassHeavyLevel, null);
  assert.equal(mustPassHeavyOff.some(c => c.beamWidth === 5000 && !c.diverseBeam), false, 'production default: no plain WIDE beam here');
  const mustPassHeavyOn = getAttemptConfigs(mustPassHeavyLevel, { ...defaultConfig(), STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true });
  const mustPassHeavyPlainWide = mustPassHeavyOn.filter(c => c.beamWidth === 5000 && !c.diverseBeam);
  assert.deepEqual(mustPassHeavyPlainWide.map(c => c.profileName), ['intersectionHarvest'], 'appends exactly the missing plain intersectionHarvest WIDE beam');
  const mustPassHeavyWithoutNew = mustPassHeavyOn.filter(c => !(c.beamWidth === 5000 && !c.diverseBeam && !c.repair));
  assert.deepEqual(mustPassHeavyWithoutNew, mustPassHeavyOff, 'purely additive; nothing existing reordered or removed');

  // isMustCross, mustPass<OBJECTIVE_HEAVY_MUSTPASS, below COMBO_MUSTCROSS/COMBO_MUSTPASS -> the
  // must-cross "default" catch-all rule.
  const mustCrossDefaultLevel = makeLevel({
    reqLen: 40, reqInt: 4,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
  });
  const mustCrossDefaultOff = getAttemptConfigs(mustCrossDefaultLevel, null);
  assert.equal(mustCrossDefaultOff.some(c => c.beamWidth === 5000 && !c.diverseBeam), false, 'production default: no plain WIDE beam here');
  const mustCrossDefaultOn = getAttemptConfigs(mustCrossDefaultLevel, { ...defaultConfig(), STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true });
  const mustCrossDefaultPlainWide = mustCrossDefaultOn.filter(c => c.beamWidth === 5000 && !c.diverseBeam);
  assert.deepEqual(mustCrossDefaultPlainWide.map(c => c.profileName), ['objectiveFirst'], 'appends exactly the missing plain objectiveFirst WIDE beam');
  const mustCrossDefaultWithoutNew = mustCrossDefaultOn.filter(c => !(c.beamWidth === 5000 && !c.diverseBeam && !c.repair));
  assert.deepEqual(mustCrossDefaultWithoutNew, mustCrossDefaultOff, 'purely additive; nothing existing reordered or removed');

  // This flag must have NO effect on the flipper-heavy rule (that's the OTHER flag's job, already
  // fully exposed with room to spare, and default-ON since 2026-08-27 — see the sibling test above).
  // Disable it explicitly so this isolation check does not pick up its own beam.
  const flipperHeavyLevel = makeLevel({
    reqLen: 40, reqInt: 4,
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    flippingFilterMap: new Map([[PACK(6, 6), 1], [PACK(7, 7), 1]]),
  });
  const flipperHeavyOn = getAttemptConfigs(flipperHeavyLevel, {
    ...defaultConfig(),
    STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true,
    STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: false,
  });
  assert.equal(flipperHeavyOn.some(c => c.beamWidth === 5000 && !c.diverseBeam), false, 'flag has no effect on the flipper-heavy rule');
});

test('SOLVER_TESTING_API exposes the extracted attempt-order helper', () => {
  const level = makeLevel({ reqLen: 10, reqInt: 1 });
  assert.equal(SOLVER_TESTING_API.getAttemptConfigs, getAttemptConfigs);
  assert.deepEqual(SOLVER_TESTING_API.getAttemptConfigs(level), getAttemptConfigs(level));
});

test('must-cross-threaded medium-high-int levels get floored diverse wide beams', () => {
  // reqInt 5 at density ~0.55 → high-intersection-burden, below the very-high-reqInt and
  // near-Hamiltonian branches. With ≥2 must-cross cells the plain 2000-wide beams collapse
  // to one structural mode and DFS never recovers (stress-corpus finding: the diverse
  // bucketed WIDE beam solves these in seconds while the shipped ladder times out).
  const level = makeLevel({ reqLen: 55, reqInt: 5, mustCrossKeys: [PACK(4, 4), PACK(6, 6)] });
  const attempts = getAttemptConfigs(level);
  const diverse = attempts.filter(c => c.diverseBeam);
  assert.equal(diverse.length >= 2, true, 'expected diverse beam attempts');
  assert.equal(diverse.some(c => c.profileName === 'intersectionHarvest' && (c.minBudgetFraction ?? 0) > 0), true,
    'diverse intersectionHarvest beam needs a budget floor to survive ladder fragmentation');
  const perimeterIdx = attempts.findIndex(c => c.beamWidth && c.template?.id === 'perimeterCW');
  const diverseIdx = attempts.findIndex(c => c.diverseBeam);
  assert.equal(perimeterIdx >= 0 && perimeterIdx < diverseIdx, true,
    'proven perimeter beam winners still lead; diverse beams follow');
});

test('medium-high-int levels without must-cross keep the plain beam ladder', () => {
  const level = makeLevel({ reqLen: 55, reqInt: 5, mustCrossKeys: [] });
  const attempts = getAttemptConfigs(level);
  assert.equal(attempts.some(c => c.diverseBeam), false);
});

test('very-high-reqInt levels with must-cross threading also get the diverse beams', () => {
  const level = makeLevel({ reqLen: 60, reqInt: 8, mustCrossKeys: [PACK(4, 4), PACK(6, 6)] });
  const attempts = getAttemptConfigs(level);
  assert.equal(attempts.some(c => c.diverseBeam && c.profileName === 'intersectionHarvest'), true);
});

test('STRATEGY_REPAIR_FALLBACK / STRATEGY_REPAIR_MUSTTURN_BIAS filter the repair attempts', () => {
  // mustCross ≥ 2 + mustPass ≥ 3 matches the repair gate; mustPassTurnDirs makes the level a
  // must-turn level, so the biased second attempt is appended too.
  const level = makeLevel({
    reqLen: 60, reqInt: 4,
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassTurnDirs: new Map([[PACK(1, 1), 'cw']]),
  });
  const base = getAttemptConfigs(level);
  assert.equal(base.filter(c => c.repair).length, 2, 'repair gate matched: ordinary + biased attempts');
  assert.equal(base.filter(c => c.repairMustTurnBiased).length, 1);

  const noRepair = applyAttemptConfigOptions(base, { STRATEGY_REPAIR_FALLBACK: false });
  assert.equal(noRepair.some(c => c.repair), false, 'fallback flag removes both repair attempts');
  assert.equal(noRepair.length, base.length - 2);

  const noBias = applyAttemptConfigOptions(base, { STRATEGY_REPAIR_MUSTTURN_BIAS: false });
  assert.equal(noBias.filter(c => c.repair).length, 1, 'bias flag removes only the biased attempt');
  assert.equal(noBias.some(c => c.repairMustTurnBiased), false);
});
