import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLevelUtils } from './level-utils.js';
import { transformPoint } from './domain/geometry.js';
import { PLAY } from './app-constants.js';

const playableButSchemaDiagnosticLevel = {
  grid: { w: 4, h: 5 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 4, y: 5 },
  reqLen: 2,
  reqInt: 0,
};

test('normalizeLevel reports schema diagnostics but still returns a parseable level', () => {
  const reported: any[] = [];
  const levelUtils = createLevelUtils({
    data: { getLevels: () => [playableButSchemaDiagnosticLevel] },
    getState: () => ({ viewport: {} }),
    getRenderer: () => ({ getCanvas: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), width: 1, height: 1 }) }),
    reportError: (...args: any[]) => reported.push(args),
  });

  const level = levelUtils.normalizeLevel(0) as any;

  assert(level, 'parseable Firestore-published levels should still display when schema diagnostics are reported');
  assert.equal(level.grid.w, 4);
  assert.equal(level.grid.h, 5);
  assert.equal(reported.length, 1);
  assert.equal(reported[0][0], 'level.validation');
});

test('getGridCoord inverts rendered canvas cells for every runtime transform', () => {
  const level = {
    grid: { w: 7, h: 5 },
    gateKeys: [],
    goalKey: 0,
  } as any;
  const cellSize = 20;
  const canvas = {
    width: 140,
    height: 140,
    getBoundingClientRect: () => ({ left: 11, top: 17, width: 140, height: 140 }),
  };
  const engineState = {
    mode: PLAY,
    level,
    orientation: 0,
    viewport: { cellW: cellSize, cellH: cellSize, swapped: false },
  } as any;
  const levelUtils = createLevelUtils({
    data: { getLevels: () => [] },
    getState: () => engineState,
    getRenderer: () => ({ getCanvas: () => canvas }),
  });

  for (let orientation = 0; orientation < 8; orientation += 1) {
    engineState.orientation = orientation;
    engineState.viewport.swapped = [1, 3, 6, 7].includes(orientation);
    for (let x = 0; x < level.grid.w; x += 1) {
      for (let y = 0; y < level.grid.h; y += 1) {
        const { tx, ty } = transformPoint(x, y, orientation, level.grid.w, level.grid.h);
        const pointer = {
          clientX: 11 + (tx + 0.5) * cellSize,
          clientY: 17 + (ty + 0.5) * cellSize,
        };
        assert.deepEqual(
          levelUtils.getGridCoord(pointer),
          { x, y },
          `transform ${orientation} rendered cell (${tx},${ty}) maps back to (${x},${y})`,
        );
      }
    }
  }
});
