# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **Active programs:** evidence-driven scheduling/allocation ([`solver-scheduling-policy.md`](solver-scheduling-policy.md)), architectural solver speed ([`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md)), and the queue's P0/P2-P6 validity/generalization/configuration/reference/restart-learning work.
> **Technique-operation taxonomy:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Capability/generalization boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

Measurements belong in dated reports, ranked decisions in the optimization queue, and retained/default-off dispositions in the opt-in ledger. Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Research pipeline

> semantic truth -> controlled evidence -> failure class -> exact/shadow evaluation -> narrow intervention -> level-blind matched population verdict -> independent confirmation when selected/tuned -> transfer evidence when making broad generalization claims

Correctness bugs may go directly to fix + regression/soundness validation. For speculative heuristics, test the premise first with existing observers, oracles, family comparisons, reducers, isolated-technique probes, or replay tools.

Pathfinder generally represents local legality/progress more strongly than future opportunity cost. Use exact/shadow evidence to test future viability rather than inferring it from local progress alone.

## Non-negotiable research stop rules

These are gates, not suggestions. If proposed work violates one, reformulate the experiment before spending broad compute or promoting production behavior.

1. **No more fixed-ladder accretion by default.** Do not add a default-ON attempt, whole-ladder retry, seed fan-out, profile clone, direction/width clone, protected reserve, or budget increase merely because putting it late prevents losses on levels that already solve. A strict solved-set superset obtained by spending additive tail work is not a free improvement. New search actions normally compete inside a fixed aggregate `workSpent` envelope and must displace weaker residual work, be conditionally scheduled, or explicitly justify buying a larger total budget. Correctness fixes and bounded default-OFF diagnostic prototypes are exceptions.
2. **Treat profiles as configurations until proven otherwise.** A new name, weight vector, template, width, tie-break, seed, or threshold is not evidence of a new search paradigm. Before hand-authoring a family of variants, define the parameter/configuration space and use systematic sweeps, racing/successive elimination, or an automatic configurator where feasible. A named production profile must earn marginal solve/work value or measured operational distinctness, not merely sound different.
3. **Separate discovery/tuning from confirmation.** Any population used to notice a pattern, select a threshold, choose among seeds/configs, mine a regression cohort, or pick the best of several treatments is discovery data for that decision. Do not use the same selected-on population as the sole confirmatory evidence. Use an untouched confirmation cohort, grouped/nested validation, or a fresh generated sample appropriate to the claim. Report how the candidate was selected when many alternatives were tried.
4. **Level-blindness is not generalization.** Level-blind execution proves that runtime policy did not look up the level; it does not prove that the policy generalizes beyond the corpus that taught it. Broad claims about unseen Pathfinder levels require transfer to an untouched/fresh holdout. Variant/classifier work groups siblings by parent. Until a genuinely locked holdout exists, describe stress-corpus gains as stress-corpus gains rather than universal solver improvement.
5. **Unexplained stage-history dependence is a blocker, not a feature.** The same search action, explicit input/config/seed, and deterministic work budget should not change capability merely because unrelated predecessor stages ran first, unless a documented typed handoff is part of the action contract. Cache warming may change wall cost; it must not silently change semantics, search order, randomness, or work accounting. If fresh-vs-preceded execution differs unexpectedly, stop using that stage's isolated curves for causal routing/cap conclusions until the mutable state or accounting path is explained.
6. **Use the right cost currency.** `workSpent` is the cross-technique allocation currency; raw nodes are within-technique diagnostics. Wall time measures implementation cost/latency. Do not compare heterogeneous techniques by equal node counts or credit an algorithmic policy as a kernel speedup.
7. **Race experiments instead of feeding every idea the whole corpus.** Use the smallest diagnostic population that can falsify the premise, then an explicit stratified/representative sample, then broader/holdout confirmation only for survivors. Stop directly falsified forms early. Full-corpus compute does not make a weak premise more scientific.
8. **Generate evidence adaptively, not as a data landfill.** Before generating another large variant/family/census trove, query the existing corpus and prove that the proposed batch answers a question the current data cannot. Prefer small pilot -> analysis -> targeted expansion over unconditional bulk generation. Historical large troves are nomination evidence until current-code comparability is established.
9. **Extend existing research plumbing before creating another one-off tool or truth store.** Start at [`tooling-catalog.md`](tooling-catalog.md), the research-status index, manifests, census/lifecycle/family analyzers, and current telemetry. A one-off script should either be deleted after use or promoted into a documented reusable surface when repeated value is demonstrated.
10. **Diagnose search-quality failures before prescribing more of the same search.** If a technique fails with substantial/full isolated budget, another reserve, deeper retry, nearby score vector, or wider gate is not the default next experiment. Prefer evidence about first divergence, retention, operators, restart/seed sensitivity, exact feasibility, learned/nogood information, or a genuinely different search family. More budget is justified only by measured late conditional yield.
11. **Use exact/reference solvers as controls whenever they can answer the question.** CP-SAT/reference/oracle models are diagnostic infrastructure, not failed production competitors. Before inferring a heuristic mechanism from a hard residual level, ask whether exact or bounded feasibility labels can locate the boundary. Validate model witnesses with the real referee and real witnesses in the model; do not turn one-way model agreement into proof.
12. **Do not preserve failed code merely for posterity.** The opt-in ledger governs retained experiment code. Closed mechanisms with no current reusable plumbing, diagnostic counterfactual, or identified descendant should be removed from production code after their evidence is preserved. Git/history and dated reports are the archive.
13. **Selection is part of the result.** The best of 20 profiles, seven seeds, six thresholds, four populations, or several post-hoc metrics is not equivalent to one prespecified treatment. Record the meaningful search space and selection rule. Selected winners require independent confirmation before robust effect-size claims.
14. **Do not optimize a proxy after it stops predicting the objective.** Badness, known-lineage survival, shadow catch rate, operational similarity, classifier accuracy, frontier diversity, and intermediate progress are diagnostic quantities. If improving the proxy does not improve cold solve/work/correctness, close or rethink the receptor rather than polishing the proxy.
15. **Do not hide rare capability inside an average.** Use uncertainty, denominators, paired gains/losses, unique residual solves, and Pareto tradeoffs. A high average solve/work ratio does not by itself justify deleting the only action that solves a rare hard phenotype. Conversely, one selected spectacular level does not justify broad entitlement.
16. **Frameworks must earn implementation.** Scheduler, configurator, reference-model, analytics, shadow, lineage, and learning infrastructure begin with a value-of-information pilot and a stop condition. If a simple rule/helper/prototype answers the question, do not build a general framework because the architecture is appealing.
17. **Do not make `main` the experiment scratchpad.** Prefer branch/PR execution and artifacted results. Merge before decision-bearing validation only when the required workflow/data path cannot exercise the branch, and record why the merge was necessary.

