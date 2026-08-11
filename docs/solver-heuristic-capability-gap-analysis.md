# Solver heuristic capability and gap analysis

This is a code-and-evidence-level inventory of the production solver, reconciled through
**2026-08-11**. It asks: when the existing mechanisms are arranged by **what they know** and **which
decisions they affect**, which missing representations still have evidence behind them?

A visible code asymmetry is not automatically an open opportunity. This document is a current-state
reference, not a brainstorm: it reconciles implementation with the experiment/negative-result
ledger. For the live queue use [`future-work.md`](future-work.md). For the latest cross-corpus
interpretation of solver limits and the dynamic-resource research frontier, use
[`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).

## Executive answer

The solver's broad representational hole is increasingly clear: it understands **local progress**
far better than **future opportunity cost**.

The strongest evidence-adjusted opportunities are now:

1. **Dynamic mechanic-resource propagation**, especially must-cross consequences that emerge only
   after the path consumes cells, axes, and revisit budget. This family has produced the strongest
   recent new rule: `PRUNE_MC_NEIGHBOR_BUDGET` is sound and gives +14 net Corpus-2 solves in a full
   deterministic A/B, though 42 gained / 28 lost finite-budget churn keeps it default-off.
2. **State-conditioned completion interfaces** for must-turn, adjacent-turn, and surround. Plain
   reachability counterparts were already tested and were effectively redundant; the open gap is
   entry/exit/axis/chirality compatibility, not "can I reach the landmark?"
3. **Failure-conditioned search control / cooperation.** Search methods collect evidence while
   running, but most allocation remains chosen before search starts. This is lower priority than a
   new mechanic-derived fact, but the instrumentation path is now designed.
4. **Residual-resource signals as research instruments.** Variables such as crossing slack can be
   useful state descriptions even when they do not immediately justify a hard prune or score.

Two previously prominent leads have been demoted or closed:

- **Existence-only portal parity** is sound but negligible in live search.
- **Simple static must-cross geometry and root free-intersection budget** do not explain the current
  hard population better than the existing feature set. The next must-cross work should therefore
  represent state evolution or joint compatibility, not another root-layout descriptor.

Measured failing levels also often rank winning-path moves near the top, so "add a better move
score" remains a poor generic diagnosis.

## Separate four meanings of “heuristic”

- **Hard admissible checks** reject states proved unable to win: exact length/intersection limits,
  goal distance/parity, obligation bounds, mechanic deadlocks, and residual connectivity/volume.
- **Soft move scores** rank children by progress signals. A bad score spends budget but cannot make
  an invalid path valid or reject a valid path.
- **Profiles and templates** reweight that vocabulary or add geometric path shapes. They diversify
  preferences but normally add no state information.
- **Search-control heuristics** decide retention and effort: DFS/LDS, beams and diversity, randomized
  repair, gate/config ordering, and feature-keyed attempt policy.

A new profile cannot fill an information gap. A new prune needs a proof plus oracle/fuzz validation.
An incomplete state signature may guide diversity or retention but may not become a hard rejection.

## Inventory: what each family does and omits

| Family | Does well | Does **not** represent |
|---|---|---|
| Goal attraction / finish commitment | Smooth phase-aware finish gradient | Necessary detours, consumed corridors, useful arrival resource mix |
| Objective attraction | Cheap pull to nearest pending must-pass/must-cross | Objective order, incompatibility, approach side, cost of serving all objectives |
| Must-pass urgency | Keeps every point obligation visible | Bottleneck access and joint order; same-family MST exists only as a hard bound |
| Must-cross urgency / approach guidance | Separates first visit from perpendicular second approach | Future availability/compatibility of all completion interfaces; competition among crossings |
| Must-cross hard reasoning | Reserved-intersection ceiling/wall, forced-neighbour hard walls, optional neighbor-budget revisit propagation | General joint compatibility among multiple still-feasible local crossing patterns; portal coverage for neighbor-budget remains globally carved out |
| Must-turn urgency / exit guidance | Covers “reach it” and “make the satisfying turn now” | Future interface availability after axes/corridors have been consumed |
| Surround urgency | Pulls toward an unvisited neighbor | Joint route/interface feasibility through the whole remaining neighbor set |
| Adjacent-turn urgency | Reaches an eligible region | Whether any candidate retains a feasible entry/exit of required chirality |
| Flipper urgency | Tracks global used-count parity and current approach zones early | Downstream order opportunity, late scarcity, competition for approaches |
| Portal parity guidance | Notices an unmet need for an odd parity twist | Useful portal sequence/value and reachability-conditioned future interface effects; the tested existence-only hard envelope was inert |
| Intersection setup | Rewards an immediately useful revisit | Scarcity of future crossing sites and opportunity cost of consuming an axis/cell |
| Geometry templates | Cheap perimeter/corner/side path-shape diversity | Obstacles or dynamic residual topology |
| Anti-dither / revisit penalty | Suppresses trivial reversal and gratuitous reuse | Productive versus destructive revisits and longer history motifs |
| Obligation lower bounds | Prove insufficient length; provide scalar slack | Most cross-family conflict, exact interfaces/order, dynamic topology |
| Deadlock / connectivity | Catch irreversible local failure and unreachable/undersized regions | Traversal/interface feasibility through a reachable region; combined resource compatibility |
| Beam dedup/diversity | Frees beam width via aggressive, formally non-equivalent merging | Exact future-state identity; making the key more precise can reduce its width-management value |
| Repair | Escapes deterministic commitment through restarts and elites | Ordinary interior edits, connectivity pruning, stable use of every shared score |
| Attempt policy | Routes coarse feature regimes to methods | Online response to beam extinction, prune causes, resource collapse, or repair plateau shape |

By information and decision type, the sparsest useful areas remain **dynamic × relational × sound
propagation** and **dynamic × relational × retention/control**.

## Evidence that changes a source-only answer

The repository has already falsified or demoted many natural "missing counterpart" proposals:

- **Move ordering is not the measured general bottleneck.** Winning-path moves were already near the
  top under real profiles, and controlled comparisons did not expose a broad ordering deficit.
- **Adjacent-turn symmetry was tested.** Exit guidance solved 0/6 targeted levels; a combined MST
  improved only 5/183 witness states by at most two steps; an all-candidates deadlock fired zero
  times in roughly 88.7M evaluations.
- **Plain surround/adjacent-turn reachability was tested.** It was sound and fired frequently, but
  changed aggregate node count by only 0.0008% with zero solve-count change. The open landmark gap
  is interface/axis compatibility, not reachability.
- **Joint must-pass/must-cross point touring is a measured small gap.** It applied to 659/5,518
  labelled branches but uniquely caught only one dead branch.
- **Separator capacity is real but sparse.** The separator-resource spectrum uniquely caught dead
  branches but coverage was too low to justify hot-path integration.
- **Naive transposition memory is weak or unsafe.** A sound key made true repeats much rarer and more
  expensive than a loose signature suggested. Approximate novelty may guide retention; incomplete
  dead-state pruning is unsafe.
- **Bidirectional completeness is closed for the tested regime.** Sound meet-in-the-middle frontiers
  hit 1.5M states well before required meet depth on every tested level.
- **Existence-only portal parity was built and measured.** Stored-solution replay was clean, but a
  40-level live A/B produced zero reject events and zero node-count differences across roughly 240M
  searched nodes. See
  [`../reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md).
