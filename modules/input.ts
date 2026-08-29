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

export function createInput({ core, state, ui, engine, levelUtils, editor, renderer, themes, data, devCorpus, solverApi, persistence, reportError }: any) {
    let initialized = false;

    const init = () => {
        if (initialized) return;
        initialized = true;
        setGamepadGridPrimaryAction(state, () => {});

        const navController = createNavigationController({ core, state, ui, engine, levelUtils, editor, renderer });
        createGamepadController({ core, state, ui, engine, levelUtils }, navController);
        createPointerInputController({ core, state, ui, engine, levelUtils, editor, renderer });
        createOptionsController({ core, state, ui, engine, themes, data, devCorpus, solverApi, levelUtils, persistence, reportError }, { tryNavigate: navController.tryNavigate });
        const falseGoalTriggerScan = createFalseGoalTriggerScanController({ core, state, ui, engine, levelUtils, editor, solverApi, reportError });
        createEditorToolbarController({ core, state, ui, engine, levelUtils, editor, solverApi, reportError }, { tryNavigate: navController.tryNavigate, falseGoalTriggerScan });
        createSubmissionController({ core, state, ui, engine, levelUtils, editor, persistence, solverApi, data, reportError });
        createReviewController({ core, state, ui, engine, levelUtils, editor, persistence, solverApi, reportError });
        createSolverController({ core, state, ui, engine, levelUtils, solverApi, reportError });
        createLevelRatingController({ engine });
    };

    return { init };
}
