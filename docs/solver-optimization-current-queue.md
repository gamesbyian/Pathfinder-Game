# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-24 after technique-census, scheduling, speed, research-method, external-literature synthesis, and the P0/generalization/configuration/reference/beam integration audits.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization. Historical exact-level evidence may nominate research; it may not steer production solves.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduler: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Residual/future representation vocabulary: [`solver-residual-state-representation.md`](solver-residual-state-representation.md). Deferred/detail ideas: [`solver-future-work.md`](solver-future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Operational technique taxonomy: [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md). External-literature synthesis: [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md). Historical queue snapshots remain under [`archive/snapshots/`](archive/snapshots/); dated measurements remain under [`../reports/`](../reports/).

## Priority reset

The recent technique census changed the optimization problem. The solver already contains substantial latent capability that production routing/allocation fails to realize, while many named configurations are close relatives rather than independent search paradigms. Recent additive retry gains also demonstrate that more work can buy solves while making the ladder increasingly expensive. The next phase therefore prioritizes **experimental validity, allocation, generalization, and genuinely different search information** ahead of further profile/retry accretion.

The 2026-08-24 external-literature program does **not** reorder this queue. Its first two waves sharpened #1/#3 around conditional marginal portfolio value and latent-hardness/sequence confounding, and #4/#5/#6/#7 around residual interfaces, exact attainability, basin width and structural certificates. The final frontier/ZDD/DD, automaton-resource, and abstraction/backdoor reviews add a more precise representation hierarchy: exact interfaces, representative families, restricted/relaxed future models, finite-state/resource propagation, CEGAR refinement and distance to tractability. Those are gates/vocabulary, not new top-level projects.

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
- Keep exact/proof interfaces, safe relaxations, restricted/representative sets, and predictive abstractions in their correct logical roles. A predictor is not a prune/cache key.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce one historical/current fresh-vs-preceded admissible case under an identical action contract. First compare resource/accounting/config context, then compare the initial admissible child ordering as a semantic checksum. Clear MP/MC lower-bound memos before broad state diffing; if ordering agrees, trace the first tree divergence. See [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md). |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / ACTIVE** | Join current lifecycle reach + `workSpent` to census cap/tranche data; build tranche risk sets that distinguish natural exhaustion from right-censored budget stops; estimate conditional incremental solve/work value and exclusivity; keep `P(B solves | A failed)` observational where predecessor sequence/latent difficulty is uncontrolled; compute fixed-envelope Pareto/oracle headroom; test how much a simple static policy captures before survival/bandit/dynamic machinery. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md). |
| 2 | Generalization and holdout discipline | **ASAP / PROTOCOL DESIGNED, COHORTS NOT YET INSTANTIATED** | Instantiate one reproducible broad confirmation cohort and one transfer/challenge cohort under the renewable exposure/reclassification protocol. Use a separate baseline-failure-conditioned residual cohort only for explicitly residual claims. Preserve parent-family grouping and generator/source/version metadata. See [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md). |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Define stable **search-action identity separately from execution context**, expose the existing semantically valid action/tranche grammar, and compute offline portfolio-cardinality/failed-work/oracle headroom before searching raw weights or ablation-flag combinations. Race existing actions first; refine only surviving families and confirm selected survivors independently. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md). |
| 4 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Reuse the existing exact A/D case set before generating more labels. Simple scalar progress/resource summaries are already falsified; start with bounded local/interface descriptors, especially pending-vs-half-completed must-cross state and already-paid connectivity slack, and require incremental information beyond current score/prunes. If recurrence survives unrelated parents, test one simple quota/crowding/reserve intervention at unchanged width and matched `workSpent`, against random reserve and width-only controls. Keep B-class live/live near-ties separate. See [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md). |
| 5 | Exact/reference-model program | **HIGH PRIORITY, BOUNDED INFRASTRUCTURE HAS PAID RENT** | Close the small bidirectional support/validation matrix and keep encoding capability separate from validation depth. Repair-retreat and beam-extinction work already demonstrate decision value, so do not expand mechanic scope or relabel existing beam cases by default. Use additional CP-SAT queries only for a concrete ranked label/counterexample gap; timeout/unsupported/relaxed never become dead/UNSAT truth. See [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md). |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY CAPABILITY RESEARCH** | For restarts, measure prespecified across-seed/tie-break distributions at equal aggregate work. For learned failure, do **not** repeat generic recurrence tests: repair exact-state memory is already useful and exact DFS transposition is already weak. Ask whether expensive **sound** failures share compact structural certificates across distinct exact states, including unattainable exact resource, residual-capacity, cut/Hall/obligation conflicts, finite-state/resource nonattainment, or assumption-core explanations, become detectable materially earlier than current rejection, and avoid enough work to repay derivation/lookup cost. Do not optimize core minimality before recurrence/value is established. |
| 7 | Repair reachability/reconstructability, CP-SAT-anchored operators, and state-conditioned must-cross reasoning | **ACTIVE, SECONDARY** | Use exact/shadow evidence to distinguish neighborhoods that freeze a necessary change from exact-live but repair-hostile residuals needing stronger reconstruction. Ask whether cheap legal descriptors separate those regimes; offline interface width, core/MCS, solution-density or backdoor/distance-to-tractability labels may explain failures but do not become runtime routing features without independent evidence. Only then test one regime-specific reopening or bounded reconstruction treatment at equal total work. Must-cross descriptors still require unrelated/held-out recurrence and legal runtime features. |
| 8 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Continue profile-led measured V8 hot spots. Run a native/WASM feasibility prototype only if a compact material hotspot can cross the boundary cheaply; close it on weak end-to-end gain. Speedups do not automatically authorize more production work. See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md). |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep mining only as scheduler/action evidence. Do not append hand-authored trailing configs merely because an isolated winner exists. A selected rule/action competes at fixed total work and needs confirmation outside the population that nominated it. |

