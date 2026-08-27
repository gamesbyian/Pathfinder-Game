# Reports index

Human-readable investigations and analysis. Raw per-run material belongs in [`logs/`](../logs/). Dated reports are evidence, **not a live roadmap**.

For current decisions start at [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) and the owning topic doc. To find prior evidence without opening this whole directory, run:

```bash
node scripts/research-status-index.mjs --compact --query=<term>
```

New or materially revised investigations follow [`../docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md): status, last evidence, decision, remaining gate, and for decision-bearing solver work an evidence role plus selection disclosure.

## Naming and interpretation

Use `YYYY-MM-DD-<topic>-<kind>.md` for new loose investigations. Prefer a small kind vocabulary such as `design`, `experiment`, `diagnosis`, `analysis`, `reconciliation`, `decision`, or `summary`. Use canonical corpus names `published`, `corpus1`, and `corpus2`. Do not mass-rename old reports; filenames are provenance.

When reusing older evidence, check selection/tuning history, level-blind vs held-out status, `workSpent` comparability, deadline censoring, family dependence, later attribution/provenance fixes, and whether the reported metric was only a proxy. Reproducible selected-on evidence is still selected-on evidence.

## Current solver routing

These current docs own decisions; reports supply evidence:

- priority: [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md)
- research method: [`../docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md)
- scheduling/allocation: [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md)
- residual/future representation: [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md)
- deterministic cost: [`../docs/solver-budget-determinism.md`](../docs/solver-budget-determinism.md)
- level-blindness/generalization: [`../docs/solver-level-blindness.md`](../docs/solver-level-blindness.md)
- default-off dispositions: [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md)
- deferred/reopen ideas: [`../docs/solver-future-work.md`](../docs/solver-future-work.md)
- tooling: [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md)

### Recent decision-bearing anchors

Use these as evidence for the corresponding queue item, not as alternate priority lists:

