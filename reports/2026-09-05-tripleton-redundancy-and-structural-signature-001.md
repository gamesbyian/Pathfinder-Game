# Tripleton same-family redundancy continues the singleton→doubleton decline (48.2%); unlike doubleton, tripleton shows a modest (exploratory) structural signature

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — same-family-vs-mixed-family classification and standardized-difference structural comparison for all `solverCount === 3` levels (83 of 1,962) in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the intra-family-redundancy monotonic trend extends cleanly: singleton is 100%-single-technique by definition, doubleton is 58.5% same-family (`2026-09-04-doubleton-intra-family-redundancy-001.md`), and **tripleton is 48.2% same-family** (40/83) — genuine cross-family redundancy keeps rising with multiplicity, as the standing rule already implies but had not stated a tripleton figure for. Unlike doubleton, which showed **no** structural signature distinguishing same-family from mixed-family cases (`2026-09-05-doubleton-structural-signature-null-001.md`), tripleton's same-family-vs-mixed split does show a moderate standardized difference on `mustTurn` (1.024), `turnConstraintLoad` (0.755), and `portals` (−0.751, reversed direction — same-family tripletons have *more* portals). Given the small sample (40 vs. 43) and no available holdout split at this population size, this structural signature is reported as **exploratory only**, not confirmed to the same standard as the (holdout-validated) production-risk ranking.
> **Remaining gate:** none for the redundancy-rate finding (clean descriptive fact). The structural-signature finding would need either a larger tripleton population (a future census refresh) or a different holdout strategy to move past exploratory.
> **Evidence role:** discovery — extends the singleton/doubleton multiplicity-redundancy series to solverCount=3, previously unexamined
> **Selection:** whole tripleton population (83 levels), not a sample

## Method

For every level with `solverCount === 3`, classified its 3 solving actions' families (`admissible-order`/`beam`/`dfs`/`repair`) and split into all-same-family vs. mixed-family (2 or 3 distinct families). Computed standardized mean differences on all 23 numeric `features` between the two groups.

## Result

| multiplicity | same-family rate |
|---|---:|
| singleton (`solverCount=1`) | 100% (trivial) |
| doubleton (`solverCount=2`) | 58.5% |
| tripleton (`solverCount=3`) | 48.2% (40/83) |

| tripleton same-vs-mixed feature | standardized diff |
|---|---:|
| `mustTurn` | 1.024 |
| `turnConstraintLoad` | 0.755 |
| `portals` | −0.751 |
| `surround` | 0.522 |
| `requiredPathLength` | 0.378 |

## Interpretation

The redundancy-rate result is a clean, low-risk extension of an already-established monotonic pattern (`2026-09-04-doubleton-intra-family-redundancy-001.md` already anticipated "further by higher `solverCount`" without giving a number) — genuine cross-family backup becomes progressively more common as multiplicity rises, continuing to make singleton claims the most fragile and doubleton/tripleton progressively safer.

The structural-signature result is more novel and should be treated cautiously: it appears to contradict doubleton's null finding, but the two are not necessarily in tension — doubleton's larger sample (94 levels total) may simply have had more power to detect a weak effect as null, whereas tripleton's signature, though nominally larger in magnitude, rests on only 83 total levels split 40/43 with no room for a holdout check. The `portals` reversal (same-family tripletons have *more* portals, opposite the general production-risk direction where portals predicts difficulty) is a genuinely surprising, unexplained pattern worth flagging for future investigation rather than a value in itself — it could reflect a real mechanism (portal-heavy levels favoring one family's technique repertoire specifically) or simply small-sample noise.

## What this does not establish

- The structural-signature finding is exploratory: no holdout replication was possible at n=83, unlike the production-risk ranking's successful corpus/parity holdout checks.
- Does not test solverCount=4+ to see whether the same-family rate continues declining or plateaus.
- Does not explain the `portals` direction reversal — flagged as an open, unexplained observation, not a resolved mechanism.
