/**
 * Behaviour-locking unit tests for modules/runtime/effect-runner.js (runEffects).
 *
 * Verifies that each EffectType constant routes to the correct adapter method,
 * that missing adapters are safely skipped, and that multiple effects are all dispatched.
 * Run: npx vitest run effect-runner
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';

(globalThis as any).window = globalThis;
const { runEffects } = await import('./effect-runner.js');
const { EffectType, Effects } = await import('./effects.js');


// ─── Per-effect routing ───────────────────────────────────────────────────────

test('PLAY_SOUND routes to playSound adapter', () => {
    const calls: any[] = [];
    runEffects([Effects.playSound('C4', '8n')], { playSound: (n: any, d: any) => calls.push({ n, d }) });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].n, 'C4');
    assert.equal(calls[0].d, '8n');
});

test('OPEN_MODAL routes to openModal adapter', () => {
    const calls: any[] = [];
    runEffects([Effects.openModal('winModal')], { openModal: (id: any) => calls.push(id) });
    assert.equal(calls[0], 'winModal');
});

test('CLOSE_MODAL routes to closeModal adapter', () => {
    const calls: any[] = [];
    runEffects([Effects.closeModal('winModal')], { closeModal: (id: any) => calls.push(id) });
    assert.equal(calls[0], 'winModal');
});

test('SHOW_MESSAGE routes to showMessage adapter', () => {
    const calls: any[] = [];
    runEffects([Effects.showMessage('hello', 'red')], { showMessage: (t: any, s: any) => calls.push({ t, s }) });
    assert.equal(calls[0].t, 'hello');
    assert.equal(calls[0].s, 'red');
});

test('SHOW_GOOSE_JUMP_SCARE routes to showGooseJumpScare adapter', () => {
    let called = false;
    runEffects([Effects.showGooseJumpScare()], { showGooseJumpScare: () => { called = true; } });
    assert.ok(called);
});

test('HIDE_GOOSE_JUMP_SCARE routes to hideGooseJumpScare adapter', () => {
    let called = false;
    runEffects([Effects.hideGooseJumpScare()], { hideGooseJumpScare: () => { called = true; } });
    assert.ok(called);
});

test('SHOW_FALSE_GOAL_DETONATION routes to showFalseGoalDetonation adapter with fx object', () => {
    const calls: any[] = [];
    const fx = { type: EffectType.SHOW_FALSE_GOAL_DETONATION, key: 42 } as any;
    runEffects([fx], { showFalseGoalDetonation: (f: any) => calls.push(f) });
    assert.equal(calls[0].key, 42);
});

test('HIDE_FALSE_GOAL_DETONATION routes to hideFalseGoalDetonation adapter', () => {
    let called = false;
    runEffects([Effects.hideFalseGoalDetonation()], { hideFalseGoalDetonation: () => { called = true; } });
    assert.ok(called);
});

test('MARK_RENDER_DIRTY routes to markRenderDirty adapter', () => {
    let called = false;
    runEffects([Effects.markRenderDirty()], { markRenderDirty: () => { called = true; } });
    assert.ok(called);
});

test('PERSIST_PROGRESS routes to persistProgress adapter with levelIdx', () => {
    const calls: any[] = [];
    runEffects([Effects.persistProgress(7)], { persistProgress: (idx: any) => calls.push(idx) });
    assert.equal(calls[0], 7);
});

test('SCHEDULE_TIMER routes to scheduleTimer adapter with id, ms, action', () => {
    const calls: any[] = [];
    const action = () => {};
    runEffects([Effects.scheduleTimer('t1', 500, action)], {
        scheduleTimer: (id: any, ms: any, a: any) => calls.push({ id, ms, a }),
    });
    assert.equal(calls[0].id, 't1');
    assert.equal(calls[0].ms, 500);
    assert.equal(calls[0].a, action);
});

// ─── Robustness ───────────────────────────────────────────────────────────────

test('missing adapter is silently skipped', () => {
    // Should not throw even when no adapter is provided
    assert.doesNotThrow(() => runEffects([Effects.playSound('C4', '8n')], {}));
});

test('unknown effect type is silently ignored', () => {
    assert.doesNotThrow(() => runEffects([{ type: 'UNKNOWN_TYPE' }], {}));
});

test('multiple effects are all dispatched in order', () => {
    const log: any[] = [];
    runEffects(
        [Effects.playSound('A4', '8n'), Effects.openModal('winModal'), Effects.persistProgress(3)],
        {
            playSound:       (n: any) => log.push(`sound:${n}`),
            openModal:       (id: any) => log.push(`modal:${id}`),
            persistProgress: (idx: any) => log.push(`persist:${idx}`),
        }
    );
    assert.deepEqual(log, ['sound:A4', 'modal:winModal', 'persist:3']);
});

test('empty effects array dispatches nothing', () => {
    let called = false;
    runEffects([], { playSound: () => { called = true; } });
    assert.ok(!called);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
