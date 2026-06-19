import { createNavigationController }    from './input/navigation-controller.js';
import { createGamepadController }        from './input/gamepad-controller.js';
import { createPointerInputController }   from './input/pointer-input-controller.js';
import { createOptionsController }        from './input/options-controller.js';
import { createEditorToolbarController }  from './input/editor-toolbar-controller.js';
import { createSubmissionController }     from './input/submission-controller.js';
import { createReviewController }         from './input/review-controller.js';
import { createSolverController }         from './input/solver-controller.js';
import { setGamepadGridPrimaryAction }     from './state-actions.js';

export function createInput({ core, state, ui, engine, levelUtils, editor, renderer, themes, data, solverV2, persistence }) {
    let initialized = false;

    const init = () => {
        if (initialized) return;
        initialized = true;
        setGamepadGridPrimaryAction(state, () => {});

        const navController = createNavigationController({ core, state, ui, engine, levelUtils, editor, renderer });
        createGamepadController({ core, state, ui, engine, levelUtils }, navController);
        createPointerInputController({ core, state, ui, engine, levelUtils, editor, renderer });
        createOptionsController({ core, state, ui, engine, themes, data, solverV2, levelUtils, persistence }, { tryNavigate: navController.tryNavigate });
        createEditorToolbarController({ core, state, ui, engine, levelUtils, editor, solverV2 }, { tryNavigate: navController.tryNavigate });
        createSubmissionController({ core, state, ui, engine, levelUtils, editor, persistence, solverV2 });
        createReviewController({ core, state, ui, engine, levelUtils, editor, persistence, solverV2 });
        createSolverController({ core, state, ui, engine, levelUtils, solverV2 });
    };

    return { init };
}
