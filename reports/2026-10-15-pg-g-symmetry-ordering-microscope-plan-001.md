# PG-G symmetry ordering microscope plan (2026-10-15)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-15 — one-shot run 38856550278 completed all five frozen mapped-path cases: 393 prefixes, zero legal-set/DFS-score/admissible-slack mismatches, tie-order divergence in every case, and repair seed drift in every case.
> **Decision:** the selected symmetry cliffs localize to non-equivariant stable tie ordering, with a separate repair seed-identity seam; advance to a bounded selected-pair factorial separating those two mechanisms.
> **Remaining gate:** run the selected-pair equivariant-order × fixed-repair-seed factorial; no production treatment or untouched-parent confirmation before causal attribution.
> **Evidence role:** forensic.
> **Selection:** cases selected after inspecting the PG-G pilot response cliffs; mechanism localization only, not prevalence or confirmation.
> **Population identity:** exact five cases and paths in `reports/2026-10-15-pg-g-symmetry-ordering-microscope-spec-001.json`.
> **Selection history:** selected-on six-parent PG-G discovery cohort → observed symmetry solve/work cliffs → five representative symmetry edges.
> **Inference scope:** mechanisms capable of explaining the selected symmetry cliffs under current-main search code; no population-rate or production-treatment claim.
> **Proposal provenance:** family microscopy plus source-level reconstruction of symmetry-sensitive ordering and seed seams.

## Why this is the next gate

The recovered 715-cell pilot found 16/42 symmetry edges with a true solve-state flip. Symmetry siblings preserve puzzle obligations, so they isolate representation/search-policy effects unusually cleanly.

Current-main source inspection reveals three concrete non-equivariant seams:

1. `getNeighbors()` inherits the fixed global direction order **E, W, S, N** from `NEIGHBOR_DX/NEIGHBOR_DY`.
2. `admissible-order|tieBreak=none` explicitly uses stable sorting and therefore preserves that arbitrary direction order whenever admissible slack ties.
3. DFS `scoreAndSort()` uses insertion sort with a strict `<` comparison, so equal scores likewise preserve E/W/S/N order.
4. Repair has both the same ordered survivor list and a second, independent seam: its deterministic PRNG seed is a function of the packed gate coordinate (`startKey`). A rotation/reflection that moves the gate changes the random stream before search begins.

These source facts establish *possible* mechanisms. They do not establish that the selected pilot cliffs actually encounter the relevant ties or that repair's seed drift dominates its outcome.

## Frozen cases

The exact paths are frozen in the spec before this diagnostic runs:

| case | pilot signal | replay path source |
|---|---|---|
| P00146 → F00146-sym-01 | DFS gain + admissible loss under rotation | variant DFS solve |
| P00146 → F00146-sym-05 | DFS gain + admissible loss under reflection | variant DFS solve |
| R02976 → F02976-sym-01 | admissible gain under rotation | variant admissible solve |
| R00631 → F00631-sym-02 | repair loss under rotation | variant admissible solve |
| P00144 → F00144-sym-02 | all solve; repair ~69.8× work reduction | variant repair solve |

The historical family files are read from pinned commit `32132d6ba60f1203ee013ed0d475f46061eddd49`. Current parent content must still match each manifest fingerprint.

## Measurements

At every mapped prefix of each valid solution path:

- validate parent and variant paths independently;
- map the parent's legal candidate set into variant coordinates and compare it with the variant set;
- compare mapped raw neighbour order with variant raw order;
- rank both sides with current default DFS scoring and test score equivariance separately from ordering equivariance;
- rank both sides with current no-tie admissible slack and test slack equivariance separately from ordering equivariance;
- classify ordering differences that occur while mapped scores/slacks remain equal as tie-order seams;
- compare repair's deterministic primary seed at the mapped gate positions.

The diagnostic does not run a full solve and does not change any solver policy.

## Interpretation

A **positive ordering localization** requires at least one selected flip case where:

1. both mapped paths validate;
2. mapped legal candidate sets agree at the relevant prefixes;
3. the underlying DFS scores or admissible slacks agree under the symmetry map; and
4. the resulting candidate order differs because tied candidates inherit the fixed raw direction order.

A **repair seed localization** is weaker: differing seeds prove the transformed pair is not the same deterministic repair experiment. That nominates a fixed-research-seed matched test; it does not by itself prove the seed caused the solve/work cliff.

If the path replay instead finds score/slack or legal-set non-equivariance, that semantic difference becomes the next microscope target.

## Stop rule

Do not build a symmetry-normalized treatment from this diagnostic alone. If ordering is localized, first identify the smallest reversible seam (tie order, research seed, or both) and run matched selected-pair tests. Only a mechanism that survives those tests may nominate untouched-parent confirmation or a production consumer.


## Closeout

Completed result: [2026-10-15 PG-G symmetry ordering microscope result](2026-10-15-pg-g-symmetry-ordering-microscope-result-001.md).

The preregistered positive condition was met cleanly. All five mapped paths validate; across 393 checked prefixes, mapped legal candidate sets, default DFS scores and admissible slacks remain equivariant. Every selected case nevertheless contains raw-order divergence, DFS tie-order divergence and admissible tie-order divergence. Repair's deterministic primary seed also changes on every selected transform.

The next gate is therefore causal attribution between ordering and repair-seed identity, not additional descriptive microscopy.
