<!-- agent-context-budget: warn=12000 max=16000 -->
# Solver research population + family integration plan

> **Status:** implementation plan; not a priority authority.
> **Priority:** `solver-optimization-workstreams.md`.
> **Method:** `solver-research-operating-model.md`, `solver-evaluation-evidence.md`, `solver-research-resource-contract.md`.
> **Goal:** make existing population, family, frontier/state, exact/reference, observation, and evidence resources compose as one progressive workflow without a second evidence warehouse.
> **Progress (2026-09-17):** Phase 0 audit and Phase 1 block/consumption contract are complete. The active D1 production-inert observer now adopts that contract prospectively, and Phase 2 provides read-only composition for explicitly supplied research artifacts through `research:relations`; no persistent block index or warehouse exists. Scientific D1 execution remains governed by its preflight and queue gate.

## 0. Target workflow

```text
ranked question / reopen gate
 -> existing-evidence + opportunity audit
 -> frozen source-specific parent block if new material is earned
 -> cheap broad measurements
 -> selected parent family expansion for causal contrast
 -> selected state/event enrichment only when earned
 -> fixed candidate/procedure
 -> untouched whole-parent/block confirmation
 -> cross-construction transfer only when claim requires it
 -> matched-work economics / queue disposition
```

## 1. Inherited rules

1. **Blocks, not one giant corpus.** Partition prospective material by source/generator and block before decision-bearing outcomes.
2. **Exposure is lineage-specific.** Never reduce evidence state to one global `fresh`/`spent` flag. Record which question/decision consumed which block/parent/family.
3. **Independent unit is explicit.** Usually parent level; parent family for variants; parent level for clustered frontier/event rows. Row count is not support count.
4. **Generation provenance != selection provenance.** Later residual selection, curation, conditioning, or family selection remains visible.
5. **Families are microscopes.** Descendants diagnose causal sensitivity; they do not estimate natural prevalence or create independent parents.
6. **Witness != exact label.** Construction witnesses prove solvability only.
7. **Progressive enrichment.** Exact labels, traces, frontiers, and work ladders attach only to nominated rows/states.
8. **No duplicated authority.** Extend manifests, resource contracts, population plans, family/run records, and research relations before adding storage.
9. **No queue inversion.** Infrastructure supports ranked questions; it never outranks an active frozen gate.
10. **Size from opportunities.** Target informative independent units, not arbitrary total N.

## 2. Reuse before adding

| Need | Existing owner/front door |
|---|---|
| priority/reopen gate | workstreams + research-question relations |
| prior evidence/assets | `research-status-index`, `research-asset-query`, `research:relations` |
| evidence roles/locked blocks | `solver-evaluation-evidence.md` |
| independence/conditioning | research resource contract + audits |
| opportunity sizing | experiment opportunity sizing/audit |
| stress generation | witness-first + topology generators |
| families | `family-generate.mjs`, variant research |
| human/editor contrasts | `human-parent-contrast-pilot.mjs` |
| production states | `solver:sample-production-frontiers` |
| decision observations | `solver-decision-observation-lib.mjs` |
| exact truth | current CP-SAT/reference/prefix-survival tools |
| operational divergence | paired trace / method probe / beam trace |
| dose response | work-ladder analysis |
| cross-experiment nomination | response covariance |
| capability overlap | capability memory |
| run/protocol identity | experiment manifests |
| durable asset discovery | research-data asset registry |

Add a seam only when these cannot carry a required identity/transition.

## 3. Composition model

Minimum lineage:

```text
question
 -> source
 -> frozen block
 -> parent
 -> optional family descendant
 -> optional production state/event
 -> optional observation/exact label/treatment response
 -> evidence role + conditioning/decision lineage
```

Keep observations in their source artifacts; composition needs refs sufficient to answer:

- source/block/parent of an observation;
- independent unit;
- question/decision that selected or consumed it;
- current evidence role;
- available enrichments;
- untouched/usable blocks for a stated question;
- authoritative source artifact/report/manifest.

Minimum shared facts, reusing canonical names where present:

- question ID;
- source regime + revision;
- block/population-plan ID;
- parent source/content identity;
- family parent + variant identity where applicable;
- independent-unit ID;
- development/confirmation/transfer role;
- named conditioning events;
- consuming question/decision lineage;
- producer/run/manifest ref;
- source artifact refs;
- optional child refs for family/state/exact/observation/treatment.

Historical absence remains unknown.

## 4. Phase 0 — gap audit

**Do this before any schema/code design.**

1. Query current assets/relations/tooling.
2. Inspect stress-generation output, family run/sidecar records, experiment manifests, frontier sampler output, decision-observation records, and any open PR changing those contracts (especially an in-flight observation/enrichment implementation).
3. Treat current experiment-manifest research-question fields (`liveAmbiguity`, `discriminatingObservable`, `outcomeInterpretation`, optional `measurementOpportunity`) as existing canonical candidates, not fields to recreate.
4. Build a matrix of the shared facts above.
5. Classify every field: **canonical / stable join / hidden from normal query / prospectively missing / historically irrecoverable**.
6. Test whether current registry + relations can expose the chain without new persistent storage.
7. Write one dated audit with the matrix and minimal-delta recommendation.

