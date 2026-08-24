# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **ASAP programs:** evidence-driven scheduling/allocation ([`solver-scheduling-policy.md`](solver-scheduling-policy.md)) and architectural solver speed ([`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md)) are both **HIGH PRIORITY**.
> **Current scheduler budget evidence:** [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md).
> **Technique-operation taxonomy:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Capability boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

Measurements belong in dated reports, ranked decisions in the optimization queue, and retained/default-off dispositions in the opt-in ledger. Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Research pipeline

> semantic truth -> controlled evidence -> failure class -> exact/shadow evaluation -> narrow intervention -> level-blind matched population verdict -> independent confirmation when the treatment was discovered/tuned on that population

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

## Capability boundary and generalization scope

The product case is an unseen editor level. Cold solves may use mechanics, current search state/telemetry, and generic code/config only. Exact-level history may label offline research but may not steer capability solves.

Forbidden steering includes saved hints/solutions; prior winning config/gate/seed/order; historical solved status, timing, nodes, badness, or family outcome; per-level caches/special cases; and IDs/corpus position. Known solutions are diagnostic evidence only.

**Level-blindness is an information-boundary property, not a statistical holdout.** A policy tuned repeatedly against Corpus 2 can remain perfectly level-blind while overfitting Corpus 2. Keep claims scoped accordingly.

For data-mined or tuned policies, use three roles where feasible:

- **discovery/tuning:** current stress/census/family evidence used freely to generate hypotheses and fit thresholds/configurations;
- **confirmation:** untouched or grouped-held-out levels used to decide whether the nominated treatment survives selection bias;
- **final transfer/challenge:** a locked or freshly generated population not inspected during treatment design, used for broad generalization claims.

If a locked transfer corpus does not yet exist, do not manufacture certainty. Promote a useful corpus-targeted engineering change when appropriate, but label the evidence as such and leave the generalization claim open.

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

- Enumerate the legal parameter/configuration space where practical; preserve stable IDs and conditional parameters.
- Use cheap screens and racing/successive elimination so obviously inferior configurations do not receive the full population/budget.
- Automatic configuration may be used offline to discover candidates even if production policy remains simple and deterministic.
- Split tuning and confirmation. The best configuration from a sweep is expected to look optimistic on the sweep that selected it.
- Evaluate marginal portfolio value, not standalone winner count. A globally strong configuration can be useless after the current portfolio has already covered its solves.
- Do not multiply named profiles simply to create apparent diversity. Measure operational or residual-outcome complementarity.

Existing hand-authored archetypes/configs remain valid baselines and candidate actions; this rule prevents them from continuing to grow without comparative evidence.

## Scheduling and allocation research

