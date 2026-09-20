# Lane A C1 boundary-kinematics result 001

> **Status:** superseded
> **Last evidence:** 2026-09-20 — source workflow artifact 10591287305 from run 35466554891 proved the compact labels are ordered by concatenated round-robin shards, not canonical case order.
> **Decision:** superseded before downstream use. The compact exact-label projection was discovered to preserve the source workflow's shard-major combined-row order, while this result attached those labels to canonical case order. Rerun C1 with the now-explicit projection ordering before applying any C1/C2 decision rule.
> **Remaining gate:** rerun frozen C1 against the same 581 cases using schema-v2 projection ordering; only then decide whether the already-frozen C2 representation is reached.
> **Evidence role:** development

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"superseded","lastEvidenceDate":"2026-09-20","decision":"superseded: labels were attached in canonical case order although the retained projection labels are in combined shard-major row order; rerun frozen C1 before any C2 advancement","remainingGate":"rerun frozen C1 using schema-v2 explicit shard-major projection ordering; apply the original frozen rule to that corrected result","joins":{"researchQuestion":"WS2-SEPARATOR-DYNAMIC-INTERFACE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"same 581-case Lane-A C0/C1 population sealed by reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json caseOrderHash","selection":"no resampling; representation-only reanalysis of retained labels","inferenceScope":"C1 boundary-kinematics representation sufficiency only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-lane-a-c1-boundary-kinematics-preflight-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","docs/solver-separator-dynamic-interface-contract-preflight.md"],"prospective":{"expectation":"C1 will remove at least some C0 collisions but may remain mixed or fragment strongly","surprise":"C1 reduces C0 mixing to one two-row same-parent collision while retaining 35.7% repeated-row support across 58 independent parents","anomaly":null}} -->

## Supersession note

This report's numerical collision summary is **not decision-bearing**. On 2026-09-20 the retained compact projection was traced back to workflow run 35466554891. Its labels follow the combined artifact's 20-shard concatenation order, not canonical case-file order. The old `caseOrderHash` value seals that source-row order exactly.

The population, exact labels and reference compute remain valid. Only the compact label-to-case alignment used by this report was wrong. The projection is now schema v2 with both canonical and source-row hashes plus the explicit round-robin-shard transform. C1 must be rerun unchanged against that corrected mapping.

## Result

The frozen reducer completed with no input/correctness alarms.

- frozen cases: **581**
- decisive exact labels: **546**
- retained abstentions: **35**
- C1 distinct signatures: **435**
- multi-member signatures: **84**
- decisive rows in multi-member signatures: **195 / 546 = 35.7%**
- independent parent levels contributing to multi-member signatures: **58**
- mixed signatures: **1**
- rows in mixed signatures: **2**
- cross-parent mixed signatures: **0**
- same-parent mixed signatures: **1**
- largest signature group: **5 rows**

The frozen repetition-support gate required at least 20% of decisive rows in repeated signatures and at least 10 independent parents contributing to a repeated signature. C1 clears both comfortably.

C1 therefore did **not** become representation-explosive.

## The surviving falsifier

One C1 signature contains both an exact-LIVE and exact-DEAD prefix on the same parent:

- parent: `R02996`
- cut: `262145,327681`
- LIVE: `R02996:frontier-803`
- DEAD: `R02996:frontier-3756`

Because the rows share the full frozen C1 signature, this is a direct falsifier of C1 sufficiency. Cross-parent recurrence is not required for the logical falsifier; the same-parent collision is enough.

No C1 field may now be edited to separate these rows without defining a new representation version and restarting prospective accounting.

## What changed from C0

C0 was deliberately coarse and mixed several LIVE/DEAD groups. C1 removes most of that ambiguity while preserving substantial repeated support.

The important outcome is therefore neither “C1 failed” nor “C1 nearly works.” It is:

> boundary kinematics explain most of the previously observed C0 ambiguity, but at least one exact completion distinction survives them while the representation still compresses a meaningful population.

That is exactly the condition under which the nested contract says to buy the next **prespecified** information layer rather than feature-shop inside C1.

## Next step: C2

C2 is the already-declared global-accounting layer:

- exact counted length used / remaining;
- intersections used / remaining;
- outstanding required obligations represented in a bounded region-aware form.

C2 must remain additive to the frozen C1 signature. It must not incorporate full prefix identity, arbitrary post-outcome features, or mutable-mechanic/topology fields reserved for C3/C4.

The same 581 cases and retained labels are reused. No new exact/reference compute is justified merely to run C2.

## Boundaries

This result does not earn:

- region DP or AND/OR decomposition;
- a production separator consumer;
- a generic exact-query service;
- topology-aware routing;
- any runtime treatment.

A future bounded-positive Ck still needs independent confirmation before the smallest production consumer is considered.
