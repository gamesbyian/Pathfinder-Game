# Known-solution sample profiles

Offline analysis tooling that summarizes how **observed accepted solutions** behave so a stress level can be compared with known-solvable examples. This resource is not a measurement of the complete latent solution space unless a separate whole-space proof says so. It is distinct from `domain/level-fingerprint.ts` (level-shape dedupe) and `scripts/solver-fingerprint.mjs` (solver determinism).

> **Research boundary:** solution profiles are labels derived from known solutions. They may generate hypotheses about useful generic puzzle/state descriptors, but they are **not legal direct production-routing features** and are high-risk for family/identity leakage. A nearest known solution/profile is not a cold-solver oracle.

The audit in [`../reports/2026-09-13-solution-profile-resource-audit-001.md`](../reports/2026-09-13-solution-profile-resource-audit-001.md) established that sparse samples are often unstable representations of their eventual stored profile. Treat profile similarity as exploratory evidence, with explicit attention to which axes were actually measurable.

## Reused primitives

| Primitive | Source |
|---|---|
| Edges, intersections, portal signatures, must-cross order | `modules/domain/path-features.ts` |
| Visits, entropy/percentiles, must-cross keys, nav density | `modules/domain/hint-novelty.ts` |
| Turn direction | `modules/domain/geometry.ts` |
| Landmark roles/turn requirements | `modules/domain/landmark-rules.ts` |
| Provenance fields | `modules/domain/hint-types.ts` |

`scripts/stress/solution-profile-lib.mjs` adds aggregate turn distributions, objective-satisfaction depth, prefix diversity, pairwise-distinctiveness summaries, provenance buckets, and discovery-saturation curves. Its compatibility exports delegate to the shared origin taxonomy rather than maintaining the former mutually-exclusive modality classifier. It stores only a top-20 cell table plus a normalized footprint, not another full heatmap.

## What the axes can legitimately say

Profile fields do not all have the same evidential status.

### Directly observed sample/path descriptors

These can be described from one or more observed valid paths without pretending they characterize unobserved solutions:

- normalized visited-cell footprint and cell/edge entropy over the stored sample;
- portal-use rate/signatures in the stored sample;
- objective-satisfaction depth in the stored sample;
- turn rate and, when at least one turn exists, turn chirality.

They are still sample descriptors. With one witness, for example, the footprint is the footprint of **that witness**, not a level-wide corridor map.

### Multi-path population descriptors

These require at least two observed paths before they exist as measurements:

- prefix diversity;
- pairwise distinctiveness;
- whether every observed path shares the same must-cross entry/completion order.

`mustCrossOrder.observedSingleOrder` is deliberately descriptive. The retained `mustCrossOrder.rigid` field is only a schema-compatibility alias and must not be interpreted as proof that the level forces that order. The audit found that early apparent single-order behavior frequently disappeared as more stored solutions accumulated.

### Longitudinal discovery descriptors

Discovery saturation depends on trustworthy discovery chronology. A profile records `chronologyDatedHints` and `chronologyComplete`. Plateau fields are not evidence when chronology is incomplete. Even with complete chronology, a detected plateau only says the observed discovery stream stopped adding certain structural novelty under the heuristic window. It never proves tree or solution-space exhaustion.

## Provenance resolution

Do not force every provenance fact into one mutually-exclusive "source" label. New research uses three orthogonal axes:

- **origin**, from `scripts/stress/provenance-source-taxonomy.mjs`: witness, inherited witness, transformed witness, human, external constraint solver, variant-parent replay, Pathfinder solver, other;
- **facets**, which may overlap on one event: complete enumeration, hint-guided, used-existing-hints, randomized, isolated-technique, production-retry-tier, with concrete retry-tier identity retained separately;
- **capability admissibility**, from `scripts/stress/provenance-classes.mjs`: the canonical strict/narrow production cold-capability classification.

This matters because producer identity and search modality are not alternatives. A Pathfinder-produced solution can be isolated and randomized; a variant replay can carry hint context. Neither fact should erase the other.

`source-stratified-solution-profile.mjs` applies origin and facet stratification while reusing this library's profile primitives:

