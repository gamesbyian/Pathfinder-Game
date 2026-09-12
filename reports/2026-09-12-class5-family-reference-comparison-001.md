# Class-5 family/reference comparison: naive perturbation solvability is confound-dominated 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — read already-committed family-census evidence (`logs/family-census/solve-<id>-<mode>-summary.json`, whole-ladder portfolio sweeps at 36,000,000-node budget, generated 2026-08-07) for every one of the current 431 class-5 residual levels' `swap` (single-object, isolatable edit) and `constrained-shuffle` (`cs`, all-movable-objects reshuffle) family variants. Zero new solver compute; this is a pure read of existing committed artifacts via `git show` against the `claude/variant-levels-solver-insights-tpk4qg` branch (no worktree checkout needed).
> **Decision:** naive whole-ladder family-variant solvability is **confound-dominated, not causally attributable**. `swap` (single edit): only 41/430 (9.5%) checkable class-5 parents have any solved variant at all (93/4,293 = 2.2% of all variants); `cs` (full reshuffle, much larger perturbation): 123/430 (28.6%) have any solved variant (264/4,290 = 6.2%) — a **~3x higher rescue rate for a strictly larger, less targeted perturbation**, the opposite of what a targeted structural-cause signal would show. Per-parent inspection of the three highest swap-rescue-rate cases (`R02302` 9/10, `R02631` 8/10, `R00537` 5/10) confirms the mechanism directly: completely unrelated single-object swaps (different object types, different coordinates, no shared feature) independently rescue the same parent, and the failing minority shows no consistent type/position signature either. This is the same general-difficulty-reduction confound [`the mechanic-composition transfer pilot`](2026-09-12-mechanic-composition-pilot-001-result.md) already found and closed for portal-terminal relocation specifically, now confirmed to generalize across arbitrary `swap`/`cs`-style structural edits on this population.
> **Remaining gate:** none for naive (undecoupled) family/reference comparison on this population. A future revisit needs the same confound-check discipline the mechanic-composition pilot's own design used (a decoupled-control arm proving the specific edit, not perturbation-in-general, drives any observed rescue) before attributing a family-variant solve to a specific structural cause.
> **Evidence role:** discovery/diagnosis (population-scale read of already-committed, non-current-protocol family-census artifacts). No new solving; no production change; not a population-scale current-protocol claim (the family-census sweep predates the current production boundary and used its own budget/scheduler settings — see caveats).

## Why now

The task's standing instruction names "family/reference comparison" as one of the class-5-targeted acquisition lines to advance alongside first-loss work. `docs/solver-future-work.md`'s capability-acquisition funnel names **source-controlled profile/family comparison** as an early rung, and `claude/variant-levels-solver-insights-tpk4qg`'s family-generation campaign already covers **all 431 current class-5 residual levels** (verified directly: every class-5 id has committed `data/families/corpus2/family-<id>-<mode>.json` variants) plus a committed whole-ladder portfolio solve sweep for most of them (`logs/family-census/solve-<id>-<mode>-summary.md`) — a large body of already-paid-for evidence nobody had yet read against the current class-5 cohort specifically.

## Method

For every current class-5 id, read (via `git show origin/claude/variant-levels-solver-insights-tpk4qg:logs/family-census/solve-<id>-<mode>-summary.md`, no worktree checkout) the `swap` and `cs` family modes' "Solved (any phase)" / "Levels run" counts. Coverage is partial: these census logs were generated 2026-08-07 against whatever family-generation had completed by then, so not every id has every mode (`lm`/`sym` were frequently missing for a spot-checked 31-id sample; `swap`/`cs` had near-complete coverage, 430/431). For the three highest swap-rescue-rate parents, additionally read the paired `data/families/corpus2/family-<id>-swap-manifest.json` (exact per-variant edit: object kind/coordinate pair swapped) and `logs/family-census/solve-<id>-swap.json` (per-variant `ok`) to inspect solved-vs-unsolved variants' actual edits.

