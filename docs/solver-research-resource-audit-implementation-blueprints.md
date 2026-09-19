<!-- agent-context-budget: warn=11000 max=15000 -->
# Solver research-resource audit implementation blueprints

> **Status:** **COMPLETED / RETIRED (2026-09-14).** Historical execution companion to the completed [`solver-research-resource-next-audit-plans.md`](solver-research-resource-next-audit-plans.md); use the dated audit reports and current Resource Contract for live work.
> **Purpose:** specify the best concrete implementation of each planned research-resource audit using Pathfinder's current evidence architecture, known failure modes, and existing tooling.
> **Priority boundary:** these audits are supporting research infrastructure. They do not displace the live WS2 Class-2, Class-4, or Class-5 gates merely because an audit is available to run.

The shared methodology is intentionally implemented differently for each target. A useful resource audit does not mechanically repeat the same checklist. Each audit below names its real unit of analysis, the right split between complete census and forensic sampling, the strongest measurement attack, known positive/negative controls, the narrowest durable tooling worth adding, and the condition under which new compute is justified.

## Shared execution pattern

Use three layers unless the resource itself makes one unnecessary:

1. **Cheap complete structural census.** Enumerate identities, links, missing fields, consumer/writer surfaces, revisions, or queryability across the whole resource where this can be done without solver compute.
2. **Deep stratified forensic sample.** Choose cases by scientifically important failure mode, not convenience or apparent drama. Reconstruct them back to primary evidence and forward to current consumers.
3. **Earned empirical probe.** Run new solver/reference/diagnostic compute only when the existing record cannot answer a material ambiguity and the result can change a current inference, producer contract, or solver-research decision.

Where possible every audit should contain both an **expected-pass control** and an **expected-fail/narrow control**. A checker that accepts everything is not an audit; a checker designed so every historical case fails is equally uninformative.

Durable output should normally be: one dated audit report, one compact machine summary when repeated joins benefit from it, an audited-resource contract declaration where the target qualifies as a durable resource, and only the smallest producer/consumer/tooling changes needed to prevent recurrence. Avoid creating a new truth store.

---

## Audit 1 implementation: experiment evidence lifecycle

### Audit object

The independent audit object is a **decision-bearing evidence chain**, not an experiment filename and not an opt-in flag.

One chain is:

`question/premise -> preflight/design -> selected population -> arm/run execution -> shard/row evidence -> v3 combined/reconciled result -> report interpretation -> disposition -> capability signature -> question/workstream descendants`

A chain can branch. A selected treatment may have several development runs and one confirmation; one result may export a negative control to multiple later questions. Preserve those relationships rather than forcing one linear experiment ID.

### Complete census first

Build a read-only census of modern experiment evidence without rerunning anything.

Inventory at least:

- every discoverable `pathfinder-solver-experiment-result` v3 artifact and its `experimentId`, `workflowFamily`, `resolvedSha`, `configurationHash`, population identity/hash, limits, `decisionBearing`, and `coverage.populationIntegrity`;
- preflight/result report pairs discoverable through `research-status-index` and dated report links;
- current opt-in-ledger dispositions and recently promoted mechanisms;
- capability-memory sources/signatures referenced by current workstreams or residual analyses;
- current research-question records with `answeredBy`, `triggeredBy`, `constrains`, `calibrates`, `negativeControlFor`, or `reopensOn` relationships;
- experiment families that predate v3 or still bypass the modern result shape.

The census should answer **coverage and linkage**, not scientific validity. Useful counts include: results with no discoverable preflight, reports with no underlying machine artifact, decision-bearing results with unknown population identity, ledger entries whose primary evidence cannot be found cheaply, and capability signatures whose source observation is historical-only.

A small read-only script such as `scripts/experiment-evidence-chain-audit.mjs` is justified if the joins recur during the audit. It should consume existing result/report/index surfaces and emit diagnostics. It should not become a second experiment registry.

### Forensic sample design

Do not sample experiments uniformly. Freeze a case matrix before deep reconstruction with at least one case from each important semantic class:

