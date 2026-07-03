# Solve Button → "Find N Varied Hints" — Plan

Replace the Editor/Review **Solve** flow's time-based diverse search with **count-based variety tiers**
powered by the enumeration + curation engine we already built for back-end corpus expansion. This is
both a correctness fix (the current search reports false "all found") and a feature (makers ask for a
number of distinct approaches, not a duration).

Audience: an AI coder implementing this. Read [`hint-discovery-design.md`](hint-discovery-design.md),
[`hint-curation.md`](hint-curation.md), and [`hint-corpus-expansion-plan.md`](hint-corpus-expansion-plan.md)
first — this reuses all three.

> **Status: Phases 1–4 built & shipped.** Engine (`modules/solver/hint-enumeration.ts`), session
> (`modules/solver/variety-search.ts`), Solver-facade API, tier/summary logic (`modules/input/solver-core.ts`),
> and the Solve Options UI (`solver-controller.ts` + `index.html`) are done, unit-tested, and browser-
> smoked (editor → "~5 varied" saves hints, honest summary, no errors). **Remaining:** Phase 5 tuning
> (tier ceilings are first-pass defaults) and the Open decisions below — notably **Review-mode
> persistence** (saves currently land in `foundHintsSinceLoad`; whether Review writes them back to the
> Firestore submission is still open) and the **complete-DFS hard safety ceiling**.

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
- **Find all possible hints** — exhaustive: enumerate the *entire* solution space (up to the 1,000-hint
  cap). Warn up front that this can take **20+ minutes** depending on the level and device, and is
  cancellable at any time (partial results are kept — see decision 6).

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

6. **"Find all" is complete enumeration, which subsumes the sampling techniques.** There is no bag of
   separate "techniques" to combine for completeness: a single **complete deterministic DFS** with the
   sound pruning visits the *entire* solution space and finds every solution — the randomized-restart
   and seeded-mutation generators are only *approximations* of it for when you can't afford the whole
   tree. So "Find all" runs the enumerator in complete mode (no random order needed, no curator target,
   no time ceiling) until one of:
   - **the tree is exhausted** → provably ALL solutions found (bounded only by the 1,000 cap);
   - **the 1,000-hint cap is reached** → saved the maximum; the level has more (not truly "all");
   - **the user cancels** → stop, keep everything found so far (decision 2), and **alert explicitly**:
     "Full search stopped early — a complete search was not finished, but the N solutions found so far
     were saved."

   Because open levels can have hundreds of thousands of solutions, "Find all" must show the 20+ minute
   warning before starting, stay fully cancellable, and stream progress (running found-count) so the
   user can make an informed stop decision. The 1,000 cap means "all" is really "all, or the first
   1,000" — see Open decisions if the cap should lift for this mode.

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

**New session** replacing `createDiversificationSession` for this flow: a resumable, cooperatively-
yielding session (`modules/solver/variety-search.ts` or fold into `hint-enumeration.ts`) with two modes
— **targeted** (the tiers) and **complete** ("Find all"):
- streams solutions → PLAY-validate (`validateCandidatePath`) → exact-dedupe → **add to the saved pool**
  (this pool IS what gets persisted — every valid find);
- *targeted mode*: periodically recompute `selectDisplayHints(pool, { cap: target })`, track curated
  size K, and stop on K ≥ target, curator saturation, time ceiling, complete-enumeration finished, or the
  1,000 cap;
- *complete mode ("Find all")*: no curator target, no time ceiling — run the deterministic complete DFS
  to exhaustion; stop only on tree-exhausted (`exhaustive`), the 1,000 cap (`capped`), or user cancel
  (`cancelled`). Still recompute `shown` at the end for the preview.
- return `{ shown, saved, curatedCount: K, savedCount: M, outcome:
  'exhaustive'|'saturated'|'budget'|'capped'|'cancelled' }` — `saved` is the full validated pool.
- Runs on the main thread with the existing `yieldFn` cooperative pattern (mirrors `executeSearch` in
  `solver-controller.ts`); keep cancel + progress + resumable-extend. **On cancel or ceiling the pool
  found so far is always saved** — for `cancelled` in complete mode, the UI must state a full search was
  not completed but partial results were preserved.

