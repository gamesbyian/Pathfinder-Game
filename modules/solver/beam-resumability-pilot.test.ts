/** Beam-resumability feasibility pilot (docs/solver-search-resumability.md, rung 1: "same beam,
 *  same policy: pause/resume equivalence"). Research-only — proves or disproves, for ONE
 *  deterministic beam action, that pausing beamSearchFromGate at a phase boundary and resuming it
 *  via the new `resumeFrom`/`pauseAfterPhases` params (search.ts) reproduces an uninterrupted run
 *  to the same eventual phase count: same solved/unsolved outcome, same solution when solved, same
 *  cumulative work (`prep._workMeter.units`, the canonical cross-technique quantity — see
 *  docs/solver-optimization-workstreams.md's "use workSpent for cross-technique allocation" rule),
 *  and the same `nodesExpanded` diagnostic. See reports/2026-09-03-beam-resumability-feasibility-
 *  pilot-001.md for the full report this test file backs.
 *
 *  Deliberately does not touch mechanicBucketRetention's RNG question because there isn't one:
 *  neither beamSearchFromGate nor _mechanicBucketSelect uses Math.random or any seed anywhere —
 *  confirmed by inspection, both configurations below are exercised for coverage regardless.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { beamSearchFromGate, type BeamContinuation } from './search.js';
import type { NormalizedLevel } from '../domain/types.js';

function makeLevel(overrides: Record<string, unknown> = {}) {
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

// Real solved multi-phase fixture: reuses the exact 9x9 wandering level already relied on by
// search.test.ts's nodeBudget/nodesExpanded contract tests (24 steps of slack over a Manhattan
// distance of 16 forces >=40 completed phases before the beam reaches goal).
const SOLVED_LEVEL = makeLevel({ grid: { w: 9, h: 9 }, requiredLength: 40, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)] });

// Same level as SOLVED_LEVEL, but exercised at beamWidth=1 (a real algorithmic failure mode, not a
// designed-impossible one: width-1 greedy hill-climbing on this level was empirically checked —
// see reports/2026-09-03-beam-resumability-feasibility-pilot-001.md — to run ~20 real phases,
// hitting real dead ends and pruning candidates away one at a time, before the frontier finally
// collapses to zero and beamSearchFromGate takes its natural-exhaustion `cands.length === 0 break`
// exit. This is deliberately a different exit path than the solved fixture's — a wide-beam attempt
// at requiredLength=41 (impossible purely by move-parity) was tried first and rejected every
// candidate in phase 1 with no real search at all, which would have made a trivial pilot case.

// Richer-mechanics fixture (same shape as search.test.ts's numeric/string coarse-state-key
// differential test): must-pass + flipping filters exercise the coarse-state-merge and
// mechanic-bucket-retention machinery every phase, not just plain score-width culling.
const MECHANIC_LEVEL = makeLevel({
  grid: { w: 9, h: 9 }, requiredLength: 40, requiredIntersections: 0, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)],
  mustPassKeys: [PACK(2, 2), PACK(4, 4), PACK(6, 6)],
  flippingFilterMap: new Map([[PACK(3, 3), 1], [PACK(5, 5), 2]]),
});

interface StagedRun { result: number[] | null; workUnits: number; nodesExpanded: number; }

async function runUninterrupted(level: NormalizedLevel, beamWidth: number, mechanicBucketRetention: boolean): Promise<StagedRun> {
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const result = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, beamWidth, null, mechanicBucketRetention);
  return { result, workUnits: prep._workMeter.units, nodesExpanded: prep._metrics.nodesExpanded };
}

// Pauses once at `pauseAfterPhases`, asserts the pause actually produced a continuation (i.e. the
// boundary was reached before any solve), then resumes the SAME prep to completion. Sharing one
// prep across both calls is deliberate, not incidental: it is what makes prep._workMeter.units
// cumulative and canonical across the pause for free (see search.ts's header comment on
// resumeFrom/pauseAfterPhases), exactly how a real in-process scheduler would reuse one prep
// across a paused-then-resumed attempt.
async function runStaged(level: NormalizedLevel, beamWidth: number, mechanicBucketRetention: boolean, pauseAfterPhases: number): Promise<StagedRun> {
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const paused: { pausedContinuation?: BeamContinuation } = {};
  const firstResult = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, beamWidth, null, mechanicBucketRetention, paused, Infinity, undefined, pauseAfterPhases);
  assert.equal(firstResult, null, 'the boundary must land before any solve for this to be a real pause/resume test');
  assert.ok(paused.pausedContinuation, 'a phase-boundary pause must always populate out.pausedContinuation');
  assert.equal(paused.pausedContinuation!.phasesCompleted, pauseAfterPhases);

  const resumed: { pausedContinuation?: BeamContinuation } = {};
  const result = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, beamWidth, null, mechanicBucketRetention, resumed, Infinity, paused.pausedContinuation, undefined);
  return { result, workUnits: prep._workMeter.units, nodesExpanded: prep._metrics.nodesExpanded };
}

function assertEquivalent(staged: StagedRun, reference: StagedRun, label: string) {
  assert.deepEqual(staged.result, reference.result, `${label}: solve/unsolved outcome and solution path must match exactly`);
  assert.equal(staged.workUnits, reference.workUnits, `${label}: cumulative canonical work (prep._workMeter.units) must match exactly`);
  assert.equal(staged.nodesExpanded, reference.nodesExpanded, `${label}: nodesExpanded diagnostic must match exactly`);
}

test('beam pause/resume: solved case reproduces an uninterrupted run at an early phase boundary', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 16, false);
  assert.ok(reference.result, 'sanity: the reference run must actually solve');
  const staged = await runStaged(SOLVED_LEVEL, 16, false, 5);
  assertEquivalent(staged, reference, 'solved/phase=5');
});

test('beam pause/resume: solved case reproduces an uninterrupted run at a late phase boundary', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 16, false);
  assert.ok(reference.result);
  const staged = await runStaged(SOLVED_LEVEL, 16, false, 35);
  assertEquivalent(staged, reference, 'solved/phase=35');
});

test('beam pause/resume: unsolvable (width-1 greedy) case reproduces an uninterrupted run\'s full natural exhaustion', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 1, false);
  assert.equal(reference.result, null, 'sanity: the reference run must genuinely fail to solve');
  const staged = await runStaged(SOLVED_LEVEL, 1, false, 8);
  assertEquivalent(staged, reference, 'unsolved/phase=8');
});

test('beam pause/resume: multiple pause boundaries on the same run all reproduce the uninterrupted reference', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 16, false);
  assert.ok(reference.result);
  for (const pauseAfterPhases of [1, 10, 20, 30, 39]) {
    const staged = await runStaged(SOLVED_LEVEL, 16, false, pauseAfterPhases);
    assertEquivalent(staged, reference, `solved/phase=${pauseAfterPhases}`);
  }
});

test('beam pause/resume: coarse-state-merge / mechanic-bucket-retention machinery survives a pause boundary', async () => {
  for (const mechanicBucketRetention of [false, true]) {
    const reference = await runUninterrupted(MECHANIC_LEVEL, 16, mechanicBucketRetention);
    assert.ok(reference.result, `sanity: mechanicBucketRetention=${mechanicBucketRetention} reference must solve`);
    const staged = await runStaged(MECHANIC_LEVEL, 16, mechanicBucketRetention, 15);
    assertEquivalent(staged, reference, `mechanic/retention=${mechanicBucketRetention}`);
  }
});

test('beam pause/resume: a resumed continuation can itself be paused again (chained resumption)', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 16, false);
  assert.ok(reference.result);

  const prep = prepLevel(SOLVED_LEVEL);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const stage1: { pausedContinuation?: BeamContinuation } = {};
  const r1 = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, stage1, Infinity, undefined, 10);
  assert.equal(r1, null);
  assert.ok(stage1.pausedContinuation);

  const stage2: { pausedContinuation?: BeamContinuation } = {};
  const r2 = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, stage2, Infinity, stage1.pausedContinuation, 25);
  assert.equal(r2, null, 'the second stage must also pause, not solve, before phase 25');
  assert.ok(stage2.pausedContinuation);
  assert.equal(stage2.pausedContinuation!.phasesCompleted, 25);

  const stage3: { pausedContinuation?: BeamContinuation } = {};
  const r3 = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, stage3, Infinity, stage2.pausedContinuation, undefined);
  assertEquivalent({ result: r3, workUnits: prep._workMeter.units, nodesExpanded: prep._metrics.nodesExpanded }, reference, 'chained resume (pause at 10, then 25, then run to completion)');
});

test('beam pause/resume: pauseAfterPhases/resumeFrom left undefined leaves existing call sites byte-for-byte unaffected', async () => {
  // Same call shape every other beamSearchFromGate caller already uses (production and tests) --
  // the two new trailing params simply never appear. This is the "default production behavior
  // must remain unchanged" architecture rule from solver-search-resumability.md, made concrete.
  const level = makeLevel({ grid: { w: 3, h: 1 } });
  const prep = prepLevel(level);
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

// captureContinuationOnBudgetExit (rung 2 prerequisite): the existing prep._workCap-based budget
// exit is a real, exact-work ceiling already used throughout the production ladder — a fixed-WORK
// complementarity test (rung 2 of solver-search-resumability.md's research ladder) needs to pause
// AT that ceiling, not just at a chosen phase count. Proves the same pause/resume equivalence as
// the pauseAfterPhases tests above, but triggered by prep._workCap instead.
test('beam pause/resume: captureContinuationOnBudgetExit pauses at prep._workCap and resumes to an equivalent uninterrupted run', async () => {
  const reference = await runUninterrupted(SOLVED_LEVEL, 16, false);
  assert.ok(reference.result);

  const prep = prepLevel(SOLVED_LEVEL);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._workCap = Math.floor(reference.workUnits / 3);
  const paused: { timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
  const firstResult = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, paused, Infinity, undefined, undefined, true);
  assert.equal(firstResult, null, 'a work cap well below the solve cost must not solve');
  assert.equal(paused.timedOut, undefined, 'a captured-continuation budget exit is a pause, not a plain timeout — out.timedOut stays unset, same convention as pauseAfterPhases');
  assert.ok(paused.pausedContinuation, 'captureContinuationOnBudgetExit=true must populate a continuation at the work-cap exit');
  assert.ok(prep._workMeter.units >= prep._workCap, 'the pause must actually be at/past the requested work cap');

  prep._workCap = Infinity; // lift the cap so the resumed call can run to completion
  const resumed: { pausedContinuation?: BeamContinuation } = {};
  const result = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, resumed, Infinity, paused.pausedContinuation, undefined);
  assertEquivalent({ result, workUnits: prep._workMeter.units, nodesExpanded: prep._metrics.nodesExpanded }, reference, 'work-cap pause/resume');
});

// Historical discovery from running the rung-2 pilot script (see search.ts's own historical CAVEAT
// comment and reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md's "Finding 1"):
// the separate mid-phase budget check (every 256 frontier nodes, inside one phase's own candidate
// walk) used to evaluate unconditionally, independent of prep._workCap's size, so for any
// beamWidth > 256 it always noticed a crossed cap before the top-of-loop check got a turn, once a
// single phase's own frontier was actually bigger than 256 -- captureContinuationOnBudgetExit then
// silently never fired. FIXED 2026-09-10 (search.ts's own "RESOLUTION" comment): a capturing caller
// now skips the mid-phase early exit entirely, so this same >256-node scenario captures correctly
// at the next phase boundary instead. This test now proves the FIX, not the historical limitation.
//
// Rather than relying on organic multi-phase branching to grow a >256 frontier (calibration on
// several real level shapes found coarse-state-merge collapses candidates down well before that on
// every level shape tried), this manufactures an oversized frontier directly: pause a real, valid,
// small SOLVED_LEVEL search after one phase, then splice its own single frontier node 300 times
// into a synthetic resumeFrom. Every one of those 300 "positions" is byte-identical and legitimately
// reachable (it's a real captured node, just listed many times) -- the mid-phase check only counts
// iterations of the walk, so this is a faithful, minimal way to force a >256-node single phase
// without needing a level big enough to grow one organically.
test('beam pause/resume: captureContinuationOnBudgetExit now captures a phase bigger than 256, at beamWidth > 256, via the bounded-overshoot mid-phase skip', async () => {
  const seedPrep = prepLevel(SOLVED_LEVEL);
  seedPrep._cfg = null;
  const seedOut: { pausedContinuation?: BeamContinuation } = {};
  await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);
  const seed = seedOut.pausedContinuation!;
  const oversizedFrontier = Array.from({ length: 300 }, () => seed.frontier[0]);
  const syntheticContinuation: BeamContinuation = { ...seed, frontier: oversizedFrontier };

  // Resume with the SAME startKey/level/prep the continuation was captured against (seedPrep) --
  // search.ts's runtime ownership assertion (2026-09-09, historical regression-risk audit item #5)
  // rejects a resumeFrom call against a different prep instance. Using seedPrep's own CURRENT
  // prep._workMeter.units directly gives an accurate cap relative to this exact prep's state.
  const capBeforeResume = seedPrep._workMeter.units + 200; // well inside the 300-node synthetic phase's own walk
  seedPrep._workCap = capBeforeResume;
  const out: { timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
  const path = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 300, null, false, out, Infinity, syntheticContinuation, undefined, true);
  assert.equal(path, null);
  assert.equal(out.timedOut, undefined, 'a captured-continuation budget exit is a pause, not a plain timeout');
  assert.ok(out.pausedContinuation, 'beamWidth > 256 with a >256-node phase must still capture, now that the mid-phase check defers to the top-of-loop check instead of racing it');
  assert.ok(seedPrep._workMeter.units >= capBeforeResume, 'the pause must land at/past the requested cap');
  // Bounded-overshoot contract: the capture can overshoot by at most one phase's own work (this
  // synthetic phase processes 300 candidate-generation batches from the same position), never more.
  // Exact bound depends on per-candidate cost, so this only asserts the qualitative direction that
  // motivated the fix -- it does overshoot somewhat, it does not run away unboundedly.
  assert.ok(seedPrep._workMeter.units < capBeforeResume + 5_000_000, 'overshoot must stay bounded to roughly one phase\'s own work, not runaway');
});

// The mid-phase check's own counting behavior (real walked nodes, not the nominal beamWidth
// parameter) survives unchanged for the NON-capturing path -- captureContinuationOnBudgetExit left
// off is byte-for-byte the historical behavior this test originally locked in, since the 2026-09-10
// fix only changes what happens when a caller explicitly opts in (see the test above).
test('beam pause/resume: without capturing, the mid-phase check is still governed by actual phase size, not the nominal beamWidth parameter', async () => {
  const seedPrep = prepLevel(SOLVED_LEVEL);
  seedPrep._cfg = null;
  const seedOut: { pausedContinuation?: BeamContinuation } = {};
  await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);
  const seed = seedOut.pausedContinuation!;
  const oversizedFrontier = Array.from({ length: 300 }, () => seed.frontier[0]);
  const syntheticContinuation: BeamContinuation = { ...seed, frontier: oversizedFrontier };

  seedPrep._workCap = seedPrep._workMeter.units + 200;
  const out: { timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
  // beamWidth itself stays irrelevant to how many nodes THIS phase walks (that's resumeFrom's
  // frontier length, already fixed at 300) -- what beamWidth controls here is only the mid-phase
  // check's OWN threshold comparison base (frontierIndex, incremented once per node exactly the
  // same way regardless of beamWidth). The real controlling constant is the hardcoded 256 in the
  // `(frontierIndex & 255) === 0` check itself, not beamWidth -- pass an arbitrary small beamWidth
  // here to isolate that: even a tiny nominal beamWidth cannot stop this pre-supplied 300-node
  // frontier from tripping the same mid-phase counter once frontierIndex reaches 256. No trailing
  // `true` argument here -- captureContinuationOnBudgetExit left at its default (false).
  const path = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, out, Infinity, syntheticContinuation, undefined);
  assert.equal(path, null);
  assert.equal(out.timedOut, true, 'the mid-phase check counts walked nodes, not beamWidth -- a 300-node phase still trips it regardless of the nominal beamWidth, when not capturing');
  assert.equal(out.pausedContinuation, undefined, 'no continuation without opting in, matching every production caller');
});

// Full pause/resume EQUIVALENCE at a >256-node phase (search.ts's own bounded-overshoot fix is only
// useful if resuming from the overshot capture still reproduces the same eventual outcome as an
// uninterrupted run of the identical oversized-phase scenario -- the two tests above only check
// that capture happens, not that resuming from it is safe). Builds the same synthetic oversized
// continuation TWICE, independently, from two separately-seeded preps (BeamContinuation ownership
// requires the resuming prep to be the exact instance the continuation was captured against, so one
// synthetic continuation cannot be shared across a reference and a staged run) -- both constructions
// are fully deterministic (no RNG in this fixture/path), so they are equivalent starting points.
test('beam pause/resume: capturing past a >256-node phase and resuming reproduces an uninterrupted run of the identical oversized-phase scenario', async () => {
  async function buildSyntheticOversizedContinuation(): Promise<{ prep: ReturnType<typeof prepLevel>; continuation: BeamContinuation }> {
    const prep = prepLevel(SOLVED_LEVEL);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const seedOut: { pausedContinuation?: BeamContinuation } = {};
    await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);
    const seed = seedOut.pausedContinuation!;
    const oversizedFrontier = Array.from({ length: 300 }, () => seed.frontier[0]);
    return { prep, continuation: { ...seed, frontier: oversizedFrontier } };
  }

  // Reference: run the oversized phase (and beyond) to natural completion, uninterrupted.
  const ref = await buildSyntheticOversizedContinuation();
  const refOut: { pausedContinuation?: BeamContinuation } = {};
  const refPath = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, ref.prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 300, null, false, refOut, Infinity, ref.continuation, undefined);

  // Staged: capture partway through the SAME oversized phase (independently constructed, same
  // deterministic inputs), then resume with the cap lifted.
  const staged = await buildSyntheticOversizedContinuation();
  const cap = staged.prep._workMeter.units + 200;
  staged.prep._workCap = cap;
  const pausedOut: { timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
  const pausedPath = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, staged.prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 300, null, false, pausedOut, Infinity, staged.continuation, undefined, true);
  assert.equal(pausedPath, null, 'sanity: the boundary must land before this oversized phase itself resolves the search');
  assert.ok(pausedOut.pausedContinuation, 'must actually capture past the >256-node phase');

  staged.prep._workCap = Infinity; // lift the cap so the resumed call can run to completion
  const resumedOut: { pausedContinuation?: BeamContinuation } = {};
  const resumedPath = await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, staged.prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 300, null, false, resumedOut, Infinity, pausedOut.pausedContinuation, undefined);

  assert.deepEqual(resumedPath, refPath, 'staged capture+resume must reach the same eventual result as the uninterrupted reference');
  assert.equal(staged.prep._workMeter.units, ref.prep._workMeter.units, 'cumulative canonical work must match exactly despite the mid-phase pause');
  assert.equal(staged.prep._metrics!.nodesExpanded, ref.prep._metrics!.nodesExpanded, 'nodesExpanded diagnostic must match exactly despite the mid-phase pause');
});

test('beam pause/resume: captureContinuationOnBudgetExit left false (default) leaves the existing budget-exit contract byte-for-byte unaffected', async () => {
  // Mirrors search.test.ts's own nodeBudget contract test, just re-asserted here as a regression
  // guard for THIS exact code path (the budget exit now branches on captureContinuationOnBudgetExit
  // before doing anything else) rather than trusting the untouched search.test.ts copy alone.
  const level = makeLevel({ grid: { w: 9, h: 9 }, requiredLength: 40, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)] });
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  prep._workCap = 1000;
  const out: { timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 60_000, Date.now(), null, 40, null, false, out);
  assert.equal(path, null);
  assert.equal(out.timedOut, true, 'without opting in, a work-cap exit must still report a plain timeout, exactly as before this change');
  assert.equal(out.pausedContinuation, undefined, 'without opting in, no continuation should ever be attached');
});

// 2026-09-09 historical regression-risk audit item #5: BeamContinuation carries live mutable
// execution state (ws/liveUndo) and is documented as requiring the SAME startKey/level/prep on
// resume -- previously an unenforced convention. These three tests prove the new runtime identity
// assertion (search.ts's assertBeamContinuationOwnership) actually fires on each of the three
// possible mismatches, rather than silently reusing state built against the wrong instance.
test('beam pause/resume: resuming with a different prep throws immediately instead of corrupting the run', async () => {
  const seedPrep = prepLevel(SOLVED_LEVEL);
  seedPrep._cfg = null;
  const seedOut: { pausedContinuation?: BeamContinuation } = {};
  await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);

  const otherPrep = prepLevel(SOLVED_LEVEL);
  otherPrep._cfg = null;
  await assert.rejects(
    beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, otherPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, {}, Infinity, seedOut.pausedContinuation, undefined),
    /prep \(different instance\)/,
  );
});

test('beam pause/resume: resuming with a different level throws immediately instead of corrupting the run', async () => {
  const seedPrep = prepLevel(SOLVED_LEVEL);
  seedPrep._cfg = null;
  const seedOut: { pausedContinuation?: BeamContinuation } = {};
  await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);

  const otherLevel = makeLevel({ grid: { w: 3, h: 1 } });
  await assert.rejects(
    beamSearchFromGate(PACK(0, 0), otherLevel, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, {}, Infinity, seedOut.pausedContinuation, undefined),
    /level \(different instance\)/,
  );
});

test('beam pause/resume: resuming with a different startKey throws immediately instead of corrupting the run', async () => {
  const seedPrep = prepLevel(SOLVED_LEVEL);
  seedPrep._cfg = null;
  const seedOut: { pausedContinuation?: BeamContinuation } = {};
  await beamSearchFromGate(PACK(0, 0), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, seedOut, Infinity, undefined, 1);

  await assert.rejects(
    beamSearchFromGate(PACK(1, 1), SOLVED_LEVEL, seedPrep, SCORING_PROFILES.default, 60_000, Date.now(), null, 16, null, false, {}, Infinity, seedOut.pausedContinuation, undefined),
    /startKey \(captured/,
  );
});
