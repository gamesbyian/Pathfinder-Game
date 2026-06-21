// @ts-check
import { normalizeTheme, collectThemePaths, REQUIRED_THEME_PATHS } from './theme-normalizer.js';

/**
 * @param {{ getData?: () => any, getState: () => any, getWindow?: () => any }} deps
 * @param {any} localThemes
 */
export function createThemeRegistry({ getData, getState, getWindow = () => (typeof window === 'undefined' ? null : window) }, localThemes) {
    function getThemeRegistry() {
        const data = getData?.();
        if (data && data.isLoaded()) return data.getThemes();
        const win = getWindow();
        if (win?.THEMES && typeof win.THEMES === 'object') return win.THEMES;
        return localThemes;
    }
    const getCurrentTheme = () => getState().runtime.currentTheme;
    /** @param {string} id */
    const getTheme = (id) => getThemeRegistry()[id];
    return { getThemeRegistry, getCurrentTheme, getTheme };
}

/** @param {Record<string, any>} themes @returns {void} */
export function ensureThemeLeaveColors(themes) {
    Object.keys(themes).forEach((/** @type {string} */ key) => {
        themes[key] = normalizeTheme(themes[key], key);
        const paths = collectThemePaths(themes[key]);
        const missing = Array.from(REQUIRED_THEME_PATHS).filter((/** @type {string} */ p) => !paths.has(p));
        if (missing.length) throw new Error(`Theme "${key}" missing schema keys: ${missing.join(', ')}`);
    });
}