| Case class | Pathfinder calibration case or shape | What it tests |
|---|---|---|
| Clean promoted positive | `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` style +gain/-0 promotion | Whether a modern positive reconstructs end to end. |
| Large capability but unacceptable collateral | global portal coarse-state merge (+158/-12) | Whether disposition and capability signature remain distinct. |
| Non-participating nominal experiment | admissible-order retry production A/B with recorded attempts but zero expansions | Whether nominal reach is prevented from becoming a null causal result. |
| Closed tested form with useful descendants | negative global goal-attraction form with successful dead-last descendant | Whether premise/form distinctions survive closeout. |
| Gate stopped before broad population | reserve-preserving high-int exposure that failed selected mechanism gate | Whether an unrun later gate remains unrun rather than becoming a negative. |
| Residual-conditioned confirmation | a two-phase control-failure residual | Whether conditional evidence is labelled conditional rather than population-wide. |
| Historical/legacy evidence | pre-v3 result still cited downstream | Whether unknown modern fields remain unknown instead of being backfilled from defaults. |
| Execution/plumbing failure | failed or timed-out workflow attempt with no accepted scientific result | Whether infrastructure failure is excluded from science. |

Add cases only when they exercise a distinct failure mode. Ten high-information chains are more useful than fifty repetitive ones.

### Exact reconstruction procedure

For each selected chain, work from the primary row evidence upward and independently recompute the quantities the prose depends on.

1. **Identity reconciliation.** Verify requested ref, resolved SHA, configuration hash, workflow/run identity, control/treatment arm identity, and exact population hash/vector where retained. For old evidence, record the first layer where identity becomes unknowable.
2. **Population reconciliation.** Compare intended versus observed IDs, duplicates, missing/unexpected rows, selection/conditioning rule, and evidence role. Distinguish `coverageComplete` from `decisionValidComplete`.
3. **Arm-difference audit.** Confirm the arms differ only on declared treatment dimensions where the claim requires that. Treat branch/config drift as a different treatment, not noise.
4. **Opportunity and participation recomputation.** Reuse `experiment-opportunity-audit.mjs` semantics where applicable. Count feature eligibility, stage reach, attempts, nonzero target-stage work/nodes, and control-side outcome headroom separately. An attempt record with zero work is a deliberate expected-fail control.
5. **Outcome recomputation.** From per-level rows, independently derive conclusive gains, losses, retained solves, errors, truncations, unknowns, and any referee-validation status. Compare against the report and ledger prose.
6. **Economics recomputation.** Compare canonical `workSpent` under the experiment's actual aggregate envelope. Use nodes only for within-technique depth. Compare wall time separately and identify binding deadlines or asymmetric censoring.
7. **Interpretation audit.** Given steps 1-6, classify the narrowest earned conclusion: positive, clean negative, tested-form negative, non-participating/inconclusive, implementation failure, population-role-limited, regime-specific, or execution failure. Prefer existing repo vocabulary and prose over adding an enum unless repeated machine consumers need it.
8. **Capability preservation.** Check whether material gains/losses or complementary mechanism evidence survive in capability memory or the dated report even when promotion is negative.
9. **Descendant-use audit.** Follow the result into question relations, workstreams, future-work/reopen language, and later experiment designs. Check that the descendant uses no stronger claim than the chain earns.

### Strongest measurement attack

The central attack is **independent recomputation of the report's scientific verdict from retained rows plus preflight**, then comparison with every downstream summary.

This audit should deliberately ask whether changing one interpretation boundary changes the verdict:

- attempts versus nonzero work;
- observed population versus intended population;
- structural coverage versus decision-valid coverage;
- raw nodes versus `workSpent`;
- population-wide versus residual-conditioned denominator;
- promotion value versus demonstrated capability;
- tested-form failure versus premise failure.

If these substitutions do not alter any current inference, that is a meaningful audited negative.

### Prospective producer fixes

Only add fields where the forensic cases repeatedly force bespoke reconstruction that should have been preserved at production time. Likely seams to test before inventing anything new:

- v3 result or combiner lacks a stable link to the owning preflight/question;
- opportunity/real-participation summary is repeatedly reconstructable but not retained;
- arm-local work/wall/censoring disappears during combination;
- population-conditioning vocabulary cannot express a recurring valid distinction;
- accepted scientific attempt versus failed execution attempt is hard to determine automatically.