- current capability/priority reconciliation: [`2026-08-25-capability-sweep-976-reconciliation.md`](2026-08-25-capability-sweep-976-reconciliation.md)
- post-976 portfolio exposure/depth rejoin: [`2026-08-25-post-976-portfolio-exposure-rejoin.md`](2026-08-25-post-976-portfolio-exposure-rejoin.md)
- selective diverse-IH development A/B: [`2026-08-25-selective-diverse-ih-exposure-development-ab.md`](2026-08-25-selective-diverse-ih-exposure-development-ab.md)
- selective diverse-IH independent confirmation: [`2026-08-25-diverse-ih-confirm-broad-002-freeze.md`](2026-08-25-diverse-ih-confirm-broad-002-freeze.md)
- must-cross+flipper-heavy plain WIDE beam exposure development A/B (development-positive, awaiting confirmation): [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)
- scheduler static repricing: [`2026-08-25-scheduler-static-repricing-join.md`](2026-08-25-scheduler-static-repricing-join.md), [`2026-08-24-scheduler-evidence-contract-audit.md`](2026-08-24-scheduler-evidence-contract-audit.md)
- corrected former P0 attribution: [`2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md), [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md)
- locked confirmation/transfer cohorts: [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md)
- beam extinction/retention: [`2026-08-25-beam-full-pool-survivor-projection.md`](2026-08-25-beam-full-pool-survivor-projection.md), [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md)
- exact/reference support: [`2026-08-23-solver-reference-model-capability-audit.md`](2026-08-23-solver-reference-model-capability-audit.md)
- restart allocation: [`2026-08-24-restart-continuation-value-audit.md`](2026-08-24-restart-continuation-value-audit.md), execution-readiness harness: [`2026-08-26-restart-continuation-execution-readiness.md`](2026-08-26-restart-continuation-execution-readiness.md), near-miss development pilot (corrected — tie, no detected restart effect): [`2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md) (supersedes [the original](2026-08-26-restart-vs-continuation-near-miss-development-pilot.md), which had a best-badness metric bug), larger-W confirmation (replicated positive): [`2026-08-26-restart-continuation-larger-w-confirmation.md`](2026-08-26-restart-continuation-larger-w-confirmation.md), production candidate design (pre-wiring pilot required): [`2026-08-27-repair-restart-continuation-production-candidate-design.md`](2026-08-27-repair-restart-continuation-production-candidate-design.md)
- learned failure: [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md)
- repair reconstructability: [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)
- execution substrate: [`2026-08-24-speed-substrate-static-audit.md`](2026-08-24-speed-substrate-static-audit.md), scorer pilot (closed negative): [`2026-08-26-current-head-specialized-scorer-pilot.md`](2026-08-26-current-head-specialized-scorer-pilot.md), beam cost breakdown (nominates fused-kernel pilot): [`2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md), fused plain-candidate kernel pilot (closed negative): [`2026-08-27-fused-plain-candidate-kernel-pilot.md`](2026-08-27-fused-plain-candidate-kernel-pilot.md)

Current budget-depth evidence: [`2026-08-23-technique-budget-cap-efficiency.md`](2026-08-23-technique-budget-cap-efficiency.md). The underlying technique census is heavily mined development evidence, not a fresh confirmation set.

## External literature reference set

The compact synthesis is [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md). Pairwise cross-pollination: [`2026-08-24-external-research-cross-pollination-audit.md`](2026-08-24-external-research-cross-pollination-audit.md). Final addendum: [`2026-08-24-third-wave-cross-pollination-addendum.md`](2026-08-24-third-wave-cross-pollination-addendum.md).

Reference memos:

- [`deep-research-report.md`](deep-research-report.md) — LNS/ALNS/repair
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md) — nogoods/conflict learning
- [`beam-deep-research-report.md`](beam-deep-research-report.md) — survivor selection/diversity
- [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md) — portfolios/continuation value
- [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md) — symmetry/representation bias
- [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md) — residual feasibility/capacity
- [`exact-attainability-upper-capacity-deep-research.md`](exact-attainability-upper-capacity-deep-research.md) — attainable spectra/upper capacity
- [`future-equivalence-basin-width-deep-research.md`](future-equivalence-basin-width-deep-research.md) — future equivalence/basin width
- [`structured-repair-reconstruction-deep-research.md`](structured-repair-reconstruction-deep-research.md) — structured repair
- [`infeasibility-certificates-deep-research.md`](infeasibility-certificates-deep-research.md) — structural infeasibility certificates
- [`censored-continuation-symmetry-randomization-deep-research.md`](censored-continuation-symmetry-randomization-deep-research.md) — censoring/randomization
- [`frontier-zdd-decision-diagrams-deep-research.md`](frontier-zdd-decision-diagrams-deep-research.md) — frontier/ZDD/DD methods
- [`automaton-resource-global-constraints-deep-research.md`](automaton-resource-global-constraints-deep-research.md) — automaton/resource global constraints
- [`abstraction-refinement-backdoors-core-guided-deep-research.md`](abstraction-refinement-backdoors-core-guided-deep-research.md) — refinement/backdoors/core-guided methods

Durable vocabulary distilled from these memos belongs in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md), not in a new roadmap.

## Subdirectories and loose data

- [`families/`](families/) — family evidence; current entry point [`../docs/variant-level-research.md`](../docs/variant-level-research.md)
- [`portfolio/`](portfolio/) — concluded historical portfolio experiment
- [`stress/`](stress/) — benchmark/profile/census outputs; some are live tooling inputs, so do not bulk-move/delete
- [`solver-determinism/`](solver-determinism/) — determinism investigation evidence
- `hint-workbench/` — gitignored local workbench output
- `solver-winning-attempts.json` — generated by `scripts/analyze-solver-winning-attempts.mjs`
- `hint-selection.json` — historical July hint-selection calibration artifact; retained evidence, not a current task

## Report hygiene

- Put chronology/measurements here; keep live policy in topic docs.
- Closed reports need an explicit decision and `Remaining gate: none` when complete.
- State intended/actual population, independent unit, missing/excluded/truncated rows, gains/losses, and relevant work/cost.
- Disclose post-hoc candidate/population/threshold/metric selection.
- Link superseding evidence where useful; do not rewrite old measurements as though they used later methods.
- Promote durable conclusions into the owning current doc while leaving experiment detail here.
- Check consumers before moving/deleting generated collections.
