import { pushStep as pushStepImpl } from '../runtime/path-state.js';
import {
    clearNavigation,
    markDirty,
    setEditorModified,
    setNavigationLastFlipTime,
    truncateNavigationPath
} from '../state-actions.js';

export function createPathNavigator({
    core,
    getLevel,
    setLogicState,
    rebuildDerivedPathState,
    assertStateConsistency,
    now = () => Date.now()
}) {
    const resetActiveLogicState = (engineState) => {
        if ([core.DRAGGING, core.PORTAL_PAUSE, core.HAZARD_TRIGGERED].includes(engineState.logicState)) {
            setLogicState(core.IDLE);
        }
    };

    const finishPathMutation = (engineState) => {
        if (engineState.mode === core.EDITOR) setEditorModified(engineState, true);
        markDirty(engineState);
        rebuildDerivedPathState(engineState);
        assertStateConsistency(engineState);
    };

    return {
        pushStep(engineState, key, isJump) {
            const level = getLevel(engineState);
            const nav = engineState.nav;
            const oldFlipCount = nav.flipCount;
            pushStepImpl(nav, key, isJump, level);
            markDirty(engineState);
            if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, now());
            assertStateConsistency(engineState);
        },
        truncateTo(engineState, targetIdx) {
            if (!truncateNavigationPath(engineState.nav, targetIdx)) return;
            resetActiveLogicState(engineState);
            finishPathMutation(engineState);
        },
        clear(engineState) {
            clearNavigation(engineState);
            resetActiveLogicState(engineState);
            finishPathMutation(engineState);
        }
    };
}
