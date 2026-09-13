# Duplicate authority and missing abstractions audit

> **Status:** second-pass reconciled
> **Last evidence:** 2026-09-12 — repository-wide audit followed by an explicit falsification pass against existing population, lifecycle, stage-policy, corpus, provenance, capability-memory, evidence-registry, and question-relation infrastructure
> **Decision:** preserve this as the detailed evidence report; durable unresolved structural debt belongs in `docs/architecture-unification-debt.md`, while active solver-research priority remains owned by `docs/solver-optimization-workstreams.md`.
> **Remaining gate:** no implementation is authorized by this report. Any cleanup should start from the existing owners named below and demonstrate live duplicated authority before adding a new abstraction.

This audit is about duplicated implementation, duplicated knowledge, duplicated authority, evidence reconstruction, identity weakness, and missing Pathfinder-domain abstractions. It is deliberately not a cosmetic DRY pass. Similar-looking code is only a problem where independent encodings can drift, corrupt research evidence, enlarge agent context, or create avoidable maintenance burden.

The current production boundary supplied for this audit is 100/102 Corpus 1 and 1,048/1,700 Corpus 2. The active research model depends on distinctions between residual classes, capability composition versus acquisition, treatment disposition versus capability signature, deterministic work accounting, provenance, lifecycle state, and research-question relationships. Duplication across those concepts is therefore scientific debt, not merely code debt.

## Executive conclusion

The first pass correctly identified several places where higher-order research semantics are still reconstructed locally, but it overestimated how many *new* abstractions the repo needs. The falsification pass found substantial existing infrastructure that should be extended or consumed rather than replaced:

- `modules/solver/stage-policy.ts` already owns `SOLVER_STAGE_SPECS`, scheduler phase, eligibility, attempt source, budget-policy identity, retry identity, and a typed `BudgetEnvelope`.
- production already emits canonical `stageLifecycle` telemetry rich enough to represent instantiated/reached/skipped/starved/exhausted status plus actual attempts/nodes/work; `scripts/stress/lifecycle-failure-map.mjs` deliberately derives stage vocabulary from that producer instead of maintaining a parallel registry.
- `scripts/solver-experiment-contract.mjs`, population-integrity tooling, result publication, recovery tooling, experiment preflight, and the research operating model already provide population identity, hashing, completeness, execution limits, resolved execution identity, and the "single population source" discipline.
- `scripts/level-data-io.mjs` already owns explicit `pos:`/`id:` level-selection semantics and hint-aware level I/O; `scripts/corpus-query-lib.mjs` already owns common corpus aliases/loading/querying for research.
- `docs/solver-research-data-assets.json` is already a structured evidence registry containing asset grain, authorities, query entry points, join keys, relationships, roles, and caveats. `docs/solver-research-data-assets.md` explicitly says to name join keys before writing ad hoc joins.
- `docs/solver-capability-memory.md` plus `scripts/solver-capability-memory.mjs` already define a regenerable derived capability interface and explicitly forbid hand-rebuilding decision-bearing unions.
- `docs/solver-research-question-relations.json` is already a machine-readable question registry containing state, answered-by evidence, results, triggers/implies/constrains relationships, and reopen conditions.
- canonical attempt/action identity and provenance-event identity are already strong examples of the right producer/boundary ownership pattern.

So the main architectural conclusion becomes narrower: **Pathfinder does not primarily need a new layer of named domain objects. It needs the existing canonical producers/contracts to reach the remaining bespoke consumers, plus a small number of still-missing derived authorities where the same scientific classification is repeatedly rebuilt.**

## Second-pass reconciliation table

