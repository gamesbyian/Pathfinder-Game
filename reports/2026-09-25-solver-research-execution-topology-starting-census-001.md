# Research workflow execution-topology starting census — 2026-09-25

> **Status:** active
> **Last evidence:** 2026-09-25 — exact-runtime parity run 36190221008 and full-vs-sparse targeted-planner rehearsal runs 36187498364 / 36190221143.
> **Decision:** exact Node 22.23.2 is activated for the seven maintained workflows built on the rehearsed level-blind/history-aware producers; targeted-sweep planning now uses the earned sparse input boundary without narrowing caller-selected corpus/ID semantics.
> **Remaining gate:** classify the four non-producer helper/integrity workflows that still float Node 20, then measure exact dependency-tree reuse where bootstrap economics are material.

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

## Hosted sparse-input result

PR rehearsal run `36187498364` compared the live targeted-sweep planner plus one real level-blind canary under full-tree and explicitly sparse materialization.

- full and sparse semantic fingerprints were byte-identical;
- sparse checkout reached the tested PR merge HEAD in about **3.3 s** from checkout start, versus about **45.7 s** for the full-tree arm;
- both arms then ran exact Node 20.20.2, `npm ci`, the same shard planner, the same runtime telemetry input, and the same real canary;
- the sparse contract explicitly retains `data/stress/stress-levels-random.json` and `logs/solver-stress-refresh/corpus2-runtime-telemetry.json`; dropping the telemetry would silently change planning economics and is therefore not an allowed optimization.

Decision: **sparse materialization is earned for this targeted planner/canary boundary.** Production activation should preserve the declared input set and full-tree correctness fallback/rehearsal rather than generalizing immediately to unrelated solve jobs.

## Hosted exact-runtime result

Run `36190221008` compared exact **Node 20.20.2** with CI-proven **Node 22.23.2** after fixing the rehearsal's explicit level-selector contract. Both arms successfully ran the real bundled level-blind and history-aware portfolio producers. After removing only the intentionally different runtime identity field, the semantic fingerprints were byte-identical.

Decision: **Node 22.23.2 is semantically cleared as the candidate exact research runtime for these primary producers.** Production research workflow pinning remains an activation step, not something inferred from a major-version selector.


## Activation update — 2026-09-25

The first production activation deliberately follows the rehearsal boundary rather than chasing superficial uniformity.

Pinned to exact Node **22.23.2** at every setup site:
- `solver-level-blind-targeted-sweep.yml`;
- `solver-stress-refresh.yml`;
- `solver-broad-confirmation.yml`;
- `solver-residual-confirmation.yml`;
- `solver-routing-regime-sample-ab.yml`;
- `solver-highbudget-unsolved-sweep.yml`;
- `solver-production-replay-baseline.yml`.

Those workflows execute the two producer families exercised by runtime parity run 36190221008. The remaining maintained workflow census members are orchestration/harvest/diagnostic/integrity surfaces and are not silently declared scientifically covered by that producer parity result.

The targeted-sweep `plan` job now uses the rehearsed sparse materialization contract. It explicitly retains package manifests, scripts, modules, default Corpus-2, and runtime telemetry. A caller-selected `corpus` is materialized from `HEAD:<path>` before planning/canary execution, and a caller-selected `ids_file` is read from the same immutable dispatched commit rather than requiring the blob to have been physically present in the sparse worktree. This preserves the workflow's existing dispatch semantics while avoiding whole-tree materialization.

The production workflow was also reduced in size during activation rather than raising its grandfathered no-growth ceiling.


## Targeted planner exact dependency-tree reuse

The targeted-sweep plan job now reuses the same exact dependency-tree generation as production CI:

- key: runner OS/arch + exact Node 22.23.2 + exact npm 10.9.8 + `package-lock.json` hash;
- hit path: restore `node_modules`, set up exact Node without npm download-cache restore, skip `npm ci`;
- miss path: exact Node + npm cache, `npm ci --prefer-offline --no-audit --fund=false`, then save the exact tree;
- scientific planner/canary commands and inputs are unchanged.

This activation is limited to the short targeted planner because historical hosted evidence already showed setup/materialization dominating a large share of its pre-science wall. It is not evidence for blanket dependency-tree caching of long solver shards. The first real targeted dispatch after this change is the production economics measurement.


The static topology audit is now schema v3 and reports both exact-22.23.2 setup counts/workflow names and remaining major-only runtime workflow names. Runtime migration scope is therefore mechanically inspectable rather than inferred from this report's prose.
