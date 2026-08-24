# Reports — index

Human-readable analysis and investigation output. Raw per-run material belongs in [`logs/`](../logs/).

New or materially revised human-authored investigations use [`docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md). In addition to status/decision/gate, decision-bearing solver reports state **evidence role** (`discovery`, `tuning`, `confirmation`, `transfer`, or `forensic`) and **selection** (`prespecified`, `observational`, or selected after inspecting results). Generated summaries use their generator/run metadata instead.

This matters because a report can be perfectly reproducible yet still be selected-on evidence. Reproducibility does not erase tuning, multiple-candidate search, family correlation, or repeated holdout peeking.

## Naming

New loose human-authored investigations use `YYYY-MM-DD-<topic>-<kind>.md`. Prefer a small kind vocabulary such as `design`, `experiment`, `diagnosis`, `analysis`, `reconciliation`, `decision`, or `summary`; do not encode transient status such as `active` or `negative` when report metadata already owns it. Use canonical corpus terms `published`, `corpus1`, and `corpus2` rather than `random`/`randoms` for new names.

Generated current pointers may use `*-latest.*`; dated snapshots must not also be named `latest`. Do not mass-rename historical reports merely to enforce the current convention: their filenames are provenance, and the research index provides discovery across older vocabulary.

## Dated solver investigations

Loose `YYYY-MM-DD-<topic>.md` files are evidence, not a live queue. Do not reconstruct current priorities chronologically from them. Use [`docs/README.md`](../docs/README.md) to route to current authorities, especially:

- [`solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md): **canonical ranked research priority**, including the P0 stage-dependence blocker and current scheduler/generalization/configuration/reference/restart work.
- [`solver-research-operating-model.md`](../docs/solver-research-operating-model.md): research method, stop rules, evidence roles, selection/generalization and promotion contract.
- [`solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md): bounded action selection, continuation-value/tranche repricing, portfolio construction, configuration/racing and scheduler complexity gates.
- [`solver-budget-determinism.md`](../docs/solver-budget-determinism.md): shared-work budget and deterministic comparison contract.
- [`solver-level-blindness.md`](../docs/solver-level-blindness.md): runtime information boundary and distinction between level-blindness and statistical generalization.
- [`solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md): retained/default-off mechanism dispositions.
- [`solver-future-work.md`](../docs/solver-future-work.md): deferred ideas with pilot/success/stop gates.
- [`variant-level-research.md`](../docs/variant-level-research.md): family/variant evidence, symmetry first-divergence policy, and independent-unit rules.
- [`solver-architecture.md`](../docs/solver-architecture.md): durable implementation reference.

A dated report can remain valid evidence after its recommendation is superseded. Prefer its explicit status/evidence-role/selection/decision block, then reconcile with the current topic reference before acting.

## Interpreting older reports

Most historical reports predate the current evidence-role convention. Do not retroactively assume `confirmation` merely because a run was large or level-blind.

When reusing an older result, ask:

- Was the treatment/profile/threshold/cohort chosen after inspecting the same population?
- Was the run level-blind, primed, hint-guided, or historical re-verification?
- Were treatment and control at comparable `workSpent`, or did one buy additive work?
- Were wall deadlines binding?
- Are rows independent, or are many siblings from the same family?
- Did code/stage attribution/provenance later change?
- Was the reported metric a proxy such as badness, lineage survival, similarity, or catch rate rather than cold solve/work?

If these cannot be established, use the result for nomination/forensics and rerun a current narrow test before a production decision.

## Current research reset and execution designs

The 2026-08-23 process review is preserved in [`2026-08-23-solver-research-process-critique-and-reprioritization.md`](2026-08-23-solver-research-process-critique-and-reprioritization.md). It is historical rationale, **not** a second live roadmap: it maps the project's main process/engineering criticisms to the current queue and operating-model corrections.

Three active dated designs turn the highest-leverage criticisms into falsifiable next work without creating new permanent authorities:

- [`2026-08-23-solver-portfolio-repricing-design.md`](2026-08-23-solver-portfolio-repricing-design.md): first scheduler experiment — current action/reach/`workSpent` join, tail audit, cap/tranche repricing, fixed-envelope oracle/Pareto headroom, then a deliberately simple static-policy baseline before dynamic scheduler infrastructure.
- [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md): first renewable development → confirmation → transfer/challenge protocol, including population reclassification after exact failure inspection and parent-family grouping.
- [`2026-08-23-solver-reference-model-capability-audit.md`](2026-08-23-solver-reference-model-capability-audit.md): current CP-SAT/reference capability and validation audit; it also reconciles the previously stale must-cross external-model support description against native legality and the CP-SAT edge-axis encoding.

The 2026-08-24 [`external-research-pathfinder-synthesis`](2026-08-24-external-research-pathfinder-synthesis.md) is a **narrowing rationale**, not a fourth live roadmap. It now reconciles eleven external research memos against Pathfinder's existing experiments. The second wave sharpens residual-interface/future-opportunity reasoning, structured repair, structural failure certificates, censored continuation value, and randomized symmetry diagnosis without creating new queue items. Durable next-work language remains in the queue, scheduler policy, `solver-future-work.md`, and `variant-level-research.md`.

