# Solver heuristic capability and gap analysis

This is the current code-and-evidence inventory of the Pathfinder production solver, reconciled through **2026-08-11** after the revised neighbor-budget full population A/B and first explicit-prefix CP-SAT follow-up.

For live execution priorities use [`future-work.md`](future-work.md). For promotion state use [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). All capability claims are governed by [`solver-level-blindness.md`](solver-level-blindness.md): the solver must operate from puzzle mechanics and current-invocation evidence only, never exact-level historical winners/hints/status.

## Executive answer

The solver's broad representational gap remains: it understands **local progress** better than **future opportunity cost**.

The strongest current evidence-adjusted opportunities are:

1. **Dynamic mechanic-resource propagation.** `PRUNE_MC_NEIGHBOR_BUDGET` is the strongest concrete example: sound replay evidence plus a revised level-blind full Corpus-2 result of **611→665 (+54 net, 59 gained / 5 lost)** while aggregate nodes/work both fell. The population experiment is complete; the open question is how to integrate the mechanism without accepting the five losses.
2. **Score representation at saturated beam frontiers.** Winning-lineage forensics found 10 clear mis-rank final extinctions, 3 weak-margin, 0 exact-tie/stable-order, and 2 width-saturation cases. The first exact-prefix CP-SAT batch now directly proves that at least one sibling ranked first by the beam is infeasible while the same parent has a valid continuation.
3. **State-conditioned completion interfaces.** Must-turn, adjacent-turn, surround and interacting must-cross obligations are better framed as remaining viable entry/exit/axis/chirality interfaces than plain reachability or static object counts.
4. **Failure-conditioned search control/cooperation.** The solver collects useful evidence while attempts run, but most work allocation is still decided before that evidence exists. This remains distinct from the closed broad cold-start portfolio scheduler.
5. **Deep repair prefix editing.** Current repair can descend and perturb locally but the rollback census suggests solution-bearing structure may require changing much earlier prefix history. Exact retreat CP-SAT is the next evidence gate.

Two broad leads remain demoted:

- **Existence-only portal parity** is sound but negligible in live search.
- **Simple static must-cross geometry / root free-intersection budget** adds essentially no predictive value beyond known features. The next must-cross work should represent state evolution or joint compatibility, not another root descriptor.

## Measurement correction: capability is level-blind

Older current-state documents used `725/1700` as the Corpus-2 baseline. That workflow supplied exact-level `--prime-winner`, which looks up a previous winning config/gate/seed and attempts it first. The lower-level tool itself correctly labels that **re-verification only**.

Comparison with the 2026-08-11 level-blind control showed that 112 of the 114 extra historical solves were `solvedByPrime`. Therefore:

- `725/1700` remains historical re-verification evidence;
- it is **not** the unseen-level solver capability baseline;
- the current decision-bearing population measurement is the level-blind 611-control / 665-neighbor treatment pair.

This matters because Pathfinder's actual use case is a player creating a new level in the editor and asking the solver whether it is solvable. Exact-level history cannot exist there.

## What the solver already represents well

### Exact legality and history-sensitive path state

The solver already tracks the mechanics that define Pathfinder rather than approximating the puzzle as a simple path problem:

- exact length and exact self-intersection count;
- legal revisitation;
- must-pass and must-cross state;
- portals;
- regular and flipping directional filters;
- must-turn / adjacent-turn / surround landmarks;
- path-induced connectivity and future legality.

The main remaining problem is therefore not ignorance of the rules. It is choosing productive branches and allocating finite work when many legal futures remain.

### Sound local bounds / topology

The solver has a mature prune gauntlet including:

- length/intersection ceilings;
- must-cross reservation/ceiling logic;
- distance/parity/lower-bound checks;
- connectivity/topology checks;
- forced-neighbour must-cross deadlocks;
- reserved-intersection wall logic;
- exact nogood caching in repair.

CP-SAT oracle work found no obvious missing broad prune family in earlier scans. Recent successful pruning work has come from **state-conditioned resource consequences**, not another generic reachability pass.

### Multiple search methods

The current ladder includes DFS/beam variants, repair/local search, admissible-order search and specialized attempt profiles. This diversity is useful but expensive. The new question is increasingly **which method deserves the next unit of work given what has happened so far**, rather than merely adding another method to the static ladder.

