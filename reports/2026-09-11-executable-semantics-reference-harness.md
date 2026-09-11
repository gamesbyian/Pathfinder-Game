# Executable semantics reference harness — 2026-09-11

> **Status:** concluded-positive
> **Audit areas:** 4 — Successor generation / search actions; 9 — Pruning / rejection; 13 — Termination / exhaustion
> **Implementation:** `modules/solver/executable-semantics-reference.test.ts`
> **Decision:** add one intentionally tiny independent oracle rather than another corpus-scale solver check. The reference side enumerates its own path space and is then compared with production successor, hard-prune and complete-search behavior.

## Why this exists

The broad audit found substantial executable coverage around search state, known-solution prefix survival, individual prune contracts and termination telemetry. Most of those tests still start from production helpers or hand-authored expected states. That is excellent regression coverage but leaves one correlated-assumption risk: a mistaken transition rule can be shared by the code under test and the fixture construction that is meant to validate it.

This harness removes that particular dependency for a deliberately restricted domain.

## Independent micro-domain

The reference model supports only:

- rectangular grids;
- cardinal movement;
- one gate and one goal;
- static blocked cells;
- exact edge length;
- zero intersections, implemented on the reference side as simple-path enumeration;
- no portals, filters, flippers, false goals, geese, must-pass, must-cross or landmark constraints.

That small surface is intentional. The oracle is about independently checking semantic plumbing, not growing a second Pathfinder solver that can drift in parallel with production.

The reference enumerator does not import production successor generation, prune evaluation or solution validation. It computes in-bounds cardinal successors directly, rejects its own blocked/visited cells, treats the goal as terminal and exhaustively enumerates exact-length solutions.

## Three contracts exercised

### 1. Successor legality

For every oracle-reachable prefix in a blocked 3x2 fixture, replay the same prefix into production state and compare the strict-simple-path successor set with independently enumerated successors. Production can expose revisits before the zero-intersection prune rejects them, so the comparison explicitly intersects production output with the oracle domain rather than silently pretending the two abstraction layers are identical.

### 2. Known-winning-prefix hard-prune survival

Enumerate every reference solution in a satisfiable 3x2 fixture. Replay every move of every winner through production state and run the real shared hard-prune pipeline after each move. Every nonterminal winning prefix must return `pass`; the exact winning terminal must return `solution`; no oracle-known winning prefix may return `reject`.

This is stronger than storing one golden solution because the reference side supplies the complete solution set for the micro-fixture.

### 3. Solve versus genuine exhaustion

The oracle independently classifies two fixtures before production search runs:

- satisfiable: 3x2, `(0,0)` to `(2,0)`, exact length 4;
- unsatisfiable: 2x2, `(0,0)` to `(1,1)`, exact length 3.

Production's plain DFS dispatcher then runs with a deliberately non-binding wall deadline and no node ceiling. The satisfiable fixture must return an exact path contained in the oracle's solution set. The unsatisfiable fixture must return `null` after doing real search work without reporting a timeout. This pins the important evidence distinction from Audit 13: complete exhaustion is not interchangeable with a budget/deadline exit.

## Scope / non-claims

Passing this harness does not prove the full solver sound or complete. In particular it does not independently model portal semantics, crossings, filters, flippers, must-pass/cross, landmarks, repair randomness, beam coalescing or policy scheduling. Those retain their dedicated tests and audit evidence.

Its value is orthogonal: one tiny state space is independently enumerable end to end, so successor semantics, a shared hard-prune boundary, and complete-search termination cannot all agree merely because the test reused the same production transition implementation.

## Disposition

The post-closeout Audits 4/9/13 hardening item is implemented. Keep this test tiny. Extend it only with another independently simple semantic dimension where the reference rule can remain obvious by inspection; do not turn it into a shadow solver or a performance benchmark.
