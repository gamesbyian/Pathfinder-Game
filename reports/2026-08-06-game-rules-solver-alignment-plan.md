# Game-rules/solver alignment: a fixed correctness bug and a plan for the rest (2026-08-06)

Prompted by "can we change how the game is coded to help the solver," not just the solver itself.
The premise: Pathfinder's move legality and win condition are re-derived independently in (at
least) three places — live play (`domain/move-rules.ts`'s `isValidMove`), the referee
(`domain/path-validator.ts`'s `validateCandidatePath`), and the solver
(`solver/search-state.ts`'s `getNeighbors`/`isMoveDynamicallyValid`) — plus a fourth, deliberately
independent reference (`scripts/solver-oracle/oracle.mjs`) that exists to catch solver bugs but,
by design, never checks the other three against each other. That structure was worth interrogating
directly rather than assuming it was already consistent.

**Section 1 is a fix already made and verified on this branch.** Sections 2–5 are proposed work,
ranked by payoff-per-risk, not yet implemented.

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

## 2. Open question: are flipping filters actually single-use, or is that a solver-only restriction?

Neither `isValidMove` nor `validateCandidatePath` blocks re-entering an already-crossed flipping
filter — a second visit is legal move-generation-wise, and (per the working part of the axis logic)
must use the *same* axis the first crossing established, since `crossedSet` only ever records a
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
("global crossing order determines each filter's *one* axis"). None of the three implementations
actually do the former; the solver is simply the only one that also forecloses the question by
banning re-entry outright.

**Why this matters for solve rate**: 957 of corpus-2's 1700 levels carry at least one flipping
filter. If re-entry is intended to be legal (matching what live play and the referee already
permit), the solver is discarding real solutions on every level where a re-entry is load-bearing —
a self-inflicted incompleteness, not a hard combinatorial wall. If single-use is the actual design
intent, the game-rule side should say so explicitly (and arguably enforce it, rather than leaving it
merely unreachable-in-practice for other reasons).

**Recommended next step**: resolve the intent question first (design decision, not a code change),
then either (a) codify single-use explicitly in `isValidMove`/`validateCandidatePath` — cheap, no
solver impact, purely clarifies the contract — or (b) relax `flipperUsedMask`'s blanket revisit-ban
in the solver to match the permissive game rule, gated behind a differential-fuzz proof (Section 3)
before touching production search. (b) is higher-risk (touches `applyMove`/`getNeighbors`, prep's
`deadFlipperKeys`, and every existing flipper-bearing hint's assumptions) and should not be
attempted without first checking whether any stress-corpus witness solution already re-enters a
flipper — if some do, that's a straight existence proof the solver is under-searching, not a
hypothesis.

---

## 3. Extend the differential oracle fuzzer to cover `isValidMove`, not just the solver

`scripts/solver-oracle/fuzz.mjs` cross-checks the solver's move generation against
`oracle.mjs` (an independent, from-scratch reimplementation of the rules) via move-by-move random
walks on small levels — exactly the mechanism that would have caught the MST-scratch-buffer bug
per its own doc, and exactly the class of bug this report just found by hand. It does **not**
import or exercise `move-rules.ts` at all, so it structurally cannot catch solver↔game drift — only
solver↔oracle drift. That's why the bug in Section 1 survived despite this tooling already existing.

**Recommendation**: add a third arm to the same harness that walks `isValidMove` (in
`MoveContext.PLAY`) in lockstep with the existing two, asserting three-way legal-move-set agreement
at every step, not just win-condition agreement at the goal. This is the single highest-leverage,
lowest-risk item here: it doesn't change any game behavior, it makes the *next* instance of this bug
class (three rule copies silently diverging) a CI failure instead of a report someone has to notice
by hand. Cost is small — the harness already generates levels and walks candidate sets; it needs one
more move-generator function plugged into the existing comparison loop, plus wiring the `PLAY`
context's state (`crossedFlippingFilters`, `armedFalseGoals`, etc.) alongside the two representations
the harness already threads through.

Longer-term, the same finding argues for collapsing to a single shared step-transition kernel that
all three call sites consume (the solver's typed-array state as one *representation* of it, not a
parallel reimplementation) rather than perpetually fuzzing three hand-synced copies. That's a much
larger, riskier refactor and not recommended as a first move — the fuzzer extension gets most of the
safety benefit for a fraction of the cost and risk.

---

## 4. The stress-corpus-2 population is mostly outside the shipped game's own complexity envelope

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

**Recommendation**: keep the uniform-random, unshaped corpus for its intended purpose (avoiding
overfit), but add a separate, smaller stratum generated at or below the shipped-game caps —
same generator, same "no theory, no scoring bias" philosophy, just with the object-count ceilings
restored to CLAUDE.md's documented maxima instead of +4. That gives a regression signal for "can the
solver solve levels players will actually encounter," tracked independently from the hard-tail
research population. Low risk, pure measurement addition — no production or solver code changes.

---

## 5. Decouple offline/batch solve budgets from the interactive Solve button's constraints

Not a game-rules issue, but squarely a "change something other than the solver's algorithms" lever,
and currently the single largest measured one. `reports/2026-08-01-budget-vs-algorithm.md` (already
in-repo) found, on a fully deterministic full-corpus A/B:

- Removing the 8-second wall-clock deadline alone (same node/work budget): **+32 corpus-2 solves**.
- Raising the node budget 1.8× on top of that: **+25 more**.
- Both together vs. the committed baseline: **505 → 562, +57**, from configuration alone — larger
  than the best algorithmic change measured in the same report (+28, the reserved-intersection wall).

The 8-second deadline exists because `solveLevel()` is also the live in-game hint generator, where
latency genuinely matters. Offline corpus refreshes, batch tooling, and research sweeps have no such
constraint and are currently inheriting it anyway.

**Recommendation**: this is already exactly what `disableExtraBudgetPasses` and the three
budget-fraction overrides in `SolveOpts` are for — the finding is that offline/CI batch tooling
should default to *not* inheriting the interactive-latency-shaped deadline at all (large or absent
wall-clock budget, generous node budget), reserving the tight deadline specifically for the
in-browser hint path. Confirm which batch entrypoints (per `docs/solver-architecture.md`'s
"Which tool for a corpus/large-batch solve" table) still default to the interactive shape and widen
them. Pure configuration change; no solver logic or game rule touched; the report already supplies
the before/after evidence, so this needs verification-at-scale (a full refresh with the new
defaults) rather than new research.

---

## 6. Lower priority: per-filter local flip vs. global-parity flip

Every flipping filter on a level currently shares one global toggle: the *k*-th distinct flipper
crossed (in any order, anywhere on the board) gets its declared axis XOR `(k−1) mod 2`, coupling a
filter's effective axis to unrelated traversal history elsewhere on the grid. That's precisely the
kind of global entanglement that defeats compact, local/regional reasoning about "sets of possible
completions" (the missing-middle-layer diagnosis in
`docs/solver-next-frontier-2026-08-02.md`) — a solver can't treat a region independently when a
global parity bit silently rewrites its geometry.

A per-filter local flip (each filter's axis flips only on *its own* successive uses, independent of
any other filter) would be decomposable and arguably matches CLAUDE.md's literal wording ("flips...
each time **the path uses it**") better than the current global-counter implementation. This is
**not recommended as near-term work**: it changes the accepted-solution set for all 1,012 existing
levels that carry flipping filters, needs full corpus re-validation and likely hint regeneration, and
its solver payoff is speculative until the local-consistency-propagation work in
`docs/solver-next-frontier-2026-08-02.md` §1 is far enough along to demonstrate the entanglement is
actually costing solved levels today. Recorded here as a design question worth raising with whoever
owns level-mechanic design, not a ticket to pick up unprompted.

---

## Suggested order

1. **Done.** Section 1 fix, merged with this report.
2. Oracle-fuzzer extension (Section 3) — cheapest, prevents recurrence of exactly this bug class.
3. Offline budget decoupling (Section 5) — pure configuration, largest measured lever, evidence
   already exists.
4. In-envelope stress stratum (Section 4) — measurement only, clarifies what "solve rate" means.
5. Flipper single-use resolution (Section 2) — needs a design decision before any code change;
   worth raising early given the size of the affected population (957 levels) even though the fix
   itself would land later.
6. Per-filter local flip (Section 6) — hold for a design conversation, not scheduled work.
