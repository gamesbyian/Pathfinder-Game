# Admissible-order's failures cost ~100x its successes; beam's failures cost barely more than its successes — a mechanistic explanation for the expensive-tail finding

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `failedNodes.median / successfulNodes.median` per action in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** every `admissible-order` tie-break profile has a failed/successful median-cost ratio between 115x and 137x — failing to solve a level via admissible-order costs, at the median, well over 100 times what succeeding costs. Every `beam` configuration's ratio is close to 1.3x — beam's failures cost barely more than its successes. This is the clearest mechanistic explanation yet for why admissible-order-derived production stages land disproportionately in the expensive tail (`2026-09-04-marginal-cost-solve-technique-attribution-001.md`: every admissible-order-alternate-tiebreak-retry solve in the sampled corpus lands above 90% of the node budget): it is not that admissible-order is generically slow, it is that *failure* is catastrophically expensive for it specifically, while success remains cheap.
> **Remaining gate:** none — a mechanistic finding using already-collected data, directly explaining an already-reported pattern.
> **Evidence role:** discovery — the single most mechanistically important finding of this session's later batches, connecting a structural property of the technique family to an already-observed cost pattern
> **Selection:** whole action population (41 actions), not a sample; extremes highlighted

## Method

For each action in `level-capability.json`'s `actions` array, computed `failedNodes.median / successfulNodes.median` — the ratio of typical cost-to-fail vs. typical cost-to-succeed, for the same technique.

## Result

**Highest ratios (all `admissible-order`):**

| action | ratio | solved levels |
|---|---:|---:|
| `admissible-order\|tieBreak=none\|lds=off` | 136.8x | 490 |
| `admissible-order\|tieBreak=nearClosureRescue\|lds=off` | 121.3x | 444 |
| `admissible-order\|tieBreak=intersectionHarvest\|lds=off` | 116.9x | 454 |
| `admissible-order\|tieBreak=default\|lds=off` | 116.5x | 456 |
| `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | 115.1x | 452 |

**Lowest ratios (all `beam`):**

| action | ratio | solved levels |
|---|---:|---:|
| `beam\|score=objectiveFirst\|...\|width=5000\|retention=plain` | 1.3x | 650 |
| `beam\|score=intersectionHarvest\|...\|width=2000\|retention=plain` | 1.3x | 499 |
| `beam\|score=intersectionHarvest\|...\|width=5000\|retention=mechanic-buckets` | 1.3x | 713 |
| `beam\|score=objectiveFirst\|...\|width=2000\|retention=plain` | 1.3x | 506 |
| `beam\|score=objectiveFirst\|...\|width=5000\|retention=mechanic-buckets` | 1.3x | 705 |

## Interpretation

This is a structural property of the two search paradigms, not a tuning artifact: `beam` search maintains a bounded-width frontier and terminates (fails) once that frontier is exhausted, so a failure costs roughly the same as exploring to a similar depth on a success — hence the ~1.3x ratio. `admissible-order` search is closer to exhaustive/systematic within its ordering, so proving a level unsolvable (or exhausting its budget trying) requires exploring dramatically more of the state space than a typical success does — hence >100x. This directly explains, at a mechanism level, why admissible-order-derived production stages are simultaneously (a) cheap and valuable when they win, and (b) catastrophically expensive when they don't, which is exactly the tension the ongoing admissible-order-alternate-tiebreak-retry fraction confirmation is trying to resolve: a smaller shared work-pool fraction caps the expensive-failure case specifically, without touching the cheap-success case, which is precisely the right lever *given this mechanism*. This is a strong piece of a priori mechanistic support for why the repricing idea is well-motivated, independent of whatever the in-flight confirmation's empirical result turns out to be.

## What this does not establish

- Does not test `dfs`/`repair` families' ratios in this report (worth a follow-up if this line is pursued further) — the two extremes (admissible-order, beam) were the focus here as the clearest contrast.
- `failedNodes.median` reflects whatever node-budget ceiling was in effect for the isolated census probe (50,000,000), so the absolute ratio value is specific to that budget; the qualitative asymmetry (search-paradigm-dependent failure cost) is the durable finding, not the exact multiplier.
- Correlational reasoning connecting this to the marginal-cost-attribution finding; not a controlled test isolating this mechanism from other explanations.
