# Lane A C2 global-accounting preflight 001

> **Status:** active
> **Last evidence:** 2026-09-20 — C1 boundary kinematics concluded mixed + repetition-supported on the frozen 581-case population.
> **Decision:** freeze one additive C2 accounting representation before inspecting any C2 collision outcome. Reuse the existing 581 cases and 546 decisive exact labels; derive accounting by replaying each frozen prefix through the solver's own current state transition semantics.
> **Remaining gate:** implement/test the frozen reducer, then run it once against the retained C0/C1 label projection.
> **Evidence role:** precommitment.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-09-20","decision":"freeze C2 as C1 plus exact counted-length/intersection accounting and bounded region-aware pending-obligation counts derived from canonical solver replay","remainingGate":"implement and run the frozen C2 reducer on the retained 581-case population without rerunning solver/reference truth","joins":{"researchQuestion":"WS2-SEPARATOR-DYNAMIC-INTERFACE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"precommitment","scope":{"populationIdentity":"same 581-case Lane-A population and retained exact labels used by C0/C1","selection":"no resampling; no relabelling","inferenceScope":"C2 global-accounting representation sufficiency only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-lane-a-c1-boundary-kinematics-result-001.md","docs/solver-separator-dynamic-interface-contract-preflight.md","reports/stress/lane-a-c0-exact-label-projection-2026-09-20.json"],"prospective":{"expectation":"C2 may split the surviving R02996 C1 collision but may also reduce repeated-signature support materially","surprise":"C2 becomes exact-outcome pure while still clearing the frozen repetition-support gate","anomaly":"any replay illegality, population/case-order mismatch, negative remaining resource, or solver-state/accounting inconsistency"}} -->

## Why C2 is still zero-new-truth work

C1 found one exact-LIVE/exact-DEAD collision while preserving meaningful repeated support. The nested contract already named **global accounting** as the next additive information layer.

C2 does not change the target label. It asks whether the same prefixes become distinguishable once the representation knows how much globally constrained resource has already been consumed and which required obligations remain.

Therefore:

- no new frontier sampling;
- no new solver search;
- no new CP-SAT/reference query;
- no replacement of the 35 existing abstentions;
- no resampling after seeing C1.

## Canonical replay requirement

Do not hand-reconstruct Pathfinder state semantics from path coordinates.

For every frozen prefix:

1. prepare the raw level through the current solver normalizer;
2. create state at the frozen gate using the solver's own `createState`;
3. replay every stored transition with the solver's own `applyMove`, including canonical portal-jump detection;
4. derive C2 accounting from the resulting state.

This makes C2 consume the same semantics that production search uses for intersections, must-pass satisfaction, must-cross counts, must-turns, surround obligations, adjacent-turn obligations and portal zero-cost steps.

Any frozen prefix that cannot be replayed canonically blocks the result. It is not silently repaired.

## Frozen C2 fields

C2 is exactly:

### A. Frozen C1 boundary kinematics

Reuse the complete C1 representation unchanged.

### B. Counted-length accounting

Record:

- `countedLengthUsed`;
- `countedLengthRemaining`.

Counted length is canonical solver path steps minus portal jumps, matching production's zero-cost portal semantics.

### C. Intersection accounting

Record:

- `intersectionsUsed`;
- `intersectionsRemaining`.

These come directly from the replayed solver state and level requirement.

### D. Bounded region-aware pending obligations

For each interface region:

- `gate`;
- `cut`;
- `remainder`;
- `other`;

record only **counts** of currently pending:

- must-pass;
- must-cross;
- must-turn;
- surround;
- adjacent-turn obligations.

The region is determined by the obligation's canonical cell relative to the frozen separator partition.

This intentionally does **not** include exact pending-cell identities or global temporal order. Region/type counts are the bounded accounting representation C2 promised.

For must-pass, pending status is derived from the authoritative `mpVisitedMask`, not `mustMask`, because dense-level scoring may intentionally keep `mustMask=0`.

## Deliberate omissions

C2 does not include:

- exact pending-obligation cell IDs;
- full prefix/path identity;
- mutable filter or flipping-filter runtime state;
- non-crossing portal-consumption state;
- topological occupancy/history;
- ordering among outstanding obligations;
- candidate-specific exact/reference answers.

Those are either deliberately too identifying or belong to C3/C4.

## Frozen support gate

Keep the C1 repetition-support rule unchanged:

1. at least **20% of decisive rows** remain in signatures containing two or more rows; and
2. at least **10 independent parent levels** contribute to a multi-member C2 signature.

This is monotonic. If C2 fails repetition support, C3/C4 cannot restore it because they only add fields.

## Fixed decision rule

### Mixed + repetition-supported

C2 is insufficient. Proceed to a separately precommitted C3 mutable-mechanics state on the same frozen population.

### Pure + repetition-supported

C2 is a bounded-positive representation candidate. Stop the nested development ladder and acquire an independent confirmation/challenge population before any production consumer.

### Repetition support fails

Stop Lane A's nested compact-signature contract as representation-explosive at C2.

### Blocked

Any case-order mismatch, missing level/interface, illegal replay, negative accounting resource, or input/correctness alarm blocks the verdict.

## What C2 cannot earn

Even a pure repetition-supported C2 does not directly earn:

- region DP / AND-OR decomposition;
- a generic separator engine;
- production exact solving;
- production routing;
- a hard prune.

It earns independent confirmation of the compact representation. Only a confirmed compact interface can nominate the smallest local consumer.
