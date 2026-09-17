# Solver premise-space completeness matrix

> **Status:** descriptive completeness instrument; not a production queue.
> **Companions:** `solver-premise-space-atlas.md`, `solver-premise-space-register.csv`, `solver-premise-space-extension-2026-09-17.csv`, `solver-premise-space-relations-v2.json`.
> **Purpose:** force premise discovery through orthogonal search axes so repository vocabulary cannot silently define the apparent idea-space.

## Why the first three-way split was insufficient

`mechanism / architecture / epistemic` remains useful as a label, but it is not an exhaustive search procedure. A mechanism premise can also be a correctness, causality, prevalence, economics, or generalization question. An architecture premise can fail because its treatment never participated. An epistemic premise can apply at a node, stage, population, or architecture epoch.

The durable completeness search therefore uses five independent axes:

1. **system locus** — where the proposition acts;
2. **claim type** — what must be true about that locus;
3. **scope/lifetime** — state, branch, frontier, attempt, stage, invocation, level, population, distribution, architecture epoch, or research lineage;
4. **evidence state** — unasked, implicit, supported, tested-form closed, semantics closed, blocked, population-limited, participation-invalid, economics-closed, stale/epoch-sensitive;
5. **relation type** — semantic parent, tested form, support, narrowing, prerequisite, complement, causal predecessor, evidence dependency, and so on.

## Claim types

| Claim type | Question to ask at every applicable locus |
|---|---|
| **CORRECTNESS / SOUNDNESS** | Can this stage eliminate a legitimate solve, preserve an invalid state as legitimate, or attribute/count the outcome incorrectly? |
| **SUFFICIENCY / EXPRESSIVITY** | Does it contain the information/actions needed to distinguish the futures that matter? |
| **CAUSALITY** | Does changing it alter solve reachability rather than merely correlate with outcome? |
| **PREVALENCE** | How much of the current residual is actually governed by the effect? |
| **OBSERVABILITY** | Can the effect be detected without assuming the answer or conditioning on a biased trace? |
| **ECONOMICS / MARGINAL VALUE** | Does it add enough information/capability to justify work and displacement cost? |
| **GENERALIZATION / PORTABILITY** | Does the result survive parents, populations, budgets, distributions, protocol, and architecture epochs? |
| **COMPOSITION / INTERACTION** | What changes when neighboring mechanisms or shared resources interact? |
| **PERSISTENCE / LIFETIME** | How long should a fact, frontier, plan, or learned constraint survive? |
| **REVISION / RECOVERY** | When it is wrong, can the causal commitment be identified and selectively revised? |

## System loci

The premise-space pipeline is broader than the runtime call graph:

`problem semantics / solution space`
→ `input normalization + root preprocessing`
→ `start/gate + action generation`
→ `state representation + equivalence/dominance`
→ `local legality + exact inference`
→ `strategic/global feasibility`
→ `ordering/ranking/exploration`
→ `frontier retention/merge/diversity`
→ `budget/scheduling/continuation`
→ `failure explanation/memory/communication`
→ `revision/repair/alternate search object`
→ `validation/acceptance`
→ `measurement/attribution/evidence/closure`

## Coverage matrix

Legend: **D** dense/mature, **P** populated, **T** thin or only indirectly isolated, **E** effectively empty/not independently isolated, **N** not normally applicable.

