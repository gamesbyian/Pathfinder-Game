# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) owns active rank.
> **Technique/config interpretation:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Capability/generalization boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

Measurements belong in dated reports, ranked decisions in the queue, deferred work in [`solver-future-work.md`](solver-future-work.md), and retained/default-off dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Pipeline

> semantic truth → controlled evidence → failure class → exact/shadow evaluation → narrow intervention → level-blind matched-work verdict → independent confirmation when selected/tuned → transfer evidence for broad generalization claims

Correctness bugs may go directly to fix + regression/soundness validation. Speculative heuristics should test the premise first with existing observers, oracles, family comparisons, reducers, isolated probes, or replay tools.

## Stop rules

These are gates, not aspirations.

1. **No fixed-ladder accretion by default.** A late retry/seed/profile/width/reserve that buys additive work is not free because earlier winners cannot regress. New actions normally compete inside a fixed aggregate `workSpent` envelope or explicitly justify a larger product budget.
2. **Treat knobs as configurations until evidence shows a different mechanism.** Names, weights, templates, widths, directions, tie-breaks, seeds, thresholds, and budget bands do not create new algorithms. Prefer bounded sweeps/racing/configuration search to serial artisanal guesses.
3. **Selection is part of the result.** Data used to discover a pattern, choose a threshold/config/seed/population, or pick the best arm/metric is development data for that decision. Record the meaningful search space and use untouched/grouped confirmation for robust claims.
4. **Level-blindness is not generalization.** Runtime may use mechanics/current state, not identity/history/hints/winners. A level-blind policy repeatedly tuned on one corpus can still overfit it; broad claims require fresh/locked transfer evidence. Group variants by parent.
5. **Unexplained stage-history dependence blocks causal inference.** Identical explicit level/action/config/seed/work should not change capability because unrelated predecessor stages ran unless a typed handoff is part of the contract. Cache warmth may change wall cost, not semantics/search order/randomness/work accounting.
6. **Use the right cost currency.** `workSpent` compares heterogeneous techniques; raw nodes diagnose one technique; wall time measures implementation cost/latency. Do not confuse algorithmic policy with kernel speed.
7. **Use the smallest evidence that can decide the next gate.** Diagnose participation/budget/instrumentation once, stop directly falsified forms, and expand populations only after a narrower pilot earns it. Full-corpus compute does not rescue a weak premise.
8. **Do not generate data by default.** Query existing corpus/family/census evidence first. A new large batch needs an unanswered question, intended analysis, independent unit, pilot, expansion rule, and stop condition. See [`variant-level-research.md`](variant-level-research.md).
9. **Extend existing plumbing before adding another tool/store.** Start at [`tooling-catalog.md`](tooling-catalog.md), current manifests/indexes/telemetry, and reusable helpers. Delete one-offs after use or document them only after repeated value.
10. **Diagnose search-quality failure before prescribing more of the same search.** If a technique already fails with substantial/full isolated work, prefer first-divergence, retention, operator, restart, exact-feasibility, learned-reason, or representation evidence over another nearby reserve/score/budget.
11. **Use exact/reference controls when they can answer the question.** Validate real witnesses in the model and model witnesses with the canonical referee; timeout/unsupported/relaxed models do not manufacture dead/UNSAT truth.
12. **Do not preserve failed code for posterity.** Git/reports are the archive; the opt-in ledger retains code only for current reusable plumbing, counterfactual value, or identified descendants.
13. **Do not optimize proxies after the real objective stops moving.** Badness, lineage survival, shadow catch, similarity, classifier accuracy, and frontier diversity are diagnostics. Promotion requires cold solve/work/correctness value.
14. **Do not hide rare capability in an average.** Report denominators, uncertainty, paired gains/losses, unique residual solves, and Pareto tradeoffs. One spectacular selected level also does not buy broad entitlement.
15. **Frameworks must earn implementation.** Scheduler/configurator/reference/analytics/shadow/learning infrastructure starts with a value-of-information pilot and a stop condition. Prefer a simple rule/helper when it answers the question.
16. **Prefer branch/PR evidence.** Merge before decision-bearing validation only when the required execution/data path cannot exercise the branch; record why. Do not use `main` as experiment scratch space.
17. **External best practices are hypotheses, not authority.** Literature can nominate methods; Pathfinder still needs a problem-specific comparable-work/correctness pilot.

## Capability and evidence roles

The product case is an unseen editor level. Cold solves may use mechanics, current state/telemetry, and generic code/config only. Forbidden steering includes saved hints/solutions, prior winners/configs/seeds, historical solve/cost/family outcomes, per-level special cases/caches, IDs/corpus position, and practical identity recognition through fingerprints/nearest-neighbor replay.

Use three renewable roles:

- **discovery/tuning:** freely inspected evidence used to invent/fit treatments;
- **confirmation:** untouched/grouped-held-out evidence used after the treatment is fixed;
- **transfer/challenge:** fresh or locked unrelated evidence for broader claims.