- **Specific must-cross derivation has paid.** Reserved-intersection topology, forced-neighbour
  reasoning, and now neighbor-budget propagation all find real consequences. Broader bounded-cost
  dilation did not, and static forced-edge propagation was falsified. The lesson is
  derive → falsify → instrument, not generic "more topology."

## The must-cross result that changes the frontier

### What neighbor-budget added

`PRUNE_MC_NEIGHBOR_BUDGET` extends the hard-wall forced-neighbour check to a soft resource case: if
a still-needed must-cross neighbour has already been visited, satisfying that crossing later forces
an additional revisit/intersection not already reserved by the must-cross cell's own second entry.
It counts distinct forced-neighbour cells and rejects when the remaining free intersection budget
cannot cover them.

Evidence:

- oracle-labelled shadow atlas: **19 unique catches** beyond the existing gauntlet, zero false
  rejects on applicable alive branches;
- 97,812 known-valid paths / 8.5M replayed steps: zero violations;
- first live sample: +11/30, zero losses;
- full deterministic Corpus-2 A/B: **725/1700 → 739/1700**, 42 gained / 28 lost;
- Corpus 1: 96/102 in both arms.

The losses are finite-budget search reallocation, not a soundness violation. That distinction is
important: a sound prune can still change which levels are found before a fixed budget expires.
The flag therefore remains opt-in/default-off. See
[`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md).

### New negative evidence: static root descriptors are not the missing must-cross model

The 2026-08-11 follow-up joined current solve status to the 939 must-cross-bearing Corpus-2 levels.
A baseline model using must-cross count, portals, turn load, navigation density, `reqLen/area`,
`reqInt`, flippers, and must-pass achieved 10-fold ROC-AUC **0.7607**. Adding simple static
must-cross geometry descriptors produced **0.7572**; replacing raw count with implied required-cell
count produced **0.7612**. In practical terms, the extra static geometry added no useful predictive
information.

Root free-intersection budget also points away from a scalar explanation:

- `reqInt - mustCrossCount == 0`: **279/656 = 42.5%** solved;
- positive root free budget: **101/283 = 35.7%** solved.

These are exploratory diagnostic statistics, not a regression benchmark, but they are sufficient to
redirect the research question. The next useful representation is more likely **how the partial path
spends/destroys future crossing opportunity** than how constrained the initial must-cross layout
looks.

Full context:
[`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).

