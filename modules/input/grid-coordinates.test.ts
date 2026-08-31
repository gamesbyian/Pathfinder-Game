import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transformPoint } from '../domain/geometry.js';
import { PLAY } from '../app-constants.js';
import { getGridCoord } from './grid-coordinates.js';

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
  } as any;
  const engineState = {
    mode: PLAY,
    level,
    orientation: 0,
    viewport: { cellW: cellSize, cellH: cellSize, swapped: false },
  } as any;

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
          getGridCoord(pointer, engineState, canvas),
          { x, y },
          `transform ${orientation} rendered cell (${tx},${ty}) maps back to (${x},${y})`,
        );
      }
    }
  }
});
