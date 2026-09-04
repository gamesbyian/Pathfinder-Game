# Singleton capability fragility is strongly family-dependent: DFS loses claims at 2x beam's rate, admissible-order at ~0

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — direct join of `reports/stress/technique-niches/2026-09-01/level-capability.json` and `reports/stress/technique-niches/2026-09-03/level-capability.json`, the 181 singleton (`solverCount=1`) levels in the comparable universe, no new dispatch
> **Decision:** `2026-09-04-capability-multiplicity-temporal-robustness-001.md` found singleton-solved levels lose all solver support 34.3% of the time across a solver revision, averaged over every family. Splitting that same 181-level population by which technique **family** provides the sole support shows the rate is not uniform at all: **DFS-only singletons lose support 47.5% of the time (n=99), beam-only singletons 22.7% (n=66), and admissible-order-only singletons 0.0% (n=16)** — DFS is roughly twice as fragile as beam, and the admissible-order sample shows no losses at all. This refines the standing research rule this session already added to `solver-optimization-workstreams.md` from a flat "singleton claims are provisional" caution into a family-conditioned one.
> **Remaining gate:** none. `repair` did not appear as a singleton-sole-provider family in this population (repair levels tend to have higher multiplicity — consistent with `2026-09-04-action-cost-volatility-capability-drift-001.md`'s finding that repair's own solve-set churns substantially even at high aggregate solved counts) and so cannot be rated here.
> **Evidence role:** discovery — a refinement of an already-established finding, using the same already-collected data
> **Selection:** the full 181-level singleton population from the comparable universe, not a drawn subset; family classification (`dfs`/`beam`/`ida`, the last being the old census's own legacy label for admissible-order) is read directly off the recorded solving action's own prefix

## Method

From the 181 old-census singleton levels (`solverCount=1`), grouped by the family of the one recorded solving action (matching on the action string's own family prefix; the old census's admissible-order entries carry the legacy `ida:` label, kept as-is here since it is a direct family read, not a normalized-identity comparison). For each group, computed the same `flippedToZero` rate (fresh `solverCount` = 0) the temporal-robustness report used for the aggregate figure.

## Result

| sole-supporting family | n | flipped to zero | rate |
|---|---:|---:|---:|
| `dfs` | 99 | 47 | **47.5%** |
| `beam` | 66 | 15 | **22.7%** |
| `ida` (admissible-order) | 16 | 0 | **0.0%** |

DFS accounts for 99 of the 181 singleton levels (54.7%) — the dominant singleton-sole-provider family by volume — and is also by far the most fragile: essentially a coin flip whether a DFS-singleton claim survives one solver revision. Beam is meaningfully more durable. Admissible-order shows zero losses in a real, if modest, 16-level sample.

## Interpretation

This sharpens the multiplicity-robustness finding into something more directly actionable: **which** technique holds sole responsibility for a level's capability claim matters as much as whether it is alone. A DFS-singleton claim needs re-verification far more urgently than an admissible-order-singleton claim of the same nominal "singleton" status. This is directionally consistent with `2026-09-04-action-cost-volatility-capability-drift-001.md`'s finding that DFS actions individually show ordinary (not exceptional) Jaccard stability (0.82-0.87) at the *action* level — the elevated singleton fragility here is specifically about being the *sole* provider on a level, not about DFS's own aggregate solve-set churning unusually hard. A technique can be a perfectly ordinary, stable performer in aggregate while still being an unreliable single point of failure wherever it happens to be the only technique solving a given level — DFS's large singleton share (99/181) combined with its high per-singleton loss rate is what drives roughly 47 of the temporal-robustness report's 62 total singleton losses.

## What this does not establish

- `repair` is absent from this table because it essentially never appears as a lone singleton provider in this population (consistent with repair's generally high `solvedLevels` counts elsewhere in the census — a technique that solves hundreds of levels is less likely to be the *only* one solving any particular level). This is not evidence about repair's own singleton fragility; there simply isn't a repair-singleton sample to measure here.
- n=16 for admissible-order is real but modest; a 0/16 result is consistent with a true rate anywhere from 0% up to roughly 20% at typical confidence levels — "far more durable than DFS" is well-supported, "literally never loses a singleton claim" is not.
- Single temporal pair, not replicated across a different revision gap.

## Recommended change to `solver-optimization-workstreams.md`

The standing rule already added this session ("singleton-exclusive census claims are provisional... re-verify a singleton claim before a decision depends on it") should note the family split: DFS-singleton claims are the most urgent to re-verify (~2x beam's loss rate, ~48% overall), admissible-order-singleton claims are comparatively durable in this sample.
