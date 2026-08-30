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

## Agent result retrieval

Every maintained solver/research sweep publishes a predictable front-door artifact named `solver-sweep-result`. This is the first place agents should read after a run completes.

The artifact contains:

- `summary.md` — human-readable run provenance plus automatically derived solved/work counts when the result shape exposes them; paired control/treatment outputs also get gained/lost and work-delta summaries.
- `manifest.json` — stable machine-readable provenance: workflow, run id/attempt, SHA, ref, event, run URL, legacy artifact name, publication status, and source-to-published file mapping.
- `result.*` or `result/` — the primary decision-bearing output.
- `files/` — any secondary decision-bearing outputs needed to interpret the primary result.

The publisher also appends `summary.md` to `$GITHUB_STEP_SUMMARY`, so the final job has a useful web-UI summary instead of requiring console-log archaeology.

**Retrieval order for agents:**

1. Prefer the repo helper: `npm run gha:fetch-result -- --run=<run-id>`. If the run id is not known, use `npm run gha:fetch-result -- --workflow=<workflow-file-or-name>` (optionally `--branch=<branch>`); it resolves the latest matching run, downloads only `solver-sweep-result`, and prints `summary.md`.
2. Read `summary.md`, then `manifest.json`, then the referenced result file(s). Add `--json` to print the manifest too, or `--out=<dir>` to retain the downloaded standard artifact.
3. The manifest includes the exact dispatch inputs in addition to workflow/run/SHA/ref provenance. When the workflow exposes reliable shard identity, the summary also reports observed/expected shard completeness.
4. Only enumerate final jobs, legacy artifacts, or shard artifacts when the standard artifact reports missing/incomplete output or when debugging a failed/cancelled run.

The raw GitHub CLI equivalent remains `gh run download <run-id> -n solver-sweep-result`, but agents should normally use `gha:fetch-result` so pagination and artifact naming are not repeatedly rediscovered.

Do not begin a successful-run analysis by listing every shard job or artifact. GitHub and connector listings are paginated, and large sweeps can place the combine job or decision-bearing artifact beyond the first page. The standard artifact exists specifically to make shard count irrelevant to ordinary result retrieval.

Legacy workflow-specific combined artifacts remain for compatibility and richer/raw retention. `solver-sweep-result` is an additional retrieval interface, not a replacement for evidence retention.

Workflow `run-name` values also include the inputs most useful for distinguishing nearby dispatches in the Actions list. Workflows that commit durable research reports write a small `gha-source-run` provenance sidecar with the originating run URL/id, SHA/ref, dispatch inputs, and completeness record, so agents can navigate report → run without reconstructing history.

## Core capability

- `solver-stress-refresh.yml` — canonical level-blind full refresh over Corpus 1 + Corpus 2. Default 60 shards / 20 lanes / 4 workers; node/work ceilings normally bind. Hint capture is always on; deterministic runs defer canonical hint persistence to the harvester.
- `solver-typical-budget-baseline.yml` — typical-budget baseline. Already heavily oversharded; its ordinary wall deadlines are semantically meaningful, so worker-count changes require matched measurement.
- `solver-highbudget-unsolved-sweep.yml` — high-budget unsolved sweep with runtime-weighted bin packing and dedicated slow-level handling.
- `solver-level-blind-targeted-sweep.yml` — targeted level-blind sweep using the weighted planner.

## Sample A/B

- `solver-routing-regime-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-early-repair-search-adaptive-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.
- `solver-repair-fallback-reserve-sample-ab.yml` — 60 shards / 20 lanes / 4 workers.

These use non-binding deterministic deadlines by default, so node/work budgets remain the comparison basis while cross-level parallelism changes calendar time. Their artifact/report evidence is still harvested even though they do not eagerly mutate canonical hints during the experiment.

All three share `scripts/plan-ab-corpus-shards.mjs` for the mandatory Corpus 1 + published + Corpus 2 sample matrix. Corpus 1 is split into several shards (same levels-per-shard density as the Corpus 2 sample) and scheduled *before* the Corpus 2 shards in the matrix array, since GitHub Actions starts matrix jobs in array order up to `max-parallel`: a single unsharded Corpus 1 job placed last does not get a lane until multiple rounds of Corpus 2 shards have already completed, and Corpus 1's own per-level cost (stress levels, not published) then runs long on top of that late start — becoming the run's tail straggler by a wide margin (observed 17-28 minutes solo vs. a few minutes per Corpus 2 shard). Model any new corpus-matrix workflow on the fixed form.

## Broad confirmation

- `solver-broad-confirmation.yml` — generates one fresh, sealed level cohort and runs a control/treatment level-blind capability A/B against it in a single workflow run (so both arms provably see the byte-identical cohort artifact). `generator=random` (default) uses `generate-random.mjs`, the witness-first family Corpus 2 also uses — this is still valid **same-generator confirmation** when a one-off fresh cohort is cheaper than maintaining a locked block pool; it is not cross-generator transfer merely because the seed is new. `generator=topology` uses `generate-topology.mjs` instead — a materially different macro-maze/module construction that never calls `generateWitness()` — for cross-generator **transfer/challenge** evidence after a candidate has earned that expense; check [`docs/solver-evaluation-evidence.md#suitability-and-expansion-gate`](../../docs/solver-evaluation-evidence.md#suitability-and-expansion-gate) first, since the topology generator's v0.1 scope omits several mechanics. Freeze the candidate/gate first and read the aggregate verdict before inspecting changed IDs. For repeated selected candidates, prefer the block-consumption model in [`docs/solver-evaluation-evidence.md`](../../docs/solver-evaluation-evidence.md) and extend plumbing only when that repeated need actually exists.
- `solver-residual-confirmation.yml` — two-phase **conditional confirmation** for a fixed candidate whose claim concerns levels the current control fails. Phase 1 generates a fresh pool and runs *control only*; `freeze-residual` seals the control-failure subset before treatment outcomes exist; phase 2 runs the real control/treatment A/B on that residual. This is a legitimate one-off confirmation design, not a broad solve-rate estimate or cross-generator transfer. Once that residual's outcomes influence redesign it is development evidence for descendants. The workflow's treatment/control resolved-flag artifacts and fail-fast wiring checks are mandatory provenance safeguards; preserve them in any future block-pool adaptation.

