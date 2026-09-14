# Next solver research-resource audit plans

> **Status:** planned audit program.
> **Purpose:** carry the September 2026 research-resource audit method into the next decision-bearing resources.
> **Predecessors:** the hint-provenance, variant-family, solution-profile, stress-corpus, decision-exposure, and cross-resource ancestry audits, plus `docs/solver-research-resource-contract.md`.
> **Goal:** improve solve-directed research reliability and opportunity discovery, not create audit ceremony for its own sake.

## Shared operating posture

Treat each target as a scientific instrument, not merely a file or report. The strongest prior audits combined semantic reconstruction, empirical falsification, producer/consumer review, historical-claim disposition, prospective producer repair, and solve-oriented opportunity discovery.

Every audit should therefore, where material:

1. Define the real semantic entities and identity layers before interpreting counts.
2. State the independent unit for each important claim rather than assuming rows/events/runs are independent.
3. Reconstruct generation, selection, conditioning, dependence, missingness, revision/freshness, and irreversible information loss.
4. Inspect both writers and readers. A definition-site fix is incomplete if consumers retain old semantics.
5. Attack the measurement itself before interpreting results. Use reconciliation targets, negative controls, sensitivity tests, alternate definitions, or known counterexamples.
6. Distinguish literal observation from inference. Preserve historical runs even when their interpretation narrows.
7. Quantify blast radius where old semantics affected current beliefs, queues, workstreams, or reports.
8. Add durable tooling/checks only where they prevent recurrent mistakes or materially improve discoverability.
9. Fix producers prospectively when useful information was historically discarded. Do not fabricate missing history.
10. End with solver-relevant consequences: beliefs strengthened/weakened, reopen candidates, better experiment designs, and newly exposed opportunities.

The audits should explicitly preserve distinctions such as premise failure versus implementation failure, unavailable versus false, derivative evidence versus independent corroboration, and historical capability versus current capability.

## Audit 1: experiment results and opt-in experiment ledger

### Core question

When the repository says an experiment established that a treatment helped, failed, was neutral, or should be closed, what exactly happened and what is that observation entitled to support now?

### Semantic model

Separate at least:

- research question;
- premise/hypothesis;
- treatment design;
- treatment implementation;
- experiment invocation;
- population selection/conditioning;
- arm/config identity;
- participation/exposure event;
- individual solver attempt;
- observed outcome;
- aggregate result;
- analyst interpretation;
- decision taken;
- descendant treatment influenced by that decision.

Do not allow one generic experiment identity to collapse those layers.

### Required audit depth

Build a disposition taxonomy that distinguishes:

- premise failure;
- treatment-form failure;
- implementation failure;
- participation/exposure failure;
- measurement failure;
- population/conditioning failure;
- execution failure;
- inconclusive result;
- interpretable negative;
- interpretable positive;
- regime-specific result;
- superseded result.

Census the opt-in ledger and primary manifests/reports. For decision-bearing experiments determine whether exact population identity, control arm, work semantics, participation, randomness, termination reasons, gain/loss membership, wall cost, and raw per-level outcomes survive.

Interrogate old conclusions rather than trusting summary labels. Sample important positives, famous negatives, broad closures, small-population studies, low-participation treatments, mixed-regime experiments, and results repeatedly cited downstream. Reconstruct conclusions from primary evidence.

Explicitly test whether nominal nulls could instead reflect non-participation, starvation, displaced work, wrong population, instrumentation blindness, scheduler placement, execution defects, or insufficient retained counterfactual detail.

### Empirical outputs

Quantify at minimum:

- experiments whose result is fully reproducible from retained evidence;
- experiments with exact population and arm identity;
- experiments with interpretable matched-work semantics;
- experiments with sufficient treatment participation;
- historical negatives that remain clean negatives;
- negatives that must narrow to implementation/regime/inconclusive findings;
- observations that remain valid while their inference changes;
- irrecoverable information-loss classes.

Preserve audited negative findings when the experiment system is healthy.

### Historical blast radius