| First-pass proposal | Existing implementation found | Corrected conclusion |
|---|---|---|
| New declarative stage/budget registry | `SOLVER_STAGE_SPECS`, `SolverStageSpec`, `BudgetEnvelope` in `stage-policy.ts`; stage plan/budget modules already own orchestration semantics | **Do not create another registry.** Make source-text budget ratchets consume/check existing policy metadata where possible and close any fields the registry cannot yet express. Keep behavioral ratchets independent. |
| New `ResearchPopulation` abstraction | `hashPopulation`, canonical identity, population integrity, recovery population, experiment contracts, corpus query, preflight, result publisher, and operating-model single-population-source rule already exist | **Do not create a parallel population authority.** Add reusable derivation recipes/helpers only for recurring multi-asset joins that are still bespoke, feeding the existing population contract. |
| New `TreatmentParticipation` object | canonical producer-emitted `stageLifecycle` already records stage instantiated/reached/skipped/starved/exhausted plus attempts/nodes/work; attempts carry action/config identity; opportunity audit already checks real work/nodes | **Narrow the gap.** Prefer lifecycle/attempt telemetry directly. Add treatment/action-level derived participation only where exact-config opportunity cannot be represented from existing telemetry without local stage-family inference. |
| New `ResearchQuestion` registry | `solver-research-question-relations.json` already stores question IDs, states, evidence, results, relationships, constraints and reopen rules | **Registry already exists.** Missing work, if justified, is synchronization/validation/result-propagation between this registry, the workstream authority, workflow outcome artifacts, and the prose-derived status index. |
| New `Corpus` / `CorpusLevelRef` layer | `level-data-io.mjs` already owns explicit selector semantics and level/hint I/O; `corpus-query-lib.mjs` already owns common aliases/loading | **Prefer migration/extension.** Move bespoke loaders and position/ID logic onto these existing owners where semantics match. Add a richer level reference only if a concrete remaining join needs corpus fingerprint + ID + position together. |
| New `RunIdentity` / `ResearchSolverContext` framework | experiment-manifest library, experiment contract, experiment preflight, result publisher, workflow manifests, and family-run manifests already capture substantial execution/provenance context | **Do not add a framework by default.** Reuse the existing experiment contract/publisher in decision-bearing harnesses; extract shared fragments only when two current schemas demonstrably drift. |
| New generic `CapabilityEvidence` layer | structured evidence-asset registry plus capability-memory derived interface already define evidence roles, joins, freshness, capability signatures and historical/current distinctions | **Do not create another evidence ontology.** Extend the asset registry/capability-memory interface or produce a residual-specific derived artifact where needed. |
| Canonical residual evidence/classification | current residual atlas still locally composes census, lifecycle, ladder/action identity, and provenance; older residual-decomposition machinery encodes a coarser taxonomy | **Still a genuine gap.** This is the strongest candidate for a new derived authority because a documented local-classification error already changed 25 residual assignments. |

## Highest-risk findings after reconciliation

### 1. Residual classification remains the clearest genuine missing derived authority

The current post-1029 residual atlas reconstructs its scientific ontology from multiple already-canonical lower-level sources: baseline rows, lifecycle reach/starvation telemetry, T1 census rows, static ladder membership, dynamic repair/admissible stage families, attempt identity, and hint provenance. It locally decides whether a known rescuer was not offered, offered but unreached/starved, reached and failed, known only from historical production-context evidence, or absent from known evidence.

This has already drifted materially. The atlas records that treating `variantLabel` as evidence that a T1 cell was non-base incorrectly excluded clean turn-biased repair cells. `ablation` was the meaningful discriminator. The bug misclassified 25 current-residual levels, including nine class-5 rows. That is direct evidence that local reconstruction can alter research populations.

**Duplication type:** semantic, authority-level, evidence/reconstruction.

**Consequence:** changes the population assigned to capability-acquisition, composition, scheduler-opportunity, and unknown-capability research.

**Corrected direction:** build a *derived residual artifact/library* from the existing authoritative inputs, not a new general evidence framework. It should version the five-class rules, record exact source artifacts/population identity, and expose the per-level evidence used for each class. The current atlas can become or seed that producer. Class-specific research should consume that output rather than copy its joins/classifier.

### 2. Work accounting has a canonical policy registry, but one enforcement path shadows it with source text

`modules/solver/budget-units.ts` correctly defines work as the canonical allocation currency. More importantly, the second pass found that `modules/solver/stage-policy.ts` already provides the declarative registry the first pass proposed: `SOLVER_STAGE_SPECS` owns stage identity, phase, eligibility, attempt source, budget-policy identity and retry identity, and `BudgetEnvelope` gives explicit wall/work/node/headroom dimensions.

The remaining smell is narrower. `scripts/check-solver-budget-boundaries.mjs` still keeps hand-maintained source-line and variable-name allowlists describing permitted legacy allocation sites. Its own comments document a real work-dose defect that escaped the checker because the source expression had a different syntactic shape.

**Duplication type:** authority-level enforcement shadow, not missing policy abstraction.

