# Abstraction refinement, backdoors, and core-guided tractability research

**Role:** external-literature reference. This memo links CEGAR, proof/interpolation-based abstraction, SAT/CSP backdoors, and core/MCS-guided repair. It is not an implementation plan. Current execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md).

## Executive answer

This literature answers three questions that the earlier research left only partially resolved:

1. **How can a future-state abstraction be discovered rather than guessed?** Counterexample-guided abstraction refinement (CEGAR) begins coarse and adds distinctions only when concrete counterexamples prove they matter.
2. **How far is a residual from becoming structurally easy?** Backdoor size/depth/treewidth measure distance to a tractable class rather than raw search-space size.
3. **Which frozen commitments must change to restore feasibility?** UNSAT cores explain conflicting assumptions; MCS/diagnosis machinery identifies relaxations that restore satisfiability.

Together they create a useful trio:

- CEGAR: what distinction did the abstraction forget?
- backdoors: what few adaptive choices keep the residual outside an easy class?
- diagnosis/MCS: what preserved commitments must be relaxed to make a solution possible?

---

## 1. CEGAR: start coarse, refine only where counterexamples demand it

Counterexample-guided abstraction refinement is a standard model-checking pattern:

1. construct a coarse abstraction of the concrete transition system;
2. search the abstraction for a path/solution/counterexample;
3. check whether that abstract path is realizable concretely;
4. if it is spurious, analyze why;
5. refine the abstraction so the same false behavior is no longer possible;
6. repeat.

The key idea is that an abstraction does not need to know every potentially relevant state distinction in advance.

### Planning CEGAR

Seipp and Helmert adapted CEGAR to optimal classical planning using Cartesian abstractions. Starting from a very coarse state partition, an abstract plan that fails in the concrete task yields a **flaw**. The corresponding abstract state is split only as needed to separate the concrete behavior that caused the failure.

Their implementation demonstrated that many fine-grained refinements can be practical and that the resulting heuristics can be more informative than similarly sized pattern abstractions.

Later research shows refinement choice matters:

- informed flaw/plan selection can outperform arbitrary refinement;
- backward/regression reasoning can identify suffix-side flaws missed by purely forward concretization;
- multiple flaws may be extracted from one abstract sequence rather than stopping after the first mismatch;
- lazy transition generation can prevent the refined abstraction's transition graph from becoming the memory bottleneck.

### Transfer principle

For a proposed residual interface `I(s)`, instead of manually enumerating every field that might matter:

> begin with a deliberately coarse `I`; find two concrete states/continuations that the abstraction wrongly treats alike; use the counterexample to identify the missing distinction; refine.

This is an external precedent for **abstraction discovery by falsification**.

---

## 2. CEGAR does not require convergence to full exact state

A common misconception is that refinement must eventually reproduce the entire concrete state space.

In practice, refinement is role-dependent:

- a proof abstraction must be strong enough to establish the property;
- an admissible heuristic abstraction must preserve the needed bound;
- a ranking abstraction may remain much coarser;
- some systems deliberately leave certain abstractions coarse and repair/validate candidate solutions later.

Multi-agent path-finding CEGAR work illustrates this explicitly: conflicts can be added selectively rather than compiling every interaction up front, and some variants deliberately defer some correction to post-processing.

Therefore the correct goal is:

> enough distinction for the abstraction's intended role, not maximum state fidelity.

This reinforces Pathfinder's proof/predictive/diagnostic/allocation-interface distinction.

---

## 3. Proof-based abstraction and Craig interpolation

CEGAR can discover refinements from conflict structure, but formal verification offers a more logical tool: **Craig interpolation**.

Suppose formulas `A` and `B` are jointly inconsistent. An interpolant `I` satisfies, schematically:

- `A => I`;
- `I ∧ B` is inconsistent;
- `I` uses only vocabulary shared by `A` and `B`.

That shared-vocabulary restriction is especially important for residual interfaces.

If `A` represents facts established by the committed past and `B` represents requirements of a purported future continuation, an interpolant summarizes a sufficient incompatibility using only the variables visible across their boundary.

This is close to a formal definition of a useful interface predicate:

> a statement about the shared boundary that is strong enough to distinguish an impossible future from possible ones, without retaining irrelevant private history from either side.

### Abstractions from proofs

Proof-based abstraction work constructs parsimonious predicate abstractions from proof information rather than maintaining all conceivable predicates at every program location.

Interpolation-based model checking and trace abstraction further generalize one failed trace into predicates/automata that exclude families of infeasible traces sharing the proof structure.

