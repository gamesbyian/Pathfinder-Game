# Evidence-driven solver scheduling and allocation

> **Status:** **ASAP / HIGH PRIORITY ACTIVE PROGRAM**.
> **Objective:** replace continued fixed-ladder accretion with level-blind, evidence-driven ordering and bounded allocation that improves the solve/work Pareto frontier while preserving valuable rare capability.
> **Authority:** implementation behavior remains [`solver-architecture.md`](solver-architecture.md); research rules are [`solver-research-operating-model.md`](solver-research-operating-model.md); budget semantics are [`solver-budget-determinism.md`](solver-budget-determinism.md); ranked execution is [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Why this program exists

Recent gains repeatedly came from adding a late attempt or whole-ladder retry so already-solved levels exited before the new work. That is a useful regression-control technique, but it does not scale as architecture. Every successful addition can become another tax paid by the hardest unsolved levels.

The technique census also showed that production sometimes misses cheap capability already present in the solver, while several named techniques are operationally close relatives. The problem is therefore no longer merely “invent another technique.” It is **algorithm selection, configuration, and resource allocation**.

The runtime question should become:

> Given this unseen level's legal features, what has happened in this solve so far, the candidate actions still available, and the remaining shared work budget, which action or continuation is worth the next quantum of work?

The 2026-08-24 portfolio literature review sharpens this as a **continuation-value** problem. If an action has already consumed work `t` without solving, its next tranche should be valued conditional on having survived unsolved to `t`, not by the action's unconditional average success. A budget stop is right-censoring; natural search exhaustion is a different state and must not be treated as an ordinary timeout.

Do not reduce that question to one naive scalar if doing so sacrifices rare but genuine capability. The scheduler should expose a solve/work **Pareto tradeoff**, uncertainty, and protected long-tail actions where evidence supports them.

## Governance rules

1. **Adding an action expands the menu, not the default total budget.** New actions normally displace weaker residual work or are conditionally selected.
2. **Schedule actions, not names.** The unit is `technique/config + flags/mode + budget quantum + eligibility/dependencies`, not a marketing label for a profile.
3. **A continuation must re-earn its budget.** Reaching an early tranche does not automatically entitle the same technique to every later tranche. Evaluate incremental solve value among runs still unsolved at tranche start.
4. **Distinguish exhaustion from censoring.** A naturally exhausted beam/action has no continuation value in that state; a node/work-capped run only establishes that it did not solve by the cutoff.
5. **Use `workSpent` across techniques.** Raw nodes remain within-technique diagnostics.
6. **Dead-last zero-regression placement is not economic evidence.** Existing retry tiers remain current baselines but are subject to repricing, decomposition, shrinking, conditioning, reordering, or removal.
7. **Level-blindness is necessary but not sufficient.** Scheduler rules tuned on Corpus 2 or a family trove require untouched/grouped confirmation before broad generalization claims.
8. **Unexplained predecessor-stage dependence blocks scheduler inference.** If an action behaves differently fresh vs after unrelated stages, diagnose mutable state/accounting first.
9. **Do not hand-author a large configuration family when systematic configuration can answer the question more efficiently.** Use racing/successive elimination or an offline configurator where feasible.
10. **Do not optimize only the mean.** Track rare unique capability, tail cost, uncertainty, and worst-case/regression-sensitive cohorts. A high average ratio can still erase the only action capable of solving a hard phenotype.
11. **Prefer simple policies when performance is statistically indistinguishable.** Extra rules/features create overfit surface, maintenance cost, and harder causal interpretation. Complexity must buy held-out value.
12. **Observational conditional value is nomination evidence unless sequence is controlled.** `P(B solves | A failed)` from historical ladders can reflect who reached B, predecessor budget depletion, hidden state, code drift, or selection. Validate important sequence rules through controlled current-code execution.
13. **Scheduler infrastructure has its own stop condition.** If oracle-frontier headroom is small or a simple static policy captures it, do not build a sophisticated dynamic/ML system for elegance.
14. **Keep a safe fallback while evidence is immature.** A new scheduler should be able to reproduce or defer to a known-good baseline policy during rollout/debugging. Fallback existence is not permission to ship an under-validated scheduler; it is damage containment and causal isolation.
15. **Prediction quality must be calibrated to decisions.** A model/rule that ranks actions well globally can still be badly calibrated on rare late-stage cohorts. Measure decision-specific lift/coverage, not only generic classifier accuracy.
16. **Hazard/survival models are downstream tools, not default policy.** Conditional tranche yield can be estimated empirically first. “Choose highest hazard” is not generally optimal when remaining budget, action overlap, restart semantics, uncertainty, and rare exclusive solves matter.

## Runtime information boundary

Allowed runtime inputs include generic level structure and telemetry produced during the current solve: grid/area/density, `reqLen`, `reqInt`, mechanic counts/layouts, topology/connectivity descriptors, distances, gate/config attempted, exhaustion vs budget stop, current `workSpent`, objective progress, repair trajectory, and bounded frontier/retention signals shown useful in production.

Forbidden steering remains exact identity/corpus position, saved solutions/hints, historical solved status, prior winner/config/seed/order, per-level historical budgets/timing/badness, and family/variant outcomes. Offline research may use these as labels to discover generic legal descriptors.

High-dimensional geometric/fingerprint features require extra scrutiny because they can accidentally identify families or exact historical levels. Prefer compact interpretable structural features unless held-out evidence proves added complexity generalizes.

## Current evidence that shapes allocation

The 2026-08-23 census/budget analysis establishes several durable facts:

- beams are often cheap/self-exhausting screens; their problem is frequently ordering/reach, not entitlement to huge depth;
- plain repair has real 20M-50M depth value and cannot be globally chopped to an easy-level median cap;
- deep ordinary DFS/IDA is a stronger overspend nomination because much of its hard-population work is reproduced elsewhere;
- admissible-order profiles have unequal value and some historical sequence dependence, so cap changes need real-ladder validation;
- `ida:none` appears more distinct at deep budgets than the other canonical admissible profiles;
- the hard residual population has materially deeper required budgets than the easy/production-solved population;
- cheap isolated winners being omitted by production proves that routing/allocation can matter as much as new search capability;
- capped census data already contain the raw ingredients for conditional tranche-value analysis, including natural exhaustion for beam and censored deep runs for other families.

See [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md), [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md), and [`../reports/portfolios-deep-research-report.md`](../reports/portfolios-deep-research-report.md).

## Action registry

Create one stable registry of meaningful candidate actions. Each action should identify:

- search family/engine;
- config/template/width/direction/seed/restart mode;
- relevant ablation or retention flags;
- budget quantum or continuation band;
- eligibility/dependencies;
- whether it is a fresh action or continuation;
- operational family/cluster when measured;
- current production status;
- evidence freshness and whether value estimates are isolated, historical-sequential, or controlled-current.

A continuation tranche is its own action for valuation purposes. `repair 20M→30M` need not have the same residual value as `repair 0→10M`.

Do not proliferate permanent profile names simply to encode combinations. The registry should make the parameter space machine-readable enough for analysis and configuration search without turning every explored configuration into production API.

Stable action IDs are research identity, not permanent API compatibility. Remove or consolidate actions when evidence says they no longer deserve production candidacy; preserve historical mappings in reports/manifests where needed.

### Search identity versus execution context

Do not overload one identifier with both the requested search behavior and the circumstances in which it happened to run.

Keep at least two conceptual layers:

- **search-action identity:** engine/family, scoring profile, template, width/diversity, repair/admissible flavor, seed/restart semantics, and any behavior-changing flags;
- **execution context:** stage/tier, predecessor contract, forced overrides, fresh-versus-continuation status, allocated tranche, cumulative accounting scope, and any typed producer input.

This distinction is required by P0. The same nominal beam/DFS/admissible configuration can appear in main, a protected suffix, or a retry under different accounting and predecessor state. Conversely, two differently named production stages may execute the same underlying search action. Portfolio/configuration analysis should not manufacture algorithm diversity from context aliases, and it should not erase context when context is causally part of the action contract.

## Automatic configuration and racing

The scheduler program should use algorithm-configuration methods as **offline discovery machinery**, even if the final production policy is simple and deterministic.

### First search the existing action grammar, not the raw boolean cube

The current solver already has a strong conditional configuration grammar. Main-loop actions are meaningful combinations of search engine, named scoring profile, optional structural template, beam width/diversity, and stage-compatible options. Repair and admissible-order have their own conditional vocabularies. Many ablation flags are repair-only, retry-only, prune-only, experimental, closed, or pure-speed mechanisms.

Therefore the first configurator/racing pilot should **not** form the Cartesian product of every `SCORE_*`, `PRUNE_*`, `STRATEGY_*`, `TEMPLATE_*`, and `PROFILE_*` flag. That space is dominated by invalid, semantically redundant, already-closed, or context-dependent combinations.

Start with existing semantically valid named actions/tranches. Let systematic selection answer which action families deserve to survive before inventing nearby weights, thresholds, or flag combinations.

A useful hierarchy is:

1. **action pruning:** which existing DFS/beam/repair/admissible actions add reproducible marginal capability;
2. **static portfolio construction:** which small ordered action/tranche set captures most measured fixed-work coverage;
3. **coarse routing:** whether a few legal static level features materially improve over the best global static portfolio;
4. **local parameter refinement:** only around surviving action families, search nearby weights/widths/budgets/thresholds;
5. **external configurator or learned selector:** only if simpler stages leave demonstrated held-out headroom.

This hierarchy is a complexity gate, not a permanent ban on lower-level tuning.

### What to configure

Candidate dimensions include scoring weights/profiles, template geometry, direction, beam width/diversity, admissible tie-breaks, seeds/restart policy, eligibility thresholds, and budget tranches.

Named current profiles are a useful coarse discretization of scoring-weight space. If portfolio construction eliminates most profile families, refine weights only around the survivors rather than launching an unconstrained high-dimensional weight search first.

### How to search

1. define legal conditional parameter ranges and stable config IDs;
2. choose a bounded development population before looking at candidate outcomes;
3. group correlated variant rows by parent;
4. use racing/successive elimination so clearly inferior configs stop receiving levels/budget;
5. optimize **marginal portfolio contribution** and solve/work Pareto behavior, not standalone solve count;
6. account for censoring, exhaustion, failures, rare unique solves, and uncertainty, not just wins;
7. record how many configurations/thresholds were searched and how the survivor was selected;
8. confirm selected candidates on data not used to select them;
9. prefer a compact production action set over retaining every explored configuration.

Portfolio construction should preserve reproducible rare specialists when they add capability unavailable from cheaper actions. Conversely, many similar arms increase selection/overfit surface without adding real portfolio value.

An external configurator is optional. The required idea is systematic search, early elimination, and honest selection accounting, not a particular package.

Do not report the best development configuration's effect size as though it were a prespecified estimate. Selection makes it optimistic by construction.

### Portfolio cardinality and failed-work tax

Report how coverage changes with portfolio size under the same aggregate work envelope: best 1 action, best 2, best 3, and so on. Pair that with the exact rare/exclusive solves lost as the portfolio shrinks. This reveals whether the apparent solver menagerie contains many genuinely complementary actions or a small useful core plus aliases/redundant tails.

Charge every reached action for failed work. A dead-last action can be regression-safe for easy levels because they exit before reaching it while still imposing a large tax on the hard residual population. “Adds solves with no losses” is not enough for portfolio inclusion when the action burns substantial work across failures.

## Offline scheduler analysis

Before a live scheduler changes production order, build the following views from current evidence.

### Residual-value / continuation table

For every material action/context and continuation tranche report:

- eligible/reached population;
- **risk set at tranche start:** runs still unsolved and actually capable of receiving the tranche;
- solves and unique marginal solves in the tranche;
- conditional tranche success `P(t < T <= t+Δ | T > t)` where the data support that interpretation;
- natural exhaustion versus budget/right-censored stop;
- `workSpent` quantiles on solved and failed cases;
- expected failed-work tax when the tranche is reached;
- conditional success after common predecessor failures;
- outcome overlap/substitution with fresh or continuing alternatives;
- operational similarity/difference where measured;
- current production reach and starvation/overspend status;
- evidence freshness/provenance;
- uncertainty/sample size, especially for rare phenotypes and late tranches.

Do not compare a 3/5 niche action to a 40/500 broad action only by raw rate. Small denominators and selected cohorts need uncertainty/confirmation.

Do not convert timeouts into fictional exact runtimes. Censored observations say the action survived unsolved through the cutoff. Do not keep naturally exhausted rows in a later-tranche risk set.

### Oracle frontier

Estimate the best solve-vs-work frontier possible from measured action/tranche cells under fixed envelopes. Start with perfect static routing; add sequential residual routing only where the data are causally comparable.

Report a **frontier**, not only one chosen operating point. Include:

- maximum measured coverage at several work envelopes;
- rare/exclusive solves lost at cheaper points;
- sensitivity to uncertainty/missing action cells;
- upper bound assuming perfect routing versus achievable simple policies.

This is a value-of-information gate. If even an oracle selector cannot materially beat the live policy at fixed work, do not build a complicated scheduler.

An oracle built from the same mined matrix used to define candidate actions is an optimistic ceiling, not a forecast. Missing cells, sequence dependence, selected configurations, and current-code drift must be visible in the bound.

For automatic configuration, compare the current production ladder against at least a simple greedy marginal portfolio and the bounded static optimum/upper bound available from the measured matrix. If a tiny static portfolio captures nearly all measurable oracle headroom, conditional routing/configuration complexity has not earned implementation.

### Tail audit

Audit all current additive/retry stages on the current baseline. For each, ask:

- how often is it reached;
- current unique residual solves;
- total and conditional `workSpent`;
- which narrower actions actually produce those wins;
- whether upstream improvements have made it redundant;
- what earlier work could replace it at equal cost;
- whether its unique solves are robust or a tiny historically selected cohort needing fresh confirmation;
- whether the stage's later tranches retain conditional value after earlier failure or merely inherit old budget entitlement.

Whole-ladder retries deserve special scrutiny because one stage name can fan out into many expensive attempts.

## Generalization protocol

Scheduler development has a high overfitting risk because it selects among many actions, thresholds, features, and budget bands using repeatedly mined data.

Use three evidence roles:

1. **Discovery/tuning:** current stress/census/family evidence used to generate rules and configure actions.
2. **Confirmation:** untouched or grouped-held-out levels used after the candidate is selected.
3. **Transfer/challenge:** locked or freshly generated levels not inspected during policy design, used for broad claims.

Variant siblings remain grouped by parent. A holdout becomes development data once its exact failures repeatedly influence policy and should then be replaced/reclassified. If a fresh evaluation cohort is selected by requiring the frozen baseline to fail, treat it as a residual-confirmation population and scope the claim accordingly; do not use that conditioned hard tail as the sole evidence for broad unseen-level improvement. See [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md).

For model/rule selection:

- split before fitting thresholds/feature sets;
- nested validation is preferable when both feature/config selection and performance estimation occur;
- compare against simple baselines such as current archetypes, global action order, and a small score table;
- report feature count/policy complexity and ablate whether the extra complexity actually adds held-out value;
- avoid repeated peeking at the transfer set while iterating;
- inspect calibration/decision quality across rare action cohorts rather than only aggregate accuracy/AUC-like summaries;
- when possible, bootstrap/resample by independent level/parent units to see whether policy ranking is stable to sample composition.

Until a locked transfer population exists, report Corpus-specific improvements as such.

## Scheduler generations

### Generation A: static scheduler

Use only legal static level features and a fixed aggregate work envelope. Rank candidate actions and budget bands deterministically. Existing archetypes are baseline features, not the final routing language.

Start simple: a small score/rule table or empirically ordered action list is preferable to a learned model if it captures most oracle headroom. Generation A should already answer whether current cheap screens, repair depth, redundant deep DFS/IDA, and retry-tail work can be better allocated.

A useful first baseline is not necessarily “predict the winning technique.” It may simply reorder cheap high-value screens, split deep continuations into tranches, and remove obviously dominated tail work. This avoids turning scheduler design into a classification problem more complicated than the allocation problem itself.

### Generation B: dynamic re-ranking

Only after Generation A demonstrates held-out value, update priorities using telemetry generated by the current solve: exhaustion, progress, repair plateau shape, frontier/retention pressure, objective/resource state, etc.

Dynamic features multiply the policy search space. Add one only when:

- a concrete conditional-value hypothesis exists;
- the signal is production-cheap;
- its value is demonstrated after controlling predecessor work/state;
- it improves held-out policy performance beyond static features.

The target quantity is conditional marginal value with uncertainty, not global technique strength.

Empirical tranche tables come first. Survival/hazard modeling is justified only if censoring is substantial and a model predicts continuation value better than simple tranche estimates on held-out data. Bandit or explicit value-of-computation control is a later layer still, appropriate only if repeated online decisions leave material headroom after simpler static/dynamic policies.

### Generation C: typed producer -> scheduler signals

Only after measured evidence shows one stage emits information another action can exploit should a typed artifact enter scheduler state. Follow the producer/receptor contract in [`solver-research-operating-model.md`](solver-research-operating-model.md); do not create an unconstrained blackboard.

## Failure behavior and fallback

A scheduler must define what happens when its evidence is weak or inputs are outside the calibrated region.

Prefer conservative behavior such as:

- fall back to the current baseline order for unsupported/unknown feature combinations;
- preserve a small set of complementary protected actions when uncertainty is high;
- avoid extrapolating sharp threshold rules far outside development ranges;
- emit telemetry identifying fallback/low-confidence decisions so they can be studied offline.

Do not use confidence as a magic scalar unless it is itself calibrated. The goal is graceful degradation, not decorative probability output.

## Architecture seam

Keep strategic policy centralized:

- `stage-policy.ts`: stable stage/action metadata;
- `attempts.ts`: candidate action definitions and static features;
- `stage-plan.ts`: eligibility and ordering/planning;
- `stage-budget.ts`: shared work envelope, tranches, protected minima;
- `orchestration.ts`: execution and telemetry feedback, not policy sprawl;
- `stage-executors.ts`: execute an action without owning global ordering.

The migration should reduce first-match hand-authored bundle logic rather than put another policy layer beside it.

## Promotion path

1. **Preflight:** verify run identity, population, action IDs, deterministic work envelope, evidence role, and selection procedure.
2. **Offline conditional-value/oracle frontier:** establish plausible value before framework work; distinguish exhaustion from censoring and value continuations by tranche.
3. **Simple baseline:** ask how much headroom a trivial reorder/rule table captures before adding model complexity.
4. **Stability/calibration check:** verify the candidate policy/action ranking is not driven by one tiny cohort or one data split; examine rare capability and uncertainty.
5. **Shadow plan:** legacy scheduler still executes while the candidate scheduler records its choices without changing search/order/randomness/work.
6. **Matched-work A/B:** scheduler drives an explicit population under `strictTotalWorkBudget` or another declared fixed envelope.
7. **Confirmation:** use data not involved in selecting the policy/configuration; family-group when relevant.
8. **Transfer:** check published/Corpus 1/2 and locked/fresh challenge data appropriate to the claim.
9. **Report:** paired gains/losses, `workSpent`, wall time, reach, selected actions, budget bands, truncation/errors, rare unique losses, policy complexity, fallback frequency, and residual unique wins.
10. **Reprice continuously:** an action's historical win count is not permanent budget entitlement.

## Immediate execution order

1. Resolve the P0 fresh-vs-predecessor stage-dependence issue for any action whose isolated/live evidence conflicts.
2. Join current production lifecycle reach and `workSpent` to existing cap/tranche census outputs.
3. Build explicit tranche risk sets, separating natural exhaustion from right-censored budget stops, and compute conditional incremental solve/work value.
4. Define stable action IDs with separate search-action identity and execution context; expose the current semantically valid action/configuration grammar without creating new named profiles or flattening every ablation flag into one Cartesian search space.
5. Compute fixed-work oracle frontiers, uncertainty, portfolio-cardinality curves, failed-work tax, and current retry/tail economics using action/tranche cells.
6. Test how much oracle headroom a simple greedy/bounded static policy can capture.
7. Build only the minimum racing/successive-elimination plumbing needed to prune existing action/config candidates offline.
8. Refine weights/widths/thresholds only around action families that survive the portfolio screen.
9. Prototype Generation A static scheduling under strict total work.
10. Check policy stability/calibration and fallback behavior before adding dynamic features.
11. Shadow and matched-work A/B it.
12. Establish untouched confirmation/transfer evaluation before claiming broad generalization.
13. Add dynamic telemetry only if static scheduling leaves measured headroom that the telemetry can plausibly recover.
14. Consider survival/hazard, bandit, explicit metareasoning, or a high-dimensional external configurator only if simpler conditional-value scheduling/configuration leaves demonstrated held-out headroom.

Do not let scheduler infrastructure become a large project before oracle-frontier and simple-policy gates prove both headroom and need.

## Relationship to speed research

Scheduling reduces unnecessary work; architectural optimization reduces the cost of work still worth doing. Keep the evidence separate:

- scheduler comparisons use machine-independent work;
- pure-speed changes preserve search work/decisions when claiming order preservation;
- wall speed must not alter scheduler allocations;
- doing less work is not itself an implementation speedup.

See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).