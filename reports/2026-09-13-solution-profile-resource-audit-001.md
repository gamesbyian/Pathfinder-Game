# Solution-profile research-resource audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — schema-v3 profile regeneration, fast repository CI, type/docs checks, and combined/origin-bucket comparer smoke tests all passed.
> **Decision:** retain the hardened solution-profile resource as a known-solution sample-profile instrument; sparse-profile similarity remains exploratory research evidence, not a production routing feature.
> **Remaining gate:** none for this audit; future profile/outcome research must use held-out evidence and the provenance/evidence-purpose controls documented below.

Scope: audit the solution-profile library as a research resource, including what its features actually measure, how sampling/provenance shape those measurements, how stable profiles are as evidence accumulates, how downstream consumers use them, and whether cross-level comparisons remain scientifically honest under sparse or missing axes.

## Bottom line

The resource is best understood as a **known-solution sample profile**, not a measurement of a level's latent complete solution space. Some fields describe one observed path directly; others are population statistics that do not exist at n=1; longitudinal fields require trustworthy discovery chronology. The previous representation blurred those categories badly enough to change sparse-target nearest-neighbour rankings wholesale.

The first hardening tranche now makes those evidence boundaries machine-visible. It does not attempt to invent calibrated confidence thresholds from the same data used to diagnose the problem.

## Confirmed findings

### F1 — sampled must-cross agreement was mislabeled as level rigidity

`mustCrossOrderStats()` previously set `rigid=true` whenever every stored accepted path shared one first-entry and completion order, with an implementation comment calling that genuinely level-forced.

The empirical prefix audit showed how unsafe that inference was. Among levels whose early stored sample appeared single-order but which had a larger stored sample available:

| observed paths | apparent single-order cases | later non-single-order | failure rate |
|---:|---:|---:|---:|
| 1 | 960 | 709 | 73.9% |
| 2 | 763 | 535 | 70.1% |
| 3 | 684 | 467 | 68.3% |
| 5 | 598 | 402 | 67.2% |
| 10 | 464 | 310 | 66.8% |

This does not estimate true-space rigidity because the larger stored library is itself sampled. It does establish that early sample homogeneity is not a safe puzzle-property claim.

Repair: schema v3 exposes `pathsObserved` and `observedSingleOrder`. `rigid` remains only as an explicitly documented compatibility alias. Cross-level must-cross-order comparison requires at least two observed paths on both sides.

### F2 — single-path targets injected synthetic zero diversity into distance

A one-path profile necessarily has zero comparable path pairs, but the old distance layer treated zero-valued prefix-diversity and pairwise-distinctiveness summaries as measured population properties.

For all 1,700 Corpus-2 levels, profiling a single construction witness against the published+Corpus-1 library and merely skipping unsupported population axes changed the #1 nearest profile on **1,623 / 1,700 targets (95.5%)**. Median overlap between the old and support-aware top-five sets was **0 / 5**; mean overlap was 0.133.

Repair: prefix diversity is non-comparable below two sampled paths; pairwise distinctiveness is non-comparable with zero path pairs; one-path must-cross homogeneity is non-comparable. The descriptive n=1 profile can still retain graceful scalar placeholders, but the distance layer no longer treats them as evidence.

### F3 — discovery saturation conflated missing evidence with a real endpoint

The old distance layer used `plateauFraction ?? 1`, so n=1, incomplete chronology, and a genuinely observed no-plateau history all collapsed to the same concrete value.

For one-path prefixes, removing unsupported sample-history/diversity axes reduced median distance to the eventual stored profile from **0.1483 to 0.0128**. Only a median **68.3% of nominal configured distance weight** remained comparable. That does not make the one-path profile complete; it shows how much old disagreement was manufactured by unmeasurable axes.

Repair: saturation records `chronologyDatedHints` and `chronologyComplete`. Sparse or incompletely dated histories do not contribute a saturation term. A fully dated history with at least the heuristic's five-observation minimum can legitimately report **no plateau detected**; that is represented as the end of the observed stream rather than as missing evidence.

### F4 — distance hid how much evidence actually participated

The old scalar distance exposed no comparable-axis count or weight denominator. Two matches with very different evidential support could therefore look equally precise.

The empirical audit found median comparable nominal weight of 68.3% for one-path comparisons and 81.7% for 2–10-path comparisons under the conservative counterfactual.

Repair: `profileDistanceWithCoverage()` and `nearestProfiles()` expose comparable axes, comparable configured weight, and comparable nominal-weight fraction. The denominator is the full configured distance weight, including mechanics that may not apply to a pair, so this is **not a calibrated confidence probability**. CLI output says `comparableNominalWeight` rather than generic “support.”

### F5 — human-facing summaries and docs retained retired semantics

Tracked summaries and documentation still exposed old source/modality vocabulary and pre-audit claims even after the provenance taxonomy had moved to orthogonal origin, facets and applicability.

Repair: the generator/renderer now uses provenance-origin wording, current authority is `docs/solver-solution-profile.md`, and that document describes the sample-profile evidence boundary. The tracked JSON libraries and summaries still need a final schema-v3 regeneration before merge.

### F6 — `provablyExhaustive` promoted an event marker into a completeness claim

The old profile set `provablyExhaustive` if **any hint had any provenance event** with `search.termination === 'exhaustive'`. That does not establish unrestricted whole-puzzle enumeration, persistence of every enumerated solution, or applicability of that event to the bucket's exact population.

