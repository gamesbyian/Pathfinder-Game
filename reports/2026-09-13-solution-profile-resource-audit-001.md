# Solution-profile research-resource audit

Status: in progress

Scope: audit the solution-space profile library as a research resource, including what its features actually measure, how sampling/provenance shape those measurements, how stable profiles are as evidence accumulates, how downstream consumers use them, and whether cross-level comparisons remain scientifically honest under sparse/missing axes.

Initial hypotheses to test:

1. Some profile features may mostly measure the *known-solution sample* rather than the latent solution space.
2. Profile confidence should depend on independent solution evidence, provenance breadth, and observed convergence, not raw hint count alone.
3. Downstream joins may overread descriptive profile similarity as causal solver evidence.
4. Nearest-profile rankings may be unstable when compared levels expose different feature subsets or evidence density.
5. Existing provenance/applicability machinery should be reused rather than introducing another trust taxonomy.

## Confirmed findings

### F1 — `mustCrossOrder.rigid` overclaims the evidence

`mustCrossOrderStats()` currently sets `rigid=true` whenever every *stored accepted path in the bucket* shares one first-entry and completion order. The implementation comment goes further and calls this “a genuinely level-forced constraint rather than an artifact of how solutions happened to be found.” That conclusion is only justified for an exhaustive solution set (or by a separate proof). For ordinary sampled hint libraries the field means **observed-single-order**, not level-forced rigidity.

The empirical prefix audit makes this severe rather than theoretical. Among levels whose early sample appeared rigid but which had a larger stored sample available, the apparent rigidity later broke at very high rates:

| observed paths | apparent-rigid cases | later non-rigid | failure rate |
|---:|---:|---:|---:|
| 1 | 960 | 709 | 73.9% |
| 2 | 763 | 535 | 70.1% |
| 3 | 684 | 467 | 68.3% |
| 5 | 598 | 402 | 67.2% |
| 10 | 464 | 310 | 66.8% |

This does not estimate the true-space rigidity rate because the “full” stored library is still sampled. It does establish that the current `rigid` label is badly unsafe even relative to the evidence already present in the repo.

Required repair: preserve the descriptive observation but separate it from any proven-rigidity claim. Existing artifacts need either a schema bump/migration or a compatibility field whose semantics are explicit.

### F2 — single-path targets inject synthetic “zero diversity” into distance

`buildSinglePathProfile()` deliberately degenerates n=1 statistics. `prefixDiversityStats()` reports zero shared-prefix values for n=1; `pairwiseDistinctivenessStats()` reports zero mean distance with zero pairs compared. `profileDistanceTerms()` then treats those zeros as real comparable measurements rather than unavailable axes.

The empirical counterfactual is decisive. For all 1,700 Corpus-2 levels, a single construction witness was profiled against the published+Corpus-1 library. A support-aware interpretation that merely skipped axes lacking enough observations changed the #1 nearest profile on **1,623 / 1,700 targets (95.5%)**. The median overlap between the current and support-aware top-five sets was **0 / 5**; mean overlap was 0.133.

Risk: sparse-target rankings are dominated by invented values for unobserved distribution properties. “Unknown” is behaving as “known zero.”

Required repair: distance terms that require multiple paths must become non-comparable when sample support is insufficient. The raw descriptive profile may keep graceful n=1 values for compatibility, but comparison must respect support counts.

### F3 — discovery saturation has the same missing-evidence problem

For n=1/sparse targets, `discoverySaturation.plateauFraction` is null. The distance layer substitutes `1` via `?? 1`, causing absence of a measured plateau to act as a concrete late-plateau observation.

For one-path prefixes, removing unsupported sample-history/diversity axes reduced median distance to the eventual stored profile from **0.1483 to 0.0128**. That is not evidence that the one-path sample is actually a complete representation: only a median **68.3% of nominal distance weight** remained comparable. It shows that much of the current one-path/full-profile disagreement is manufactured by axes the target could not possibly measure.

Required repair: saturation distance is comparable only when both sides have an observed plateau based on a meaningful discovery series; otherwise the axis must be skipped.

### F4 — profile distance reports the blend but not evidential coverage