Trace experiment conclusions into current workstreams, future work, capability memory, scheduling policy, archaeology, opportunity sizing, queue authorities, and later reports. Classify affected claims as still valid, historical-regime only, nomination evidence, narrowed, inconclusive, superseded, or bounded-rerun candidate.

### Prospective producer improvements

A durable experiment record should retain the smallest sufficient decision-bearing state: population/content identity, selection/conditioning, treatment ancestry, solver/config identity, arm identity, work semantics, participation counters, per-level outcome, gains/losses, termination/execution state, randomness semantics, wall cost, and final disposition.

### Solve-oriented opportunity mining

Use the audit to find:

- closed premises that were only implementation failures;
- repeated participation failures pointing to allocation problems;
- regime-dependent sign changes;
- budget cliffs;
- contradictory results worth bounded current-code reconciliation;
- experiments that were prepared but never actually run;
- evidence gaps cheap enough to close now.

Deliver a ranked `beliefs strengthened / beliefs weakened / newly worth testing` summary.

## Audit 2: technique census and capability inventory

### Core question

Does the current census measure solver capability, or does it partly measure applicability, scheduler exposure, allocation, predecessor behavior, and winner attribution?

### Semantic funnel

Represent capability observations through explicit stages where applicable:

`applicable -> eligible -> scheduled/exposed -> allocated -> invoked -> participated -> changed search -> produced candidate -> produced valid solution -> marginal/unique contribution -> whole-ladder win`

Do not use a downstream stage as a silent proxy for an upstream one.

### Required audit depth

For each meaningful technique/capability, determine what current fields such as usage, participation, success, winner, coverage, rescue, or reach actually mean.

Build an empirical funnel census with work allocation and termination context. Identify capabilities that look weak because they are rarely applicable, poorly exposed, starved, downstream of another mechanism, redundant, or hidden by winner-only attribution.

Audit credit assignment under multiple purposes rather than choosing one universal metric. Compare final winner, any successful participation, first basin exposure, unique rescue, marginal solve relative to arm removal, and stage-conditional contribution where evidence permits.

Map predecessor/scheduler relationships between techniques. Techniques that run only after another stage fails are not independent arms merely because their names differ.

Audit identity fragmentation and identity collapse:

- multiple names for one effective mechanism;
- operationally different mechanisms under one broad label;
- renamed/retired historical identities treated as equivalent;
- scheduler/allocation forms mistaken for search capabilities;
- capabilities present in code but invisible to census tooling.

### Empirical falsification

Join the census to known residual/failure classes and ask whether each stubborn class reflects missing capability or missing exposure. Test whether historical reputations change when exposure/opportunity is normalized.

Where possible, compare whole-ladder winner attribution with bounded marginal/isolation evidence to measure how much capability importance is hidden or exaggerated by winner-only records.

### Prospective producer improvements

Preserve applicable/eligible/exposed/participated/work/result fields and relevant predecessor/scheduler context for future capability evidence. Avoid retaining only the whole-ladder winner when plausible later questions need per-technique cells.

### Solve-oriented output

Produce a capability opportunity map identifying:

- high latent eligibility but poor exposure;
- high participation but low marginal value;
- productive mechanisms starved by allocation;
- reputations distorted by attribution;
- narrow capabilities with unusually strong returns;
- recurrent failure states with no existing mechanism reaching them.

This audit should directly feed WS1/WS2 questions rather than stop at taxonomy cleanup.

## Audit 3: known-solution-derived diagnostics

### Core question

What do oracle-assisted diagnostics actually measure, how sensitive are they to the selected known solution and its ancestry, and when can they inform production-search mechanisms without smuggling oracle privilege into the inference?

### Scope and taxonomy

Inventory diagnostics that consume accepted paths or exact/reference knowledge, including prefix survival, winning-path analyses, residual/separator studies, portal/crossing diagnostics, prune-gap/reference replay, and related tools.

Classify each as primarily measuring one or more of:

