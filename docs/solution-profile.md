# Solution-space fingerprints

Analysis tooling (not a production feature) that turns each of the known-solvable levels —
156 published (`data/levels.json`) + 102 stress-corpus-1 (`data/stress/stress-levels.json`,
after the 2026-07-11 non-square-grid cleanup — see `data/stress/README.md`) —
into a reference specimen describing *how its accepted solutions behave*, so a level from the
1,700-level unsolved stress corpus (`data/stress/stress-levels-random.json`) can be compared
against known-solvable families when the production solver fails on it.

This is distinct from two other "fingerprint"-named things in this repo: `domain/level-fingerprint.ts`
hashes a level's *shape* for duplicate detection; `scripts/solver-fingerprint.mjs` hashes solver
*determinism* across run orders. A solution-space fingerprint hashes neither — it's an aggregate
description of a level's *solved paths*.

## Why this doesn't duplicate existing tooling

Every per-path primitive is reused, not re-derived:

| Primitive | Reused from |
|---|---|
| Edge set, self-intersection set, portal-jump signature, must-cross entry/completion order | `modules/domain/path-features.ts` (the same module curation and discovery-acceptance already share) |
| Per-cell visit extraction, entropy/percentile, must-cross keys, navigable density | `modules/domain/hint-novelty.ts` |
| Turn direction (`cw`/`ccw`) | `modules/domain/geometry.ts`'s `turnDirection` |
| Landmark role/turn-direction resolution | `modules/domain/landmark-rules.ts` |
| Provenance fields (technique, termination, seed, `foundAt`, ...) | `modules/domain/hint-types.ts` — no new schema |

`scripts/stress/solution-profile-lib.mjs` only adds what those don't already compute: turn
*distributions*, objective-satisfaction *depth*, prefix diversity, pairwise-distinctiveness
*summary* statistics (the existing `featureDistance` is pointwise — used to pick a display subset,
never aggregated into corpus stats before), provenance-source bucketing, and the
discovery-saturation curve.

The full per-cell visit heatmap already exists as its own artifact
(`data/level-heatmaps.json`, `npm run levels:generate-heatmaps`) — fingerprints store only a
top-20 per-level table (inspection value) plus a small position-normalized footprint (the value
actually used for cross-level comparison), not a second full copy of that data.

## What's in a fingerprint

For each level, `solution-profile.mjs` builds a **combined** bucket (every saved hint) and one
bucket **per provenance source** — witness, human-solved, complete-enumeration,
prefix-anchored-completion, randomized-enumeration, production-solver, other (`PROVENANCE_SOURCES`
in the lib) — classified from each hint's *existing* provenance fields (see
`classifyProvenanceSource`), no new tracking required. `human-solved` (an ordinary Play-mode win or
a submission's own solve path, tagged with `HUMAN_PLAYER_ID`) sits alongside `witness` at the top
of the precedence order: a human solving a level with zero connection to any solver heuristic is
the single strongest cross-validation signal available here, stronger than two algorithmic
techniques agreeing. A hint independently rediscovered by two techniques counts in both buckets:
structure that shows up across sources is more likely level-*forced*; structure that only shows up in one
source is more likely a *search-technique* tic. Comparing `combined` vs `bySource` fingerprints is
how you tell those apart.

Each bucket carries:

- **Cell-visit / edge-usage frequency** (top-20 + entropy + a position-normalized footprint for
  cross-level comparison — see below).
- **Intersection-cell frequency** — which cells get crossed, and how often.
- **Portal-use signature + directed-jump frequency** — which pair/combo/entry-exit direction
  combinations get used, and how often paths use portals at all.
- **Must-cross first-entry and completion order frequency**, plus a `rigid` flag (every accepted
  solution used the same order — a genuinely level-forced constraint, not an artifact of how
  solutions happened to be found).
- **Objective-satisfaction depth** — for every mustPass/mustCross/mustTurn/adjacentTurn/surround
  obligation, the fractional path-index (0 = gate, 1 = goal) where it first becomes satisfied,
  averaged across the bucket's paths. Every stored hint is already a validated win, so this
  answers "how early," never "whether."
- **Turn-location and turn-direction distribution** — mean turn rate, cw/ccw split, hot turn cells.
- **Prefix diversity** — how much of each path's length is shared with its nearest sibling (low =
  solutions fan out immediately from the gate; high = they stay bunched before diverging late).
- **Pairwise distinctiveness** — summary statistics (mean/median/percentiles) over the *same*
  `featureDistance` metric the in-game hint curator uses pointwise, answering "how different are
  this level's accepted solutions from each other, on average" at the corpus level for the first
  time.
- **Discovery-saturation curve** — walking accepted hints in discovery order (`foundAt`), how many
  new edges/cells/portal-signatures/must-cross-orders each additional hint contributes.

Every distribution-shaped stat is sampled (seeded, deterministic — `mulberry32`, same PRNG family
the hint-discovery scripts use) above a small cap when a bucket has many paths, to keep the O(n²)
pairwise comparisons bounded.

## The one caution: saturated is not the same as complete

