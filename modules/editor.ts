import type { RequireDeps } from './state.js';
import { EDITOR, REVIEW, OVERLAY_NONE, IDLE, EDIT_DRAG, PLAY } from './app-constants.js';
import { validateLevelDetailed as validateLevelDetailedImpl } from './domain/level-validation.js';
import { getOccupant, removeOccupant, placeOccupant }        from './editor/editor-occupancy.js';
import { saveEditorSnapshot, restoreEditorSnapshot }         from './editor/editor-history.js';
import { serializeLevel }                                     from './editor/editor-export.js';
import {
    clearEditorTriggerableFalseGoalCells,
    popEditorUndoStack,
    markDirty,
    setEditorDraggedFromGrid,
    setEditorDraggedObject,
    setEditorEmptyClickCount,
    setEditorMetrics,
    setEditorModified,
    resetEditorWorkingGrid,
    setEditorPendingPortal,
    setEditorPencilMode,
    setEditorSelectedTool,
    setEditorWorkingHints,
    setEditorWorkingLevel,
    setLevel,
    toggleEditorPencilMode
} from './state-actions.js';
import { makeLevelProvenance, makeProvenanceEntry } from './domain/level-provenance-types.js';

export function createEditor({ state, ui, levelUtils, solverApi, getEngineRuntime }: RequireDeps<'levelUtils' | 'solverApi'>) {
    // The editor drives the engine only through a narrow EditorRuntimePort, resolved lazily on
    // first use via getEngineRuntime() and memoized. Resolving lazily (rather than via a
    // post-construction init() call) means the editor is fully valid the moment it's constructed:
    // the engine doesn't exist yet when the editor is built (engine takes editor), but the port is
    // only needed at runtime, long after both exist. The port shape is assembled in modules/app.js
    // (createEditorEnginePort). See app.js stage 3 / ADR 0008.
    let _port = null;
    const runtime = () => (_port ??= getEngineRuntime());

    function pickUpObject(k: any) {
        if (state.ENGINE.editor.isPencilMode) return null;
        saveEditorState();
        setEditorDraggedFromGrid(state, true);
        clearEditorTriggerableFalseGoalCells(state);
        const l = state.ENGINE.editor.workingLevel;
        setEditorWorkingHints(state, []);
        const result = removeOccupant(l, k, state.ENGINE.editor.pendingPortal);
        if (!result) {
            popEditorUndoStack(state);
            setEditorDraggedFromGrid(state, false);
            return null;
        }
        setEditorPendingPortal(state, result.pendingPortal);
        markDirty(state);
        if (result.message) ui.showMessage(result.message, result.messageSeverity);
        return { type: result.type };
    }

    function placeEditorObject(k: any) {
        const l = state.ENGINE.editor.workingLevel;
        const toolType = state.ENGINE.editor.draggedObject
            ? state.ENGINE.editor.draggedObject.type
            : state.ENGINE.editor.selectedTool;
        if (!toolType) return;
        const pendingPortal = state.ENGINE.editor.pendingPortal;

        if (pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
            ui.showMessage('Finish portal pair first!', 'error');
            return;
        }

        const isOccupied = !!getOccupant(l, k);
        if (isOccupied) {
            if (toolType === 'eraser') { pickUpObject(k); return; }
            ui.showMessage('Occupied', 'error');
            return;
        }
        if (toolType === 'eraser') return;
        if (toolType === 'portal' && pendingPortal === k) return;

        saveEditorState();
        clearEditorTriggerableFalseGoalCells(state);
        setEditorWorkingHints(state, []);

        const result = placeOccupant(l, k, toolType, pendingPortal);
        if (result.ok) {
            setEditorPendingPortal(state, result.pendingPortal);
            setEditorDraggedObject(state, null);
            markDirty(state);
            if (result.message) ui.showMessage(result.message, result.messageSeverity);
        }
    }

    // Wrapper: passes editor's pendingPortal context; pure logic is in domain/level-validation.js.
    function validateLevelDetailed(l: any, opts: any = {}) {
        return validateLevelDetailedImpl(l, opts, state.ENGINE.editor.pendingPortal);
    }

    function validateLevel(l: any) {
        const res = validateLevelDetailed(l);
        if (!res.ok) ui.showMessage(res.reasons[0], 'error');
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
        markDirty(state);
        ui.showMessage('Undo Grid Action', 'muted');
    }

    async function generateLevelString() {
        const l = state.ENGINE.editor.workingLevel;
        const isValid = validateLevel(l);
        const requiredLength = parseInt(ui.getValue('editReqLen')) || 0;
        const requiredIntersections = parseInt(ui.getValue('editReqInt')) || 0;
        const validateHintPath = (candidatePath: any) => {
            const levelForValidation = levelUtils.deepCloneLevel(l);
            levelForValidation.requiredLength = requiredLength;
            levelForValidation.requiredIntersections = requiredIntersections;
            return solverApi.validateCandidatePath(levelForValidation, candidatePath);
        };
        const normalizedHints: any[] = [];
        const seen = new Set();
        const pushUniqueHint = (candidatePath: any) => {
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

        if (state.ENGINE.nav.path.length > 1) pushUniqueHint(state.ENGINE.nav.path);

        const exportedHints = normalizedHints.slice(0, 5);
        applyMetadataFromUI(l);

        const json = serializeLevel(l, requiredLength, requiredIntersections, exportedHints);
        ui.setSolutionOutput(json);
        await ui.copyText(json, { fallbackElId: 'solutionOutput' });
        setEditorModified(state, false);
        if (isValid) {
            ui.showMessage('Data Generated & Copied!', 'info');
        } else {
            setTimeout(() => ui.showMessage('Data Copied (Check Errors!)', 'info'), 1500);
        }
    }

    function applyMetadataFromUI(level: any = state.ENGINE?.editor?.workingLevel) {
        if (!level) return;
        level.designerName = (ui.getValue('levelDesignerInput', '') || '').trim();
        level.description = (ui.getValue('levelDescriptionInput', '') || '').trim();
        const rawDifficulty = ui.getValue('levelDifficultyInput', '');
        const n = parseInt(rawDifficulty, 10);
        level.difficulty = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null;
    }

    function syncMetadataFieldsFromLevel(level: any = state.ENGINE?.editor?.workingLevel) {
        ui.setInputValue('levelDesignerInput', level?.designerName || '');
        ui.setInputValue('levelDescriptionInput', level?.description || '');
        ui.setInputValue('levelDifficultyInput', level?.difficulty ?? '');
    }

    return {
        enterEditorMode() { runtime().switchMode(EDITOR); },
        exitEditorMode() { runtime().switchMode(PLAY); },
        loadWorkingLevel(fromLevelObjOrBlank: any) {
            setEditorWorkingLevel(state, levelUtils.deepCloneLevel(fromLevelObjOrBlank));
            setEditorModified(state, false);
        },
        commitWorkingLevel() {
            setLevel(state, levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel));
            setEditorModified(state, false);
        },
        applyMetricsFromUI() {
            if (!state.ENGINE?.editor?.workingLevel) return;
            const clampMetric = (n: any) => Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 0;
            setEditorMetrics(state, {
                requiredLength: clampMetric(parseInt(ui.getValue('editReqLen'), 10)),
                requiredIntersections: clampMetric(parseInt(ui.getValue('editReqInt'), 10))
            });
            applyMetadataFromUI(state.ENGINE.editor.workingLevel);
        },
        setObjectAt(k: any, obj: any) {
            setEditorDraggedObject(state, obj);
            return placeEditorObject(k);
        },
        removeObjectAt(k: any) {
            setEditorDraggedObject(state, null);
            return pickUpObject(k);
        },
        validateWorkingLevel() {
            return validateLevelDetailed(state.ENGINE.editor.workingLevel);
        },
        resetWorkingGrid() {
            this.saveEditorState();
            resetEditorWorkingGrid(state);
            runtime().PathNavigator.clear(state.ENGINE);
            markDirty(state);
        },
        createNewLevel() {
            setEditorWorkingLevel(state, { grid: { w: 10, h: 10 }, requiredLength: 0, requiredIntersections: 0, goalKey: -1, falseGoalKeys: new Set(), gateKeys: [], blockSet: new Set(), gooseSet: new Set(), portalMap: new Map(), portalVisuals: [], filterMap: new Map(), flippingFilterMap: new Map(), mustPassKeys: [], mustCrossKeys: [], surroundKeys: [], adjacentTurnKeys: [], adjacentTurnDirs: [], mustPassTurnDirs: new Map(), landmarkMeta: new Map(), hints: [], designerName: '', description: '', difficulty: null, provenance: makeLevelProvenance([makeProvenanceEntry('human', 'authored')]) });
            runtime().PathNavigator.clear(state.ENGINE);
            ui.setSolutionOutput('');
            runtime().clearHintPaths();
            setEditorPendingPortal(state, null);
            clearEditorTriggerableFalseGoalCells(state);
            ui.setModalContent('levelTitle', '??', 'text');
            ui.setInputValue('editReqLen', 0);
            ui.setInputValue('editReqInt', 0);
            syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            setEditorPencilMode(state, false);
            runtime().updatePencilState();
            setEditorModified(state, true);
            ui.updateViewport();
        },
        markEditorInputsDirty() {
            runtime().clearHintPaths();
            clearEditorTriggerableFalseGoalCells(state);
            setEditorModified(state, true);
        },
        handlePaletteToolPointerDown(toolType: any, options: any = {}) {
            if (state.ENGINE.mode !== EDITOR && state.ENGINE.mode !== REVIEW) return;
            if (state.ENGINE.overlayState !== OVERLAY_NONE) return;
            setEditorDraggedFromGrid(state, false);
            setEditorEmptyClickCount(state, 0);
            if (state.ENGINE.editor.pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
                ui.showMessage('Finish portal pair!', 'info');
                return;
            }
            const forceActivate = !!options.forceActivate;
            if (state.ENGINE.editor.selectedTool === toolType && !forceActivate) {
                setEditorSelectedTool(state, null);
                ui.setPaletteSelectedByType(toolType, false);
                setEditorDraggedObject(state, null);
                runtime().setLogicState(IDLE);
            } else {
                setEditorSelectedTool(state, toolType);
                setEditorDraggedObject(state, { type: toolType });
                runtime().setLogicState(EDIT_DRAG);
                ui.clearPaletteSelection();
                ui.setPaletteSelectedByType(toolType, true);
            }
            setEditorPencilMode(state, false);
            runtime().updatePencilState();
        },
        togglePencilMode() {
            if (state.ENGINE.overlayState !== OVERLAY_NONE) return;
            toggleEditorPencilMode(state);
            if (state.ENGINE.editor.isPencilMode) {
                setEditorSelectedTool(state, null);
                ui.clearPaletteSelection();
            } else {
                runtime().setLogicState(IDLE);
            }
            runtime().updatePencilState();
        },
        setWorkingHints(hints: any = []) {
            setEditorWorkingHints(state, hints);
        },
        pickUpObject(k: any)          { return pickUpObject(k); },
        placeEditorObject(k: any)     { return placeEditorObject(k); },
        validateLevelDetailed(level: any) { return validateLevelDetailed(level); },
        saveEditorState()        { return saveEditorState(); },
        restoreEditorState()     { return restoreEditorState(); },
        validateLevel(level: any)     { return validateLevel(level); },
        generateLevelString()    { return generateLevelString(); },
        // Engine delegates — direct passthrough for modules that still call these via editor
        setLogicState(newState: any)  { return runtime().setLogicState(newState); },
        setOverlayState(newState: any){ return runtime().setOverlayState(newState); },
        getRealLength(engineState: any = state.ENGINE) { return runtime().getRealLength(engineState); },
        rebuildDerivedPathState(engineState: any = state.ENGINE) { return runtime().rebuildDerivedPathState(engineState); },
        assertStateConsistency(engineState: any = state.ENGINE) { return runtime().assertStateConsistency(engineState); },
        updatePencilState()      { return runtime().updatePencilState(); },
        applyMetadataFromUI,
        syncMetadataFieldsFromLevel
    };
}
