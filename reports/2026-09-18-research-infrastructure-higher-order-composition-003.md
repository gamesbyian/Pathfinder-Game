<!-- agent-context-budget: warn=22000 max=30000 -->
# Research infrastructure higher-order composition 003

> **Status:** concluded-positive
> **Last evidence:** 2026-09-18 — fresh composition audit of current `main` at `7a7fd3734766e8ca40c40dea575337b183544672` (merged PR #1878), plus bounded integration repairs on this branch.
> **Decision:** the research architecture is substantially coherent, but several important semantics still disappear at composition boundaries. Land the low-risk propagation and read-only join repairs now; keep reopen semantics, phenotype memory, selection-impact semantics, source-adequacy modelling, and process metrology as bounded follow-on designs until a live consumer earns them.
> **Remaining gate:** do not delay the current scientific queue merely to complete infrastructure. Before the next broad solver push, close the independent-unit propagation seam, make integrity visible at resource selection, and use the current D1/active-question workflow as an end-to-end canary for the remaining composition chain.
> **Research question:** none; infrastructure/metrology audit
> **Premise refs:** `P123`, `P133`, `P190`, `P191`, `P201`, `P204`, `P206`
> **Measurement opportunity:** `MO-002`, `MO-004`, `MO-005`, `MO-006`, `MO-007`
> **Evidence role:** forensic / research-infrastructure hardening
> **Selection:** systematic architecture map followed by cross-category pair, triple, and 4–7 component composition search
> **Population identity:** current solver-research architecture on merged PR #1878
> **Selection history:** intentionally fresh pass after #1877/#1878, with emphasis on compositions larger than the prior pair/triple-oriented audits
> **Inference scope:** research-process correctness, discoverability, provenance, and inferential protection; no solver mechanism or production-policy claim

## Executive finding

PRs #1877 and #1878 solved the first-order problem: the repo now has stable question identity, an active premise graph, measurement opportunities, resource contracts, frozen blocks, durable experiment evidence, acquisition/generation front doors, family lineage, and a read-only dossier that can compose many of them.

The remaining risk is increasingly **semantic impedance**, not missing primitives. A field can exist at A, B, C, and D while still disappearing exactly where the scientific claim is made. The most important example found here was `researchBlock.independentUnit`: the block carried it, opportunity sizing could use it, and the operating model required it, but the native experiment population did not preserve it as an explicit contract field. A later analysis could therefore know the frozen parents yet lose the denominator declaration at the decision-bearing boundary.

A second seam appeared in resource selection. The relations layer already exposed both Resource Contract audits and the evidence-integrity index, but candidate assets carried only the former. At the moment a question selects evidence, the system could answer “what is this resource allowed to mean?” without simultaneously answering “how reconstructable/reliable is the surviving evidence for this exact source?” The underlying information existed, but the composed decision view did not.

These are representative of the remaining architecture: individually excellent subsystems can still permit a wrong inference when the required five-way join exists only in a researcher's head.

## Architecture map

The current architecture is best understood as eight interacting planes rather than one hierarchy.

| Plane | Major components | Owns / exports | Main consumers |
|---|---|---|---|
| Priority and question semantics | workstreams, question registry, future-work | priority/gates; stable question state/relations; deferred reopen prose | dossier, agents, experiment planning |
| Conceptual structure | premise snapshot/graph, capability atlas, operational taxonomy | admitted premises/typed edges; reasoning gaps; operational family identity | question mapping, mechanism nomination |
| Population and source construction | asset registry, Resource Contract audits, generation registry, cross-source matching, frozen research blocks, family index | available resources, source/support semantics, selected populations, ancestry | acquisition, experiments, family/frontier work |
| Measurement and instrumentation | decision observations, frontier sampling, exact/reference models, MO overlay, work ladder, covariance reducers | discriminators, labels, dose response, gain/loss response | premise tests, ranking/economics gates |
| Evidence and provenance | experiment contracts/manifests, block consumption lineage, durable bundles, evidence-integrity index | execution identity, selection/exposure ancestry, retained decision evidence, reconstructability | confirmation/transfer decisions, archaeology |
| Analysis and inference | capability memory, family microscope, response covariance, opportunity sizing | solve-set complementarity, controlled perturbation response, clustered-unit accounting | mechanism nomination, allocation/acquisition |
| Historical memory | archaeology register, research-status index, historical reports | tested forms, dirty/clean negatives, old identity normalization, prior evidence | reopen decisions, rediscovery prevention |
| Process governance | operating model, evaluation evidence, integration audit, MO-007 concept | scientific method, role semantics, referential checks, process diagnostics | agents and all decision-bearing workflows |

The important architectural choice remains correct: these are separate authorities/graphs. Their edge meanings must not be collapsed merely to make traversal convenient.

## Valuable pairwise seams

### Resource Contract × evidence integrity

**Found and implemented.** The asset relation now attaches evidence-integrity records only when an integrity record's `sourcePaths` exactly matches a catalogued asset location. Acquisition ranking exposes the bounded integrity facts: evidence ID, decision-bearing status, reliability, reconstructability, rerun disposition, and source paths.

Why exact-path only: a directory/pattern/fuzzy join would silently invent source equivalence. A missing join remains “unknown” rather than guessed.

### Research block × experiment contract

**Found and implemented.** A contract using `population.researchBlock` now propagates the block's `independentUnit` into `population.independentUnit`. An explicit conflicting value is rejected.

### Experiment question × source-block question

Current behavior warns when the question being answered differs from the question that originally froze the block. Useful reuse can be legitimate, so equality cannot be required. The missing semantic is the **declared reuse basis**: descendant/ancestor/related/no-semantic-dependence plus exposure reasoning. This should remain prospective until a live cross-question reuse needs it.

### Future-work entry × stable question ID

Future-work owns deferred concepts; the registry owns stable question state. Selected deferred rows would benefit from a stable question anchor where a real one-to-one relationship exists. Do not force every broad future-work concept into a question identity.

### Capability memory × operational taxonomy

Capability memory already carries `mechanismFamily`, but it is not yet an enforced/derived join to the canonical operational taxonomy. Consequently a cloud of configurations can still look more diverse than one operational family. A read-only family crosswalk would improve MO-006 interpretation without changing capability claims.

### Consumption lineage × eligibility

Consumption events preserve conditioning and opened outcome kinds, while eligibility remains intentionally coarse. This is safe, but it loses the distinction between administrative access, outcome-blind prespecified selection, control-only conditioning, diagnostic treatment inspection, and treatment-design influence. A prospective event-impact vocabulary is justified, but historical/untyped events must remain conservative.

## Valuable three-way seams

1. **Question × asset × Resource Contract/evidence integrity.** A question can now discover not only a relevant resource, but its independent-unit/dependence contract and the reconstructability of exact surviving evidence.

2. **Block ancestry × consumption event × confirmation eligibility.** Together these can distinguish “same parents, untouched outcomes” from “same parents already influenced treatment design”. None of the three alone is sufficient.

3. **Capability memory × operational taxonomy × evidence integrity.** This can tell whether complementary solve sets represent distinct mechanisms and whether the underlying historical evidence is strong enough to nominate current work.

4. **MO × measurement primitive × population support.** An MO is operational only when a concrete instrument can measure it on the population that makes the question interesting.

5. **Archaeology × reopen condition × production boundary.** A historical negative matters only in its tested form and historical boundary. A changed current boundary can satisfy a reopen trigger without invalidating the old evidence, or can make the old result non-portable.

## Higher-order compositions

### 1. Priority × question × premise neighborhood × MO × resources × evidence integrity × stop condition

Chain:

`priority -> stable question -> premise neighborhood -> live ambiguity/MO -> candidate assets -> Resource Contract + integrity -> eligible block/acquisition route -> stop/reopen condition`

The larger composition adds a property absent from any smaller subset: **decision-ready observability**. Priority plus a question says what matters. Premises explain what kind of distinction is causal. The MO says what observation would discriminate. Assets and Resource Contracts determine whether the observation can be made with valid units/conditioning. Evidence integrity determines whether reuse is scientifically reconstructable. The stop/reopen condition determines whether acquiring more information can actually change state.

Without all of these, a dossier can still recommend an available asset whose surviving evidence cannot support the intended claim, or a beautiful discriminator that cannot change the queue gate.

This should stay a derived question-centric view, not an automatic planner.

### 2. Future-work × question registry × archaeology × evidence integrity × production boundary × measurement support × Resource Contract

This is the strongest reopen composition.

It can answer:

- Was the historical form a clean negative, dirty revert, non-participating treatment, or population-limited result?
- Is its evidence reconstructable enough to carry forward?
- Has the *specific* changed condition named by `reopensOn` occurred?
- Does the current production boundary make the old population/consumer comparable?
- Does new measurement support remove the exact old blocker?
- Is the candidate resource valid for the claim and independent unit?

The seventh component matters because “new telemetry exists” does not imply the old negative is portable or that the new source can answer the reopened question. The output should be explanatory states such as “trigger evidence present / old evidence portable / rerun required”, never an automatic reopen.

### 3. Generation method × support envelope × witness bias × origin recognizability × matching × evidence role × independent-unit lineage

This composition upgrades source reasoning from **difference** to **adequacy**.

A source can be:
- construction-independent yet incapable of expressing the mechanic;
- relevant but sharing witness-first selection bias;
- statically matchable while solution-profile support differs;
- suitable for development but not transfer;
- cross-construction while still yielding descendants of one selected parent.

Only the full chain can distinguish these cases. `crossConstructionStatus` is a useful narrow fact, but it is deliberately insufficient evidence of transfer independence.

A future derived source-adequacy view should join existing generator descriptors, P190/P191, origin-recognizability results, static/profile coverage, matching provenance, block role, and parent-level unit semantics. Do not create an adequacy score.

### 4. Capability memory × operational taxonomy × phenotype memory × MO-006 × family microscope × transfer source × archaeology

Current capability memory is solve-set centered, which is appropriate for production capability. It underrepresents repeated non-solve phenomena such as:
- exact LIVE candidates repeatedly falling below cutoff;
- decision-rank disagreement;
- frontier survival/extinction patterns;
- work-response shapes;
- representation-specific survival;
- stable structural response across siblings.

A separate bounded **mechanism-signature/phenotype-memory** layer would preserve those observations as nominations, not capabilities.

The larger chain matters because:
- operational taxonomy prevents configuration clouds from masquerading as mechanisms;
- phenotype memory preserves non-solve response;
- MO-006 asks whether responses covary;
- family perturbations test causal sensitivity without adding independent units;
- transfer sources test whether the phenotype is source ancestry;
- archaeology checks whether the “new” phenotype is an old closed form under renamed vocabulary.

Do not include phenotype signatures in solve-set union/headroom calculations and do not let them route production.

### 5. Frontier sampling × block freeze × exact/reference support × MO-005 representation × work ladder × decision observation × durable evidence

This is the clean route from “search seems lost” to an economically testable representation claim.

1. Freeze real production frontier states before labels.
2. Preserve parent/block independent-unit ancestry.
3. Preflight exact/reference support and expected abstention.
4. Label supported states.
5. Test a prespecified progress/representation hypothesis under MO-005.
6. If it separates viable-but-misranked states, apply MO-004 work ladders/decision observations under the same frozen population.
7. Persist the contract, unit, selection, exact exposure, and outcome in durable evidence.

All seven are needed to avoid fitting a progress metric to outcomes and then claiming the same selected states prove its economic value.

### 6. Family ancestry × selection history × question semantics × exact exposure × experiment contract × eligibility × durable evidence

This is the anti-pseudoreplication chain for variant/family research.

Family siblings can provide excellent within-parent causal resolution, but:
- matching can add selection pressure;
- exact labels can expose outcomes;
- a descendant question can differ from the block's origin question;
- the experiment can contain many rows/states;
- durable summaries can otherwise make row count look like support.

The chain should preserve the parent/family unit from generation through block freeze, family derivation, state/exact enrichment, experiment contract, analysis, and closeout. The independent-unit contract repair in this tranche closes one central hop, but end-to-end family/state audits remain worthwhile.

### 7. MO registry × measurement primitive × required resource × supported population × question consumers × durable-evidence path × blind spots

This turns MO coverage into an architecture view rather than a list of concepts.

For every MO, a derived report should be able to state:
- what primitive measures it;
- what resources that primitive needs;
- which mechanics/populations it supports or abstains on;
- which current questions consume it;
- how a decision-bearing result becomes durable;
- which missing link is measurement, population construction, representation, or source support.

This is especially useful for MO-005 and MO-007, where conceptual coverage can outrun operational connectivity.

## Concrete integration defects found

1. **Independent-unit loss at the block → experiment boundary.** Fixed. The block declared a unit but the native experiment population did not explicitly carry it.
2. **No durable-evidence audit for independent-unit propagation.** Fixed. New evidence is checked for parity; legacy manifests missing the explicit field are warned and remain conservative.
3. **Asset selection could see Resource Contract semantics but not exact-source evidence-integrity status.** Fixed through a conservative exact-path derived join.
4. **Question/block cross-question reuse has no structured reuse basis.** Not fixed automatically; semantic design required.
5. **Future-work reopen entries are not stably linked to questions except by prose/aliases.** Selective prospective links are warranted, not bulk retrofitting.
6. **Cross-construction generation is weaker than source adequacy.** Current `distributionClass` comparison cannot establish mechanic support, witness-bias independence, or transfer entitlement.
7. **Capability memory remains solve-set dominant.** Non-solve mechanism phenotypes are preserved mostly in prose/reports rather than a bounded reusable interface.
8. **Consumption eligibility is intentionally over-conservative.** It does not yet exploit the conditioning/opened-outcome semantics already present in events.
9. **Exact/reference campaigns lack composed preflight.** Question mechanics, population mechanics, reference support/abstention, label cost, independent units, and expected decision value are not joined before expensive labeling.
10. **MO operational coverage is dispersed.** Registry, tools, resources, consumers, and durable paths are individually documented but not available as one read-only coverage view.
11. **Selection pressure is recorded incompletely across layers.** Candidate/config search, residual selection, thresholds, exact exposure, family exploration, and source matching are not summarized prospectively at confirmation planning time.
12. **Independent-unit semantics are still declarative.** Preserving `parent-level` prevents one silent loss, but a future audit must still prove which row field actually maps each state/variant/decision back to that parent.

## Repairs landed in this tranche

### Independent-unit propagation

`write-solver-experiment-contract.mjs` now:
- copies `researchBlock.independentUnit` to `population.independentUnit`;
- rejects an explicit conflicting population unit.

`decisionContractIssues()` now rejects disagreement when an explicit population unit is present, while retained legacy contracts without the newly propagated field remain readable.

The integration audit now:
- errors when durable evidence carries a population unit that disagrees with its research block;
- warns when legacy durable evidence has a block unit but no explicit propagated population unit;
- reports independent-unit join coverage.

### Asset integrity composition

`research-relations-lib.mjs` now attaches evidence-integrity records to an asset only for exact source-path equality.

`research-acquisition-preflight-lib.mjs` surfaces a bounded integrity summary beside Resource Contract signals. It does not compute a global evidence grade or authorization.

Tests exercise both integration boundaries.

## Larger follow-on designs, deliberately not implemented

### A. Reopen-status derived view

Add a read-only query that accepts a stable question/deferred anchor and gathers:
`reopensOn + archaeology disposition + integrity record + current production boundary refs + new MO/support evidence + Resource Contract caveats`.

Its output should enumerate evidence for/against each condition, never mutate question/workstream state.

### B. Mechanism-signature / phenotype memory

Define a small schema only after at least two live consumers are known. Candidate fields:
- signature identity and source evidence;
- operational mechanism/action family;
- observation kind (rank disagreement, frontier survival, exact disagreement, dose response, structural family response);
- parent/independent-unit identity;
- conditioning/selection history;
- support/abstention scope;
- reproducibility status;
- actionable consumer hypothesis.

Keep it outside solve capability union/headroom.

### C. Prospective selection-provenance summary

At experiment planning time, collect structured facts rather than a score:
- prespecified vs mined;
- candidate/configuration/threshold/seed search;
- residual/cohort selection;
- outcome-blind matching;
- exact-label exposure before treatment freeze;
- family exploration;
- source selection after seeing results.

Evaluation evidence can then explain confirmation intensity from these facts.

### D. Exact/reference campaign preflight

Join:
`question mechanics × population mechanics × reference support envelope × expected abstention × label cost × independent units × decision value`.

The first implementation should report unsupported mechanic fractions and expected usable independent units, not automatically launch labeling.

### E. MO implementation-coverage view

Derive MO → primitive → resource → supported population → live question → durable path → blind spots. Keep the MO registry authoritative for concepts; the view only observes implementation coverage.

### F. Source-adequacy view

Compose generator support, source construction class, P190/P191 witness-selection warnings, origin recognizability, static/profile coverage, human/editor contrasts, matching provenance, evidence role, and unit ancestry. No scalar adequacy score.

## Authority and tooling changes indicated

| Surface | Change now / next |
|---|---|
| solver queue | no reprioritization from this infrastructure audit; retain current scientific gate |
| future-work | selectively add stable question anchors when an exact deferred-question identity exists; do not duplicate `reopensOn` |
| question registry | remain owner of stable question state/relations; prospective reuse-basis/reopen links may reference it |
| premise map | no new premise earned by infrastructure composition |
| MO registry | add no new MO; build read-only operational coverage before expanding ontology |
| asset registry | no schema expansion required for integrity join; exact-source derived join is sufficient |
| Resource Contract | remains owner of independence/conditioning semantics; do not fold evidence-integrity grading into it |
| capability memory | preserve solve capability role; design separate phenotype layer rather than weakening capability semantics |
| archaeology | expose tested-form/portability facts to reopen view; remain historical memory, not priority |
| experiment contracts | the canonical writer now propagates the research-block independent unit and rejects conflicts; legacy absence remains an audit warning; future selection summary/reuse basis can be optional prospective extensions |
| family/generation | preserve parent unit and source ancestry; source adequacy should consume existing provenance rather than rewrite generators |
| evidence integrity | expose exact-source records in resource planning; do not become a universal score |
| agent guidance | dossier remains first front door; agents should inspect unit, conditioning, integrity, and support/abstention before broad acquisition |

## Before the next solver push

Priority tranche:

1. **Land the independent-unit and asset-integrity repairs from this report.**
2. **Use the current D1/next active question as an end-to-end composition canary:** stable priority/question → premise/MO → frozen parent block → production-inert observations → independent-unit sizing → exact enrichment → experiment contract → durable evidence → question closeout.
3. **Add a read-only reopen-status prototype only if the next queue/future-work decision actually needs historical portability.**
4. **Preflight any expensive exact campaign against mechanic support/abstention and independent usable parents before labeling.**
5. **For any family/frontier study, assert parent mapping at every derived row boundary, not merely `independentUnit: parent-level`.**
6. **When selecting a treatment after mining/config/threshold/family exploration, preserve a prospective selection-provenance summary before confirmation.**
7. **Build MO operational coverage only as a derived diagnostic if the next solver round exposes uncertainty about which measurement path exists.**
8. **Do not delay solver acquisition to build phenotype memory.** First collect two concrete non-solve signatures with real downstream consumers; then standardize the shared minimum.

## MO-007 process metrology worth collecting

Do not create a scalar research-quality score. Useful orthogonal diagnostics include:
- experiments per stable question-state change;
- generated blocks created before existing evidence reuse was exhausted;
- delays caused by missing discriminator telemetry;
- clustered-row inflation caught before execution;
- stale authority-consumer joins caught by CI/integration audit;
- repeated experiments in a premise neighborhood without ambiguity reduction;
- stable question/premise/MO join coverage on new decision-bearing reports;
- reopen-condition latency after the triggering capability/measurement became available;
- catalogued high-value assets never surfaced to a relevant live question;
- experiments whose prespecified outcomes could not change a queue/question decision.

## Combinations investigated and rejected

These combinations should **not** be integrated:

- semantic question/premise relatedness → automatic contamination;
- operational similarity → causal identity;
- cross-source or cross-construction difference → statistical independence;
- evidence role label → automatic evidence entitlement;
- generation-source provenance → automatic transfer status;
- phenotype/mechanism signatures → solve-capability union/headroom;
- family siblings/states/variants → independent confirmations;
- one global selection-pressure, evidence-quality, source-adequacy, research-yield, or priority score;
- automatic question ranking, reopen/close, generation, evidence promotion, or solver-policy selection;
- a central database/warehouse or broad persistent index duplicating current authorities;
- automatic lexical/embedding premise admission;
- mass retrofit of every historical report with modern stable IDs;
- one-to-one future-work/question mappings when a future-work row intentionally spans several questions;
- fuzzy evidence-integrity-to-asset joins where source identity is not exact.

## Bottom line

The repo is now much closer to a coherent scientific instrument than a collection of good research utilities. The next gains come from protecting **semantic continuity across long chains**.

The recurring test should be:

> Can a fact required for the final inference disappear between the layer that owns it and the layer that makes the decision?

This pass found two such disappearances in independent-unit propagation and asset evidence integrity, and repaired them without adding authority. The larger remaining opportunities are similarly compositional: reopen portability, source adequacy, mechanism phenotypes, selection provenance, exact-support planning, and MO operational coverage. They should be built only as thin derived views when a live scientific decision needs them.
