// Manages live theme color replacement and per-theme undo stacks.
// Also owns the originalThemes snapshot (captured before any edits).

export function createThemeEditorController(APP) {
    const themeUndoStacks = {};
    let originalThemes = null;

    function initOriginalThemes(themes) {
        if (!originalThemes) {
            originalThemes = themes;
            delete originalThemes['chaos'];
        }
    }

    function replaceThemeColor(themeKey, oldColor, newColor, category) {
        if (!themeUndoStacks[themeKey]) themeUndoStacks[themeKey] = [];
        themeUndoStacks[themeKey].push(APP.Core.deepClone(APP.Themes.THEMES[themeKey]));

        const t = APP.Themes.THEMES[themeKey];
        const LINE_KEY_GROUPS = {
            modal:       ['border'],
            palette:     ['border', 'itemBorder'],
            win:         ['border'],
            alert:       ['stroke'],
            ctrlArea:    ['border'],
            layout:      ['border', 'divider'],
            themeEditor: ['swatchBorder'],
        };
        const replaceInKeys = (obj, keys) => {
            if (!obj) return;
            keys.forEach(key => { if (obj[key] === oldColor) obj[key] = newColor; });
        };

        if (category === 'Buttons') {
            replaceInKeys(t.btns, Object.keys(t.btns || {}));
        } else if (category === 'Grid Items') {
            replaceInKeys(t.colors, Object.keys(t.colors || {}));
            if (t.path === oldColor) t.path = newColor;
            if (t.grid === oldColor) t.grid = newColor;
        } else if (category === 'Misc') {
            ['bodyBg', 'canvasBg', 'headerLeft', 'headerRight', 'controls', 'ghostBg', 'burst', 'check'].forEach(key => {
                if (t[key] === oldColor) t[key] = newColor;
            });
            replaceInKeys(t.modal,       ['bg', 'panelBg', 'closeHover']);
            replaceInKeys(t.output,      ['bg']);
            replaceInKeys(t.palette,     ['bg', 'itemBg', 'toolBg']);
            replaceInKeys(t.win,         ['bg']);
            replaceInKeys(t.alert,       ['bg']);
            replaceInKeys(t.ctrlArea,    ['bg']);
            replaceInKeys(t.mega,        ['outputBg', 'primaryBg', 'secondaryBg', 'geminiBg', 'copyBg']);
            replaceInKeys(t.loading,     ['overlayBg', 'panelBg']);
            replaceInKeys(t.search,      ['overlayBg']);
            replaceInKeys(t.jumpscare,   ['gooseBg', 'bombBg']);
            replaceInKeys(t.shell,       ['btnBg', 'btnBgHover', 'muteBg', 'muteBgHover']);
            replaceInKeys(t.header,      ['navBg', 'navBgHover']);
            replaceInKeys(t.themeEditor, ['panelBg']);
            replaceInKeys(t.editor,      ['inputBg', 'paletteShadow']);
        } else if (category === 'Lines') {
            replaceInKeys(t.modal,       LINE_KEY_GROUPS.modal);
            replaceInKeys(t.palette,     LINE_KEY_GROUPS.palette);
            replaceInKeys(t.win,         LINE_KEY_GROUPS.win);
            replaceInKeys(t.alert,       LINE_KEY_GROUPS.alert);
            replaceInKeys(t.ctrlArea,    LINE_KEY_GROUPS.ctrlArea);
            replaceInKeys(t.layout,      LINE_KEY_GROUPS.layout);
            replaceInKeys(t.themeEditor, LINE_KEY_GROUPS.themeEditor);
            replaceInKeys(t.mega,        ['outputBorder', 'primaryBorder', 'secondaryBorder', 'geminiBorder', 'copyBorder']);
            replaceInKeys(t.loading,     ['panelBorder', 'track']);
            replaceInKeys(t.search,      ['megaStatusBorder']);
            replaceInKeys(t.shell,       ['btnBorder', 'muteBorder']);
            replaceInKeys(t.header,      ['divider']);
            if (t.ghostBorder === oldColor) t.ghostBorder = newColor;
            replaceInKeys(t.leave,       ['border']);
        } else if (category === 'Text') {
            ['metricText', 'headerLeftText', 'headerLeftLabel'].forEach(key => {
                if (t[key] === oldColor) t[key] = newColor;
            });
            replaceInKeys(t.modal,     ['text', 'textMuted', 'accent']);
            replaceInKeys(t.output,    ['text']);
            replaceInKeys(t.win,       ['text', 'accent']);
            replaceInKeys(t.text,      Object.keys(t.text || {}));
            replaceInKeys(t.leave,     ['text']);
            replaceInKeys(t.loading,   ['title', 'status', 'percent', 'error']);
            replaceInKeys(t.search,    ['megaStatusText', 'label', 'timer', 'close', 'closeHover']);
            replaceInKeys(t.jumpscare, ['gooseText', 'bombTopText', 'bombBottomText']);
            replaceInKeys(t.shell,     ['btnText', 'muteText']);
            replaceInKeys(t.header,    ['navText']);
        } else {
            const replaceDeep = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                for (const k in obj) {
                    if (typeof obj[k] === 'object' && obj[k] !== null) replaceDeep(obj[k]);
                    else if (obj[k] === oldColor) obj[k] = newColor;
                }
            };
            replaceDeep(t);
        }

        APP.Themes.populateThemes();
    }

    return {
        replaceThemeColor,
        initOriginalThemes,
        getThemeUndoStacksStore: () => themeUndoStacks,
        getOriginalThemesStore:  () => originalThemes,
    };
}
