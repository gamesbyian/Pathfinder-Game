import type { RequireDeps } from '../state.js';
// Review controller: admin sign-in, approve/reject, published-levels management,
// and the review-load modal dismiss.

import { classifyApproval, decideApprovalFallback, revalidateWorkingHints } from './review-core.js';
import { knownHintCount, hintButtonLabel, mergeUniqueHints } from '../solver/diversification.js';
import { defaultReportError } from '../error-reporting.js';
import { OVERLAY_NONE, SOLVER_RUNNING } from '../app-constants.js';
import { buildWireLevelData, cloneLevelWithReq } from '../domain/level-codec.js';
import { mergeHints, reconcileHints, toHint } from '../domain/hint-types.js';
import { provenanceFromSolveResult } from '../solver/hint-provenance.js';
import { getLevelFingerprint } from '../domain/level-fingerprint.js';
import { SOLVER_VERSION } from '../build-info.js';
import { appendProvenanceEntry, makeProvenanceEntry as makeLevelProvenanceEntry } from '../domain/level-provenance-types.js';

export function createReviewController({ state, ui, engine, editor, persistence, solverApi, reportError = defaultReportError }: RequireDeps<'solverApi'>) {

    // --- Admin sign-in ---

    // Switches into Review Mode and loads pending submissions. Assumes the caller
    // has already established admin auth (either via the reviewAuthOverlay sign-in
    // popup, or implicitly by passing the same admin Google-login gate that guards
    // Dev Mode — see options-controller.js's devToggleBtn handler).
    const enterReviewModeAndLoadSubmissions = async () => {
        engine.review.initReviewMode();

        const rlm = {
            el:      (document.getElementById('reviewLoadModal') as any),
            heading: (document.getElementById('reviewLoadHeading') as any),
            detail:  (document.getElementById('reviewLoadDetail') as any),
            spinner: (document.getElementById('reviewLoadSpinner') as any),
            dismiss: (document.getElementById('reviewLoadDismissBtn') as any),
        };
        rlm.heading.textContent = 'Loading Submissions';
        rlm.heading.dataset.status = 'default';
        rlm.detail.textContent  = 'Fetching from server…';
        rlm.spinner.classList.remove('hidden');
        rlm.dismiss.classList.add('hidden');
        rlm.el.classList.remove('hidden');
        try {
            const subs = await persistence.loadSubmissions();
            engine.review.setReviewSubmissions(subs);
            if (subs.length === 0) {
                engine.review.loadReviewLevel(0);
                rlm.heading.textContent = 'No Submissions';
                rlm.heading.dataset.status = 'muted';
                rlm.detail.textContent  = 'No levels are waiting for review.';
                rlm.spinner.classList.add('hidden');
                rlm.dismiss.classList.remove('hidden');
            } else {
                rlm.el.classList.add('hidden');
                engine.review.loadReviewLevel(0);
            }
        } catch (err: any) {
            reportError('review.load-submissions', err);
            rlm.heading.textContent = 'Load Failed';
            rlm.heading.dataset.status = 'error';
            rlm.detail.textContent  = err?.message || String(err);
            rlm.spinner.classList.add('hidden');
            rlm.dismiss.classList.remove('hidden');
        }
    };

    (document.getElementById('reviewSignInBtn') as any).onclick = async () => {
        const statusEl = (document.getElementById('reviewAuthStatus') as any);
        const btn      = (document.getElementById('reviewSignInBtn') as any);
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Signing in…';
        try {
            await persistence.initAdminAuth();
        } catch (err: any) {
            reportError('review.sign-in', err);
            const code = err?.code ? ` (${err.code})` : '';
            if (statusEl) statusEl.textContent = (err?.message || 'Sign-in failed.') + code;
            btn.disabled = false;
            return;
        }
        const overlay = (document.getElementById('reviewAuthOverlay') as any);
        if (overlay) overlay.classList.add('hidden');
        await enterReviewModeAndLoadSubmissions();
    };

    (document.getElementById('reviewLoadDismissBtn') as any).onclick = () =>
        (document.getElementById('reviewLoadModal') as any).classList.add('hidden');

    // --- Review/Publish shell button (visible only in Dev Mode) ---
    // Dev Mode is itself gated behind the admin Google login above, so entering
    // Review Mode from here does not need to re-prompt for sign-in.
    (document.getElementById('reviewModeShellBtn') as any).onclick = async () => {
        ui.closeAllModals();
        await enterReviewModeAndLoadSubmissions();
    };

    // --- Helpers ---

    const updateReviewHintBtn = () => {
        const wl = state.engineState.editor.workingLevel;
        const count = knownHintCount(wl?.hints, state.engineState.foundHintsSinceLoad);
        ui.setButtonLabel('reviewHintBtn', hintButtonLabel(count));
    };

    // Validates the given hint paths against the current working level state.
    // Returns the array of still-valid, de-duplicated hint paths (pure core does the dedupe).
    const revalidateHints = (hints: any, wl: any, requiredLength: any, requiredIntersections: any) =>
        revalidateWorkingHints(hints, (candidatePath: any) => {
            const lv = cloneLevelWithReq(wl, requiredLength, requiredIntersections);
            return solverApi.validateCandidatePath(lv, candidatePath);
        });

    // Runs the solver on the working level and returns up to 1 solution path, or null.
    const runSolverForHint = async (wl: any, requiredLength: any, requiredIntersections: any) => {
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
            if (_cancelled) throw new Error('Solver:cancelled');
        };
        engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.engineState.solver.abortRequested) cancelSolve(); }, 100);
        try {
            engine.overlays.setOverlayState(SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setModalContent('searchLabel', 'Solving level for approval…', 'text');
            ui.setSolverDetailText('Searching…');
            ui.setSolverTimerText('0.0s');
            ui.setSolverProgress(0);
            await new Promise((r: any) => setTimeout(r, 0));
            const solveLevel = cloneLevelWithReq(wl, requiredLength, requiredIntersections);
            _t0 = Date.now();
            _lastTenths = -1;
            // disableExtraBudgetPasses -- see solver-controller.ts's identical comment: this is an
            // interactive human-waiting context whose progress bar promises ~30s, and any last-resort
            // pass's extra budget would silently break that. Uses the convenience flag so a future
            // new pass is covered automatically.
            const result = await solverApi.solveLevel(solveLevel, { timeBudgetMs: budgetMs, yieldFn, disableExtraBudgetPasses: true });
            engine.overlays.setOverlayState(OVERLAY_NONE);
            if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                const levelRevision = await getLevelFingerprint(solveLevel);
                return { path: result.solution, hint: toHint(result.solution, [provenanceFromSolveResult(result, { solverVersion: SOLVER_VERSION, levelRevision })]) };
            }
            return null;
        } catch (err: any) {
            if (err?.message !== 'Solver:cancelled') reportError('review.solve-for-hint', err);
            engine.overlays.setOverlayState(OVERLAY_NONE);
            return null;
        } finally {
            clearInterval(abortPoll);
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };

    // Shows the confirm-publish modal and returns a Promise<boolean>.
    const confirmPublishWithoutHint = () => new Promise((resolve: any) => {
        const modal  = (document.getElementById('reviewApproveConfirmModal') as any);
        const yesBtn = (document.getElementById('reviewApproveConfirmYes') as any);
        const noBtn  = (document.getElementById('reviewApproveConfirmNo') as any);
        modal.classList.remove('hidden');
        const cleanup = (result: any) => {
            modal.classList.add('hidden');
            yesBtn.onclick = null;
            noBtn.onclick  = null;
            resolve(result);
        };
        yesBtn.onclick = () => cleanup(true);
        noBtn.onclick  = () => cleanup(false);
    });

    // --- Approve / Reject ---

    (document.getElementById('reviewApproveBtn') as any).onclick = async () => {
        const subs = state.engineState.review.submissions;
        const idx  = state.engineState.review.currentIdx;
        if (!subs.length || !state.engineState.editor.workingLevel) return;

        const sub            = subs[idx];
        const { isHintAddition, isLocal } = classifyApproval(sub);

        const wl     = state.engineState.editor.workingLevel;
        const requiredLength = parseInt(ui.getValue('editReqLen')) || 0;
        const requiredIntersections = parseInt(ui.getValue('editReqInt')) || 0;
        editor.applyMetricsFromUI();

        // Fold in any solutions the reviewer discovered this session (via the Solve button) so they
        // are persisted alongside the submission's own hints, not just used for the Hints button.
        let hints = mergeUniqueHints(Array.isArray(wl.hints) ? wl.hints : [], state.engineState.foundHintsSinceLoad || []);
        // Re-validate the full set if the level was modified during review.
        if (state.engineState.editor.isModified && hints.length > 0) {
            ui.showMessage('Re-validating hints…', 'warning');
            hints = revalidateHints(hints, wl, requiredLength, requiredIntersections);
        }
        wl.hints = hints;
        updateReviewHintBtn();

        // If no valid hints remain, run solver.
        let solverFallbackHint: any = null;
        if (hints.length === 0) {
            ui.showMessage('Solving for hint…', 'warning');
            const solved = await runSolverForHint(wl, requiredLength, requiredIntersections);
            const fallback = decideApprovalFallback(isHintAddition, !!solved);
            if (fallback === 'use-solution' && solved) {
                hints = [solved.path];
                solverFallbackHint = solved.hint;
                wl.hints = hints;
                updateReviewHintBtn();
            } else if (fallback === 'reject-recommended') {
                // A hint-addition submission with nothing left to contribute has no
                // fallback publish path — the reviewer should reject it instead.
                ui.showMessage('No valid hints remain in this submission — rejecting is recommended.', 'error');
                return;
            } else {
                // Solver failed — ask reviewer whether to publish anyway.
                const confirmed = await confirmPublishWithoutHint();
                if (!confirmed) {
                    ui.showMessage('Approval cancelled.', 'muted');
                    return;
                }
            }
        }

        // Reconcile the final path list against every provenance source known for this review
        // session — the submission's own records, anything the reviewer's Solve button found this
        // session, and the solver-fallback solution above — so approval never drops provenance for
        // a path that already had some.
        const knownHintRecords = mergeHints(
            mergeHints(wl.hintRecords || [], state.engineState.foundHintsSinceLoadRecords || []),
            solverFallbackHint ? [solverFallbackHint] : [],
        );
        const hintsToPersist = reconcileHints(hints, knownHintRecords);

        try {
            ui.showMessage(isHintAddition ? 'Adding hints…' : 'Approving…', 'info');
            if (isHintAddition && isLocal) {
                await persistence.approveLocalHintAddition(sub.id, sub.targetLocalLevelFingerprint, hintsToPersist);
            } else if (isHintAddition) {
                await persistence.approveHintAddition(sub.id, sub.targetPublishedLevelId, hintsToPersist);
            } else {
                const approvedProvenance = appendProvenanceEntry(wl.provenance, makeLevelProvenanceEntry('human', 'reviewed-approved'));
                const levelData = buildWireLevelData(wl, { hints: hintsToPersist, provenance: approvedProvenance });
                await persistence.approveSubmission(sub.id, levelData, Date.now());
            }
            const { allDone } = engine.review.removeAndAdvance(idx);
            if (allDone) ui.showMessage('No more submissions.', 'muted');
            else ui.showMessage(isHintAddition ? 'Hints added!' : 'Approved!', 'success');
        } catch (err: any) {
            reportError('review.approve', err, { isHintAddition });
            ui.showMessage((isHintAddition ? 'Add hints failed: ' : 'Approve failed: ') + (err?.message || 'Error'), 'error');
        }
    };

    (document.getElementById('reviewRejectBtn') as any).onclick = async () => {
        const subs = state.engineState.review.submissions;
        const idx  = state.engineState.review.currentIdx;
        if (!subs.length) return;
        const sub = subs[idx];
        try {
            ui.showMessage('Rejecting…', 'info');
            await persistence.rejectSubmission(sub.id);
            const { allDone } = engine.review.removeAndAdvance(idx);
            ui.showMessage(allDone ? 'No more submissions.' : 'Rejected.', 'muted');
        } catch (err: any) {
            reportError('review.reject', err);
            ui.showMessage('Reject failed: ' + (err?.message || 'Error'), 'error');
        }
    };

    // --- Published levels management ---

    const refreshPublishedLevelsModal = async () => {
        const status = (document.getElementById('publishedLevelsStatus') as any);
        const list   = (document.getElementById('publishedLevelsList') as any);
        if (!status || !list) return;
        status.textContent = 'Loading…';
        status.classList.remove('hidden');
        list.replaceChildren();
        try {
            const docs = await persistence.listPublishedLevelDocs();
            if (!docs.length) { status.textContent = 'No published levels remain.'; return; }
            status.classList.add('hidden');
            docs.forEach((doc: any) => {
                const row = document.createElement('label');
                row.className = 'published-level-row';
                const label = document.createElement('span');
                label.className = 'published-level-label';
                label.textContent = `Level ${doc.number}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'published-level-checkbox';
                checkbox.dataset.id = doc.id;
                row.replaceChildren(label, checkbox);
                list.appendChild(row);
            });
        } catch (err: any) {
            reportError('review.published-levels-load', err);
            status.textContent = 'Failed to load published levels: ' + (err?.message || 'Error');
        }
    };

    (document.getElementById('reviewPublishedLevelsBtn') as any).onclick = async () => {
        ui.closeAllModals();
        ui.openModal('publishedLevelsModal');
        await refreshPublishedLevelsModal();
    };
    (document.getElementById('closePublishedLevelsBtn') as any).onclick   = () => ui.closeModal('publishedLevelsModal');
    (document.getElementById('refreshPublishedLevelsBtn') as any).onclick = refreshPublishedLevelsModal;
    (document.getElementById('deletePublishedLevelsBtn') as any).onclick  = async () => {
        const ids = Array.from((document.querySelectorAll('.published-level-checkbox:checked') as any))
            .map((el) => (el as HTMLElement).dataset.id)
            .filter(Boolean);
        if (!ids.length) { ui.showMessage('Select levels first.', 'info'); return; }
        const confirmed = await ui.confirmDialog({
            title: 'Delete Levels',
            text: `Delete ${ids.length} published level${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
            confirmLabel: 'Delete',
        });
        if (!confirmed) return;
        try {
            await persistence.deletePublishedLevels(ids);
            await refreshPublishedLevelsModal();
            ui.showMessage('Deleted.', 'info');
        } catch (err: any) {
            reportError('review.published-levels-delete', err);
            ui.showMessage('Delete failed: ' + (err?.message || 'Error'), 'error');
        }
    };
}
