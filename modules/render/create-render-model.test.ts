import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createEngineState } from '../state-slices.js';
import { PACK } from '../domain/cell-key.js';
import { createRenderModel } from './create-render-model.js';

const core = { PLAY: 0, EDITOR: 1, REVIEW: 2, IDLE: 'idle', OVERLAY_NONE: 'none', HINT_ANIMATING: 'hint_animating' };
const themes = { THEMES: { classic: { path: '#fff' } }, getCurrentTheme: () => 'classic' };

test('createRenderModel surfaces the editor false-goal-trigger overlay sets from EditorState', () => {
    const eng = createEngineState({ core }) as any;
    eng.mode = core.EDITOR;
    eng.editor.triggerableFalseGoalCells = new Set([PACK(1, 1), PACK(2, 2)]);
    eng.editor.falseGoalTriggerParityCandidates = new Set([PACK(3, 3)]);

    const model = createRenderModel({ eng, core, themes });

    assert.equal(model.editorTriggerableFalseGoalCells.size, 2);
    assert.ok(model.editorTriggerableFalseGoalCells.has(PACK(1, 1)));
    assert.ok(model.editorTriggerableFalseGoalCells.has(PACK(2, 2)));
    assert.equal(model.editorFalseGoalTriggerParityCandidates.size, 1);
    assert.ok(model.editorFalseGoalTriggerParityCandidates.has(PACK(3, 3)));

    // Snapshot copy, not a live reference to the editor's own Sets.
    eng.editor.triggerableFalseGoalCells.add(PACK(9, 9));
    assert.equal(model.editorTriggerableFalseGoalCells.size, 2);
});


test('createRenderModel snapshots the current runtime transform selector', () => {
    const eng = createEngineState({ core }) as any;
    eng.orientation = 6;
    const model = createRenderModel({ eng, core, themes });

    assert.equal(model.orientation, 6);
    eng.orientation = 2;
    assert.equal(model.orientation, 6, 'render model is a frame snapshot, not a live state reference');
});
