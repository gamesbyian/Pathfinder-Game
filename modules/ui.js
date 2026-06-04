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
        const updateLevelDisplay = (index, isComplete = false) => {
            const lvlStr = `${index + 1}`;
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
            const inLandscape = APP.State.ENGINE.ui.isLandscapeLayout;
            if (inLandscape && APP.State.ENGINE.mode === APP.Core.EDITOR) {
                if (pal.parentElement !== controlsPane) controlsPane.insertBefore(pal, controlsPane.firstChild);
                setClassState(pal, 'landscape-editor-tools', true);
            } else {
                if (pal.parentElement !== gamePane.parentElement) gamePane.parentElement.insertBefore(pal, controlsPane);
                setClassState(pal, 'landscape-editor-tools', false);
            }
        };

        const updateLayoutMode = () => {
            const viewport = getViewportDimensions();
            const naturalLandscape = window.matchMedia('(orientation: landscape)').matches && viewport.width >= 900;
            APP.State.ENGINE.ui.isLandscapeLayout = naturalLandscape || APP.State.ENGINE.ui.forceLandscapeLayout;
            const appLayout = document.getElementById('appLayout');
            setClassState(appLayout, 'forced-landscape', APP.State.ENGINE.ui.forceLandscapeLayout && !naturalLandscape);
            APP.UI.syncEditorPalettePlacement();
            measureGridModalRect();
            requestAnimationFrame(() => measureGridModalRect());
            const orientationBtn = document.getElementById('orientationToggleBtn');
            setTextContent(orientationBtn, APP.State.ENGINE.ui.forceLandscapeLayout ? 'Standard' : 'Landscape');
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

        const applyTheme = (t, opts = {}) => {
            const { themeName = '' } = opts;
            const root = document.documentElement;
            root.style.setProperty('--theme-gate', t.colors.gate); root.style.setProperty('--theme-goal', t.colors.goal); root.style.setProperty('--theme-block', t.colors.block); root.style.setProperty('--theme-block-dot', t.grid); root.style.setProperty('--theme-pin', t.colors.pin); root.style.setProperty('--theme-portal', t.colors.portal); root.style.setProperty('--theme-filter', t.colors.filter); root.style.setProperty('--theme-cross', t.colors.cross); root.style.setProperty('--theme-modal-bg', t.modal.bg); root.style.setProperty('--theme-modal-panel', t.modal.panelBg); root.style.setProperty('--theme-modal-border', t.modal.border); root.style.setProperty('--theme-modal-text', t.modal.text); root.style.setProperty('--theme-modal-muted', t.modal.textMuted); root.style.setProperty('--theme-modal-accent', t.modal.accent); root.style.setProperty('--theme-win-bg', t.win.bg); root.style.setProperty('--theme-win-border', t.win.border); root.style.setProperty('--theme-win-text', t.win.text); root.style.setProperty('--theme-win-accent', t.win.accent); root.style.setProperty('--theme-alert-bg', t.alert?.bg || '#1e40af'); root.style.setProperty('--theme-alert-stroke', t.alert?.stroke || '#93c5fd');
            root.style.setProperty('--theme-alert-text', t.alert?.text || '#ffffff');
            root.style.setProperty('--theme-logo-bg', t.canvasBg); root.style.setProperty('--theme-logo-grid', t.grid); root.style.setProperty('--theme-logo-path', t.path === 'rainbow' ? '#3b82f6' : t.path); root.style.setProperty('--theme-logo-gate', t.colors.gate); root.style.setProperty('--theme-logo-goal', t.colors.goal);
            root.style.setProperty('--theme-burst', t.burst || '#fef9c3'); root.style.setProperty('--theme-check', t.check || '#1e293b');
            root.style.setProperty('--theme-mega-output-bg', t.mega.outputBg); root.style.setProperty('--theme-mega-output-text', t.text.megaOutput); root.style.setProperty('--theme-mega-output-border', t.mega.outputBorder);
            root.style.setProperty('--theme-mega-primary-bg', t.mega.primaryBg); root.style.setProperty('--theme-mega-primary-text', t.text.megaPrimary); root.style.setProperty('--theme-mega-primary-border', t.mega.primaryBorder);
            root.style.setProperty('--theme-mega-secondary-bg', t.mega.secondaryBg); root.style.setProperty('--theme-mega-secondary-text', t.text.megaSecondary); root.style.setProperty('--theme-mega-secondary-border', t.mega.secondaryBorder);
            root.style.setProperty('--theme-mega-gemini-bg', t.mega.geminiBg); root.style.setProperty('--theme-mega-gemini-text', t.text.megaGemini); root.style.setProperty('--theme-mega-gemini-border', t.mega.geminiBorder);
            root.style.setProperty('--theme-mega-copy-bg', t.mega.copyBg); root.style.setProperty('--theme-mega-copy-text', t.text.megaCopy); root.style.setProperty('--theme-mega-copy-border', t.mega.copyBorder);
            root.style.setProperty('--theme-mega-desc-text', t.text.megaDesc);
            root.style.setProperty('--theme-body-text', t.text.body || '#111827');
            root.style.setProperty('--theme-disabled-btn-bg', t.btns.disabled || '#94a3b8');
            root.style.setProperty('--theme-canvas-bg', t.canvasBg);
            root.style.setProperty('--theme-loading-overlay-bg', t.loading.overlayBg);
            root.style.setProperty('--theme-loading-panel-bg', t.loading.panelBg);
            root.style.setProperty('--theme-loading-panel-border', t.loading.panelBorder);
            root.style.setProperty('--theme-loading-title', t.loading.title);
            root.style.setProperty('--theme-loading-status', t.loading.status);
            root.style.setProperty('--theme-loading-percent', t.loading.percent);
            root.style.setProperty('--theme-loading-track', t.loading.track);
            root.style.setProperty('--theme-loading-bar', t.loading.bar);
            root.style.setProperty('--theme-loading-error', t.text.error || t.loading.error);
            root.style.setProperty('--theme-search-overlay-bg', t.search.overlayBg);
            root.style.setProperty('--theme-search-mega-status-text', t.search.megaStatusText);
            root.style.setProperty('--theme-search-mega-status-border', t.search.megaStatusBorder);
            root.style.setProperty('--theme-search-label', t.search.label);
            root.style.setProperty('--theme-search-dot', t.search.dot);
            root.style.setProperty('--theme-search-timer', t.search.timer);
            root.style.setProperty('--theme-search-close', t.search.close);
            root.style.setProperty('--theme-search-close-hover', t.search.closeHover);
            root.style.setProperty('--theme-jumpscare-goose-bg', t.jumpscare.gooseBg);
            root.style.setProperty('--theme-jumpscare-goose-text', t.jumpscare.gooseText);
            root.style.setProperty('--theme-jumpscare-bomb-bg', t.jumpscare.bombBg);
            root.style.setProperty('--theme-jumpscare-bomb-top-text', t.jumpscare.bombTopText);
            root.style.setProperty('--theme-jumpscare-bomb-bottom-text', t.jumpscare.bombBottomText);
            root.style.setProperty('--theme-shell-btn-bg', t.shell.btnBg);
            root.style.setProperty('--theme-shell-btn-bg-hover', t.shell.btnBgHover);
            root.style.setProperty('--theme-shell-btn-text', t.shell.btnText);
            root.style.setProperty('--theme-shell-btn-border', t.shell.btnBorder);
            root.style.setProperty('--theme-shell-audit-bg', t.shell.auditBg || t.shell.btnBg);
            root.style.setProperty('--theme-shell-audit-bg-hover', t.shell.auditBgHover || t.shell.btnBgHover);
            root.style.setProperty('--theme-shell-audit-text', t.shell.auditText || t.shell.btnText);
            root.style.setProperty('--theme-shell-audit-border', t.shell.auditBorder || t.shell.btnBorder);
            root.style.setProperty('--theme-shell-mute-bg', t.shell.muteBg);
            root.style.setProperty('--theme-shell-mute-bg-hover', t.shell.muteBgHover);
            root.style.setProperty('--theme-shell-mute-text', t.shell.muteText);
            root.style.setProperty('--theme-shell-mute-border', t.shell.muteBorder);
            root.style.setProperty('--theme-header-nav-bg', t.header.navBg);
            root.style.setProperty('--theme-header-nav-bg-hover', t.header.navBgHover);
            root.style.setProperty('--theme-header-nav-text', t.header.navText);
            root.style.setProperty('--theme-header-divider', t.header.divider);
            root.style.setProperty('--theme-main-border', t.layout.mainBorder);
            root.style.setProperty('--theme-header-left-border', t.layout.headerLeftBorder);
            root.style.setProperty('--theme-export-border', t.layout.exportBorder);
            root.style.setProperty('--theme-editor-panel-border', t.layout.editorPanelBorder);
            root.style.setProperty('--theme-action-btn-text', t.text.actionBtn);
            root.style.setProperty('--theme-hint-hover', t.btns.hintHover);
            root.style.setProperty('--theme-hint-divider', t.btns.hintDivider);
            root.style.setProperty('--theme-editor-input-bg', t.editor.inputBg);
            root.style.setProperty('--theme-editor-input-text', t.editor.inputText);
            root.style.setProperty('--theme-editor-input-border', t.editor.inputBorder);
            root.style.setProperty('--theme-editor-input-focus', t.editor.inputFocus);
            root.style.setProperty('--theme-theme-editor-panel-bg', t.themeEditor.panelBg);
            root.style.setProperty('--theme-theme-editor-swatch-border', t.themeEditor.swatchBorder);
            root.style.setProperty('--theme-modal-close-hover', t.modal.closeHover);
            root.style.setProperty('--theme-editor-tool-icon', t.editor.toolIcon);
            root.style.setProperty('--theme-editor-palette-shadow', t.editor.paletteShadow);
            root.style.setProperty('--theme-hand-drawn-shadow', t.text.handDrawnShadow);
            root.style.setProperty('--theme-portal-pending', t.colors.portalPending);
            root.style.setProperty('--theme-bomb-blast-ring', t.colors.bombBlastRing);
            root.style.setProperty('--theme-bomb-blast-rays', t.colors.bombBlastRays);
            const leave = APP.Themes.getLeaveThemeColors(t, themeName === 'classic');
            root.style.setProperty('--theme-leave-bg', leave.bg); root.style.setProperty('--theme-leave-hover', leave.hover); root.style.setProperty('--theme-leave-text', leave.text); root.style.setProperty('--theme-leave-border', leave.border);

            document.body.style.backgroundColor = t.bodyBg; APP.Renderer.getCanvas().style.backgroundColor = t.canvasBg; getEl('canvasContainer').style.backgroundColor = t.canvasBg;
            getEl('mainGamePane').style.borderColor = t.layout.mainBorder;
            getEl('headerLeft').style.backgroundColor = t.canvasBg;
            getEl('headerLeft').style.borderRightColor = t.layout.headerLeftBorder;
            getEl('headerMiddle').style.backgroundColor = t.headerLeft;
            getEl('headerRight').style.backgroundColor = t.headerRight;
            getEl('headerBar').style.borderColor = t.grid;
            getEl('levelTitle').style.color = t.text.headerMain;
            getEl('levelLabelText').style.color = t.text.headerSub;
            const ghost = getEl('dragGhost'); ghost.style.backgroundColor = t.ghostBg; ghost.style.borderColor = t.ghostBorder; const pal = getEl('editorPalette'); pal.style.backgroundColor = t.palette.bg; pal.style.borderColor = t.palette.border; queryAll('.palette-item').forEach(item => { item.style.backgroundColor = t.palette.itemBg; item.style.borderColor = t.palette.itemBorder; }); getEl('editCopyMetrics').style.backgroundColor = t.headerLeft; getEl('editCopyMetrics').style.borderColor = t.palette.itemBorder; const pc = getEl('playControls'); pc.style.backgroundColor = t.controls; pc.style.borderColor = t.grid; getEl('undoBtn').style.backgroundColor = t.btns.undo; getEl('resetBtn').style.backgroundColor = t.btns.reset; getEl('guideBtn').style.backgroundColor = t.btns.guide; getEl('whoaBtn').style.backgroundColor = t.btns.whoa;

            getEl('openThemeModalBtn').style.backgroundColor = t.shell.btnBg;
            getEl('openThemeModalBtn').style.color = t.shell.btnText;
            getEl('openThemeModalBtn').style.borderColor = t.shell.btnBorder;
                        getEl('orientationToggleBtn').style.backgroundColor = t.btns.orient || t.btns.modeToggle || t.headerRight || '#1e293b';
            getEl('orientationToggleBtn').style.color = t.text.shellBtn || t.text.megaPrimary || '#ffffff';
            getEl('orientationToggleBtn').style.borderColor = t.grid;

            getEl('hintBtn').style.backgroundColor = t.btns.hint || t.btns.guide || t.headerRight || '#cf6b17'; ['resetBtn','undoBtn','whoaBtn','guideBtn','modeToggleBtn','editResetGrid','editNewLevel','editMegaSolver','editTrapSpotsBtn','editHelpBtn','editModeToggleBtn','editCopyMetrics','hintBtn'].forEach(id=>{const el=getEl(id); if(el) el.style.color=t.text.actionBtn;}); getEl('editResetGrid').style.backgroundColor = t.btns.editClear || t.btns.reset || '#dc2626'; getEl('editNewLevel').style.backgroundColor = t.btns.editNew || t.btns.saved || '#0a8a65'; getEl('editHelpBtn').style.backgroundColor = t.btns.guide; getEl('editMegaSolver').style.backgroundColor = t.btns.solve || t.headerRight || '#c026d3'; getEl('editTrapSpotsBtn').style.backgroundColor = t.btns.editBombs || t.colors.goal || '#ef4444'; getEl('modeToggleBtn').style.backgroundColor = t.btns.modeToggle || t.headerRight || '#1e293b'; getEl('editModeToggleBtn').style.backgroundColor = t.btns.modeToggle || t.headerRight || '#1e293b'; const muteBtn = getEl('muteBtn'); muteBtn.style.backgroundColor = t.shell.muteBg; muteBtn.style.color = t.shell.muteText; muteBtn.style.borderColor = t.shell.muteBorder; getEl('muteIcon').style.color = t.shell.muteText; getEl('muteSlash').style.color = t.shell.muteText; getEl('devCopyBtn').style.backgroundColor = t.btns.copy; getEl('editCopyBtn').style.backgroundColor = t.btns.copy; getEl('devGenBtn').style.backgroundColor = t.btns.gen; getEl('editGenBtn').style.backgroundColor = t.btns.gen; getEl('devCopyBtn').style.color = t.text.utilityBtn; getEl('editCopyBtn').style.color = t.text.utilityBtn; getEl('devGenBtn').style.color = t.text.utilityBtnGen; getEl('editGenBtn').style.color = t.text.utilityBtnGen; getEl('exportLabel').style.color = t.text.metric; queryAll('.metric-label').forEach(el => el.style.color = t.text.metric); getEl('solutionOutput').style.backgroundColor = t.output?.bg || '#0f172a'; getEl('solutionOutput').style.color = t.text.output; getEl('solutionOutput').style.borderColor = t.modal.border; getEl('winSolutionOutput').style.backgroundColor = t.output?.bg || '#0f172a'; getEl('winSolutionOutput').style.color = t.text.output; getEl('winSolutionOutput').style.borderColor = t.modal.border; getEl('gridSizeMinusBtn').style.backgroundColor = t.btns.copy; getEl('gridSizeMinusBtn').style.color = t.btns.muteIcon; getEl('gridSizeMinusBtn').style.borderColor = t.palette.itemBorder; getEl('gridSizePlusBtn').style.backgroundColor = t.btns.copy; getEl('gridSizePlusBtn').style.color = t.btns.muteIcon; getEl('gridSizePlusBtn').style.borderColor = t.palette.itemBorder; getEl('gridRotateBtn').style.backgroundColor = t.btns.copy; getEl('gridRotateBtn').style.color = t.btns.muteIcon; getEl('gridRotateBtn').style.borderColor = t.palette.itemBorder; getEl('gridMirrorBtn').style.backgroundColor = t.btns.copy; getEl('gridMirrorBtn').style.color = t.btns.muteIcon; getEl('gridMirrorBtn').style.borderColor = t.palette.itemBorder; getEl('gridSizeLabel').style.color = t.btns.muteIcon;
            const gArea = getEl('gridControlArea'); if(gArea) { gArea.style.backgroundColor = t.ctrlArea?.bg || '#f8fafc'; gArea.style.borderColor = t.ctrlArea?.border || '#cbd5e1'; }
            const panel = getEl('editorLineGridPanel'); if (panel) { panel.style.borderTopColor = t.layout.editorPanelBorder; panel.style.borderRightColor = t.layout.editorPanelBorder; }
            const dragGhost = getEl('dragGhost'); if (dragGhost) dragGhost.style.borderColor = t.layout.mainBorder;
            const winModalContent = getEl('winModalContent'); getEl('winCircle').style.backgroundColor = t.win.bg; getEl('winCircle').style.borderColor = t.win.border; winModalContent.querySelector('h2').style.color = t.text.winAccent; winModalContent.querySelector('p').style.color = t.text.win; getEl('nextLevelModalBtn').style.color = t.text.winAccent; getEl('dismissWinModalBtn').style.color = t.text.winAccent;
        };

        const closeAllModals = () => {
            ['guideModal', 'editorHelpModal', 'winModal', 'themeModal', 'unsavedModal'].forEach(id => closeModal(id));
        };
        const showMessageCompat = (text = '', className = '') => showMessage(text, className);

        const reportError = (kind, payload) => {
            const details = payload?.message || payload?.reason || 'Unknown initialization failure.';
            setModalContent('loadErrorMessage', `Startup error (${kind}): ${details}`, 'text');
            removeClass(getEl('loadErrorMessage'), 'hidden');
            setStatus(`Startup error (${kind})`, 'error', 'text-red-200');
        };

        // Purpose: theme customization UI state + drag interactions.
        // Owns:
        // - theme editor DOM refs
        // - swatch selection/drag ghost
        // - editor list rendering
        // - edit/select view switching
        // Public API: init, renderAll, renderThemeKey, setSwatchSelected, setDragGhost, openEditorView, closeEditorView.
        // APP.UI.ThemeEditor Public API:
        // - init(): cache theme editor refs used for rendering and view toggles.
        // - renderAll(): render every editable theme block.
        // - renderThemeKey(key): build one theme editor block.
        // - setSwatchSelected(elOrNull): maintain single selected swatch visual state.
        // - setDragGhost({ visible, color, x, y }): render theme drag ghost appearance/position.
        const ThemeEditor = (() => {
            const selectedClasses = ['ring-4', 'ring-[var(--theme-modal-accent)]', 'theme-swatch-selected', 'z-10', 'scale-110'];
            const teDom = { inited: false, list: null, selectView: null, editView: null, ghost: null };
            const ensureInit = () => {
                if (teDom.inited) return;
                teDom.inited = true;
                teDom.list = resolveEl('themeEditList');
                teDom.selectView = resolveEl('themeSelectView');
                teDom.editView = resolveEl('themeEditView');
                teDom.ghost = resolveEl('dragGhost');
                const themeModal = resolveEl('themeModal');
                if (themeModal) {
                    themeModal.addEventListener('pointerdown', ev => {
                        if (interaction.mode === 'armed' && !ev.target.closest('.theme-swatch')) clearArmedSelection();
                    });
                }
            };
            const DRAG_THRESHOLD_PX = 10;
            const swatchMetaByIdx = new Map();
            let nextSwatchIdx = 0;
            const interaction = {
                mode: 'idle',
                pointerId: null,
                srcIdx: null,
                overIdx: null,
                startX: null,
                startY: null,
                moved: false,
                armedIdx: null
            };
            const resetPointerState = () => {
                interaction.pointerId = null;
                interaction.srcIdx = null;
                interaction.overIdx = null;
                interaction.startX = null;
                interaction.startY = null;
                interaction.moved = false;
                interaction.mode = interaction.armedIdx !== null ? 'armed' : 'idle';
            };
            const clearArmedSelection = () => {
                interaction.armedIdx = null;
                setSwatchSelected(null);
                if (interaction.mode === 'armed') interaction.mode = 'idle';
            };
            const getSwatchIdxFromNode = (node) => {
                const swatch = node?.closest?.('.theme-swatch');
                if (!swatch) return null;
                const idx = Number.parseInt(swatch.dataset.swatchIdx, 10);
                if (!Number.isInteger(idx) || !swatchMetaByIdx.has(idx)) return null;
                return idx;
            };
            const getSwatchMeta = (idx) => {
                if (!Number.isInteger(idx)) return null;
                return swatchMetaByIdx.get(idx) || null;
            };
            const updateOverIdxFromPoint = (x, y) => {
                const idx = getSwatchIdxFromNode(document.elementFromPoint(x, y));
                interaction.overIdx = idx;
                return idx;
            };
            const setThemeDragIdle = () => {
                if (APP.State.ENGINE.logicState === APP.Core.THEME_DRAG) APP.Engine.setLogicState(APP.Core.IDLE);
            };
            const setSwatchSelected = (elOrNull) => {
                document.querySelectorAll('.theme-swatch-selected').forEach(el => el.classList.remove(...selectedClasses));
                if (elOrNull) elOrNull.classList.add(...selectedClasses);
            };
            const replaceTargetWithSource = (srcIdx, targetIdx) => {
                const srcMeta = getSwatchMeta(srcIdx);
                const targetMeta = getSwatchMeta(targetIdx);
                if (!srcMeta || !targetMeta || !srcMeta.color || !targetMeta.color || !targetMeta.category) return false;
                if (srcIdx === targetIdx || srcMeta.color === targetMeta.color) return false;
                APP.Themes.replaceThemeColor(targetMeta.themeKey, targetMeta.color, srcMeta.color, targetMeta.category);
                if (APP.Themes.getCurrentTheme && APP.Themes.getCurrentTheme() === targetMeta.themeKey) APP.Themes.applyTheme(targetMeta.themeKey);
                return true;
            };
            const applySwatchReplace = ({ sourceColor, sourceTheme, sourceCategory, targetSwatch }) => {
                if (!targetSwatch || !sourceColor || !sourceTheme || !sourceCategory) return false;
                const targetIdx = getSwatchIdxFromNode(targetSwatch);
                if (targetIdx === null) return false;
                const sourceMeta = {
                    themeKey: sourceTheme,
                    category: sourceCategory,
                    color: sourceColor,
                    el: null
                };
                const tempSourceIdx = -1;
                swatchMetaByIdx.set(tempSourceIdx, sourceMeta);
                const didReplace = replaceTargetWithSource(tempSourceIdx, targetIdx);
                swatchMetaByIdx.delete(tempSourceIdx);
                return didReplace;
            };
            const setDragGhost = ({ visible = false, color = null, x = null, y = null } = {}) => {
                ensureInit();
                const ghost = teDom.ghost;
                if (!ghost) return;
                if (!visible) {
                    ghost.style.display = 'none';
                    ghost.innerHTML = '';
                    return;
                }
                ghost.style.width = '32px';
                ghost.style.height = '32px';
                if (color) ghost.style.backgroundColor = color;
                ghost.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-main-border').trim() || '#000';
                ghost.className = 'flex items-center justify-center rounded shadow-lg border-2 border-dashed fixed pointer-events-none z-[1000]';
                ghost.innerHTML = '';
                ghost.style.display = 'flex';
                if (x !== null) ghost.style.left = `${x}px`;
                if (y !== null) ghost.style.top = `${y}px`;
            };
            const handleSwatchPointerDown = (ev, swatchIdx) => {
                try {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const srcMeta = getSwatchMeta(swatchIdx);
                    if (!srcMeta) return;
                    if (typeof srcMeta.el?.setPointerCapture === 'function') srcMeta.el.setPointerCapture(ev.pointerId);
                    interaction.mode = 'pressing';
                    interaction.pointerId = ev.pointerId;
                    interaction.srcIdx = swatchIdx;
                    interaction.overIdx = swatchIdx;
                    interaction.startX = ev.clientX;
                    interaction.startY = ev.clientY;
                    interaction.moved = false;
                    setDragGhost({ visible: true, color: srcMeta.color, x: ev.clientX, y: ev.clientY });
                    if (APP.State.ENGINE.logicState !== APP.Core.THEME_DRAG) APP.Engine.setLogicState(APP.Core.THEME_DRAG);
                } catch (err) {
                    console.error('Theme swatch pointerdown failed:', err);
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                }
            };
            const handleSwatchPointerMove = (ev) => {
                try {
                    if (interaction.pointerId !== ev.pointerId) return;
                    if (interaction.mode !== 'pressing' && interaction.mode !== 'dragging') return;
                    const dx = Math.abs((interaction.startX ?? ev.clientX) - ev.clientX);
                    const dy = Math.abs((interaction.startY ?? ev.clientY) - ev.clientY);
                    if (!interaction.moved && (dx >= DRAG_THRESHOLD_PX || dy >= DRAG_THRESHOLD_PX)) {
                        interaction.moved = true;
                        interaction.mode = 'dragging';
                    }
                    if (interaction.mode === 'dragging') {
                        setDragGhost({ visible: true, color: getSwatchMeta(interaction.srcIdx)?.color, x: ev.clientX, y: ev.clientY });
                        updateOverIdxFromPoint(ev.clientX, ev.clientY);
                    }
                } catch (err) {
                    console.error('Theme swatch pointermove failed:', err);
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                }
            };
            const handleSwatchPointerUp = (ev, swatchIdx, swatchEl) => {
                try {
                    if (interaction.pointerId !== ev.pointerId) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (typeof swatchEl?.releasePointerCapture === 'function' && swatchEl.hasPointerCapture(ev.pointerId)) swatchEl.releasePointerCapture(ev.pointerId);
                    const modeAtRelease = interaction.mode;
                    const srcIdx = interaction.srcIdx;
                    if (modeAtRelease === 'pressing' && !interaction.moved && Number.isInteger(srcIdx)) {
                        if (Number.isInteger(interaction.armedIdx) && interaction.armedIdx !== srcIdx) {
                            replaceTargetWithSource(interaction.armedIdx, srcIdx);
                            clearArmedSelection();
                        } else {
                            interaction.armedIdx = srcIdx;
                            interaction.mode = 'armed';
                            setSwatchSelected(getSwatchMeta(srcIdx)?.el || null);
                        }
                    } else if (modeAtRelease === 'dragging' && Number.isInteger(srcIdx)) {
                        const targetIdx = updateOverIdxFromPoint(ev.clientX, ev.clientY);
                        if (Number.isInteger(targetIdx) && targetIdx !== srcIdx) replaceTargetWithSource(srcIdx, targetIdx);
                        clearArmedSelection();
                    }
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                } catch (err) {
                    console.error('Theme swatch pointerup failed:', err);
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                }
            };
            const handleSwatchPointerCancel = (ev, swatchEl) => {
                try {
                    if (interaction.pointerId !== ev.pointerId) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (typeof swatchEl?.releasePointerCapture === 'function' && swatchEl.hasPointerCapture(ev.pointerId)) swatchEl.releasePointerCapture(ev.pointerId);
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                } catch (err) {
                    console.error('Theme swatch pointercancel failed:', err);
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                    resetPointerState();
                }
            };

            const renderThemeKey = (themeKey) => {
                const container = document.createElement('div');
                container.className = "flex flex-col gap-2";
                const header = document.createElement('h4');
                header.className = "font-black text-[var(--theme-modal-accent)] uppercase tracking-widest text-sm";
                header.innerText = themeKey.replace('_', ' ');
                container.appendChild(header);
                const t = APP.Themes.THEMES[themeKey] || {};
                const toColorSet = (arr) => new Set(arr.filter(c => c && typeof c === 'string' && c !== 'rainbow'));
                const lineColors = toColorSet([t.modal?.border, t.palette?.border, t.palette?.itemBorder, t.win?.border, t.alert?.stroke, t.ctrlArea?.border, t.mega?.outputBorder, t.mega?.primaryBorder, t.mega?.secondaryBorder, t.mega?.geminiBorder, t.mega?.copyBorder, t.ghostBorder, t.leave?.border, t.loading?.panelBorder, t.loading?.track, t.search?.megaStatusBorder, t.shell?.btnBorder, t.shell?.muteBorder, t.header?.divider, t.layout?.mainBorder, t.layout?.headerLeftBorder, t.layout?.exportBorder, t.layout?.editorPanelBorder, t.themeEditor?.swatchBorder]);
                const btnColors = toColorSet([...Object.values(t.btns || {}), t.leave?.bg, t.leave?.hover, t.shell?.btnBg, t.shell?.btnBgHover, t.shell?.muteBg, t.shell?.muteBgHover, t.header?.navBg, t.header?.navBgHover, t.themeEditor?.panelBg, t.btns?.hintHover]);
                const gridColors = toColorSet([t.colors?.gate, t.colors?.goal, t.colors?.block, t.colors?.pin, t.colors?.pinUnflipped, t.colors?.filter, t.colors?.portal, t.colors?.cross, t.colors?.portalPending, t.colors?.bombBlastRing, t.colors?.bombBlastRays, t.path, t.grid]);
                const miscColors = toColorSet([t.bodyBg, t.canvasBg, t.headerLeft, t.headerRight, t.controls, t.ghostBg, t.modal?.bg, t.modal?.panelBg, t.output?.bg, t.palette?.bg, t.palette?.itemBg, t.palette?.toolBg, t.win?.bg, t.alert?.bg, t.ctrlArea?.bg, t.mega?.outputBg, t.mega?.primaryBg, t.mega?.secondaryBg, t.mega?.geminiBg, t.mega?.copyBg, t.burst, t.check, t.loading?.overlayBg, t.loading?.panelBg, t.search?.overlayBg, t.jumpscare?.gooseBg, t.jumpscare?.bombBg, t.editor?.inputBg]);
                const textColors = toColorSet([t.metricText, t.headerLeftText, t.headerLeftLabel, t.modal?.text, t.modal?.textMuted, t.modal?.accent, t.output?.text, t.win?.text, t.win?.accent, t.text?.modal, t.text?.modalMuted, t.text?.modalAccent, t.text?.output, t.text?.metric, t.text?.headerMain, t.text?.headerSub, t.text?.win, t.text?.winAccent, t.text?.megaDesc, t.text?.megaOutput, t.text?.megaPrimary, t.text?.megaSecondary, t.text?.megaGemini, t.text?.megaCopy, t.text?.body, t.text?.shellBtn, t.leave?.text, t.loading?.title, t.loading?.status, t.loading?.percent, t.loading?.error, t.search?.megaStatusText, t.search?.label, t.search?.timer, t.search?.close, t.search?.closeHover, t.jumpscare?.gooseText, t.jumpscare?.bombTopText, t.jumpscare?.bombBottomText, t.shell?.btnText, t.shell?.muteText, t.header?.navText, t.text?.actionBtn, t.text?.error, t.text?.handDrawnShadow, t.editor?.inputText, t.editor?.inputBorder, t.editor?.inputFocus, t.editor?.toolIcon]);
                const buildSwatch = (c, category) => {
                    const swatch = document.createElement('div');
                    const swatchIdx = nextSwatchIdx++;
                    const swatchClasses = "w-9 h-9 md:w-10 md:h-10 rounded shadow-sm border cursor-pointer hover:scale-110 transition-transform box-border shrink-0";
                    // Ensure the element can be found via .closest('.theme-swatch')
                    swatch.className = `theme-swatch ${swatchClasses}`;
                    swatch.style.backgroundColor = c;
                    swatch.style.pointerEvents = 'auto';
                    swatch.style.borderColor = 'var(--theme-theme-editor-swatch-border)';
                    swatch.draggable = false;
                    swatch.dataset.themeColor = c;
                    swatch.dataset.themeKey = themeKey;
                    swatch.dataset.category = category;
                    swatch.dataset.swatchIdx = `${swatchIdx}`;
                    swatch.style.touchAction = 'none';
                    swatchMetaByIdx.set(swatchIdx, { themeKey, category, color: c, el: swatch });
                    swatch.addEventListener('pointerdown', ev => handleSwatchPointerDown(ev, swatchIdx));
                    swatch.addEventListener('pointermove', handleSwatchPointerMove);
                    swatch.addEventListener('pointerup', ev => handleSwatchPointerUp(ev, swatchIdx, swatch));
                    swatch.addEventListener('pointercancel', ev => handleSwatchPointerCancel(ev, swatch));
                    return swatch;
                };
                const buildSection = (title, colorArr) => {
                    const section = document.createElement('div');
                    section.className = "flex flex-col items-center p-1 rounded min-h-[6.5rem]"; section.style.backgroundColor = "var(--theme-theme-editor-panel-bg)";
                    const ctitle = document.createElement('div');
                    ctitle.className = "text-[0.6rem] font-black uppercase text-[var(--theme-modal-muted)] mb-1.5 tracking-widest text-center";
                    ctitle.innerText = title;
                    section.appendChild(ctitle);
                    const grid = document.createElement('div');
                    grid.className = "grid grid-cols-4 gap-0.5 w-full justify-items-center";
                    colorArr.forEach(c => grid.appendChild(buildSwatch(c, title)));
                    section.appendChild(grid);
                    return section;
                };
                const sectionsContainer = document.createElement('div');
                sectionsContainer.className = "grid grid-cols-2 gap-2 mb-1";
                sectionsContainer.appendChild(buildSection("Buttons", Array.from(btnColors)));
                sectionsContainer.appendChild(buildSection("Grid Items", Array.from(gridColors)));
                sectionsContainer.appendChild(buildSection("Misc", Array.from(miscColors)));
                sectionsContainer.appendChild(buildSection("Lines", Array.from(lineColors)));
                const textRow = document.createElement('div');
                textRow.className = "mb-1";
                textRow.appendChild(buildSection("Text", Array.from(textColors)));
                container.appendChild(sectionsContainer);
                container.appendChild(textRow);
                const aiColorsContainer = document.createElement('div');
                aiColorsContainer.className = "flex flex-col items-center w-full mt-1 rounded p-1.5"; aiColorsContainer.style.backgroundColor = "var(--theme-theme-editor-panel-bg)";
                const aiTitle = document.createElement('div');
                aiTitle.className = "text-[0.55rem] font-black uppercase text-[var(--theme-modal-accent)] mb-1 tracking-widest";
                aiTitle.innerText = "Complementary Palette (AI)";
                aiColorsContainer.appendChild(aiTitle);
                const aiGrid = document.createElement('div');
                aiGrid.className = "flex justify-center gap-1.5 w-full min-h-[2.5rem] flex-wrap items-center";
                aiColorsContainer.appendChild(aiGrid);
                const handleAiGeneration = async () => {
                    aiGrid.innerHTML = '<span class="text-[0.55rem] font-bold text-[var(--theme-modal-muted)] animate-pulse uppercase tracking-widest">Calling Specialist...</span>';
                    const { colors, error } = await APP.Themes.fetchGeminiThemeColors(themeKey, t);
                    if (colors && colors.length >= 6) {
                        const aiColors = APP.Themes.getThemeAiColorsStore();
                        aiColors[themeKey] = colors.slice(0, 6);
                        aiGrid.innerHTML = '';
                        aiColors[themeKey].forEach(c => aiGrid.appendChild(buildSwatch(c, "Misc")));
                    } else {
                        aiGrid.innerHTML = '';
                        const failWrap = document.createElement('div');
                        failWrap.className = "flex flex-col items-center gap-1";
                        const failBtn = document.createElement('button');
                        failBtn.className = "text-[0.55rem] text-red-500 font-bold uppercase tracking-widest hover:scale-105 transition-transform";
                        failBtn.innerText = "Generation Failed - Retry?";
                        failBtn.onclick = handleAiGeneration;
                        const detail = document.createElement('div');
                        detail.className = "text-[0.5rem] text-[var(--theme-modal-muted)] max-w-[16rem] text-center leading-tight";
                        detail.innerText = error || "Unknown Gemini error.";
                        failWrap.appendChild(failBtn);
                        failWrap.appendChild(detail);
                        aiGrid.appendChild(failWrap);
                    }
                };
                const aiColors = APP.Themes.getThemeAiColorsStore();
                if (aiColors[themeKey]) aiColors[themeKey].forEach(c => aiGrid.appendChild(buildSwatch(c, "Misc")));
                else {
                    const genBtn = document.createElement('button');
                    genBtn.className = "bg-[var(--theme-modal-panel)] border border-[var(--theme-modal-border)] text-[var(--theme-modal-text)] px-4 py-2 rounded-lg font-black text-[0.6rem] uppercase tracking-widest shadow-sm hover:brightness-95 transition active:scale-95";
                    genBtn.innerText = "Generate Suggestions";
                    genBtn.onclick = handleAiGeneration;
                    aiGrid.appendChild(genBtn);
                }
                container.appendChild(aiColorsContainer);
                const controlsRow = document.createElement('div');
                controlsRow.className = "flex gap-2 items-center mt-2";
                const textarea = document.createElement('textarea');
                textarea.className = "flex-grow h-8 bg-[var(--theme-modal-panel)] text-[var(--theme-modal-text)] border border-[var(--theme-modal-border)] rounded px-2 py-1.5 text-[0.6rem] font-mono no-scrollbar whitespace-nowrap overflow-x-auto resize-none leading-tight";
                textarea.readOnly = true;
                textarea.placeholder = "Export code will appear here...";
                const exportBtn = document.createElement('button');
                exportBtn.className = "bg-[var(--theme-modal-panel)] border border-[var(--theme-modal-border)] text-[var(--theme-modal-text)] px-3 py-1 rounded font-black text-[0.6rem] uppercase tracking-wider hover:brightness-95 transition shrink-0";
                exportBtn.innerText = "Export";
                exportBtn.onclick = () => {
                    const code = `${themeKey}: ${JSON.stringify(APP.Themes.THEMES[themeKey], null, 2)},`;
                    textarea.value = code;
                    copyText(code, { fallbackEl: textarea, fallbackElId: 'solutionOutput' });
                    const origText = exportBtn.innerText;
                    exportBtn.innerText = "Copied!";
                    setTimeout(() => exportBtn.innerText = origText, 1500);
                };
                const undoBtn = document.createElement('button');
                undoBtn.className = "bg-slate-500 px-3 py-1 rounded font-black text-[0.6rem] uppercase tracking-wider hover:bg-slate-600 transition shadow-sm shrink-0";
                undoBtn.innerText = "Undo";
                const undoStacks = APP.Themes.getThemeUndoStacksStore();
                const canUndo = undoStacks[themeKey] && undoStacks[themeKey].length > 0;
                if (!canUndo) { undoBtn.disabled = true; undoBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
                undoBtn.onclick = () => {
                    if (canUndo) {
                        const prev = undoStacks[themeKey].pop();
                        APP.Themes.THEMES[themeKey] = APP.Core.deepClone(prev);
                        renderAll();
                        APP.Themes.populateThemes();
                    }
                };
                const resetBtn = document.createElement('button');
                resetBtn.className = "bg-red-600 px-3 py-1 rounded font-black text-[0.6rem] uppercase tracking-wider hover:bg-red-700 transition shadow-sm shrink-0";
                resetBtn.innerText = "Reset";
                resetBtn.onclick = () => {
                    const originalThemes = APP.Themes.getOriginalThemesStore();
                    if (originalThemes && originalThemes[themeKey]) {
                        APP.Themes.THEMES[themeKey] = APP.Core.deepClone(originalThemes[themeKey]);
                        undoStacks[themeKey] = [];
                        renderAll();
                        APP.Themes.populateThemes();
                    }
                };
                controlsRow.appendChild(textarea);
                controlsRow.appendChild(exportBtn);
                controlsRow.appendChild(undoBtn);
                controlsRow.appendChild(resetBtn);
                container.appendChild(controlsRow);
                return container;
            };

            const renderAll = () => {
                ensureInit();
                const themeRegistry = APP.Themes.THEMES || {};
                if (!teDom.list || !themeRegistry) return;
                clearArmedSelection();
                resetPointerState();
                teDom.list.innerHTML = '';
                swatchMetaByIdx.clear();
                nextSwatchIdx = 0;
                const keys = Object.keys(themeRegistry).filter(k => k !== 'classic' && k !== 'chaos');
                keys.forEach((key, idx) => {
                    teDom.list.appendChild(renderThemeKey(key));
                    if (idx < keys.length - 1) {
                        const hr = document.createElement('hr');
                        hr.className = "border-[var(--theme-modal-border)] opacity-30 my-4";
                        teDom.list.appendChild(hr);
                    }
                });
            };

            const openEditorView = () => {
                ensureInit();
                if (teDom.selectView) teDom.selectView.classList.add('hidden');
                if (teDom.editView) {
                    teDom.editView.classList.remove('hidden');
                    teDom.editView.classList.add('flex');
                }
                renderAll();
            };

            const closeEditorView = () => {
                ensureInit();
                if (teDom.editView) {
                    teDom.editView.classList.add('hidden');
                    teDom.editView.classList.remove('flex');
                }
                if (teDom.selectView) teDom.selectView.classList.remove('hidden');
                clearArmedSelection();
                resetPointerState();
                setDragGhost({ visible: false });
                setThemeDragIdle();
            };

            return {
                init: ensureInit,
                renderAll,
                renderThemeKey,
                setSwatchSelected,
                setDragGhost,
                openEditorView,
                closeEditorView,
                applySwatchReplace,
                getDragState: () => {
                    const srcMeta = getSwatchMeta(interaction.srcIdx);
                    return {
                        pointerId: interaction.pointerId,
                        isDragging: interaction.mode === 'dragging' || interaction.moved,
                        startX: interaction.startX,
                        startY: interaction.startY,
                        color: srcMeta?.color || null,
                        theme: srcMeta?.themeKey || null,
                        category: srcMeta?.category || null
                    };
                },
                markPointerDrag: () => {
                    if (interaction.mode === 'pressing') {
                        interaction.moved = true;
                        interaction.mode = 'dragging';
                    }
                },
                clearDragState: () => {
                    resetPointerState();
                    setDragGhost({ visible: false });
                    setThemeDragIdle();
                },
                hasTapSelection: () => Number.isInteger(interaction.armedIdx)
            };
        })();

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

        return { initDom, setStatus, setProgress, showOverlay, hideOverlay, setOverlayOpacity, openModal, closeModal, toggleModal, isModalOpen, setModalContent, setFieldValue, appendFieldLine, setSolutionOutput, renderMetricsPanel, renderWinExportPanel, updateLevelDisplay, clearElement, setButtonLabel, setButtonState, setSearchIndicatorVisible, setSolverControlsEnabled, setSolverTimerText, setSolverDetailText, setSolverProgress, applyOverlayState, setClassState, clearClass, bindAll, addClasses, removeClasses, setInlineStyle, setRootCssVar, setBodyStyle, setTextContent, setInputValue, updateAppScale, updateLayoutMode, syncEditorPalettePlacement, updateViewport, getValue, getChecked, getNumber, clearPaletteSelection, setPaletteSelectedByType, showGooseJumpScare, hideGooseJumpScare, showBombDetonation, hideBombDetonation, setCompletionBurstVisible, flashMessage, closeAllModals, showMessage: showMessageCompat, showSolverAlreadyRunning, reportError, setSolverAbortRequested, copyText, applyTheme, ThemeEditor, EditorDragGhost };
    })();
}