```sh
node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --purpose=solution-atlas \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

The default purpose is explicitly `solution-atlas`. Capability-oriented profile subsets must pass
`--purpose=current-production-capability` and `--comparable-solver-versions=<audited-sha-list>`;
the artifact records both the pre-filter and applicable hint counts. A technique-performance
request yields no hint-only paths by design because positive-only successes lack a run denominator.

Regenerated legacy-library profiles currently stamp all three identity fields:

- `schemaVersion: 3`;
- `provenanceTaxonomy: origin-facet-applicability-v2`;
- `profileAlgorithmVersion: sample-support-v2`.

The comparison tool treats a library missing any current stamp as stale even when its content signature matches. Old modality-shaped buckets must not be compared with current origin/facet output as if they meant the same thing.

## Profile contents

Each level has a `combined` bucket plus origin and/or facet buckets in the new stratified output. A hint rediscovered by multiple origins can contribute to each relevant origin bucket, and one hint may contribute to several facet buckets.

A bucket can contain:

- cell/edge and intersection frequency;
- portal-use and directed-jump signatures;
- observed must-cross entry/completion order;
- objective-satisfaction depth for must-pass/must-cross/must-turn/adjacent-turn/surround;
- turn rate, direction split, and hot turn cells;
- prefix diversity;
- pairwise `featureDistance` summaries;
- discovery-saturation curves and chronology coverage;
- `hasExhaustiveSearchEvent`, an event-local provenance observation.

Large-bucket distribution statistics use deterministic seeded sampling to bound O(n²) comparisons.

## Exhaustive-event and saturation semantics

`hasExhaustiveSearchEvent` means at least one stored hint has a provenance event whose own `search.termination` was `exhaustive`. It does **not** establish that the persisted bucket contains every valid solution, that the event enumerated the unrestricted puzzle space, or that its context applies to every path in the bucket.

There is currently no generic profile field that proves whole-solution-space completeness. If such a claim becomes necessary, it needs an explicit enumeration contract that identifies the searched space and guarantees persistence/coverage of the resulting solutions.

`discoverySaturation.plateauStartIndex` / `plateauFraction` are accumulation heuristics. They can support statements about the observed discovery stream when chronology is complete. They are not substitutes for exhaustive proof.

## Cross-level comparison

Raw packed coordinates are not comparable across grids. `profileDistance` / `profileDistanceTerms` use position-independent scalars or `normalizedFootprint`, the downsampled visited-cell analogue of `scripts/stress/features.mjs`'s occupancy grid.

Missing or unsupported axes are skipped rather than assigned synthetic zero values. In particular, a one-path target contributes no prefix-diversity, pairwise-distinctiveness, or must-cross population-order term. Chirality is absent when no turn was observed. Longitudinal saturation is absent when the chronology/sample cannot support it.

`profileDistanceWithCoverage` and `nearestProfiles` expose the number and nominal weight of axes that participated. The `comparableWeightFraction` denominator is the full configured distance weight, including mechanics that may not apply to a particular pair, so it is best read as **comparable nominal weight**, not as a calibrated confidence probability.

A target with only one witness uses `buildSinglePathProfile`. The comparison tool reports per-axis terms plus comparable nominal weight. Sparse-target rankings remain exploratory: the audit's self-retrieval test found that small solution samples often fail to identify their own eventual stored profile even after unsupported axes are removed.

Similarity is descriptive. A close profile match can reflect shared generator/family ancestry, ordinary geometry, or provenance artifacts rather than a causal reason that the same solver technique should work. Translate any nominated pattern into legal current-level/current-state descriptors and validate away from the families that nominated it.

## Provenance and leakage caveats

Coverage differs by corpus, origin, facet and capability class; do not assume `combined` represents cold solver capability. Run the compact evidence audit before a decision-bearing profile analysis:

```sh
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all
```

For a level-level forensic query, request the purpose rather than filtering on existence alone:

```sh
npx tsx scripts/hint-query.mjs --id=P00001 \
  --purpose=current-production-capability --applicability=admissible \
  --comparable-solver-versions=<audited-sha-list>
