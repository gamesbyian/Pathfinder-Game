import type { RequireDeps } from '../state.js';
// Submission controller: shared submit-with-solve flow, hint button (play mode),
// review-mode hint button, dev copy-path button.

import { markDirty, setEditorWorkingLevel, setFoundHintsSinceLoad } from '../state-actions.js';
import { mergeUniqueHints } from '../solver/diversification.js';
import {
    nextHintCycleIndex,
    collectValidatedUniqueHints,
    resolveHintAdditionVerdict,
    pendingDuplicateNovelCount,
    clampReviewIndex,
    describeDuplicateCheck,
} from './submission-core.js';
import { defaultReportError } from '../error-reporting.js';
import { buildWireLevelData } from '../domain/level-codec.js';

/** Small deterministic RNG for the submission-time variety search. */
function mulberry32(seed: number) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createSubmissionController({ core, state, ui, engine, levelUtils, editor, persistence, solverApi, data, reportError = defaultReportError }: RequireDeps<'levelUtils' | 'solverApi' | 'data'>) {

    // --- Shared multi-step submission flow ---

    const submitWorkingLevel = async (triggerBtnId: any, afterSuccess: any) => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) {
            ui.showMessage('Solver is running, please wait.', 'warning');
            return;
        }
        if (!persistence.getCurrentUser()) {
            ui.showMessage('Not signed in. Please wait or refresh.', 'error');
            return;
        }

        ui.resetSubmitModal();
        ui.showSubmitModal();

        // Step 1: Validate structure
        ui.setSubmitStep('smStep-validate', 'running');
        await new Promise((r: any) => setTimeout(r, 0));
        editor.applyMetricsFromUI();
        const l          = state.ENGINE.editor.workingLevel;
        const validation = editor.validateWorkingLevel();
        const reqLen     = parseInt(ui.getValue('editReqLen')) || 0;
        const reqInt     = parseInt(ui.getValue('editReqInt')) || 0;
        if (!validation?.ok) {
            ui.setSubmitStep('smStep-validate', 'error', validation.reasons?.length ? validation.reasons : ['Fix errors first.']);
            ui.showSubmitDismiss();
            return;
        }
        if (!reqLen) {
            ui.setSubmitStep('smStep-validate', 'error', ['Set a path length target before submitting.']);
            ui.showSubmitDismiss();
            return;
        }

        // Structure is valid. Before continuing, run a bounded trap-spot check and
        // warn (non-blocking) about any false goals that can never be triggered: no
        // path can end on those cells, so the trap would never fire. This advises
        // the maker to relocate them (via the "Bombs?" button) but never blocks the
        // submission. Only definitively-dead spots are reported (classifyFalseGoals
        // returns 'unreachable' only when proven), so there are no false alarms even
        // if the bounded check times out.
        let trapWarned = false;
        if (l.falseGoalKeys && l.falseGoalKeys.size > 0) {
            try {
                const fgLevel = levelUtils.cloneLevelWithReq(l, reqLen, reqInt);
                const trapBudget = Math.min(solverApi.getTrapSpotBudgetMs(fgLevel), 8000);
                const trapRes = await solverApi.findTrapSpots(fgLevel, {
                    timeLimit: trapBudget,
                    yieldFn: async () => { await new Promise((r: any) => setTimeout(r, 0)); },
                    onProgress: ({ gatesProcessed, totalGates }: any) =>
                        ui.setSubmitStep('smStep-validate', 'running', `Checking trap placement… gate ${gatesProcessed}/${totalGates}`),
                });
                const dead = Array.from(solverApi.classifyFalseGoals(fgLevel, trapRes).entries())
                    .filter(([, st]: any) => st === 'unreachable')
                    .map(([k]: any) => k);
                if (dead.length > 0) {
                    const coords = dead.map((k: any) => { const p = levelUtils.UNPACK(k); return `(${p.x + 1},${p.y + 1})`; }).join(', ');
                    ui.setSubmitStep('smStep-validate', 'warn', [
                        'Structure valid.',
                        `${dead.length} false goal${dead.length > 1 ? 's' : ''} can never be triggered: ${coords}.`,
                        'No path can end on those cells, so the trap will never fire. Use the "Bombs?" button to find viable spots. Submitting anyway.',
                    ]);
                    trapWarned = true;
                }
            } catch (err: any) {
                // Advisory only — never block submission if the check itself fails, but still report it.
                reportError('submit.false-goal-check', err);
            }
        }
        if (!trapWarned) ui.setSubmitStep('smStep-validate', 'ok', 'Structure valid');

        const buildLevelData = (hints: any = []) => buildWireLevelData(l, { reqLen, reqInt, hints });

        // Step 2: Check duplicates. Both a pending-queue match and an already-published
        // match are deferred — the player may still be contributing genuinely novel
        // hints, which can only be known once hints are collected below. A pending
        // match still always hard-blocks the submission itself (Step 4 never runs for
        // it), but the final message confirms whether the hints were checked.
        ui.setSubmitStep('smStep-duplicate', 'running');
        let levelFingerprint = null;
        let hintAdditionTarget = null;
        let pendingDuplicateMatch = null;
        try {
            const duplicateCheck = await persistence.findDuplicateLevel(buildLevelData([]));
            const verdict = describeDuplicateCheck(duplicateCheck);
            levelFingerprint      = verdict.fingerprint;
            pendingDuplicateMatch = verdict.pendingDuplicateMatch;
            hintAdditionTarget    = verdict.hintAdditionTarget;
            ui.setSubmitStep('smStep-duplicate', verdict.step.state, verdict.step.details);
        } catch (err: any) {
            reportError('submit.duplicate-check', err);
            ui.setSubmitStep('smStep-duplicate', 'error', err?.message || 'Could not check for duplicates.');
            ui.showSubmitDismiss();
            return;
        }

        // Step 3: Collect / auto-solve for hints
        ui.setSubmitStep('smStep-solve', 'running');
        const validateHintPath = (candidatePath: any) => {
            const lv = levelUtils.cloneLevelWithReq(l, reqLen, reqInt);
            return solverApi.validateCandidatePath(lv, candidatePath);
        };
        const candidatePaths = [
            ...(Array.isArray(l.hints) ? l.hints : []),
            ...(Array.isArray(state.ENGINE.foundHintsSinceLoad) ? state.ENGINE.foundHintsSinceLoad : []),
            ...(state.ENGINE.nav.path.length > 1 ? [state.ENGINE.nav.path] : []),
        ];
        let normalizedHints = collectValidatedUniqueHints(candidatePaths, validateHintPath);

        // Spend up to 10s finding as many additional distinct solutions as possible (on top of any
        // already known), so the submission carries a rich solution set. Live countdown + running count.
        {
            const budgetMs = 10000;
            let _cancelled = false;
            const cancelSolve = () => { _cancelled = true; ui.setModalContent('searchLabel', 'Stopping…', 'text'); };
            engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
            const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
            const deadlineAt = Date.now() + budgetMs;
            const baseCount = normalizedHints.length;
            let foundSoFar = 0;
            let ticker: any = null;
            const updateCountdown = () => {
                const remainingMs = Math.max(0, deadlineAt - Date.now());
                ui.setSolverTimerText(`${(remainingMs / 1000).toFixed(1)}s`);
                ui.setSolverProgress(Math.min(99, ((budgetMs - remainingMs) / budgetMs) * 100));
            };
            try {
                engine.overlays.setOverlayState(core.SOLVER_RUNNING);
                ui.setSolverControlsEnabled(false);
                ui.setModalContent('searchLabel', 'Finding as many solutions as possible…', 'text');
                ui.setSolverDetailText(`Finding multiple solutions… ${baseCount} found.`);
                ui.setSolverTimerText('10.0s');
                ui.setSolverProgress(0);
                await new Promise((r: any) => setTimeout(r, 0));
                ticker = setInterval(updateCountdown, 100);
                const solveLevel = levelUtils.cloneLevelWithReq(l, reqLen, reqInt);
                // High target + disabled saturation so the 10s deadline is the real limiter — we keep
                // finding distinct solutions (all of which get submitted) for the whole budget.
                const session = solverApi.createVarietySearch(solveLevel, normalizedHints, {
                    rng: mulberry32((0x53ab ^ (baseCount + 1)) >>> 0), stagnation: Number.MAX_SAFE_INTEGER, restarts: 500,
                });
                const res = await session.run({
                    mode: 'targeted',
                    target: 1000,
                    yieldFn: () => new Promise((r: any) => setTimeout(r, 0)),
                    shouldStop: () => _cancelled || Date.now() >= deadlineAt,
                    isCancelled: () => _cancelled,
                    onProgress: (e: any) => {
                        foundSoFar = e.savedCount;
                        ui.setSolverDetailText(`Finding multiple solutions… ${baseCount + foundSoFar} found.`);
                    },
                });
                clearInterval(ticker); ticker = null;
                ui.setSolverProgress(100);
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                // Merge whatever was found (including partial results if cancelled) and remember them.
                if (res.newlySaved.length > 0) {
                    normalizedHints = collectValidatedUniqueHints([...candidatePaths, ...res.newlySaved], validateHintPath);
                    setFoundHintsSinceLoad(state, mergeUniqueHints(state.ENGINE.foundHintsSinceLoad || [], res.newlySaved));
                }
            } catch (err: any) {
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                if (err?.message !== 'Solver:cancelled') reportError('submit.variety-search', err);
            } finally {
                if (ticker) clearInterval(ticker);
                clearInterval(abortPoll);
                engine.solver.endSolverRun();
                ui.setSolverControlsEnabled(true);
            }
        }

        const verified = normalizedHints.length > 0;
        ui.setSubmitStep('smStep-solve', verified ? 'ok' : 'warn',
            verified
                ? `${normalizedHints.length} solution${normalizedHints.length > 1 ? 's' : ''} confirmed`
                : 'No solution found — will submit for manual review');

        // Resolve the deferred duplicate verdict: a hint-addition target only clears
        // the block if at least one verified hint isn't already saved on that level.
        const additionVerdict = resolveHintAdditionVerdict(normalizedHints, hintAdditionTarget);
        if (!additionVerdict.ok) {
            ui.setSubmitStep('smStep-duplicate', 'error', 'Duplicate level: this published level already has these hints saved. Nothing new to contribute.');
            ui.showSubmitDismiss();
            return;
        }
        const hintsToSubmit = additionVerdict.hintsToSubmit;
        const targetPublishedLevelId = additionVerdict.targetPublishedLevelId;
        if (hintAdditionTarget) {
            ui.setSubmitStep('smStep-duplicate', 'ok', `Matches a published level — contributing ${additionVerdict.novelCount} new hint${additionVerdict.novelCount > 1 ? 's' : ''}.`);
        }

        // A pending-queue match always hard-blocks (there's no published level yet to
        // contribute hints to), but the message confirms whether the hints collected
        // above were actually checked and found to already be covered, rather than
        // silently repeating the generic duplicate notice.
        if (pendingDuplicateMatch) {
            const novelCount = pendingDuplicateNovelCount(normalizedHints, pendingDuplicateMatch);
            const detail = novelCount === 0
                ? 'Duplicate level: this grid layout and win requirements are already waiting for review. Checked your hints — none are new, so there\'s nothing fresh to add.'
                : `Duplicate level: this grid layout and win requirements are already waiting for review. ${novelCount} of your hint${novelCount > 1 ? 's are' : ' is'} new, but can't be added until that submission is reviewed.`;
            ui.setSubmitStep('smStep-duplicate', 'error', detail);
            ui.showSubmitDismiss();
            return;
        }

        // Step 4: Save to server — submit ALL validated solutions (not a curated/trimmed subset), so a
        // published level carries the full solution set for its heat map + curation. Bounded by the
        // system-wide 1,000-per-level cap (also a safety margin under Firestore's 1 MiB doc limit).
        ui.setSubmitStep('smStep-save', 'running');
        const hints     = hintsToSubmit.slice(0, 1000);
        const levelData = buildLevelData(hints);
        try {
            ui.setButtonState(triggerBtnId, { enabled: false });
            await persistence.submitLevel(levelData, { levelFingerprint, skipDuplicateCheck: true, targetPublishedLevelId });
            ui.setSubmitStep('smStep-save', 'ok', targetPublishedLevelId ? 'Queued for review — new hints for an existing level' : 'Queued for review');
            if (afterSuccess) {
                await afterSuccess();
            } else {
                ui.showSubmitDismiss();
                setTimeout(() => ui.hideSubmitModal(), 4000);
            }
        } catch (err: any) {
            reportError('submit.save', err);
            const errMsg = err?.message === 'Not signed in'
                ? 'Not signed in — refresh the page.'
                : (err?.message || 'Unknown error');
            ui.setSubmitStep('smStep-save', 'error', errMsg);
            ui.showSubmitDismiss();
        } finally {
            ui.setButtonState(triggerBtnId, { enabled: true });
        }
    };

    // --- Submit button ---

    (document.getElementById('reviewSubmitBtn') as any).onclick = () => {
        const afterReviewSubmit = async () => {
            ui.setSubmitStep('smStep-save', 'running', 'Refreshing review queue…');
            try {
                const subs = await persistence.loadSubmissions();
                engine.review.setReviewSubmissions(subs);
                const safeIdx = clampReviewIndex(state.ENGINE.review.currentIdx, subs.length);
                if (subs.length > 0) {
                    engine.review.loadReviewLevel(safeIdx);
                } else {
                    setEditorWorkingLevel(state, null);
                    markDirty(state);
                    ui.updateLevelDisplay(0, false, '0/0');
                }
            } catch (e: any) {
                reportError('submit.review-queue-refresh', e);
            }
            ui.setSubmitStep('smStep-save', 'ok', 'Queued for review');
            ui.showSubmitDismiss();
            setTimeout(() => ui.hideSubmitModal(), 4000);
        };
        const afterSuccess = state.ENGINE.mode === core.REVIEW ? afterReviewSubmit : null;
        // submitWorkingLevel has only nested try/catch blocks (no top-level guard), so a save-path
        // rejection could otherwise go unhandled — report it rather than swallow it silently.
        submitWorkingLevel('reviewSubmitBtn', afterSuccess).catch((err: any) =>
            reportError('submit.review-submission', err));
    };

    (document.getElementById('submitModalDismissBtn') as any).onclick = () => ui.hideSubmitModal();

    // --- Dev: copy current path ---

    (document.getElementById('devCopyBtn') as any).onclick = async () => {
        ui.closeAllModals();
        if (!state.ENGINE.nav.path.length) return;
        const pathStr = JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, '');
        ui.setSolutionOutput(pathStr);
        await ui.copyText(pathStr, { fallbackElId: 'solutionOutput' });
        ui.showMessage('Path Copied', 'info');
    };

    // --- Hint button (play mode) ---

    const showSavedHint = async () => {
        // Hints live in the lazily-fetched split artifact, not on the rest-state level
        // object (hardening plan §2); data.getHints caches after the first fetch.
        const levelNumber = state.ENGINE.levelIdx + 1;
        let hints: number[][] = [];
        try {
            hints = await data.getHints(levelNumber);
        } catch (err: any) {
            reportError('hints.load', err, { levelNumber });
        }
        // The fetch yielded — bail if the player moved to another level meanwhile.
        if (state.ENGINE.levelIdx + 1 !== levelNumber) return;
        if (hints.length > 0) {
            // Play mode cycles a curated, mutually-distinct subset (displayIndices); the cycle count
            // is that subset's size (falls back to the full list on the very first request).
            const count = state.ENGINE.hinter.displayIndices?.length || hints.length;
            const nextIdx = nextHintCycleIndex(state.ENGINE.hinter.source, state.ENGINE.hinter.currentPathIdx, count);
            engine.hints.setHintPaths(hints, 'saved', nextIdx, { curate: true });
            engine.overlays.startHintAnimation();
        } else {
            ui.showMessage('No saved hint.', 'info');
        }
    };

    // Play mode hint: plays saved hints only; solver is not triggered here.
    (document.getElementById('hintBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        void showSavedHint(); // never rejects — getHints failures are reported inside
    };

    (document.getElementById('pinHintBtn') as any)?.addEventListener('click', () => {
        engine.hints.pinCurrentHint();
    });

    (document.getElementById('clearHintBtn') as any)?.addEventListener('click', () => {
        engine.hints.clearPersistedHint();
    });

    (document.getElementById('pinHeatMapBtn') as any)?.addEventListener('click', () => {
        engine.hints.pinCurrentHeatmap();
    });

    (document.getElementById('clearHeatMapBtn') as any)?.addEventListener('click', () => {
        engine.hints.clearPersistedHeatmap();
    });

    // --- Review-mode / Editor-mode hint: cycles through ALL known solutions on the working level,
    // uncurated (curation is Play-mode only). In BOTH modes the level's saved hints and any solutions
    // found this session via Solve (foundHintsSinceLoad) are merged, so newly-found solutions show and
    // count immediately. The button label shows the cycle position "Hints (i/N)". ---

    (document.getElementById('reviewHintBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        const wl = state.ENGINE.editor.workingLevel;
        const hints = mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || []);
        if (!hints.length) { ui.showMessage('No saved hint.', 'info'); return; }
        const nextIdx = nextHintCycleIndex(state.ENGINE.hinter.source, state.ENGINE.hinter.currentPathIdx, hints.length);
        engine.hints.setHintPaths(hints, 'saved', nextIdx);
        engine.overlays.startHintAnimation();
        ui.setButtonLabel('reviewHintBtn', `Hints (${nextIdx + 1}/${hints.length})`);
    };
}