Prefer extending v3 results, existing validators, `research-status-index`, or report conventions. Do not create `experiments-v4-database.json` style parallel authority.

### New-compute escalation rule

Do not rerun an old experiment merely because its record is incomplete. Rerun only when all are true:

1. the historical observation materially affects a current live premise, capability nomination, or closure;
2. the missing fact cannot be recovered from existing rows/manifests/git history;
3. current code can reproduce a scientifically comparable treatment;
4. the smallest bounded recheck can change the current decision.

### Closeout

The audit is complete when every current decision-bearing experiment chain in scope is either mechanically/reliably reconstructable or explicitly classified with a bounded historical limitation; the selected hostile controls produce the expected distinctions; material capability signatures survive negative dispositions; and any recurrent missing field has a prospective owner/fix. The result should include a historical-claim disposition ledger only for claims actually touched by the findings.

---

## Audit 3 implementation: accepted-path/oracle evidence across diagnostics

This audit should run before the capability-attribution audit because the accepted-path layer has more unexamined cross-diagnostic dependence, while the census/lifecycle system already has mature authorities.

### Audit object

The natural unit is an **oracle binding**:

`consumer + level structural revision + accepted-path identity or path-set identity + selection rule + evidence purpose + provenance/dependency context + diagnostic run context`

The path is not automatically the independent unit. Multiple paths can share one replay/family lineage, and multiple diagnostics can be deterministic descendants of one selected path.

### Complete inventory first

Inventory consumers of accepted paths and classify each into one of five binding modes:

1. **Identity-bound witness.** The downstream result is valid only for the exact path used upstream, as in path-bound replay or labels.
2. **Representative-path probe.** The diagnostic needs a valid path but has no upstream identity contract. These should normally use the shared deterministic `solution-atlas` representative policy rather than storage order.
3. **Set-valued known-family observer.** The diagnostic reasons over all known prefixes/solutions available under an explicit inclusion rule, such as known-prefix survival.
4. **Path-seeded, independently adjudicated.** A path nominates prefixes/states, while exact/reference tooling independently decides LIVE/DEAD or feasibility.
5. **Not path-derived.** Pure exact/reference or operational-trace tools that should remain outside this resource except as controls.

For each consumer record:

- current path-selection rule;
- whether path identity/signature is written to its output;
- evidence purpose used to admit paths (`solution-atlas`, positive oracle, etc.);
- whether provenance origin/dependency is retained;
- whether chronology is needed;
- whether changing the path invalidates any upstream label;
- main downstream reports/claims.

The inventory itself should catch any remaining raw `hints[0]` style consumer that lacks an explicit identity contract.

### Freeze the sensitivity cohort before rerunning diagnostics

The cohort should be chosen from **support properties**, not from diagnostic outcomes. Use existing hints/provenance/profile metadata to select levels with:

- at least three referee-valid accepted paths;
- at least two conservative provenance dependency strata when available;
- enough origin diversity to compare replay-first and non-replay-first paths on some rows;
- mechanics relevant to the selected diagnostics;
- current structural revision match;
- complete chronology only for tests that actually depend on time/order.

Intentionally include strata:

- replay-heavy levels;
- levels with substantial non-replay-first support;
- production-solved/easy controls;
- current production misses or known extinction cases;
- at least a few levels where stored paths visibly differ in obligation/order/topology phenotype.

Do not require every level to satisfy every stratum. Freeze the cohort and path-selection rules before reading the sensitivity result.

### Choose four diagnostic roles, not every path consumer

The first empirical pass should exercise one representative of each distinct inferential shape:

- a representative single-path geometric diagnostic such as winning-path/residual/portal/crossing analysis;
- known-prefix survival as the set-valued observer;
- one path-identity-bound replay/label consumer as a **negative control** where substitution should be rejected rather than silently allowed;
- one path-seeded plus exact-adjudicated diagnostic where the path selects the microscope material but exact evidence owns the truth.

Expand only if those reveal a new consumer class.

### Oracle-substitution experiment

For representative-path probes, rerun the unchanged diagnostic across a fixed small panel of accepted paths per level:

