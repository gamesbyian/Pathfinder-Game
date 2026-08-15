# Solver stress-corpus refresh workflow

Status: **canonical level-blind capability workflow**.

See [`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md) for the governing product contract and [`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md) for the retired persistent-branch design history.

## Purpose

`.github/workflows/solver-stress-refresh.yml` answers one primary question:

> If Pathfinder is handed these puzzles as if they were newly created in the level editor, how many can the current solver solve under this budget/configuration?

Every solve is level-blind. Exact-level historical information and corpus identity are forbidden as solver inputs.

The workflow may save a newly found solution after the solve, but it may not use saved hints, previous solutions, previous winning strategies/gates/seeds, previous solved status, baseline-derived per-level budgets/order, attempt caches, permanent level IDs, or corpus positions to decide the current solve.

The old `--prime-winner` path is intentionally absent from this workflow. It remains available in `portfolio-solve-sweep.mjs` for explicit historical re-verification research only.

## Structure

One manual `workflow_dispatch` launches a 20-way matrix. Each shard runs:

- its Corpus-1 slice;
- its 85-level Corpus-2 slice;
- `scripts/level-blind-capability-sweep.mjs` for both.

The capability sweep reads the source corpus in the parent process, projects each level through an explicit **gameplay-mechanics allowlist**, and writes a temporary mechanics-only corpus. That copy excludes ID, hints, provenance, stress/generator metadata, descriptions, difficulty and any other non-gameplay field. `scripts/level-blind-capability-worker.mjs` reads only that temporary corpus and prepares every puzzle without a corpus `levelNumber` before calling `Solver.solve()`.

External hint artifacts are loaded only by the parent process when `persist_hints=true`, after solve tasks have been isolated, so newly found paths/provenance can be recorded on the output side. The solver worker cannot load those artifacts.

The `combine` job downloads all 20 artifacts, removes any checked-out previous live shard files before laying down the current run, combines the two corpora, verifies full coverage and that no row was `solvedByPrime`, regenerates derived stress metadata/baselines for complete runs, uploads a combined artifact, and optionally persists the result/hints.

## Immutable run identity

Both solve and combine jobs check out `${{ github.sha }}`, not a mutable branch ref.

This was hardened after the 2026-08-11 neighbor-budget A/B: run #32's dispatch metadata pointed at `ddb3ef...`, but queued shard jobs followed a later `main` tip and actually ran `c86ba8...`. All A/B shards happened to converge on the same actual SHA, so the experiment remained interpretable, but future runs must not rely on that luck.

## Inputs

All are optional:

- `corpus2_budget_ms` default `86400000`;
- `corpus2_node_budget` default `50000000` (unified with `corpus1_node_budget` 2026-08-12 — previously `36000000`, an asymmetry traced to a stale wall-clock ratio with no corpus-specific justification; see `corpus1_node_budget`'s own description in the workflow file);
- `corpus2_workers` default `2`;
- `enable_flags` default blank;
- `disable_flags` default blank;
- `main_loop_late_reserve_fraction` default blank;
- `main_loop_late_reserve_config_count` default blank;
- `persist_hints` default `true`;
- `corpus1_budget_ms` default `86400000`;
- `corpus1_node_budget` default `50000000`;
- `corpus1_workers` default `2`;
- `deterministic` default `false`.

There is deliberately **no `prime_winner` input**.

`workers=1` remains level-blind because it still uses the dedicated mechanics-only child-worker path. Concurrency changes throughput, not solver knowledge.

## Normal capability refresh

Use the defaults unless testing a specific flag/configuration. A complete non-deterministic run:

- solves every level from mechanics-only level data;
- persists newly found hints/provenance when `persist_hints=true`;
- updates the live combined reports and compiled baselines (skipped when `deterministic=true`);
- **always** stores a compact run-scoped summary (solved IDs, counts, nodes/work, SHA/config) under `reports/stress/capability-runs/<run-id>/summary.json`, plus a per-level projection (per level: id, ok, status, nodesExpanded, workSpent, winningConfig, failedStrategies, solution) under `.../per-level-corpus1.json` and `.../per-level-corpus2.json` — unconditional on `persist_hints`/`deterministic` (2026-08-15+), since this is the only durable, git-fetchable per-level record: the uploaded combined Actions artifact lives on Azure blob storage, whose download has been observed blocked (403) by at least one Claude sandbox's egress policy. If a GHA capability run finishes and its result can't be fully analyzed afterward, that's a workflow bug, not an expected limitation — this per-run directory exists so that never has to be true.

The compiled baseline is an **output summary of the completed level-blind run**. It is not fed back into later capability solves. Full reports remain in ordinary git history plus the 90-day combined Actions artifact; the compact per-run record avoids duplicating a very large report file on every refresh.

## Matched A/B mode

For experiment arms use:

```text
deterministic=true
persist_hints=false
```

This forces a non-binding 24h per-level wall deadline and prevents one arm from mutating the shared/interpretive branch state (hint corpus, canonical baselines) before the next arm is dispatched. Node/work ceilings remain the decision-bearing resource bounds. The run-scoped analysis summary described above still gets committed under this combination — it is namespaced by run id and never read back into any solve, so it cannot let one arm influence another's measurement; only the shared files above are guarded by `persist_hints`/`deterministic`.

The persist step retries a rejected push (another commit landing on the branch mid-run, e.g. an unrelated `chore(audit)` auto-commit) via fetch + rebase, discarding any leftover unstaged modifications to tracked files this run deliberately chose not to stage first (otherwise the rebase itself fails with "You have unstaged changes" and the whole persist step — hints included — silently drops; this happened on run `31871824532`, 2026-08-15).

Schema-v2 experiment manifests capture every workflow input. The treatment may differ only in dimensions explicitly named by the experiment protocol.

## Main-loop late-reserve dispatch shape

Common:

```text
corpus2_budget_ms=86400000
corpus2_node_budget=36000000
corpus2_workers=1
disable_flags=
main_loop_late_reserve_config_count=4
persist_hints=false
corpus1_budget_ms=86400000
corpus1_node_budget=50000000
corpus1_workers=1
deterministic=true
```

Control:

```text
enable_flags=
main_loop_late_reserve_fraction=
```

Treatments set:

```text
enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE
main_loop_late_reserve_fraction=0.05   # then 0.10, 0.15 in separate arms
```

See [`../../docs/main-loop-late-reserve-experiment.md`](../../docs/main-loop-late-reserve-experiment.md).

## 2026-08-11 capability anchor

The revised `PRUNE_MC_NEIGHBOR_BUDGET` A/B, intentionally run without exact-level priming, produced:

- control: 611/1700 Corpus 2;
- treatment: 665/1700;
- +54 net, 59 gained / 5 lost;
- Corpus 1 94/102 in both arms;
- treatment C2 nodes -3.94%; canonical work -5.33%.

The historical 725/1700 result used exact-level winner replay and is a re-verification count, not a capability baseline. See [`../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md).

## Failure / partial runs

A result is not accepted as a capability baseline unless combine sees all 102 Corpus-1 and all 1700 Corpus-2 rows from the **current run**. The combine step deletes prior live shard files before laying down artifacts specifically so a missing current shard cannot silently be filled by yesterday's output.

Partial results are still uploaded as artifacts for diagnosis, but the workflow refuses to persist a compiled capability baseline from incomplete coverage.

If a runner is reclaimed or a shard fails, dispatch a fresh workflow run. Re-running only failed jobs can produce split-attempt artifact visibility problems because the combine job may not see successful artifacts from the earlier attempt.
