# Dynamic resource frontier synthesis (2026-08-11)

> **Status:** active
> **Last evidence:** 2026-08-11 — latest Corpus-1/Corpus-2 sweep reconciliation, must-cross feature analysis, and repository review
> **Decision:** prioritize dynamic future-opportunity/resource reasoning over new static level-shape descriptors; treat current solver limits as a benchmark frontier, not authoring restrictions
> **Remaining gate:** repeat/diagnose the full-population `PRUNE_MC_NEIGHBOR_BUDGET` churn before promoting it or building policy on top of its solve-count gain

## Why this synthesis exists

This report records the conclusions reached after combining four evidence streams that were previously
spread across separate documents:

1. the latest completed Corpus-1 and Corpus-2 deterministic sweeps;
2. the current mechanic/property distribution of solved versus unsolved levels;
3. the full `PRUNE_MC_NEIGHBOR_BUDGET` shadow/soundness/live-A/B result; and
4. a new exploratory analysis asking whether *static* must-cross layout descriptors explain the
   remaining difficulty better than the already-known dynamic/resource variables.

Read this together with:

- [`../docs/solver-heuristic-capability-gap-analysis.md`](../docs/solver-heuristic-capability-gap-analysis.md)
  for the current capability inventory and research priorities;
- [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md)
  for the neighbor-budget derivation, soundness replay, and full A/B;
- [`../docs/solver-shadow-eval-harness.md`](../docs/solver-shadow-eval-harness.md) for the shared
  oracle-labelled probe infrastructure;
- [`2026-07-31-mustcross-forced-structure.md`](2026-07-31-mustcross-forced-structure.md) and
  [`2026-07-31-reserved-intersection-wall.md`](2026-07-31-reserved-intersection-wall.md) for the
  must-cross derivations that established this family;
- [`2026-08-08-portal-parity-envelope.md`](2026-08-08-portal-parity-envelope.md) for the separate,
  sound-but-negligible portal-parity experiment; and
- [`../docs/future-work.md`](../docs/future-work.md) for the live queue. This report supplies the
  evidence and rationale; `future-work.md` decides what is actually queued.

## 1. Current sweep frontier

The latest reconciled deterministic baseline is:

| Corpus | Solved | Unsolved |
|---|---:|---:|
| Corpus 1 | 96 / 102 | 6 |
| Corpus 2 | 725 / 1700 | 975 |

All failures in both sweeps are budget exhaustion (`node-budget-reached`), not referee-invalid
solutions or solver exceptions. The remaining problem is therefore search efficiency/capability,
not a population of known correctness failures.

### The six Corpus-1 failures are interaction-heavy rather than individually exotic

The six remaining Corpus-1 failures are all 12×12 and all simultaneously sit at the historical
"classic" stress maxima for the older mechanics:

- 4 blocks;
- 4 must-pass;
- 4 must-cross;
- 3 portal pairs;
- 4 flipping filters;
- 3 false goals; and
- 4 geese.

Their `reqLen` values are 87–101 and they then vary mainly by turn/surround obligations. The most
useful interpretation is not that any one of those counts is a magic failure threshold. These six
levels are concentrated examples of **constraint stacking and interaction load**. The solver can
handle each ingredient much more often than it can handle many of them simultaneously while also
satisfying a long exact path.

This matters for product policy: these observations should not be converted into low editor caps.
They are a map of the solver's present comfort zone and therefore a benchmark-generation target.
The desired direction is to push the frontier outward until these combinations become routine.

## 2. Which properties track current Corpus-2 difficulty

The latest current-outcome join reinforces the interaction story.

Strong or useful difficulty signals include:

- portal-pair count;
- must-turn count;
- surround count;
- combined turn-family load (`mustTurn + surround + adjacentTurn`);
- navigation density / constrained traversable space;
- higher `reqLen` and higher `reqLen / grid area`; and
- to a lesser degree, must-cross count and total impassable density.