- canonical current `solution-atlas` representative;
- a path from another dependency stratum;
- where available, one replay-first path and one non-replay-first path;
- optionally one construction/external path if it answers an origin-conditioning question.

Keep solver revision, diagnostic configuration, budgets, exact/reference model, and level revision fixed. The independent variable must be the oracle binding.

Measure the **semantic endpoint**, not merely numeric drift. Examples:

- does the identified first divergence/extinction stage change?
- does a level move from "tight crossing slack" to "ample slack"?
- does the proposed obligation ordering change?
- does the same mechanism remain nominated?
- does a diagnostic previously described as a level phenotype turn out to be path conditional?

A stable mechanism diagnosis despite numeric variation is a success. A path-sensitive diagnosis can also be a success if the conditioning is made explicit and the variation itself reveals basin structure.

### Multi-path/set-valued sensitivity

For known-prefix survival and any other set-valued observer, the dangerous axis is not one arbitrary path but **known-sample composition**.

Construct deterministic nested samples by provenance/dependency strata rather than storage order. Compare:

- full current accepted-path set;
- non-replay-first subset where family replay is the putative cause;
- one-stratum-per-path conservative subset;
- small support prefixes where the diagnostic claims remain interpretable.

Ask whether extinction depth/cause or "no known live support" conclusions are stable to plausible changes in the known sample. Never reinterpret instability as proof that all true solutions behave one way or another.

### Cross-diagnostic ancestry test

Build a compact matrix for decision-bearing claims in the sampled cases:

`claim -> selected path(s) -> provenance lineage -> exact/reference label source -> selected failure/extinction cohort -> downstream diagnostic/report`

Flag apparent corroboration when two claims are merely deterministic descendants of the same path or same exact-labelled state set. This is the oracle analogue of the family -> replay -> profile ancestry finding.

The audit should explicitly distinguish:

- same oracle, two metrics;
- distinct paths, same family-replay ancestry;
- distinct dependency strata on one level;
- unrelated levels/parents;
- independent exact/reference adjudication.

Only the last categories can support stronger recurrence claims.

### Strongest controls

Expected-pass controls:

- a representative-path consumer already migrated to the shared `solution-atlas` policy should reproduce its canonical result;
- observer OFF/ON parity for known-prefix survival must remain exact on solution/work/order/randomness.

Expected-narrow/fail controls:

- identity-bound path labels must reject substitution rather than "generalize";
- a one-path or replay-only subset should not be allowed to imply whole-solution-space absence;
- two diagnostics over one exact selected path should not be counted as two independent confirmations.

### Durable repair shape

Do not make a universal oracle-result schema. If repeated omissions are found, add a small shared metadata/helper convention for:

- `oraclePathSignature` or path-set signature;
- `oracleSelectionPolicy`;
- declared evidence purpose;
- provenance/dependency summary;
- level revision;
- exact/reference adjudication identity where separate truth is used.

Only consumers that need those fields should adopt them.

### New-compute escalation rule

Most of this audit should use existing paths and bounded local diagnostics. Buy fresh solver/reference compute only when oracle substitution changes a decision-bearing mechanism diagnosis and current exact/reference evidence is insufficient to decide which interpretation is sound.

### Closeout

Close when path-binding modes are explicit, remaining representative consumers no longer depend on accidental persistence order, the main diagnostic classes have measured oracle/sample sensitivity, shared ancestry is visible, and historical claims that were really path-conditional are narrowed. The best scientific output is likely a small set of **oracle-sensitive failure phenotypes** that can sharpen current retention/representation/acquisition questions.

---

## Audit 2 implementation: capability observability and attribution

### Audit object

The audit unit is a **capability observation under a named operational action and context**:

`level + normalized action/config identity + dose/work context + evidence source + predecessor/execution context where applicable`

Do not treat the named technique as the unit. Do not treat a whole-ladder winner as the unit. The same search action can appear in isolation, as a retry, after different predecessors, or at different work tranches.

### Start with identity reconciliation, not a new census

The current isolated census `reports/stress/technique-census/33717910218/` is the base observation matrix. Before drawing any new conclusion:

