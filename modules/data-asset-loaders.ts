// Runtime JSON fetch primitives for the bundled data assets — split out of app.ts so
// modules/dev-corpus.ts can reuse createDefaultHintsSource for an alternate corpus's hints
// without importing the whole app.ts composition root (which would create a circular import,
// since app.ts's dependency graph eventually reaches the input controllers that own the
// Dev-Mode corpus switcher UI).
import { decodeHintArtifact } from './domain/hint-types.js';
import { hintArtifactFileName, hintDirectoryNameForLevelsFile } from './hint-artifact-layout.mjs';

export function createDefaultDataAssetLoader({ fetchImpl = globalThis?.fetch, basePath = './data' }: any = {}) {
    return async () => {
        if (typeof fetchImpl !== 'function') return null;
        const [levelsResponse, themesResponse] = await Promise.all([
            fetchImpl(`${basePath}/levels.json`),
            fetchImpl(`${basePath}/themes.json`),
        ]);
        if (!levelsResponse?.ok) throw new Error(`Failed to load ${basePath}/levels.json`);
        if (!themesResponse?.ok) throw new Error(`Failed to load ${basePath}/themes.json`);
        const [levels, themes] = await Promise.all([
            levelsResponse.json(),
            themesResponse.json(),
        ]);
        return { levels, themes };
    };
}

/**
 * Per-level lazy hint fetcher (hardening plan §2). `data/levels.json` carries no hints at
 * rest; a level's FULL hint set lives in `data/hints/<id>.json` (`id` = the level's own permanent
 * identity, e.g. "P00042" — see docs/archive/level-id-unification-plan.md) and is fetched only when first
 * requested — never at boot. In development the fetched file may be the canonical
 * `{schemaVersion, hints: Hint[]}` evidence artifact; production builds now generate a path-only
 * runtime projection with source content/semantic hashes. Both shapes decode through the same
 * decodeHintArtifact() boundary scripts/level-data-io.mjs uses on the Node side (hint-runtime.mjs's own doc comment explains why
 * this must be shared rather than reimplemented here: this decoder used to only understand bare
 * path arrays and `{hints: paths[]}`, silently dropping provenance for the transitional
 * `{hints: paths[], hintMetadata: [...]}` shape that the Node side already handled). It also
 * tolerates a bare path array, so an older cached/CDN-served copy of the file still parses.
 *
 * `basePath` also lets a caller point this at an alternate corpus (e.g. `./data/stress`
 * for the Dev-Mode stress-corpus switcher). The hint directory is derived from `levelsFile` by
 * modules/hint-artifact-layout.mjs, the same neutral authority used by Node persistence/validators.
 *
 * `hintsDirName` is accepted only as a compatibility assertion for older callers: it may equal
 * the derived directory but cannot override it. This keeps old call shapes working without leaving
 * a second authority capable of choosing a conflicting physical layout.
 */
export function createDefaultHintsSource({
    fetchImpl = globalThis?.fetch,
    basePath = './data',
    levelsFile = 'levels.json',
    hintsDirName,
}: any = {}) {
    const derivedHintsDirName = hintDirectoryNameForLevelsFile(levelsFile);
    if (hintsDirName !== undefined && hintsDirName !== derivedHintsDirName) {
        throw new Error(
            `createDefaultHintsSource: hintsDirName ${JSON.stringify(hintsDirName)} conflicts with `
            + `layout-derived directory ${JSON.stringify(derivedHintsDirName)} for ${JSON.stringify(levelsFile)}`,
        );
    }
    return async (id: string) => {
        if (typeof fetchImpl !== 'function') return [];
        const name = hintArtifactFileName(id);
        const response = await fetchImpl(`${basePath}/${derivedHintsDirName}/${name}`);
        if (!response?.ok) throw new Error(`Failed to load ${basePath}/${derivedHintsDirName}/${name}`);
        const parsed = await response.json();
        return decodeHintArtifact(parsed);
    };
}