## P0: explain cross-stage dependence

Reverse-oracle work found historical admissible-order wins that do not reproduce from a fresh prepared state despite apparently identical search settings. That is not safe to treat as ordinary lifecycle context. A pure cache warm-up may change wall time, but should not silently alter deterministic search capability at fixed work.

Static auditing has already narrowed several candidates. Admissible-order creates a fresh logical search state without a reusable DFS/beam buffer and has no PRNG input. Current retry config overrides examined restore their original config. The architecture does have real historical/current sequence-accounting hazards, including stale late-tier work-cap inheritance and cumulative-node starvation, but accounting alone cannot explain an observed change in deterministic first-child ordering. Lower-bound memo/value state remains the strongest visible semantic suspect, while resource/accounting context remains a required control.

Required diagnosis:

1. reproduce an unmodified historical/current full-ladder winner locally under its preserved protocol before interpreting treatment arms;
2. run the target admissible action fresh and after a controlled predecessor sequence with the same explicit gate/config/action/seed semantics;
3. record the resource/context vector first: `_workMeter.units`, `_workCap`, `_strictWorkCap`, cumulative nodes, supplied node/wall budgets, effective config/forced-step state, gate and canonical action identity;
4. compare the **initial admissible child ordering** as a semantic checksum;
5. if resource context differs, normalize it before inferring carryover; if initial ordering differs under equal context, clear MP/MC bound memos first and inspect only ranking/bound inputs; if initial ordering agrees, locate the first later tree divergence;
6. either eliminate accidental leakage or promote the dependency into an explicit typed producer -> receptor contract with independent controls and matched-work evidence;
7. add a regression fixture for the discovered lifetime contract.

Do not “fix” isolated experiments by always running the predecessor ladder first. That hides the dependency rather than defining it.

Until this is understood, isolated curves for affected stages may nominate questions but cannot justify production cap/routing changes that assume stage independence.

## Scheduler and portfolio repricing

The production solver should stop behaving as an ever-growing fixed ladder. Recent promotions such as late repair, legacy-distance retry, multi-seed retry, non-default admissible retry, connectivity-axis retry, and must-cross retry remain valid current behavior, but none receives permanent budget entitlement merely because it once added solves with zero measured regressions.

The scheduler program must ask, on the **current residual population**:

- what does each action add after predecessors fail;
- how much `workSpent` does it consume when reached;
- among runs still unsolved at each tranche start, what incremental solves the next tranche buys;
- whether a stop is natural exhaustion or right-censored budget termination;
- which current solves are uniquely dependent on the action/tranche and whether those are robust or tiny selected cohorts;
- whether a cheaper or more complementary fresh/continuing action substitutes for it;
- whether later budget tranches still earn their cost;
- whether a whole-ladder retry can be decomposed into narrower actions;
- how uncertain each residual-value estimate is;
- how much of oracle headroom a simple deterministic policy captures before dynamic complexity is justified.

