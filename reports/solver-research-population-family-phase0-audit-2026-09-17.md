# Solver research population + family integration Phase 0 audit

> Date: 2026-09-17
> Baseline: `main` at `51f86b5e7e77ea3a77df99b5df3462fa11a0a4fa`
> Scope: Phase 0 only of `docs/solver-research-population-family-integration-plan.md`
> Priority authority: `docs/solver-optimization-workstreams.md`
> Method authorities: `docs/solver-research-operating-model.md`, `docs/solver-evaluation-evidence.md`
> Durable-resource authority: `docs/solver-research-resource-contract.md`

## Executive conclusion

The repository already has most of the **scientific semantics** and most of the **producer-local identities** needed for the target lineage:

`question -> source -> frozen block -> parent -> optional family descendant -> optional state/event -> optional exact/observation/treatment enrichment -> evidence role + conditioning/decision lineage`.

The missing piece is not a warehouse, database, master JSON, or replacement registry. The gap is narrower:

1. there is no single durable prospective **frozen-block identity/lineage contract** spanning source revision, literal parent content, intended role, independent unit, and the population seal/manifest that created the block;
2. there is no append-only **consumption fact** linking a block/parent/family to the question/decision/report that opened or conditioned it;
3. current query surfaces are asset/question/report oriented, not instance-lineage oriented, so several facts that already exist in producer artifacts are hard to discover as one chain.

That means **Phase 1 is earned, but only in a narrow form**. Phase 1 should add the smallest block-lineage and consumption seams on top of existing population seals, experiment contracts/manifests, family manifests, research-question IDs, and resource-contract semantics. Phase 0 does **not** justify a new registry, database, generation campaign, family campaign, or generalized router.

## 1. Current relevant repository state

### Authority and discovery surfaces

The repository already routes solver research through the requested authority boundaries:

- `solver-optimization-workstreams.md` owns priority/state/gates.
- `solver-research-operating-model.md` owns research method.
- `solver-evaluation-evidence.md` owns development/confirmation/transfer semantics.
- `solver-research-resource-contract.md` plus `solver-research-resource-contract-audits.json` own durable resource semantics.
- `solver-research-data-assets.json` is the durable asset inventory/evidence-topology registry.
- `solver-research-question-relations.json` gives stable research-question IDs and sparse causal/status relations without becoming a second queue.
- `research-status-index.mjs` combines current question relations with report/workstream/experiment discovery.
- `research-asset-query.mjs` exposes asset grain, join keys, query entry points, independent unit when audited, and resource-level conditioning/dependence/missingness/freshness/information-loss semantics.
- `research-relations.mjs` currently exposes relation sets for questions, assets, measurement opportunities, evidence-integrity records, evidence reports, queue items, experiments, premise snapshots, and premise admissions.

The current relation layer therefore connects **authorities and evidence families**, but it does not yet expose an instance graph for frozen blocks, parent rows, family descendants, frontier states, exact annotations, and treatment observations.

### Open PR check

Before this audit branch was created, the open-PR search found no in-flight solver/research PR changing these contracts. After branch creation, the only matching open PR is this Phase-0 audit PR.

### Producer/record inventory

