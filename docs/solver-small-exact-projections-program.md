<!-- agent-context-budget: warn=6500 max=8500 -->
# Solver small exact projections program

> **Status:** ACTIVE PREMISE-GENERATION PROGRAM; production unchanged.
> **Priority:** [workstreams](solver-optimization-workstreams.md) · **Capability method:** [invention program](solver-capability-invention-program.md)

## Thesis

Parity worked because a huge completion space admits a tiny exact image: moves update it cheaply, every real completion obeys its law, impossibility in the image is decisive, and distance from the boundary can still explain search behavior.

Search for compressed **exact consequences**, not decorative mathematics:
`current puzzle/state -> small invariant / relaxation / order / quotient -> necessary consequence`.
The procedure must generalize; per-level outputs need not recur.

## Four projection/certificate families

Do not give unlike ideas one proof contract.

1. **Conserved/transition invariants.** A small state evolves by an exact transition law: parity, cut/region flow balance, finite mechanic residues. Hard use requires proving the update law under every supported mechanic.
2. **Exact necessary-condition relaxations.** A smaller feasibility problem contains every real completion: obligation-resource matching, bounded flow/capacity, relaxed phase-distance. Infeasibility is sound only when the relaxation direction is explicit.
3. **Partial orders.** One state can safely dominate another without being equivalent. Soundness requires an option-containment/resource argument, not a hash resemblance.
4. **Quotients/equivalences.** Exact symmetry or another equivalence identifies states/actions with identical relevant futures. This has the strongest equivalence burden and should not inherit permission from lossy coarse-state success.

Classify planar-separation/homology and commutativity claims by the specific proof contract they use.

## Stage-0 concept audit

Before observer code:

- state the exact theorem/necessary condition;
- define projected state and update/construction cost;
- create a **mechanic perturbation matrix**: each portal/filter/flipper/intersection/path-history feature preserves, transforms, consumes, or makes the claim unsupported;
- map dependency on existing prep/state facts;
- prove **novelty against current machinery**: identify the smallest witness where the new consequence differs from scalar distance, parity, connectivity, mechanic bounds, or an already-closed form;
- construct a redundancy witness where both old and new logic agree;
- name the opportunity denominator and smallest consumer;
- separate two possible values: **proof value** (new sound reject/bound) and **response value** (explains technique/path behavior without proving death).

If no novelty witness exists, stop before population work.

## Systematic discovery matrix

Do not rely on free-association after parity. Cross problem structure against proof family:

| Problem structure | Conserved invariant | Relaxed feasibility | Partial order | Quotient/equivalence |
|---|---|---|---|---|
| regions / separators | crossing or flow balance | interface capacity | region-option dominance | symmetric regions |
| obligations / scarce supports | resource counts | matching / Hall / packing | support-set containment | interchangeable obligations |
| path topology | homology / cycle coordinate | separation/access relaxation | enclosure dominance | topology-preserving symmetry |
| finite-state mechanics | transition residue / charge | reachable mechanic-state set | state-option containment | automaton quotient |
| search states | resource monotones | relaxed future option set | state dominance | exact automorphism/equivalence |

Empty cells are legitimate. The matrix exists to expose neglected siblings and duplicated ideas, not to manufacture experiments.

## Counterexample-first validation

For an exact claim, prefer tiny exhaustive or enumerated referee-valid instances before corpus measurement when practical. Search specifically for:
- a smallest positive witness;
- a smallest case where existing production logic already catches the same fact;
- a smallest mechanic interaction that breaks the claimed law;
- a valid-solution witness that would be falsely rejected by an incorrect hard interpretation.

A theorem that cannot survive this micro-instance attack does not earn an observer. Exhaustive tiny-instance evidence validates semantics, not population value.

## First live candidate: cut / region-flow balance

Stable question: `WS2-CUT-BALANCE-PROJECTION`.

Treat a region boundary as a small interface through which one continuous Gate-to-Goal path must route its remaining obligations. Endpoint sides, required visits on each side, already-used interfaces, remaining legal interfaces, and portal jumps that change side constrain future boundary traffic.

