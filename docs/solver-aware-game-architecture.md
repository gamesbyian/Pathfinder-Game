# Solver-aware game architecture and rule alignment

> **Status:** current architectural contract. The 2026 investigation/campaign narrative is preserved at [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md).
> **Current solver priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

This document records the durable architectural lessons from the solver-aware game/rule investigations. It is not a backlog and should not accumulate run chronology.

## Core semantic rule

Pathfinder is history-sensitive. Two paths at the same cell with the same length and intersection count can have different legal futures because their histories differ in visited cells, used axes, portal/flipper state, incoming direction, or satisfied obligations.

Any cache, deduplication key, transposition table, oracle abstraction, or state comparison must answer:

> Which state fields are sufficient to prove that the two histories have the same relevant future?

Do not infer that a compact key is sound because it correlates with future behavior. Prove the represented equivalence, then measure whether exploiting it is economically useful.

## State identity versus useful coarse grouping

General fully-sound transposition caching has already been measured and is not a fresh opportunity. A sound DFS state signature found far fewer revisits than a crude signature and was costly to compute. Realistic exact MITM frontiers likewise remained enormous. Reopen only with materially new evidence, such as a much cheaper sound incremental identity.

Beam deduplication is deliberately different. The production beam groups candidates coarsely to manage width/diversity; the grouping is **not** a claim that the underlying histories have identical futures. Removing it cost solves. The old fixed-width bit packing was separately unsafe when mechanic cardinalities increased, so the grouping key was changed to a collision-free delimited representation of its intended fields without making the grouping more semantically exact.

Consequences:

- do not replace the coarse beam grouping with a fully sound identity merely for conceptual neatness;
- do not use the coarse grouping as proof that two states are interchangeable;
- do not encode mechanic fields into fixed-width slots unless current enforced cardinality makes the width provably sufficient;
- benchmark representation changes rather than assuming compactness is faster.

Detailed measurements are in `reports/2026-08-06-beam-state-dedup-sound-signature-audit.md` and the archived campaign document above.

## Mechanic state contracts

[`mechanic-state-contracts.md`](mechanic-state-contracts.md) is the current per-mechanic state/reference contract. New mechanics and changes to existing ones should explicitly state:

- state cardinality and enforced limits;
- whether state is monotonic;
- whether it affects move legality, connectivity, or the win condition;
- whether incoming direction matters;
- whether different histories can merge again;
- exact/relaxed/unsupported status in external models;
- which caches, keys, snapshots, telemetry, and worker messages must include the state.

The schema currently rejects more than 30 must-pass, must-cross, surround, must-turn, or adjacent-turn objects because the solver's initial masks rely on the safe range of the JavaScript bit-mask representation. If a cap changes, audit every consumer rather than updating only the generator/schema.

## Independent rule implementations must be compared

Move legality and win semantics intentionally exist in several places:

- live/domain move rules;
- the candidate-path referee;
- solver move generation/state transitions;
- an independent solver oracle used for differential checking.

Previous read-throughs missed real drift. The 2026 alignment investigation found and fixed live-play/referee differences involving flipping-filter entry axis, the pending must-cross straight-through lock, and must-turn win-metric handling.

The durable safeguard is differential execution. `scripts/solver-oracle/fuzz.mjs` cross-checks the independent oracle, production solver move generation, and `isValidMove` under the appropriate move context. Preserve the oracle's implementation independence: sharing solver implementation merely to create a common compiled graph would weaken the test.

## Flipping-filter contract

Flipping filters are single-use. Their effective orientation is coupled to the level-wide order in which distinct flippers are crossed. That global crossing-order parity is intentional game design, not accidental solver entanglement.

Do not reopen a per-filter successive-use interpretation without a game-rule change; single-use means such a local toggle would never toggle.

## Stress envelopes are intentionally different

The hard stress generator deliberately exceeds several published-game mechanic maxima. This is useful because it prevents research from fitting only the shipped envelope, but it means Corpus 2 is not a proxy for "levels players will see."

Use the separately generated in-envelope stress stratum when the question is transfer to current game limits. Keep both populations: one tests the player envelope, the other tests robustness beyond it.

See [`../data/stress/README.md`](../data/stress/README.md) for current corpus contracts and provenance.

## Generation history is evidence, not capability input

Procedural generation may know a witness path, parent family, mutation/symmetry history, intended region, or construction order. Preserve this as provenance because it is useful for:

- family/variant analysis;
- diagnostics and benchmark selection;
- hint diversification;
- offline labels for routing/scoring research;
- choosing expensive oracle/reducer targets.

It must not become hidden exact-level guidance in a cold production solve. See [`solver-level-blindness.md`](solver-level-blindness.md) and [`variant-level-research.md`](variant-level-research.md).

## Shared compiled graph: reopen only for a real consumer

A domain-owned compiled puzzle graph could reduce semantic duplication across editor validation, procedural generation, solver prep, or external models. The obvious first consumers did not justify it: the independent oracle should not share solver implementation, and the editor lacked a low-risk extraction point.

Do not build a common graph as architecture housekeeping. Revisit when a concrete new consumer would remove duplicated semantics without weakening independence, and keep solver-specific typed/hot-path structures layered above it.

## Future mechanic design checklist

Before shipping a mechanic, answer:

1. What history does it add, and is that history bounded and explicit?
2. Is its state local, global, per object, or ordered across objects?
3. When can two histories safely merge again?
4. Does it change topology, transition legality, or only the win condition?
5. Does incoming direction matter?
6. Can the reference/oracle models represent it exactly? If not, what relaxation is safe?
7. What cardinality limits are required by packed/masked representations?
8. Which provenance and telemetry fields are needed to compare solver behavior?
9. Which independent rule implementations need matching tests?
10. Does a solver-friendly reformulation preserve the intended player-facing rule exactly?

Rich finite-state mechanics are not a problem by themselves. Hidden or unbounded history and unenforced representation assumptions are.

## Non-goals

- Do not make gameplay depend on solver hot-path code or browser/controller machinery leak into the solver core.
- Do not treat advisory topology/region facts as hard prunes without proof.
- Do not count construction-guided, hint-guided, or family-history-guided solving as cold capability.
- Do not redesign a player-facing rule solely for solver convenience unless the formulations are genuinely equivalent.
- Do not infer that independent rule implementations agree because each looks locally plausible. Differentially test them.

Unranked research descendants from the original campaign are retained in [`future-work.md`](future-work.md); completed measurements and reasoning remain in the frozen snapshot and dated reports.
