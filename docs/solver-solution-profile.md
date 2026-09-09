# Solution-space fingerprints

Offline analysis tooling that summarizes how accepted solutions behave so an unsolved stress level can be compared with known-solvable families. This is distinct from `domain/level-fingerprint.ts` (level-shape dedupe) and `scripts/solver-fingerprint.mjs` (solver determinism).

> **Research boundary:** solution profiles are labels derived from known solutions. They may generate hypotheses about useful generic puzzle/state descriptors, but they are **not legal direct production-routing features** and are high-risk for family/identity leakage. A nearest known solution/profile is not a cold-solver oracle.

## Reused primitives

| Primitive | Source |
|---|---|
| Edges, intersections, portal signatures, must-cross order | `modules/domain/path-features.ts` |
| Visits, entropy/percentiles, must-cross keys, nav density | `modules/domain/hint-novelty.ts` |
| Turn direction | `modules/domain/geometry.ts` |
| Landmark roles/turn requirements | `modules/domain/landmark-rules.ts` |
| Provenance fields | `modules/domain/hint-types.ts` |

`scripts/stress/solution-profile-lib.mjs` adds aggregate turn distributions, objective-satisfaction depth, prefix diversity, pairwise-distinctiveness summaries, provenance-source buckets, and discovery-saturation curves. It stores only a top-20 cell table plus a normalized footprint, not another full heatmap.

## Provenance source resolution

The original profile library's embedded source classifier predates several now-large evidence classes. For new research, use `scripts/stress/provenance-source-taxonomy.mjs`, whose granular taxonomy distinguishes witness, inherited/transformed witness, human, external constraint solver, variant-parent replay, complete/randomized/hint-guided enumeration, isolated technique, production retry tier, ordinary production solver, and other evidence.

`source-stratified-solution-profile.mjs` applies that taxonomy while reusing this library's profile primitives, so Corpus-2 and mixed-origin hint stores can be profiled without collapsing variant replay/external/retry evidence into `other` or generic production:

```sh
node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

The older `solution-profile-lib.mjs` classifier remains for compatibility with its checked-in profile artifacts until the next full regeneration/unification pass. Do not compare old and granular source bucket names as if they were the same schema.

## Fingerprint contents

Each level has a `combined` bucket plus provenance-source buckets. A hint rediscovered by multiple sources contributes to each relevant bucket.

Each bucket includes:

- cell/edge and intersection frequency;
- portal-use and directed-jump signatures;
- must-cross entry/completion order and rigidity;
- objective-satisfaction depth for must-pass/must-cross/must-turn/adjacent-turn/surround;
- turn rate, direction split, and hot turn cells;
- prefix diversity;
- pairwise `featureDistance` summaries;
- discovery-saturation curves.

Large-bucket distribution statistics use deterministic seeded sampling to bound O(n²) comparisons.

## Saturation is not completeness

`discoverySaturation.plateauStartIndex` / `plateauFraction` only show that recent accepted hints stopped adding new edges/cells. They do not prove tree exhaustion.

Only `provablyExhaustive` is a completeness signal, derived from stored provenance with `search.termination === 'exhaustive'`.

Do not infer “the solution space is rigid” merely because the stored hint set is homogeneous. Search/generation provenance may have sampled one narrow mode repeatedly.

## Cross-level comparison

Raw packed coordinates are not comparable across grids. `profileDistance` / `profileDistanceTerms` use position-independent scalars or `normalizedFootprint`, the downsampled visited-cell analogue of `scripts/stress/features.mjs`'s occupancy grid. Missing axes are skipped.

A target with only one witness uses `buildSinglePathProfile`; n=1 statistics degrade to null/zero-pair values. For sparse targets, use the **ranking and per-axis breakdown**, not raw absolute distance, because many terms are absent.

Similarity is descriptive. A close profile match can reflect shared generator/family ancestry, geometry, or provenance artifacts rather than a causal reason that the same solver technique should work. Treat nearest-neighbor/profile clusters as hypothesis generators, then translate the pattern into legal current-level/current-state descriptors and validate away from the families that nominated it.

## Provenance and leakage caveats

Source buckets are only as reliable as hint provenance. Coverage differs by corpus and source; do not assume `combined` represents cold solver capability. Use the shared provenance classifier and current coverage data rather than treating `other` or `hintGuided` alone as capability labels. Run the compact evidence audit before a decision-bearing profile analysis:

```sh
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all
```

Additional rules:

- a profile derived from saved solutions/hints cannot be read by production policy for that level;
- historical winner/technique labels joined to profiles are offline research labels only;
- retry-tier, isolated-technique, external, variant-replay and hint-guided sources must not be silently treated as ordinary cold production;
- if a profile-derived descriptor was chosen after inspecting outcome correlations, the same levels are discovery/tuning data, not confirmation;
- split variant-derived comparisons by parent family;
- guard against normalized footprints or high-dimensional descriptors becoming accidental level/family identifiers;
- do not report correlation between profile axes and solver success as causal without a controlled/shadow follow-up.

See [`solver-level-blindness.md`](solver-level-blindness.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Freshness

Default legacy libraries:

- `reports/stress/solution-profile-published.json`
- `reports/stress/solution-profile-corpus1.json`

`solution-profile-compare.mjs` checks each library's stored `hintSignature` against current hint/provenance counts before comparison. On mismatch it calls `regenerateCorpusProfile`, rewrites the library and `-summary.md`, then compares.

Partial libraries (`levelSpec !== 'all'`) are not auto-regenerated because a count mismatch cannot distinguish staleness from intentional selection.

Use `npm run stress:solution-profile` only to force a rebuild or create a non-default/partial legacy library. Use `source-stratified-solution-profile.mjs` for new granular-source work, especially Corpus 2.

Fresh profile data does not make historical solver-outcome joins current. Revalidate decision-bearing technique/capability associations against current solver evidence.

## Commands

```sh
npm run stress:solution-profile -- \
  --levels-json=data/levels.json \
  --out=reports/stress/solution-profile-published.json

npm run stress:solution-profile -- \
  --levels-json=data/stress/stress-levels.json \
  --out=reports/stress/solution-profile-corpus1.json

npm run stress:solution-profile-compare -- --target-level=42

node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

`solution-profile-compare.mjs` also accepts `--library=a.json,b.json`, `--bucket=<source>` (default `combined`), and `--top=<n>`.

## Proper research use

A production-facing idea derived from solution profiles should follow this chain:

1. observe a profile/outcome association offline;
2. identify a simpler legal structural/state descriptor that could explain it;
3. test that descriptor in shadow/controlled evidence without solution-profile lookup;
4. confirm across unrelated levels/parents not used to choose the descriptor/threshold;
5. only then use the generic descriptor in a matched-work live treatment.

If step 2 cannot produce a legal descriptor, the finding remains diagnostic knowledge rather than a routing feature.

Current legacy summaries:
- [`reports/stress/solution-profile-published-summary.md`](../reports/stress/solution-profile-published-summary.md)
- [`reports/stress/solution-profile-corpus1-summary.md`](../reports/stress/solution-profile-corpus1-summary.md)

Unit coverage: `scripts/stress/solution-profile-lib-unit-tests.mjs` plus `scripts/stress/provenance-source-taxonomy-unit-tests.mjs`.