Once exact confirmation/transfer failures influence redesign, reclassify them as development evidence and replenish rather than repeatedly peeking.

## Failure classes

| Class | Meaning | Typical instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid accepted, unsound prune/cache/state identity, or unexplained lifetime dependence | referee, differential test, tiny exact reference, reducer, fresh-vs-preceded replay |
| Regression | Current level/config reproducibly loses prior capability | bisection, exact replay, causal ablation |
| Routing | A technique solves cheaply in isolation but production does not allocate useful work | census, method probe, lifecycle telemetry |
| Search quality | Technique receives substantial/full isolated work and still fails | traces, exact labels, operator/representation/restart diagnosis |
| Representation / retention | Viable material is generated then ranked/deduped/culled away | lineage, pair divergence, exact-prefix oracle, shadow descriptors |
| Allocation | Useful actions compete for finite shared work | lifecycle accounting, explicit caps, matched-work A/B |

Do not call both routing and search-quality failures “starvation.”

## Technique/config comparison

Keep separate:

- **source/config similarity:** shared engine/scorer/weights/template/prunes/context;
- **outcome similarity:** overlapping solve/fail/work vectors;
- **operational similarity:** similar encountered choices/frontiers/orderings/retention.

Different names do not prove diversity; solve-set overlap does not prove operational redundancy. See [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).

When tuning configurations, define legal ranges, use cheap racing, record the search size/objective, evaluate marginal portfolio value/rare exclusives, and compare complex policies to simple baselines.

## Scheduling/allocation

[`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns the active program. Important evidence rules:

- value actions/continuation tranches on the population that reaches them;
- use stable action/config identity and a shared work envelope;
- historical `P(B solves | A failed)` is observational until reach/sequence/state/work confounds are controlled;
- expose Pareto tradeoffs and rare unique capability;
- use parent-family splits for family-trained rules;
- test simple static/oracle-frontier headroom before dynamic/ML scheduling.

## Evidence hierarchy

1. canonical referee truth;
2. exact/bounded oracle labels with approximation direction explicit;
3. controlled paired evidence;
4. untouched/grouped confirmation after selection;
5. transfer/challenge evidence for broad claims;
6. level-blind population evidence for corpus-scoped production decisions;
7. historical/forensic evidence for nomination after current-code reconciliation.

Row count does not remove dependence; a large selected cohort is still selected.

## Experimental substrate and shadow-first rule

Prefer existing deterministic work accounting, manifests/run identity, stress/lifecycle telemetry, family/provenance tools, shadow probes, winning lineage, explicit-prefix/reference labels, reducers/replay, census/method probes, and operational-similarity observers. Start at [`tooling-catalog.md`](tooling-catalog.md).

For scoring, retention, routing, scheduling, or information-sharing hypotheses, observe before changing search where practical. Unless parity itself is the experiment, instrumentation must preserve solution, work, ordering, randomness, and cache/memo lifetime. A shadow-positive selected candidate still needs a live solve/work verdict and independent confirmation.

## Producer → receptor cooperation

A live handoff needs measured receptor limitation, producer information the receptor cannot cheaply rediscover, timely arrival, bounded production/storage/replay/branching cost, an independent receptor control, positive shadow evidence, and a level-blind matched-work verdict. One useful handoff does not justify a general blackboard.

## Family and accepted-path evidence

Family work uses the off-main trove for controlled diagnosis, not production lookup or independent-row bulk statistics. New family generation follows [`variant-level-research.md`](variant-level-research.md).

For a valid human/AI/oracle/variant path: referee-validate and record provenance; keep it out of the cold solve; locate first unchanged-search divergence/rejection/extinction; identify the generic boundary; test a generic mechanism; require recurrence across unrelated parents before production change. One vivid path is a case study, not a population.

## Promotion contract

Production-facing treatments normally require: level-blind execution; identifiable code/protocol; complete intended population or explicit sample; non-binding deadlines when work comparability matters; comparable arms; gains/losses; `workSpent`, nodes, errors/truncation as relevant; no hidden hint/data mutation; and queue/ledger updates when disposition changes.

Selected/tuned treatments need untouched/grouped confirmation. Report intended population, actual coverage, independent unit, exclusions/missing cells, and denominators. Scheduling additionally requires total-work envelope, current reach, rare unique wins/losses, and a simple-policy comparator. Proxy improvement alone is insufficient.

## Before expensive decision-bearing runs

Use [`investigation-report-conventions.md`](investigation-report-conventions.md) and `solver:experiment-preflight` where applicable. Record before dispatch: treatment/control/ref; evidence role/population selection; primary outcome/cost envelope; material candidate search; success/stop/escalation gate; and any framework-expansion gate.

## Documentation handoff

- chronology/measurements → dated report;
- ranked state → [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- deferred/reopen work → [`solver-future-work.md`](solver-future-work.md);
- scheduler policy → [`solver-scheduling-policy.md`](solver-scheduling-policy.md);
- retained/default-off disposition → [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- technique operation/similarity → [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md);
- concluded plans/history → archive.