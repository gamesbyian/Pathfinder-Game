// Thin wrapper that owns the canvas/context/overlay references and
// delegates all drawing to renderScene.

import { renderScene } from './render-layers.js';

export function createCanvasRenderer(cvs: any, ctx: any, mustPassOverlay: any) {
    return {
        render(model: any) {
            return renderScene(ctx, model, { cvs, mustPassOverlay });
        },
    };
}
