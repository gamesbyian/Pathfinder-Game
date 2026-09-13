# Duplicate authority and missing abstractions audit

> **Status:** active
> **Last evidence:** 2026-09-12 — initial repository-wide audit of solver/research duplication and authority boundaries
> **Decision:** preserve this as the detailed evidence report; durable unresolved structural debt belongs in `docs/architecture-unification-debt.md`, while active solver-research priority remains owned by `docs/solver-optimization-workstreams.md`.
> **Remaining gate:** re-audit the current implementation against every recommendation here, especially recent identity/provenance/population/capability work, and revise any finding already implemented or intentionally covered elsewhere.

This audit is about duplicated implementation, duplicated knowledge, duplicated authority, evidence reconstruction, identity weakness, and missing Pathfinder-domain abstractions. It is deliberately not a cosmetic DRY pass. Similar-looking code is only a problem where independent encodings can drift, corrupt research evidence, enlarge agent context, or create avoidable maintenance burden.

The current production boundary supplied for this audit is 100/102 Corpus 1 and 1,048/1,700 Corpus 2. The active research model depends on distinctions between residual classes, capability composition versus acquisition, treatment disposition versus capability signature, deterministic work accounting, provenance, lifecycle state, and research-question relationships. Duplication across those concepts is therefore scientific debt, not merely code debt.

## Executive conclusion

Pathfinder already has several strong canonicalization patterns, notably canonical attempt/action identity, provenance-event identity at the hint persistence boundary, work-unit compatibility helpers, regenerable capability-memory manifests, and increasingly explicit experiment contracts. The remaining high-risk duplication is concentrated one level above those primitives: research populations, residual evidence/classification, treatment participation, work disposition, run/provenance schema composition, and question lifecycle/result propagation.

The recurring failure mode is that a higher-order research concept first appears inside one analysis script and later gets reconstructed elsewhere from lower-level fields. The code may look different while encoding the same proposition. That is where drift can change experiment populations or research conclusions.

## Highest-risk findings

### 1. Residual classification remains analysis-owned rather than domain-owned

The current post-1029 residual atlas reconstructs its own scientific ontology from multiple artifacts: baseline rows, lifecycle reach/starvation telemetry, T1 census rows, static ladder membership, dynamic repair/admissible stage families, attempt identity, and hint provenance. It locally decides whether a known rescuer was not offered, offered but unreached/starved, reached and failed, known only from historical production-context evidence, or absent from known evidence.

This has already drifted materially. The atlas records that treating `variantLabel` as evidence that a T1 cell was non-base incorrectly excluded clean turn-biased repair cells. `ablation` was the meaningful discriminator. The bug misclassified 25 current-residual levels, including nine class-5 rows. That is direct evidence that local reconstruction of capability/treatment semantics can alter research populations.

**Duplication type:** semantic, authority-level, evidence/reconstruction.

**Consequence:** changes the population assigned to capability-acquisition, composition, scheduler-opportunity, and unknown-capability research. Can change which experiments are proposed and how their results are interpreted.

**Direction:** define canonical `ResidualEvidence` plus a versioned `ResidualClassification` function over canonical capability evidence, treatment participation, lifecycle/work evidence, and provenance qualification. Residual atlas and class-specific analyses should consume that representation rather than re-derive its semantics.

### 2. Work accounting has a canonical unit but still has duplicated policy descriptions

`modules/solver/budget-units.ts` correctly defines work as the canonical allocation currency and milliseconds as a compatibility boundary. `scaledStageWorkBudget` is the appropriate shared primitive for additive stage allocation.

However, `scripts/check-solver-budget-boundaries.mjs` maintains source-text allowlists describing which orchestration sites are permitted to remain wall-derived or historically compatible. The checker itself documents that one work-dose defect escaped this model because the relevant line had a different syntactic shape and therefore never matched the allowlist scan. A broader behavioral test found it later.

The technique-census cell runner also implements a distinct but scientifically meaningful work scheduler: per-gate shares, flat/per-technique caps, `_workCap` and `_strictWorkCap`, right-censoring rules, deadline truncation, and work disposition. That execution policy should remain distinct from production, but it should not invent a separate vocabulary for work units and terminal dispositions.

**Duplication type:** authority-level, semantic, test/rule duplication.

**Consequence:** can invalidate equal-work comparisons, retry conclusions, or stage participation accounting.

**Direction:** keep independent experimental schedulers, but share explicit `WorkBudget` / `WorkAllocation` / `WorkDisposition` concepts. Move production stage budget policy toward a declarative registry that can be inspected directly instead of maintaining source-text shadow authority. Preserve independent behavioral ratchets because they catch common-mode mistakes the structural registry may miss.

### 3. Research-question state is split across structured relations, result vocabulary, and prose-derived status

The repo has structured question relations, workflow outcome vocabulary, report conventions, workstream authority, future-work authority, and a status index. But lifecycle state still depends partly on parsing Markdown tables and prose-shaped report metadata, while relation semantics and result outcomes are separate machine authorities.

**Duplication type:** authority-level, workflow-level, schema-level.