### Transfer limits

- interpolants depend heavily on the underlying logical encoding/proof system;
- a small or human-obvious interpolant is not guaranteed;
- deriving and checking proof predicates can be expensive;
- an interpolant useful in an exact/reference model is not automatically a cheap production feature.

Its strongest immediate role is as an **offline abstraction/refinement language**.

---

## 4. Backdoors: distance from hard residual to tractable class

A backdoor is a small set of variables/decisions whose treatment places the remaining problem in an easy class.

### Strong backdoor

For every assignment to the backdoor variables, the residual instance belongs to a tractable base class.

### Weak backdoor

At least one assignment to the backdoor variables yields a satisfiable instance in the tractable class.

### Deletion backdoor

Removing the selected variables/constraints places the residual in the target class.

Target classes include Horn SAT, 2-CNF/Krom, acyclic or otherwise tractable CSP structures, and combinations of structural/language restrictions.

The conceptual importance is that raw residual size can be misleading. An enormous instance can be very close to easy if a few critical decisions expose a tractable residual.

---

## 5. Backdoor depth: adaptive distance to tractability

Ordinary backdoor size assumes one fixed set of critical variables.

Backdoor **depth** instead asks for the depth of an adaptive branching process needed to reach the tractable class. Different branches may require different critical variables.

Recent work shows this can be exponentially/much more compact than backdoor size: formulas can have bounded backdoor depth while every conventional backdoor set is arbitrarily large.

For Horn and 2-CNF/Krom target classes, bounded backdoor depth supports fixed-parameter algorithms/approximations and strong tractability consequences.

The 2026 survey literature now treats backdoor size, depth, and structural width as distinct parameters.

### Why this changes basin-width thinking

A residual's difficulty can depend on at least three different axes:

- **basin width:** how much feasible continuation mass exists;
- **interface width:** how much boundary information couples past and future;
- **backdoor depth:** how many adaptive hard choices remain before the residual collapses into an easy regime.

These are not interchangeable.

Examples:

- a residual can have one solution but tiny backdoor depth because propagation forces everything after one decision;
- another can have many solutions but large interface/backdoor structure and remain search-hard;
- a large nominal neighborhood can be easy if a tiny backdoor determines the rest.

This is a strong external explanation for why raw solution count or nominal repair size may poorly predict reconstructability.

---

## 6. Backdoor treewidth and heterogeneous target classes

Backdoor research also combines language-based tractability with decomposition width.

A residual may become manageable not because the whole remaining constraint graph has low treewidth, but because a small backdoor separates difficult structure from components whose remaining width/class is tractable.

Heterogeneous backdoors allow different assignments/branches to fall into **different** tractable classes. This matters conceptually for algorithm portfolios: there need not be one universal reconstruction method that becomes best after every critical decision.

A residual can therefore be near a **portfolio of tractable regimes**, not one regime.

This is a possible theoretical bridge between structural residual diagnosis and heterogeneous solver/operator selection.

---

## 7. UNSAT cores, MCSs, and diagnosis as repair structure

The earlier certificate report established the definitions; the repair/diagnosis literature sharpens their roles.

### UNSAT core
A subset of assumptions/constraints already sufficient for inconsistency.

This answers:

> Which preserved commitments participate in at least one sufficient explanation of failure?

### MUS
A subset-minimal unsatisfiable core: removing any member makes that particular subset satisfiable.

This does **not** mean minimum-cardinality or uniquely causal.

### MCS
A minimal correction set: removing that set restores satisfiability, and no proper subset does.

This is much closer to the repair question:

> What must be relaxed so that some feasible reconstruction becomes possible?

### Diagnosis/hitting-set view

With multiple incomparable conflicts, valid diagnoses correspond to hitting sets over conflict sets. There may be many possible repairs.

Weighted/min-cost variants express different costs for relaxing different commitments.

This formalizes the difference between:

- explaining failure;
- locating one minimal conflict;
- identifying a feasible repair set;
- choosing the cheapest/least disruptive repair.

---

## 8. Core-guided unrefinement

Plan-repair literature asks what should be reopened. Core/MCS literature gives a principled external method for reasoning about that question when a frozen residual can be encoded under assumptions.

A possible diagnostic loop is conceptually:

1. freeze incumbent commitments as assumptions;
2. ask an exact residual solver for satisfiability;
3. if UNSAT, obtain a core over frozen assumptions;
4. optionally shrink/analyze multiple cores;
5. derive candidate correction sets/diagnoses;
6. use those only as evidence about which frozen decisions block every represented repair.