`discoverySaturation.plateauStartIndex`/`plateauFraction` is a **heuristic**: the first point after
which a trailing window of accepted hints contributed zero new edges/cells. It is evidence a
library has stopped finding *new kinds* of structure with the search effort actually spent — it is
**not** a claim that enumeration exhausted the solution tree. The only legitimate completeness
signal is `provablyExhaustive`, computed per level from whether *any* stored hint's own provenance
recorded `search.termination === 'exhaustive'` (i.e. `hints:complete-sharded` or
`variety-search.ts`'s complete mode actually ran to exhaustion on that level) — a fact read off
existing data, not inferred from a plateau. Don't call a library "complete" from the plateau field
alone.

## Cross-level comparison

Raw cell/edge keys are packed grid coordinates — meaningless to compare between two levels with
different grids. `profileDistance`/`profileDistanceTerms` in the lib either compare
position-**independent** scalars (turn rate, cw/ccw split, must-cross rigidity, portal-usage rate,
objective-depth-by-type, prefix diversity, pairwise distinctiveness, discovery-saturation plateau)
or the position-**normalized** cell footprint (`normalizedFootprint` — the same downsampled-grid
technique `scripts/stress/features.mjs`'s `occupancyGrid` uses for level-shape comparison, applied
here to *visited* cells instead of *placed objects*). An axis absent on either side (e.g. no
must-cross squares) is skipped, not treated as maximally different.

A single-witness target (an unsolved corpus-2 level with no mined hint corpus, only its hidden
witness) profiles as a degenerate n=1 bucket (`buildSinglePathProfile`) — every distribution stat
degenerates gracefully (0 pairs compared, etc.) rather than needing a separate code path. Because
so many axes go `null` for a sparse single-path target, absolute distances against the library
compress toward a narrow range driven mainly by cell-footprint/turn/entropy — read the **ranking**
and the **per-axis breakdown**, not the raw distance number, as the signal.

## Known data-quality caveat

Published-corpus hints predate hint provenance (`data/hints/*.json` — every entry's `provenance`
array is currently empty). Every one of those hints classifies as `other`, so **combined and
`other` are identical** for most published levels (the tool detects this — `sameAsCombined: true`
— and skips storing a redundant second copy rather than recomputing it). The provenance-source
split is therefore currently much more informative on stress-corpus-1 (generation-time witness +
solver-audit hints, which do carry real provenance) than on the published corpus. It will get more
useful on the published corpus over time as newly-found hints (which do carry provenance) accumulate.

## Freshness — libraries are kept up to date automatically at comparison time

A fingerprint library (`reports/stress/solution-profile-published.json`,
`reports/stress/solution-profile-corpus1.json`) is a snapshot of its source corpus's hint content
at generation time. It goes stale the moment more hints are found for that corpus — which happens
often, since hint-discovery tooling (`hint-workbench.mjs`, `hints:expand`, `hints:complete-sharded`,
manual solver runs, ...) runs far more frequently than anyone rebuilds these libraries by hand.

Regeneration is deliberately **not** wired into the hint-writing path itself
(`writeLevelsWithHints` and friends stay pure hint I/O, untouched). `solution-profile-lib.mjs`'s
`buildLevelSolutionProfile`/pairwise-distinctiveness stats are O(n²) over a level's *entire* hint
bucket, so recomputing a whole corpus's library on every single hint find — often for just one
level — would tax every hint-discovery run for a benefit almost none of those runs need.

Instead, freshness is checked and repaired lazily at the one place a library is actually **read**:
`solution-profile-compare.mjs`, immediately before every comparison. It hashes the source corpus's
current hint content (`computeHintSignature` — hint count + provenance-entry count per level,
cheap to compute since the comparison needs `readLevelsWithHints()` anyway) against the hash
stored in the library file (`hintSignature`); on a mismatch it calls
`regenerateCorpusProfile` — the same function `npm run stress:solution-profile` uses — rewrites
the library (and its `-summary.md`) in place, and proceeds with the fresh data. A library built
from an explicit `--levels=` partial selection (`levelSpec` recorded as something other than
`'all'`) is left alone — a hint-count mismatch can't distinguish "stale" from "intentionally only
covers 10 levels," so those need a manual rerun instead.

Net effect: **you never need to remember to regenerate these** before using
`solution-profile-compare.mjs` — just run it, and if the library was behind, you'll see a one-line
`[solution-profile] ... regenerating...` notice and get results computed against the current hint
corpus. Running `npm run stress:solution-profile` directly is only for forcing a rebuild without
doing a comparison, or for building a non-default/partial library.

## Running it

```sh
# Generate/refresh the fingerprint library (read-only against the corpus; never writes levels.json
# or hint files):
npx tsx scripts/stress/solution-profile.mjs --levels-json=data/levels.json \
    --out=reports/stress/solution-profile-published.json
npx tsx scripts/stress/solution-profile.mjs --levels-json=data/stress/stress-levels.json \
    --out=reports/stress/solution-profile-corpus1.json
# (or: npm run stress:solution-profile -- --levels-json=... --out=...)

# Compare an unsolved level against the library:
npx tsx scripts/stress/solution-profile-compare.mjs --target-level=42
# (or: npm run stress:solution-profile-compare -- --target-level=42)
```

`solution-profile.mjs` also writes a `-summary.md` next to its JSON output (corpus-wide counts and
means, plus the provenance-source coverage table) — see
[`reports/stress/solution-profile-published-summary.md`](../reports/stress/solution-profile-published-summary.md)
and [`reports/stress/solution-profile-corpus1-summary.md`](../reports/stress/solution-profile-corpus1-summary.md)
for the current numbers. `solution-profile-compare.mjs` accepts `--library=a.json,b.json` (defaults
to both), `--bucket=<source>` (default `combined`), and `--top=<n>`.

Unit coverage: `scripts/stress/solution-profile-lib-unit-tests.mjs` (picked up automatically by
vitest's `scripts/**/*-unit-tests.mjs` include glob — `npm run test:unit`/`test:coverage`/`ci`).
