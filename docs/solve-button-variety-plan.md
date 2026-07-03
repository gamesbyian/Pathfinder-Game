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

Each tier runs the enumeration engine within a **scaled effort/time budget**, streams valid solutions
into an accumulating pool, and **saves every valid solution it finds** (exact-deduped, up to the 1,000
cap) — in both Editor and Review. The tier *number* controls how hard it searches, expressed in curator
terms: keep going until `selectDisplayHints` over the pool can confidently present ~N varied approaches,
or variety saturates, or the budget is hit. It returns the curator's varied subset (to show) **and** the
full saved pool (to persist), reporting both counts.

---

## Key design decisions (resolve these the same way everywhere)

1. **The number is a curator-confidence target, not a count of results.** "Find 25 varied" means:
   search until the accumulated pool is rich enough that the display curator (`selectDisplayHints`) can
   confidently surface ~25 *distinct* approaches. It is a **stopping target and an effort dial** — not
   the number saved and not (directly) the number shown. It is bounded by the level's real
   distinctiveness: on a level with 9 genuinely-different approaches, every tier ≥9 converges to the
   same 9 and the search stops early (saturated). Higher tiers just search harder before giving up. UI
   copy must convey "aim for up to N varied," never a guarantee.

2. **Save everything, always — in both Editor AND Review.** Every valid, exact-deduped solution the
   search finds is saved, because saved solutions are valuable data: they feed the heat map and give the
   curator more raw material. Saving is **not** filtered by distinctiveness or heatmap-novelty here — the
   back-end `decideCandidateAcceptance` gate exists to stop an *unattended batch* from bloating; an
   operator-driven Solve wants the data. The only bounds on saves are exact-dedupe and the 1,000-per-level
   cap. Display variety is the curator's job at play time; the corpus keeps the solutions.

3. **Two views of one pool** (show ≠ save): **show** the operator the distinctiveness-curated subset —
   the exact `selectDisplayHints` a player would cycle (coverage guarantees included) — as the variety
   preview; **save** the whole validated pool. The result must report both: "saved M solutions; the
   curator can present K varied approaches."

4. **Honest completion, three outcomes** (replace the single false "variety covered"), phrased in both
   curator and data terms:
   - **Exhaustive** — a *complete* deterministic enumeration finished within the node budget (feasible on
     small levels): "Found and saved all M solutions; the curator can present K varied approaches."
   - **Saturated** — the curated set stopped growing after many more raw finds: "The curator can present
     K varied approaches — that's all the meaningfully-different ones; saved M solutions."
   - **Budget-limited** — the effort ceiling hit first: "Saved M solutions so far (curator: K varied);
     more may exist — search again to keep looking." Keep the resumable "extend" affordance here.

5. **Coverage guarantees carry over and may exceed the target.** As in play-mode curation, the shown set
   always includes ≥1 per gate, per portal-usage, per must-cross order — even if that nudges slightly
   above the tier number. (This bounds only the *shown* preview; saves are unaffected.)

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

**Reuse the curation already in `modules/domain/`:**
- `selectDisplayHints(pool, { cap, navDensity, mustCrossKeys })` for the shown varied subset (the
  curator-confidence measure). This is a *view* over the pool, not a save filter.
- All the distance/coverage primitives are in `path-features.ts` (shared source of truth).
- Note: the back-end's `decideCandidateAcceptance` heatmap-novelty gate is deliberately **not** used to
  filter saves here — this flow saves the full validated pool (see decision 2).

**New session** replacing `createDiversificationSession` for this flow: a target-driven, resumable,
cooperatively-yielding session (`modules/solver/variety-search.ts` or fold into `hint-enumeration.ts`):
- streams solutions → PLAY-validate (`validateCandidatePath`) → exact-dedupe → **add to the saved pool**
  (this pool IS what gets persisted — every valid find);
- periodically recompute `selectDisplayHints(pool, { cap: target })`; track the curated size K;
- stop on: K ≥ target, or curator saturation (K unchanged after `stagnation` new raw finds), or time
  ceiling, or complete-enumeration finished (exhaustive), or the 1,000-per-level cap reached;
- return `{ shown, saved, curatedCount: K, savedCount: M, outcome: 'exhaustive'|'saturated'|'budget' }`
  — `saved` is the full validated pool, `shown` is the curated subset.