Weak or nearly flat signals include:

- `reqInt` by itself;
- false-goal count; and
- several occupancy-only counts once the stronger interaction variables are known.

In the current 725-solve baseline, solved and unsolved levels have almost identical mean `reqInt`
(about 5.65 versus 5.68). The binned solve rate is non-monotonic rather than steadily degrading as
`reqInt` rises. That is strong evidence against treating high intersection count itself as a leading
remaining solver weakness.

The more plausible issue is **where future intersections remain available and what obligations
reserve or consume them**, not the scalar target count.

### Grid size

Raw solve rate declines from the 11×11 population toward the 14–15 range. That does not support a
simple independent "large grid" diagnosis because larger boards also carry longer paths and more
room for mechanic interactions. Still, it is enough to treat board size as a scaling variable in
benchmarking rather than assuming a count of mechanics has the same search cost on every grid.

For future solver-frontier generation, scale quantities such as path length and obstacle count with
board area, while keeping history-sensitive mechanic counts as separate axes. Do not infer that a
12×12 level with four turn obligations and a 15×15 level with four turn obligations are equivalent
search problems merely because the raw count matches.

## 3. New must-cross analysis: static layout descriptors mostly wash out

A fresh exploratory analysis focused on the 939 Corpus-2 levels carrying must-cross cells. The
question was whether simple root-level must-cross geometry explains remaining difficulty after the
already-known global variables are included.

A baseline model using must-cross count, portal count, turn load, navigation density,
`reqLen / area`, `reqInt`, flippers, and must-pass reached a 10-fold cross-validated ROC-AUC of
**0.7607** for current solve status.

Adding static must-cross geometry descriptors such as shared required-neighbour structure and local
overlap produced **0.7572**, slightly worse. Replacing raw must-cross count with the number of
implied required cells produced **0.7612**, effectively unchanged.

This is an exploratory analysis rather than a committed benchmark script, so these exact AUCs are
not a permanent regression gate. Their decision value is directional: **the obvious static
must-cross descriptors did not reveal a missing explanatory variable**.

### Root free-intersection budget is also not the missing variable

For the same 939 must-cross-bearing levels, define root free intersection budget as:

`freeInt = reqInt - mustCrossCount`

The current solve rates are:

- `freeInt == 0`: 279 / 656 = **42.5%** solved;
- `freeInt > 0`: 101 / 283 = **35.7%** solved.

So levels with no discretionary intersections at the root are not the harder group. The scalar
starting budget is not the important missing representation.

Taken together, these two negative results move the hypothesis away from **static starting
geometry** and toward **dynamic loss of future flexibility while a path is being built**.

## 4. The strongest concrete evidence for dynamic opportunity cost

The existing neighbor-budget propagator is already a direct instance of dynamic opportunity-cost
reasoning. For an unsatisfied must-cross axis, if a required ordinary neighbour has already been
visited, completing the crossing later requires revisiting that neighbour and therefore spending an
additional, previously-unreserved intersection. The rule compares those distinct forced revisits to
the remaining free intersection budget.

Its evidence chain is unusually strong:

- 19 unique dead-branch catches beyond the shipped gauntlet in the 5,518-branch oracle-labelled
  atlas, with zero false rejects on applicable alive branches;
- 97,812 known-valid paths replayed, 8.5M steps, zero violations;
- first live sample: +11 / 30, 0 losses;
- full deterministic Corpus-2 A/B: 725 → 739, **+14 net**, consisting of 42 gained and 28 lost;
- Corpus 1 unchanged at 96 / 102.

See [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md)
for the derivation and exact run details.

The 42/28 churn is not a soundness failure. The prune changes which dead search is removed first,
which changes where a fixed node budget is spent. The result is therefore simultaneously a positive
capability signal and a warning against treating "sound prune" as synonymous with "strict solve-set
superset under a finite budget".

