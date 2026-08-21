/**
 * Win-condition matrix (hardening plan §1): every clause of the 7-part win condition has
 * an accept case and a reject case that fails if that clause is deleted.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from '../domain/cell-key.js';
import { buildWireLevelData, parseRawLevel } from '../domain/level-codec.js';
import { getRealLength, areWinMetricsSatisfied, checkWinConditionImpl } from './game-rules.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function level(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 1 };
    const l = parseRawLevel({
        grid,
        gates: [{ x: 1, y: 1 }],
        goal: { x: grid.w, y: grid.h },
        reqLen: grid.w - 1,
        reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
    assert.ok(l, 'fixture level must parse');
    return l!;
}

/** Metrics state for a straight walk along the given keys (no portals). */
function walk(pathKeys: number[], extra: any = {}) {
    const visitedCounts = new Map<number, number>();
    for (const k of pathKeys) visitedCounts.set(k, (visitedCounts.get(k) || 0) + 1);
    return {
        path: pathKeys,
        isPortalJump: new Set<number>(),
        visitedCounts,
        intersections: 0,
        turnsAtMap: new Map<number, string>(),
        ...extra,
    };
}

const corridorPath = [K(1, 1), K(2, 1), K(3, 1), K(4, 1), K(5, 1)];

test('getRealLength: nodes − 1 − portal jumps; empty path is 0', () => {
    assert.equal(getRealLength(walk([])), 0);
    assert.equal(getRealLength(walk(corridorPath)), 4);
    assert.equal(getRealLength(walk(corridorPath, { isPortalJump: new Set([2]) })), 3);
});

test('clause 1 — exact counted length (reject over/under)', () => {
    const l = level();
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), l), true);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath.slice(0, 4)), l), false);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), level({ reqLen: 5 })), false);
});

test('clause 2 — exact intersection count', () => {
    const l = level({ reqInt: 1 });
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), l), false);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath, { intersections: 1 }), l), true);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath, { intersections: 2 }), l), false);
});

test('clause 3 — every must-pass cell visited', () => {
    const l = level({ mustPass: [{ x: 3, y: 1 }] });
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), l), true);
    const skipping = walk(corridorPath);
    skipping.visitedCounts.delete(K(3, 1));
    assert.equal(areWinMetricsSatisfied(skipping, l), false);
});

test('clause 4 — every must-cross cell visited at least twice', () => {
    const l = level({ mustCross: [{ x: 3, y: 1 }] });
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), l), false, 'one visit is not a cross');
    const crossed = walk(corridorPath);
    crossed.visitedCounts.set(K(3, 1), 2);
    assert.equal(areWinMetricsSatisfied(crossed, l), true);
});

test('clause 5 — surround: every reachable 8-neighbor visited; blocks excluded', () => {
    const l = level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 }, reqLen: 6,
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    });
    const ring = [K(1, 3), K(1, 2), K(1, 1), K(2, 1), K(3, 1), K(3, 2), K(3, 3)];
    assert.equal(areWinMetricsSatisfied(walk(ring), l), false, '(2,3) neighbor unvisited');

    const withNeighbor = walk(ring);
    withNeighbor.visitedCounts.set(K(2, 3), 1);
    assert.equal(areWinMetricsSatisfied(withNeighbor, l), true);

    const blocked = level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 }, reqLen: 6,
        blocks: [{ x: 2, y: 3 }],
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    });
    assert.equal(areWinMetricsSatisfied(walk(ring), blocked), true, 'blocked neighbor is not required');

    // A goose is just as impassable as a block, so a goose-occupied neighbor must be excluded
    // from "every reachable neighbor visited" the same way a blocked one is — otherwise the
    // win condition demands a visit to a cell no legal path can ever reach.
    const goosed = level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 }, reqLen: 6,
        geese: [{ x: 2, y: 3 }],
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    });
    assert.equal(areWinMetricsSatisfied(walk(ring), goosed), true, 'goosed neighbor is not required');
});

