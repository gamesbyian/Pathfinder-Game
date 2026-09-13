# Variant-library resource integration audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — crosswalk of current workstreams, deferred/reopen questions, research-asset registry, family index/tooling, and the completed variant-library evidence audit
> **Decision:** keep the variant-family library as a first-class offline research asset, route it deliberately into the solver lanes where controlled relatives can answer a current question cheaply, and avoid blanket family mining where it would add correlated/confounded evidence rather than information.
> **Remaining gate:** no broad variant generation is authorized. The remaining implementation opportunities are narrow: improve discoverability/routing, preserve per-generation-run selection counters in future manifests, and use bounded family queries/rechecks only when a named workstream gate benefits.

## Question

This pass asks the broader integration questions behind the variant-library audit:

1. Can any solver-development workstream that would benefit from the library use it fully and easily without semantic confusion?
2. Are current and pending solver-development lanes actually using the library when it can cheaply improve the decision?
3. Are the library, its tooling, and its presentation consistent with the repository's newer research-resource conventions?

The target remains cold stress-corpus solves. A family query is valuable when it can replace fresh compute, falsify a premise cheaply, isolate a mechanism, or improve selection of a later experiment. It is not valuable merely because the library is large.

## Bottom line

The library is now scientifically interpretable and operationally usable, but it was not yet fully integrated as a routine research resource.

The previous evidence audit closed most correctness/interpretation hazards: record identity versus content identity, mixed-era observations, correlated siblings, historical/current capability, derivative replay evidence, transformation confounding, and missing counterfactual detail. This second pass finds the remaining gap is mostly **routing** rather than raw data access.

The repo already has strong generic guidance to query existing assets before new compute, and `variant-level-research.md` is a good specialist authority. What was missing was a lane-by-lane answer to **when family evidence is worth consulting and what question it should answer**. Without that, agents can reasonably skip a useful 96k-variant resource because the active workstream does not mention it, or conversely mine it indiscriminately because the asset catalogue says variants are generally useful.

The correct policy is neither "always query families" nor "families are a special side project":

- use them routinely when the scientific question is about **response to controlled structural change**;
- use them secondarily when a mechanism already exists and close relatives can test recurrence/robustness;
- do not detour through them when the live gate is fundamentally about allocation mechanics, current production participation, runtime cost, or exact state feasibility and family evidence cannot change the decision.

## Usability audit

### What is already good

A current agent can mount the historical research branch read-only, run current `main` tooling against it with `--variant-family-dataset-root`, build the disposable family index, filter by corpus/parent/mode/relation/operator/evaluation/solve status, inspect coverage, and use shared mixed-era reconciliation rather than hand-joining old files.

The specialist authority already explains:

- the large off-main dataset and why new bulk generation has a presumption against it;
- whole-parent independence and pseudo-replication;
- historical-current recheck rules;
- discovery/confirmation/transfer roles;
- symmetry/randomness interpretation;
- generation gates and run provenance;
- legal research uses versus forbidden runtime lookup.

The evidence audit added a whole-library integrity/provenance pass covering content-identity collisions, no-op variants, cross-mode ID reuse, missing content hashes, generation-selection metadata, evaluation provenance, mixed-era conflicts, and evidence-observation versus index-attachment counts.

### Remaining friction

The resource still has four practical rough edges.

**1. It is off-main.** That is appropriate for 2.5 GB of historical data, but it means the library is not self-evident from a normal checkout. A workstream must know to fetch/mount `claude/variant-levels-solver-insights-tpk4qg` before the ordinary family commands become useful.

**2. The front door is split.** `research-asset-query`, `tooling-census`, `variant-level-research.md`, `family-index`, and the evidence-audit script each expose a different part of the story. This is manageable, but the workstream text rarely names the family library when it is a useful cheap preflight.

**3. The index is intentionally generic rather than question-aware.** It filters family/evaluation records well, but it does not directly express current residual-class membership, capability-memory source membership, lifecycle phenotype, exact-label class, or other workstream cohorts. Those joins should continue to use owning assets rather than being baked into a second analytical warehouse, but agents need to know that family data is a candidate join rather than a standalone answer.

