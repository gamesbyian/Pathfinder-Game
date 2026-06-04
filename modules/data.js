export function installData(APP) {
    APP.Data = (() => {
        let _levels = [];
        let _themes = {};
        let _loaded = false;

        const clone = (value) => APP.Core.deepClone(value);

        const normalizeRawLevel = (raw) => {
            if (!raw || typeof raw !== 'object') return raw;
            const level = raw;
            if (!level.grid || typeof level.grid !== 'object') level.grid = { w: 10, h: 10 };
            if (typeof level.grid.w !== 'number') level.grid.w = 10;
            if (typeof level.grid.h !== 'number') level.grid.h = 10;
            return level;
        };

        const ingest = (opts = {}) => {
            const levelSource = Array.isArray(window.LEVELS) ? window.LEVELS : (Array.isArray(window.RAW_LEVELS) ? window.RAW_LEVELS : []);
            const baseThemes = (typeof APP !== 'undefined' && APP.Themes && APP.Themes.THEMES && typeof APP.Themes.THEMES === 'object') ? APP.Themes.THEMES : {};
            const sourceThemes = (window.THEMES && typeof window.THEMES === 'object') ? window.THEMES : {};

            _levels = clone(levelSource).map(normalizeRawLevel);
            _themes = Object.assign({}, clone(baseThemes), clone(sourceThemes));

            _loaded = true;

            if (opts.secureGlobals !== false) {
                try {
                    window.LEVELS = null;
                    window.RAW_LEVELS = null;
                    window.THEMES = null;
                } catch (_) {}
            }
            return true;
        };

        return {
            ingest,
            getLevels: () => _levels,
            getLevel: (index) => _levels[index],
            getThemes: () => _themes,
            getTheme: (id) => (_themes ? _themes[id] : undefined),
            isLoaded: () => _loaded
        };
    })();
}
