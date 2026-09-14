<!-- agent-context-budget: warn=16000 max=22000 -->
# Resource Contract / registry meta-audit 001

> **Status:** concluded-positive-with-targeted-governance-repairs
> **Date:** 2026-09-14
> **Audit:** inference-first research Audit 6
> **Base:** PR #1793 governing framework and resource-contract state
> **Upstream empirical fault corpus:** PR #1794 accepted-path/oracle, PR #1795 experiment lifecycle, PR #1796 capability observability/attribution, PR #1797 question-state propagation
> **Production behavior:** unchanged
> **Solver compute:** none
> **Decision:** the current Resource Contract is conceptually sufficient for most known Pathfinder inference failures. Its main weakness is not representability but approach-path enforcement: important audited semantics can be present yet absent from the ordinary compact resource query, and closeout did not explicitly require reconstructability/navigation checks. This audit repairs those two cross-resource governance gaps without adding a second evidence system or inflating the audited-resource schema.

## Bottom line

The fault-injection question was not whether Pathfinder can describe its research resources accurately after an expert already knows which caveat matters. The question was whether a competent researcher using normal repository entry points is likely to encounter the caveat before a plausible but invalid inference becomes decision-bearing.

The result is mixed but substantially positive.

The existing audited-resource contract already has enough semantic vocabulary to represent nearly every historical failure in the twenty-case corpus. `independentUnit`, `identityLayers`, `selectionConditioning`, `admissibleEvidencePurposes`, `dependenceModel`, `missingnessSemantics`, `freshnessRevisionContract`, `knownInformationLoss`, `consumerInventory`, and `historicalClaimBlastRadius` are unusually well chosen. The four audited resources also contain the right concrete warnings for the failures that caused their audits.

The weakness is that representability sometimes outruns discoverability. `research-asset-query` searches the full audited declarations but its ordinary compact result previously exposed only the independent unit and audit authorities, hiding conditioning, dependence, missingness, freshness, irreversible information loss, and producer gaps unless the researcher already knew to request `--full`. This is exactly the class of governance failure Audit 6 was meant to detect: the repository knew the distinction, but the normal front door did not reliably put it in the researcher's path.

A second cross-resource weakness emerged from PR #1795 and #1797. The contract had strong notions of freshness, irreversible loss, historical blast radius, consumer review, and current-authority propagation, but did not explicitly say that (a) primary evidence expected to expire must have a reconstructability boundary and (b) audit closeout should exercise the normal discovery/navigation route after a reinterpretation changes a live question. Both are now made explicit in the contract text. No new schema field is introduced.

The audit does **not** find a need for a universal evidence database, belief registry, new priority system, or automatic scientific-validity checker. Most remaining boundaries are genuinely scientific review questions.

## Method

The audit used the twenty concrete failures specified in the Audit 6 brief as a historical fault corpus, then traced each through three separate dimensions:

1. **Discoverability:** would a competent researcher encounter the relevant distinction through ordinary resource/status/query entry points before making a consequential claim?
2. **Representability:** can current registry/contract/report authorities express the distinction without distortion?
3. **Enforcement:** where the distinction is mechanical, does tooling prevent or flag the unsafe state rather than merely documenting it?

The audit also inspected the registered research topology around stress corpora, hint provenance, Solution Profiles, variant-family data, experiment manifests, production benchmarks, lifecycle telemetry, known-solution-prefix survival, operational traces, exact/reference labels, raw logs/baselines, research-status indexing, and capability memory.

No solver campaign, corpus regeneration, or old experiment rerun was required.

## Fault-to-governance matrix

Qualitative protection states used below:

- **prevented structurally** — the ordinary resource semantics plus maintained producers/readers make the bad inference difficult to construct accidentally;
- **detectable mechanically** — a cheap checker/helper can reject or expose the unsafe state;
- **discoverable but review-dependent** — normal surfaces expose the caveat, but scientific judgment remains necessary;
- **represented but poorly discoverable** — the contract can express it, but the normal approach path did not reliably surface it before this audit;
- **known only through specialist memory** — current governance did not put the distinction in a durable ordinary path;
- **not represented** — contract vocabulary genuinely lacked the distinction;
- **historically unrecoverable** — the original producer did not retain enough evidence;
- **prospective fix required** — future producers/readers can prevent recurrence, but history cannot be repaired.