**4. Historical generation-selection counters are incomplete for appended families.** Modern manifests record useful top-level requested/accepted/attempt/budget values and per-variant attempts, but after multiple append runs the cumulative `acceptedCount` no longer aligns with invocation-local requested/attempt/budget fields. `generationRuns` lacks those per-run counters, so historical acceptance/selectivity rates are ambiguous for appended families. Future generation should preserve per-run requested/accepted/attempt/budget counts; old data must remain unknown rather than reconstructed from incompatible totals.

These are discoverability/metadata issues, not reasons to duplicate the dataset onto `main` or create a general-purpose research database.

## Workstream crosswalk

### Active / current lanes

| Lane | Family-library disposition | Why / useful question |
|---|---|---|
| **WS2 class-4 portal coarse-state allocation form** | **No current detour** | The live question is how to expose a freshly reconfirmed capability without regressions. Family transforms do not decide the additive-tier allocation contract; current production-shaped replay and work/collateral accounting do. |
| **WS2 seven-level must-turn-biased repair seam** | **Useful cheap secondary preflight** | Before broadening beyond the frozen seven, query existing local-mutant/group-reshuffle/sibling evidence around those parents or structurally related must-turn families. The useful question is whether small controlled landmark/obligation changes flip must-turn-biased versus plain-repair value. If existing families lack the needed counterfactual, keep the planned tiny current-code probe rather than generating bulk data. |
| **WS2 compact dead-cause recurrence** | **Not primary; use only after a cause is nominated** | The first gate is recurrence of a sound reason in real failed-search states. Exact/replay/trace evidence is primary. Once one cause recurs, related families can test whether the cause tracks a controlled structural change across close puzzles, but family outcome alone cannot establish a sound dead reason. |
| **WS1 automatic action selection** | **Routine resource** | Controlled siblings are one of the strongest ways to distinguish a legal structural response signal from unrelated-level correlation. The recent structural-response extension correctly used family flips, but future selector premises should query existing families before generating new variants or fitting broad static-feature rules. |

### Supporting / reopen lanes

| Lane | Family-library disposition | Reopen use |
|---|---|---|
| **WS6 repair reachability** | **Routine when reopened** | Use close relatives to ask which object/obligation/placement change shifts badness, retreat depth, restart value, or operator success while ancestry is held fixed. This is particularly useful before inventing new restart or repair heuristics from unrelated-level correlations. |
| **WS7 architectural speed** | **Usually no** | Family data is not a runtime profiler. Use it only if a proposed optimization appears input-shape-sensitive and controlled relatives can reproduce the cost cliff; otherwise production benchmarks/profiles own the question. |
| **WS3 generalization** | **Methodological resource** | Whole-parent family splits are a useful intermediate generalization test and an excellent detector of family memorization. They are not cross-generator transfer by themselves. |
| **WS0 restart/randomization** | **Reopen-only secondary resource** | If new evidence nominates commitment diversity, siblings can test whether the restart/randomization benefit tracks a controlled structural boundary. Do not reopen global seed/restart forms merely because some variants solve. |
| **WS4 beam retention** | **High-value reopen resource** | Controlled relatives can localize where a small structural change turns retained LIVE support into extinction, especially when paired with prefix survival, traces and exact labels. Existing generic width/bucket/scorer forms stay closed. |
| **WS5 exact/reference** | **Target selector, not evidence substitute** | Families can nominate boundary pairs or reduced relatives worth exact labelling. Exact/reference models still decide feasibility; solved/unsolved siblings do not. |

### Deferred/future questions