**Consequence:** a new/reworded orchestration allocation can evade the textual ratchet even when it violates the intended canonical work model.

**Corrected direction:** do not add another registry. Where feasible, make structural checks validate `SOLVER_STAGE_SPECS` / stage-budget outputs / budget envelopes and reserve source scanning for narrowly defined compatibility debt that cannot yet be represented there. Keep independent behavioral tests because they caught a defect the structural checker missed.

### 3. Research-question state has a machine registry, but synchronization remains split

The first pass called for a machine-readable question registry. That already exists in `docs/solver-research-question-relations.json`: current entries contain stable question IDs, owner, state, `answeredBy`, result, `triggeredBy`/`implies`/`constrains`/`constrainedBy`, negative-control/calibration relations, and `reopensOn`.

At the same time, `scripts/research-status-index-lib.mjs` still builds queue state by parsing the Markdown workstream table and structured report headers, while `scripts/research-workflow-outcome.mjs` owns a separate execution-outcome vocabulary. That means the remaining issue is not lack of a question model but cross-authority propagation and validation.

**Duplication type:** workflow/authority synchronization.

**Consequence:** question relations can say a successor is triggered or a form is closed while other discovery/status surfaces lag or infer state differently.

**Corrected direction:** keep workstream priority where it is and keep workflow execution outcome distinct. Add validation/projection only if current tooling does not already ensure that question state/evidence relationships and the status/workstream surfaces agree. Do not replace the existing relation registry.

### 4. Population identity is strong; recurring multi-asset population *derivation* is the remaining gap

The repo already has more population machinery than the first pass credited: `solver-experiment-contract.mjs` canonicalizes and hashes identities and validates population completeness; result publication carries population identity/integrity; recovery tooling derives only missing IDs under strict integrity conditions; experiment preflight freezes a literal selected vector; corpus query provides deterministic filtering/sampling; and the operating model explicitly requires a single population source for plan/execution/combine/manifest.

What still appears bespoke is higher-order scientific selection such as `current residual ∩ base-T1 winner ∩ treatment X`, especially when it spans census, lifecycle, provenance, capability memory, or residual classes.

**Duplication type:** semantic join/reconstruction, not basic population plumbing.

**Consequence:** two analyses can use different predicates or evidence freshness while both publish internally valid population hashes.

**Corrected direction:** extend the existing population contract with small reusable derivation helpers/recipes for recurring multi-asset joins. A recipe should produce the literal IDs plus source artifact identities, predicates/exclusions, and then use the existing `hashPopulation`/integrity machinery. Do not create a second generic population framework.

### 5. Treatment participation mostly exists at stage level; exact treatment/config opportunity is where reconstruction remains

Production lifecycle telemetry is already much stronger than the first pass implied. `scripts/stress/lifecycle-failure-map.mjs` deliberately consumes canonical producer-emitted `stageLifecycle`, derives stage vocabulary from the artifact rather than a local list, dual-reads only historical `techniqueLifecycle`, and exposes instantiated/reached/starved/skipped/exhausted status plus attempts, actual nodes and actual work. `scripts/experiment-opportunity-audit.mjs` independently defines real stage participation as an attempt with positive work or nodes.

The residual atlas nevertheless has to reconstruct family-specific offeredness for repair/admissible configurations and literal ladder membership for beam/DFS. That is a narrower identity/granularity issue: stage reach is not always the same fact as exact action/config opportunity.

**Duplication type:** evidence reconstruction caused by granularity mismatch.

**Consequence:** class-2 can confuse a stage being present/reached with the exact known-capable action being meaningfully offered.

**Corrected direction:** first reuse and, if necessary, enrich existing lifecycle/attempt telemetry. Introduce a separate `TreatmentParticipation` schema only if exact action/config opportunity still cannot be represented cleanly by canonical action identity plus lifecycle fields. The burden is now on a concrete consumer to prove the need.

### 6. Experiment/run provenance is already converging through contracts and publication

The initial audit was right that multiple schemas overlap, but the second pass found an active convergence path. `solver-experiment-preflight.mjs` uses `experiment-manifest-lib.mjs`; `publish-solver-sweep-result.mjs` consumes `solver-experiment-contract.mjs`, population integrity, workflow outcome, declared contracts, resolved execution identity, limits and side-effect posture. The operating model already requires resolved treatment provenance at the solver invocation boundary.

