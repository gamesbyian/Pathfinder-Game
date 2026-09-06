# Perimeter-bias production attribution confound audit

> **Status:** concluded-correction
> **Last evidence:** 2026-09-05 — production first-success attribution was reconciled against the existing matched isolated relative-advantage census for the same clockwise/counter-clockwise `perimeterSweep` pairs.
> **Decision:** the apparent ~2x clockwise advantage in production `winningConfig` attribution does **not** reproduce as a matched capability advantage. Retire the generic clockwise structural-selector premise from WS1. Preserve both directions as capability-bearing actions; any future question about directional ordering/allocation belongs under a matched-exposure WS2 contract.
> **Evidence role:** correction / anti-confounding audit, no new solver dispatch.

## Why this audit was necessary

`2026-09-05-perimeter-bias-clockwise-preference-cross-family-001.md` connected two striking production first-success counts:

- DFS `perimeterSweep`: clockwise 21 wins vs counter-clockwise 11;
- beam `perimeterSweep`: clockwise 170 wins vs counter-clockwise 76.

The direction also held in both corpora for both search families. That was credible discovery evidence, but production `winningConfig` is a **first-success attribution** measure. Earlier stages can prevent later stages from receiving attribution at all, and differing reach/order/work can change winning-config counts even when matched isolated capability is equal.

The natural falsification check is therefore the already-existing matched isolated census, where the two directions are compared on the same levels without production-ladder first-success suppression.

## Matched isolated result

The current `reports/stress/technique-niches/2026-09-03/relative-advantage-summary.json` already contains the relevant fixed pairs.

| family | CW pairwise wins | CCW pairwise wins | ties | both miss | CW-only solves | CCW-only solves |
|---|---:|---:|---:|---:|---:|---:|
| beam `perimeterSweep`, width 2000, plain retention | 104 | 111 | 1480 | 67 | 53 | 47 |
| DFS `perimeterSweep` | 42 | 50 | 541 | 1169 | 37 | 45 |

Neither family shows a clockwise capability advantage in the matched census. If anything, the raw pairwise count tilts slightly counter-clockwise in both families. Exclusive capability is also close to balanced and points in opposite directions between the two families only by small margins.

This is incompatible with treating the production 21:11 and 170:76 ratios as evidence for a generic structural property that makes clockwise perimeter traversal intrinsically better.

## Structural-feature check

The same relative-advantage artifact contains coarse standardized structural effects for the pairwise outcome. They are weak rather than selector-like.

For beam, the largest listed absolute standardized effects are only about 0.05–0.07 (`requiredPathCoverageRatio`, `constrainedObjects`, `goalAttractionManhattan`, portals, and start-goal Manhattan distance). DFS has somewhat larger but still modest coarse effects, led by start-goal Manhattan distance at roughly 0.14, followed by required-path coverage and constrained-object count below 0.10.

Nothing in this existing matched evidence supports promoting a simple clockwise-vs-counter-clockwise structural selector without a new, independently motivated premise.

## Interpretation

The production asymmetry remains a real observation about **which configuration receives first-success credit under the current ladder**. It is not a matched estimate of directional capability.

The most economical explanation is exposure/order/budget interaction:

1. production stops after an earlier configuration succeeds;
2. `winningConfig` therefore depends on which actions are reached and in what order;
3. a direction can accumulate more first-success credits without having higher isolated solve capability;
4. the matched census removes that suppression and the ~2x clockwise advantage disappears.

This does not establish exactly which production-order detail creates the observed ratio, and there is no need to spend compute merely to explain the historical attribution ratio unless directional ordering becomes a live scheduler decision.

## Decision

- **Close the WS1 clockwise-selector lead.** The matched evidence falsifies the premise that the production ratio is a generic directional capability signal.
- **Do not prune either direction.** Both CW and CCW retain dozens of isolated-exclusive solves in each family; the correction is about interpretation, not redundancy.
- **Do not launch a structural-selector campaign from this observation.** Existing coarse features do not expose a strong selector.
- **If direction ordering becomes decision-bearing, test it as WS2 allocation.** Use matched exposure/work or an order-swap design so first-success suppression is controlled explicitly.

## Historical disposition

`2026-09-05-perimeter-bias-clockwise-preference-cross-family-001.md` remains valid as the record of the production discovery. This report supersedes its proposed WS1 interpretation by joining that discovery to the matched isolated evidence that was already present in the repository.