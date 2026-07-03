import type { RequireDeps } from '../state.js';
// Solver controller: solve button, solver-close button,
// solve-options modal (single hint vs. diverse hint search), and the
// dev-mode referee-solver keyboard toggle.
import { setFoundHintsSinceLoad, toggleFlag } from '../state-actions.js';
import { mergeUniqueHints, knownHintCount, hintButtonLabel } from '../solver/diversification.js';
import { buildVarietySearchSummary, customTier, formatMinSec, isSessionStale, shouldOfferExtend, VARIETY_TIERS, FIND_ALL_TIER } from './solver-core.js';
import { defaultReportError } from '../error-reporting.js';

export function createSolverController({ core, state, ui, engine, levelUtils, solverApi, reportError = defaultReportError }: RequireDeps<'levelUtils' | 'solverApi'>) {

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

    document.addEventListener('keydown', (e: KeyboardEvent) => {
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

    // The diverse-search completion summary and `M:SS` budget formatter are pure (solver-core).

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
            if (_cancelled) throw new Error('Solver:cancelled');
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
            const result = await solverApi.solve(level, { timeBudgetMs: budgetMs, yieldFn });
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
            if (err?.message !== 'Solver:cancelled') {
                reportError('solver.solve', err);
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

    // --- Varied-hint search: enumerate valid solutions with the shared engine (System A randomized
    // enumeration + System B prefix-anchored completion, via solverApi.createVarietySearch), SAVE every
    // validated find into foundHintsSinceLoad, and present a curated preview using the same metric the
    // player's hint display uses. Count tiers are a curator-confidence target + effort dial; "Find all"
    // runs a complete enumeration. Sessions are resumable (pool + RNG persist), tied to their level. ---

    let activeSession: any = null;
    let activeSessionLevelIdx = -1;
    let activeTier: any = null;
    let extendActiveRun: any = null; // (extraMs) => void; live only during a bounded run

    function mulberry32(seed: number) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function invalidateSessionIfStale() {
        if (activeSession && isSessionStale(activeSessionLevelIdx, state.ENGINE.levelIdx)) {
            activeSession = null; activeSessionLevelIdx = -1; activeTier = null;
        }
    }

    function buildSessionForCurrentLevel() {
        const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
        const wl = state.ENGINE.editor.workingLevel;
        const existingHints = mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || []);
        return solverApi.createVarietySearch(level, existingHints, { rng: mulberry32((0x50f7 ^ (state.ENGINE.levelIdx + 1)) >>> 0) });
    }

    async function executeVarietySearch(session: any, tier: any) {
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

        const bounded = Number.isFinite(tier.ceilingMs);
        const runStartedAt = Date.now();
        let deadlineAt = bounded ? runStartedAt + tier.ceilingMs : Infinity;
        let _lastTenths = -1;
        const updateProgressDisplay = () => {
            const elapsedMs = Date.now() - runStartedAt;
            const tenths = Math.floor(elapsedMs * 10 / 1000);
            if (tenths === _lastTenths) return;
            _lastTenths = tenths;
            ui.setSolverTimerText(`${(tenths / 10).toFixed(1)}s`);
            if (bounded) {
                ui.setTextContent('solverBudgetLabel', `Budget ${formatMinSec(deadlineAt - runStartedAt)}`);
                ui.setSolverProgress(Math.min(95, (elapsedMs / (deadlineAt - runStartedAt)) * 100));
            }
        };
        extendActiveRun = (extraMs: any) => { if (bounded) { deadlineAt += extraMs; _lastTenths = -1; updateProgressDisplay(); } };

        try {
            engine.overlays.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setSolverTimerText('0.0s');
            ui.setSolverDetailText(tier.complete ? 'Finding every solution…' : 'Searching for varied hints…');
            ui.setSolverProgress(0);
            ui.setClassState('solverBudgetLabel', 'hidden', !bounded);
            ui.setClassState('solverAddMinuteBtn', 'hidden', !bounded);
            await new Promise((r: any) => setTimeout(r, 0));
            updateProgressDisplay();
            _progressTicker = setInterval(updateProgressDisplay, 100);

            const res = await session.run({
                mode: tier.complete ? 'complete' : 'targeted',
                target: tier.target,
                yieldFn: () => new Promise((r: any) => setTimeout(r, 0)),
                shouldStop: () => _cancelled || Date.now() >= deadlineAt,
                isCancelled: () => _cancelled,
                onProgress: (e: any) => {
                    ui.setSolverDetailText(`Searching… saved ${e.savedCount}${e.curatedCount ? `, ${e.curatedCount} varied` : ''} so far.`);
                },
            });

            clearInterval(_progressTicker);
            _progressTicker = null;
            ui.setSolverProgress(100);
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            if (res.newlySaved.length > 0) {
                setFoundHintsSinceLoad(state, mergeUniqueHints(state.ENGINE.foundHintsSinceLoad || [], res.newlySaved));
                // Live-update the Edit/Review Hints button count to include the just-found solutions.
                ui.setButtonLabel('reviewHintBtn', hintButtonLabel(knownHintCount(state.ENGINE.editor.workingLevel?.hints, state.ENGINE.foundHintsSinceLoad)));
            }
            const summary = buildVarietySearchSummary(res, { target: tier.target, maxHints: 1000, mode: tier.complete ? 'complete' : 'targeted' });
            ui.showDiverseSearchResult('Search Complete', summary, { showExtend: shouldOfferExtend(res.outcome) });
        } catch (err: any) {
            if (err?.message !== 'Solver:cancelled') {
                reportError('solver.variety-search', err);
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

    function startVarietySearch(tier: any) {
        if (state.ENGINE.solver.controller) return;
        invalidateSessionIfStale();
        activeSession = buildSessionForCurrentLevel();
        activeSessionLevelIdx = state.ENGINE.levelIdx;
        activeTier = tier;
        // Fire-and-forget: executeVarietySearch self-handles all its awaits.
        void executeVarietySearch(activeSession, tier);
    }

    function extendVarietySearch() {
        invalidateSessionIfStale();
        if (!activeSession || !activeTier || state.ENGINE.solver.controller) return;
        void executeVarietySearch(activeSession, activeTier);
    }

    (document.getElementById('solverAddMinuteBtn') as any)?.addEventListener('click', () => { extendActiveRun?.(60000); });

    (document.getElementById('solveVariedFewBtn') as any).onclick  = () => startVarietySearch(VARIETY_TIERS.few);
    (document.getElementById('solveVariedManyBtn') as any).onclick = () => startVarietySearch(VARIETY_TIERS.many);
    (document.getElementById('solveVariedLotsBtn') as any).onclick = () => startVarietySearch(VARIETY_TIERS.lots);

    (document.getElementById('solveVariedCustomBtn') as any).onclick = () => {
        const target = ui.getNumber('solveVariedCustomTarget', 0);
        if (!(target > 0)) { ui.showMessage('Enter a target number of varied hints.', 'warning'); return; }
        startVarietySearch(customTier(target));
    };

    (document.getElementById('solveFindAllBtn') as any).onclick = () => startVarietySearch(FIND_ALL_TIER);

    (document.getElementById('diverseSearchExtendBtn') as any)?.addEventListener('click', () => extendVarietySearch());
}