**Duplication type:** schema overlap, with an existing convergence owner.

**Consequence:** still potential maintenance burden, but no evidence yet warrants creating shared `RunIdentity`/`ProducerIdentity` classes merely for neatness.

**Corrected direction:** prefer the v3 experiment contract/result publisher for new decision-bearing workflows. Extract a lower-level shared fragment only when a concrete pair of live schemas has drifted or must interoperate. Family-run manifests may legitimately remain purpose-specific.

### 7. Solver harness differences are real, but existing contract/preflight machinery is the likely boundary

Fresh-process retry, production solving, isolated census cells, fingerprints, replays and microscopes intentionally execute differently. That independence should remain. The first pass proposed a `ResearchSolverContext`; the second pass found that the experiment contract, preflight, canary checks, result publisher and operating-model gates already cover much of what such a context would encode for decision-bearing runs.

**Corrected direction:** do not invent another run-context framework. Audit which decision-bearing harnesses bypass the existing contract/preflight/publisher path and migrate those where the semantics fit. Keep diagnostic one-offs lightweight when they are not promotion evidence.

### 8. Corpus/level infrastructure already has owners; remaining debt is caller migration and authority overlap

`level-data-io.mjs` already owns explicit `pos:` versus `id:` selector semantics, current/legacy hint attachment and persistent ID handling. `corpus-query-lib.mjs` owns common corpus aliases, array-versus-wrapper loading, deterministic sampling and legal structural descriptors. The research asset registry identifies corpus join keys and query entry points.

There are still local corpus maps/loaders in tools such as technique census and `solve-one`, but this is no longer evidence for a new `Corpus` object by itself.

**Corrected direction:** inventory bespoke loaders and move them to `level-data-io` or `corpus-query-lib` where semantics match. If those two existing owners themselves overlap incompatibly, resolve that boundary explicitly. Add a richer level-reference structure only if a real current join needs corpus revision/fingerprint + persistent ID + position together.

## Existing architecture that should be reused, not duplicated

### Attempt/action identity

`modules/solver/attempt-identity.mjs` owns canonical and historical parsing/formatting plus stage+seed action identity. `scripts/attempt-config-key.mjs` adds policy-aware materialization without re-owning grammar. Keep this split.

### Stage policy and lifecycle telemetry

`modules/solver/stage-policy.ts` already supplies stable stage metadata and budget-envelope vocabulary. Production `stageLifecycle` is an authoritative producer surface; `lifecycle-failure-map.mjs` is intentionally designed to consume emitted stage vocabulary rather than maintain its own registry. New research should build on these before inventing stage/treatment classifications.

### Provenance identity and evidence applicability

Hint event identity is already canonicalized at the persistence/runtime boundary. The research-data guide additionally requires query-purpose-aware provenance applicability rather than local trusted/untrusted predicates. Preserve those authorities.

### Evidence registry

`docs/solver-research-data-assets.json` is already the machine registry for evidence families, authorities, query entry points, join keys, relationships, roles and caveats. Any new reusable join should reference this registry rather than creating another asset catalogue.

### Capability memory

Capability memory already provides the intended generated/derived interface over historical/current complementary capability and explicitly states that decision-bearing unions should be regenerated from manifests/results rather than rebuilt in prose or arrays. Extend this interface when the question is capability memory; do not create a parallel `CapabilityEvidence` store.

### Experiment population/provenance contract

`solver-experiment-contract.mjs`, experiment manifests/preflight, integrity tooling and result publication already form a substantial common substrate. New decision-bearing research should feed it rather than inventing new population/run identity formats.

### Question relation registry

`solver-research-question-relations.json` already contains the higher-order question relation/state model. Any additional lifecycle automation should validate/project this authority, not supersede it.

## Straightforward opportunities that survived the falsification pass

1. **Move residual-class consumers onto one generated/versioned residual-class artifact or library.** This has demonstrated correctness value.
2. **Replace avoidable textual budget-policy shadowing with checks against existing stage-policy/stage-budget structures.** Keep independent behavioral tests.
3. **Migrate bespoke corpus loading/selection to the existing `level-data-io` / `corpus-query-lib` owners where their semantics fit.** No new corpus framework unless a concrete unmet identity need remains.
4. **Add reusable population-derivation helpers only for recurring multi-asset joins, feeding the existing experiment population contract.** Do not generalize ahead of repeated use.
5. **Wire question-relation state/evidence into status validation or generated projections if current checks allow drift.** The registry already exists.
6. **Prefer producer-emitted lifecycle/action telemetry over local family-stage inference, enriching that existing telemetry only where exact treatment opportunity cannot otherwise be recovered.**

