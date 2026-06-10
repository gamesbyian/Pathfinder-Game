import { deriveTokens, isSeedTheme, randomSeeds }                       from './theme-engine.js';
import { rc, isValidHexColor, toRgb, darkenHex, getLeaveThemeColors,
         normalizeTheme, buildChaosTheme }                              from './theme/theme-normalizer.js';
import { createThemeRegistry, ensureThemeLeaveColors as _ensureThemeLeaveColors } from './theme/theme-registry.js';
import { applyCssVariables }                                            from './theme/css-variable-applier.js';
import { populateThemePicker }                                          from './theme/theme-picker-renderer.js';

export function installThemes(APP) {
    APP.Themes = (() => {
        const THEMES = {};  // local fallback when neither APP.Data nor window.THEMES is available

        const { getThemeRegistry, getCurrentTheme, getTheme } = createThemeRegistry(APP, THEMES);

        function applyTheme(name) {
            const themes = getThemeRegistry();
            if (name === 'chaos') { themes.chaos = buildChaosTheme(); }
            APP.State.ENGINE.runtime.currentTheme = name;
            const t = themes[name];
            applyCssVariables(document.documentElement, t);
            APP.Persistence.persistSessionState();
            APP.State.ENGINE.rainbowActive = (name === 'classic');
            APP.State.ENGINE.isDirty = true;
        }

        function populateThemes() {
            const themes = getThemeRegistry();
            populateThemePicker(APP, themes, getCurrentTheme() || 'classic', applyTheme);
        }

        const api = {
            rc,
            isValidHexColor,
            getCurrentTheme,
            getTheme,
            toRgb,
            darkenHex,
            getLeaveThemeColors,
            normalizeTheme,
            ensureThemeLeaveColors: () => _ensureThemeLeaveColors(getThemeRegistry()),
            applyTheme,
            populateThemes,
            deriveTokens,
            isSeedTheme,
            randomSeeds,
        };
        Object.defineProperty(api, 'THEMES', { get: () => getThemeRegistry() });
        return api;
    })();
}
