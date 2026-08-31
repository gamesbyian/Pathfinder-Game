/** Behavior tests for the level-rating manager's legacy-fingerprint migration
 *  (docs/archive/landmark-submission-serialization-plan.md's fingerprintVersion bump orphaned
 *  every rating persisted under the prior v1 fingerprint algorithm). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLevelRatingManager } from './level-rating-manager.js';
import { createEngineState } from '../state-slices.js';
import { getLevelFingerprint, getLegacyLevelFingerprints } from '../domain/level-fingerprint.js';
import { PLAY } from '../app-constants.js';


const RAW_LEVEL = {
    grid: { w: 5, h: 5 }, reqLen: 8, reqInt: 0,
    gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
    falseGoals: [], blocks: [{ x: 2, y: 2 }], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [], geese: [], landmarks: [],
};

function createHarness({ ratingsByFingerprint = {} as Record<string, any> } = {}) {
    const state = { ENGINE: createEngineState() };
    state.ENGINE.isDevMode = true;
    state.ENGINE.mode = PLAY;
    state.ENGINE.levelIdx = 0;

    const renderCalls: any[] = [];
    const ui = { renderLevelRatingPane: (r: any) => renderCalls.push(r) };
    const data = { getLevel: () => RAW_LEVEL } as any;
    const loadCalls: string[] = [];
    const saveCalls: any[] = [];
    const errors: any[] = [];
    const persistence = {
        loadLevelRating: async (fingerprint: string) => {
            loadCalls.push(fingerprint);
            return ratingsByFingerprint[fingerprint] ?? null;
        },
        saveLevelRating: async (fingerprint: string, levelNumber: number | null, rating: any) => {
            saveCalls.push({ fingerprint, levelNumber, rating });
        },
    };
    const reportError = (context: string, err: any) => errors.push({ context, err });

    const manager = createLevelRatingManager({ state, ui, data, levelUtils: {} as any, persistence: persistence as any, reportError });
    return { state, manager, loadCalls, saveCalls, errors, renderCalls };
}

test('a hit on the current fingerprint applies the rating without touching legacy keys', async () => {
    const currentFingerprint = await getLevelFingerprint(RAW_LEVEL);
    const rating = { tags: ['fun'], customTags: ['cool'], difficulty: 3, fun: 4 };
    const { state, manager, loadCalls, saveCalls } = createHarness({ ratingsByFingerprint: { [currentFingerprint]: rating } });

    await manager.refreshForCurrentLevel();

    assert.deepEqual(loadCalls, [currentFingerprint], 'only the current fingerprint should be queried');
    assert.equal(saveCalls.length, 0, 'no migration write when there is nothing to migrate');
    assert.deepEqual([...state.ENGINE.levelRating.tags], ['fun']);
    assert.equal(state.ENGINE.levelRating.difficulty, 3);
    assert.equal(state.ENGINE.levelRating.loaded, true);
});

test('a miss on the current fingerprint falls back to a legacy key, applies it, and migrates it forward', async () => {
    const currentFingerprint = await getLevelFingerprint(RAW_LEVEL);
    const [legacyFingerprint] = await getLegacyLevelFingerprints(RAW_LEVEL);
    const legacyRating = { tags: ['geese'], customTags: [], difficulty: 5, fun: 2 };
    const { state, manager, loadCalls, saveCalls } = createHarness({ ratingsByFingerprint: { [legacyFingerprint]: legacyRating } });

    await manager.refreshForCurrentLevel();

    assert.deepEqual(loadCalls, [currentFingerprint, legacyFingerprint], 'current key first, then the legacy key');
    assert.equal(saveCalls.length, 1, 'the found legacy rating is copied forward to the current key');
    assert.equal(saveCalls[0].fingerprint, currentFingerprint);
    assert.deepEqual(saveCalls[0].rating, legacyRating);
    assert.deepEqual([...state.ENGINE.levelRating.tags], ['geese'], 'the legacy rating is applied to the UI');
    assert.equal(state.ENGINE.levelRating.difficulty, 5);
});

test('a miss on every fingerprint (current and legacy) resolves to a blank, loaded rating', async () => {
    const { state, manager, saveCalls } = createHarness();

    await manager.refreshForCurrentLevel();

    assert.equal(saveCalls.length, 0);
    assert.equal(state.ENGINE.levelRating.tags.size, 0);
    assert.equal(state.ENGINE.levelRating.difficulty, 0);
    assert.equal(state.ENGINE.levelRating.loaded, true);
});

test('a failed migration write reports but does not block applying the legacy rating', async () => {
    const currentFingerprint = await getLevelFingerprint(RAW_LEVEL);
    const [legacyFingerprint] = await getLegacyLevelFingerprints(RAW_LEVEL);
    const legacyRating = { tags: ['tricky'], customTags: [], difficulty: 1, fun: 1 };

    const state = { ENGINE: createEngineState() };
    state.ENGINE.isDevMode = true;
    state.ENGINE.mode = PLAY;
    state.ENGINE.levelIdx = 0;
    const ui = { renderLevelRatingPane: () => {} };
    const data = { getLevel: () => RAW_LEVEL } as any;
    const errors: any[] = [];
    const persistence = {
        loadLevelRating: async (fingerprint: string) => (fingerprint === legacyFingerprint ? legacyRating : null),
        saveLevelRating: async () => { throw new Error('write failed'); },
    };
    const reportError = (context: string, err: any) => errors.push({ context, err });
    const manager = createLevelRatingManager({ state, ui, data, levelUtils: {} as any, persistence: persistence as any, reportError });

    await manager.refreshForCurrentLevel();

    assert.equal(state.ENGINE.levelRating.fingerprint, currentFingerprint);
    assert.deepEqual([...state.ENGINE.levelRating.tags], ['tricky'], 'still applies despite the failed migration write');
    assert.ok(errors.some((e) => e.context === 'level-rating.migrate'), 'the migration failure is reported');
});
