# Beam full-pool capture readiness

> **Status:** concluded-positive
> **Last evidence:** 2026-08-25 — successful bounded full-pool capture in Actions run `32810888215`, followed by read-only projection of all 207 captured ranked pools
> **Decision:** retain full ranked-pool capture as an explicit bounded research option, not a production/default artifact mode. The one-shot PR workflow was execution scaffolding only; the durable interface is the CLI flag and observer option. The tested survivor-quota keys were negative; see the projection report.
> **Remaining gate:** none for this capture task. Reopen capture only when a new prespecified beam question requires full pools.
> **Evidence role:** discovery
> **Selection:** deliberately selected exact A/D dead-top/live-alternative extinction parents; not prevalence or effect-size evidence
> **Date:** 2026-08-24
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 4
> **Related:** [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md), [`2026-08-25-beam-full-pool-survivor-projection.md`](2026-08-25-beam-full-pool-survivor-projection.md)

## Finding

The beam-retention gate required a read-only projection over the **full ranked candidate pools** at known extinction boundaries. The existing committed adjacent-case artifact, [`stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json), is a curated set of candidate rows rather than a full-pool capture.

The production beam research seam already constructs exactly the raw observation needed. At score-width culls, `modules/solver/search.ts` builds `details.rankedPool` from every candidate in the sorted pool and records a reconstructed candidate path, rank, score, and insertion order. Those paths are sufficient to replay cheap residual-state descriptors offline against the level, without adding state fields to the hot beam node or changing survivor selection.

However, `WinningLineageObserver` historically reduced that pool immediately to the known-solution-supported subset and then deleted `details.rankedPool`. The existing `--retain-all-removal-details` flag did **not** change that behavior; it only retained otherwise-filtered rejection/removal/cull detail. Therefore no existing normal lineage artifact could support the requested full-pool descriptor projection merely by having been run with `--retain-all-removal-details`.

This was a research-instrumentation gap, not a production solver correctness bug.

## Bounded fix

An independent opt-in `retainRankedPoolDetails` observer option is exposed from `scripts/stress/winning-lineage-pilot.mjs` as:

```text
--retain-ranked-pool-details
```

The default remains unchanged: full ranked pools are discarded after compact support summaries are derived. With the new flag, the observer retains the already-generated `rankedPool` in stage details. No extra search, scoring, connectivity, ordering, PRNG use, or survivor decision is introduced.

The pilot artifact schema advanced from 3 to 4 and records `retainRankedPoolDetails` at the top level so downstream analysis can distinguish compact historical artifacts from projection-capable captures.

A regression test covers both contracts:

- default observer output still removes `rankedPool` while retaining `poolCandidateCount` and supported-pool summaries;
- explicit `retainRankedPoolDetails: true` preserves the complete ranked pool unchanged.

## Exact-parent selection

The selected exact A/D parents (`S00001`, `S00030`, `S00048`, `R00104`) all come from `data/stress/stress-levels.json`. The pilot now accepts a bounded explicit selector:

```text
--level-ids=S00001,S00030,S00048,R00104
```

Explicit IDs preserve caller order, must be unique, must exist with stored hints in the chosen corpus, and are mutually exclusive with `--metadata`.

The archived original lineage analysis records the same-config cohort contract as **beam width 100, default profile, 100,000 canonical nodes**. The deterministic recapture command is:

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

A branch-specific temporary pull-request workflow ran this bounded recapture successfully in Actions run `32810888215`. It produced **207 complete ranked pools** across the four selected parents. That workflow was execution scaffolding only and was removed by the follow-up housekeeping pass; the durable instrument is the CLI above.

## Downstream disposition

The projection is now complete. [`2026-08-25-beam-full-pool-survivor-projection.md`](2026-08-25-beam-full-pool-survivor-projection.md) tested the prespecified baseline, +MustPass, +adjacent-turn, and +MustCross-first-pass bucket keys at fixed width 100.

None retained either available exact-live alternative that score-only width 100 culled. Aggregate bucket cardinality remained low, so excessive singleton fragmentation was not the failure mode; the useful candidates simply remained too low within their buckets. Stored-hint-supported retention also showed no recurring incremental advantage over the baseline bucket key.

Full-pool retention can make artifacts large, so it remains a bounded research option rather than the default lineage mode. The tested quota/bucketing form is closed; do not recapture these pools merely to tune another composite key on the same selected parents.
