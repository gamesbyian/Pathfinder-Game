// @ts-check
/** @param {{ levels?: any[], themes?: any }} [sources] @returns {Readonly<{ ok: boolean, errors: readonly string[], warnings: readonly string[] }>} */
export function validateDataSources({ levels = [], themes = {} } = {}) {
    /** @type {string[]} */
    const errors = [];
    /** @type {string[]} */
    const warnings = [];

    if (!Array.isArray(levels)) {
        errors.push('levels must be an array');
    } else {
        levels.forEach((/** @type {any} */ level, /** @type {number} */ index) => {
            if (!level || typeof level !== 'object') {
                errors.push(`level ${index + 1} must be an object`);
                return;
            }
            if (!level.goal || typeof level.goal !== 'object') warnings.push(`level ${index + 1} is missing a goal object`);
            if (!Array.isArray(level.gates)) warnings.push(`level ${index + 1} gates should be an array`);
            if (!level.grid || typeof level.grid !== 'object') warnings.push(`level ${index + 1} is missing a grid object; defaults will be applied`);
            else {
                if (!Number.isFinite(level.grid.w) || level.grid.w <= 0) warnings.push(`level ${index + 1} grid.w should be a positive number`);
                if (!Number.isFinite(level.grid.h) || level.grid.h <= 0) warnings.push(`level ${index + 1} grid.h should be a positive number`);
            }
        });
    }

    if (!themes || typeof themes !== 'object' || Array.isArray(themes)) {
        errors.push('themes must be an object map');
    }

    return Object.freeze({
        ok: errors.length === 0,
        errors: Object.freeze(errors),
        warnings: Object.freeze(warnings),
    });
}

/**
 * createData — level and theme data store.
 *
 * Data must be injected explicitly via ingest({ levels, themes }) or via
 * the constructor-level `levels`/`themes` parameters. Window globals are
 * no longer read; explicit injection is required.
 */
/** @param {{ deepClone: Function, getThemes?: () => any, levels?: any, themes?: any }} deps */
export function createData({ deepClone, getThemes = () => ({}), levels = null, themes = null }) {
    /** @type {any[]} */
    let _levels = [];
    /** @type {any} */
    let _themes = {};
    let _loaded = false;
    let _validation = validateDataSources();

    const clone = deepClone;

    /** @param {any} raw @returns {any} */
    const normalizeRawLevel = (raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        if (!raw.grid || typeof raw.grid !== 'object') raw.grid = { w: 10, h: 10 };
        if (typeof raw.grid.w !== 'number') raw.grid.w = 10;
        if (typeof raw.grid.h !== 'number') raw.grid.h = 10;
        return raw;
    };

    /** @param {any} [opts] @returns {boolean} */
    const ingest = (opts = {}) => {
        const injectedLevels = Array.isArray(opts.levels) ? opts.levels : levels;
        const levelSource = Array.isArray(injectedLevels) ? injectedLevels : [];
        const baseThemes = (getThemes() && typeof getThemes() === 'object') ? getThemes() : {};
        const injectedThemes = (opts.themes && typeof opts.themes === 'object') ? opts.themes : themes;
        const sourceThemes = (injectedThemes && typeof injectedThemes === 'object') ? injectedThemes : {};

        _levels = clone(levelSource).map(normalizeRawLevel);
        _themes = Object.assign({}, clone(baseThemes), clone(sourceThemes));
        _validation = validateDataSources({ levels: _levels, themes: _themes });

        _loaded = true;
        return true;
    };

    /** @param {any[]} rawLevels @returns {void} */
    const appendLevels = (rawLevels) => {
        if (!Array.isArray(rawLevels) || rawLevels.length === 0) return;
        _levels = [..._levels, ...clone(rawLevels).map(normalizeRawLevel)];
        _validation = validateDataSources({ levels: _levels, themes: _themes });
    };

    return {
        ingest,
        appendLevels,
        getLevels: () => _levels,
        getLevel: (/** @type {number} */ index) => _levels[index],
        getThemes: () => _themes,
        getTheme: (/** @type {string} */ id) => _themes[id],
        getValidation: () => _validation,
        isLoaded: () => _loaded
    };
}
