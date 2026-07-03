#!/usr/bin/env node
/** Validates committed JSON data assets (data/levels.json, data/themes.json). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readLevelHints, listHintFiles } from './level-data-io.mjs';


const root = new URL('..', import.meta.url).pathname;

test('data/levels.json is valid JSON with at least 150 levels', () => {
    const levels = JSON.parse(fs.readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
    assert.ok(Array.isArray(levels), 'levels should be an array');
    assert.ok(levels.length >= 150, `expected at least 150 levels, got ${levels.length}`);
    assert.ok(levels[0] && typeof levels[0] === 'object', 'first level should be an object');
    assert.ok(levels[0].grid && typeof levels[0].grid.w === 'number', 'first level should have grid.w');
});

test('data/levels.json carries no inline hints; the split artifact covers every level', () => {
    const levelsJsonPath = path.join(root, 'data', 'levels.json');
    const levels = JSON.parse(fs.readFileSync(levelsJsonPath, 'utf8'));
    for (const [i, level] of levels.entries()) {
        assert.equal('hints' in level, false, `level ${i + 1} must not carry inline hints (they live in data/hints/)`);
    }
    // One hint file per level, joined by the 1-based level number; each parses to an array
    // of hint paths (arrays of packed cell keys).
    for (let n = 1; n <= levels.length; n++) {
        const hints = readLevelHints(levelsJsonPath, n);
        assert.ok(Array.isArray(hints), `data/hints/${String(n).padStart(3, '0')}.json should be an array`);
        for (const hint of hints) {
            assert.ok(Array.isArray(hint) && hint.every((k) => Number.isInteger(k)), `level ${n} hints must be integer-key paths`);
        }
    }
    assert.equal(listHintFiles(levelsJsonPath).length, levels.length, 'exactly one hint file per level');
});

test('data/themes.json is valid JSON with classic and dark themes', () => {
    const themes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'themes.json'), 'utf8'));
    assert.ok(themes && typeof themes === 'object' && !Array.isArray(themes), 'themes should be an object map');
    assert.equal(typeof themes.classic, 'object', 'classic theme should exist');
    assert.equal(typeof themes.dark, 'object', 'dark theme should exist');
});
