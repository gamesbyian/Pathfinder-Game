import { validateLevelDetailed as validateLevelDetailedImpl } from './domain/level-validation.js';
import { getOccupant, removeOccupant, placeOccupant }        from './editor/editor-occupancy.js';
import { saveEditorSnapshot, restoreEditorSnapshot }         from './editor/editor-history.js';
import { serializeLevel }                                     from './editor/editor-export.js';

export function installEditor(APP) {
    APP.Editor = (() => {
        let refs = { ENGINE: null, UI: null };
        const bind = ({ ENGINE: engineRef, UI: uiRef }) => { refs = { ENGINE: engineRef, UI: uiRef }; };
        const init = bind;

        function pickUpObject(k) {
            if (APP.State.ENGINE.editor.isPencilMode) return null;
            saveEditorState();
            APP.State.ENGINE.editor.draggedFromGrid = true;
            APP.State.ENGINE.editor.validTrapSpots.clear();
            const l = APP.State.ENGINE.editor.workingLevel;
            l.hints = [];
            const result = removeOccupant(l, k, APP.State.ENGINE.editor.pendingPortal);
            if (!result) {
                APP.State.ENGINE.editor.undoStack.pop();
                APP.State.ENGINE.editor.draggedFromGrid = false;
                return null;
            }
            APP.State.ENGINE.editor.pendingPortal = result.pendingPortal;
            APP.State.ENGINE.isDirty = true;
            if (result.message) APP.UI.showMessage(result.message, result.messageCls);
            return { type: result.type };
        }

        function placeEditorObject(k) {
            const l = APP.State.ENGINE.editor.workingLevel;
            const toolType = APP.State.ENGINE.editor.draggedObject
                ? APP.State.ENGINE.editor.draggedObject.type
                : APP.State.ENGINE.editor.selectedTool;
            if (!toolType) return;
            const pendingPortal = APP.State.ENGINE.editor.pendingPortal;

            if (pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
                APP.UI.showMessage('Finish portal pair first!', 'text-red-600 font-bold');
                return;
            }

            const isOccupied = !!getOccupant(l, k);
            if (isOccupied) {
                if (toolType === 'eraser') { pickUpObject(k); return; }
                APP.UI.showMessage('Occupied', 'text-red-500');
                return;
            }
            if (toolType === 'eraser') return;
            if (toolType === 'portal' && pendingPortal === k) return;

            saveEditorState();
            APP.State.ENGINE.editor.validTrapSpots.clear();
            l.hints = [];

            const result = placeOccupant(l, k, toolType, pendingPortal);
            if (result.ok) {
                APP.State.ENGINE.editor.pendingPortal = result.pendingPortal;
                APP.State.ENGINE.editor.draggedObject = null;
                APP.State.ENGINE.isDirty = true;
                if (result.message) APP.UI.showMessage(result.message, result.messageCls);
            }
        }

        // Wrapper: passes editor's pendingPortal context; pure logic is in domain/level-validation.js.
        function validateLevelDetailed(l, opts = {}) {
            return validateLevelDetailedImpl(l, opts, APP.State.ENGINE.editor.pendingPortal);
        }

        function validateLevel(l) {
            const res = validateLevelDetailed(l);
            if (!res.ok) APP.UI.showMessage(res.reasons[0], 'text-red-500 font-bold');
            return res.ok;
        }

        function saveEditorState() {
            saveEditorSnapshot(
                APP.State.ENGINE.editor,
                APP.State.ENGINE.hinter,
                APP.LevelUtils.deepCloneLevel
            );
        }

        function restoreEditorState() {
            const result = restoreEditorSnapshot(APP.State.ENGINE.editor, APP.State.ENGINE.hinter);
            if (!result) return;
            APP.State.ENGINE.isDirty = true;
            APP.UI.showMessage('Undo Grid Action', 'text-slate-500');
        }

        async function generateLevelString() {
            const l = APP.State.ENGINE.editor.workingLevel;
            const isValid = validateLevel(l);
            const reqLen = parseInt(APP.UI.getValue('editReqLen')) || 0;
            const reqInt = parseInt(APP.UI.getValue('editReqInt')) || 0;
            const validateHintPath = (candidatePath) => {
                const levelForValidation = APP.LevelUtils.deepCloneLevel(l);
                levelForValidation.reqLen = reqLen;
                levelForValidation.reqInt = reqInt;
                return APP.Solver.validateCandidatePath(levelForValidation, candidatePath);
            };
            const normalizedHints = [];
            const seen = new Set();
            const pushUniqueHint = (candidatePath) => {
                const validation = validateHintPath(candidatePath);
                if (!validation?.ok) return;
                const path = validation.path;
                const key = JSON.stringify(path);
                if (seen.has(key)) return;
                seen.add(key);
                normalizedHints.push(path);
            };

            const savedHints = Array.isArray(l.hints) ? l.hints : [];
            savedHints.forEach(pushUniqueHint);

            const liveHints = Array.isArray(APP.State.ENGINE.foundHintsSinceLoad) ? APP.State.ENGINE.foundHintsSinceLoad : [];
            liveHints.forEach(pushUniqueHint);

            if (APP.State.ENGINE.path.length > 1) pushUniqueHint(APP.State.ENGINE.path);

            const exportedHints = normalizedHints.slice(0, 5);
            applyMetadataFromUI(l);

            const json = serializeLevel(l, reqLen, reqInt, exportedHints);
            APP.UI.setSolutionOutput(json);
            await APP.UI.copyText(json, { fallbackElId: 'solutionOutput' });
            APP.State.ENGINE.editor.isModified = false;
            if (isValid) {
                APP.UI.showMessage('Data Generated & Copied!', 'text-white font-black');
            } else {
                setTimeout(() => APP.UI.showMessage('Data Copied (Check Errors!)', 'text-white font-black'), 1500);
            }
        }

        function applyMetadataFromUI(level = refs.ENGINE?.editor?.workingLevel) {
            if (!level) return;
            level.designerName = (refs.UI.getValue('levelDesignerInput', '') || '').trim();
            level.description = (refs.UI.getValue('levelDescriptionInput', '') || '').trim();
            const rawDifficulty = refs.UI.getValue('levelDifficultyInput', '');
            const n = parseInt(rawDifficulty, 10);
            level.difficulty = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null;
        }

        function syncMetadataFieldsFromLevel(level = refs.ENGINE?.editor?.workingLevel) {
            refs.UI.setInputValue('levelDesignerInput', level?.designerName || '');
            refs.UI.setInputValue('levelDescriptionInput', level?.description || '');
            refs.UI.setInputValue('levelDifficultyInput', level?.difficulty ?? '');
        }

        return {
            init,
            enterEditorMode() { APP.Engine.switchMode(APP.Core.EDITOR); },
            exitEditorMode() { APP.Engine.switchMode(APP.Core.PLAY); },
            loadWorkingLevel(fromLevelObjOrBlank) { refs.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(fromLevelObjOrBlank); refs.ENGINE.editor.isModified = false; },
            commitWorkingLevel() { refs.ENGINE.level = APP.LevelUtils.deepCloneLevel(refs.ENGINE.editor.workingLevel); refs.ENGINE.editor.isModified = false; },
            applyMetricsFromUI() {
                if (!refs.ENGINE?.editor?.workingLevel) return;
                const clampMetric = (n) => Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 0;
                refs.ENGINE.editor.workingLevel.reqLen = clampMetric(parseInt(refs.UI.getValue('editReqLen'), 10));
                refs.ENGINE.editor.workingLevel.reqInt = clampMetric(parseInt(refs.UI.getValue('editReqInt'), 10));
                applyMetadataFromUI(refs.ENGINE.editor.workingLevel);
            },
            setObjectAt(k, obj) {
                refs.ENGINE.editor.draggedObject = obj;
                return placeEditorObject(k);
            },
            removeObjectAt(k) {
                refs.ENGINE.editor.draggedObject = null;
                return pickUpObject(k);
            },
            validateWorkingLevel() {
                return validateLevelDetailed(refs.ENGINE.editor.workingLevel);
            },
            setTrapSpots(spots = new Set()) {
                refs.ENGINE.editor.validTrapSpots = spots || new Set();
            },
            resetWorkingGrid() {
                this.saveEditorState();
                const l = refs.ENGINE.editor.workingLevel;
                Object.assign(l, {gateKeys: [], goalKey: -1, falseGoalKeys: new Set(), blockSet: new Set(), gooseSet: new Set(), mustPassKeys: [], mustCrossKeys: [], filterMap: new Map(), flippingFilterMap: new Map(), portalMap: new Map(), portalVisuals: []});
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.ENGINE.isDirty = true;
            },
            createNewLevel() {
                refs.ENGINE.editor.workingLevel = { grid: { w: 10, h: 10 }, reqLen: 0, reqInt: 0, goalKey: -1, falseGoalKeys: new Set(), gateKeys: [], blockSet: new Set(), gooseSet: new Set(), portalMap: new Map(), portalVisuals: [], filterMap: new Map(), flippingFilterMap: new Map(), mustPassKeys: [], mustCrossKeys: [], hints: [], designerName: '', description: '', difficulty: null };
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.UI.setSolutionOutput('');
                refs.ENGINE.hinter.pathList = [];
                refs.ENGINE.editor.pendingPortal = null;
                refs.ENGINE.editor.validTrapSpots.clear();
                refs.UI.setModalContent('levelTitle', '??', 'text');
                refs.UI.setInputValue('editReqLen', 0);
                refs.UI.setInputValue('editReqInt', 0);
                syncMetadataFieldsFromLevel(refs.ENGINE.editor.workingLevel);
                refs.ENGINE.editor.isPencilMode = false;
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
                refs.ENGINE.editor.isModified = true;
                APP.UI.updateViewport();
            },
            markEditorInputsDirty() {
                refs.ENGINE.hinter.pathList = [];
                refs.ENGINE.editor.validTrapSpots.clear();
                refs.ENGINE.editor.isModified = true;
            },
            handlePaletteToolPointerDown(toolType, options = {}) {
                if (refs.ENGINE.mode !== APP.Core.EDITOR && refs.ENGINE.mode !== APP.Core.REVIEW) return;
                if (refs.ENGINE.overlayState !== APP.Core.OVERLAY_NONE) return;
                refs.ENGINE.editor.draggedFromGrid = false;
                refs.ENGINE.editor.emptyClickCount = 0;
                if (refs.ENGINE.editor.pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
                    refs.UI.showMessage('Finish portal pair!', 'text-white font-black');
                    return;
                }
                const forceActivate = !!options.forceActivate;
                if (refs.ENGINE.editor.selectedTool === toolType && !forceActivate) {
                    refs.ENGINE.editor.selectedTool = null;
                    refs.UI.setPaletteSelectedByType(toolType, false);
                    refs.ENGINE.editor.draggedObject = null;
                    APP.Engine.setLogicState(APP.Core.IDLE);
                } else {
                    refs.ENGINE.editor.selectedTool = toolType;
                    refs.ENGINE.editor.draggedObject = { type: toolType };
                    APP.Engine.setLogicState(APP.Core.EDIT_DRAG);
                    refs.UI.clearPaletteSelection();
                    refs.UI.setPaletteSelectedByType(toolType, true);
                }
                refs.ENGINE.editor.isPencilMode = false;
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
            },
            togglePencilMode() {
                if (refs.ENGINE.overlayState !== APP.Core.OVERLAY_NONE) return;
                refs.ENGINE.editor.isPencilMode = !refs.ENGINE.editor.isPencilMode;
                if (refs.ENGINE.editor.isPencilMode) {
                    refs.ENGINE.editor.selectedTool = null;
                    refs.UI.clearPaletteSelection();
                } else {
                    APP.Engine.setLogicState(APP.Core.IDLE);
                }
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
            },
            setWorkingHints(hints = []) { if (refs.ENGINE?.editor?.workingLevel) refs.ENGINE.editor.workingLevel.hints = hints; },
            pickUpObject(k) { return pickUpObject(k); },
            placeEditorObject(k) { return placeEditorObject(k); },
            validateLevelDetailed(level) { return validateLevelDetailed(level); },
            saveEditorState() { return saveEditorState(); },
            restoreEditorState() { return restoreEditorState(); },
            validateLevel(level) { return validateLevel(level); },
            generateLevelString() { return generateLevelString(); },
            setLogicState(newState) { return APP.Engine.setLogicState(newState); },
            setOverlayState(newState) { return APP.Engine.setOverlayState(newState); },
            getRealLength(state = APP.State.ENGINE) { return APP.Engine.getRealLength(state); },
            rebuildDerivedPathState(state = APP.State.ENGINE) { return APP.Engine.rebuildDerivedPathState(state); },
            assertStateConsistency(state = APP.State.ENGINE) { return APP.Engine.assertStateConsistency(state); },
            updatePencilState() { return APP.Engine.updatePencilState(); },
            applyMetadataFromUI,
            syncMetadataFieldsFromLevel
        };
    })();

    APP.Editor.init({ ENGINE: APP.State.ENGINE, UI: APP.UI });
}