**Consequence:** a result can materially answer, constrain, supersede, trigger, or gate a question without every downstream surface reaching the same state. Agents can receive conflicting views of whether work is open or closed.

**Direction:** move question lifecycle into a machine-readable `ResearchQuestion` registry/state model with explicit relations, current disposition, evidence references, transition/result propagation, and reopen conditions. Generate status/index prose from that model. Keep relation topology separate from priority ranking.

### 4. Research population construction is still bespoke across experiments

`solver-experiment-contract.mjs` already has strong population identity primitives: canonicalized IDs, population hashes, corpus identity, execution/limit contracts, completeness checks, and compatibility checks. What remains duplicated is upstream derivation: residual intersections, T1 winner filters, current-residual joins, treatment-specific cohorts, capability-memory unions, and historical candidate construction.

**Duplication type:** semantic, evidence/reconstruction, abstraction mismatch.

**Consequence:** two agents can study nominally the same scientific population while using subtly different membership rules, exclusions, freshness assumptions, or identity bases.

**Direction:** add a domain-aware `ResearchPopulation` query/join layer. It should emit identities, source artifact identities/fingerprints, derivation operations, exclusions/reasons, corpus identity, treatment identity basis, and a stable hash. It should then feed the existing experiment contract instead of replacing it.

### 5. Treatment participation is reconstructed instead of emitted as a first-class fact

The current residual atlas demonstrates the distinction. Static beam/DFS offeredness can be inferred from plan membership; repair/admissible families require stage reach/starvation logic; actual dispatch is separate again. The wider research model now needs to distinguish configured, eligible, offered/planned, stage reached, starved, dispatched, completed, allocated work, spent work, and outcome.

**Duplication type:** semantic, identity-model weakness, abstraction mismatch.

**Consequence:** capability signature and treatment disposition can collapse together. This is especially dangerous for class-2 scheduling/acquisition questions where a known-capable treatment may simply never have received meaningful opportunity.

**Direction:** emit a first-class `TreatmentParticipation` record from solver orchestration/lifecycle instrumentation. Analyses should consume it rather than reconstructing opportunity from stage names and attempt bags.

### 6. Experiment/run provenance uses multiple strong schemas that overlap below the proper abstraction boundary

`experiment-manifest-lib.mjs` and `solver-experiment-contract.mjs` are both disciplined, but independently describe lower-level concepts such as commit/run identity, producer/workflow identity, population, budget/work envelope, execution posture, and side effects. Family-evaluation manifests add another composition.

**Duplication type:** schema-level, authority-level, abstraction mismatch.

**Consequence:** schema evolution and agent discovery burden; different research tools may carry materially different provenance strength.

**Direction:** do not create one giant manifest. Extract shared composable records/validators such as `RunIdentity`, `ProducerIdentity`, `PopulationIdentity`, `BudgetEnvelope`, and `SideEffectPolicy`, then let experiment/family/result contracts compose them.

### 7. Solver harnesses encode materially different experiment semantics

`run-solver-direct.mjs`, `stress/solve-one.mjs`, fingerprinting, technique-census cells, portfolio sweeps, microscopes, and replay tools differ in work-budget support, hint/history loading, solver lifetime, process isolation, validation, lower-level versus production orchestration, and output projection.

Some divergence is essential: fresh-process isolation and isolated-technique execution are legitimate independent methods. The architectural problem is that common context is implicit, so two tools that sound like “run the solver” may produce evidence with different scientific meaning.

**Duplication type:** workflow-level, semantic, repeated mechanics.

**Consequence:** research comparability can depend on harness choice without that choice being obvious in the result artifact.

**Direction:** define an explicit `ResearchSolverContext` / run-context contract covering corpus identity, level reference, work/deadline interpretation, history/hint posture, solver lifetime, side effects, validation policy, seed/determinism posture, and output provenance. Specialized executors remain distinct.

### 8. Corpus loading and level identity remain too informal for the research layer

Several research paths independently handle array-vs-`.levels` documents, corpus-name/path mappings, ID/position lookup, stripping `id`/`stressMeta`, and solver normalization. This now matters because published IDs and array positions are not guaranteed to remain identical.

**Duplication type:** implementation, semantic, identity-model weakness.

**Consequence:** off-by-one or ID/position joins, hint loss, inconsistent raw-level shape, or divergent corpus membership.

**Direction:** canonical `Corpus` / `CorpusLevelRef` loader with corpus identity/fingerprint, level ID, position, raw level, metadata, and optional hint context. Position semantics should be explicit rather than inferred.

## Areas that already show the right architecture

### Canonical attempt and action identity

`modules/solver/attempt-identity.mjs` correctly separates config-family identity from stage/seed action identity, owns current and historical parsing/normalization, and provides discovery terms for mixed-era evidence. `scripts/attempt-config-key.mjs` appropriately adds policy vocabulary validation rather than re-owning syntax.

This is a model to copy, not a target for broad consolidation. New artifacts should prefer canonical action/config fields so fewer readers need to reconstruct identity from old flag bags.

### Provenance event identity at the persistence boundary

