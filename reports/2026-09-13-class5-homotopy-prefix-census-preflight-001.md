# Class-5 homotopy prefix census preflight 001

> **Status:** active
> **Last evidence:** 2026-09-13 — historical July winding probe plus the current exact-labelled B2/R03229 extinction population
> **Decision:** start with the smallest rigorous topology test: exact LIVE/DEAD sibling prefixes sharing both start gate and endpoint. Do not invent an open-path homotopy signature merely to increase sample size.
> **Remaining gate:** census exact-labelled extinction prefixes for same-level/same-start/same-endpoint LIVE-vs-DEAD contrasts, then measure robust obstacle-relative winding difference on portal-free contrasts.
> **Evidence role:** prespecified observer preflight

## Why this formulation

July's real homotopy probe computed winding numbers of the closed loop `pathA + reverse(pathB)` around connected obstacle clusters and found multiple solution classes on 12/19 qualifying published levels. That establishes a real solution-diversity axis, not relevance to LIVE/DEAD frontier fate.

A winding comparison is rigorous when two paths have identical endpoints. Rather than add arbitrary connectors and accidentally measure those connectors, this first gate uses only exact-labelled siblings sharing **both the same start gate and the same endpoint**.

A DEAD state has no valid completion, so this gate does not compare counts of valid future completions. It asks whether the already-realized frontier histories occupy different obstacle-relative path classes before their futures diverge.

## Frozen population

Use the same resolved B2 exact-prefix labels consumed by `scripts/stress/future-feasibility-descriptor-rejoin.mjs`, plus R03229 only if its frozen three-case artifact can be reproduced without reselection. No new exact labels are bought for this census.

Group cases by `(levelId, startGate, endpoint)`. A decision-bearing contrast requires at least one exact-LIVE and one exact-DEAD prefix in the group.

Report all exact-labelled cases, fixed-endpoint group coverage, LIVE/DEAD contrast count, and why excluded pairs are ineligible.

## Static obstacle basis

For each prepared level, form 4-connected components from statically impassable cells relevant to ordinary path topology:

- `level.blockSet`;
- `level.gooseSet`;
- `prep.deadFlipperKeys`.

Do not treat gates as holes. Portals are not obstacles.

## Robust punctures

Do not reuse the historical component centroid. For every connected obstacle component, use the center of **each actual obstacle cell** as a puncture. For a portal-free closed comparison loop, compute integer winding around every puncture in the component.

A component signature is accepted only when every puncture in that component gives the same winding integer. Disagreement is an instability/implementation alarm and the pair abstains. This eliminates the concave-centroid caveat rather than merely spot-checking it.

## Portal boundary

A portal jump is not a planar line segment. Any contrast whose prefix contains a portal transition abstains from the winding decision in this first gate. Report portal exclusion explicitly. Do not draw a fictitious straight segment across a teleport.

## Decision

This is a coverage-and-relation gate, not a production treatment.

Advance the topology premise only if:

1. at least two independent levels provide portal-free fixed-endpoint LIVE/DEAD contrasts; and
2. at least two levels show a robust nonzero winding-class difference between LIVE and DEAD prefixes.

If fixed-endpoint coverage is too small, close only this formulation. The next question would be whether a mathematically defensible open-path H-signature/reference construction is worth implementing, not whether arbitrary endpoint connectors can manufacture a signal.

If coverage is adequate but winding does not recur, close static-obstacle homotopy as the current discriminator. No in-loop feature, scorer, quota, or retention change is licensed by this census alone.
