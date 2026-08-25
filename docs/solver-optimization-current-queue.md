# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-24 after the P0, scheduler/configuration, generalization, beam, reference-model, learned-failure/restart, repair, and execution-substrate audits.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization. Historical exact-level evidence may nominate research; it may not steer production solves.

Use this file for **rank and next gate**, not as a second notebook. Detailed reasoning belongs in the linked topic docs/reports.

Primary authorities:

- method: [`solver-research-operating-model.md`](solver-research-operating-model.md)
- scheduler/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md)
- residual representation: [`solver-residual-state-representation.md`](solver-residual-state-representation.md)
- deterministic cost: [`solver-budget-determinism.md`](solver-budget-determinism.md)
- level-blindness: [`solver-level-blindness.md`](solver-level-blindness.md)
- retained opt-ins: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
- deferred/reopen ideas: [`solver-future-work.md`](solver-future-work.md)

## Queue-wide rules

Every active item follows:

> **premise -> smallest value-of-information pilot -> explicit success/stop gate -> bounded implementation -> confirmation -> broader integration**

Additional rules:

- A high-priority item may correctly begin with analysis/diagnosis rather than code.
- Do not let an easy lower-ranked implementation displace a higher-ranked evidence blocker.
- Use `workSpent` for cross-technique cost; raw nodes remain within-technique diagnostics.
- A new action expands the menu, not the default total work budget.
- Additive dead-last placement can prove non-interference with earlier winners; it does **not** make the added work free.
- Selection/tuning evidence requires independent confirmation before broad promotion claims.
- Level-blindness is not statistical generalization.
- Proxy wins such as badness, lineage survival, similarity, exact-live retention, or model fit do not substitute for cold solve/work/correctness.
- Timeout/censoring, natural exhaustion, unsupported/UNKNOWN, and proof of infeasibility remain distinct.
- A clear negative closes the tested form. Do not indefinitely rescue it with adjacent thresholds/seeds/budgets.
- Keep exact/proof interfaces, safe relaxations, restricted representations, and predictive abstractions in their proper logical roles.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce one fresh-vs-preceded admissible-order case under an identical action/resource contract. Compare resource/accounting/config context, then initial admissible child ordering as a semantic checksum. If ordering differs, clear MP/MC lower-bound memos first; if it agrees, trace the first later tree divergence. See [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md). |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / ACTIVE** | Current attempt artifacts already expose canonical action identity, `workSpent`, ceilings, and explicit `success/exhausted/timed-out/budget-starved/error` outcomes. Build the current action/tranche risk-set join to census cap data; compute failed-work tax, exclusivity, portfolio-cardinality and fixed-work Pareto/oracle headroom; test a simple static policy before dynamic/survival/bandit machinery. See [`../reports/2026-08-24-scheduler-evidence-contract-audit.md`](../reports/2026-08-24-scheduler-evidence-contract-audit.md). |
| 2 | Generalization and holdout discipline | **ASAP / PROTOCOL DESIGNED, COHORTS NOT YET INSTANTIATED** | Instantiate one fresh broad confirmation cohort and one transfer/challenge cohort under the renewable exposure/reclassification protocol. Keep baseline-failure-conditioned residual cohorts separate and scope their claims accordingly. See [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md). |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Stable config/action identities already exist in `attempt-identity.mjs`; do not rebuild them. First determine how much fixed-envelope headroom exists in the **existing action grammar**. Race/prune existing actions first; refine raw weights/widths/thresholds only inside families that survive the portfolio screen, then confirm selected survivors independently. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and the scheduler evidence audit above. |
| 4 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Reuse the existing exact A/D case set. Simple scalar progress/resource summaries are already falsified. Test cheap local/interface descriptors offline, led by pending-vs-half-completed MustCross state and already-paid connectivity facts. Only after unrelated-parent recurrence should one simple quota/crowding/reserve treatment be tested at unchanged width and matched work. See [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md). |
| 5 | Exact/reference-model program | **HIGH PRIORITY, BOUNDED INFRASTRUCTURE HAS PAID RENT** | Finish the small bidirectional support/validation matrix and keep encoding capability separate from validation depth. Repair-retreat and beam-extinction work have already demonstrated value. Use further CP-SAT queries only for a concrete ranked missing label/counterexample/certificate need; do not expand mechanic scope for completeness. See [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md). |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY CAPABILITY RESEARCH** | Restart side: compare fresh-seed restarts against continuation at equal aggregate `workSpent`; additive multi-seed wins establish diversity, not restart superiority. Learned-failure side: generic exact-state recurrence is already weak outside repair experience memory; run a shadow connectivity-reason recurrence/earliness audit before any learned store. See [`../reports/2026-08-24-restart-continuation-value-audit.md`](../reports/2026-08-24-restart-continuation-value-audit.md) and [`../reports/2026-08-24-learned-failure-certificate-audit.md`](../reports/2026-08-24-learned-failure-certificate-audit.md). |
| 7 | Repair reachability/reconstructability and state-conditioned MustCross | **ACTIVE, SECONDARY** | Reuse exact retreat labels. Hand known-live prefixes to an existing bounded native reconstruction mechanism at fixed work and separate shallow/deep retreat from exact-live-but-repair-hostile reconstruction failure. Only then choose retreat, reconstruction, or larger destroy/core-guided work. See [`../reports/2026-08-24-repair-reachability-reconstructability-audit.md`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md). |
| 8 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Re-profile current HEAD after the August 23 speed stack. Native/WASM is closed for the current broad per-candidate boundary because crossing it requires migrating too much mutable state. If scoring/candidate generation remains dominant, run one bounded true specialized-JS scorer pilot. See [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md). |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep mining only as action/scheduler evidence. Do not append another permanent tail merely because an isolated winner exists. |

