import { createCanvasRenderer } from './render/canvas-renderer.js';
import { transformPoint }       from './domain/geometry.js';
import { drawPath }             from './render/draw-path.js';
import { drawScorchMark }       from './render/draw-assets.js';

export function createRenderer({ core, state, ui }) {
    const cvs             = document.getElementById('gameCanvas');
    const ctx             = cvs.getContext('2d');
    const mustPassOverlay = document.getElementById('mustPassOverlay');
    const canvasRenderer  = createCanvasRenderer(cvs, ctx, mustPassOverlay);

    function getScreenPos(cx, cy) {
        const eng = state.ENGINE;
        const l   = eng.mode === core.PLAY ? eng.level : eng.editor.workingLevel;
        const { tx, ty } = transformPoint(cx, cy, eng.variant, l.grid.w, l.grid.h);
        return { sx: (tx + 0.5) * eng.viewport.cellW, sy: (ty + 0.5) * eng.viewport.cellH };
    }

    function render(model) {
        const { needsRedraw } = canvasRenderer.render(model);
        if (needsRedraw) state.ENGINE.isDirty = true;

        // HUD DOM updates — outside the canvas renderer so the render layer stays pure
        if (model.isPlayMode && model.level) {
            ui.renderMetricsPanel({
                currentLen: model.currentLen,
                reqLen:     model.level.reqLen,
                currentInt: model.intersections,
                reqInt:     model.level.reqInt,
            });
        } else if (model.isEditorMode) {
            const lMet = document.getElementById('editCopyMetrics');
            if (lMet) lMet.innerText = `Set (${model.currentLen}/${model.intersections})`;
        }
    }

    // drawPath and drawScorchMark are kept on the public API for external callers.
    function publicDrawPath(pathArr, isJumpSet, strokeStyle, width, isCaution = false) {
        const eng = state.ENGINE;
        const l   = eng.mode === core.PLAY ? eng.level : eng.editor.workingLevel;
        if (!l) return;
        const screenPosFn = (cx, cy) => {
            const { tx, ty } = transformPoint(cx, cy, eng.variant, l.grid.w, l.grid.h);
            return { sx: (tx + 0.5) * eng.viewport.cellW, sy: (ty + 0.5) * eng.viewport.cellH };
        };
        drawPath(ctx, pathArr, isJumpSet, strokeStyle, width, isCaution, screenPosFn, eng.viewport.cellW);
    }

    return {
        render,
        getScreenPos,
        drawPath:      publicDrawPath,
        drawScorchMark,
        getCanvas:     () => cvs,
        getContext:    () => ctx,
    };
}
