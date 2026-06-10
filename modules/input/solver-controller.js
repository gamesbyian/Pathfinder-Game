// Solver controller: edit-mode mega-solver button, solver-close button,
// and the dev-mode referee-solver keyboard toggle.

export function createSolverController({ core, state, ui, engine, levelUtils, solverV2 }) {

    // --- Solver close / abort ---

    document.getElementById('solverCloseBtn').onclick = () => {
        if (!engine.isRunning()) {
            engine.setOverlayState(core.OVERLAY_NONE);
            return;
        }
        ui.showMessage('Stopping solver…', 'text-amber-400 font-bold');
        engine.cancelSolver();
    };

    // --- Dev: referee-solver toggle ---

    document.addEventListener('keydown', e => {
        if (!state.ENGINE.isDevMode) return;
        if (e.shiftKey && e.key.toLowerCase() === 'r') {
            state.ENGINE.flags.useRefereeSolver = !state.ENGINE.flags.useRefereeSolver;
            ui.showMessage(
                `Referee solver ${state.ENGINE.flags.useRefereeSolver ? 'ON' : 'OFF'}`,
                'text-white font-black'
            );
        }
    });

    // --- Edit-mode mega-solver ---

    document.getElementById('editMegaSolver').onclick = async () => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        let _cancelled = false;
        const cancelSolve = () => {
            if (_cancelled) return;
            _cancelled = true;
            ui.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
            ui.setButtonState('solverCloseBtn', { enabled: false });
        };
        const budgetMs = 30000;
        let _t0 = 0, _lastTenths = -1;
        const yieldFn = async () => {
            const tenths = Math.floor((Date.now() - _t0) * 10 / 1000);
            if (tenths !== _lastTenths) {
                _lastTenths = tenths;
                const elapsed = tenths / 10;
                ui.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                ui.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
            }
            await new Promise(r => setTimeout(r, 0));
            if (_cancelled) throw new Error('SolverV2:cancelled');
        };
        engine.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
        try {
            engine.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setSolverTimerText('0.0s');
            ui.setSolverDetailText('Searching…');
            ui.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
            const overlayMinTimer = new Promise(r => setTimeout(r, 400));
            _t0 = Date.now();
            _lastTenths = -1;
            const result = await solverV2.solve(level, { timeBudgetMs: budgetMs, yieldFn });
            await overlayMinTimer;
            if (result.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                ui.setSolverProgress(100);
                engine.setHintPaths([result.solution], 'solver', 0);
                engine.startHintAnimation();
            } else {
                engine.setOverlayState(core.OVERLAY_NONE);
                ui.showMessage('No solution found within time limit.', 'text-yellow-400 font-bold');
            }
        } catch (err) {
            if (err?.message !== 'SolverV2:cancelled') {
                console.error('SolverV2 failed:', err);
                ui.showMessage(`Solve failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
            }
            engine.setOverlayState(core.OVERLAY_NONE);
        } finally {
            clearInterval(abortPoll);
            engine.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };
}
