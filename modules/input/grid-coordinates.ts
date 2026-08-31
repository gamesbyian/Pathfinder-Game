import { inverseTransformPoint } from '../domain/geometry.js';
import { activeLevel } from '../state.js';
import type { EngineState } from '../state-slices.js';

/** Browser/input adapter: map a client pointer position into the canonical level coordinate space. */
export function getGridCoord(
    e: { clientX: number; clientY: number },
    engineState: EngineState,
    canvas: HTMLCanvasElement,
) {
    const rect = canvas.getBoundingClientRect();
    const level = activeLevel(engineState);
    if (!level) return { x: 0, y: 0 };

    const gridW = engineState.viewport.swapped ? level.grid.h : level.grid.w;
    const gridH = engineState.viewport.swapped ? level.grid.w : level.grid.h;
    const tx = Math.max(0, Math.min(
        gridW - 1,
        Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / engineState.viewport.cellW),
    ));
    const ty = Math.max(0, Math.min(
        gridH - 1,
        Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / engineState.viewport.cellH),
    ));
    return inverseTransformPoint(tx, ty, engineState.orientation, level.grid.w, level.grid.h);
}
