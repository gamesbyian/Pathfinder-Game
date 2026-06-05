export function installData(APP) {
    APP.Data = (() => {
        let _levels = [];
        let _themes = {};
        let _loaded = false;

        const clone = (value) => APP.Core.deepClone(value);

        const normalizeRawLevel = (raw) => {
            if (!raw || typeof raw !== 'object') return raw;
            if (!raw.grid || typeof raw.grid !== 'object') raw.grid = { w: 10, h: 10 };
            if (typeof raw.grid.w !== 'number') raw.grid.w = 10;
            if (typeof raw.grid.h !== 'number') raw.grid.h = 10;
            return raw;
        };

        const ingest = (opts = {}) => {
            const levelSource = Array.isArray(window.LEVELS) ? window.LEVELS : (Array.isArray(window.RAW_LEVELS) ? window.RAW_LEVELS : []);
            const baseThemes = (APP.Themes?.THEMES && typeof APP.Themes.THEMES === 'object') ? APP.Themes.THEMES : {};
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

        const appendLevels = (rawLevels) => {
            if (!Array.isArray(rawLevels) || rawLevels.length === 0) return;
            _levels = [..._levels, ...clone(rawLevels).map(normalizeRawLevel)];
        };

        return {
            ingest,
            appendLevels,
            getLevels: () => _levels,
            getLevel: (index) => _levels[index],
            getThemes: () => _themes,
            getTheme: (id) => _themes[id],
            isLoaded: () => _loaded
        };
    })();
}
