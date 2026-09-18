<!-- agent-context-budget: warn=12000 max=16000 -->
# Solver research population + family integration plan

> **Status:** implementation plan; not a priority authority.
> **Priority:** `solver-optimization-workstreams.md`.
> **Method:** `solver-research-operating-model.md`, `solver-evaluation-evidence.md`, `solver-research-resource-contract.md`.
> **Goal:** make existing population, family, frontier/state, exact/reference, observation, and evidence resources compose as one progressive workflow without a second evidence warehouse.
> **Progress (2026-09-17):** Phases 0-5 are complete. Frozen-block/consumption lineage, explicit-artifact relations, producer/family lineage, reference-only enrichment joins, and conservative acquisition routing are implemented without a warehouse or persistent block index. Phase 6 remains intentionally deferred to live ranked questions; scientific D1 execution remains governed by its preflight and queue gate. See `../reports/solver-research-population-family-phases3-5-2026-09-17.md`.

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

## 4-9. Phases 0-5 — complete

Phases 0-5 are implemented. Historical implementation detail belongs in the dated reports rather than this live handoff plan:

- Phase 0 gap audit: `../reports/solver-research-population-family-phase0-audit-2026-09-17.md`.
- Phases 1-2 block/consumption contract + explicit-artifact relations + D1 adoption: `../reports/solver-research-population-family-phase1-implementation-2026-09-17.md` and `../reports/solver-research-population-family-phase2-d1-adoption-2026-09-17.md`.
- Phases 3-5 producer lineage + progressive enrichment joins + acquisition routing: `../reports/solver-research-population-family-phases3-5-2026-09-17.md`.

Durable completed contracts:

1. A prospective frozen block has a stable `blockId`, stable question ID, source regime/revision, sealed literal parent/content population, evidence role, independent unit, creation refs, and append-only consumption events. Content seal and research-lineage identity remain distinct.
2. `research:relations` composes explicitly supplied block/enrichment artifacts read-only. Historical absence remains unknown; child rows never mint independent support.
3. Witness-first/random and topology generation can emit frozen research blocks. Decision-bearing family expansion records per-run question/role/exposure, invocation-local generation counters, and validated originating-block ancestry.
4. Production-frontier capture can inherit a frozen block. Existing observation/exact/treatment outputs can join by reference through `research:link-enrichment`; source artifacts remain authoritative.
5. `research:acquisition-preflight` emits one conservative primary route: `REUSE_EXISTING`, `FRESH_SAME_SOURCE`, `CROSS_SOURCE_TRANSFER`, `CONTROLLED_FAMILY`, `HUMAN_EDITOR`, or `NO_LEVEL_GENERATION`. It can surface candidate assets and existing opportunity sizing, but never generates automatically.
6. Current front doors are exposed through `AGENTS.md` and `tooling-catalog.md`. Do not rebuild a registry, warehouse, global freshness flag, second mutation engine, or alternate lineage schema.

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

## 15. Next agent handoff

Do not restart Phases 0-5. Return to the canonical solver queue. Begin Phase 6 only when a live ranked question actually requires one of its end-to-end pilots. Read the relevant completed-phase report only when changing that substrate.
