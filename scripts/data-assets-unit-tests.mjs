#!/usr/bin/env node
/** Validates committed JSON data assets (data/levels.json, data/themes.json). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
    catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

const root = new URL('..', import.meta.url).pathname;

test('data/levels.json is valid JSON with 150 levels', () => {
    const levels = JSON.parse(fs.readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
    assert.ok(Array.isArray(levels), 'levels should be an array');
    assert.equal(levels.length, 150, `expected 150 levels, got ${levels.length}`);
    assert.ok(levels[0] && typeof levels[0] === 'object', 'first level should be an object');
    assert.ok(levels[0].grid && typeof levels[0].grid.w === 'number', 'first level should have grid.w');
});

test('data/themes.json is valid JSON with classic and dark themes', () => {
    const themes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'themes.json'), 'utf8'));
    assert.ok(themes && typeof themes === 'object' && !Array.isArray(themes), 'themes should be an object map');
    assert.equal(typeof themes.classic, 'object', 'classic theme should exist');
    assert.equal(typeof themes.dark, 'object', 'dark theme should exist');
});

if (failed > 0) { console.error(`\nData asset tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nData asset tests: ${passed} passed, ${failed} failed`);