## #0 P0: cross-stage dependence

Historical admissible-order wins can require preceding ladder activity despite fresh direct controls at the exact production commit. Current static audit narrows the likely classes:

- reusable DFS/beam state buffers are not the likely cause for admissible-order, which creates a fresh logical state;
- admissible-order has no PRNG input;
- current config override paths examined restore their state;
- the architecture has real historical budget/cumulative-node sequence hazards, so resource context must still be controlled;
- lower-bound memo/value state remains a leading visible semantic suspect if initial child ordering differs under otherwise identical context.

Required diagnosis order:

1. reproduce the historical/current winner under its preserved full-ladder protocol;
2. compare fresh vs controlled-predecessor resource vector: work meter/caps, cumulative nodes, supplied budgets, effective config/forced-step state, gate and action identity;
3. compare **initial admissible child order**;
4. if ordering differs under equal context, clear MP/MC lower-bound memos before broad state diffing;
5. if ordering agrees, locate the first later search-tree divergence;
6. either eliminate accidental leakage or formalize an intentional typed producer→receptor contract and charge producer work;
7. add a regression fixture for the actual lifetime contract.

Do not “fix” experiments by always priming the predecessor ladder. That hides the dependency.

## #1/#3 scheduler and configuration

The old problem statement has changed materially.

Current code already provides:

- canonical config identity;
- canonical action identity including stage and repair seed;
- per-attempt `workSpent`, node/work ceilings and termination outcome;
- row-level deadline truncation and technique lifecycle telemetry;
- census cap/tranche evidence across a broad action matrix.

The remaining problem is the **join and valuation**, not inventing an identity schema or another general telemetry pass.

The existing `portfolio-historical-replay.mjs` is winner/elapsed-time archaeology only. It does not charge failed work, build right-censored risk sets, or model current action overlap, and must not be treated as the continuation-value analyzer.

The first decision-bearing outputs are:

- current additive/retry tail economics;
- action/tranche risk sets with natural exhaustion removed from later continuation sets;
- incremental solves and incremental `workSpent`;
- rare/exclusive capability;
- portfolio-cardinality curve;
- fixed-work current-vs-oracle/Pareto frontier;
- a simple deterministic static baseline;
- sensitivity excluding P0/sequence-ambiguous cells.

