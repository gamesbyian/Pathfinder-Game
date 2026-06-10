// Submission controller: shared submit-with-solve flow, hint button (play mode),
// review-mode hint button, dev copy-path button.

export function createSubmissionController({ core, state, ui, engine, levelUtils, editor, persistence, solverV2 }) {

    // --- Shared multi-step submission flow ---

    const submitWorkingLevel = async (triggerBtnId, afterSuccess) => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) {
            ui.showMessage('Solver is running, please wait.', 'text-yellow-400 font-bold');
            return;
        }
        if (!persistence.getCurrentUser()) {
            ui.showMessage('Not signed in. Please wait or refresh.', 'text-red-500 font-bold');
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
        editor.applyMetricsFromUI();
        const l          = state.ENGINE.editor.workingLevel;
        const validation = editor.validateWorkingLevel();
        const reqLen     = parseInt(ui.getValue('editReqLen')) || 0;
        const reqInt     = parseInt(ui.getValue('editReqInt')) || 0;
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
            filters:         Array.from(l.filterMap.entries()).map(([k, axis]) => ({ x: levelUtils.UNPACK(k).x + 1, y: levelUtils.UNPACK(k).y + 1, axis })),
            flippingFilters: Array.from(l.flippingFilterMap.entries()).map(([k, axis]) => ({ x: levelUtils.UNPACK(k).x + 1, y: levelUtils.UNPACK(k).y + 1, axis })),
            portals:         l.portalVisuals.map(pv => ({ x1: levelUtils.UNPACK(pv.k1).x + 1, y1: levelUtils.UNPACK(pv.k1).y + 1, x2: levelUtils.UNPACK(pv.k2).x + 1, y2: levelUtils.UNPACK(pv.k2).y + 1 })),
            geese:           levelUtils.expCoords(l.gooseSet),
            hints,
        });

        // Step 2: Check duplicates
        setStep('smStep-duplicate', 'running');
        let levelFingerprint = null;
        try {
            const duplicateCheck = await persistence.findDuplicateLevel(buildLevelData([]));
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
            const lv = levelUtils.deepCloneLevel(l);
            lv.reqLen = reqLen; lv.reqInt = reqInt;
            return solverV2.validateCandidatePath(lv, candidatePath);
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
        (Array.isArray(state.ENGINE.foundHintsSinceLoad) ? state.ENGINE.foundHintsSinceLoad : []).forEach(pushUniqueHint);
        if (state.ENGINE.nav.path.length > 1) pushUniqueHint(state.ENGINE.nav.path);

        if (normalizedHints.length === 0) {
            let _cancelled = false;
            const cancelSolve = () => { _cancelled = true; ui.setModalContent('searchLabel', 'Stopping…', 'text'); };
            const yieldFn    = async () => { await new Promise(r => setTimeout(r, 0)); if (_cancelled) throw new Error('SolverV2:cancelled'); };
            state.ENGINE.solver.controller = { cancel: cancelSolve, abort: cancelSolve };
            const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelSolve(); }, 100);
            try {
                engine.setOverlayState(core.SOLVER_RUNNING);
                ui.setSolverControlsEnabled(false);
                ui.setModalContent('searchLabel', 'Solving level for submission…', 'text');
                ui.setSolverDetailText('Searching…');
                ui.setSolverTimerText('0.0s');
                ui.setSolverProgress(0);
                await new Promise(r => setTimeout(r, 0));
                const solveLevel = levelUtils.deepCloneLevel(l);
                solveLevel.reqLen = reqLen; solveLevel.reqInt = reqInt;
                const budgetMs = 30000;
                const t0 = Date.now();
                const timerInterval = setInterval(() => {
                    const elapsed = (Date.now() - t0) / 1000;
                    ui.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                    ui.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
                }, 100);
                let result;
                try {
                    result = await solverV2.solve(solveLevel, { timeBudgetMs: budgetMs, yieldFn });
                } finally {
                    clearInterval(timerInterval);
                }
                engine.setOverlayState(core.OVERLAY_NONE);
                if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                    pushUniqueHint(result.solution);
                }
            } catch (err) {
                engine.setOverlayState(core.OVERLAY_NONE);
                if (err?.message === 'SolverV2:cancelled') {
                    setStep('smStep-solve', 'warn', 'Solver cancelled');
                    smDismiss.classList.remove('hidden');
                    return;
                }
            } finally {
                clearInterval(abortPoll);
                state.ENGINE.solver.controller = null;
                state.ENGINE.solver.abortRequested   = false;
                ui.setSolverControlsEnabled(true);
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
            ui.setButtonState(triggerBtnId, { enabled: false });
            await persistence.submitLevel(levelData, { levelFingerprint, skipDuplicateCheck: true });
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
            ui.setButtonState(triggerBtnId, { enabled: true });
        }
    };

    // --- Submit button ---

    document.getElementById('reviewSubmitBtn').onclick = () => {
        const afterReviewSubmit = async (sm) => {
            sm.setStep('smStep-save', 'running', 'Refreshing review queue…');
            try {
                const subs = await persistence.loadSubmissions();
                state.ENGINE.review.submissions = subs;
                const safeIdx = Math.min(state.ENGINE.review.currentIdx, Math.max(0, subs.length - 1));
                if (subs.length > 0) {
                    engine.loadReviewLevel(safeIdx);
                } else {
                    state.ENGINE.editor.workingLevel = null;
                    state.ENGINE.isDirty = true;
                    ui.updateLevelDisplay(0, false, '0/0');
                }
            } catch (e) {
                console.warn('[ReviewSubmit] Queue refresh failed:', e);
            }
            sm.setStep('smStep-save', 'ok', 'Queued for review');
            sm.dismiss.classList.remove('hidden');
            setTimeout(() => sm.el.classList.add('hidden'), 4000);
        };
        const afterSuccess = state.ENGINE.mode === core.REVIEW ? afterReviewSubmit : null;
        submitWorkingLevel('reviewSubmitBtn', afterSuccess);
    };

    document.getElementById('submitModalDismissBtn').onclick = () => document.getElementById('submitModal').classList.add('hidden');

    // --- Dev: copy current path ---

    document.getElementById('devCopyBtn').onclick = async () => {
        ui.closeAllModals();
        if (!state.ENGINE.nav.path.length) return;
        const pathStr = JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, '');
        ui.setSolutionOutput(pathStr);
        await ui.copyText(pathStr, { fallbackElId: 'solutionOutput' });
        ui.showMessage('Path Copied', 'text-white font-black');
    };

    // --- Hint button (play mode) ---

    const showSavedHint = () => {
        if (state.ENGINE.level?.hints?.length > 0) {
            state.ENGINE.hinter.pathList = state.ENGINE.level.hints;
            state.ENGINE.hinter.currentPathIdx = state.ENGINE.hinter.source === 'saved'
                ? (state.ENGINE.hinter.currentPathIdx + 1) % state.ENGINE.hinter.pathList.length
                : 0;
            state.ENGINE.hinter.source = 'saved';
            engine.startHintAnimation();
        } else {
            ui.showMessage('No saved hint.', 'text-white font-black');
        }
    };

    // Play mode hint: plays saved hints only; solver is not triggered here.
    document.getElementById('hintBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        showSavedHint();
    };

    // --- Review-mode hint (plays saved hints on the working level) ---

    document.getElementById('reviewHintBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        const wl = state.ENGINE.editor.workingLevel;
        if (!wl?.hints?.length) { ui.showMessage('No saved hint.', 'text-white font-black'); return; }
        state.ENGINE.hinter.pathList = wl.hints;
        state.ENGINE.hinter.currentPathIdx = state.ENGINE.hinter.source === 'saved'
            ? (state.ENGINE.hinter.currentPathIdx + 1) % wl.hints.length
            : 0;
        state.ENGINE.hinter.source = 'saved';
        engine.startHintAnimation();
    };
}
