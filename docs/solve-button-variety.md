# Solve Button: "Find N Varied Hints"

The Editor/Review **Solve** flow uses count-based variety tiers backed by the same enumeration + curation engine used for corpus expansion. It replaced the old timed bias-replay search, which exhausted a finite bias-combination space and could falsely imply that all solution variety had been found.

Related: [`hint-curation.md`](hint-curation.md) for display curation; [`archive/`](archive/) for the corpus-expansion design record.

> **Status: complete, in production.** Current implementation: `modules/solver/hint-enumeration.ts`, `modules/solver/variety-search.ts`, Solver facade, `modules/input/solver-core.ts`, `solver-controller.ts`, and `index.html`. Unit- and browser-verified. `submission-controller.ts` and `review-controller.ts` also use this engine. Tier ceilings are deliberate defaults; revisit only if real usage shows slowness.

## UX and semantics

`solveOptionsModal` offers:

- **Find 1 solution**: existing single 30 s solve.
- **Find a few (~5 varied)**, **many (~25)**, **lots (~100)**, plus custom target.
- **Find all (up to 1,000)**: complete deterministic DFS, hard cap 1,000.
- **Find all — no cap**: same engine, soft stop at 2,500 with a “keep going?” prompt, then hard cap 5,000.

Both Find-all variants warn that runs can take **20+ minutes**, stream progress, are cancellable, and keep partial results.

The tier number is a **curator-confidence target and effort dial**, not a save count or hard display count. Search continues until `selectDisplayHints` can present about N distinct approaches, variety saturates, or budget/cap ends. UI wording must say “aim for up to N varied,” not guarantee N. Coverage rules may make the shown set exceed N slightly.

Every valid exact-deduped solution found is saved in Editor and Review, up to the run cap. Saves are not filtered by distinctiveness or `decideCandidateAcceptance`; that novelty gate is for unattended batch control. The operator sees the `selectDisplayHints` subset, while persistence receives the full validated pool. Report both counts: saved M, curator K varied.

Targeted runs classify completion as:

- **exhaustive**: complete deterministic enumeration drained the tree within budget;
- **saturated**: more raw finds stopped increasing the curated set;
- **budget**: effort ceiling reached before either condition.

Complete mode additionally uses:

- **capped**: 1,000, 2,500 user-stop, or 5,000 ceiling reached before exhaustion;
- **cancelled**: user stopped the run; partial results are saved and UI must say full search did not finish.

“Exhaustive” is valid only when the complete DFS actually drains the tree. Randomized-restart and seeded-mutation generators approximate that search and are not needed for completeness.

Coverage guarantees from play-mode curation remain: the shown set includes at least one per gate, portal-use class, and must-cross order when available, even if that exceeds the target slightly.

## Architecture

### Shared enumeration core

`modules/solver/hint-enumeration.ts` contains the browser-safe System A randomized-restart and System B prefix-anchored generators formerly in `scripts/hint-corpus-expand.mjs`, using shared solver primitives (`createState`, `getNeighbors`, `applyMove`, `undoMove`, `prepLevel`, `getDistanceFromArray`, `isSolutionState`). It exposes streaming enumeration plus deterministic complete mode.

`scripts/hint-corpus-expand.mjs` imports the same module, so batch expansion and the Solve button share one search engine.

### Curation

`selectDisplayHints(pool, { cap, navDensity, mustCrossKeys })` in `modules/domain/` produces the shown varied subset. Distance/coverage primitives remain in `path-features.ts`. `decideCandidateAcceptance` does not filter Solve saves.

### Variety session

`modules/solver/variety-search.ts` provides a resumable, cooperatively-yielding session with **targeted** and **complete** modes.

Pipeline: enumerate -> PLAY-validate with `validateCandidatePath` -> exact-dedupe -> add every valid find to the saved pool.

Targeted mode periodically recomputes `selectDisplayHints`, stopping on target, saturation, time ceiling, complete-enumeration finish, or `maxHints`.

Complete mode has no curator target or time ceiling. It runs deterministic DFS until exhaustion, cap, or cancel. A capped session can resume with a higher `maxHints`, enabling the 2,500 -> 5,000 no-cap flow.

Result shape:

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

`newlySavedMeta` records `nodesExpanded`, `elapsedMs`, and technique. `rediscovered` records independently re-found paths already present as hints, with discovery provenance but without adding duplicates to the pool. `scripts/hint-workbench.mjs` uses it; the in-game UI ignores it.

Targeted mode runs on the main thread with the existing `yieldFn` pattern. Cancel, progress, resume/extend, and partial-result preservation remain available. Complete mode uses the worker pool when possible and otherwise falls back to the same main-thread session.

### Performance

Profiling found different bottlenecks by mode.

**Targeted tiers:** repeated full-pool `selectDisplayHints` scans consumed **44–71%** of wall time on solution-rich levels (~2 ms at pool 50, ~41 ms at 1,950) under a fixed every-20-finds cadence. `curationCheckInterval()` now scales the interval as `max(20, pool.length / 10)`, making checks roughly geometric and total curation cost near O(pool) instead of O(pool²/20). A real-level matched run kept the same outcome/saved/curated counts and was ~27% faster.

