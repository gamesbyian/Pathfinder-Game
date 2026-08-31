import {
    initDom, getEl, resolveEl,
    addClasses, removeClasses, setInlineStyle, setTextContent, setInputValue,
    setButtonLabel, setButtonState, setClassState,
    setFieldValue, appendFieldLine, clearElement, setSolutionOutput,
    queryAll, clearClass, bindAll, renderTextList, removeChildren,
    setRootCssVar, setBodyStyle,
    showOverlay, hideOverlay, setOverlayOpacity,
    getValue, getChecked, getNumber,
    copyText, createSvgElement, replaceSvgChildren,
    toggleClass, removeClass,
} from './ui/dom.js';
import { SUBMIT_STEP_IDS } from './ui/submit-steps.js';
import { openModal, closeModal, isModalOpen, toggleModal, setModalContent, closeAllModals } from './ui/modal-ui.js';
import { confirmDialog }                                                                    from './ui/confirm-ui.js';
import { setProgress, showStartupError }                                                    from './ui/loading-ui.js';
import {
    setStatus, setCompletionBurstVisible,
    flashMessage, showMessage, showSolverAlreadyRunning,
    showGooseJumpScare, hideGooseJumpScare,
    showFalseGoalDetonation, hideFalseGoalDetonation,
} from './ui/toast-ui.js';
import {
    setSearchIndicatorVisible, setSolverControlsEnabled,
    setSolverTimerText, setSolverDetailText, setSolverProgress,
    setSolverAbortRequested, createSolverOverlayUI,
} from './ui/solver-overlay-ui.js';
import { syncEditorPalettePlacement, createLayoutUI } from './ui/layout-ui.js';
import { EditorDragGhost } from './ui/editor-drag-ghost-ui.js';
import { renderLevelRatingPane } from './ui/level-rating-ui.js';
import { EDITOR, REVIEW } from './app-constants.js';

