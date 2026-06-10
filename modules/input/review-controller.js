// Review controller: admin sign-in, approve/reject, published-levels management,
// and the review-load modal dismiss.

export function installReviewController(APP) {

    // --- Admin sign-in ---

    document.getElementById('reviewSignInBtn').onclick = async () => {
        const statusEl = document.getElementById('reviewAuthStatus');
        const btn      = document.getElementById('reviewSignInBtn');
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Signing in…';
        try {
            await APP.Persistence.initAdminAuth();
        } catch (err) {
            if (statusEl) statusEl.textContent = err?.message || 'Sign-in failed.';
            btn.disabled = false;
            return;
        }
        const overlay = document.getElementById('reviewAuthOverlay');
        if (overlay) overlay.classList.add('hidden');
        APP.State.ENGINE.review.submissions = [];
        APP.State.ENGINE.review.currentIdx  = 0;
        APP.Engine.switchMode(APP.Core.REVIEW);

        const rlm = {
            el:      document.getElementById('reviewLoadModal'),
            heading: document.getElementById('reviewLoadHeading'),
            detail:  document.getElementById('reviewLoadDetail'),
            spinner: document.getElementById('reviewLoadSpinner'),
            dismiss: document.getElementById('reviewLoadDismissBtn'),
        };
        rlm.heading.textContent = 'Loading Submissions';
        rlm.heading.style.color = '';
        rlm.detail.textContent  = 'Fetching from server…';
        rlm.spinner.classList.remove('hidden');
        rlm.dismiss.classList.add('hidden');
        rlm.el.classList.remove('hidden');
        try {
            const subs = await APP.Persistence.loadSubmissions();
            APP.State.ENGINE.review.submissions = subs;
            if (subs.length === 0) {
                APP.Engine.loadReviewLevel(0);
                rlm.heading.textContent = 'No Submissions';
                rlm.heading.style.color = '#94a3b8';
                rlm.detail.textContent  = 'No levels are waiting for review.';
                rlm.spinner.classList.add('hidden');
                rlm.dismiss.classList.remove('hidden');
            } else {
                rlm.el.classList.add('hidden');
                APP.Engine.loadReviewLevel(0);
            }
        } catch (err) {
            rlm.heading.textContent = 'Load Failed';
            rlm.heading.style.color = '#f87171';
            rlm.detail.textContent  = err?.message || String(err);
            rlm.spinner.classList.add('hidden');
            rlm.dismiss.classList.remove('hidden');
        }
    };

    document.getElementById('reviewLoadDismissBtn').onclick = () =>
        document.getElementById('reviewLoadModal').classList.add('hidden');

    // --- Approve / Reject ---

    document.getElementById('reviewApproveBtn').onclick = async () => {
        const subs = APP.State.ENGINE.review.submissions;
        const idx  = APP.State.ENGINE.review.currentIdx;
        if (!subs.length || !APP.State.ENGINE.editor.workingLevel) return;
        const sub       = subs[idx];
        const levelData = APP.LevelUtils.denormalizeLevel(APP.State.ENGINE.editor.workingLevel);
        APP.Editor.applyMetricsFromUI();
        try {
            APP.UI.showMessage('Approving…', 'text-white font-black');
            await APP.Persistence.approveSubmission(sub.id, levelData, Date.now());
            APP.State.ENGINE.review.submissions.splice(idx, 1);
            if (!APP.State.ENGINE.review.submissions.length) {
                APP.Engine.loadReviewLevel(0);
                APP.UI.showMessage('No more submissions.', 'text-slate-400');
            } else {
                APP.Engine.loadReviewLevel(Math.min(idx, APP.State.ENGINE.review.submissions.length - 1));
                APP.UI.showMessage('Approved!', 'text-emerald-400 font-black');
            }
        } catch (err) {
            APP.UI.showMessage('Approve failed: ' + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };

    document.getElementById('reviewRejectBtn').onclick = async () => {
        const subs = APP.State.ENGINE.review.submissions;
        const idx  = APP.State.ENGINE.review.currentIdx;
        if (!subs.length) return;
        const sub = subs[idx];
        try {
            APP.UI.showMessage('Rejecting…', 'text-white font-black');
            await APP.Persistence.rejectSubmission(sub.id);
            APP.State.ENGINE.review.submissions.splice(idx, 1);
            if (!APP.State.ENGINE.review.submissions.length) {
                APP.Engine.loadReviewLevel(0);
                APP.UI.showMessage('No more submissions.', 'text-slate-400');
            } else {
                APP.Engine.loadReviewLevel(Math.min(idx, APP.State.ENGINE.review.submissions.length - 1));
                APP.UI.showMessage('Rejected.', 'text-slate-400');
            }
        } catch (err) {
            APP.UI.showMessage('Reject failed: ' + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };

    // --- Published levels management ---

    const refreshPublishedLevelsModal = async () => {
        const status = document.getElementById('publishedLevelsStatus');
        const list   = document.getElementById('publishedLevelsList');
        if (!status || !list) return;
        status.textContent = 'Loading…';
        status.classList.remove('hidden');
        list.innerHTML = '';
        try {
            const docs = await APP.Persistence.listPublishedLevelDocs();
            if (!docs.length) { status.textContent = 'No published levels remain.'; return; }
            status.classList.add('hidden');
            docs.forEach(doc => {
                const row = document.createElement('label');
                row.className = 'flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--theme-modal-border)] bg-[var(--theme-modal-panel)] text-[var(--theme-modal-text)]';
                row.innerHTML = `<span class="font-black uppercase tracking-widest text-sm">Level ${doc.number}</span><input type="checkbox" class="published-level-checkbox w-5 h-5 accent-red-600" data-id="${doc.id}">`;
                list.appendChild(row);
            });
        } catch (err) {
            status.textContent = 'Failed to load published levels: ' + (err?.message || 'Error');
        }
    };

    document.getElementById('reviewPublishedLevelsBtn').onclick = async () => {
        APP.UI.closeAllModals();
        APP.UI.openModal('publishedLevelsModal');
        await refreshPublishedLevelsModal();
    };
    document.getElementById('closePublishedLevelsBtn').onclick   = () => APP.UI.closeModal('publishedLevelsModal');
    document.getElementById('refreshPublishedLevelsBtn').onclick = refreshPublishedLevelsModal;
    document.getElementById('deletePublishedLevelsBtn').onclick  = async () => {
        const ids = Array.from(document.querySelectorAll('.published-level-checkbox:checked'))
            .map(el => el.dataset.id)
            .filter(Boolean);
        if (!ids.length) { APP.UI.showMessage('Select levels first.', 'text-white font-black'); return; }
        if (!window.confirm(`Delete ${ids.length} published level${ids.length === 1 ? '' : 's'}?`)) return;
        try {
            await APP.Persistence.deletePublishedLevels(ids);
            await refreshPublishedLevelsModal();
            APP.UI.showMessage('Deleted.', 'text-white font-black');
        } catch (err) {
            APP.UI.showMessage('Delete failed: ' + (err?.message || 'Error'), 'text-red-500 font-bold');
        }
    };
}