**Stop:** if existing manifests + registry + relations already carry the chain, add only query/documentation glue.

**Deliverable:** report only. No new registry/schema.

## 5. Phase 1 — block and consumption contract

Implement only gaps proven by Phase 0.

### Frozen block

A prospectively reusable block must preserve or reference:

- block ID;
- source regime/revision;
- literal parent population/content fingerprints;
- generation seed/config if generated;
- role/partition at creation;
- independent-unit semantics;
- seal/hash where supported;
- creation manifest/source artifact;
- later conditioning/consumption events.

Prefer extending existing population-plan/experiment-manifest structures.

Implementation constraints established by Phase 0:

- reuse the existing population content seal / `population.corpusIdentity` as the integrity primitive;
- keep `blockId` separate from the content seal: block identity is research lineage, the seal is content integrity;
- use a validated stable `questionId` from `solver-research-question-relations.json` while preserving the existing experiment-manifest `researchQuestion` fields;
- use one prospective `independentUnit` spelling in the shared block contract without mass-renaming historical/local producer fields;
- keep later consumption separate from generation provenance;
- do not backfill absent historical exposure, conditioning, question, source-revision, or independence facts.

### Consumption event

Represent evidence use as an append-only fact/reference:

```text
questionId
decision/report ref
unit scope: block | parent | family
role at use
conditioning
opened outcome kinds
run/time ref
```

It is not a contamination flag.

### Eligibility

Provide one shared conservative helper/query answering:

> What facts affect whether block/parent X can serve development, confirmation, or transfer for question Y?

Return reasons. Mechanize facts, not ambiguous scientific judgment. Unknown remains unknown.

**Tests:** identity, consumption lineage, independent-unit preservation, unknown handling.

## 6. Phase 2 — compact query surface

Prefer extending `research:relations` or `research-asset-query`; add a CLI only if ownership is wrong.

Required queries:

1. **Question:** candidate populations/assets, source regimes, independent-unit counts, conditioning, family/state/exact coverage.
2. **Block/parent:** source, consumption lineage, descendants, state samples, exact/reference and treatment/report refs.
3. **Eligibility:** usable/untouched blocks grouped by source/role with reasons.
4. **Enrichment:** parent counts with family/state/exact/trace/work-response material; never count child rows as independent support.
5. **Generation need:** surface suitable existing material before recommending generation.

Compact by default; `--full` for provenance.

## 7. Phase 3 — family-ready producers

Do not generate a new standing corpus yet. Harden front doors first.

### Witness-first / topology generation

Locked/persistent research output should preserve/reference block ID, source revision/config, parent content identity, witness/provenance, manifest, question, and intended evidence role where decision-bearing.

### Family generation

Expansion from a block parent must preserve original block/parent identity, operator, invocation-local requested/attempted/accepted counts, family run identity, question, role, parent exposure state, and parent-family independent unit.

Reuse `family-generate.mjs`; no second mutation engine.

### Human/editor

Historical published parents are not globally untouched. Preserve exposure; use prospectively frozen new editor parents when strong untouched human-source confirmation is required.

**Acceptance:** a generated parent can later be family-expanded without reconstructing provenance manually.

## 8. Phase 4 — progressive enrichment joins

Connect existing outputs by reference.

- **parent -> production state:** frontier sampler retains block/parent/run ancestry.
- **state/event -> exact:** exact output retains source state/run; unsupported/time-limited = unknown.
- **state/event -> observation/trace:** join to frozen decision context without changing production execution. Preserve canonical `workSpent` separately from node-progress telemetry; never infer/fallback one from the other.
- **parent/family -> treatment:** manifests retain block/family selection and actual participation; siblings grouped by parent.
- **response -> ladder/covariance:** derived analyses retain source run/ancestry and mint no new independent units.

**Acceptance example:** one query reconstructs
`block -> parent -> frontier state -> D1 observation -> exact annotation -> report`, while preserving the frozen-capture -> offline-annotation boundary and canonical work accounting.

## 9. Phase 5 — acquisition routing preflight

Given a question ID, compose existing status/assets/opportunity tooling and emit **one primary acquisition route** plus rationale, evidence role, independent unit, opportunity estimate, pilot/expansion/stop rule, and existing eligible assets. Reuse manifest research-question metadata for ambiguity/observable/outcome/MO identity.