```

Additional rules:

- a profile derived from saved solutions/hints cannot be read by production policy for that level;
- historical winner/technique labels joined to profiles are offline research labels only;
- external, variant-replay, witness/human evidence cannot establish production cold capability merely because its hint flags are clean;
- isolated, retry-tier, randomized and hint-guided are modalities/facets, not alternative producer origins;
- if a profile-derived descriptor was chosen after inspecting outcome correlations, the same levels are discovery/tuning data, not confirmation;
- split variant-derived comparisons by parent family;
- guard against normalized footprints or high-dimensional descriptors becoming accidental level/family identifiers;
- do not report correlation between profile axes and solver success as causal without a controlled/shadow follow-up;
- every analytical consumer making an applicability claim must name its evidence purpose. Use `positive-oracle`, `solution-atlas`, `current-production-capability`, `technique-performance`, or `longitudinal-process` through the shared taxonomy; capability/performance queries must also name the compared solver version or an audited comparable-version set;
- aggregate rediscovery through `provenanceDependencyStratum`; event count is retention/history volume, not independent support;
- a matching isolated hint event remains positive-only success evidence; technique-performance claims require the originating run's attempted-level denominator and failures, not just comparable version/config/work fields.

See [`solver-level-blindness.md`](solver-level-blindness.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Freshness

Default legacy-library paths:

- `reports/stress/solution-profile-published.json`
- `reports/stress/solution-profile-corpus1.json`

`solution-profile-compare.mjs` checks each full library against a content-sensitive `hintSignature` derived from the profile-bearing hint paths and provenance. It also checks the schema, provenance taxonomy, and profile algorithm stamp. An in-place path/provenance/timestamp correction therefore invalidates the snapshot even when record counts are unchanged.

On mismatch the comparer calls `regenerateCorpusProfile`, rewrites the library and `-summary.md`, then compares. Partial libraries (`levelSpec !== 'all'`) are not auto-regenerated because intentional selection cannot safely be reconstructed from a generic full-corpus comparison.

Use `npm run stress:solution-profile` to force a rebuild or create a non-default/partial legacy library. Use `source-stratified-solution-profile.mjs` for new origin/facet work, especially Corpus 2.

Fresh profile data does not make historical solver-outcome joins current. Revalidate decision-bearing technique/capability associations against current solver evidence.

## Commands

```sh
npm run stress:solution-profile -- \
  --levels-json=data/levels.json \
  --out=reports/stress/solution-profile-published.json

npm run stress:solution-profile -- \
  --levels-json=data/stress/stress-levels.json \
  --out=reports/stress/solution-profile-corpus1.json

npm run stress:solution-profile-compare -- --target-level=pos:42

node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

`solution-profile-compare.mjs` also accepts `--library=a.json,b.json`, `--bucket=<origin>` (default `combined`), and `--top=<n>` for the legacy libraries. A storage-level `sameAsCombined` origin bucket is resolved back to the combined profile before comparison.

## Proper research use

A production-facing idea derived from solution profiles should follow this chain:

1. observe a profile/outcome association offline;
2. identify a simpler legal structural/state descriptor that could explain it;
3. test that descriptor in shadow/controlled evidence without solution-profile lookup;
4. confirm across unrelated levels/parents not used to choose the descriptor/threshold;
5. only then use the generic descriptor in a matched-work live treatment.

If step 2 cannot produce a legal descriptor, the finding remains diagnostic knowledge rather than a routing feature.

For path-level search diagnosis, profiles are only one view of the hint store. The broader evidence-layer plan in [`../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md) also treats validated hint prefixes as a sound positive oracle and provenance as a longitudinal experimental log.

Current summaries, regenerated from the stamped libraries:
- [`reports/stress/solution-profile-published-summary.md`](../reports/stress/solution-profile-published-summary.md)
- [`reports/stress/solution-profile-corpus1-summary.md`](../reports/stress/solution-profile-corpus1-summary.md)

Unit coverage: `scripts/stress/solution-profile-lib-unit-tests.mjs` plus `scripts/stress/provenance-source-taxonomy-unit-tests.mjs`.