| Surface | Current useful facts | Current limitation relevant to this plan |
|---|---|---|
| Witness-first stress generation (`scripts/stress/generate.mjs` and random generator family) | solver-blind construction, witness, generator version/seed, per-level provenance, source/corpus identity | standing/generator outputs are not uniformly wrapped in a reusable frozen-block manifest with question ID, role, seal, and later consumption lineage |
| Topology generation (`scripts/stress/generate-topology.mjs`) | distinct source regime, generator version, master/per-level seed, corpus name, per-level provenance, witness, feature envelope | same block-level gap; generated corpus metadata is strong but not a common frozen-block contract |
| Native experiment contract (`write-solver-experiment-contract.mjs`) | workflow/producer/entrypoint, configuration hash, population object, optional population seal adopted as `population.corpusIdentity`, immutable execution refs/paired arms | population identity exists, but the population object is not yet the common owner of block ID + question + evidence role + independent-unit + consumption lineage |
| Experiment manifest (`experiment-manifest-lib.mjs`) | experiment/run IDs, corpus, literal level IDs + selection hash, control/treatment arm, solver flags/workflow inputs, seeds, canonical work budget, budget protocol, output, solver ref; canonical research-question semantics | research question has no stable `questionId`; evidence role/conditioning/independent unit are not first-class manifest fields |
| Canonical research-question metadata | `liveAmbiguity`, `discriminatingObservable`, `outcomeInterpretation`, optional `measurementOpportunity` | correct existing names; should be referenced/extended, not recreated |
| Family generation (`family-generate.mjs`) | `familyId`, `parentLevelId`, `parentCorpus`, `parentContentHash`, witness source, family mode, generator version, generation runs, per-run seed, accepted `variantIds`, per-variant content hash/mutation/provenance | generic family generation does not itself require question ID, evidence role, parent exposure, or originating frozen-block ref |
| Family evaluation run manifest | run ID, solver commit/ref/dirty, tool/workflow, selected corpora/families, dataset identity, solver policy, work/node/wall budgets, seeds, shard, output artifacts, source-generation artifacts | strong evaluation provenance, but no common block/consumption identity |
| Human/editor contrast wrapper (`human-parent-contrast-pilot.mjs`) | question, evidence role, parent exposure, `independentUnit: parent-family`, parent corpus/selector/content hash, family ID, generation run, generated variant IDs, manifest/context refs | question is presently a free string rather than necessarily a registry ID; otherwise this is the closest existing model for the intended lineage |
| Production frontier sampler | question, evidence role, parent-level independence, corpus/level IDs, solver state, freeze boundary, ancestry key, selection seed, per-parent summaries and frozen prefixes | question is free-form; no frozen-block identity; source revision is reconstructed from corpus + solver + ancestry rather than a common block ref |
| Decision observation library | required `decisionId`, `parentId`, `stageId`, candidate/ordering/retention IDs, canonical `workSpentBefore/After`; bounded/truncated semantics | deliberately observation-local; does not own source/block/question/evidence-role lineage |
| D1 production-inert capture | corpus, level IDs, evidence role, parent-level independence, freeze boundary, actual production decision rows, parity checks, canonical work | no question ID/block ID; correct separation between frozen production capture and later exact annotation |
| D1 offline annotation | `sourceCapture` + SHA-256, inherited evidence role/independent unit, annotation boundary, exact labels per frozen decision | strong child->parent artifact link; still not tied to a stable question/block consumption chain |
| Exact/reference resources | asset registry defines level + state/prefix + reference-run grain and explicit prefix/state join keys | exact tools remain selective enrichments; no reason to centralize their payloads |
| Treatment/A-B provenance | manifest arms, immutable/validated workflow dimensions, level-selection hash, canonical work budget/budget protocol, strict arm-comparison checks | treatment provenance is strong; relation to a reusable block and its later consumption is implicit rather than first-class |
| Asset registry + relation/query surfaces | resource grain, join keys, evidence roles, independent units, decision-safety semantics; question/report/queue/experiment relations | resource-level topology is good; instance-level composition is the primary query gap |

## 2. Complete field / gap matrix

Classification vocabulary follows the plan. Where a fact has a canonical semantic owner but is inconsistently emitted by producers, the row names the stronger limiting classification.

