#!/usr/bin/env node
/** Unit tests for theme registry source selection without relying on window globals. */
import assert from 'node:assert/strict';
import { test, run } from './test-lib/harness.mjs';
import { createThemeRegistry } from '../modules/theme/theme-registry.js';


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

await run('Theme registry tests');
