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

**Retention is not an experimental treatment.** Hint/provenance capture is output-only, so disabling retention does not improve level-blindness or A/B isolation. Canonical solver workflows should therefore retain every referee-valid discovery and should not expose a dispatch switch whose purpose is to discard it. A workflow may defer the canonical merge to the harvester when eager writes would create contention, but the evidence itself must still survive in artifacts or reports.

`harvest-solver-evidence.yml` runs after the canonical-level hint-producing workflows complete and persists recoverable evidence onto canonical `main`:

- Existing hint artifacts, including native-solver and CP-SAT harvest output, are structurally merged by path/provenance across `data/hints`, `data/stress/hints`, and `data/stress/hints-random`; they are never copied last-writer-wins.
- Artifact-only level-blind runs reconstruct canonical provenance from their persisted solved rows and winning attempts. Hint capture remains output-only, so this does not feed history back into the solve.
- Direct/isolated tools such as `method-probe`, technique census, and elite-prefix validation retain actual valid paths with `isolatedTechnique=true`, preserving the distinction from competitively-budgeted production-ladder capability.
- Any future isolated validation tool that can discover a path should serialize `{ isolatedTechnique: true, corpus, rows:[{ ok, solution, attempts, ... }] }` so the generic importer can retain it without another bespoke persistence path.
- Failed or cancelled workflows are harvested too; completed shard output can contain a novel solve even when the overall run fails later.
- Evidence that cannot safely attach to current `main` because the level/corpus changed or the path no longer referee-validates is committed under `reports/stress/pending-solver-evidence/` rather than discarded.
- Competing persistence runs serialize and replay semantic merges against latest `main`; do not line-rebase hint JSON.

The harvester downloads artifacts with `gh run download`. Do not replace that with the cross-run `actions/download-artifact` path without revalidating pagination: this repo has observed that path truncate runs with more than 100 artifacts. It also supports manual `workflow_dispatch` with an existing source run id, so old runs or failed harvest attempts can be backfilled without rerunning the solver.

This retention layer is a safety net. Individual workflows may still save hints immediately when convenient, but branch-local persistence is no longer the only durable copy. Variant-family hints under `data/families` are intentionally outside this canonical-level harvester because they belong to generated variant levels and are retained by the family research trove instead.

## Core capability

- `solver-stress-refresh.yml` — canonical level-blind full refresh over Corpus 1 + Corpus 2. Default 60 shards / 20 lanes / 4 workers; node/work ceilings normally bind. Hint capture is always on; deterministic runs defer canonical hint persistence to the harvester.
- `solver-typical-budget-baseline.yml` — typical-budget baseline. Already heavily oversharded; its ordinary wall deadlines are semantically meaningful, so worker-count changes require matched measurement.
- `solver-highbudget-unsolved-sweep.yml` — high-budget unsolved sweep with runtime-weighted bin packing and dedicated slow-level handling.
- `solver-level-blind-targeted-sweep.yml` — targeted level-blind sweep using the weighted planner.

## Sample A/B

