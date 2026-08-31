/** Unit tests for modules/runtime/actions.js and modules/runtime/effects.js */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { GameEventType } from './actions.js';
import { EffectType, Effects } from './effects.js';


// --- GameEventType ---

test('GameEventType is frozen', () => {
    assert.ok(Object.isFrozen(GameEventType));
});

test('GameEventType values equal their keys', () => {
    for (const [k, v] of Object.entries(GameEventType)) {
        assert.equal(v, k, `GameEventType.${k} should equal '${k}'`);
    }
});

test('GameEventType contains exactly the two live step events', () => {
    assert.deepEqual(Object.keys(GameEventType).sort(), ['LOGIC_STATE_CHANGE', 'WIN']);
    assert.equal(GameEventType.LOGIC_STATE_CHANGE, 'LOGIC_STATE_CHANGE');
    assert.equal(GameEventType.WIN, 'WIN');
});

test('superseded command/outcome vocabulary is not retained as gameplay events', () => {
    for (const removed of [
        'MOVE', 'UNDO', 'RESET',
        'LEVEL_LOAD', 'LEVEL_ADVANCE', 'LEVEL_PREV', 'LEVEL_RESTART',
        'BACKTRACK', 'PORTAL_TRAVERSE', 'GOOSE_TRIGGERED', 'FALSE_GOAL_DETONATED',
    ]) {
        assert.equal(removed in GameEventType, false, `${removed} must not be retained in GameEventType`);
    }
});

// --- EffectType ---

test('EffectType is frozen', () => {
    assert.ok(Object.isFrozen(EffectType));
});

test('EffectType values equal their keys', () => {
    for (const [k, v] of Object.entries(EffectType)) {
        assert.equal(v, k, `EffectType.${k} should equal '${k}'`);
    }
});

test('EffectType contains expected audio/modal/message constants', () => {
    assert.equal(EffectType.PLAY_SOUND,   'PLAY_SOUND');
    assert.equal(EffectType.OPEN_MODAL,   'OPEN_MODAL');
    assert.equal(EffectType.CLOSE_MODAL,  'CLOSE_MODAL');
    assert.equal(EffectType.SHOW_MESSAGE, 'SHOW_MESSAGE');
});

test('EffectType contains expected hazard animation constants', () => {
    assert.equal(EffectType.SHOW_GOOSE_JUMP_SCARE, 'SHOW_GOOSE_JUMP_SCARE');
    assert.equal(EffectType.HIDE_GOOSE_JUMP_SCARE, 'HIDE_GOOSE_JUMP_SCARE');
    assert.equal(EffectType.SHOW_FALSE_GOAL_DETONATION,  'SHOW_FALSE_GOAL_DETONATION');
    assert.equal(EffectType.HIDE_FALSE_GOAL_DETONATION,  'HIDE_FALSE_GOAL_DETONATION');
});

test('EffectType contains expected infrastructure constants', () => {
    assert.equal(EffectType.MARK_RENDER_DIRTY, 'MARK_RENDER_DIRTY');
    assert.equal(EffectType.PERSIST_PROGRESS,  'PERSIST_PROGRESS');
    assert.equal(EffectType.SCHEDULE_TIMER,    'SCHEDULE_TIMER');
});

// --- Effects factories ---

test('Effects is frozen', () => {
    assert.ok(Object.isFrozen(Effects));
});

test('Effects.playSound produces correct shape', () => {
    const e = Effects.playSound('C5', '8n');
    assert.equal(e.type, EffectType.PLAY_SOUND);
    assert.equal(e.note, 'C5');
    assert.equal(e.duration, '8n');
});

test('Effects.openModal produces correct shape', () => {
    const e = Effects.openModal('winModal');
    assert.equal(e.type, EffectType.OPEN_MODAL);
    assert.equal(e.modalId, 'winModal');
});

test('Effects.closeModal produces correct shape', () => {
    const e = Effects.closeModal('guideModal');
    assert.equal(e.type, EffectType.CLOSE_MODAL);
    assert.equal(e.modalId, 'guideModal');
});

test('Effects.showMessage produces correct shape', () => {
    const e = Effects.showMessage('Level complete!', 'success');
    assert.equal(e.type, EffectType.SHOW_MESSAGE);
    assert.equal(e.text, 'Level complete!');
    assert.equal(e.style, 'success');
});

test('Effects.showGooseJumpScare produces correct shape', () => {
    const e = Effects.showGooseJumpScare();
    assert.equal(e.type, EffectType.SHOW_GOOSE_JUMP_SCARE);
});

test('Effects.showFalseGoalDetonation defaults exploded to false', () => {
    const e = Effects.showFalseGoalDetonation();
    assert.equal(e.type, EffectType.SHOW_FALSE_GOAL_DETONATION);
    assert.equal(e.exploded, false);
});

test('Effects.showFalseGoalDetonation accepts exploded=true', () => {
    const e = Effects.showFalseGoalDetonation(true);
    assert.equal(e.exploded, true);
});

test('Effects.markRenderDirty produces correct shape', () => {
    const e = Effects.markRenderDirty();
    assert.equal(e.type, EffectType.MARK_RENDER_DIRTY);
});

test('Effects.persistProgress produces correct shape', () => {
    const e = Effects.persistProgress(3);
    assert.equal(e.type, EffectType.PERSIST_PROGRESS);
    assert.equal(e.levelIdx, 3);
});

test('Effects.scheduleTimer produces correct shape', () => {
    const action = { type: 'TEST_TIMER_CONTINUATION' };
    const e = Effects.scheduleTimer('falseGoalPhase2', 1000, action);
    assert.equal(e.type, EffectType.SCHEDULE_TIMER);
    assert.equal(e.id, 'falseGoalPhase2');
    assert.equal(e.ms, 1000);
    assert.deepEqual(e.action, action);
});

// --- Summary ---