- actual production search behavior;
- counterfactual behavior conditioned on a known path;
- exact/reference feasibility;
- distance from a selected solution;
- survival of an oracle prefix;
- structural properties of stored solution samples;
- failure localization relative to an oracle.

State the admissible inference for each class.

### Oracle identity and selection

Audit how each tool chooses its oracle. Distinguish path-identity-bound consumers from analyses that merely need a representative valid path.

Measure sensitivity to oracle choice on a bounded but information-rich sample. Re-run suitable diagnostics across several provenance/dependency-distinct valid paths for the same level and classify conclusions as stable, quantitatively variable, or qualitatively flipping.

Treat within-level oracle sensitivity as potential signal: it may distinguish narrow basin-selection failures from broad obligation/search failures.

### Ancestry and availability conditioning

Stratify oracles by origin where known: cold production, isolated technique, family replay, external/reference, construction witness, and unattributed legacy path.

All referee-valid paths remain valid oracles, but their availability is selected evidence. Compare diagnostic phenotype by oracle origin, especially replay-derived versus non-replay-first paths, to identify basins production search systematically misses.

### Oracle leakage and dependence

Check whether:

- oracle knowledge influenced population selection;
- exact labels or oracle-derived state shaped the treatment later evaluated against the same path;
- multiple diagnostics presented as corroboration are deterministic descendants of one oracle;
- family replay, hint provenance, profile phenotype, and oracle diagnostics share upstream ancestry.

### Empirical falsification

Choose at least one important diagnostic signal and test whether it survives alternate valid oracles, lineage filtering, matched structural controls, solver-revision changes, and easy/already-solved levels.

The objective is not to force invariance. It is to learn which diagnostics are robust scientific instruments and which are path-conditional probes.

### Information-loss and producer review

Inventory old outputs that omit path identity, provenance, solver revision, stage/config identity, budget, or oracle-selection rule. Missing historical context stays missing.

Future diagnostic artifacts should retain enough oracle identity/provenance and run context to reproduce the interpretation without giant traces.

### Solve-oriented output

Develop a multi-oracle failure-phenotype vocabulary where evidence supports it, for example:

- all known basins die similarly;
- one basin survives substantially longer;
- replay-derived basins survive while production-derived basins do not;
- successful paths share an obligation ordering approximate search consistently eliminates.

Use these classes to nominate concrete retention, scoring, repair, or allocation mechanisms.

## Audit 5: research-question and opportunity maps

### Core question

Does the repository preserve the epistemic state of research questions accurately enough to allocate attention well, or do negative experiments, stale gates, duplicate questions, and resource-routing gaps distort what gets investigated next?

### Semantic model

Separate:

- observation;
- evidence item;
- premise;
- research question;
- hypothesis;
- candidate mechanism;
- experiment;
- result;
- conclusion;
- blocker/gate;
- dependency;
- opportunity;
- workstream;
- queue priority;
- reopen condition;
- closure condition.

A failed implementation must not silently close its premise, and a historical relation must not masquerade as a hard dependency.

### Decision-ancestry reconstruction

For a representative set of questions that changed state, reconstruct:

`evidence -> interpretation -> question state -> experiment choice -> result -> descendant question state`

Use solver archaeology as an external check: determine how often later archaeology recovered unfinished, regime-dependent, misclassified, or forgotten opportunities that the active question/opportunity system should have preserved.

### Failure-mode census

Look for:

- forgotten/orphaned questions;
- unsupported closures;
- implementation negatives generalized to concept negatives;
- new evidence not propagated to question state;
- satisfied gates that still block work;
- unnecessary dependencies;
- duplicate questions under different vocabulary;
- closed questions that remain active in queues;
- questions lacking any measurement capable of falsifying them;
- cheap existing resources not routed to questions they could answer.

### Cross-resource routing audit

Crosswalk major current/deferred research questions against the audited resource system. For each question, identify resources that can cheaply falsify, localize, stratify, or confirm the premise and resources that would produce dependent or semantically invalid evidence.

