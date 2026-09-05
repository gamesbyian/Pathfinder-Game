# Both DFS and beam's perimeterSweep configs win roughly 2x more often in production with a clockwise bias than counter-clockwise

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `winningConfig` counts for `dfs|score=perimeterSweep|bias=perimeterCW` vs. `bias=perimeterCCW` across `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json` (1,802 combined rows), compared against `2026-09-05-main-ladder-config-level-deconcentration-001.md`'s already-published beam figures for the same bias pair, no new dispatch
> **Decision:** `dfs|score=perimeterSweep|bias=perimeterCW` wins 21 production solves vs. `bias=perimeterCCW`'s 11 (ratio 1.91x) in this run. `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` wins 170 vs. `bias=perimeterCCW`'s 76 (ratio 2.24x, from the already-published deconcentration report). Two independent search families, sharing only the "perimeter-sweep, clockwise-vs-counterclockwise" scoring/bias axis, show the same directional and roughly-similar-magnitude preference for the clockwise variant in real production — and the direction holds in both corpus1 and corpus2 individually for both families (see Corpus split check), so this is not a pooled-population artifact of the kind this session has otherwise caught.
> **Remaining gate:** none — a cross-family consistency check joining one already-published figure with one newly-computed figure, both from already-collected data.
> **Evidence role:** discovery — a cross-family convergence not previously connected across two separate reports/families
> **Selection:** whole production-solved population attributed to each named config (32 DFS + 246 beam solves combined across both bias directions), not a sample

## Method

Counted `winningConfig === 'dfs|score=perimeterSweep|bias=perimeterCW'` vs. `'...bias=perimeterCCW'` across all solved rows in both corpora's per-level production result files. Compared the resulting ratio to the already-published beam figures for the structurally analogous config pair.

## Result

| family | clockwise wins | counter-clockwise wins | CW:CCW ratio |
|---|---:|---:|---:|
| `dfs` (`score=perimeterSweep`) | 21 | 11 | 1.91x |
| `beam` (`score=perimeterSweep`, width=2000, retention=plain) | 170 | 76 | 2.24x |

## Interpretation

`dfs` and `beam` are structurally very different search algorithms (depth-first commitment vs. width-bounded frontier search) that happen to share a "perimeter-sweep" scoring concept with a directional bias parameter. Finding the same ~2x clockwise-favoring asymmetry independently in both is a genuine cross-family convergence, not an artifact of one family's implementation quirk — it suggests the levels in this corpus population have some structural property (e.g. how goal/gate/portal placement interacts with a clockwise vs counter-clockwise perimeter traversal order) that generically favors clockwise search regardless of the underlying algorithm. This is a plausible candidate mechanism worth a future structural-feature correlation check (e.g. does gate/goal angular position relative to level center predict which bias direction wins for a given level), though this report does not itself test that.

This also reinforces that the bias-direction pair is a real, decision-relevant asymmetry rather than a coin-flip — consistent with why it was one of the 8 hand-specified `DEFAULT_PAIRS` in `analyze-technique-relative-advantage.mjs` from early in this research program.

## Corpus split check

Following this session's standing practice of checking whether a pooled ratio survives a corpus1/corpus2 split before trusting it:

| family | corpus1 CW:CCW | corpus2 CW:CCW |
|---|---:|---:|
| `dfs` | 5:3 (1.67x) | 16:8 (2.00x) |
| `beam` | 14:4 (3.50x) | 156:72 (2.17x) |

Both families keep the same clockwise-favoring direction in both corpora individually (unlike the corpus-churn false positive caught in `2026-09-05-support-class-churn-structural-signal-holdout-failure-001.md`) — corpus1's small counts (8 and 18 total respectively) make its exact ratio less reliable, but the direction is unanimous across both families and both corpora, four independent cells all pointing the same way.

## What this does not establish

- Does not identify the structural mechanism behind the clockwise preference — purely an observed cross-family correlation.
- Corpus1's per-cell counts are small (3-14) — its exact ratios are noisier than corpus2's, though the direction agrees.
- Single production run, single census snapshot.