- `solver-archetype-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-repair-probe-adaptive-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-repair-fallback-reserve-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.

These use non-binding deterministic deadlines by default, so node/work budgets remain the comparison basis while cross-level parallelism changes calendar time. Their artifact/report evidence is still harvested even though they do not eagerly mutate canonical hints during the experiment.

All three share `scripts/plan-ab-corpus-shards.mjs` for the mandatory Corpus 1 + published + Corpus 2 sample matrix. Corpus 1 is split into several shards (same levels-per-shard density as the Corpus 2 sample) and scheduled *before* the Corpus 2 shards in the matrix array, since GitHub Actions starts matrix jobs in array order up to `max-parallel`: a single unsharded Corpus 1 job placed last does not get a lane until multiple rounds of Corpus 2 shards have already completed, and Corpus 1's own per-level cost (stress levels, not published) then runs long on top of that late start — becoming the run's tail straggler by a wide margin (observed 17-28 minutes solo vs. a few minutes per Corpus 2 shard). Model any new corpus-matrix workflow on the fixed form.

## Broad confirmation

- `solver-broad-confirmation.yml` — generates one fresh, sealed, uniform-random level cohort and runs a control/treatment level-blind capability A/B against it in a single workflow run (so both arms provably see the byte-identical cohort artifact — see the workflow's own header comment for why this differs from the two-dispatch Sample A/B pattern above). Use this for the confirmation step of the repository's confirmation/transfer cohort protocol (`reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md`): reserve a never-before-used `master_seed`/`id_prefix` before dispatch, freeze the candidate/gate first, and read the printed aggregate solved/gains/losses verdict before inspecting any changed level id.
- `solver-residual-confirmation.yml` — two-phase confirmation for a candidate whose eligible population is a strict superset of `needsRepairFallback`'s gate (or is otherwise mined from a residual-miss analysis), where a plain `solver-broad-confirmation.yml` cohort risks zero participation no matter how large (`confirm-broad-003`/`004` both came back byte-identical aggregate work in both arms — see the cohort-reservation report). Phase 1 generates a fresh pool and runs the *control* ladder alone across it; a `freeze-residual` job then filters the pool down to exactly the levels control failed to solve, seals that as a new residual corpus, and computes a phase-2 shard count from its actual size (unknown before phase 1 completes). Phase 2 runs the real control/treatment A/B only on that frozen residual. Reserve a never-before-used `master_seed`/`id_prefix`/`cohort_id` before dispatch, same discipline as broad confirmation; a residual's composition must not be reused for a different candidate once inspected.

## Technique and method sweeps

- `technique-census.yml` — isolated technique census. `workers` defaults to 4; outer layout remains 120 shards / 20 lanes. Referee-valid discoveries are always retained; there is no hint-retention dispatch toggle.
- `method-probe-sweep.yml` — isolated method/config probe. Default 60 outer shards / 20 lanes and 4 disjoint probe processes per runner. Each runner bundles once; the combiner validates metadata, duplicate IDs, and missing worker outputs.

## CP-SAT / reference-model work

- `cpsat-hint-harvest-sweep.yml` — 60 shards / 20 lanes for highly variable per-level runtime.
- `cpsat-hint-harvest-sweep-published.yml` — smaller published-level matrix.
- `cpsat-explicit-prefix-oracle.yml` — independent prefix cases sharded across 20 runners, then coverage-checked and combined.
- `atlas-sweep.yml` — 60 fixed interleaved buckets behind 20 lanes; smaller trials select a literal subset rather than repartitioning.
- `mitm-frontier-sweep.yml` — curated per-level MITM frontier experiments.

Do not infer that CP-SAT search workers should equal runner vCPUs; compare representative runs because those workers also diversify search.

## Other batch research

- `family-wide-trove.yml` — native solver work already defaults to 4 workers per runner; its hints belong to generated variants under `data/families`, not canonical levels.
- `solver-elite-prefix-dfs-retry-validate.yml` — targeted elite-prefix validation; valid paths are serialized for the isolated-evidence harvester.

## Repository / diagnostic workflows

These are not solver-batch entrypoints, but remain listed here for workflow discoverability checks: `ci.yml`, `audit-export.yml`, `audit-technique-census-duplicates.yml`, `diagnose-technique-census-duplicates.yml`, `deploy-pages.yml`, and `deploy-firestore-rules.yml`.

Use the narrowest workflow whose evidence semantics match the question. Capability workflows must remain level-blind. Avoid creating a new batch runner merely for different parallelism: common entrypoints now expose or implement the worker/shard controls needed to trade concurrent footprint against tail latency.

## One-shot diagnostics (delete after use)

`confirm-residual-002-archetype-audit-one-shot.yml` — same purpose and shape as the now-deleted `confirm-residual-001-archetype-audit-one-shot.yml` (pulls `solver-residual-confirmation.yml` run artifacts cross-run via `download-artifact`'s `run-id` input and runs `scripts/stress/confirm-residual-001-archetype-audit.mjs` against them), re-added to audit `confirm-residual-002` (dispatched against the 2026-08-26 main-loop WORK-budget reserve fix) after it repeated `confirm-residual-001`'s byte-identical-work signature. Will be deleted once its answer is recorded, per this section's own retention rule. The plain Node script itself (not a workflow, so not subject to this section) is retained under `scripts/stress/` since re-running it locally against a small repro is far cheaper than a fresh GHA dispatch, and the archetype-eligibility-vs-scheduling gap it diagnoses is likely to recur for other candidates in a trailing-reserve window; re-add a thin one-shot workflow wrapper like this one if a future candidate needs the same cross-run artifact pull again.