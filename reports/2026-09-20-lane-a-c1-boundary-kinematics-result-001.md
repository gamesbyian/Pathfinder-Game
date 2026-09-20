# Lane A C1 boundary-kinematics result 001

> **Status:** superseded
> **Last evidence:** 2026-09-20 — source workflow artifact 10591287305 from run 35466554891 proved the compact labels are ordered by concatenated round-robin shards, not canonical case order.
> **Decision:** superseded before downstream use. The compact exact-label projection was discovered to preserve the source workflow's shard-major combined-row order, while this result attached those labels to canonical case order. Rerun C1 with the now-explicit projection ordering before applying any C1/C2 decision rule.
> **Remaining gate:** rerun frozen C1 against the same 581 cases using schema-v2 projection ordering; only then decide whether the already-frozen C2 representation is reached.
> **Evidence role:** development

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"superseded","lastEvidenceDate":"2026-09-20","decision":"superseded: labels were attached in canonical case order although the retained projection labels are in combined shard-major row order; rerun frozen C1 before any C2 advancement","remainingGate":"rerun frozen C1 using schema-v2 explicit shard-major projection ordering; apply the original frozen rule to that corrected result","joins":{"researchQuestion":"WS2-SEPARATOR-DYNAMIC-INTERFACE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"same 581-case Lane-A C0/C1 population; projection schema v2 records canonical order and the source workflow combined-row order separately","selection":"no resampling; representation-only reanalysis of retained labels","inferenceScope":"C1 boundary-kinematics representation sufficiency only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-lane-a-c1-boundary-kinematics-preflight-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","docs/solver-separator-dynamic-interface-contract-preflight.md"],"prospective":{"expectation":"C1 will remove at least some C0 collisions but may remain mixed or fragment strongly","surprise":"none retained: the numerical outcome was invalidated before downstream use because labels were joined to the wrong case order","anomaly":"compact projection order was ambiguous in schema v1; source artifact recovery showed labels follow concatenated round-robin shard order"}} -->

## Supersession note

This report's numerical collision summary is **not decision-bearing**. On 2026-09-20 the retained compact projection was traced back to workflow run 35466554891. Its labels follow the combined artifact's 20-shard concatenation order, not canonical case-file order. The old `caseOrderHash` value seals that source-row order exactly.

The population, exact labels and reference compute remain valid. Only the compact label-to-case alignment used by this report was wrong. The projection is now schema v2 with both canonical and source-row hashes plus the explicit round-robin-shard transform. C1 must be rerun unchanged against that corrected mapping.


## Withdrawn numerical outcome

All numerical C1 collision/grouping values from the superseded pass are intentionally removed. They were computed after attaching valid exact labels to the wrong case identities, so neither group counts nor the apparent mixed pair can support any scientific claim.

This file survives only as a provenance record for the invalidated pass and the schema-v2 ordering repair. The unchanged frozen C1 analysis must be rerun before any representation verdict or C2 advancement.
