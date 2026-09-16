# Level-blindness overshoot architecture audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — current authorities, solver architecture, archaeology, H1 lineage, and topology successor review.
> **Decision:** the cold-solve invariant is sound, but prior wording and research habits overshot it by conflating specificity with historical provenance. Production may derive arbitrarily specific current-instance facts; historical exact-level knowledge remains forbidden.
> **Remaining gate:** none for the conceptual correction. Individual mechanisms still require their own soundness, evidence, and economics gates.

## Bottom line

**Level-blindness constrains provenance, not specificity.** A cold production solve may derive exact, unique, per-instance information from the current puzzle and current invocation. The procedure may generalize even when the proof, conflict, topology state, decomposition, canonical form, exact query answer, or search plan it produces is unique to one level.

The forbidden boundary is prior exact-level knowledge: saved solutions/hints/witnesses, historical outcomes/costs, corpus identity or position, provenance, known winners/configs/seeds, persistent state from earlier invocations, capability-memory membership, and historical identity/family lookup.

The correction enlarges the legal design space without weakening the cold-solve contract.

## Confirmed overshoots

1. **Cache vocabulary.** `per-level cache` and `exact-level cache` were easy to read as banning any solve-local cache. The intended prohibition is persistent historical exact-level state surviving an earlier invocation. Current-invocation experience caches are legal in principle, and current-invocation proof-bearing facts/conflicts are legal when their semantics are sound enough for the consumer.
2. **Recurrence as a universal gate.** Cross-parent recurrence is appropriate when the candidate is one fixed reusable descriptor or predicate. It is not a legality requirement for a generic algorithm that derives a fresh proof, conflict, topology relation, obligation order, decomposition, or exact answer on each unseen puzzle.
3. **Coarse routing mistaken for the invariant.** Production currently relies heavily on a small feature vector and fixed attempt menu. Level-blindness does not require coarse scalar inputs. Exact mechanics-derived graph structure, separators, topology, canonical forms, feasibility relations, and per-instance search planning are legal current-input tools.
4. **Exact computation culturally treated as oracle-only.** Historical exact labels and witnesses remain offline-only. Offline exact research and online exact current-state computation are separate categories. A bounded production exact query is legal if it consumes only current legal inputs; soundness and economics decide whether it should ship.
5. **Experimental controls mistaken for production limits.** H1's frozen event vocabulary, nomination rules, and recurrence thresholds protect inference for that experiment. They do not define what a future runtime procedure may derive from an unseen current puzzle.
6. **High-dimensional keys mistaken for historical identity.** A mechanics-derived key may uniquely characterize the current puzzle and still be legal. The illegal step is joining it to historical exact-level/family outcomes or replay policy. Current-invocation canonicalization, symmetry, transposition, or memoization remains legal if the asserted equivalence is sound.

## Existing architecture already supports the broader interpretation

Pathfinder already contains proof-style lower bounds/deadlock checks that derive hard current-state facts, bounded exact current-level editor analysis, solve-lifetime shared preparation/state, and current-invocation experience caching. These are existence proofs that strong current-instance reasoning is compatible with a cold level-blind solver.

The important separation is three-dimensional:

- **Legality:** does the mechanism use only current puzzle/current invocation inputs rather than historical identity or outcomes?
- **Soundness:** is the derived fact strong enough for the action taken, especially hard pruning/equivalence?
- **Economics:** does construction, maintenance, and lookup save enough work or add enough capability to justify itself?

A mechanism can be legal but unsound or uneconomic. Neither failure implies that level-blindness forbids the mechanism class.

## Research implications

### Solve-local proof memory

A future invocation-local store may retain sound bounds, impossibility facts, conflicts, separator contracts, canonical equivalences, exact subproblem answers, or other typed facts. Before building a general store, measure whether expensive sound facts are actually rediscovered across attempts/stages and whether a consumer can reuse them safely.

### Opportunistic exactification