## Dynamic must-cross resource reasoning

### Evidence for `PRUNE_MC_NEIGHBOR_BUDGET`

The rule observes that completing a pending must-cross axis may require revisiting an already-visited required neighbour, consuming an additional future intersection beyond the must-cross cell's own reserved second entry.

Evidence chain:

- 19 unique dead-branch catches beyond the existing gauntlet in the oracle-labelled atlas;
- zero applicable alive false rejects there;
- 97,812 known-valid paths / 8.5M replayed steps, zero violations;
- first live sample +11/30, zero losses;
- historical original-wiring A/B +14 but with 42/28 churn and exact-level winner priming;
- repair random-index coupling diagnosed and caller participation narrowed;
- **revised level-blind full A/B: 611→665, 59 gains / 5 losses**;
- Corpus 1 94/102 both arms;
- treatment C2 nodes ~3.94% lower and canonical work ~5.33% lower.

The five losses are `R00635`, `R02119`, `R02422`, `R02823`, `R02867`.

Interpretation: the rule has substantial real value, and the caller-policy revision mostly removed the old stochastic churn. Another identical population run is not useful. The current integration problem is to understand/recover those five losses generically at matched total work.

### Crossing slack

The read-only diagnostic

```text
crossingSlack = freeInt - forcedFutureNeighbourRevisits
```

passed a bounded valid-prefix smoke with zero negative-slack soundness alarms. It remains a research variable, not a production score/prune. Exact live/dead labels should decide whether it carries useful discrimination.

### State-conditioned must-cross anchoring (open; unconditional form closed)

The solver already uses pending must-cross cells as soft objectives, uses perpendicular approach maps when a second visit is pending, retains `mustCrossFirst` in selected DFS/beam and admissible-order attempts, and uses must-cross structure in sound lower bounds and propagation. The open question is therefore not whether must-cross information can guide search; it is whether the role of each pending must-cross can be selected dynamically from the current search state.

The historical `must-cross-horizon` attempt is closed in its unchanged form. It gave must-cross levels an unconditional extra early-`mustCrossFirst` pass with stronger urgency and was removed after disable-one ablation across 47 levels found zero contribution. Evidence from high-intersection levels independently shows that early attraction can be counterproductive when a successful path must first create intersection geometry away from its obligations. That evidence rejects a universal attraction increase; it does not test adaptive target selection or deliberate deferral.

The remaining experiment should be level-blind and state-conditioned:

- choose among pending must-cross cells, defer all of them, or retain the current neutral behavior using only current-invocation facts;
- distinguish first-visit cell attraction from second-visit perpendicular-approach anchoring;
- consider remaining-step and crossing slack, visit/axis state, approach reachability, competing objectives, and bounded local completion interfaces;
- begin as a shadow/rank diagnostic against default, `mustCrossFirst`, and `intersectionHarvest`;
- use saved solutions only as offline labels for whether successful moves were promoted or demoted;
- require recurrence across unrelated levels or held-out parent families before building a live policy;
- evaluate any live policy through the full ladder at matched total work, including levels where early must-cross attraction is already known to be harmful.

