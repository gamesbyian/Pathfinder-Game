import type { ControllerDeps } from '../state.js';
import { advanceHintAnimationIndex, clearDirty, markDirty,
         pruneRipples, setHintAnimationAlpha, setHintAnimationIndex,
         setHintBlinkStartMsIfUnset, setHintFadeStartMs,
         setHintHoldStartMsIfUnset, stepVisualFlipCount } from '../state-actions.js';
import { createRenderModel } from '../render/create-render-model.js';
import { EDITOR, HINT_ANIMATING, OVERLAY_NONE, REVIEW } from '../app-constants.js';

export function createRenderLoop({ state, themes, ui, renderer, setOverlayState }: ControllerDeps) {
    function loop() {
        if (state.ENGINE.overlayState === HINT_ANIMATING && state.ENGINE.hinter.pathList.length) {
            const _h                 = state.ENGINE.hinter;
            const hPath              = _h.pathList[_h.displayIndices?.[_h.currentPathIdx] ?? _h.currentPathIdx];
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
                    setOverlayState(OVERLAY_NONE);
                    ui.showMessage('', '');
                }
            }
        }

        if (stepVisualFlipCount(state)) markDirty(state);
        const now = Date.now();
        pruneRipples(state, now);
        const hasContinuousAnimation =
            state.ENGINE.ripples.length > 0 || state.ENGINE.overlayState === HINT_ANIMATING;
        if (hasContinuousAnimation) markDirty(state);
        const shouldRender = state.ENGINE.isDirty || hasContinuousAnimation;
        if (shouldRender) {
            clearDirty(state);
            const reqLenPreview = (state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)
                ? parseInt(ui.getValue('editReqLen'))
                : null;
            renderer.render(createRenderModel({ eng: state.ENGINE, themes }, reqLenPreview));
        }
        requestAnimationFrame(loop);
    }

    return { loop };
}
