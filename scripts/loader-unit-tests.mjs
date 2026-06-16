#!/usr/bin/env node
/** Unit tests for loader browser-adapter boundaries. */
import assert from 'node:assert/strict';
import { createLoader } from '../modules/loader.js';

let passed = 0;
let failed = 0;

function makeBrowser({ failLevels = false } = {}) {
  const listeners = new Map();
  let nextTimer = 1;
  return {
    listeners,
    scripts: [],
    cleared: [],
    createScript: () => ({ src: '', onload: null, onerror: null }),
    appendToHead(scriptEl) {
      this.scripts.push(scriptEl.src);
      queueMicrotask(() => {
        if (failLevels && scriptEl.src === './levels.js') scriptEl.onerror?.(new Error('boom'));
        else scriptEl.onload?.();
      });
    },
    getElementById: (id) => (id === 'loadingOverlay' ? { id } : null),
    setTimeout: () => nextTimer++,
    clearTimeout(id) { this.cleared.push(id); },
    addEventListener(name, handler) { listeners.set(name, handler); },
  };
}

async function runTests() {
  await (async () => {
    const progress = [];
    let ingested = false;
    let populated = false;
    const browser = makeBrowser();
    const loader = createLoader({
      ui: {
        setProgress: (entry) => progress.push(entry),
        reportError: () => {},
        setOverlayOpacity: () => {},
        hideOverlay: () => {},
      },
      data: {
        ingest: () => { ingested = true; },
        getLevels: () => [{ id: 1 }],
      },
      themes: {
        ensureThemeLeaveColors: () => {},
        populateThemes: () => { populated = true; },
      },
      core: { DEV: false },
      browser,
    });
    const mode = await loader.init();
    loader.finish();
    assert.equal(mode, 'ready');
    assert.equal(loader.getStatus().mode, 'ready');
    assert.equal(ingested, true);
    assert.equal(populated, true);
    assert.deepEqual(browser.scripts, ['./themes.js', './levels.js']);
    assert.ok(progress.some(entry => entry.phase === 'Levels Ready'));
  })();
  console.log('  ✓ createLoader loads themes/levels through injected browser adapter');
  passed += 1;


  await (async () => {
    const progress = [];
    let ingestOptions = null;
    const browser = makeBrowser();
    const loader = createLoader({
      ui: { setProgress: (entry) => progress.push(entry), reportError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
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
    assert.deepEqual(browser.scripts, []);
    assert.deepEqual(ingestOptions, { levels: [{ id: 1 }], themes: { classic: {} }, window: null });
    assert.ok(progress.some(entry => entry.phase === 'Data Assets Ready'));
  })();
  console.log('  ✓ createLoader can ingest injected JSON/ESM data assets without legacy scripts');
  passed += 1;

  await (async () => {
    const browser = makeBrowser({ failLevels: true });
    const loader = createLoader({
      ui: { setProgress: () => {}, reportError: () => {}, setOverlayOpacity: () => {}, hideOverlay: () => {} },
      data: { ingest: () => {}, getLevels: () => [] },
      themes: { ensureThemeLeaveColors: () => {}, populateThemes: () => {} },
      core: { DEV: false },
      browser,
    });
    const mode = await loader.init();
    assert.equal(mode, 'failed');
    assert.equal(loader.getStatus().mode, 'failed');
  })();
  console.log('  ✓ createLoader reports failed mode when injected level script loader fails');
  passed += 1;
}

await runTests().catch((error) => {
  console.error(`  ✗ loader unit tests`);
  console.error(`    ${error.stack || error.message}`);
  failed += 1;
});

if (failed > 0) { console.error(`\nLoader tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nLoader tests: ${passed} passed, ${failed} failed`);
