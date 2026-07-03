# Solve Button → "Find N Varied Hints" — Plan

Replace the Editor/Review **Solve** flow's time-based diverse search with **count-based variety tiers**
powered by the enumeration + curation engine we already built for back-end corpus expansion. This is
both a correctness fix (the current search reports false "all found") and a feature (makers ask for a
number of distinct approaches, not a duration).

Audience: an AI coder implementing this. Read [`hint-discovery-design.md`](hint-discovery-design.md),
[`hint-curation.md`](hint-curation.md), and [`hint-corpus-expansion-plan.md`](hint-corpus-expansion-plan.md)
first — this reuses all three.

---

## Why (current state)

- The Solve button (`solveLevelBtn`) opens `solveOptionsModal` with **Find 1 Hint** + timed diverse
  searches (`solveDiverse5Btn`/`10Btn`/`20Btn` + custom minutes), driven by
  `modules/input/solver-controller.ts` → `createDiversificationSession` (`modules/solver/diversification.ts`).
- That session is **bias-replay**: it re-runs the greedy solver under a *fixed, finite* set of biases
  (gate × first-step direction, portal-exit direction) cascaded through profile/strategy disables. It
  finds a handful, exhausts the **combinations**, and reports (`solver-core.ts` `buildDiverseSearchSummary`)
  *"Every gate, direction, and strategy combination was explored — this level's existing hints already
  cover its solution variety."*
- That claim is false: the combination space ≠ the solution space. The back-end randomized enumerator
  found **thousands** more solutions on levels this reports "done" for. So: few results, fast, then a
  misleading "all found."

## Goal (target UX)

`solveOptionsModal` offers **effort/variety tiers** instead of durations, e.g.:

- **Find 1 solution** (unchanged — the existing single 30 s solve).
- **Find a few (~5 varied)**, **Find many (~25 varied)**, **Find lots (~100 varied)**, + a custom number.

Each tier runs the enumeration engine within a **scaled time ceiling**, streams valid solutions through
the **same curation the player sees**, and returns the distinct set — stopping when it has the requested
count, or when variety saturates, or when the ceiling is hit. Editor mode additionally **saves** the
heatmap-broadening finds to the working level.

---

## Key design decisions (resolve these the same way everywhere)

1. **The number is a CEILING and an effort dial, not a promise.** Curation early-stops at the
   distinctiveness floor, so "find 100 varied" on a level with 9 genuinely-different approaches returns
   **9** — and so does "find 25." Higher tiers *search harder* (bigger node/restart budget, seeded
   mutation, longer ceiling) and *allow* a larger display cap; they do not manufacture variety that
   isn't there. UI copy and the result summary must say "up to N."

2. **Two filters, two purposes** (do not conflate):
   - **Show** the maker the distinctiveness-curated subset — the exact `selectDisplayHints` a player
     would cycle (edge + crossing-on-near-Hamiltonian + must-cross-order, coverage guarantees). The tier
     count is that call's `cap`.
   - **Save** (Editor only) the **heatmap-novel** finds via the acceptance gate
     (`decideCandidateAcceptance`), so the level's heatmap broadens — same policy as the back-end run.
     A found solution can be worth saving (warms a cold cell) without being in the shown distinct subset,
     and vice-versa.

3. **Honest completion, three outcomes** (replace the single false "variety covered"):
   - **Exhaustive** — only when a *complete* deterministic enumeration finished within the node budget
     (feasible on small levels): "Found all N solutions to this level."
   - **Saturated** — the distinct set stopped growing after many more raw solutions: "Found N
     meaningfully-different approaches; more solutions exist but they closely resemble these."
   - **Budget-limited** — the time ceiling hit first: "Found N so far; more distinct approaches may
     exist — search again to keep looking." (Keep the resumable "extend" affordance for this case.)

4. **Coverage guarantees carry over and may exceed the count.** As in play-mode curation, always show
   ≥1 per gate, per portal-usage, per must-cross order — even if that nudges slightly above the tier
   number. A maker seeing "5 varied" that silently drops a whole gate is worse than seeing 6.

---

## Architecture / where code goes

**Extract the generators into a shared browser-safe core** (the central reuse win):

- New `modules/solver/hint-enumeration.ts` — the System A (randomized-restart enumeration) + System B
  (prefix-anchored completion) generators, lifted from `scripts/hint-corpus-expand.mjs`. They already
  use only browser-safe solver primitives (`createState`/`getNeighbors`/`applyMove`/`undoMove`/
  `prepLevel`/`getDistanceFromArray`/`isSolutionState`), so this is a move, not a rewrite. Expose a
  streaming API: `for await (const solution of enumerateSolutions(level, prep, { rng, nodeBudget,
  restarts, seeds, yieldFn, shouldStop }))`. Add a **complete-enumeration** mode (deterministic, no
  shuffle, exhaust all branches) that reports whether it finished (→ the "exhaustive" outcome).