Existing frozen census evidence already warns against both extremes. Plain repair alone covers a large hard-gap share, but the fully sampled gap union needs many techniques for complete coverage: three selected techniques cover about 70% of that union, eight about 87%, and full coverage requires 22. That is not a fixed-work production result, but it makes the portfolio-cardinality tradeoff real.

Only if comparable fixed-work oracle headroom remains material after a simple static policy should dynamic/learned scheduling or broad automatic configuration proceed.

## #2 generalization

Corpus 2, existing census cells, regressions and variant families are development evidence because they have been repeatedly inspected/mined.

Use renewable evidence roles:

- **development/tuning:** freely inspectable;
- **confirmation:** candidate fixed before exact outcomes are inspected;
- **transfer/challenge:** fresh/locked evidence for broader claims.

Keep broad fresh samples separate from baseline-failure-conditioned residual samples. The latter are excellent for tail/scheduler questions but do not establish unconditional unseen-level improvement.

Track exposure state such as `LOCKED`, `AGGREGATE_SEEN`, `EXPOSED`, `DEVELOPMENT`. Once exact failures influence redesign, reclassify/replenish.

Group siblings by parent/family ancestor. Record generator/source/version/seeds and selection rules. Do not repeatedly query one hidden cohort until it becomes a covert tuning service.

## #4 beam retention

Exact A/D evidence shows cases where score-preferred material is dead while a near-cutoff/discarded alternative is live. B-class live/live near-ties remain a distinct regime.

Cheap scalar “progress” rules are already refuted. Across exact dead/live pairs, closer-to-goal, fewer intersections used, objective completion and aggregate consumed axis topology point in contradictory directions.

`S00030` is particularly useful: dead and live candidates share position, remaining length, remaining intersection budget, goal distance and current coarse `(flipperUsedMask, mustCrossMask)` diversity bucket. The live candidate has already made the first pass through a still-pending MustCross; the dead candidate has not. `crossCounts` captures the difference and scoring already uses it, but coarse diversity does not.

This nominates MustCross completion phase as a cheap descriptor, not a fix.

Connectivity-derived descriptors must reuse an already-paid connectivity pass where possible. Connectivity is a hot throttled kernel; do not add another flood fill per beam candidate merely to manufacture diversity metadata.

If a descriptor survives unrelated-parent analysis, test the simplest retention expression at unchanged width with random-reserve and width-only controls. Exact-live retention is still only a proxy until cold solve/work improves.

## #5 reference model

The maintained CP-SAT/prefix stack is bounded research infrastructure, not a second production solver.

It has already paid rent twice:

- exact repair-retreat boundaries;
- exact beam live/dead labels around retention failures.

Keep two validation directions:

- known-valid Pathfinder witness pinned into CP-SAT must remain feasible;
- model-emitted witness must pass the canonical Pathfinder referee.

Timeout/UNKNOWN/unsupported never become dead/UNSAT truth.

Do not expand mechanic scope until a ranked question is blocked by that missing support. Use the oracle as a microscope/counterexample source for beam, repair, proposed abstractions and structural certificates.

## #6 restarts and learned failure

Extra repair seeds clearly buy capability, including the promoted August 23 late-probe multi-seed tier. Those experiments were additive. They prove seed diversity, not that restarting beats continuing under a fixed total envelope.

The restart pilot should compare, for prespecified seeds and budgets:

- one continued run to total work `W`;
- multiple fresh seeded runs whose aggregate work also equals `W`.

Count failed restarts. Report the whole solve/work distribution, not best seed.

For learned logical failure, keep three concepts separate:

- repair-local **experience memory**: incomplete stochastic failure reuse;
- exact-state memoization: only safe with future-complete state and already measured weak for broad DFS/beam use;
- structural learned reasons: sound smaller predicates that recur across distinct exact states or fire materially earlier.

The current first structural candidate is connectivity-derived cut/capacity failure, because connectivity is expensive and throttled. Shadow reasons must show recurrence, earlier firing or avoided flood fills, cheap checking, and a conservative proof scope before any production cache.