| # | Failure mode and bad inference | Affected resource(s) / concrete example | Current contract/registry protection | Discoverability before this audit | Mechanical boundary | Assessment / lowest-layer action |
|---|---|---|---|---|---|---|
| 1 | Provenance event count -> independent support | hint provenance; replay rediscovery clouds | `independentUnit`, `dependenceModel`, caveats, dependency strata | strong in resource declaration and hint query docs, but compact asset query hid dependence model | raw event counting can be warned against; independence itself is review judgment | **represented but poorly discoverable** at generic registry front door; expose dependence model in compact query |
| 2 | Variant siblings -> N independent levels | variant-family data | independent unit explicitly says parent family for broad generalization; dependence model names sibling correlation | strong in registry caveat and audited declaration | family grouping mechanically available; claim-level independence remains review judgment | **discoverable but review-dependent**; no schema change |
| 3 | cumulative family counters -> invocation denominator | variant-family data | known information loss plus prospective producer fix explicitly name invocation-local requested/attempted/accepted/budget counters | strong once audited declaration is reached | new manifests can be shape-checked; old denominators are unrecoverable | **prospective fix required**, historical cases **unrecoverable** |
| 4 | n=1 synthetic zeros -> real phenotype | Solution Profiles | missingness semantics explicitly say unsupported sparse axes unavailable, not zero; schema-v3 support-aware comparison | strong in profile registry caveat; generic compact query hid missingness semantics | maintained profile library can enforce support-aware comparisons | largely **prevented structurally** in maintained consumers; generic discoverability repaired |
| 5 | observed must-cross agreement -> rigidity | Solution Profiles / accepted paths | admissible purpose forbids rigidity proof; caveat says observed order agreement is sample evidence | strong in profile entry; path-specific consumers require review | cannot mechanically prove latent solution-space completeness from sample | **discoverable but review-dependent** |
| 6 | exhaustive-search event -> exhaustive solution knowledge | Solution Profiles / hint provenance | missingness semantics explicitly distinguish event from whole-space enumeration; registry caveat repeats it | strong | checker can preserve event naming but cannot certify completeness | **discoverable but review-dependent**; naming is adequate |
| 7 | corpus metadata/header -> scientific evidence role | stress corpora | identity layers separate generation, later selection, decision population, treatment exposure; selection conditioning is explicit | strong in registry caveats and corpus provenance docs | some selection history can be checked; historical role often requires report archaeology | **discoverable but review-dependent** |
| 8 | stable filename -> stable population across revision | stress corpora | structural/content fingerprint, freshness/revision contract, July replacement warning | strong | hashes/revisions are mechanically comparable when retained | **prevented structurally** for modern decision-bearing work; historical containers remain bounded |
| 9 | raw ID mentions -> decision exposure | stress corpora / reports | missingness semantics explicitly say raw mentions do not establish exposure; decision-exposure genealogy exists | moderate; resource declaration strong, ordinary repo search still produces raw mentions first | cannot infer influence from text count mechanically | **discoverable but review-dependent**; report/manifests remain authority |
| 10 | family evidence + replay-fed profile -> independent corroboration | family data, hint provenance, Solution Profiles; PR #1794 ancestry finding | all three audited declarations explicitly describe shared family/replay/profile ancestry | strong once any audited declaration is viewed; generic compact query hid dependence semantics | ancestry joins can flag shared lineage, but evidentiary weight remains judgment | **represented but poorly discoverable** generically; compact query repair materially helps |
| 11 | missing resource / no row -> zero/false | multiple resources | missingness semantics are first-class audited contract field; catalogue caveats also preserve unknown states | uneven because catalogue-grade resources may have only prose caveats | many helpers can preserve null/unknown; resource mount state is mechanically observable | **good contract design**; reader audits remain essential |
| 12 | replay numerator -> transfer rate | hint provenance / replay lineage | admissible technique-performance purpose requires attempted population, failures, comparable work and protocol identity; known loss notes legacy denominator gaps | strong in audited declaration | rate claims cannot be certified automatically if denominator is absent from arbitrary prose | **discoverable but review-dependent**; old rate reconstruction may be **unrecoverable** |
| 13 | attempts/reach -> participation | experiment evidence, lifecycle telemetry; PR #1795/#1796 | inference framework and operating model distinguish participation; catalogue lifecycle entry previously described reach/work but did not itself define exact-action nonzero-work standard | strong in recent specialist docs, weaker in generic resource registry | exact-action `workSpent`/nodes can be mechanically required for comparable-dose tools | **represented across current authorities but not yet an audited-resource contract declaration**; reconciliation with #1795/#1796 should preserve their producer/consumer fixes |
| 14 | negative promotion -> absence of capability | capability memory, production benchmarks, experiment manifests; portal coarse-state | capability-memory affordance explicitly preserves gain/loss capability separately from disposition; question-state work in #1797 provides stable successor identities | good in capability-memory registry, historically weak in compressed prose | cannot mechanically decide capability value, but can preserve separate fields/records | **discoverable but review-dependent**; no new contract field needed |
| 15 | lifecycle attribution identity error | experiment manifests / operational taxonomy; admissible-order vs mechanic-bucket retry | identity layers and manifest comparability concept can represent it; PR #1795 documents execution identity as prerequisite | moderate; manifest entry is catalogue-grade, not audited | resolved flags/config/run identities are mechanically checkable when retained | **prospective fix required** for all decision-bearing producers; history depends on retained manifests/rows |
| 16 | closed tested form -> closed premise | experiment lifecycle, question relations | historical-claim blast radius + current authority update can express scope; PR #1795/#1797 show the distinction | weak before question-state audit in specific cases | state enums/edges can be checked, but whether successor premise remains valid is scientific judgment | **discoverable after #1797**, and this audit adds navigation closeout requirement rather than new schema |
| 17 | oracle/path-derived claim -> level property | accepted paths, known-prefix survival, Solution Profiles; PR #1794 | evidence purpose, identity layers, sample support and dependence model express conditioning | moderate in existing resource entries; PR #1794 adds stronger consumer identity | producer can retain oracle identity mechanically; scope/generalization remains review judgment | **represented**, with implementation reconciliation delegated to #1794 |
| 18 | primary evidence expiry | experiment rows/manifests; PR #1795 | before this audit only indirectly covered by freshness and known irreversible loss | weak because evidence can be valid today and disappear later | retention/availability is mechanically observable; sufficiency of retained bundle is partly judgment | **cross-resource semantic gap in text, not schema**; add reconstructability/durability rule and preflight question |
| 19 | Class-3 dispatch/reach -> comparable-work failure | lifecycle telemetry, residual atlas; PR #1796 | current operating-model wording and stronger equal-work join can represent dose certainty; catalogue registry lacks audited observability grade | specialist-only before #1796 | exact-action dose can be mechanically joined when retained | **reconciliation required with #1796**; do not duplicate its classifier/schema change here |
| 20 | stale question state/navigation -> wrong future action | research-status index, question relations; PR #1797 | resource closeout already required current authority update and blast-radius accounting, but did not require navigation fault injection | insufficient; #1797 found real stale states | relation target/state shape can be checked; scientific transition correctness remains review | **cross-resource closeout gap**; add normal discovery/navigation exercise to contract |