| Deferred question | Family use |
|---|---|
| **Richer static graph/placement selectors** | **Strong cheap causal screen.** Before another descriptor bundle, ask whether a candidate descriptor changes with controlled family edits and whether technique/action value changes with it across whole parents. This can reject ancestry-correlated features before holdout compute. |
| **Stability-aware portfolios** | **Secondary.** Use family response stability only after WS1 has a legal signal; do not treat sibling agreement as independent portfolio evidence. |
| **Latent response dimensions / biclusters** | **Potentially high value, with care.** Family response vectors can reveal whether a latent dimension survives small controlled edits, but the historical census often stores only whole-ladder winners. Use bounded isolated-technique rechecks on information-rich parents rather than pretending the old trove contains per-technique counterfactuals. |
| **Repair restart allocation near miss** | **Useful confirmation screen.** If the fresh near-miss signal returns, existing relatives can test whether the benefit is stable to controlled local edits before a larger restart allocation experiment. |
| **Beam continuation / cross-policy handoff** | **Mechanism-dependent only.** If a distinct complementary policy is nominated, families can test whether the handoff advantage follows a controlled structural boundary. They cannot create the missing complementary policy. |
| **Temporal anchor diversity** | **Low direct value.** This is primarily a historical-regime/protocol question. Family evidence can contextualize whether an old basin is family-concentrated but should not drive the temporal decision. |
| **Counterfactual displaced-capability recurrence** | **Strong fit.** This question explicitly asks whether the same phenotype recurs under unrelated accepted changes. Existing controlled families should be queried before creating new counterfactuals. |
| **Generator/editor-envelope niches** | **Strong fit.** Family/generation provenance can distinguish a real envelope-specific mechanism from ancestry/generator concentration, provided the eligible-parent denominator is explicit. |
| **Typed producer -> consumer search artifacts** | **Usually no.** The gate is timely information transfer and consumer value, not puzzle mutation. Use families only if the candidate artifact's value is suspected to be structurally localized. |
| **Queryable analytical layer** | **Family library is a test case, not justification.** Extend shared joins only if repeated cross-asset family analyses remain bespoke; do not build a warehouse merely because the trove is large. |
| **Class-1 compact beam-menu exposure** | **No current detour.** The closed issue is allocation headroom, not absence of structural examples. |

## Missed-use findings

The current program is not broadly neglecting the library. Recent work already used family evidence in some of the right places, including structural-response flips and the class-5 family/reference comparison. The gap is subtler:

1. **WS1 has the right conceptual relationship but no durable "query families before new structural selector mining" rule.** This is the clearest routine use to preserve.
2. **The active must-turn-biased repair seam has an inexpensive family question available before any expansion:** do existing controlled landmark/obligation relatives around the nominated parents show repair-response flips? This cannot replace the frozen current-code pilot, but it can sharpen whether the signal looks structural or parent-specific without new generation.
3. **Several deferred questions are naturally family-shaped but do not say so:** richer static selectors, latent response dimensions, displaced-capability recurrence, generator/editor-envelope niches, repair-restart recurrence, and beam-retention/handoff reopens.
4. **Class-5 dead-cause work should not be diverted into more family rescue mining.** The prior confound result is already a negative control. The useful family role begins only after a sound recurring cause exists.
5. **Class-4 additive allocation should not be slowed by a family pass.** Fresh capability is already established; the remaining problem is safe scheduling/allocation.

This is the main answer to question 2: the right improvement is **selective routing**, not mandatory family use in every workstream.

## Consistency with repository research conventions

### Strong alignment

The family system now matches the repo's modern research principles in the important places:

- current code operates on a mounted historical data root;
- large historical outcomes are nomination evidence rather than silently current;
- decision-bearing solver runs have run-manifest provenance;
- whole-parent grouping handles sibling dependence;
- evidence roles distinguish discovery, confirmation and transfer;
- current-code rechecks are required at decision-bearing cliffs;
- family identity/outcomes are explicitly forbidden runtime routing inputs;
- the shared index preserves conflicting mixed-era observations instead of filename-precedence flattening;
- exact content hashes provide structural identity distinct from persistent record identity;
- the evidence audit fails closed on missing context and separates observations from repeated attachments.

### Inconsistencies / cleanup targets

**Asset-registry identity wording.** The current `variant-family-data` registry entry lists `parentCorpus`, `parentId`, `mode`, and `variantId` together under `joinKeys`. After the identity audit this is too easy to read as one canonical puzzle identity. The durable distinction is:

