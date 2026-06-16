#!/usr/bin/env node
/** Unit tests for the level/theme JSON export bridge. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractGlobalData, writeJsonAssets } from './export-data-assets.mjs';

let passed = 0;
let failed = 0;
async function test(name, fn) {
    try { await fn(); console.log(`  ✓ ${name}`); passed += 1; }
    catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

await test('extractGlobalData reads browser-global levels and themes without a browser', () => {
    const { levels, themes } = extractGlobalData();
    assert.equal(levels.length, 150);
    assert.equal(typeof themes.classic, 'object');
    assert.equal(typeof themes.dark, 'object');
    assert.equal(levels[0].grid.w, 9);
    assert.equal(levels.at(-1).grid.w, 5);
});

await test('writeJsonAssets writes deterministic JSON files', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-data-assets-'));
    try {
        const result = writeJsonAssets({ outDir });
        assert.equal(result.levelCount, 150);
        assert.ok(result.themeCount >= 1);
        const levelsJson = JSON.parse(fs.readFileSync(path.join(outDir, 'levels.json'), 'utf8'));
        const themesJson = JSON.parse(fs.readFileSync(path.join(outDir, 'themes.json'), 'utf8'));
        assert.equal(levelsJson.length, result.levelCount);
        assert.equal(JSON.stringify(themesJson.classic.seeds), JSON.stringify(extractGlobalData().themes.classic.seeds));
    } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
});


await test('committed JSON assets match the browser-global source export', () => {
    const { levels, themes } = extractGlobalData();
    const committedLevels = JSON.parse(fs.readFileSync(path.join('data', 'levels.json'), 'utf8'));
    const committedThemes = JSON.parse(fs.readFileSync(path.join('data', 'themes.json'), 'utf8'));
    assert.equal(JSON.stringify(committedLevels), JSON.stringify(levels));
    assert.equal(JSON.stringify(committedThemes), JSON.stringify(themes));
});

if (failed > 0) { console.error(`\nData asset tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nData asset tests: ${passed} passed, ${failed} failed`);
