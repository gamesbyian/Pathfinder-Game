import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import {
  buildWireLevelData,
  canonicalCloneLevel,
  parseRawLevel,
} from '../modules/domain/level-codec.ts';
import { getLevelFingerprintSource } from '../modules/domain/level-fingerprint.ts';

describe('maintained corpus codec integration', () => {
  test('available maintained corpus samples preserve challenge metrics through codec boundaries', () => {
    const fixtures = [
      ['published', '../data/levels.json'],
      ['corpus1', '../data/stress/stress-levels.json'],
      ['corpus2', '../data/stress/stress-levels-random.json'],
    ];

    let exercised = 0;
    for (const [name, relativePath] of fixtures) {
      const url = new URL(relativePath, import.meta.url);
      if (!existsSync(url)) continue;
      const document = JSON.parse(readFileSync(url, 'utf8'));
      const raw = Array.isArray(document) ? document[0] : document.levels[0];
      const parsed = parseRawLevel(raw);
      assert.ok(parsed, `${name} representative parses`);
      const wire = buildWireLevelData(canonicalCloneLevel(parsed));
      assert.equal(wire.reqLen, raw.reqLen, `${name} length metric`);
      assert.equal(wire.reqInt, raw.reqInt, `${name} intersection metric`);
      assert.equal(getLevelFingerprintSource(wire), getLevelFingerprintSource(raw), `${name} fingerprint`);
      exercised++;
    }
    assert.ok(exercised > 0, 'at least one maintained corpus sample is available in this checkout');
  });
});
