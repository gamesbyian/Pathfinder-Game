# Historical cost volatility does not predict census capability drift — family does

> **Status:** concluded-negative
> **Last evidence:** 2026-09-04 — direct computation over the 35 comparable actions in `reports/stress/technique-niches/2026-09-03/temporal-stability.json` (Gate 0C's own output), no new dispatch
> **Decision:** across the 35 actions with comparable old/fresh cost and solve-set data, an action's relative cost-drift magnitude (`|successfulNodesMedianDelta| / oldSuccessfulNodesMedian`) has essentially **no correlation** with its solve-set Jaccard stability (Pearson r = 0.126). Technique **family** explains the variance far better: `repair`'s three guidance variants show a mean Jaccard of **0.537** (range 0.443-0.713) against **0.79-0.85** for admissible-order, beam, and DFS — a gap the volatility measure does not predict at all (repair's own volatility, 0.036-0.090, sits in the *low* half of the 35-action range). This closes `solver-future-work.md`'s "historical same-config cost volatility joined to census capability drift" deferred question, negatively for the volatility hypothesis specifically.
> **Remaining gate:** none for this exact hypothesis (volatility-predicts-drift). Repair's own lower stability is itself worth a name as a standing caution, not a new open question requiring further evidence to state.
> **Evidence role:** discovery — the question was named in advance by `solver-future-work.md`; already-collected data, no new dispatch
> **Selection:** the full 35/47-action comparable population from Gate 0C's own analysis (excludes 12 non-comparable/edge-case actions per that tool's own comparability rule), not a drawn sample

## Why this question, why now

Same motivation as the two multiplicity reports: `solver-future-work.md` deferred "historical same-config cost volatility joined to census capability drift" until a cheaper gate nominated a recurring mechanism. Gate 0C's temporal-stability tool already computes both halves of this join (`depthMovement.successfulNodesMedianDelta` and `solveSet.jaccard`) per action — this report is just the correlation Gate 0C's own report never computed.

## Method

For each of the 35 comparable actions, computed relative volatility as `|successfulNodesMedianDelta| / old.successfulNodesMedian` (a scale-free measure, since actions differ enormously in raw node cost) and compared it against `solveSet.jaccard`. Pearson correlation across all 35 points, then grouped by family (`dfs`/`beam`/`repair`/`admissible-order`, from the action key's own prefix) for a second cut.

## Result

**Correlation: r = 0.126** — the two highest-volatility actions in the population (`dfs|score=knotBuilder`, relVol=0.313, jaccard=0.823; `dfs|score=default`, relVol=0.312, jaccard=0.842) sit at ordinary, unremarkable stability, while the two least-stable actions in the whole population (`repair|score=repair|guidance=must-turn-biased`, jaccard=0.456; `repair|score=repair|guidance=turn-biased`, jaccard=0.443) have *low* volatility (0.063, 0.036) — the opposite of what the volatility hypothesis predicts.

| family | n | mean Jaccard | min | max |
|---|---:|---:|---:|---:|
| `repair` | 3 | **0.537** | 0.443 | 0.713 |
| `admissible-order` | 5 | 0.793 | 0.768 | 0.855 |
| `dfs` | 16 | 0.836 | 0.816 | 0.874 |
| `beam` | 11 | 0.847 | 0.810 | 0.936 |

## Interpretation

Cost volatility (how much an action's typical solve depth moved between census snapshots) is not the mechanism driving solve-set churn. Family membership is a much stronger, cleaner signal — repair's guidance variants stand well apart from the other three families, with a mean Jaccard roughly 0.25-0.3 lower. This is directionally consistent with this session's own earlier Gate 0C finding for repair specifically ("repair's solve-set Jaccard is only 0.713 despite solved count barely moving") but now shows the *other two* repair guidance variants (`must-turn-biased`, `turn-biased`) are even less stable than the flagship `standard` guidance, and that this is a repair-family property, not something a generic "cost drifted, so capability drifted" story would predict for any technique.

## What this does not establish

- Not a claim about *why* repair specifically churns more (this report does not investigate a mechanism, only rules out one candidate — cost volatility — and names the pattern that remains).
- n=3 for the repair family is small; the direction is clear (all three sit well below the other 32 actions) but a precise repair-family rate estimate would want more repair variants or a second temporal pair.
- Single temporal comparison (2026-09-01 → 2026-09-03), not replicated.

## Recommended change to `solver-future-work.md`

Remove "historical same-config cost volatility joined to census capability drift" from the deferred list — it has been tested with existing data and found negative for the specific volatility hypothesis. If repair's own lower temporal stability becomes decision-relevant to a future repair-repricing or routing claim, cite this report rather than re-deriving the family comparison.
