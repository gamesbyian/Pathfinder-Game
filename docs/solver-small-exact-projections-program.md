<!-- agent-context-budget: warn=6500 max=8500 -->
# Solver small exact projections program

> **Status:** ACTIVE PREMISE-GENERATION PROGRAM; production behavior unchanged.
> **Priority owner:** [solver optimization workstreams](solver-optimization-workstreams.md).
> **Capability owner:** [solver capability invention program](solver-capability-invention-program.md).
> **Origin:** the parity audit showed that a tiny exact projection can support correctness, opportunity measurement, response explanation, and eventually a small solver consumer without solving the residual problem itself.

## Thesis

Parity is valuable not because modulo 2 is special, but because it is a **small exact projection of the completion problem**:

1. every legal move has a cheap projection update;
2. every real completion obeys an exact law in the projected space;
3. projected impossibility proves real impossibility;
4. distance from projected impossibility may explain solver behavior before it earns a hard consumer.

Search for other projections with the same computational role. Do not search for decorative mathematical descriptors.

A candidate projection should be expressible as:

`current puzzle/state -> small projected state / bound / feasibility relation`

with explicit soundness direction, bounded update/construction cost, and at least one plausible decision seam.

## Candidate-quality screen

Before implementation, score a concept qualitatively on:

- **exactness:** what statement is guaranteed for every legal completion?
- **compression:** how much smaller is the projection than the full residual state?
- **incrementality:** can moves update it cheaply, or can prep amortize it?
- **strength:** can it prove anything current scalar/connectivity rules miss?
- **mechanic coverage:** which portals/filters/flippers/intersections/path-history features preserve or alter the law?
- **consumer breadth:** prune, bound, order, retain, explain, route, repair, decompose?
- **counterexample tractability:** can smallest witnesses and false-reject checks be constructed?
- **response value:** can the projected quantity be joined to technique/hint evidence without historical leakage?

A beautiful invariant with no incremental decision-bearing opportunity stops.

## First live candidate: cut / boundary-crossing balance

Stable question: `WS2-CUT-BALANCE-PROJECTION`.

For any current-input region or cut, a Gate-to-Goal path has constrained crossing balance. Endpoints on opposite sides require odd net crossing parity; endpoints on the same side require even parity. Existing path use, remaining traversable interfaces, portals that cross the cut, and obligations trapped on either side can strengthen the requirement from parity to a small integer lower/upper balance.

The useful question is not “does a separator exist?” Lane A already measured one compact interface representation and closed that tested form at C2. The new premise is narrower and more exact:

> Can a cheaply chosen cut expose a **sound crossing-balance impossibility or pressure signal** that scalar connectivity/volume and the closed Lane-A signature do not?

### Cheapest audit

Reuse current static/residual graph structure. Begin with cuts already naturally nominated by:
- articulation/chokepoint structure or small separators;
- board boundary / obstacle-defined regions;
- path-created residual components or narrow interfaces;
- required-object partitions.

For each supported state/level, derive only quantities whose semantics are explicit:
- current side of path head and goal;
- remaining required obligations by side;
- unused legal crossing interfaces;
- already-consumed crossings where reconstructable;
- portal pairs whose jump changes cut side;
- minimum required future cut crossings and maximum available future crossings.

First measure contradictions and tight margins in shadow/offline form. Do not build a decomposition engine.

### Advancement

Advance only when the projection:
1. is sound on the declared mechanic scope;
2. produces incremental information beyond connectivity/scalar bounds;
3. has non-trivial decision-bearing incidence;
4. admits a cheaper consumer than solving the residual;
5. survives valid-path/referee replay and differential checks before hard use.

## Ranked candidate families after cut balance

These are premise families, not live experiments.

### Obligation-resource matching / Hall pressure

Several remaining obligations can each be individually feasible while a subset collectively has too few compatible scarce supports: approach axes, crossing cells, separator interfaces, turn slots, portal opportunities, or region-entry opportunities.

Look first for a **small support graph already implicit in existing mechanic analysis**. A Hall deficit is a sound impossibility; near-deficit may be an explanatory pressure signal. Do not launch generic matching over arbitrary invented resources.

### Dominance / monotone option containment

One state may provably dominate another without being equivalent: no more resource spent, no extra scarce interface consumed, and a superset of future options under a sound dependency key.

This is distinct from naive exact transposition. Start by asking whether any existing cull/repair population contains repeated comparable states for which one-way dominance can be certified cheaply.

### Planar separation / enclosure

Move beyond generic “topology” toward small exact consequences: required objects separated from the goal, residual faces/regions whose access has become irrevocably constrained, or path-created enclosures. Reuse topology evidence, but require a discrete actionable consequence rather than another raw phase coordinate.

### Partial-order independence / commutativity

Ask which remaining commitments are independent and which induce dependency edges. Existing residual-interface commutativity is narrow positive evidence, not a general license. A small exact independence relation could reduce order branching or define decomposition boundaries.

### Finite-state residues

Audit finite-state mechanics for small quotients analogous to parity: cyclic or residue state whose transition law constrains whole-path completion. Do not begin with “try mod 3/mod 4”; derive the quotient from mechanic transition semantics.

### Exact symmetry / automorphisms

Only exact current-input automorphisms preserving role, mechanic state, portal pairing, orientation and path history count. This is narrower than generic canonicalization/transposition and should be tested only where symmetry survives all relevant labels.

## Relationship to existing programs

- **Parity Lane H** is the worked example and a sibling, not a dependency.
- **Lane A separator/decomposition** closed one repeated interface signature; cut-balance may reuse separators but asks an exact conservation question rather than outcome-equivalent region identity.
- **Lane D relational feasibility** can consume or calibrate matching/commutativity projections.
- **Topology F3** can nominate planar-separation consequences, but raw topology phase does not itself earn a projection.
- **Capability invention** owns classification: a new exact consequence of existing graph facts may be EXTENSION; a genuinely new projected reasoning operation may be INVENTION.
- **WS1** becomes relevant only after a legal projected feature predicts differentiated technique response and independently transfers.

## Evidence order

Prefer zero/new-low-compute evidence in this order:

1. derive projection from current puzzle/state semantics;
2. search retained exact/referee-valid states/paths for witnesses and counterexamples;
3. join to existing technique census / capability evidence for response nomination where valid;
4. add a production-inert observer only if the existing evidence cannot answer incidence;
5. test the smallest consumer only after distinction is established.

Historical outcomes may nominate populations. They never enter cold runtime policy.

## Stop rule

Stop a projection family when its exact law is merely a restatement of an existing bound, its supported scope is too narrow, its projected state grows toward full residual identity, or its incremental decision value is negligible. Preserve the semantic reason for closure so a materially different projection is not falsely inherited as negative.

## Current next action

Run the **cut/boundary-balance concept audit** before implementation:

- enumerate exact cut-balance laws under ordinary moves, intersections and portal side changes;
- identify the smallest mechanic-complete supported scope;
- map existing connectivity/separator/topology machinery that can supply the needed facts;
- construct smallest positive and redundancy witnesses;
- define one production-inert incidence measurement;
- explicitly state how the test differs from Lane A C0-C2 and ordinary connectivity.

Only after that audit should code be considered.
