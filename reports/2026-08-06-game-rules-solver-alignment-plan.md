# Game-rules/solver alignment: a fixed correctness bug and a plan for the rest (2026-08-06)

Prompted by "can we change how the game is coded to help the solver," not just the solver itself.
The premise: Pathfinder's move legality and win condition are re-derived independently in (at
least) three places — live play (`domain/move-rules.ts`'s `isValidMove`), the referee
(`domain/path-validator.ts`'s `validateCandidatePath`), and the solver
(`solver/search-state.ts`'s `getNeighbors`/`isMoveDynamicallyValid`) — plus a fourth, deliberately
independent reference (`scripts/solver-oracle/oracle.mjs`) that exists to catch solver bugs but,
by design, never checks the other three against each other. That structure was worth interrogating
directly rather than assuming it was already consistent.

**All sections (1, 1b, 1c, 2, 3, 4, 5, and 6) are resolved and verified on this branch.**

---

## 1. Fixed: flipping-filter entry-axis check was dead code in live play (and the referee's delegate)

### The bug

`isValidMove`'s flipping-filter branch computed the filter's currently-required axis like this
(both the `filterTarget` and, structurally identically but harmlessly, the `filterLast` side):

```js
let filterTarget = level.filterMap.get(targetKey);
if (filterTarget === undefined && level.flippingFilterMap.has(targetKey) && crossedSet.has(targetKey)) {
    const relevantFlipCount = crossedSet.get(targetKey) ?? 0;
    ...
}
```

`crossedSet` (`nav.crossedFlippingFilters`) only ever gains an entry for a cell *after* the step
onto it has been committed (`runtime/path-state.ts`'s `pushStep`). `isValidMove` runs *before* that
commit, to decide whether the step is legal in the first place. So `crossedSet.has(targetKey)` is
**always false** for a flipping filter's first-ever crossing — which, since flippers are only
single-use in every current implementation, is the only crossing that matters. The whole branch
was dead: **live play enforced no entry-axis restriction on flipping filters at all**, contradicting
CLAUDE.md's own mechanics table ("starts with its declared axis") and the solver's own (correct)
enforcement of the same rule.

The practical exposure went two levels deep:

1. **Wrong-axis entry.** A player could physically walk onto a flipping filter along either axis,
   not just its declared one.
2. **Turning on it, undetected in live play.** CLAUDE.md states a flipping filter "cannot turn on
   it," and the referee has its own explicit geometric check for this. Live play (`isValidMove`
   alone, with no such explicit check) relies entirely on the entry/exit axis checks lining up
   correctly; with entry unchecked, a path could enter off-axis and exit along whichever axis the
   filter's *own* designated axis happened to require — a real 90° turn on the cell, silently
   accepted. Verified directly: a constructed 5×5 level with one flipping filter, entered
   vertically and exited horizontally, was **accepted** by live-play `isValidMove` and **rejected**
   by both the referee and the solver.

Because `win-controller.ts`'s `saveWinAsHintIfNovel` persists any Play-mode win directly to
Firestore as a supplemental hint — checked only for path-signature novelty, never re-validated
against `validateCandidatePath` — an illegal win of this shape would have been served back to other
players as a hint. `check:hint-validity` (part of `npm run ci`) only covers the on-disk corpus, so
it would not have caught this class of Firestore-only contamination.

The referee (`validateCandidatePath`) delegates its own per-step check to the same buggy
`isValidMove`, but happens to be protected from the *turn* case by a second, independent geometric
check it layers on top; it had no independent protection against a straight-through wrong-axis
crossing, though that case is (non-obviously) caught by the same exit-side check that's always been
correct. Net effect: the referee was accidentally sound; live play was not.

### Blast-radius check before fixing

Probed all three corpora's stored hints (12,517 published + stress-1 + stress-2, ~17,000 hints
touching a flipping filter) for wrong-axis or re-entrant crossings: **zero** matches in any corpus.
Every stored hint was solver-produced, and the solver's own entry check was never buggy, so no
corpus cleanup was needed — this was a live-game-and-referee-only gap, not a data-quality one.

### The fix

`modules/domain/move-rules.ts`: when a flipping filter's target cell isn't yet in `crossedSet`
(the general case — its first, only-that-matters crossing), fall back to the live global flip
counter (`_flipCount`, an option the function already accepted and computed correctly everywhere
it's called from, but never actually read) instead of skipping the check:

```js
const relevantFlipCount = crossedSet.has(targetKey) ? (crossedSet.get(targetKey) ?? 0) : _flipCount;
```

This alone closes both exposure paths: once entry is pinned to the filter's currently-designated
axis and exit already was, a turn (entry axis ≠ exit axis) becomes structurally unreachable without
needing a separate turn-detection check in `isValidMove` — the two symptoms were one root cause.

### Verification

- New regression tests in `modules/domain/domain.test.ts` covering both the wrong-axis-rejected and
  declared-axis-accepted cases directly against `isValidMove`, mirroring the existing plain-filter
  test pair.
- One pre-existing test in `modules/domain/path-validator.test.ts` asserted a rejection at "step 8"
  for a wrong-axis crossing of a second (parity-flipped) flipper; with the fix, the referee now
  rejects at "step 7" — the actual point of the illegal entry, one step earlier than before, via the
  newly-live entry check rather than incidentally via the exit check on the following step. Updated
  the assertion and added a comment explaining why the step number moved.
- Full `npm run ci` run: all checks pass except one pre-existing, unrelated lint error in
  `scripts/stress/pocket-bridge-probe.mjs` (present before this change, not touched by it).
  `check:hint-validity` (12,612 stored hints) and `test:hint-path-oracle` (160/160 bundled levels)
  both pass, confirming the fix doesn't invalidate any existing stored solution.
- Two `search.test.ts` failures seen under full-suite `test:coverage` (a `timeLimit: 1000`ms
  `findTrapSpots` budget test) reproduced as flaky CPU-contention artifacts, per CLAUDE.md's own
  sandbox-throttling caveat — both pass cleanly standalone and as part of their own file's full run,
  unrelated to this change.

---

## 1b. Fixed: the must-cross lock was unenforced in live play (and the referee's delegate)

### The bug

CLAUDE.md's "Must-cross lock" gotcha and the solver's own `_isMoveDynValid` both state the rule
plainly: a must-cross cell must be crossed **straight through** (same entry and exit axis) while its
2-visit requirement is still pending — turning there consumes both axis bits and makes the required
second straight crossing permanently impossible. `search-state.ts` enforces exactly this. `isValidMove`
enforced no such thing: a player could enter a still-pending must-cross cell on one axis and turn to
exit on the other, something no solver-produced path could ever do.

This was initially misdiagnosed (by the author of this report, mid-session) as an *intentional*
solver-only pruning optimization analogous to the goose/false-goal exclusion — plausible-looking, and
wrong. Corrected directly by the user: "the player must obey the must-cross lock: if the player draws
a line vertically into a mustCross square, they must immediately edit vertically. they cannot turn
inside the mustcross." Re-tracing the exact call sequence (`crossCounts`/`counts` increments on
entry; the lock must fire on the very next move, the exit of that same visit) confirmed this is a
real, always-enforced game rule with a genuine implementation gap — not a documented divergence.

### The fix

`modules/domain/move-rules.ts`: hoisted the already-computed `entryAxis` (axis used to enter the
cell being left, previously scoped only to the edge-reuse-origin check) into a shared local, then
added the lock check itself, keyed off the same axis comparison and the cell's own visit count:

```js
// Must-cross lock: a must-cross cell must be crossed straight through (entered and exited on
// the same axis) while its requirement is still pending (fewer than 2 visits so far) — turning
// there would consume both axis bits, making the required 2nd straight crossing permanently
// impossible. Mirrors search-state.ts's isMoveDynamicallyValid (CLAUDE.md's "Must-cross lock"
// gotcha) — that check was solver-only until this fix; live play enforced no such restriction.
if (!isPortalJumpCandidate && entryAxis !== AXIS_NONE && axis !== entryAxis
        && level.mustCrossKeys.includes(lastK) && (counts.get(lastK) || 0) === 1) {
    return setReason('invalid-must-cross-turn');
}
```

Because `validateCandidatePath` delegates every step to `isValidMove`, the fix propagates to the
referee automatically — no separate change needed there, unlike Section 1's flipping-filter case
(which the referee happened to catch by a different, independent path).

### Verification

- Two new regression tests in `modules/domain/domain.test.ts`: turning at a still-pending must-cross
  cell is now rejected; continuing straight through the same cell remains valid. A third test
  ("turning is allowed once the requirement is already satisfied") was written, found to be
  untestable in isolation — by the time the must-cross requirement is satisfied, the *only* legal
  continuation is already the edge-reuse-exempted straight one, so satisfaction status alone never
  changes the verdict — and removed rather than kept as a misleading assertion.
- Tightened the existing `path-validator.test.ts` "must-cross lock" regression test: the referee now
  rejects the illegal path at the turn itself (step 5) instead of only catching it two steps later at
  the now-impossible second entry attempt (step 8, via ordinary edge-reuse).
- Extended `scripts/solver-oracle/fuzz.mjs`'s third arm (Section 3) to walk `isValidMove` against the
  oracle+solver's agreed legal-move set: 0 mismatches across 900+ freshly generated levels both before
  committing this fix (where the must-cross-lock gap showed up as real, expected divergences) and
  after.
- `npm run solver:bench -- --check`: 160/160 published levels solved, no regressions vs.
  `logs/solver-baseline.json`. This fix only tightens live play/the referee — it does not touch
  solver code — but the check confirms it doesn't silently invalidate any existing accepted solution.
- Full `modules/domain/domain.test.ts` + `modules/domain/path-validator.test.ts` suite: 184/184 pass.

---

## 1c. Fixed: `isValidMove`'s own win-metrics check was missing must-turn

### How this was found

Investigating "prototype a shared compiled graph" (a different ranked-programme item) required
tracing every real caller of `isValidMove` to understand what `checkWinMetrics` actually gates.
That trace turned up a genuine gap: `move-rules.ts`'s `checkWinMetrics` block (fired when stepping
onto the goal) checks must-pass, must-cross, surround, and adjacent-turn — but never must-turn.
`runtime/game-rules.ts`'s `areWinMetricsSatisfied` — a separate, independently-written function
that is the actual arbiter of live-play wins — checks all five, correctly, and already has its own
regression test for exactly this (`domain.test.ts`'s "checkWinConditionImpl: must-turn level needs
turnsAtMap"). The two functions had quietly drifted: one complete, one not.

### Why this is not a live bug

Traced every real call site of `isValidMove` before concluding anything:

- `MoveContext.PLAY` (`checkWinMetrics: true`) has exactly one live caller —
  `path-validator.ts`'s referee. The referee builds its own `turnsAtCell` map during its per-step
  loop and runs an independent, correct post-loop must-turn check (and adjacent-turn check) using
  it — genuinely, not just apparently, redundant with what `isValidMove`'s block would do if fixed.
  It also never passes a `turnsAtMap` into `isValidMove`'s own state, so even the *pre-existing*
  adjacent-turn check inside `checkWinMetrics` already silently no-ops for this caller (a
  deliberate "omitted contexts skip conservatively" design, per that check's own comment) — the
  missing must-turn check was simply consistent with an already-inert sibling check for this one
  caller, not a special new gap.
- `MoveContext.TAP_ROUTE` (used by all live interactive path-drawing code —
  `runtime/step-processor.ts`, `runtime/path-state.ts`, `input/pointer-input-controller.ts`) has
  `checkWinMetrics: false`, so the block never fires at all for those callers.
- `MoveContext.SOLVER` (`checkWinMetrics: true`) has **zero production call sites** — it exists only
  as a domain-layer unit-test preset representing solver-equivalent semantics; the real solver uses
  its own separate, independently-correct `search-state.ts`/`solution.ts` implementation, never
  `isValidMove` at all.
- Live play's actual win declaration goes through `runtime/game-rules.ts`'s
  `checkWinConditionImpl`/`areWinMetricsSatisfied`, which was already correct.

So no path in the running application was ever affected by this gap.

### Why it was worth fixing anyway

`path-validator.ts`'s post-loop must-turn/adjacent-turn checks *look* redundant with
`isValidMove`'s `checkWinMetrics` block to a future reader who hasn't traced the exact state each
caller supplies — a very plausible "clean up this apparent duplication" refactor would silently
reintroduce a real must-turn bypass in the referee. Closing the drift at the root (making
`isValidMove` correct and complete on its own terms, matching `game-rules.ts` exactly) removes that
trap, at zero behavioral cost to any current caller.

### The fix

Added the same must-turn check `game-rules.ts` already has to `move-rules.ts`'s `checkWinMetrics`
block, reading `state?.nav?.turnsAtMap ?? state?.turnsAtMap` the same conservative way the
pre-existing adjacent-turn check already does (skip, don't false-reject, when absent).

### Verification

- Extended `domain.test.ts`'s shared `makeLevel`/`makeState` test helpers to support
  `mustPassTurnDirs`/`surroundKeys`/`adjacentTurnKeys`/`adjacentTurnDirs` and a supplied
  `turnsAtMap` — none of these were previously constructible via these helpers at all, so the
  sibling surround/adjacent-turn checks were *also* untested by `domain.test.ts` before this (out
  of scope to add here; noted for whoever picks that up next).
- Three new regression tests (never-turned rejects, correctly-turned accepts, absent-`turnsAtMap`
  conservatively accepts) — confirmed the never-turned test fails without the fix and passes with
  it.
- **Found and fixed a second, pre-existing bug while building the first test**: the existing
  "mustPass key absent blocks reaching goal" test passed for the wrong reason — its `state.path`
  already ended at `goalKey` before validating a move *to* `goalKey`, so `isValidMove`'s
  unconditional `invalid-after-goal` rule fired first and the test never actually exercised
  `checkWinMetrics`'s must-pass check at all. Confirmed via direct diagnostics before fixing. Fixed
  by passing `path.slice(0, -1)` as the pre-move state, matching what `isValidMove`'s contract
  actually expects.
- All 170 `domain.test.ts` tests and all 188 combined `domain.test.ts` + `path-validator.test.ts`
  tests pass. `check:hint-validity`: all 12,612 stored hints remain valid (expected — this only
  adds a check that was silently inert for every real caller). `solver:bench -- --check`: 160/160
  published levels solved, no regressions (no solver code touched; this only tightens a
  domain-layer function).

---

## 2. Resolved: flipping filters are single-use by design

Neither `isValidMove` nor `validateCandidatePath` blocked re-entering an already-crossed flipping
filter — a second visit was legal move-generation-wise, and (per the working part of the axis logic)
had to use the *same* axis the first crossing established, since `crossedSet` only ever records a
cell's *first* crossing. The solver, by contrast, treats every flipper as strictly single-use:

```js
// search-state.ts, isMoveDynamicallyValid
if (fi !== -1) {
    if (state.flipperUsedMask & (1 << fi)) return false;   // already used → can never re-enter
    ...
}
```

CLAUDE.md's own wording — "flips to the other axis **each time the path uses it**" — reads more
naturally as "this specific filter alternates on repeated crossings" than the implemented model
("global crossing order determines each filter's *one* axis"), and none of the three
implementations actually did the former — the solver was simply the only one that also foreclosed
the question by banning re-entry outright.

### The attempted existence check, and why it was inconclusive

Before raising the design question, tried the "straightforward existence check" this section
originally proposed: scanned every stored hint AND every generator witness solution (published +
both stress corpora + the in-envelope stratum, 17,000+ hint paths and 1,111 flipper-bearing witness
solutions) for a flipper re-entry. Zero found, everywhere — but this is **not** evidence either way:
every stored hint is solver-produced (structurally cannot re-enter, `flipperUsedMask` already bans
it), and `generate-random.mjs`'s `opFlippersUniform` only ever places flippers on singly-visited
witness cells (`ctx.cell.straightThrough`), so a witness re-entry is generator-impossible by
construction regardless of whether it would ever help solvability. No data source in this codebase
could have produced the real answer; this had to be a design decision, not a measurement.

### The design ruling

**Single-use is the correct, intentional design.** Once the line has crossed a flipping filter, a
second crossing is impossible in practice: (a) the filter's required axis has already flipped, so
re-entering via the original axis is an axis mismatch, and (b) re-entering via the newly-required
axis would require the line to travel along an edge it has already used at that cell, which it
cannot do. This is an emergent consequence of the axis-flip rule and edge-reuse combined — not
something either rule states on its own — so it is stated explicitly now rather than left as a
coincidence three independent implementations would each need to separately re-derive correctly.

### The fix

`isValidMove`'s axis-matching and edge-reuse checks happened to combine into blocking most
re-entry attempts, but not all of them: entering a second time via the filter's newly-required
(post-flip) axis is a *fresh* axis at that cell (edge-reuse never fires) and matches what the axis
check currently expects (post-flip) — so the old code would have wrongly **accepted** that specific
re-entry shape. Fixed by adding an explicit `invalid-flipper-reentry` check ahead of the axis logic
in `modules/domain/move-rules.ts`, mirroring the solver's `flipperUsedMask` outright rather than
relying on two unrelated checks to coincidentally produce the right answer. No solver code
changed — the solver already had this right.

**Verification**: a new regression test (extending `domain.test.ts`'s `makeState` helper to support
a non-zero `flipCount`, needed to isolate this from the axis check — confirmed the test fails
without the fix and passes with it); all 12,612 stored hints remain valid (none were ever produced
via a re-entry, since the solver already banned it); 0 oracle-fuzzer mismatches; `solver:bench
--check` 160/160 with no regressions (this only tightens live play/the referee — no solver code
touched).

---

## 3. Fixed: extended the differential oracle fuzzer to cover `isValidMove`, not just the solver

`scripts/solver-oracle/fuzz.mjs` cross-checks the solver's move generation against
`oracle.mjs` (an independent, from-scratch reimplementation of the rules) via move-by-move random
walks on small levels — exactly the mechanism that would have caught the MST-scratch-buffer bug
per its own doc, and exactly the class of bug this report just found by hand. It previously did
**not** import or exercise `move-rules.ts` at all, so it structurally could not catch solver↔game
drift — only solver↔oracle drift. That's why the bug in Section 1 survived despite this tooling
already existing.

**Done**: added a third arm to the same harness that walks `isValidMove` in lockstep with the
existing two, asserting three-way legal-move-set agreement at every step (not just win-condition
agreement at the goal), plus win-condition agreement itself. Checked under `MoveContext.TAP_ROUTE`,
not `PLAY` as originally proposed and not `SOLVER` either — both were tried and rejected:

- `SOLVER`'s `checkWinMetrics: true` makes `isValidMove` refuse to step onto the goal at all unless
  must-pass/must-cross are already satisfied, but move generation never asks that question (whether
  arriving is a genuine win is a separate, later check, already compared independently at the goal) —
  produced ~70% spurious mismatches, all "domain refuses the goal early, oracle+production allow it."
- `PLAY` would produce spurious mismatches on any generated level with a goose/false-goal on the
  walked path (legal-but-hazardous in play; structurally pruned from the solver/oracle search space
  as an optimization — a correct, intentional scope difference, not a bug to flag).

State for `isValidMove` is built via the real `runtime/path-state.js`'s `rebuildDerivedState`, not
hand-rolled, so the harness doesn't risk a fourth independently-buggy state tracker. Movement
comparison stops once any implementation reaches the goal (mirroring `isValidMove`'s unconditional
"invalid-after-goal" rule, which move generation never needs since production search treats an
unsuccessful goal arrival as a dead end and never continues past it).

This is exactly the check that caught the must-cross-lock gap (Section 1b) as a real, reproducible
divergence rather than requiring another by-hand report — verified at 0 mismatches across 900+
generated levels once both fixes landed. **This class of bug is now a CI-catchable failure, not
something that depends on a human noticing.**

Longer-term, the same finding argues for collapsing to a single shared step-transition kernel that
all three call sites consume (the solver's typed-array state as one *representation* of it, not a
parallel reimplementation) rather than perpetually fuzzing three hand-synced copies. That's a much
larger, riskier refactor and not recommended as a first move — the fuzzer extension already got most
of the safety benefit for a fraction of the cost and risk.

---

## 4. Added an in-envelope stress stratum, separate from the stress-corpus-2 population

`scripts/stress/generate-random.mjs` deliberately raises every object cap **+4 over the documented
published maxima** (CLAUDE.md's "Level Stats") and draws counts from the upper half of the raised
range — a considered design choice, explicitly meant to avoid overfitting the corpus to the current
solver's known strengths. But it means the corpus and "will the solver solve levels players actually
see" are now two different questions, and only one of them is being tracked.

Scored every corpus-2 level by how many of the shipped game's own dimensions it exceeds (must-pass
≤4, must-cross ≤4, portals ≤3 pairs, flippers ≤4, filters ≤6, landmarks ≤5, reqInt ≤11), against
`logs/stress-corpus2-baseline.json`'s "carries a valid hint from any source" flag (an upper bound on
solvability, not a typical-budget solve rate):

| envelope dimensions exceeded | levels | solved |
|---|---|---|
| 0 | 6 | 83.3% |
| 1 | 118 | 66.1% |
| 2 | 463 | 50.1% |
| 3 | 621 | 31.9% |
| 4 | 383 | 20.6% |
| 5 | 107 | 12.1% |
| 6 | 2 | 0.0% |

Only 6 of 1700 corpus-2 levels sit fully inside the shipped envelope (thin sample, but the gradient
across all 1700 is not). "The solver solves ~30% of corpus-2" is substantially a statement about how
far outside the shipped game's own complexity range that corpus reaches, not a statement about
player-facing solver capability.

### The fix

Kept the uniform-random, unshaped corpus for its intended purpose (avoiding overfit) and added a
separate, smaller stratum instead: `data/stress/stress-levels-envelope.json`, 200 levels, same
generator (`scripts/stress/generate-random.mjs`) and same "no theory, no scoring bias" philosophy,
just with the object-count ceilings restored to CLAUDE.md's documented per-level maxima (new
`--envelope-caps` flag) instead of the raised +4. Pure measurement addition — no production or
solver code changed; the generator itself gained the flag (plus `--id-prefix` for the new
stratum's own `E`-prefixed id namespace) and `level-data-io.mjs`'s `hintsDirFor` was generalized
from a hardcoded two-corpus check to a suffix-derivation so a third `stress-levels-<suffix>.json`
sibling gets its own hint directory automatically.

**Initial solve pass** (`portfolio-solve-sweep.mjs`, legacy scheduler, 60s/20M per-level budget,
one quick pass, not a high-budget campaign): **124/200 solved (62.0%)**, all 124 saved hints
independently re-verified against `validateCandidatePath`. This confirms the hypothesis directly:
62.0% at the shipped envelope vs. corpus-2's own 605/1700 = 35.6% (as of 2026-07-25, itself
inflated well past a typical-budget number by two rounds of targeted high-budget sweeping) — a
population generated at the shipped game's own caps solves at a markedly higher rate than one
deliberately raised past them, even under much lighter effort. Full detail, regeneration command,
and the file-table entries: `data/stress/README.md`'s "Third stratum: in-envelope" section.

Deliberately **not** added to `check:corpus-level-formatting`/`check:level-provenance`'s hardcoded
"3 real corpora" lists, or to CLAUDE.md's "3 real corpora" invariant language elsewhere — this
stratum follows the same on-disk conventions (compact one-line-per-level format, stamped
provenance, id-keyed hint storage) as good hygiene, without formally joining that specific,
already-pervasively-documented invariant.

---

## 5. Decoupled offline/batch solve budgets from the interactive Solve button's constraints

Not a game-rules issue, but squarely a "change something other than the solver's algorithms" lever,
and the single largest measured one. `reports/2026-08-01-budget-vs-algorithm.md` (already in-repo)
found, on a fully deterministic full-corpus A/B:

- Removing the 8-second wall-clock deadline alone (same node/work budget): **+32 corpus-2 solves**.
- Raising the node budget 1.8× on top of that: **+25 more**.
- Both together vs. the committed baseline: **505 → 562, +57**, from configuration alone — larger
  than the best algorithmic change measured in the same report (+28, the reserved-intersection wall).

The 8-second deadline exists because `solveLevel()` is also the live in-game hint generator, where
latency genuinely matters. Offline corpus refreshes, batch tooling, and research sweeps have no such
constraint but were inheriting it anyway.

### Audit: which entrypoints actually inherit the interactive shape

Traced every solver call site before touching anything:

- `SolveOpts.disableExtraBudgetPasses` is already correctly scoped — only the interactive UI
  (`solver-controller.ts`, `review-controller.ts`) and internal tight-iteration sub-passes
  (`diversification.ts`, `hint-ablation-generator.ts`'s cascades) set it. No batch/CI script does.
  This half of the decoupling was already correct; nothing to fix.
- Ad-hoc debugging tools (`solver:direct`, `stress:solve-one`, `stress:smoke`, `solver:speed-probe`)
  default to small (4–30s) budgets, but that's the right call for quick iteration (CLAUDE.md's
  "iterate light, gate heavy") — a dev overrides `--budget-ms` explicitly when a real answer matters.
  Not a bug.
- `solver:bench` (the CI regression gate) defaults to a 120s deadline / 100M work budget matching
  `logs/solver-baseline.json`'s own generation parameters — deliberate parity for the regression
  check's purpose, not an oversight. Changing it requires a full rebaseline and is out of scope here.
- **The actual match**: `.github/workflows/solver-stress-refresh.yml`, the workflow that commits the
  persisted corpus/hint/baseline data to `main`, defaulted `corpus2_budget_ms=8000` /
  `corpus1_budget_ms=20000` — traced to its own README, which says these values exist only because
  they "match the historical corpus-1 baseline's own budget," a value inherited from the original
  `solver-corpus2-batch-*.yml` scheme and carried forward through every rewrite since, never a
  deliberate choice for what an offline refresh needs.

### The fix

Raising that one workflow's routine defaults is a different class of change from wiring an opt-in
flag: it's what actually gets committed to `main`'s corpus/hint/baseline data going forward, and it
breaks strict numeric continuity with every prior refresh's binding-budget-shaped history. Flagged
for explicit sign-off rather than done unilaterally; sign-off given 2026-08-06.

`solver-stress-refresh.yml`'s routine (non-`deterministic`) defaults now match this report's own
measured OFF@36M configuration exactly (91 corpus-1 / 562 corpus-2 solved, 0 clock-bound, 0
deadline-truncated): `corpus2_budget_ms`/`corpus1_budget_ms` default to a non-binding 24h value,
`corpus2_node_budget` defaults to 36M (was 20M), and corpus-1 now always gets a real node ceiling
via `corpus1_node_budget` (previously deterministic-only, since corpus-1's small deadline had made a
node cap unnecessary). Both sweeps' per-shard timeout wrappers are widened unconditionally (45m/300m)
to give the now-routine non-binding deadline room to actually not bind. `deterministic=true` keeps a
narrower, distinct purpose: force a truly unbounded deadline regardless of what's typed into
`corpus*_budget_ms`, and never commit — for an `enable_flags` A/B that must not touch the persisted
baseline series.

### Verified: the real dispatch

Dispatched `solver-stress-refresh.yml` (run 31072921874) against `main` under the new defaults —
completed in ~29 minutes (all 20 shards + combine succeeded), far faster than the report's own
sequential 47,671s figure, since sharding already parallelizes the corpus across 20 runners.
Result, committed to `main` (`94a3046`): **corpus-1 95/102, corpus-2 684/1700** — corpus-2 up from
605/1700, **+79 solves**, even more than the report's own OFF@36M measurement (562/1700, +57 vs.
the old binding baseline) predicted, likely because additional solver fixes (must-cross lock,
flipping-filter entry axis, beam dedup) landed on `main` between the report's 2026-07-25 measurement
and this refresh. This is now the corpus's real, current baseline — not an estimate.

---

## 6. Resolved: the global-parity flip is intentional design, not a smell

Every flipping filter on a level shares one global toggle: the *k*-th distinct flipper crossed (in
whatever order the path reaches them, anywhere on the board) gets its declared axis XOR `(k−1) mod
2`, coupling a filter's effective axis to traversal history elsewhere on the grid. This was
originally flagged as a candidate problem — the kind of global entanglement that defeats compact,
local/regional reasoning about "sets of possible completions" (the missing-middle-layer diagnosis
in `docs/solver-next-frontier-2026-08-02.md`) — with "per-filter local flip" (each filter's axis
flips only on its own successive uses) proposed as a possible decoupled alternative.

**That alternative doesn't actually exist as a live option.** Section 2 already established that a
flipping filter can be crossed at most once, ever — so "its own successive uses" can never number
more than one, and a strictly local model collapses to "always the declared axis," i.e., a flipping
filter indistinguishable from a plain filter. The global crossing-order coupling isn't one of two
equally-valid implementations of "flipping" — it is the *only* mechanism currently making a flipping
filter behave differently from a regular one, since the sole source of any flip is *other* filters'
crossings happening first.

**Design confirmation (2026-08-06)**: raised directly with the person who owns level-mechanic
design. Flipping filters are deliberately interactive in exactly this way — "at any given moment,
the accessible orientation of the flipping filters depends on whether or not other flipping filters
have already been traversed by the line, and how many." This is harder for a designer to reason
about in general, but becomes tractable when the designer deliberately uses other board constraints
(blocks, geometry, must-pass placement, …) to force the line through the level's flippers in a
specific, intended order — the entanglement is the puzzle mechanism, not an accident to be engineered
away.

Checked both branches this could still matter on before closing it out:

- **Solver-side**: no live evidence the solver struggles with flipping filters specifically — per
  the design owner's own experience, "the solver doesn't seem to struggle with flipping filters and
  never has." A prep-time forced-crossing-order derivation (mirroring the existing gate/must-cross
  forced-first-move rule) was considered as a possible follow-up if this had been a real pain point,
  but there's no measured need to justify building it.