`profileDistance()` skips explicit null axes, but callers receive no comparable-weight denominator or count. Two candidates can therefore have similarly low distances while one comparison was supported by nearly every axis and another by a much smaller compatible subset.

The empirical support-aware audit found median comparable nominal weight of 68.3% for one-path comparisons and 81.7% for 2–10-path comparisons, with some mechanic-dependent comparisons reaching 95%. Those are materially different evidence objects but the current API/CLI presents the same scalar shape.

Required repair: expose comparison coverage (comparable axes and comparable weight, preferably against the maximum applicable weight) beside the distance, and make CLI output show it.

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

### F9 — discovery-saturation chronology is not available uniformly

`discoverySaturationCurve()` orders hints by earliest provenance `foundAt`, with undated hints receiving `Infinity`. In the empirical inventory, all hints were dated for all 102 Corpus-1 levels and all 1,700 Corpus-2 levels, but only **38 / 160 published levels** had dates on every hint.

Risk: on most published levels the “discovery saturation” curve mixes real chronology with a trailing block whose order is merely retained artifact order. That may still describe accumulation in file order, but it is not a longitudinal discovery-process measurement and should not be compared as one.

Required repair: stamp chronology coverage and make saturation/process claims unavailable or explicitly partial when dates are incomplete. Do not silently turn file order into experimental history.

### F10 — sparse profile identity is unstable even after unsupported axes are removed

As a representation-stability diagnostic, the audit asked whether the first 1/3/5 stored solutions for a library level ranked that same level's eventual full profile nearest among the 262 published+Corpus-1 library profiles. This is deliberately *not* a solver-performance metric.

Current distance self-retrieval was weak: top-1 rates were 2.0%, 4.3%, and 5.9% at 1/3/5 paths; median ranks were 78, 42.5, and 35. Support-aware distance improved those to 9.1%, 8.7%, and 11.0% top-1, with median ranks 38.5, 24.5, and 20. The improvement confirms the missing-evidence problem, but the remaining weakness says something deeper: a small known-solution sample is often not a stable stand-in for the eventual known-solution profile.

Risk: nearest-profile conclusions from sparse targets should be treated as exploratory descriptions, not robust similarity facts, even after the immediate n=1 bug is fixed.

Required repair: attach sampling-support/confidence metadata to profiles and comparisons. Any downstream use should be able to require a minimum support class rather than relying on raw path count or a warning in prose.

## Empirical inventory notes

The audit traversed 160 published levels, 102 Corpus-1 levels, and 1,700 Corpus-2 levels. Median stored hint counts were 341.5, 359, and 50.5 respectively. Every level had at least one stored hint. Provenance volume substantially exceeds conservative dependency-stratum volume: median events-per-stratum were 2.48 (published), 4.17 (Corpus 1), and 4.80 (Corpus 2), with Corpus-2 p90 at 26.67. Raw provenance/hint multiplicity therefore remains a poor proxy for independent evidential support.

The empirical probe is diagnostic-only. Its “support-aware distance” is a counterfactual that removes clearly unsupported axes; it is not proposed as a production routing rule or as the final profile metric.

## Direction

The core naming/ontology conclusion is now evidence-backed: this asset is usually a **known-solution sample profile**, not a measured solution space. A smaller subset of claims can be promoted to genuine solution-space statements when explicit completeness/proof contracts support them. That distinction should become machine-visible.

The first repair tranche should be conservative and semantics-preserving:

1. stop scoring unsupported n=1 diversity/saturation axes;
2. expose distance coverage/support;
3. rename observed must-cross single-order semantics instead of calling them level-forced rigidity;
4. demote event-local exhaustive markers from completeness claims;
5. expose chronology coverage for saturation;
6. strengthen freshness identity and add a profile-algorithm version;
7. repair generated authority links and stale provenance vocabulary;
8. add support/confidence metadata suitable for downstream filtering.

After those repairs, a second empirical tranche should re-run convergence, provenance-stratum sensitivity, and downstream joins. Only then is it worth asking whether individual profile axes predict useful solver capability beyond ordinary level structure/family ancestry.

The audit will continue to be updated in small commits as findings and repairs are established.
