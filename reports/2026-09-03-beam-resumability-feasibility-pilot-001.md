# Beam resumability feasibility pilot: same-beam pause/resume equivalence

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — 7 in-memory unit tests, current HEAD
> **Decision:** Rung 1 of `docs/solver-search-resumability.md`'s research ladder ("same beam, same policy: pause/resume equivalence") succeeds. A new opt-in `beamSearchFromGate` mechanism (`resumeFrom`/`pauseAfterPhases`, `modules/solver/search.ts`) lets one deterministic beam action pause at a phase boundary and resume later, reproducing an uninterrupted run's solve/unsolved outcome, solution path, and cumulative canonical work (`prep._workMeter.units`) exactly — provided the continuation carries the search's live mutable state (`ws`/its undo stack) forward rather than reconstructing it from scratch. Default production behavior is untouched: both new parameters are optional and every existing call site is unaffected.
> **Remaining gate:** rung 2 of the research ladder ("same beam frontier, changed beam policy: fixed-work complementarity test") — not attempted here. This pilot only proves the primitive works; it does not yet show any scheduling value from using it.
> **Evidence role:** development — a mechanism feasibility/correctness check (does a resumed execution reproduce an uninterrupted one), not a scheduler experiment or a capability claim.

## Why this check

`2026-09-03-dynamic-tranche-value-pilot-001.md` found real continuation-value signal (an added equal tranche rescued 3/30 capped rows) but could not act on it: current beam attempts discard their live frontier when a work cap ends, so "give this search more work" means a full restart that repays every prior unit of work. `docs/solver-search-resumability.md` queued a bounded feasibility gate before any richer dynamic allocation: can one deterministic beam configuration pause at a work boundary `W` and resume for `Δ` equivalently to an uninterrupted `W+Δ` run, using in-memory continuation state only? This pilot answers that question for the first, narrowest form on the doc's research ladder.

## Method

**Target:** `beamSearchFromGate` (`modules/solver/search.ts`) — the only beam implementation in the codebase, confirmed to use no `Math.random`/seed anywhere, so every configuration is deterministic (no need to capture PRNG state).

**Mechanism implemented** (additive, both parameters default to `undefined`/off):
- `pauseAfterPhases?: number` — at the function's existing phase-boundary check (top of its `while` loop, alongside the existing budget/maxPhases exits), if set and reached, returns `null` with `out.pausedContinuation` populated instead of continuing.
- `resumeFrom?: BeamContinuation` — seeds `frontier`, `phasesCompleted`, and `nodesExpandedTotal` from a prior call's `pausedContinuation` instead of the root node, and (critically — see Finding 1 below) reuses the prior call's live `ws`/undo-stack objects rather than rebuilding them.

**Levels/cases** (synthetic-but-real `NormalizedLevel` objects, the same construction `search.test.ts`'s own beam correctness/nodeBudget contract tests use):
- **Solved, multi-phase:** the 9×9 wandering fixture already relied on by `search.test.ts`'s nodesExpanded/nodeBudget tests (`requiredLength=40`, goal at Manhattan distance 16 — 24 steps of slack forces ≥40 completed phases). Beam width 16.
- **Unsolved, multi-phase:** the same level at beam width 1 (real greedy-hill-climbing failure, not a designed-impossible case — empirically confirmed to run ~20 real phases, pruning candidates one at a time, before the frontier collapses to zero via the natural `cands.length === 0` exit). A first attempt at an unsolvable case via `requiredLength=41` (impossible purely by move-parity on an open grid) was rejected: it pruned both first-move candidates in phase 1 with no real search, which would have made a trivial, uninformative pilot case.
- **Richer mechanics:** the same shape as `search.test.ts`'s numeric/string coarse-state-key differential test (3 must-pass cells, 2 flipping filters), at both `mechanicBucketRetention` on and off, exercising the coarse-state-merge/mechanic-bucket-retention machinery every phase.
- Pause boundaries tested: phase 1, 5, 8, 10, 15, 20, 30, 35, 39, plus a chained double-pause (10, then 25, then run to completion).

**Comparator:** for each case, an uninterrupted reference call (no pause) versus a staged call (pause once or twice, resume to completion), sharing one `prep` object across the staged call's stages (the realistic in-process-scheduler shape) but a fresh `prep` for the reference. Compared: `result` (deep-equal, both `null` or the identical solution array), `prep._workMeter.units` (the canonical cross-technique work quantity per `docs/solver-optimization-workstreams.md`'s "use workSpent for cross-technique allocation" rule), and `prep._metrics.nodesExpanded` (the legacy diagnostic counter).

All 7 cases are `modules/solver/beam-resumability-pilot.test.ts`, run via `vitest run` (deterministic, no real-time budget/wall-clock dependence — `pauseAfterPhases` is the only exit mechanism exercised, `nodeBudget`/`budgetMs` left inert).

## Result

