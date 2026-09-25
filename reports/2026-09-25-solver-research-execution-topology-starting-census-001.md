# Research workflow execution-topology starting census — 2026-09-25

> **Status:** active
> **Last evidence:** 2026-09-25 — static current-main workflow census plus hosted September-22 bootstrap timing sample.
> **Decision:** prioritize exact runtime identity and short-job input/bootstrap work; do not blanket-optimize long solve shards.
> **Remaining gate:** exact-runtime rehearsal, then full-vs-sparse short-job parity and measured dependency-tree reuse.

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

## Historical hosted timing sample

The broad production refresh run `35687363645` provides a useful first economics sample on solver ref `39d14d49023aa09cb680053b975ef786eeae9b01`.

Representative Capability shard 1/60 (job `106616974719`):

- checkout began 04:34:08.668 and detached HEAD was ready 04:35:02.875: **~54.2 s**;
- setup-node began 04:35:02.917 and reported Node v20.20.2 at 04:35:08.133: **~5.2 s** to runtime availability;
- the npm cache then restored and `npm ci` began 04:35:10.065; package installation completed 04:35:17.695: **~7.6 s**;
- result staging began 05:31:35.995, so this particular shard then spent roughly 56 minutes in useful/scientific work and related local reporting.

This means full-tree bootstrap was real and large in absolute terms, but only a small fraction of that long shard. It should **not** justify changing long-running solve jobs first.

The technique-census plan job from run `35687337464` (job `106616875652`) is more revealing for short orchestration:

- checkout fetch alone ran from about 04:33:38.25 to 04:34:29.48, with checkout complete around 04:34:32.82;
- setup-node then resolved floating Node 20 to **v20.20.2** and reached environment availability around 04:34:37.34;
- npm-cache restore completed around 04:34:38.94;
- `npm ci` ran until about 04:34:45.90;
- only then did plan generation/canary work begin.

So the full checkout + runtime + install path consumed roughly a minute before short planning/canary work. This materially strengthens the case for input materialization and exact bootstrap reuse on non-solve jobs.

### Priority consequence

For short research jobs, pursue in this order:

1. exact runtime identity as a reproducibility correction;
2. sparse/derived input materialization where a real input contract can be proved;
3. exact dependency-tree restore once runtime identity is fixed;
4. only then smaller process/bundle taxes.

For long solve shards, retain the same mechanisms as candidates but activate only when aggregate runner-minute economics or retry latency justify them.