1. regenerate/check the cheap second-order outputs if current authority still marks them as pending;
2. identify the canonical action/config normalizer already used by census/niche/lifecycle analyses;
3. verify that production lifecycle rows, census cells, capability-memory candidates, and scheduler action identities can be joined without hand-written aliases;
4. enumerate unmappable, many-to-one, and one-to-many identities.

The historical lifecycle attribution correction where eight supposed admissible-order wins were actually mechanic-bucket-retention retry wins is a required regression control. A sound crosswalk must classify that old attribution as wrong rather than reproduce it.

### Build an observability crosswalk

For current protocol-compatible production evidence, materialize a read-only join with one row per level/action relationship containing only facts actually available:

- census isolated outcome and measured dose/censoring;
- current production solved/unsolved status;
- whether the relevant action is in the production menu for that level/context;
- stage/action reach;
- attempts;
- nonzero `workSpent` and nodes;
- natural exhaustion versus budget censoring where known;
- predecessor/stage identity;
- production solve attribution if directly recorded;
- historical capability-memory nomination, clearly marked historical when applicable.

Missing joins stay `unknown`. Do not infer failure because an action lacks a census cell or production row.

This can be an ephemeral output from a script such as `scripts/capability-observability-audit.mjs`. Do not check in a second capability database.

### Classify evidence states with a deliberately narrow vocabulary

For current residual analysis, the useful classes are:

1. **no measured isolated capability** under the available census menu/dose;
2. **isolated capability exists, action not offered** in the relevant production context;
3. **offered, target stage/action unreached**;
4. **reached/attempted but zero real target work**;
5. **participated, materially underdosed relative to isolated rescue**;
6. **participated at reasonably comparable work and failed**;
7. **participated and solved/contributed**;
8. **historical-only capability nomination** requiring current reconciliation;
9. **sequence/predecessor incomparable**;
10. **insufficient/missing evidence**.

These are evidence states, not a new permanent failure-class ontology. Collapse them only where the live question does not need the distinction.

### Freeze cohorts by evidence state, then inspect mechanism

Use the current WS2 residual atlas as a starting cross-check, not as unquestioned truth. Recompute enough of its class logic from current census/lifecycle evidence to test whether the classification survives the audit.

Create small forensic cohorts from each high-value state:

- isolated solve but production not offered;
- offered/unreached;
- nominal attempt with zero work;
- comparable-work exposed-and-failed;
- production positive with no matching isolated-census success;
- historical capability nomination in today's residual;
- accepted production change that displaced an old winner.

For each cohort ask what the operational taxonomy says the action actually changes. This prevents a retry context, budget tranche, or score-weight alias from being mistaken for a new mechanism.

### Attribution tests

Do not invent a single "credit" metric. Use the evidence appropriate to the claim:

- **isolated capability:** census solve under named cell/dose;
- **production reach:** lifecycle stage/action reach;
- **participation:** real work/nodes;
- **production contribution:** directly recorded stage/action solve where available;
- **marginal value:** paired A/B gain/loss only;
- **rare capability:** census or controlled-comparison exclusive under comparable coverage;
- **historical complementarity:** capability-memory nomination only;
- **operational distinctness:** bounded trace/observer evidence, not outcome overlap.

The audit should search for consumers/reports that silently substitute one of these for another, especially winner-only or reach-only summaries.

### Dose and sequence safeguards

Two common false inferences need explicit checks.

**Dose:** isolated 20M success versus production 1M failure does not establish search-quality failure. Conversely, a technique that fails after comparable/full isolated work should not be diagnosed as needing more scheduler exposure without a changed premise.

**Sequence:** the same explicit action label after a materially different predecessor state is not automatically the same causal experiment. When sequence/state differs, classify the join as observational unless the action contract includes the handoff.

Budget non-monotonicity is another required control: a nominally stronger width/budget/config can lose solves through ordering/retention, so "at least as much dose" is not automatically a capability superset.

### Measurement attacks

The strongest empirical attacks are:

1. recompute current residual exposure classes using **nonzero work** instead of attempt/reach booleans and measure class migration;
2. compare whole-ladder winner/reputation summaries with marginal A/B or isolated response where both exist;
3. compare census capability to production reach at matched canonical `workSpent` where possible;
4. verify the current capability-memory union against source signatures and baseline residual, including the known historical prose-union reconciliation failure as a control;
5. test identity normalization against the historical stale-lifecycle misattribution.

