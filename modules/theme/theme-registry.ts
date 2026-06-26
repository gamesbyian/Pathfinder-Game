import { normalizeTheme, collectThemePaths, REQUIRED_THEME_PATHS } from './theme-normalizer.js';

interface ThemeRegistryDeps { getData?: () => any; getState: () => any; getWindow?: () => any; }

export function createThemeRegistry(
    { getData, getState, getWindow = () => (typeof window === 'undefined' ? null : window) }: ThemeRegistryDeps,
    localThemes: any,
) {
    function getThemeRegistry() {
        const data = getData?.();
        if (data && data.isLoaded()) return data.getThemes();
        const win = getWindow();
        if (win?.THEMES && typeof win.THEMES === 'object') return win.THEMES;
        return localThemes;
    }
    const getCurrentTheme = () => getState().runtime.currentTheme;
    const getTheme = (id: string) => getThemeRegistry()[id];
    return { getThemeRegistry, getCurrentTheme, getTheme };
}

export function ensureThemeLeaveColors(themes: Record<string, any>): void {
    Object.keys(themes).forEach((key: string) => {
        themes[key] = normalizeTheme(themes[key], key);
        const paths = collectThemePaths(themes[key]);
        const missing = Array.from(REQUIRED_THEME_PATHS).filter((p: string) => !paths.has(p));
        if (missing.length) throw new Error(`Theme "${key}" missing schema keys: ${missing.join(', ')}`);
    });
}
