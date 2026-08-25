# Solver stress refresh

`solver-stress-refresh.yml` is the canonical full-population, level-blind capability workflow for Corpus 1 and Corpus 2.

Each solve sees only the current level mechanics and current solver/configuration. Saved hints, prior solutions, winning configurations, corpus position, provenance, and other exact-level history are outputs or analysis evidence only.

## Execution shape

Default dispatch:

- `shard_count=60`
- `max_parallel=20`
- `corpus1_workers=4`
- `corpus2_workers=4`

The node/work ceilings remain the meaningful per-level budgets; the default 24-hour wall deadline is intentionally non-binding. Four cross-level processes use the current standard public runner's four vCPUs without changing a level's nominal search budget.

More shards than lanes is deliberate. A coarse fixed matrix finishes when its slowest shard finishes. Queued fine shards let early-finishing lanes pull more work, averaging runtime variation across the run instead of turning it into a long final tail.

For a matched A/B pair that must reduce concurrent footprint, lower `max_parallel`; keeping `shard_count` above it preserves self-balancing. Setting `shard_count == max_parallel` remains available when reproducing the older fixed-shard execution shape matters.

## Deterministic A/B use

For matched capability A/B arms, use `deterministic=true` and `persist_hints=false`. The workflow uses the non-binding deadline and preserves node/work comparability while avoiding shared hint mutation. Each complete run still writes its run-ID-namespaced compact capability record.

This differs from `solver-typical-budget-baseline.yml`, whose ordinary wall-clock deadlines intentionally bind. Worker-count changes there can change experimental outcomes and must be measured rather than treated as plumbing.

## Completion guarantees

A complete run combines every shard, verifies exact coverage of all 102 Corpus-1 and 1700 Corpus-2 levels, and rejects level-history contamination such as `solvedByPrime`.

New valid hints can be persisted when requested, but saved hints never feed back into the capability solve.

If a shard times out or disappears, coverage verification fails rather than inheriting stale files from an earlier run. Partial artifacts remain diagnostic evidence, but incomplete results are not promoted as canonical capability state.