Do not impose mandatory use of every resource. Record useful and intentionally irrelevant relationships.

### Priority-system audit

Inspect opportunity sizing and queue priority for endogenous bias toward easy-to-measure mechanisms, existing tooling, large populations, familiar capabilities, or evidence-rich areas.

Where practical, compare historical priority judgments against later information value and solve impact.

### Prospective epistemic state

For serious questions, preserve states such as:

- phenomenon observed;
- premise plausible;
- mechanism nominated;
- measurement unavailable/available;
- experiment prepared;
- experiment run;
- result interpretable/inconclusive;
- premise strengthened/weakened;
- implementation form closed;
- concept closed;
- reopen condition.

### Solve-oriented output

Produce a question-health view plus a revised opportunity ranking emphasizing expected information gain per unit work and probability of changing a solver decision, alongside expected solve upside.

The result should improve attention allocation, not create a second opportunity catalogue.

## Audit 6: evidence-integrity registry and Research Resource Contract

### Timing

Run this after several more concrete resources have completed focused audits. It should test whether the contract generalizes rather than merely re-document the four resources that created it.

### Core question

Does satisfying the current resource contract actually prevent or expose the failure modes that have misled solver research, and does the registry describe the resources researchers truly use?

### Audit the audit system

For every major finding across completed resource audits, ask:

- Which contract field should have exposed it?
- Would a competent pre-audit declaration plausibly have noticed it?
- Is a field too vague or too checklist-like?
- Was the finding necessarily empirical?
- Is an important recurring concept missing from the contract?

Pay special attention to cross-resource causal ancestry, decision exposure, partial-resource projections, observability history, and information loss during aggregation.

### Registry-to-reality test

Sample current research reports and trace every evidence resource they actually consume. Determine whether each resource is registered, correctly described, discoverable, queryable through its advertised front door, used at its stated grain, and joined using safe identities.

Then reverse the direction: for every registered resource, identify real consumers, obsolete entries, bypassed semantic helpers, shadow resources, and catalogue-grade assets that have quietly become recurring decision-bearing inputs.

### Partial-resource and missingness audit

Test the general distinction between:

1. resource unavailable/not mounted;
2. resource available but no matching record;
3. matching record present with a genuine false/zero/negative value.

Where partial projections exist, require explicit declaration of which fields are unavailable rather than defaulting them to false or zero.

### Historical counterexamples

Take resources and claims known to have misled past research and ask whether an agent following the current contract would still make the same mistake. If yes, improve the contract or supporting preflight.

### Avoid bureaucracy

Do not respond by making every diagnostic helper an audited resource or endlessly expanding the schema. Preserve the current layered model:

- cheap catalogue for ordinary assets;
- audited declaration for recurring decision-bearing resources;
- executable mechanical checks where useful;
- claim-specific preflight for broad/promotion-facing decisions.

### Forward-looking output

Identify repeated bespoke reconstructions that imply a missing durable research resource or shared semantic helper. The registry audit should be capable of discovering the next generation of research resources, not merely cataloguing the current generation.

## Suggested order

1. Experiment results / opt-in experiment ledger.
2. Technique census / capability inventory.
3. Known-solution-derived diagnostics.
4. Research-question / opportunity maps.
5. Evidence-integrity registry / Research Resource Contract after the preceding audits have supplied enough new counterexamples.

The ordering is not a hard dependency chain. A live solver question may justify pulling a later audit forward, but the contract meta-audit benefits from more audited-resource diversity.

## Closeout standard

Each audit should close only after it has, to the extent material:

- updated or created the resource-contract declaration;
- inspected producers and consumers;
- dispositioned known historical claims;
- encoded mechanically testable invariants where worthwhile;
- documented irreversible information loss;
- identified prospective producer improvements;
- reconciled current workstream/queue implications;
- stated what the audit does **not** establish;
- ranked solve-oriented follow-up opportunities.

A large census, new solver campaign, or broad replay is not automatically required. Existing data should be exhausted first, and expensive measurement should be earned by a concrete decision it can change.
