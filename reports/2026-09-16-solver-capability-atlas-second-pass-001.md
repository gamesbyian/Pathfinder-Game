# Solver capability atlas second-pass investigation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — current solver capability atlas, level-blindness overshoot audit, solver archaeology register, learned-failure certificate audit, connectivity-rejection Stage B, current solver state/memory architecture, and open separator census PR #1827.
> **Decision:** preserve a new stop-condition-reconciliation layer and a bounded solve-local fact-rediscovery preflight. Several historical negatives close reusable cross-level descriptors or dirty implementations, not the underlying per-instance reasoning capability. No production mechanism or live priority is promoted by this report.
> **Remaining gate:** active execution priority remains `docs/solver-optimization-workstreams.md`; the newly designed rediscovery study runs only when it does not displace higher-value active premise acquisition or when existing retained evidence can answer Phase 0 cheaply.

## Question

The first capability-atlas pass asked:

> What semantic operations can the solver perform, and which Pathfinder demands lack adequate machinery?

This second pass asks a different question:

> **Where might the first atlas still be underestimating available premises because historical experiment stop conditions were narrower than the semantic capability they came to represent?**

The pass intentionally searches for false closure, hidden interaction among gap classes, and evidence already present in archaeology that can sharpen the atlas without inventing new algorithms.

## Method

The investigation used five steps.

1. Re-read the atlas as a set of semantic gaps rather than proposed architectures.
2. Inspect historical lines associated with those gaps, especially their actual stop conditions.
3. Reconcile each stop condition against the 2026-09-16 rule that level-blindness constrains provenance, not specificity.
4. Separate cleanly closed implementations/descriptors from unresolved generic per-instance procedures.
5. Design the cheapest observational study for the strongest genuinely changed premise.

The pass did **not** reinterpret every negative as open. The burden was to identify a material mismatch between the question historically answered and the semantic capability question now being asked.

## Finding 1: the atlas needs a stop-condition layer

Historical solver reports use “negative,” “closed,” “reverted,” “null,” and similar language for several scientifically different situations:

- a clean matched-work implementation loss;
- a reusable descriptor that did not recur;
- a treatment that never actually participated;
- a dirty revert with no causal verdict;
- a tiny population that ran out;
- a mechanism that works but costs too much;
- a semantic proposition directly contradicted by exact evidence.

Those dispositions cannot safely be projected onto the capability atlas as one scalar “tested already.”

The new `docs/solver-capability-gap-stop-condition-reconciliation.md` records a durable taxonomy and crosswalk.

## Finding 2: solve-local failure reuse was historically stopped for the wrong *new* question

The strongest concrete discovery comes from the August learned-failure line.

The Stage-B connectivity audit found, within the dominant `goal`-unreachable/no-pending-obligation cluster:

- 7,934 distinct exact-state fingerprints;
- 3,661 distinct reached-set shapes;
- 52.6% of records shared an exact-state fingerprint with another record;
- **83.1%** shared a reached-set shape;
- **82.2%** shared a normalized boundary-blocker set.

That is substantial abstraction beyond literal exact-state recurrence.

The line was still closed because only 8.8% of records belonged to shapes spanning more than one level and only 1.9% of distinct shapes crossed level boundaries. Under the experiment's original goal — a reusable **cross-level** bounded connectivity reason checker — that was a correct stop.

But the same report explicitly noted that most recurrence was **within one solve**, across different search states, and left a per-solve memo/certificate hypothesis unscoped.

The newer level-blindness contract changes the interpretation of that residue. A generic procedure that derives and reuses board-specific facts during one cold invocation does not require the same fact to recur on other levels.

Therefore:

- cross-level connectivity reason reuse remains closed;
- a solve-local current-instance certificate/reuse premise is newly well-formed;
- the old Stage-B recurrence is a nomination, not proof of sound reuse or economics.

This is a real changed premise, not semantic relabelling.

## Finding 3: the useful “memory gap” is even narrower than the first atlas stated

The first atlas correctly noted that repair already has experience memory. This pass sharpens the missing operation again.

Pathfinder already has at least three memory semantics:

1. **experience memory** — repair nogood cache remembers that one previous stochastic continuation from a detailed state signature failed;
2. **sound projected numeric memoization** — MustPass/MustCross lower-bound caches memoize admissible values under declared dependency keys;
3. **direct sound predicates** — many current facts are cheap enough that storing them is pointless.

So the missing capability should not be phrased as “failure learning” generically.

