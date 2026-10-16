# PG-G symmetry ordering microscope result (2026-10-15)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-15 — PR #2152 one-shot run 38856550278 completed the frozen five-case mapped-path replay on source `bfb39a8ec25283640ac0e73255c96ab370f4705c`.
> **Decision:** the selected symmetry cliffs localize cleanly to search-order asymmetry, not semantic score/slack asymmetry: mapped legal candidate sets, DFS scores, and admissible slacks are fully equivariant along all 393 checked prefixes, while stable tie order differs in every case. Repair also changes its deterministic PRNG seed on every transformed pair.
> **Remaining gate:** run a bounded selected-pair research A/B that separates (A) symmetry-equivariant tie ordering from (B) fixed repair seed, before designing any production consumer or untouched-family confirmation.
> **Evidence role:** forensic
> **Selection:** selected after inspecting PG-G pilot response cliffs; not prevalence or confirmation evidence.
> **Population identity:** exact five frozen cases/paths in `reports/2026-10-15-pg-g-symmetry-ordering-microscope-spec-001.json`; historical descendants pinned to `32132d6ba60f1203ee013ed0d475f46061eddd49`.
> **Selection history:** selected-on six-parent PG-G discovery cohort → observed symmetry solve/work cliffs → five representative symmetry edges.
> **Inference scope:** mechanism localization for these selected symmetry cliffs under current-main search semantics. No population-rate, unseen-level, or production-treatment claim.
> **Proposal provenance:** family microscopy plus source-level reconstruction of symmetry-sensitive ordering and repair-seed seams.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-15","decision":"Selected symmetry cliffs localize to non-equivariant stable tie ordering; repair also changes coordinate-derived deterministic seed.","remainingGate":"Run bounded selected-pair research A/B separating symmetry-equivariant tie ordering from fixed repair seed before any production consumer or untouched-family confirmation.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"exact five frozen cases/paths in `reports/2026-10-15-pg-g-symmetry-ordering-microscope-spec-001.json`; historical descendants pinned to `32132d6ba60f1203ee013ed0d475f46061eddd49`.","selection":"selected after inspecting PG-G pilot response cliffs","inferenceScope":"mechanism localization for the selected symmetry cliffs only"},"claimRefs":[],"sourceArtifacts":["reports/2026-10-15-pg-g-symmetry-ordering-microscope-spec-001.json","reports/2026-10-15-controlled-technique-response-pilot-recovery-result-001.md"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"Mapped semantic facts should remain equivariant while raw/tied candidate order changes under D4 transforms.","surprise":null,"anomaly":null}} -->

## Execution and provenance

The temporary one-shot workflow executed run **38856550278** from source SHA `bfb39a8ec25283640ac0e73255c96ab370f4705c`.

The historical family checkout was pinned to `32132d6ba60f1203ee013ed0d475f46061eddd49`. Every frozen mapped parent/variant path validated independently before any ordering comparison.

Raw artifact:
- artifact id: `12027835361`
- artifact name: `pg-g-symmetry-ordering-microscope`
- downloaded ZIP SHA-256: `0dda63df9620680182abb802ce27c6230212682f8828a265937daea6c100d5e9`

Standard solver-result front door:
- artifact id: `12027845284`
- artifact name: `solver-sweep-result`

The first two one-shot attempts were harness-only failures before any scientific result: run 38856142970 incorrectly expected admissible research rows on singleton prefixes; run 38856354690 attempted to import a private admissible-bound helper. Neither produced a microscope result. Run 38856550278 is the first decision-bearing execution.

## Result

Across the five frozen symmetry pairs:

| measurement | result |
|---|---:|
| checked mapped prefixes | 393 |
| cases with legal candidate-set mismatch | **0 / 5** |
| cases with raw candidate-order mismatch | **5 / 5** |
| cases with DFS score non-equivariance | **0 / 5** |
| cases with DFS tied-order mismatch | **5 / 5** |
| cases with admissible-slack non-equivariance | **0 / 5** |
| cases with admissible tied-order mismatch | **5 / 5** |
| cases with repair deterministic-seed drift | **5 / 5** |

The strongest observation is the conjunction, not any one count: **the mapped search states keep the same legal choices and the same tested semantic ranking values, but the ordering of tied choices changes under rotation/reflection**.

That is exactly the seam predicted by the current implementation:

