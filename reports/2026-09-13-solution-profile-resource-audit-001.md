# Solution-profile research-resource audit

Status: in progress

Scope: audit the solution-space profile library as a research resource, including what its features actually measure, how sampling/provenance shape those measurements, how stable profiles are as evidence accumulates, how downstream consumers use them, and whether cross-level comparisons remain scientifically honest under sparse/missing axes.

Initial hypotheses to test:

1. Some profile features may mostly measure the *known-solution sample* rather than the latent solution space.
2. Profile confidence should depend on independent solution evidence, provenance breadth, and observed convergence, not raw hint count alone.
3. Downstream joins may overread descriptive profile similarity as causal solver evidence.
4. Nearest-profile rankings may be unstable when compared levels expose different feature subsets or evidence density.
5. Existing provenance/applicability machinery should be reused rather than introducing another trust taxonomy.

## Confirmed findings so far

### F1 — `mustCrossOrder.rigid` overclaims the evidence

`mustCrossOrderStats()` currently sets `rigid=true` whenever every *stored accepted path in the bucket* shares one first-entry and completion order. The implementation comment goes further and calls this “a genuinely level-forced constraint rather than an artifact of how solutions happened to be found.” That conclusion is only justified for an exhaustive solution set (or by a separate proof). For ordinary sampled hint libraries the field means **observed-single-order**, not level-forced rigidity.

Risk: downstream consumers can silently convert a sampling property into a puzzle property. The documentation already warns against this interpretation, so implementation semantics and documentation currently disagree.

Required repair: preserve the descriptive observation but separate it from any proven-rigidity claim. Existing artifacts need either a schema bump/migration or a compatibility field whose semantics are explicit.

### F2 — single-path targets inject synthetic “zero diversity” into distance

`buildSinglePathProfile()` deliberately degenerates n=1 statistics. `prefixDiversityStats()` reports zero shared-prefix values for n=1; `pairwiseDistinctivenessStats()` reports zero mean distance with zero pairs compared. `profileDistanceTerms()` then treats those zeros as real comparable measurements rather than unavailable axes.

Risk: nearest-profile ranking for the common hidden-witness target case is partly driven by whether a library profile itself happens to have low diversity. The target has no evidence about solution-space diversity; it only has one observed solution. “Unknown” is therefore being scored as “known zero.”

Required repair: distance terms that require multiple paths must become non-comparable when sample support is insufficient. The raw descriptive profile may keep graceful n=1 values for compatibility, but comparison must respect support counts.

### F3 — discovery saturation has the same missing-evidence problem

For n=1/sparse targets, `discoverySaturation.plateauFraction` is null. The distance layer substitutes `1` via `?? 1`, causing absence of a measured plateau to act as a concrete late-plateau observation.

Risk: a missing sampling-history property becomes a ranking signal. This is especially inappropriate for hidden witnesses, which have no discovery process at all.

Required repair: saturation distance is comparable only when both sides have an observed plateau based on a meaningful discovery series; otherwise the axis must be skipped.

### F4 — profile distance currently reports only the blended score, not evidential coverage

`profileDistance()` skips explicit null axes, but callers receive no comparable-weight denominator or count. Two candidates can therefore have similarly low distances while one comparison was supported by almost every axis and another by only a small compatible subset.

Risk: sparse-mechanic and sparse-evidence matches can look deceptively precise. This matters because the documentation explicitly tells researchers to use rankings for sparse targets.

Required repair: expose comparison coverage (comparable axes / comparable weight, ideally against the maximum applicable weight) beside the distance, and make CLI output show it.

### F5 — tracked human summaries still expose retired provenance semantics

The tracked `solution-profile-published-summary.md` and `solution-profile-corpus1-summary.md` are human-facing “current legacy summaries,” but they still show old mutually-exclusive source/modality labels such as `production-solver` and `prefix-anchored-completion`. Current authority now owns orthogonal **origin + facets + applicability**, and regenerated schema-v2 profiles use that taxonomy.

Risk: a researcher opening the convenient summary can reason in the old vocabulary even though the underlying current code no longer endorses it. This is exactly the sort of semantic drift the provenance audit was intended to eliminate.

Required repair: regenerate or explicitly freeze/label legacy summaries; do not leave retired buckets looking current. Current generated summaries should say “origin coverage,” not generic “source coverage.”

### F6 — `provablyExhaustive` promotes an event-local marker into a library-completeness claim

`buildBucketProfile()` currently sets `provablyExhaustive` when **any stored hint** has **any provenance event** whose `search.termination === 'exhaustive'`. The shared provenance taxonomy explicitly treats `complete-enumeration`, `hint-guided`, `isolated-technique`, and other facets as orthogonal, so an exhaustive event is not by itself proof that the bucket contains the puzzle's complete solution space.

Risk: the resource and generated summary call this a “real completeness signal,” but the implementation does not establish that the exhaustive event enumerated the unrestricted puzzle space, that every path from that enumeration was persisted into this bucket, or that the event applies to the bucket's exact evidence population.

Required repair: rename the current observation to an event-local fact such as `hasExhaustiveSearchEvent`. Reserve any `completeSolutionSpace` / `provablyExhaustive` claim for an explicit whole-space enumeration contract with persisted coverage guarantees. Until such a contract exists, profile conclusions may use exhaustive events as stronger context but not proof of library completeness.

### F7 — freshness signature ignores meaning-changing edits

`computeHintSignature()` hashes only per-level **hint count** and **provenance-entry count**. It does not hash path identity/content, provenance fields, discovery timestamps, termination/context changes, or the profile algorithm/version. `ensureFreshLibrary()` separately checks schema/taxonomy, but there is no profile-algorithm identity.

Risk: changing a stored path while keeping count constant, correcting a provenance event in place, changing discovery order, or fixing a profile metric can all leave the tracked library appearing fresh. Those changes can materially alter the profile while preserving the current signature.

Required repair: make freshness content-sensitive to all profile inputs and stamp an explicit profile algorithm/schema identity. Freshness must answer “would regeneration produce the same scientific object?”, not merely “are there the same number of records?”

### F8 — generated resource metadata still points at the retired doc path

The library description, source comments, and generated summary link refer to `docs/solution-profile.md`; current authority is `docs/solver-solution-profile.md`.

Risk: small individually, but it reduces discoverability and is further evidence that generated artifacts were not fully migrated with the owning research resource.

Required repair: update generator-owned references so regenerated artifacts route to the current authority.

## Direction

The emerging distinction is important: this asset is usually a **known-solution sample profile**, with a smaller subset of claims promoted to genuine solution-space statements when evidence supports them. The audit should make that distinction machine-visible rather than leaving it as prose caution.

The first repair tranche should be conservative and semantics-preserving: stop scoring unsupported n=1 diversity/saturation axes; expose distance coverage; stop calling observed single must-cross order “level-forced”; remove unsupported completeness language; strengthen freshness identity; and repair generated authority links. A later empirical tranche can then measure convergence and provenance sensitivity on trustworthy inputs.

This report will continue to be updated in small commits as findings are established.
