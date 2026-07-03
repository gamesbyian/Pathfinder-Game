/** Unit tests for the lazy per-level hint accessor (hardening plan §2). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createData } from './data.js';

const deepClone = (v: any) => JSON.parse(JSON.stringify(v));
const makeLevels = (n: number) => Array.from({ length: n }, () => ({ grid: { w: 5, h: 5 }, gates: [], goal: { x: 1, y: 1 } }));

test('getHints fetches a level once via hintsSource and caches the result', async () => {
  const fetched: number[] = [];
  const data = createData({
    deepClone,
    hintsSource: async (levelNumber) => { fetched.push(levelNumber); return [[1, 2, 3]]; },
  });
  data.ingest({ levels: makeLevels(3), themes: {} });

  const first = await data.getHints(2);
  assert.deepEqual(first, [[1, 2, 3]]);
  const second = await data.getHints(2);
  assert.equal(second, first);
  assert.deepEqual(fetched, [2], 'hintsSource should be hit exactly once per level');
});

test('concurrent getHints calls share a single in-flight fetch', async () => {
  let calls = 0;
  let release: (v: number[][]) => void;
  const gate = new Promise<number[][]>((r) => { release = r; });
  const data = createData({ deepClone, hintsSource: () => { calls += 1; return gate; } });
  data.ingest({ levels: makeLevels(1), themes: {} });

  const a = data.getHints(1);
  const b = data.getHints(1);
  release!([[7, 8]]);
  assert.deepEqual(await a, [[7, 8]]);
  assert.deepEqual(await b, [[7, 8]]);
  assert.equal(calls, 1);
});

test('a failed fetch rejects the caller and is retried on the next request', async () => {
  let calls = 0;
  const data = createData({
    deepClone,
    hintsSource: async () => {
      calls += 1;
      if (calls === 1) throw new Error('network down');
      return [[4, 5]];
    },
  });
  data.ingest({ levels: makeLevels(1), themes: {} });

  await assert.rejects(data.getHints(1), /network down/);
  assert.deepEqual(await data.getHints(1), [[4, 5]], 'failure must not be cached');
  assert.equal(calls, 2);
});

test('levels appended at runtime resolve their inline hints without fetching', async () => {
  let fetches = 0;
  const data = createData({ deepClone, hintsSource: async () => { fetches += 1; return []; } });
  data.ingest({ levels: makeLevels(2), themes: {} });
  data.appendLevels([{ grid: { w: 5, h: 5 }, hints: [[9, 9, 9]] }]);

  assert.deepEqual(await data.getHints(3), [[9, 9, 9]]);
  assert.equal(fetches, 0);
});

test('getHints resolves to [] when no hintsSource is configured', async () => {
  const data = createData({ deepClone });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(1), []);
});

test('ingest clears the hint cache so re-ingested data refetches', async () => {
  let calls = 0;
  const data = createData({ deepClone, hintsSource: async () => { calls += 1; return [[calls]]; } });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(1), [[1]]);
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(1), [[2]]);
});