| System locus | Correct | Express | Causal | Prev | Observe | Econ | Gen | Compose | Persist | Revise |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Problem semantics / solution space | P | T | T | **E** | **T** | N | T | T | N | N |
| Input normalization / root preprocessing | P | P | T | T | T | T | T | T | P | **E** |
| Start/gate / action generation | P | P | P | T | T | T | T | T | **E** | **E** |
| State representation / equivalence / dominance | P | P | P | T | P | T | T | P | T | T |
| Local legality / exact inference | **D** | **D** | **D** | P | **D** | P | P | T | T | N |
| Strategic / global feasibility | P | T | T | **T** | **T** | **T** | T | **T** | T | T |
| Ordering / ranking / exploration | P | **D** | **D** | **D** | **D** | P | **D** | P | T | P |
| Frontier retention / merge / diversity | P | P | P | P | P | P | P | T | P | T |
| Budget / scheduling / continuation | P | **D** | **D** | **D** | **D** | **D** | **D** | P | P | P |
| Failure explanation / memory / communication | **T** | **T** | **T** | **T** | **T** | **T** | T | **T** | **T** | **T** |
| Revision / repair / alternate search object | P | P | P | P | P | P | P | T | P | P |
| Validation / acceptance | **D** | P | P | T | P | N | P | T | N | N |
| Measurement / attribution / evidence / closure | **D** | **D** | P | P | **D** | P | **D** | P | P | P |

This is deliberately conservative. A cell is not upgraded merely because a nearby mechanism exists. For example, strong per-mechanic scalar bounds do not make **global-feasibility composition** mature, and local repair memory does not make **failure explanation/persistence** mature.

## What the matrix exposes that topic lists hide

### 1. Problem-side structure is still weakly observed

P161/P176 make explicit that solution multiplicity, regime volume, and solution-space topology may alter difficulty and the meaning of witness-relative diagnostics. The largest hole is **prevalence**: the project has not systematically asked how much of the residual consists of single-regime/narrow-solution levels versus levels with many alternative completions.

This matters because a first-loss against one witness is much more causally informative in a narrow solution space than in a level with many unrelated accepted completions.

### 2. Strategic feasibility is a high-leverage thin band across many claim types

P032/P090/P091 and new P157/P163/P164/P169 occupy this locus, but nearly every column is still thin: prevalence, observability, economics, generalization, persistence, and revision. The missing object is not simply another global heuristic. It is a family of **relations among future obligations and shared capacities**.

### 3. Failure knowledge is the sparsest full row

The solver can observe failure, backtrack, restart, and retain some repair-local experience. It has little general machinery for causal explanation, proof lifetime, cross-process communication, or selective revision. This is the clearest continuous gap across the matrix rather than one isolated missing algorithm.

### 4. Generation and preprocessing have almost no explicit revision semantics

Once root preprocessing, a gate choice, or an action grammar has been fixed, current research mostly treats it as context rather than a revisable hypothesis. P155 and P160 expose the question: can path-conditioned facts or evidence learned during the invocation justify changing the representation/action source itself?

### 5. Dense ranking research still has a persistence gap

Ranking is heavily studied, but the solver normally turns a ranking judgment into immediate traversal rather than a durable statement about future regimes. That helps explain why rank-moving signals can repeatedly fail to convert into solves: the information may never become a constraint, plan, retained regime, or reusable fact.

## Scope/lifetime sweep

The map is also uneven by scale.

| Scope | Coverage | Underasked question |
|---|---|---|
| move/node | very high | cross-mechanic joint capacity, dominance |
| branch/prefix | high | path-conditioned topology as an actionable relation |
| frontier | high | regime coverage versus top-k score diversity |
| attempt/tranche | high | censoring versus exhaustion, continuation value |
| stage/sequence | medium | predecessor-conditioned value and attribution |
| invocation | **thin** | typed fact sharing, learned conflicts, positive knowledge persistence, adaptive replanning |
| level | medium-high | solution multiplicity/regime volume and intrinsic difficulty |
| residual population | high | causal rather than surface/descriptive subclassing |
| corpus/distribution | medium | generator coverage and cross-distribution challenge evidence |
| architecture epoch | **thin** | systematic portability tagging of negatives and economics |
| research lineage | medium | dead tooling/unresolved questions, supersession and closure scope |

The largest lifetime gap remains **inside one invocation**: facts are often born close to the process that discovered them and die there.

## Evidence-state taxonomy