## 5. Revised interpretation of the solver's broad gap

The earlier capability analysis described the solver as understanding **local progress** much
better than **future opportunity cost**. The new evidence strengthens and narrows that statement.

The interesting question is increasingly not:

> How many must-crosses / intersections / turn objects are present?

It is:

> After this partial path, what future completion interfaces still exist, which resources do they
> consume, and which of those resources have just become scarce or mutually incompatible?

Examples of the resource/interface state the solver may need to understand better:

- a must-cross still has an individually open axis, but one or both required neighbours now require
  paid revisits;
- two pending crossings are individually feasible but their remaining local completion patterns
  cannot coexist;
- a must-turn or adjacent-turn landmark remains reachable but only through entry/exit interfaces
  whose axes/chirality have been consumed;
- a surround cell still has reachable neighbours but the remaining visit pattern conflicts with
  route topology or other obligations;
- a portal remains globally available but is no longer useful for the particular future interface
  that needs it;
- enough path length remains numerically, but the path has consumed the cheap detours/intersection
  sites needed to spend it legally.

This is a dynamic, relational representation problem. It does not imply one universal heuristic or
one large constraint solver inside the hot path.

## 6. Recommended experiments, in order

### A. Close the neighbor-budget churn question before building on its solve gain

The current flag is sound and net-positive but not promotion-ready because 28 currently solved
Corpus-2 levels are lost under the matched fixed budget.

The first gate is deliberately narrow:

1. repeat the deterministic full-population A/B to confirm the 42 gained / 28 lost identity split is
   stable on identical code/configuration; and/or
2. use existing attempt/method probes on a representative handful of lost levels to identify where
   search effort moves when the prune is enabled.

Do not spend more soundness effort first. The existing replay evidence already addresses that
question. The unresolved issue is finite-budget search allocation.

### B. Test a *locally abstaining* portal extension of neighbor-budget reasoning

The current neighbor-budget helper abstains on an entire level when **any portal exists anywhere**.
That was a conservative proof boundary, not an empirical finding that ordinary required-neighbour
reasoning becomes invalid merely because an unrelated portal is present.

A worthwhile shadow-only hypothesis is therefore narrower than "make the rule portal-aware":

> Preserve every existing exclusion in the proof, and on portal levels apply the existing ordinary-
> cell revisit argument only where the particular required neighbour being counted is not a portal
> terminal and has no portal-specific ambiguity. Abstain locally around portal-affected cells rather
> than globally for the level.

Do **not** implement this by simply deleting the `portalMap.size` guard. Re-derive the exact local
conditions, replay all stored portal solutions through the real state machinery, then score the
variant in the existing shadow harness before any live A/B.

This proposal is distinct from the portal-parity envelope. The parity experiment tested whether a
remaining portal could rescue exact-length parity and found its reject condition negligible. This
proposal asks whether an already-proven must-cross resource deduction can safely recover coverage
on portal-bearing levels.

### C. Instrument `crossingSlack` before turning it into policy

The neighbor-budget rule currently turns one resource expression into a boolean deadlock:

`crossingSlack = freeInt - forcedFutureNeighbourRevisits`

Instrument that scalar (and its components) on:

- oracle-labelled alive/dead branches;
- known-solution prefixes; and
- optionally the gained/lost populations from the full neighbor-budget A/B.

Measure its distribution by depth and remaining must-cross count. The key question is whether dead
branches tend to erode toward low slack substantially earlier than live/winning prefixes after
controlling for search depth.

If it discriminates, it becomes a candidate **state representation / retention diagnostic**. Do not
immediately add another scoring weight. This codebase already has strong evidence that plausible
move-order terms can simply move finite-budget wins around.

### D. Explore joint must-cross interface compatibility, not another static forced-edge rule

The falsified 2026-07-31 forced-edge rule failed because nearby must-cross obligations can share
cells through multiple structurally distinct valid completions. Any stronger successor has to model
that multiplicity rather than pretending each obligation owns independent edges.