## Technique and method sweeps

- `technique-census.yml` — isolated technique census. `workers` defaults to 4; outer layout remains 120 shards / 20 lanes. Referee-valid discoveries are always retained; there is no hint-retention dispatch toggle.
- `method-probe-sweep.yml` — isolated method/config probe. Default 60 outer shards / 20 lanes and 4 disjoint probe processes per runner. Each runner bundles once; the combiner validates metadata, duplicate IDs, missing worker outputs, and deadline-truncated work-bounded rows. Set `work_budget` for decision-bearing/equal-cost research; blank preserves the legacy wall+node probe semantics.

## CP-SAT / reference-model work

- `cpsat-hint-harvest-sweep.yml` — 60 shards / 20 lanes for highly variable per-level runtime.
- `cpsat-hint-harvest-sweep-published.yml` — smaller published-level matrix.
- `cpsat-explicit-prefix-reference.yml` — independent prefix cases sharded across 20 runners, then coverage-checked and combined.
- `collect-prune-gap-labels.yml` — 60 fixed interleaved buckets behind 20 lanes; smaller trials select a literal subset rather than repartitioning.
- `mitm-frontier-sweep.yml` — curated per-level MITM frontier experiments.

Do not infer that CP-SAT search workers should equal runner vCPUs; compare representative runs because those workers also diversify search.

## Other batch research

- `family-wide-trove.yml` — native solver work already defaults to 4 workers per runner; its hints belong to generated variants under `data/families`, not canonical levels.
- `solver-elite-prefix-dfs-retry-validate.yml` — targeted elite-prefix validation; valid paths are serialized for the isolated-evidence harvester.

## Repository / diagnostic workflows

These are not solver-batch entrypoints, but remain listed here for workflow discoverability checks: `ci.yml`, `audit-export.yml`, `deploy-pages.yml`, and `deploy-firestore-rules.yml`. Completed one-shot diagnostics belong in dated reports, not in the maintained workflow surface.

Use the narrowest workflow whose evidence semantics match the question. Capability workflows must remain level-blind. Avoid creating a new batch runner merely for different parallelism: common entrypoints now expose or implement the worker/shard controls needed to trade concurrent footprint against tail latency.

## One-shot diagnostics (delete after use)

`confirm-residual-003-recombine-one-shot.yml` recombined confirm-residual-003's already-completed phase-2 shard artifacts (run 33054538000) using the fixed combine logic, after the original run's combine-phase2 job failed on an unrelated file-glob bug (the new `*-flags.json` per-shard provenance file matched the same glob the combine step used to find sweep reports). Dispatched once as run 33083577386 (result: control 0/516, treatment 3/516, +3/-0, work +0.15%), then deleted per this section's own retention rule -- see reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md for the full record.

`confirm-residual-001-archetype-audit-one-shot.yml` and `confirm-residual-002-archetype-audit-one-shot.yml` were both deleted once their answers were recorded, per this section's own retention rule (see reports/2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md for confirm-residual-002's). The plain Node script both used (`scripts/stress/audit-candidate-eligibility-and-participation.mjs`, not a workflow, so not subject to this section) is retained under `scripts/stress/` since re-running it locally against a small repro is far cheaper than a fresh GHA dispatch, and the routing-regime-eligibility-vs-scheduling questions it diagnoses are likely to recur for other candidates in a trailing-reserve window; re-add a thin one-shot workflow wrapper like the deleted ones if a future candidate needs the same cross-run artifact pull again. `worker-pool-concurrency-determinism-diag-one-shot.yml` (merged via PR #1515, dispatched once, deleted the same day) followed the same pattern to answer whether real `--workers=4` concurrency on the actual production runner class changes a level's node/work trajectory — see reports/2026-08-27-worker-pool-concurrency-determinism-diagnosis.md.

`repair-restart-continuation-pilot-one-shot.yml` sharded `scripts/stress/compare-repair-restart-continuation-population.mjs`'s existing research harness by `--offset`/`--limit` ranges (fixed census order) so a large-`W` population pilot — individual levels observed to take anywhere from ~1 to ~9 minutes per arm — ran in wall time bounded by the slowest shard rather than the slowest full population. Dispatched twice (a first run, `33123273899`, had a workflow bug — missing `--sample-every=1` — that silently covered only 22/36 of the intended population and was discarded; the corrected run, `33124980404`, covered the full 36-level population) to answer reports/2026-08-27-repair-restart-continuation-production-candidate-design.md's "Required pre-wiring pilot": result was a clean null (continuation 9/36, restart 9/36, 0 gains/losses) — see reports/2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md. Deleted per this section's own retention rule now that the answer is recorded. The underlying script (not a workflow, so not subject to this rule) is retained, since the same sharded-dispatch need (`--count-only`, `--min-badness`, `--sample-every`) is likely to recur for any future W-scale check on this research line.