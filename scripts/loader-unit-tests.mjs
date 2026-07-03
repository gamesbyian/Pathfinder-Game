#!/usr/bin/env node
/** Unit tests for loader browser-adapter boundaries. */
import assert from 'node:assert/strict';
import { createLoader } from '../modules/loader.js';

let passed = 0;
let failed = 0;

function makeBrowser() {
  const listeners = new Map();
  let nextTimer = 1;
  return {
    listeners,
    cleared: [],
    createScript: () => ({ src: '', onload: null, onerror: null }),
    appendToHead() {},
    getElementById: (id) => (id === 'loadingOverlay' ? { id } : null),
    setTimeout: () => nextTimer++,
    clearTimeout(id) { this.cleared.push(id); },
    addEventListener(name, handler) { listeners.set(name, handler); },
  };
}

async function runTests() {
  await (async () => {
    const progress = [];
    let ingestOptions = null;
    const browser = makeBrowser();
    const loader = createLoader({
      ui: { setProgress: (entry) => progress.push(entry), showStartupError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
      data: {
        ingest: (opts) => { ingestOptions = opts; },
        getLevels: () => ingestOptions?.levels ?? [],
      },
      themes: { ensureThemeLeaveColors: () => {}, populateThemes: () => {} },
      core: { DEV: false },
      browser,
      dataAssetLoader: async () => ({ levels: [{ id: 1 }], themes: { classic: {} } }),
    });
    const mode = await loader.init();
    assert.equal(mode, 'ready');
    assert.deepEqual(ingestOptions, { levels: [{ id: 1 }], themes: { classic: {} }, window: null });
    assert.ok(progress.some(entry => entry.phase === 'Data Assets Ready'));
  })();
  console.log('  ✓ createLoader ingests data assets via dataAssetLoader and reports ready');
  passed += 1;

  await (async () => {
    const browser = makeBrowser();
    const reported = [];
    const loader = createLoader({
      ui: { setProgress: () => {}, showStartupError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
      data: { ingest: () => {}, getLevels: () => [] },
      themes: { ensureThemeLeaveColors: () => {}, populateThemes: () => {} },
      core: { DEV: false },
      browser,
      reportError: (context, err) => reported.push([context, err]),
      // no dataAssetLoader provided
    });
    const mode = await loader.init();
    assert.equal(mode, 'failed');
    assert.equal(loader.getStatus().mode, 'failed');
    assert.ok(reported.some(([context]) => context === 'loader.data-assets'));
  })();
  console.log('  ✓ createLoader reports failed mode when dataAssetLoader is not provided');
  passed += 1;

  await (async () => {
    const browser = makeBrowser();
    const reported = [];
    const loader = createLoader({
      ui: { setProgress: () => {}, showStartupError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
      data: { ingest: () => {}, getLevels: () => [] },
      themes: { ensureThemeLeaveColors: () => {}, populateThemes: () => {} },
      core: { DEV: false },
      browser,
      reportError: (context, err) => reported.push([context, err]),
      dataAssetLoader: async () => { throw new Error('fetch failed'); },
    });
    const mode = await loader.init();
    assert.equal(mode, 'failed');
    assert.equal(loader.getStatus().mode, 'failed');
    assert.ok(reported.some(([context, err]) => context === 'loader.data-assets' && err?.message === 'fetch failed'));
  })();
  console.log('  ✓ createLoader reports failed mode when dataAssetLoader throws');
  passed += 1;

  // Top-level window error/unhandledrejection hooks reach the error-reporting seam via fail().
  await (async () => {
    const browser = makeBrowser();
    const reported = [];
    createLoader({
      ui: { setProgress: () => {}, showStartupError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
      data: { ingest: () => {}, getLevels: () => [] },
      themes: { ensureThemeLeaveColors: () => {}, populateThemes: () => {} },
      core: { DEV: false },
      browser,
      reportError: (context, err) => reported.push([context, err]),
      dataAssetLoader: async () => ({ levels: [{ id: 1 }], themes: { classic: {} } }),
    });
    const uncaught = new Error('uncaught boom');
    browser.listeners.get('error')({ error: uncaught });
    browser.listeners.get('unhandledrejection')({ reason: 'promise boom' });
    assert.deepEqual(reported[0], ['loader.error', uncaught]);
    assert.deepEqual(reported[1], ['loader.promise', 'promise boom']);
  })();
  console.log('  ✓ createLoader routes window error/unhandledrejection events to reportError');
  passed += 1;
}

await runTests().catch((error) => {
  console.error(`  ✗ loader unit tests`);
  console.error(`    ${error.stack || error.message}`);
  failed += 1;
});

if (failed > 0) { console.error(`\nLoader tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nLoader tests: ${passed} passed, ${failed} failed`);