The first-pass suggestions for generic JSON/JSONL utilities, broad CLI option frameworks, a new `RunIdentity`, a new `ResearchSolverContext`, and a generic `CapabilityEvidence` layer are **withdrawn as recommendations** absent a concrete current duplication they uniquely solve. They may be reasonable local extractions later, but this audit should not pre-authorize them.

## Duplication that should deliberately remain

- Independent CP-SAT/MiniZinc/reference or referee implementations used to detect production errors. Sharing production rule implementation would create common-mode failure.
- Technique-census allocation policy versus production orchestration. Share units/identity/disposition vocabulary, not the scheduler itself.
- Fresh-process retry/solve tooling. Process isolation is the point; share configuration/corpus semantics without collapsing the execution boundary.
- Frozen historical readers and compatibility parsers. Prefer canonical-write/dual-read at narrow boundaries rather than rewriting history.
- Independent behavioral work-accounting tests. The current budget-checker history proves structural checks alone are insufficient.
- Independent capability/evidence producers used as cross-checks. Canonicalize or join their observations rather than forcing common-mode generation.

## Apparent duplication that is meaningfully different

- `AttemptIdentity` versus `AttemptActionIdentity`: family/config identity intentionally excludes stage/seed; action identity includes them.
- Work budget versus wall deadline: two different resources; the defect is re-deriving work from wall time after normalization, not retaining both dimensions.
- Stage lifecycle versus exact treatment/config opportunity: related but not identical grains.
- Capability signature versus treatment disposition: known capability and actual scheduling opportunity answer different questions.
- Question relation graph versus workstream priority versus workflow execution outcome: they describe different dimensions and should be synchronized, not collapsed.
- Experiment/family manifests versus scientific result contract: different top-level purposes; shared fragments should be extracted only when concrete drift warrants it.
- Evidence registry versus capability memory: the former describes available evidence topology; the latter derives complementary capability for a named baseline/question.

## Revised cleanup order

1. **Residual classification first, but as a derived-authority extraction.** Preserve current five-class behavior and source identities; add parity against the corrected atlas before moving consumers.
2. **Consumer migration onto existing authorities.** Prefer `stageLifecycle`, canonical action identity, evidence registry joins, capability memory, `level-data-io`, corpus query, and experiment population/provenance contracts before writing new helpers.
3. **Population derivation helpers only where repeated joins remain after step 2.** Keep literal IDs and existing population hashes as the execution boundary.
4. **Question-state synchronization.** Validate/project the existing question-relations registry against status/workstream/evidence surfaces rather than replacing it.
5. **Budget ratchet cleanup.** Make existing stage-policy/stage-budget structures carry as much enforceable policy as practical, while retaining behavioral independence.
6. **Compatibility residue last.** Remove old aliases/representations only after live-consumer and historical-reader inventories prove they are unnecessary.

## Architectural interpretation

Pathfinder's research ontology did grow faster than some of its original tooling, but the repo has already spent substantial effort catching up. The second pass changes the diagnosis from “several missing domain abstractions” to “several strong authorities exist, but adoption is uneven and a few higher-order derived classifications remain local.”

The key architectural risk is therefore **authority reach**. A canonical concept can exist and still fail architecturally if consumers reconstruct an approximate local version because they do not know about it, cannot import it in their execution environment, or need a slightly different grain. `lifecycle-failure-map.mjs` shows the desired shape: derive vocabulary from producer telemetry, normalize compatibility once, and refuse to maintain a second stage registry. The residual atlas bug shows the opposite shape: a scientifically meaningful predicate was inferred locally from a bookkeeping field and changed class membership.

The next cleanup work should optimize for fewer epistemic dialects by extending existing owners outward, not by adding a fresh abstraction layer inward. A proposed new module should now answer a stricter question: **which current authoritative producer or contract cannot represent this fact, and which two or more live consumers are independently reconstructing it today?** If that cannot be demonstrated, do not add the module.
