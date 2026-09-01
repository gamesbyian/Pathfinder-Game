/** Behavior tests for the level-rating state actions (hardening plan §1). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createEngineState } from '../../state-slices.js';
import {
    setLevelRatingContext, applyLevelRatingData, toggleLevelRatingTag,
    addLevelRatingCustomTag, removeLevelRatingCustomTag,
    setLevelRatingDifficulty, setLevelRatingFun, incrementLevelRatingRequestId,
} from './rating-actions.js';

const engine = () => createEngineState();

test('setLevelRatingContext resets the pane to an unloaded blank slate', () => {
    const eng = engine();
    applyLevelRatingData(eng, { tags: ['fun'], customTags: ['x'], difficulty: 3, fun: 4 });
    const r = setLevelRatingContext(eng, { levelFingerprint: 'fp1', levelNumber: 7 });
    assert.equal(r!.levelFingerprint, 'fp1');
    assert.equal(r!.levelNumber, 7);
    assert.equal(r!.loaded, false);
    assert.equal(r!.tags.size, 0);
    assert.deepEqual(r!.customTags, []);
    assert.equal(r!.difficulty, 0);
    assert.equal(r!.fun, 0);
    // Defaults: no args → null context
    const blank = setLevelRatingContext(engine());
    assert.equal(blank!.levelFingerprint, null);
    assert.equal(blank!.levelNumber, null);
});

test('applyLevelRatingData copies loaded data defensively and marks loaded', () => {
    const eng = engine();
    const tags = ['tricky', 'geese'];
    const customTags = ['mine'];
    const r = applyLevelRatingData(eng, { tags, customTags, difficulty: 2, fun: 5 });
    assert.deepEqual([...r!.tags].sort(), ['geese', 'tricky']);
    assert.deepEqual(r!.customTags, ['mine']);
    customTags.push('mutated');
    assert.deepEqual(r!.customTags, ['mine'], 'input array is copied, not aliased');
    assert.equal(r!.difficulty, 2);
    assert.equal(r!.fun, 5);
    assert.equal(r!.loaded, true);
    // Empty payload (e.g. no stored rating) normalizes falsy scales to 0
    const empty = applyLevelRatingData(engine(), {});
    assert.equal(empty!.difficulty, 0);
    assert.equal(empty!.fun, 0);
});

test('toggleLevelRatingTag flips membership and reports the new state', () => {
    const eng = engine();
    assert.equal(toggleLevelRatingTag(eng, 'fun'), true);
    assert.equal(toggleLevelRatingTag(eng, 'fun'), false);
    assert.equal(eng.levelRating.tags.has('fun'), false);
    assert.equal(toggleLevelRatingTag(eng, ''), false, 'empty tag is a no-op');
});

test('custom tags: trimmed, deduped, removable', () => {
    const eng = engine();
    assert.deepEqual(addLevelRatingCustomTag(eng, '  spicy  '), ['spicy']);
    assert.deepEqual(addLevelRatingCustomTag(eng, 'spicy'), ['spicy'], 'duplicate ignored');
    assert.deepEqual(addLevelRatingCustomTag(eng, '   '), ['spicy'], 'blank ignored');
    addLevelRatingCustomTag(eng, 'second');
    assert.deepEqual(removeLevelRatingCustomTag(eng, 'spicy'), ['second']);
    assert.deepEqual(removeLevelRatingCustomTag(eng, 'missing'), ['second'], 'removing a non-member is a no-op');
});

test('difficulty/fun scales set and requestId increments monotonically', () => {
    const eng = engine();
    assert.equal(setLevelRatingDifficulty(eng, 4), 4);
    assert.equal(setLevelRatingFun(eng, 5), 5);
    const first = incrementLevelRatingRequestId(eng);
    const second = incrementLevelRatingRequestId(eng);
    assert.equal(second, first + 1);
});

test('all rating actions fail soft without a levelRating slice', () => {
    const bare: any = {};
    assert.equal(setLevelRatingContext(bare), null);
    assert.equal(applyLevelRatingData(bare, {}), null);
    assert.equal(toggleLevelRatingTag(bare, 't'), false);
    assert.equal(addLevelRatingCustomTag(bare, 't'), null);
    assert.equal(removeLevelRatingCustomTag(bare, 't'), null);
    assert.equal(setLevelRatingDifficulty(bare, 1), undefined);
    assert.equal(setLevelRatingFun(bare, 1), undefined);
    assert.equal(incrementLevelRatingRequestId(bare), 0);
});
