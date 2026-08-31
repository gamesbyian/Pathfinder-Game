/**
 * Behaviour-locking unit tests for modules/runtime/step-processor.js (computeStep).
 *
 * These tests verify that step events use GameEventType / EffectType constants
 * (not raw strings) and that all outcomes produce the correct event shapes.
 * Run: npx vitest run step-processor
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';

(globalThis as any).window = globalThis;
const { computeStep } = await import('./step-processor.js');
const { GameEventType }  = await import('./actions.js');
const { EffectType }  = await import('./effects.js');
const { PACK, UNPACK } = await import('../domain/cell-key.js');
const { isValidMove }            = await import('../domain/move-rules.js');
const { resolvePortal }          = await import('../domain/portal-utils.js');
const { MoveContext }            = await import('../domain/move-context.js');
const { areWinMetricsSatisfied, checkWinConditionImpl } = await import('./game-rules.js');
const { wouldCreateBlockedTIntersection } = await import('./path-state.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAY   = 0;
const EDITOR = 1;
const REVIEW = 2;
const IDLE             = 'IDLE';
const PORTAL_PAUSE     = 'PORTAL_PAUSE';
const HAZARD_TRIGGERED = 'HAZARD_TRIGGERED';

function makeLevel(opts: any = {}): any {
    return {
        grid:            opts.grid ?? { w: 5, h: 5 },
        gateKeys:        opts.gateKeys ?? [PACK(0, 0)],
        goalKey:         opts.goalKey ?? PACK(4, 0),
        reqLen:          opts.reqLen ?? 4,
        reqInt:          opts.reqInt ?? 0,
        blockSet:        opts.blockSet ?? new Set(),
        gooseSet:        opts.gooseSet ?? new Set(),
        falseGoalKeys:   opts.falseGoalKeys ?? new Set(),
        filterMap:       opts.filterMap ?? new Map(),
        flippingFilterMap: opts.flippingFilterMap ?? new Map(),
        portalMap:       opts.portalMap ?? new Map(),
        mustPassKeys:    opts.mustPassKeys ?? [],
        mustCrossKeys:   opts.mustCrossKeys ?? [],
    } as NormalizedLevel;
}

function makeNav(opts: any = {}): any {
    const nav = {
        path:                   [...(opts.path ?? [PACK(0, 0)])],
        visitedCounts:          new Map(opts.visitedCounts ?? [[PACK(0, 0), 1]]),
        cellUsage:              new Map(opts.cellUsage ?? []),
        intersections:          opts.intersections ?? 0,
        flipCount:              opts.flipCount ?? 0,
        crossedFlippingFilters: new Map(),
        activeGateKey:          opts.activeGateKey ?? PACK(0, 0),
        isPortalJump:           new Set(opts.isPortalJump ?? []),
        undoStack:              [],
    } as any;
    return nav;
}

function makeHazards(opts: any = {}): any {
    return {
        armedFalseGoals:    opts.armedFalseGoals ?? new Set(),
        revealedGeese:      opts.revealedGeese ?? new Set(),
        detonatedFalseGoals: opts.detonatedFalseGoals ?? new Set(),
    } as any;
}

// Build a stepHelpers object using real domain implementations.
// nav is passed so createNavSnapshot can capture it by reference (mirrors engine.js).
function makeStepHelpers(level: any, nav: any): any {
    const pushStepOnNav = (n: any, key: any, isJump: any) => {
        n.path.push(key);
        n.visitedCounts.set(key, (n.visitedCounts.get(key) || 0) + 1);
        if (isJump) n.isPortalJump.add(key);
    };

    const truncateNavTo = (n: any, targetLen: any) => {
        const removed = n.path.splice(targetLen);
        for (const k of removed) {
            const cur = n.visitedCounts.get(k) ?? 1;
            if (cur <= 1) n.visitedCounts.delete(k);
            else n.visitedCounts.set(k, cur - 1);
        }
    };

    return {
        isValidMove:                     (k: any, s: any, l: any, ctx: any) => isValidMove(k, s, l, ctx),
        wouldCreateBlockedTIntersection:  wouldCreateBlockedTIntersection,
        resolvePortal:                   (l: any, k: any) => resolvePortal(l, k),
        areWinMetricsSatisfied:          (n: any, lv: any) => areWinMetricsSatisfied(n, lv),
        getPortalDisplayColor:           () => '#d946ef',
        UNPACK,
        pushStepOnNav,
        truncateNavTo,
        // No-arg closure — mirrors engine.js createSnapshot() which reads from state.ENGINE.nav
        createNavSnapshot:               () => ({
            path:                nav.path.slice(),
            isPortalJump:        new Set(nav.isPortalJump),
            activeGateKey:       nav.activeGateKey,
            logicState:          IDLE,
            detonatedFalseGoals: new Set(),
        }),
        checkWinCondition:               (n: any, lv: any, mode: any, ls: any) => checkWinConditionImpl(n.path, lv, mode, ls, n.isPortalJump, n.visitedCounts, n.intersections, n.turnsAtMap),
        MoveContext,
        HAZARD_TRIGGERED,
        PORTAL_PAUSE,
        EDITOR,
        REVIEW,
        portalThemeColor:                '#d946ef',
    };
}


// ─── Outcome: null (invalid move) ────────────────────────────────────────────

test('returns null outcome for out-of-bounds target', () => {
    const level = makeLevel();
    const nav   = makeNav();
    const h     = makeStepHelpers(level, nav);
    const { outcome, events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(10, 10), h);
    assert.equal(outcome, null);
    assert.equal(events.length, 0);
});

test('returns null outcome for diagonal move', () => {
    const level = makeLevel();
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { outcome } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 1), h);
    assert.equal(outcome, null);
});

// ─── Outcome: backtrack ───────────────────────────────────────────────────────

test('backtrack step returns backtrack outcome', () => {
    const level = makeLevel();
    const nav   = makeNav({
        path: [PACK(0, 0), PACK(1, 0), PACK(2, 0)],
        visitedCounts: new Map([[PACK(0, 0), 1], [PACK(1, 0), 1], [PACK(2, 0), 1]]),
    });
    const h = makeStepHelpers(level, nav);
    const { outcome } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    assert.equal(outcome, 'backtrack');
});

test('backtrack step emits PLAY_SOUND event (not raw string)', () => {
    const level = makeLevel();
    const nav   = makeNav({
        path: [PACK(0, 0), PACK(1, 0), PACK(2, 0)],
        visitedCounts: new Map([[PACK(0, 0), 1], [PACK(1, 0), 1], [PACK(2, 0), 1]]),
    });
    const h = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EffectType.PLAY_SOUND, 'backtrack event type should be EffectType.PLAY_SOUND');
    assert.equal(events[0].note, 'E4', 'backtrack sound note should be E4');
});

test('backtrack step does NOT use raw string "sound"', () => {
    const level = makeLevel();
    const nav   = makeNav({
        path: [PACK(0, 0), PACK(1, 0)],
        visitedCounts: new Map([[PACK(0, 0), 1], [PACK(1, 0), 1]]),
    });
    const h = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(0, 0), h);
    assert.ok(!events.some(e => String(e.type) === 'sound'), 'event type should not be raw "sound" string');
});

// ─── Outcome: valid ───────────────────────────────────────────────────────────

test('valid step returns valid outcome', () => {
    const level = makeLevel();
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { outcome } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    assert.equal(outcome, 'valid');
});

test('valid step emits PLAY_SOUND with G4', () => {
    const level = makeLevel();
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    const soundEvt = events.find(e => e.type === EffectType.PLAY_SOUND)!;
    assert.ok(soundEvt, 'should emit PLAY_SOUND event');
    assert.equal((soundEvt as any).note, 'G4', 'normal step sound should be G4');
});

// ─── Outcome: win ─────────────────────────────────────────────────────────────

test('step to goal after correct path emits WIN event', () => {
    // 5-node path: (0,0)→(1,0)→(2,0)→(3,0)→(4,0) = reqLen=4, reqInt=0
    const level = makeLevel({ reqLen: 4, reqInt: 0, goalKey: PACK(4, 0) });
    const nav   = makeNav({
        path:          [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)],
        visitedCounts: new Map([[PACK(0, 0), 1], [PACK(1, 0), 1], [PACK(2, 0), 1], [PACK(3, 0), 1]]),
    });
    const h = makeStepHelpers(level, nav);
    const { outcome, events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(4, 0), h);
    assert.equal(outcome, 'valid');
    const winEvt = events.find(e => e.type === GameEventType.WIN)!;
    assert.ok(winEvt, 'should emit GameEventType.WIN event');
});

test('win event type is GameEventType.WIN (not raw string "win")', () => {
    const level = makeLevel({ reqLen: 4, reqInt: 0, goalKey: PACK(4, 0) });
    const nav   = makeNav({
        path:          [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)],
        visitedCounts: new Map([[PACK(0, 0), 1], [PACK(1, 0), 1], [PACK(2, 0), 1], [PACK(3, 0), 1]]),
    });
    const h = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(4, 0), h);
    assert.ok(!events.some(e => String(e.type) === 'win'), 'event type should not be raw "win" string');
    assert.ok(events.some(e => e.type === GameEventType.WIN), 'should use GameEventType.WIN constant');
});

// ─── Outcome: goose ───────────────────────────────────────────────────────────

test('stepping on a goose emits SHOW_GOOSE_JUMP_SCARE + LOGIC_STATE_CHANGE + PLAY_SOUND', () => {
    const level = makeLevel({ gooseSet: new Set([PACK(1, 0)]) });
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { outcome, events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    assert.equal(outcome, 'goose');
    assert.ok(events.some(e => e.type === EffectType.SHOW_GOOSE_JUMP_SCARE),
        'goose outcome should emit SHOW_GOOSE_JUMP_SCARE');
    assert.ok(events.some(e => e.type === GameEventType.LOGIC_STATE_CHANGE),
        'goose outcome should emit LOGIC_STATE_CHANGE');
    assert.ok(events.some(e => e.type === EffectType.PLAY_SOUND),
        'goose outcome should emit PLAY_SOUND');
});

test('goose event types are NOT raw strings', () => {
    const level = makeLevel({ gooseSet: new Set([PACK(1, 0)]) });
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    assert.ok(!events.some(e => String(e.type) === 'goose_jumpscare'), 'should not use raw "goose_jumpscare" string');
    assert.ok(!events.some(e => String(e.type) === 'logic_state'),     'should not use raw "logic_state" string');
    assert.ok(!events.some(e => String(e.type) === 'sound'),           'should not use raw "sound" string');
});

test('LOGIC_STATE_CHANGE event value is HAZARD_TRIGGERED', () => {
    const level = makeLevel({ gooseSet: new Set([PACK(1, 0)]) });
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const h     = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, makeHazards(), PLAY, IDLE, level, PACK(1, 0), h);
    const stateEvt = events.find(e => e.type === GameEventType.LOGIC_STATE_CHANGE)!;
    assert.equal(stateEvt.value, HAZARD_TRIGGERED);
});

// ─── Outcome: detonate ────────────────────────────────────────────────────────

test('stepping on armed false goal emits SHOW_FALSE_GOAL_DETONATION event', () => {
    const falseGoal = PACK(1, 0);
    // reqLen=1 so metrics are satisfied at that position
    const level = makeLevel({ reqLen: 1, reqInt: 0, goalKey: PACK(4, 0), falseGoalKeys: new Set([falseGoal]) });
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const hazards = makeHazards({ armedFalseGoals: new Set([falseGoal]) });
    const h = makeStepHelpers(level, nav);
    const { outcome, events } = computeStep(nav, hazards, PLAY, IDLE, level, falseGoal, h);
    assert.equal(outcome, 'detonate');
    assert.ok(events.some(e => e.type === EffectType.SHOW_FALSE_GOAL_DETONATION),
        'detonate outcome should emit SHOW_FALSE_GOAL_DETONATION');
});

test('detonate event type is NOT raw string "false_goal_detonation"', () => {
    const falseGoal = PACK(1, 0);
    const level = makeLevel({ reqLen: 1, reqInt: 0, goalKey: PACK(4, 0), falseGoalKeys: new Set([falseGoal]) });
    const nav   = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const hazards = makeHazards({ armedFalseGoals: new Set([falseGoal]) });
    const h = makeStepHelpers(level, nav);
    const { events } = computeStep(nav, hazards, PLAY, IDLE, level, falseGoal, h);
    assert.ok(!events.some(e => String(e.type) === 'false_goal_detonation'), 'should not use raw "false_goal_detonation" string');
    assert.ok(events.some(e => e.type === EffectType.SHOW_FALSE_GOAL_DETONATION), 'should use EffectType.SHOW_FALSE_GOAL_DETONATION');
});

// ─── Outcome: portal detonation (portal landing on armed false goal) ──────────

test('stepping through portal onto armed false goal emits SHOW_FALSE_GOAL_DETONATION', () => {
    // Path: gate(0,0) → portal-src(1,0) → [jump] → portal-dest(3,0) = false goal
    // Counted length = 3 nodes - 1 start - 1 portal jump = 1, so reqLen=1 satisfies metrics.
    const portalSrc  = PACK(1, 0);
    const portalDest = PACK(3, 0);
    const falseGoal  = portalDest;
    const portalMap  = new Map([[portalSrc, { dest: portalDest }], [portalDest, { dest: portalSrc }]]);
    const level = makeLevel({
        reqLen: 1, reqInt: 0,
        goalKey: PACK(4, 0),
        falseGoalKeys: new Set([falseGoal]),
        portalMap,
    });
    const nav     = makeNav({ path: [PACK(0, 0)], visitedCounts: new Map([[PACK(0, 0), 1]]) });
    const hazards = makeHazards({ armedFalseGoals: new Set([falseGoal]) });
    const h       = makeStepHelpers(level, nav);
    const { outcome, events } = computeStep(nav, hazards, PLAY, IDLE, level, portalSrc, h);
    assert.equal(outcome, 'detonate', 'stepping through portal onto armed false goal should detonate');
    assert.ok(events.some(e => e.type === EffectType.SHOW_FALSE_GOAL_DETONATION),
        'portal detonation should emit EffectType.SHOW_FALSE_GOAL_DETONATION (not raw string)');
    assert.ok(!events.some(e => String(e.type) === 'false_goal_detonation'),
        'portal detonation should NOT use raw string "false_goal_detonation"');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
