# Solver workflow and research-evidence remediation plan

> **Status:** completed by PR #1740 on 2026-09-11; retained as a compact historical route, not an active queue.
> **Created:** 2026-09-11.
> **Completion record:** [`solver-workflow-remediation-review-handoff.md`](solver-workflow-remediation-review-handoff.md).
> **Implementation decisions:** [`solver-workflow-remediation-implementation-handoff.md`](solver-workflow-remediation-implementation-handoff.md).
> **Current solver priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method authorities:** [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-level-blindness.md`](solver-level-blindness.md).

## Historical purpose

This program repaired a research system in which similar-looking solver workflows could disagree about population identity, budget meaning, timeout semantics, checkout/ref behavior, historical assistance, completeness, persistence side effects, and what counted as scientifically interpretable evidence.

The completed program established a common v3 experiment-result contract, separated artifact coverage from intended-population and decision-valid completeness, hardened provenance and execution identity, repaired shared publication/combination semantics, retired obsolete workflows, added workflow lifecycle accounting, audited historical evidence, and preserved referee-valid positive solutions even when surrounding experiments were downgraded.

The detailed pre-completion plan remains available in Git history. Do not use that historical checklist as a current implementation queue.

## Durable rules extracted from the program

These rules remain current through the method authorities and executable checks:

- Raw historical evidence is preserved; corrected interpretation is additive rather than rewriting the past.
- Missing, truncated, malformed, infrastructure-error, and unknown observations are indeterminate rather than ordinary negatives.
- A referee-valid positive solution survives defects in the surrounding experiment unless independent referee validation fails.
- Decision-bearing evidence requires intended-population integrity, compatible scientific protocol, and immutable execution provenance. Same row count is not same population or same experiment.
- Cross-SHA paired evidence requires content-addressed subject identity; stable level IDs alone do not prove identical puzzle content across refs.
- Artifact/shard arrival is transport coverage only. It cannot establish scientific completeness.
- Intended populations, not observed rows, define experiment identity and denominators.
- History-aware and level-blind are independent dimensions.
- Partial or indeterminate evidence must not silently mutate canonical baselines, telemetry, or other future-research inputs.
- Paired comparisons require a sealed common population and compatible non-treatment protocol dimensions.
- Composite/reconciled evidence retains the source scientific protocol and source-run provenance; reconciliation identity is recorded separately rather than substituted for the experiment that produced the observations.
- Historical evidence that cannot reconstruct protocol, population, or provenance remains unknown or observational rather than receiving optimistic normalization.
- Rerun the smallest unresolved decision-bearing question. Do not buy broad recomputation merely to make old metadata prettier.

## Current trust route

The machine-readable historical audit authority is:

`reports/stress/solver-evidence-integrity-index.json`

Regenerate it with:

```bash
npm run solver:evidence-integrity-audit
```

The path-triggered solver evidence-integrity guard requires the checked-in index to agree with the current audit implementation when evidence semantics or material audit inputs change.

For the final classifications and historical conclusions produced by this program, use [`solver-workflow-remediation-review-handoff.md`](solver-workflow-remediation-review-handoff.md). For ordinary new solver research, use the current workstream queue and method authorities rather than reopening this completed plan.

## Reopen condition

Reopen remediation work only when a current decision depends materially on evidence that the integrity index classifies as incomplete/invalid, or when a regression demonstrates that the common experiment/evidence contract no longer enforces one of the durable rules above. In that case, create the smallest current-domain repair or rerun; do not reactivate this historical plan wholesale.