The matrix supports a narrow conclusion: the contract's semantic model is not the bottleneck. The largest repeated risk is that the semantics exist but are not encountered at the point of use, or that a correct reinterpretation stops at a report without durable propagation/reconstructability.

## Registry -> reality audit

The registry is broad enough to describe the major evidence systems currently used by solver research. The important decision-bearing entries inspected during this pass still correspond to real maintained systems and meaningful joins rather than ornamental catalogue items.

### Stress corpora

The registered grain (`level`, `generation-run`), authorities, selection caveats, fingerprints, and evidence roles remain accurate. The current declaration correctly separates generator ancestry from later outcome/retention history and explicitly warns that corpus filenames do not imply distributional independence. This is strong governance and directly addresses the July replacement failure.

The main residual limitation is historical rather than registry drift: old selection events were not uniformly retained as first-class row history. The registry already says so. No repair can reconstruct that history from the corpus container alone.

### Hint provenance

The registry and audited declaration remain unusually strong. The resource entry explicitly says raw event count is not independent support, distinguishes evidence purpose, and requires denominators/failures for performance claims. The dependency-stratum abstraction is the correct lowest-layer mechanism for repeated rediscovery clouds.

The important meta-audit finding is discoverability: generic `research-asset-query` compact output previously exposed the independent unit but not the full dependence/missingness/conditioning contract. A researcher querying “hint provenance support” could therefore get a compact result that was technically correct but less protective than the underlying declaration.

### Solution Profiles

Registry reality matches the repaired profile system: schema-v3, support-aware sparse axes, sampled-solution semantics, chronology qualification, and explicit prohibition on rigidity/completeness inference. The entry directly addresses both n=1 synthetic-zero distortion and exhaustive-event overclaim.

This is the clearest positive calibration for the Resource Contract. A competent agent approaching the resource by its registry entry is now warned against the actual historical mistakes that triggered the audit.

### Variant-family data

The registry correctly records the off-main canonical dataset, parent-family independent unit, family query tooling, and sibling dependence. It also preserves the distinction between historical family outcomes and current-code promotion evidence.

The declaration's invocation-counter gap remains real. The contract cannot fix historical mixed cumulative/latest counters. The producer must retain invocation-local denominators prospectively.

### Experiment manifests

This is a real and important catalogue-grade asset. The registered role and join keys are accurate, and the caveat properly says execution provenance/comparability is not efficacy or population independence. PR #1795 raises the bar beyond the current catalogue entry by showing that modern decision-bearing reconstructability can still depend on expiring Actions artifacts.

The registry is therefore not wrong, but its current catalogue grade understates how decision-bearing and semantically subtle this evidence system has become. This is the strongest candidate for a future audited-resource declaration if another focused resource audit is undertaken. Audit 1 already supplied much of the empirical groundwork, so the next step would be a bounded formal resource audit only if solver research continues to depend on heterogeneous manifest/row retention eras.

### Lifecycle telemetry

