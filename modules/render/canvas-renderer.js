// Thin wrapper that owns the canvas/context/overlay references and
// delegates all drawing to renderScene.

import { renderScene } from './render-layers.js';

export function createCanvasRenderer(cvs, ctx, mustPassOverlay) {
    return {
        render(model) {
            renderScene(ctx, model, { cvs, mustPassOverlay });
        },
    };
}