test('clause 6 — must-turn: turn of the required direction at the cell', () => {
    const mk = (role: string, turn?: string) => level({
        landmarks: [{ x: 3, y: 1, objectType: 'library', role, ...(turn ? { turn } : {}) }],
    });
    const noTurn = walk(corridorPath);
    assert.equal(areWinMetricsSatisfied(noTurn, mk('mustTurn', 'either')), false);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath, { turnsAtMap: undefined }), mk('mustTurn', 'either')), false, 'missing turnsAtMap fails closed');

    const cwTurn = walk(corridorPath, { turnsAtMap: new Map([[K(3, 1), 'cw']]) });
    assert.equal(areWinMetricsSatisfied(cwTurn, mk('mustTurn', 'either')), true);
    assert.equal(areWinMetricsSatisfied(cwTurn, mk('mustTurnCw')), true);
    assert.equal(areWinMetricsSatisfied(cwTurn, mk('mustTurnCcw')), false);
    const both = walk(corridorPath, { turnsAtMap: new Map([[K(3, 1), 'both']]) });
    assert.equal(areWinMetricsSatisfied(both, mk('mustTurnCcw')), true, "'both' satisfies either direction");
});

test('clause 7 — adjacent-turn: matching turn at one of the 8 neighbors', () => {
    const mk = (turn: string) => level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4,
        landmarks: [{ x: 2, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn }],
    });
    const p = [K(1, 1), K(2, 1), K(3, 1), K(3, 2), K(3, 3)];
    assert.equal(areWinMetricsSatisfied(walk(p), mk('either')), false, 'no turns recorded');
    assert.equal(areWinMetricsSatisfied(walk(p, { turnsAtMap: undefined }), mk('either')), false, 'missing turnsAtMap fails closed');

    const turned = walk(p, { turnsAtMap: new Map([[K(3, 1), 'cw']]) });
    assert.equal(areWinMetricsSatisfied(turned, mk('either')), true);
    assert.equal(areWinMetricsSatisfied(turned, mk('cw')), true);
    assert.equal(areWinMetricsSatisfied(turned, mk('ccw')), false);
});

test('empty path and missing level are never wins', () => {
    assert.equal(areWinMetricsSatisfied(walk([]), level()), false);
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), undefined), false);
});

test('checkWinConditionImpl guards: goal cell, hazard state, and editor/review modes', () => {
    const l = level();
    const win = walk(corridorPath);
    const args = (path: number[], mode: number, logic: string) =>
        checkWinConditionImpl(path, l, mode, logic, win.isPortalJump, win.visitedCounts, 0, win.turnsAtMap);

    assert.equal(args(corridorPath, 0, 'IDLE'), true);
    assert.equal(args([], 0, 'IDLE'), false, 'empty path');
    assert.equal(args(corridorPath.slice(0, 4), 0, 'IDLE'), false, 'not on the goal');
    assert.equal(args(corridorPath, 0, 'HAZARD_TRIGGERED'), false, 'hazard already fired');
    assert.equal(args(corridorPath, 1, 'IDLE'), false, 'EDITOR mode never wins');
    assert.equal(args(corridorPath, 2, 'IDLE'), false, 'REVIEW mode never wins');
});


test('serialize-then-parse preserves runtime surround win metrics', () => {
    const l = parseRawLevel(buildWireLevelData(level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 }, reqLen: 6,
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    })))!;
    const ring = [K(1, 3), K(1, 2), K(1, 1), K(2, 1), K(3, 1), K(3, 2), K(3, 3)];
    assert.equal(areWinMetricsSatisfied(walk(ring), l), false, 'serialized surround still requires all reachable neighbors');
    const withNeighbor = walk(ring);
    withNeighbor.visitedCounts.set(K(2, 3), 1);
    assert.equal(areWinMetricsSatisfied(withNeighbor, l), true);
});

test('serialize-then-parse preserves runtime must-turn win metrics', () => {
    const l = parseRawLevel(buildWireLevelData(level({
        landmarks: [{ x: 3, y: 1, objectType: 'library', role: 'mustTurnCcw' }],
    })))!;
    assert.equal(areWinMetricsSatisfied(walk(corridorPath), l), false, 'serialized must-turn rejects pass-through without a turn');
    assert.equal(areWinMetricsSatisfied(walk(corridorPath, { turnsAtMap: new Map([[K(3, 1), 'ccw']]) }), l), true);
});

test('serialize-then-parse preserves runtime adjacent-turn win metrics', () => {
    const l = parseRawLevel(buildWireLevelData(level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4,
        landmarks: [{ x: 2, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' }],
    })))!;
    const p = [K(1, 1), K(2, 1), K(3, 1), K(3, 2), K(3, 3)];
    assert.equal(areWinMetricsSatisfied(walk(p), l), false, 'serialized adjacent-turn requires a qualifying adjacent turn');
    assert.equal(areWinMetricsSatisfied(walk(p, { turnsAtMap: new Map([[K(3, 1), 'cw']]) }), l), true);
});
