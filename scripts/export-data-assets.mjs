#!/usr/bin/env node
/**
 * Export browser-global level/theme seed scripts into JSON assets.
 *
 * The current runtime still supports `levels.js`/`themes.js` as compatibility scripts,
 * but this utility gives the project a deterministic bridge toward ESM/JSON data
 * loading without hand-editing the large source files.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export function extractGlobalData({ levelsPath = path.join(repoRoot, 'levels.js'), themesPath = path.join(repoRoot, 'themes.js') } = {}) {
    const sandbox = { window: {} };
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox.window;
    const context = vm.createContext(sandbox);

    vm.runInContext(fs.readFileSync(levelsPath, 'utf8'), context, { filename: levelsPath });
    vm.runInContext(fs.readFileSync(themesPath, 'utf8'), context, { filename: themesPath });

    const levels = sandbox.window.RAW_LEVELS ?? sandbox.window.LEVELS;
    const themes = sandbox.window.THEMES;

    if (!Array.isArray(levels)) throw new Error('Expected levels.js to define window.RAW_LEVELS or window.LEVELS as an array');
    if (!themes || typeof themes !== 'object' || Array.isArray(themes)) throw new Error('Expected themes.js to define window.THEMES as an object map');

    return { levels, themes };
}

export function writeJsonAssets({ outDir = path.join(repoRoot, 'data'), data = extractGlobalData() } = {}) {
    fs.mkdirSync(outDir, { recursive: true });
    const levelsOut = path.join(outDir, 'levels.json');
    const themesOut = path.join(outDir, 'themes.json');
    fs.writeFileSync(levelsOut, `${JSON.stringify(data.levels, null, 2)}\n`);
    fs.writeFileSync(themesOut, `${JSON.stringify(data.themes, null, 2)}\n`);
    return { levelsOut, themesOut, levelCount: data.levels.length, themeCount: Object.keys(data.themes).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const outArgIndex = process.argv.indexOf('--out-dir');
    const outDir = outArgIndex >= 0 ? path.resolve(process.argv[outArgIndex + 1] ?? '') : path.join(repoRoot, 'data');
    const result = writeJsonAssets({ outDir });
    console.log(`Wrote ${result.levelCount} levels to ${path.relative(repoRoot, result.levelsOut)}`);
    console.log(`Wrote ${result.themeCount} themes to ${path.relative(repoRoot, result.themesOut)}`);
}
