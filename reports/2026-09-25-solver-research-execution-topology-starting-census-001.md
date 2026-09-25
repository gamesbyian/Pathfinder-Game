# Research workflow execution-topology starting census — 2026-09-25

## Purpose

Start Phase 1 of `docs/solver-research-execution-efficiency-plan.md` with current-main facts. This is a static topology census, not a runtime-cost claim.

Main observed: `7d94df87fde1ab35f46900950188f402f3fe67dc`.

## Maintained solver/research workflow census

The current `.github/workflows` inventory contains 11 files matching maintained solver batch/evidence execution:

- `harvest-solver-evidence.yml`
- `solver-broad-confirmation.yml`
- `solver-combine-sweep-runs.yml`
- `solver-diagnostics.yml`
- `solver-evidence-integrity-guard.yml`
- `solver-highbudget-unsolved-sweep.yml`
- `solver-level-blind-targeted-sweep.yml`
- `solver-production-replay-baseline.yml`
- `solver-residual-confirmation.yml`
- `solver-routing-regime-sample-ab.yml`
- `solver-stress-refresh.yml`

Static findings:

- **11/11** specify `node-version: '20'` at their Node setup sites; runtime patch identity therefore floats with setup-node resolution.
- **0/11** currently use the exact `node_modules` generation restore now proven in production CI.
- **1/11** uses sparse checkout: `solver-routing-regime-sample-ab.yml`.
- high-fanout workflows repeat ordinary checkout/setup/install topology in solve jobs rather than inheriting a prepared execution image/tree.
- static occurrence counts are deliberately not converted into “seconds wasted”; planner/generator, solve, combine and persistence jobs have very different useful-work durations.

Selected occurrence counts from current main:

| workflow | checkout sites | setup-node sites | npm ci sites | sparse checkout |
| --- | ---: | ---: | ---: | --- |
| harvest-solver-evidence | 1 | 1 | 1 | no |
| broad confirmation | 3 | 3 | 2 | no |
| highbudget unsolved sweep | 3 | 3 | 3 | no |
| level-blind targeted sweep | 6 | 6 | 4 | no |
| production replay baseline | 3 | 3 | 2 | no |
| residual confirmation | 5 | 5 | 4 | no |
| routing-regime sample A/B | 4 | 4 | 3 | **yes** |
| stress refresh | 2 | 2 | 2 | no |

The remaining three single-job/helper workflows each have one ordinary checkout/setup/install site.

## Interpretation

### Exact runtime identity is the clearest correctness/reproducibility gap

The research system records immutable refs, corpus/sample hashes, effective config, solver request identity and provenance, but a major-only Node selector allows execution-runtime patch drift. The first migration question is therefore semantic parity under an exact runtime, not cache speed.

### Dependency-tree caching is plausible but not yet globally earned

CI has already proved the mechanism and exact generation identity. Research activation should be economics-driven. It is most likely valuable for:

- short planner/generator/combine jobs;
- short Stage-A pilots/canaries;
- high-fanout matrices where every shard repeats install/bootstrap;
- retry/recovery workflows where setup becomes a significant share of successful useful work.

It is least interesting for a long-running shard unless aggregate runner-minute cost is material.

### Sparse checkout is already a native pattern, not a speculative technology

The routing-regime A/B workflow uses sparse checkout today. The next question is which other job classes have sufficiently explicit input contracts to earn the same treatment. Level-blind jobs are the strongest first candidate because their solver input boundary is already mechanically restricted.

### Generic sharding work is not the initial target

High-budget sweep already uses telemetry-weighted dynamic packing with straggler isolation; workflow policy already says worker/lane defaults are not universal laws. The CI lesson here is to measure a demonstrated tail before retuning concurrency.

## Next evidence

1. Land the static audit tool so this census is mechanically refreshable.
2. Reconcile the live solver queue to current execution architecture.
3. Choose representative exact-runtime rehearsals before changing all workflow Node versions.
4. Add hosted bootstrap timing evidence by job class before activating dependency-tree restore broadly.
