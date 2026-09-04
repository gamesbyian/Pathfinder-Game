# Reports index

Human-readable investigations and analyses. Raw per-run material belongs in [`logs/`](../logs/). Dated reports are evidence, **not a live roadmap or second queue**.

## Cheap discovery first

Do not scan this directory or preload this index to find prior work. Query the structured report/workstream/evidence index:

```bash
node scripts/research-status-index.mjs --compact --query=<term>
```

Useful refinements:

```bash
node scripts/research-status-index.mjs --compact --query=scheduler
node scripts/research-status-index.mjs --compact --status=active
node scripts/research-status-index.mjs --compact --kind=experiment
node scripts/research-status-index.mjs --compact --kind=evidence --query=must-cross
```

The compact result is the discovery layer. Open the matched report only when its protocol, evidence, caveats, or reasoning is actually needed. If no query resolves the concept, broaden the term or use the current topic doc before listing files.

For current solver decisions start at the synchronized compact [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md); the source workstream authority and full chronology are in [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md).

## Report contract

New or materially revised investigations follow [`../docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md). At minimum preserve:

- status;
- last evidence;
- decision/disposition;
- remaining gate;
- for decision-bearing solver work, evidence role and selection disclosure;
- enough run/data/code provenance to reconstruct what the claim actually refers to.

A report may recommend a local next experiment, but that does not override the live solver queue.

## Naming and provenance

Use `YYYY-MM-DD-<topic>-<kind>.md` for new loose investigations. Prefer a small kind vocabulary such as `design`, `experiment`, `diagnosis`, `analysis`, `reconciliation`, `decision`, or `summary`. Use canonical corpus names `published`, `corpus1`, and `corpus2` in new material.

Do **not** mass-rename old reports simply to modernize terminology or paths. Filenames and historical vocabulary are provenance. When old evidence crosses a renamed contract, use current compatibility/normalization boundaries and, when necessary, [`../docs/solver-research-post-naming-resumption.md`](../docs/solver-research-post-naming-resumption.md).

## Interpreting old evidence

Before reusing a historical result, check:

- whether its treatment/population was selected after seeing outcomes;
- level-blindness versus actual confirmation/generalization status;
- `workSpent`/budget comparability and deadline censoring;
- family/generator dependence and independent unit;
- later attribution, telemetry, naming, or provenance corrections;
- whether the reported metric was a proxy rather than the product objective;
- whether a newer report explicitly supersedes/corrects it.

Reproducible selected-on evidence remains selected-on evidence.

## Current solver authorities

Reports supply evidence to these current references:

- compact priority/front door: [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md)
- source workstream authority/full chronology: [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md)
- research method: [`../docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md)
- scheduling/allocation: [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md)
- evaluation/generalization: [`../docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md)
- residual/future representation: [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md)
- deterministic cost: [`../docs/solver-budget-determinism.md`](../docs/solver-budget-determinism.md)
- level-blindness: [`../docs/solver-level-blindness.md`](../docs/solver-level-blindness.md)
- evidence assets/joins: query `node scripts/research-asset-query.mjs --query=<term>`; full catalogue [`../docs/solver-research-data-assets.md`](../docs/solver-research-data-assets.md)
- default-off dispositions: [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md)
- deferred/reopen ideas: [`../docs/solver-future-work.md`](../docs/solver-future-work.md)

## Data and generated-report areas

Large generated result families under `reports/stress/`, `reports/portfolio/`, and similar subdirectories are normally reached through a report, a compact status query, a tool output, or explicit run provenance. Treat convenience `latest` pointers as navigation, not independent authority; inspect embedded commit/protocol metadata before comparing runs.

Raw run/shard material belongs under [`../logs/`](../logs/README.md). Stress corpus contracts live in [`../data/stress/README.md`](../data/stress/README.md).

## External literature

External-research syntheses and cross-pollination reports are ordinary evidence and are discoverable through the same compact research-status query. Do not maintain a second manual list here; query terms such as `external research`, `literature`, or the mechanism of interest.

## History

Superseded queue snapshots/plans belong in [`../docs/archive/`](../docs/archive/README.md) or its snapshots area. Reports that remain historically useful stay in place with their original dates/names and machine-readable status rather than being rewritten into current terminology.