The sharper question is:

> **Can the solver derive a sound or typed current-instance fact whose dependency/certificate projection is cheaper than re-derivation and broad enough to be reused by another branch, attempt, or stage?**

That definition separates logical reuse from repair experience and directly implies the new preflight's soundness classes.

## Finding 4: several archaeology lines are instances of one per-instance relational-query gap

The archaeology register contains multiple apparently separate unfinished ideas:

- completion-regime feasibility;
- future intersection commitments;
- residual-interface commutativity;
- arbitrary-target constrained feasibility;
- topology-conditioned accessibility;
- separator/interface compatibility.

At the capability level, these can be unified without pretending their mechanics are identical.

They all ask for a bounded current-state relation of the form:

> **Does some future completion satisfying relation R exist from this current state?**

Examples include “completion through this interface,” “both obligations in either order,” “some realization of these future crossing commitments,” or “these excursions commute while preserving future-relevant state.”

The first atlas called this joint-feasibility reasoning. The second pass finds historical instrumentation ancestry for it: the March arbitrary-target feasibility primitive was a dirty revert rather than a negative, and the intersection-blueprint lineage suffered participation/control-plane failure rather than a clean premise test.

This strengthens the case for treating a **bounded per-instance relational query** as a reusable research instrument when an active microscope earns a concrete question. It does not earn a general exact solver or production SAT layer.

## Finding 5: commutativity is a composition gap, not a gadget-library question

The old residual-interface work found very few reusable cross-level detour motifs. That correctly weakens a generic reusable gadget library.

But the original partial-order question was never actually answered. The tooling's `commutingCandidate` flag only noticed reordered obligation multisets; it did not swap/replay the excursions and test legality, future-state equivalence, exact completion feasibility, topology, or work.

Under the atlas this becomes a clean **COMPOSITION** question:

> when two local operations appear independent, can the solver prove they are interchangeable for the future-relevant state?

A fixed reusable commutativity rule needs recurrence. A generic exact/replay query does not need the same relation on every level.

This is preserved as an unresolved line, not promoted.

## Finding 6: future-intersection planning has weaker negative evidence than its historical reputation suggests

The historical Intersection Opportunity Graph / blueprint line sounds heavily tested when summarized at a distance, but archaeology shows two separate contamination modes:

- an early bundle contained a hard bound with admitted false positives and was quickly reverted;
- the later blueprint mechanism was silently disabled by missing option transport, then later participated only inside a broader stack that caused runtime explosion and was reverted/disabled.

No clean matched-work enabled A/B was found for the semantic premise.

The surviving premise is smaller:

> states with equal scalar intersection deficit may differ in which future crossing assignments remain realizable.

This maps directly to the atlas's joint-feasibility/composition gap and can be tested observationally on exact-labelled siblings without restoring blueprint search.

## Finding 7: selective revision has an archaeological causal-interface precursor

The first atlas identified selective commitment revision as a major gap. The archaeology supplies a more precise experimental ancestor.

Broad prefix-local repair was tested and lost. But later exact repair-retreat work showed that path-distance rollback is a poor proxy for true repair locality: some supported elites could be repaired after only 1–2 rollback steps despite much larger known-solution divergence, while other cases implicated earlier commitments.

The unattempted descent-aware observer was designed to ask which future-relevant commitments change between dead near-misses and rescuing continuations: turn choices, crossing axes, portal use, topology/separators, obligation order, and coupled path history.

Therefore the surviving revision premise is **dependency-defined causal locality**, not “roll back farther” or “try LNS.”

This gives the atlas's REVISION gap a concrete falsifier: show that a small causal interface exists before implementing a revision operator.

## Finding 8: the separation between semantic gap and exposure gap remains essential

The second pass found several historical control-plane failures: missing option propagation, broken policy identity transport, stale lifecycle attribution, and absent exact-action dose.

These are not capability negatives.

The atlas's **EXPOSURE** category should continue to absorb:

- treatment never invoked;
- nominal stage reached but target action got zero/unknown work;
- observer identity corrupted;
- intended configuration lost in transport;
- work displacement made the intended treatment incomparable.

This prevents scientific debt from being converted into imaginary architectural closure.

## Designed follow-up: solve-local fact rediscovery

The newly added `docs/solver-solve-local-rediscovery-preflight.md` is the concrete implementation product of this pass.

It deliberately begins with retained evidence rather than code changes.

### Phase 0