A generic production solver may switch to a bounded complete residual method when current-state tractability is favorable. Candidate triggers include small remaining volume/length, collapsed branch factor, few unresolved obligations, low separator/interface width, or a tiny local order/matching/flow problem. The useful contract is SAT/witness, UNSAT/proof fact, or UNKNOWN/budget exhausted. Promotion depends on exact-query cost versus work avoided or solves gained.

### Heuristic-to-theorem audit

Existing soft reasoning should be checked for identifiable subdomains where a sound theorem supports a prune, forced move, lower bound, decomposition, or exact-mode switch. Portal/flipper parity and order, must-cross interfaces, intersection arithmetic, must-turn geometry, component capacity, landmarks, and finish conditions are natural targets.

### Structural preprocessing and canonicalization

Current-input graph analysis, separators, component/interface constraints, symmetry, canonical forms, and transposition keys are legal even when board-specific. Advance only after a sound relation is identified and construction/reuse economics are measured.

### Per-level search-plan compilation

A generic analyzer may eventually compile a bespoke search plan from the current puzzle. The plan may be unique; the compiler is the general capability. This is a later amplifier and is not an immediate build target.

### Online conflicts and DEAD cores

Keep two hypotheses distinct:

- reusable compact DEAD relations, which require recurrence/independent confirmation;
- generic per-instance conflict/core derivation, whose individual outputs may differ on every level but may still provide solve-local value.

A recurrence null closes the first route, not automatically the second.

## Queue interpretation

The frozen H1 prespec remains historically valid and must not be rewritten. Its recurrence threshold answers whether that experiment found a reusable compact relation. If no such relation is found, a separate bounded per-instance exact-query route remains conceptually open if the answers are decision-useful and economical.

Likewise, minimum-relaxation/DEAD-core work should report both recurring cores suitable for reusable abstraction and useful per-instance core extraction suitable for solve-local conflict learning.

Open-path topology should not be constrained to finding one compact generic puncture-side descriptor. A reusable descriptor is one valid successor; a generic current-input topology procedure producing board-specific winding/phase, separator-side, region-accessibility, canonicalization, or exact-impossibility facts is another. Raw phase itself is not thereby promoted to production.

## Historical reinterpretation

The corrected boundary materially changes how several archaeology lines are read:

- arbitrary-target constrained feasibility can be a bounded current-input research query and potentially later production query, rather than being disfavored merely for exactness;
- future-intersection commitments may support either recurring abstractions or board-specific exact feasibility;
- learned conflicts/nogoods can be valuable solve-locally without cross-level clause recurrence;
- partial-order/commutativity may be queried per instance rather than requiring one universal reusable relation;
- topology/homotopy can produce board-specific state while still being level-blind;
- cross-attempt knowledge reuse is legal within one invocation if the facts are typed and sound enough;
- forced-chain reasoning remains legal current-state reasoning, with economics and preservation of underlying transition semantics as the real gates.

## Recommended bounded preparation

The audit earns documentation and queue corrections, not a new solver framework. Appropriate next preparation consists of:

- a heuristic-to-theorem subdomain audit;
- bounded exact residual-query pilots only when an earned question provides a target;
- solve-local rediscovery measurement before any general knowledge store;
- per-instance conflict/core derivation after a sound bounded procedure exists;
- mechanics-derived canonicalization/symmetry/transposition only with an explicit equivalence contract;
- structural graph preprocessing only after prevalence/cost evidence;
- per-level search-plan compilation only after complementary architectures expose predictable current-input niches.

No production exact solver, topology-aware search architecture, conflict-learning engine, blackboard, SAT/CSP integration, or per-level compiler is earned by this audit alone.

## Decision

The repository should use the following formulation as the default interpretation:

> **Specific to this level is legal. Known about this level from before is not.**

And, for research design:

> **The procedure may generalize even when the derived fact is unique to one level.**

Current execution priority remains owned by `docs/solver-optimization-workstreams.md`. This audit changes the legal design space and interpretation of nulls; it does not independently reorder the research program.
