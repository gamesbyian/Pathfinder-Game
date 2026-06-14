#!/usr/bin/env node
/** Unit tests for theme registry source selection without relying on window globals. */
import assert from 'node:assert/strict';
import { createThemeRegistry } from '../modules/theme/theme-registry.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

const state = { runtime: { currentTheme: 'classic' } };

test('createThemeRegistry prefers loaded data themes', () => {
  const registry = createThemeRegistry({
    getState: () => state,
    getData: () => ({ isLoaded: () => true, getThemes: () => ({ dataTheme: { label: 'data' } }) }),
    getWindow: () => ({ THEMES: { windowTheme: { label: 'window' } } }),
  }, { localTheme: { label: 'local' } });
  assert.deepEqual(registry.getThemeRegistry(), { dataTheme: { label: 'data' } });
});

test('createThemeRegistry uses injected window only as compatibility fallback', () => {
  const registry = createThemeRegistry({
    getState: () => state,
    getData: () => ({ isLoaded: () => false, getThemes: () => ({}) }),
    getWindow: () => ({ THEMES: { windowTheme: { label: 'window' } } }),
  }, { localTheme: { label: 'local' } });
  assert.deepEqual(registry.getThemeRegistry(), { windowTheme: { label: 'window' } });
});

test('createThemeRegistry falls back to local themes without a window', () => {
  const registry = createThemeRegistry({
    getState: () => state,
    getData: () => null,
    getWindow: () => null,
  }, { localTheme: { label: 'local' } });
  assert.deepEqual(registry.getThemeRegistry(), { localTheme: { label: 'local' } });
  assert.equal(registry.getCurrentTheme(), 'classic');
});

if (failed > 0) { console.error(`\nTheme registry tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nTheme registry tests: ${passed} passed, ${failed} failed`);