Historical conditional success after a predecessor is observational until current-code reach, budget depletion, hidden-state, sequence effects, and shared latent instance difficulty are controlled. Failure of A can change the expected value of B simply by revealing that the instance belongs to a harder residual cohort. Censoring-aware language does not repair causal comparability by itself.

Adding a candidate expands the menu, not the default aggregate work budget. Continuation tranches are candidates too and must re-earn their budget.

## Generalization program

Corpus 2, technique-census cells, known regressions, and variant families have been repeatedly inspected and mined. They are therefore development evidence. Level-blind execution prevents runtime lookup but does not make repeated tuning on those populations statistically independent.

The protocol design now lives in [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md). The remaining infrastructure gap is **population instantiation and lifecycle exercise**, not conceptual definition.

Use three evidence roles:

- discovery/tuning data that agents may inspect freely;
- confirmation data not used to choose the candidate/threshold/configuration;
- a locked or freshly generated transfer/challenge population reserved for broader claims.

Managed confirmation/transfer populations should track exposure/reclassification such as `LOCKED`, `AGGREGATE_SEEN`, `EXPOSED`, and `DEVELOPMENT`. Exact failure inspection can be useful after a frozen verdict, but once it influences redesign those cases are development data for the next iteration.

Keep two fresh confirmation constructions separate:

- **broad confirmation:** selected without solver-outcome filtering;
- **residual confirmation:** conditioned on a frozen baseline failure rule, useful for scheduler/hard-tail claims but not by itself evidence of unconditional unseen-level improvement.

Preserve parent-family grouping for sibling variants, record generator/source/version metadata, and do not repeatedly submit candidate variants to one aggregate-only holdout until it silently becomes a tuning service.

Do not block useful corpus-targeted engineering while cohorts are instantiated. Do block overbroad language: report “Corpus-2 improvement” or “fresh baseline-failure residual improvement” when that is what was measured.

The goal is not one immortal secret benchmark. It is a renewable train/confirm/transfer discipline.

## Automatic configuration and racing

The current hand-authored attempt policy contains a large conditional parameter space: scoring weights/profiles, templates, direction, beam width/diversity, admissible tie-breaks, seeds, eligibility thresholds, and budget depth. Treat systematic selection among these as algorithm configuration rather than serial human guesses.

The first configuration audit establishes an important boundary: this is a **conditional action grammar**, not one flat boolean/continuous hypercube. Many ablation flags are repair-only, retry-only, prune-only, pure-speed, closed, or meaningful only under another mode. Do not feed the Cartesian product of every `SCORE_*`, `PRUNE_*`, `STRATEGY_*`, `TEMPLATE_*`, and `PROFILE_*` control to a configurator.

First gate:

1. define stable **search-action identity** separately from execution context such as stage/tier, predecessor contract, override, and continuation tranche;
2. expose the existing semantically valid DFS/beam/repair/admissible action vocabulary and budget tranches as the first bounded search space;
3. compute portfolio-cardinality, failed-work tax, simple greedy/static coverage and oracle headroom from existing census/lifecycle evidence before generating more runs;
4. choose/group a development population before candidate outcomes are inspected;
5. run staged racing/successive elimination so weak actions/configs do not receive full budgets/populations;
6. evaluate survivors by **marginal** coverage/work and rare exclusive capability relative to the current portfolio;
7. refine raw weights/widths/thresholds only around action families that survive the portfolio screen;
8. report how many configurations were searched and the selection objective;
9. compare against simple current/profile subsets before integrating a complex external configurator or learned selector;
10. confirm selected candidates on untouched/grouped data and distill any production choice into a compact deterministic, level-blind action set when possible.

Large portfolios create selection/overfit surface. Do not create dozens of permanent named profiles merely to expose the search space, and do not quote the winning development arm's apparent effect as an unbiased effect size.

## Exact/reference-model program

Pathfinder should maintain an independent way to answer selected feasibility questions rather than asking every question through the heuristic solver itself. The bounded reference stack has already demonstrated value on two materially different ranked questions:

- repair-retreat exact feasible/infeasible boundaries;
- beam extinction-adjacent exact live/dead labels, including the current 32-case material whose post-flipper-support rerun produced 25 live / 4 dead / 3 timeout with zero correctness/input alarms.