Repair: the field is now `hasExhaustiveSearchEvent`, an event-local observation. Generated summary language explicitly rejects a whole-library completeness inference. There is currently no generic profile field that proves complete solution-space coverage; a future such field would need an explicit enumeration and persistence contract.

### F7 — count-only freshness missed meaning-changing edits

The old `hintSignature` hashed only per-level hint count and provenance-entry count. In-place path corrections, provenance/context corrections and discovery-timestamp edits could change the scientific object without changing the signature.

Repair: freshness now hashes the profile-bearing `{path, provenance}` content and requires schema/taxonomy/algorithm identity. Current stamps are:

- `schemaVersion: 3`
- `provenanceTaxonomy: origin-facet-applicability-v2`
- `profileAlgorithmVersion: sample-support-v2`

### F8 — generated resource metadata pointed at retired authority

Generator, comparer, source comments and generated summaries referred to `docs/solution-profile.md` rather than current authority.

Repair: current code routes to `docs/solver-solution-profile.md` and describes the asset as an observed/known-solution sample profile.

### F9 — discovery chronology is not uniformly available

The empirical inventory found complete `foundAt` coverage for all 102 Corpus-1 levels and all 1,700 Corpus-2 levels, but only **38 / 160 published levels** had every hint dated.

Risk: most published-level discovery curves previously mixed real chronology with a trailing block whose order was merely retained artifact order.

Repair: chronology completeness is explicit and longitudinal plateau comparison is unavailable when chronology is incomplete.

### F10 — sparse profile identity remains unstable after the obvious missing-evidence bug is removed

As a representation-stability diagnostic, the audit asked whether the first 1/3/5 stored solutions for a library level ranked that same level's eventual full stored profile nearest among the 262 published+Corpus-1 library profiles. This is not a solver-performance metric.

Old distance self-retrieval was weak: top-1 rates were 2.0%, 4.3%, and 5.9% at 1/3/5 paths; median ranks were 78, 42.5, and 35. The conservative support-aware counterfactual improved those to 9.1%, 8.7%, and 11.0% top-1, with median ranks 38.5, 24.5, and 20.

The improvement confirms the missing-evidence problem, but the remaining weakness is the more important research lesson: a small known-solution sample is often not a stable stand-in for the eventual known-solution profile.

Unresolved: nearest-profile conclusions from sparse targets remain exploratory even after hardening. Do not manufacture a confidence threshold from these same corpora. A future calibration should use independent/held-out evidence and should distinguish mechanics applicability from statistical sampling support.

### F11 — `sameAsCombined` storage deduplication leaked into comparison as if it were a profile

`buildLevelSolutionProfile()` legitimately stores a per-origin bucket as `{pathCount, sameAsCombined: true}` when every hint falls in one origin, avoiding a second full copy of the combined profile. The comparer previously passed that storage stub directly to distance code for `--bucket=<origin>`.

Risk: a valid origin-specific comparison could silently degenerate into mostly absent/default axes because a storage reference was mistaken for a scientific profile.

Repair: bucket resolution now explicitly dereferences `sameAsCombined` to the combined profile, with unit coverage in the shared library primitive.

## Empirical inventory

The audit traversed 160 published levels, 102 Corpus-1 levels and 1,700 Corpus-2 levels. Median stored hint counts were 341.5, 359 and 50.5 respectively. Every level had at least one stored hint.

Provenance volume substantially exceeds conservative dependency-stratum volume. Median provenance events per dependency stratum were 2.48 (published), 4.17 (Corpus 1) and 4.80 (Corpus 2), with Corpus-2 p90 at 26.67. Raw hint/event multiplicity is therefore a poor proxy for independent evidential support.

The original support-aware probe was diagnostic-only. Its pre-hardening ranking sensitivity figures are evidence for why the representation changed, not a proposed production routing rule.

## What the repair tranche changes

Implemented on the audit branch:

1. schema-v3/profile-algorithm identity;
2. content-sensitive freshness;
3. observed-single-order semantics instead of level-forced rigidity claims;
4. event-local exhaustive-search semantics instead of completeness claims;
5. explicit chronology coverage;
6. sample-support-aware distance terms;
7. comparable-axis and nominal-weight metadata;
8. dereferencing of storage-only `sameAsCombined` buckets;
9. corrected generator/comparer/summary terminology and authority links;
10. regression tests for the repaired semantics.

It intentionally does **not**:

- turn solution profiles into production routing features;
- claim the stored hint library is the complete solution space;
- infer technique effectiveness from positive-only hints;
- invent confidence cutoffs from the audit corpus;
- treat nearest-profile similarity as causal solver evidence.

## Next research questions after hardening

The immediate correctness problems are separable from the more interesting scientific question: whether any profile axis adds useful information about solver failure/success beyond ordinary level structure, family ancestry and provenance regime.

A next empirical tranche should therefore:

1. re-run convergence/stability diagnostics under schema v3;
2. measure profile sensitivity by conservative provenance dependency strata rather than raw hints/events;
3. compare profile similarity against ordinary structural similarity to quantify redundant geometry signal;
4. test solver-outcome associations only with explicit evidence-purpose/version controls;
5. validate any nominated generic descriptor on unrelated held-out families before it can influence solver research.

That work should remain downstream of the current representation repairs. Otherwise the analysis risks extracting sophisticated conclusions from an instrument whose missing-data semantics were demonstrably dominating the result.
