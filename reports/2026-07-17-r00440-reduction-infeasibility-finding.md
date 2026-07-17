# R00440 level reduction likely produced a genuinely infeasible candidate — a real `stress:reduce-level` limitation (2026-07-17)

## Context

Continuing Campaign 2's search for a discriminator on the "harder majority" (the ~93% of
`dfs-plain` not explained by the fragile-scoring family), applied the same level-reduction
technique that worked cleanly on R00648 to R00440 — the already-known "robust" reference level
(0/45 structural-perturbation family variants, and, per the same-day negative-reference check,
untouched by all 5 known fragile-scoring `SCORE_*` flags).

## What the reducer found

`stress:reduce-level` on R00440 (`--node-budget=15000000 --time-budget-ms=20000`, target
signature `node-budget-reached`) reached a genuine fixed point: phase 1 removed 28 off-witness
blocks and 8 false goals; phase 2 removed **all 5 `mustCross` entries** and shrank `reqLen` by 1
(127→126). What phase 2 could **not** remove: any of the 16 landmarks (4 `surround`, 5
`adjacentTurn`, 7 `decorative`) — every attempted removal broke the target signature. Final
candidate: 15×15 grid, zero blocks/falseGoals/mustCross/mustPass, 16 landmarks, `reqLen: 126`,
`reqInt: 9`, still reported `node-budget-reached` — the reducer's own re-verification (which calls
`solveLevel()` with no `repairBudgetFractionOverride`, i.e. repair fully active) confirmed the
signature match.

## The discrepancy that surfaced it

Following the same isolation methodology used throughout this session
(`repairBudgetFractionOverride: 0`, to see the main DFS/beam loop's own behavior in isolation),
testing the reduced candidate against the 5 known fragile-scoring flags produced a striking
result: **every single configuration — baseline and all 5 flags, individually and combined — failed
in ~30-70ms at exactly 38 nodes, status `failed`** (not `timeout`, not `node-budget-reached`).

`solveLevel()`'s own status derivation (`orchestration.ts`) only reports `failed` when the search
genuinely exhausts every legal avenue within its own sound, admissible pruning — before hitting
either the time or node ceiling. This is qualitatively different from the **original** (unreduced)
R00440's own repair-disabled behavior, already measured same-day: `timeout` at 6,218,656 real
nodes explored (a large, genuine search, using its full 15s budget without exhausting). Reducing
R00440 — specifically, removing `mustCross` — collapsed the main-loop search space from millions
of genuinely-explored nodes down to a **complete, immediate exhaustion at 38 nodes**.

## Interpretation: the reduced candidate is very likely genuinely infeasible

A `status: 'failed'` result (full exhaustion under sound admissible pruning, not a timeout) is
this codebase's own accepted signal that no solution exists within the searched space — the same
interpretation CLAUDE.md and the solver's own architecture already rely on elsewhere (e.g.
`getActiveGates`'s parity filter, or the solver-oracle's `proved unsolvable within the searched
space` verdict). The most parsimonious read of this data: **removing all 5 `mustCross` constraints
made R00440's specific gate/goal/landmark/`reqLen`/`reqInt` combination genuinely unsolvable**, and
the reducer's own signature-preservation check didn't catch this because its re-verification ran
with repair *enabled* — repair's iterated local search has no completeness guarantee, so it kept
burning its full budget (15M nodes) on a puzzle with no solution, looking identical from the
outside (`node-budget-reached`) to a genuinely hard-but-solvable case.

## Why this matters beyond R00440 specifically

This is a **third, more consequential caveat** for `stress:reduce-level`'s use on
repair-gated levels, beyond R00648's "reduction can change which flag rescues it" finding
(`reports/2026-07-17-r00648-fragile-scoring-family-and-reduction-caveat.md`):

**The reducer's contract — preserve the failure *signature* — is provably insufficient for
repair-gated levels specifically, because repair-search has no way to *detect* infeasibility.** A
reduction step that shrinks a level past the point of genuine solvability can still pass
re-verification cleanly, as long as repair's own randomized search keeps burning its budget
without concluding anything either way. For non-repair-gated levels (like R00648, whose reduction
result — while it did shift *which* flag rescues it — remained genuinely solvable throughout, per
its own successful ablation rescues), this risk doesn't apply the same way, since DFS/beam's
`timeout`/`failed` distinction is directly visible in every re-verification step. It specifically
applies here because R00440's target signature was reached partly or wholly via repair.

**Consequence for this session's own R00440 findings**: the reduced-level flag probe result
(nothing rescues it) is very likely uninformative about the *original* R00440's real difficulty —
it may just be reporting "an infeasible puzzle has no rescue," not "this scoring-flag family
doesn't apply here." The original R00440's own negative result (from the same-day negative-
reference report) stands on its own — that was measured directly against the unreduced level — but
this reduction attempt itself did not produce a usable minimal reproduction, unlike R00648's.

## Recommendation

- **Don't trust a `stress:reduce-level` result for a repair-gated level's target signature without
  independently confirming genuine solvability of the final candidate** — e.g., checking that the
  repair-disabled main-loop search still shows real search activity (large node counts, `timeout`)
  rather than instant, complete exhaustion (`failed` at a tiny node count) before treating the
  reduced candidate as representative.
- This is worth folding into `stress:reduce-level`'s own documentation/invariants as a known
  limitation for a future session — the tool's own design doc
  (`docs/solver-dev-tooling-plan.md` Component G) predates this finding and doesn't cover it.
- R00440 itself remains a valid, useful negative reference for the fragile-scoring family (that
  result came from the *unreduced* level) — just don't use this session's reduced candidate as a
  stand-in for it going forward.

## Verification

Read-only diagnostic work, no code changed. All numbers directly reproduced from `Solver.solve()`
calls with `repairBudgetFractionOverride: 0` (isolating the main-loop-only search, the same
methodology used throughout this session) on both the original and reduced R00440.
