export function installUI(APP) {
    APP.UI = (() => {
        const dom = {};
        let messageTimer = null;
        let solverAbortRequested = false;

        const addClass = (el, cls) => { if (el && cls) el.classList.add(cls); };
        const removeClass = (el, cls) => { if (el && cls) el.classList.remove(cls); };
        const toggleClass = (el, cls, force) => { if (el && cls) el.classList.toggle(cls, force); };
        const setText = (el, value = '') => { if (el) el.textContent = `${value}`; };
        const setHTML = (el, value = '') => { if (el) el.innerHTML = `${value}`; };
        const setStyle = (el, key, value) => { if (el) el.style[key] = value; };
        const safeEnable = (el, enabled = true) => { if (el) el.disabled = !enabled; };
        const show = (el, displayClass = 'flex') => { if (!el) return; removeClass(el, 'hidden'); if (displayClass) addClass(el, displayClass); };
        const hide = (el, displayClass = 'flex') => { if (!el) return; addClass(el, 'hidden'); if (displayClass) removeClass(el, displayClass); };

        const initDom = () => {
            if (dom.__inited) return;
            dom.__inited = true;
            [
                'loadingOverlay','loadPercent','loadProgressBar','loadStatusLabel','loadErrorMessage',
                'message','searchIndicator','searchLabel','solverDetailLabel','solverCloseBtn','solverTimer','solverProgressBar','solverProgressPct',
                'guideModal','editorHelpModal','winModal','themeModal','unsavedModal',
                'gooseJumpScare','bombJumpScare','alertOverlay','hintBtn','solutionOutput','completionBurst',
                'themeEditList','themeSelectView','themeEditView','dragGhost',
            ].forEach(id => { dom[id] = document.getElementById(id); });
        };

        const resolveEl = (idOrEl) => {
            if (!idOrEl) return null;
            if (typeof idOrEl !== 'string') return idOrEl;
            if (dom[idOrEl]) return dom[idOrEl];
            const found = document.getElementById(idOrEl);
            if (found) dom[idOrEl] = found;
            return found;
        };
        const getEl = (key) => resolveEl(key);

        const stripAlertTextColorClasses = (className = '') => `${className}`
            .split(/\s+/)
            .filter(token => token && !/^!?text-/.test(token))
            .join(' ');

        const setStatus = (text = '', severity = 'info', className = '') => {
            const el = getEl('message');
            if (!el) return;
            const safeClassName = stripAlertTextColorClasses(className);
            el.className = `font-black text-[var(--theme-alert-text)] text-[0.9rem] uppercase tracking-tighter architectural-tight leading-tight drop-shadow-lg ${safeClassName}`.trim();
            el.dataset.severity = severity;
            setText(el, text);
        };

        const setProgress = ({ phase = '', current = null, total = null, pct = null, detail = '', mode = '' } = {}) => {
            if (pct !== null && pct !== undefined) {
                const clamped = Math.max(0, Math.min(100, Number(pct)));
                setText(getEl('loadPercent'), `${Math.round(clamped)}%`);
                setStyle(getEl('loadProgressBar'), 'width', `${clamped}%`);
            }
            const parts = [];
            if (phase) parts.push(phase);
            if (current !== null && total !== null) parts.push(`${current}/${total}`);
            if (detail) parts.push(detail);
            if (mode) parts.push(mode);
            if (parts.length) setText(getEl('loadStatusLabel'), parts.join(' • '));
        };

        const showOverlay = (key) => show(getEl(key));
        const hideOverlay = (key) => hide(getEl(key));
        const setOverlayOpacity = (key, value) => setStyle(getEl(key), 'opacity', value);

        const openModal = (id) => removeClass(resolveEl(id), 'hidden');
        const closeModal = (id) => addClass(resolveEl(id), 'hidden');
        const isModalOpen = (id) => {
            const el = resolveEl(id);
            return !!el && !el.classList.contains('hidden');
        };

        const toggleModal = (id, force = null) => {
            const el = resolveEl(id);
            if (!el) return false;
            const next = (force === null) ? el.classList.contains('hidden') : force;
            toggleClass(el, 'hidden', !next);
            return next;
        };

        const setModalContent = (id, value, mode = 'text') => {
            const el = resolveEl(id);
            if (!el) return;
            if (mode === 'html') setHTML(el, value);
            else setText(el, value);
        };

        const setFieldValue = (id, value = '') => {
            const el = resolveEl(id);
            if (!el) return;
            el.value = `${value}`;
        };

        const appendFieldLine = (id, line = '') => {
            const el = resolveEl(id);
            if (!el) return;
            el.value += `${line}\n`;
            el.scrollTop = el.scrollHeight;
        };

        const clearElement = (id) => {
            const el = resolveEl(id);
            if (!el) return;
            setHTML(el, '');
        };

        const setButtonLabel = (idOrEl, label = "") => {
            const el = resolveEl(idOrEl);
            if (!el) return;
            setText(el, label);
        };

        const setButtonState = (id, { enabled = true, active = null, label = null, className = null } = {}) => {
            const el = resolveEl(id);
            if (!el) return;
            safeEnable(el, enabled);
            if (active !== null) toggleClass(el, 'selected', !!active);
            if (label !== null) setText(el, label);
            if (className !== null) el.className = className;
        };

        const setClassState = (idOrEl, cls, on) => {
            const el = resolveEl(idOrEl);
            if (!el) return;
            toggleClass(el, cls, !!on);
        };
        const clearClass = (selector, cls) => {
            document.querySelectorAll(selector).forEach(el => removeClass(el, cls));
        };
        const queryAll = (selector) => Array.from(document.querySelectorAll(selector));
        const bindAll = (selector, eventName, handler) => {
            queryAll(selector).forEach(el => el.addEventListener(eventName, (e) => handler(e, el)));
        };
        const addClasses = (el, classes = []) => { if (!el) return; classes.forEach(cls => addClass(el, cls)); };
        const removeClasses = (el, classes = []) => { if (!el) return; classes.forEach(cls => removeClass(el, cls)); };
        const setInlineStyle = (idOrEl, key, value) => {
            const el = resolveEl(idOrEl);
            setStyle(el, key, value);
        };
        const setTextContent = (idOrEl, value = '') => {
            const el = resolveEl(idOrEl);
            setText(el, value);
        };
        const setInputValue = (idOrEl, value = '') => {
            const el = resolveEl(idOrEl);
            if (el) el.value = value;
        };
        const setSolutionOutput = (value = '') => setFieldValue('solutionOutput', value);
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
            const outputEl = resolveEl('winSolutionOutput');
            if (outputEl) outputEl.value = `${solutionOutput}`;
            const exportAreaEl = resolveEl('winExportArea');
            if (exportAreaEl) exportAreaEl.classList.toggle('hidden', !showExportArea);
        };
        const updateLevelDisplay = (index, isComplete = false, displayOverride = null) => {
            const lvlStr = displayOverride !== null ? displayOverride : `${index + 1}`;
            setModalContent('levelTitle', lvlStr, 'text');
            setInlineStyle('levelTitle', 'fontSize', lvlStr.length >= 3 ? '2.5rem' : '');
            setCompletionBurstVisible(!!isComplete);
        };
        const getValue = (idOrEl, fallback = '') => {
            const el = resolveEl(idOrEl);
            return el ? el.value : fallback;
        };
        const getChecked = (idOrEl, fallback = false) => {
            const el = resolveEl(idOrEl);
            return el ? !!el.checked : fallback;
        };
        const getNumber = (idOrEl, fallback = 0) => {
            const v = parseInt(getValue(idOrEl, `${fallback}`), 10);
            return Number.isNaN(v) ? fallback : v;
        };

        const clearPaletteSelection = () => {
            queryAll('.palette-item.selected').forEach(x => removeClass(x, 'selected'));
        };
        const setPaletteSelectedByType = (type, selected) => {
            const el = queryAll('.palette-item[data-type]').find(node => node.dataset.type === type);
            if (el) toggleClass(el, 'selected', !!selected);
        };

        const setRootCssVar = (name, value) => {
            document.documentElement.style.setProperty(name, value);
        };
        const setBodyStyle = (key, value) => setStyle(document.body, key, value);
        const queryOne = (idOrEl, selector) => {
            const el = resolveEl(idOrEl);
            return el ? el.querySelector(selector) : null;
        };

        const getViewportDimensions = () => {
            const vv = window.visualViewport;
            if (vv) return { width: vv.width, height: vv.height };
            return { width: window.innerWidth, height: window.innerHeight };
        };

        const measureGridModalRect = () => {
            const appLayout = document.getElementById('appLayout');
            const canvasContainer = document.getElementById('canvasContainer');
            const modalRectSource = canvasContainer || appLayout;
            if (!modalRectSource) return;
            const modalRect = modalRectSource.getBoundingClientRect();
            setRootCssVar('--grid-modal-left', `${modalRect.left}px`);
            setRootCssVar('--grid-modal-top', `${modalRect.top}px`);
            setRootCssVar('--grid-modal-width', `${modalRect.width}px`);
            setRootCssVar('--grid-modal-height', `${modalRect.height}px`);
        };

        const updateViewport = () => { const canvas = APP.Renderer.getCanvas(); const rect = canvas.getBoundingClientRect(); if (rect.width === 0) return; const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; if (!l) return; const swaps = [1, 3, 6, 7]; APP.State.ENGINE.viewport.swapped = swaps.includes(APP.State.ENGINE.variant); const gridW = APP.State.ENGINE.viewport.swapped ? l.grid.h : l.grid.w, gridH = APP.State.ENGINE.viewport.swapped ? l.grid.w : l.grid.h; APP.State.ENGINE.viewport.cellW = canvas.width / gridW; APP.State.ENGINE.viewport.cellH = canvas.height / gridH; APP.State.ENGINE.isDirty = true; };

        const syncEditorPalettePlacement = () => {
            const pal = document.getElementById('editorPalette');
            const gamePane = document.getElementById('gamePane');
            const controlsPane = document.getElementById('controlsPane');
            if (!pal || !gamePane || !controlsPane) return;
            if (pal.parentElement !== gamePane.parentElement) gamePane.parentElement.insertBefore(pal, controlsPane);
        };

        const updateLayoutMode = () => {
            APP.UI.syncEditorPalettePlacement();
            measureGridModalRect();
            requestAnimationFrame(() => measureGridModalRect());
        };

        const updateAppScale = () => {
            const VIEWPORT_EPSILON = 2;
            const viewport = getViewportDimensions();
            const widthChanged = Math.abs(viewport.width - APP.State.ENGINE.viewport.lastWidth) > VIEWPORT_EPSILON;
            const heightChanged = Math.abs(viewport.height - APP.State.ENGINE.viewport.lastHeight) > VIEWPORT_EPSILON;
            APP.UI.updateLayoutMode();
            if (!widthChanged && !heightChanged) return;
            APP.State.ENGINE.viewport.lastWidth = viewport.width;
            APP.State.ENGINE.viewport.lastHeight = viewport.height;
            const scale = Math.min(viewport.height * 0.02, viewport.width * 0.035);
            setRootCssVar('--app-scale', `${scale}px`);
            APP.UI.updateViewport();
            APP.State.ENGINE.isDirty = true;
        };

        const showGooseJumpScare = () => {
            const overlay = getEl('gooseJumpScare');
            show(overlay);
        };

        const hideGooseJumpScare = () => {
            const overlay = getEl('gooseJumpScare');
            hide(overlay);
        };

        const showBombDetonation = ({ explodedMarkup } = {}) => {
            const overlay = getEl('bombJumpScare');
            show(overlay);
            if (explodedMarkup) {
                const bomb = overlay ? overlay.querySelector('#scaryBomb') : null;
                setHTML(bomb, explodedMarkup);
            }
        };

        const hideBombDetonation = ({ resetMarkup } = {}) => {
            const overlay = getEl('bombJumpScare');
            hide(overlay);
            if (resetMarkup) {
                const bomb = overlay ? overlay.querySelector('#scaryBomb') : null;
                setHTML(bomb, resetMarkup);
            }
        };

        // Overlay boundary: state decisions live outside APP.UI; APP.UI owns all related DOM rendering/mutations.
        const setSearchIndicatorVisible = (visible) => {
            if (visible) showOverlay('searchIndicator');
            else hideOverlay('searchIndicator');
        };

        const setSolverControlsEnabled = (enabled) => {
            setButtonState('editMegaSolver', { enabled });
            setButtonState('editTrapSpotsBtn', { enabled });
            const hintEl = resolveEl('hintBtn');
            if (!hintEl) return;
            setStyle(hintEl, 'pointerEvents', enabled ? 'auto' : 'none');
            setStyle(hintEl, 'opacity', enabled ? '1' : '0.5');
        };

        const setSolverTimerText = (text) => setModalContent('solverTimer', text, 'text');
        const setSolverDetailText = (text) => setModalContent('solverDetailLabel', text, 'text');
        const setSolverProgress = (pct = 0) => {
            const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
            setStyle(getEl('solverProgressBar'), 'width', `${clamped}%`);
            setText(getEl('solverProgressPct'), `${Math.round(clamped)}%`);
        };

        // setOverlayState updates state only; APP.UI.applyOverlayState renders it.
        const applyOverlayState = (state) => {
            if (state === APP.Core.SOLVER_RUNNING) {
                setSearchIndicatorVisible(true);
                setButtonState('solverCloseBtn', { enabled: true });
                if (!solverAbortRequested) setModalContent('searchLabel', 'Finding Solutions...', 'text');
                if (!solverAbortRequested) setSolverDetailText('Preparing solver…');
                setSolverProgress(0);
                setSolverControlsEnabled(false);
                return;
            }
            setSearchIndicatorVisible(false);
            setButtonState('solverCloseBtn', { enabled: true });
            setSolverControlsEnabled(true);
        };

        const setCompletionBurstVisible = (isVisible) => {
            const burst = resolveEl('completionBurst');
            toggleClass(burst, 'hidden', !isVisible);
        };

        const flashMessage = (text = '', className = '', duration = 1200) => {
            const overlay = getEl('alertOverlay');
            setStatus(text, 'info', className);
            if (!overlay) return;
            removeClass(overlay, 'pointer-events-none');
            setStyle(overlay, 'opacity', text ? '1' : '0');
            if (!text) {
                addClass(overlay, 'pointer-events-none');
                return;
            }
            setTimeout(() => {
                setStyle(overlay, 'opacity', '0');
                addClass(overlay, 'pointer-events-none');
            }, duration);
        };

        const showMessage = (text = '', className = '') => {
            setStatus(text, 'info', className || '');
            const overlay = getEl('alertOverlay');
            if (!overlay) return;
            if (text === '') { setInlineStyle(overlay, 'opacity', '0'); return; }
            setInlineStyle(overlay, 'opacity', '1');
            if (messageTimer) clearTimeout(messageTimer);
            messageTimer = setTimeout(() => { setInlineStyle(overlay, 'opacity', '0'); }, 2000);
        };

        const showSolverAlreadyRunning = () => {
            showMessage('Solver already running.', 'text-amber-600');
        };


        const setSolverAbortRequested = (requested) => {
            solverAbortRequested = !!requested;
        };

        const copyText = async (text, opts = {}) => {
            const value = `${text ?? ''}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(value);
                    return true;
                } catch (_) {}
            }
            const fallbackEl = opts.fallbackEl || (opts.fallbackElId ? resolveEl(opts.fallbackElId) : null);
            if (!fallbackEl) return false;
            if ('value' in fallbackEl) fallbackEl.value = value;
            else fallbackEl.textContent = value;
            if (typeof fallbackEl.select === 'function') fallbackEl.select();
            try {
                return document.execCommand('copy');
            } catch (_) {
                return false;
            }
        };


        const closeAllModals = () => {
            ['guideModal', 'editorHelpModal', 'winModal', 'themeModal', 'unsavedModal'].forEach(id => closeModal(id));
        };

        const reportError = (kind, payload) => {
            const details = payload?.message || payload?.reason || 'Unknown initialization failure.';
            setModalContent('loadErrorMessage', `Startup error (${kind}): ${details}`, 'text');
            removeClass(getEl('loadErrorMessage'), 'hidden');
            setStatus(`Startup error (${kind})`, 'error', 'text-red-200');
        };


        const EditorDragGhost = (() => {
            const getPaletteIconSVG = (type) => {
                if (!type) return '';
                const icon = document.querySelector(`.palette-item[data-type="${type}"] svg`);
                return icon ? icon.outerHTML : '';
            };

            const isPointerOverPalette = (x, y) => {
                const palEl = getEl('editorPalette');
                if (!palEl || palEl.classList.contains('hidden')) return false;
                const palRect = palEl.getBoundingClientRect();
                return x >= palRect.left && x <= palRect.right && y >= palRect.top && y <= palRect.bottom;
            };

            const update = ({ visible = false, x = 0, y = 0, cellSize = 0, type = '', isOverPalette = false } = {}) => {
                const ghostEl = getEl('dragGhost');
                if (!ghostEl) return;
                if (!visible || isOverPalette) {
                    setInlineStyle(ghostEl, 'display', 'none');
                    setModalContent(ghostEl, '', 'html');
                    return;
                }
                const ghostSize = cellSize * 1.15;
                setInlineStyle(ghostEl, 'width', `${ghostSize}px`);
                setInlineStyle(ghostEl, 'height', `${ghostSize}px`);
                setInlineStyle(ghostEl, 'left', `${x}px`);
                setInlineStyle(ghostEl, 'top', `${y}px`);
                if (!getEl('dragGhost').innerHTML) setModalContent(ghostEl, getPaletteIconSVG(type), 'html');
                setInlineStyle(ghostEl, 'display', 'flex');
            };

            return { update, getPaletteIconSVG, isPointerOverPalette };
        })();

        return { initDom, getEl, setStatus, setProgress, showOverlay, hideOverlay, setOverlayOpacity, openModal, closeModal, toggleModal, isModalOpen, setModalContent, setFieldValue, appendFieldLine, setSolutionOutput, renderMetricsPanel, renderWinExportPanel, updateLevelDisplay, clearElement, setButtonLabel, setButtonState, setSearchIndicatorVisible, setSolverControlsEnabled, setSolverTimerText, setSolverDetailText, setSolverProgress, applyOverlayState, setClassState, clearClass, bindAll, addClasses, removeClasses, setInlineStyle, setRootCssVar, setBodyStyle, setTextContent, setInputValue, updateAppScale, updateLayoutMode, syncEditorPalettePlacement, updateViewport, getValue, getChecked, getNumber, clearPaletteSelection, setPaletteSelectedByType, showGooseJumpScare, hideGooseJumpScare, showBombDetonation, hideBombDetonation, setCompletionBurstVisible, flashMessage, closeAllModals, showMessage, showSolverAlreadyRunning, reportError, setSolverAbortRequested, copyText, EditorDragGhost };
    })();
}
