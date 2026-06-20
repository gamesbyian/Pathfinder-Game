#!/usr/bin/env node
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
import { createEngine } from '../modules/engine.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
    catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

// A callable Proxy that returns another stub for any property access or call. Safe for
// construction-time dependency wiring that never actually runs game logic.
function deepStub() {
    const fn = function deepStubFn() { return deepStub(); };
    return new Proxy(fn, {
        get(target, prop) {
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
        deepClone: (v) => v,
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

const GROUPS = {
    game: ['loadLevel', 'resetRunState', 'processStep', 'checkWinCondition', 'areWinMetricsSatisfied',
        'wouldCreateBlockedTIntersection', 'attemptMoveTo', 'handlePrimaryGridInput', 'createSnapshot',
        'applySnapshot', 'getRealLength', 'getPackedPath', 'getIntersections', 'rebuildDerivedPathState',
        'assertStateConsistency'],
    navigation: ['PathNavigator', 'reversePathDirection', 'remapNavKeys', 'findTapRoute', 'setVariant'],
    overlays: ['setOverlayState', 'startHintAnimation', 'stopHintAnimation'],
    hints: ['setHintPaths', 'clearHintPaths', 'pinCurrentHint', 'clearPersistedHint', 'pinCurrentHeatmap', 'clearPersistedHeatmap'],
    solver: ['cancelSolver', 'startSolverRun', 'endSolverRun', 'isRunning'],
    review: ['initReviewMode', 'loadReviewLevel', 'setReviewSubmissions', 'removeReviewSubmission'],
};

// Grouped key -> flat key for entries that were renamed in their group.
const RATINGS = {
    refreshLevelRatingPane: 'refreshLevelRatingPane',
    toggleTag: 'toggleLevelRatingTag',
    addCustomTag: 'addLevelRatingCustomTag',
    removeCustomTag: 'removeLevelRatingCustomTag',
    setScale: 'setLevelRatingScale',
};

test('grouped namespaces reference the same instances as the flat methods', () => {
    const engine = createEngine(makeDeps());
    for (const [group, names] of Object.entries(GROUPS)) {
        assert.ok(engine[group], `missing group "${group}"`);
        for (const name of names) {
            assert.notEqual(engine[name], undefined, `flat method "${name}" is undefined`);
            assert.equal(engine[group][name], engine[name], `${group}.${name} should equal flat ${name}`);
        }
    }
    assert.ok(engine.ratings, 'missing ratings group');
    for (const [groupKey, flatKey] of Object.entries(RATINGS)) {
        assert.notEqual(engine[flatKey], undefined, `flat method "${flatKey}" is undefined`);
        assert.equal(engine.ratings[groupKey], engine[flatKey], `ratings.${groupKey} should equal flat ${flatKey}`);
    }
});

if (failed > 0) {
    console.error(`\nEngine facade tests: ${passed} passed, ${failed} failed`);
    process.exit(1);
}
console.log(`\nEngine facade tests: ${passed} passed, ${failed} failed`);