| Required fact | Classification | Current owner / evidence | Stable join or gap |
|---|---|---|---|
| **Question ID** | **prospectively missing** at producer lineage boundary | `solver-research-question-relations.json` canonically owns stable question IDs; experiment manifests own question semantics; frontier/human tools accept a question string | question identity exists centrally, but current producer fields do not consistently require/reference the registry ID |
| **Source regime** | **canonical** | corpus/generator provenance; asset registry; evaluation-evidence source semantics; `parentCorpus`; topology `generatorFamily` | corpus path/name + generation provenance + asset/source interpretation |
| **Source revision** | **stably derivable by join**, but weak for reusable blocks | generator version/implementation provenance, structural level fingerprints, solver refs, corpus identity/seals | level content revision is strong via structural fingerprint; source-generator revision can be reconstructed but is not uniformly copied into a block manifest |
| **Block / population identity** | **prospectively missing** as a common lineage fact | native experiment contract can adopt `population.corpusIdentity` from `population-seal.json`; experiment manifests have literal level IDs + selection hash; ad hoc population files have artifact identity | no canonical reusable `blockId`/block manifest binding source, literal parents, intended role, independent unit, seal, and later consumption |
| **Parent source identity** | **canonical** for family data; **stably derivable** elsewhere | `parentCorpus + parentLevelId`; corpus + level ID; asset registry | direct for family manifests; corpus + level identity elsewhere |
| **Parent content identity** | **canonical** for family data; **stably derivable by join** elsewhere | `parentContentHash`; structural level fingerprint owner | family generator already persists it; other parent rows can use canonical structural fingerprint |
| **Family parent identity** | **canonical** | family manifest `familyId`, `parentLevelId`, `parentCorpus`, `parentContentHash` | direct |
| **Family variant identity** | **canonical** | per-variant `variantId`, `familyId`, `variantContentHash`; generation provenance | direct |
| **Independent unit** | **canonical semantics; present but poorly exposed** | resource-contract audits; human contrast and frontier/D1 outputs persist it explicitly; family semantics define parent-family | not every experiment/population manifest emits it, so a researcher may need asset/resource knowledge rather than one lineage query |
| **Evidence role** | **canonical semantics; prospectively missing on some producer records** | `solver-evaluation-evidence.md`; frontier/D1/human contrast persist development/confirmation/transfer-ish role | generic generation, generic family generation, and experiment manifests do not uniformly bind role to the population/block |
| **Named conditioning** | **canonical vocabulary; prospectively missing at instance-use level** | resource contract owns named conditioning semantics; audited resources expose resource-level conditioning | no append-only per-block/parent/family consumption event recording the actual conditioning that occurred for a question/decision |
| **Consuming question / decision lineage** | **prospectively missing** | question registry links questions/reports/implications; reports/manifests identify experiments/runs | no common fact saying “this question/decision/report consumed this block/parent/family under this role/conditioning” |
| **Producer / run / manifest ref** | **canonical / stably derivable** | experiment IDs/run IDs; family generation manifests; family evaluation run manifests; solver refs | direct or artifact-local |
| **Source artifact refs** | **canonical / stably derivable** | experiment `output`; family `outputArtifacts` and `sourceGenerationArtifacts`; human context refs; D1 `sourceCapture`; asset registry locations | present in producer-local records, though not one query |
| **Child refs: family** | **canonical** | family manifest `variants`, generation-run `variantIds` | direct |
| **Child refs: state/frontier** | **canonical locally; present but poorly exposed globally** | frontier population rows and cases; ancestry keys | direct inside artifact, absent from research relation query |
| **Child refs: observation** | **canonical locally; present but poorly exposed globally** | decision IDs + parent IDs; D1 capture rows | direct inside artifact |
| **Child refs: exact/reference** | **stably derivable by join** | level/state/prefix identities; D1 annotation source-capture hash; exact asset join keys | no generic reverse index, which is acceptable if relations can expose refs later |
| **Child refs: treatment/A-B** | **stably derivable by join** | experiment/run/arm/output + level-selection hash; family evaluation artifacts | treatment outputs can be joined through manifests; block consumption is the missing seam |
| **Canonical work accounting** | **canonical** | solver research invariant `workSpent`; decision observation requires `workSpentBefore/After`; experiment budget protocols distinguish canonical work envelope | preserve separately from nodes/wall/depth; no new combined progress metric is warranted |

### Historical classification

Several desired fields are **historically irrecoverable** when an old producer never wrote them:

- a historical block's intended role before outcomes were opened;
- whether an old parent/block was untouched for a specific later question when no exposure/consumption record exists;
- exact named conditioning that selected a historical row when only the final cohort survives;
- a stable question ID for old runs that recorded only prose or nothing;
- exact generator/config/revision identity where legacy output lacks it;
- independent-unit provenance when old rows were flattened and parent/family membership was not preserved;
- denominator/failed attempts for success-selected historical evidence where the producing run did not preserve the attempted population.

These must remain `unknown`. Phase 1 must be prospective and must not infer historical cleanliness from absence of a record.

## 3. Current owner for each supported field

There is no need to move ownership.

