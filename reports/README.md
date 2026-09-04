# Reports index

Dated reports are evidence, **not a roadmap or second queue**. Raw per-run material belongs in [`logs/`](../logs/).

## Find prior work

Do not scan the directory. Query the structured index:

```bash
node scripts/research-status-index.mjs --compact --query=<term>
```

Optional filters: `--status=...`, `--kind=queue|experiment|evidence`. Open only the matched report whose protocol, evidence, caveats, or reasoning you need.

Current solver priority/state/gates: [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md).

## Report contract

New or materially revised investigations follow [`../docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md). Preserve at minimum:

- status and last evidence;
- decision/disposition and remaining gate;
- evidence role and selection disclosure for decision-bearing solver work;
- enough run/data/code provenance to reconstruct the claim.

A report may recommend a local next experiment; it does not override the workstream authority.

## Naming and provenance

Use `YYYY-MM-DD-<topic>-<kind>.md` for new loose investigations and canonical current terminology in new material. Do not mass-rename historical reports: filenames and historical vocabulary are provenance. Use current compatibility/normalization boundaries, and [`../docs/solver-research-post-naming-resumption.md`](../docs/solver-research-post-naming-resumption.md) when frozen pre-cleanup names/contracts materially affect interpretation.

## Reusing old evidence

Check:

- selection/tuning history;
- level-blindness versus confirmation/generalization status;
- `workSpent`/budget comparability and deadline censoring;
- family/generator dependence and independent unit;
- later attribution/telemetry/provenance corrections;
- proxy metric versus product objective;
- explicit supersession/correction by newer evidence.

Reproducible selected-on evidence remains selected-on evidence.

## Current solver authorities

- priority/state/gates: [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md)
- research method: [`../docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md)
- scheduling/allocation: [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md)
- evaluation/generalization: [`../docs/solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md)
- deterministic cost: [`../docs/solver-budget-determinism.md`](../docs/solver-budget-determinism.md)
- level-blindness: [`../docs/solver-level-blindness.md`](../docs/solver-level-blindness.md)
- evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`; topology guide [`../docs/solver-research-data-assets.md`](../docs/solver-research-data-assets.md)
- default-off dispositions: [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md)
- deferred/reopen ideas: [`../docs/solver-future-work.md`](../docs/solver-future-work.md)

Large generated result families should be reached through report provenance or compact queries. Treat `latest` pointers as navigation, not authority; inspect embedded commit/protocol metadata before comparison.

Stress corpus contracts: [`../data/stress/README.md`](../data/stress/README.md). Archive/history: [`../docs/archive/`](../docs/archive/README.md).
