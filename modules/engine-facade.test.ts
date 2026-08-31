/**
 * Unit tests for the grouped engine facade (createEngine). Verifies the grouped
 * namespaces (game/navigation/overlays/hints/solver/review/ratings) reference the exact
 * same function instances as the backward-compatible flat methods, so the two surfaces
 * cannot drift and no grouped entry is a typo'd `undefined`.
 *
 * createEngine wires real sub-controllers. Direct constants no longer travel through a facade,
 * so this test only supplies auto-vivifying Proxy stubs plus the explicit audio service needed
 * for construction, without exercising DOM/canvas/Firebase.
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
    return {
        state: deepStub(),
        ui: deepStub(),
        renderer: deepStub(),
        themes: deepStub(),
        data: deepStub(),
        persistence: deepStub(),
        editor: deepStub(),
        audioService: { play() {}, armUnlock() {}, setMutedProvider() {} },
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
    const state = { ENGINE: { runtime: { pendingConfirmationAction: null as (() => void) | null } } };
    deps.state = state as any;
    const engine = createEngine(deps);
    let executions = 0;
    const action = () => { executions += 1; };

    engine.setPendingConfirmationAction(action);
    assert.equal(state.ENGINE.runtime.pendingConfirmationAction, action, 'set stores the exact callback identity');
    engine.executePendingConfirmationAction();
    assert.equal(executions, 1, 'execute invokes the queued callback once');
    assert.equal(state.ENGINE.runtime.pendingConfirmationAction, action, 'execute does not implicitly clear the callback');
    engine.clearPendingAction();
    assert.equal(state.ENGINE.runtime.pendingConfirmationAction, null, 'clear removes the queued callback');
    engine.executePendingConfirmationAction();
    assert.equal(executions, 1, 'execute is a no-op once the callback is cleared');
});
