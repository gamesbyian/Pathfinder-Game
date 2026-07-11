#!/usr/bin/env node
/** Smoke test for the runtime JSON data-asset loading path. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultDataAssetLoader, createDefaultHintsSource } from '../modules/app.js';
import { createData } from '../modules/data.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

const fileFetch = async (url) => {
  const filePath = path.join(process.cwd(), url.replace(/^\.\//, ''));
  return {
    ok: true,
    json: async () => JSON.parse(await fs.readFile(filePath, 'utf8')),
  };
};

await test('default data-asset loader reads committed JSON assets and createData validates them', async () => {
  const loadAssets = createDefaultDataAssetLoader({ fetchImpl: fileFetch, basePath: './data' });
  const assets = await loadAssets();
  const data = createData({ deepClone: (value) => JSON.parse(JSON.stringify(value)) });
  data.ingest({ levels: assets.levels, themes: assets.themes, window: null });
  assert.ok(data.getLevels().length >= 150);
  assert.equal(typeof data.getThemes().classic, 'object');
  assert.equal(data.getValidation().ok, true);
});

await test('getHints lazily fetches a level\'s full hint set from the split artifact', async () => {
  const data = createData({
    deepClone: (value) => JSON.parse(JSON.stringify(value)),
    hintsSource: createDefaultHintsSource({ fetchImpl: fileFetch, basePath: './data' }),
  });
  const loadAssets = createDefaultDataAssetLoader({ fetchImpl: fileFetch, basePath: './data' });
  const assets = await loadAssets();
  data.ingest({ levels: assets.levels, themes: assets.themes, window: null });
  assert.equal('hints' in data.getLevel(0), false, 'rest-state levels must not carry hints');
  const hints = await data.getHints(1);
  assert.ok(Array.isArray(hints) && hints.length > 0, 'level 1 should have at least one hint');
  assert.ok(hints.every((h) => Array.isArray(h.path) && h.path.every(Number.isInteger) && Array.isArray(h.provenance)));
  assert.equal(await data.getHints(1), hints, 'second request should hit the cache');
});

if (failed > 0) { console.error(`\nData asset runtime smoke tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nData asset runtime smoke tests: ${passed} passed, ${failed} failed`);
