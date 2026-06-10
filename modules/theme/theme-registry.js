import { normalizeTheme, collectThemePaths, REQUIRED_THEME_PATHS } from './theme-normalizer.js';

export function createThemeRegistry({ getData, getState }, localThemes) {
    function getThemeRegistry() {
        const data = getData?.();
        if (data && data.isLoaded()) return data.getThemes();
        if (window.THEMES && typeof window.THEMES === 'object') return window.THEMES;
        return localThemes;
    }
    const getCurrentTheme = () => getState().runtime.currentTheme;
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
