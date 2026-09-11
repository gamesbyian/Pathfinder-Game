# Algorithmic frontier class-4 vs class-5 contrast 001

> **Status:** active-offline
> **Last evidence:** 2026-09-11 — post-1,029 residual atlas, 671 current Corpus-2 misses: class 4 = 200 zero-T1-winner levels with another historical/provenance rescuer; class 5 = 388 no-known-rescuer levels after cross-evidence reconciliation.
> **Decision:** use class 4 as the primary control for frontier characterization, with classes 1-4 combined only as a secondary operational comparison. Run existing-data/static contrast before source-controlled solution-profile and representative-basin extinction work. Do not buy broad new solver compute for this gate.
> **Remaining gate:** rerun the extended residual-atlas analyzer to emit the full static/production contrast, then join source-controlled solution-space/profile evidence and representative-basin survival/extinction evidence where coverage permits.
> **Evidence role:** development characterization / mechanism nomination; offline labels are not production routing inputs.

## Why class 4 is the primary control

The 388 class-5 levels should not be compared only against the other 283 residual misses as one mixed control. Classes 1-3 already have isolated T1 rescue capability, so differences against them conflate frontier membership with the existence of known isolated capability.

Class 4 is a cleaner near-control:

- **class 4 (n=200):** no isolated T1 winner, but a strict cold-capability Pathfinder provenance rescuer exists somewhere in history;
- **class 5 (n=388):** no isolated T1 winner and no such rescuer after the atlas's reconciliation.

Both populations therefore sit beyond the frozen isolated-technique census. The contrast asks the sharper question: **what distinguishes zero-T1 levels that Pathfinder has nevertheless solved in some cold context from zero-T1 levels for which no cold Pathfinder rescue has ever been recorded?**

Classes 1-4 combined remain useful as a secondary operational contrast because they represent the whole non-frontier remainder of the current residual.

## Coarse contrast already available from the atlas

The existing atlas summary is enough for a first structural screen. Rates below are class 5 vs class 4; odds ratios are frontier-vs-control and are descriptive development effect sizes, not confirmation statistics.

| Feature | Class 5 | Class 4 | Difference | Odds ratio |
|---|---:|---:|---:|---:|
| Portal-bearing | 269/388 = **69.3%** | 173/200 = **86.5%** | **-17.2 pp** | **0.35** |
| Must-cross-bearing | 224/388 = **57.7%** | 126/200 = **63.0%** | -5.3 pp | 0.80 |
| Intersection-heavy routing | 325/388 = **83.8%** | 154/200 = **77.0%** | **+6.8 pp** | **1.54** |
| Must-cross-heavy routing | 23/388 = **5.9%** | 22/200 = **11.0%** | **-5.1 pp** | **0.51** |
| Multi-portal routing | 34/388 = **8.8%** | 23/200 = **11.5%** | -2.7 pp | 0.74 |
| Portal + must-cross + intersection-heavy | 130/388 = **33.5%** | 87/200 = **43.5%** | **-10.0 pp** | **0.65** |

The secondary class-5-vs-all-other-residual comparison points in the same broad direction for portals and intersection-heavy routing: frontier levels are 69.3% portal-bearing vs 80.6% among the other 283 misses, and 83.8% intersection-heavy vs 77.7% among the remainder.

### Immediate interpretation

The current frontier is **not** explained by simply being more portal-heavy or carrying more of the portal + must-cross + intersection-heavy combination. In fact, those signatures are materially more common in class 4, the zero-T1 population that does have historical cold rescues. This weakens any broad story in which frontier status is just a more intense version of the currently active portal problem.

Intersection-heavy routing is somewhat enriched in class 5, but the difference is modest enough that it should be treated as a stratum to control for rather than a mechanism by itself.

The important next question is therefore whether class 5 differs in **continuous puzzle geometry, solution-space structure, or where viable basins disappear during search**, after obvious mechanic/routing composition is controlled.

## Direct tooling change

`scripts/stress/analyze-post-1029-residual-atlas.mjs` now emits a `frontierContrast` section whenever the atlas is rebuilt. It deliberately keeps both comparisons:

1. `primaryClass5VsClass4` — the scientific near-control;
2. `secondaryClass5VsAllOtherResidual` — the operational remainder comparison.

The contrast uses the existing `scripts/stress/features.mjs` extractor rather than inventing another feature vocabulary. It records:

