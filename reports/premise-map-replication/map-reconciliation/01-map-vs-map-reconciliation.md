# Canonical v1 vs independent peer-map reconciliation

Date: 2026-09-17
Stage: 3A — construction dependence only
Canonical object: `solver-premise-map-v1-2026-09-17`
Canonical snapshot commit: `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`
Independent peer-map construction freeze: `0c3f29927a65639bd3081d8cf9a06f2bc52e2e74`
Peer-map final branch head at verification: `eddec05f6d2a4075ca51e9cb5a25d0a5ad527d54`

## Scope

This reconciliation asks only whether changing the **cartographer** changes the conceptual object.

It does not use the shadow-mining discrepancy set and does not decide what should enter a future canonical map or solver queue.

The comparison is semantic rather than identifier-based. The canonical map contains 142 propositions and 166 relations; the independently reconstructed peer map contains 46 nodes and 56 relations. Their different sizes are themselves partly a granularity result and are not treated as coverage scores.

## Important causal-entanglement caveat

This construction replication is not fully independent in both directions.

The earlier independent reconstruction lineage was reconciled into the canonical lineage before frozen v1 was created. Merged PR #1834 explicitly says four surviving independent deltas were integrated as canonical P197-P200:

- information authority;
- mechanism/deployment maturity;
- unit of generalization;
- information half-life / transfer radius.

The peer map completed here continues that earlier independent lineage.

Therefore agreement involving those four regions **cannot be counted as clean independent convergence between two untouched maps**. The canonical map partly inherited them from an ancestor of the peer reconstruction.

This does not invalidate the comparison, but it changes what can be learned from it:

- convergence outside those imported regions is stronger evidence of construction robustness;
- convergence on P197-P200-like material is expected partly by causal ancestry;
- differences in how the peer map organizes those concepts remain informative even though concept presence is not independent.

## High-level representational contrast

### Canonical v1

The canonical map is a broad descriptive inventory with:

- fine-grained propositions;
- explicit typed semantic relations;
- locus/claim/scope/evidence-style metadata;
- semantic-parent/tested-form distinctions;
- hardening overlays for asymmetry, defaults, ontology stress, freshness, authority and discovery lineage;
- substantial mechanic-, treatment-, experiment- and historical-detail retention.

Its structure is optimized for preserving research archaeology and preventing over-broad closure.

### Independent peer map

The independent reconstruction converged on a much smaller functional topology:

`encode -> derive -> generate -> reject -> prefer -> retain -> remember -> allocate -> select -> transfer -> recognize -> measure -> infer`

with four cross-cutting axes:

- epistemic authority;
- evidence scope;
- architecture/configuration dependence;
- temporal validity.

It deliberately aggregates many mechanic-specific descendants unless they reveal a distinct conceptual parent.

Its structure is optimized for explaining where information, alternatives, work and evidence change role.

## Strong convergence not attributable solely to P197-P200 import

### 1. Search state is an epistemic boundary

The peer map independently makes "search state defines an epistemic boundary" and "state relatedness has multiple semantics" foundational.

Canonical v1 separately contains extensive state-sufficiency, equivalence, dominance, continuation, topology and policy-relative-state material.

The agreement is deeper than wording: both representations reject the idea that geometric/puzzle state alone determines all future search value.

**Construction result:** robust conceptual region; partition differs.

### 2. Relational feasibility is not reducible to local obligations

The peer map recovers relational constraint feasibility and asks about order of relational inference.

Canonical v1 contains a substantially richer joint-feasibility family, including higher-order obligation/resource interactions and relational feasibility descendants.

**Construction result:** robust region, with canonical map much more decomposed.

### 3. Diversity is several operations, not one scalar intervention

The peer map explicitly states that diversity is distributed rather than a scalar knob and that nominal retries require behavioral distinctness.

Canonical v1 independently separates generation, ranking, retention, restart/continuation, option preservation, merge identity and other diversity-like operations.

**Construction result:** strong convergence at parent level.

### 4. Continuation and restart are semantically different

The peer map separates restart from continuation and treats resumability as requiring both semantic and accounting state.

Canonical v1 contains distinct restart/continuation, frontier-lifetime, work-history and scheduler-premise families.

**Construction result:** robust conceptual distinction.

### 5. Topology has multiple epistemic roles

The peer map separates topology as logical, predictive and diagnostic information and retains a tested-form connectivity negative.

Canonical v1 likewise distinguishes topology-related feasibility, prediction, diagnosis, representation and routing questions rather than treating "topology" as one mechanism.

**Construction result:** robust region with different decomposition.

### 6. Work allocation is part of algorithmic capability

The peer map makes work, total/base envelopes, scheduler semantics, displacement and portfolio value central.

Canonical v1 contains budget/work, scheduler, exposure, participation, displacement, non-monotone capability and portfolio-conditioned residual premises.

**Construction result:** very strong convergence.

### 7. Negative results are scoped to architecture/evidence conditions

The peer map says historical negatives are architecture-relative and measurement must match the causal proposition.

Canonical v1 has freshness, participation/dose, architecture-epoch, evidence-state and tested-form/semantic-parent machinery.

**Construction result:** strong convergence at methodological level.

### 8. Hard residuals should be decomposed by where capability was lost

The peer map asks whether residuals are missing alternatives or losing/starving them, and separately types failure before acting on it.

Canonical v1 contains first-loss, source/action absence, pruning, ranking, retention, starvation, routing, handoff and attribution distinctions.

**Construction result:** strong convergence, canonical substantially finer-grained.

## Convergence whose presence is causally entangled

The peer map strongly features:

- mechanism maturity;
- generalization unit;
- information lifetime/transfer radius;
- epistemic authority.

Canonical v1 also features all four, but these were explicitly imported from the earlier independent reconstruction lineage as P197-P200.

