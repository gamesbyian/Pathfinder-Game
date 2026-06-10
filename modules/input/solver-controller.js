// Solver controller: edit-mode mega-solver button, solver-close button,
// and the dev-mode referee-solver keyboard toggle.

export function installSolverController(APP) {

    // --- Solver close / abort ---

    document.getElementById('solverCloseBtn').onclick = () => {
        if (!APP.Solver.isRunning()) {
            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
            return;
        }
        APP.UI.showMessage('Stopping solver…', 'text-amber-400 font-bold');
        APP.Solver.cancel();
    };

    // --- Dev: referee-solver toggle ---

    document.addEventListener('keydown', e => {
        if (!APP.State.ENGINE.isDevMode) return;
        if (e.shiftKey && e.key.toLowerCase() === 'r') {
            APP.State.ENGINE.flags.useRefereeSolver = !APP.State.ENGINE.flags.useRefereeSolver;
            APP.UI.showMessage(
                `Referee solver ${APP.State.ENGINE.flags.useRefereeSolver ? 'ON' : 'OFF'}`,
                'text-white font-black'
            );
        }
    });

    // --- Edit-mode mega-solver ---

    document.getElementById('editMegaSolver').onclick = async () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.activeSolverController) return;
        let _cancelled = false;
        const cancelSolve = () => {
            if (_cancelled) return;
            _cancelled = true;
            APP.UI.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
            APP.UI.setButtonState('solverCloseBtn', { enabled: false });
        };
        const yieldFn = async () => {
            await new Promise(r => setTimeout(r, 0));
            if (_cancelled) throw new Error('SolverV2:cancelled');
        };
        APP.State.ENGINE.activeSolverController   = { cancel: cancelSolve, abort: cancelSolve };
        APP.State.ENGINE.solverAbortRequested     = false;
        const abortPoll = setInterval(() => { if (APP.State.ENGINE.solverAbortRequested) cancelSolve(); }, 100);
        try {
            APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
            APP.UI.setSolverControlsEnabled(false);
            APP.UI.setSolverTimerText('0.0s');
            APP.UI.setSolverDetailText('Searching…');
            APP.UI.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const level    = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.editor.workingLevel);
            const budgetMs = 30000;
            const t0       = Date.now();
            const overlayMinTimer = new Promise(r => setTimeout(r, 400));
            const timerInterval   = setInterval(() => {
                const elapsed = (Date.now() - t0) / 1000;
                APP.UI.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                APP.UI.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
            }, 100);
            let result;
            try {
                result = await APP.SolverV2.solve(level, { timeBudgetMs: budgetMs, yieldFn });
                await overlayMinTimer;
            } finally {
                clearInterval(timerInterval);
            }
            if (result.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                APP.UI.setSolverProgress(100);
                APP.State.ENGINE.hinter.pathList       = [result.solution];
                APP.State.ENGINE.hinter.currentPathIdx = 0;
                APP.State.ENGINE.hinter.source         = 'solver';
                APP.Solver.startHintAnimation();
            } else {
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                APP.UI.showMessage('No solution found within time limit.', 'text-yellow-400 font-bold');
            }
        } catch (err) {
            if (err?.message !== 'SolverV2:cancelled') {
                console.error('SolverV2 failed:', err);
                APP.UI.showMessage(`Solve failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
            }
            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
        } finally {
            clearInterval(abortPoll);
            APP.State.ENGINE.activeSolverController   = null;
            APP.State.ENGINE.solverAbortRequested     = false;
            APP.UI.setSolverControlsEnabled(true);
        }
    };
}
