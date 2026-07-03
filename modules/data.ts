import type { DataService } from './ports.js';

export function validateDataSources(
    { levels = [], themes = {} }: { levels?: any[], themes?: any } = {},
): Readonly<{ ok: boolean, errors: readonly string[], warnings: readonly string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(levels)) {
        errors.push('levels must be an array');
    } else {
        levels.forEach((level: any, index: number) => {
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
export function createData(
    { deepClone, getThemes = () => ({}), levels = null, themes = null, hintsSource = null }:
        { deepClone: (v: any) => any, getThemes?: () => any, levels?: any, themes?: any,
          hintsSource?: ((levelNumber: number) => Promise<number[][]>) | null },
): DataService {
    let _levels: any[] = [];
    let _themes: any = {};
    let _loaded = false;
    let _validation = validateDataSources();
    // Lazy per-level hint cache (hardening plan §2): levels.json carries no hints at rest;
    // the full set for a level is fetched on first request and cached. Promises are cached
    // (not results) so concurrent requests share one fetch; a failed fetch is evicted so a
    // later request retries.
    const _hintsCache = new Map<number, Promise<number[][]>>();

    const clone = deepClone;

    const normalizeRawLevel = (raw: any): any => {
        if (!raw || typeof raw !== 'object') return raw;
        if (!raw.grid || typeof raw.grid !== 'object') raw.grid = { w: 10, h: 10 };
        if (typeof raw.grid.w !== 'number') raw.grid.w = 10;
        if (typeof raw.grid.h !== 'number') raw.grid.h = 10;
        return raw;
    };

    const ingest = (opts: any = {}): boolean => {
        const injectedLevels = Array.isArray(opts.levels) ? opts.levels : levels;
        const levelSource = Array.isArray(injectedLevels) ? injectedLevels : [];
        const baseThemes = (getThemes() && typeof getThemes() === 'object') ? getThemes() : {};
        const injectedThemes = (opts.themes && typeof opts.themes === 'object') ? opts.themes : themes;
        const sourceThemes = (injectedThemes && typeof injectedThemes === 'object') ? injectedThemes : {};

        _levels = clone(levelSource).map(normalizeRawLevel);
        _themes = Object.assign({}, clone(baseThemes), clone(sourceThemes));
        _validation = validateDataSources({ levels: _levels, themes: _themes });
        _hintsCache.clear();

        _loaded = true;
        return true;
    };

    const getHints = (levelNumber: number): Promise<number[][]> => {
        const raw = _levels[levelNumber - 1];
        // Levels appended at runtime (published imports) carry their hints inline.
        if (Array.isArray(raw?.hints)) return Promise.resolve(raw.hints);
        const cached = _hintsCache.get(levelNumber);
        if (cached) return cached;
        if (typeof hintsSource !== 'function') return Promise.resolve([]);
        const pending = Promise.resolve(hintsSource(levelNumber))
            .then((hints) => (Array.isArray(hints) ? hints : []))
            .catch((err) => { _hintsCache.delete(levelNumber); throw err; });
        _hintsCache.set(levelNumber, pending);
        return pending;
    };

    const appendLevels = (rawLevels: any[]): void => {
        if (!Array.isArray(rawLevels) || rawLevels.length === 0) return;
        _levels = [..._levels, ...clone(rawLevels).map(normalizeRawLevel)];
        _validation = validateDataSources({ levels: _levels, themes: _themes });
    };

    return {
        ingest,
        appendLevels,
        getLevels: () => _levels,
        getLevel: (index: number) => _levels[index],
        getHints,
        getThemes: () => _themes,
        getTheme: (id: string) => _themes[id],
        getValidation: () => _validation,
        isLoaded: () => _loaded
    };
}
