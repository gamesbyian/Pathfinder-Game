# Solution-space profiles join safely to census corpus1 by array position; the old production-solved association is superseded

> **Status:** superseded analytical result; join-method finding retained
> **Last evidence:** 2026-09-13 re-evaluation against the stress-corpus selection-history audit and solution-profile resource audit; original analysis was 2026-09-05.
> **Decision:** the 102/102 position-to-ID join is valid and reusable. The reported association between legacy profile diversity and `productionSolved` must not be used as evidence of a solvability relationship. Seventy-nine of the 102 Corpus-1 rows were historically admitted because an earlier solver solved them, so this analysis conditions the population on a close ancestor of its outcome. Its strongest profile axes also used legacy support/rigidity semantics corrected by schema v3.
> **Remaining gate:** none for this old analysis. Do not generate a Corpus-2 profile library merely to “replicate” it. A future profile-versus-solvability study must start with a prospectively defined population and current support-aware profile semantics.
> **Evidence role:** forensic only for the old feature/outcome table; durable engineering evidence for the safe join method.
> **Selection:** census of the then-current 102-row Corpus-1 container, which is ancestry-mixed and historically solver-outcome-selected.

## 2026-09-13 re-evaluation

The original report already recognized n=7 unsolved, effort-investment confounding and possible reversed causality. The later corpus reconstruction adds a more fundamental problem: 79 current C1 rows descend from random-generator levels migrated into C1 on 2026-07-10 specifically because the then-current solver solved them. Comparing current `productionSolved` against profile features inside that container therefore conditions on historical solver success before the analysis begins.

The solution-profile audit independently invalidates treating two headline descriptors at face value: unsupported sparse diversity axes previously contributed concrete values, and `mustCrossOrder.rigid` described agreement among observed solutions rather than a proven structural property. Those issues do not falsify the literal old means below; they remove the old table's scientific entitlement to characterize latent solvability.

See `reports/2026-09-13-historical-evidence-reevaluation-ledger.md`, `reports/2026-09-13-solution-profile-resource-audit-001.md`, and `docs/solver-corpus-selection-provenance.md`.

## Method finding that survives

`reports/stress/solution-profile-corpus1.json`'s per-level `level` field is a **1-indexed array position** into the levels file used to generate it, not the level's persistent id. Mapping through `data/stress/stress-levels.json`'s file-order `levels` array produced 102/102 unambiguous matches to the census's real level ids. That join lesson remains valid independently of the later analytical correction.

## Original 2026-09-05 analysis

The analysis computed standardized mean differences between production-solved and production-unsolved C1 rows for the legacy `combined` profile fields: `pairwiseDistinctiveness.meanDistance`, raw `pathCount`/`hintCount`, `cellVisitFrequency.entropy`, `turnDistribution.turnRateMean`/`cwFraction`, and `mustCrossOrder.rigid`/`distinctFirstEntryOrders`.

| feature | solved mean (n=95) | unsolved mean (n=7) | standardized diff |
|---|---:|---:|---:|
| `pairwiseDistinctiveness.meanDistance` | 0.340 | 0.136 | **1.483** |
| `hintCount` / `pathCount` (identical) | 15.19 | 6.57 | 1.000 |
| `mustCrossOrder.rigid` (n=38/5 with a must-cross order at all) | 0.789 | 1.000 | −0.730 |
| `mustCrossOrder.distinctFirstEntryOrders` | 1.158 | 1.000 | 0.518 |
| `turnDistribution.turnRateMean` | 0.537 | 0.562 | −0.401 |
| `cellVisitFrequency.entropy` | 6.409 | 6.558 | −0.388 |
| `turnDistribution.cwFraction` | 0.509 | 0.492 | 0.232 |
| `edgeUsageFrequency.entropy` | 6.679 | 6.617 | 0.143 |
| `cellVisitFrequency.touchedCells` | 98.98 | 97.71 | 0.047 |

These numbers are retained as historical measurements of the legacy stored sample. They are **not** a current estimate of how latent solution-space diversity relates to solver difficulty.

## Why the old interpretation no longer survives

Three confounds now have direct evidence:

1. **Population selection:** most C1 rows were selected by historical solver success.
2. **Evidence accumulation:** hint/path count and apparent diversity depend on how much and what kind of search effort accumulated accepted solutions.
3. **Profile semantics:** schema-v2 distance/rigidity could treat missing support as a measurement and sampled agreement as a structural claim.

The old n=7 unsolved contrast cannot separate these effects. Stratifying to the genuine A-F 23 would reduce the population further and still leave historical/profile-accumulation confounds. There is no value in polishing this correlation with a better statistic on the same selected container.

## What this report still establishes

- The profile-to-census C1 join by file position was technically correct and complete at 102/102 rows.
- The historical stored samples differed descriptively between the 95 rows then solved and 7 then unsolved under the legacy feature definitions.
- The original analysis was appropriately cautious about causal interpretation, even though it did not yet know the decisive corpus-selection history.

## What it does not establish

- A causal or reliable correlational relationship between solution-profile diversity and solver solvability.
- That whole Corpus 1 is a representative or independent population for such a relationship.
- That `mustCrossOrder.rigid` was a puzzle-level rigidity property.
- That generating `solution-profile-corpus2.json` is the next scientific step. A larger selected population does not repair the design by itself.
