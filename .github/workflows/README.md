# GitHub Actions workflow index

Use this index and [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) before adding or opening research workflows.

## Core workflows

| Workflow | Purpose |
|---|---|
| `ci.yml` | Repository CI gate. |
| `deploy-pages.yml` | Vite/GitHub Pages deployment. |
| `deploy-firestore-rules.yml` | Firestore rules/index deployment. |
| `audit-export.yml` | Audit export. |
| `solver-stress-refresh.yml` | Canonical **full-population** sharded level-blind stress refresh; [`solver-stress-refresh.md`](solver-stress-refresh.md). Use for baseline refreshes and non-archetype-scoped questions — for an `ATTEMPT_POLICY` routing-change A/B, prefer `solver-archetype-sample-ab.yml` below instead (same evidence, a fraction of the wall time). |
| `solver-typical-budget-baseline.yml` | Level-blind baseline or matched deterministic experiment. |
| `technique-census.yml` | Expensive isolated technique × level census; check existing census first. |
| `method-probe-sweep.yml` | One technique or short technique list over a population. |
| `solver-highbudget-unsolved-sweep.yml` | Additional-compute study on unresolved levels. |
| `solver-level-blind-targeted-sweep.yml` | **Preferred for a one-off check over a specific, caller-supplied id list** (not a full refresh, not archetype-scoped) — dynamically sharded, artifact-only, no baseline/hint persistence. |
| `solver-archetype-sample-ab.yml` | **Preferred default for validating/promoting an archetype-gated `ATTEMPT_POLICY` routing change** (the common case for `modules/solver/attempts.ts` fixes) — stratified-sample A/B, general form of the retained per-flag sample-A/B workflows below. A rule change can only affect levels whose archetype it touches, so this draws a deterministic seeded sample from the affected archetype(s) plus a small control sample from every other archetype (catches scope leakage empirically) instead of re-sweeping the full 1700-level corpus to reconfirm zero-effect everywhere else. Used to validate the 2026-08-22 archetype-routing fixes in a fraction of `solver-stress-refresh.yml`'s wall time. |
| `family-wide-trove.yml` | Population-scale family work; check the existing ~2.5 GB trove first. |
| `atlas-sweep.yml` | Atlas research sweep. |
| `mitm-frontier-sweep.yml` | Meet-in-the-middle/frontier experiment. |

Family guidance and existing trove: [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md).

`solver-stress-refresh.yml`, `method-probe-sweep.yml`, and `solver-archetype-sample-ab.yml` all take `shard_count` and `max_parallel` inputs (added 2026-08-22): more/smaller shards for finer-grained progress, `max_parallel` capped below `shard_count` to bound the run's concurrent-job footprint without lengthening wall time — an idle lane immediately grabs the next queued shard instead of the whole run waiting on the slowest of one big simultaneous batch. This is the fix for multi-hour GHA sweeps creating dead time, especially with paired A/B arms; tune it down before dispatching alongside other in-flight GHA work rather than accepting hours of serialized/blocked wall time. See `solver-stress-refresh.md`'s own `max_parallel` section for the full mechanism.

## Oracle / CP-SAT

- `cpsat-explicit-prefix-oracle.yml`
- `cpsat-hint-harvest-sweep.yml`
- `cpsat-hint-harvest-sweep-published.yml`

Oracle output is research evidence, not cold production capability by itself.

## Retained focused experiments

`solver-repair-fallback-reserve-sample-ab.yml`, `solver-repair-probe-adaptive-sample-ab.yml`, and `solver-elite-prefix-dfs-retry-validate.yml` remain available. Confirm the question is still open and the wiring still matches current code before reuse.

## Specialist diagnostics

- `audit-technique-census-duplicates.yml`: path-triggered audit of duplicate technique-census rows using the retained forensic script.
- `diagnose-technique-census-duplicates.yml`: path-triggered deeper duplicate-cell diagnosis and plan inspection; specialist investigation workflow, not a general census entry point.

Retired workflow designs, naming history, and migration incidents are preserved in git history and dated reports; do not use old fixed Corpus-2 batch commands for current dispatches.

## Before dispatching or adding a workflow

1. Check [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md) and prior reports.
2. Check [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) for a cheaper local/sample tool.
3. **Validating or promoting an `ATTEMPT_POLICY` routing change?** Use `solver-archetype-sample-ab.yml`, not a full-population `solver-stress-refresh.yml` sweep, unless the change's blast radius genuinely isn't archetype-bounded. This is the default instrument for that question as of 2026-08-22, not an alternative to consider only when the full sweep is inconvenient.
4. For family work, check [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md) and the existing trove.
5. Preserve level-blindness, provenance, deterministic-budget, experiment-comparability, and recoverable-progress rules.
6. Tune `shard_count`/`max_parallel` (where the workflow offers them) before dispatching, especially alongside other in-flight GHA work — see the note above the workflow table.

Workflow presence means infrastructure exists, not that its hypothesis is active.
