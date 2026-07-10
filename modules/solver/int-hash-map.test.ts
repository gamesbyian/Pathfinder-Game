/** Unit tests for IntHashMap, the flat-array open-addressing cache used by lower-bounds.ts. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { IntHashMap } from './int-hash-map.js';

test('get/set round-trips basic values', () => {
  const m = new IntHashMap();
  assert.equal(m.get(0), undefined);
  m.set(0, 42);
  assert.equal(m.get(0), 42);
  m.set(1, 7);
  assert.equal(m.get(1), 7);
  assert.equal(m.get(0), 42);
  assert.equal(m.size, 2);
});

test('set on an existing key updates value without growing size', () => {
  const m = new IntHashMap();
  m.set(5, 1);
  m.set(5, 2);
  m.set(5, 3);
  assert.equal(m.get(5), 3);
  assert.equal(m.size, 1);
});

test('get on an absent key returns undefined, including after other inserts', () => {
  const m = new IntHashMap();
  m.set(10, 100);
  m.set(20, 200);
  assert.equal(m.get(15), undefined);
  assert.equal(m.get(999999), undefined);
});

test('supports large keys (~1.76e13, matching must-cross cache key formula range)', () => {
  const m = new IntHashMap();
  const bigKey1 = 1.7e13 + 12345;
  const bigKey2 = 1.76e13;
  m.set(bigKey1, 11);
  m.set(bigKey2, 22);
  assert.equal(m.get(bigKey1), 11);
  assert.equal(m.get(bigKey2), 22);
});

test('supports Infinity as a value (unreachable-bound sentinel)', () => {
  const m = new IntHashMap();
  m.set(3, Infinity);
  assert.equal(m.get(3), Infinity);
});

test('growth/rehash preserves every previously-set key/value pair', () => {
  const m = new IntHashMap(8);
  const n = 5000;
  for (let i = 0; i < n; i++) {
    m.set(i * 7 + 1, i * 3);
  }
  assert.equal(m.size, n);
  for (let i = 0; i < n; i++) {
    assert.equal(m.get(i * 7 + 1), i * 3, `key ${i * 7 + 1} lost after growth`);
  }
});

test('handles hash collisions via linear probing correctly', () => {
  // Force a tiny capacity so collisions are essentially guaranteed, then verify
  // every key/value is still distinguishable.
  const m = new IntHashMap(8);
  const keys = [1, 9, 17, 25, 33, 41, 2, 10, 18];
  keys.forEach((k, i) => m.set(k, i * 100));
  keys.forEach((k, i) => assert.equal(m.get(k), i * 100));
});

test('randomized differential test against a plain JS Map, including realistic large keys', () => {
  const reference = new Map<number, number>();
  const m = new IntHashMap();

  // Deterministic PRNG so failures are reproducible.
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const POS_MULT = 1 << 25;
  const MASK_MULT = 1 << 17;
  const trials = 20000;
  const sampledKeys: number[] = [];

  for (let i = 0; i < trials; i++) {
    // Mimic the real mustCrossLowerBound cache key formula's magnitude:
    // pos * (1<<25) + mask * (1<<17) + subState, which can reach ~1.76e13 for
    // 15x15 grids (pos up to 225) with large masks/substates.
    const pos = Math.floor(rand() * 225);
    const mask = Math.floor(rand() * 4096);
    const subState = Math.floor(rand() * 65536);
    const key = pos * POS_MULT + mask * MASK_MULT + subState;
    const value = Math.floor(rand() * 1000);

    if (rand() < 0.7 || sampledKeys.length === 0) {
      m.set(key, value);
      reference.set(key, value);
      sampledKeys.push(key);
    } else {
      // Occasionally probe a previously-seen key to exercise the update path.
      const probeKey = sampledKeys[Math.floor(rand() * sampledKeys.length)];
      assert.equal(m.get(probeKey), reference.get(probeKey));
    }
  }

  assert.equal(m.size, reference.size);
  for (const [k, v] of reference) {
    assert.equal(m.get(k), v, `mismatch for key ${k}`);
  }

  // Also probe a batch of definitely-absent keys.
  for (let i = 0; i < 500; i++) {
    const probeKey = 999_000_000_000 + i;
    assert.equal(m.get(probeKey), reference.get(probeKey));
  }
});
