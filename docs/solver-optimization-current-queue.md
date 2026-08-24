# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-23 after technique-census, scheduling, speed, and research-method reviews.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization. Historical exact-level evidence may nominate research; it may not steer production solves.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduler: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Deferred/detail ideas: [`solver-future-work.md`](solver-future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Operational technique taxonomy: [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md). Historical queue snapshots remain under [`archive/snapshots/`](archive/snapshots/); dated measurements remain under [`../reports/`](../reports/).

## Priority reset

The recent technique census changed the optimization problem. The solver already contains substantial latent capability that production routing/allocation fails to realize, while many named configurations are close relatives rather than independent search paradigms. Recent additive retry gains also demonstrate that more work can buy solves while making the ladder increasingly expensive. The next phase therefore prioritizes **experimental validity, allocation, generalization, and genuinely different search information** ahead of further profile/retry accretion.

The old queue's completed investigations remain evidence, not current priorities. Do not resurrect a closed item because it appears in an archived snapshot or retained flag.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce fresh-vs-preceded behavior for admissible-order and any other affected stages at identical explicit input/config/seed/work. Identify mutable cache/state/PRNG/accounting cause or formalize an intentional typed handoff. Do not use unexplained sequence effects for cap/routing conclusions. |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / ACTIVE** | Join current lifecycle reach + `workSpent` to census cap/tranche data; define stable action IDs; compute fixed-envelope oracle frontiers; audit current retry/tail stages for residual marginal value; shadow then matched-work A/B. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md). |
| 2 | Generalization and holdout discipline | **ASAP / INFRASTRUCTURE GAP** | Establish a genuinely untouched/fresh transfer/challenge population and rules preventing its use for hypothesis generation/tuning. Preserve parent-family grouping. Until then, scope claims to the corpus measured. |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Expose meaningful scoring/template/width/direction/seed/budget parameters through stable action/config IDs; run bounded racing/successive elimination or an automatic configurator offline; compare discovered candidates by marginal portfolio value on held-out data rather than standalone wins. |
| 4 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Use exact-live/dead lineage and bounded beam traces to identify whether viable material is mis-ranked, deduped, or width-culled. Test retention mechanisms on held-out parent families at equal surrounding work; do not default to universal width increases. |
| 5 | Exact/reference-model program | **HIGH PRIORITY RESEARCH INFRASTRUCTURE** | Turn CP-SAT/reference modeling from ad-hoc diagnostics into a maintained cross-check for reduced/full instances where tractable: witness validation both directions, explicit-prefix feasibility, boundary labels, and small-instance exact controls. Measure what classes it can resolve before expanding model complexity. |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY CAPABILITY RESEARCH** | Measure runtime/solve distributions across randomized tie-breaks/seeds for systematic search; test bounded restart schedules before adding more nearby scoring profiles. Separately investigate whether reason-producing propagators / conflict or nogood learning can prevent repeated rediscovery of equivalent dead regions. Start with diagnostics and small prototypes, not a solver rewrite. |
| 7 | CP-SAT-anchored repair operators and state-conditioned must-cross reasoning | **ACTIVE, SECONDARY** | Continue only where exact/shadow evidence identifies a recurring search-quality boundary. Repair depth should be state-conditioned; must-cross attraction must recur across unrelated levels/families before scoring changes. |
| 8 | Architectural speed and execution substrate | **ACTIVE PEER PROGRAM** | Continue profile-led dense/specialized/fused-kernel work. Add one bounded native/WASM feasibility benchmark before assuming the hot search kernel should remain JavaScript indefinitely. See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md). |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep mining only as scheduler/action evidence. Do not append more hand-authored trailing configs merely because an isolated winner exists. A new rule/action must compete at fixed total work and survive confirmation outside the population that nominated it. |

## P0: explain cross-stage dependence

Reverse-oracle work found historical admissible-order wins that do not reproduce from a fresh prepared state despite apparently identical search settings. That is not safe to treat as ordinary lifecycle context. A pure cache warm-up may change wall time, but should not silently alter deterministic search capability at fixed work.

Required diagnosis:

1. pick current-code reproducible examples rather than stale historical labels;
2. run the target stage from fresh state and after a controlled predecessor sequence with identical explicit config/seed/work;
3. diff every mutable/search-relevant prepared field, memo/cache lifecycle, PRNG state, counters, stage overrides, and budget scope;
4. determine the earliest point where ordering, legality, pruning, randomness, or work accounting diverges;
5. either eliminate accidental leakage or promote the dependency into an explicit typed producer→receptor contract with independent controls and matched-work evidence.

Until this is understood, isolated curves for affected stages may nominate questions but cannot justify production cap/routing changes that assume stage independence.

## Scheduler and portfolio repricing

The production solver should stop behaving as an ever-growing fixed ladder. Recent promotions such as late repair, legacy-distance retry, multi-seed retry, non-default admissible retry, connectivity-axis retry, and must-cross retry remain valid current behavior, but none receives permanent budget entitlement merely because it once added solves with zero measured regressions.

The scheduler program must ask, on the **current residual population**:

