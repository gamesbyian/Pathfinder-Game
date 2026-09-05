# The same-family redundancy rate hits exactly zero at solverCount≥18 for a trivial combinatorial reason, not an emergent redundancy pattern

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — same-family-vs-mixed-family classification for every `solverCount` value (1-41) across the full 1,962-level census, cross-checked against each family's total action-menu size in `level-capability.json`'s `actions` array, no new dispatch
> **Decision:** the full same-family rate curve is **not** a smooth empirical decline all the way to zero — it declines from singleton (100%) through doubleton (58.5%) and tripleton (48.2%, `2026-09-05-tripleton-redundancy-and-structural-signature-001.md`), plateaus around solverCount 4-5 (~49-51%), drops to the 10-35% range for solverCount 6-16, then hits **exactly 0%** for every `solverCount` from 18 through 41. That zero is a **mathematical necessity, not a discovered pattern**: the census's largest family (`dfs`) has only 17 distinct action configurations, so no level can possibly have 18+ same-family solvers — there simply aren't 18 DFS configs (or 18 of any other single family) to draw from. `solverCount=17`'s near-zero rate (2.8%, 1/36) sits right at this ceiling (a single level using all 17 DFS configs).
> **Remaining gate:** none — a methodological correction using already-collected data (the census's own `actions` array menu-size counts).
> **Evidence role:** forensic/methodological — catches a potential false generalization ("same-family redundancy naturally vanishes at high multiplicity") that the raw curve alone would suggest
> **Selection:** whole census population (1,962 levels) across all 41 observed `solverCount` values, not a sample

## Method

Computed same-family rate for every observed `solverCount` value (grouping solving actions into `admissible-order`/`beam`/`dfs`/`repair` families), then cross-referenced against each family's total distinct-action-configuration count from `level-capability.json`'s top-level `actions` array (`admissible-order`: 5, `repair`: 3, `beam`: 16, `dfs`: 17) to identify where the same-family rate is mechanically bounded rather than empirically free to vary.

## Result

| `solverCount` range | same-family rate | interpretation |
|---|---|---|
| 1 | 100% | trivial (n=1 solver, definitionally "same family") |
| 2-3 | 58.5% → 48.2% | genuine empirical decline (redundancy work) |
| 4-5 | 49.3%, 50.8% | plateau, still well within any family's menu capacity |
| 6-16 | 10.3%-37.5%, noisy | still empirically free (max family size 17 not yet binding except near the top) |
| 17 | 2.8% (1/36) | at `dfs`'s exact ceiling (17 configs) |
| 18-41 | **0.0%, every value** | **mechanically impossible** — no family has ≥18 configs |

## Interpretation

Reading the full curve naively (as this report initially set out to do, extending the tripleton finding) would suggest "same-family redundancy becomes essentially impossible at high multiplicity" as if it were a discovered property of how techniques cluster — but for `solverCount≥18` this isn't discoverable at all, it's guaranteed by the fixed size of the census's action menu regardless of any real clustering behavior. The genuinely informative range for studying how same-family redundancy declines with multiplicity is `solverCount` 1 through roughly 16-17, where the ceiling doesn't yet bind; above that, a 0% same-family rate carries zero information about technique-family clustering and should not be cited as such. This is a useful correction to keep in mind for `solver-optimization-workstreams.md`'s standing multiplicity-weighting guidance, which currently discusses singleton/doubleton explicitly but doesn't extend numerically past those two points — any future extension of that guidance to higher `solverCount` bands should explicitly exclude the mechanically-determined region.

## What this does not establish

- Does not explain the noisy 6-16 range's specific fluctuations (e.g. why solverCount=6 shows 22.5% but solverCount=9 shows 37.5%) — small per-bucket sample sizes (n=40-71) make individual bucket rates unreliable; a smoothed or binned trend would be more defensible than reading individual `solverCount` values.
- Does not test whether a hypothetical census with a larger action menu (e.g. if `dfs` or `beam` gained more configurations) would show the same qualitative shape shifted rightward — this is specific to the current menu's fixed sizes.
- Does not revisit whether the ceiling itself should be considered when computing any future singleton/doubleton/tripleton-style fragility or structural-signature analysis at higher multiplicities.
