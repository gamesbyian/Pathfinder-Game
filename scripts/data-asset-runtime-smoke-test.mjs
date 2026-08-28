#!/usr/bin/env node
/** Software-contract smoke test for the runtime JSON data-asset loading path.
 *
 * Real asset contents are validated by check:level-data-validity and their packaging by the Vite
 * build. This harness uses a synthetic fetch map so loader URL/caching behavior does not depend on
 * today's published level count or on level 1 continuing to have a stored hint.
 */
import assert from 'node:assert/strict';

import { createDefaultDataAssetLoader, createDefaultHintsSource } from '../modules/app.js';
import { createData } from '../modules/data.js';

let passed = 0;
let failed = 0;
const clone = (value) => JSON.parse(JSON.stringify(value));

async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

const level = {
  id: 'PTEST01',
  grid: { w: 3, h: 1 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 3, y: 1 },
  reqLen: 2,
  reqInt: 0,
  blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
  filters: [], flippingFilters: [], portals: [], landmarks: [],
};
const themes = { classic: {} };
const hintPath = [0, 1, 2];

function fixtureFetch() {
  const requested = [];
  const payloads = new Map([
    ['./data/levels.json', [level]],
    ['./data/themes.json', themes],
    ['./data/hints/PTEST01.json', { schemaVersion: 3, hints: [hintPath] }],
  ]);
  const fetchImpl = async (url) => {
    requested.push(url);
    if (!payloads.has(url)) return { ok: false, json: async () => null };
    return { ok: true, json: async () => clone(payloads.get(url)) };
  };
  return { fetchImpl, requested };
}

await test('default data-asset loader requests the runtime levels/themes contract and data accepts it', async () => {
  const { fetchImpl, requested } = fixtureFetch();
  const loadAssets = createDefaultDataAssetLoader({ fetchImpl, basePath: './data' });
  const assets = await loadAssets();
  assert.deepEqual(new Set(requested), new Set(['./data/levels.json', './data/themes.json']));
  const data = createData({ deepClone: clone });
  data.ingest({ levels: assets.levels, themes: assets.themes, window: null });
  assert.equal(data.getLevels().length, 1);
  assert.equal(typeof data.getThemes().classic, 'object');
  assert.equal(data.getValidation().ok, true);
});

await test('getHints requests the id-keyed split artifact lazily and caches the result', async () => {
  const { fetchImpl, requested } = fixtureFetch();
  const data = createData({
    deepClone: clone,
    hintsSource: createDefaultHintsSource({ fetchImpl, basePath: './data' }),
  });
  const loadAssets = createDefaultDataAssetLoader({ fetchImpl, basePath: './data' });
  const assets = await loadAssets();
  data.ingest({ levels: assets.levels, themes: assets.themes, window: null });

  const raw = data.getLevel(0);
  assert.equal('hints' in raw, false, 'rest-state levels must not carry hints');
  const hints = await data.getHints(raw);
  assert.equal(requested.filter(url => url === './data/hints/PTEST01.json').length, 1);
  assert.deepEqual(hints.map(h => h.path), [hintPath]);
  assert.equal(await data.getHints(raw), hints, 'second request should hit the data-service cache');
  assert.equal(requested.filter(url => url === './data/hints/PTEST01.json').length, 1);
});

if (failed > 0) {
  console.error(`\nData asset runtime smoke tests: ${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`\nData asset runtime smoke tests: ${passed} passed, ${failed} failed`);