7/7 pass at exact equality (solve outcome, solution path, `workMeter.units`, `nodesExpanded`) across every case and boundary listed above, including the chained double-pause. `npm run check:types` and the full existing `search.ts`/`repair-search.ts`/`attempt-dispatch.ts`/`orchestration.ts`/`stage-plan.ts` test suites (226 tests) plus the full unit suite (1,370 tests) pass unchanged, confirming the additive parameters leave every existing call site byte-for-byte unaffected.

## Finding 1 (the actual pilot finding): work-accounting requires carrying `ws` forward, not just the frontier

The first implementation attempt captured only `{ frontier, phasesCompleted, nodesExpandedTotal }` in the continuation, on the theory (stated explicitly in `beamSearchFromGate`'s existing comments) that the working state `ws` and its undo stack are pure performance optimizations reconstructible from any frontier node's parent-pointer chain — true for search **semantics** (which moves get scored/pruned/selected is unaffected either way), but this pilot found it **false for work accounting**: `applyMove` (`search-state.ts`) unconditionally increments the canonical `prep._workMeter.units` counter for every move it replays, not only for genuinely new candidate probes. A from-scratch `ws` at the top of a resumed call starts with an empty path, so the first node processed after resume pays a full root-to-node replay — real, charged `applyMove` calls — that an uninterrupted run would normally have skipped via the existing cheap diff against wherever `ws` happened to be left from finishing the previous node in tree order.

Measured effect before the fix: pausing at phase 5 showed no discrepancy (11,081 vs. 11,081 work units — cheap-diff cost at that point happened to already be large), but pausing at phase 30/35 overcharged by 18–19 work units (11,099–11,100 vs. 11,081 reference) — small in this toy example (~0.17% of total work) but structural, would grow with pause depth, and would compound under repeated resumes.

**Fix:** the continuation additionally carries the live `ws: SolverSearchState` and `liveUndo: UndoToken[]` objects themselves (in-memory references, never serialized — consistent with the pilot's explicit in-memory-only scope), and the resumed call skips `createState(...)` entirely rather than discarding its result. This is not cosmetic: `createState`'s `bufSlot` parameter (`STATE_BUF_BEAM`) clears this `prep`'s own shared `visited`/`edgeUsage` buffers as a side effect (an existing per-call-site buffer-pool optimization, `search-state.ts`), so calling it again after deciding to reuse `ws` would have silently corrupted the very state being carried over. With the fix, a resumed call's first diff is exactly as cheap as an uninterrupted run's would have been, because `ws` cannot tell the difference — this closed the discrepancy to exact equality at every boundary tested.

This means the current `beamSearchFromGate` comment's claim ("this changes only how the state is computed, never which moves are scored, pruned, or selected, so search behaviour and the returned path are unaffected") remains true, but was previously only checked against behavior, never against work accounting, when read as a hidden argument for "so a from-scratch ws would be fine for resumability too" — future resumability work on other search families (DFS/IDA/repair) should check the same thing rather than assume it.

## Interpretation against the pilot's own success/stop criteria

`docs/solver-search-resumability.md` lists five success criteria for this exact pilot: same solve/unsolved result, same solution when solved, same cumulative `workSpent`, same nodes/attempt outcome where deterministic, and (ideally) the same frontier/search trace after the boundary. All four required criteria are met at exact equality once Finding 1's fix is applied; the fifth (frontier/trace identity) follows directly from carrying the literal frontier objects and `ws` forward rather than reconstructing anything, so it holds too, though this pilot did not add separate trace-level assertions beyond result/work/nodes equality. None of the stop criteria fired: the pause boundary (top of the `while` loop) required no invasive search redesign, resumed execution changed nothing unexplained, retained state is a small execution snapshot (not a duplicate full solver/level state), and the fix's overhead is negative relative to the naive version (it removes the replay tax rather than adding cost).

## Scope and what this does not show

- Single beam configuration, in-process, in-memory, one `solveLevel()`-equivalent lifetime — no serialization, no cross-process handoff, no DFS/IDA/repair continuation attempted, matching the doc's explicit scope.
- No scheduling value demonstrated. This closes the *primitive-exists* question the dynamic-tranche pilot's actionability failure raised; it does not by itself make dynamic allocation, racing, or interleaving worthwhile. Per the research ladder, the next open rung is same-frontier/changed-policy fixed-work complementarity — untouched here.
- `mechanicBucketRetention`'s coarse-state-merge/mechanic-bucket machinery was checked at moderate scale (3 must-pass cells, 2 flippers, beam width 16) at one pause boundary each; not swept across many boundaries or larger mechanic combinations.

## Follow-on

Per `docs/solver-search-resumability.md`'s "Beyond the pilot" ladder, the next legitimate step (if pursued) is rung 2: resume the same beam frontier under a **different** continuation policy (scoring profile, ordering bias, width, retention) and run a fixed-work causal test against policy-A-only, policy-B-only, and fresh-start A→B alternatives — not a scaled-up version of this exact pause/resume-same-policy check.
