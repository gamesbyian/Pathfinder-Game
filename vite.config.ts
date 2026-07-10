import { defineConfig, type Plugin } from 'vite';
import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Copy the files the app fetches at runtime (rather than imports) into the build output.
 *
 * `data/*.json` and `firebase-config.js` live at the repo root because the Node CLI tools
 * (solver, heatmap/oracle scripts, validators) read them from there — so they are NOT moved into
 * Vite's default `public/` dir. The app fetches `./data/levels.json` etc. and loads
 * `firebase-config.js` as a classic global script, both relative to the document, so they only need
 * to exist alongside the built `index.html`.
 *
 * Only the player-facing files are copied — NOT the whole `data/` tree. `data/stress/` holds the
 * solver stress-test corpora (level-shaped JSON, one file 15MB+) that must never ship to players;
 * listing exactly what's copied (rather than the whole directory) makes that a structural
 * guarantee instead of a naming convention someone could accidentally violate by adding a new
 * non-player file under `data/`.
 */
const RUNTIME_DATA_FILES = ['levels.json', 'level-heatmaps.json', 'themes.json'];

function copyRuntimeAssets(): Plugin {
    return {
        name: 'pathfinder-copy-runtime-assets',
        apply: 'build',
        async closeBundle() {
            const out = fromRoot('./dist');
            for (const file of RUNTIME_DATA_FILES) {
                await cp(fromRoot(`./data/${file}`), `${out}/data/${file}`);
            }
            await cp(fromRoot('./data/hints'), `${out}/data/hints`, { recursive: true });
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