| Fact class | Correct current owner |
|---|---|
| research priority/state/reopen gate | `solver-optimization-workstreams.md` |
| research question identity/relations | `solver-research-question-relations.json` |
| ambiguity/observable/outcome/MO execution metadata | experiment manifest `researchQuestion` |
| development/confirmation/transfer meaning | `solver-evaluation-evidence.md` |
| conditioning/dependence/missingness/freshness semantics | resource contract + audit declarations |
| durable asset topology and join keys | `solver-research-data-assets.json` |
| structural parent content identity | `modules/domain/level-fingerprint.ts` |
| generation source/version/seed/witness | each generator's provenance + generation manifest |
| family parent/variant identity | family manifest / family generator |
| family evaluation execution provenance | family evaluation run manifest |
| production state ancestry | frontier sampler artifact |
| decision observation shape + canonical work | decision-observation library |
| D1 capture/annotation boundary | D1 capture + annotation artifacts |
| exact/reference truth | existing exact/reference producers |
| treatment comparability | experiment manifest + arm comparator/native experiment contract |

## 4. Stable joins already available

The repository already supports these joins without new storage:

1. **Question -> current status/evidence:** stable question ID through the question registry and research-status/relation layers.
2. **Asset -> scientific semantics:** asset ID -> audit declaration gives independent unit, conditioning, dependence, missingness, freshness and known information loss.
3. **Parent -> structural revision:** corpus/level -> canonical structural fingerprint.
4. **Family -> parent:** `familyId + parentCorpus + parentLevelId + parentContentHash`.
5. **Variant -> family/parent/content:** `variantId + familyId + variantContentHash`.
6. **Family evaluation -> generation:** family run `sourceGenerationArtifacts` + selected family IDs.
7. **Experiment -> literal population:** `corpus + levelIds + levelSelectionHash`; native contract can additionally bind a population seal identity.
8. **Experiment -> treatment result:** `experimentId/runId/arm/output` plus strict non-treatment-dimension comparison.
9. **Frontier state -> parent:** `parentId/levelId + ancestryKey + frontierIndex`.
10. **D1 observation -> parent/decision:** `parentId + decisionId`.
11. **D1 exact annotation -> frozen capture:** `sourceCapture + sourceCaptureSha256`; exact work occurs after the capture/freeze boundary.
12. **Exact/reference -> state/prefix:** level + explicit prefix/state encoding + model/support version, per the asset registry.
13. **Manifest -> result:** current `manifests-to-results` research-data relation by run/experiment/output + solver ref + selection hash.

The important missing join is not a scientific payload join. It is the **prospective evidence-use join**:

`questionId + decision/report ref -> block/parent/family scope + role + named conditioning + run/time`.

## 5. Hidden information needing only query exposure

The following information already exists often enough that the first fix should be exposure, not duplication:

- resource-level independent-unit and decision-safety semantics from audit declarations;
- family parent/content/variant lineage from family manifests;
- generation-run variant IDs and source-generation artifact refs;
- experiment literal level selections and selection hashes;
- population-seal identity adopted by native experiment contracts;
- frontier parent/ancestry/freeze metadata;
- D1 capture/annotation source linkage;
- exact/reference join keys;
- treatment/run/output provenance;
- resource/report/question relations already indexed by current research tooling.

A future compact query can compose these by reference. It should not copy exact labels, frontier rows, treatment outcomes, or family payloads into a new master record.

## 6. Prospectively missing fields and correct producer owner

Phase 0 finds only a small set of facts that genuinely need new prospective writes.

| Missing prospective fact | Smallest correct owner |
|---|---|
| stable `questionId` on decision-bearing population/experiment lineage | population/experiment preflight, validating against the existing question registry; keep existing `researchQuestion` semantics intact |
| reusable `blockId` tied to literal population seal/content | existing population-plan/native experiment-contract seam, not a new registry |
| source regime + source revision on the frozen block | block/population manifest, referencing generator/corpus provenance rather than copying every producer field |
| independent unit on the frozen block | block/population manifest, using resource-contract vocabulary |
| intended evidence role at block creation | block/population manifest/preflight |
| append-only consumption event | block/population lineage artifact or adjacent manifest owned by the block; references question ID + decision/report/run |
| named conditioning at consumption | same consumption event, using resource-contract conditioning vocabulary |
| original block ref on generic family expansion | family generation manifest when the parent came from a frozen block |
| question ID/evidence role/parent exposure for generic family expansion | family-generation invocation/manifest; human wrapper already demonstrates the shape |
| block ref on frontier/state capture when sourced from a frozen block | frontier population artifact |
| question/block ref on D1 capture | capture artifact, inherited by annotation through existing source-capture linkage |

No prospective field requires a global database.

## 7. Historically irrecoverable gaps

Historical evidence must not be normalized by wishful reconstruction.

