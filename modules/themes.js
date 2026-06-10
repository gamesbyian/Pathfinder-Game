import { deriveTokens, isSeedTheme, randomSeeds }                       from './theme-engine.js';
import { rc, isValidHexColor, toRgb, darkenHex, getLeaveThemeColors,
         normalizeTheme, buildChaosTheme }                              from './theme/theme-normalizer.js';
import { createThemeRegistry, ensureThemeLeaveColors as _ensureThemeLeaveColors } from './theme/theme-registry.js';
import { applyCssVariables }                                            from './theme/css-variable-applier.js';
import { populateThemePicker }                                          from './theme/theme-picker-renderer.js';

export function createThemes({ state, data, getPersistence, ui }) {
    const THEMES = {};  // local fallback when data is not yet loaded

    const { getThemeRegistry, getCurrentTheme, getTheme } = createThemeRegistry(
        { getData: () => data, getState: () => state.ENGINE },
        THEMES
    );

    function applyTheme(name) {
        const themes = getThemeRegistry();
        if (name === 'chaos') { themes.chaos = buildChaosTheme(); }
        state.ENGINE.runtime.currentTheme = name;
        const t = themes[name];
        applyCssVariables(document.documentElement, t);
        getPersistence().persistSessionState();
        state.ENGINE.rainbowActive = (name === 'classic');
        state.ENGINE.isDirty = true;
    }

    function populateThemes() {
        const themes = getThemeRegistry();
        populateThemePicker({ clearElement: ui.clearElement }, themes, getCurrentTheme() || 'classic', applyTheme);
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
}