If these produce no material reinterpretation, that is strong evidence the current capability substrate is healthier than feared.

### Producer and consumer fixes

Prefer joinability fixes over denormalizing everything into every artifact. Potential durable changes:

- one canonical action/config identity helper used by census, lifecycle and capability-memory joins;
- stronger explicit target-stage work fields where lifecycle currently exposes only attempts;
- `unknown` rather than false for unavailable candidate/census cells;
- analysis output that states evidence source and comparability instead of a bare capability boolean.

Do not rerun the expensive full technique census to fill one decision-specific gap. If the audit discovers one missing counterfactual cell that matters to a live question, run only that bounded cell/cohort under current code.

### Solve-oriented closeout

The principal output is a **capability exposure map** partitioning current misses into composition/allocation opportunities versus genuine acquisition territory. It should identify:

- capability known in isolation but not economically exposed;
- capability exposed and genuinely failing under comparable work;
- capability only historical/nominative;
- capability displaced by current scheduler composition;
- residuals with no known action capability.

Close when these distinctions can be made reproducibly for decision-bearing cohorts without ad hoc aliases and without winner-only inference.

---

## Audit 5 implementation: question-state propagation and attention allocation

### Audit object

The unit is a **material research-state transition or relation**, not every sentence-sized premise and not every report.

Examples:

- tested form closes but premise remains alive;
- result triggers a successor question;
- result becomes a negative control/calibration for another line;
- historical claim is corrected/superseded;
- capability is preserved despite negative promotion disposition;
- deferred question has an explicit reopen condition;
- active gate accumulates several material inbound constraints.

The sparse registry should remain sparse.

### Complete structural census

Run the existing `research-status-index` and question-registry validators over the full current graph. Mechanically check:

- every referenced question/report exists;
- no impossible/unknown relation target;
- state/reopen combinations are structurally coherent;
- duplicate/supersession links do not point in circles where the library can cheaply detect that;
- closed-tested-form records with meaningful reopen boundaries actually retain them;
- active records are discoverable by stable ID and ordinary vocabulary from their question/result text.

Do not attempt to certify semantic completeness mechanically.

### Freeze a high-information case set

Choose 6-10 transitions before judging graph quality. The current repo offers excellent controls:

| Transition shape | Suggested case | Why useful |
|---|---|---|
| Form closed, premise survives in successor | portal coarse-state global merge -> dead-last additive exposure | Tests formulation-versus-premise preservation. |
| Parent question triggers narrow descendant | `WS2-CLASS123-CHEAP-HARVEST` -> `WS2-MUST-TURN-LATE-ADDITIVE` | Tests successor discovery. |
| Negative result becomes calibration/control | generic structural diversity -> future-feasibility/categorical descendants | Tests outbound evidence value after closure. |
| Historical belief corrected | `WS2-CATEGORICAL-FULL-POOL` archaeology correction showing the August experiment was actually run | Tests supersession and rediscovery prevention. |
| Capability union corrected | known-capability complementarity 65-style prose error -> corrected 179 union | Tests propagation of corrected machine evidence. |
| Deferred question with technical seam but no earned current gate | admissible-order retry repricing | Tests "possible to run" versus "worth running now." |
| Active diagnostic after several closures | current Class-5 topology/open-path successor chain | Tests whether inbound negatives constrain the live question without killing the premise. |
| Negative promotion with useful capability | capability-memory case from Audit 1 | Tests cross-system discoverability. |

### Reconstruct each transition from evidence outward

For each case:

1. read the primary report(s), not only the question record;
2. state the exact observation and narrow earned inference;
3. identify which predecessor question/form it answered;
4. enumerate material outbound consequences: successor, constraint, negative control, calibration, supersession, reopen rule;
5. compare those consequences with `solver-research-question-relations.json`, capability memory, future work, opt-in ledger, and current workstreams;
6. classify omissions by **decision risk**, not graph-theory completeness.

An omitted edge matters when it could plausibly cause an agent to repeat closed work, miss a live successor, overgeneralize a negative, or use superseded evidence.

### Best empirical test: navigation fault injection

This audit should behave like a usability/reliability test for future agents.