That means the question is now **maintenance scope and validation**, not whether an exact/reference capability can ever pay rent.

Current priorities:

1. finish the small adversarial bidirectional support matrix and keep mechanic encoding capability separate from validation depth;
2. validate real witnesses in the model and model-emitted witnesses with the canonical referee;
3. keep timeout/unknown/unsupported distinct from UNSAT/dead;
4. use existing exact labels before generating new ones;
5. issue additional CP-SAT/reduced-model queries only when a ranked question has a concrete missing label, counterexample, exact-attainability, or structural-certificate need;
6. do not expand mechanic scope merely to make the model feel “complete.” Static regular filters remain unsupported by the maintained full probe until a real decision-bearing population/question justifies them.

Useful targets include explicit-prefix completion feasibility, repair interfaces, attainable residual-resource/topology labels, structural-certificate/core counterexamples, falsification of overcoarse proposed interfaces, small exact solve/UNSAT controls, and reduced safe-relaxation/reference questions where bounded structure makes them cheaper than the full model.

Do not require the reference solver to outperform production. Its job is independent truth where tractable. If maintaining broader model scope costs more than the questions it resolves, keep only the exact/reduced forms that pay rent.

## Restart/randomization and learned failure

The multi-seed repair gain is evidence that early stochastic commitments matter, not evidence that unlimited seed fan-out is efficient.

For systematic-search restart research:

- choose a prespecified seed/tie-break set rather than reporting only the best seed found;
- measure solve probability and the whole work distribution;
- compare restart schedules against simply continuing baseline search at the same aggregate `workSpent`;
- charge the treatment for failed restarts too;
- require effects across unrelated levels before adding a scheduler action.

For learned failure, the generic recurrence premise is already partly resolved and must not be rerun as if blank-slate:

- repair's per-call exact-signature dead-end memory already found very high repeated-state opportunity on hard repair-close cases and shipped useful node savings; its semantics are deliberately **“this randomized continuation dead-ended before,” not logical UNSAT**;
- systematic DFS exact-state transposition was separately checked with a sound signature and found only roughly 0.5-16% recurrence, far below the earlier loose-signature illusion, so another exact DFS transposition push is closed absent materially new evidence;
- the remaining question is whether **soundly dead** situations, distinct from repair's merely unproductive random dead ends, share smaller structural reasons across different exact states.

The expanded feasibility/certificate/resource-propagation reviews supply candidate reason vocabulary, not preapproved prunes: exact resource no longer attainable, residual maximum capacity below target, obligation isolation behind a cut, Hall/matching deficiency in a necessary relaxation, finite-state/resource nonattainment, joint resource/topology incompatibility, or an assumption-based core from a validated exact model. Pathfinder already has distance/parity/MP-MC lower-bound/connectivity pruning, so new reason classes must add early information beyond that gauntlet rather than restating it.

Before building conflict-learning architecture:

1. collect bounded examples with clear proof scope from existing sound prune reasons, systematic exhaustion where justified, and/or exact-prefix labels;
2. for each candidate reason class, identify every state field its validity depends on and prove the intended scope sound;
3. measure recurrence across distinct exact states and unrelated parents;
4. measure how much earlier the reason becomes knowable than the current rejection and the work performed in that gap;
5. measure overlap with existing cheap prunes and exact-state caches, plus derivation/checking/storage cost;
6. only if one compact reason class earns its keep, test a bounded per-solve reason store or reason-producing prune for that class.

Do not confuse explanation minimization with value. An arbitrary core need not be minimal; a MUS is subset-minimal, not minimum-cardinality; and a cheap nonminimal reason that fires early and often can be more valuable than an expensive minimum explanation.

Conflict-directed backjumping is a later, separate branch. It is justified only if systematic-search failures demonstrably depend on a small subset of earlier decisions. Do not graft it onto randomized repair merely because both are discussed under “learning from failure.”

No approximate conflict explanation may become a hard reject, and no cross-level persistent learned state belongs in cold capability.

## Active specialist research

### Beam retention

Existing exact-prefix evidence separates at least two beam-extinction regimes:

- **A/D-class:** exact labels show score-preferred dead material displacing exact-live alternatives, including width-saturated D cases;
- **B-class near-ties:** resolved examples are live/live rather than dead/live and should not be assumed to share the same defect.

