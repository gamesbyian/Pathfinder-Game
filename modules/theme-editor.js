export function installThemeEditor(APP) {
    APP.UI.ThemeEditor = (() => {
        const selectedClasses = ['ring-4', 'ring-[var(--theme-modal-accent)]', 'theme-swatch-selected', 'z-10', 'scale-110'];
        const teDom = { inited: false, list: null, selectView: null, editView: null, ghost: null };
        const ensureInit = () => {
            if (teDom.inited) return;
            teDom.inited = true;
            teDom.list = APP.UI.getEl('themeEditList');
            teDom.selectView = APP.UI.getEl('themeSelectView');
            teDom.editView = APP.UI.getEl('themeEditView');
            teDom.ghost = APP.UI.getEl('dragGhost');
            const themeModal = APP.UI.getEl('themeModal');
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
            ghost.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-border').trim() || '#000';
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
            const lineColors = toColorSet([t.modal?.border, t.palette?.border, t.palette?.itemBorder, t.win?.border, t.alert?.stroke, t.ctrlArea?.border, t.mega?.outputBorder, t.mega?.primaryBorder, t.mega?.secondaryBorder, t.mega?.geminiBorder, t.mega?.copyBorder, t.ghostBorder, t.leave?.border, t.loading?.panelBorder, t.loading?.track, t.search?.megaStatusBorder, t.shell?.btnBorder, t.shell?.muteBorder, t.header?.divider, t.layout?.border, t.layout?.divider, t.themeEditor?.swatchBorder]);
            const btnColors = toColorSet([...Object.values(t.btns || {}), t.leave?.bg, t.leave?.hover, t.shell?.btnBg, t.shell?.btnBgHover, t.shell?.muteBg, t.shell?.muteBgHover, t.header?.navBg, t.header?.navBgHover, t.themeEditor?.panelBg, t.btns?.hintHover]);
            const gridColors = toColorSet([t.colors?.gate, t.colors?.goal, t.colors?.block, t.colors?.pin, t.colors?.pinUnflipped, t.colors?.filter, t.colors?.portal, t.colors?.cross, t.colors?.portalPending, t.colors?.bombBlastRing, t.colors?.bombBlastRays, t.path, t.grid]);
            const miscColors = toColorSet([t.bodyBg, t.canvasBg, t.headerLeft, t.headerRight, t.controls, t.ghostBg, t.modal?.bg, t.modal?.panelBg, t.output?.bg, t.palette?.bg, t.palette?.itemBg, t.palette?.toolBg, t.win?.bg, t.alert?.bg, t.ctrlArea?.bg, t.mega?.outputBg, t.mega?.primaryBg, t.mega?.secondaryBg, t.mega?.geminiBg, t.mega?.copyBg, t.burst, t.check, t.loading?.overlayBg, t.loading?.panelBg, t.search?.overlayBg, t.jumpscare?.gooseBg, t.jumpscare?.bombBg, t.editor?.inputBg]);
            const textColors = toColorSet([t.metricText, t.headerLeftText, t.headerLeftLabel, t.modal?.text, t.modal?.textMuted, t.modal?.accent, t.output?.text, t.win?.text, t.win?.accent, t.text?.modal, t.text?.modalMuted, t.text?.modalAccent, t.text?.output, t.text?.metric, t.text?.headerMain, t.text?.headerSub, t.text?.win, t.text?.winAccent, t.text?.megaDesc, t.text?.megaOutput, t.text?.megaPrimary, t.text?.megaSecondary, t.text?.megaGemini, t.text?.megaCopy, t.text?.body, t.text?.shellBtn, t.leave?.text, t.loading?.title, t.loading?.status, t.loading?.percent, t.loading?.error, t.search?.megaStatusText, t.search?.label, t.search?.timer, t.search?.close, t.search?.closeHover, t.jumpscare?.gooseText, t.jumpscare?.bombTopText, t.jumpscare?.bombBottomText, t.shell?.btnText, t.shell?.muteText, t.header?.navText, t.text?.actionBtn, t.text?.error, t.text?.handDrawnShadow, t.editor?.inputText, t.editor?.inputBorder, t.editor?.inputFocus, t.editor?.toolIcon]);
            const buildSwatch = (c, category) => {
                const swatch = document.createElement('div');
                const swatchIdx = nextSwatchIdx++;
                const swatchClasses = "w-9 h-9 md:w-10 md:h-10 rounded shadow-sm border cursor-pointer hover:scale-110 transition-transform box-border shrink-0";
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
                APP.UI.copyText(code, { fallbackEl: textarea, fallbackElId: 'solutionOutput' });
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
                if (undoStacks[themeKey] && undoStacks[themeKey].length > 0) {
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
}