Define several retrieval tasks with the expected safe action boundary, then run only the normal front doors:

`node scripts/research-status-index.mjs --compact --query=<term>`

plus `research-asset-query`/`tooling-census` when the task is resource/tool related.

Examples:

- Query an old closed portal-coarse treatment. Expected result: discover the global negative, the hard regression, and the live dead-last successor, not "portal coarse-state is closed forever."
- Query categorical full-pool projection. Expected result: discover that the experiment was run and the archaeology claim was superseded, preventing an unnecessary rerun.
- Query admissible-order repricing. Expected result: discover the enforcement seam **and** the fact that the research question remains deferred until current residual evidence earns it.
- Query current Class-5 acquisition. Expected result: surface the live successor plus the scalar/diversity/dead-cause/categorical negatives constraining it.
- Query a closed negative treatment with capability memory. Expected result: find the negative disposition and complementary capability without implying current promotion value.

The score is practical: **Would a competent agent using current front doors be likely to take a materially wrong or duplicative next action?** Do not turn this into an information-retrieval benchmark with arbitrary precision/recall targets.

### Reverse closeout audit

Sample recent decision-bearing reports and ask the outbound question from `solver-research-question-relations.md`: what did this result answer, trigger, constrain, calibrate, supersede, or provide a negative control for? Compare to actual recorded edges.

This catches a failure class the forward query cannot: a good report whose implications never entered the sparse graph before compaction.

### Priority audit without inventing a ranking formula

Do not retrospectively score whether old priorities were "correct." That is hindsight contaminated and workstreams already own rank.

Instead test priority **input integrity**:

- does the current live gate know about all material closures/constraints?
- is a satisfied gate still described as blocking?
- is a deferred question accidentally presented as active because implementation plumbing now exists?
- is a question active despite decisive closure in its tested form?
- is a cheap existing resource omitted from a live question where it could change the immediate gate?

When opportunity sizing is relevant, leave quantitative sample sizing to `solver-experiment-opportunity-sizing.md`; do not make the question graph own it.

### Durable repairs

Prefer, in order:

1. add or correct a material relation edge;
2. improve vocabulary/aliases/search text in the existing record or status index;
3. add a report-to-question link where compaction loses ownership;
4. only then extend the relation schema if several independent cases need a relationship the current vocabulary cannot express.

Do not add every premise, measurement state, or report as a node.

### Closeout

Close when the hostile navigation tasks lead to the correct safe next-action boundary, selected recent reports have their important outbound consequences preserved, superseded beliefs do not remain discoverable as live truth without correction, and no live workstream gate is materially orphaned from its strongest constraints or successor relationships.

---

## Audit 6 implementation: registry and Research Resource Contract meta-audit

Run this after Audits 1, 3, 2, and 5 have created new counterexamples. Its best implementation is **fault injection against the research-governance system**, not a second registry tidy-up.

### Audit object

The unit is a **historical research failure mode** together with the current mechanism that should prevent or expose it before a decision is made.

Build a compact finding matrix with fields like:

- historical failure mode;
- resource(s) involved;
- bad inference it enabled;
- current contract field(s) expected to expose it;
- current authority/query/helper/checker that operationalizes the rule;
- whether detection is mechanically testable or necessarily empirical;
- whether the protection acts before decision-bearing interpretation or only after the fact;
- residual gap.

### Seed the fault corpus from real Pathfinder failures

At minimum include:

1. raw hint/provenance rediscovery counts treated as support strength;
2. variant sibling rows treated as independent observations;
3. variant append-run top-level counters treated as one valid acceptance denominator;
4. one-path Solution Profile diversity treated as measured zero;
5. sampled must-cross agreement labelled puzzle rigidity;
6. an exhaustive-search event promoted to whole-space completeness;
7. corpus header/generation metadata treated as current evidence role;
8. current corpus name treated as stable historical population identity across July replacement;
9. raw level-ID mentions treated as decision exposure;
10. family evidence and replay-fed Solution Profile treated as independent corroboration;
11. partial family mount absence defaulted to `0 evaluated / 0 solved`;
12. replay-lineage numerator by family mode interpreted as a transfer rate without the attempted denominator;
13. experiment attempt/reach interpreted as participation despite zero target work;
14. promotion disposition allowed to erase complementary capability;
15. technique/lifecycle identity misattribution;
16. historical closed-form result allowed to erase a live successor premise;
17. any oracle-selection dependence newly exposed by Audit 3.