## #7 repair

Exact retreat evidence contains both shallow and deep liveness-return regimes. Therefore “retreat farther” is not a universal answer.

Classify existing exact cases using:

| exact prefix | bounded native reconstruction | interpretation |
|---|---|---|
| dead | fails | control |
| dead | succeeds | correctness/reference alarm |
| live | succeeds | retreat/selection bottleneck |
| live | fails | reconstructability bottleneck |

Only recurrent shallow-live/successful-reconstruction cases justify a reversible retreat treatment. Repeated live-but-unreconstructable cases nominate stronger bounded completion. Large destroy/core-guided work is justified only by recurrent genuinely deep rollback where small reopening is impossible in principle.

MustCross first-pass state is a shared diagnostic candidate here too, not yet a routing/scoring rule.

## #8 speed

Recent V8 optimization remains productive. Do not jump to a language rewrite merely because the solver is compute-heavy.

The current candidate-generation/apply/undo/scoring region is not a compact native boundary: it mutates broad path/resource/mechanic state and reads a large prepared collection of distance maps and metadata. A per-candidate crossing would be poor; moving enough state native to avoid crossing costs becomes a search-core migration and fails the bounded-prototype premise.

Reopen native/WASM only if a later architecture naturally creates a compact shared-memory kernel or a different isolated hotspot emerges.

A real generated/specialized JS scorer remains plausible if fresh profiling still shows scoring dominant. The opportunity is static **mechanic/template structure**, not sparse weights. Nearby “obvious” optimizations such as pre-resolving ordinary ablation gates and hoisting one cheap distance lookup have already measured null/negative.

## Completed/deprioritized forms

Do not reopen unchanged merely because code/report names survive:

- broad “give repair more budget” as a generic fix;
- broad repair-fallback gate widening on existing coarse features;
- generic elite-pool/relink/diversification work without a newly diagnosed conditional failure;
- universal beam-width increases;
- broad DPP/MAP-Elites/novelty-archive machinery before a cheap future-coverage descriptor earns it;
- production ZDD/DD/frontier frameworks before a bounded interface question earns them;
- generic `REGULAR`/resource-automaton infrastructure before a compact residual subproblem earns it;
- exact global DFS/beam transposition caching as a major opportunity;
- context-equivalent caching from an approximate interface without a future-sufficiency proof;
- broad CDCL/LCG/MUS machinery before one recurring sound reason class demonstrates value;
- a generic RCSP/label-setting engine or ordinary “less resource used is better” dominance for exact targets;
- broad symmetry canonicalization/retries as a substitute for diagnosing representation bias;
- survival/hazard/bandit/value-of-computation scheduler machinery before simple tranche repricing shows residual headroom;
- bulk variant generation without a specific unanswered question;
- framework-building for its own sake.

## Evidence anchors

- [`solver-research-operating-model.md`](solver-research-operating-model.md)
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md)
- [`solver-residual-state-representation.md`](solver-residual-state-representation.md)
- [`solver-budget-determinism.md`](solver-budget-determinism.md)
- [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md)
- [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md)
- [`solver-correctness-hardening.md`](solver-correctness-hardening.md)
- [`architecture-unification-debt.md`](architecture-unification-debt.md)
- [`variant-level-research.md`](variant-level-research.md)
- [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md)
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
- [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md)
- [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md)
- [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md)
- [`../reports/2026-08-24-scheduler-evidence-contract-audit.md`](../reports/2026-08-24-scheduler-evidence-contract-audit.md)
- [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md)
- [`../reports/2026-08-24-restart-continuation-value-audit.md`](../reports/2026-08-24-restart-continuation-value-audit.md)
- [`../reports/2026-08-24-learned-failure-certificate-audit.md`](../reports/2026-08-24-learned-failure-certificate-audit.md)
- [`../reports/2026-08-24-repair-reachability-reconstructability-audit.md`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md)
- [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md)
- [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md)
