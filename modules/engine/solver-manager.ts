import type { ControllerDeps } from '../state.js';
import { endSolverRun as endSolverRunState,
         requestSolverAbort,
         setHintPaths as setHintPathsState,
         startSolverRun as startSolverRunState } from '../state-actions.js';

export function createSolverManager({ state, ui }: ControllerDeps) {
    return {
        cancelSolver() {
            if (!state.engineState.solver.controller) return;
            requestSolverAbort(state);
            ui.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
            ui.setButtonState('solverCloseBtn', { enabled: false });
            state.engineState.solver.controller.abort();
        },

        startSolverRun(controller: any) { startSolverRunState(state, controller); },

        endSolverRun() { endSolverRunState(state); },

        setHintPaths(pathList: any, source: any, currentIdx: any = 0, opts: any = {}) {
            setHintPathsState(state, pathList, source, currentIdx, opts);
        },

        isRunning() { return !!state.engineState.solver.controller; },
    };
}