The 2026-08-24 descriptor sanity check adds several concrete constraints. On four selected exact A/D parents, remaining length, remaining intersections, objective counts, goal distance, and global axis-consumption summaries all fail as monotone future-opportunity rules. `S00030` is especially diagnostic: its dead and live candidates share position, remaining length, remaining intersection budget, goal distance, and the current `(flipperUsedMask, mustCrossMask)` diversity bucket. The live state has already made one pass through a still-pending must-cross while the dead state has not. That first-pass distinction is present in `crossCounts` and already influences scoring, but is absent from the coarse diversity representation. It is a nominated descriptor, not evidence that changing retention will help.

The next beam question is therefore not generic “more diversity.” At existing exact-labeled A/D parents, test offline whether a **small prespecified set of cheap, level-blind interface descriptors** identifies redundant survivor-set coverage or an underrepresented live future better than score alone. Lead with:

- pending-vs-half-completed must-cross status;
- bounded local H/V axis/interface availability around current/pending obligations;
- connectivity slack or bounded reached-set summaries **only when reusing an already-scheduled connectivity pass**;
- current diversity masks paired with one such interface signal.

Connectivity is already a major hot path and beam throttles it to every eighth real-length step plus the final 20 steps. Do not launch a second flood fill per candidate merely to create a descriptor. Full bridge/cut/corridor or exact-attainability work is second-line and must earn its cost.

The decision-diagram/representative-set literature sharpens the objective: think of beam as a **restricted representation** and ask whether survivors provide marginal future-extension coverage. Representative-family algebra itself is not justified without a matching exact interface/property.

Do not count information already embodied by current goal-distance/parity/MP-MC lower-bound/connectivity prunes or current scoring as a new descriptor win. The useful signal is what remains **after** those checks pass and still improves representation of viable futures.

If a descriptor recurs across unrelated parents, test the simplest retention expression first: bucket/quota/crowding or one small reserve slot, at unchanged width and matched `workSpent`. Include random reserve and ordinary width increase as controls. Exact-live retention is still a proxy; promotion requires actual cold solve/work improvement.

Do not escalate directly to DPP subset selection, MAP-Elites, large novelty archives, representative-set/rank-based DP, or a decision-diagram engine. Coarse beam dedup is already an intentional population-shaping policy, not a sound equivalence relation, and prior mechanical refinements should not be resurrected as “better dedup.”

### Repair

Plain repair retains real deep capability but also fails most hard residual levels even at large isolated budgets. Exact retreat work now shows **both** relevant regimes:

1. some retained elites become provably unrecoverable at an early choice, so useful repair would have to reopen substantial earlier structure;
2. other elites remain exact-live until very near the observed dead end, yet current randomized rollout and `closeLengthGap`-style reconstruction can still fail badly from those live prefixes.

The second regime means “repair farther back” is not a universal answer. A residual can be reachable in principle yet effectively unreconstructable by the current repair machinery. Conversely, the first regime means last-mile reconstruction cannot fix every failure.

Structured plan-repair literature sharpens the conceptual split: **unrefinement/refinement** removes obstructing commitments before rebuilding, while repair-window methods expand the reopened region only when the preserved context excludes all repairs. Frontier/context research further says nominal rollback size is not the whole story: a large reopened region behind a narrow interface can be easier than a small region strongly coupled to frozen commitments.

Before adding another operator, use exact/shadow evidence to ask whether **cheap hint-free runtime state** can distinguish neighborhood-excludes-solution from late-live-but-repair-hostile cases. In addition to topology/connectivity, evaluate whether residual interface state, lower/upper capacity, exact-resource attainability/parity, obligation distribution, cut/corridor scarcity, or cheap forced-choice/viable-branching summaries add information beyond existing prunes. Offline core/MCS, solution-density or backdoor/distance-to-tractability labels may clarify the failure mode but are not production routing features by default.

Only a recurring level-blind separation unlocks regime-specific implementation:

- early-broken cases: one deeper or dependency-targeted prefix/splice reopening mechanism;
- exact-live but repair-hostile residuals: one stronger bounded reconstruction mechanism, plausibly exact/constraint-assisted on a deliberately small residual, rather than more random rollout or another copy of ordinary DFS.

