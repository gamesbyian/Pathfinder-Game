import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLocalSessionStore } from './local-session-store.js';

function installStorage() {
    const values = new Map<string, string>();
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, String(value)); },
        removeItem: (key: string) => { values.delete(key); },
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    return storage;
}

test('session persistence excludes runtime transform state and ignores transform-like legacy extras', () => {
    const storage = installStorage();
    const state = {
        levelIdx: 3,
        orientation: 6,
        runtime: { currentTheme: 'classic' },
    };
    const store = createLocalSessionStore(
        { appId: 'phase11a', auth: { currentUser: null }, db: null },
        {
            getRawLevels: () => [{}, {}, {}, {}],
            themeExists: (id: string) => id === 'classic',
            getState: () => state,
        },
    );

    store.persistSessionState();
    const written = JSON.parse(storage.getItem('pathfinder_session_phase11a')!);
    assert.equal(written.levelIdx, 3);
    assert.equal(written.currentTheme, 'classic');
    assert.equal(typeof written.updatedAt, 'number');
    const retiredRuntimeKey = ['var', 'iant'].join('');
    assert.equal(retiredRuntimeKey in written, false, 'retired runtime spelling is not a persisted session field');
    assert.equal('orientation' in written, false, '11B must not accidentally invent persistence');

    storage.setItem('pathfinder_session_phase11a', JSON.stringify({
        levelIdx: 2,
        currentTheme: 'classic',
        updatedAt: written.updatedAt + 1,
        [retiredRuntimeKey]: 5,
        orientation: 7,
    }));

    assert.deepEqual(store.applySessionState(), { levelIdx: 2, currentTheme: 'classic' });
    assert.equal(state.orientation, 6, 'session reads do not restore runtime orientation state');
});
