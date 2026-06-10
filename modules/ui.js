import {
    initDom, getEl, resolveEl,
    addClasses, removeClasses, setInlineStyle, setTextContent, setInputValue,
    setButtonLabel, setButtonState, setClassState,
    setFieldValue, appendFieldLine, clearElement, setSolutionOutput,
    queryAll, clearClass, bindAll,
    setRootCssVar, setBodyStyle,
    showOverlay, hideOverlay, setOverlayOpacity,
    getValue, getChecked, getNumber,
    copyText,
    toggleClass, addClass, removeClass,
} from './ui/dom.js';
import { openModal, closeModal, isModalOpen, toggleModal, setModalContent, closeAllModals } from './ui/modal-ui.js';
import { setProgress, reportError }                                                         from './ui/loading-ui.js';
import {
    setStatus, setCompletionBurstVisible,
    flashMessage, showMessage, showSolverAlreadyRunning,
    showGooseJumpScare, hideGooseJumpScare,
    showBombDetonation, hideBombDetonation,
} from './ui/toast-ui.js';
import {
    setSearchIndicatorVisible, setSolverControlsEnabled,
    setSolverTimerText, setSolverDetailText, setSolverProgress,
    setSolverAbortRequested, createSolverOverlayUI,
} from './ui/solver-overlay-ui.js';
import { getViewportDimensions, measureGridModalRect, syncEditorPalettePlacement, createLayoutUI } from './ui/layout-ui.js';
import { EditorDragGhost } from './ui/editor-drag-ghost-ui.js';

export function createUI({ core, getState, getRenderer }) {
    const { updateLayoutMode, updateViewport, updateAppScale } = createLayoutUI({ core, getState, getRenderer });
    const { applyOverlayState }                               = createSolverOverlayUI({ core });

    const renderMetricsPanel = ({ currentLen = 0, reqLen = 0, currentInt = 0, reqInt = 0 } = {}) => {
        const lenEl = resolveEl('lengthInfo');
        if (lenEl) lenEl.innerText = `${currentLen}/${reqLen}`;
        const intEl = resolveEl('intersectionInfo');
        if (!intEl) return;
        intEl.innerText = `${currentInt}/${reqInt}`;
        if (currentInt > reqInt) {
            intEl.classList.remove('text-white');
            intEl.classList.add('text-red-300');
        } else {
            intEl.classList.add('text-white');
            intEl.classList.remove('text-red-300');
        }
    };

    const renderWinExportPanel = ({ solutionOutput = '', showExportArea = false } = {}) => {
        const outputEl    = resolveEl('winSolutionOutput');
        if (outputEl) outputEl.value = `${solutionOutput}`;
        const exportAreaEl = resolveEl('winExportArea');
        if (exportAreaEl) exportAreaEl.classList.toggle('hidden', !showExportArea);
    };

    const updateLevelDisplay = (index, isComplete = false, displayOverride = null) => {
        const lvlStr = displayOverride !== null ? displayOverride : `${index + 1}`;
        setModalContent('levelTitle', lvlStr, 'text');
        const fs = lvlStr.length >= 5 ? '1.6rem' : lvlStr.length >= 3 ? '2.5rem' : '';
        setInlineStyle('levelTitle', 'fontSize', fs);
        setCompletionBurstVisible(!!isComplete);
    };

    const clearPaletteSelection = () => {
        queryAll('.palette-item.selected').forEach(x => removeClass(x, 'selected'));
    };

    const setPaletteSelectedByType = (type, selected) => {
        const el = queryAll('.palette-item[data-type]').find(node => node.dataset.type === type);
        if (el) toggleClass(el, 'selected', !!selected);
    };

    return {
        initDom,
        getEl,
        setStatus,
        setProgress,
        showOverlay,
        hideOverlay,
        setOverlayOpacity,
        openModal,
        closeModal,
        toggleModal,
        isModalOpen,
        setModalContent,
        setFieldValue,
        appendFieldLine,
        setSolutionOutput,
        renderMetricsPanel,
        renderWinExportPanel,
        updateLevelDisplay,
        clearElement,
        setButtonLabel,
        setButtonState,
        setSearchIndicatorVisible,
        setSolverControlsEnabled,
        setSolverTimerText,
        setSolverDetailText,
        setSolverProgress,
        applyOverlayState,
        setClassState,
        clearClass,
        bindAll,
        addClasses,
        removeClasses,
        setInlineStyle,
        setRootCssVar,
        setBodyStyle,
        setTextContent,
        setInputValue,
        updateAppScale,
        updateLayoutMode,
        syncEditorPalettePlacement,
        updateViewport,
        getValue,
        getChecked,
        getNumber,
        clearPaletteSelection,
        setPaletteSelectedByType,
        showGooseJumpScare,
        hideGooseJumpScare,
        showBombDetonation,
        hideBombDetonation,
        setCompletionBurstVisible,
        flashMessage,
        closeAllModals,
        showMessage,
        showSolverAlreadyRunning,
        reportError,
        setSolverAbortRequested,
        copyText,
        EditorDragGhost,
    };
}
