# Dependency-defined revision preflight

> **Status:** first bounded observer EXECUTED / INCONCLUSIVE (population-limited). See [`result`](../reports/2026-09-17-lane-e-repair-retreat-commitment-probe-result-001.md).
> **Purpose:** determine whether hard repair/search failures are controlled by a compact set of coupled earlier commitments rather than by geometric rollback distance or generic restart difficulty.
> **Priority:** owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **First observer result:** CP-SAT bisection on B2's only 2 qualifying same-parent dead/live pairs (sharing a literal common prefix) cleanly locates the exact point of no return in both, but both land 1-2 moves from the trajectory's own end -- a regime where rollback distance and a compact commitment predict the same thing, so neither case discriminates the premise. Critical move in both cases was a plain, non-mechanic-obligation move. Population (B2's common-prefix pairs) exhausted at n=2; needs the same blocked sibling constructor as Lanes B/D1/G2 to expand.

## Premise

The solver can backtrack, restart, preserve beam alternatives, and splice repair elites, but it has little machinery for answering:

> **Which earlier commitment made this later state unrecoverable, and can that commitment be revised without discarding unrelated useful structure?**

Broad positional/prefix repair has already been tested and is weak. This gate tests a different semantic premise: **causal locality may be defined by dependency, not path distance**.

## Historical reopening

Do not reopen elite-prefix DFS or generic ruin/recreate unchanged.

Historical repair-retreat evidence shows rollback distance is not a stable proxy for reconstructability. Some elites were exact-repairable after only 1-2 rollback steps despite large known-solution divergence, while other cases implicated much earlier structural choices. The archived stagnation program also left a descent-aware read-only observer unattempted after several append-only operators hit the same wall.

The surviving question is whether a small future-relevant commitment interface explains the divergence between a DEAD elite continuation and a rescuing feasible continuation.

## First bounded observer

Use already exact-labelled repair-retreat / LIVE-DEAD cases before generating new data.

For each matched dead/rescuable pair, derive differences in these commitment families where supported:

- must-turn arrival/exit/chirality choices;
- must-cross first-axis / crossing placement / required-neighbor commitments;
- free-intersection placement or axis consumption;
- portal pair use/order;
- flipper use/order where completion-relevant;
- obligation order or defer/serve phase;
- residual separator/region-side commitments;
- path-history topology / enclosure/accessibility;
- visited/edge-usage facts that block later interfaces.

The observer should report **which earlier decision points first create each divergent commitment**, not merely the path index at which the final paths diverge.

## Questions

1. Is the causal commitment set substantially smaller than the raw path difference/rollback distance?
2. Do the same semantic commitment families explain multiple independent failures even if exact cells differ?
3. Can the relevant commitment be detected before the terminal near-miss?
4. Is there a plausible targeted revision operation that preserves the rest of the useful prefix/structure?
5. Does the inferred causal set survive counterexample testing against LIVE states, or is it merely correlated with failure?

Cross-level recurrence of exact cells is not required. Recurrence of a *semantic commitment family* strengthens generality but the first target is a generic current-instance derivation procedure.

## Advancement gates

A revision prototype is earned only if:

- the observer finds a compact causal interface on a non-trivial share of exact-labelled failures;
- that interface is materially smaller/more actionable than path-distance rollback;
- the causal relation can be derived from legal current-input state;
- a targeted edit/backjump/destroy operation can be specified without silently changing puzzle semantics;
- a bounded prototype can compare against equal-work restart/backtrack baselines.

If the causal relation is proof-bearing, it may also feed conflict learning. If it is only heuristic, keep the consumer soft.

## Stop rules

Close this premise in its tested population if:

- causal sets are essentially the whole prefix;
- different failures require unrelated, non-compressible commitment descriptions with no generic derivation rule;
- the first actionable causal point is usually indistinguishable from ordinary rollback distance;
- detecting the causal set costs as much as exact residual solving with no intermediate benefit;
- apparent causal features fail LIVE counterexamples;
- no targeted revision can preserve materially more useful structure than ordinary backtracking/restart.

## Non-goals

- no CP-LNS/LNS implementation before the observer is positive;
- no adaptive destroy-size bandit;
- no fitted blame model from historical level identity;
- no treating known-solution path distance as causal truth;
- no broad production A/B before a compact dependency interface is demonstrated.
