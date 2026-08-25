# Solver stress refresh

`solver-stress-refresh.yml` is the canonical full-population, level-blind capability workflow for Corpus 1 and Corpus 2.

Its evidence rule is simple: each solve sees only the current level mechanics and current solver/configuration. Saved hints, prior solutions, winning configurations, corpus position, provenance, and other exact-level history are outputs or analysis evidence only. They do not enter the solve.

## Current execution shape

The default dispatch is tuned for standard public GitHub-hosted `ubuntu-latest` runners:

- `shard_count=60`
- `max_parallel=20`
- `corpus1_workers=4`
- `corpus2_workers=4`

The node/work ceilings remain the meaningful per-level budgets. The default 24-hour wall deadline is intentionally non-binding. Four cross-level worker processes therefore use the current runner's four vCPUs without changing the per-level search budget.

Using more shards than concurrent lanes is deliberate. With one coarse shard per lane, the run finishes when the single slowest shard finishes. With queued fine shards, a lane that finishes early immediately pulls another slice, so runtime variation is averaged across the run instead of becoming a final long tail.

For a matched A/B pair that must reduce concurrent footprint, lower `max_parallel`; keeping `shard_count` above it preserves the self-balancing queue. Setting `shard_count == max_parallel` remains available when exact reproduction of the older fixed-shard execution shape matters.

## Deterministic A/B use

For matched capability A/B arms, use `deterministic=true` and `persist_hints=false`. The workflow then uses the non-binding deadline and preserves node/work comparability while avoiding shared hint mutation. Each completed run still writes its run-ID-namespaced compact capability record for later comparison.

Changing cross-level worker count in this workflow changes calendar scheduling, not the nominal node/work budget. This is different from `solver-typical-budget-baseline.yml`, whose ordinary wall-clock deadlines are intentionally binding and therefore require worker-count changes to be treated as an experiment.

## Outputs

A complete run combines every shard, verifies exact coverage of all 102 Corpus-1 and 1700 Corpus-2 levels, rejects level-history contamination such as `solvedByPrime`, and emits the combined reports plus a durable run-ID-namespaced per-level record.

New valid hints can be persisted when requested, but saved hints never feed back into the capability solve itself.

If a shard times out or disappears, coverage verification fails rather than inheriting stale files from an earlier run. Partial artifacts remain available for diagnosis, but incomplete results are not promoted as the canonical capability state.
