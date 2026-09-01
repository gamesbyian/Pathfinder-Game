import type { DataService } from './ports.js';
import { upgradeLegacyHints, mergeHints } from './domain/hint-types.js';
import type { Hint } from './domain/hint-types.js';
import { getLevelFingerprint } from './domain/level-fingerprint.js';

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
    { deepClone, getThemes = () => ({}), levels = null, themes = null, hintsSource: initialHintsSource = null,
      firestoreHintsSource: initialFirestoreHintsSource = null }:
        { deepClone: (v: any) => any, getThemes?: () => any, levels?: any, themes?: any,
          // Permissive input type: getHints() always upgrades whatever this returns via
          // upgradeLegacyHints, so a source may return the canonical Hint[] or a legacy bare
          // number[][] — the OUTPUT contract (DataService.getHints) is the strict Promise<Hint[]>.
          // Called with the level's own persistent `id` (never a position — see getHints below).
          hintsSource?: ((id: string) => Promise<any[]>) | null,
          // Supplemental hints saved in Firestore for a level published in THIS corpus, keyed by
          // the level's own fingerprint — see modules/persistence/local-level-hints-repository.ts.
          // Only wired for the published corpus (modules/dev-corpus.ts leaves this null for the
          // stress corpora, which aren't real published levels); null means "no such source",
          // never attempted, so offline/local-only use is unaffected.
          firestoreHintsSource?: ((levelFingerprint: string) => Promise<Hint[]>) | null },
): DataService {
    // Mutable (not a captured const): setHintsSource()/setFirestoreHintsSource() let a caller
    // repoint hint fetches at a different corpus (modules/dev-corpus.ts) without recreating the
    // whole data service.
    let hintsSource = initialHintsSource;
    let firestoreHintsSource = initialFirestoreHintsSource;
    let _levels: any[] = [];
    let _themes: any = {};
    let _loaded = false;
    let _validation = validateDataSources();
    // Lazy per-level hint cache (hardening plan §2): levels.json carries no hints at rest;
    // the full set for a level is fetched on first request and cached. Promises are cached
    // (not results) so concurrent requests share one fetch; a failed fetch is evicted so a
    // later request retries. Keyed by the level object's own identity (not a position or id —
    // see getHints below), which stays stable across calls until the next ingest()/appendLevels
    // (both of which either clear this cache or only add new entries, never mutate existing ones).
    const _hintsCache = new Map<any, Promise<Hint[]>>();

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

    // Merges in whatever's saved in Firestore for this level's fingerprint, on top of whatever
    // local hints were already resolved. Never lets a Firestore hiccup (offline, no connection,
    // fingerprint computation failure) break hint display — falls back to the local set alone.
    const withFirestoreHints = async (raw: any, localHints: Hint[]): Promise<Hint[]> => {
        if (typeof firestoreHintsSource !== 'function') return localHints;
        try {
            const levelFingerprint = await getLevelFingerprint(raw);
            const extra = await firestoreHintsSource(levelFingerprint);
            return extra.length ? mergeHints(localHints, extra) : localHints;
        } catch {
            return localHints;
        }
    };

    // Takes the raw level object itself (as returned by getLevel/getLevels), not a position or
    // id: every real caller already has it in hand, and a level appended at runtime from
    // Firestore's `published_levels` staging (not yet graduated into the git-committed corpus —
    // see docs/archive/level-id-unification-plan.md) has no `id` yet but always carries inline hints, so
    // there's no valid state where a caller could supply an id but not the level. Only levels
    // that DO need the network fetch (no inline hints) are guaranteed to carry `id` by then —
    // every level in a git-committed corpus has one post-migration.
    const getHints = (level: any): Promise<Hint[]> => {
        const cached = _hintsCache.get(level);
        if (cached) return cached;
        // Levels appended at runtime (published imports) carry their hints inline — either the
        // canonical Hint[] shape or (older cached data) a bare path array; upgrade either way.
        const localHintsPromise = Array.isArray(level?.hints)
            ? Promise.resolve(upgradeLegacyHints(level.hints))
            : (typeof hintsSource === 'function'
                ? Promise.resolve(hintsSource(level?.id)).then((hints) => upgradeLegacyHints(Array.isArray(hints) ? hints : []))
                : Promise.resolve([]));
        const pending = localHintsPromise
            .then((localHints) => withFirestoreHints(level, localHints))
            .catch((err) => { _hintsCache.delete(level); throw err; });
        _hintsCache.set(level, pending);
        return pending;
    };

    const appendLevels = (rawLevels: any[]): void => {
        if (!Array.isArray(rawLevels) || rawLevels.length === 0) return;
        _levels = [..._levels, ...clone(rawLevels).map(normalizeRawLevel)];
        _validation = validateDataSources({ levels: _levels, themes: _themes });
    };

    const setHintsSource = (nextHintsSource: ((id: string) => Promise<any[]>) | null): void => {
        hintsSource = nextHintsSource;
        _hintsCache.clear();
    };

    const setFirestoreHintsSource = (nextSource: ((levelFingerprint: string) => Promise<Hint[]>) | null): void => {
        firestoreHintsSource = nextSource;
        _hintsCache.clear();
    };

    return {
        ingest,
        appendLevels,
        getLevels: () => _levels,
        getLevel: (index: number) => _levels[index],
        getHints,
        setHintsSource,
        setFirestoreHintsSource,
        getThemes: () => _themes,
        getTheme: (id: string) => _themes[id],
        getValidation: () => _validation,
        isLoaded: () => _loaded
    };
}
