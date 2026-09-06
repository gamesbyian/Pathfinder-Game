# Solver future work

Deferred/reopen ideas that are **not current execution priority**. Current priority/state/gates live in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); research method in [`solver-research-operating-model.md`](solver-research-operating-model.md); retained default-OFF dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). The current question/evidence reconciliation is [`../reports/2026-09-05-solver-open-question-evidence-reconciliation.md`](../reports/2026-09-05-solver-open-question-evidence-reconciliation.md).

Prior evidence: `node scripts/research-status-index.mjs --compact --query=<term>`. Historical states: [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) and [`archive/snapshots/solver-future-work-2026-09-04-pre-proposal-consolidation.md`](archive/snapshots/solver-future-work-2026-09-04-pre-proposal-consolidation.md).

## Backlog contract

This file is a **reservoir of deferred questions**, not a second queue or experiment diary.

Before promoting an item, identify:

1. the current limitation/evidence;
2. the cheapest falsifying pilot;
3. comparator and shared-work contract where search policy changes;
4. success/stop gates;
5. a legal level-blind production path for any positive offline result.

If an item becomes active, its live gate moves to the owning workstream/specialist doc. Detailed evidence and chronology go in dated reports. Remove an item when it is answered, promoted, superseded, or no longer has a plausible reopen condition.

Before treating any older-plan question as backlog, first reconcile it against later evidence. An old question is not research debt if a newer report already answers it; carry forward only the smallest unexplained residue.

## Deferred questions

| Question | Reopen condition / boundary |
|---|---|
| **Variant-family capability robustness** | Current census evidence already supports temporal and budget-edge fragility by capability multiplicity/technique family, that multiplicity predicts real *production* success within each corpus separately (6.1% at solverCount=0 → 99.5% at 11+, fresh 1,700-level run), and that doubleton (`solverCount=2`) redundancy is disproportionately same-family (58.5%, no strong structural signature of its own) rather than genuinely cross-technique. Singleton exposure is concentrated by count in `repair`/`beam` (84.6%) despite DFS having the highest per-claim fragility rate. See [`2026-09-04-census-multiplicity-predicts-production-success-001.md`](../reports/2026-09-04-census-multiplicity-predicts-production-success-001.md), [`2026-09-05-multiplicity-production-success-robustness-by-corpus-001.md`](../reports/2026-09-05-multiplicity-production-success-robustness-by-corpus-001.md), [`2026-09-04-doubleton-intra-family-redundancy-001.md`](../reports/2026-09-04-doubleton-intra-family-redundancy-001.md), [`2026-09-05-doubleton-structural-signature-null-001.md`](../reports/2026-09-05-doubleton-structural-signature-null-001.md), [`2026-09-05-singleton-family-plurality-001.md`](../reports/2026-09-05-singleton-family-plurality-001.md). Reopen only with a joinable family/parent data source that can answer the still-untested variant-family clause. Do not rerun the answered temporal/budget-edge/production-success joins. |
| **Four-space triangulation** across input geometry, solution structure, technique response, and live trajectories | Reopen when cheaper refreshed-census/profile/production-response joins expose a repeatable unexplained distinction. |
| **Stability-aware portfolios** | Reopen when temporal retention, parent robustness, or basin diversity identifies a compact decision signal not captured by current work/coverage evidence. |
| **Latent response dimensions / biclusters** | Reopen only if simpler pair/cohort analyses leave stable unexplained response structure. |
| **Forced-decision / backdoor-depth analysis** | Reopen when existing hint-workbench provenance can answer a concrete action-selection or representation question without a new large data campaign. |
| **Repair restart allocation in the near-miss band** | Keep `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT` closed: its W=150M pre-wiring pilot tied restart and continuation 9/36 on bestBadness 7–9. Preserve the independently replicated W=64M fully spent bestBadness<=6 near-miss signal: restart 8/43 vs continuation 3/43, with five restart-only gains and zero losses. Reopen only for a fresh legal population with the same near-miss texture or a changed production allocation contract that makes the band-specific signal actionable. Do **not** rerun the unchanged 150M split or generalize restart over continuation. |
| **Generator/editor-envelope technique niches** | The coarse corpus1-vs-corpus2 axis is answered (corpus1 96.1% solved via a narrower technique repertoire too, vs. corpus2 57.4%; zero node-budget-capped failures in corpus1 this run, n=4). Routing regime does not predict late-ladder-stage reliance but does predict overall multiplicity/production-solved rate, and regime composition itself differs by corpus — a real partial confound behind corpus1's ease. The full production structural risk-factor ranking is now available (led by `constrainedObjects`), though several top entries are collinear (read it as a few underlying dimensions, not independent factors); it has since replicated out-of-sample across two natural holdouts and a second outcome variable (Spearman 0.82-0.90) and jointly with the `frozenT1SupportClass` taxonomy; the same holdout method also caught a would-be false positive (a naive pooled scan for a temporal support-class-churn predictor, Spearman 0.09 on split) — the check itself is now validated both ways. See [`2026-09-04-corpus1-corpus2-stage-share-comparison-001.md`](../reports/2026-09-04-corpus1-corpus2-stage-share-comparison-001.md), [`2026-09-04-corpus1-starvation-profile-001.md`](../reports/2026-09-04-corpus1-starvation-profile-001.md), [`2026-09-04-routing-regime-late-stage-reliance-null-001.md`](../reports/2026-09-04-routing-regime-late-stage-reliance-null-001.md), [`2026-09-04-routing-regime-multiplicity-and-difficulty-001.md`](../reports/2026-09-04-routing-regime-multiplicity-and-difficulty-001.md), [`2026-09-05-routing-regime-composition-by-corpus-001.md`](../reports/2026-09-05-routing-regime-composition-by-corpus-001.md), [`2026-09-04-production-structural-risk-factors-full-replication-001.md`](../reports/2026-09-04-production-structural-risk-factors-full-replication-001.md), [`2026-09-05-structural-risk-factor-multicollinearity-001.md`](../reports/2026-09-05-structural-risk-factor-multicollinearity-001.md). A true generator/editor field remains absent from the census, so finer envelopes than corpus1-vs-corpus2 are still untested — reopen before making broader capability claims when evidence suggests a finer envelope-specific niche. |
| **Minimal technique-niche counterexamples** | Use reducer + exact/reference validation when a claimed niche needs causal isolation. |
| **Typed producer → consumer search artifacts** | Require a demonstrated consumer limitation, novel timely information, bounded production/storage/replay cost, independent control, and matched-work benefit. Do not build a general blackboard. |
| **Queryable analytical layer** | Reopen only if recurring joins among run identity, telemetry, static features, families, labels, and arms still require bespoke scripts after existing join helpers are extended. Generated views must be rebuildable from canonical evidence and cannot become production-policy truth. |

