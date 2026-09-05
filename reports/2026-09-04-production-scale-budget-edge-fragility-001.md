# Production-scale budget-edge fragility: over a third of real solves are within half the node budget

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s already-computed `solveCost` aggregate (975 solved levels, 50,000,000-node cap), no new dispatch
> **Decision:** this run's own precomputed cost-quantile summary shows production's real solved population is disproportionately budget-edge: **367/975 (37.6%)** of all production solves used more than half the 50M node cap, **190/975 (19.5%)** used more than three-quarters, and **150/975 (15.4%)** used more than 90% of it. The solve-cost distribution itself is heavily right-skewed (median 7.0M, p75 34.1M, p90 62.5M — already past the cap at p90, meaning some successful solves exceed the nominal budget via additive-tier headroom — max 260.1M).
> **Remaining gate:** none — descriptive characterization of already-collected data.
> **Evidence role:** discovery — whole-population aggregate already computed by the sourcing tool, read directly rather than re-derived
> **Selection:** whole solved population (975/975), not a sample

## Result

| metric | value |
|---|---:|
| node budget (nominal cap) | 50,000,000 |
| median solve cost | 7,019,296 (14.0% of cap) |
| p75 solve cost | 34,109,380 (68.2% of cap) |
| p90 solve cost | 62,517,775 (125.0% of cap — additive-tier headroom) |
| p95 solve cost | 137,643,994 |
| max solve cost | 260,099,665 |
| solves using >50% of cap | 367/975 (37.6%) |
| solves using >75% of cap | 190/975 (19.5%) |
| solves using >90% of cap | 150/975 (15.4%) |

## Interpretation

This is a production-side complement to `2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`'s census-side finding (which showed *singleton-solved* isolated levels are disproportionately budget-edge relative to *multi-solver* levels). This report shows the same fragility exists in the aggregate production population directly, independent of any census join: a meaningful fraction of what production currently solves is close enough to its own budget ceiling that a smaller envelope — or a scheduler change that redirects work away from late, expensive tiers, exactly the kind of repricing this session's admissible-order confirmation is testing — has real potential to cost solves purely from margin compression, not from removing genuine capability. Any future scheduler-repricing work in this research line should treat "does the new allocation still clear this population's own p75/p90 cost tail" as a first-order check, not just aggregate solved count.

## What this does not establish

- Does not identify *which* solves are budget-edge by stage/technique (a natural follow-up: are the 150 >90%-of-cap solves concentrated in specific late-ladder stages, which would directly inform which stages are least safe to reprice down).
- Single production run.
