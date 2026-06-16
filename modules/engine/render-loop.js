import { advanceHintAnimationIndex, clearDirty, markDirty,
         pruneRipples, setHintAnimationAlpha, setHintAnimationIndex,
         setHintBlinkStartMsIfUnset, setHintFadeStartMs,
         setHintHoldStartMsIfUnset, stepVisualFlipCount } from '../state-actions.js';
import { createRenderModel } from '../render/create-render-model.js';

export function createRenderLoop({ core, state, themes, ui, renderer, setOverlayState }) {
    function loop() {
        if (state.ENGINE.overlayState === core.HINT_ANIMATING && state.ENGINE.hinter.pathList.length) {
            const hPath              = state.ENGINE.hinter.pathList[state.ENGINE.hinter.currentPathIdx];
            const hintNowMs          = Date.now();
            const hintHoldDurationMs = 2700;
            const hintBlinkCount     = 3;
            const hintBlinkCycleMs   = 800;
            const hintFadeDurationMs = 900;

            advanceHintAnimationIndex(state, 0.285);

            if (state.ENGINE.hinter.index >= hPath.length) {
                setHintAnimationIndex(state, hPath.length);
                setHintHoldStartMsIfUnset(state, hintNowMs);
            }

            const holdElapsedMs = state.ENGINE.hinter.holdStartMs ? (hintNowMs - state.ENGINE.hinter.holdStartMs) : 0;
            const holdComplete  = state.ENGINE.hinter.holdStartMs && holdElapsedMs >= hintHoldDurationMs;
            if (holdComplete) setHintBlinkStartMsIfUnset(state, hintNowMs);

            if (state.ENGINE.hinter.blinkStartMs && !state.ENGINE.hinter.fadeStartMs) {
                const blinkElapsedMs = hintNowMs - state.ENGINE.hinter.blinkStartMs;
                const blinkWindowMs  = hintBlinkCount * hintBlinkCycleMs;
                if (blinkElapsedMs < blinkWindowMs) {
                    const blinkPhase = (blinkElapsedMs % hintBlinkCycleMs) / hintBlinkCycleMs;
                    setHintAnimationAlpha(state, 0.25 + (0.75 * (0.5 + 0.5 * Math.cos(blinkPhase * Math.PI * 2))));
                } else {
                    setHintFadeStartMs(state, hintNowMs);
                    setHintAnimationAlpha(state, 1);
                }
            }

            if (state.ENGINE.hinter.fadeStartMs) {
                const fadeElapsedMs = hintNowMs - state.ENGINE.hinter.fadeStartMs;
                setHintAnimationAlpha(state, Math.max(0, 1 - (fadeElapsedMs / hintFadeDurationMs)));
                if (state.ENGINE.hinter.alpha <= 0) {
                    setOverlayState(core.OVERLAY_NONE);
                    ui.showMessage('', '');
                }
            }
        }

        if (stepVisualFlipCount(state)) markDirty(state);
        const now = Date.now();
        pruneRipples(state, now);
        const hasContinuousAnimation =
            state.ENGINE.ripples.length > 0 || state.ENGINE.overlayState === core.HINT_ANIMATING;
        if (hasContinuousAnimation) markDirty(state);
        const shouldRender = state.ENGINE.isDirty || hasContinuousAnimation;
        if (shouldRender) {
            clearDirty(state);
            const reqLenPreview = (state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                ? parseInt(ui.getValue('editReqLen'))
                : null;
            renderer.render(createRenderModel({ eng: state.ENGINE, core, themes }, reqLenPreview));
        }
        requestAnimationFrame(loop);
    }

    return { loop };
}
