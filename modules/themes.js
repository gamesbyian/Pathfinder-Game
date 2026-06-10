import { deriveTokens, isSeedTheme, randomSeeds }                       from './theme-engine.js';
import { rc, isValidHexColor, toRgb, darkenHex, getLeaveThemeColors,
         normalizeTheme, buildChaosTheme }                              from './theme/theme-normalizer.js';
import { parseGeminiSuggestionsText, fetchGeminiThemeColors }           from './theme/theme-suggestion-client.js';
import { createThemeRegistry, ensureThemeLeaveColors as _ensureThemeLeaveColors } from './theme/theme-registry.js';
import { applyCssVariables }                                            from './theme/css-variable-applier.js';
import { populateThemePicker }                                          from './theme/theme-picker-renderer.js';
import { createThemeEditorController }                                  from './theme/theme-editor-controller.js';

export function installThemes(APP) {
    APP.Themes = (() => {
        const themeAiColors = {};
        const THEMES = {};  // local fallback when neither APP.Data nor window.THEMES is available

        const registry          = createThemeRegistry(APP, THEMES);
        const { getThemeRegistry, getCurrentTheme, getTheme } = registry;
        const themeEditor       = createThemeEditorController(APP);

        function applyTheme(name) {
            const themes = getThemeRegistry();
            if (name === 'chaos') { themes.chaos = buildChaosTheme(); }
            APP.State.ENGINE.runtime.currentTheme = name;
            const t = themes[name];
            const leave = getLeaveThemeColors(t, name === 'classic');
            applyCssVariables(document.documentElement, t, leave);

            document.body.style.backgroundColor = t.bodyBg;
            APP.Renderer.getCanvas().style.backgroundColor = t.canvasBg;
            APP.UI.getEl('canvasContainer').style.backgroundColor = t.canvasBg;
            APP.UI.getEl('headerLeft').style.backgroundColor = t.canvasBg;
            APP.UI.getEl('headerMiddle').style.backgroundColor = t.headerLeft;
            APP.UI.getEl('headerRight').style.backgroundColor = t.headerRight;
            APP.UI.getEl('levelTitle').style.color = t.text.headerMain;
            APP.UI.getEl('levelLabelText').style.color = t.text.headerSub;

            const ghost = APP.UI.getEl('dragGhost');
            ghost.style.backgroundColor = t.ghostBg;
            ghost.style.borderColor = t.ghostBorder;

            const pal = APP.UI.getEl('editorPalette');
            pal.style.backgroundColor = t.palette.bg;
            pal.style.borderColor = t.palette.border;
            Array.from(document.querySelectorAll('.palette-item')).forEach(item => {
                item.style.backgroundColor = t.palette.itemBg;
                item.style.borderColor = t.palette.itemBorder;
            });

            const metadataPanel = APP.UI.getEl('levelMetadataPanel');
            if (metadataPanel) {
                metadataPanel.style.backgroundColor = t.palette.bg;
                metadataPanel.style.borderColor = t.palette.border;
                metadataPanel.style.color = t.text.modal;
                metadataPanel.querySelectorAll('.metadata-label').forEach(label => { label.style.color = t.text.metric; });
                metadataPanel.querySelectorAll('.metadata-input').forEach(input => {
                    input.style.backgroundColor = t.editor.inputBg;
                    input.style.color = t.editor.inputText;
                    input.style.borderColor = t.editor.inputBorder;
                });
            }

            APP.UI.getEl('editCopyMetrics').style.backgroundColor = t.headerLeft;
            APP.UI.getEl('editCopyMetrics').style.borderColor = t.palette.itemBorder;
            const pc = APP.UI.getEl('playControls');
            pc.style.backgroundColor = t.controls;
            pc.style.borderColor = t.grid;

            APP.UI.getEl('undoBtn').style.backgroundColor = t.btns.undo;
            APP.UI.getEl('resetBtn').style.backgroundColor = t.btns.reset;
            APP.UI.getEl('guideBtn').style.backgroundColor = t.btns.guide;
            APP.UI.getEl('whoaBtn').style.backgroundColor = t.btns.whoa;
            APP.UI.getEl('hintBtn').style.backgroundColor = t.btns.hint;
            const reviewHintEl = APP.UI.getEl('reviewHintBtn');
            if (reviewHintEl) reviewHintEl.style.backgroundColor = t.btns.hint;

            APP.UI.getEl('openThemeModalBtn').style.backgroundColor = t.shell.btnBg;
            APP.UI.getEl('openThemeModalBtn').style.color = t.shell.btnText;
            APP.UI.getEl('openThemeModalBtn').style.borderColor = t.shell.btnBorder;
            APP.UI.getEl('modeToggleShellBtn').style.backgroundColor = t.shell.btnBg;
            APP.UI.getEl('modeToggleShellBtn').style.color = t.shell.btnText;
            APP.UI.getEl('modeToggleShellBtn').style.borderColor = t.shell.btnBorder;

            ['resetBtn', 'undoBtn', 'whoaBtn', 'guideBtn', 'editResetGrid', 'editNewLevel', 'editMegaSolver', 'editTrapSpotsBtn', 'editHelpBtn', 'editCopyMetrics', 'hintBtn', 'reviewHintBtn', 'reviewPublishedLevelsBtn'].forEach(id => {
                const el = APP.UI.getEl(id);
                if (el) el.style.color = t.text.actionBtn;
            });

            APP.UI.getEl('editResetGrid').style.backgroundColor = t.btns.editClear;
            APP.UI.getEl('editNewLevel').style.backgroundColor = t.btns.editNew;
            APP.UI.getEl('editHelpBtn').style.backgroundColor = t.btns.guide;
            APP.UI.getEl('editMegaSolver').style.backgroundColor = t.btns.solve;
            APP.UI.getEl('editTrapSpotsBtn').style.backgroundColor = t.btns.editBombs;
            const publishedBtn = APP.UI.getEl('reviewPublishedLevelsBtn');
            if (publishedBtn) {
                publishedBtn.style.backgroundColor = t.btns.copy;
                publishedBtn.style.color = t.text.utilityBtn;
                publishedBtn.style.borderColor = t.palette.itemBorder;
            }

            const muteBtn = APP.UI.getEl('muteBtn');
            muteBtn.style.backgroundColor = t.shell.muteBg;
            muteBtn.style.color = t.shell.muteText;
            muteBtn.style.borderColor = t.shell.muteBorder;
            APP.UI.getEl('muteIcon').style.color = t.shell.muteText;
            APP.UI.getEl('muteSlash').style.color = t.shell.muteText;

            APP.UI.getEl('devCopyBtn').style.backgroundColor = t.btns.copy;
            APP.UI.getEl('devGenBtn').style.backgroundColor = t.btns.gen;
            APP.UI.getEl('devCopyBtn').style.color = t.text.utilityBtn;
            APP.UI.getEl('devGenBtn').style.color = t.text.utilityBtnGen;

            APP.UI.getEl('exportLabel').style.color = t.text.metric;
            Array.from(document.querySelectorAll('.metric-label')).forEach(el => el.style.color = t.text.metric);
            APP.UI.getEl('solutionOutput').style.backgroundColor = t.output.bg;
            APP.UI.getEl('solutionOutput').style.color = t.text.output;
            APP.UI.getEl('solutionOutput').style.borderColor = t.modal.border;
            APP.UI.getEl('winSolutionOutput').style.backgroundColor = t.output.bg;
            APP.UI.getEl('winSolutionOutput').style.color = t.text.output;
            APP.UI.getEl('winSolutionOutput').style.borderColor = t.modal.border;

            ['gridSizeMinusBtn', 'gridSizePlusBtn', 'gridRotateBtn', 'gridMirrorBtn'].forEach(id => {
                const el = APP.UI.getEl(id);
                if (el) { el.style.backgroundColor = t.btns.copy; el.style.color = t.btns.muteIcon; el.style.borderColor = t.palette.itemBorder; }
            });
            APP.UI.getEl('gridSizeLabel').style.color = t.btns.muteIcon;

            const gArea = APP.UI.getEl('gridControlArea');
            if (gArea) { gArea.style.backgroundColor = t.ctrlArea.bg; gArea.style.borderColor = t.ctrlArea.border; }

            const winModalContent = APP.UI.getEl('winModalContent');
            APP.UI.getEl('winCircle').style.backgroundColor = t.win.bg;
            APP.UI.getEl('winCircle').style.borderColor = t.win.border;
            winModalContent.querySelector('h2').style.color = t.text.winAccent;
            winModalContent.querySelector('p').style.color = t.text.win;
            APP.UI.getEl('nextLevelModalBtn').style.color = t.text.winAccent;
            APP.UI.getEl('dismissWinModalBtn').style.color = t.text.winAccent;

            APP.Persistence.persistSessionState();
            APP.State.ENGINE.rainbowActive = (name === 'classic');
            APP.State.ENGINE.isDirty = true;
        }

        function populateThemes() {
            themeEditor.initOriginalThemes(APP.Core.deepClone(THEMES));
            const themes = getThemeRegistry();
            populateThemePicker(APP, themes, getCurrentTheme() || 'classic', applyTheme);
        }

        const api = {
            rc,
            isValidHexColor,
            parseGeminiSuggestionsText,
            fetchGeminiThemeColors,
            getCurrentTheme,
            getTheme,
            toRgb,
            darkenHex,
            getLeaveThemeColors,
            normalizeTheme,
            ensureThemeLeaveColors: () => _ensureThemeLeaveColors(getThemeRegistry()),
            applyTheme,
            populateThemes,
            replaceThemeColor:        themeEditor.replaceThemeColor,
            getThemeAiColorsStore:    () => themeAiColors,
            getThemeUndoStacksStore:  themeEditor.getThemeUndoStacksStore,
            getOriginalThemesStore:   themeEditor.getOriginalThemesStore,
            deriveTokens,
            isSeedTheme,
            randomSeeds,
        };
        Object.defineProperty(api, 'THEMES', { get: () => getThemeRegistry() });
        return api;
    })();
}