## Capability boundary and generalization scope

The product case is an unseen editor level. Cold solves may use mechanics, current search state/telemetry, and generic code/config only. Exact-level history may label offline research but may not steer capability solves.

Forbidden steering includes saved hints/solutions; prior winning config/gate/seed/order; historical solved status, timing, nodes, badness, or family outcome; per-level caches/special cases; IDs/corpus position; and practical exact/family recognition through high-dimensional fingerprints or nearest-neighbor replay. Known solutions and solution profiles are diagnostic evidence only.

**Level-blindness is an information-boundary property, not a statistical holdout.** A policy tuned repeatedly against Corpus 2 can remain perfectly level-blind while overfitting Corpus 2. Keep claims scoped accordingly.

For data-mined or tuned policies, use three roles:

- **discovery/tuning:** current stress/census/family evidence used freely to generate hypotheses and fit thresholds/configurations;
- **confirmation:** untouched or grouped-held-out levels used to decide whether the nominated treatment survives selection bias;
- **transfer/challenge:** a locked or freshly generated population not inspected during treatment design, used for broad generalization claims.

Once exact confirmation/transfer failures are inspected and used to redesign the treatment, those cases are development data for the next iteration. Reclassify/replenish rather than pretending independence survives repeated peeking.

If a locked transfer corpus does not yet exist, do not manufacture certainty. Promote useful corpus-targeted engineering when appropriate, but label the evidence as such and leave the generalization claim open.

## Failure classes

| Class | Meaning | Typical instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid accepted, unsound prune/cache/state identity, or unexplained mutable-stage dependence. | Referee, differential tests, tiny exhaustive reference, reducer, fresh-vs-preceded replay. |
| Regression | Reproducible current level/config lost prior capability. | Bisection, exact replay, causal ablation, paired current-code check. |
| Routing | Isolated technique solves cheaply but production gives it too little relevant work. | Technique census, method probe, lifecycle telemetry, bounded tail routing. |
| Search quality | Technique gets substantial/full isolated budget and still fails. | Technique trace/diagnostics, exact labels, operator/representation/restart work. |
| Representation / retention | Viable candidates are generated then ranked, deduped, or width-culled away. | Winning lineage, pair divergence, exact-prefix oracle, shadow descriptors. |
| Allocation | Useful techniques compete for finite shared work. | Lifecycle accounting, explicit work caps, matched-work A/B. |

