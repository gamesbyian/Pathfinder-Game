# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-23 after technique-census, scheduling, speed, and research-method reviews.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization. Historical exact-level evidence may nominate research; it may not steer production solves.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduler: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Deferred/detail ideas: [`solver-future-work.md`](solver-future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Operational technique taxonomy: [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md). Historical queue snapshots remain under [`archive/snapshots/`](archive/snapshots/); dated measurements remain under [`../reports/`](../reports/).

## Priority reset

The recent technique census changed the optimization problem. The solver already contains substantial latent capability that production routing/allocation fails to realize, while many named configurations are close relatives rather than independent search paradigms. Recent additive retry gains also demonstrate that more work can buy solves while making the ladder increasingly expensive. The next phase therefore prioritizes **experimental validity, allocation, generalization, and genuinely different search information** ahead of further profile/retry accretion.

The old queue's completed investigations remain evidence, not current priorities. Do not resurrect a closed item because it appears in an archived snapshot or retained flag.

## Queue-wide execution rules

Rank does not grant permission to build a large system immediately. Every active item follows:

> **premise -> smallest value-of-information pilot -> explicit success/stop gate -> bounded implementation -> confirmation -> broader integration**

Additional rules:

- A queue item can be high priority while its first correct action is a small diagnostic or analysis, not implementation.
- If a simple existing mechanism captures most measured headroom, prefer it to a complex framework/model.
- If a treatment/configuration was selected on the population that shows the gain, treat that result as discovery/tuning and confirm independently.
- Proxy metrics do not substitute for cold solve/work/correctness outcomes.
- Report uncertainty/denominators and rare unique capability rather than optimizing one average score.
- Do not let a lower-ranked attractive coding project displace a higher-ranked evidence blocker merely because implementation is easier.
- A clear negative closes the tested form. Do not rescue it indefinitely with neighboring thresholds, seeds, budgets, or hand-picked cohorts.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce fresh-vs-preceded behavior for admissible-order and any other affected stages at identical explicit input/config/seed/work. Identify mutable cache/state/PRNG/accounting cause or formalize an intentional typed handoff. Do not use unexplained sequence effects for cap/routing conclusions. |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / ACTIVE** | Join current lifecycle reach + `workSpent` to census cap/tranche data; compute fixed-envelope Pareto/oracle headroom with uncertainty; audit retry/tail stages; test how much a simple static policy captures before building more scheduler machinery. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md). |
| 2 | Generalization and holdout discipline | **ASAP / INFRASTRUCTURE GAP** | Establish one reproducible untouched/fresh confirmation/transfer protocol, ideally limiting exact-failure exposure during iteration. Preserve parent-family grouping and define when an exposed holdout becomes development data. Until then, scope claims to the corpus measured. |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Define bounded machine-readable config/action ranges, then run a small racing/successive-elimination pilot over existing knobs. Record search size/selection rule and compare the survivor to simple/current baselines; escalate external configurator plumbing only if systematic search shows held-out value. |
| 4 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Use exact-live/dead lineage and bounded traces to isolate a recurring mis-rank/dedup/width decision. Test one neutral intervention against simple width/random controls; require unrelated-parent recurrence and actual solve/work improvement, not lineage-survival improvement alone. |
| 5 | Exact/reference-model program | **HIGH PRIORITY RESEARCH INFRASTRUCTURE** | Inventory exact vs relaxed/unsupported mechanics and validate current model bidirectionally on a bounded suite. Demonstrate useful turnaround on one active research question before expanding model scope. Never turn timeout/relaxation into UNSAT/dead truth. |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY CAPABILITY RESEARCH** | First measure prespecified across-seed/tie-break distributions and repeated-conflict opportunity. Restart treatments pay for all failed restarts at equal aggregate work; learned-failure prototypes require sound reason scope and measured recurrence before general architecture. |
| 7 | CP-SAT-anchored repair operators and state-conditioned must-cross reasoning | **ACTIVE, SECONDARY** | Continue only where exact/shadow evidence identifies a recurring search-quality boundary. Operator changes must beat baseline repair at equal total work; must-cross descriptors must survive unrelated/held-out parents and remain legal runtime features. |
| 8 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Continue profile-led measured V8 hot spots. Run a native/WASM feasibility prototype only if a compact material hotspot can cross the boundary cheaply; close it on weak end-to-end gain. Speedups do not automatically authorize more production work. See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md). |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep mining only as scheduler/action evidence. Do not append hand-authored trailing configs merely because an isolated winner exists. A selected rule/action competes at fixed total work and needs confirmation outside the population that nominated it. |