This is substantially sharper than geometric rollback distance.

### Guardrails

- one core is not the unique cause;
- an MUS is not necessarily the smallest edit;
- MCS enumeration/minimum-cost diagnosis can be expensive;
- the encoding must be exact for any hard conclusion;
- an offline diagnosis is not automatically a cheap runtime destroy operator.

---

## 9. CEGAR + cores + interpolation: one proof can serve several research roles

These literatures interact more strongly than their names suggest.

An exact model rejects a proposed continuation or coarse equivalence.

From that failure one can derive:

- a **core**: which assumptions suffice for contradiction;
- an **MCS/diagnosis**: what assumptions could be relaxed to restore feasibility;
- an **interpolant/predicate**: what shared-boundary distinction is sufficient to exclude the false continuation;
- a **CEGAR refinement**: what field/predicate the abstraction should add so the spurious future no longer appears.

Thus one exact failure can potentially inform:

- learned failure;
- repair unrefinement;
- future-interface refinement;
- counterexample generation for approximate caching/beam descriptors.

This is a central third-wave cross-pollination result.

---

## 10. Backdoors + repair + reconstructability

Backdoor theory suggests a more precise interpretation of “repair-hostile but feasible.”

A residual may be hostile because:

- its feasible basin is narrow;
- its interface width is high;
- it contains a small but difficult adaptive backdoor that random reconstruction rarely guesses correctly;
- it is far from every tractable residual class available to the reconstructor.

This implies that repair difficulty is not one-dimensional.

A backdoor-like descriptor would be most useful as an offline structural label or predictor unless its tractable target class and detection method are proven cheap.

---

## 11. Pathfinder-facing implications, not implementation instructions

**Residual-interface discovery:** CEGAR gives a principled alternative to broad manual feature search. A candidate interface can begin deliberately coarse and be falsified/refined with exact counterexamples.

**Reference model:** use exact solving not only to label live/dead prefixes but to generate distinguishing counterexamples, cores, or proof predicates for proposed abstractions.

**Repair:** core/MCS analysis is a stronger offline way to ask “what must reopen?” than rollback distance alone.

**Beam/context caching:** if a proposed future signature merges states whose exact continuations differ, CEGAR-style counterexamples can identify missing distinctions before production integration.

**Basin/reconstructability:** record interface width, basin width, and distance/backdoor-to-tractability as distinct explanatory concepts.

**Scheduling:** heterogeneous backdoors provide an external theoretical reason why different residual states may become easy for different solver families, but dynamic routing remains downstream of current scheduler gates.

---

## 12. What this literature does not establish

It does not establish that:

- Pathfinder has small useful backdoors;
- a natural Horn/Krom/acyclic target class exists for its residual constraints;
- CP-SAT can cheaply produce useful assumption cores for current prefix models;
- interpolants from a chosen encoding will correspond to simple runtime descriptors;
- automated CEGAR will outperform hand-picked small diagnostic descriptors;
- MCS-guided repair is cheaper than ordinary dependency/rollback heuristics;
- exact interface refinement should happen online.

These are project-specific empirical questions.

---

## Selected sources

- Jendrik Seipp, Malte Helmert, **Counterexample-guided Cartesian Abstraction Refinement**, ICAPS 2013.
- Speck, Seipp and collaborators, **New Refinement Strategies for Cartesian Abstractions**, ICAPS 2022 and subsequent regression/sequence-flaw refinement work.
- Thomas A. Henzinger, Ranjit Jhala, Rupak Majumdar, Kenneth L. McMillan, **Abstractions from Proofs**.
- Russian ISP RAS literature on CEGAR and Craig interpolation for software model checking.
- Jan Dreier, Sebastian Ordyniak, Stefan Szeider, **SAT Backdoors: Depth Beats Size**, Journal of Computer and System Sciences, 2024.
- 2026 backdoor survey covering size, depth, and treewidth parameters.
- Narodytska et al., core-guided minimal correction / inconsistency algorithms, IJCAI 2018.
- CSP backdoor research on structural/treewidth and heterogeneous backdoors.

## Bottom line

The third-wave abstraction literature adds a process rather than another static feature list:

`coarse abstraction -> exact counterexample -> proof/core -> targeted refinement`.

Backdoor depth adds a separate notion of residual difficulty: adaptive distance to a tractable regime. Core/MCS machinery separates failure explanation from the decisions that must actually be relaxed.

Together these concepts turn the residual-interface hypothesis from “find a good descriptor” into a richer research program about **discovering, falsifying, refining, and exploiting the smallest future-relevant structure**.