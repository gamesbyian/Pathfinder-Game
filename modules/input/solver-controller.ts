// Solver controller: solve button, solver-close button,
// solve-options modal (single hint vs. diverse hint search), and the
// dev-mode referee-solver keyboard toggle.
import { setFoundHintsSinceLoad, toggleFlag } from '../state-actions.js';
import { mergeUniqueHints, createDiversificationSession } from '../solver/diversification.js';

export function createSolverController({ core, state, ui, engine, levelUtils, solverV2 }: any) {

    // --- Solver close / abort ---

    (document.getElementById('solverCloseBtn') as any).onclick = () => {
        if (!engine.solver.isRunning()) {
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            return;
        }
        ui.showMessage('Stopping solver…', 'warning');
        engine.solver.cancelSolver();
    };

    // --- Dev: referee-solver toggle ---

    document.addEventListener('keydown', (e: any) => {
        if (!state.ENGINE.isDevMode) return;
        if (e.shiftKey && e.key.toLowerCase() === 'r') {
            toggleFlag(state, 'useRefereeSolver');
            ui.showMessage(
                `Referee solver ${state.ENGINE.flags.useRefereeSolver ? 'ON' : 'OFF'}`,
                'info'
            );
        }
    });

    // --- Solve button: opens the Solve Options modal ---

    (document.getElementById('solveLevelBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        ui.openModal('solveOptionsModal');
    };

    (document.getElementById('closeSolveOptionsBtn') as any).onclick = () => ui.closeModal('solveOptionsModal');

    (document.getElementById('diverseSearchResultDismissBtn') as any).onclick = () => ui.closeModal('diverseSearchResultModal');

    // --- Diverse-search completion summary: explains either what new hints were
    // found, or why nothing new turned up (already covered vs. budget ran out). ---

    function buildDiverseSearchSummary(novel: any, report: any, isComplete: any) {
        const lines = [];
        if (novel.length > 0) {
            lines.push(`Found ${novel.length} new hint${novel.length === 1 ? '' : 's'} for this level.`);
            lines.push('New hints are saved for this session and contribute to the level’s heat map.');
        } else if (report.haltedByCancel) {
            lines.push('Search stopped before finding anything new.');
        } else if (report.haltedByMaxHints) {
            lines.push('Hint limit reached before finding anything new.');
        } else if (!isComplete) {
            lines.push('No new hints found before the time budget ran out.');
            lines.push('Try a longer search to keep exploring.');
        } else {
            lines.push('No new hints found.');
            lines.push('Every gate, direction, and strategy combination was explored — this level’s existing hints already cover its solution variety.');
        }
        if (!isComplete && !report.haltedByCancel) {
            lines.push('This search hasn’t covered every possibility yet — extend it to look for more.');
        }
        if (report.errors.length > 0) {
            lines.push(`${report.errors.length} search step${report.errors.length === 1 ? '' : 's'} hit an error and were skipped.`);
        }
        return lines;
    }

    function formatMinSec(ms: any) {
        const totalSeconds = Math.max(0, Math.round(ms / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // --- Find 1 Hint: preserves the pre-existing single-solve Solve behavior ---

    (document.getElementById('solveFindOneBtn') as any).onclick = async () => {
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
        let _t0 = 0, _lastTenths = -1, _progressTicker: any = null;
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
            await new Promise((r: any) => setTimeout(r, 0));
            if (_cancelled) throw new Error('SolverV2:cancelled');
        };
        engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
        try {
            engine.overlays.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setSolverTimerText('0.0s');
            ui.setSolverDetailText('Searching…');
            ui.setSolverProgress(0);
            await new Promise((r: any) => setTimeout(r, 0));
            const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
            const overlayMinTimer = new Promise((r: any) => setTimeout(r, 400));
            _t0 = Date.now();
            _lastTenths = -1;
            _progressTicker = setInterval(updateProgressDisplay, 50);
            const result = await solverV2.solve(level, { timeBudgetMs: budgetMs, yieldFn });
            updateProgressDisplay();
            await overlayMinTimer;
            if (result.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                ui.setSolverProgress(100);
                engine.hints.setHintPaths([result.solution], 'solver', 0);
                engine.overlays.startHintAnimation();
            } else {
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                ui.showMessage('No solution found within time limit.', 'warning');
            }
        } catch (err: any) {
            if (err?.message !== 'SolverV2:cancelled') {
                console.error('SolverV2 failed:', err);
                ui.showMessage(`Solve failed: ${err?.message || 'Unexpected error.'}`, 'error');
            }
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
        } finally {
            clearInterval(abortPoll);
            clearInterval(_progressTicker);
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };

    // --- Diverse hint search: cascades through profile/template/strategy ablations
    // across every (gate x first-step direction) and proven portal-exit-direction
    // combination, collecting any genuinely novel solution paths within a time/count
    // budget. Results land in foundHintsSinceLoad for the Editor's Hints button.
    //
    // Sessions are resumable: createDiversificationSession() returns an object whose
    // runUntil() can be called again later with a later deadline, picking up exactly
    // where the previous call stopped (in-progress combos keep their state). The
    // stored session is kept only in memory and is tied to the level it was created
    // for — navigating to a different level and back starts fresh rather than trying
    // to resume, which is an acceptable (not required-to-prevent) loss per spec. ---

    let activeSession: any = null;
    let activeSessionLevelIdx = -1;
    let extendActiveRun: any = null; // (extraMs: any) => void; live only while a search is running

    function invalidateSessionIfStale() {
        if (activeSession && activeSessionLevelIdx !== state.ENGINE.levelIdx) {
            activeSession = null;
            activeSessionLevelIdx = -1;
        }
    }

    function buildSessionForCurrentLevel() {
        const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
        const wl = state.ENGINE.editor.workingLevel;
        const existingHints = mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || []);
        return createDiversificationSession(level, existingHints, { solverV2 });
    }

    async function executeSearch(session: any, durationMs: any, maxHints: any) {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        let _cancelled = false;
        const cancelSolve = () => {
            if (_cancelled) return;
            _cancelled = true;
            ui.setSolverDetailText('Stopping… finishing current search step safely.');
            ui.setButtonState('solverCloseBtn', { enabled: false });
        };
        engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
        let _progressTicker: any = null;

        const runStartedAt = Date.now();
        let deadlineAt = runStartedAt + durationMs;
        const totalBudgetMs = () => deadlineAt - runStartedAt;
        let _lastTenths = -1;
        const updateProgressDisplay = () => {
            const elapsedMs = Date.now() - runStartedAt;
            const tenths = Math.floor(elapsedMs * 10 / 1000);
            if (tenths === _lastTenths) return;
            _lastTenths = tenths;
            ui.setSolverTimerText(`${(tenths / 10).toFixed(1)}s`);
            ui.setTextContent('solverBudgetLabel', `Budget ${formatMinSec(totalBudgetMs())}`);
            ui.setSolverProgress(Math.min(95, (elapsedMs / totalBudgetMs()) * 100));
        };
        extendActiveRun = (extraMs: any) => {
            deadlineAt += extraMs;
            _lastTenths = -1;
            updateProgressDisplay();
        };

        try {
            engine.overlays.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setSolverTimerText('0.0s');
            ui.setSolverDetailText('Searching for diverse hints…');
            ui.setSolverProgress(0);
            ui.setClassState('solverBudgetLabel', 'hidden', false);
            ui.setClassState('solverAddMinuteBtn', 'hidden', false);
            await new Promise((r: any) => setTimeout(r, 0));
            updateProgressDisplay();

            // A wall-clock ticker keeps the timer/progress bar smooth between search
            // steps, since onProgress only fires once per completed combo/strategy run —
            // which can be many seconds apart on slow levels.
            _progressTicker = setInterval(updateProgressDisplay, 100);
            const { novel, report, isComplete } = await session.runUntil(() => deadlineAt, {
                maxHints,
                isCancelled: () => _cancelled,
                onProgress: (evt: any) => {
                    const found = evt.novelCount === 1 ? '1 new hint' : `${evt.novelCount} new hints`;
                    ui.setSolverDetailText(evt.novelCount > 0 ? `Searching… ${found} found so far.` : 'Searching…');
                },
            });

            clearInterval(_progressTicker);
            _progressTicker = null;
            ui.setSolverProgress(100);
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            if (novel.length > 0) {
                setFoundHintsSinceLoad(state, mergeUniqueHints(state.ENGINE.foundHintsSinceLoad || [], novel));
            }
            const offerExtend = !isComplete && !report.haltedByCancel;
            ui.showDiverseSearchResult('Search Complete', buildDiverseSearchSummary(novel, report, isComplete), { showExtend: offerExtend });
        } catch (err: any) {
            if (err?.message !== 'SolverV2:cancelled') {
                console.error('Hint diversification failed:', err);
                ui.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'error');
            }
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
        } finally {
            extendActiveRun = null;
            ui.setClassState('solverBudgetLabel', 'hidden', true);
            ui.setClassState('solverAddMinuteBtn', 'hidden', true);
            clearInterval(abortPoll);
            clearInterval(_progressTicker);
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    }

    function startNewDiverseSearch(minutes: any, maxHints: any = Infinity) {
        if (state.ENGINE.solver.controller) return;
        activeSession = buildSessionForCurrentLevel();
        activeSessionLevelIdx = state.ENGINE.levelIdx;
        executeSearch(activeSession, minutes * 60000, maxHints);
    }

    function extendDiverseSearch(minutes: any) {
        invalidateSessionIfStale();
        if (!activeSession || state.ENGINE.solver.controller) return;
        executeSearch(activeSession, minutes * 60000, Infinity);
    }

    (document.getElementById('solverAddMinuteBtn') as any)?.addEventListener('click', () => {
        extendActiveRun?.(60000);
    });

    (document.getElementById('solveDiverse5Btn') as any).onclick  = () => startNewDiverseSearch(5);
    (document.getElementById('solveDiverse10Btn') as any).onclick = () => startNewDiverseSearch(10);
    (document.getElementById('solveDiverse20Btn') as any).onclick = () => startNewDiverseSearch(20);

    (document.getElementById('solveDiverseCustomBtn') as any).onclick = () => {
        const minutes = ui.getNumber('solveDiverseCustomMinutes', 0);
        if (!(minutes > 0)) {
            ui.showMessage('Enter a duration in minutes.', 'warning');
            return;
        }
        const maxHints = ui.getNumber('solveDiverseMaxHints', 0);
        startNewDiverseSearch(minutes, maxHints > 0 ? maxHints : Infinity);
    };

    (document.getElementById('diverseSearchExtend5Btn') as any).onclick  = () => extendDiverseSearch(5);
    (document.getElementById('diverseSearchExtend15Btn') as any).onclick = () => extendDiverseSearch(15);

    (document.getElementById('diverseSearchExtendCustomBtn') as any).onclick = () => {
        const minutes = ui.getNumber('diverseSearchExtendCustomMinutes', 0);
        if (!(minutes > 0)) {
            ui.showMessage('Enter a duration in minutes.', 'warning');
            return;
        }
        extendDiverseSearch(minutes);
    };
}