This corpus is much more useful than asking abstractly whether each contract field "looks good."

### Fault-injection procedure

For each historical case, reconstruct a minimal fixture or thought-experiment input that contains the old misleading shape and ask the current system three questions:

1. **Discoverability:** Would `research-asset-query`, `research-status-index`, the owning authority, or the audited-resource declaration warn a competent researcher before use?
2. **Representation:** Can the contract express the distinction without lying or overloading a field?
3. **Enforcement:** Where the rule is mechanical, does an existing checker/helper reject or visibly classify the dangerous case?

A failure on enforcement is acceptable for inherently scientific questions. The meta-audit should never pretend a JSON schema can certify independence or causal validity.

### Registry-to-reality test

Use both directions.

**Report -> assets:** Sample recent decision-bearing reports from several workstreams and list every durable evidence asset actually consumed. Verify that each is registered or intentionally ephemeral, its natural grain is correct, its advertised query surface works, and the report's join respects declared identity/independence rules.

**Asset -> consumers:** For each audited or heavily used catalogue asset, identify real current consumers. Look for:

- shadow resources that have become decision-bearing without registry recognition;
- obsolete registered assets with no live consumer;
- consumers bypassing the shared semantic helper and recreating old rules locally;
- catalogue-grade resources now used often enough in subtle decisions to deserve a focused audit.

### Partial-resource projection test

Generalize the family-mount lesson explicitly. For any resource that supports partial loading/materialization, test the three-way state:

1. resource unavailable/not mounted;
2. resource available but no matching record;
3. matching record present with a genuine false/zero/negative value.

Also test field-level partial projections where some sub-evidence was not loaded. Unknown must survive all the way to consumers.

### Minimal-extension decision ladder

When a counterexample survives, repair at the lowest layer that truly solves it:

1. authority prose or query discoverability;
2. shared semantic helper/normalizer;
3. resource-specific checker or producer field;
4. registry relationship/caveat;
5. audited-resource contract field only when the same semantic gap recurs across multiple unrelated resources and cannot be represented honestly today.

This ordering is important. The contract should remain a small scientific boundary, not absorb every domain-specific concept discovered by audits.

### Best success criterion

Do not score "percent contract compliant." The useful endpoint is:

> Every recurrent historical failure class has at least one discoverable prevention or detection route that operates early enough to change a decision, and repeated bespoke reconstruction has either a shared helper or an explicit reason to stay bespoke.

The meta-audit should finish by identifying the next resources that have quietly become recurring decision-bearing instruments. That list, rather than schema growth, is its main forward-looking product.

---

## Recommended execution order

1. **Experiment evidence lifecycle.** It has the broadest blast radius because experiment conclusions feed nearly every other research authority.
2. **Accepted-path/oracle evidence.** It has the least mature cross-diagnostic independence model and can affect current acquisition/retention reasoning.
3. **Capability observability and attribution.** Run after the oracle audit so known-path-derived capability diagnoses enter with clearer ancestry, while reusing the already mature census/lifecycle substrate.
4. **Question-state propagation and attention allocation.** Use findings from the first three audits as fresh tests of whether corrected evidence propagates properly.
5. **Registry/contract meta-audit.** Run last so it tests the contract against genuinely different resource classes rather than re-deriving the four audits that created it.

This order is advisory. A live solver decision can pull one audit forward when the audit can change that decision cheaply.

## Shared anti-goals

Across all five audits:

- do not launch broad solver compute to make an audit feel empirical;
- do not create a second queue, experiment database, capability database, oracle database, or evidence warehouse;
- do not convert every scientific distinction into a schema enum;
- do not treat a larger census as a substitute for a better independent unit;
- do not rerun historical experiments merely to fill metadata gaps;
- do not let audit work block already-frozen current solver gates unless it discovers a concrete validity problem in the evidence those gates rely on;
- do not end with data hygiene alone. Every closeout should state which solver beliefs became stronger, weaker, narrower, or newly testable.
