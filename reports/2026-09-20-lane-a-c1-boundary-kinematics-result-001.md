# Lane A C1 boundary-kinematics result 001

> **Status:** concluded-mixed
> **Last evidence:** 2026-09-20 — corrected frozen C1 reducer on schema-v2 exact-label projection order; no new solver or reference compute.
> **Decision:** C1 is insufficient but repetition-supported. Advance to the already-frozen C2 global-accounting representation on the same population. Do not modify C1 after observing the collisions.
> **Remaining gate:** run C2 once on the same 581 cases / 546 decisive retained labels and apply the frozen support/mixing rule.
> **Evidence role:** development

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-mixed","lastEvidenceDate":"2026-09-20","decision":"corrected C1 is mixed + repetition-supported under schema-v2 explicit shard-major label ordering; advance to frozen C2 global accounting without modifying C1","remainingGate":"run the already-frozen C2 global-accounting reducer on the same 581 cases/retained labels and apply its preregistered support/mixing rule","joins":{"researchQuestion":"WS2-SEPARATOR-DYNAMIC-INTERFACE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"same 581-case Lane-A population; projection schema v2 seals canonical case order and source combined-row order separately","selection":"no resampling or relabelling; corrected label-to-case alignment only","inferenceScope":"C1 boundary-kinematics representation sufficiency only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-lane-a-c1-boundary-kinematics-preflight-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","docs/solver-separator-dynamic-interface-contract-preflight.md","reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json"],"prospective":{"expectation":"C1 will remove at least some C0 collisions but may remain mixed or fragment strongly","surprise":"corrected C1 retains 34.25% repeated-row support across 58 parents while leaving two mixed same-parent signatures","anomaly":null}} -->

## Provenance correction

An earlier C1 pass was superseded because the compact projection's valid labels were attached to canonical case order rather than the CP-SAT workflow's concatenated 20-shard row order.

Projection schema v2 now records both:

- canonical case order hash;
- source combined-row order hash;
- the exact round-robin-shards-then-concatenate transform.

The corrected run uses that explicit mapping. Population, exact labels and C1 fields are unchanged.

## Corrected result

- frozen rows: **581**
- decisive labels: **546**
- retained abstentions: **35**
- correctness/input alarms: **0**
- distinct C1 signatures: **440**
- multi-member signatures: **81**
- decisive rows in repeated signatures: **187 / 546 = 34.25%**
- independent parents contributing to repeated signatures: **58**
- mixed signatures: **2**
- rows in mixed signatures: **4**

The frozen support gate required:

1. at least **20%** of decisive rows in signatures containing at least two rows; and
2. at least **10 independent parent levels** contributing to repeated signatures.

Corrected C1 clears both comfortably.

## Surviving C1 falsifiers

Two same-parent C1 signatures still mix exact LIVE/DEAD:

- **R02525**, 2-row mixed signature:
  - DEAD: `R02525:frontier-1584`
  - LIVE: `R02525:frontier-3954`
- **R02345**, 2-row mixed signature:
  - DEAD: `R02345:frontier-3356`
  - LIVE: `R02345:frontier-2685`

Cross-parent recurrence is not required for a logical sufficiency falsifier. These exact same-signature opposite-outcome pairs prove C1 alone is insufficient.

No C1 field may be edited post-outcome to separate them.

## Frozen decision

This is the preregistered **mixed + repetition-supported** branch:

- C1 remains meaningfully compressive;
- C1 is not exact-outcome sufficient;
- advance to **C2 global accounting**;
- keep C1 unchanged as the negative control.

C2 was frozen before the corrected C1 outcome was inspected, so advancing to it does not introduce post-outcome feature selection.

## Boundaries

This result does not earn a separator consumer, decomposition engine, hard prune, topology subsystem, or exact-query service. C2 remains an offline representation falsifier on retained truth.