- standardized differences for the existing scalar static features (`area`, `reqLen`, `reqInt`, path-coverage ratio, blocks, mechanics counts, etc.);
- presence-rate and odds-ratio contrasts for mechanic-bearing flags;
- routing-regime contrasts;
- production nodes/work/attempt-count standardized differences;
- lifecycle-bucket and best-badness-technique distributions.

This remains discovery evidence. A large effect nominates a stratum or mechanism to inspect; it does not make that feature a legal production selector.

## Next evidence stages

### 1. Static + production-response contrast — NEXT / CHEAP

Rerun the extended atlas analyzer against the same registered inputs. Rank effects by magnitude, then repeat the class-4/class-5 comparison within major composition strata where sample size permits, especially portal-bearing and intersection-heavy levels. The objective is to learn whether any apparent frontier signature survives basic composition control.

If static and production-response effects are weak, record that as a useful result rather than mining dozens of arbitrary thresholds.

### 2. Source-controlled solution-space contrast — NEXT AFTER STATIC

Use the source/facet-stratified solution-profile tooling. Do **not** compare combined profiles naively: class 4 contains cold Pathfinder rescuer provenance by definition, while class 5 does not, so a combined-profile comparison would partly measure the class label itself.

Prefer evidence origins/facets available on both sides, such as witness/external/variant-replay strata where coverage is adequate. Compare position-independent solution properties including:

- portal use/order and directed-jump structure;
- must-cross order rigidity;
- objective-satisfaction depth;
- turn rate / path-shape summaries;
- prefix diversity and basin distinctiveness;
- discovery saturation, with the standing warning that saturation is not exhaustiveness;
- depth-wise known-live decision support where the hint/provenance program can derive it.

The useful question is whether frontier levels appear to require narrower, earlier, later, or more counter-heuristic commitments than class 4 after provenance/source differences are controlled.

### 3. Variant-family boundary flips — HIGH VALUE WHERE AVAILABLE

Search existing variant families for nearby controlled relatives that cross the class-5 boundary: class 5 parent/sibling versus class 4, census-solvable, or production-solvable relative. Repeated small transforms that flip frontier membership are stronger mechanism evidence than corpus-wide correlation.

Preserve parent/family as the independent unit. Do not treat many siblings as independent confirmation.

### 4. Representative-basin survival/extinction — MECHANISM GATE

Where referee-valid paths exist from non-cold sources, use representative basins rather than one arbitrary first hint. Observe current search until **all known-live basins** are lost and classify the first all-basin extinction as:

- hard prune / false reject;
- state-key alias or merge;
- score/rank/beam-width cull;
- action/gate exposure;
- budget/participation;
- other representation/reasoning failure.

Compare the extinction-mechanism distribution between class 4 and class 5. This is the shortest path from “frontier levels look different” to “the solver repeatedly loses them for this specific reason.”

### 5. Small interpretable discriminator — OPTIONAL MICROSCOPE

Only after the prespecified contrasts above exist, a sparse/interpretable classifier may be useful to measure incremental explanatory value: static features first, then solution-space descriptors, then trajectory/extinction labels. Group validation by variant parent/family where relevant.

Its purpose is decomposition, not production routing. The important result would be whether frontier membership becomes substantially more predictable only after path/trajectory evidence is added.

## Decision logic

- **Compact static signature survives stratification:** translate it into a mechanism question; do not promote the signature itself as a selector without independent evidence.
- **Static weak, solution-space strong:** prioritize search-policy hypotheses around basin rigidity, forced-decision depth, or counter-heuristic commitments.
- **Known-live prefixes are falsely rejected/merged disproportionately in class 5:** prioritize representation/reasoning repair before scheduler work.
- **Viable basins survive but are repeatedly rank/beam-culled:** prioritize scoring/retention/search-policy mechanisms.
- **No stable class-4/class-5 distinction appears even in trajectory evidence:** split class 5 internally by extinction/failure phenotype rather than forcing one frontier-wide mechanism.

## Compute discipline

This program should begin with existing assets and bounded replay. No new broad census, giant solver campaign, or heavyweight algorithm family is justified merely because class 5 is large. New compute should answer a concrete residual question left unresolved by the joins above.

## Sources

- [`2026-09-11-post-1029-residual-atlas-001.md`](2026-09-11-post-1029-residual-atlas-001.md)
- [`docs/solver-research-data-assets.md`](../docs/solver-research-data-assets.md)
- [`docs/solver-solution-profile.md`](../docs/solver-solution-profile.md)
- [`2026-09-09-hint-provenance-evidence-layer-upgrade-001.md`](2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)