- generated variant identity: `(parentCorpus,parentId,variantId)`;
- aggregate observation reconciliation key: `(corpus,parentId,mode,variantId)` plus normalized evidence payload;
- exact puzzle-content identity: structural fingerprint/content hash;
- evaluation identity: run/solver/config/budget/seed context.

The registry should express those as distinct join semantics rather than one flat list.

**Audit discoverability.** The family evidence audit is a useful front-door integrity check for the mounted trove but is not yet represented in the family asset's query entry points/tool-family description. It should be discoverable alongside `family:index/query/coverage`, especially before a new analysis relies on historical content/evaluation counts.

**Generation-run schema.** Future appended-family manifests should retain invocation-local requested count, accepted count, generation attempts and attempt budget inside each `generationRuns[]` entry. The current top-level mixture is clear for a single run but ambiguous after appends.

**No second warehouse.** The family index should remain the family-specific normalization/query front door. Current residual classes, capability memory, lifecycle, exact labels and profiles should continue to be joined from their owning assets. If the same cross-asset join recurs repeatedly, extend a shared helper/recipe rather than turning `.cache/family-index.json` into a competing research database.

## Recommended durable routing rule

Before fresh compute or new family generation, a solver-research lane should ask one explicit question:

> Would an existing controlled parent/variant contrast materially falsify, localize, stratify, or confirm the mechanism I am about to test?

If **yes**, query the existing family library first and state the independent parent unit, transformation semantics, solver-era/provenance limits and expected decision change.

If **no**, do not mine variants merely to satisfy a checklist. Record the reason only when it prevents a likely future rediscovery.

This rule complements the repository-wide evidence preflight rather than replacing it.

## Priority opportunities exposed by this pass

Ranked by expected contribution to solves versus cost:

1. **Active must-turn seam family preflight:** query existing relatives for controlled must-turn/landmark/obligation edits and repair-response flips around the seven nominated class-2 parents. No new generation; no delay to the tiny live probe if the trove lacks the counterfactual.
2. **WS1 structural-selector preflight:** for the next legal selector premise, use existing family contrasts to reject ancestry-correlated descriptors before broader feature or holdout work.
3. **Displaced-capability / latent-response family mining:** when those deferred questions reopen, use existing whole-parent response patterns first, followed only by bounded isolated-technique rechecks where historical whole-ladder data lacks the needed cells.
4. **Beam-retention reopen pairs:** if a new retention premise appears, search the trove for close solved/unsolved relatives before generating new levels, then pair them with prefix/trace/exact evidence.
5. **Generation-selection schema repair for future pilots:** preserve per-run selection counters so generator selectivity can be measured rather than guessed.

Do **not** spend solver-development time on a generic full-trove mining campaign, a second query warehouse, or another broad variant-generation program.

## Answers to the three audit questions

### 1. Can useful workstreams use the library fully and easily?

**Substantially yes, with modest routing/discoverability friction.** The data and tools are capable enough for current purposes and the major semantic traps are now documented/audited. The off-main mount and split front door are intentional/acceptable; the remaining improvements are making the integrity audit and workstream-specific uses easier to discover, plus preserving better per-run generation counters going forward.

### 2. Are all relevant current/pending lanes using it where helpful?

**Not completely before this pass.** Recent lanes used it correctly in several places, but the program lacked an explicit crosswalk. The highest-value underused relationships are WS1 structural selection, the active must-turn repair seam as a cheap secondary preflight, and several reopen questions involving controlled structural recurrence. Other live lanes should intentionally *not* use the library right now.

### 3. Is the library/tooling clear, correct and consistent with other repo resources?

**Mostly yes after the evidence audit, with three concrete consistency fixes identified:** clarify the asset-registry identity keys, surface the evidence-audit entry point, and fix future appended-generation manifests so per-run selection counters remain interpretable. No major reformat, data migration, or new analytical architecture is justified.

## Closeout

The broad audit is complete when the library is treated neither as a forgotten attic nor as a magical 96k-row answer machine. It is a controlled-intervention resource with a clear evidence contract and a specific place in the solver-development funnel.

The remaining work belongs to individual solver gates: query it when a controlled relative can change the decision, skip it when it cannot, and generate new variants only when the existing trove demonstrably lacks the required intervention.