export function createUI({ getState }: any) {
    const { updateLayoutMode, updateViewport, updateAppScale } = createLayoutUI({ getState });
    const { applyOverlayState }                               = createSolverOverlayUI();

    // Applies all mode-dependent element visibility in one pass.
    // Called by engine.switchMode and engine.updatePlayModeLayout.
    const applyModeLayout = (mode: any, { isDevMode = false }: any = {}) => {
        const isEd         = mode === EDITOR;
        const isReview     = mode === REVIEW;
        const isEdOrReview = isEd || isReview;
        const el     = (id: any) => (document.getElementById(id) as any);
        const toggle = (id: any, hidden: any) => { const e = el(id); if (e) e.classList.toggle('hidden', hidden); };

        toggle('editorPalette',            !isEdOrReview);
        toggle('levelMetadataPanel',       !isEdOrReview);
        toggle('reviewPublishedLevelsBtn', !isReview);
        toggle('playMetrics',              isEdOrReview);
        toggle('editorMetrics',            !isEdOrReview);
        toggle('gameButtonGrid',           isEdOrReview);
        toggle('editorButtonGrid',         !isEdOrReview);
        if (isEdOrReview) toggle('hintPinRow', true);

        const shellToggle = el('modeToggleShellBtn');
        if (shellToggle) shellToggle.textContent = isReview ? 'Exit Review' : (isEd ? 'Play Game' : 'Editor');

        toggle('editResetGrid',    isReview);
        toggle('solveLevelBtn',   false);
        toggle('editTrapSpotsBtn', isReview);
        toggle('editHelpBtn',      isReview);
        toggle('reviewHintBtn',    !isEdOrReview);
        toggle('reviewSubmitBtn',  !isEdOrReview);
        toggle('reviewApproveBtn', !isReview);
        toggle('reviewRejectBtn',  !isReview);
        setButtonState('reviewSubmitBtn', { enabled: true });

        const devHidden = isEdOrReview || !isDevMode;
        toggle('devCopyBtn', devHidden);
        toggle('devGenBtn',  devHidden);
        toggle('exportArea', isEdOrReview || !isDevMode);
        toggle('reviewModeShellBtn', isReview || !isDevMode);
        toggle('levelRatingPane', !isDevMode);
    };

    // Submit-modal step helpers — owns all direct DOM manipulation for the
    // multi-step submission progress UI so controllers stay presentation-free.
    const resetSubmitModal = () => {
        SUBMIT_STEP_IDS.forEach((id: any) => {
            const el = (document.getElementById(id) as any);
            if (!el) return;
            const icon  = el.querySelector('.sm-icon');
            icon.textContent = '○';
            icon.className = 'sm-icon';
            icon.dataset.status = 'pending';
            const label = el.querySelector('.sm-label');
            label.className = 'sm-label';
            label.dataset.status = 'pending';
            const countdown = el.querySelector('.sm-countdown');
            if (countdown) { countdown.textContent = ''; countdown.classList.add('hidden'); }
            const det = el.querySelector('.sm-detail');
            removeChildren(det);
            det.classList.add('hidden');
        });
        (document.getElementById('submitModalDismissBtn') as any)?.classList.add('hidden');
    };

    const setSubmitStep = (stepId: any, status: any, detail: any = null) => {
        const el = (document.getElementById(stepId) as any);
        if (!el) return;
        const icon     = el.querySelector('.sm-icon');
        const label    = el.querySelector('.sm-label');
        const detailEl = el.querySelector('.sm-detail');
        if (status === 'running') {
            const spinner = document.createElement('div');
            spinner.className = 'sm-spinner';
            icon.replaceChildren(spinner);
            icon.className = 'sm-icon';
            label.className = 'sm-label';
        } else if (status === 'ok') {
            icon.textContent = '✓';
            icon.className = 'sm-icon';
            label.className = 'sm-label';
        } else if (status === 'warn') {
            icon.textContent = '⚠';
            icon.className = 'sm-icon';
            label.className = 'sm-label';
        } else if (status === 'error') {
            icon.textContent = '✗';
            icon.className = 'sm-icon';
            label.className = 'sm-label';
        }
        icon.dataset.status = status;
        label.dataset.status = status;
        // The countdown (see setSubmitStepCountdown) only makes sense while a step is actively
        // running — clear it the moment the step settles into any other status.
        if (status !== 'running') {
            const countdown = label.querySelector('.sm-countdown');
            if (countdown) { countdown.textContent = ''; countdown.classList.add('hidden'); }
        }
        if (detail !== null) {
            renderTextList(detailEl, detail, {
                prefix: '• ',   // line styling via .sm-detail p in components.css
            });
            detailEl.classList.remove('hidden');
        }
    };

    // Countdown shown in brackets beside a running step's label (e.g. "Find solutions (7s)").
    // secondsRemaining === null clears/hides it. Distinct from the general solver overlay's
    // #solverTimer — that overlay renders behind the submit modal (z-index 65 vs 200), so its
    // countdown is invisible for the duration of a submission; this one lives in the modal itself.
    const setSubmitStepCountdown = (stepId: any, secondsRemaining: number | null) => {
        const el = (document.getElementById(stepId) as any);
        const countdown = el?.querySelector('.sm-countdown');
        if (!countdown) return;
        if (secondsRemaining === null) {
            countdown.textContent = '';
            countdown.classList.add('hidden');
            return;
        }
        countdown.textContent = ` (${secondsRemaining}s)`;
        countdown.classList.remove('hidden');
    };

    const showSubmitDismiss = () => (document.getElementById('submitModalDismissBtn') as any)?.classList.remove('hidden');
    const showSubmitModal   = () => (document.getElementById('submitModal') as any)?.classList.remove('hidden');
    const hideSubmitModal   = () => (document.getElementById('submitModal') as any)?.classList.add('hidden');

    const setEditorMetrics = (currentLen: any, intersections: any) => {
        const lMet = resolveEl('editCopyMetrics');
        if (lMet) lMet.textContent = `Set (${currentLen}/${intersections})`;
    };

    const renderMetricsPanel = ({ currentLen = 0, requiredLength = 0, currentInt = 0, requiredIntersections = 0 }: any = {}) => {
        const lenEl = resolveEl('lengthInfo');
        if (lenEl) lenEl.textContent = `${currentLen}/${requiredLength}`;
        const intEl = resolveEl('intersectionInfo');
        if (!intEl) return;
        intEl.textContent = `${currentInt}/${requiredIntersections}`;
        intEl.dataset.status = currentInt > requiredIntersections ? 'over' : 'normal';
    };

    const renderWinExportPanel = ({ solutionOutput = '', showExportArea = false }: any = {}) => {
        const outputEl    = resolveEl('winSolutionOutput');
        if (outputEl) outputEl.value = `${solutionOutput}`;
        const exportAreaEl = resolveEl('winExportArea');
        if (exportAreaEl) exportAreaEl.classList.toggle('hidden', !showExportArea);
    };

    const updateLevelDisplay = (index: any, isComplete: any = false, displayOverride: any = null) => {
        const lvlStr = displayOverride !== null ? displayOverride : `${index + 1}`;
        setModalContent('levelTitle', lvlStr, 'text');
        const fs = lvlStr.length >= 5 ? '1.6rem' : lvlStr.length >= 3 ? '2.5rem' : '';
        setInlineStyle('levelTitle', 'fontSize', fs);
        setCompletionBurstVisible(!!isComplete);
    };

    const clearPaletteSelection = () => {
        queryAll('.palette-item.selected').forEach((x: any) => removeClass(x, 'selected'));
    };

    const setPaletteSelectedByType = (type: any, selected: any) => {
        const el = queryAll('.palette-item[data-type]').find((node) => (node as HTMLElement).dataset.type === type);
        if (el) toggleClass(el, 'selected', !!selected);
    };

    const PENCIL_ICON_PATHS = {
        inactive: {
            viewBox: '0 0 490.667 490.667',
            paths: [
                'M459.113,31.24c-41.654-41.654-109.199-41.654-150.853,0L21.647,317.854c-3.425,3.425-5.583,7.915-6.118,12.729L0.447,466.348c-1.509,13.587,9.971,25.068,23.558,23.558l135.765-15.083c4.815-0.535,9.304-2.693,12.729-6.118L399.827,241.38c0.007-0.007,0.016-0.013,0.023-0.021l59.264-59.264c20.827-20.827,31.241-48.127,31.24-75.427C490.354,79.368,479.941,52.068,459.113,31.24z M428.943,151.923l-44.18,44.18l-90.512-90.512l44.179-44.179c24.991-24.992,65.521-24.992,90.513,0c12.495,12.495,18.743,28.875,18.744,45.255C447.687,123.048,441.439,139.428,428.943,151.923z M147.622,433.245L45.797,444.557l11.312-101.825L264.081,135.76l90.513,90.513L147.622,433.245z',
                'M232.839,448h-21.333c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h21.333c11.782,0,21.333-9.551,21.333-21.333C254.172,457.551,244.621,448,232.839,448z',
                'M467.506,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C488.839,457.551,479.288,448,467.506,448z',
                'M360.839,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C382.172,457.551,372.621,448,360.839,448z',
            ],
        },
        active: {
            viewBox: '0 0 490.612 490.612',
            paths: [
                'M254.172,447.945h-21.333c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h21.333c11.797,0,21.333-9.557,21.333-21.333S265.97,447.945,254.172,447.945z',
                'M467.506,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S479.303,447.945,467.506,447.945z',
                'M360.839,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S372.636,447.945,360.839,447.945z',
                'M459.109,182.04c41.579-41.6,41.579-109.269,0-150.848c-41.6-41.6-109.291-41.579-150.848,0l-44.181,44.181l150.848,150.848L459.109,182.04z',
                'M21.652,317.799c-3.435,3.435-5.589,7.915-6.123,12.736L0.446,466.3c-0.704,6.443,1.536,12.843,6.123,17.429c4.011,4.032,9.451,6.251,15.083,6.251c0.789,0,1.557-0.043,2.347-0.128l135.787-15.083c4.8-0.533,9.301-2.688,12.715-6.123L384.766,256.38L233.918,105.532L21.652,317.799z',
            ],
        },
    };

    const updatePencilButton = (isPencilMode: any) => {
        const btn = (document.getElementById('editPencilBtn') as any);
        if (!btn) return;
        const svg = btn.querySelector('svg');
        if (!svg) return;
        const icon = isPencilMode ? PENCIL_ICON_PATHS.active : PENCIL_ICON_PATHS.inactive;
        btn.classList.toggle('selected', isPencilMode);
        svg.setAttribute('viewBox', icon.viewBox);
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('stroke', 'none');
        replaceSvgChildren(svg, icon.paths.map((d: any) => createSvgElement('path', { d })));
    };

    const showDiverseSearchResult = (heading: any, lines: any, { showExtend = false }: any = {}) => {
        setModalContent('diverseSearchResultHeading', heading, 'text');
        renderTextList('diverseSearchResultDetail', lines);   // line styling via #diverseSearchResultDetail p
        setClassState('diverseSearchExtendSection', 'hidden', !showExtend);
        openModal('diverseSearchResultModal');
    };

    const setOptionsBlockedVisible = (visible: any) => {
        const el = (document.getElementById('playOptionsBlockedModal') as any);
        if (el) el.classList.toggle('hidden', !visible);
    };

    const applyHintPinState = (isAnimating: any, isPinned: any, canPinHeatmap: any = false, isHeatmapPinned: any = false) => {
        const pinRow       = (document.getElementById('hintPinRow') as any);
        const pinBtn       = (document.getElementById('pinHintBtn') as any);
        const clearBtn     = (document.getElementById('clearHintBtn') as any);
        const pinHeatBtn   = (document.getElementById('pinHeatMapBtn') as any);
        const clearHeatBtn = (document.getElementById('clearHeatMapBtn') as any);
        if (!pinRow || !pinBtn || !clearBtn) return;
        const showRow = isAnimating || isPinned || canPinHeatmap || isHeatmapPinned;
        pinRow.classList.toggle('hidden', !showRow);
        pinBtn.classList.toggle('hidden', !isAnimating);
        clearBtn.classList.toggle('hidden', !isPinned);
        if (pinHeatBtn) pinHeatBtn.classList.toggle('hidden', !canPinHeatmap);
        if (clearHeatBtn) clearHeatBtn.classList.toggle('hidden', !isHeatmapPinned);
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
        confirmDialog,
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
        showFalseGoalDetonation,
        hideFalseGoalDetonation,
        setCompletionBurstVisible,
        flashMessage,
        closeAllModals,
        showMessage,
        showSolverAlreadyRunning,
        showStartupError,
        setSolverAbortRequested,
        copyText,
        EditorDragGhost,
        applyModeLayout,
        resetSubmitModal,
        setSubmitStep,
        setSubmitStepCountdown,
        showSubmitDismiss,
        showSubmitModal,
        hideSubmitModal,
        updatePencilButton,
        setOptionsBlockedVisible,
        applyHintPinState,
        showDiverseSearchResult,
        renderLevelRatingPane,
    };
}
