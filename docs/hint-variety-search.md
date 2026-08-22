# Solve Button: "Find N Varied Hints"

Editor/Review **Solve** uses count-based variety tiers on the same enumeration + curation engine as corpus expansion. It replaced timed bias replay, which could exhaust a finite bias space without exhausting solution variety.

Related: [`hint-curation.md`](hint-curation.md) for display curation; [`archive/`](archive/) for design history.

> **Status: complete, in production.** Main implementation: `modules/solver/hint-enumeration.ts`, `modules/solver/variety-search.ts`, Solver facade, `modules/input/solver-core.ts`, `solver-controller.ts`, `index.html`; also used by submission/review controllers. Tier ceilings are deliberate defaults; retune only for observed slowness.

## UX and semantics

`solveOptionsModal` offers:

- **Find 1 solution**: existing single 30 s solve.
- **Find a few (~5 varied)**, **many (~25)**, **lots (~100)**, plus custom target.
- **Find all (up to 1,000)**: deterministic complete DFS, hard cap 1,000.
- **Find all — no cap**: same engine; prompt at 2,500, hard cap 5,000.

Find-all warns **20+ minutes**, streams progress, supports cancel, and keeps partial results.

Tier N is a **curator-confidence target/effort dial**, not a save or display guarantee. Search stops when `selectDisplayHints` can show about N distinct approaches, variety saturates, or budget/cap ends. Coverage may make the shown set slightly exceed N; UI says “aim for up to N varied.”

Every valid exact-deduped solution is saved up to the run cap. `decideCandidateAcceptance` is for unattended batch novelty control, not operator-run retention. The operator sees the `selectDisplayHints` subset; persistence gets the full validated pool. Report both saved M and curated K.

Targeted outcomes:

- **exhaustive**: complete deterministic enumeration drained the tree within budget;
- **saturated**: more raw finds stopped increasing the curated set;
- **budget**: effort ended first.

Complete mode also uses **capped** (1,000, user stop at 2,500, or 5,000 before exhaustion) and **cancelled** (partial results saved; UI says full search did not finish). Only drained complete DFS may claim `exhaustive`; randomized/prefix generators are not completeness evidence.

Shown hints preserve play curation coverage: at least one per gate, portal-use class, and must-cross order when available, even above target.

## Architecture

### Shared enumeration core

`modules/solver/hint-enumeration.ts` owns browser-safe System A randomized restart, System B prefix-anchored generation, streaming enumeration, and deterministic complete mode using shared solver primitives. `scripts/hint-corpus-expand.mjs` imports it, so batch expansion and Solve share one generator core.

### Curation

`selectDisplayHints(pool, { cap, navDensity, mustCrossKeys })` in `modules/domain/` produces the shown subset; distance/coverage primitives live in `path-features.ts`. `decideCandidateAcceptance` never filters Solve saves.

### Variety session

`modules/solver/variety-search.ts` provides resumable/cooperatively-yielding **targeted** and **complete** modes.

Pipeline: enumerate -> PLAY `validateCandidatePath` -> exact dedupe -> save every valid find.

Targeted mode recomputes curation periodically and stops on target, saturation, time, complete-enumeration finish, or `maxHints`. Complete mode has no curator target/time ceiling and runs deterministic DFS to exhaustion, cap, or cancel. Capped sessions can resume at a higher `maxHints` for 2,500 -> 5,000.

```js
{
  shown,
  newlySaved,
  newlySavedMeta,
  rediscovered,
  curatedCount: K,
  savedCount: M,
  outcome: 'exhaustive'|'saturated'|'budget'|'capped'|'cancelled'
}
```

`newlySavedMeta` stores `nodesExpanded`, `elapsedMs`, technique. `rediscovered` stores provenance for independently re-found existing hints without duplicating the pool; workbench uses it, in-game UI ignores it.

Targeted mode stays main-thread with `yieldFn`. Complete mode uses the worker pool when available, otherwise the same main-thread session. Both preserve cancel/progress/resume/partial results.