The first audit should determine which consequences are genuinely exact. Possible forms include:

- parity of boundary crossings implied by endpoint sides;
- minimum future entries/exits forced by obligations stranded across the cut;
- maximum future crossings allowed by remaining legal interfaces under the declared edge/cell-use semantics;
- small flow/degree balance at a region interface.

This is **not Lane A reopened**. Lane A C0-C2 asked whether a compact interface signature repeatedly predicted outcome and closed representation-explosive at C2. This asks whether a board-specific cut supports a sound conservation/capacity consequence even when its exact interface description never recurs cross-level.

### Cheapest audit

Nominate cuts from structure already available or cheaply derivable: articulation/chokepoint structure, small separators, obstacle/boundary regions, path-created narrow interfaces, or required-object partitions.

For each candidate law:
1. prove ordinary-move semantics;
2. add intersections and portal side-changes explicitly;
3. state unsupported mechanic combinations rather than hand-wave them;
4. build smallest positive, redundancy, and adversarial counterexamples;
5. inspect retained valid paths/exact states for incidence;
6. only then add one production-inert observer if denominator/opportunity remains unknown.

Advance only on incremental, decision-bearing information with a cheaper plausible consumer than residual search.

## Candidate families after region-flow balance

These are **not live experiments**.

### Obligation-resource matching / Hall pressure
Several obligations may each be feasible while a subset has too few compatible scarce supports: approach axes, crossing cells, region interfaces, turn slots, or portal opportunities. Start from support relations already implied by mechanic analysis; do not invent arbitrary resources to make matching interesting.

### Dominance / monotone option containment
Seek one-way dominance before equivalence: no more resource spent, no additional scarce opportunity consumed, and a sound superset of future options. This is distinct from naive transposition.

### Planar separation / cycle-space consequences
Turn “topology” into discrete consequences: required objects cut off from the goal, enclosure, residual face access, or a small homology/cycle-space coordinate whose change has a proved completion consequence. Raw phase coordinates are nominations, not consumers.

### Partial-order independence / commutativity
Ask which remaining commitments commute and which create dependency edges. The existing splice result is narrow evidence. A sound independence relation could reduce order branching or expose decomposition boundaries.

### Finite-state residues
Inspect mechanic transition systems for small quotients. Derive any modulo/cyclic law from the mechanic automaton; do not start by trying arbitrary moduli.

### Exact symmetry / automorphisms
Only automorphisms preserving gate/goal roles, mechanic labels/state, portal pairing/orientation and relevant path history count. This is narrower than generic canonicalization.

## Evidence ladder

1. Stage-0 theorem + novelty audit.
2. Retained witness/counterexample replay using exact/referee-valid evidence.
3. Incidence and overlap with current rejects/decisions.
4. Existing technique-census/capability/hint joins for **response nomination**, with proper protocol and success-selection caveats.
5. Production-inert observer only if existing evidence cannot establish opportunity.
6. Smallest consumer.
7. Matched-work economics and independent confirmation proportional to selection pressure.

Hard and soft descendants are independent: negligible prune incidence does not automatically kill a response feature, and a response association does not prove sound rejection.

## Candidate-ranking rule

Do not rank concepts by elegance. Prefer:

`expected information value ≈ supported opportunity × novelty × consumer leverage ÷ derivation cost`

No scalar score is authoritative; the decomposition forces the right questions. A broad concept may lose to a narrow exact law with a cheap denominator and obvious consumer.

## Stop and closure semantics

Stop when the claim restates an existing bound, supported scope is vanishing, projected state approaches full residual identity, construction cost rivals the avoided work, or incremental decision value is negligible.

Record *which family and theorem closed*. A failed matching relaxation does not close conserved cut flow; a failed symmetry quotient does not close dominance; a failed cross-level interface signature does not close board-specific conservation.

## Current next action

Complete the `WS2-CUT-BALANCE-PROJECTION` Stage-0 audit. Its deliverable is a small theorem/mechanic/novelty matrix plus witnesses and one earned incidence measurement, not solver code.