Do not use a stored must-cross visitation order, exact-level winner, hint, or corpus identity during a capability solve. The corresponding queue entry is [State-conditioned must-cross anchoring remains open](future-work.md#state-conditioned-must-cross-anchoring-remains-open).

### Joint completion interfaces

The principled descendant is conservative enumeration of bounded local completion patterns for interacting pending must-cross obligations. This avoids the already-falsified static forced-edge assumption by representing multiple legal completion patterns explicitly.

Start shadow/oracle-only with strict cluster caps. Do not put a local constraint solver in the hot path before proving catch rate and cost justify it.

## Beam score representation / lineage

The same-config lineage cohort found:

- 13 solved / 17 failed;
- failed final labelled-support loss: 15 score/width, 2 dedup;
- zero hard-prune alarms;
- failures retained labelled support much less deeply on average than solved controls.

Score/width forensics classified the 15 failed final score/width extinctions as:

- 10 clear material mis-ranks;
- 3 weak-margin misses;
- 0 exact-tie/stable-order cases;
- 2 width-saturation cases.

This argues against “shuffle ties” or globally widen the beam as the first response.

### Exact CP-SAT follow-up

The first 12 previous atlas abstentions were run through the explicit-prefix CP-SAT workflow:

- **7 dead**;
- **1 live** with referee-valid OPTIMAL completion;
- **4 abstain**, all R00039 unsupported mechanics;
- zero input/correctness alarms.

At least one R00001 sibling with beam rank 1 is exact-infeasible while a known-valid continuation exists from the same parent. That is direct evidence that the score can prefer a dead future over a viable one.

Do not hard-code the known continuation or train the live solver on those exact labels. Expand a bounded extinction-adjacent same-parent label set, then ask which **generic state descriptors** separate live from dead futures.

A secondary structural-family reservoir/quota remains a plausible later counterfactual, but should be driven by exact viability evidence and evaluated at equal work.

## Landmark completion interfaces

Must-turn has relatively direct local exit semantics. Adjacent-turn and surround are more distributed: plain “can I reach it?” reasoning is weak because satisfaction depends on **how** the path can enter/leave/visit the relevant neighbourhood.

The open representation should describe conservative completion interfaces such as:

- candidate satisfaction cell(s);
- viable incoming axis;
- viable outgoing axis/chirality;
- local state required by filters/flippers/visits;
- compatibility with other pending obligations.

This is not a license to reinterpret surround as a clean orbit or to tighten game rules. Stored solutions show scattered valid satisfaction patterns; solver constraints must remain faithful to the game.

## Repair: the append-only wall

Closed or superseded repair experiments include:

- plateau penalty;
- soft recombination as built;
- exact relinking;
- turn bias;
- current elite-prefix DFS constants.

The rollback pilot over retained elites showed large demonstrated retreat distances to known solution-bearing prefixes. That is not minimum edit distance because the known solution corpus is incomplete.

The next useful evidence is exact retreat CP-SAT: roll an elite back coarsely/binarily and ask where an exact valid continuation first exists. If the necessary retreat is routinely deep, the solver needs a genuinely different prefix-edit capability rather than another local append/attraction tweak.

## Failure-conditioned work allocation

The old broad cold-start portfolio scheduler is closed: measured variants were slower. That does not answer the newer question:

> Given evidence generated during *this* solve, where should the next unit of work go?

Useful current-invocation evidence can include:

- which configs made progress or immediately stalled;
- beam frontier diversity/extinction facts;
- repair elite/badness/plateau information;
- remaining dynamic resource slack;
- repeated exact nogoods;
- whether specific method families are producing non-redundant frontier states.

Historical exact-level winners are forbidden. The controller must infer from the current puzzle and current run.

`STRATEGY_MAIN_LOOP_LATE_RESERVE` is the next bounded scheduling experiment because it tests one concrete starvation mechanism without changing attempt order. Its full level-blind population A/B is still pending.

## Variant/family evidence

Variant and symmetry datasets remain diagnostic gold, not permission to rotate/retry production levels until one happens to solve.

Orientation dependence is evidence of representation/search fragility. The R02248 audit found no semantic legality/bound mismatch before directional ordering diverged; stochastic repair later amplified ordering differences. Continue using symmetry as a controlled probe of search bias.

Family-parent hint replay produced large numbers of canonical-valid trajectories, useful as labels for lineage and structural analyses. Those hints must never be supplied to a capability solve of the same level.

## Closed leads that should not be rebuilt unchanged

- repair elite-prefix DFS current constants;
- repair turn bias;
- portal parity envelope;
- plateau penalty;
- soft recombination as built;
- exact relinking as built;
- admissible-order LDS;
- old fast portfolio / broad cold-start scheduler variants;
- residual-interface substitution operator based on the current rectangle-detour motifs.

Preserved code is not a backlog.

## Current priority order

1. **Neighbor-budget five-loss diagnosis and equal-work integration.** Population evidence is complete.
2. **Extinction-adjacent exact-prefix CP-SAT expansion.** The first 12 are complete; do not rerun them.
3. **Exact repair-retreat CP-SAT.** Decide whether deep prefix editing is genuinely required.
4. **Level-blind main-loop late-reserve full population A/B.** Test 5/10/15%, config count 4, fresh matched control.
5. Continue dynamic completion-interface work only where exact labels/shadow evidence justify it.

The recurring rule is simple: **saved results may teach us how to improve the general solver, but the improved solver must prove itself without remembering the level.**
