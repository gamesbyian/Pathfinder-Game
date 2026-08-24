/** Unit tests for IntHashMap, the flat-array open-addressing cache used by lower-bounds.ts. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
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

test('supports actual packed-key magnitudes for both lower-bound memo tables', () => {
  const m = new IntHashMap();
  const maxPackedCell = PACK(14, 14);

  // must-cross: pos*2^25 + mask*2^17 + 16-bit base-4 substate, n<=8.
  const mcKey = maxPackedCell * (1 << 25) + 0xff * (1 << 17) + 0xffff;
  // must-pass: pos*2^30 + the full schema-valid 30-bit visited mask.
  const mpKey = maxPackedCell * 0x40000000 + 0x3fffffff;

  assert.ok(Number.isSafeInteger(mcKey));
  assert.ok(Number.isSafeInteger(mpKey));
  assert.ok(mpKey > 1e14, 'must-pass fixture should exercise the post-fix near-2^50 key range');
  m.set(mcKey, 11);
  m.set(mpKey, 22);
  assert.equal(m.get(mcKey), 11);
  assert.equal(m.get(mpKey), 22);
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

test('randomized differential test against a plain JS Map across real memo-key representations', () => {
  const reference = new Map<number, number>();
  const m = new IntHashMap();

  // Deterministic PRNG so failures are reproducible.
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const MC_POS_MULT = 1 << 25;
  const MC_MASK_MULT = 1 << 17;
  const MP_MASK_SPACE = 0x40000000;
  const trials = 20000;
  const sampledKeys: number[] = [];

  for (let i = 0; i < trials; i++) {
    // Use the solver's PACK representation, not a dense 0..224 cell index. Half the trials mimic
    // the n<=8 must-cross key; half mimic the full 30-bit must-pass key introduced by the
    // cardinality fix. Both stay below Number.MAX_SAFE_INTEGER by construction.
    const pos = PACK(Math.floor(rand() * 15), Math.floor(rand() * 15));
    const key = (i & 1) === 0
      ? pos * MC_POS_MULT + Math.floor(rand() * 256) * MC_MASK_MULT + Math.floor(rand() * 65536)
      : pos * MP_MASK_SPACE + Math.floor(rand() * MP_MASK_SPACE);
    const value = Math.floor(rand() * 1000);

    assert.ok(Number.isSafeInteger(key));
    if (rand() < 0.7 || sampledKeys.length === 0) {
      m.set(key, value);
      reference.set(key, value);
      sampledKeys.push(key);
    } else {
      // Occasionally probe a previously-seen key to exercise the update/read path.
      const probeKey = sampledKeys[Math.floor(rand() * sampledKeys.length)];
      assert.equal(m.get(probeKey), reference.get(probeKey));
    }
  }

  assert.equal(m.size, reference.size);
  for (const [k, v] of reference) {
    assert.equal(m.get(k), v, `mismatch for key ${k}`);
  }

  // Also probe a batch of definitely-absent high keys.
  for (let i = 0; i < 500; i++) {
    const probeKey = 1_000_000_000_000_000 + i;
    assert.equal(m.get(probeKey), reference.get(probeKey));
  }
});
