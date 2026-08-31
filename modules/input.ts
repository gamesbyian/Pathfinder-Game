import { createNavigationController }    from './input/navigation-controller.js';
import { createGamepadController }        from './input/gamepad-controller.js';
import { createPointerInputController }   from './input/pointer-input-controller.js';
import { createOptionsController }        from './input/options-controller.js';
import { createEditorToolbarController }  from './input/editor-toolbar-controller.js';
import { createSubmissionController }     from './input/submission-controller.js';
import { createReviewController }         from './input/review-controller.js';
import { createSolverController }         from './input/solver-controller.js';
import { createLevelRatingController }    from './input/level-rating-controller.js';
import { createFalseGoalTriggerScanController }       from './input/false-goal-trigger-scan-controller.js';
import { setGamepadGridPrimaryAction }     from './state-actions.js';

export function createInput({ state, ui, engine, levelUtils, editor, renderer, themes, data, devCorpus, solverApi, persistence, audioService, reportError }: any) {
    let initialized = false;

    const init = () => {
        if (initialized) return;
        initialized = true;
        setGamepadGridPrimaryAction(state, () => {});

        const navController = createNavigationController({ state, ui, engine, levelUtils, editor, renderer });
        createGamepadController({ state, ui, engine, levelUtils }, navController);
        createPointerInputController({ state, ui, engine, levelUtils, editor, renderer });
        createOptionsController({ state, ui, engine, themes, data, devCorpus, solverApi, levelUtils, persistence, audioService, reportError }, { tryNavigate: navController.tryNavigate });
        const falseGoalTriggerScan = createFalseGoalTriggerScanController({ state, ui, engine, levelUtils, editor, solverApi, reportError });
        createEditorToolbarController({ state, ui, engine, levelUtils, editor, solverApi, reportError }, { tryNavigate: navController.tryNavigate, falseGoalTriggerScan });
        createSubmissionController({ state, ui, engine, levelUtils, editor, persistence, solverApi, data, reportError });
        createReviewController({ state, ui, engine, levelUtils, editor, persistence, solverApi, reportError });
        createSolverController({ state, ui, engine, levelUtils, solverApi, reportError });
        createLevelRatingController({ engine });
    };

    return { init };
}