The registered asset is real and useful, but PR #1796 demonstrates a semantic edge the current entry does not fully spell out: stage/action reach or dispatch is not exact-action nonzero work, and nonzero work is still not automatically comparable dose. The current registry affordance says lifecycle telemetry can show reached/skipped/starved/exhausted and work received, which is directionally correct, but a consumer can still overclaim from a coarser projection.

The correct repair belongs primarily in #1796's observability-grade/consumer work rather than this branch. This report records the reconciliation requirement instead of duplicating its classifier changes.

### Known-solution-prefix survival

The registry accurately describes the observer as retention/representation evidence and already states that known-support extinction is not proof that every solution is extinct. PR #1794 strengthens oracle-set identity and path-conditioning semantics at the producer/consumer layer. The registry does not need a second oracle schema.

### Capability memory

The entry is a strong example of separation of capability from disposition. Its affordance explicitly preserves complementary gain/loss capability independently of promotion outcome; its caveats correctly treat historical intersections as nominations until current comparability is established. The global portal-negative / capability-positive split is therefore representable without contract evolution.

### Research status index

The status index is correctly registered as a routing/discovery surface rather than evidence authority. PR #1797 proves that the quality of its answer depends on the correctness of question-state propagation underneath it. The contract should not absorb question-registry semantics, but audit closeout must now verify the ordinary navigation path after a resource reinterpretation changes a live gate.

## Reality -> registry audit

No major recurring solver-research evidence system was found wholly absent from the registry.

The four upstream audits mostly surfaced **semantic refinements inside already registered systems**:

- accepted-path/oracle conditioning belongs to hint provenance, Solution Profiles, known-prefix survival, exact/reference labels, and operational traces;
- experiment lifecycle belongs to experiment manifests, production benchmarks, raw logs/baselines, lifecycle telemetry, capability memory, and status/question propagation;
- capability observability belongs to technique census, lifecycle telemetry, production benchmarks, capability memory, operational taxonomy, and residual classifiers;
- question-state propagation belongs to the research-status index and question-relations registry, not a new evidence asset.

This is an important negative finding. The repo does not need another asset catalogue simply because the inference graph is complex.

Two systems nevertheless cross the threshold for special attention:

1. **Experiment manifests + decision-bearing primary rows** are recurring, subtle, and central enough that they are plausible next audited-resource candidates.
2. **Lifecycle/participation evidence** is scientifically subtle, but its current problem is more a consumer-observability contract than an independent durable resource declaration. PR #1796 is the right repair locus.

No new registry asset is added in this branch.

## Audited-resource contract stress tests

### Hint provenance scenario: “Can I count 40 rediscoveries as 40 corroborations?”

A normal registry/resource query reaches an entry whose caveats say a stored path may have multiple provenance entries and raw event count is not independent support. The audited declaration goes further: provenance dependency strata, replay clouds, and same-regime/config rediscoveries share causal ancestry.

**Verdict:** semantically safe. Before this audit the generic compact query did not display the dependence model, so the strongest rule could remain hidden unless the researcher followed the audit authority or used `--full`. The compact query now exposes it directly.

### Variant-family scenario: “Can I treat 100 siblings as N=100?”

The registry caveat directly states sibling correlation and the audited declaration names the parent family as the usual independent unit for broad generalization.

**Verdict:** strong pass. This is discoverable early and does not need more machinery.

### Solution Profile scenario: “Can I interpret n=1 zeros literally?”

The registry caveat directly says unsupported sparse axes are unavailable rather than zero-valued measurements. The audited declaration repeats that pairwise diversity/distinctiveness at one path is unsupported.

**Verdict:** strong pass. Maintained schema-v3 consumers structurally reduce the risk, and the resource front door states the rule plainly.

### Stress-corpus scenario: “Can I estimate general solver prevalence from the stress corpus?”

The registry says Corpus 2 is heavily mined development evidence, Corpus 1 has historical solver-success selection, and generation provenance is distinct from population-selection provenance. The audited declaration restricts confirmation and transfer claims to matching selection/independence conditions.

**Verdict:** strong pass on representability and discoverability, review-dependent on the exact claim. No checker can honestly certify “general prevalence” from arbitrary research prose.

## Partial projection and missingness attack

The Resource Contract's strongest cross-resource idea is the insistence that unavailable is not false. The attack found the following boundaries.

### Resource not mounted

Variant-family data is the clearest case because the canonical large dataset is deliberately off-main. Its registry status/location makes absence from the current worktree a mount-state fact, not evidence that no family record exists. The contract supports this distinction.

### Resource mounted, no record for level

Capability memory and profile/family resources correctly treat omitted rows as unknown unless the producer explicitly defines a complete population. A missing row cannot be silently promoted to “candidate failed” or “no phenotype.”

### Genuine zero/false

Modern maintained schemas can represent explicit zero work, explicit false booleans, and explicit empty support separately from absent fields. The important scientific requirement is that readers preserve this distinction. PR #1795's admissible-order case proves why: target attempts existed, but useful target-stage work was exactly zero.

