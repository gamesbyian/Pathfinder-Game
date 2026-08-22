# Solver stress-corpus refresh workflow

**Status:** canonical level-blind capability workflow.

`.github/workflows/solver-stress-refresh.yml` measures how many stress puzzles the current solver can solve when each is treated as unseen. Governing contract: [`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md). Budget/determinism rules: [`../../docs/solver-budget-determinism.md`](../../docs/solver-budget-determinism.md).

## Before dispatching: is this the right workflow?

This is the canonical **full-population** (all 1700 Corpus-2 + all 102 Corpus-1) capability instrument — use it for baseline refreshes, non-archetype-scoped experiments, and any claim that needs complete-population coverage. For a narrower question it is usually the wrong tool and will cost 1-2+ hours of wall time to answer something a smaller run answers in minutes:

- **Validating an `ATTEMPT_POLICY` routing change gated by `detectArchetype()`** (the common case for `modules/solver/attempts.ts` fixes) → [`solver-archetype-sample-ab.yml`](solver-archetype-sample-ab.yml) instead. A rule change can only affect levels whose archetype it touches, so a uniform full-corpus sweep spends nearly all its compute reconfirming zero-effect elsewhere. The archetype-sample workflow draws a deterministic seeded sample from the affected archetype(s) plus a small control sample from every other archetype (to empirically catch scope leakage) and reports the same solved/gained/lost evidence in a fraction of the runtime. This is how the 2026-08-22 archetype-routing fixes' final A/B was actually validated (see [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md) Priority 7) after the originally-planned full-population arm was cancelled as too slow.
- **A one-off check over a specific, caller-supplied set of level IDs** (not archetype-scoped, not a full refresh) → [`solver-level-blind-targeted-sweep.yml`](solver-level-blind-targeted-sweep.yml) instead — dynamically sharded, artifact-only, no baseline/hint persistence.
- **One technique (or a short list) over a population** → `method-probe-sweep.yml` (also has `shard_count`/`max_parallel`, see below).

Reach for a full-population run when a decision genuinely needs complete coverage (a baseline refresh, a non-archetype-scoped mechanism, or promoting a change whose blast radius isn't cleanly archetype-bounded) — not by default.

## Structure

One manual `workflow_dispatch` launches an N-way matrix, N = the `shard_count` input (default 20, unchanged from before 2026-08-22). A tiny `plan` job sizes the matrix and scales each shard's corpus1/corpus2 timeout inversely to `shard_count` (fewer, bigger shards need more time each), clamped under the GitHub-hosted 360min/job ceiling. Each shard runs its corpus-1 slice and its `1700/shard_count`-level corpus-2 slice through `scripts/level-blind-capability-sweep.mjs`.

The parent projects source levels through a gameplay-mechanics allowlist into a temporary mechanics-only corpus. It removes IDs, hints, provenance, stress/generator metadata, descriptions, difficulty, and other non-gameplay fields. `scripts/level-blind-capability-worker.mjs` receives only that corpus and no corpus `levelNumber`.

When `persist_hints=true`, hint artifacts are loaded only after solve tasks are isolated, so new solutions/provenance can be saved without becoming solver input.

The combine job:

- downloads all current-run shard artifacts (however many `shard_count` produced);
- removes previous live shard files first;
- requires all 102 Corpus-1 and 1700 Corpus-2 rows;
- rejects any `solvedByPrime` row;
- regenerates derived reports/baselines for complete non-deterministic runs;
- optionally persists results/hints.

Both solve and combine jobs check out `${{ github.sha }}`. This prevents queued shards from following a newer branch tip, a failure observed during the 2026-08-11 neighbor-budget A/B.

## Inputs

Defaults are defined in `solver-stress-refresh.yml`; treat that file as authoritative. Key inputs are Corpus-1/2 time and node budgets, worker counts, `enable_flags`, `disable_flags`, late-reserve experiment fields, `persist_hints`, `deterministic`, and `shard_count`.

There is no `prime_winner` input.

`shard_count` (default 20) trades concurrent runner slots for wall time per shard: lower it (e.g. 10) so a full-population run fits alongside other GHA work — a matched A/B pair, or a same-sized second sweep — without exhausting the account's concurrent-job limit. Do not exceed 102 (corpus-1's level count) or some shards get zero corpus-1 coverage (the workflow detects and skips this per-shard rather than mis-covering it, but coverage is still worse). Going far below 10 risks a shard not finishing its slice inside GitHub-hosted runners' 360-minute/job hard ceiling even with the scaled timeout — lower node/work budgets to compensate if so.

`max_parallel` (default 20, added 2026-08-22): caps how many shards run concurrently, independent of `shard_count`. This is the actual fix for GHA tail latency, not `shard_count`: raising `shard_count` alone (more, smaller shards) does nothing for wall time if they all still start together and the run waits on the slowest of that whole batch. Lowering `max_parallel` below `shard_count` lets a runner that finishes early immediately pick up the next queued shard, so total wall time tracks the corpus's real total work divided by however many lanes you actually have, not the worst single shard in one big cohort. Tune both together: more/smaller shards (`shard_count` up) with a capped `max_parallel` gets you both fine-grained progress and a bounded concurrent-job footprint. `method-probe-sweep.yml` and `solver-archetype-sample-ab.yml` carry the same `shard_count`/`max_parallel` pair for the same reason.

`workers=1` remains level-blind because the dedicated mechanics-only worker path is still used.

## Normal refresh

Use defaults unless testing a named configuration. A complete run:

- solves every level from mechanics-only data;
- persists new hints/provenance when enabled;
- updates live combined reports/baselines when appropriate;
- always stores a compact run-scoped record under `reports/stress/capability-runs/<run-id>/`: `summary.json` plus per-level Corpus-1/2 projections.

The run-scoped record is the durable, git-fetchable analysis artifact. It exists because Actions artifacts may be inaccessible from some sandboxes. A completed capability run that cannot later be analyzed from repository data is a workflow defect.

Compiled baselines are outputs only. They are never fed into later capability solves.

## Matched A/B mode

For decision-bearing experiment arms use:

```text
deterministic=true
persist_hints=false
```

This makes the wall deadline non-binding and prevents one arm from mutating shared hint/baseline state before the next. Node/work ceilings remain the resource bounds. Run-scoped summaries are still committed because they are namespaced and never solver inputs.

Experiment manifests record all workflow inputs. Arms may differ only in dimensions named by the protocol.

Since 2026-08-22, matched-A/B dispatches (`deterministic=true`, `persist_hints=false`) each get their own concurrency group instead of sharing the workflow-wide one — they touch no shared repo state beyond their own run-id-namespaced `reports/stress/capability-runs/<run-id>/` directory, so control and treatment can run at the same time rather than queuing behind each other (previously the whole pair serialized under one `solver-stress-refresh` group, roughly doubling matched-A/B wall time for no correctness reason). Combine that with a lower `shard_count` on both arms to keep each arm's concurrent-job footprint within the account limit. Any dispatch that CAN mutate shared state (`deterministic=false` or `persist_hints=true`) still serializes under the single shared group, against every other run of this workflow.

## Persistence and partial runs

The persist step retries rejected pushes with fetch + rebase. Before rebasing it discards tracked modifications the run deliberately did not stage, avoiding a failure mode observed on run `31871824532`.

A run is not accepted as a capability baseline unless combine receives full current-run coverage. Partial artifacts remain diagnostic only. If a shard fails or a runner is reclaimed, dispatch a fresh workflow run rather than rerunning only failed jobs, which can split artifact visibility across attempts.

## Historical notes

The 2026-08-11 level-blind `PRUNE_MC_NEIGHBOR_BUDGET` A/B produced **611/1700 control → 665/1700 treatment** on Corpus 2, with Corpus 1 at 94/102 in both arms. The older **725/1700** figure used exact-level winner replay and is re-verification, not capability. See [`../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md).

The retired persistent-branch workflow and its stale-code/checkpoint incidents are summarized in [`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md).
