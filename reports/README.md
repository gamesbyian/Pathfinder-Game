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
- gate-sequence (C) rung 2 static portfolio construction pilot (EW1 greedy ranking vs. real production win frequency; nominates a candidate, does not implement it): [`2026-09-02-static-portfolio-construction-pilot.md`](2026-09-02-static-portfolio-construction-pilot.md); population-scale confirmation-001 (top-11-by-win-count, closed negative, 11/74 lost) with its per-level winning-technique attribution addendum: [`2026-09-02-static-portfolio-confirmation-001-preflight.md`](2026-09-02-static-portfolio-confirmation-001-preflight.md); the attribution-motivated specialist add-back candidate (`portfolio-18-specialists`, 98.5% coverage/44.4% work-saving on a fresh disjoint population — better than `portfolio-11` but 1 loss, still not zero-loss-safe; recommends reframing the next gate as a coverage/work frontier question rather than another add-back iteration): [`2026-09-02-static-portfolio-confirmation-002-preflight.md`](2026-09-02-static-portfolio-confirmation-002-preflight.md); the resulting coverage/work Pareto-frontier characterization (5 cardinalities, one shared fresh population): `portfolio-18-specialists` Pareto-dominates both a same-cardinality plain prefix and a larger 26-technique prefix, and now has two independent fresh-population confirmations at ~98% coverage/~45-48% work-saving — rung 2's cardinality/composition question is closed as sufficiently characterized: [`2026-09-02-static-portfolio-confirmation-003-preflight.md`](2026-09-02-static-portfolio-confirmation-003-preflight.md)
- production-wiring feasibility for `portfolio-18-specialists` (Workstream 2 items (a)-(d)): the admissible-order-reserve caveat resolved by construction, not experiment (structurally absent from the fixed-menu/per-technique-cap design): [`2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md`](2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md); the three reserve-gated admissible-order profiles' real solve rate/cost, filling the last cap-sizing gap: [`2026-09-03-admissible-order-profile-cost-probe-001-preflight.md`](2026-09-03-admissible-order-profile-cost-probe-001-preflight.md); rare-capability retention audit (144/151, 95.4%, no concentrated loss): [`2026-09-03-portfolio-18-specialists-rare-capability-retention-audit.md`](2026-09-03-portfolio-18-specialists-rare-capability-retention-audit.md); a full evidence-derived tranche cap map and its methodology: [`2026-09-03-portfolio-18-specialists-tranche-cap-map-derivation.md`](2026-09-03-portfolio-18-specialists-tranche-cap-map-derivation.md); that cap map's production-envelope confirmation against the flat cap (closed negative — 5 fewer levels solved at ~2x the typical cost; flat cap remains the validated treatment): [`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md`](2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md); the real `schedulerMode: 'static-portfolio'` implementation design: [`2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md`](2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md); v2 cap-sizing (a consistent isolated cost distribution for all 18 techniques, superseding v1's mixed production-mean/cost-probe sourcing; derives `portfolio-18-specialists-tranche-cap-map-v2.json` from p75): [`2026-09-03-portfolio-18-tail-percentile-cost-probe-001-preflight.md`](2026-09-03-portfolio-18-tail-percentile-cost-probe-001-preflight.md); the v2 cap map's own production-envelope confirmation against the flat cap and cap-map v1 (confirmed-positive: 62/150 vs. `full-menu`'s 55/150): [`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-002-preflight.md`](2026-09-03-portfolio-18-specialists-production-envelope-confirmation-002-preflight.md); the independent fresh-population replication (confirmed again: 68/150 vs. `full-menu`'s 64/150 — two independent confirmations now agree, `portfolio-18-tranche-v2` is the strongest characterized `static-portfolio` treatment to date): [`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-003-preflight.md`](2026-09-03-portfolio-18-specialists-production-envelope-confirmation-003-preflight.md); a production-entrypoint parity check confirming this exact result would reproduce through the real `solveLevel()` entrypoint, not just the research harness (15/15 exact matches): [`2026-09-03-static-portfolio-entrypoint-parity-check.md`](2026-09-03-static-portfolio-entrypoint-parity-check.md); a cross-generator transfer check on Corpus 1 per `solver-scheduling-policy.md`'s promotion-path step 8 (ties `full-menu` at 93/102 rather than beating it as on both Corpus-2 confirmations, still beats `portfolio-18-flat-2m`; no-regression/work-saving property transfers, the magnitude of advantage over `full-menu` looks Corpus-2-calibrated): [`2026-09-03-portfolio-18-tranche-v2-cross-generator-001-preflight.md`](2026-09-03-portfolio-18-tranche-v2-cross-generator-001-preflight.md)
- frozen technique-census staleness spot-check (the underlying T1 census predates HEAD by two weeks; 3/12 cheap sampled cells regressed from solved to unsolved — ordinary heuristic drift, not a bug, but real motivation for a scoped refresh): [`2026-09-03-frozen-technique-census-staleness-spotcheck.md`](2026-09-03-frozen-technique-census-staleness-spotcheck.md); the resulting full refresh (full population parity preserved, recalibrated shard sizing — repair-family cap-hits now run up to 13.5 minutes each vs. the original ~35s assumption; completed 120/120 shards, no gaps): [`2026-09-03-technique-census-refresh-001-preflight.md`](2026-09-03-technique-census-refresh-001-preflight.md); the completion/rejoin report with the full delta digest (25 levels newly regressed to zero frozen-T1-winner support, 81 gained new isolated-technique support, 229 total classification changes — `reports/stress/technique-niches/2026-09-03/` is now the current capability-map snapshot, superseding 2026-09-01): [`2026-09-03-technique-census-refresh-001-rejoin.md`](2026-09-03-technique-census-refresh-001-rejoin.md)
- fresh-vs-preceded main-search reproduction check for `docs/architecture-unification-debt.md`'s "Search-stage mutable-state isolation" P0/`docs/solver-correctness-hardening.md`'s open research-integrity blocker (30 real cases reproduced exactly on a fresh `prep` across two rounds, depth up to 18 preceding attempts — first empirical sweep behind the standing "no known current instance" status): [`2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md`](2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md); the targeted cache-empty-vs-cache-warm control `docs/solver-mutable-storage-inventory.md` names for the two lower-bound memo caches specifically (50/50 exact matches with the caches fully disabled, after catching and fixing a wall-clock confound in the check's own first pass): [`2026-09-03-lower-bound-memo-cache-empty-warm-control.md`](2026-09-03-lower-bound-memo-cache-empty-warm-control.md)
- production-ladder marginal-value/tail audit against the real static-portfolio-vs-production A/B (attributes the 4 production-only wins as 3 dose-truncation/1 missing-action; finds `admissible-order-fallback`+`admissible-order-alternate-tiebreak-retry` consume 61.7% of total production `workSpent` for 3 realized solves; a fixed-work pilot disabling the retry tier loses 0 solves for 58.35% less work, but a frozen-census check blocks a suppression verdict and nominates a percentile-derived repricing instead): [`2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](2026-09-04-production-ladder-marginal-value-tail-audit-001.md)
- corrected former P0 attribution: [`2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md), [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md)
- locked confirmation/transfer cohorts: [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](2026-08-24-solver-confirmation-transfer-cohort-reservation.md)
- beam extinction/retention: [`2026-08-25-beam-full-pool-survivor-projection.md`](2026-08-25-beam-full-pool-survivor-projection.md), [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md)
- exact/reference support: [`2026-08-23-solver-reference-model-capability-audit.md`](2026-08-23-solver-reference-model-capability-audit.md)
- restart allocation: [`2026-08-24-restart-continuation-value-audit.md`](2026-08-24-restart-continuation-value-audit.md), execution-readiness harness: [`2026-08-26-restart-continuation-execution-readiness.md`](2026-08-26-restart-continuation-execution-readiness.md), near-miss development pilot (corrected — tie, no detected restart effect): [`2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md) (supersedes [the original](2026-08-26-restart-vs-continuation-near-miss-development-pilot.md), which had a best-badness metric bug), larger-W confirmation (replicated positive): [`2026-08-26-restart-continuation-larger-w-confirmation.md`](2026-08-26-restart-continuation-larger-w-confirmation.md), production candidate design (superseded — pre-wiring pilot came back null): [`2026-08-27-repair-restart-continuation-production-candidate-design.md`](2026-08-27-repair-restart-continuation-production-candidate-design.md), W=150M pre-wiring pilot (clean null, closes the designed candidate): [`2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md`](2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md)
- learned failure: [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md)
- repair reconstructability: [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md), R00630/R02449 classification (third cost regime found): [`2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md`](2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md)
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