Do not build a general ALNS/plan-repair controller, adaptive operator weighting, bandits, RL selection, MCS-guided destroy framework, or backdoor detector before a simple bounded treatment earns value. A selector cannot create useful operators. Any operator pays its full work cost and must improve cold solve/work, not only badness or exact-prefix survival.

### Must-cross reasoning

Unconditional attraction is closed. Continue only with live-state descriptors that predict target/defer/second-approach behavior across unrelated levels or held-out families. Prefer shadow diagnostics before scoring changes. Reject descriptors that effectively encode family identity or require known-solution information.

## Completed/deprioritized directions

These remain documented in dated reports, archived queue snapshots, or the opt-in ledger; they are not current work merely because code/data survive:

- broad failure-conditioned “give repair more budget” as a generic fix;
- broad repair-fallback gate widening on existing coarse features;
- generic repair elite-pool/diversification/relinking work without a newly diagnosed conditional failure mode;
- a general ALNS/adaptive-operator/plan-repair framework before complementary operators earn it;
- mechanics-conditioned admissible-order reserve/density forms already closed negative;
- universal beam-width increases;
- DPP/MAP-Elites/large novelty-archive beam machinery before a simple future-coverage descriptor earns escalation;
- production ZDD/Graphillion/TdZdd or a generic decision-diagram engine before a bounded interface question earns it;
- rank-based representative-set machinery without a matching exact interface/property;
- generic `REGULAR`/`MULTICOST-REGULAR` infrastructure before a compact finite-state residual subproblem earns it;
- online CEGAR/interpolation/backdoor machinery before one candidate abstraction/tractable class proves value;
- exact/approximate model counting as a production beam/repair feature before cheap basin-width proxies prove value;
- global legacy-distance guidance swap;
- retry-tier node staircase in its tested form;
- repair elite-prefix DFS and its additive retry form;
- portal parity envelope in its measured form;
- exact global DFS/beam transposition caching as a major opportunity;
- context-equivalent caching from an approximate interface that lacks a future-sufficiency proof;
- broad CDCL/LCG-style architecture or routine MUS/minimum-core computation before a compact recurring sound reason class is demonstrated;
- a generic RCSP/label-setting engine or ordinary “less resource used is better” dominance for exact targets without proof of completion-set subsumption;
- broad graph canonicalization or orientation/mirroring production retries as a substitute for diagnosing representation bias;
- treating same-seed transformed randomized runs as semantically coupled after search order diverges;
- survival/hazard/frailty/bandit/value-of-computation scheduler machinery before simple conditional-tranche repricing demonstrates remaining headroom;
- bulk variant generation without a specific unanswered question;
- framework-building for scheduler/configuration/reference/analytics before its value-of-information gate;
- optimization of lineage/badness/similarity/probe metrics after actual solve/work value fails to appear.

## Evidence anchors

- [`solver-research-operating-model.md`](solver-research-operating-model.md): experimental and promotion rules.
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md): bounded portfolio/scheduler design and continuation-value policy.
- [`solver-residual-state-representation.md`](solver-residual-state-representation.md): exact/representative/restricted/relaxed/predictive future representations, interface/basin/backdoor distinctions, automaton-resource propagation and CEGAR/refinement vocabulary.
- [`solver-budget-determinism.md`](solver-budget-determinism.md): `workSpent` and deterministic budget contract.
- [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md): source/outcome/operational similarity.
- [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md): current census-derived development evidence.
- [`solver-correctness-hardening.md`](solver-correctness-hardening.md): correctness/state/provenance invariants.
- [`architecture-unification-debt.md`](architecture-unification-debt.md): search-stage mutable-state isolation as P0 structural debt.
- [`variant-level-research.md`](variant-level-research.md): family/variant evidence, parent-held-out discipline, and symmetry first-divergence/randomness policy.
- [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md): implementation-speed program.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md): retained default-off experiment dispositions.
- [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md): P0 stage-history diagnosis and semantic-checksum next step.
- [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md): renewable broad/residual confirmation and transfer lifecycle.
- [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md): bounded CP-SAT support/validation/value audit.
- [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md): exact A/D scalar falsifications, runtime-cost audit, and first cheap retention descriptor candidate.
- [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md): fourteen-report literature-to-Pathfinder synthesis.
- [`../reports/2026-08-24-third-wave-cross-pollination-addendum.md`](../reports/2026-08-24-third-wave-cross-pollination-addendum.md): final frontier/DD, automaton-resource and abstraction/backdoor cross-links.