Rejoin the retained August connectivity records and any current attempt/lifecycle evidence to ask:

- does recurrence cross action/stage boundaries inside one invocation?
- how much recurrence exceeds literal exact-state repetition?
- how far apart in canonical work are derivation and potential reuse?
- can a candidate fact be selected/validated without recomputing the expensive analysis?

The last question is critical. A reached-set fingerprint is useless as a cache lookup key if obtaining it already requires the flood fill being avoided.

### Phase 1

Only if retained evidence earns it, add a bounded observational seam to a small current residual cohort. No behavior change.

### Reuse semantics

The preflight distinguishes:

- exact dependency memo;
- sufficient certificate;
- monotone certificate;
- experience-only memory;
- correlated signature.

A consumer must match the fact's semantics. Experience memory may guide incomplete exploration; it cannot become a hard prune merely because recurrence is high.

## Why a general blackboard is still not earned

The second pass finds stronger support for within-invocation reuse, but not for infrastructure-first implementation.

A cooperative blackboard remains deferred because the evidence requirement should be:

> one specific producer repeatedly computes one typed fact that one specific consumer can reuse safely and economically.

Only after one such handoff works should a generic shared architecture be discussed.

## Interaction with PR #1827

The still-open separator census reports 121/390 Class-5 levels with a balanced static/mechanic-aware separator of width <=4 and defers path-history-conditioned separators/interface contract size to the fresh sibling asset.

This result is complementary to the second pass but remains pending until merged.

If it lands as reported, it strengthens two atlas questions:

1. **decomposition prevalence:** low-width static/mechanic-aware interfaces are not vanishingly rare;
2. **fact reuse:** region/interface contracts become a plausible future fact class to test for solve-local rediscovery once a sound contract is actually defined.

It still does not prove that interface state stays compact after path-history/topology dependencies are included.

## Resulting premise map

The pass leaves four especially coherent semantic lines.

### A. Per-instance relational feasibility

Question: can the solver answer one bounded future relation from the current state?

Historical ancestry: H1, arbitrary-target feasibility, intersection commitments, commutativity, topology, separator contracts.

Needed evidence: decision-bearing exact siblings/current-state queries and bounded economics.

### B. Solve-local typed fact reuse

Question: does one invocation repeatedly derive an expensive fact that can be reused under a sound cheaper key/certificate?

Historical ancestry: connectivity Stage B, lower-bound memoization, repair experience memory, cross-attempt overlap.

Needed evidence: Phase-0 retained-data rejoin, then bounded observer if earned.

### C. Dependency-defined causal revision

Question: is failure often attributable to a compact earlier commitment interface that can be changed without destroying unrelated useful structure?

Historical ancestry: repair retreat, positional repair negative, unattempted descent observer, DEAD cores.

Needed evidence: exact dead/rescuing pairs and causal-interface size/stability.

### D. Region/interface composition

Question: can local subproblem possibilities be summarized by compact contracts and composed?

Historical ancestry: separator spectrum, topology, residual interfaces, moonshot decomposition.

Needed evidence: separator prevalence plus contract-state size and history dependence.

These are related but not interchangeable. A positive in one does not automatically earn another.

## What this pass did not reopen

The pass explicitly preserves closure of:

- the tested H1 universal event descriptor vocabulary;
- generic cross-level connectivity reason reuse;
- generic reusable detour-gadget libraries;
- broad positional elite-prefix repair;
- naive exact transposition and measured full MITM forms;
- broad scorer/width/retry forms already cleanly negative elsewhere.

The point is narrower closure, not more optimism.

## Repository changes

This pass adds:

- `docs/solver-capability-gap-stop-condition-reconciliation.md` — durable stop-condition taxonomy and historical crosswalk;
- `docs/solver-solve-local-rediscovery-preflight.md` — bounded investigation design for the strongest changed premise;
- this dated report.

It intentionally does **not** edit the live workstream authority, implement solver behavior, or launch compute.

## Decision

The first atlas's main conclusion survives, but the second pass changes how premise scarcity should be interpreted.

The repo is not merely running out of untried heuristics. It also contains **scientific premises hidden behind experiment-specific stop conditions**. The most productive next investigations should therefore ask two questions in sequence:

1. did old evidence close the semantic operation, or only one reusable descriptor/implementation/generalization form?
2. if a per-instance route survives, what is the cheapest observation that can prove it matters before architecture is built?

That is now the recommended archaeology discipline for capability acquisition.