Do not call both routing and search-quality failures “starvation”: a ladder-starved technique can still fail at full isolated budget.

## Outcome, source, and operational similarity

Keep three forms of technique comparison distinct:

- **Outcome similarity:** techniques solve/fail the same levels or have similar cost/result vectors. Census Jaccard, mutual information, overlap, substitutability, and ablation result overlap belong here.
- **Source/config similarity:** techniques share an engine, scoring equation, weight vector neighborhood, template, retention rule, prune set, or retry context. This describes implementation structure, not necessarily encountered behavior.
- **Operational similarity:** techniques actually make similar choices or traverse/preserve similar search material on shared encountered states, measured through ranking agreement, branch/frontier overlap, first divergence, retention/churn, admissible-slack behavior, or repair-native fingerprints.

Do not call outcome-vector similarity “behavioral similarity,” and do not infer operational redundancy solely from solve-set overlap. Conversely, operationally near-identical techniques can have different outcomes when a small load-bearing ordering or retention divergence cascades through combinatorial search. See [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).

## Configuration search and selection discipline

When the question is “which weights/thresholds/profiles/seeds/budget bands should this search engine use?”, treat that as an algorithm-configuration problem rather than a sequence of artisanal guesses.

- Define legal parameter/configuration ranges before looking at outcomes where feasible; preserve stable IDs and conditional parameters.
- Use cheap screens and racing/successive elimination so obviously inferior configurations do not receive the full population/budget.
- Automatic configuration may be used offline to discover candidates even if production policy remains simple and deterministic.
- Split tuning and confirmation. The best configuration from a sweep is expected to look optimistic on the sweep that selected it.
- Record how many/range of configurations were searched and the objective used to pick the survivor.
- Evaluate marginal portfolio value and rare exclusive capability, not standalone winner count.
- Compare complex policies to simple baselines; extra features/rules must earn held-out value.
- Do not multiply named profiles simply to create apparent diversity. Measure operational or residual-outcome complementarity.

Existing hand-authored archetypes/configs remain valid baselines and candidate actions; this rule prevents them from continuing to grow without comparative evidence.

## Scheduling and allocation research

