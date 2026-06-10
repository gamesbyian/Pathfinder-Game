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

    // Applies all mode-dependent element visibility in one pass.
    // Called by engine.switchMode and engine.updatePlayModeLayout.
    const applyModeLayout = (mode, { isDevMode = false } = {}) => {
        const isEd         = mode === core.EDITOR;
        const isReview     = mode === core.REVIEW;
        const isEdOrReview = isEd || isReview;
        const el     = id => document.getElementById(id);
        const toggle = (id, hidden) => { const e = el(id); if (e) e.classList.toggle('hidden', hidden); };

        toggle('editorPalette',            !isEdOrReview);
        toggle('levelMetadataPanel',       !isEdOrReview);
        toggle('reviewPublishedLevelsBtn', !isReview);
        toggle('playMetrics',              isEdOrReview);
        toggle('editorMetrics',            !isEdOrReview);
        toggle('gameButtonGrid',           isEdOrReview);
        toggle('editorButtonGrid',         !isEdOrReview);

        const shellToggle = el('modeToggleShellBtn');
        if (shellToggle) shellToggle.textContent = isReview ? 'Exit Review' : (isEd ? 'Play Game' : 'Editor');

        toggle('editResetGrid',    isReview);
        toggle('editMegaSolver',   false);
        toggle('editTrapSpotsBtn', isReview);
        toggle('editHelpBtn',      isReview);
        toggle('reviewHintBtn',    !isReview);
        toggle('reviewSubmitBtn',  !isEdOrReview);
        toggle('reviewApproveBtn', !isReview);
        toggle('reviewRejectBtn',  !isReview);
        setButtonState('reviewSubmitBtn', { enabled: true });

        const devHidden = isEdOrReview || !isDevMode;
        toggle('devCopyBtn', devHidden);
        toggle('devGenBtn',  devHidden);
        toggle('exportArea', isEdOrReview || !isDevMode);
    };

    // Submit-modal step helpers — owns all direct DOM manipulation for the
    // multi-step submission progress UI so controllers stay presentation-free.
    const resetSubmitModal = () => {
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
        document.getElementById('submitModalDismissBtn')?.classList.add('hidden');
    };

    const setSubmitStep = (stepId, status, detail = null) => {
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

    const showSubmitDismiss = () => document.getElementById('submitModalDismissBtn')?.classList.remove('hidden');
    const showSubmitModal   = () => document.getElementById('submitModal')?.classList.remove('hidden');
    const hideSubmitModal   = () => document.getElementById('submitModal')?.classList.add('hidden');

    const setEditorMetrics = (currentLen, intersections) => {
        const lMet = resolveEl('editCopyMetrics');
        if (lMet) lMet.innerText = `Set (${currentLen}/${intersections})`;
    };

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
        setEditorMetrics,
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
        applyModeLayout,
        resetSubmitModal,
        setSubmitStep,
        showSubmitDismiss,
        showSubmitModal,
        hideSubmitModal,
    };
}
