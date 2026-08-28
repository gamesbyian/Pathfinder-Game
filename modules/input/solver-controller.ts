import type { RequireDeps } from '../state.js';
// Solver controller: solve button, solver-close button,
// solve-options modal (single hint vs. diverse hint search), and the
// dev-mode referee-solver keyboard toggle.
import { setFoundHintsSinceLoad, setFoundHintsSinceLoadRecords, toggleFlag } from '../state-actions.js';
import { mergeUniqueHints, knownHintCount, hintButtonLabel } from '../solver/diversification.js';
import { hintsFromVarietyResult } from '../solver/hint-provenance.js';
import { mergeHints } from '../domain/hint-types.js';
import { getLevelFingerprint } from '../domain/level-fingerprint.js';
import { SOLVER_VERSION } from '../build-info.js';
import { buildVarietySearchSummary, customTier, formatMinSec, isSessionStale, shouldOfferExtend, VARIETY_TIERS, FIND_ALL_TIER, FIND_ALL_NOCAP_TIER } from './solver-core.js';
import { getRequiredPathCoverageRatio } from '../solver/archetype.js';
import { DENSE_LEVEL_COVERAGE_THRESHOLD } from '../solver/prep.js';
import { createEnumerationPoolClient } from '../solver/solver-worker-client.js';
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
            // disableExtraBudgetPasses -- the progress bar above promises a ~30s wait (it's scaled
            // directly off budgetMs); the repair-fallback path's default 6x extra budget would
            // silently blow past that promise for a repair-gated level (observed: up to 210s total
            // on a real solve), and the same is true of the smaller attraction-diversity and
            // admissible-order last-resort passes (orchestration.ts). This is an interactive
            // human-waiting context, not offline hint discovery, so none of these extensions are
            // worth the broken promise here. Uses the convenience flag (rather than naming each
            // override individually) so a future new last-resort pass is covered automatically —
            // see disableExtraBudgetPasses's own comment on SolveOpts for why this matters.
            const result = await solverApi.solve(level, { timeBudgetMs: budgetMs, yieldFn, disableExtraBudgetPasses: true });
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
    let activeLevel: any = null;
    let activeExistingHints: number[][] = [];
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
            activeSession = null; activeSessionLevelIdx = -1; activeTier = null; activeLevel = null; activeExistingHints = [];
        }
    }

    function buildSessionForCurrentLevel() {
        const level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
        const wl = state.ENGINE.editor.workingLevel;
        const existingHints = mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || []);
        const session = solverApi.createVarietySearch(level, existingHints, { rng: mulberry32((0x50f7 ^ (state.ENGINE.levelIdx + 1)) >>> 0) });
        return { session, level, existingHints };
    }

    // --- "Find all" parallel enumeration pool (browser Web Workers) ---
    //
    // Profiling (docs/solve-button-variety.md) found complete-mode enumeration is 84-92% raw DFS
    // time on real levels — genuinely CPU-bound, unlike the targeted tiers where curation recompute
    // dominates — so only "Find all" (both variants) uses the pool; targeted tiers keep using
    // `session.run({mode:'targeted', ...})` on the main thread, unchanged.
    //
    // Lazy construction + permanent-failure fallback mirrors trap-scan-controller.ts's getClient():
    // if the pool can't be built or a run throws, fall back to the main-thread session for the rest
    // of the session (browser tab lifetime), never retried.
    let enumerationPool: any = null;
    let poolFailed = false;

    function getEnumerationPool() {
        if (poolFailed) return null;
        if (!enumerationPool) {
            try {
                const poolSize = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
                enumerationPool = createEnumerationPoolClient(
                    () => new Worker(new URL('../solver/worker.js', import.meta.url), { type: 'module' }),
                    poolSize,
                );
            } catch (err) {
                poolFailed = true;
                reportError('solver.enumeration-pool-create', err);
            }
        }
        return enumerationPool;
    }

    async function executeVarietySearch(session: any, tier: any, level: any, existingHints: number[][]) {
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

            // "Find all — no cap" runs in two stages: a soft-stop at tier.maxHints (2,500), then — only
            // if the user opts in — a hard-stop at tier.hardCap (5,000). Every other tier (including
            // "Find all", up to 1,000) has no hardCap, so this loop always runs exactly once for them.
            let currentMaxHints = tier.maxHints ?? 1000;

            // Find-all's cumulative finds-so-far, tracked explicitly here because the two sources
            // behave differently: the pool is stateless per call (each runComplete() only reports
            // ITS OWN new finds), while `session` accumulates internally across its own repeated
            // run() calls. `everUsedPool` locks in which accounting rule applies once the pool has
            // contributed anything, so the two are never mixed mid-run (see the fallback branch).
            let cumulativeNewlySaved: number[][] = [];
            // Aligned 1:1 with cumulativeNewlySaved. Each worker reports its own real
            // nodesExpanded/elapsedMs per candidate (solver-worker-client.ts's runComplete ->
            // worker.js's ENUMERATE_PROGRESS carries it straight from completeFromState's
            // onSolution callback), tagged 'enumerate-complete-pooled' to distinguish an off-thread
            // find from the main-thread session's own 'enumerate-complete'.
            let cumulativeNewlySavedMeta: { nodesExpanded: number | null; elapsedMs: number | null; technique: string }[] = [];
            let everUsedPool = false;

            async function runCompleteStage(maxHints: number): Promise<any> {
                const pool = getEnumerationPool();
                if (pool) {
                    try {
                        const hintsSoFar = existingHints.concat(cumulativeNewlySaved);
                        const stageRes = await pool.runComplete(level, hintsSoFar, {
                            maxHints, target: tier.target, isCancelled: () => _cancelled,
                            onProgress: (e: any) => ui.setSolverDetailText(`Searching… saved ${cumulativeNewlySaved.length + e.savedCount} so far.`),
                        });
                        everUsedPool = true;
                        cumulativeNewlySaved = cumulativeNewlySaved.concat(stageRes.newlySaved);
                        cumulativeNewlySavedMeta = cumulativeNewlySavedMeta.concat(stageRes.newlySavedMeta);
                        return { shown: stageRes.shown, curatedCount: stageRes.curatedCount, outcome: stageRes.outcome, savedCount: cumulativeNewlySaved.length, newlySaved: cumulativeNewlySaved.slice(), newlySavedMeta: cumulativeNewlySavedMeta.slice() };
                    } catch (err) {
                        poolFailed = true;
                        reportError('solver.enumeration-pool', err);
                        // falls through to the main-thread session below
                    }
                }
                // Main-thread fallback. Reuse the original persistent `session` (which already IS
                // this run's accumulator) only if the pool was never involved yet this run. Once the
                // pool has contributed, build a fresh one-off session seeded with everything found so
                // far instead — a delta source like the pool, so cumulative tracking stays consistent
                // (mixing "session self-accumulates" with "concatenate a delta" would double-count).
                const runner = everUsedPool
                    ? solverApi.createVarietySearch(level, existingHints.concat(cumulativeNewlySaved), { rng: mulberry32((0x50f7 ^ (state.ENGINE.levelIdx + 1)) >>> 0) })
                    : session;
                const stageRes = await runner.run({
                    mode: 'complete', target: tier.target, maxHints,
                    yieldFn: () => new Promise((r: any) => setTimeout(r, 0)),
                    shouldStop: () => _cancelled || Date.now() >= deadlineAt,
                    isCancelled: () => _cancelled,
                    onProgress: (e: any) => ui.setSolverDetailText(`Searching… saved ${e.savedCount}${e.curatedCount ? `, ${e.curatedCount} varied` : ''} so far.`),
                });
                if (!everUsedPool) { cumulativeNewlySaved = stageRes.newlySaved; cumulativeNewlySavedMeta = stageRes.newlySavedMeta; return stageRes; } // session already IS the cumulative truth
                cumulativeNewlySaved = cumulativeNewlySaved.concat(stageRes.newlySaved);
                cumulativeNewlySavedMeta = cumulativeNewlySavedMeta.concat(stageRes.newlySavedMeta);
                return { ...stageRes, savedCount: cumulativeNewlySaved.length, newlySaved: cumulativeNewlySaved.slice(), newlySavedMeta: cumulativeNewlySavedMeta.slice() };
            }

            let res: any;
            for (;;) {
                res = tier.complete
                    ? await runCompleteStage(currentMaxHints)
                    : await session.run({
                        mode: 'targeted',
                        target: tier.target,
                        maxHints: currentMaxHints,
                        yieldFn: () => new Promise((r: any) => setTimeout(r, 0)),
                        shouldStop: () => _cancelled || Date.now() >= deadlineAt,
                        isCancelled: () => _cancelled,
                        onProgress: (e: any) => {
                            ui.setSolverDetailText(`Searching… saved ${e.savedCount}${e.curatedCount ? `, ${e.curatedCount} varied` : ''} so far.`);
                        },
                    });
                const offerMore = tier.hardCap && currentMaxHints === tier.maxHints && res.outcome === 'capped' && !_cancelled;
                if (!offerMore) break;
                clearInterval(_progressTicker);
                _progressTicker = null;
                const keepGoing = await ui.confirmDialog({
                    title: 'Keep Searching?',
                    text: `Found ${res.savedCount.toLocaleString()} solutions so far — there may be more. Keep searching up to ${tier.hardCap.toLocaleString()} total?`,
                    confirmLabel: 'Keep Searching',
                    cancelLabel: 'Stop Here',
                });
                if (!keepGoing) break;
                currentMaxHints = tier.hardCap;
                ui.setSolverDetailText('Resuming search…');
                _progressTicker = setInterval(updateProgressDisplay, 100);
            }

            if (_progressTicker) { clearInterval(_progressTicker); _progressTicker = null; }
            ui.setSolverProgress(100);
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            if (res.newlySaved.length > 0) {
                setFoundHintsSinceLoad(state, mergeUniqueHints(state.ENGINE.foundHintsSinceLoad || [], res.newlySaved));
                const levelRevision = await getLevelFingerprint(level);
                const newlyFoundRecords = hintsFromVarietyResult(res, { usedExistingHints: existingHints.length > 0, solverVersion: SOLVER_VERSION, levelRevision });
                setFoundHintsSinceLoadRecords(state, mergeHints(state.ENGINE.foundHintsSinceLoadRecords || [], newlyFoundRecords));
                // Live-update the Edit/Review Hints button count to include the just-found solutions.
                ui.setButtonLabel('reviewHintBtn', hintButtonLabel(knownHintCount(state.ENGINE.editor.workingLevel?.hints, state.ENGINE.foundHintsSinceLoad)));
            }
            const summary = buildVarietySearchSummary(res, { target: tier.target, maxHints: currentMaxHints, mode: tier.complete ? 'complete' : 'targeted' });
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
        const built = buildSessionForCurrentLevel();
        activeSession = built.session;
        activeLevel = built.level;
        activeExistingHints = built.existingHints;
        activeSessionLevelIdx = state.ENGINE.levelIdx;
        activeTier = tier;
        // Fire-and-forget: executeVarietySearch self-handles all its awaits.
        void executeVarietySearch(activeSession, tier, activeLevel, activeExistingHints);
    }

    function extendVarietySearch() {
        invalidateSessionIfStale();
        if (!activeSession || !activeTier || state.ENGINE.solver.controller) return;
        void executeVarietySearch(activeSession, activeTier, activeLevel, activeExistingHints);
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

    // "Find all" pre-flight confirm: always warns of the 20+ minute possibility; on a near-Hamiltonian
    // level (requiredPathCoverageRatio >= DENSE_LEVEL_COVERAGE_THRESHOLD) the solution-space size is combinatorial regardless
    // of grid size, so exhaustive completion is unlikely — steer the user toward "no cap" instead of the
    // 1,000-cap variant, which will most likely just report `capped` without exploring much more.
    async function confirmFindAll(tier: any): Promise<boolean> {
        const level = state.ENGINE.editor.workingLevel;
        const dense = !!level && getRequiredPathCoverageRatio(level) >= DENSE_LEVEL_COVERAGE_THRESHOLD;
        const text = dense
            ? `This level's solution space is very large, so an exhaustive search is unlikely to finish${tier.hardCap ? '' : ' — consider "Find all — no cap" instead'}. This can take 20+ minutes; you can stop at any time and everything found so far is kept.`
            : 'This can take 20+ minutes depending on the level and your device. You can stop at any time and everything found so far is kept.';
        return ui.confirmDialog({ title: 'Find All Solutions', text, confirmLabel: 'Start Search' });
    }

    async function confirmAndStartFindAll(tier: any) {
        if (state.ENGINE.solver.controller) return;
        if (await confirmFindAll(tier)) startVarietySearch(tier);
    }

    (document.getElementById('solveFindAllBtn') as any).onclick = () => confirmAndStartFindAll(FIND_ALL_TIER);
    (document.getElementById('solveFindAllNoCapBtn') as any).onclick = () => confirmAndStartFindAll(FIND_ALL_NOCAP_TIER);

    (document.getElementById('diverseSearchExtendBtn') as any)?.addEventListener('click', () => extendVarietySearch());
}