Every proposition should eventually use one of these interpretations rather than a generic `open/closed` bit:

- **UNASKED** — no isolated version found;
- **IMPLICIT** — assumption exists in architecture/control flow but has not been tested as a proposition;
- **SUPPORTED** — evidence raises confidence but does not establish deployment;
- **TESTED_FORM_CLOSED** — one concrete mechanism/vocabulary/placement is closed;
- **SEMANTIC_PARENT_OPEN** — a tested descendant is negative while the broader operation remains live;
- **SEMANTIC_PARENT_CLOSED** — evidence really does rule out the parent in the stated scope;
- **POPULATION_LIMITED** — result cannot support the wider population claim;
- **PARTICIPATION_INVALID / DOSE_INVALID** — the mechanism verdict is not decision-bearing because treatment delivery/work was not established;
- **ECONOMICS_CLOSED** — capability exists but this placement/dose loses on matched work;
- **BLOCKED** — prerequisite evidence/infrastructure is absent;
- **STALE / EPOCH_SENSITIVE** — production boundary, architecture, work contract, or residual population changed enough to require freshness reconciliation;
- **DEFERRED_REOPEN** — explicit changed condition can make the question live again.

This distinction is mandatory for negative-space work. “Asked before” is not one state.

## Mechanic-resource premise generator

Pairwise mechanic names are a poor exhaustive basis. Search shared future resources instead:

| Future resource | Consumers | Thin relation |
|---|---|---|
| cell / visit capacity | intersections, must-pass, must-cross, surround, length | competing claims on the same cells/regions |
| horizontal/vertical axis capacity | edge reuse, must-cross, filters, intersections | future axis assignment and dominance |
| turn/chirality opportunities | must-turn, adjacent-turn, filters, crossings | competing approach geometries |
| global order / parity | flipping filters, portal route order, obligation sequence | feasible order classes and commutativity |
| path-length budget | every geometric obligation; portal length effects | spatial allocation among obligations rather than one scalar remainder |
| corridor / separator capacity | obstacles, used path, portals, required regions | multi-obligation congestion and interface contracts |
| future intersection opportunities | required intersections, must-cross, revisit/axis use | assignment of remaining crossings to realizable sites/axes |
| completion regime / topology | whole path history | preserving distinct futures and proving regime loss |

The standing question becomes: **which future resource is overcommitted, poorly represented, or incorrectly assumed independent?**

## Priority negative-space clusters

These are map gaps, not automatic queue promotions:

1. **causal first-loss lineage** across the whole pipeline, with alternate-witness sensitivity;
2. **solution-space multiplicity/regime geometry** as context for difficulty and diagnosis;
3. **shared-resource/global feasibility** rather than independent mechanic bounds;
4. **sound state dominance / partial orders** between exact identity and lossy merge;
5. **solve-local knowledge lifetime and communication**, including positive facts;
6. **causal failure explanation and selective revision**;
7. **adaptive information acquisition**, including bounded exact queries chosen because uncertainty is expensive;
8. **state-conditioned preprocessing/graph facts** after path history changes available space;
9. **sequence/predecessor-conditioned action value** rather than action identity alone;
10. **epistemic selection effects** from trace censoring, exact-model support, early-exit portfolios, and stale architecture epochs.

## Completeness rule for future additions

When a new premise is proposed, do not only ask where it belongs by topic. Ask:

1. What system locus owns it?
2. What claim type is actually being asserted?
3. At what scope/lifetime is it supposed to hold?
4. What exact evidence state is it in?
5. Which semantic parent and tested forms surround it?
6. Which earlier causal loss would make it irrelevant?
7. Which evidence dependencies could make its apparent verdict invalid?
8. Which shared resource or alternative future does it concern?

A genuinely new idea should either populate a thin/empty cell, split an over-broad existing cell, or add a new relation among populated cells. If it does none of those, it is likely a renamed treatment rather than a new premise.
