// Submission controller: shared submit-with-solve flow, hint button (play mode),
// review-mode hint button, dev copy-path button.

import { markDirty, setEditorWorkingLevel } from '../state-actions.js';
import { mergeUniqueHints } from '../solver/diversification.js';
import {
    nextHintCycleIndex,
    collectValidatedUniqueHints,
    resolveHintAdditionVerdict,
    pendingDuplicateNovelCount,
    clampReviewIndex,
} from './submission-core.js';

export function createSubmissionController({ core, state, ui, engine, levelUtils, editor, persistence, solverV2 }: any) {

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
        ui.setSubmitStep('smStep-validate', 'ok', 'Structure valid');

        const buildLevelData = (hints: any = []) => ({
            grid:            l.grid,
            gates:           levelUtils.expCoords(l.gateKeys),
            goal:            { x: levelUtils.UNPACK(l.goalKey).x + 1, y: levelUtils.UNPACK(l.goalKey).y + 1 },
            falseGoals:      levelUtils.expCoords(l.falseGoalKeys),
            reqLen, reqInt,
            designerName:    l.designerName  || '',
            description:     l.description   || '',
            difficulty:      l.difficulty    ?? null,
            blocks:          levelUtils.expCoords(l.blockSet),
            mustPass:        levelUtils.expCoords(l.mustPassKeys),
            mustCross:       levelUtils.expCoords(l.mustCrossKeys),
            filters:         Array.from(l.filterMap.entries()).map(([k, axis]: any) => ({ x: levelUtils.UNPACK(k).x + 1, y: levelUtils.UNPACK(k).y + 1, axis })),
            flippingFilters: Array.from(l.flippingFilterMap.entries()).map(([k, axis]: any) => ({ x: levelUtils.UNPACK(k).x + 1, y: levelUtils.UNPACK(k).y + 1, axis })),
            portals:         l.portalVisuals.map((pv: any) => ({ x1: levelUtils.UNPACK(pv.k1).x + 1, y1: levelUtils.UNPACK(pv.k1).y + 1, x2: levelUtils.UNPACK(pv.k2).x + 1, y2: levelUtils.UNPACK(pv.k2).y + 1 })),
            geese:           levelUtils.expCoords(l.gooseSet),
            hints,
        });

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
            levelFingerprint = duplicateCheck?.fingerprint || null;
            if (duplicateCheck?.duplicate) {
                if (duplicateCheck.duplicate.source === 'pending') {
                    pendingDuplicateMatch = duplicateCheck.duplicate;
                    ui.setSubmitStep('smStep-duplicate', 'warn', 'This grid layout and win requirements are already waiting for review. Checking your hints against that submission…');
                } else {
                    hintAdditionTarget = duplicateCheck.duplicate;
                    ui.setSubmitStep('smStep-duplicate', 'warn', 'This grid layout and win requirements match an already-published level. Checking for new hints to contribute…');
                }
            } else {
                const warningLabels = (duplicateCheck?.warnings || []).map((source: any) => source === 'approved' ? 'approved levels' : 'pending queue');
                const details = warningLabels.length
                    ? ['No duplicate found in the collections that could be checked.', `Could not check: ${warningLabels.join(', ')}.`]
                    : 'No duplicate found in pending or approved levels';
                ui.setSubmitStep('smStep-duplicate', warningLabels.length ? 'warn' : 'ok', details);
            }
        } catch (err: any) {
            console.error('[Submit] duplicate check failed:', err);
            ui.setSubmitStep('smStep-duplicate', 'error', err?.message || 'Could not check for duplicates.');
            ui.showSubmitDismiss();
            return;
        }

        // Step 3: Collect / auto-solve for hints
        ui.setSubmitStep('smStep-solve', 'running');
        const validateHintPath = (candidatePath: any) => {
            const lv = levelUtils.deepCloneLevel(l);
            lv.reqLen = reqLen; lv.reqInt = reqInt;
            return solverV2.validateCandidatePath(lv, candidatePath);
        };
        const candidatePaths = [
            ...(Array.isArray(l.hints) ? l.hints : []),
            ...(Array.isArray(state.ENGINE.foundHintsSinceLoad) ? state.ENGINE.foundHintsSinceLoad : []),
            ...(state.ENGINE.nav.path.length > 1 ? [state.ENGINE.nav.path] : []),
        ];
        let normalizedHints = collectValidatedUniqueHints(candidatePaths, validateHintPath);

        if (normalizedHints.length === 0) {
            let _cancelled = false;
            const cancelSolve = () => { _cancelled = true; ui.setModalContent('searchLabel', 'Stopping…', 'text'); };
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
                await new Promise((r: any) => setTimeout(r, 0));
                if (_cancelled) throw new Error('SolverV2:cancelled');
            };
            engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
            const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
            try {
                engine.overlays.setOverlayState(core.SOLVER_RUNNING);
                ui.setSolverControlsEnabled(false);
                ui.setModalContent('searchLabel', 'Solving level for submission…', 'text');
                ui.setSolverDetailText('Searching…');
                ui.setSolverTimerText('0.0s');
                ui.setSolverProgress(0);
                await new Promise((r: any) => setTimeout(r, 0));
                const solveLevel = levelUtils.deepCloneLevel(l);
                solveLevel.reqLen = reqLen; solveLevel.reqInt = reqInt;
                _t0 = Date.now();
                _lastTenths = -1;
                const result = await solverV2.solve(solveLevel, { timeBudgetMs: budgetMs, yieldFn });
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                    normalizedHints = collectValidatedUniqueHints([result.solution], validateHintPath);
                }
            } catch (err: any) {
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                if (err?.message === 'SolverV2:cancelled') {
                    ui.setSubmitStep('smStep-solve', 'warn', 'Solver cancelled');
                    ui.showSubmitDismiss();
                    return;
                }
            } finally {
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

        // Step 4: Save to server
        ui.setSubmitStep('smStep-save', 'running');
        const hints     = hintsToSubmit.slice(0, 5);
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
            console.error('[Submit] failed:', err);
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
                console.warn('[ReviewSubmit] Queue refresh failed:', e);
            }
            ui.setSubmitStep('smStep-save', 'ok', 'Queued for review');
            ui.showSubmitDismiss();
            setTimeout(() => ui.hideSubmitModal(), 4000);
        };
        const afterSuccess = state.ENGINE.mode === core.REVIEW ? afterReviewSubmit : null;
        submitWorkingLevel('reviewSubmitBtn', afterSuccess);
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

    const showSavedHint = () => {
        const hints = state.ENGINE.level?.hints;
        if (hints?.length > 0) {
            const nextIdx = nextHintCycleIndex(state.ENGINE.hinter.source, state.ENGINE.hinter.currentPathIdx, hints.length);
            engine.hints.setHintPaths(hints, 'saved', nextIdx);
            engine.overlays.startHintAnimation();
        } else {
            ui.showMessage('No saved hint.', 'info');
        }
    };

    // Play mode hint: plays saved hints only; solver is not triggered here.
    (document.getElementById('hintBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        showSavedHint();
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

    // --- Review-mode / Editor-mode hint (plays saved hints on the working level).
    // In Editor mode, hints discovered by the Solve Options diverse search
    // (foundHintsSinceLoad) are merged in alongside the level's saved hints, so
    // makers can cycle through every solution found so far. Review mode keeps the
    // original behavior — only the level's already-saved hints. ---

    (document.getElementById('reviewHintBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        const wl = state.ENGINE.editor.workingLevel;
        const hints = state.ENGINE.mode === core.EDITOR
            ? mergeUniqueHints(wl?.hints || [], state.ENGINE.foundHintsSinceLoad || [])
            : (wl?.hints || []);
        if (!hints.length) { ui.showMessage('No saved hint.', 'info'); return; }
        const nextIdx = nextHintCycleIndex(state.ENGINE.hinter.source, state.ENGINE.hinter.currentPathIdx, hints.length);
        engine.hints.setHintPaths(hints, 'saved', nextIdx);
        engine.overlays.startHintAnimation();
    };
}
