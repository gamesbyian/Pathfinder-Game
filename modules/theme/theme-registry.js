// Theme registry access and validation.

import { normalizeTheme, collectThemePaths, REQUIRED_THEME_PATHS } from './theme-normalizer.js';

export function createThemeRegistry(APP, localThemes) {
    function getThemeRegistry() {
        if (APP.Data && APP.Data.isLoaded()) return APP.Data.getThemes();
        if (window.THEMES && typeof window.THEMES === 'object') return window.THEMES;
        return localThemes;
    }
    const getCurrentTheme = () => APP.State.ENGINE.runtime.currentTheme;
    const getTheme = (id) => getThemeRegistry()[id];
    return { getThemeRegistry, getCurrentTheme, getTheme };
}

export function ensureThemeLeaveColors(themes) {
    Object.keys(themes).forEach(key => {
        themes[key] = normalizeTheme(themes[key], key);
        const paths = collectThemePaths(themes[key]);
        const missing = Array.from(REQUIRED_THEME_PATHS).filter(p => !paths.has(p));
        if (missing.length) throw new Error(`Theme "${key}" missing schema keys: ${missing.join(', ')}`);
    });
}
