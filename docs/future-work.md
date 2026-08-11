# Future Work

This is the **live queue and status source of truth for genuinely open work**. Completed campaigns and historical evidence belong in topic docs and dated reports. Last reconciled: **2026-08-11**, after PR #1358 and the remote-handoff hardening follow-up.

Use the pipeline in [`solver-research-operating-model.md`](solver-research-operating-model.md): semantic truth → controlled evidence → failure classification → missing representation → shadow evaluation → narrow intervention → population verdict. A read-only correlation is not permission to change a score or hard prune.

## Ready for remote execution

The exact commands, workflow inputs, dependencies, and stop conditions are in [`claude-remote-solver-handoff.md`](claude-remote-solver-handoff.md).

1. **Revised `PRUNE_MC_NEIGHBOR_BUDGET` full Corpus-2 A/B (first production gate).** The caller-policy correction is complete: stochastic repair `takePly` suppresses the prune, while DFS, beam, and deterministic repair sub-searches retain it. Generate fresh schema-v2 preflight manifests from one clean remote `main` SHA, including all decision-relevant workflow dispatch inputs, compare them, then dispatch fresh OFF/ON arms over all 1,700 levels at 36,000,000 canonical nodes per level and a non-binding 86,400,000 ms deadline. The prior +14 result does not decide the corrected wiring.
2. **Contrastive-prefix CP-SAT labels.** Use the dedicated default-off execution seam `.github/workflows/cpsat-explicit-prefix-oracle.yml`: process the existing 12 abstentions first, then a bounded committed set of informative same-parent siblings near lineage extinctions. Preserve `live`, `dead`, and `timeout/abstain` as distinct labels and referee-check every SAT witness.
3. **Exact repair retreat census.** Reuse the same explicit-prefix CP-SAT workflow with bounded retreat-prefix case files to locate the latest retreat point with a demonstrated continuation. This is a causal-window measurement, not a new repair operator.
4. **`STRATEGY_MAIN_LOOP_LATE_RESERVE` full A/B.** After the neighbor-budget result is recorded, generate fresh schema-v2 preflight pairs that record reserve fraction/config count and the other workflow inputs, then run the frozen protocol in [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md). Keep the experiments separate.

## Locally completed

- Neighbor-budget caller-policy correction and independent diagnostics participation.
- Winning-lineage observation at generation, hard prune, dedup, score/width, and diversity boundaries; observation OFF/ON behavior parity is tested.
- Structural solution-family identity correction (portal use, crossing placement, and must-cross first-entry/completion order rather than exact path identity).
- Same-configuration 30-level Corpus-1 beam cohort: **13 solved / 17 failed**, width 100, default profile, 100,000-node budget. Mean normalized last-known-support depth was approximately **0.505 solved vs 0.239 failed**. Failed final loss was **15/17 score/width** and **2/17 dedup**, with zero hard-prune correctness alarms.
- Score/width extinction forensics for those 15 failures and solved controls. See [`../reports/2026-08-11-winning-lineage-score-width-forensics.md`](../reports/2026-08-11-winning-lineage-score-width-forensics.md). The open question is now **why the score/width boundary removes the remaining known-winning structure**, not how to build lineage instrumentation.
- Residual-interface 20-level / 288-solution census: **31,351** exact represented-state-preserving occurrences reduced to **845** unique translation-invariant signatures; **201** cross structural solution families, but only **14** cross levels.
- Inspection and held-out check of those 14 signatures. See [`../reports/2026-08-11-residual-interface-cross-level-inspection.md`](../reports/2026-08-11-residual-interface-cross-level-inspection.md). The remaining question is whether any independently recurring motif merits further study, not how to build substitution machinery.
- Experiment manifest/preflight schema v2: records solver flags **and workflow dispatch inputs**, with strict arm comparison that allows only explicitly declared treatment dimensions.
- Exact-prefix CP-SAT GitHub execution seam: reads existing atlas abstentions or generic committed case lists, reuses `cpsat-full-probe.py --prefix`, referee-validates SAT witnesses, and keeps unknown/unsupported/model failures as abstentions. It has not been dispatched in this local cleanup.

## Still conditional—not authorized now

These require the remote evidence above and a separately frozen experiment before implementation or promotion:

- any production beam-retention intervention, score change, width change, or dedup change;
- beam→repair live handoff or receptor consumption;
- repair surgery, another repair operator, or production repair-RNG change;
- residual-interface substitution, separator DP, or CEGAR;
- a full interoperability blackboard;
- a differential reducer without a new recurring cross-family trigger.

The strongest currently supportable **future experiment**, after remote labels arrive, is a narrow observation-matched retention counterfactual at score/width extinction (tie-neutral structural-family quota/secondary reservoir), holding production scoring and width fixed. It is not yet a production change.

## Other open observation work

- Run the existing crossing-slack analyzer on its intended atlas/population and treat negative slack on a known-valid prefix as a correctness alarm.
- Run wide family-boundary analysis as a routing layer: robust failures suggest representation gaps, fragile failures suggest retention/order, and starved fitting configurations suggest allocation.
- Keep the optional beam→repair receptor counterfactual behind the oracle/lineage results.

For default-off feature status, see [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Do not infer promotion from `OPT_IN_FEATURES` membership.

## Older loose-thread triage (2026-08-07)

Compatibility anchor for historical reports: the former loose-thread list was reconciled into canonical topic documents or closed evidence and is not an active queue. Use the sections above for current work.
