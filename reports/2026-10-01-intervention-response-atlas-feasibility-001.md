# Intervention-response residual atlas: retained-evidence feasibility (premise-generation lane B)

> **Status:** superseded
> **Last evidence:** 2026-10-01 — pairwise overlap audit of the 11 frozen intervention-evaluation populations under `data/stress`.
> **Decision:** the atlas is not buildable from repository-resident evidence alone: population overlap exists, but per-level treatment/control outcomes were found in the repo only for BC1; the rest would have to be recovered from GHA run artifacts (not checked). Do not run new solver sweeps to fill it. Lane B waits on one bounded artifact-recovery check.
> **Remaining gate:** none here (original gate: recover per-level outcome tables (`gha:fetch-result`) for the portal-coarse placement and mc-neighbor A/B runs on the 172-level overlap with `bc1-prune-ab-001`; proceed to the atlas only if at least 100 levels carry outcomes under both interventions, otherwise close the lane.)
> **Superseded by:** [atlas result](2026-10-02-intervention-response-atlas-result-001.md): 25 retained `reports/stress/capability-runs/*/per-level-corpus2.json` runs already carry per-level outcomes for 1,700 levels.
> **Evidence role:** forensic.
> **Owner:** `docs/solver-optimization-workstreams.md`.

Question (refresh report lane B, P113/P145/P181/P199): do independent intervention response signatures partition the residual into reproducible causal regimes better than static surface classes?

## What was measured

`scripts/stress/intervention-population-overlap.mjs` counts shared level ids across the 11 frozen evaluation populations (BC1 random-300, CID-0027 and CID-0028 residual-unsolved, repair-deadline solved-control, class-4 allocation, portal-coarse and mc-neighbor portal A/Bs, goal-attraction, admissible-order, repair-late, class-2 cohort).

- 1,343 distinct levels; 892 appear in at least two populations, 107 in four or more.
- Largest usable overlaps with the BC1 random-300 population: portal-coarse 172, mc-neighbor 90, goal-attraction 36, repair-late 23, admissible-order 21, CID-0027 20, repair-deadline 18, CID-0028 17, class-4 16.
- CID-0027 and CID-0028 are disjoint from each other, from class-4 and from repair-deadline: mutually exclusive row sets by construction, not evidence of exclusive causal regimes.

## Why this does not yet answer the question

- Overlap is by selection frame (random-corpus draws), so co-membership is not a response signature. A signature needs each level's gain/loss/unchanged outcome under each intervention, with the missing cells kept as unobserved.
- Per-level outcomes are listed in the repository for BC1 (23 gains, 4 losses on random-300; 20 gains, 1 loss in the raw beam; `data/stress/bc1-perturbation-microscope-001.json`). For the other interventions I found only aggregate report tables or population id lists in the repository; their per-level outcomes would have to come from GHA run artifacts, which this audit did not fetch.
- Several populations were defined as *residual on a then-current main* (CID-0027/0028, class-4), so their controls are not comparable to BC1's random-300 control.

No solver treatment, routing rule or generalization unit is nominated.
