/** Unit tests for admissible-order-search.ts, focused on the tieBreakProfile: null path. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { admissibleOrderSearch, admissibleOrderSearchLDS, rankByAdmissibleSlack } from './admissible-order-search.js';
import { PACK } from './encoding.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { normalizeRawLevel } from './normalization.js';
import { createState, getNeighbors } from './search-state.js';
import type { NormalizedLevel } from '../domain/types.js';

function makeLevel(overrides = {}) {
  return {
    grid: { w: 3, h: 1 },
    requiredLength: 2,
    requiredIntersections: 0,
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
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('admissibleOrderSearch honors an exhausted experiment-only strict work cap before search', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  // prep._workMeter.units (this fresh prep's own baseline, 0), not the module-global workMeter.units
  // which accumulates across every solve/test in this process — see PrepLevel's own comment.
  prep._strictWorkCap = prep._workMeter.units;
  const out: { timedOut?: boolean; nodesExpanded?: number } = {};
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, out);
  assert.equal(path, null);
  assert.deepEqual(out, { timedOut: true, nodesExpanded: 0 });
  assert.equal(prep._metrics.nodesExpanded, 0);
});

// STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT (see ablation-config.ts and
// reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md): closes
// the gap where this function's hot loop never consulted prep._workCap (only prep._strictWorkCap),
// unlike admissibleOrderSearchLDS. enforceWorkCap defaults false so every existing caller (this
// file's own tests above, the admissible-order-fallback tier, offline tooling) is byte-for-byte
// unaffected; only orchestration.ts's admissible-order-non-default-retry call site may pass true.
test('admissibleOrderSearch enforceWorkCap left false (default) ignores an already-exhausted prep._workCap', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._workCap = prep._workMeter.units; // already exhausted before any search
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)], 'without opting in, an exhausted soft work cap must not stop the search at all');
});

test('admissibleOrderSearch enforceWorkCap: true honors an exhausted prep._workCap before search, mirroring the strict-cap test above', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._workCap = prep._workMeter.units;
  const out: { timedOut?: boolean; nodesExpanded?: number } = {};
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, out, Infinity, SCORING_PROFILES.default, Infinity, true);
  assert.equal(path, null);
  assert.deepEqual(out, { timedOut: true, nodesExpanded: 0 });
  assert.equal(prep._metrics.nodesExpanded, 0);
});

test('admissibleOrderSearch enforceWorkCap: true truncates mid-search at the periodic (every-256-node) check; enforceWorkCap: false runs the identical level unaffected', async () => {
  // Richer fixture than the 3-cell line above: an open grid alone (e.g. this file's own line-level
  // shape scaled up) gives admissible-order's slack ordering almost no real branching -- measured
  // empirically at under 300 nodes even at 9x9/requiredLength=40. Four must-pass cells forming a
  // diamond around the direct diagonal route force real backtracking (many admissible orderings to
  // try before one satisfies every must-pass), measured at ~1,800 nodes for this exact shape --
  // comfortably over the 256-node periodic-check boundary while staying fast.
  const level = makeLevel({
    grid: { w: 11, h: 11 }, requiredLength: 50, goalKey: PACK(10, 10), gateKeys: [PACK(0, 0)],
    mustPassKeys: [PACK(5, 1), PACK(1, 5), PACK(9, 5), PACK(5, 9)],
  });

  const refPrep = prepLevel(level);
  refPrep._cfg = null;
  refPrep._metrics = { nodesExpanded: 0 };
  const refPath = await admissibleOrderSearch(PACK(0, 0), level, refPrep, 60_000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);
  assert.ok(refPath, 'sanity: the reference run must solve');
  assert.ok(refPrep._metrics.nodesExpanded > 256, 'sanity: this fixture must exercise the periodic (not just pre-search) check');

  const cappedWorkCap = Math.floor(refPrep._workMeter.units / 2);

  const onPrep = prepLevel(level);
  onPrep._cfg = null;
  onPrep._metrics = { nodesExpanded: 0 };
  onPrep._workCap = cappedWorkCap;
  const onOut: { timedOut?: boolean; nodesExpanded?: number } = {};
  const onPath = await admissibleOrderSearch(PACK(0, 0), level, onPrep, 60_000, Date.now(), null, onOut, Infinity, SCORING_PROFILES.default, Infinity, true);
  assert.equal(onPath, null, 'enforceWorkCap: true must stop before reaching the solution');
  assert.equal(onOut.timedOut, true);
  assert.ok(onOut.nodesExpanded! > 0 && onOut.nodesExpanded! < refPrep._metrics.nodesExpanded, 'must truncate strictly partway through, at the periodic check');
  assert.ok(onPrep._workMeter.units >= cappedWorkCap, 'must stop at/after the cap, never well before it');

  const offPrep = prepLevel(level);
  offPrep._cfg = null;
  offPrep._metrics = { nodesExpanded: 0 };
  offPrep._workCap = cappedWorkCap;
  const offPath = await admissibleOrderSearch(PACK(0, 0), level, offPrep, 60_000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);
  assert.deepEqual(offPath, refPath, 'enforceWorkCap: false (default) must reach the exact same solution as if prep._workCap were never set');
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
  const level = makeLevel({ grid: { w: 3, h: 3 }, requiredLength: 4, goalKey: PACK(2, 2) });
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

test('admissibleOrderSearch with maxDiscrepancy: 0 still solves a straight line (no branch, no discrepancy ever needed)', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await admissibleOrderSearch(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default, 0);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('admissibleOrderSearch maxDiscrepancy defaults to Infinity (byte-for-byte unchanged for every existing caller)', async () => {
  const level = makeLevel();
  const prepA = prepLevel(level);
  prepA._cfg = null;
  prepA._metrics = { nodesExpanded: 0 };
  const withoutParam = await admissibleOrderSearch(PACK(0, 0), level, prepA, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);

  const prepB = prepLevel(level);
  prepB._cfg = null;
  prepB._metrics = { nodesExpanded: 0 };
  const withExplicitInfinity = await admissibleOrderSearch(PACK(0, 0), level, prepB, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default, Infinity);

  assert.deepEqual(withoutParam, withExplicitInfinity);
});

test('admissibleOrderSearchLDS solves a simple line level (probe-then-fallback wrapper reaches the same answer)', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await admissibleOrderSearchLDS(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, SCORING_PROFILES.default);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('admissibleOrderSearchLDS respects a forced first step through both the probe and fallback phases', async () => {
  const level = makeLevel({ grid: { w: 3, h: 3 }, requiredLength: 4, goalKey: PACK(2, 2) });
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._forcedFirstStepKey = PACK(1, 0);
  const path = await admissibleOrderSearchLDS(PACK(0, 0), level, prep, 1000, Date.now(), null, null, Infinity, null);
  assert.ok(path, 'expected a solution');
  assert.equal(path![1], PACK(1, 0), 'first step must honor the forced key across both LDS phases');
});

// --- rankByAdmissibleSlack: dead (negative-slack) candidates sort last, not first ---
// (Fixed 2026-07-25 — see this function's own doc comment for the bug: a raw ascending sort on the
// signed slack value put the MOST negative, i.e. deadest, candidates FIRST.)

test('a candidate with negative admissible slack (already provably dead by the must-pass bound) sorts LAST, not first', () => {
    // 7x7 grid, gate (1,4)->goal (7,4) [1-indexed raw], a must-pass cell at (4,1) off the direct
    // route, requiredLength=12. Hand-verified via the admissible bound math: at the gate, moving to (0,3)
    // [raw (1,3), left toward the mustpass] or (0,2) [raw (1,2)] both have slack 0 (live, exactly on
    // budget); moving to (0,4) [raw (1,4), away from the mustpass] has slack -2 (already dead — even
    // the best case from there needs 2 more steps than remain). All three are real graph neighbors
    // of the gate, so this exercises the exact scenario the fix targets, not a synthetic case.
    const raw = { grid: { w: 7, h: 7 }, gates: [{ x: 1, y: 4 }], goal: { x: 7, y: 4 }, mustPass: [{ x: 4, y: 1 }], reqLen: 12, reqInt: 0 };
    const level = normalizeRawLevel(raw, 1);
    const prep = prepLevel(level);
    const gateKey = PACK(0, 3);
    const state = createState(gateKey, level, prep);
    const children = getNeighbors(gateKey, state, level, prep);
    const deadKey = PACK(0, 4); // the negative-slack (dead) candidate
    assert.ok(children.includes(deadKey), 'sanity check on the fixture');

    const records: import('./types.js').OrderingResearchRecord[] = [];
    prep._orderingResearchObserver = { policies: [
        { id: 'none', scoringProfile: null },
        { id: 'default', scoringProfile: SCORING_PROFILES.default },
        { id: 'mustCrossFirst', scoringProfile: SCORING_PROFILES.mustCrossFirst },
    ], observe: record => records.push(record) };
    const ranked = rankByAdmissibleSlack(children, level, prep, state, null);
    assert.equal(ranked[ranked.length - 1], deadKey, 'the dead candidate must be ranked LAST, after every live candidate');
    assert.ok(ranked.slice(0, -1).every(k => k !== deadKey), 'the dead candidate appears exactly once, at the end');
    assert.equal(records.length, 1);
    assert.equal(records[0].searchFamily, 'admissible-order');
    assert.deepEqual(records[0].rankings.map(row => row.policyId), ['none', 'default', 'mustCrossFirst']);
    assert.deepEqual(records[0].rankings[0].order, ranked);
    assert.equal(records[0].admissibleSlack?.find(row => row.candidate === deadKey)?.slack, -2);
});
