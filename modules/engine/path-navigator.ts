import { pushStep as pushStepImpl } from '../runtime/path-state.js';
import type { EngineState, NavSnapshot } from '../state-slices.js';
import { DRAGGING, EDITOR, HAZARD_TRIGGERED, IDLE, PORTAL_PAUSE } from '../app-constants.js';
import {
    clearNavigation,
    markDirty,
    restoreFalseGoalHazardsForLevel,
    setEditorModified,
    setNavigationLastFlipTime,
    setNavigationSnapshot,
    truncateNavigationPath
} from '../state-actions.js';

export function createPathNavigator({
        getLevel,
    setLogicState,
    rebuildDerivedPathState,
    assertStateConsistency,
    now = () => Date.now()
}: any) {
    const resetActiveLogicState = (engineState: EngineState) => {
        if (engineState.logicState === DRAGGING || engineState.logicState === PORTAL_PAUSE || engineState.logicState === HAZARD_TRIGGERED) {
            setLogicState(IDLE);
        }
    };

    const finishPathMutation = (engineState: EngineState) => {
        if (engineState.mode === EDITOR) setEditorModified(engineState, true);
        markDirty(engineState);
        rebuildDerivedPathState(engineState);
        assertStateConsistency(engineState);
    };

    return {
        pushStep(engineState: EngineState, key: number, isJump: boolean) {
            const level = getLevel(engineState);
            const nav = engineState.nav;
            const oldFlipCount = nav.flipCount;
            pushStepImpl(nav, key, isJump, level);
            markDirty(engineState);
            if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, now());
            assertStateConsistency(engineState);
        },
        truncateTo(engineState: EngineState, targetIdx: number) {
            if (!truncateNavigationPath(engineState.nav, targetIdx)) return;
            resetActiveLogicState(engineState);
            finishPathMutation(engineState);
        },
        clear(engineState: EngineState) {
            clearNavigation(engineState);
            resetActiveLogicState(engineState);
            finishPathMutation(engineState);
        },
        // Undo restoration: rebuild nav + false-goal-hazard state from a captured snapshot
        // (see createSnapshot in engine.js) and return the engine to a consistent derived state.
        // The pure state work lives here (not in engine.js) so the undo flow is unit-testable
        // without booting the app; engine.js's wrapper only adds the UI message-clear side effect.
        applySnapshot(engineState: EngineState, snapshot: NavSnapshot) {
            setNavigationSnapshot(engineState, snapshot);
            // Route the logic-state restore through IDLE: the state machine may forbid a direct
            // current→restored transition, and an undo never lands back in the transient
            // HAZARD_TRIGGERED lock — IDLE is always a permitted hop, and IDLE→restored is legal.
            const restored = snapshot.logicState === HAZARD_TRIGGERED ? IDLE : snapshot.logicState;
            setLogicState(IDLE);
            if (restored !== IDLE) setLogicState(restored);
            restoreFalseGoalHazardsForLevel(engineState, getLevel(engineState), snapshot.detonatedFalseGoals);
            rebuildDerivedPathState(engineState);
            markDirty(engineState);
        }
    };
}