The active scheduling program is [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Treat it as an evidence-integration problem, not permission to replace one fixed ladder with another. The current census budget-depth analysis is [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md).

For ordering/allocation work:

- optimize **marginal value on the population that actually reaches the decision point**, not total historical solve rate;
- use stable action/config identities and explicit budget bands where budget depth changes value;
- prefer conditional success after observed predecessor failure over unconditional winner counts;
- compare actions inside a fixed shared work envelope by default; a new action expands the candidate menu rather than silently increasing total work;
- audit whole-ladder retries and additive tail stages for current unique residual wins and **outcome substitutability** before adding more; treat that as a scheduler value screen, not proof that their search operation is redundant;
- use operational similarity, when measured, as complementary evidence about whether multiple actions are spending work in the same search region or providing genuinely different exploration;
- do **not** infer a safe cap from easy-population median winning depth alone: use censored solve hazard, cap-retention, residual unique capability, and current stage reach; the census shows beams self-exhaust cheaply while plain repair retains substantial 20M–50M yield;
- treat “continue this technique for the next budget tranche” as a separable scheduling action when evidence supports it, so later work must re-earn priority rather than follow automatically from an earlier tranche;
- if a stage only reproduces historical wins after predecessor stages have executed and no explicit handoff explains why, classify the dependency before using it as scheduler evidence; do not normalize unexplained mutable-state coupling as “sequence dependence”;
- keep known solutions, variant outcomes, regression history, and exact-level winners offline as labels; distill them into generic level/state descriptors before runtime use;
- use parent-family splits for variant-trained/tuned routing rules;
- begin with offline oracle/frontier analysis and shadow planning before a live scheduler changes production order.

A scheduler policy can be simple and deterministic. Statistical or ML models may discover candidate rules offline, but promotion evidence must still identify the legal runtime features and matched-work behavior being changed.

## Evidence hierarchy

1. **Canonical referee truth** for legality/correctness.
2. **Exact or bounded oracle labels** for supported feasibility questions.
3. **Controlled paired evidence**, especially same-parent variants or matched A/B arms.
4. **Untouched/group-held-out confirmation** when a treatment, threshold, profile, or selector was discovered or tuned on another population.
5. **Level-blind population evidence** for corpus-targeted promotion/capability decisions, with claim scope matching the population used.
6. **Historical runs** for nomination/mechanism clues, reconciled to current code before action.

Row count does not remove dependence; family research treats parents as independent units. Repeatedly testing many variants on the same levels does not create independent confirmation. See [`variant-level-research.md`](variant-level-research.md).

## Experimental substrate and compute economy

Prefer existing infrastructure: deterministic work accounting; schema-v2 manifests/run identity; stress corpora/lifecycle telemetry; family/variant and hint/solution provenance; shadow probes; winning-lineage tools; explicit-prefix CP-SAT/reference labels; reducers/replay; isolated technique census/method probes.

Start at [`tooling-catalog.md`](tooling-catalog.md). Reuse experiment manifests/run identity, require comparability before aggregation, and keep derived analytics rebuildable rather than creating parallel truth. Add frameworks only when they replace repeated one-off work.

For the scheduling program specifically, extend the existing technique-census second-order/lifecycle/family query substrate before creating a new store. Per-technique cap-retention/tranche economics are already rebuildable in `scripts/technique-census-second-order.mjs`; do not rebuild them. The next census-adjacent evidence tasks are the current production lifecycle reach/`workSpent` join and the bounded operational-similarity analysis in [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md). Historical portfolio code may be reused as plumbing only after checking its closed decision record; the old broad cold-start portfolio result is not an active hypothesis.

Use a staged compute funnel by default:

1. mechanism/premise check on the smallest relevant diagnostic cohort;
2. explicit stratified/representative sample with controls;
3. broad current-corpus transfer if the treatment survives;
4. untouched/group-held-out confirmation when the candidate was selected or tuned from the earlier data;
5. full expensive sweeps only when complete coverage itself is decision-bearing.

When comparing many configurations, race them: stop dominated/clearly inferior candidates instead of granting every arm the maximum budget. Record candidate-selection provenance so the winning arm is not mistaken for an independently confirmed hypothesis.

Large generated datasets use the same discipline. Pilot first, inspect information yield and comparability, then expand toward informative boundaries. Do not create another broad trove merely because generation is parallelizable.

## Shadow first

For scoring, retention, routing, scheduling, or information-sharing hypotheses, observe before changing search. Ask whether a descriptor separates exact-live/dead siblings, a reasoner catches extra dead branches without false rejects, a producer emits novel useful information, a routing feature predicts isolated capability rather than historical winners, or a proposed scheduler chooses higher-value residual work than the live ladder at the same envelope.

Unless parity is the experiment, shadow instrumentation must preserve OFF/ON solution, work, ordering, and randomness. A scheduler shadow mode must not alter execution merely by recording its counterfactual next action.

<a id="producer--receptor-cooperation"></a>
## Producer -> receptor cooperation

A live handoff requires:

1. measured receptor limitation;
2. useful producer information the receptor cannot cheaply rediscover;
3. timely arrival;
4. bounded replay/storage/branching cost;
5. an independent receptor control path;
6. positive shadow evidence;
7. a level-blind matched-work verdict;
8. explicit inclusion of the handoff artifact in the action/state contract so any resulting stage-history dependence is intentional and reproducible.

Useful information can still hurt if consuming it displaces successful receptor work. Evidence for individual handoffs does not imply a universal artifact blackboard. Original design: [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

## Family/variant evidence

Use the off-main trove for controlled diagnosis, not production retries or independent-row bulk statistics. Useful patterns include symmetry cliffs, local solved/unsolved boundaries, technique changes across relatives, re-embedding/density effects, and held-out-parent generalization. See [`variant-level-research.md`](variant-level-research.md).

For scheduling/classifier rules, split by parent family. A rule that separates siblings it was trained on but fails on held-out families is family memorization, not a production routing result.

Do not expand the family trove by default. First query the existing trove and run a small pilot showing that the proposed transformation/sample will add information not already present. Prefer targeted generation around measured cliffs/boundaries over another uniform bulk campaign.

<a id="accepted-path-differential-diagnosis"></a>
## Accepted-path differential diagnosis

For a valid human/AI/oracle/variant path:

1. referee-validate and record provenance;
2. keep it out of the cold solve;
3. locate where unchanged search first diverges, rejects, or loses compatible prefixes;
4. identify the score/prune/state/width/routing boundary;
5. require recurrence across unrelated levels or held-out families before changing production.

Narrative explanations are not causal evidence; accepted path + trace is. Historical note: [`archive/snapshots/ai-assisted-manual-solving.md`](archive/snapshots/ai-assisted-manual-solving.md).

## Reference/exact-solver discipline

External exact or bounded models are controls even when they are slower than production search. Keep them conceptually separate from the question of whether they should ship.

- Use the existing CP-SAT/reference/oracle surfaces to label feasibility, retreat depth, prefix viability, or small reduced instances before inventing a heuristic explanation when supported.
- For new mechanics or changed semantics, audit whether the reference model/referee coverage remains bidirectional; unsupported model scope must be explicit.
- A model witness is validated by the real referee. A real valid witness should be representable by the model before model UNSAT or boundary evidence is trusted for that domain.
- A failed production-quality external-solver attempt does not make the model useless as an oracle, counterexample generator, or reduced-subproblem reasoner.

## Promotion contract

Production-facing treatments normally require level-blind execution; identifiable code/protocol state; complete intended population or explicit sample; non-binding deadlines when work comparability matters; comparable arms with declared treatments; gains and losses; `workSpent`, nodes, errors, and deadline truncation where relevant; Corpus 1/2 and published transfer/cost checks as appropriate; no hidden hint/data mutation; and queue/ledger updates when disposition changes.

If a treatment, threshold, seed set, routing rule, or profile was selected after examining the same population, promotion evidence must identify that selection step and include independent/group-held-out confirmation appropriate to the claim. Do not present the best arm of a multi-arm exploratory sweep as though it had been specified in advance.

Scheduling/allocation treatments additionally require the total-work envelope to be explicit. If the treatment can spend more total work than control, either enforce `strictTotalWorkBudget` or report the increased envelope as part of the treatment; do not count additive tail budget as a free solve gain. Report action reach/selection and residual unique wins so a scheduler improvement can be distinguished from simply buying more search.

**From this point forward, “dead-last so it cannot regress earlier solves” is a safety property, not promotion evidence.** A new additive retry/tail tier normally requires a matched-total-work comparison or an explicit product decision to enlarge the total search budget. Historical promoted retries remain production baselines but must re-earn residual budget in scheduler audits.

Cap/tranche treatments additionally report the population reaching each band, solves retained/lost at the candidate cutoff, measured or simulated capped work, late conditional hazard, and any known sequence dependency. A low median solve depth is nomination evidence only, not a production cap justification. Unexplained predecessor-state dependence blocks isolated cap inference until the dependency is made explicit or removed.

"Complete intended population or explicit sample" does not default to a full 1700-level `solver-stress-refresh.yml` sweep. For an archetype-gated `ATTEMPT_POLICY` routing change, `solver-archetype-sample-ab.yml`'s deterministic stratified sample (the affected archetype(s) plus a small cross-archetype control) is the explicit sample that answers this contract for that class of change, at a fraction of the wall time — see [`tooling-catalog.md`](tooling-catalog.md) and [`../.github/workflows/README.md`](../.github/workflows/README.md).

A direct small negative may close an unchanged mechanism. A promising small result normally nominates a broader gate rather than promotion. A broad positive discovered by searching many alternatives still requires confirmation that accounts for that selection process.

## Documentation and code handoff

- measurements/chronology -> dated report;
- ranked state -> [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- durable scheduler policy/program contract -> [`solver-scheduling-policy.md`](solver-scheduling-policy.md);
- retained/default-off disposition -> [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- durable technique operation/similarity interpretation -> [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md);
- other durable behavior/interpretation -> topic/tool contract;
- concluded plans -> archive;
- closed prototype code with no reusable role -> remove after evidence is preserved; Git/history remains the implementation archive.