## P0: explain cross-stage dependence

Reverse-oracle work found historical admissible-order wins that do not reproduce from a fresh prepared state despite apparently identical search settings. That is not safe to treat as ordinary lifecycle context. A pure cache warm-up may change wall time, but should not silently alter deterministic search capability at fixed work.

Required diagnosis:

1. pick current-code reproducible examples rather than stale historical labels;
2. run the target stage from fresh state and after a controlled predecessor sequence with identical explicit config/seed/work;
3. diff every mutable/search-relevant prepared field, memo/cache lifecycle, PRNG state, counters, stage overrides, and budget scope;
4. clear candidate state classes systematically and determine the earliest point where ordering, legality, pruning, randomness, or work accounting diverges;
5. either eliminate accidental leakage or promote the dependency into an explicit typed producer -> receptor contract with independent controls and matched-work evidence;
6. add a regression fixture for the discovered lifetime contract.

Do not “fix” isolated experiments by always running the predecessor ladder first. That hides the dependency rather than defining it.

Until this is understood, isolated curves for affected stages may nominate questions but cannot justify production cap/routing changes that assume stage independence.

## Scheduler and portfolio repricing

The production solver should stop behaving as an ever-growing fixed ladder. Recent promotions such as late repair, legacy-distance retry, multi-seed retry, non-default admissible retry, connectivity-axis retry, and must-cross retry remain valid current behavior, but none receives permanent budget entitlement merely because it once added solves with zero measured regressions.

The scheduler program must ask, on the **current residual population**:

- what does each action add after predecessors fail;
- how much `workSpent` does it consume when reached;
- which current solves are uniquely dependent on it and whether those are robust or tiny selected cohorts;
- whether a cheaper or more complementary action substitutes for it;
- whether later budget tranches still earn their cost;
- whether a whole-ladder retry can be decomposed into narrower actions;
- how uncertain each residual-value estimate is;
- how much of oracle headroom a simple deterministic policy captures before dynamic complexity is justified.

Historical conditional success after a predecessor is observational until current-code reach, budget depletion, hidden-state, and sequence effects are controlled.

Adding a candidate expands the menu, not the default aggregate work budget.

## Generalization program

Corpus 2, technique-census cells, known regressions, and variant families have been repeatedly inspected and mined. They are therefore development evidence. Level-blind execution prevents runtime lookup but does not make repeated tuning on those populations statistically independent.

Near-term deliverable: define a holdout protocol with at least:

- discovery/tuning data that agents may inspect freely;
- confirmation data not used to choose the candidate/threshold/configuration;
- a locked or freshly generated transfer/challenge population reserved for broader claims;
- family-level grouping for sibling variants;
- rules for when an evaluated holdout becomes development data and must be replenished;
- a policy for aggregate-vs-exact holdout visibility so repeated failure peeking does not silently tune the transfer set;
- generator/version metadata so the challenge distribution itself is reproducible.

Do not block useful corpus-targeted engineering while this is built. Do block overbroad language: report “Corpus-2 improvement” when that is what was measured.

The goal is not one immortal secret benchmark. It is a renewable train/confirm/transfer discipline.

## Automatic configuration and racing

The current hand-authored attempt policy contains a large conditional parameter space: scoring weights/profiles, templates, direction, beam width/diversity, admissible tie-breaks, seeds, eligibility thresholds, and budget depth. Treat systematic selection among these as algorithm configuration rather than serial human guesses.

First gate:

1. define bounded machine-readable parameter/action ranges using existing config identities;
2. choose/group a development population before candidate outcomes are inspected;
3. run staged racing/successive elimination so weak candidates do not receive full budgets/populations;
4. evaluate surviving candidates by marginal coverage/work and rare exclusive capability relative to the current portfolio;
5. report how many configurations were searched and the selection objective;
6. compare against simple current/profile subsets before integrating a complex external configurator;
7. confirm selected candidates on untouched/grouped data;
8. distill any production choice into a compact deterministic, level-blind action set when possible.