### Performance

**Targeted:** fixed every-20-finds curation made full-pool `selectDisplayHints` scans 44–71% of wall time on rich levels (~2 ms at pool 50, ~41 ms at 1,950). `curationCheckInterval()` now uses `max(20, pool.length / 10)`, making checks roughly geometric; matched real-level output was unchanged and ~27% faster.

**Complete:** raw DFS was 84–92% of real-level time; validation/dedupe and `yieldFn` were each ~7–8%. This CPU-bound mode uses parallel workers.

### Parallel Find-all pool

Complete mode shards by `(gate, root-child)` through `hint-enumeration.ts::rootChildren`; DFS semantics stay unchanged. Workers stream raw candidates, while PLAY validation/dedupe remain main-thread. `createEnumerationPoolClient` returns the same `VarietyResult` shape.

Pool creation/run failure falls back to main-thread complete mode for the browser session. Verification covers real 3-worker execution, both Find-all variants, 2,500 -> 5,000 continuation, cancellation, and forced Worker-construction fallback. Details: [`solver-architecture.md`](solver-architecture.md#parallel-find-all-enumeration-browser).

### UI and persistence

`solveOptionsModal` contains tier/custom and Find-all controls. Find-all requires `confirmFindAll`; Find 1 and the running overlay are unchanged. Overlay shows progress/cancel; budget-limited runs can extend; no-cap prompts at 2,500.

For `navDensity >= DENSE_LEVEL_NAV_DENSITY (0.70)`, pre-start copy warns exhaustive completion is unlikely and favors **no cap** over **up to 1,000**. This changes UX only.

Editor merges the full pool into `foundHintsSinceLoad` via `setFoundHintsSinceLoad` + `mergeUniqueHints`; it feeds the working level/heatmap and persists on save. Review uses the same pool and persists it through approval/submission.

## Shipped design

- Shared System A/B + complete enumeration core with batch parity/exhaustive tests.
- Resumable targeted/complete session with PLAY validation, full-pool saving, curated preview, and all outcome classes.
- Tier/Find-all UI with warnings, continuation prompt, summaries, Review reuse, and existing Find 1/cancel/progress/extend behavior.
- Editor/Review persist the entire validated exact-deduped pool on completion, cancel, or cap; novelty never filters operator-run saves.

Tier node/restart/seed/time defaults remain first-pass values because published levels were already fast.

## Invariants

- Every returned/saved hint passes `validateCandidatePath` in **PLAY** context; `isSolutionState` alone misses geese/false goals.
- Save every valid exact-deduped find up to the run cap, including partial cancel/cap results. Target controls stopping, not retention.
- `exhaustive` requires drained complete DFS; capped/cancelled runs never claim all solutions.
- Shown set is exactly `selectDisplayHints` output with normal metrics/caps/floors/coverage; discovery/display features share `path-features.ts`.
- `hint-enumeration.ts` is the generator core for both batch expansion and Solve.
- Search remains cooperative/cancellable; UI must not freeze.

## Submission and Review

- **Submission:** editor submit runs a 10 s targeted `createVarietySearch`, shows countdown/count, submits every distinct find, and preserves partial cancel results. See `modules/input/submission-controller.ts`.
- **Review:** Solve finds enter `foundHintsSinceLoad`; approval merges them into persisted hints for hint-addition/full-submission paths and revalidates if the level changed. See `modules/input/review-controller.ts`.

## Settled decisions (2026-07-10)

- Keep tier ceilings unless usage shows slowness.
- Review findings persist with the working level/`foundHintsSinceLoad` on approval or maker submission; no separate solve-only Firestore write.
- Up-to-1,000 hard-stops at 1,000. No-cap pauses at 2,500; decline = `capped`, continue = resume to 5,000. The pause is not a separate `VarietyOutcome`.
- Complete DFS is never feature-gated. `DENSE_LEVEL_NAV_DENSITY` 0.70 changes warning copy only.
