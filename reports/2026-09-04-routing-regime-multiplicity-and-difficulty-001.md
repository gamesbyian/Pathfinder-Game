# Routing regime predicts multiplicity and production-solved rate, even though it does not predict late-stage reliance

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `features.routingRegime` vs `solverCount`, `singleton`, and `productionSolved` for all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** `routingRegime` is a real, monotonic-ish predictor of both capability multiplicity and production difficulty: mean `solverCount` and production-solved rate rise together from `intersection-heavy` (mean solverCount 6.40, 51.3% production-solved) through `multi-portal` (7.14, 40.8% — the one non-monotonic point), `must-cross-heavy` (12.98, 61.7%), `general` (25.48, 77.9%), to `sparse-low-intersection` (36.80, 100.0%). This does **not** contradict `2026-09-04-routing-regime-late-stage-reliance-null-001.md`'s finding that regime doesn't predict *late-ladder-stage reliance specifically* — the two are different outcome variables, and a regime can predict overall difficulty/multiplicity without predicting which specific late stage a solve depends on.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — complements, does not reopen, the existing late-stage-reliance null result
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Grouped `level-capability.json`'s levels by `features.routingRegime` and computed mean `solverCount`, `singleton` rate, and `productionSolved` rate per regime.

## Result

| `routingRegime` | n | mean `solverCount` | singleton rate | production-solved rate |
|---|---:|---:|---:|---:|
| `intersection-heavy` | 1,371 | 6.40 | 10.0% | 51.3% |
| `must-cross-heavy` | 222 | 12.98 | 9.0% | 61.7% |
| `multi-portal` | 174 | 7.14 | 7.5% | 40.8% |
| `general` | 149 | 25.48 | 3.4% | 77.9% |
| `sparse-low-intersection` | 46 | 36.80 | 0.0% | 100.0% |

## Interpretation

`intersection-heavy` is both the largest regime (1,371/1,962, 69.9% of the census) and one of the hardest by this measure — low multiplicity, high singleton rate, and the second-lowest production-solved rate. `sparse-low-intersection` and `general` are the easiest, with zero singletons and the highest multiplicity and solved rates. `multi-portal` is the interesting exception: despite similar mean `solverCount` to `intersection-heavy`, it has the *lowest* production-solved rate (40.8%) of any regime — multiplicity and production difficulty are correlated but not identical axes, and `multi-portal` levels apparently have isolated-technique capability that production's actual routing does not exploit as well as its multiplicity would suggest.

Combined with the existing null result, the honest picture is: routing regime is a real difficulty/multiplicity axis (useful context for `solver-future-work.md`'s deferred "generator- and editor-envelope-specific technique niches" line), but it is not the mechanism behind *which specific late-ladder stage* a solve ends up depending on — that remains regime-independent per the prior report. Anyone using regime as a feature going forward should be specific about which outcome they're predicting.

## What this does not establish

- Correlational, not causal.
- `multi-portal`'s exception is noted but not explained — would need a dedicated multi-portal-specific structural or lifecycle analysis to understand why production underperforms there relative to its multiplicity.
- Single census snapshot (2026-09-03); no true generator/editor field exists to check whether `routingRegime` itself is a proxy for something more fundamental in level generation.