The active scheduling program is [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Treat it as an evidence-integration problem, not permission to replace one fixed ladder with another or to fit a high-dimensional Corpus-2 classifier.

For ordering/allocation work:

- optimize marginal value on the population that actually reaches the decision point, with uncertainty and rare capability visible;
- report a solve/work Pareto frontier rather than hiding all tradeoffs in one scalar;
- use stable action/config identities and explicit budget bands where budget depth changes value;
- treat historical `P(B solves | A failed)` as observational until sequence/reach/work/state confounds are controlled;
- compare actions inside a fixed shared work envelope by default;
- audit whole-ladder retries and additive tail stages for current unique residual wins and outcome substitutability;
- use operational similarity as supporting evidence about redundant versus complementary exploration;
- use censored solve hazard, cap retention, residual unique capability, and current reach rather than easy-population median depth;
- treat “continue this technique for another tranche” as a separable action;
- do not use sequence-dependent evidence causally while the dependency is unexplained;
- keep known solutions, variant outcomes, regression history, and exact-level winners offline as labels;
- use parent-family splits for variant-trained/tuned rules;
- test how much headroom a simple static policy captures before building dynamic/ML scheduling;
- begin with oracle/frontier analysis and shadow planning before live reordering.

## Evidence hierarchy

1. **Canonical referee truth** for legality/correctness.
2. **Exact or bounded oracle labels** for supported feasibility questions, with approximation direction explicit.
3. **Controlled paired evidence**, especially same-parent variants or matched A/B arms.
4. **Untouched/grouped confirmation evidence** after a treatment/configuration has been selected.
5. **Transfer/challenge evidence** for broad unseen-level generalization claims.
6. **Level-blind population evidence** for corpus-specific production decisions.
7. **Historical/forensic runs** for nomination/mechanism clues, reconciled to current code before action.

Row count does not remove dependence; family research treats parents as independent units. A large selected cohort is still selected.

## Experimental substrate

Prefer existing infrastructure: deterministic work accounting; schema-v2 manifests/run identity; stress/lifecycle telemetry; family/variant and hint/solution provenance; shadow probes; winning lineage; explicit-prefix CP-SAT/reference labels; reducers/replay; isolated census/method probes; operational-similarity observers.

Start at [`tooling-catalog.md`](tooling-catalog.md). Reuse manifests/run identity, require comparability before aggregation, and keep derived analytics rebuildable. Add a framework only when it replaces repeated one-off work or a value-of-information pilot proves the general machinery is needed.

For scheduling/configuration, extend the existing census/lifecycle/family/action substrate before creating another store. Cheap racing should eliminate weak configurations before expensive traces or full-population runs.

## Shadow first

For scoring, retention, routing, scheduling, or information-sharing hypotheses, observe before changing search. Ask whether a descriptor separates exact-live/dead siblings, a reasoner catches extra dead branches without false rejects, a producer emits novel useful information, a routing feature predicts capability rather than historical winners, or a proposed scheduler chooses higher-value residual work at the same envelope.

Unless parity is the experiment, shadow instrumentation must preserve OFF/ON solution, work, cache/memo lifetime, ordering, and randomness.

Shadow metrics remain proxies. A shadow-positive candidate must still show live solve/work value and independent confirmation if it was selected on the shadow atlas.

<a id="producer--receptor-cooperation"></a>
## Producer -> receptor cooperation

A live handoff requires:

1. measured receptor limitation;
2. useful producer information the receptor cannot cheaply rediscover;
3. timely arrival;
4. bounded production/replay/storage/branching cost;
5. an independent receptor control path;
6. positive shadow evidence;
7. a level-blind matched-work verdict.

Evidence for one useful handoff does not imply a universal blackboard. Count artifact production/consumption work even when the producer was already running.

## Family/variant evidence

Use the off-main trove for controlled diagnosis, not production retries or independent-row bulk statistics. New bulk family generation requires a specific unanswered question, intended analysis, independent unit, small informative pilot, and expansion/stop condition first. Train/tune/evaluate learned rules by whole parent family and use unrelated transfer data for broader claims. See [`variant-level-research.md`](variant-level-research.md).

<a id="accepted-path-differential-diagnosis"></a>
## Accepted-path differential diagnosis

For a valid human/AI/oracle/variant path:

1. referee-validate and record provenance;
2. keep it out of the cold solve;
3. locate where unchanged search first diverges, rejects, or loses compatible prefixes;
4. identify the score/prune/state/width/routing boundary;
5. test a generic mechanism rather than optimizing compatibility with that exact path;
6. require recurrence across unrelated levels or held-out families before changing production.

Narrative explanations are not causal evidence; accepted path + trace is. One vivid path is a case study, not a population.

## Promotion contract

Production-facing treatments normally require level-blind execution; identifiable code/protocol state; complete intended population or explicit sample; non-binding deadlines when work comparability matters; comparable arms with declared treatments; gains and losses; `workSpent`, nodes, errors, and deadline truncation where relevant; transfer/cost checks appropriate to the claim; no hidden hint/data mutation; and queue/ledger updates when disposition changes.

If a treatment/configuration/threshold/metric was selected by searching alternatives on the same population, that population is **discovery/tuning data**, not sufficient confirmation. Record the selection procedure and use untouched/grouped confirmation before presenting the selected treatment as robust.

Report the intended population, actual coverage, independent unit, exclusions/missing cells, and denominators. Small rare cohorts require uncertainty and confirmation, not just an impressive percentage.

Scheduling/allocation treatments additionally require an explicit total-work envelope, current action reach, rare unique wins/losses, and a simple-policy comparator. Do not count additive tail budget as a free solve gain.

Cap/tranche treatments additionally report population reaching each band, solves retained/lost at the cutoff, measured/simulated capped work, late conditional hazard, and known sequence dependency.

Proxy improvements do not satisfy the promotion contract unless the production objective also moves. A direct small negative may close an unchanged mechanism. A promising small result usually nominates a broader or independent confirmation gate rather than immediate promotion.

## Before expensive decision-bearing runs

Use [`investigation-report-conventions.md`](investigation-report-conventions.md) and `solver:experiment-preflight` where applicable. At minimum, record before dispatch:

- treatment/control and code/ref;
- evidence role and population-selection rule;
- primary outcome and cost envelope;
- material candidate/threshold search if this is a sweep;
- smallest result that closes the form, escalates to confirmation, or justifies more infrastructure;
- stop condition for broadening the population or building a general framework.

This is lightweight precommitment, not bureaucracy. It prevents post-hoc threshold fishing from masquerading as a clean single test.

## Documentation handoff

- measurements/chronology -> dated report;
- ranked state -> [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- deferred plausible work -> [`solver-future-work.md`](solver-future-work.md);
- durable scheduler policy -> [`solver-scheduling-policy.md`](solver-scheduling-policy.md);
- retained/default-off disposition -> [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- durable technique operation/similarity -> [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md);
- concluded plans/history -> archive.