## Gaps that remain after reconciliation

### 1. Dynamic must-cross resource/interface reasoning

This is now the strongest mechanic-derived frontier.

Three descendants are worth testing, in increasing ambition:

1. **Diagnose the existing neighbor-budget churn first.** Repeat the full deterministic A/B or probe
   representative lost levels. Do not promote the flag merely from +14 net.
2. **Recover portal coverage conservatively.** The current helper abstains when *any portal exists
   anywhere*. Test a shadow-only variant that preserves every current exclusion and abstains locally
   around portal-affected required neighbours rather than deleting the global guard wholesale. This
   is a new proof obligation, not an assumed-safe cleanup.
3. **Joint crossing-interface compatibility.** Enumerate conservative local completion patterns for
   interacting pending must-cross cells and ask whether any mutually compatible combination remains.
   This is the principled successor to the falsified static forced-edge rule because it represents
   the multiple valid patterns that killed that rule.

Before adding policy, also instrument a neutral resource diagnostic:

`crossingSlack = freeInt - forcedFutureNeighbourRevisits`

Compare it on oracle-labelled alive/dead branches and known-solution prefixes by depth and remaining
must-cross count. If it discriminates, it may become useful for retention/search control; do not
jump directly to another score weight.

### 2. Landmark feasibility: attraction without completion interfaces

Must-turn has point urgency plus exact local exit guidance. Adjacent-turn and surround have
multi-cell satisfaction sets, and copied point/MST/reachability mechanisms have been weak or null.
Scattered surround visits are valid and dominate stored solutions, so a "clean orbit" cannot be
assumed without changing the game rule.

**Implied research target:** enumerate conservative completion interfaces: candidate satisfaction
cell, viable incoming axis, viable outgoing axis/chirality, and any local state needed to preserve
soundness. Ask whether at least one interface remains. Census stored solutions and dead labelled
prefixes before hot-path code.

This remains untested in its full interface-aware form. Do not relabel the already-null plain
reachability check as this experiment.

### 3. Repair/search cooperation has diagnostics but limited conditional policy

Repair tracks badness/elites and plateau signatures. Beam/DFS/admissible-order attempts also leave
useful failure evidence, but strategy selection is still mostly static before search begins.

The engineering substrate is specified in
[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md).
Its first gate is shadow-only: prove that typed artifacts are non-redundant/useful before any
handoff changes production behavior. If positive, prefer bounded pairwise handoffs or
failure-conditioned work slices over another broad cold-start portfolio reorder.

### 4. Residual resources are richer than scalar length/intersection slack

Length slack, intersection slack, reachable fresh volume, axes, portals, and flipper state are
separate resources. Equal scalar slack can hide very different future feasibility.

