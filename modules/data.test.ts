/** Unit tests for the lazy per-level hint accessor (hardening plan §2). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createData } from './data.js';

const deepClone = (v: any) => JSON.parse(JSON.stringify(v));
const makeLevels = (n: number) => Array.from({ length: n }, (_, i) => ({ grid: { w: 5, h: 5 }, gates: [], goal: { x: 1, y: 1 }, id: `P${String(i + 1).padStart(5, '0')}` }));
const hint = (path: number[]) => ({ path, provenance: [] });

test('getHints fetches a level once via hintsSource (called with the level\'s id) and caches the result', async () => {
  const fetched: string[] = [];
  const data = createData({
    deepClone,
    hintsSource: async (id) => { fetched.push(id); return [[1, 2, 3]]; },
  });
  data.ingest({ levels: makeLevels(3), themes: {} });

  const level = data.getLevel(1);
  const first = await data.getHints(level);
  assert.deepEqual(first, [hint([1, 2, 3])]);
  const second = await data.getHints(level);
  assert.deepEqual(second, first);
  assert.deepEqual(fetched, ['P00002'], 'hintsSource should be hit exactly once per level');
});

test('concurrent getHints calls for the same level share a single in-flight fetch', async () => {
  let calls = 0;
  let release: (v: number[][]) => void;
  const gate = new Promise<number[][]>((r) => { release = r; });
  const data = createData({ deepClone, hintsSource: () => { calls += 1; return gate; } });
  data.ingest({ levels: makeLevels(1), themes: {} });
  const level = data.getLevel(0);

  const a = data.getHints(level);
  const b = data.getHints(level);
  release!([[7, 8]]);
  assert.deepEqual(await a, [hint([7, 8])]);
  assert.deepEqual(await b, [hint([7, 8])]);
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
  const level = data.getLevel(0);

  await assert.rejects(data.getHints(level), /network down/);
  assert.deepEqual(await data.getHints(level), [hint([4, 5])], 'failure must not be cached');
  assert.equal(calls, 2);
});

test('levels appended at runtime resolve their inline hints without fetching (even with no id)', async () => {
  let fetches = 0;
  const data = createData({ deepClone, hintsSource: async () => { fetches += 1; return []; } });
  data.ingest({ levels: makeLevels(2), themes: {} });
  data.appendLevels([{ grid: { w: 5, h: 5 }, hints: [[9, 9, 9]] }]);

  const level = data.getLevel(2);
  assert.equal(level.id, undefined, 'a Firestore-staged, not-yet-imported level has no persistent id yet');
  assert.deepEqual(await data.getHints(level), [hint([9, 9, 9])]);
  assert.equal(fetches, 0);
});

test('getHints resolves to [] when no hintsSource is configured', async () => {
  const data = createData({ deepClone });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(data.getLevel(0)), []);
});

test('ingest clears the hint cache so re-ingested data refetches', async () => {
  let calls = 0;
  const data = createData({ deepClone, hintsSource: async () => { calls += 1; return [[calls]]; } });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(data.getLevel(0)), [hint([1])]);
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(data.getLevel(0)), [hint([2])]);
});

test('getHints merges in Firestore-sourced hints on top of local ones', async () => {
  const data = createData({
    deepClone,
    hintsSource: async () => [[1, 2, 3]],
    firestoreHintsSource: async () => [hint([4, 5, 6])],
  });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(data.getLevel(0)), [hint([1, 2, 3]), hint([4, 5, 6])]);
});

test('getHints merges Firestore hints on top of a level\'s inline hints too', async () => {
  const data = createData({ deepClone, firestoreHintsSource: async () => [hint([9, 9])] });
  data.ingest({ levels: makeLevels(1), themes: {} });
  data.appendLevels([{ grid: { w: 5, h: 5 }, hints: [[1, 1]] }]);
  assert.deepEqual(await data.getHints(data.getLevel(1)), [hint([1, 1]), hint([9, 9])]);
});

test('a Firestore hints-source failure falls back to the local set rather than rejecting', async () => {
  const data = createData({
    deepClone,
    hintsSource: async () => [[1, 2]],
    firestoreHintsSource: async () => { throw new Error('offline'); },
  });
  data.ingest({ levels: makeLevels(1), themes: {} });
  assert.deepEqual(await data.getHints(data.getLevel(0)), [hint([1, 2])]);
});

test('setFirestoreHintsSource repoints future fetches and clears the cache', async () => {
  const data = createData({ deepClone, hintsSource: async () => [[1, 2]] });
  data.ingest({ levels: makeLevels(1), themes: {} });
  const level = data.getLevel(0);
  assert.deepEqual(await data.getHints(level), [hint([1, 2])]);

  data.setFirestoreHintsSource(async () => [hint([3, 4])]);
  assert.deepEqual(await data.getHints(level), [hint([1, 2]), hint([3, 4])]);
});