### Legacy field missing

Hint provenance explicitly states that absent legacy booleans are unknown rather than modern false. Solution Profiles treat old unsupported axes as unavailable. These are strong examples of the contract working as intended.

### Producer never retained field

Family invocation denominators and legacy experiment participation details are sometimes unrecoverable. The contract correctly requires known information loss rather than imputation.

### Protocol incompatible

Freshness/revision contracts and current-capability evidence purposes handle this. Historical observations remain literal history but cannot silently become current comparable evidence.

### Partial manifest without row evidence

This is where PR #1795 adds the most important new lesson. A manifest can preserve identity and scope while row-level reconstructability expires. The surviving summary is not equivalent to preserved primary evidence. The contract now states this explicitly under reconstructability/durability.

### Historical claim retained after primary evidence expiry

The claim can remain as historical evidence with a narrower reconstructability grade. The audit must not rewrite the claim into “never happened,” but later agents must not pretend they can recompute row-level attribution once the rows are gone.

No concrete maintained helper was found in this pass that intentionally coerces an unavailable audited-resource state to zero/false. The residual danger is local consumer reimplementation and report prose, which is why consumer inventory and review remain necessary.

## Discoverability fault injection

The following tasks were evaluated from ordinary entry points rather than starting from the known answer.

### “I want all evidence that portal coarse-state helps.”

A registry search can find capability memory, production benchmarks, lifecycle telemetry, experiment manifests, and status/report routing. The current catalogue semantics make it possible to distinguish capability evidence from global promotion economics, but the stable question identities separating global closure, freshness, and dead-last successor are supplied by PR #1797 rather than the Resource Contract.

**Before reconciliation:** plausible risk of encountering a global negative and compressing it into “capability absent.”

**After #1797:** safe navigation is available. This audit adds the rule that resource-audit closeout must verify such navigation when a reinterpretation changes a live question.

### “Which Solution Profile dimensions distinguish current residuals?”

The registry entry immediately warns that profiles are offline sampled-solution descriptions, sparse axes can be unavailable, and nearest-profile similarity is exploratory.

**Result:** good early caveat exposure.

### “How many independent solutions support this path-order claim?”

Hint provenance and Solution Profile declarations can answer the causal-ancestry question, but a raw repository search can still surface counts before semantics. Generic `research-asset-query` now exposes the dependence model and conditioning in compact output, reducing that gap.

**Result:** improved from represented-but-hidden to ordinary-query discoverable.

### “Did admissible-order retry fail?”

The experiment lifecycle report and #1797 question relation show that the nominal experiment delivered zero useful target-stage work and therefore did not close the causal repricing question. Before #1797, the sparse question registry could still label it `closed-tested-form`.

**Result:** the resource contract alone cannot own this answer. The correct governance is blast-radius propagation plus question-registry reconciliation, now made an explicit closeout navigation check.

### “Are variant siblings independent?”

The registry caveat answers this immediately: no for broad generalization; parent family is the usual independent unit.

**Result:** strong pass.

### “Can I infer a transfer rate from replay success counts?”

The hint-provenance audited purpose explicitly requires attempted population, failures, comparable work, and protocol identity for performance claims.

**Result:** strong pass if the resource query is used; historical denominator may remain unrecoverable.

### “Why is this capability absent from production?”

Technique census + lifecycle telemetry + capability memory together can distinguish acquisition, offer, reach, participation, dose, and displacement, but PR #1796 proves that a coarse residual classifier can overstate the evidence if it treats dispatch/reach as comparable work.

**Result:** registry topology is sufficient; consumer semantics needed repair. Resource governance should point to the stronger join, not attempt to certify causal exposure centrally.

## Enforcement-boundary audit

The current `check:audit-artifacts` draws an appropriate boundary in one important respect: it validates catalogue shape, relationship targets, required audited declarations, audit authority paths, and historical blast-radius paths, while explicitly declining to certify scientific truth, independence, or consumer completeness.

That is the correct philosophy.

### Mechanically enforceable

Suitable for checkers/helpers:

- duplicate/missing asset IDs;
- broken related-asset IDs;
- malformed relationship targets;
- missing required audited-resource declarations;
- missing required contract fields;
- path existence for declared audit authorities/blast-radius files;
- schema/version/identity presence in maintained producers;
- manifest arm/config/population mismatches;
- exact-action participation fields when a consumer claims comparable dose;
- relation targets and impossible enumerated question states;
- oracle/path identity fields in producers that promise identity-bound evidence.

### Partially mechanically enforceable

Tooling can expose facts but not decide the scientific conclusion:

- dependency strata and shared ancestry;
- whether a population is conditioned on a specific outcome;
- whether a result is current enough for a particular claim;
- whether retained rows are sufficient to reconstruct a closeout;
- whether an oracle sample is broad enough to support a generalization;
- whether nonzero work is a comparable dose;
- whether an implementation-specific negative closes the premise.

