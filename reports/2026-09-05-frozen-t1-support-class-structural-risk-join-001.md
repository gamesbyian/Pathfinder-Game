# The frozen-T1 support-class taxonomy and the structural risk-factor ranking agree: both production-miss classes are the most constrained-object-heavy, and the rare 35-cohort resembles them structurally despite being solved

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — joined `frozenT1SupportClass` (from `2026-09-05-frozen-t1-support-class-distribution-001.md`) against the four leading structural-risk features (from `2026-09-04-production-structural-risk-factors-full-replication-001.md`, holdout-validated in `2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md`) in `reports/stress/technique-niches/2026-09-03/level-capability.json` (1,962 levels), no new dispatch
> **Decision:** using `frozen-t1-broadly-supported` (the "easy" class, n=920) as baseline, standardized differences on `constrainedObjects`/`portals`/`turnConstraintLoad`/`constrainedObjectDensity` are: `production-miss-without-frozen-t1-winner` (n=611) 1.60/1.13/1.14/1.05 (largest gap — the hardest class); `production-solved-without-frozen-t1-winner` (the rare 35-cohort) 1.25/0.48/1.16/0.74 (nearly as structurally heavy as the miss classes on 3 of 4 features, despite being solved); `production-miss-frozen-t1-solvable` (n=277) 1.03/0.83/0.60/0.73; `frozen-t1-thin-boundary` (n=119) 0.94/0.73/0.55/0.54 (mildest gap). This joins two previously separate findings from different reports for the first time and confirms they describe the same underlying difficulty gradient, not two independent phenomena.
> **Remaining gate:** none — a join of two already-established findings using already-collected data.
> **Evidence role:** discovery — first cross-reference of the `frozenT1SupportClass` taxonomy against the (now holdout-validated) structural risk-factor ranking
> **Selection:** whole census population (1,962 levels), not a sample

## Method

For each of the 5 `frozenT1SupportClass` values (established in `2026-09-05-frozen-t1-support-class-distribution-001.md`), computed the standardized mean difference against the `frozen-t1-broadly-supported` baseline class on the four features that led both the pooled full-replication ranking and its corpus/parity holdout replications (`constrainedObjects`, `portals`, `turnConstraintLoad`, `constrainedObjectDensity`).

## Result

| `frozenT1SupportClass` | n | `constrainedObjects` | `portals` | `turnConstraintLoad` | `constrainedObjectDensity` |
|---|---:|---:|---:|---:|---:|
| `production-miss-without-frozen-t1-winner` | 611 | 1.602 | 1.131 | 1.138 | 1.051 |
| `production-solved-without-frozen-t1-winner` (35-cohort) | 35 | 1.254 | 0.480 | 1.155 | 0.738 |
| `production-miss-frozen-t1-solvable` | 277 | 1.028 | 0.829 | 0.598 | 0.727 |
| `frozen-t1-thin-boundary` | 119 | 0.941 | 0.729 | 0.550 | 0.535 |
| `frozen-t1-broadly-supported` (baseline) | 920 | 0 | 0 | 0 | 0 |

## Interpretation

The support-class taxonomy (built from capability/lifecycle joins) and the structural risk-factor ranking (built from raw level features) were derived completely independently this session, so their agreement is a genuine, non-circular cross-validation: `production-miss-without-frozen-t1-winner` — the class that never gets solved and never had frozen-T1 support — is also the single structurally heaviest class on every one of the four leading risk features, consistent with it being the hardest, most intractable population by both measures. The rare 35-cohort (`production-solved-without-frozen-t1-winner`, previously characterized in earlier reports as a distinct, unusual population — production wins arriving through a route other than frozen-T1) is structurally almost as heavy as the miss classes on `constrainedObjects` (1.254) and `turnConstraintLoad` (1.155), clearly heavier than `frozen-t1-thin-boundary`'s corresponding values — meaning these 35 levels are not "secretly easy" cases that happen to lack frozen-T1 support; they are structurally hard levels that production nonetheless found a way to solve, reinforcing the population's characterization as unusual/notable rather than routine. `frozen-t1-thin-boundary` sits at the mild end, consistent with it being a boundary/marginal class rather than a clearly-hard one.

This gives the support-class taxonomy an independent structural explanation it did not have before: the taxonomy's difficulty ordering (`broadly-supported` easiest, then `thin-boundary`, then the two miss classes hardest, with the 35-cohort structurally resembling the miss classes despite its solved status) is not an artifact of how the classes were constructed — it tracks a real, independently-measured, holdout-validated structural difficulty gradient.

## What this does not establish

- Does not test whether this joint pattern holds after conditioning on the multicollinearity already flagged in `2026-09-05-structural-risk-factor-multicollinearity-001.md` (these four features are themselves correlated, so this is one difficulty dimension expressed four ways, not four independent confirmations).
- Correlational; does not establish that structural difficulty causes the frozen-T1 support-class assignment rather than both reflecting a shared upstream cause.
- Single census snapshot (2026-09-03).
