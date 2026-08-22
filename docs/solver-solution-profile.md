# Solution-space fingerprints

Offline analysis tooling that summarizes how accepted solutions behave so an unsolved stress level can be compared with known-solvable families. This is distinct from `domain/level-fingerprint.ts` (level-shape dedupe) and `scripts/solver-fingerprint.mjs` (solver determinism).

## Reused primitives

| Primitive | Source |
|---|---|
| Edges, intersections, portal signatures, must-cross order | `modules/domain/path-features.ts` |
| Visits, entropy/percentiles, must-cross keys, nav density | `modules/domain/hint-novelty.ts` |
| Turn direction | `modules/domain/geometry.ts` |
| Landmark roles/turn requirements | `modules/domain/landmark-rules.ts` |
| Provenance fields | `modules/domain/hint-types.ts` |

`scripts/stress/solution-profile-lib.mjs` adds aggregate turn distributions, objective-satisfaction depth, prefix diversity, pairwise-distinctiveness summaries, provenance-source buckets, and discovery-saturation curves. It stores only a top-20 cell table plus a normalized footprint, not another full heatmap.

## Fingerprint contents

Each level has a `combined` bucket plus provenance-source buckets (`PROVENANCE_SOURCES`): witness, human-solved, complete-enumeration, prefix-anchored-completion, randomized-enumeration, production-solver, and other. A hint rediscovered by multiple sources contributes to each relevant bucket.

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

## Cross-level comparison

Raw packed coordinates are not comparable across grids. `profileDistance` / `profileDistanceTerms` use position-independent scalars or `normalizedFootprint`, the downsampled visited-cell analogue of `scripts/stress/features.mjs`'s occupancy grid. Missing axes are skipped.

A target with only one witness uses `buildSinglePathProfile`; n=1 statistics degrade to null/zero-pair values. For sparse targets, use the **ranking and per-axis breakdown**, not raw absolute distance, because many terms are absent.

## Provenance caveat

Source buckets are only as reliable as hint provenance. Coverage differs by corpus and source; do not assume `combined` represents cold solver capability. Use the shared provenance classifier and current coverage data rather than treating `other` or `hintGuided` alone as capability labels. See `DEVELOPER_REFERENCE.md`'s Provenance section and `npm run stress:provenance-coverage`.

## Freshness

Default libraries:

- `reports/stress/solution-profile-published.json`
- `reports/stress/solution-profile-corpus1.json`

`solution-profile-compare.mjs` checks each library's stored `hintSignature` against current hint/provenance counts before comparison. On mismatch it calls `regenerateCorpusProfile`, rewrites the library and `-summary.md`, then compares.

Partial libraries (`levelSpec !== 'all'`) are not auto-regenerated because a count mismatch cannot distinguish staleness from intentional selection.

Use `npm run stress:solution-profile` only to force a rebuild or create a non-default/partial library.

## Commands

```sh
npm run stress:solution-profile -- \
  --levels-json=data/levels.json \
  --out=reports/stress/solution-profile-published.json

npm run stress:solution-profile -- \
  --levels-json=data/stress/stress-levels.json \
  --out=reports/stress/solution-profile-corpus1.json

npm run stress:solution-profile-compare -- --target-level=42
```

`solution-profile-compare.mjs` also accepts `--library=a.json,b.json`, `--bucket=<source>` (default `combined`), and `--top=<n>`.

Current summaries:
- [`reports/stress/solution-profile-published-summary.md`](../reports/stress/solution-profile-published-summary.md)
- [`reports/stress/solution-profile-corpus1-summary.md`](../reports/stress/solution-profile-corpus1-summary.md)

Unit coverage: `scripts/stress/solution-profile-lib-unit-tests.mjs`.
