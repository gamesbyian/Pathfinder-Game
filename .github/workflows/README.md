# Solver batch workflows

These are the preferred GitHub Actions entrypoints for solver capability, research, and reference-model batch work. Prefer them over ad-hoc long local runs when work is naturally independent across levels or cases.

## Scheduling defaults

For node/work-bounded native-solver sweeps on standard public `ubuntu-latest` runners:

- 4 cross-level worker processes per runner, matching the current 4-vCPU standard public runner.
- More shards than concurrent lanes, usually 60 shards behind 20 lanes, so completed lanes pull queued work instead of idling behind a coarse-shard straggler.
- Immutable dispatched-SHA checkout for evidence-producing runs.

These are throughput defaults, not universal laws. Binding wall-clock deadlines can change solved sets under different contention, so worker count there must be measured rather than mechanically raised. CP-SAT's `num_search_workers` is also a search-portfolio parameter, not merely a CPU-count setting.

## Evidence retention

Solver execution ref and durable evidence destination are separate concerns. A run may execute on `main` or any feature-branch SHA; useful solved paths and provenance must not depend on that branch surviving.

`harvest-solver-evidence.yml` runs after the main native-solver workflows complete and persists recoverable evidence onto canonical `main`:

- Existing `--save-hints` shard artifacts are structurally merged by path, not copied last-writer-wins.
- Artifact-only level-blind runs reconstruct canonical provenance from their persisted solved rows and winning attempts. Hint capture remains output-only, so this does not feed history back into the solve.
- `method-probe` and technique-census discoveries are retained with `isolatedTechnique=true`, preserving the distinction from competitively-budgeted production-ladder capability.
- Failed or cancelled workflows are harvested too; completed shard output can contain a novel solve even when the overall run fails later.
- Evidence that cannot safely attach to current `main` because the level/corpus changed or the path no longer referee-validates is committed under `reports/stress/pending-solver-evidence/` rather than discarded.
- Competing persistence runs serialize and replay semantic merges against latest `main`; do not line-rebase hint JSON.

The harvester downloads artifacts with `gh run download`. Do not replace that with the cross-run `actions/download-artifact` path without revalidating pagination: this repo has observed that path truncate runs with more than 100 artifacts.

This retention layer is a safety net. Individual workflows may still save hints immediately when convenient, but branch-local persistence is no longer the only durable copy.

## Core capability

- `solver-stress-refresh.yml` — canonical level-blind full refresh over Corpus 1 + Corpus 2. Default 60 shards / 20 lanes / 4 workers; node/work ceilings normally bind.
- `solver-typical-budget-baseline.yml` — typical-budget baseline. Already heavily oversharded; its ordinary wall deadlines are semantically meaningful, so worker-count changes require matched measurement.
- `solver-highbudget-unsolved-sweep.yml` — high-budget unsolved sweep with runtime-weighted bin packing and dedicated slow-level handling.
- `solver-level-blind-targeted-sweep.yml` — targeted level-blind sweep using the weighted planner.

## Sample A/B

- `solver-archetype-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-repair-probe-adaptive-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-repair-fallback-reserve-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.

These use non-binding deterministic deadlines by default, so node/work budgets remain the comparison basis while cross-level parallelism changes calendar time.

## Technique and method sweeps

- `technique-census.yml` — isolated technique census. `workers` defaults to 4; outer layout remains 120 shards / 20 lanes.
- `method-probe-sweep.yml` — isolated method/config probe. Default 60 outer shards / 20 lanes and 4 disjoint probe processes per runner. Each runner bundles once; the combiner validates metadata, duplicate IDs, and missing worker outputs.

## CP-SAT / reference-model work

- `cpsat-hint-harvest-sweep.yml` — 60 shards / 20 lanes for highly variable per-level runtime.
- `cpsat-hint-harvest-sweep-published.yml` — smaller published-level matrix.
- `cpsat-explicit-prefix-oracle.yml` — independent prefix cases sharded across 20 runners, then coverage-checked and combined.
- `atlas-sweep.yml` — 60 fixed interleaved buckets behind 20 lanes; smaller trials select a literal subset rather than repartitioning.
- `mitm-frontier-sweep.yml` — curated per-level MITM frontier experiments.

Do not infer that CP-SAT search workers should equal runner vCPUs; compare representative runs because those workers also diversify search.

## Other batch research

- `family-wide-trove.yml` — native solver work already defaults to 4 workers per runner.
- `solver-elite-prefix-dfs-retry-validate.yml` — targeted elite-prefix validation.

Use the narrowest workflow whose evidence semantics match the question. Capability workflows must remain level-blind. Avoid creating a new batch runner merely for different parallelism: common entrypoints now expose or implement the worker/shard controls needed to trade concurrent footprint against tail latency.
