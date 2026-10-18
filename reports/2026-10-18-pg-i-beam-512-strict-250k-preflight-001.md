# PG-I isolated depth-for-breadth 512-wide falsifier (2026-10-18)

> **Status:** active
> **Last evidence:** 2026-10-18 — retained three historical deep-winner 5000-wide beam prefixes at actual sub-250k research checkpoints (source 2745a6e364d364ed8d73f35a4784eeee1285fc71)
> **Decision:** one bounded, source-matched, exactly work-metered 512-vs-5000 beam-width falsifier on the three original isolated-method configurations across two development parent puzzles. No method or production promotion authorized.
> **Remaining gate:** six-cell (three paired configurations, two independent parents) source-accurate 250k primitive-capped result, referee validation and actual method participation; stop negative if no additional solves
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** discovery
> **Selection:** three successful 10M isolated winner-positive method/gate configurations on two historically resistant PG-I parents, prospectively frozen before this *width* experiment but outcome-selected earlier; not an unbiased capability or confirmation sample
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Selection history:** original PG-I 12-parent historical-hard cohort; two deep-positive parents selected after their 10M successes and 250k non-successes; width512 chosen from observed 9–12× cost-to-budget ratio before any 512 run
> **Inference scope:** current-code isolated 512-vs-5000 beam under identical true 250k canonical work cap, not complete production ladder or independent-generalization evidence

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-10-18","decision":"One source-matched 512-vs-5000 true-250k primitive-capped, two-parent/three-configuration isolated beam-width development falsifier; no production policy.","remainingGate":"One six-cell strict-250k source-verifiable paired result with full method participation and referee check, no further width sweep without new cause.","joins":{"researchQuestion":"WS2-VARIANT-RESPONSE-HARDNESS","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"post-outcome three original isolated 10M winner configurations on two frozen historical-hard parents","inferenceScope":"fixed-work 512 vs 5000 configuration development screen, not product-cold routing or generalization"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-i-early-equal-work-cold-solves-20261018.json","reports/stress/pg-i-winning-corridor-frontier-locus-20261018.json"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"Width512 may spend less canonical work per phase and reach deeper before 250k, but could cull the only historical winning prefix and yield zero solves.","surprise":null,"anomaly":null}} -->

## Why exactly this cheap width?

The [source-replay checkpoint result](2026-10-18-pg-i-deep-winner-cold-250k-frontier-locus-preflight-001.md) shows that the recorded winner prefixes have been *generated and retained* by the original 5000-wide beam through sub-250k checkpoints. None of those wide beams completes a path by then. The original full deep successes cost 2.20M, 2.31M and 3.07M canonical units, or roughly 8.8–12.3× the 250k target. Width512 is a single predeclared approximate inverse scaling from 5000, **not** a fitted winner-rank threshold. Prior beam-width studies establish non-monotonic width/retention behaviour, so *narrower* does not imply preserved witnesses or any success.

## Frozen exact-work protocol

- Same original Corpus-2 SHA, frozen two parent IDs, original three source profiles/gate choices (two R03031 configurations, one R02108); labels and historical winners are never passed to candidate ordering/scoring/expansion.
- Each configuration has two fresh independent prep/beam calls, width **5000** control and width **512** treatment, with identical scorer, starting gate, retention, fixed 250,000 hard work limit, node ceiling 250,000, wall-safety cap 600,000ms and current default pruning. No early repair; this is an isolated beam experiment, not whole-ladder product deployment.
- Unlike the phase-complete microscope, set the new **atomic strict whole-cell cap** `prep._atomicStrictWorkCap` and `prep._workCap` to 250,000. Catch `StrictWorkBudgetExhausted` solely as normal censored work stop; no primitive can charge past 250k. Distinguish a budget-censored incomplete path from a search error and from unsatisfiable.
- Persist each actual work total, node total (not just deferred metrics), stop cause, source head, complete arm/configuration identity, and any winning path with canonical referee. A successful new path is a *selected development cold inner-search solve*, not yet a product/cross-parent result. Do not consume stored hints at any cold runtime boundary.
- Precommitted stop: **0 gains** or invalid participation terminates unchanged narrower-width treatment. Any positive earns a new current-state-only generic *cost-driven width policy* opportunity study, then separate independent-parent sample, paired solved-control regression and production-ladder economics. Do not start a static-width parameter sweep.

Max requested canonical work is 6×250k=1.5M units across six cells. Source run's artifact survives failure, then the one-shot workflow is retired. This is a cheap causal configuration test with a potential solve discovery, not a claim of a new algorithm.
