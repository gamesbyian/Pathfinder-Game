export function installEngine(APP) {
    APP.Engine = (() => {
        let refs = { ENGINE: null };
        const bind = ({ ENGINE: engineRef }) => { refs = { ENGINE: engineRef }; };
        const init = bind;

            function areWinMetricsSatisfied(state = APP.State.ENGINE, level = (state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel)) {
                if (!level || !state.path.length) return false;
                const curLen = APP.Engine.getRealLength(state);
                if (curLen !== level.reqLen || state.intersections !== level.reqInt) return false;
                const allMustPass = level.mustPassKeys.every(k => state.visitedCounts.get(k) > 0);
                const allMustCross = level.mustCrossKeys.every(k => (state.visitedCounts.get(k) || 0) >= 2);
                return allMustPass && allMustCross;
            }

            function wouldCreateBlockedTIntersection(state, key, level) {
                if (!state || !level || state.path.length === 0) return false;
                const lastK = state.path[state.path.length - 1];
                const from = APP.LevelUtils.UNPACK(lastK);
                const to = APP.LevelUtils.UNPACK(key);
                const axis = (to.y === from.y) ? APP.Core.H : APP.Core.V;
                const usageAtTarget = state.cellUsage.get(key) || { h: false, v: false };
                const revisitCount = state.visitedCounts.get(key) || 0;
                const perpendicularUsed = axis === APP.Core.H ? usageAtTarget.v : usageAtTarget.h;
                const currentAxisUsed = axis === APP.Core.H ? usageAtTarget.h : usageAtTarget.v;
                if (revisitCount <= 0 || !perpendicularUsed || currentAxisUsed) return false;

                const dirX = Math.sign(to.x - from.x);
                const dirY = Math.sign(to.y - from.y);
                const forwardX = to.x + dirX;
                const forwardY = to.y + dirY;
                if (!APP.LevelUtils.inBounds(forwardX, forwardY, level.grid.w, level.grid.h)) return true;

                const forwardKey = APP.LevelUtils.PACK(forwardX, forwardY);
                const simulatedAfterEnter = simulateTapRouteStep(state, key, level, { skipTIntersectionCheck: true });
                if (!simulatedAfterEnter) return false;
                const simulatedForward = simulateTapRouteStep(simulatedAfterEnter.state, forwardKey, level, { skipTIntersectionCheck: true });
                if (!simulatedForward) return true;
                if (simulatedForward.result === "goose") {
                    return state.revealedGeese?.has(forwardKey) || false;
                }
                return false;
            }

            function processStep(key) {
                const activeLevel = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (APP.State.ENGINE.path.length > 1 && key === APP.State.ENGINE.path[APP.State.ENGINE.path.length - 2]) {
                    APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2);
                    APP.Core.SOUND_BUS.play("E4", "32n");
                    return "valid";
                }
                if (APP.State.ENGINE.logicState === APP.Core.HAZARD_TRIGGERED && APP.State.ENGINE.mode !== APP.Core.EDITOR && APP.State.ENGINE.mode !== APP.Core.REVIEW) return null;
                if (!APP.LevelUtils.isValidMove(key, APP.State.ENGINE, activeLevel, {
                    isStrict: true,
                    mode: APP.State.ENGINE.mode,
                    allowJump: true,
                    checkWinMetrics: false,
                    checkHazards: false,
                    checkFalseGoals: true,
                    armedFalseGoals: APP.State.ENGINE.armedFalseGoals
                })) {
                    return null;
                }

                if (wouldCreateBlockedTIntersection(APP.State.ENGINE, key, activeLevel)) return null;

                APP.State.ENGINE.isDirty = true;
                if (APP.State.ENGINE.mode === APP.Core.EDITOR) APP.State.ENGINE.editor.isModified = true;

                if (APP.State.ENGINE.mode !== APP.Core.EDITOR && APP.State.ENGINE.mode !== APP.Core.REVIEW && activeLevel.gooseSet.has(key)) {
                    APP.State.ENGINE.undoStack.push(createSnapshot());
                    if(APP.State.ENGINE.undoStack.length > 200) APP.State.ENGINE.undoStack.shift();
                    const justCreatedIntersection = APP.State.ENGINE.path.length > 1 && (APP.State.ENGINE.visitedCounts.get(key) || 0) > 0;
                    if (justCreatedIntersection) {
                        APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2);
                    }
                    const gooseAlreadyRevealed = APP.State.ENGINE.revealedGeese.has(key);
                    APP.State.ENGINE.revealedGeese.add(key);
                    if (gooseAlreadyRevealed) return null;
                    triggerJumpScare();
                    APP.Engine.setLogicState(APP.Core.HAZARD_TRIGGERED);
                    APP.Core.SOUND_BUS.play("C2", "8n");
                    return "goose";
                }

                APP.State.ENGINE.undoStack.push(createSnapshot());
                if(APP.State.ENGINE.undoStack.length > 200) APP.State.ENGINE.undoStack.shift();
                APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, key, false);
                if (APP.State.ENGINE.armedFalseGoals.has(key) && checkFalseGoalCondition()) {
                    triggerBombDetonation(key);
                    return "detonate";
                }
                const portal = APP.LevelUtils.resolvePortal(activeLevel, key);
                if (portal && portal.dest !== -1) {
                    APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, portal.dest, true);
                    if (APP.State.ENGINE.armedFalseGoals.has(portal.dest) && checkFalseGoalCondition()) {
                        triggerBombDetonation(portal.dest);
                        return "detonate";
                    }
                    const portalColor = APP.LevelUtils.getPortalDisplayColor(activeLevel, key, APP.Themes.THEMES[APP.Themes.getCurrentTheme()]?.colors?.portal || '#d946ef');
                    APP.State.ENGINE.ripples.push({x: APP.LevelUtils.UNPACK(key).x, y: APP.LevelUtils.UNPACK(key).y, startTime: Date.now(), color: portalColor});
                    APP.State.ENGINE.ripples.push({x: APP.LevelUtils.UNPACK(portal.dest).x, y: APP.LevelUtils.UNPACK(portal.dest).y, startTime: Date.now(), color: portalColor});
                    APP.Core.SOUND_BUS.play("A5", "16n");
                    APP.Engine.setLogicState(APP.Core.PORTAL_PAUSE);
                    checkWinCondition();
                    return "portal";
                }
                APP.Core.SOUND_BUS.play("G4", "32n");
                checkWinCondition();
                return "valid";
            }


            const buildStraightPathSteps = (headPos, target) => {
                const dx = target.x - headPos.x;
                const dy = target.y - headPos.y;
                if (dx !== 0 && dy !== 0) return [];
                const pathSteps = [];
                if (dx !== 0) {
                    for (let i = 1; i <= Math.abs(dx); i++) pathSteps.push(APP.LevelUtils.PACK(headPos.x + Math.sign(dx) * i, headPos.y));
                } else if (dy !== 0) {
                    for (let i = 1; i <= Math.abs(dy); i++) pathSteps.push(APP.LevelUtils.PACK(headPos.x, headPos.y + Math.sign(dy) * i));
                }
                return pathSteps;
            };

            const cloneTapRouteState = (state) => ({
                mode: state.mode,
                path: [...state.path],
                isPortalJump: new Set(state.isPortalJump),
                visitedCounts: new Map(state.visitedCounts),
                cellUsage: new Map(Array.from(state.cellUsage.entries(), ([k, u]) => [k, { h: !!u.h, v: !!u.v }])),
                intersections: state.intersections,
                flipCount: state.flipCount,
                crossedFlippingFilters: new Map(state.crossedFlippingFilters),
                activeGateKey: state.activeGateKey,
                armedFalseGoals: new Set(state.armedFalseGoals || [])
            });

            const rebuildTapRouteDerivedState = (state, level) => {
                state.visitedCounts = new Map();
                state.cellUsage = new Map();
                state.intersections = 0;
                state.flipCount = 0;
                state.crossedFlippingFilters = new Map();
                for (let i = 0; i < state.path.length; i++) {
                    const k = state.path[i];
                    const c = state.visitedCounts.get(k) || 0;
                    if (c > 0 && k !== state.activeGateKey && (level && k !== level.goalKey)) state.intersections++;
                    state.visitedCounts.set(k, c + 1);
                    if (i > 0 && !state.isPortalJump.has(i)) {
                        const prevK = state.path[i - 1];
                        const p1 = APP.LevelUtils.UNPACK(prevK), p2 = APP.LevelUtils.UNPACK(k);
                        const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V;
                        const mark = (key, ax) => {
                            const u = state.cellUsage.get(key) || { h: false, v: false };
                            if (ax === APP.Core.H) u.h = true; else u.v = true;
                            state.cellUsage.set(key, u);
                        };
                        mark(prevK, axis);
                        mark(k, axis);
                    }
                    if (level && level.flippingFilterMap.has(k) && !state.crossedFlippingFilters.has(k)) {
                        state.crossedFlippingFilters.set(k, state.flipCount);
                        state.flipCount++;
                    }
                }
            };

            const pushTapRouteStep = (state, key, isJump, level) => {
                const lastK = state.path[state.path.length - 1];
                if (lastK !== undefined && !isJump) {
                    const p1 = APP.LevelUtils.UNPACK(lastK), p2 = APP.LevelUtils.UNPACK(key);
                    const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V;
                    const mark = (k, ax) => { const u = state.cellUsage.get(k) || { h: false, v: false }; if (ax === APP.Core.H) u.h = true; else u.v = true; state.cellUsage.set(k, u); };
                    mark(lastK, axis); mark(key, axis);
                }
                const count = state.visitedCounts.get(key) || 0;
                if (count > 0 && key !== state.activeGateKey && (level && key !== level.goalKey)) state.intersections++;
                state.visitedCounts.set(key, count + 1);
                state.path.push(key);
                if (isJump) state.isPortalJump.add(state.path.length - 1);
                if (level && level.flippingFilterMap.has(key) && !state.crossedFlippingFilters.has(key)) {
                    state.crossedFlippingFilters.set(key, state.flipCount);
                    state.flipCount++;
                }
            };

            function simulateTapRouteStep(baseState, key, level, options = {}) {
                const nextState = cloneTapRouteState(baseState);
                if (nextState.path.length > 1 && key === nextState.path[nextState.path.length - 2]) {
                    nextState.path.pop();
                    const prevLen = nextState.path.length;
                    nextState.isPortalJump = new Set(Array.from(nextState.isPortalJump).filter(i => i < prevLen));
                    rebuildTapRouteDerivedState(nextState, level);
                    return { state: nextState, result: "valid" };
                }
                if (!APP.LevelUtils.isValidMove(key, nextState, level, {
                    isStrict: true,
                    mode: nextState.mode,
                    allowJump: true,
                    checkWinMetrics: false,
                    checkHazards: false,
                    checkFalseGoals: true,
                    armedFalseGoals: nextState.armedFalseGoals,
                    flipCount: nextState.flipCount,
                    crossedSet: nextState.crossedFlippingFilters
                })) return null;
                if (!options.skipTIntersectionCheck && wouldCreateBlockedTIntersection(nextState, key, level)) return null;
                if (nextState.mode !== APP.Core.EDITOR && nextState.mode !== APP.Core.REVIEW && level.gooseSet.has(key)) return { state: nextState, result: "goose" };
                pushTapRouteStep(nextState, key, false, level);
                if (nextState.armedFalseGoals.has(key) && APP.Engine.areWinMetricsSatisfied(nextState, level)) return { state: nextState, result: "detonate" };
                const portal = APP.LevelUtils.resolvePortal(level, key);
                if (portal && portal.dest !== -1) {
                    pushTapRouteStep(nextState, portal.dest, true, level);
                    if (nextState.armedFalseGoals.has(portal.dest) && APP.Engine.areWinMetricsSatisfied(nextState, level)) return { state: nextState, result: "detonate" };
                    return { state: nextState, result: "portal" };
                }
                return { state: nextState, result: "valid" };
            }

            function findTapRoute(target, options = {}) {
                const level = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (!level || !APP.State.ENGINE.path.length) return null;
                const targetKey = APP.LevelUtils.PACK(target.x, target.y);
                const startState = cloneTapRouteState(APP.State.ENGINE);
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
                    const head = APP.LevelUtils.UNPACK(headKey);
                    for (const [dx, dy] of dirs) {
                        const nk = APP.LevelUtils.PACK(head.x + dx, head.y + dy);
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
                if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW) && !APP.State.ENGINE.editor.isPencilMode) return;
                if (!APP.State.ENGINE.path.length) return;
                const headPos = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1]);
                if (APP.State.ENGINE.logicState === APP.Core.PORTAL_PAUSE) {
                    if (target.x !== headPos.x || target.y !== headPos.y) APP.Engine.setLogicState(APP.Core.DRAGGING);
                    else return;
                }
                if (target.x === headPos.x && target.y === headPos.y) return;
                const pathSteps = buildStraightPathSteps(headPos, target);
                for (const step of pathSteps) {
                    const result = processStep(step);
                    if (result === null || result === "goose" || result === "detonate") break;
                }
                if (pathSteps.length > 0) APP.State.ENGINE.isDirty = true;
            }

            function checkWinCondition() {
                if (checkWinConditionImpl(APP.State.ENGINE.path, APP.State.ENGINE.level, APP.State.ENGINE.mode, APP.State.ENGINE.logicState, APP.State.ENGINE.isPortalJump, APP.State.ENGINE.visitedCounts, APP.State.ENGINE.intersections)) {
                    APP.Engine.setLogicState(APP.Core.RESOLVED);
                    APP.UI.renderWinExportPanel({ solutionOutput: JSON.stringify(APP.State.ENGINE.path).replace(/\s/g, ''), showExportArea: APP.State.ENGINE.isDevMode });
                    if (APP.State.ENGINE.mode === APP.Core.PLAY) APP.Persistence.markLevelComplete(APP.State.ENGINE.levelIdx);
                    APP.UI.openModal('winModal');
                    APP.Core.SOUND_BUS.play("C5", "8n");
                }
            }

            function checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) {
                if (!path.length || logicState === APP.Core.HAZARD_TRIGGERED || mode === APP.Core.EDITOR || mode === APP.Core.REVIEW) return false;
                const last = path[path.length - 1];
                if (last !== level.goalKey) return false;
                const stubState = { mode, level, editor: { workingLevel: level }, path, isPortalJump, visitedCounts, intersections };
                return APP.Engine.areWinMetricsSatisfied(stubState, level);
            }

            function checkFalseGoalCondition() {
                const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (!l) return false;
                return areWinMetricsSatisfied(APP.State.ENGINE, l);
            }


            function triggerJumpScare() {
                APP.UI.showGooseJumpScare();
                APP.Engine.setOverlayState(APP.Core.GOOSE_OVERLAY);
                setTimeout(() => {
                    if (APP.State.ENGINE.overlayState === APP.Core.GOOSE_OVERLAY) {
                        APP.UI.hideGooseJumpScare();
                        APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                    }
                }, 2500);
            }


            let bombTimer1 = null;
            let bombTimer2 = null;

            function triggerBombDetonation(key) {
                APP.State.ENGINE.armedFalseGoals.delete(key);
                APP.State.ENGINE.detonatedFalseGoals.add(key);
                APP.Engine.setOverlayState(APP.Core.FALSE_GOAL_ANIMATING);
                APP.UI.showBombDetonation();
                APP.Core.SOUND_BUS.play("C2", "8n");
                bombTimer1 = setTimeout(() => {
                    bombTimer1 = null;
                    APP.UI.showBombDetonation({ explodedMarkup: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-bomb-blast-ring)" stroke-width="10" stroke-dasharray="10 5" class="animate-ping"/><path d="M 50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20" stroke="var(--theme-bomb-blast-rays)" stroke-width="8"/></svg>` });
                    APP.Core.SOUND_BUS.play("F1", "4n");
                    bombTimer2 = setTimeout(() => {
                        bombTimer2 = null;
                        APP.UI.hideBombDetonation({ resetMarkup: `<svg viewBox="0 0 100 100"><use href="#def-falsegoal"/></svg>` });
                        APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                    }, 1000);
                }, 1000);
            }



            function createSnapshot() {
                return {
                    path: [...APP.State.ENGINE.path],
                    isPortalJump: new Set(APP.State.ENGINE.isPortalJump),
                    activeGateKey: APP.State.ENGINE.activeGateKey,
                    logicState: APP.State.ENGINE.logicState,
                    detonatedFalseGoals: new Set(APP.State.ENGINE.detonatedFalseGoals)
                };
            }

            function applySnapshot(snap) {
                APP.State.ENGINE.path = [...snap.path];
                APP.State.ENGINE.isPortalJump = new Set(snap.isPortalJump);
                APP.State.ENGINE.activeGateKey = snap.activeGateKey;
                const restoredLogicState = snap.logicState === APP.Core.HAZARD_TRIGGERED ? APP.Core.IDLE : snap.logicState;
                APP.Engine.setLogicState(APP.Core.IDLE);
                if (restoredLogicState !== APP.Core.IDLE) APP.Engine.setLogicState(restoredLogicState);
                APP.State.ENGINE.detonatedFalseGoals = new Set(snap.detonatedFalseGoals);
                const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                const armed = new Set(l?.falseGoalKeys || []);
                APP.State.ENGINE.detonatedFalseGoals.forEach(k => armed.delete(k));
                APP.State.ENGINE.armedFalseGoals = armed;
                APP.Engine.rebuildDerivedPathState(APP.State.ENGINE);
                APP.State.ENGINE.isDirty = true;
                APP.UI.showMessage("", "");
            }

            function updatePlayModeLayout() {
                if (APP.State.ENGINE.mode !== APP.Core.PLAY) return;
                APP.UI.setClassState('exportArea', 'hidden', !APP.State.ENGINE.isDevMode);
                APP.UI.setClassState('devCopyBtn', 'hidden', !APP.State.ENGINE.isDevMode);
                APP.UI.setClassState('devGenBtn', 'hidden', !APP.State.ENGINE.isDevMode);
            }

            function switchMode(newMode) {
                const isEd = newMode === APP.Core.EDITOR;
                const isReview = newMode === APP.Core.REVIEW;
                const isEdOrReview = isEd || isReview;
                APP.State.ENGINE.mode = newMode;
                APP.UI.setSolutionOutput('');
                APP.Engine.setLogicState(APP.Core.IDLE);
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                APP.State.ENGINE.undoStack = [];
                APP.State.ENGINE.revealedGeese.clear();
                APP.State.ENGINE.gooseEncounteredThisLevel = false;
                APP.State.ENGINE.detonatedFalseGoals.clear();
                document.getElementById('editorPalette').classList.toggle('hidden', !isEdOrReview);
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
                APP.UI.setButtonState('reviewSubmitBtn', { enabled: true });
                document.getElementById('devCopyBtn').classList.toggle('hidden', isEdOrReview || !APP.State.ENGINE.isDevMode);
                document.getElementById('devGenBtn').classList.toggle('hidden', isEdOrReview || !APP.State.ENGINE.isDevMode);
                exportArea.classList.add('hidden');
                if (isEd) {
                    APP.State.ENGINE.variant = 0;
                    APP.State.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level);
                    APP.State.ENGINE.editor.isPencilMode = false;
                    APP.State.ENGINE.editor.undoStack = [];
                    APP.State.ENGINE.editor.validTrapSpots.clear();
                    APP.State.ENGINE.editor.emptyClickCount = 0;
                    APP.UI.setInputValue('editReqLen', APP.State.ENGINE.editor.workingLevel.reqLen || 0);
                    APP.UI.setInputValue('editReqInt', APP.State.ENGINE.editor.workingLevel.reqInt || 0);
                    APP.State.ENGINE.editor.isModified = false;
                    updatePencilState();
                } else if (isReview) {
                    APP.State.ENGINE.review.savedPlayLevelIdx = APP.State.ENGINE.levelIdx;
                    APP.State.ENGINE.editor.isPencilMode = false;
                    APP.State.ENGINE.editor.emptyClickCount = 0;
                    resetEmptyReviewState();
                    updatePencilState();
                } else {
                    updatePlayModeLayout();
                    APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true });
                }
                APP.UI.updateAppScale();
                APP.UI.updateViewport();
                APP.UI.syncEditorPalettePlacement();
                APP.Persistence.updateCompletionUI();
                APP.UI.showMessage("", "");
                APP.State.ENGINE.isDirty = true;
            }

            function updatePencilState() {
                const btn = document.getElementById('editPencilBtn');
                if (!btn) return;
                const svg = btn.querySelector('svg');
                if (!svg) return;

                const inactivePencilIcon = '<g><g><g><path d="M459.113,31.24c-41.654-41.654-109.199-41.654-150.853,0L21.647,317.854c-3.425,3.425-5.583,7.915-6.118,12.729L0.447,466.348c-1.509,13.587,9.971,25.068,23.558,23.558l135.765-15.083c4.815-0.535,9.304-2.693,12.729-6.118L399.827,241.38c0.007-0.007,0.016-0.013,0.023-0.021l59.264-59.264c20.827-20.827,31.241-48.127,31.24-75.427C490.354,79.368,479.941,52.068,459.113,31.24z M428.943,151.923l-44.18,44.18l-90.512-90.512l44.179-44.179c24.991-24.992,65.521-24.992,90.513,0c12.495,12.495,18.743,28.875,18.744,45.255C447.687,123.048,441.439,139.428,428.943,151.923z M147.622,433.245L45.797,444.557l11.312-101.825L264.081,135.76l90.513,90.513L147.622,433.245z"/><path d="M232.839,448h-21.333c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h21.333c11.782,0,21.333-9.551,21.333-21.333C254.172,457.551,244.621,448,232.839,448z"/><path d="M467.506,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C488.839,457.551,479.288,448,467.506,448z"/><path d="M360.839,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C382.172,457.551,372.621,448,360.839,448z"/></g></g></g>';
                const activePencilIcon = '<g><g><g><path d="M254.172,447.945h-21.333c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h21.333c11.797,0,21.333-9.557,21.333-21.333S265.97,447.945,254.172,447.945z"/><path d="M467.506,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S479.303,447.945,467.506,447.945z"/><path d="M360.839,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S372.636,447.945,360.839,447.945z"/><path d="M459.109,182.04c41.579-41.6,41.579-109.269,0-150.848c-41.6-41.6-109.291-41.579-150.848,0l-44.181,44.181l150.848,150.848L459.109,182.04z"/><path d="M21.652,317.799c-3.435,3.435-5.589,7.915-6.123,12.736L0.446,466.3c-0.704,6.443,1.536,12.843,6.123,17.429c4.011,4.032,9.451,6.251,15.083,6.251c0.789,0,1.557-0.043,2.347-0.128l135.787-15.083c4.8-0.533,9.301-2.688,12.715-6.123L384.766,256.38L233.918,105.532L21.652,317.799z"/></g></g></g>';

                btn.classList.toggle('selected', APP.State.ENGINE.editor.isPencilMode);
                svg.setAttribute('viewBox', APP.State.ENGINE.editor.isPencilMode ? '0 0 490.612 490.612' : '0 0 490.667 490.667');
                svg.setAttribute('fill', 'currentColor');
                svg.setAttribute('stroke', 'none');
                svg.innerHTML = APP.State.ENGINE.editor.isPencilMode ? activePencilIcon : inactivePencilIcon;
            }

            function resetEmptyReviewState() {
                APP.State.ENGINE.review.currentIdx = 0;
                APP.State.ENGINE.editor.workingLevel = null;
                APP.State.ENGINE.editor.undoStack = [];
                APP.State.ENGINE.editor.isModified = false;
                APP.State.ENGINE.editor.validTrapSpots.clear();
                APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                APP.State.ENGINE.undoStack = [];
                APP.State.ENGINE.revealedGeese.clear();
                APP.State.ENGINE.gooseEncounteredThisLevel = false;
                APP.State.ENGINE.detonatedFalseGoals.clear();
                APP.UI.setInputValue('editReqLen', 0);
                APP.UI.setInputValue('editReqInt', 0);
                APP.UI.renderMetricsPanel({ currentLen: 0, reqLen: 0, currentInt: 0, reqInt: 0 });
                APP.UI.updateLevelDisplay(0, false, '0/0');
                APP.UI.updateAppScale();
                APP.UI.updateViewport();
                APP.State.ENGINE.isDirty = true;
            }

            function loadReviewLevel(idx) {
                const subs = APP.State.ENGINE.review.submissions;
                if (!subs || !subs.length) {
                    resetEmptyReviewState();
                    return;
                }
                const safeIdx = Math.max(0, Math.min(idx, subs.length - 1));
                APP.State.ENGINE.review.currentIdx = safeIdx;
                const rawLevel = subs[safeIdx].levelData;
                const normalized = APP.LevelUtils.processRawLevel(rawLevel, safeIdx);
                if (!normalized) {
                    APP.UI.showMessage('Could not load submission.', 'text-red-500 font-bold');
                    return;
                }
                APP.State.ENGINE.editor.workingLevel = normalized;
                APP.State.ENGINE.editor.undoStack = [];
                APP.State.ENGINE.editor.isModified = false;
                APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                APP.State.ENGINE.undoStack = [];
                APP.State.ENGINE.revealedGeese.clear();
                APP.State.ENGINE.gooseEncounteredThisLevel = false;
                APP.State.ENGINE.detonatedFalseGoals.clear();
                APP.UI.setInputValue('editReqLen', normalized.reqLen || 0);
                APP.UI.setInputValue('editReqInt', normalized.reqInt || 0);
                APP.UI.updateLevelDisplay(safeIdx, false, `${safeIdx + 1}/${subs.length}`);
                APP.UI.updateAppScale();
                APP.UI.updateViewport();
                APP.State.ENGINE.isDirty = true;
            }

            function loadLevel(idx, keepVariant = false) {
                clearTimeout(bombTimer1); clearTimeout(bombTimer2); bombTimer1 = null; bombTimer2 = null;
                if (APP.State.ENGINE.activeSolverController) return;

                const levels = APP.Data.getLevels();
                if (!levels || !APP.Data.getLevel(idx)) return;

                APP.State.ENGINE.levelIdx = idx;

                const isEditor = APP.State.ENGINE.mode === APP.Core.EDITOR;
                if (isEditor) APP.State.ENGINE.variant = 0;
                else if (!keepVariant) APP.State.ENGINE.variant = Math.floor(Math.random() * 8);

                APP.Engine.setLogicState(APP.Core.IDLE);
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);

                APP.State.ENGINE.level = APP.LevelUtils.normalizeLevel(idx);
                APP.LevelUtils.assertLevelShape(APP.State.ENGINE.level);
                APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                APP.State.ENGINE.undoStack = [];
                APP.State.ENGINE.revealedGeese.clear();
                APP.State.ENGINE.ripples = [];
                APP.State.ENGINE.gooseEncounteredThisLevel = false;
                APP.State.ENGINE.armedFalseGoals = new Set(APP.State.ENGINE.level.falseGoalKeys || []);
                APP.State.ENGINE.detonatedFalseGoals = new Set();
                APP.State.ENGINE.foundHintsSinceLoad = [];
                APP.State.ENGINE.hinter.pathList = [];
                APP.State.ENGINE.hinter.currentPathIdx = 0;
                APP.State.ENGINE.hinter.source = 'none';
                APP.State.ENGINE.hinter.index = 0;
                APP.State.ENGINE.hinter.alpha = 0;
                APP.State.ENGINE.hinter.holdStartMs = 0;
                APP.State.ENGINE.hinter.blinkStartMs = 0;
                APP.State.ENGINE.hinter.fadeStartMs = 0;

                if (isEditor) {
                    APP.State.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level);
                    APP.State.ENGINE.editor.isPencilMode = false;
                    APP.State.ENGINE.editor.undoStack = [];
                    APP.State.ENGINE.editor.validTrapSpots.clear();
                    APP.State.ENGINE.editor.emptyClickCount = 0;
                    APP.UI.setInputValue('editReqLen', APP.State.ENGINE.editor.workingLevel.reqLen || 0);
                    APP.UI.setInputValue('editReqInt', APP.State.ENGINE.editor.workingLevel.reqInt || 0);
                    APP.State.ENGINE.editor.isModified = false;
                    updatePencilState();
                }

                APP.UI.updateLevelDisplay(idx, false);
                APP.UI.closeModal('winModal');
                APP.UI.showMessage("", "");
                APP.UI.setSolutionOutput('');
                APP.UI.updateAppScale();
                APP.UI.updateViewport();
                APP.Persistence.updateCompletionUI();
                APP.Persistence.persistSessionState();
                APP.State.ENGINE.isDirty = true;
            }

            function loop() {
                if (APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING && APP.State.ENGINE.hinter.pathList.length) {
                    const hPath = APP.State.ENGINE.hinter.pathList[APP.State.ENGINE.hinter.currentPathIdx];
                    const hintNowMs = Date.now();
                    const hintHoldDurationMs = 2700;
                    const hintBlinkCount = 3;
                    const hintBlinkCycleMs = 800;
                    const hintFadeDurationMs = 900;

                    APP.State.ENGINE.hinter.index += 0.285;

                    if (APP.State.ENGINE.hinter.index >= hPath.length) {
                        APP.State.ENGINE.hinter.index = hPath.length;
                        if (!APP.State.ENGINE.hinter.holdStartMs) APP.State.ENGINE.hinter.holdStartMs = hintNowMs;
                    }

                    const holdElapsedMs = APP.State.ENGINE.hinter.holdStartMs ? (hintNowMs - APP.State.ENGINE.hinter.holdStartMs) : 0;
                    const holdComplete = APP.State.ENGINE.hinter.holdStartMs && holdElapsedMs >= hintHoldDurationMs;

                    if (holdComplete && !APP.State.ENGINE.hinter.blinkStartMs) APP.State.ENGINE.hinter.blinkStartMs = hintNowMs;

                    if (APP.State.ENGINE.hinter.blinkStartMs && !APP.State.ENGINE.hinter.fadeStartMs) {
                        const blinkElapsedMs = hintNowMs - APP.State.ENGINE.hinter.blinkStartMs;
                        const blinkWindowMs = hintBlinkCount * hintBlinkCycleMs;
                        if (blinkElapsedMs < blinkWindowMs) {
                            const blinkPhase = (blinkElapsedMs % hintBlinkCycleMs) / hintBlinkCycleMs;
                            APP.State.ENGINE.hinter.alpha = 0.25 + (0.75 * (0.5 + 0.5 * Math.cos(blinkPhase * Math.PI * 2)));
                        } else {
                            APP.State.ENGINE.hinter.fadeStartMs = hintNowMs;
                            APP.State.ENGINE.hinter.alpha = 1;
                        }
                    }

                    if (APP.State.ENGINE.hinter.fadeStartMs) {
                        const fadeElapsedMs = hintNowMs - APP.State.ENGINE.hinter.fadeStartMs;
                        APP.State.ENGINE.hinter.alpha = Math.max(0, 1 - (fadeElapsedMs / hintFadeDurationMs));
                        if (APP.State.ENGINE.hinter.alpha <= 0) {
                            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                            APP.UI.showMessage("", "");
                        }
                    }
                }
                if (APP.State.ENGINE.visualFlipCount < APP.State.ENGINE.flipCount) {
                    APP.State.ENGINE.visualFlipCount = Math.min(APP.State.ENGINE.flipCount, APP.State.ENGINE.visualFlipCount + 0.15);
                    APP.State.ENGINE.isDirty = true;
                } else if (APP.State.ENGINE.visualFlipCount > APP.State.ENGINE.flipCount) {
                    APP.State.ENGINE.visualFlipCount = Math.max(APP.State.ENGINE.flipCount, APP.State.ENGINE.visualFlipCount - 0.15);
                    APP.State.ENGINE.isDirty = true;
                }
                const hasContinuousAnimation = APP.State.ENGINE.ripples.length > 0 || APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING;
                if (hasContinuousAnimation) APP.State.ENGINE.isDirty = true;
                const shouldRender = APP.State.ENGINE.isDirty || hasContinuousAnimation;
                if (shouldRender) {
                    APP.State.ENGINE.isDirty = false;
                    APP.Renderer.render();
                }
                requestAnimationFrame(loop);
            }

            function getRealLength(state = APP.State.ENGINE) { return state.path.length > 0 ? state.path.length - 1 - state.isPortalJump.size : 0; }

            function rebuildDerivedPathState(state = APP.State.ENGINE) {
                const oldFlipCount = state.flipCount;
                state.visitedCounts.clear(); state.cellUsage.clear(); state.intersections = 0; state.flipCount = 0; state.crossedFlippingFilters.clear(); const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; if (state.path.length === 0) { if (oldFlipCount !== 0) state.lastFlipTime = Date.now(); return; }
                for (let i = 0; i < state.path.length; i++) {
                    const k = state.path[i]; const c = state.visitedCounts.get(k) || 0; if (c > 0 && k !== state.activeGateKey && (l && k !== l.goalKey)) { state.intersections++; } state.visitedCounts.set(k, c + 1);
                    if (i > 0 && !state.isPortalJump.has(i)) { const prevK = state.path[i-1]; const p1 = APP.LevelUtils.UNPACK(prevK), p2 = APP.LevelUtils.UNPACK(k); const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V; let uPrev = state.cellUsage.get(prevK) || { h: false, v: false }; if (axis === APP.Core.H) uPrev.h = true; else uPrev.v = true; state.cellUsage.set(prevK, uPrev); let uCur = state.cellUsage.get(k) || { h: false, v: false }; if (axis === APP.Core.H) uCur.h = true; else uCur.v = true; state.cellUsage.set(k, uCur); }
                    if (l && l.flippingFilterMap.has(k) && !state.crossedFlippingFilters.has(k)) { state.crossedFlippingFilters.set(k, state.flipCount); state.flipCount++; }
                }
                if (state.flipCount !== oldFlipCount) state.lastFlipTime = Date.now();
            }

            function assertStateConsistency(state = APP.State.ENGINE) { if (!state.isDevMode) return; const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; if (!l) return; const originalIntersections = state.intersections; const originalCounts = new Map(state.visitedCounts); rebuildDerivedPathState(state); if (originalIntersections !== state.intersections) { console.error("Invariant broken: Intersections mismatch."); } originalCounts.forEach((v, k) => { if (state.visitedCounts.get(k) !== v) console.error("Invariant broken: Visited count mismatch."); }); }

            const PathNavigator = {
                pushStep(state, key, isJump) {
                    const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; const lastK = state.path[state.path.length - 1];
                    if (lastK !== undefined && !isJump) { const p1 = APP.LevelUtils.UNPACK(lastK), p2 = APP.LevelUtils.UNPACK(key); const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V; const mark = (k, ax) => { let u = state.cellUsage.get(k) || { h: false, v: false }; if (ax === APP.Core.H) u.h = true; else u.v = true; state.cellUsage.set(k, u); }; mark(lastK, axis); mark(key, axis); }
                    const count = state.visitedCounts.get(key) || 0; if (count > 0 && key !== state.activeGateKey && (l && key !== l.goalKey)) { state.intersections++; } state.visitedCounts.set(key, count + 1); state.path.push(key); if (isJump) state.isPortalJump.add(state.path.length - 1); state.isDirty = true;
                    if (l && l.flippingFilterMap.has(key) && !state.crossedFlippingFilters.has(key)) { state.crossedFlippingFilters.set(key, state.flipCount); state.flipCount++; state.lastFlipTime = Date.now(); }
                    assertStateConsistency(state);
                },
                truncateTo(state, targetIdx) {
                    if (targetIdx < -1 || targetIdx >= state.path.length - 1) return; state.path.splice(targetIdx + 1); const newJumps = new Set(); for (const j of state.isPortalJump) if (j <= targetIdx) newJumps.add(j); state.isPortalJump = newJumps;
                    if (state.path.length === 0) { state.activeGateKey = null; } if ([APP.Core.DRAGGING, APP.Core.PORTAL_PAUSE, APP.Core.HAZARD_TRIGGERED].includes(state.logicState)) { APP.Engine.setLogicState(APP.Core.IDLE); } if (state.mode === APP.Core.EDITOR) state.editor.isModified = true; state.isDirty = true; rebuildDerivedPathState(state); assertStateConsistency(state);
                },
                clear(state) { state.path = []; state.isPortalJump.clear(); state.activeGateKey = null; if ([APP.Core.DRAGGING, APP.Core.PORTAL_PAUSE, APP.Core.HAZARD_TRIGGERED].includes(state.logicState)) { APP.Engine.setLogicState(APP.Core.IDLE); } if (state.mode === APP.Core.EDITOR) state.editor.isModified = true; state.isDirty = true; rebuildDerivedPathState(state); assertStateConsistency(state); }
            };

            const VALID_LOGIC_TRANSITIONS = {
                [APP.Core.IDLE]: [APP.Core.DRAGGING, APP.Core.EDIT_DRAG, APP.Core.THEME_DRAG, APP.Core.RESOLVED],
                [APP.Core.DRAGGING]: [APP.Core.IDLE, APP.Core.PORTAL_PAUSE, APP.Core.RESOLVED, APP.Core.HAZARD_TRIGGERED],
                [APP.Core.PORTAL_PAUSE]: [APP.Core.DRAGGING, APP.Core.IDLE, APP.Core.RESOLVED],
                [APP.Core.RESOLVED]: [APP.Core.IDLE],
                [APP.Core.HAZARD_TRIGGERED]: [APP.Core.IDLE],
                [APP.Core.EDIT_DRAG]: [APP.Core.IDLE],
                [APP.Core.THEME_DRAG]: [APP.Core.IDLE]
            };

            function setLogicState(newState) {
                if (newState !== APP.Core.IDLE && !VALID_LOGIC_TRANSITIONS[APP.State.ENGINE.logicState]?.includes(newState)) {
                    console.warn(`Blocked Logic Transition: ${APP.State.ENGINE.logicState} -> ${newState}`);
                    return false;
                }

                if (APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG && newState !== APP.Core.EDIT_DRAG) {
                    APP.UI.EditorDragGhost.update({ visible: false });
                }

                APP.State.ENGINE.logicState = newState;
                return true;
            }

            // setOverlayState updates state only; APP.UI.applyOverlayState renders it.
            function setOverlayState(newState) {
                if (APP.State.ENGINE.overlayState === newState) return true;
                if (APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING && newState !== APP.Core.HINT_ANIMATING) {
                    APP.State.ENGINE.hinter.alpha = 0;
                    APP.State.ENGINE.hinter.holdStartMs = 0;
                    APP.State.ENGINE.hinter.blinkStartMs = 0;
                    APP.State.ENGINE.hinter.fadeStartMs = 0;
                }

                APP.State.ENGINE.overlayState = newState;
                APP.State.ENGINE.isDirty = true;
                APP.UI.setSolverAbortRequested(APP.State.ENGINE.solverAbortRequested);
                APP.UI.applyOverlayState(newState);

                return true;
            }

        return {
            init,
            loadLevel(levelObjOrIdx, options = {}) {
                if (typeof levelObjOrIdx === 'number') return loadLevel(levelObjOrIdx, !!options.keepVariant);
                if (!refs.ENGINE) return;
                const mode = options.mode || refs.ENGINE.mode;
                if (mode === APP.Core.PLAY) refs.ENGINE.level = levelObjOrIdx;
                else refs.ENGINE.editor.workingLevel = levelObjOrIdx;
                this.resetRunState({ keepLevel: true });
            },
            resetRunState({ keepLevel = true } = {}) {
                if (!refs.ENGINE) return;
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.ENGINE.undoStack = [];
                refs.ENGINE.revealedGeese.clear();
                refs.ENGINE.ripples = [];
                refs.ENGINE.gooseEncounteredThisLevel = false;
                if (!keepLevel) refs.ENGINE.level = null;
                refs.ENGINE.armedFalseGoals = new Set((refs.ENGINE.level?.falseGoalKeys) || []);
                refs.ENGINE.detonatedFalseGoals = new Set();
            },
            handlePrimaryGridInput(k, opts) { return attemptMoveTo(k, opts); },
            attemptMoveTo(target, opts) { return attemptMoveTo(target, opts); },
            processStep(key) { return processStep(key); },
            checkWinCondition() { return checkWinCondition(); },
            areWinMetricsSatisfied(state, level) { return areWinMetricsSatisfied(state, level); },
            checkFalseGoalCondition() { return checkFalseGoalCondition(); },
            triggerJumpScare() { return triggerJumpScare(); },
            triggerBombDetonation(key) { return triggerBombDetonation(key); },
            createSnapshot() { return createSnapshot(); },
            applySnapshot(snap) { return applySnapshot(snap); },
            checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) { return checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections); },
            getPackedPath() { return [...(refs.ENGINE?.path || [])]; },
            getIntersections() { return refs.ENGINE?.intersections ?? 0; },
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
            PathNavigator
        };
    })();

    APP.Engine.init({ ENGINE: APP.State.ENGINE });
}