Keep `unknown` when the source did not record:

- pre-outcome block partition/role;
- question-specific exposure state;
- conditioning event;
- stable question ID;
- parent-family independence after flattening;
- source revision/configuration;
- denominator/attempted population;
- producer/run identity;
- exact parent content revision;
- whether prior inspection influenced a later candidate.

Existing resource-contract `knownInformationLoss` declarations are the right place to document asset-class historical limits. Do not backfill guessed values into old manifests.

## 8. Semantic conflicts

No authority conflict was found. There are, however, four naming/shape tensions that Phase 1 should resolve conservatively.

1. **`question` string vs stable `questionId`.** Frontier and human contrast tooling use a free-form question string while the question registry already owns stable IDs. Add an ID reference; do not delete useful human-readable question text where it exists.
2. **`independentUnit` vs `independenceUnit`.** Existing artifacts use both spellings. The resource contract owns the concept; Phase 1 should choose one canonical field for new shared lineage and treat the other as a legacy/local producer shape rather than mass-renaming unrelated artifacts.
3. **Corpus/population identity vs block identity.** `levelSelectionHash` and population `corpusIdentity` are integrity identities, not automatically a research block ID. A block ID should reference/seal the exact content, not replace the seal/hash.
4. **Generation provenance vs selection/consumption provenance.** Current generation records are strong. Do not overload them with later use. Later conditioning and decision consumption must remain separate append-only facts.

The requested experiment-manifest fields are already canonical candidates:

- `liveAmbiguity`
- `discriminatingObservable`
- `outcomeInterpretation`
- optional `measurementOpportunity`

No alternate names are justified.

Canonical `workSpent` is also already semantically protected. Node count, depth, frontier progress, wall time, and other telemetry must remain separate diagnostics.

## 9. Acquisition-routing readiness

### `REUSE_EXISTING`

**Mostly supported now.** Asset query, research status, question relations and high-value joins can locate existing evidence. What is missing is a question-centric instance query that can say which specific blocks/parents remain usable for that question and why.

### `FRESH_SAME_SOURCE`

**Producer capability exists; lineage contract is incomplete.** Witness-first generation can create sample-independent same-source material, and experiment/population sealing can freeze exact content. Phase 1 needs a reusable block identity, role, question ID and later consumption record.

### `CROSS_SOURCE_TRANSFER`

**Producer capability exists.** Topology composition is a materially different procedural source within its documented support envelope; human/editor material can be another source. The same block/consumption seam is missing.

### `CONTROLLED_FAMILY`

**Strongly supported.** Family manifests already preserve parent/content/variant/generation lineage. The human wrapper already adds question, evidence role, exposure and independent-unit semantics. Generic family expansion needs an optional originating block ref and the same research-context fields when used decision-bearing.

### `HUMAN_EDITOR`

**Strongly supported.** The dedicated wrapper is already close to the target contract and correctly treats parent family as the independent unit. The main improvement is stable question-ID linkage and optional frozen-block ancestry for prospectively locked editor parents.

### `NO_LEVEL_GENERATION`

**Scientifically supported now.** Current authorities already distinguish blockers that should be addressed through telemetry, exact/reference work, candidate construction, representation, dose/work, or economics rather than new levels. No router is needed in Phase 0.

### Router conclusion

Do **not** implement the acquisition router yet. Phase 0 proves more than trivial documentation glue remains: block identity and consumption facts are missing. The router should wait until those facts exist and can be queried conservatively.

## 10. Minimal implementation delta

The smallest coherent implementation is:

1. **Extend an existing population/block manifest seam**, preferably the native population-plan/experiment-contract path that already supports a population seal, with:
   - `blockId`;
   - `questionId`;
   - source regime + source revision reference;
   - literal parent IDs/content identities or a sealed artifact ref that deterministically yields them;
   - evidence role at creation;
   - canonical independent unit;
   - creation producer/run/manifest refs.

2. **Add append-only consumption records by reference**, not a global freshness flag:
   - `questionId`;
   - decision/report ref;
   - scope (`block | parent | family`) + scoped identity;
   - role at use;
   - named conditioning;
   - opened outcome kinds;
   - run/time ref.

3. **Thread existing lineage refs only where earned**:
   - generic family generation optionally records originating `blockId` and research context;
   - frontier/D1 captures optionally record originating `blockId` + `questionId`;
   - annotations continue to inherit through their source-capture reference.

