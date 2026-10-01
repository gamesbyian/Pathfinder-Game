# WS6 independent-parent replication preregistration 001

> **Status:** concluded-negative
> **Last evidence:** 2026-10-01 — population and decision rules frozen from retained exact-label files and stored hint solutions before any feature outcome was computed.
> **Decision:** replicate the frozen R03147 path-resource / relational-bound interface on independent parents with exact DEAD/LIVE matched pairs; a directional, recurrent difference nominates a bounded matched-work consumer falsifier, anything else leaves `WS6-DEPENDENCY-CONDITIONED-REPAIR` dormant.
> **Remaining gate:** none; executed once, see the [result](2026-10-01-ws6-independent-parent-replication-result-001.md) (inconclusive-insufficient-parents).
> **Evidence role:** development.
> **Owner:** `WS6-DEPENDENCY-CONDITIONED-REPAIR`.

## Why the R03147 microscope could not decide
It showed that DEAD and LIVE branches differ in path-resource counts and the must-pass lower bound -- but two different moves differ in those almost trivially, and the bound's direction reversed between the two R03147 points. Replication therefore tests **direction**, not mere difference, against a LIVE-LIVE null.

## Population (frozen, retained evidence only)
- DEAD side: retained exact-DEAD (`INFEASIBLE`) prefixes from the six class-5 exact-label files, every parent except R03147.
- LIVE side: the same parent's stored referee-valid hints; every prefix of a valid solution is exactly LIVE. For each DEAD prefix `P` the hint with the longest common prefix gives divergence index `c`; pair = (`P[:c+1]`, `H[:c+1]`). Built by `scripts/stress/ws6-replication-pairs.mjs`: 69 candidate pairs over 24 parents (`data/stress/ws6-replication-pairs-001.json`).
- Causal contract (Lane E): one exact CP-SAT query per pair must label `P[:c+1]` **infeasible** (divergence = point of no return); LIVE-by-SAT, timeout and abstain pairs are excluded and counted.
- Independent unit = **parent level**. Within a parent, per-feature sign = sign of the mean of per-pair signs (ties dropped).

## Frozen features (existing code only; no feature shopping)
`mustPassLowerBound` (0 if no must-pass), `legalSuccessorCount`, `bothAxesUsedCells`, `horizontalUsedCells`, `verticalUsedCells`, each as `f(DEAD branch) - f(LIVE branch)` immediately after the divergent move, with controls: global accounting must be equal (pairs where it differs are explained by existing scalars and excluded, counted); a DEAD branch already rejected by the current hard-prune gauntlet is `existing-hard-fact` (excluded, counted); a LIVE branch rejected is a correctness alarm (blocks).

## Decision rule
- Minimum 12 eligible parents, else **inconclusive** (insufficient independent units).
- For each feature, two-sided exact sign test over parent signs, alpha = 0.05 / 5 = 0.01.
- Null calibration: the same extraction/test on LIVE-LIVE pairs (two distinct valid hints of a parent diverging at `c`, role orientation fixed by parity of `levelId.length + c`) must show no significant feature at the same alpha; a significant null feature invalidates the DEAD-LIVE reading for that feature.
- **Nominate** a feature only if significant on DEAD-LIVE and not on the null. Nomination earns only a bounded matched-work consumer falsifier, never a repair operator, hard prune, classifier or LNS.
- Otherwise record negative/dormant.
