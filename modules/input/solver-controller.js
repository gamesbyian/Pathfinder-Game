// Solver controller: solve button, solver-close button,
// solve-options modal (single hint vs. diverse hint search), and the
// dev-mode referee-solver keyboard toggle.
import { setFoundHintsSinceLoad, toggleFlag } from '../state-actions.js';
import { mergeUniqueHints, runHintDiversification } from '../solver/diversification.js';

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
            toggleFlag(state, 'useRefereeSolver');
            ui.showMessage(
                `Referee solver ${state.ENGINE.flags.useRefereeSolver ? 'ON' : 'OFF'}`,
                'text-white font-black'
            );
        }
    });

    // --- Solve button: opens the Solve Options modal ---

    document.getElementById('solveLevelBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        ui.openModal('solveOptionsModal');
    };

    document.getElementById('closeSolveOptionsBtn').onclick = () => ui.closeModal('solveOptionsModal');

    document.getElementById('diverseSearchResultDismissBtn').onclick = () => ui.closeModal('diverseSearchResultModal');

    // --- Diverse-search completion summary: explains either what new hints were
    // found, or why nothing new turned up (already covered vs. budget ran out). ---

    function buildDiverseSearchSummary(novel, report) {
        const lines = [];
        if (novel.length > 0) {
            lines.push(`Found ${novel.length} new hint${novel.length === 1 ? '' : 's'} for this level.`);
            lines.push('New hints are saved for this session and contribute to the level’s heat map.');
        } else if (report.haltedByCancel) {
            lines.push('Search stopped before finding anything new.');
        } else if (report.haltedByWallClock) {
            lines.push('No new hints found before the time budget ran out.');
            lines.push('Try a longer search to keep exploring.');
        } else {
            lines.push('No new hints found.');
            lines.push('Every gate, direction, and strategy combination was explored — this level’s existing hints already cover its solution variety.');
        }
        if (report.errors.length > 0) {
            lines.push(`${report.errors.length} search step${report.errors.length === 1 ? '' : 's'} hit an error and were skipped.`);
        }
        return lines;
    }

    // --- Find 1 Hint: preserves the pre-existing single-solve Solve behavior ---

    document.getElementById('solveFindOneBtn').onclick = async () => {
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
        let _t0 = 0, _lastTenths = -1, _progressTicker = null;
        const updateProgressDisplay = () => {
            if (!_t0) return;
            const tenths = Math.floor((Date.now() - _t0) * 10 / 1000);
            if (tenths === _lastTenths) return;
            _lastTenths = tenths;
            const elapsed = tenths / 10;
            ui.setSolverTimerText(`${elapsed.toFixed(1)}s`);
            ui.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
        };
        const yieldFn = async () => {
            updateProgressDisplay();
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
            _progressTicker = setInterval(updateProgressDisplay, 50);
            const result = await solverV2.solve(level, { timeBudgetMs: budgetMs, yieldFn });
            updateProgressDisplay();
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
            clearInterval(_progressTicker);
            engine.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };

    // --- Diverse hint search: cascades through profile/template/strategy ablations
    // across every (gate x first-step direction) and proven portal-exit-direction
    // combination, collecting any genuinely novel solution paths within a time/count
    // budget. Results land in foundHintsSinceLoad for the Editor's Hints button. ---

    async function runDiverseSearch(deadlineAt, maxHints = Infinity) {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        let _cancelled = false;
        const cancelSolve = () => {
            if (_cancelled) return;
            _cancelled = true;
            ui.setSolverDetailText('Stopping… finishing current search step safely.');
            ui.setButtonState('solverCloseBtn', { enabled: false });
        };
        engine.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
        let _progressTicker = null;
        try {
            engine.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setSolverTimerText('0.0s');
            ui.setSolverDetailText('Searching for diverse hints…');
            ui.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));

            const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
            const wl = state.ENGINE.editor.workingLevel;
            const existingHints = mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || []);

            const t0 = Date.now();
            const totalMs = Math.max(1, deadlineAt - t0);
            let _lastTenths = -1;
            const updateProgressDisplay = () => {
                const tenths = Math.floor((Date.now() - t0) * 10 / 1000);
                if (tenths === _lastTenths) return;
                _lastTenths = tenths;
                const elapsed = tenths / 10;
                ui.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                ui.setSolverProgress(Math.min(95, (elapsed * 1000 / totalMs) * 100));
            };
            // A wall-clock ticker keeps the timer/progress bar smooth between search
            // steps, since onProgress only fires once per completed combo/strategy run —
            // which can be many seconds apart on slow levels.
            _progressTicker = setInterval(updateProgressDisplay, 100);
            const { novel, report } = await runHintDiversification(level, existingHints, {
                solverV2,
                deadlineAt,
                maxHints,
                isCancelled: () => _cancelled,
                onProgress: (evt) => {
                    const found = evt.novelCount === 1 ? '1 new hint' : `${evt.novelCount} new hints`;
                    ui.setSolverDetailText(evt.novelCount > 0 ? `Searching… ${found} found so far.` : 'Searching…');
                },
            });

            clearInterval(_progressTicker);
            _progressTicker = null;
            ui.setSolverProgress(100);
            engine.setOverlayState(core.OVERLAY_NONE);
            if (novel.length > 0) {
                setFoundHintsSinceLoad(state, mergeUniqueHints(state.ENGINE.foundHintsSinceLoad || [], novel));
            }
            ui.showDiverseSearchResult('Search Complete', buildDiverseSearchSummary(novel, report));
        } catch (err) {
            if (err?.message !== 'SolverV2:cancelled') {
                console.error('Hint diversification failed:', err);
                ui.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
            }
            engine.setOverlayState(core.OVERLAY_NONE);
        } finally {
            clearInterval(abortPoll);
            clearInterval(_progressTicker);
            engine.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    }

    document.getElementById('solveDiverse5Btn').onclick  = () => runDiverseSearch(Date.now() + 5 * 60000);
    document.getElementById('solveDiverse10Btn').onclick = () => runDiverseSearch(Date.now() + 10 * 60000);
    document.getElementById('solveDiverse20Btn').onclick = () => runDiverseSearch(Date.now() + 20 * 60000);

    document.getElementById('solveDiverseCustomBtn').onclick = () => {
        const minutes = ui.getNumber('solveDiverseCustomMinutes', 0);
        if (!(minutes > 0)) {
            ui.showMessage('Enter a duration in minutes.', 'text-yellow-400 font-bold');
            return;
        }
        const maxHints = ui.getNumber('solveDiverseMaxHints', 0);
        runDiverseSearch(Date.now() + minutes * 60000, maxHints > 0 ? maxHints : Infinity);
    };
}