### External literature reference memos

These are compact, corrected research references. They are inputs to the synthesis, not implementation instructions.

First wave:
- [`deep-research-report.md`](deep-research-report.md): LNS/ALNS/repair, emphasizing reachability, reconstruction, effective neighborhood size, and feasibility restoration.
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md): exact-state memory versus reusable structural failure explanations.
- [`beam-deep-research-report.md`](beam-deep-research-report.md): survivor-set quality, diversity, novelty, and the state-abstraction problem.
- [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md): sequential portfolios, censoring, continuation value, marginal contribution, and complexity ladder.
- [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md): heuristic invariance versus search equivariance and representation-induced finite-budget bias.
- [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md): exact-resource attainability, lower/upper residual capacity, topology/cuts, relaxations, and soundness cautions for exact targets.

Second wave:
- [`exact-attainability-upper-capacity-deep-research.md`](exact-attainability-upper-capacity-deep-research.md): attainable-resource spectra, residue summaries, equality-resource dominance, and structural upper-capacity bounds.
- [`future-equivalence-basin-width-deep-research.md`](future-equivalence-basin-width-deep-research.md): continuation equivalence/substitutability, interface/context abstractions, completion counts, frozen structure, and basin-width proxies.
- [`structured-repair-reconstruction-deep-research.md`](structured-repair-reconstruction-deep-research.md): plan-repair unrefinement/refinement, repair windows, dependency-guided reopening, and residual reconstruction regimes.
- [`infeasibility-certificates-deep-research.md`](infeasibility-certificates-deep-research.md): structural/resource certificates, UNSAT cores, MUS/MCS/IIS distinctions, minimization, and safe explanation generalization.
- [`censored-continuation-symmetry-randomization-deep-research.md`](censored-continuation-symmetry-randomization-deep-research.md): conditional residual runtime, latent instance hardness, censoring, randomized equivariance, and semantic RNG coupling.

The P0 cross-stage dependency did **not** receive a duplicate report: [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md) remains the active evidence record and already owns its enabling-prefix/lower-bound-cache next gate.

## Current census/scheduler evidence

- [`2026-08-20-technique-census-reconciliation.md`](2026-08-20-technique-census-reconciliation.md) records successful population census run `32240161854`; [`2026-08-19-technique-census-design.md`](2026-08-19-technique-census-design.md) is its design/calibration record. The census matrix is heavily mined **development evidence**, not a fresh confirmation set.
- [`2026-08-23-technique-budget-cap-efficiency.md`](2026-08-23-technique-budget-cap-efficiency.md) is the current budget-depth interpretation of that census: beam searches are often cheap/self-exhausting screens, plain repair has material deep yield, and deep ordinary DFS/IDA work should compete for residual work rather than receive automatic entitlement. Durable policy lives in [`solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md) and [`solver-budget-determinism.md`](../docs/solver-budget-determinism.md).

Repository-wide current open-question reconciliation: [`2026-08-23-documentation-open-question-reconciliation.md`](2026-08-23-documentation-open-question-reconciliation.md). Older loose-thread inventory: [`2026-08-06-documentation-loose-threads-audit.md`](2026-08-06-documentation-loose-threads-audit.md), itself dated evidence.

## Subdirectories

- [`families/`](families/): family backing data and analyses. Current entry point: [`docs/variant-level-research.md`](../docs/variant-level-research.md).
- [`portfolio/`](portfolio/): concluded fast-portfolio-scheduler experiment; historical verdict only, not authority for the new scheduler program.
- [`stress/`](stress/): benchmark/profile/census and other stress outputs. Some are live tooling inputs; do not bulk-move/delete. See [`data/stress/README.md`](../data/stress/README.md).
- [`solver-determinism/`](solver-determinism/): determinism investigation evidence.
- `hint-workbench/`: gitignored local workbench output; do not commit.

## Loose top-level data

- `solver-winning-attempts.json`: generated by `scripts/analyze-solver-winning-attempts.mjs`.
- `hint-selection.json`: historical July 2 read-only hint-selection calibration artifact used to tune the player-facing curator; retained as evidence with no current generator/consumer or open task. Provenance was reconciled in [`2026-08-11-future-work-hygiene-reconciliation.md`](2026-08-11-future-work-hygiene-reconciliation.md).

## Report hygiene

- Put chronology and measurements here, not in undated current-state docs.
- Closed reports need an explicit decision and remaining gate (`none` when complete).
- Decision-bearing solver reports disclose evidence role and how the candidate/population/threshold was selected.
- If many alternatives were tried, report the meaningful search range/count; do not present the maximum arm as a prespecified single treatment.
- Report intended and actual population, independent unit, missing/excluded/truncated rows, gains/losses, and relevant work/cost.
- Do not label a selected-on population “validation” or “holdout” after its exact outcomes influenced design.
- Link superseding reports both ways; do not rewrite old measurements as if they used later methods.
- Promote durable conclusions into the current topic doc while leaving experiment detail here.
- Check consumers before moving/deleting generated report collections; some are tooling inputs.