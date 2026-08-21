# Solver-aware game architecture and rule alignment

> **Status:** current contract. Historical campaign: [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md). Current priority: [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Core semantic rule

Pathfinder is history-sensitive. Same cell/length/intersection count does not imply the same future: legality may differ because of visited cells, used axes, portal/flipper state, incoming direction, or satisfied obligations.

Any cache, dedup key, transposition table, oracle abstraction, or state comparison must prove which fields are sufficient for equivalent future behavior. Correlation is not proof.

## Exact state identity vs coarse grouping

General sound transposition caching has already been measured: exact signatures found few revisits and were expensive; realistic exact MITM frontiers remained large. Reopen only with materially cheaper sound identity or new evidence.

Production beam dedup is intentionally coarse width/diversity control, not semantic equivalence. Removing it lost solves. Its former fixed-width packing became unsafe when mechanic cardinalities increased; the current delimited key avoids collisions among its intended fields without claiming exact history identity.

Rules:
- do not replace coarse beam grouping with exact identity merely for neatness;
- do not treat coarse grouping as interchangeable-state proof;
- fixed-width mechanic slots require enforced cardinality proof;
- benchmark representation changes.

Evidence: `reports/2026-08-06-beam-state-dedup-sound-signature-audit.md` and the archived campaign.

## Mechanic contracts

[`mechanic-state-contracts.md`](mechanic-state-contracts.md) records each dynamic mechanic's state shape, cardinality, monotonicity, legality/connectivity/win effects, direction dependence, and external-model support.

New/changed mechanics must also identify every cache/key/snapshot/telemetry/worker message carrying relevant state. Schema caps mask-backed must-pass, must-cross, surround, must-turn, and adjacent-turn counts at 30. If a cap changes, audit all consumers.

## Independent rule implementations

Move/win semantics intentionally exist in multiple arbiters:
- live/domain rules;
- candidate-path referee;
- solver transitions;
- independent differential oracle.

Read-through is insufficient. The 2026 alignment work found real drift in flipping-filter entry axis, pending must-cross lock, and must-turn win handling.

`scripts/solver-oracle/fuzz.mjs` differentially checks the oracle, solver move generation, and `isValidMove`. Preserve oracle independence; sharing solver implementation would weaken the test.

## Flipping filters

Flipping filters are single-use. Effective orientation depends on the level-wide order of distinct flipper crossings. This global parity is intentional game semantics. A per-filter successive-use model would require a rule change.

## Stress envelopes

The hard stress generator intentionally exceeds several published mechanic maxima. Use the in-envelope stratum for current-player-envelope transfer questions and the broader corpus for robustness. See [`../data/stress/README.md`](../data/stress/README.md).

## Generation history

Witness paths, parent families, mutations/symmetries, intended regions, and construction order are useful provenance for offline family analysis, diagnostics, hint diversification, routing/scoring labels, and oracle/reducer selection.

They are not cold-solve inputs. See [`solver-level-blindness.md`](solver-level-blindness.md) and [`variant-level-research.md`](variant-level-research.md).

## Shared compiled graph

Do not build a domain-owned compiled graph as housekeeping. Reopen only for a concrete consumer that removes duplicated semantics without weakening the independent oracle. Solver-specific typed/hot-path structures should remain layered above it.

## New mechanic checklist

Before shipping a mechanic, define:
1. added history and bounds;
2. local/global/per-object/ordered state shape;
3. when histories may safely merge;
4. effects on topology, move legality, and win condition;
5. incoming-direction dependence;
6. exact/relaxed external-model support;
7. representation/cardinality limits;
8. required telemetry/provenance;
9. independent arbiters and differential tests;
10. whether any solver-friendly reformulation exactly preserves player-facing semantics.

Finite state is fine; hidden/unbounded history and unenforced representation assumptions are not.

## Non-goals

- No gameplay dependence on solver hot-path code or controller/browser leakage into solver core.
- No advisory topology/region fact promoted to hard prune without proof.
- No construction/hint/family-history-guided result counted as cold capability.
- No player-rule redesign solely for solver convenience unless behavior is equivalent.
- No assumption that independent arbiters agree without differential tests.

Unranked descendants are in [`future-work.md`](future-work.md); measurements and chronology remain in the archived snapshot and dated reports.