- `getNeighbors()` inherits fixed E/W/S/N enumeration.
- DFS's insertion sort is stable on equal scores.
- `admissible-order|tieBreak=none` deliberately keeps raw neighbour order on equal slack.
- repair's primary deterministic seed is derived from the packed gate coordinate and therefore changes when the gate moves under a symmetry transform.

The microscope does **not** establish that every PG-G solve/work cliff is fully explained by these seams. It establishes that these seams are genuinely exercised along successful mapped paths in every selected case, while the tested semantic alternatives remain equivariant.

## Per-case localization

| pair | transform | prefixes | raw-order mismatches | DFS tied-order mismatches | admissible tied-order mismatches | repair seed |
|---|---|---:|---:|---:|---:|---|
| P00146 → F00146-sym-01 | rotation 1 | 101 | 71 | 26 | 45 | 2019391921 → 2428919925 |
| P00146 → F00146-sym-05 | reflection 5 | 101 | 23 | 7 | 5 | 2019391921 → 4272716209 |
| R02976 → F02976-sym-01 | rotation 1 | 70 | 41 | 2 | 21 | 1983306278 → 2019391921 |
| R00631 → F00631-sym-02 | rotation 2 | 59 | 21 | 1 | 6 | 3041712678 → 969402052 |
| P00144 → F00144-sym-02 | rotation 2 | 62 | 26 | 1 | 6 | 2392834282 → 1618280448 |

### P00146 rotation example

For P00146 → F00146-sym-01, the mapped legal set is already identical at depth 0, but parent raw order maps to **S, N, W, E** while the transformed level enumerates **E, W, S, N**.

At depth 20, DFS scores remain exactly equivariant yet the candidate order differs:

- mapped parent order: S, N, W
- variant order: S, W, N

At depth 1, admissible slacks remain exactly equivariant yet no-tie order differs:

- mapped parent order: S, N, W
- variant order: W, S, N

The same pattern recurs many times along the 102-node valid path.

### Reflection is not special-cased away

P00146 → F00146-sym-05 supplies the same diagnosis under a reflection rather than a rotation. Legal sets, DFS scores and admissible slacks stay equivariant, while tied orders diverge. This matters because it rules out a rotation-only artifact in the diagnostic itself.

## What this establishes

### Premise G1: fixed directional order leaks into complete-search economics

For DFS and no-tie admissible-order, D4-equivalent levels can induce different traversal order solely because stable ties inherit the global E/W/S/N candidate enumeration.

This is not merely source-code possibility. It is observed on all five selected mapped-path cases with zero corresponding score/slack non-equivariance.

### Premise G2: repair's deterministic experiment identity is not symmetry-invariant

All five transformed pairs receive different primary repair seeds. Therefore a parent and its symmetry sibling are not the same deterministic repair experiment even before survivor-order effects are considered.

Seed drift alone does not prove it caused the repair solve/work cliffs, because repair also consumes candidates in a non-equivariant raw order. The two effects need to be separated experimentally.

### Premise G3: beam robustness is empirical, not formal

The original pilot found the two tested 5k beams far more symmetry-stable than DFS/admissible/repair. Their implementation still has stable score-tie order, so the microscope should not be read as proving beams symmetry-invariant. Their width/diversity machinery appears to buffer this asymmetry better under the tested cohort.

## Next experiment

Do **not** build a production canonical-orientation subsystem yet.

The smallest informative follow-up is a research-only selected-pair factorial:

1. **control:** current policy;
2. **equivariant-order arm:** on score/slack ties, order candidates by a parent/symmetry-consistent research mapping rather than local E/W/S/N;
3. **fixed-seed repair arm:** hold `prep._repairResearchSeed` constant across each parent/symmetry pair while leaving candidate order unchanged;
4. **combined arm:** equivariant ordering + fixed seed for repair.

Use only the existing selected symmetry pairs initially. The question is causal attribution, not generalization:

- Do DFS/admissible parent/variant outcomes or work converge when tie ordering is made symmetry-equivariant?
- Does repair convergence come from seed identity, candidate ordering, or their interaction?

Only if one of those seams materially explains the selected cliffs should it nominate untouched-parent confirmation or a production-facing consumer.

## Stop rule

If equivariant tie order fails to reduce DFS/admissible pair divergence, close that causal form despite the forensic localization and inspect later search-state effects instead.

If fixed repair seed alone fails, do not conclude repair is symmetry-insensitive; test the combined/order arm because the current repair implementation demonstrably changes both seed stream and survivor-order interpretation under symmetry.

No treatment is promoted by this report.
