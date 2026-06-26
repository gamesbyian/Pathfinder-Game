import { endSolverRun as endSolverRunState,
         requestSolverAbort,
         setHintPaths as setHintPathsState,
         startSolverRun as startSolverRunState } from '../state-actions.js';

export function createSolverManager({ state, ui }: any) {
    return {
        cancelSolver() {
            if (!state.ENGINE.solver.controller) return;
            requestSolverAbort(state);
            ui.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
            ui.setButtonState('solverCloseBtn', { enabled: false });
            state.ENGINE.solver.controller.abort();
        },

        startSolverRun(controller: any) { startSolverRunState(state, controller); },

        endSolverRun() { endSolverRunState(state); },

        setHintPaths(pathList: any, source: any, currentIdx: any = 0) {
            setHintPathsState(state, pathList, source, currentIdx);
        },

        isRunning() { return !!state.ENGINE.solver.controller; },
    };
}