The next principled shape is a tiny compatibility problem over remaining crossing interfaces:

1. enumerate conservative local completion patterns for each pending must-cross;
2. retain every pattern compatible with current axis/visit state;
3. ask whether at least one mutually compatible combination remains across the interacting local
   cluster; and
4. abstain when the cluster/model exceeds a strict tractability cap.

Prototype this offline/shadow-first. The target is a **necessary-condition reasoner**, not a
production mini-CP-SAT tier. It should earn its existence by unique catches beyond the current
neighbor-budget/forced-neighbour/reserved-wall gauntlet.

The repository's correctness-hardening work now provides substantially better independent
small-state/admissibility testing than existed when the static rule was first tried. Any compatibility
reasoner should use those property/reference checks in addition to stored-solution replay and the
5,518-branch atlas.

### E. Apply the same dynamic-interface framing to turn-family landmarks

The earlier open landmark proposal remains valid but should be phrased carefully. Plain reachability
for surround/adjacent-turn was already tested and was effectively redundant. The open question is
not "can I reach a candidate cell?" but "does any candidate cell still admit a compatible
entry/exit/chirality interface?"

For must-turn, adjacent-turn, and surround work, reuse the same progression:

paper derivation → stored-solution census → shadow probe / independent falsification → live A/B.

Do not copy must-cross's local rules mechanically; these mechanics have different any-of-many and
ordering semantics.

## 7. What not to infer from the latest limits analysis

### Do not turn solver comfort limits into game-design limits

An earlier analysis can produce conservative authoring caps with high empirical solve probability,
but those caps should be used as **benchmark coordinates**, not product restrictions. Low caps on
portals, surround, turn objects, or interaction density would make the level language less
expressive precisely where the solver most needs to improve.

A better use is a moving solver benchmark frontier:

1. identify the current high-success envelope;
2. generate controlled levels just outside one boundary at a time;
3. improve the solver until that band becomes routine without regressions;
4. move the boundary outward; and
5. periodically test mixed-interaction levels so optimizing single axes does not create a solver
   that only handles laboratory-isolated mechanics.

### Do not over-prioritize `reqInt`

The current data does not support a low `reqInt` ceiling as a primary solver-protection measure.
Intersection *availability and reservation* matter; raw requested count currently does not track
failure strongly.

### Do not rediscover static must-cross geometry without a new representation

The simple root descriptors tested here add essentially no predictive information beyond the
existing feature set. A new must-cross proposal should therefore explain what **state evolution,
compatibility, or resource consumption** it represents that those descriptors do not.

## 8. Cross-document responsibility map

To prevent this thread from fragmenting again:

| Question | Canonical source |
|---|---|
| What does the solver currently understand / omit? | [`../docs/solver-heuristic-capability-gap-analysis.md`](../docs/solver-heuristic-capability-gap-analysis.md) |
| What work is actually open now? | [`../docs/future-work.md`](../docs/future-work.md) |
| How do we score sound candidate reasoners before production integration? | [`../docs/solver-shadow-eval-harness.md`](../docs/solver-shadow-eval-harness.md) |
| What exactly did neighbor-budget prove and measure? | [`2026-08-08-mc-neighbor-budget-propagation.md`](2026-08-08-mc-neighbor-budget-propagation.md) |
| Why is static must-cross forced-edge reasoning unsafe? | [`2026-07-31-mustcross-forced-structure.md`](2026-07-31-mustcross-forced-structure.md) |
| What did portal parity actually test? | [`2026-08-08-portal-parity-envelope.md`](2026-08-08-portal-parity-envelope.md) |
| What does the current corpus-limit/difficulty evidence imply for research direction? | **This report** |

Future reports that close one of sections 6A–6E should link back here and update
`../docs/future-work.md`; this synthesis should not become an accumulating chronological ledger.
