# Solver stress-corpus refresh workflow

**Status:** canonical level-blind capability workflow.

`.github/workflows/solver-stress-refresh.yml` measures how many stress puzzles the current solver can solve when each is treated as unseen. Governing contract: [`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md). Budget/determinism rules: [`../../docs/solver-budget-determinism.md`](../../docs/solver-budget-determinism.md).

## Structure

One manual `workflow_dispatch` launches a 20-way matrix. Each shard runs its Corpus-1 slice and 85-level Corpus-2 slice through `scripts/level-blind-capability-sweep.mjs`.

The parent projects source levels through a gameplay-mechanics allowlist into a temporary mechanics-only corpus. It removes IDs, hints, provenance, stress/generator metadata, descriptions, difficulty, and other non-gameplay fields. `scripts/level-blind-capability-worker.mjs` receives only that corpus and no corpus `levelNumber`.

When `persist_hints=true`, hint artifacts are loaded only after solve tasks are isolated, so new solutions/provenance can be saved without becoming solver input.

The combine job:

- downloads all 20 current-run artifacts;
- removes previous live shard files first;
- requires all 102 Corpus-1 and 1700 Corpus-2 rows;
- rejects any `solvedByPrime` row;
- regenerates derived reports/baselines for complete non-deterministic runs;
- optionally persists results/hints.

Both solve and combine jobs check out `${{ github.sha }}`. This prevents queued shards from following a newer branch tip, a failure observed during the 2026-08-11 neighbor-budget A/B.

## Inputs

Defaults are defined in `solver-stress-refresh.yml`; treat that file as authoritative. Key inputs are Corpus-1/2 time and node budgets, worker counts, `enable_flags`, `disable_flags`, late-reserve experiment fields, `persist_hints`, and `deterministic`.

There is no `prime_winner` input.

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

## Persistence and partial runs

The persist step retries rejected pushes with fetch + rebase. Before rebasing it discards tracked modifications the run deliberately did not stage, avoiding a failure mode observed on run `31871824532`.

A run is not accepted as a capability baseline unless combine receives full current-run coverage. Partial artifacts remain diagnostic only. If a shard fails or a runner is reclaimed, dispatch a fresh workflow run rather than rerunning only failed jobs, which can split artifact visibility across attempts.

## Historical notes

The 2026-08-11 level-blind `PRUNE_MC_NEIGHBOR_BUDGET` A/B produced **611/1700 control → 665/1700 treatment** on Corpus 2, with Corpus 1 at 94/102 in both arms. The older **725/1700** figure used exact-level winner replay and is re-verification, not capability. See [`../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md).

The retired persistent-branch workflow and its stale-code/checkpoint incidents are summarized in [`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md).
