import { installNavigationController }    from './input/navigation-controller.js';
import { installGamepadController }        from './input/gamepad-controller.js';
import { installPointerInputController }   from './input/pointer-input-controller.js';
import { installOptionsController }        from './input/options-controller.js';
import { installEditorToolbarController }  from './input/editor-toolbar-controller.js';
import { installSubmissionController }     from './input/submission-controller.js';
import { installReviewController }         from './input/review-controller.js';
import { installSolverController }         from './input/solver-controller.js';

export function installInput(APP) {
    APP.Input = (() => {
        let initialized = false;
        const init = () => {
            if (initialized) return;
            initialized = true;
            APP.State.ENGINE.ui.gamepadGridPrimaryAction = () => {};

            const navController = installNavigationController(APP);
            installGamepadController(APP, navController);
            installPointerInputController(APP);
            installOptionsController(APP, { tryNavigate: navController.tryNavigate });
            installEditorToolbarController(APP, { tryNavigate: navController.tryNavigate });
            installSubmissionController(APP);
            installReviewController(APP);
            installSolverController(APP);
        };
        return { init };
    })();
}
