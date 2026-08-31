import { createCanvasRenderer } from './render/canvas-renderer.js';
import { transformPoint }       from './domain/geometry.js';
import { drawPath }             from './render/draw-path.js';
import { drawScorchMark }       from './render/draw-assets.js';
import { markDirty }            from './state-actions.js';
import { activeLevel }          from './state.js';

export function createRenderer({ state, ui }: any) {
    const cvs             = (document.getElementById('gameCanvas') as any);
    const ctx             = cvs.getContext('2d');
    const mustPassOverlay = (document.getElementById('mustPassOverlay') as any);
    const canvasRenderer  = createCanvasRenderer(cvs, ctx, mustPassOverlay);

    function getScreenPos(cx: any, cy: any) {
        const eng = state.engineState;
        const l   = activeLevel(eng);
        if (!l) return { sx: 0, sy: 0 };
        const { tx, ty } = transformPoint(cx, cy, eng.orientation, l.grid.w, l.grid.h);
        return { sx: (tx + 0.5) * eng.viewport.cellW, sy: (ty + 0.5) * eng.viewport.cellH };
    }

    function render(model: any) {
        const { needsRedraw } = canvasRenderer.render(model);
        if (needsRedraw) markDirty(state);

        // HUD DOM updates — outside the canvas renderer so the render layer stays pure
        if (model.isPlayMode && model.level) {
            ui.renderMetricsPanel({
                currentLen: model.currentLen,
                requiredLength:     model.level.requiredLength,
                currentInt: model.intersections,
                requiredIntersections:     model.level.requiredIntersections,
            });
        } else if (model.isEditorMode) {
            ui.setEditorMetrics(model.currentLen, model.intersections);
        }
    }

    // drawPath and drawScorchMark are kept on the public API for external callers.
    function drawPathWithCurrentOrientation(pathArr: any, isJumpSet: any, strokeStyle: any, width: any, isCaution: any = false) {
        const eng = state.engineState;
        const l   = activeLevel(eng);
        if (!l) return;
        const screenPosFn = (cx: any, cy: any) => {
            const { tx, ty } = transformPoint(cx, cy, eng.orientation, l.grid.w, l.grid.h);
            return { sx: (tx + 0.5) * eng.viewport.cellW, sy: (ty + 0.5) * eng.viewport.cellH };
        };
        drawPath(ctx, pathArr, isJumpSet, strokeStyle, width, isCaution, screenPosFn, eng.viewport.cellW);
    }

    return {
        render,
        getScreenPos,
        drawPath:      drawPathWithCurrentOrientation,
        drawScorchMark,
        getCanvas:     () => cvs,
        getContext:    () => ctx,
    };
}