| Route | Choose when | Normal instrument |
|---|---|---|
| `REUSE_EXISTING` | suitable independent opportunities already exist | query/join current assets |
| `FRESH_SAME_SOURCE` | sample-independent confirmation or more independent parents is the blocker | frozen witness-first/source-matched block |
| `CROSS_SOURCE_TRANSFER` | claim requires distribution shift or current generator cannot express needed structure | topology composition or other genuinely different source |
| `CONTROLLED_FAMILY` | blocker is causal contrast, invariance, local boundary, matched perturbation, or adversarial falsification | family generator; parent is independent unit |
| `HUMAN_EDITOR` | human-origin transfer, externally designed topology, or omitted mechanics are required | locked human/editor parents + optional controlled descendants |
| `NO_LEVEL_GENERATION` | blocker is telemetry/dose, representation, exact semantics, candidate construction, economics, or an already-closed tested form | observation/trace/exact/work-ladder/implementation work instead |

The preflight may name a later secondary route, e.g. family microscope after broad parents or cross-source transfer after confirmation, but must not collapse distinct evidence roles into one population.

**Hard default:** `REUSE_EXISTING` or `NO_LEVEL_GENERATION` unless the current gate identifies a population/contrast/transfer deficit. Output is a plan/manifest, never automatic generation.

## 10. Phase 6 — two end-to-end pilots

Use live ranked questions when this phase starts. Scientific success is not required; infrastructure lineage/accounting is.

### Pilot A: F3 topology descriptor

Exercises rare-opportunity acquisition + family microscope.

1. Query natural/human/topology assets.
2. Define structural opportunity before outcomes.
3. Estimate yield cheaply if needed.
4. Acquire minimum independent parents.
5. Family-expand only parents where the prespecified controlled topology contrast is useful.
6. Freeze states before exact labels.
7. Exact-label nominated states only.
8. Report parents separately from descendant pairs.
9. If a descriptor emerges, confirm on untouched parents/blocks.

### Pilot B: H3 repair-commitment **or** remaining-length transfer

Choose whichever is live.

- **H3:** matched/stratified descendants control remaining length while perturbing commitment structure.
- **Remaining length:** independent shared-budget parent block first; families only if needed to distinguish length from correlated structure.

Pilot B must exercise broad population evidence before family expansion so the substrate is not F3-shaped.

### Optional C: behavioral quotient

Only if still live: broad independent exact-labelled parents first, then family neighborhoods as adversarial signature falsifiers.

## 11. Phase 7 — consolidate

After two pilots:

1. Audit whether bespoke lineage bookkeeping disappeared.
2. Delete/simplify one-off glue replaced by shared helpers.
3. Update `tooling-catalog.md` / `AGENTS.md` only if a durable front door exists.
4. Update asset registry/audit declarations only for genuinely durable resources/contracts.
5. Add durable method guidance to operating/evaluation docs only where pilots proved reuse.
6. Keep experiment stories in dated reports.
7. Reconcile changed question states normally.
8. Mark/archive this plan so it never competes with durable authorities.

## 12. Non-goals

No database/warehouse, master evidence JSON, standing “Corpus 3,” bulk variants, global contamination flag, blanket exact labeling, witness-as-DEAD truth, auto-priority, historical/family routing, mandatory families, or detours around an earned live gate.

## 13. PR sequence

Keep dependency boundaries small:

1. **P0:** gap audit, no code.
2. **P1:** proven missing block/consumption identity + tests.
3. **P2:** read-only composition/eligibility/enrichment query.
4. **P3:** producer hardening for generation/family records.
5. **P4:** frontier/exact/observation/treatment lineage joins.
6. **P5:** acquisition preflight.
7. **P6a/P6b:** two pilots.
8. **P7:** consolidation/docs/resource cleanup.

Do not stack all phases on one branch.

## 14. Done when

- [ ] Question ID -> existing usable populations is discoverable before generation.
- [ ] Blocks preserve source revision, literal population, independent unit, role, and consumption lineage.
- [ ] Eligibility is decision-lineage-aware, not freshness-boolean-based.
- [ ] Parent -> family -> state/event -> exact/observation/treatment lineage is reconstructable by refs.
- [ ] Source artifacts remain authoritative; no master warehouse exists.
- [ ] Family siblings never inflate independent-parent support.
- [ ] Historical unknowns remain unknown.
- [ ] Opportunity sizing drives acquisition, and every preflight returns an explicit acquisition route.
- [ ] Two materially different ranked-question pilots use the substrate end-to-end.
- [ ] One pilot uses a family microscope; one starts with broad population evidence.
- [ ] Untouched confirmation blocks remain separable from development blocks.
- [ ] Transfer is bought only when the claim requires it.
- [ ] Durable discovery docs/tooling expose the final front door.
- [ ] No production solver behavior changes merely because the substrate exists.

## 15. First agent handoff

Execute **Phase 0 only**.

Read this plan plus:

1. `AGENTS.md`;
2. `solver-research-data-assets.md`;
3. `solver-research-resource-contract.md`;
4. `solver-evaluation-evidence.md`;
5. `variant-level-research.md`;
6. `human-parent-contrast-research.md`;
7. current manifest/population/frontier/observation implementations discovered through tooling census;
8. any open PR touching those contracts before declaring a gap.

Produce the gap matrix + dated report. Do **not** add a registry/schema. Every proposed persistent field must be justified as neither already canonical nor stably derivable.