Do not create dozens of permanent named profiles merely to expose the search space. Do not quote the winning development arm's apparent effect as an unbiased effect size.

## Exact/reference-model program

Pathfinder should maintain an independent way to answer selected feasibility questions rather than asking every question through the heuristic solver itself. CP-SAT/reference tools already exist and have produced useful repair-retreat and prefix evidence; elevate that role only to the extent it keeps answering real questions.

Useful targets include:

- small-instance exact solve/UNSAT controls;
- explicit-prefix completion feasibility;
- exact-live/dead labels around beam/DFS divergence points;
- repair retreat/interface feasibility;
- validation that heuristic hard-prune assumptions remain one-sided;
- reduced counterexamples for new propagators or learned-failure mechanisms.

Entry gate:

1. inventory current mechanic coverage as exact, relaxed/one-sided, or unsupported;
2. validate real witnesses in the model and model witnesses with the canonical referee;
3. ensure timeout/unknown/unsupported remain distinct from UNSAT/dead;
4. demonstrate useful answer quality/turnaround on one ranked research question.

Do not require the reference solver to outperform production. Its job is independent truth where tractable. If maintaining broader model scope costs more than the questions it resolves, keep only the exact/reduced forms that pay rent.

## Restart/randomization and learned failure

The multi-seed repair gain is evidence that early stochastic commitments matter, not evidence that unlimited seed fan-out is efficient.

For systematic-search restart research:

- choose a prespecified seed/tie-break set rather than reporting only the best seed found;
- measure solve probability and the whole work distribution;
- compare restart schedules against simply continuing baseline search at the same aggregate `workSpent`;
- charge the treatment for failed restarts too;
- require effects across unrelated levels before adding a scheduler action.

Separately, current search mostly prunes by generic bounds and may rediscover dead regions without deriving reusable explanations. Before building conflict-learning architecture:

- instrument repeated dead-state/reason opportunity;
- identify compact **sound** reason classes and every state field their validity depends on;
- test local per-solve nogood reuse with bounded memory/lookup cost;
- measure avoided work and solve effects;
- only then consider non-chronological backtracking or richer reason-producing propagation.

No approximate conflict explanation may become a hard reject, and no cross-level persistent learned state belongs in cold capability.

## Active specialist research

### Beam retention

Existing exact-prefix evidence shows higher-ranked exact-dead material can displace lower-ranked exact-live material. Continue with causal lineage/retention experiments, not blanket width. Width/diversity/dedup changes are retention policies and may be non-monotonic.

Known-lineage survival is a diagnostic proxy. The promotion objective remains actual level-blind solve/work. Descriptors selected on vivid extinction cases need unrelated-parent confirmation.

### Repair

Plain repair retains real deep capability but also fails most hard residual levels even at large isolated budgets. Future repair work should change operator quality, initialization/restarts, state representation, or exact-informed editing rather than simply buying more of the same trajectory. CP-SAT retreat evidence should determine whether deeper editing has actual feasible slack.

A seed/initialization/operator treatment pays for all extra work. Intermediate badness improvement without cold solve/work improvement closes that form.

### Must-cross reasoning

Unconditional attraction is closed. Continue only with live-state descriptors that predict target/defer/second-approach behavior across unrelated levels or held-out families. Prefer shadow diagnostics before scoring changes. Reject descriptors that effectively encode family identity or require known-solution information.

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
- bulk variant generation without a specific unanswered question;
- framework-building for scheduler/configuration/reference/analytics before its value-of-information gate;
- optimization of lineage/badness/similarity/probe metrics after actual solve/work value fails to appear.

## Evidence anchors

- [`solver-research-operating-model.md`](solver-research-operating-model.md): experimental and promotion rules.
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md): bounded portfolio/scheduler design.
- [`solver-budget-determinism.md`](solver-budget-determinism.md): `workSpent` and deterministic budget contract.
- [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md): source/outcome/operational similarity.
- [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md): current census-derived development evidence.
- [`solver-correctness-hardening.md`](solver-correctness-hardening.md): correctness/state/provenance invariants.
- [`architecture-unification-debt.md`](architecture-unification-debt.md): search-stage mutable-state isolation as P0 structural debt.
- [`variant-level-research.md`](variant-level-research.md): family/variant evidence and parent-held-out discipline.
- [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md): implementation-speed program.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md): retained default-off experiment dispositions.
