# GitHub Actions workflow index

This directory contains ordinary CI/deployment workflows plus expensive or sharded solver-research jobs. Use this index before reading YAML files one by one or adding a new workflow.

For local equivalents and broader tool selection, see [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md).

## CI and deployment

| Workflow | Purpose |
|---|---|
| `ci.yml` | Normal repository CI gate. |
| `deploy-pages.yml` | Build/deploy the static Vite site to GitHub Pages. |
| `deploy-firestore-rules.yml` | Firestore rules/index deployment path. |
| `audit-export.yml` | Audit-export workflow. |

## Current solver/corpus research entry points

| Workflow | Reach for it when |
|---|---|
| `solver-stress-refresh.yml` | You need a full sharded refresh of the real stress corpora using the current production solver. Detailed operating notes: [`README-solver-stress-refresh.md`](README-solver-stress-refresh.md). |
| `solver-typical-budget-baseline.yml` | You need current level-blind capability evidence or a matched deterministic baseline/experiment at the standard budget shape. |
| `technique-census.yml` | You need the isolated technique-by-level capability matrix. This is expensive; reconcile with the current census report before re-dispatching. |
| `method-probe-sweep.yml` | You need one named technique or short method list probed over a larger population without running the entire technique census. |
| `solver-highbudget-unsolved-sweep.yml` | The research question specifically asks whether additional compute unlocks unresolved levels. Do not use it as a default response to solver failure. |
| `family-wide-trove.yml` | You need population-scale family/variant research. |
| `atlas-sweep.yml` | You need the existing atlas-style solver research sweep. |
| `mitm-frontier-sweep.yml` | You need the existing meet-in-the-middle/frontier experiment. |

## Oracle / CP-SAT research

- `cpsat-explicit-prefix-oracle.yml`: explicit-prefix CP-SAT oracle work.
- `cpsat-hint-harvest-sweep.yml`: CP-SAT hint-harvest sweep over the configured research population.
- `cpsat-hint-harvest-sweep-published.yml`: published-corpus variant of that harvest workflow.

These are research/oracle instruments. Their output does not become production cold-solver capability merely because it finds a valid path.

## Focused solver experiments

- `solver-repair-fallback-reserve-sample-ab.yml`
- `solver-repair-probe-adaptive-sample-ab.yml`
- `solver-elite-prefix-dfs-retry-validate.yml`

These workflows encode specific experiment shapes. Before reusing them, confirm the tested mechanism and wiring still match the current implementation and that the experiment has not already been concluded or superseded in the current queue/ledger.

## Historical workflow documentation

[`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md) documents the retired multi-branch Corpus-2 batch scheme and the stale-code/merge incidents learned from it. It is historical evidence, not the current dispatch path. Use `solver-stress-refresh.yml` for the current full refresh.

## Before adding or dispatching a workflow

1. Start with [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md) for solver optimization priority and closed forms.
2. Check [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) for a cheaper local/sample tool that answers the same next gate.
3. Search [`../../reports/`](../../reports/README.md) for prior runs of the mechanism.
4. Preserve level-blindness, provenance, deterministic-budget, and experiment-comparability requirements from the current solver docs.
5. For long jobs, keep per-cell/per-level progress recoverable so an interrupted shard does not erase all completed work.

Workflow presence means infrastructure exists. It does not mean the corresponding hypothesis is currently active or worth rerunning.
