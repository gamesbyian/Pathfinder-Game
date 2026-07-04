import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseRawLevel } from '../domain/level-codec.js';
import { serializeLevel } from './editor-export.js';

function parseCompactLevel(text: string): any {
    return Function(`return ({${text}});`)();
}

test('serializeLevel includes canonical landmarks in compact editor export', () => {
    const level = parseRawLevel({
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        reqLen: 8,
        reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], hints: [],
        landmarks: [
            { x: 2, y: 2, objectType: 'park', role: 'surround' },
            { x: 3, y: 3, objectType: 'library', role: 'mustTurnCcw' },
        ],
    })!;

    const exported = parseCompactLevel(serializeLevel(level, 10, 1, [[1, 2, 3]]));
    assert.deepEqual(exported.landmarks, [
        { x: 2, y: 2, objectType: 'park', role: 'surround' },
        { x: 3, y: 3, objectType: 'library', role: 'mustTurn', turn: 'ccw' },
    ]);
    assert.equal(exported.levelId, undefined);
    assert.equal(exported.reqLen, 10);
    assert.equal(exported.reqInt, 1);
    assert.deepEqual(exported.hints, [[1, 2, 3]]);
});