### Review/scientific judgment only

Do not fake automation for:

- true independence of observations;
- external/general prevalence entitlement;
- causal interpretation under predecessor-state differences;
- whether a successor premise is materially distinct;
- whether multiple dependent evidence chains provide enough coherence to act;
- whether value of information justifies new compute.

No over-enforcement problem was found in `check:audit-artifacts`: it does not pretend to certify science. The main under-enforcement problem is not checker shape but ordinary-query visibility.

## Writer + reader enforcement findings

### Representative path selection

PR #1794 repairs prospective producer identity in `winning-path-analysis` and strengthens known-prefix documentation. This branch does not duplicate those changes. Reconciliation must preserve the rule that representative-conditioned evidence retains selected path/oracle identity, while identity-bound exact/reference witnesses remain bound to their original witness.

### Solution Profile support/missingness

This is the strongest writer+reader success. The modern producer retains support-aware semantics and maintained comparisons use comparable supported axes instead of synthetic zeros. The contract accurately describes both the producer and the consumer boundary.

### Residual observability grades

PR #1796 owns the concrete classifier/schema repair. The meta-audit agrees with its principle: dispatch/reach is not exact-action participation, and comparable-work failure needs stronger row-level evidence. Reconciliation must preserve #1796's observability grade rather than reintroducing the old Class-3 prose through a legacy reader/report.

### Question relation states

PR #1797 owns the question-state fixes and relation/query assertions. The meta-audit adds only the higher-level closeout rule: after a resource reinterpretation affects live work, exercise normal navigation to ensure the updated state is what a fresh researcher actually finds.

### Family run counters

Producer-side repair remains prospective. Any new generation-run writer intended to support acceptance-rate claims should retain invocation-local requested/attempted/accepted/budget values. Legacy top-level cumulative/latest fields cannot be rescued by a reader.

### Hint evidence purposes/dependency strata

Shared helpers are appropriate because evidence-purpose applicability and conservative dependency collapse are cross-consumer semantics. Local readers that independently infer trust from origin labels or raw event counts remain a drift risk and should be reviewed when touched.

## Reconstructability and durability

PR #1795 demonstrates a real cross-resource issue rather than a one-off experiment artifact problem.

Research conclusions often outlive the ephemeral storage holding the primary rows that justified them. The existing contract could describe this indirectly as freshness or irreversible information loss, but neither phrase fully captured a decision-bearing bundle that is valid **now** and predictably unreconstructable **later**.

This audit therefore promotes reconstructability/durability into explicit contract prose without adding a schema field.

The practical rule is:

- identify which primary evidence is needed to reconstruct the decision;
- know whether it will remain available for the expected reuse horizon;
- preserve the smallest decision-bearing bundle prospectively when external artifact retention is shorter than that horizon;
- if evidence later expires, preserve the historical claim but narrow its reconstructability status rather than pretending primary recomputation remains possible.

This applies beyond experiments. Any recurring evidence system whose decision-bearing interpretation depends on ephemeral rows, manifests, telemetry, or exact identity is subject to the same principle.

A dedicated audited-resource field was considered and rejected. `knownInformationLoss`, `freshnessRevisionContract`, `prospectiveProducerFixes`, and the new contract-level durability rule are enough unless future audits show repeated need for machine-readable retention-state queries across several audited resources.

## Question-state governance implications

PR #1797 is decisive evidence that an audit can be scientifically correct at the report layer while future action state remains wrong.

The Resource Contract should not become a second question registry. Instead, closeout now requires a bounded propagation test when the audit changes live research meaning:

- update the current owning authority/question state where material;
- exercise the normal discovery/navigation path;
- verify that a fresh researcher encounters the corrected successor/closure distinction before stale prose;
- preserve reopen conditions and tested-form scope without duplicating question-registry semantics inside resource declarations.

This addresses admissible-order non-participation, fixed-endpoint homotopy coverage-null, portal global-vs-capability-vs-successor identity, and stale Class-3 semantics without expanding the Resource Contract into a belief database.

## Explicit negative findings: where the current contract works well

Several expected failures did **not** materialize.

1. The contract does not collapse generation ancestry and selection history.
2. It does not equate row count with independent support.
3. It has first-class missingness semantics rather than a generic nullable field.
4. It explicitly preserves irreversible historical loss instead of encouraging backfill from current defaults.
5. It already requires consumer inventory and historical blast-radius review.
6. The four audited declarations are not generic boilerplate; each contains resource-specific causal/dependence semantics tied to its historical failure.
7. `check:audit-artifacts` does not overclaim that schema validity proves scientific validity.
8. Capability memory already separates capability from promotion disposition.
9. The registry already contains experiment manifests, lifecycle telemetry, capability memory, known-prefix survival, exact/reference labels, operational traces, and status routing. The problem is not an absent evidence catalogue.
10. The contract can represent oracle conditioning, participation uncertainty, tested-form scope, and shared ancestry without new schema dimensions.

