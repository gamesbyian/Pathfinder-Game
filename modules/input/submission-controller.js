// Submission controller: shared submit-with-solve flow, hint button (play mode),
// review-mode hint button, dev copy-path button.

export function installSubmissionController(APP) {

    // --- Shared multi-step submission flow ---

    const submitWorkingLevel = async (triggerBtnId, afterSuccess) => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.activeSolverController) {
            APP.UI.showMessage('Solver is running, please wait.', 'text-yellow-400 font-bold');
            return;
        }
        if (!APP.Persistence.getCurrentUser()) {
            APP.UI.showMessage('Not signed in. Please wait or refresh.', 'text-red-500 font-bold');
            return;
        }

        const smEl      = document.getElementById('submitModal');
        const smDismiss = document.getElementById('submitModalDismissBtn');

        const resetModal = () => {
            ['smStep-validate', 'smStep-duplicate', 'smStep-solve', 'smStep-save'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const icon  = el.querySelector('.sm-icon');
                icon.innerHTML = '○';
                icon.className = 'sm-icon mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-slate-600 text-sm';
                el.querySelector('.sm-label').className = 'sm-label text-sm text-slate-400';
                const det = el.querySelector('.sm-detail');
                det.innerHTML = '';
                det.classList.add('hidden');
            });
            smDismiss.classList.add('hidden');
        };

        const setStep = (stepId, status, detail = null) => {
            const el = document.getElementById(stepId);
            if (!el) return;
            const icon     = el.querySelector('.sm-icon');
            const label    = el.querySelector('.sm-label');
            const detailEl = el.querySelector('.sm-detail');
            if (status === 'running') {
                icon.innerHTML = '<div class="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>';
                icon.className = 'sm-icon mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center';
                label.className = 'sm-label text-sm text-white font-semibold';
            } else if (status === 'ok') {
                icon.innerHTML = '✓';
                icon.className = 'sm-icon mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-emerald-400 font-bold';
                label.className = 'sm-label text-sm text-white';
            } else if (status === 'warn') {
                icon.innerHTML = '⚠';
                icon.className = 'sm-icon mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-amber-400';
                label.className = 'sm-label text-sm text-amber-300';
            } else if (status === 'error') {
                icon.innerHTML = '✗';
                icon.className = 'sm-icon mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-red-400 font-bold';
                label.className = 'sm-label text-sm text-red-300';
            }
            if (detail !== null) {
                detailEl.innerHTML = (Array.isArray(detail) ? detail : [detail])
                    .map(r => `<p class="text-xs text-slate-400 leading-snug">• ${r}</p>`).join('');
                detailEl.classList.remove('hidden');
            }
        };
        const sm = { el: smEl, dismiss: smDismiss, setStep };

        resetModal();
        smEl.classList.remove('hidden');

        // Step 1: Validate structure
        setStep('smStep-validate', 'running');
        await new Promise(r => setTimeout(r, 0));
        APP.Editor.applyMetricsFromUI();
        const l          = APP.State.ENGINE.editor.workingLevel;
        const validation = APP.Editor.validateWorkingLevel();
        const reqLen     = parseInt(APP.UI.getValue('editReqLen')) || 0;
        const reqInt     = parseInt(APP.UI.getValue('editReqInt')) || 0;
        if (!validation?.ok) {
            setStep('smStep-validate', 'error', validation.reasons?.length ? validation.reasons : ['Fix errors first.']);
            smDismiss.classList.remove('hidden');
            return;
        }
        if (!reqLen) {
            setStep('smStep-validate', 'error', ['Set a path length target before submitting.']);
            smDismiss.classList.remove('hidden');
            return;
        }
        setStep('smStep-validate', 'ok', 'Structure valid');

        const buildLevelData = (hints = []) => ({
            grid:            l.grid,
            gates:           APP.LevelUtils.expCoords(l.gateKeys),
            goal:            { x: APP.LevelUtils.UNPACK(l.goalKey).x + 1, y: APP.LevelUtils.UNPACK(l.goalKey).y + 1 },
            falseGoals:      APP.LevelUtils.expCoords(l.falseGoalKeys),
            reqLen, reqInt,
            designerName:    l.designerName  || '',
            description:     l.description   || '',
            difficulty:      l.difficulty    ?? null,
            blocks:          APP.LevelUtils.expCoords(l.blockSet),
            mustPass:        APP.LevelUtils.expCoords(l.mustPassKeys),
            mustCross:       APP.LevelUtils.expCoords(l.mustCrossKeys),
            filters:         Array.from(l.filterMap.entries()).map(([k, axis]) => ({ x: APP.LevelUtils.UNPACK(k).x + 1, y: APP.LevelUtils.UNPACK(k).y + 1, axis })),
            flippingFilters: Array.from(l.flippingFilterMap.entries()).map(([k, axis]) => ({ x: APP.LevelUtils.UNPACK(k).x + 1, y: APP.LevelUtils.UNPACK(k).y + 1, axis })),
            portals:         l.portalVisuals.map(pv => ({ x1: APP.LevelUtils.UNPACK(pv.k1).x + 1, y1: APP.LevelUtils.UNPACK(pv.k1).y + 1, x2: APP.LevelUtils.UNPACK(pv.k2).x + 1, y2: APP.LevelUtils.UNPACK(pv.k2).y + 1 })),
            geese:           APP.LevelUtils.expCoords(l.gooseSet),
            hints,
        });

        // Step 2: Check duplicates
        setStep('smStep-duplicate', 'running');
        let levelFingerprint = null;
        try {
            const duplicateCheck = await APP.Persistence.findDuplicateLevel(buildLevelData([]));
            levelFingerprint = duplicateCheck?.fingerprint || null;
            if (duplicateCheck?.duplicate) {
                const sourceLabel = duplicateCheck.duplicate.source === 'approved'
                    ? 'already approved/published'
                    : 'already waiting for review';
                setStep('smStep-duplicate', 'error', `Duplicate level: this grid layout and win requirements are ${sourceLabel}. Saved hints are ignored for this check.`);
                smDismiss.classList.remove('hidden');
                return;
            }
            const warningLabels = (duplicateCheck?.warnings || []).map(source => source === 'approved' ? 'approved levels' : 'pending queue');
            const details = warningLabels.length
                ? ['No duplicate found in the collections that could be checked.', `Could not check: ${warningLabels.join(', ')}.`]
                : 'No duplicate found in pending or approved levels';
            setStep('smStep-duplicate', warningLabels.length ? 'warn' : 'ok', details);
        } catch (err) {
            console.error('[Submit] duplicate check failed:', err);
            setStep('smStep-duplicate', 'error', err?.message || 'Could not check for duplicates.');
            smDismiss.classList.remove('hidden');
            return;
        }

        // Step 3: Collect / auto-solve for hints
        setStep('smStep-solve', 'running');
        const validateHintPath = (candidatePath) => {
            const lv = APP.LevelUtils.deepCloneLevel(l);
            lv.reqLen = reqLen; lv.reqInt = reqInt;
            return APP.Solver.validateCandidatePath(lv, candidatePath);
        };
        const normalizedHints = [];
        const seen = new Set();
        const pushUniqueHint = (candidatePath) => {
            const res = validateHintPath(candidatePath);
            if (!res?.ok) return;
            const key = JSON.stringify(res.path);
            if (seen.has(key)) return;
            seen.add(key);
            normalizedHints.push(res.path);
        };
        (Array.isArray(l.hints) ? l.hints : []).forEach(pushUniqueHint);
        (Array.isArray(APP.State.ENGINE.foundHintsSinceLoad) ? APP.State.ENGINE.foundHintsSinceLoad : []).forEach(pushUniqueHint);
        if (APP.State.ENGINE.path.length > 1) pushUniqueHint(APP.State.ENGINE.path);

        if (normalizedHints.length === 0) {
            let _cancelled = false;
            const cancelSolve = () => { _cancelled = true; APP.UI.setModalContent('searchLabel', 'Stopping…', 'text'); };
            const yieldFn    = async () => { await new Promise(r => setTimeout(r, 0)); if (_cancelled) throw new Error('SolverV2:cancelled'); };
            APP.State.ENGINE.activeSolverController = { cancel: cancelSolve, abort: cancelSolve };
            const abortPoll = setInterval(() => { if (APP.State.ENGINE.solverAbortRequested) cancelSolve(); }, 100);
            try {
                APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
                APP.UI.setSolverControlsEnabled(false);
                APP.UI.setModalContent('searchLabel', 'Solving level for submission…', 'text');
                APP.UI.setSolverDetailText('Searching…');
                APP.UI.setSolverTimerText('0.0s');
                APP.UI.setSolverProgress(0);
                await new Promise(r => setTimeout(r, 0));
                const solveLevel = APP.LevelUtils.deepCloneLevel(l);
                solveLevel.reqLen = reqLen; solveLevel.reqInt = reqInt;
                const budgetMs = 30000;
                const t0 = Date.now();
                const timerInterval = setInterval(() => {
                    const elapsed = (Date.now() - t0) / 1000;
                    APP.UI.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                    APP.UI.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
                }, 100);
                let result;
                try {
                    result = await APP.SolverV2.solve(solveLevel, { timeBudgetMs: budgetMs, yieldFn });
                } finally {
                    clearInterval(timerInterval);
                }
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                    pushUniqueHint(result.solution);
                }
            } catch (err) {
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                if (err?.message === 'SolverV2:cancelled') {
                    setStep('smStep-solve', 'warn', 'Solver cancelled');
                    smDismiss.classList.remove('hidden');
                    return;
                }
            } finally {
                clearInterval(abortPoll);
                APP.State.ENGINE.activeSolverController   = null;
                APP.State.ENGINE.solverAbortRequested     = false;
                APP.UI.setSolverControlsEnabled(true);
            }
        }

        const verified = normalizedHints.length > 0;
        setStep('smStep-solve', verified ? 'ok' : 'warn',
            verified
                ? `${normalizedHints.length} solution${normalizedHints.length > 1 ? 's' : ''} confirmed`
                : 'No solution found — will submit for manual review');

        // Step 4: Save to server
        setStep('smStep-save', 'running');
        const hints     = normalizedHints.slice(0, 5);
        const levelData = buildLevelData(hints);
        try {
            APP.UI.setButtonState(triggerBtnId, { enabled: false });
            await APP.Persistence.submitLevel(levelData, { levelFingerprint, skipDuplicateCheck: true });
            setStep('smStep-save', 'ok', 'Queued for review');
            if (afterSuccess) {
                await afterSuccess(sm);
            } else {
                smDismiss.classList.remove('hidden');
                setTimeout(() => smEl.classList.add('hidden'), 4000);
            }
        } catch (err) {
            console.error('[Submit] failed:', err);
            const errMsg = err?.message === 'Not signed in'
                ? 'Not signed in — refresh the page.'
                : (err?.message || 'Unknown error');
            setStep('smStep-save', 'error', errMsg);
            smDismiss.classList.remove('hidden');
        } finally {
            APP.UI.setButtonState(triggerBtnId, { enabled: true });
        }
    };

    // --- Submit button ---

    document.getElementById('reviewSubmitBtn').onclick = () => {
        const afterReviewSubmit = async (sm) => {
            sm.setStep('smStep-save', 'running', 'Refreshing review queue…');
            try {
                const subs = await APP.Persistence.loadSubmissions();
                APP.State.ENGINE.review.submissions = subs;
                const safeIdx = Math.min(APP.State.ENGINE.review.currentIdx, Math.max(0, subs.length - 1));
                if (subs.length > 0) {
                    APP.Engine.loadReviewLevel(safeIdx);
                } else {
                    APP.State.ENGINE.editor.workingLevel = null;
                    APP.State.ENGINE.isDirty = true;
                    APP.UI.updateLevelDisplay(0, false, '0/0');
                }
            } catch (e) {
                console.warn('[ReviewSubmit] Queue refresh failed:', e);
            }
            sm.setStep('smStep-save', 'ok', 'Queued for review');
            sm.dismiss.classList.remove('hidden');
            setTimeout(() => sm.el.classList.add('hidden'), 4000);
        };
        const afterSuccess = APP.State.ENGINE.mode === APP.Core.REVIEW ? afterReviewSubmit : null;
        submitWorkingLevel('reviewSubmitBtn', afterSuccess);
    };

    document.getElementById('submitModalDismissBtn').onclick = () => document.getElementById('submitModal').classList.add('hidden');

    // --- Dev: copy current path ---

    document.getElementById('devCopyBtn').onclick = async () => {
        APP.UI.closeAllModals();
        if (!APP.State.ENGINE.path.length) return;
        const pathStr = JSON.stringify(APP.State.ENGINE.path).replace(/\s/g, '');
        APP.UI.setSolutionOutput(pathStr);
        await APP.UI.copyText(pathStr, { fallbackElId: 'solutionOutput' });
        APP.UI.showMessage('Path Copied', 'text-white font-black');
    };

    // --- Hint button (play mode) ---

    const showSavedHint = () => {
        if (APP.State.ENGINE.level?.hints?.length > 0) {
            APP.State.ENGINE.hinter.pathList = APP.State.ENGINE.level.hints;
            APP.State.ENGINE.hinter.currentPathIdx = APP.State.ENGINE.hinter.source === 'saved'
                ? (APP.State.ENGINE.hinter.currentPathIdx + 1) % APP.State.ENGINE.hinter.pathList.length
                : 0;
            APP.State.ENGINE.hinter.source = 'saved';
            APP.Solver.startHintAnimation();
        } else {
            APP.UI.showMessage('No saved hint.', 'text-white font-black');
        }
    };

    // Play mode hint: plays saved hints only; solver is not triggered here.
    document.getElementById('hintBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
        showSavedHint();
    };

    // --- Review-mode hint (plays saved hints on the working level) ---

    document.getElementById('reviewHintBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
        const wl = APP.State.ENGINE.editor.workingLevel;
        if (!wl?.hints?.length) { APP.UI.showMessage('No saved hint.', 'text-white font-black'); return; }
        APP.State.ENGINE.hinter.pathList = wl.hints;
        APP.State.ENGINE.hinter.currentPathIdx = APP.State.ENGINE.hinter.source === 'saved'
            ? (APP.State.ENGINE.hinter.currentPathIdx + 1) % wl.hints.length
            : 0;
        APP.State.ENGINE.hinter.source = 'saved';
        APP.Solver.startHintAnimation();
    };
}
