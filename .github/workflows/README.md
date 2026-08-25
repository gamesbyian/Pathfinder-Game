# Solver batch workflows

These workflows are the preferred GitHub Actions entrypoints for solver capability, research, and reference-model batch work. Prefer them over ad-hoc local long runs when the workload is naturally independent across levels/cases.

## Common scheduling defaults

For node/work-bounded native-solver sweeps on standard public `ubuntu-latest` runners, the current default pattern is:

- 4 cross-level worker processes per runner, matching the current 4-vCPU standard public runner.
- More shards than concurrent lanes, usually 60 shards behind 20 lanes, so completed lanes pull queued work instead of idling behind a coarse-shard straggler.
- Immutable dispatched-SHA checkout for evidence-producing runs.

These are throughput defaults, not universal laws. A workflow with intentionally binding wall-clock deadlines can change its solved set when worker contention changes, so worker count there must be measured rather than mechanically raised. CP-SAT's `num_search_workers` is also a search-portfolio parameter, not merely a CPU-count setting.

## Core capability workflows

- `solver-stress-refresh.yml` — canonical level-blind full capability refresh over Corpus 1 + Corpus 2. Default 60 shards / 20 lanes / 4 workers. Node/work ceilings are the normal binding budgets; the 24h wall deadline is intentionally non-binding.
- `solver-typical-budget-baseline.yml` — typical-budget baseline. Already heavily oversharded for tail control. Its ordinary wall deadlines are semantically meaningful, so do not copy the 4-worker default here without a matched measurement.
- `solver-highbudget-unsolved-sweep.yml` — high-budget unsolved sweep with runtime-weighted bin packing and dedicated slow-level handling.
- `solver-level-blind-targeted-sweep.yml` — targeted level-blind sweep using the weighted planner.

## Sample A/B workflows

- `solver-archetype-sample-ab.yml` — stratified archetype-gated A/B. Default 60 shards / 20 lanes / 4 workers.
- `solver-repair-probe-adaptive-sample-ab.yml` — repair-probe adaptive-budget A/B. Default 60 shards / 20 lanes / 4 workers.
- `solver-repair-fallback-reserve-sample-ab.yml` — repair-fallback reserve A/B. Default 60 shards / 20 lanes / 4 workers.

These workflows use non-binding deterministic deadlines by default, so their node/work budgets remain the comparison basis while cross-level worker parallelism only changes calendar time.

## Technique and method sweeps

- `technique-census.yml` — isolated single-/paired-/flag-technique census. `workers` is configurable and defaults to 4; the 120-shard / 20-lane outer layout is retained.
- `method-probe-sweep.yml` — isolated method/config probe over a corpus. Default 60 outer shards / 20 lanes and 4 disjoint probe processes per runner. Each runner bundles the probe once before spawning children; the combiner validates metadata, duplicate IDs, and missing worker outputs.

## CP-SAT / reference-model workflows

- `cpsat-hint-harvest-sweep.yml` — CP-SAT hint harvest; 60 shards / 20 lanes because per-level runtime varies heavily.
- `cpsat-hint-harvest-sweep-published.yml` — published-level harvest with a smaller matrix appropriate to its population.
- `cpsat-explicit-prefix-oracle.yml` — explicit prefix-feasibility cases. Independent cases are sharded across 20 runners by default, then coverage-checked and combined.
- `atlas-sweep.yml` — grows the CP-SAT-labelled branch atlas. Uses 60 fixed interleaved buckets behind 20 lanes; smaller trial dispatches select a literal subset of those buckets rather than repartitioning the population.
- `mitm-frontier-sweep.yml` — curated per-level MITM frontier experiments.

CP-SAT itself currently uses its own internal search-worker setting. Do not infer that matching this number to runner vCPUs is automatically faster; compare representative runs because CP-SAT workers also diversify search.

## Other batch research

- `family-wide-trove.yml` — family-wide solver trove. Native solver work already defaults to 4 workers per runner.
- `solver-elite-prefix-dfs-retry-validate.yml` — targeted elite-prefix validation.

## Choosing a workflow

Use the narrowest workflow whose evidence semantics match the question. Capability workflows must remain level-blind. Research/reference workflows may use historical artifacts where explicitly designed to do so. Avoid creating a new batch runner merely to get different parallelism: most common entrypoints now expose or already implement the worker/shard controls needed to trade concurrent footprint against tail latency.