- **Editor-side**: the editor currently gives a designer no way to verify "given everything else
  I've placed, is my flipper crossing order actually forced/unambiguous" while building a level —
  confirmed by the design owner. No one has asked for this, so per this codebase's own "build for
  measured need, not hypothesized future need" discipline, it's noted here rather than built.

**Fixed**: CLAUDE.md's own mechanics table previously described flipping filters as flipping "each
time the path uses it" — worded as if a single filter flips on its own repeated uses, which the
single-use rule makes impossible. Corrected to state the single-use rule directly and describe the
level-wide crossing-order parity accurately, rather than a per-cell repeat-use model that can never
actually fire.

No code change beyond the documentation fix: the global-parity implementation is confirmed correct
and intentional as-is, so nothing here changes the accepted-solution set for the 1,012 existing
levels that carry flipping filters.

---

## Suggested order

**All sections are now resolved; nothing remains open in this document.** Section 1 fix
(flipping-filter entry axis), Section 1b fix (must-cross lock), Section 1c fix (must-turn missing
from `isValidMove`'s own win-metrics check — found while investigating a different ranked-programme
item, not a live bug but a real drift-and-trap fix), the Section 3 oracle-fuzzer extension, Section
5's offline budget decoupling, Section 4's in-envelope stress stratum, Section 2's flipper
single-use resolution, and Section 6's global-parity-flip design confirmation — all merged with
this report. The fuzzer extension already proved its worth in-session: it's what turned
the must-cross-lock gap into a reproducible finding. Section 5's dispatch under the new defaults
landed **corpus-1 95/102, corpus-2 684/1700** on `main` (+79 vs. the old baseline). Section 4's
initial solve pass (124/200, 62.0%) confirmed its underlying hypothesis. Section 2 resolved toward
single-use being correct, codified explicitly rather than left as an implementation coincidence.
Section 6, raised directly with the design owner, confirmed the global crossing-order coupling is
the intentional puzzle mechanism (not a smell) and found no live solver or editor pain point to
justify further engineering — closed with a documentation fix only.