- Then `scripts/hint-corpus-expand.mjs` imports from `hint-enumeration.ts` too — **one engine** behind
  both the back-end batch run and the in-editor Solve button. No second copy.

**Reuse the curation + acceptance already in `modules/domain/`:**
- `selectDisplayHints(pool, { cap, navDensity, mustCrossKeys })` for the shown distinct set.
- `decideCandidateAcceptance` / heatmap-novelty (`hint-novelty.ts`) for what Editor saves.
- All the distance/coverage primitives are in `path-features.ts` (shared source of truth).

**New session** replacing `createDiversificationSession` for this flow: a count-targeted, resumable,
cooperatively-yielding session (`modules/solver/variety-search.ts` or fold into `hint-enumeration.ts`):
- streams solutions → PLAY-validate (`validateCandidatePath`) → dedupe → grow pool;
- periodically recompute `selectDisplayHints(pool, { cap: target })`; track the distinct-set size;
- stop on: distinct-set ≥ target, or distinctiveness saturation (distinct set unchanged after
  `stagnation` new raw solutions), or time ceiling, or complete-enumeration finished (exhaustive);
- return `{ shown: number[][], saved: number[][], outcome: 'exhaustive'|'saturated'|'budget', totals }`.
- Runs on the main thread with the existing `yieldFn` cooperative pattern (mirrors
  `executeSearch` in `solver-controller.ts`); keep cancel + progress + resumable-extend.

**UI:** `solveOptionsModal` markup (see `modules/ui/dom.ts` id registrations + the modal template) —
swap the three timed buttons for the tier buttons + custom number; keep Find 1; keep the running
overlay (timer/progress/cancel) and the extend affordance for the budget-limited outcome.

**Persistence:** Editor merges saved finds into `foundHintsSinceLoad` (as today, via
`setFoundHintsSinceLoad` + `mergeUniqueHints`); those already flow into the working level's hints and
heat map. Review mode is inspection-only — show, do not save.

---

## Phases

**Phase 1 — Extract `hint-enumeration.ts` (no behavior change).** Move System A/B out of
`hint-corpus-expand.mjs` into the shared module with a streaming API + complete-enumeration mode; point
the script at it; prove parity (the script's full run reproduces the same accepts). Unit-test the
generators on a couple of small levels (exhaustive mode enumerates the known solution count).

**Phase 2 — Variety-search session.** Build the count-targeted, resumable session that composes
enumeration + `selectDisplayHints` + the acceptance gate, with the three-outcome classification. Pure
core, DOM-free, unit-tested (target reached / saturated / exhaustive on constructed levels).

**Phase 3 — Wire the Solve Options UI.** Replace timed buttons with tiers in `solveOptionsModal`;
rewrite `solver-controller.ts`'s diverse-search half to drive the new session; rewrite
`buildDiverseSearchSummary` (`solver-core.ts`) for the three honest outcomes + "up to N" language.
Keep Find 1, cancel, progress, and the resumable extend (budget outcome only). Wire Review's Solve to
the same session (show-only).

**Phase 4 — Editor save policy.** On completion, save the heatmap-novel finds (not just the shown
subset) into `foundHintsSinceLoad`; surface how many were saved vs shown. Respect the 1,000 cap.

**Phase 5 — Tuning.** Calibrate tier → (node budget, restarts, seeds, time ceiling) so a few-second
tier reliably fills small levels and the largest tier makes real progress on hard ones without hanging
the UI. Seed the RNG per run for reproducibility.

---

## Invariants

- Every returned/saved hint passes `validateCandidatePath` in **PLAY** context (never `isSolutionState`
  alone) — geese/false-goal safety, same as `check:hint-validity`.
- The **shown** set is exactly `selectDisplayHints` output — identical metric, floor, cap semantics, and
  coverage guarantees as the player's Hint display. Discovery and display never diverge (both go through
  `path-features.ts`).
- One generator engine (`hint-enumeration.ts`) backs both the back-end script and the Solve button —
  no duplicated search logic.
- The UI never freezes: all search is cooperative (`yieldFn`) and cancellable; partial results are
  always returned on cancel/ceiling.
- Completion messaging never claims exhaustiveness unless a complete enumeration actually finished.

## Open decisions (pick before Phase 3)

- **Tier numbers + ceilings:** exact counts (5/25/100?) and the seconds each is allowed. Recommend
  small tiers finish in a few seconds; the largest caps at, say, 20–30 s with an extend.
- **Does the count cap the shown set or the saved set?** Recommend: count = shown (`selectDisplayHints`
  cap); saved = all heatmap-novel finds regardless (bounded by the 1,000 cap + saturation).
- **Complete-enumeration size threshold:** the navigable-area/branching estimate below which we attempt
  exhaustive mode to earn the "all solutions" claim.
