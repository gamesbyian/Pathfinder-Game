/**
 * Unit tests for the grouped engine facade (createEngine). Verifies the grouped
 * namespaces (game/navigation/overlays/hints/solver/review/ratings) reference the exact
 * same function instances as the backward-compatible flat methods, so the two surfaces
 * cannot drift and no grouped entry is a typo'd `undefined`.
 *
 * createEngine wires real sub-controllers, so it can't be constructed with a real `core`
 * (that needs the DOM). We supply a constants-only core plus auto-vivifying Proxy stubs
 * for the remaining deps — enough to construct without exercising DOM/canvas/Firebase.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createEngine, ENGINE_FACADE_GROUPS } from './engine.js';

// A callable Proxy that returns another stub for any property access or call. Safe for
// construction-time dependency wiring that never actually runs game logic.
function deepStub(): any {
    const fn = function deepStubFn() { return deepStub(); };
    return new Proxy(fn, {
        get(target: any, prop: any) {
            if (prop === 'then') return undefined; // never look like a thenable
            if (prop in target) return target[prop];
            return deepStub();
        },
        apply() { return deepStub(); },
    });
}

function makeDeps() {
    const core = {
        PLAY: 0, EDITOR: 1, REVIEW: 2,
        IDLE: 'IDLE', DRAGGING: 'DRAGGING', PORTAL_PAUSE: 'PORTAL_PAUSE', RESOLVED: 'RESOLVED',
        HAZARD_TRIGGERED: 'HAZARD_TRIGGERED', EDIT_DRAG: 'EDIT_DRAG',
        OVERLAY_NONE: 'NONE', HINT_ANIMATING: 'HINT_ANIMATING', FALSE_GOAL_ANIMATING: 'FALSE_GOAL_ANIMATING',
        GOOSE_OVERLAY: 'GOOSE_OVERLAY', SOLVER_RUNNING: 'SOLVER_RUNNING',
        AXIS: { NONE: 0, H: 1, V: 2 }, H: 1, V: 2, NONE: 0, DEV: false,
        SOUND_BUS: { play() {}, armUnlock() {}, setMutedProvider() {} },
        deepClone: (v: any) => v,
        $: () => null,
    };
    return {
        core,
        state: deepStub(),
        ui: deepStub(),
        renderer: deepStub(),
        levelUtils: deepStub(),
        themes: deepStub(),
        data: deepStub(),
        persistence: deepStub(),
        editor: deepStub(),
    };
}

// ENGINE_FACADE_GROUPS is the single source of truth for grouped-namespace membership (exported
// from engine.js and consumed by buildGroupedFacade). The test reads it directly so the grouping
// is declared in exactly one place — a group/method added there is automatically covered here.
// A group is either an array of flat names (exposed unchanged) or an exposedName→flatName map.
test('grouped namespaces reference the same instances as the flat methods', () => {
    const engine = createEngine(makeDeps());
    for (const [group, spec] of Object.entries(ENGINE_FACADE_GROUPS)) {
        assert.ok(engine[group], `missing group "${group}"`);
        const entries = Array.isArray(spec)
            ? spec.map((name: any) => [name, name])
            : Object.entries(spec);
        for (const [exposed, flat] of entries) {
            assert.notEqual(engine[flat], undefined, `flat method "${flat}" is undefined`);
            assert.equal(engine[group][exposed], engine[flat], `${group}.${exposed} should equal flat ${flat}`);
        }
    }
});

test('pending confirmation callbacks survive set, execute, and clear through the engine facade', () => {
    const deps = makeDeps();
    const state = { ENGINE: { runtime: { pendingAction: null as (() => void) | null } } };
    deps.state = state as any;
    const engine = createEngine(deps);
    let executions = 0;
    const action = () => { executions += 1; };

    engine.setPendingAction(action);
    assert.equal(state.ENGINE.runtime.pendingAction, action, 'set stores the exact callback identity');
    engine.executePendingAction();
    assert.equal(executions, 1, 'execute invokes the queued callback once');
    assert.equal(state.ENGINE.runtime.pendingAction, action, 'execute does not implicitly clear the callback');
    engine.clearPendingAction();
    assert.equal(state.ENGINE.runtime.pendingAction, null, 'clear removes the queued callback');
    engine.executePendingAction();
    assert.equal(executions, 1, 'execute is a no-op once the callback is cleared');
});
