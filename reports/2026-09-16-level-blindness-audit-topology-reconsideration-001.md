# Level-blindness audit topology reconsideration 001

> **Status:** concluded-positive addendum
> **Date:** 2026-09-16
> **Parent audit:** `reports/2026-09-16-level-blindness-overshoot-architecture-audit-001.md`
> **New evidence:** open PR #1821, `Execute Class-5 controlled open-path topology fork pilot: premise earned`, head `a22edf2ee36370a10ceb6299a9f965925dc48ad3`, based on main `9216c0b`.
> **Decision:** no core finding from the level-blindness audit is retracted. The new topology result strengthens the audit's central distinction and changes the acquisition ranking: open-path topology/path-history representation is now the first premise-earned avenue, ahead of still-unexecuted H1 event feasibility. The successor must not be restricted to discovering one compact cross-level descriptor; a generic per-instance topology procedure is also a legal production candidate.

## What changed

The original audit was conducted against current main `9216c0b`. Main remains at that commit, so no merged code or authority change invalidates the audit.

PR #1821 adds genuinely new decision-bearing evidence. Its controlled fork experiment constructed same-board, same-endpoint, same-length prefix pairs from published human/editor parents before exact labelling, matched current mechanic-progress bookkeeping, and then exact-labelled both branches. The result is four exact LIVE/DEAD-discordant pairs across two independent parent families (`P00124`, `P00137`). In every discordant pair, the two prefixes are phase-distinct by one full turn around a single board puncture while matching the experiment's non-history controls.

This establishes, on the tested construction, that current path history contains completion-relevant topological information that is not captured by the ordinary matched mechanic-progress state used by the experiment.

The result does **not** establish a production feature, prevalence on the residual population, or an economic win. It does establish the missing-information premise strongly enough to earn a microscope/runtime-representation investigation.

## Why this strengthens the level-blindness audit

The topology signal is derived entirely from the current board and current prefix. No historical level identity, prior witness, stored winner, corpus position, provenance lookup, or previous solve state is required by a runtime implementation.

Therefore the new evidence is a concrete example of the audit's central rule:

> **Level-blindness constrains provenance, not specificity.**

A solver may know which side of this level's obstacle its current path has passed, or compute a current-level topological class/signature, because that information is produced from the puzzle it is presently solving.

The experiment also strengthens the audit's second key rule:

> **The procedure must generalize; the fact it derives need not recur in the same semantic form across levels.**

A future production mechanism need not prove that the exact same puncture-side relation occurs on many unrelated boards before current-instance topology is considered legal or architecturally legitimate. Cross-parent recurrence remains important when the candidate is a fixed reusable descriptor or routing rule. It is not a universal prerequisite for a generic topology algorithm whose output is board-specific.

## Reconsideration of the proposed successor

PR #1821 proposes a new successor question, `WS2-OPEN-PATH-TOPOLOGY-DESCRIPTOR`, asking for a compact generic runtime-legal descriptor of which side of a nearby puncture the path committed to before a solver-facing pilot.

That is a valid research branch, but it is too narrow as the only branch.

Two production hypotheses should now be kept distinct.

### Route A: compact reusable descriptor

Ask whether a small invariant summary, such as a puncture-side/topological commitment bit or low-dimensional signature, predicts future completion across independent parents and can be maintained cheaply enough for retention, scoring, routing, or pruning.

This route properly requires cross-parent recurrence and independent confirmation because the candidate is a reusable fixed abstraction.

### Route B: generic per-instance topological reasoning

Ask whether one generic current-input algorithm can derive useful topology facts separately for each unseen level/state, even when the particular punctures, classes, constraints, or resulting facts differ from board to board.

Possible outputs include:

- winding/lifted phase relative to current board obstacle components;
- side-of-separator commitments;
- homotopy-like/current-prefix equivalence classes;
- region accessibility conditioned on the already-drawn path;
- proof that an obligation lies outside the remaining reachable topological regime;
- topology-aware beam retention or canonicalization;
- exact or admissible topological completion constraints;
- topology-derived decomposition/interface contracts.

The individual output need not recur across levels. The generic algorithm and its demonstrated value must generalize.

A null on Route A must therefore not automatically close Route B.

## Updated solve-acquisition ranking

For near-term solve acquisition, the audit's ranking is revised to:

1. **Open-path topology / path-history representation.** Premise now earned by exact LIVE/DEAD controlled contrasts. Next work should microscope the first-loss mechanism and compare the smallest useful representation family, including compact reusable descriptors and richer generic per-instance topology.
2. **H1 exact per-instance event feasibility / completion regimes.** Still the strongest independent premise and still worth executing as frozen. Preserve both interpretation routes: recurring reusable relations and decision-useful per-instance exact answers.
3. **Per-instance DEAD-core/conflict learning.** Especially attractive if topology/H1 expose exact obstructions that can be retained within the invocation.
4. **Opportunistic exact residual solving.** Switch to a bounded complete method when current residual tractability makes exactification cheaper than continued heuristic search.
5. **Heuristic-to-theorem subdomain audit.** Systematically seek sound exact regimes inside existing parity, flipper, must-cross, landmark, intersection, and topology guidance.

This changes priority based on evidence maturity, not architectural novelty. H1 remains independent and should not be blocked by topology microscope work if both can proceed economically.

## Recommended topology microscope questions

The next topology pass should not jump directly to production routing. It should determine what information the earned contrast is actually exposing.

Highest-value questions:

1. Where is the first state at which the LIVE and DEAD branches become distinguishable by an exact completion model?
2. Is the decisive property really raw lifted phase, a side-of-puncture relation, a separator/region commitment, or a downstream reachability/order consequence caused by that topological choice?
3. Can the distinction be represented by a small invariant under harmless path deformations, coordinate/gauge choices, and equivalent obstacle representations?
4. Does a richer current-instance topology representation predict exact completion when no single compact cross-level descriptor does?
5. Can topology produce a **sound** action, not just correlation: prune, mandatory interface/order relation, retention class, lower bound, or exact residual decomposition?
6. What is the incremental runtime cost of maintaining/querying the representation, and can it be restricted to states/levels where the topology is informative?

The microscope should explicitly compare Route A and Route B rather than presupposing that compression is necessary before any runtime-facing experiment.

## Boundary that remains unchanged

Nothing here licenses raw phase coordinates as an immediate production heuristic.

A solver-facing treatment still needs:

- legal current-input derivation;
- coordinate/gauge/invariance discipline;
- sound semantics appropriate to its use, or explicit classification as soft guidance;
- prospective evidence away from the exact cases that nominated it;
- bounded work/economic accounting;
- referee/correctness protection for any mechanism capable of pruning.

The correction is narrower: **compactness and semantic recurrence are research/economic advantages, not level-blindness requirements.**

## Documentation consequence

Current authorities should preserve both topology descendants:

- compact reusable topology descriptor;
- generic per-instance topology reasoning/representation.

The first earns promotion through recurring predictive structure. The second earns promotion through a generic derivation procedure whose board-specific outputs improve solve capability or work across independent evaluation levels.

This is exactly the category distinction the parent audit was intended to protect.