**UI:** `solveOptionsModal` markup (see `modules/ui/dom.ts` id registrations + the modal template) —
swap the three timed buttons for the tier buttons + custom number + a **Find all possible hints** button
carrying the "can take 20+ minutes, cancellable" warning (a confirm step before it starts); keep Find 1;
keep the running overlay (timer/progress/cancel) with a live found-count and the extend affordance for
the budget-limited outcome.

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
enumeration + `selectDisplayHints`, saving the full validated pool and classifying the five outcomes,
in both **targeted** and **complete ("Find all")** modes. Pure core, DOM-free, unit-tested (target
reached / saturated / exhaustive / capped / cancelled on constructed levels; that complete mode on a
small level enumerates exactly the known solution count; and that the saved pool = all validated finds,
not the curated subset).

**Phase 3 — Wire the Solve Options UI.** Replace timed buttons with tiers + **Find all** (with its
20+ minute confirm) in `solveOptionsModal`; rewrite `solver-controller.ts`'s diverse-search half to
drive the new session in both modes; rewrite `buildDiverseSearchSummary` (`solver-core.ts`) for all five
outcomes (`exhaustive`/`saturated`/`budget`/`capped`/`cancelled`), reporting **both** the saved count M
and the curator count K, in "up to N" language — and, for `cancelled`, the explicit "full search not
completed, partial results preserved" alert. Keep Find 1, cancel, progress, and the resumable extend
(budget outcome only). Wire Review's Solve to the same session.

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
- **"Exhaustive" is only claimed when the complete DFS actually drained the tree.** A `capped` or
  `cancelled` "Find all" run must never say "all solutions found"; `cancelled` must explicitly say the
  full search did not finish but partial results were saved. Complete mode is a single deterministic
  complete DFS — it needs no randomized/seeded generators to be exhaustive (they are subsets of it).
- The **shown** set is exactly `selectDisplayHints` output — identical metric, floor, cap semantics, and
  coverage guarantees as the player's Hint display. Discovery and display never diverge (both go through
  `path-features.ts`).
- One generator engine (`hint-enumeration.ts`) backs both the back-end script and the Solve button —
  no duplicated search logic.
- The UI never freezes: all search is cooperative (`yieldFn`) and cancellable; partial results are
  always returned on cancel/ceiling.
- Completion messaging never claims exhaustiveness unless a complete enumeration actually finished.

## Follow-on work (shipped after Phase 4)

- **Submission flow reuses the variety search.** The editor's submit step no longer does a one-shot
  single-solution solve; it runs a 10 s targeted variety search (`createVarietySearch`) with a live
  countdown and a running found-count, and submits *every* distinct solution found (partial results
  preserved on cancel). Same engine as the Solve button — see `modules/input/submission-controller.ts`.
- **Reviewer-found solutions fold into approvals.** Solutions a reviewer discovers via the Solve button
  land in `foundHintsSinceLoad` (the Review/editor Hints button counts and cycles them). Approval now
  merges that set into the persisted hints for both the hint-addition and full-submission paths, and
  re-validates the combined set when the level was modified during review
  (`modules/input/review-controller.ts`).

## Open decisions

- **Tier numbers + ceilings:** exact curator targets (5/25/100?) and the seconds each is allowed.
  Recommend small tiers finish in a few seconds; the largest caps at, say, 20–30 s with an extend.
  (The number is the curator target K, per decision 1 — not a save count.)
- ~~**Review-mode persistence target:**~~ *Resolved:* Review/editor saves land on the in-memory
  working level plus `foundHintsSinceLoad`, and are persisted when the reviewer approves (see Follow-on
  work above) or the maker submits — there is no separate Firestore write for a solve-only session.
- **Does the 1,000 cap lift for "Find all"?** As written, "Find all" saves the first 1,000 and reports
  `capped` (not truly all) on solution-rich levels. Recommend keeping the cap (it's a stated invariant
  and the curator + heat map stay rich at 1,000); revisit only if a maker explicitly wants an
  uncapped dump. Also decide the complete-DFS **hard safety ceiling** (node/time) that forces a `capped`/
  timeout stop so a pathological level can't run truly unbounded even if the user never cancels.
- **Complete-enumeration size threshold:** the navigable-area/branching estimate below which we attempt
  exhaustive mode to earn the "all solutions" claim.
