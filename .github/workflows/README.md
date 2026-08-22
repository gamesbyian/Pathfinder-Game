# GitHub Actions workflow index

Use this index and [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) before adding or opening research workflows.

## Core workflows

| Workflow | Purpose |
|---|---|
| `ci.yml` | Repository CI gate. |
| `deploy-pages.yml` | Vite/GitHub Pages deployment. |
| `deploy-firestore-rules.yml` | Firestore rules/index deployment. |
| `audit-export.yml` | Audit export. |
| `solver-stress-refresh.yml` | Canonical sharded level-blind stress refresh; [`solver-stress-refresh.md`](solver-stress-refresh.md). |
| `solver-typical-budget-baseline.yml` | Level-blind baseline or matched deterministic experiment. |
| `technique-census.yml` | Expensive isolated technique × level census; check existing census first. |
| `method-probe-sweep.yml` | One technique or short technique list over a population. |
| `solver-highbudget-unsolved-sweep.yml` | Additional-compute study on unresolved levels. |
| `solver-level-blind-targeted-sweep.yml` | On-demand level-blind sweep over a caller-supplied id list, dynamically sharded; artifact-only. |
| `solver-archetype-sample-ab.yml` | Stratified-sample A/B for an archetype-gated `attempts.ts` routing change; general form of the retained per-flag sample-A/B workflows below. |
| `family-wide-trove.yml` | Population-scale family work; check the existing ~2.5 GB trove first. |
| `atlas-sweep.yml` | Atlas research sweep. |
| `mitm-frontier-sweep.yml` | Meet-in-the-middle/frontier experiment. |

Family guidance and existing trove: [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md).

## Oracle / CP-SAT

- `cpsat-explicit-prefix-oracle.yml`
- `cpsat-hint-harvest-sweep.yml`
- `cpsat-hint-harvest-sweep-published.yml`

Oracle output is research evidence, not cold production capability by itself.

## Retained focused experiments

`solver-repair-fallback-reserve-sample-ab.yml`, `solver-repair-probe-adaptive-sample-ab.yml`, and `solver-elite-prefix-dfs-retry-validate.yml` remain available. Confirm the question is still open and the wiring still matches current code before reuse.

The retired persistent-branch Corpus-2 design is summarized in [`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md).

## Before dispatching or adding a workflow

1. Check [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md) and prior reports.
2. Check [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) for a cheaper local/sample tool.
3. For family work, check [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md) and the existing trove.
4. Preserve level-blindness, provenance, deterministic-budget, experiment-comparability, and recoverable-progress rules.

Workflow presence means infrastructure exists, not that its hypothesis is active.