**Complete mode:** 84–92% of real-level time was raw DFS, with ~7–8% each for validation/dedupe and `yieldFn`. It is CPU-bound and therefore uses parallel Web Workers rather than an algorithmic rewrite.

### Parallel Find-all pool

When available, complete mode uses a browser Web Worker pool. Each job handles one `(gate, root-child)` shard via `hint-enumeration.ts`'s `rootChildren` option; DFS semantics are unchanged. PLAY validation and dedupe remain on the main thread. `modules/solver/solver-worker-client.ts`'s `createEnumerationPoolClient` returns the same `VarietyResult` shape as the single-thread session.

If pool creation or a run fails, complete mode falls back to the main-thread implementation for the rest of the browser session, matching the `trap-scan-controller.ts` fallback pattern. Browser verification covered a real 3-worker pool, both Find-all variants including the 2,500 -> 5,000 prompt, and identical fallback results when `Worker` construction was forced to fail.

Full pool correctness/details: [`solver-architecture.md`](solver-architecture.md#parallel-find-all-enumeration-browser-production-path).

### UI and persistence

`solveOptionsModal` contains tier/custom controls and both Find-all buttons. Find-all requires `confirmFindAll`; Find 1 and the running overlay remain unchanged. The overlay shows live count/progress/cancel, budget-limited runs can extend, and the no-cap variant prompts at 2,500.

When `navDensity >= DENSE_LEVEL_NAV_DENSITY` (0.70), pre-start copy warns that exhaustive completion is unlikely and favors **no cap** over **up to 1,000**. This is UX only; complete mode is not feature-gated.

Editor merges the full found pool into `foundHintsSinceLoad` via `setFoundHintsSinceLoad` + `mergeUniqueHints`; those hints feed the working level and heat map and persist on save. Review uses the same pool and persists it through approval/submission handling described below.

## Build history

All phases shipped:

1. **Shared enumeration core:** moved System A/B from `hint-corpus-expand.mjs` into `hint-enumeration.ts`; added streaming + complete mode; batch parity and small-level exhaustive counts tested.
2. **Variety session:** added targeted/complete resumable session, PLAY validation, full-pool saving, curated preview, and all outcome classes; unit-tested target/saturation/exhaustion/cap/cancel and known complete counts.
3. **Solve UI:** replaced timed diverse buttons with tiers and both Find-all variants; added 20+ minute confirms, 2,500 continuation prompt, five-outcome summaries, saved/curated counts, explicit cancel wording, Review reuse, and preserved Find 1/cancel/progress/extend behavior.
4. **Save policy:** Editor and Review persist the entire validated exact-deduped pool on completion, cancel, or ceiling. Distinctiveness/heatmap novelty never filters operator-run saves.

Tier node/restart/seed/time defaults were left at first-pass values because published levels were already fast across tiers. Tune only if real usage exposes slowness.

## Invariants

- Every returned/saved hint passes `validateCandidatePath` in **PLAY** context; `isSolutionState` alone is insufficient because of geese/false goals.
- Every valid exact-deduped find is saved up to the run cap, including partial cancel/ceiling results. Tier target controls stopping, not retention.
- Claim `exhaustive` only after complete DFS drains the tree. Capped/cancelled runs never claim all solutions; cancelled copy explicitly says the full search did not finish.
- The shown set is exactly `selectDisplayHints` output, with the same metrics, caps, floors, and coverage guarantees as player hints. Discovery/display features share `path-features.ts`.
- `hint-enumeration.ts` is the single generator core for batch expansion and Solve.
- Search remains cooperative/cancellable; the UI must not freeze.

## Follow-on work already shipped

- **Submission:** editor submit runs a 10 s targeted `createVarietySearch` with countdown/live count and submits every distinct solution found, preserving partial results on cancel. See `modules/input/submission-controller.ts`.
- **Review:** Solve discoveries enter `foundHintsSinceLoad`; approval merges them into persisted hints for hint-addition and full-submission paths and re-validates the combined set if the level changed during review. See `modules/input/review-controller.ts`.

## Settled design decisions (2026-07-10)

- **Tier ceilings:** keep current first-pass defaults unless real usage shows slowness.
- **Review persistence:** findings live on the working level + `foundHintsSinceLoad` and persist on approval or maker submission; no separate Firestore write occurs for a solve-only session.
- **Find-all caps:** up-to-1,000 hard-stops at 1,000. No-cap pauses at 2,500; declining ends as `capped`, continuing resumes to a hard total 5,000. The 2,500 pause is an interim UI state, not a separate `VarietyOutcome`.
- **Complete-mode preflight:** no gate on whether complete DFS may run. `DENSE_LEVEL_NAV_DENSITY` 0.70 changes warning copy only. Below it, the standard 20+ minute warning applies; at/above it, copy says exhaustive completion is unlikely and steers toward no-cap. This keeps behavior feature-based rather than level-specific.
