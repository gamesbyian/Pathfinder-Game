import { getRealLength as getRealLengthImpl,
         areWinMetricsSatisfied as areWinMetricsSatisfiedImpl,
         checkWinConditionImpl as checkWinConditionImplFn } from './runtime/game-rules.js';
import { VALID_LOGIC_TRANSITIONS } from './runtime/state-machine.js';
import { cloneTapRouteState, rebuildDerivedState, pushStep as pushStepImpl,
         simulateTapRouteStep,
         wouldCreateBlockedTIntersection as wouldCreateBlockedTIntersectionImpl } from './runtime/path-state.js';
import { computeStep } from './runtime/step-processor.js';
import { MoveContext }       from './domain/move-context.js';
import { createRenderModel } from './render/create-render-model.js';

export function createEngine({ core, state, ui, renderer, levelUtils, themes, data, persistence, editor }) {

    // Wrapper: resolves level from state; pure logic is in runtime/game-rules.js.
    // Accepts either full engineState (with .nav sub-object) or a flat state (for tests).
    function areWinMetricsSatisfied(engineState = state.ENGINE, level) {
        const lvl = level !== undefined ? level
            : (engineState.mode === core.PLAY ? engineState.level : engineState.editor?.workingLevel);
        return areWinMetricsSatisfiedImpl(engineState.nav ?? engineState, lvl);
    }

    // --- Step helpers (closures over engine state/functions) ---

    // Pushes a step onto nav without going through PathNavigator (no isDirty, no assertConsistency).
    // Used by computeStep and by PathNavigator.pushStep.
    const pushStepOnNav = (nav, key, isJump, level) => {
        const oldFlipCount = nav.flipCount;
        pushStepImpl(nav, key, isJump, level);
        if (nav.flipCount !== oldFlipCount) nav.lastFlipTime = Date.now();
    };

    // Truncates nav.path to `targetLen` cells and rebuilds derived state.
    // Handles logic-state reset and derived-state rebuild; does NOT set isDirty
    // (the caller is responsible for that).
    const truncateNavTo = (nav, targetLen) => {
        if (targetLen < -1 || targetLen >= nav.path.length - 1) return;
        nav.path.splice(targetLen + 1);
        const newJumps = new Set();
        for (const j of nav.isPortalJump) if (j <= targetLen) newJumps.add(j);
        nav.isPortalJump = newJumps;
        if (nav.path.length === 0) nav.activeGateKey = null;
        if ([core.DRAGGING, core.PORTAL_PAUSE, core.HAZARD_TRIGGERED].includes(state.ENGINE.logicState)) {
            setLogicState(core.IDLE);
        }
        rebuildDerivedPathState(state.ENGINE);
    };

    function dispatchStepEvent(event) {
        switch (event.type) {
            case 'sound':          core.SOUND_BUS.play(event.note, event.duration); break;
            case 'logic_state':    setLogicState(event.value); break;
            case 'goose_jumpscare': triggerJumpScare(); break;
            case 'bomb_detonation': triggerBombDetonation(event.key); break;
            case 'win':            handleWin(); break;
        }
    }

    function handleWin() {
        setLogicState(core.RESOLVED);
        ui.renderWinExportPanel({ solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''), showExportArea: state.ENGINE.isDevMode });
        if (state.ENGINE.mode === core.PLAY) persistence.markLevelComplete(state.ENGINE.levelIdx);
        ui.openModal('winModal');
        core.SOUND_BUS.play("C5", "8n");
    }

    // Stable helpers for computeStep — allocated once at factory time, not per call.
    // Only portalThemeColor is refreshed per step (theme may change between levels).
    const stepHelpers = {
        isValidMove:                    (k, s, l, ctx) => levelUtils.isValidMove(k, s, l, ctx),
        wouldCreateBlockedTIntersection: wouldCreateBlockedTIntersectionImpl,
        resolvePortal:                  (l, k) => levelUtils.resolvePortal(l, k),
        areWinMetricsSatisfied:         areWinMetricsSatisfiedImpl,
        getPortalDisplayColor:          (l, k, c) => levelUtils.getPortalDisplayColor(l, k, c),
        UNPACK:                         levelUtils.UNPACK,
        pushStepOnNav,
        truncateNavTo,
        createNavSnapshot:              createSnapshot,
        checkWinCondition:              (nav, level, mode, logicState) =>
            checkWinConditionImplFn(nav.path, level, mode, logicState, nav.isPortalJump, nav.visitedCounts, nav.intersections),
        MoveContext,
        HAZARD_TRIGGERED:               core.HAZARD_TRIGGERED,
        PORTAL_PAUSE:                   core.PORTAL_PAUSE,
        EDITOR:                         core.EDITOR,
        REVIEW:                         core.REVIEW,
        portalThemeColor:               '#d946ef',
    };

    function processStep(key) {
        const activeLevel = state.ENGINE.mode === core.PLAY ? state.ENGINE.level : state.ENGINE.editor.workingLevel;
        stepHelpers.portalThemeColor = themes.THEMES[themes.getCurrentTheme()]?.colors?.portal || '#d946ef';
        const { outcome, events, mutations } = computeStep(
            state.ENGINE.nav,
            state.ENGINE.hazards,
            state.ENGINE.mode,
            state.ENGINE.logicState,
            activeLevel,
            key,
            stepHelpers
        );
        if (outcome !== null) {
            state.ENGINE.isDirty = true;
            if (state.ENGINE.mode === core.EDITOR) state.ENGINE.editor.isModified = true;
        }
        const now = Date.now();
        for (const { x, y, color } of mutations.ripples) {
            state.ENGINE.ripples.push({ x, y, startTime: now, color });
        }
        for (const event of events) dispatchStepEvent(event);
        return outcome === 'backtrack' ? 'valid' : outcome;
    }

    const buildStraightPathSteps = (headPos, target) => {
        const dx = target.x - headPos.x;
        const dy = target.y - headPos.y;
        if (dx !== 0 && dy !== 0) return [];
        const pathSteps = [];
        if (dx !== 0) {
            for (let i = 1; i <= Math.abs(dx); i++) pathSteps.push(levelUtils.PACK(headPos.x + Math.sign(dx) * i, headPos.y));
        } else if (dy !== 0) {
            for (let i = 1; i <= Math.abs(dy); i++) pathSteps.push(levelUtils.PACK(headPos.x, headPos.y + Math.sign(dy) * i));
        }
        return pathSteps;
    };

    function findTapRoute(target, options = {}) {
        const level = state.ENGINE.mode === core.PLAY ? state.ENGINE.level : state.ENGINE.editor.workingLevel;
        if (!level || !state.ENGINE.nav.path.length) return null;
        const targetKey = levelUtils.PACK(target.x, target.y);
        const startState = cloneTapRouteState(state.ENGINE);
        const startKey = startState.path[startState.path.length - 1];
        if (targetKey === startKey) return [];
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const maxExpansions = options.maxExpansions || Math.max(200, level.grid.w * level.grid.h * 40);
        const queue = [{ state: startState, inputs: [] }];
        const seen = new Set([`${startKey}|${startState.path.join('.')}`]);
        let expansions = 0;
        while (queue.length > 0 && expansions < maxExpansions) {
            const cur = queue.shift();
            expansions++;
            const headKey = cur.state.path[cur.state.path.length - 1];
            const head = levelUtils.UNPACK(headKey);
            for (const [dx, dy] of dirs) {
                const nk = levelUtils.PACK(head.x + dx, head.y + dy);
                const sim = simulateTapRouteStep(cur.state, nk, level);
                if (!sim || sim.result === "goose" || sim.result === "detonate") continue;
                const newInputs = [...cur.inputs, nk];
                if (nk === targetKey) return newInputs;
                const nextKey = sim.state.path[sim.state.path.length - 1];
                if (nextKey === targetKey) return newInputs;
                const sig = `${nextKey}|${sim.state.path.join('.')}`;
                if (seen.has(sig)) continue;
                seen.add(sig);
                queue.push({ state: sim.state, inputs: newInputs });
            }
        }
        return null;
    }

    function attemptMoveTo(target, opts = {}) {
        if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW) && !state.ENGINE.editor.isPencilMode) return;
        if (!state.ENGINE.nav.path.length) return;
        const headPos = levelUtils.UNPACK(state.ENGINE.nav.path[state.ENGINE.nav.path.length - 1]);
        if (state.ENGINE.logicState === core.PORTAL_PAUSE) {
            if (target.x !== headPos.x || target.y !== headPos.y) setLogicState(core.DRAGGING);
            else return;
        }
        if (target.x === headPos.x && target.y === headPos.y) return;
        const pathSteps = buildStraightPathSteps(headPos, target);
        for (const step of pathSteps) {
            const result = processStep(step);
            if (result === null || result === "goose" || result === "detonate") break;
        }
        if (pathSteps.length > 0) state.ENGINE.isDirty = true;
    }

    function checkWinCondition() {
        if (checkWinConditionImplFn(
                state.ENGINE.nav.path, state.ENGINE.level, state.ENGINE.mode, state.ENGINE.logicState,
                state.ENGINE.nav.isPortalJump, state.ENGINE.nav.visitedCounts, state.ENGINE.nav.intersections)) {
            handleWin();
        }
    }

    function triggerJumpScare() {
        ui.showGooseJumpScare();
        setOverlayState(core.GOOSE_OVERLAY);
        setTimeout(() => {
            if (state.ENGINE.overlayState === core.GOOSE_OVERLAY) {
                ui.hideGooseJumpScare();
                setOverlayState(core.OVERLAY_NONE);
            }
        }, 2500);
    }

    let bombTimer1 = null;
    let bombTimer2 = null;

    function triggerBombDetonation(key) {
        state.ENGINE.hazards.armedFalseGoals.delete(key);
        state.ENGINE.hazards.detonatedFalseGoals.add(key);
        setOverlayState(core.FALSE_GOAL_ANIMATING);
        ui.showBombDetonation();
        core.SOUND_BUS.play("C2", "8n");
        bombTimer1 = setTimeout(() => {
            bombTimer1 = null;
            ui.showBombDetonation({ explodedMarkup: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-bomb-blast-ring)" stroke-width="10" stroke-dasharray="10 5" class="animate-ping"/><path d="M 50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20" stroke="var(--theme-bomb-blast-rays)" stroke-width="8"/></svg>` });
            core.SOUND_BUS.play("F1", "4n");
            bombTimer2 = setTimeout(() => {
                bombTimer2 = null;
                ui.hideBombDetonation({ resetMarkup: `<svg viewBox="0 0 100 100"><use href="#def-falsegoal"/></svg>` });
                setOverlayState(core.OVERLAY_NONE);
            }, 1000);
        }, 1000);
    }

    function createSnapshot() {
        return {
            path:               [...state.ENGINE.nav.path],
            isPortalJump:       new Set(state.ENGINE.nav.isPortalJump),
            activeGateKey:      state.ENGINE.nav.activeGateKey,
            logicState:         state.ENGINE.logicState,
            detonatedFalseGoals: new Set(state.ENGINE.hazards.detonatedFalseGoals)
        };
    }

    function applySnapshot(snap) {
        state.ENGINE.nav.path         = [...snap.path];
        state.ENGINE.nav.isPortalJump = new Set(snap.isPortalJump);
        state.ENGINE.nav.activeGateKey = snap.activeGateKey;
        const restoredLogicState = snap.logicState === core.HAZARD_TRIGGERED ? core.IDLE : snap.logicState;
        setLogicState(core.IDLE);
        if (restoredLogicState !== core.IDLE) setLogicState(restoredLogicState);
        state.ENGINE.hazards.detonatedFalseGoals = new Set(snap.detonatedFalseGoals);
        const l = state.ENGINE.mode === core.PLAY ? state.ENGINE.level : state.ENGINE.editor.workingLevel;
        const armed = new Set(l?.falseGoalKeys || []);
        state.ENGINE.hazards.detonatedFalseGoals.forEach(k => armed.delete(k));
        state.ENGINE.hazards.armedFalseGoals = armed;
        rebuildDerivedPathState(state.ENGINE);
        state.ENGINE.isDirty = true;
        ui.showMessage("", "");
    }

    function updatePlayModeLayout() {
        if (state.ENGINE.mode !== core.PLAY) return;
        ui.setClassState('exportArea',              'hidden', !state.ENGINE.isDevMode);
        ui.setClassState('devCopyBtn',              'hidden', !state.ENGINE.isDevMode);
        ui.setClassState('devGenBtn',               'hidden', !state.ENGINE.isDevMode);
        ui.setClassState('levelMetadataPanel',      'hidden', true);
        ui.setClassState('reviewPublishedLevelsBtn','hidden', true);
    }

    function switchMode(newMode) {
        const isEd         = newMode === core.EDITOR;
        const isReview     = newMode === core.REVIEW;
        const isEdOrReview = isEd || isReview;
        state.ENGINE.mode = newMode;
        if (newMode !== core.PLAY) ui.closeModal('playOptionsBlockedModal');
        ui.setSolutionOutput('');
        setLogicState(core.IDLE);
        setOverlayState(core.OVERLAY_NONE);
        PathNavigator.clear(state.ENGINE);
        state.ENGINE.nav.undoStack = [];
        state.ENGINE.hazards.revealedGeese.clear();

        state.ENGINE.hazards.detonatedFalseGoals.clear();
        document.getElementById('editorPalette').classList.toggle('hidden', !isEdOrReview);
        document.getElementById('levelMetadataPanel').classList.toggle('hidden', !isEdOrReview);
        document.getElementById('reviewPublishedLevelsBtn').classList.toggle('hidden', !isReview);
        document.getElementById('playMetrics').classList.toggle('hidden', isEdOrReview);
        document.getElementById('editorMetrics').classList.toggle('hidden', !isEdOrReview);
        document.getElementById('gameButtonGrid').classList.toggle('hidden', isEdOrReview);
        document.getElementById('editorButtonGrid').classList.toggle('hidden', !isEdOrReview);
        const shellToggle = document.getElementById('modeToggleShellBtn');
        if (shellToggle) shellToggle.textContent = isReview ? 'Exit Review' : (isEd ? 'Play Game' : 'Editor');
        const exportArea = document.getElementById('exportArea');
        document.getElementById('editResetGrid').classList.toggle('hidden', isReview);
        document.getElementById('editMegaSolver').classList.toggle('hidden', false);
        document.getElementById('editTrapSpotsBtn').classList.toggle('hidden', isReview);
        document.getElementById('editHelpBtn').classList.toggle('hidden', isReview);
        document.getElementById('reviewHintBtn').classList.toggle('hidden', !isReview);
        document.getElementById('reviewSubmitBtn').classList.toggle('hidden', !isEdOrReview);
        document.getElementById('reviewApproveBtn').classList.toggle('hidden', !isReview);
        document.getElementById('reviewRejectBtn').classList.toggle('hidden', !isReview);
        ui.setButtonState('reviewSubmitBtn', { enabled: true });
        document.getElementById('devCopyBtn').classList.toggle('hidden', isEdOrReview || !state.ENGINE.isDevMode);
        document.getElementById('devGenBtn').classList.toggle('hidden', isEdOrReview || !state.ENGINE.isDevMode);
        exportArea.classList.add('hidden');
        if (isEd) {
            state.ENGINE.variant = 0;
            state.ENGINE.editor.workingLevel = levelUtils.deepCloneLevel(state.ENGINE.level);
            state.ENGINE.editor.isPencilMode = false;
            state.ENGINE.editor.undoStack = [];
            state.ENGINE.editor.validTrapSpots.clear();
            state.ENGINE.editor.emptyClickCount = 0;
            ui.setInputValue('editReqLen', state.ENGINE.editor.workingLevel.reqLen || 0);
            ui.setInputValue('editReqInt', state.ENGINE.editor.workingLevel.reqInt || 0);
            editor.syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            state.ENGINE.editor.isModified = false;
            updatePencilState();
        } else if (isReview) {
            state.ENGINE.review.savedPlayLevelIdx = state.ENGINE.levelIdx;
            state.ENGINE.editor.isPencilMode = false;
            state.ENGINE.editor.emptyClickCount = 0;
            resetEmptyReviewState();
            updatePencilState();
        } else {
            updatePlayModeLayout();
            loadLevel(state.ENGINE.levelIdx, true);
        }
        ui.updateAppScale();
        ui.updateViewport();
        ui.syncEditorPalettePlacement();
        updateCompletionUI();
        ui.showMessage("", "");
        state.ENGINE.isDirty = true;
    }

    function updatePencilState() {
        const btn = document.getElementById('editPencilBtn');
        if (!btn) return;
        const svg = btn.querySelector('svg');
        if (!svg) return;

        const inactivePencilIcon = '<g><g><g><path d="M459.113,31.24c-41.654-41.654-109.199-41.654-150.853,0L21.647,317.854c-3.425,3.425-5.583,7.915-6.118,12.729L0.447,466.348c-1.509,13.587,9.971,25.068,23.558,23.558l135.765-15.083c4.815-0.535,9.304-2.693,12.729-6.118L399.827,241.38c0.007-0.007,0.016-0.013,0.023-0.021l59.264-59.264c20.827-20.827,31.241-48.127,31.24-75.427C490.354,79.368,479.941,52.068,459.113,31.24z M428.943,151.923l-44.18,44.18l-90.512-90.512l44.179-44.179c24.991-24.992,65.521-24.992,90.513,0c12.495,12.495,18.743,28.875,18.744,45.255C447.687,123.048,441.439,139.428,428.943,151.923z M147.622,433.245L45.797,444.557l11.312-101.825L264.081,135.76l90.513,90.513L147.622,433.245z"/><path d="M232.839,448h-21.333c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h21.333c11.782,0,21.333-9.551,21.333-21.333C254.172,457.551,244.621,448,232.839,448z"/><path d="M467.506,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C488.839,457.551,479.288,448,467.506,448z"/><path d="M360.839,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C382.172,457.551,372.621,448,360.839,448z"/></g></g></g>';
        const activePencilIcon = '<g><g><g><path d="M254.172,447.945h-21.333c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h21.333c11.797,0,21.333-9.557,21.333-21.333S265.97,447.945,254.172,447.945z"/><path d="M467.506,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S479.303,447.945,467.506,447.945z"/><path d="M360.839,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S372.636,447.945,360.839,447.945z"/><path d="M459.109,182.04c41.579-41.6,41.579-109.269,0-150.848c-41.6-41.6-109.291-41.579-150.848,0l-44.181,44.181l150.848,150.848L459.109,182.04z"/><path d="M21.652,317.799c-3.435,3.435-5.589,7.915-6.123,12.736L0.446,466.3c-0.704,6.443,1.536,12.843,6.123,17.429c4.011,4.032,9.451,6.251,15.083,6.251c0.789,0,1.557-0.043,2.347-0.128l135.787-15.083c4.8-0.533,9.301-2.688,12.715-6.123L384.766,256.38L233.918,105.532L21.652,317.799z"/></g></g></g>';

        btn.classList.toggle('selected', state.ENGINE.editor.isPencilMode);
        svg.setAttribute('viewBox', state.ENGINE.editor.isPencilMode ? '0 0 490.612 490.612' : '0 0 490.667 490.667');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('stroke', 'none');
        svg.innerHTML = state.ENGINE.editor.isPencilMode ? activePencilIcon : inactivePencilIcon;
    }

    function resetEmptyReviewState() {
        state.ENGINE.review.currentIdx = 0;
        state.ENGINE.editor.workingLevel = null;
        state.ENGINE.editor.undoStack = [];
        state.ENGINE.editor.isModified = false;
        state.ENGINE.editor.validTrapSpots.clear();
        PathNavigator.clear(state.ENGINE);
        state.ENGINE.nav.undoStack = [];
        state.ENGINE.hazards.revealedGeese.clear();

        state.ENGINE.hazards.detonatedFalseGoals.clear();
        ui.setInputValue('editReqLen', 0);
        ui.setInputValue('editReqInt', 0);
        ui.renderMetricsPanel({ currentLen: 0, reqLen: 0, currentInt: 0, reqInt: 0 });
        ui.updateLevelDisplay(0, false, '0/0');
        ui.updateAppScale();
        ui.updateViewport();
        state.ENGINE.isDirty = true;
    }

    function loadReviewLevel(idx) {
        const subs = state.ENGINE.review.submissions;
        if (!subs || !subs.length) {
            resetEmptyReviewState();
            return;
        }
        const safeIdx = Math.max(0, Math.min(idx, subs.length - 1));
        state.ENGINE.review.currentIdx = safeIdx;
        const rawLevel   = subs[safeIdx].levelData;
        const normalized = levelUtils.processRawLevel(rawLevel, safeIdx);
        if (!normalized) {
            ui.showMessage('Could not load submission.', 'text-red-500 font-bold');
            return;
        }
        state.ENGINE.editor.workingLevel = normalized;
        state.ENGINE.editor.undoStack    = [];
        state.ENGINE.editor.isModified   = false;
        PathNavigator.clear(state.ENGINE);
        state.ENGINE.nav.undoStack = [];
        state.ENGINE.hazards.revealedGeese.clear();

        state.ENGINE.hazards.detonatedFalseGoals.clear();
        ui.setInputValue('editReqLen', normalized.reqLen || 0);
        ui.setInputValue('editReqInt', normalized.reqInt || 0);
        editor.syncMetadataFieldsFromLevel(normalized);
        ui.updateLevelDisplay(safeIdx, false, `${safeIdx + 1}/${subs.length}`);
        ui.updateAppScale();
        ui.updateViewport();
        state.ENGINE.isDirty = true;
    }

    function applyPlayChallengeOptions(level) {
        if (!level || state.ENGINE.mode !== core.PLAY) return { playable: true };
        const opts = state.ENGINE.options || {};
        if (opts.geese === false) level.gooseSet = new Set();
        if (opts.falseGoals === false) level.falseGoalKeys = new Set();
        if (opts.deadGates === false) {
            const dead = levelUtils.getParityInvalidKeys(level);
            if (dead.gates.size > 0) {
                const kept = level.gateKeys.filter(k => !dead.gates.has(k));
                if (kept.length === 0) return { playable: false, reason: 'dead-gates' };
                level.gateKeys = kept;
            }
        }
        return { playable: true };
    }

    function showOptionsBlockedModalIfNeeded(result) {
        const modal = document.getElementById('playOptionsBlockedModal');
        if (!modal) return;
        modal.classList.toggle('hidden', result?.playable !== false);
    }

    function loadLevel(idx, keepVariant = false) {
        clearTimeout(bombTimer1); clearTimeout(bombTimer2); bombTimer1 = null; bombTimer2 = null;
        if (state.ENGINE.solver.controller) return;

        const levels = data.getLevels();
        if (!levels || !data.getLevel(idx)) return;

        state.ENGINE.levelIdx = idx;

        const isEditor = state.ENGINE.mode === core.EDITOR;
        if (isEditor) state.ENGINE.variant = 0;
        else if (!keepVariant) state.ENGINE.variant = Math.floor(Math.random() * 8);

        setLogicState(core.IDLE);
        setOverlayState(core.OVERLAY_NONE);

        state.ENGINE.level = levelUtils.normalizeLevel(idx);
        const optionsResult = applyPlayChallengeOptions(state.ENGINE.level);
        showOptionsBlockedModalIfNeeded(optionsResult);
        if (optionsResult.playable !== false) levelUtils.assertLevelShape(state.ENGINE.level);
        PathNavigator.clear(state.ENGINE);
        state.ENGINE.nav.undoStack = [];
        state.ENGINE.hazards.revealedGeese.clear();
        state.ENGINE.ripples = [];

        state.ENGINE.hazards.armedFalseGoals       = new Set(state.ENGINE.level.falseGoalKeys || []);
        state.ENGINE.hazards.detonatedFalseGoals   = new Set();
        state.ENGINE.foundHintsSinceLoad   = [];
        state.ENGINE.hinter.pathList       = [];
        state.ENGINE.hinter.currentPathIdx = 0;
        state.ENGINE.hinter.source         = 'none';
        state.ENGINE.hinter.index          = 0;
        state.ENGINE.hinter.alpha          = 0;
        state.ENGINE.hinter.holdStartMs    = 0;
        state.ENGINE.hinter.blinkStartMs   = 0;
        state.ENGINE.hinter.fadeStartMs    = 0;

        if (isEditor) {
            state.ENGINE.editor.workingLevel = levelUtils.deepCloneLevel(state.ENGINE.level);
            state.ENGINE.editor.isPencilMode = false;
            state.ENGINE.editor.undoStack    = [];
            state.ENGINE.editor.validTrapSpots.clear();
            state.ENGINE.editor.emptyClickCount = 0;
            ui.setInputValue('editReqLen', state.ENGINE.editor.workingLevel.reqLen || 0);
            ui.setInputValue('editReqInt', state.ENGINE.editor.workingLevel.reqInt || 0);
            editor.syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            state.ENGINE.editor.isModified = false;
            updatePencilState();
        }

        ui.updateLevelDisplay(idx, false);
        ui.closeModal('winModal');
        ui.showMessage("", "");
        ui.setSolutionOutput('');
        ui.updateAppScale();
        ui.updateViewport();
        updateCompletionUI();
        persistence.persistSessionState();
        state.ENGINE.isDirty = true;
    }

    function loop() {
        if (state.ENGINE.overlayState === core.HINT_ANIMATING && state.ENGINE.hinter.pathList.length) {
            const hPath             = state.ENGINE.hinter.pathList[state.ENGINE.hinter.currentPathIdx];
            const hintNowMs         = Date.now();
            const hintHoldDurationMs = 2700;
            const hintBlinkCount    = 3;
            const hintBlinkCycleMs  = 800;
            const hintFadeDurationMs = 900;

            state.ENGINE.hinter.index += 0.285;

            if (state.ENGINE.hinter.index >= hPath.length) {
                state.ENGINE.hinter.index = hPath.length;
                if (!state.ENGINE.hinter.holdStartMs) state.ENGINE.hinter.holdStartMs = hintNowMs;
            }

            const holdElapsedMs = state.ENGINE.hinter.holdStartMs ? (hintNowMs - state.ENGINE.hinter.holdStartMs) : 0;
            const holdComplete  = state.ENGINE.hinter.holdStartMs && holdElapsedMs >= hintHoldDurationMs;

            if (holdComplete && !state.ENGINE.hinter.blinkStartMs) state.ENGINE.hinter.blinkStartMs = hintNowMs;

            if (state.ENGINE.hinter.blinkStartMs && !state.ENGINE.hinter.fadeStartMs) {
                const blinkElapsedMs = hintNowMs - state.ENGINE.hinter.blinkStartMs;
                const blinkWindowMs  = hintBlinkCount * hintBlinkCycleMs;
                if (blinkElapsedMs < blinkWindowMs) {
                    const blinkPhase = (blinkElapsedMs % hintBlinkCycleMs) / hintBlinkCycleMs;
                    state.ENGINE.hinter.alpha = 0.25 + (0.75 * (0.5 + 0.5 * Math.cos(blinkPhase * Math.PI * 2)));
                } else {
                    state.ENGINE.hinter.fadeStartMs = hintNowMs;
                    state.ENGINE.hinter.alpha = 1;
                }
            }

            if (state.ENGINE.hinter.fadeStartMs) {
                const fadeElapsedMs = hintNowMs - state.ENGINE.hinter.fadeStartMs;
                state.ENGINE.hinter.alpha = Math.max(0, 1 - (fadeElapsedMs / hintFadeDurationMs));
                if (state.ENGINE.hinter.alpha <= 0) {
                    setOverlayState(core.OVERLAY_NONE);
                    ui.showMessage("", "");
                }
            }
        }
        if (state.ENGINE.nav.visualFlipCount < state.ENGINE.nav.flipCount) {
            state.ENGINE.nav.visualFlipCount = Math.min(state.ENGINE.nav.flipCount, state.ENGINE.nav.visualFlipCount + 0.15);
            state.ENGINE.isDirty = true;
        } else if (state.ENGINE.nav.visualFlipCount > state.ENGINE.nav.flipCount) {
            state.ENGINE.nav.visualFlipCount = Math.max(state.ENGINE.nav.flipCount, state.ENGINE.nav.visualFlipCount - 0.15);
            state.ENGINE.isDirty = true;
        }
        const _now = Date.now();
        state.ENGINE.ripples = state.ENGINE.ripples.filter(r => _now - r.startTime < 600);
        const hasContinuousAnimation = state.ENGINE.ripples.length > 0 || state.ENGINE.overlayState === core.HINT_ANIMATING;
        if (hasContinuousAnimation) state.ENGINE.isDirty = true;
        const shouldRender = state.ENGINE.isDirty || hasContinuousAnimation;
        if (shouldRender) {
            state.ENGINE.isDirty = false;
            const reqLenPreview = (state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                ? parseInt(ui.getValue('editReqLen'))
                : null;
            renderer.render(createRenderModel({ eng: state.ENGINE, core, themes }, reqLenPreview));
        }
        requestAnimationFrame(loop);
    }

    // Wrapper: accepts either full engineState (has .nav) or flat state (for tests).
    function getRealLength(engineState = state.ENGINE) { return getRealLengthImpl(engineState.nav ?? engineState); }

    // Wrapper: determines level, delegates to runtime/path-state.js, then tracks lastFlipTime.
    function rebuildDerivedPathState(engineState = state.ENGINE) {
        const nav = engineState.nav ?? engineState;
        const oldFlipCount = nav.flipCount;
        const level = engineState.mode === core.PLAY ? engineState.level : engineState.editor?.workingLevel;
        rebuildDerivedState(nav, level);
        if (nav.flipCount !== oldFlipCount) nav.lastFlipTime = Date.now();
    }

    function assertStateConsistency(engineState = state.ENGINE) {
        if (!engineState.isDevMode) return;
        const l = engineState.mode === core.PLAY ? engineState.level : engineState.editor.workingLevel;
        if (!l) return;
        const nav = engineState.nav ?? engineState;
        const originalIntersections = nav.intersections;
        const originalCounts        = new Map(nav.visitedCounts);
        rebuildDerivedPathState(engineState);
        if (originalIntersections !== nav.intersections) {
            console.error("Invariant broken: Intersections mismatch.");
        }
        originalCounts.forEach((v, k) => {
            if (nav.visitedCounts.get(k) !== v) console.error("Invariant broken: Visited count mismatch.");
        });
    }

    const PathNavigator = {
        pushStep(engineState, key, isJump) {
            const l = engineState.mode === core.PLAY ? engineState.level : engineState.editor.workingLevel;
            const nav = engineState.nav;
            const oldFlipCount = nav.flipCount;
            pushStepImpl(nav, key, isJump, l);
            engineState.isDirty = true;
            if (nav.flipCount !== oldFlipCount) nav.lastFlipTime = Date.now();
            assertStateConsistency(engineState);
        },
        truncateTo(engineState, targetIdx) {
            const nav = engineState.nav;
            if (targetIdx < -1 || targetIdx >= nav.path.length - 1) return;
            nav.path.splice(targetIdx + 1);
            const newJumps = new Set();
            for (const j of nav.isPortalJump) if (j <= targetIdx) newJumps.add(j);
            nav.isPortalJump = newJumps;
            if (nav.path.length === 0) { nav.activeGateKey = null; }
            if ([core.DRAGGING, core.PORTAL_PAUSE, core.HAZARD_TRIGGERED].includes(engineState.logicState)) {
                setLogicState(core.IDLE);
            }
            if (engineState.mode === core.EDITOR) engineState.editor.isModified = true;
            engineState.isDirty = true;
            rebuildDerivedPathState(engineState);
            assertStateConsistency(engineState);
        },
        clear(engineState) {
            const nav = engineState.nav;
            nav.path = [];
            nav.isPortalJump.clear();
            nav.activeGateKey = null;
            if ([core.DRAGGING, core.PORTAL_PAUSE, core.HAZARD_TRIGGERED].includes(engineState.logicState)) {
                setLogicState(core.IDLE);
            }
            if (engineState.mode === core.EDITOR) engineState.editor.isModified = true;
            engineState.isDirty = true;
            rebuildDerivedPathState(engineState);
            assertStateConsistency(engineState);
        }
    };

    function setLogicState(newState) {
        if (newState !== core.IDLE && !VALID_LOGIC_TRANSITIONS[state.ENGINE.logicState]?.includes(newState)) {
            console.warn(`Blocked Logic Transition: ${state.ENGINE.logicState} -> ${newState}`);
            return false;
        }
        if (state.ENGINE.logicState === core.EDIT_DRAG && newState !== core.EDIT_DRAG) {
            ui.EditorDragGhost.update({ visible: false });
        }
        state.ENGINE.logicState = newState;
        return true;
    }

    function updateCompletionUI() {
        const eng        = state.ENGINE;
        const isComplete = eng.progressSet.has(eng.levelIdx);
        const isPlayMode = eng.mode === core.PLAY;
        const isReview   = eng.mode === core.REVIEW;
        let reviewDisplay = null;
        if (isReview) {
            const subs = eng.review.submissions;
            const idx  = eng.review.currentIdx;
            reviewDisplay = subs.length > 0 ? `${idx + 1}/${subs.length}` : '0/0';
        }
        ui.updateLevelDisplay(eng.levelIdx, isComplete && isPlayMode, reviewDisplay);
    }

    // setOverlayState updates state and applies the visual via ui.
    function setOverlayState(newState) {
        if (state.ENGINE.overlayState === newState) return true;
        if (state.ENGINE.overlayState === core.HINT_ANIMATING && newState !== core.HINT_ANIMATING) {
            state.ENGINE.hinter.alpha        = 0;
            state.ENGINE.hinter.holdStartMs  = 0;
            state.ENGINE.hinter.blinkStartMs = 0;
            state.ENGINE.hinter.fadeStartMs  = 0;
        }
        state.ENGINE.overlayState = newState;
        state.ENGINE.isDirty = true;
        ui.setSolverAbortRequested(state.ENGINE.solver.abortRequested);
        ui.applyOverlayState(newState);
        return true;
    }

    // --- Hint animation and solver control ---

    function startHintAnimation() {
        if (!state.ENGINE.hinter.pathList.length) return;
        setOverlayState(core.HINT_ANIMATING);
        state.ENGINE.hinter.alpha        = 1;
        state.ENGINE.hinter.index        = 0;
        state.ENGINE.hinter.holdStartMs  = 0;
        state.ENGINE.hinter.blinkStartMs = 0;
        state.ENGINE.hinter.fadeStartMs  = 0;
        ui.showMessage(`Solution ${state.ENGINE.hinter.currentPathIdx + 1}/${state.ENGINE.hinter.pathList.length}`, "text-emerald-600");
    }

    function stopHintAnimation() {
        state.ENGINE.hinter.pathList       = [];
        state.ENGINE.hinter.currentPathIdx = 0;
        state.ENGINE.hinter.index          = 0;
        state.ENGINE.hinter.alpha          = 0;
        state.ENGINE.hinter.holdStartMs    = 0;
        state.ENGINE.hinter.blinkStartMs   = 0;
        state.ENGINE.hinter.fadeStartMs    = 0;
        setOverlayState(core.OVERLAY_NONE);
    }

    function cancelSolver() {
        if (!state.ENGINE.solver.controller) return;
        state.ENGINE.solver.abortRequested = true;
        ui.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
        ui.setButtonState('solverCloseBtn', { enabled: false });
        state.ENGINE.solver.controller.abort();
    }

    function isRunning() { return !!state.ENGINE.solver.controller; }

    function resetRunState({ keepLevel = true } = {}) {
        PathNavigator.clear(state.ENGINE);
        state.ENGINE.nav.undoStack = [];
        state.ENGINE.hazards.revealedGeese.clear();
        state.ENGINE.ripples = [];

        if (!keepLevel) state.ENGINE.level = null;
        state.ENGINE.hazards.armedFalseGoals    = new Set((state.ENGINE.level?.falseGoalKeys) || []);
        state.ENGINE.hazards.detonatedFalseGoals = new Set();
    }

    return {
        loadLevel(levelObjOrIdx, options = {}) {
            if (typeof levelObjOrIdx === 'number') return loadLevel(levelObjOrIdx, !!options.keepVariant);
            const mode = options.mode || state.ENGINE.mode;
            if (mode === core.PLAY) state.ENGINE.level = levelObjOrIdx;
            else state.ENGINE.editor.workingLevel = levelObjOrIdx;
            resetRunState({ keepLevel: true });
        },
        resetRunState,
        handlePrimaryGridInput(k, opts)             { return attemptMoveTo(k, opts); },
        attemptMoveTo(target, opts)                  { return attemptMoveTo(target, opts); },
        processStep(key)                             { return processStep(key); },
        checkWinCondition()                          { return checkWinCondition(); },
        areWinMetricsSatisfied(engineState, level)   { return areWinMetricsSatisfied(engineState, level); },
        wouldCreateBlockedTIntersection(engineState, key, level) { return wouldCreateBlockedTIntersectionImpl(engineState?.nav ?? engineState, key, level); },
        triggerJumpScare()                           { return triggerJumpScare(); },
        triggerBombDetonation(key)                   { return triggerBombDetonation(key); },
        createSnapshot()                             { return createSnapshot(); },
        applySnapshot(snap)                          { return applySnapshot(snap); },
        checkWinConditionImpl: checkWinConditionImplFn,
        getPackedPath()    { return [...(state.ENGINE?.nav?.path || [])]; },
        getIntersections() { return state.ENGINE?.nav?.intersections ?? 0; },
        updatePlayModeLayout,
        loadReviewLevel,
        loop,
        switchMode,
        setLogicState,
        setOverlayState,
        getRealLength,
        rebuildDerivedPathState,
        assertStateConsistency,
        updatePencilState,
        updateCompletionUI,
        PathNavigator,
        startHintAnimation,
        stopHintAnimation,
        cancelSolver,
        isRunning,
        findTapRoute,
    };
}