**Caveat on protocol currency:** this sweep used a 2026-08-07 commit, `nodeBudget=36,000,000`, `workBudget=48,240,000`, legacy scheduler, 4 workers — not the current production boundary/protocol. Absolute solve counts are not comparable to current per-level production results; the **relative** swap-vs-cs rescue-rate comparison and the **within-family** multi-swap diffuse-rescue pattern are protocol-invariant observations (both modes ran under the identical sweep settings) and are what this report actually relies on.

## Result

| family mode | perturbation size | parents w/ ≥1 solved variant | all-variant solve rate |
|---|---|---:|---:|
| `swap` (one object relocated) | small, isolatable | 41/430 (9.5%) | 93/4,293 (2.2%) |
| `cs` (all movable objects reshuffled) | large, global | 123/430 (28.6%) | 264/4,290 (6.2%) |

The larger, less targeted perturbation rescues **~3x more often**. A targeted structural cause (e.g. "moving object X specifically breaks the trap") predicts the opposite: a small, precise edit should outperform a large, unconstrained one at hitting the specific fix.

**Per-parent inspection, top swap-rescue-rate cases:**

- `R02302` (9/10 swap variants solved): the 9 rescuing edits swap `landmarks`↔`falseGoals`, `landmarks`↔`geese`, `geese`↔`falseGoals`, `landmarks`↔`landmarks`, and `flippingFilters`↔`geese`, at ten different coordinate pairs scattered across the grid — no shared object, type, or location. The single failing variant (`landmarks@(9,2)`↔`geese@(3,11)`) shares no distinguishing feature with the succeeding nine that would explain why it alone fails.
- `R02631` (8/10): same pattern — `falseGoals`↔`blocks`, `landmarks`↔`landmarks`, `blocks`↔`geese` all rescue at unrelated coordinates; the two failures both happen to involve the same `blocks@(5,11)` cell, a plausible (not confirmed) idiosyncratic near-miss rather than a mechanism.
- `R00537` (5/10, lower/noisier rate): both solved and unsolved variants swap the same object-type pairs (`landmarks`↔`flippingFilters`, `falseGoals`↔`landmarks`) at different coordinates — no type-level rule separates them at all here.

## Interpretation

This is the diffuse-rescue signature of a **general difficulty-reduction confound**, not a causal structural signal: almost any sufficiently large edit has some chance of loosening whatever makes the level tight (slack in required-length budget, an alternate routing option, a relaxed parity/coverage constraint) through a route unrelated to the specific object moved — exactly the mechanic-composition pilot's own diagnosis for portal-terminal relocation, generalized here to ordinary `swap`/`cs` structural edits across the class-5 population at large. It is not a new premise; it is corroborating, population-scale evidence for an already-closed finding, extending its scope from one manipulation family to two more common ones.

This also delivers a genuine negative result for the "family/reference comparison" funnel rung as naively executable: **90.5% of class-5 parents get zero rescue from any single-object swap, and where rescue does occur it is not attributable to a specific edit** — a minimal-difference reducer campaign built on this data would be chasing noise, not a real structural cause, for the vast majority of cases and even for the visible successes.

## Advancement

Do not launch a family-variant reducer/causal-isolation campaign on `swap`/`cs` data from this evidence — it would need the same decoupled-control confound check the mechanic-composition pilot's own design used, which this reading (a summary-level read of already-run, non-decoupled sweeps) does not provide and cannot retrofit. This closes naive family/reference comparison as a near-zero-cost, already-answered question for class 5: the existing family-census data is confound-dominated, matching the family-generation campaign's own general-navigation-difficulty sensitivity already characterized elsewhere. Class-5-targeted first-loss/exact-adjudication work remains the priority; a future family-based causal probe needs its own frozen, decoupling-checked design (per the mechanic-composition pilot's reopen condition) rather than reading more summary-level solve counts.

## Artifacts

No new tooling; ad hoc `git show`/`node -e` reads against `origin/claude/variant-levels-solver-insights-tpk4qg`'s committed `logs/family-census/` and `data/families/corpus2/` paths (not committed to this repo; regenerate the sample lists directly from `tmp/post-1048-residual-atlas-fixed.json`'s class-5 rows and the branch's already-existing files, no worktree needed).