The census cross-evidence plan at [`../reports/2026-09-04-census-cross-evidence-research-plan.md`](../reports/2026-09-04-census-cross-evidence-research-plan.md) is now a **reconciled standing evidence map**, not an active sequential campaign: Gate 0 is complete, the bounded existing-data Gate-1 pilot was inconclusive, and later gates should reopen only when a current workstream poses a concrete question. Residual/search-quality gates already promoted out of this backlog likewise belong in the workstream authority.

## Demoted forms

Do not reopen these unchanged without materially new evidence:

- dead-last whole-ladder retries or global seed fan-out that mainly buy more total work;
- hand-authored scoring profiles whose novelty is only weights/name;
- nearby-threshold widening or broad extra repair budget after full-budget failure;
- generic ALNS/adaptive-operator machinery before complementary operators earn it;
- universal beam-width increases or large novelty/MAP-Elites/DPP machinery before a simple descriptor-aware treatment earns it;
- production ZDD/DD/frontier, representative-set, `REGULAR`/resource-automaton, CEGAR/interpolation, or backdoor frameworks before a bounded residual question demonstrates value;
- exact DFS transposition caching or approximate-interface equivalence caching without new sound recurrence/sufficiency evidence;
- broad CDCL/LCG learning without a recurring compact sound reason family;
- generic RCSP/label-setting or exact-resource dominance without a sound completion-subsumption proof;
- broad symmetry canonicalization/rotate-mirror retries instead of causal first-divergence diagnosis;
- hazard/bandit/ML scheduler machinery before simpler fixed-work evidence demonstrates actionable headroom;
- giant variant generation without an unanswered question and analysis plan;
- full-corpus A/Bs for ideas already falsified causally;
- retaining closed experiment code solely as archive;
- optimizing a proxy after cold solve/work/correctness fails to improve;
- framework-building before the smallest value-of-information pilot succeeds.

Keep this file short. It should contain questions, boundaries, and reopen conditions, not experiment results.
