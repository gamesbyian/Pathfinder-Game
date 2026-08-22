# Solver-aware game architecture and rule alignment

> **Status:** current contract. History: [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md). Priority: [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Core semantic rule

Pathfinder is history-sensitive: equal cell/length/intersection count can have different futures because of visited cells, used axes, portal/flipper state, incoming direction, or satisfied obligations.

Any cache, dedup key, transposition table, oracle abstraction, or state comparison must prove which fields suffice for future equivalence. Correlation is not proof.

## Exact identity vs coarse grouping

General sound transposition caching has been measured: exact signatures found few revisits at high cost; realistic exact MITM frontiers stayed large. Reopen only with materially cheaper sound identity/new evidence.

Production beam dedup is intentionally coarse width/diversity control, not semantic equivalence. Removing it lost solves. Fixed-width packing became unsafe as mechanic cardinalities grew; the current delimited key avoids collisions among intended fields without claiming exact history identity.

Rules: do not replace coarse grouping with exact identity for neatness; do not treat grouping as equivalence proof; fixed-width mechanic slots need enforced cardinality bounds; benchmark representation changes. Evidence: `reports/2026-08-06-beam-state-dedup-sound-signature-audit.md` and archived campaign.

## Mechanic contracts

[`mechanic-state-contracts.md`](mechanic-state-contracts.md) records dynamic mechanic state shape, cardinality, monotonicity, legality/connectivity/win effects, direction dependence, and external-model support.

New/changed mechanics must identify every relevant cache/key/snapshot/telemetry/worker message. Schema caps mask-backed must-pass, must-cross, surround, must-turn, and adjacent-turn counts at 30; cap changes require consumer audits.

## Independent rule implementations

Move/win semantics intentionally exist in live/domain rules, candidate-path referee, solver transitions, and independent differential oracle. The 2026 alignment found real drift in flipping-filter entry axis, pending must-cross lock, and must-turn win handling.

`scripts/solver-oracle/fuzz.mjs` checks oracle, solver move generation, and `isValidMove`. Preserve oracle independence; sharing solver implementation weakens the test.

## Flipping filters

Single-use; effective orientation depends on level-wide order of distinct flipper crossings. Global parity is game semantics. Per-filter successive-use would be a rule change.

## Stress and generation evidence

The hard stress generator exceeds some published maxima. Use the in-envelope stratum for current-player transfer and broader corpus for robustness. See [`../data/stress/README.md`](../data/stress/README.md).

Witness paths, families, mutations/symmetries, intended regions, and construction order may support offline diagnostics, hint diversification, routing/scoring labels, and oracle/reducer selection. They are never cold-solve inputs. See [`solver-level-blindness.md`](solver-level-blindness.md), [`variant-level-research.md`](variant-level-research.md).

## Shared compiled graph

Do not build a domain compiled graph as housekeeping. Reopen only for a concrete consumer that removes duplicated semantics without weakening the independent oracle; solver-specific typed/hot structures stay above it.

## New mechanic checklist

Define before shipping:

1. added history/bounds;
2. local/global/per-object/ordered state shape;
3. safe history merging;
4. topology, move-legality, win effects;
5. incoming-direction dependence;
6. exact/relaxed external-model support;
7. representation/cardinality limits;
8. telemetry/provenance;
9. independent arbiters/differential tests;
10. whether a solver-friendly reformulation exactly preserves player semantics.

Finite state is fine; hidden/unbounded history and unenforced representation assumptions are not.

## Non-goals

- No gameplay dependence on solver hot-path code or browser/controller leakage into solver core.
- No advisory topology/region fact promoted to hard prune without proof.
- No construction/hint/family-history result counted as cold capability.
- No player-rule redesign solely for solver convenience unless equivalent.
- No assumption independent arbiters agree without differential tests.

Unranked descendants: [`solver-future-work.md`](solver-future-work.md). Measurements/chronology remain in the archived snapshot and dated reports.