## Contract changes accepted

Two contract-text changes are justified as repeated cross-resource semantics:

1. **Discoverability is part of safety.** Audited-resource normal query paths should expose the decision-safety semantics that materially affect inference; hiding them behind `--full` is insufficient.
2. **Durable reconstructability plus navigation propagation are closeout concerns.** Decision-bearing primary evidence with a known expiry needs an explicit retention/reconstructability boundary, and a resource audit that changes live meaning must exercise the normal discovery route before closeout.

The decision-bearing preflight now asks whether required primary evidence can be reconstructed for the period in which the decision is expected to matter.

## Contract changes considered but rejected

### Dedicated observation-chain / ancestry field

Rejected. `selectionConditioning`, `identityLayers`, and `dependenceModel` already express causal ancestry adequately. Adding another field would mostly duplicate the existing model.

### Dedicated observability/participation field

Rejected at the generic audited-resource layer. Participation is crucial for experiments/lifecycle evidence, but not every resource has a meaningful action-dose concept. The correct pattern is resource-specific semantics plus shared experiment/telemetry helpers.

### Dedicated reconstructability schema field

Rejected for now. The repeated principle is real, but contract text plus `knownInformationLoss`, freshness, and prospective producer fixes can represent it without schema inflation. Reconsider only if several audited resources need machine-readable retention-state querying.

### Question-state fields inside audited-resource declarations

Rejected. `solver-research-question-relations.json` already owns question state. The Resource Contract should require propagation/navigation checks, not duplicate state.

### Automated independence certification

Rejected. Tooling can expose ancestry/grouping facts; it cannot honestly certify scientific independence across arbitrary claims.

## Registry/query/checker repairs made here

### `research-asset-query`

Default compact audited-resource output now includes a `decisionSafety` object containing:

- `selectionConditioning`;
- `dependenceModel`;
- `missingnessSemantics`;
- `freshnessRevisionContract`;
- `knownInformationLoss`;
- `prospectiveProducerFixes`.

This directly repairs the largest discoverability fault found by the meta-audit. A researcher no longer needs `--full` or prior specialist knowledge to see the semantics most likely to change a decision.

### Resource Contract

The contract now includes:

- a discoverability rule;
- an explicit normal-navigation closeout step;
- a reconstructability/durability rule;
- a cross-resource prospective producer rule for durable decision-bearing experiment bundles;
- a preflight question about future reconstructability;
- a clarified enforcement boundary around participation/comparable-dose claims.

### Checker

No new fake-science checker was added. Existing `check:audit-artifacts` already enforces the right structural boundary. The concrete failures exposed by the upstream audits are mostly consumer semantics, retained evidence, or scientific propagation questions rather than missing JSON fields.

## Reconciliation notes for PRs #1794-#1797

### PR #1794 accepted-path/oracle

Preserve its producer identity additions and oracle-set conditioning documentation. Do not replace identity-bound exact/reference witnesses with generic representative selection. This audit's generic dependence/discoverability change complements #1794 and should not supersede its path-specific implementation.

### PR #1795 experiment lifecycle

Preserve its lifecycle findings and any v3 producer/closeout machinery. The new durability rule is a contract-level consequence of its primary-evidence expiry finding, not a replacement for its experiment-specific implementation. Future decision-bearing closeouts should retain the manifest/selection contract plus combined primary rows or an equivalently reconstructable bundle before Actions retention expires.

### PR #1796 capability observability

Preserve its Class-3 narrowing, observability grades, and stronger exact-action work/dose requirement. Do not let old registry/report wording restore “exposed-and-failed” from dispatch/reach alone. This branch intentionally does not edit its residual classifier or workstream authority.

### PR #1797 question-state propagation

Preserve its stable portal global/freshness/dead-last identities, admissible-order deferred-reopen state, homotopy/open-path successor split, semantic aliases, and navigation assertions. The new contract closeout navigation rule should be understood as the meta-level guard that future resource audits must perform, not as a replacement question registry.

## Remaining governance risks

The remaining risks are mostly irreducible or prospective rather than evidence that the contract needs another schema version.

- Historical producers that did not retain denominators, rejected candidates, exact participation work, or decision exposure remain unrecoverable.
- Repository-wide text search can always surface stale raw prose before an authoritative registry/query surface; the practical defense is strong normal front doors and current-authority links, not trying to ban historical text.
- Catalogue-grade assets can still have subtle semantics without a full audited declaration. Promotion to audited grade should remain selective and earned.
- Consumer drift remains possible when scripts locally reconstruct trust, independence, participation, or freshness instead of using shared helpers.
- Scientific independence, causal attribution, and premise closure cannot be reduced to schema checks without creating false certainty.
- Off-main/ephemeral resources require mount/retention awareness; absence from a worktree must not become negative evidence.

## Next-resource nomination