- what does each action add after predecessors fail;
- how much `workSpent` does it consume when reached;
- which current solves are uniquely dependent on it;
- whether a cheaper or more complementary action substitutes for it;
- whether later budget tranches still earn their cost;
- whether a whole-ladder retry can be decomposed into narrower actions.

Adding a candidate expands the menu, not the default aggregate work budget.

## Generalization program

Corpus 2, technique-census cells, known regressions, and variant families have been repeatedly inspected and mined. They are therefore development evidence. Level-blind execution prevents runtime lookup but does not make repeated tuning on those populations statistically independent.

Near-term deliverable: define a holdout protocol with at least:

- discovery/tuning data that agents may inspect freely;
- confirmation data not used to choose the candidate/threshold/configuration;
- a locked or freshly generated transfer/challenge population reserved for broader claims;
- family-level grouping for sibling variants;
- rules for when an evaluated holdout becomes development data and must be replenished.

Do not block useful corpus-targeted engineering while this is built. Do block overbroad language: report “Corpus-2 improvement” when that is what was measured.

## Automatic configuration and racing

The current hand-authored attempt policy contains a large conditional parameter space: scoring weights/profiles, templates, direction, beam width/diversity, admissible tie-breaks, seeds, eligibility thresholds, and budget depth. Treat systematic selection among these as algorithm configuration rather than serial human guesses.

First gate:

1. define a machine-readable parameter/action space using existing config identities;
2. choose a bounded development population with family grouping where relevant;
3. run staged racing/successive elimination so weak candidates do not receive full budgets/populations;
4. evaluate surviving candidates by marginal coverage/work relative to the current portfolio;
5. confirm selected candidates on untouched data;
6. distill any production choice into a deterministic, level-blind policy when possible.

Do not create dozens of permanent named profiles merely to expose the search space.

## Exact/reference-model program

Pathfinder should maintain an independent way to answer selected feasibility questions rather than asking every question through the heuristic solver itself. CP-SAT/reference tools already exist and have produced useful repair-retreat and prefix evidence; elevate that role.

Useful targets include:

- small-instance exact solve/UNSAT controls;
- explicit-prefix completion feasibility;
- exact-live/dead labels around beam/DFS divergence points;
- repair retreat/interface feasibility;
- validation that heuristic hard-prune assumptions remain one-sided;
- reduced counterexamples for new propagators or learned-failure mechanisms.

Do not require the reference solver to outperform production. Its job is to provide independent truth where tractable.

## Restart/randomization and learned failure

The multi-seed repair gain is evidence that early stochastic commitments matter. Before inventing more nearby score profiles, measure whether systematic search also has heavy seed/tie-break sensitivity and whether bounded restarts improve solve/work tails.

Separately, current search mostly prunes by generic bounds and repeatedly encounters dead regions without deriving reusable explanations. Investigate conflict/nogood learning incrementally:

- identify recurring dead-state reasons from existing propagators;
- determine whether a compact sound reason can be recorded;
- test local nogoods/reason reuse inside one solve;
- only then consider non-chronological backtracking or richer reason-producing propagation.

This is a genuinely different capability direction and should outrank another family of hand-tuned scoring weights unless evidence says otherwise.

## Active specialist research

### Beam retention

Existing exact-prefix evidence shows higher-ranked exact-dead material can displace lower-ranked exact-live material. Continue with causal lineage/retention experiments, not blanket width. Width/diversity/dedup changes are retention policies and may be non-monotonic.

### Repair

Plain repair retains real deep capability but also fails most hard residual levels even at large isolated budgets. Future repair work should change operator quality, initialization/restarts, state representation, or exact-informed editing rather than simply buying more of the same trajectory. CP-SAT retreat evidence should determine whether deeper editing has actual feasible slack.

### Must-cross reasoning

Unconditional attraction is closed. Continue only with live-state descriptors that predict target/defer/second-approach behavior across unrelated levels or held-out families. Prefer shadow diagnostics before scoring changes.

## Completed/deprioritized directions

These remain documented in dated reports, archived queue snapshots, or the opt-in ledger; they are not current work merely because code/data survive:

- broad failure-conditioned “give repair more budget” as a generic fix;
- broad repair-fallback gate widening on existing coarse features;
- mechanics-conditioned admissible-order reserve/density forms already closed negative;
- universal beam-width increases;
- global legacy-distance guidance swap;
- retry-tier node staircase in its tested form;
- repair elite-prefix DFS and its additive retry form;
- portal parity envelope in its measured form;
- exact global DFS/beam transposition caching as a major opportunity;
- orientation/mirroring production retries as a substitute for diagnosing orientation bias;
- bulk variant generation without a specific unanswered question.

## Evidence anchors

- [`solver-research-operating-model.md`](solver-research-operating-model.md): experimental and promotion rules.
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md): bounded portfolio/scheduler design.
- [`solver-budget-determinism.md`](solver-budget-determinism.md): `workSpent` and deterministic budget contract.
- [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md): source/outcome/operational similarity.
- [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md): current census-derived residual evidence.
- [`solver-correctness-hardening.md`](solver-correctness-hardening.md): correctness/state/provenance invariants.
- [`variant-level-research.md`](variant-level-research.md): family/variant evidence and parent-held-out discipline.
- [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md): implementation-speed program.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md): retained default-off experiment dispositions.
