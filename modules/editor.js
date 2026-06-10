import { validateLevelDetailed as validateLevelDetailedImpl } from './domain/level-validation.js';
import { getOccupant, removeOccupant, placeOccupant }        from './editor/editor-occupancy.js';
import { saveEditorSnapshot, restoreEditorSnapshot }         from './editor/editor-history.js';
import { serializeLevel }                                     from './editor/editor-export.js';

export function createEditor({ core, state, ui, levelUtils, solverV2 }) {
    // engine is injected late via init() to break the engine↔editor circular dep.
    let _engine = null;
    const init = ({ engine }) => { _engine = engine; };

    function pickUpObject(k) {
        if (state.ENGINE.editor.isPencilMode) return null;
        saveEditorState();
        state.ENGINE.editor.draggedFromGrid = true;
        state.ENGINE.editor.validTrapSpots.clear();
        const l = state.ENGINE.editor.workingLevel;
        l.hints = [];
        const result = removeOccupant(l, k, state.ENGINE.editor.pendingPortal);
        if (!result) {
            state.ENGINE.editor.undoStack.pop();
            state.ENGINE.editor.draggedFromGrid = false;
            return null;
        }
        state.ENGINE.editor.pendingPortal = result.pendingPortal;
        state.ENGINE.isDirty = true;
        if (result.message) ui.showMessage(result.message, result.messageCls);
        return { type: result.type };
    }

    function placeEditorObject(k) {
        const l = state.ENGINE.editor.workingLevel;
        const toolType = state.ENGINE.editor.draggedObject
            ? state.ENGINE.editor.draggedObject.type
            : state.ENGINE.editor.selectedTool;
        if (!toolType) return;
        const pendingPortal = state.ENGINE.editor.pendingPortal;

        if (pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
            ui.showMessage('Finish portal pair first!', 'text-red-600 font-bold');
            return;
        }

        const isOccupied = !!getOccupant(l, k);
        if (isOccupied) {
            if (toolType === 'eraser') { pickUpObject(k); return; }
            ui.showMessage('Occupied', 'text-red-500');
            return;
        }
        if (toolType === 'eraser') return;
        if (toolType === 'portal' && pendingPortal === k) return;

        saveEditorState();
        state.ENGINE.editor.validTrapSpots.clear();
        l.hints = [];

        const result = placeOccupant(l, k, toolType, pendingPortal);
        if (result.ok) {
            state.ENGINE.editor.pendingPortal = result.pendingPortal;
            state.ENGINE.editor.draggedObject = null;
            state.ENGINE.isDirty = true;
            if (result.message) ui.showMessage(result.message, result.messageCls);
        }
    }

    // Wrapper: passes editor's pendingPortal context; pure logic is in domain/level-validation.js.
    function validateLevelDetailed(l, opts = {}) {
        return validateLevelDetailedImpl(l, opts, state.ENGINE.editor.pendingPortal);
    }

    function validateLevel(l) {
        const res = validateLevelDetailed(l);
        if (!res.ok) ui.showMessage(res.reasons[0], 'text-red-500 font-bold');
        return res.ok;
    }

    function saveEditorState() {
        saveEditorSnapshot(
            state.ENGINE.editor,
            state.ENGINE.hinter,
            levelUtils.deepCloneLevel
        );
    }

    function restoreEditorState() {
        const result = restoreEditorSnapshot(state.ENGINE.editor, state.ENGINE.hinter);
        if (!result) return;
        state.ENGINE.isDirty = true;
        ui.showMessage('Undo Grid Action', 'text-slate-500');
    }

    async function generateLevelString() {
        const l = state.ENGINE.editor.workingLevel;
        const isValid = validateLevel(l);
        const reqLen = parseInt(ui.getValue('editReqLen')) || 0;
        const reqInt = parseInt(ui.getValue('editReqInt')) || 0;
        const validateHintPath = (candidatePath) => {
            const levelForValidation = levelUtils.deepCloneLevel(l);
            levelForValidation.reqLen = reqLen;
            levelForValidation.reqInt = reqInt;
            return solverV2.validateCandidatePath(levelForValidation, candidatePath);
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

        const liveHints = Array.isArray(state.ENGINE.foundHintsSinceLoad) ? state.ENGINE.foundHintsSinceLoad : [];
        liveHints.forEach(pushUniqueHint);

        if (state.ENGINE.path.length > 1) pushUniqueHint(state.ENGINE.path);

        const exportedHints = normalizedHints.slice(0, 5);
        applyMetadataFromUI(l);

        const json = serializeLevel(l, reqLen, reqInt, exportedHints);
        ui.setSolutionOutput(json);
        await ui.copyText(json, { fallbackElId: 'solutionOutput' });
        state.ENGINE.editor.isModified = false;
        if (isValid) {
            ui.showMessage('Data Generated & Copied!', 'text-white font-black');
        } else {
            setTimeout(() => ui.showMessage('Data Copied (Check Errors!)', 'text-white font-black'), 1500);
        }
    }

    function applyMetadataFromUI(level = state.ENGINE?.editor?.workingLevel) {
        if (!level) return;
        level.designerName = (ui.getValue('levelDesignerInput', '') || '').trim();
        level.description = (ui.getValue('levelDescriptionInput', '') || '').trim();
        const rawDifficulty = ui.getValue('levelDifficultyInput', '');
        const n = parseInt(rawDifficulty, 10);
        level.difficulty = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null;
    }

    function syncMetadataFieldsFromLevel(level = state.ENGINE?.editor?.workingLevel) {
        ui.setInputValue('levelDesignerInput', level?.designerName || '');
        ui.setInputValue('levelDescriptionInput', level?.description || '');
        ui.setInputValue('levelDifficultyInput', level?.difficulty ?? '');
    }

    return {
        init,
        enterEditorMode() { _engine.switchMode(core.EDITOR); },
        exitEditorMode() { _engine.switchMode(core.PLAY); },
        loadWorkingLevel(fromLevelObjOrBlank) {
            state.ENGINE.editor.workingLevel = levelUtils.deepCloneLevel(fromLevelObjOrBlank);
            state.ENGINE.editor.isModified = false;
        },
        commitWorkingLevel() {
            state.ENGINE.level = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
            state.ENGINE.editor.isModified = false;
        },
        applyMetricsFromUI() {
            if (!state.ENGINE?.editor?.workingLevel) return;
            const clampMetric = (n) => Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 0;
            state.ENGINE.editor.workingLevel.reqLen = clampMetric(parseInt(ui.getValue('editReqLen'), 10));
            state.ENGINE.editor.workingLevel.reqInt = clampMetric(parseInt(ui.getValue('editReqInt'), 10));
            applyMetadataFromUI(state.ENGINE.editor.workingLevel);
        },
        setObjectAt(k, obj) {
            state.ENGINE.editor.draggedObject = obj;
            return placeEditorObject(k);
        },
        removeObjectAt(k) {
            state.ENGINE.editor.draggedObject = null;
            return pickUpObject(k);
        },
        validateWorkingLevel() {
            return validateLevelDetailed(state.ENGINE.editor.workingLevel);
        },
        setTrapSpots(spots = new Set()) {
            state.ENGINE.editor.validTrapSpots = spots || new Set();
        },
        resetWorkingGrid() {
            this.saveEditorState();
            const l = state.ENGINE.editor.workingLevel;
            Object.assign(l, { gateKeys: [], goalKey: -1, falseGoalKeys: new Set(), blockSet: new Set(), gooseSet: new Set(), mustPassKeys: [], mustCrossKeys: [], filterMap: new Map(), flippingFilterMap: new Map(), portalMap: new Map(), portalVisuals: [] });
            _engine.PathNavigator.clear(state.ENGINE);
            state.ENGINE.isDirty = true;
        },
        createNewLevel() {
            state.ENGINE.editor.workingLevel = { grid: { w: 10, h: 10 }, reqLen: 0, reqInt: 0, goalKey: -1, falseGoalKeys: new Set(), gateKeys: [], blockSet: new Set(), gooseSet: new Set(), portalMap: new Map(), portalVisuals: [], filterMap: new Map(), flippingFilterMap: new Map(), mustPassKeys: [], mustCrossKeys: [], hints: [], designerName: '', description: '', difficulty: null };
            _engine.PathNavigator.clear(state.ENGINE);
            ui.setSolutionOutput('');
            state.ENGINE.hinter.pathList = [];
            state.ENGINE.editor.pendingPortal = null;
            state.ENGINE.editor.validTrapSpots.clear();
            ui.setModalContent('levelTitle', '??', 'text');
            ui.setInputValue('editReqLen', 0);
            ui.setInputValue('editReqInt', 0);
            syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            state.ENGINE.editor.isPencilMode = false;
            _engine.updatePencilState();
            state.ENGINE.editor.isModified = true;
            ui.updateViewport();
        },
        markEditorInputsDirty() {
            state.ENGINE.hinter.pathList = [];
            state.ENGINE.editor.validTrapSpots.clear();
            state.ENGINE.editor.isModified = true;
        },
        handlePaletteToolPointerDown(toolType, options = {}) {
            if (state.ENGINE.mode !== core.EDITOR && state.ENGINE.mode !== core.REVIEW) return;
            if (state.ENGINE.overlayState !== core.OVERLAY_NONE) return;
            state.ENGINE.editor.draggedFromGrid = false;
            state.ENGINE.editor.emptyClickCount = 0;
            if (state.ENGINE.editor.pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
                ui.showMessage('Finish portal pair!', 'text-white font-black');
                return;
            }
            const forceActivate = !!options.forceActivate;
            if (state.ENGINE.editor.selectedTool === toolType && !forceActivate) {
                state.ENGINE.editor.selectedTool = null;
                ui.setPaletteSelectedByType(toolType, false);
                state.ENGINE.editor.draggedObject = null;
                _engine.setLogicState(core.IDLE);
            } else {
                state.ENGINE.editor.selectedTool = toolType;
                state.ENGINE.editor.draggedObject = { type: toolType };
                _engine.setLogicState(core.EDIT_DRAG);
                ui.clearPaletteSelection();
                ui.setPaletteSelectedByType(toolType, true);
            }
            state.ENGINE.editor.isPencilMode = false;
            _engine.updatePencilState();
        },
        togglePencilMode() {
            if (state.ENGINE.overlayState !== core.OVERLAY_NONE) return;
            state.ENGINE.editor.isPencilMode = !state.ENGINE.editor.isPencilMode;
            if (state.ENGINE.editor.isPencilMode) {
                state.ENGINE.editor.selectedTool = null;
                ui.clearPaletteSelection();
            } else {
                _engine.setLogicState(core.IDLE);
            }
            _engine.updatePencilState();
        },
        setWorkingHints(hints = []) {
            if (state.ENGINE?.editor?.workingLevel) state.ENGINE.editor.workingLevel.hints = hints;
        },
        pickUpObject(k)          { return pickUpObject(k); },
        placeEditorObject(k)     { return placeEditorObject(k); },
        validateLevelDetailed(level) { return validateLevelDetailed(level); },
        saveEditorState()        { return saveEditorState(); },
        restoreEditorState()     { return restoreEditorState(); },
        validateLevel(level)     { return validateLevel(level); },
        generateLevelString()    { return generateLevelString(); },
        // Engine delegates — direct passthrough for modules that still call these via editor
        setLogicState(newState)  { return _engine.setLogicState(newState); },
        setOverlayState(newState){ return _engine.setOverlayState(newState); },
        getRealLength(engineState = state.ENGINE) { return _engine.getRealLength(engineState); },
        rebuildDerivedPathState(engineState = state.ENGINE) { return _engine.rebuildDerivedPathState(engineState); },
        assertStateConsistency(engineState = state.ENGINE) { return _engine.assertStateConsistency(engineState); },
        updatePencilState()      { return _engine.updatePencilState(); },
        applyMetadataFromUI,
        syncMetadataFieldsFromLevel
    };
}