One candidate clearly emerges, but the recommendation is deliberately conditional rather than an automatic continuation of the audit program.

**Candidate: `experiment-manifests` plus their decision-bearing primary row bundle.**

Why it crosses the threshold:

- recurring use: nearly every modern A/B, production refresh, family evaluation, and closeout relies on run/population/config identity;
- decision-bearing importance: execution identity and retained rows determine whether an apparent positive/null/negative is causal evidence at all;
- subtle semantics: a valid manifest proves execution provenance/comparability, not participation, efficacy, independence, or inferential scope;
- demonstrated inference risk: PR #1795 found execution plumbing failures, non-participation, mixed evidence eras, and primary-row expiry;
- solve relevance: reliable experiment attribution prevents solver effort from being spent reopening false negatives or promoting misattributed positives.

However, Audit 1 already performed much of the needed lifecycle science. A separate resource audit is warranted only if future work needs a durable audited-resource declaration and producer/retention contract that cannot be cleanly completed during #1795 reconciliation. Do not create another audit merely to preserve program momentum.

No other resource currently earns a stronger nomination. Lifecycle telemetry is important, but #1796's observability work is the right immediate locus. Accepted-path/oracle evidence is already covered by #1794 plus existing registered resources. Question relations are governance state, not a research data resource.

## Final assessment of the inference-first audit program

### What the Resource Contract now reliably prevents

- treating variant siblings as independent broad-generalization units when the declaration is followed;
- interpreting unsupported Solution Profile axes as measured zero in maintained support-aware consumers;
- treating an exhaustive-search provenance event as proof of complete stored solution-space knowledge;
- treating a stable corpus filename as sufficient revision/population identity;
- using raw hint rediscovery count as independent support without confronting dependency strata;
- using success-selected provenance alone to infer a solve/transfer rate without denominator/failure context;
- silently fabricating missing legacy fields from current defaults;
- closing a resource audit at the report layer without considering consumers, historical blast radius, current authorities, and now normal navigation/reconstructability.

### What it reliably exposes but cannot prevent mechanically

- shared family/replay/profile ancestry;
- outcome/population conditioning;
- historical-versus-current comparability;
- oracle/path-set conditioning;
- capability-versus-promotion distinctions;
- tested-form-versus-premise scope;
- resource/field missingness;
- expiring evidence and future reconstructability boundaries.

### What still depends on expert review

- whether causal ancestry is independent enough for a specific claim;
- whether sample support is sufficient to generalize beyond observed basins;
- whether nonzero action work is a genuinely comparable dose;
- whether predecessor/search-history differences invalidate attribution;
- whether a failed tested form leaves a materially distinct successor premise;
- whether an ambiguity is worth new solver/reference compute;
- whether a candidate resource has become important enough to justify audited-resource status.

### What remains historically unrecoverable

- invocation-local family denominators that old producers never stored;
- rejected proposal populations that were never retained;
- legacy provenance attempted denominators/failures not linked to a run;
- exact participation/dose for historical rows whose telemetry was not retained;
- decision exposure that exists only as ambiguous report mentions;
- primary row evidence after ephemeral artifacts expire if no durable bundle was preserved;
- pre-squash chronology where neither file metadata nor external evidence retained it.

### What information producers should preserve prospectively

- immutable run/config/treatment identity;
- exact population identity/hash and selection contract;
- invocation-local requested/attempted/accepted/budget counters where rates matter;
- exact-action participation/work when causal exposure matters;
- accepted-path/oracle identity when diagnostics are witness-conditioned;
- explicit missing/unknown states rather than default zero/false coercions;
- generation ancestry separately from later selection/decision role;
- durable combined primary rows for decision-bearing closeouts whose external artifacts will expire;
- links from resource reinterpretations to the live question/current authority they materially change.

### What research agents should now be able to discover safely

A fresh researcher using `research-asset-query` on an audited resource should now see not only the asset, grain, roles, joins, caveats, and independent unit, but also the conditioning, dependence model, missingness, freshness/revision boundary, known information loss, and prospective producer gaps that can change the scientific interpretation.

Combined with #1794-#1797 reconciliation, ordinary navigation should distinguish:

- positive oracle from whole-level property;
- nominal attempt from real participation;
- dispatch/reach from comparable dose;
- capability from promotion economics;
- tested-form closure from premise closure;
- fixed-endpoint coverage-null from open-path topology successor;
- global portal closure from fresh portal capability and its dead-last allocation successor.

### Whether another resource audit is actually warranted

Not immediately as a governance reflex.

The current audited-resource set plus the four inference-first audits covers the major known failure classes. The next priority should return to solve-directed research unless reconciliation reveals that experiment-manifest/primary-row durability still lacks a stable owner. If that gap remains after #1795 is integrated, `experiment-manifests` is the one resource that clearly earns consideration for the next focused audit/declaration.

The audit program has done its job if these distinctions become boring infrastructure and solver work again becomes the interesting part.
