// Review controller: admin sign-in, approve/reject, published-levels management,
// and the review-load modal dismiss.

export function createReviewController({ core, state, ui, engine, levelUtils, editor, persistence, solverV2 }) {

    // --- Admin sign-in ---

    // Switches into Review Mode and loads pending submissions. Assumes the caller
    // has already established admin auth (either via the reviewAuthOverlay sign-in
    // popup, or implicitly by passing the same admin Google-login gate that guards
    // Dev Mode — see options-controller.js's devToggleBtn handler).
    const enterReviewModeAndLoadSubmissions = async () => {
        engine.review.initReviewMode();

        const rlm = {
            el:      document.getElementById('reviewLoadModal'),
            heading: document.getElementById('reviewLoadHeading'),
            detail:  document.getElementById('reviewLoadDetail'),
            spinner: document.getElementById('reviewLoadSpinner'),
            dismiss: document.getElementById('reviewLoadDismissBtn'),
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
        } catch (err) {
            rlm.heading.textContent = 'Load Failed';
            rlm.heading.dataset.status = 'error';
            rlm.detail.textContent  = err?.message || String(err);
            rlm.spinner.classList.add('hidden');
            rlm.dismiss.classList.remove('hidden');
        }
    };

    document.getElementById('reviewSignInBtn').onclick = async () => {
        const statusEl = document.getElementById('reviewAuthStatus');
        const btn      = document.getElementById('reviewSignInBtn');
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Signing in…';
        try {
            await persistence.initAdminAuth();
        } catch (err) {
            const code = err?.code ? ` (${err.code})` : '';
            if (statusEl) statusEl.textContent = (err?.message || 'Sign-in failed.') + code;
            btn.disabled = false;
            return;
        }
        const overlay = document.getElementById('reviewAuthOverlay');
        if (overlay) overlay.classList.add('hidden');
        await enterReviewModeAndLoadSubmissions();
    };

    document.getElementById('reviewLoadDismissBtn').onclick = () =>
        document.getElementById('reviewLoadModal').classList.add('hidden');

    // --- Review/Publish shell button (visible only in Dev Mode) ---
    // Dev Mode is itself gated behind the admin Google login above, so entering
    // Review Mode from here does not need to re-prompt for sign-in.
    document.getElementById('reviewModeShellBtn').onclick = async () => {
        ui.closeAllModals();
        await enterReviewModeAndLoadSubmissions();
    };

    // --- Helpers ---

    const updateReviewHintBtn = () => {
        const wl = state.ENGINE.editor.workingLevel;
        const count = wl?.hints?.length || 0;
        ui.setButtonLabel('reviewHintBtn', count > 0 ? `Hints (${count})` : 'Hints');
    };

    // Validates existing hints against the current working level state.
    // Returns the array of still-valid hint paths.
    const revalidateHints = (wl, reqLen, reqInt) => {
        if (!Array.isArray(wl.hints) || !wl.hints.length) return [];
        const seen = new Set();
        const valid = [];
        for (const candidatePath of wl.hints) {
            const lv = levelUtils.deepCloneLevel(wl);
            lv.reqLen = reqLen; lv.reqInt = reqInt;
            const res = solverV2.validateCandidatePath(lv, candidatePath);
            if (!res?.ok) continue;
            const key = JSON.stringify(res.path);
            if (seen.has(key)) continue;
            seen.add(key);
            valid.push(res.path);
        }
        return valid;
    };

    // Runs the solver on the working level and returns up to 1 solution path, or null.
    const runSolverForHint = async (wl, reqLen, reqInt) => {
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
            await new Promise(r => setTimeout(r, 0));
            if (_cancelled) throw new Error('SolverV2:cancelled');
        };
        engine.solver.startSolverRun({ cancel: cancelSolve, abort: cancelSolve });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
        try {
            engine.setOverlayState(core.SOLVER_RUNNING);
            ui.setSolverControlsEnabled(false);
            ui.setModalContent('searchLabel', 'Solving level for approval…', 'text');
            ui.setSolverDetailText('Searching…');
            ui.setSolverTimerText('0.0s');
            ui.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const solveLevel = levelUtils.deepCloneLevel(wl);
            solveLevel.reqLen = reqLen; solveLevel.reqInt = reqInt;
            _t0 = Date.now();
            _lastTenths = -1;
            const result = await solverV2.solve(solveLevel, { timeBudgetMs: budgetMs, yieldFn });
            engine.setOverlayState(core.OVERLAY_NONE);
            if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                return result.solution;
            }
            return null;
        } catch (_err) {
            engine.setOverlayState(core.OVERLAY_NONE);
            return null;
        } finally {
            clearInterval(abortPoll);
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };

    // Shows the confirm-publish modal and returns a Promise<boolean>.
    const confirmPublishWithoutHint = () => new Promise(resolve => {
        const modal  = document.getElementById('reviewApproveConfirmModal');
        const yesBtn = document.getElementById('reviewApproveConfirmYes');
        const noBtn  = document.getElementById('reviewApproveConfirmNo');
        modal.classList.remove('hidden');
        const cleanup = (result) => {
            modal.classList.add('hidden');
            yesBtn.onclick = null;
            noBtn.onclick  = null;
            resolve(result);
        };
        yesBtn.onclick = () => cleanup(true);
        noBtn.onclick  = () => cleanup(false);
    });

    // --- Approve / Reject ---

    document.getElementById('reviewApproveBtn').onclick = async () => {
        const subs = state.ENGINE.review.submissions;
        const idx  = state.ENGINE.review.currentIdx;
        if (!subs.length || !state.ENGINE.editor.workingLevel) return;

        const sub            = subs[idx];
        const isHintAddition = sub.type === 'hintAddition' && !!sub.targetPublishedLevelId;

        const wl     = state.ENGINE.editor.workingLevel;
        const reqLen = parseInt(ui.getValue('editReqLen')) || 0;
        const reqInt = parseInt(ui.getValue('editReqInt')) || 0;
        editor.applyMetricsFromUI();

        // Re-validate hints if the level was modified during review.
        let hints = Array.isArray(wl.hints) ? [...wl.hints] : [];
        if (state.ENGINE.editor.isModified && hints.length > 0) {
            ui.showMessage('Re-validating hints…', 'text-yellow-400 font-bold');
            hints = revalidateHints(wl, reqLen, reqInt);
            wl.hints = hints;
            updateReviewHintBtn();
        }

        // If no valid hints remain, run solver.
        if (hints.length === 0) {
            ui.showMessage('Solving for hint…', 'text-yellow-400 font-bold');
            const solution = await runSolverForHint(wl, reqLen, reqInt);
            if (solution) {
                hints = [solution];
                wl.hints = hints;
                updateReviewHintBtn();
            } else if (isHintAddition) {
                // A hint-addition submission with nothing left to contribute has no
                // fallback publish path — the reviewer should reject it instead.
                ui.showMessage('No valid hints remain in this submission — rejecting is recommended.', 'text-red-500 font-bold');
                return;
            } else {
                // Solver failed — ask reviewer whether to publish anyway.
                const confirmed = await confirmPublishWithoutHint();
                if (!confirmed) {
                    ui.showMessage('Approval cancelled.', 'text-slate-400');
                    return;
                }
            }
        }

        try {
            ui.showMessage(isHintAddition ? 'Adding hints…' : 'Approving…', 'text-white font-black');
            if (isHintAddition) {
                await persistence.approveHintAddition(sub.id, sub.targetPublishedLevelId, hints);
            } else {
                const levelData = levelUtils.denormalizeLevel(wl);
                await persistence.approveSubmission(sub.id, levelData, Date.now());
            }
            engine.review.removeReviewSubmission(idx);
            if (!state.ENGINE.review.submissions.length) {
                engine.review.loadReviewLevel(0);
                ui.showMessage('No more submissions.', 'text-slate-400');
            } else {
                engine.review.loadReviewLevel(Math.min(idx, state.ENGINE.review.submissions.length - 1));
                ui.showMessage(isHintAddition ? 'Hints added!' : 'Approved!', 'text-emerald-400 font-black');
            }
        } catch (err) {
            ui.showMessage((isHintAddition ? 'Add hints failed: ' : 'Approve failed: ') + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };

    document.getElementById('reviewRejectBtn').onclick = async () => {
        const subs = state.ENGINE.review.submissions;
        const idx  = state.ENGINE.review.currentIdx;
        if (!subs.length) return;
        const sub = subs[idx];
        try {
            ui.showMessage('Rejecting…', 'text-white font-black');
            await persistence.rejectSubmission(sub.id);
            engine.review.removeReviewSubmission(idx);
            if (!state.ENGINE.review.submissions.length) {
                engine.review.loadReviewLevel(0);
                ui.showMessage('No more submissions.', 'text-slate-400');
            } else {
                engine.review.loadReviewLevel(Math.min(idx, state.ENGINE.review.submissions.length - 1));
                ui.showMessage('Rejected.', 'text-slate-400');
            }
        } catch (err) {
            ui.showMessage('Reject failed: ' + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };

    // --- Published levels management ---

    const refreshPublishedLevelsModal = async () => {
        const status = document.getElementById('publishedLevelsStatus');
        const list   = document.getElementById('publishedLevelsList');
        if (!status || !list) return;
        status.textContent = 'Loading…';
        status.classList.remove('hidden');
        list.replaceChildren();
        try {
            const docs = await persistence.listPublishedLevelDocs();
            if (!docs.length) { status.textContent = 'No published levels remain.'; return; }
            status.classList.add('hidden');
            docs.forEach(doc => {
                const row = document.createElement('label');
                row.className = 'flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--theme-modal-border)] bg-[var(--theme-modal-panel)] text-[var(--theme-modal-text)]';
                const label = document.createElement('span');
                label.className = 'font-black uppercase tracking-widest text-sm';
                label.textContent = `Level ${doc.number}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'published-level-checkbox w-5 h-5 accent-red-600';
                checkbox.dataset.id = doc.id;
                row.replaceChildren(label, checkbox);
                list.appendChild(row);
            });
        } catch (err) {
            status.textContent = 'Failed to load published levels: ' + (err?.message || 'Error');
        }
    };

    document.getElementById('reviewPublishedLevelsBtn').onclick = async () => {
        ui.closeAllModals();
        ui.openModal('publishedLevelsModal');
        await refreshPublishedLevelsModal();
    };
    document.getElementById('closePublishedLevelsBtn').onclick   = () => ui.closeModal('publishedLevelsModal');
    document.getElementById('refreshPublishedLevelsBtn').onclick = refreshPublishedLevelsModal;
    document.getElementById('deletePublishedLevelsBtn').onclick  = async () => {
        const ids = Array.from(document.querySelectorAll('.published-level-checkbox:checked'))
            .map(el => el.dataset.id)
            .filter(Boolean);
        if (!ids.length) { ui.showMessage('Select levels first.', 'text-white font-black'); return; }
        if (!window.confirm(`Delete ${ids.length} published level${ids.length === 1 ? '' : 's'}?`)) return;
        try {
            await persistence.deletePublishedLevels(ids);
            await refreshPublishedLevelsModal();
            ui.showMessage('Deleted.', 'text-white font-black');
        } catch (err) {
            ui.showMessage('Delete failed: ' + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };
}
