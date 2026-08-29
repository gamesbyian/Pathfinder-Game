/** Unit tests for the variety-search session (Editor/Review Solve engine). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { normalizeRawLevel } from './normalization.js';
import { createVarietySearch } from './variety-search.js';

// 3×3 grid, gate (1,1)→goal (3,3), length 4, 0 intersections → exactly 6 monotone solutions.
function tiny() {
    const raw = { grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0 };
    const level = normalizeRawLevel(raw, 1);
    return { level, prep: prepLevel(level) };
}
let a = 1;
const rng = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };

test('complete mode finds & saves every solution and reports exhaustive', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng });
    const res = await s.run({ mode: 'complete' });
    assert.equal(res.outcome, 'exhaustive');
    assert.equal(res.savedCount, 6, 'saved the full solution set');
    assert.equal(res.newlySaved.length, 6);
    // Saved pool is the full set, not the (smaller) curated preview.
    assert.ok(res.shown.length <= res.savedCount);
});

test('does not re-report existing hints, but they count toward the pool', async () => {
    const { level, prep } = tiny();
    const existing = [[PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(2, 1), PACK(2, 2)]]; // one known solution
    const s = createVarietySearch(level, prep, existing, { rng });
    const res = await s.run({ mode: 'complete' });
    assert.equal(res.outcome, 'exhaustive');
    assert.equal(res.savedCount, 5, 'the other five, not the one already saved');
    assert.ok(!res.newlySaved.some(p => p.join(',') === existing[0].join(',')));
});

test('targeted mode reports "target" when the curator reaches the requested variety', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng, restarts: 8 });
    const res = await s.run({ mode: 'targeted', target: 2 });
    assert.equal(res.outcome, 'target');
    assert.ok(res.curatedCount >= 2);
    assert.ok(res.savedCount >= res.curatedCount, 'saves at least as many as it shows');
});

test('targeted mode reports "saturated" when the level cannot supply the requested variety', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng, restarts: 8 });
    const res = await s.run({ mode: 'targeted', target: 25 });
    assert.equal(res.outcome, 'saturated', 'a 6-solution level cannot present 25 distinct approaches');
    assert.ok(res.curatedCount < 25);
});

test('cap bounds the saved pool and reports capped', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng, maxHints: 3 });
    const res = await s.run({ mode: 'complete' });
    assert.equal(res.outcome, 'capped');
    assert.equal(res.savedCount, 3, 'stopped at the cap');
});

test('a per-run maxHints overrides the session default (resumable soft-stop -> hard-stop)', async () => {
    const { level, prep } = tiny();
    // Session default (1000) would never cap a 6-solution level; a per-run override can still cap it low.
    const s = createVarietySearch(level, prep, [], { rng });
    const soft = await s.run({ mode: 'complete', maxHints: 2 });
    assert.equal(soft.outcome, 'capped');
    assert.equal(soft.savedCount, 2, 'stopped at the run-specific cap, not the session default');
    // Resuming the same session at a higher cap (above the level's real solution count) can now exhaust.
    const hard = await s.run({ mode: 'complete', maxHints: 100 });
    assert.equal(hard.outcome, 'exhaustive');
    assert.equal(hard.savedCount, 6, 'newlySaved accumulates across resumed runs in the same session');
});

test('cancellation preserves partial results and reports cancelled', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng });
    // Cancel a few nodes in (before the tree is drained); shouldStop is polled per node.
    let cancelled = false;
    let polls = 0;
    const res = await s.run({
        mode: 'complete',
        shouldStop: () => { if (++polls > 5) cancelled = true; return cancelled; },
        isCancelled: () => cancelled,
    });
    assert.equal(res.outcome, 'cancelled', 'a requested stop is not reported as exhaustive');
    assert.equal(res.newlySaved.length, res.savedCount, 'whatever was found so far is preserved');
    assert.ok(res.savedCount <= 6);
});

test('budget stop (deadline, not cancel) reports budget in targeted mode', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng });
    let polls = 0;
    const res = await s.run({
        mode: 'targeted', target: 25,
        shouldStop: () => ++polls > 5,   // deadline-style stop
        isCancelled: () => false,        // not a cancel
    });
    assert.equal(res.outcome, 'budget');
});

// --- orderBy: 'admissible-slack' threading (hint-enumeration.ts's own tests cover the technique
// itself in depth — must-pass gauntlet pruning, soundness, the tight-budget win — these just verify
// the config option reaches the underlying enumeration calls and doesn't change complete-mode's
// completeness guarantee). ---

test('orderBy: "admissible-slack" still reaches full exhaustion with the identical solution set', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng, orderBy: 'admissible-slack' });
    const res = await s.run({ mode: 'complete' });
    assert.equal(res.outcome, 'exhaustive');
    assert.equal(res.savedCount, 6, 'same 6-solution set as default ordering (see the tiny() fixture doc)');
});

test('orderBy: "admissible-slack" in targeted mode does not hang or error despite a large restarts count', async () => {
    const { level, prep } = tiny();
    // restarts is meaningless (and internally capped to 1) under admissible-slack ordering, since
    // it's fully deterministic — this just proves a caller passing a large restarts value here
    // doesn't cause repeated redundant work to blow up runtime or otherwise misbehave.
    const s = createVarietySearch(level, prep, [], { rng, restarts: 500, orderBy: 'admissible-slack' });
    const res = await s.run({ mode: 'targeted', target: 6 });
    assert.equal(res.outcome, 'target');
    assert.equal(res.curatedCount, 6);
});

// --- newlySavedMeta.technique/scoringProfileId: does a caller building persisted provenance (e.g.
// hint-workbench.mjs's runEnumeration) actually get "which ordering strategy found this", or does
// it silently collapse to the same string as plain random ordering? Found and fixed 2026-07-25 as
// a real gap — a hint found via admissible-slack ordering was byte-identical, in its PERSISTED
// data/hints/<id>.json provenance, to one found via plain random order. ---

test('newlySavedMeta.technique is suffixed ":admissible-slack" when that ordering mode is used', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng, orderBy: 'admissible-slack' });
    const res = await s.run({ mode: 'complete' });
    assert.ok(res.newlySaved.length > 0);
    for (const meta of res.newlySavedMeta) {
        assert.ok(meta.technique.startsWith('enumerate-complete'), `unexpected technique: ${meta.technique}`);
        assert.ok(meta.technique.endsWith(':admissible-slack'), `expected the admissible-slack suffix, got: ${meta.technique}`);
    }
});

test('newlySavedMeta.technique has NO suffix under default (random/omitted) ordering — non-regression', async () => {
    const { level, prep } = tiny();
    const s = createVarietySearch(level, prep, [], { rng });
    const res = await s.run({ mode: 'complete' });
    assert.ok(res.newlySaved.length > 0);
    for (const meta of res.newlySavedMeta) {
        assert.equal(meta.technique, 'enumerate-complete', 'default ordering must leave the technique string exactly as before this feature existed');
        assert.equal(meta.scoringProfileId, null);
    }
});

test('newlySavedMeta.scoringProfileId reflects the tie-break setting under admissible-slack ordering', async () => {
    const { level, prep } = tiny();
    const withoutTieBreak = createVarietySearch(level, prep, [], { rng, orderBy: 'admissible-slack' });
    const r1 = await withoutTieBreak.run({ mode: 'complete' });
    assert.ok(r1.newlySavedMeta.every(m => m.scoringProfileId === null), 'no tie-break requested -> profile null');

    const withTieBreak = createVarietySearch(level, prep, [], { rng, orderBy: 'admissible-slack', tieBreakProfile: {} });
    const r2 = await withTieBreak.run({ mode: 'complete' });
    assert.ok(r2.newlySavedMeta.every(m => m.scoringProfileId === 'flat'), 'a real (if flatly-weighted) tie-break profile was applied -> profile "flat", not a POLICY_PROFILES name');
});
