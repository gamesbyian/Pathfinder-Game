/** Unit tests for admissible-order-search.ts, focused on the tieBreakProfile: null path. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { admissibleOrderSearch } from './admissible-order-search.js';
import { PACK } from './encoding.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import type { NormalizedLevel } from '../domain/types.js';

function makeLevel(overrides = {}) {
  return {
    grid: { w: 3, h: 1 },
    reqLen: 2,
    reqInt: 0,
    goalKey: PACK(2, 0),
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

test('admissibleOrderSearch solves a simple line level with a real tie-break profile', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, POLICY_PROFILES.default);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('admissibleOrderSearch solves the same level with tieBreakProfile: null (no tie-break)', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, null);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('admissibleOrderSearch with tieBreakProfile: null still respects a forced first step', async () => {
  // Regression guard: skipping the score computation must not skip getNeighbors'
  // prep._forcedFirstStepKey filtering (offline tooling hook) — the two are independent gates.
  const level = makeLevel({ grid: { w: 3, h: 3 }, reqLen: 4, goalKey: PACK(2, 2) });
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._forcedFirstStepKey = PACK(1, 0);
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, null);
  assert.ok(path, 'expected a solution');
  assert.equal(path![1], PACK(1, 0), 'first step must honor the forced key even with no tie-break');
});

test('admissibleOrderSearch defaults tieBreakProfile to {} (a real profile), not null', async () => {
  // {} is not the same as "no tie-break" -- {} still computes a real (flatly-weighted) score and
  // sorts by it; only an explicit null skips scoring entirely. Confirms the default parameter
  // didn't regress to null when the signature changed to ScoringProfile | null.
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});
