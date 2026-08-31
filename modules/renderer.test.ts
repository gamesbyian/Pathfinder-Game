import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './domain/cell-key.js';
import { transformPoint } from './domain/geometry.js';
import { createRenderer } from './renderer.js';
import { PLAY } from './app-constants.js';

test('renderer path helper uses the same current transform as screen-position lookup', () => {
    const calls: Array<[string, number, number]> = [];
    const ctx: any = {
        save() {}, restore() {}, beginPath() {}, stroke() {},
        moveTo(x: number, y: number) { calls.push(['moveTo', x, y]); },
        lineTo(x: number, y: number) { calls.push(['lineTo', x, y]); },
    };
    const canvas = { getContext: () => ctx };
    const overlay = {};
    const previousDocument = globalThis.document;
    (globalThis as any).document = {
        getElementById(id: string) {
            if (id === 'gameCanvas') return canvas;
            if (id === 'mustPassOverlay') return overlay;
            return null;
        },
    };

    try {
        const level = { grid: { w: 7, h: 5 } };
        const engineState: any = {
            mode: PLAY,
            level,
            orientation: 0,
            viewport: { cellW: 20, cellH: 30 },
        };
        const renderer = createRenderer({
            state: { ENGINE: engineState },
            ui: {},
        });
        const path = [PACK(1, 2), PACK(3, 4)];

        for (let orientation = 0; orientation < 8; orientation += 1) {
            engineState.orientation = orientation;
            calls.length = 0;
            renderer.drawPath(path, new Set(), '#fff', 2);

            const start = transformPoint(1, 2, orientation, level.grid.w, level.grid.h);
            const end = transformPoint(3, 4, orientation, level.grid.w, level.grid.h);
            const expectedStart = { sx: (start.tx + 0.5) * 20, sy: (start.ty + 0.5) * 30 };
            const expectedEnd = { sx: (end.tx + 0.5) * 20, sy: (end.ty + 0.5) * 30 };

            assert.deepEqual(renderer.getScreenPos(1, 2), expectedStart, `screen position for transform ${orientation}`);
            assert.deepEqual(calls[0], ['moveTo', expectedStart.sx, expectedStart.sy], `path start for transform ${orientation}`);
            assert.deepEqual(calls.at(-1), ['lineTo', expectedEnd.sx, expectedEnd.sy], `path end for transform ${orientation}`);
        }
    } finally {
        (globalThis as any).document = previousDocument;
    }
});