`scripts/hint-provenance-identity.mjs` is already just a compatibility re-export because the canonical discovery-event identity moved into the hint persistence/runtime boundary. That is the correct direction: merge/reconcile/capture/cleanup should consume one identity authority.

### Capability-memory manifest reconstruction

The recent capability-memory repair is also a good pattern: source assets and exclusions live in a regenerable manifest rather than a manually assembled union. This should be generalized into typed capability-evidence projections where appropriate, while preserving independent evidence producers.

## Straightforward extraction opportunities

These are lower risk than the missing-domain-abstraction work and should not alter solver policy:

1. canonical corpus loader/reference layer;
2. research artifact JSON/JSONL read/write helpers with schema/kind/provenance hooks;
3. shared run-provenance fragments for commit/ref/dirty, producer/entrypoint, timestamps, and source fingerprints;
4. one persisted-record normalization boundary for current/historical attempt/action fields;
5. canonical execution-disposition vocabulary distinct from scientific workflow outcome and research-question lifecycle;
6. reusable CLI option groups for corpus/level selection, work/deadline, seed/determinism, output, and side-effect posture.

Avoid a generic `utils` layer. These abstractions should correspond to Pathfinder concepts.

## Deeper missing abstractions

The current evidence points toward six domain concepts with high leverage:

- **`ResearchPopulation`** — explicit, fingerprinted, reproducible population construction and joins;
- **`TreatmentParticipation`** — what opportunity and execution a treatment actually received;
- **`CapabilityEvidence`** — typed observations from isolated census, production history, accepted paths, provenance, etc., preserving evidence strength/context;
- **`ResidualEvidence` / `ResidualClassification`** — one canonical classification over the preceding evidence;
- **`RunIdentity` / run-context fragments** — reusable execution/provenance identity across manifests and tools;
- **`ResearchQuestion` lifecycle/state** — relations plus explicit machine-owned disposition/result propagation.

These should not be introduced merely because their names are appealing. The follow-up audit must first verify whether equivalent concepts already exist elsewhere under different names.

## Duplication that should deliberately remain

- Independent CP-SAT/MiniZinc/reference or referee implementations used to detect production errors. Sharing production rule implementation would create common-mode failure.
- Technique-census allocation policy versus production orchestration. Share units/identity/disposition vocabulary, not the scheduler itself.
- Fresh-process retry/solve tooling. Process isolation is the point; share configuration/corpus semantics without collapsing the execution boundary.
- Frozen historical readers and compatibility parsers. Prefer canonical-write/dual-read at narrow boundaries rather than rewriting history.
- Independent behavioral work-accounting tests. The current budget checker history proves that structural/source checks alone are insufficient.
- Independent capability/evidence producers used as cross-checks. Canonicalize observations after production rather than forcing all evidence through one algorithm.

## Apparent duplication that is meaningfully different

- `AttemptIdentity` versus `AttemptActionIdentity`: family/config identity intentionally excludes stage/seed; action identity includes them.
- Work budget versus wall deadline: two different resources; the defect is re-deriving work from wall time after normalization, not retaining both dimensions.
- Capability signature versus treatment disposition: “known capable” and “actually offered/reached/dispatched” answer different questions.
- Question relation graph versus priority: relations constrain state but should not secretly become another priority ordering.
- Experiment manifest versus scientific result contract: different top-level purposes, though their lower-level provenance fragments may deserve shared validators.

## Initial cleanup order

This order is intentionally conservative around active solver research:

1. **Freeze semantics before refactoring.** Define/verify data contracts for participation, capability evidence, populations, and residual classes; add parity tests against current artifacts.
2. **Canonicalize population construction.** Move repeated residual/capability/treatment intersections onto a reusable query layer with derivation/fingerprint output.
3. **Canonicalize research-question lifecycle.** Make status and outbound propagation machine-owned; generate prose views.
4. **Strengthen writers.** Emit canonical action identity, treatment participation, work disposition, validator identity, and source fingerprints so readers stop reconstructing them.
5. **Consolidate harness context/boilerplate.** Share corpus/run/config/provenance semantics while preserving execution-policy differences.
6. **Replace source-text budget shadow authority.** Move production stage-budget policy into inspectable declarative structure; retain independent behavioral ratchets.
7. **Retire compatibility residue last.** Remove old aliases/representations only after live-consumer and historical-reader inventories prove they are unnecessary.

## Architectural interpretation

The duplication pattern appears because Pathfinder's research ontology has grown faster than its domain model. Production has concrete attempts, stages, budgets, results, and artifacts. Research now needs higher-order concepts such as capability, opportunity, participation, comparable work, freshness, residual class, evidence strength, population identity, and question lifecycle. Those concepts often first appeared as local analysis logic, then were reconstructed elsewhere.

The strongest recent repairs all follow the same shape: normalize at a producer/persistence boundary, retain historical dual-read compatibility where required, and make consumers read canonical facts rather than rediscover them. Capability-memory manifests, attempt/action identity, and provenance-event identity are examples. The follow-up audit should determine exactly how far that pattern has already spread before any new implementation is proposed.
