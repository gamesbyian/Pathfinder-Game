# PG-I isolated depth-for-breadth 512-wide falsifier (2026-10-18)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — exact-work [run 39178092834](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39178092834), source ac2bfc1a229a0b65bc6e77f7cdc294578e4aeacc
> **Decision:** Complete 512-versus-5000 250k strict-work paired falsifier is concluded negative on three selected source-method cells (two parents): 6/6 valid, 0->0 solves, 0 work overruns; the 512 objective-first R03031 beam exhausted early at 209,739 work.
> **Remaining gate:** none; no further fixed-width racing under this selected two-parent formulation
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** discovery
> **Selection:** three successful 10M isolated winner-positive method/gate configurations on two historically resistant PG-I parents, prospectively frozen before this *width* experiment but outcome-selected earlier; not an unbiased capability or confirmation sample
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Selection history:** original PG-I 12-parent historical-hard cohort; two deep-positive parents selected after their 10M successes and 250k non-successes; width512 chosen from observed 9–12× cost-to-budget ratio before any 512 run
> **Inference scope:** current-code isolated 512-vs-5000 beam under identical true 250k canonical work cap, not complete production ladder or independent-generalization evidence

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"Complete 512-versus-5000 250k strict-work paired falsifier is concluded negative on three selected source-method cells (two parents): 6/6 valid, 0->0 solves, 0 work overruns; the 512 objective-first R03031 beam exhausted early at 209,739 work.","remainingGate":"none","joins":{"researchQuestion":"WS2-VARIANT-RESPONSE-HARDNESS","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"post-outcome three original isolated 10M winner configurations on two frozen historical-hard parents","inferenceScope":"fixed-work 512 vs 5000 configuration development screen, not product-cold routing or generalization"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-i-early-equal-work-cold-solves-20261018.json","reports/stress/pg-i-winning-corridor-frontier-locus-20261018.json","reports/stress/pg-i-beam-512-strict-250k-20261018.json"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"Width512 may spend less canonical work per phase and reach deeper before 250k, but could cull the only historical winning prefix and yield zero solves.","surprise":"Narrow objective-first R03031 exhausted at 209739 actual work while the 5000-wide control reached 250000; all six cells were valid and width512 found no path.","anomaly":null}} -->

## Why exactly this cheap width?

The [source-replay checkpoint result](2026-10-18-pg-i-deep-winner-cold-250k-frontier-locus-preflight-001.md) shows that the recorded winner prefixes have been *generated and retained* by the original 5000-wide beam through sub-250k checkpoints. None of those wide beams completes a path by then. The original full deep successes cost 2.20M, 2.31M and 3.07M canonical units, or roughly 8.8–12.3× the 250k target. Width512 is a single predeclared approximate inverse scaling from 5000, **not** a fitted winner-rank threshold. Prior beam-width studies establish non-monotonic width/retention behaviour, so *narrower* does not imply preserved witnesses or any success.

## Frozen exact-work protocol

- Same original Corpus-2 SHA, frozen two parent IDs, original three source profiles/gate choices (two R03031 configurations, one R02108); labels and historical winners are never passed to candidate ordering/scoring/expansion.
- Each configuration has two fresh independent prep/beam calls, width **5000** control and width **512** treatment, with identical scorer, starting gate, retention, fixed 250,000 hard work limit, node ceiling 250,000, wall-safety cap 600,000ms and current default pruning. No early repair; this is an isolated beam experiment, not whole-ladder product deployment.
- Unlike the phase-complete microscope, set the new **atomic strict whole-cell cap** `prep._atomicStrictWorkCap` and `prep._workCap` to 250,000. Catch `StrictWorkBudgetExhausted` solely as normal censored work stop; no primitive can charge past 250k. Distinguish a budget-censored incomplete path from a search error and from unsatisfiable.
- Persist each actual work total, node total (not just deferred metrics), stop cause, source head, complete arm/configuration identity, and any winning path with canonical referee. A successful new path is a *selected development cold inner-search solve*, not yet a product/cross-parent result. Do not consume stored hints at any cold runtime boundary.
- Precommitted stop: **0 gains** or invalid participation terminates unchanged narrower-width treatment. Any positive earns a new current-state-only generic *cost-driven width policy* opportunity study, then separate independent-parent sample, paired solved-control regression and production-ladder economics. Do not start a static-width parameter sweep.

Max requested canonical work is 6×250k=1.5M units across six cells. Source run's artifact survives failure, then the one-shot workflow is retired. This is a cheap causal configuration test with a potential solve discovery, not a claim of a new algorithm.

## Completed result and stop decision

The source-exact [one-shot run 39178092834](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39178092834) succeeded with six of six valid isolated beam cells on immutable merge source `ac2bfc1a229a0b65bc6e77f7cdc294578e4aeacc`. Artifact `12154774395`; ZIP SHA256 `860b0c7ae245bc362dd1c66919cdffe4f2d1dfacca1dd82087a9403ca7674c8a`; `paired-result.json` SHA256 `cc7ccfc87fed1d19798789569b96b43cee262c461d87be6ab2bae56021b05fdd`. [Durable per-parent machine verdict](stress/pg-i-beam-512-strict-250k-20261018.json) preserves source/method, actual work, stop classes, and negative referee verdicts. No persisted hint or historical solution was passed into the beam.

| Parent, scorer, retention | Control width 5000 | Narrow width 512 | New path |
| --- | --- | --- | --- |
| R03031, objectiveFirst, plain | work-refused at **250,000** | **frontier exhausted at 209,739** | none |
| R03031, intersectionHarvest, buckets | work-refused at **249,989** | work-refused at **249,989** | none |
| R02108, intersectionHarvest, buckets | work-refused at **250,000** | work-refused at **250,000** | none |

Both arms remain **0/3** referee-valid successes; treatment-only gains and control-only losses **0/0**. The six cells charged **1,459,717** canonical units in aggregate, never more than 250,000 per cell. Strict refusal at 249,989 is a legitimate **11 units remaining but a 12-unit connectivity call cannot fit**, not a work/accounting failure. The source results keep node totals `null` when a primitive-level strict interruption prevented the beam's ordinary end-of-attempt metric flush; `null` must not be misrepresented as zero nodes.

**Decision:** the unchanged fixed-width-512 depth-for-breadth idea is a genuine, fully participating negative on these selected development cells. The R03031 plain narrow beam even ran out of candidates with 40,261 work unspent: deeper progression is not automatically useful if narrower breadth destroys viable states. The two other narrower cells were work-limited and also failed. This gives no entitlement for another width sweep, for a new width policy, or to count a new cold solve. PG-I's premise must now demand a specific current-state-derived mechanism that maintains useful future options while avoiding redundant breadth work, with cheap, prospectively measurable work headroom. A new method or selector would require independent evidence proportional to this historical-winner selection pressure before production promotion.