This is currently a **diagnostic/retention** direction, not a hard-prune claim. Candidate resource
vectors should first show better separation of live/dead states or better survival of known winning
prefixes at equal work.

## What the latest corpus-limit analysis adds

The latest sweeps make one product/research distinction especially important: current solver
comfort limits should be treated as a **benchmark frontier, not level-design restrictions**.

The six remaining Corpus-1 failures all stack the old high mechanic counts simultaneously and carry
long exact paths. Corpus-2 difficulty is much more strongly associated with portals, turn-family
load, navigation density, and path length/density than with raw `reqInt`. Artificially capping the
interesting mechanics would therefore domesticate the level language instead of fixing the solver.

A better use of the envelope is:

1. identify a high-success region;
2. generate controlled levels just beyond one boundary;
3. improve the solver until that band becomes routine without regression;
4. move the frontier outward; and
5. retain mixed-interaction tests so single-axis improvements generalize.

See the synthesis report above for the current measured frontier and caveats.

## What is not implied

- Another global weight profile; it cannot see missing state information.
- Unconditional beam widening; it adds capacity but no insight and has failed targeted regimes.
- A monolithic learned score; it blurs soundness and risks corpus/generator identification.
- Hard pruning from a useful correlation; guidance value is not an impossibility proof.
- Adjacent-turn exit guidance, naive adjacent-turn MST, plain surround/adjacent-turn reachability, or
  all-candidates deadlock as "untested."
- A plain joint must-pass/must-cross point tour; its unique catch rate is measured.
- Naive/full transposition pruning without a cheap sound key and new evidence.
- Generic bidirectional search; the sound frontier measurement closed it for the tested regime.
- Another static must-cross forced-edge rule without representing compatible alternative completion
  patterns.
- A low `reqInt` editor cap as a solver fix; current evidence does not support raw `reqInt` as a
  dominant failure driver.

## Recommended next sequence

1. **Neighbor-budget decision gate:** repeat or diagnose the 42-gained/28-lost full-population churn.
2. **Dynamic must-cross measurement:** instrument crossing slack on labelled branches and
   known-solution prefixes using the existing replay/harness infrastructure.
3. **Portal coverage probe:** derive and shadow-score a locally-abstaining portal extension of the
   neighbor-budget rule. Never simply remove the existing portal guard.
4. **Landmark interface census:** derive viable entry/exit/chirality interfaces for must-turn,
   adjacent-turn, and surround, explicitly excluding already-null plain reachability counterparts.
5. **Joint must-cross compatibility only if the cheaper probes justify it:** bounded local pattern
   enumeration, unique-catch scoring against the existing gauntlet, strict abstention outside the
   tractable cluster size.
6. **Cooperative-search instrumentation:** pursue the shadow-only artifact gate in
   `solver-interoperability-and-cooperation-plan.md`; do not change production allocation until the
   artifacts prove complementary value.
7. Promote any signal to pruning only after a written admissibility argument, stored-solution
   replay, independent/oracle falsification, and deterministic full-corpus cost/solve A/B.

## Cross-links for future agents

- Live queue: [`future-work.md`](future-work.md)
- Dynamic frontier synthesis:
  [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md)
- Neighbor-budget evidence:
  [`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md)
- Static must-cross failure / successful earlier derivations:
  [`../reports/2026-07-31-mustcross-forced-structure.md`](../reports/2026-07-31-mustcross-forced-structure.md)
- Reserved-intersection topology:
  [`../reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md)
- Portal-parity closed experiment:
  [`../reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md)
- Shared candidate-reasoner harness: [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md)
- Cooperative-search instrumentation plan:
  [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)

## Bottom line

The best remaining leads are no longer "add another scorer" or "describe hard levels with more
static counts." The evidence is converging on a more specific failure mode: the path gradually
consumes future completion opportunities, while the solver only partially represents the cost of
that consumption.

Must-cross neighbor-budget propagation is the strongest concrete example so far. It is sound and
material enough to change full-corpus solves, but its finite-budget churn warns that even correct
new information has to cooperate with search allocation. The next work should therefore measure and
reason about **dynamic resource/interface state**, use the existing shadow/oracle machinery to
falsify aggressively, and keep level design expressive while moving the solver benchmark frontier
outward.
