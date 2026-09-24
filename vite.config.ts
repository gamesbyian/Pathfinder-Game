import { defineConfig, type Plugin } from 'vite';
import { cp } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { projectRuntimeHintDirectory } from './scripts/runtime-hint-projection-lib.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Git commit SHA at build time, for hint-provenance's solver.version (modules/build-info.ts).
 *  null (not a placeholder string) when unavailable — e.g. `npm run dev`/`vite preview` outside
 *  a git checkout — so a missing version reads as an honest unknown, never a fabricated one. */
function currentGitSha(): string | null {
    try {
        return execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
    } catch {
        return null;
    }
}

/**
 * Copy the files the app fetches at runtime (rather than imports) into the build output.
 *
 * `data/*.json` and `firebase-config.js` live at the repo root because the Node CLI tools
 * (solver, heatmap/oracle scripts, validators) read them from there — so they are NOT moved into
 * Vite's default `public/` dir. The app fetches `./data/levels.json` etc. and loads
 * `firebase-config.js` as a classic global script, both relative to the document, so they only need
 * to exist alongside the built `index.html`.
 *
 * Only an explicit allowlist is copied — NOT the whole `data/` tree — so a new non-player file
 * added under `data/` doesn't silently ship by default.
 */
const RUNTIME_DATA_FILES = ['levels.json', 'level-heatmaps.json', 'themes.json'];

/**
 * `data/stress/` holds the solver stress-test corpora (level-shaped JSON; data/stress/README.md
 * has full detail) — NOT player content, and never part of the normal boot payload (nothing
 * fetches these paths unless a signed-in admin explicitly flips the Dev-Mode corpus switcher —
 * see modules/dev-corpus.ts). They still need to exist in the deployed build for that on-demand
 * fetch to succeed, so they're copied here as an intentional, narrowly-scoped exception —
 * data/stress/regression-set.json, smoke-set.json, and failure-inbox.json (solver-tooling-only,
 * never read by the browser) are deliberately excluded.
 */
const DEV_CORPUS_FILES = ['stress-levels.json', 'stress-levels-random.json'];

type RuntimeHintProjectionManifest = {
    summary: {
        sourceBytes: number;
        runtimeBytes: number;
    };
};

async function runtimeHintProjection(
    sourceRelative: string,
    outputRelative: string,
    cacheRelative: string,
): Promise<RuntimeHintProjectionManifest> {
    const output = fromRoot(`./dist/${outputRelative}`);
    const cacheRoot = process.env.PATHFINDER_RUNTIME_HINT_PROJECTION_CACHE_ROOT;
    if (!cacheRoot) {
        return projectRuntimeHintDirectory(fromRoot(`./${sourceRelative}`), output);
    }

    const cacheDir = path.resolve(root, cacheRoot, cacheRelative);
    const manifestPath = path.join(cacheDir, '_projection-manifest.json');
    if (existsSync(manifestPath)) {
        await cp(cacheDir, output, { recursive: true });
        return JSON.parse(readFileSync(manifestPath, 'utf8')) as RuntimeHintProjectionManifest;
    }

    const projection = projectRuntimeHintDirectory(fromRoot(`./${sourceRelative}`), cacheDir);
    await cp(cacheDir, output, { recursive: true });
    return projection;
}

function copyRuntimeAssets(): Plugin {
    return {
        name: 'pathfinder-copy-runtime-assets',
        apply: 'build',
        async closeBundle() {
            const out = fromRoot('./dist');
            for (const file of RUNTIME_DATA_FILES) {
                await cp(fromRoot(`./data/${file}`), `${out}/data/${file}`);
            }
            const publishedProjection = await runtimeHintProjection(
                'data/hints',
                'data/hints',
                'data/hints',
            );
            for (const file of DEV_CORPUS_FILES) {
                await cp(fromRoot(`./data/stress/${file}`), `${out}/data/stress/${file}`);
            }
            const stressProjection = await runtimeHintProjection(
                'data/stress/hints',
                'data/stress/hints',
                'data/stress/hints',
            );
            // Corpus 2's sibling hints dir (see modules/dev-corpus.ts / level-data-io.mjs's
            // hintsDirFor) -- generated only if present, since it may be empty/unseeded.
            let randomProjection = null;
            if (existsSync(fromRoot('./data/stress/hints-random'))) {
                randomProjection = await runtimeHintProjection(
                    'data/stress/hints-random',
                    'data/stress/hints-random',
                    'data/stress/hints-random',
                );
            }
            const sourceBytes = publishedProjection.summary.sourceBytes
                + stressProjection.summary.sourceBytes
                + (randomProjection?.summary.sourceBytes ?? 0);
            const runtimeBytes = publishedProjection.summary.runtimeBytes
                + stressProjection.summary.runtimeBytes
                + (randomProjection?.summary.runtimeBytes ?? 0);
            console.log(
                `Runtime hint projection: ${sourceBytes.toLocaleString()} source bytes -> `
                + `${runtimeBytes.toLocaleString()} path-only bytes `
                + `(${sourceBytes > 0 ? ((1 - runtimeBytes / sourceBytes) * 100).toFixed(1) : '0.0'}% reduction).`,
            );
            await cp(fromRoot('./firebase-config.js'), `${out}/firebase-config.js`);
        },
    };
}

export default defineConfig({
    root,
    // Relative base: emitted asset URLs are document-relative, so the build works unchanged whether
    // served from the GitHub Pages project subpath (https://gamesbyian.github.io/Pathfinder-Game/)
    // or the root (e.g. `vite preview`, a future custom domain). No repo name hardcoded.
    base: './',
    plugins: [copyRuntimeAssets()],
    define: {
        __SOLVER_VERSION__: JSON.stringify(currentGitSha()),
    },
    build: {
        target: 'es2022',
        outDir: 'dist',
        emptyOutDir: true,
        // Skip Vite's inline module-preload polyfill: it injects an inline <script>, which the
        // enforcing CSP (script-src without 'unsafe-inline') would block. Targets are modern
        // browsers with native modulepreload.
        modulePreload: { polyfill: false },
        // Use esbuild (lenient) for CSS minification. The default lightningcss minifier is stricter
        // than browsers and rejects the hand-authored plain CSS that ships and runs today.
        cssMinify: 'esbuild',
    },
});
