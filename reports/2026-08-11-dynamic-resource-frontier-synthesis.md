# Dynamic resource frontier synthesis (2026-08-11)

> **Status:** active synthesis, reconciled after the revised neighbor-budget level-blind A/B
> **Current decision:** dynamic future-opportunity/resource reasoning remains stronger than new static level-shape descriptors; the neighbor population experiment is complete and now leaves a five-loss integration problem, not a sample-size problem
> **Capability contract:** [`../docs/solver-level-blindness.md`](../docs/solver-level-blindness.md)

Read with:

- [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md) for the full neighbor-budget evidence chain;
- [`2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md) for the remote A/B/CP-SAT result reconciliation;
- [`../docs/solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md) for current promotion state;
- [`../docs/future-work.md`](../docs/future-work.md) for the live queue.

## Measurement correction

Older versions of this synthesis referred to Corpus-2 `725/1700` as the current solver frontier. That run used exact-level `--prime-winner` replay and is therefore a historical **re-verification** result, not unseen-level capability.

The current decision-bearing level-blind measurements are the 2026-08-11 revised neighbor-budget A/B:

| arm | Corpus 1 | Corpus 2 | C2 nodes | C2 canonical work |
|---|---:|---:|---:|---:|
| control | 94/102 | **611/1700** | 43,017,428,195 | 59,668,825,637 |
| neighbor-budget ON | 94/102 | **665/1700** | 41,320,735,149 | 56,486,598,535 |

Treatment effect: **+54 net, 59 gained / 5 lost**, while using ~3.94% fewer nodes and ~5.33% less canonical work. There were zero Corpus-2 attempt errors and zero deadline-truncated rows.

This correction changes the benchmark number, not the earlier static-vs-dynamic research conclusion.

## Static must-cross descriptors remain weak

The exploratory must-cross analysis asked whether simple root geometry explains remaining difficulty better than the already-known global variables.

A baseline model using must-cross count, portals, turn load, navigation density, `reqLen/area`, `reqInt`, flippers and must-pass reached 10-fold ROC-AUC **0.7607**. Adding simple static must-cross geometry descriptors produced **0.7572**; replacing raw must-cross count with implied required-cell count produced **0.7612**.

Root free-intersection budget also failed as the missing scalar explanation in that analysis. These figures were diagnostic, not a permanent benchmark gate, but they strongly redirected the research question away from static starting layout.

The useful question is increasingly:

> After this partial path, what future completion interfaces still exist, which resources do they consume, and which of those resources have just become scarce or mutually incompatible?

## Neighbor-budget is the strongest concrete example of dynamic opportunity cost

For a pending must-cross axis, an already-visited required neighbour forces a future revisit/intersection beyond the must-cross cell's own reserved second entry. `PRUNE_MC_NEIGHBOR_BUDGET` counts distinct such forced neighbours and compares them with remaining free intersection budget.

Evidence:

- 19 unique dead-branch catches beyond the shipped gauntlet in the oracle-labelled atlas;
- zero applicable alive false rejects there;
- 97,812 known-valid paths / 8.5M replayed steps, zero violations;
- first live sample +11/30, zero losses;
- original historical wiring A/B +14 but with 42/28 churn and exact-level winner priming;
- stochastic repair-index diagnosis and revised caller policy;
- **revised level-blind population A/B 611→665, 59 gains / 5 losses**.

The caller-policy revision substantially validated the diagnosis: most of the old loss churn disappeared while the positive effect increased.

The remaining five losses (`R00635`, `R02119`, `R02422`, `R02823`, `R02867`) now define the integration question. **Do not rerun the same full population A/B.** Determine whether a generic deterministic ordering/budget mechanism explains them and whether the 59-gain upside can be placed as default or complementary search at matched total work without accepting regression.

## Crossing slack remains an observational state variable

The read-only diagnostic is:

```text
crossingSlack = freeInt - forcedFutureNeighbourRevisits
```

A bounded smoke over 10 Corpus-2 levels replayed 289 valid unique paths and 7,957 applicable prefixes with zero negative-slack soundness alarms.

That is evidence the diagnostic is worth observing, not permission to turn it into a score/prune. Measure it against exact live/dead labels and known-valid prefixes before policy.

## Stronger descendant: compatible completion interfaces

The broader missing representation may be a bounded set of remaining completion interfaces rather than another scalar bound.

Examples:

- multiple pending must-cross cells are individually feasible but their remaining straight-through completion patterns may be mutually incompatible;
- must-turn / adjacent-turn obligations remain reachable but only through entry/exit directions already consumed by path history;
- surround satisfaction cells remain reachable but their viable visit interfaces conflict with the remaining route topology;
- enough length remains numerically but cheap legal detours/intersection sites have been consumed.

For must-cross, the next sound route is conservative bounded local completion-pattern enumeration with a strict cluster cap and shadow/oracle evaluation first. This explicitly avoids reviving the static forced-edge assumption already falsified in July.

## Portal extension remains secondary

The existing neighbour-budget proof globally abstains if any portal exists. A possible descendant is a **locally abstaining** portal formulation that applies the ordinary-neighbour proof only where the particular required neighbour has no portal ambiguity.

Do not implement this by deleting the global portal guard. It needs a fresh local proof, stored-solution replay on portal-bearing levels, then shadow catch-rate evaluation. Given the new population result, this is lower priority than understanding the five current losses and expanding exact score/width labels.

## Relationship to winning-lineage / CP-SAT work

The dynamic-resource thesis and the beam score-representation thesis are complementary. The first explicit-prefix CP-SAT run produced **7 dead / 1 live / 4 abstain** from the 12 old atlas abstentions, with zero correctness/input alarms. At least one R00001 sibling ranked first by the beam is exact-infeasible while the same parent has a known-valid continuation.

That creates a concrete route for testing dynamic future-opportunity descriptors: ask whether they separate exact-live from exact-dead same-parent futures near real score/width extinctions. Do that before adding another hand-tuned score term.

## Current order

1. neighbor-budget five-loss diagnosis / equal-work integration;
2. bounded extinction-adjacent explicit-prefix CP-SAT labels;
3. exact repair-retreat CP-SAT;
4. level-blind late-reserve population A/B;
5. only then pursue broader dynamic completion-interface policy if the evidence points there.

The guiding rule remains: **observation may use saved solutions and oracle labels; production solving may not recall exact-level history.** Any resulting prune, score, or scheduler must operate from the puzzle and current invocation alone.