4. **Then expose the chain through existing research relations/query tooling.**
   Do not copy child payloads into the relation layer. Return refs and independent-unit summaries.

This is substantially smaller than a new evidence model.

## 11. Is Phase 1 needed?

**Yes, narrowly.**

Phase 1 is earned because two facts needed for the target workflow are not currently recoverable by a stable join:

- a common prospective frozen-block identity/contract; and
- question/decision-specific consumption lineage.

Everything else should be built by reference on existing owners.

### Smallest exact Phase-1 changes

Phase 1 should be limited to the following acceptance target:

> A newly frozen decision-bearing block can be identified from a stable question ID, source revision and sealed literal parent population; a later decision can append a consumption fact for the block/parent/family without mutating it into a global spent flag; generic family/state producers can retain the originating block ref; unknown historical exposure stays unknown.

Implementation guidance:

- reuse the current population seal / native experiment-contract machinery for content identity;
- reuse `solver-research-question-relations.json` IDs;
- reuse evaluation-evidence role names;
- reuse resource-contract conditioning vocabulary;
- reuse canonical structural fingerprints for parent content identity;
- reuse family manifests and source-generation artifact refs;
- add validation for identity, append-only consumption lineage, independent-unit preservation, and unknown handling;
- do not add a database, warehouse, new asset registry, or master observation JSON.

A shared eligibility helper belongs in Phase 1 only after the block/consumption facts exist; it should return conservative reasons and `unknown`, not pretend to automate scientific judgment.

## 12. Recommended amendments to the integration plan

The plan is directionally correct. Recommended edits before Phase 1 implementation:

1. **Name the population seal as an explicit reuse point.** Phase 1 should say that existing `population-seal.json -> population.corpusIdentity` adoption is the preferred integrity primitive for frozen block content.
2. **Separate block ID from content seal.** State that `blockId` is a research-lineage identity and the seal/hash is content integrity; neither substitutes for the other.
3. **Require stable `questionId` references.** Preserve current `researchQuestion` fields for ambiguity/observable/outcome/MO semantics and add an ID rather than replacing them.
4. **Call out the current `question` free-string producers.** Human contrast/frontier producers should converge on an optional validated question ID while retaining human-readable text if useful.
5. **Resolve `independentUnit` / `independenceUnit` prospectively.** Pick one shared lineage spelling; do not trigger a repo-wide historical rename.
6. **Make consumption explicitly separate from generation provenance.** The plan implies this already; state it as an acceptance rule so implementations do not append later evidence use into generator provenance.
7. **Delay acquisition-router implementation until Phase 1 + query exposure are complete.** Phase 0 finds nontrivial missing lineage facts, so the plan's “trivial glue” exception is not met.
8. **Add a no-backfill rule to Phase 1.** Historical absent question/conditioning/exposure fields remain unknown and must not be inferred from current report narratives except as an explicitly cited forensic interpretation outside the canonical record.

## Scientific constraints confirmed

The existing repository semantics already support and this audit preserves:

- blocks rather than one giant fresh corpus;
- no global fresh/spent boolean;
- family descendants are not independent parents;
- generation provenance is distinct from later selection provenance;
- construction witness proves solvability only;
- exact/reference enrichment stays selective;
- sample independence is distinct from distributional independence;
- existing assets are queried before generation;
- generation is not a remedy for telemetry, dose, representation, exact semantics, candidate construction, economics, or a closed tested form;
- canonical `workSpent` stays separate from node-progress and wall-time telemetry.

## Intentionally deferred

Phase 0 intentionally does **not**:

- create a schema/registry/database/warehouse/master JSON;
- create a new population or family campaign;
- generate any levels;
- modify the solver queue or priority authority;
- implement the acquisition router;
- build the Phase-2 compact query surface;
- centralize exact/reference or observation payloads;
- backfill historical unknowns;
- broaden topology-generator support;
- change treatment semantics;
- rename existing experiment research-question fields;
- conflate canonical `workSpent` with nodes or other progress telemetry.

## Validation note

This change is documentation-only. The audit was checked against the current authority files and the current producer/query implementations named above. Repository execution was not available through the GitHub connector used for this audit, so no claim is made that local `npm run check:documentation-links` / CI commands were executed in this session; the PR is intentionally left for normal CI after push, per the instruction not to babysit CI.
