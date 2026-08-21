# GitHub Actions workflow index

This directory is a second research CLI: ordinary CI/deployment plus expensive or sharded solver
jobs. Use this index and [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) before
opening YAML files one by one or adding another workflow.

## CI and deployment

| Workflow | Purpose |
|---|---|
| `ci.yml` | Normal repository CI gate. |
| `deploy-pages.yml` | Vite/GitHub Pages deployment. |
| `deploy-firestore-rules.yml` | Firestore rules/index deployment. |
| `audit-export.yml` | Audit export. |

## Current solver/corpus research

| Workflow | Reach for it when |
|---|---|
| `solver-stress-refresh.yml` | Full sharded refresh of current stress corpora. See [`README-solver-stress-refresh.md`](README-solver-stress-refresh.md). |
| `solver-typical-budget-baseline.yml` | Level-blind capability baseline or matched deterministic experiment. |
| `technique-census.yml` | Full isolated technique-by-level matrix. Expensive; check the existing census first. |
| `method-probe-sweep.yml` | One named technique/short list over a larger population. |
| `solver-highbudget-unsolved-sweep.yml` | The question specifically concerns additional compute on unresolved levels. |
| `family-wide-trove.yml` | Population-scale family/variant work. **Existing generated trove:** ~2.5 GB on research branch `claude/variant-levels-solver-insights-tpk4qg`; read [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md) before dispatching another family campaign. |
| `atlas-sweep.yml` | Existing atlas-style research sweep. |
| `mitm-frontier-sweep.yml` | Existing meet-in-the-middle/frontier experiment. |

## Oracle / CP-SAT research

- `cpsat-explicit-prefix-oracle.yml`: explicit-prefix CP-SAT work.
- `cpsat-hint-harvest-sweep.yml`: configured research-population hint harvest.
- `cpsat-hint-harvest-sweep-published.yml`: published-corpus harvest.

Oracle output is research evidence, not production cold-solver capability by itself.

## Focused solver experiments

- `solver-repair-fallback-reserve-sample-ab.yml`
- `solver-repair-probe-adaptive-sample-ab.yml`
- `solver-elite-prefix-dfs-retry-validate.yml`

Confirm that the mechanism/wiring still matches current code and that the question remains open
before reusing these workflows.

## Historical workflow documentation

[`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md) records the retired multi-branch
Corpus-2 batch scheme and stale-code/merge incidents. It is historical evidence, not the current
full-refresh path.

## Before adding or dispatching a workflow

1. Check [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md).
2. Check [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) for a cheaper local/sample tool.
3. For family work, check [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md)
   and the existing research-branch trove before generating more data.
4. Search [`../../reports/`](../../reports/README.md) for prior runs.
5. Preserve level-blindness, provenance, deterministic-budget, and experiment-comparability rules.
6. Keep long-job progress recoverable per cell/level.

Workflow presence means infrastructure exists, not that its hypothesis is active.
