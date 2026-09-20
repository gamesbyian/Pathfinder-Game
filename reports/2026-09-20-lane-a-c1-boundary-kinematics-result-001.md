# Lane A C1 boundary-kinematics result 001

> **Status:** concluded-mixed
> **Last evidence:** 2026-09-20 — the frozen C1 reducer was run over the same 581 Lane-A cases and retained C0 exact labels; no solver or CP-SAT/reference query was rerun.
> **Decision:** C1 is insufficient but repetition-supported. Proceed to a separately precommitted C2 global-accounting signature on the same frozen population. Do not modify C1 after seeing the collision.
> **Remaining gate:** freeze the additive C2 representation, then run it against the retained 581-case population / 546 decisive labels.
> **Evidence role:** development representation falsifier; no production behavior changes.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-mixed","lastEvidenceDate":"2026-09-20","decision":"C1 remains compressive but one repeated same-parent signature mixes exact LIVE/DEAD; advance to the prespecified C2 accounting layer without altering C1","remainingGate":"precommit and run C2 global accounting on the same frozen 581-case population using retained exact labels","joins":{"researchQuestion":"WS2-SEPARATOR-DYNAMIC-INTERFACE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"same 581-case Lane-A C0/C1 population sealed by reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json caseOrderHash","selection":"no resampling; representation-only reanalysis of retained labels","inferenceScope":"C1 boundary-kinematics representation sufficiency only"},"claimRefs":[],"sourceArtifacts":["reports/stress/lane-a-c1-boundary-kinematics-analysis-2026-09-20.json","reports/2026-09-20-lane-a-c1-boundary-kinematics-preflight-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","docs/solver-separator-dynamic-interface-contract-preflight.md"],"prospective":{"expectation":"C1 will remove at least some C0 collisions but may remain mixed or fragment strongly","surprise":"C1 reduces C0 mixing to one two-row same-parent collision while retaining 35.7% repeated-row support across 58 independent parents","anomaly":null}} -->

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