The comparison can still use **partition and relation differences** here:

- peer maturity is embedded in evidence/promotion topology rather than isolated as one late proposition;
- peer authority is distributed across proof, observer, experience and scheduler roles;
- peer information lifetime is linked directly to remember/transfer functions;
- peer generalization unit is tied to dynamic failure/action-selection questions.

But presence/absence agreement in these four regions is not independent evidence.

## Major split/lump differences

### Canonical splits where peer map lumps

The canonical representation preserves far more distinctions among:

- mechanic-specific prune/lower-bound forms;
- search-object families;
- solution-space multiplicity/regime questions;
- generator/action-source questions;
- exact/reference-model roles;
- first-loss classes;
- particular routing, repair, ranking, retention and topology descendants;
- historical tested forms and reopen conditions.

The peer map deliberately treats many of these as instances of broader functions such as derive, generate, reject, retain or allocate.

This is the clearest construction-dependent difference: **granularity**, not broad conceptual territory.

### Peer map creates parents where canonical map distributes the idea

Several peer nodes function as compact parents over material scattered across canonical regions:

- search state as epistemic boundary;
- diversity distributed across functions;
- failure should be typed before action;
- scheduler semantics are part of the algorithm;
- concept status is multi-axis;
- level blindness as an information-flow contract;
- population identity as experimental identity;
- process and solve scopes as distinct accounting scopes.

Some of these have canonical analogues, but the canonical map often represents them through multiple propositions, hardening rules or infrastructure assumptions rather than one named parent.

## Peer-map-emphasized regions that are weak or indirect in canonical proposition inventory

The hostile peer-map audit materially extended the map into execution/evidence substrate.

The strongest examples are:

- **P041 level blindness as an information-flow contract**;
- **P042 population identity as experimental identity**;
- **P043 parallel execution must preserve logical task identity**;
- **P044 process and solve scopes are distinct accounting scopes**;
- **P046 research artifacts and puzzle inputs should remain separable**.

Canonical hardening/source-coverage work recognizes evidence plumbing and provenance, so these are not necessarily absent from the total canonical program. But they are much less prominent as first-class conceptual nodes in the 142-proposition inventory.

This is a genuine construction effect: the peer map's function/evidence framing makes execution substrate conceptually salient.

## Canonical-emphasized regions weak or aggregated in peer map

Conversely, the peer map does not preserve the canonical map's full descriptive resolution around:

- alternative search-object architecture;
- solution-space multiplicity and regime volume;
- exact model/support coverage;
- fine-grained mechanic interactions;
- detailed first-loss taxonomy;
- many concrete tested sibling forms;
- explicit causal predecessor/complementarity/evidence-dependency edge families.

This does not show that the independent construction "missed" them in a simple sense. Its closeout explicitly says mechanic-specific descendants are aggregated unless they expose a distinct parent.

Still, it means the representation is less suitable for some questions about exact historical closure and implementation-form coverage.

## Relation-topology differences

The canonical map's relation layer is an explicit descriptive graph over many fine-grained propositions.

The peer map's 56 relations are fewer but often stronger semantic sentences such as:

- guards-interpretation-of;
- does-not-close;
- architecturally-conditions;
- measurement-basis-for;
- protects-evidence-for;
- operationalizes.

The peer graph therefore carries more explanatory burden per edge while the canonical graph carries more historical/detail coverage.

The function spine itself is not encoded as a mutually exclusive module taxonomy; the peer closeout explicitly warns that one mechanism may occupy several functions.

## Abstraction-level result

The two maps mostly disagree about **where to place the abstraction boundary**, not about whether the major research problems exist.

Canonical v1 tends to preserve:

`historical/concrete form -> semantic parent -> evidence/scope qualifier`

The peer map tends to preserve:

`research function -> epistemic role -> cross-cutting parent question`

This is important path dependence. Different cartographers can produce meaningfully different maps even while covering much of the same territory.

## Construction-dependence classification

### Robust across construction

Strongly reproduced regions include:

- state/equivalence sufficiency;
- relational feasibility;
- distributed diversity;
- restart/continuation distinction;
- topology role separation;
- allocation/scheduler semantics;
- architecture-relative negatives;
- residual/first-loss decomposition.

### Representation-sensitive but semantically overlapping

- exact premise boundaries;
- whether a concept appears as node, axis, relation or hardening rule;
- granularity of tested forms;
- relation vocabulary;
- status representation;
- prominence of execution/evidence substrate.

### Causally entangled and therefore not valid independent-convergence evidence

- information authority;
- mechanism/deployment maturity;
- unit of generalization;
- information lifetime/transfer radius.

### Peer-emphasized possible canonical underrepresentation

- execution/process accounting boundaries;
- experiment identity as infrastructure;
- level blindness as enforced information flow;
- research-artifact versus puzzle-input separation;
- multi-axis concept status as a representation problem.

### Canonical-emphasized possible peer underrepresentation

- fine mechanic/search-object history;
- solution-space/regime detail;
- exact-model/support detail;
- detailed sibling/tested-form closure;
- fine first-loss taxonomy.

## Bottom line

The independent reconstruction does **not** suggest that the canonical map's broad conceptual territory is mainly an artifact of one cartographer.

It does show substantial construction dependence in:

- granularity;
- abstraction boundary;
- relation semantics;
- whether execution/evidence infrastructure becomes first-class conceptual material;
- whether mechanic/history detail remains explicit or is compressed under functional parents.

The most important limitation is the P197-P200 ancestry leak into canonical v1. Those four regions must not be cited as clean cross-construction replication.

Even after discounting them, however, enough major regions independently converge to support the claim that the canonical map captured a real underlying research structure rather than merely projecting an arbitrary ontology onto the repository.
