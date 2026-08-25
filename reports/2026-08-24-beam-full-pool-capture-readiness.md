# Beam full-pool capture readiness

> **Status:** active evidence / queue support
> **Date:** 2026-08-24
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 4
> **Related:** [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md)

## Finding

The next beam-retention gate requires a read-only projection over the **full ranked candidate pools** at known extinction boundaries. The existing committed adjacent-case artifact, [`stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json), is a curated set of candidate rows rather than a full-pool capture.

The production beam research seam already constructs exactly the raw observation needed. At score-width culls, `modules/solver/search.ts` builds `details.rankedPool` from every candidate in the sorted pool and records a reconstructed candidate path, rank, score, and insertion order. Those paths are sufficient to replay the cheap residual-state descriptors offline against the level, without adding state fields to the hot beam node or changing survivor selection.

However, `WinningLineageObserver` historically reduced that pool immediately to the known-solution-supported subset and then deleted `details.rankedPool`. The existing `--retain-all-removal-details` flag did **not** change that behavior; it only retained otherwise-filtered rejection/removal/cull detail. Therefore no existing normal lineage artifact can support the newly requested full-pool descriptor projection merely by having been run with `--retain-all-removal-details`.

This was a research-instrumentation gap, not a production solver correctness bug.

## Bounded fix

Add an independent opt-in `retainRankedPoolDetails` observer option and expose it from `scripts/stress/winning-lineage-pilot.mjs` as:

```text
--retain-ranked-pool-details
```

The default remains unchanged: full ranked pools are discarded after compact support summaries are derived. With the new flag, the observer retains the already-generated `rankedPool` in stage details. No extra search, scoring, connectivity, ordering, PRNG use, or survivor decision is introduced.

The pilot artifact schema advances from 3 to 4 and records `retainRankedPoolDetails` at the top level so downstream analysis can distinguish compact historical artifacts from projection-capable captures.

A regression test covers both contracts:

- default observer output still removes `rankedPool` while retaining `poolCandidateCount` and supported-pool summaries;
- explicit `retainRankedPoolDetails: true` preserves the complete ranked pool unchanged.

## Exact-parent selection

The exact A/D parents currently nominated for the set-level projection (`S00001`, `S00030`, `S00048`, `R00104`) all come from `data/stress/stress-levels.json`. The pilot previously offered only first-N or metadata-stratified level selection, forcing a caller to manufacture a temporary corpus merely to rerun those four prespecified parents.

The pilot now also accepts a bounded explicit selector:

```text
--level-ids=S00001,S00030,S00048,R00104
```

Explicit IDs preserve caller order, must be unique, must exist with stored hints in the chosen corpus, and are mutually exclusive with `--metadata` so two selection contracts cannot silently interact.

The archived original lineage analysis records the same-config cohort contract as **beam width 100, default profile, 100,000 canonical nodes**. Therefore the bounded recapture command is not using guessed defaults; it reproduces the documented width/work contract:

```bash
node scripts/run-bundled.mjs scripts/stress/winning-lineage-pilot.mjs \
  --levels=data/stress/stress-levels.json \
  --level-ids=S00001,S00030,S00048,R00104 \
  --beam-width=100 \
  --node-budget=100000 \
  --include-stages \
  --retain-ranked-pool-details \
  --out=tmp/beam-extinction-full-pools-2026-08-24.json
```

A branch-specific temporary pull-request workflow may be used to run this bounded recapture and upload the JSON as a short-lived Actions artifact. That workflow is execution scaffolding only and should be removed before merge; the durable instrument is the CLI above.

## Evidence limit

These changes make the required data capturable and targetable. They do not themselves perform the descriptor projection and do not establish that any proposed diversity key improves future coverage.

Full-pool retention can make artifacts large, so it should remain a bounded research option rather than the default lineage mode. Once captured, reconstruct candidate state from each retained path and compare the prespecified low-cardinality keys from the descriptor sanity-check report. Do not add a production diversity intervention until the set-level projection clears its existing cardinality, singleton, fixed-width-retention, random-reserve, and width-only controls.