- Runs on the main thread with the existing `yieldFn` cooperative pattern (mirrors
  `executeSearch` in `solver-controller.ts`); keep cancel + progress + resumable-extend. On cancel or
  ceiling, the pool found so far is still saved.

**UI:** `solveOptionsModal` markup (see `modules/ui/dom.ts` id registrations + the modal template) —
swap the three timed buttons for the tier buttons + custom number; keep Find 1; keep the running
overlay (timer/progress/cancel) and the extend affordance for the budget-limited outcome.

**Persistence (both modes save):** Editor merges the full found pool into `foundHintsSinceLoad` (as
today, via `setFoundHintsSinceLoad` + `mergeUniqueHints`); those flow into the working level's hints and
heat map and persist when the level is saved. **Review mode also saves** — it must route the found pool
to wherever the reviewed level persists its hints (the submission record / working level for that mode),
not discard them. Confirm that persistence target (see Open decisions).

---

## Phases

**Phase 1 — Extract `hint-enumeration.ts` (no behavior change).** Move System A/B out of
`hint-corpus-expand.mjs` into the shared module with a streaming API + complete-enumeration mode; point
the script at it; prove parity (the script's full run reproduces the same accepts). Unit-test the
generators on a couple of small levels (exhaustive mode enumerates the known solution count).

**Phase 2 — Variety-search session.** Build the target-driven, resumable session that composes
enumeration + `selectDisplayHints`, saving the full validated pool and classifying the three outcomes.
Pure core, DOM-free, unit-tested (target reached / saturated / exhaustive on constructed levels; and
that the saved pool = all validated finds, not the curated subset).

**Phase 3 — Wire the Solve Options UI.** Replace timed buttons with tiers in `solveOptionsModal`;
rewrite `solver-controller.ts`'s diverse-search half to drive the new session; rewrite
`buildDiverseSearchSummary` (`solver-core.ts`) for the three honest outcomes, reporting **both** the
saved count M and the curator count K, in "up to N" language. Keep Find 1, cancel, progress, and the
resumable extend (budget outcome only). Wire Review's Solve to the same session.

**Phase 4 — Save policy (both modes).** On completion — and on cancel/ceiling — persist the **entire**
validated found pool (exact-deduped, ≤ 1,000-cap): Editor via `foundHintsSinceLoad`, Review via its
level-persistence target. Surface "saved M (curator: K varied)." Never filter saves by distinctiveness
or heatmap-novelty.

**Phase 5 — Tuning.** Calibrate tier → (node budget, restarts, seeds, time ceiling) so a few-second
tier reliably fills small levels and the largest tier makes real progress on hard ones without hanging
the UI. Seed the RNG per run for reproducibility.

---

## Invariants

- Every returned/saved hint passes `validateCandidatePath` in **PLAY** context (never `isSolutionState`
  alone) — geese/false-goal safety, same as `check:hint-validity`.
- **Every valid solution found is saved** (exact-dedupe + 1,000-cap the only filters), in both modes,
  including partial results on cancel/ceiling. The tier number governs *when to stop searching*, not
  *what to keep*.
- The **shown** set is exactly `selectDisplayHints` output — identical metric, floor, cap semantics, and
  coverage guarantees as the player's Hint display. Discovery and display never diverge (both go through
  `path-features.ts`).
- One generator engine (`hint-enumeration.ts`) backs both the back-end script and the Solve button —
  no duplicated search logic.
- The UI never freezes: all search is cooperative (`yieldFn`) and cancellable; partial results are
  always returned on cancel/ceiling.
- Completion messaging never claims exhaustiveness unless a complete enumeration actually finished.

## Open decisions (pick before Phase 3)

- **Tier numbers + ceilings:** exact curator targets (5/25/100?) and the seconds each is allowed.
  Recommend small tiers finish in a few seconds; the largest caps at, say, 20–30 s with an extend.
  (The number is the curator target K, per decision 1 — not a save count.)
- **Review-mode persistence target:** where do Review-mode saves land — the Firestore submission record,
  or the in-memory working level for that mode? Confirm the write path so "save everything" actually
  persists (and respects review/publish permissions).
- **Complete-enumeration size threshold:** the navigable-area/branching estimate below which we attempt
  exhaustive mode to earn the "all solutions" claim.
