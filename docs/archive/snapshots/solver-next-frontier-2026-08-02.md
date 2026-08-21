# Solver Next Frontier: Research Directions and Experimental Priorities

**Status:** research roadmap, not an implementation plan  
**Date:** 2026-08-02  
**Scope:** improving solve rate on the remaining hard corpus, and collecting information that can expose genuinely new solver mechanisms

## Purpose

This document combines two kinds of material:

1. **Recommendations about ideas already present in Pathfinder's reports and planning documents**, updated in light of the latest measured results.
2. **New research directions** inspired by adjacent work in heuristic search, constraint programming, graph algorithms, decision diagrams, abstraction refinement, and algorithm selection.

The distinction matters. Existing repo conclusions are treated as evidence, not rebranded as new discoveries. New ideas are explicitly marked as such and should be regarded as hypotheses until they survive Pathfinder-specific falsification.

The central diagnosis is that Pathfinder currently has a missing middle layer:

- At one end are extremely cheap local rules, scalar bounds, and move-ordering heuristics.
- At the other end are heavyweight exact methods such as CP-SAT.
- Between them lies a largely unexplored family of compact global or semi-global representations that reason about **sets of possible completions** without solving the entire remaining puzzle.

The strongest opportunities below mostly occupy that middle layer.

---

# Part I: Recommendations on existing Pathfinder directions

## 1. Bounded global-consistency propagation remains the strongest direct solver bet

**Recommendation:** pursue, but do not implement as another isolated local prune.

The prune-gap work indicates that the current gauntlet still enters a large fraction of branches that are provably dead. Cheap local sound checks catch only a small portion of that gap. This strongly suggests that additional one-pattern rules will continue to produce weak coverage unless they share state and propagate consequences jointly.

The next propagator should reason simultaneously about:

- per-cell horizontal and vertical availability;
- remaining degree or usage capacity;
- exact remaining path length;
- exact remaining intersection count;
- outstanding must-pass, must-cross, must-turn, and surround obligations;
- component and corridor capacities;
- portal and flipper state where supported;
- entry and exit possibilities for constrained regions.

A useful conceptual cell domain is:

- unused;
- horizontal only;
- vertical only;
- both axes / crossing-capable;
- impossible.

Propagation should repeatedly remove impossible values, force edges or axis uses where only one option remains, and stop at a bounded fixpoint or iteration cap. Runtime use should initially be contradiction-only. Guidance can be considered later if the representation proves predictive.

**Do not pursue first:** a long series of bespoke must-cross or corridor micro-rules. The evidence increasingly favours one shared consistency system over a cabinet of unrelated deductions.

## 2. CP-SAT should be expanded as an offline oracle, not moved into the production loop

**Recommendation:** high priority as research infrastructure.

The corrected CP-SAT model has already demonstrated value by solving previously unresolved levels and harvesting validated hints. Its in-loop cost is far beyond the measured budget for a production global-inference pass, but offline it can answer questions that the heuristic solver cannot answer reliably.

Recommended staged expansion:

1. Harvest all remaining levels already inside the current model's mechanic scope.
2. Add portals next if practical, because they unlock a large additional population and have relatively crisp semantics.
3. Add fixed filters.
4. Add flippers only after the simpler stateful mechanics are validated.

The oracle should produce more than complete solutions:

- dead/live labels for sampled prefixes;
- earliest contradiction depth;
- alternative valid first moves;
- resource-attainability sets;
- minimal or near-minimal dead prefixes;
- solution-family and homotopy information;
- evidence for or against candidate dominance relations;
- counterexamples to proposed pruning keys.

A prefix dataset is likely more valuable to solver research than another pile of complete solutions, because it exposes the exact boundary where the production solver fails to distinguish possible from impossible futures.

## 3. Homotopy-class-aware diversity should move from diagnosis into controlled search experiments

**Recommendation:** implement first in telemetry and hint curation, then test in live search.

Existing measurements show that the current path-distance metric can classify paths from different homotopy classes as similar. That means the solver can believe it is preserving diversity while repeatedly preserving variations of the same topological idea.

Use homotopy information at three levels:

- **Hint curation:** guarantee representatives from distinct classes when they exist.
- **Attempt seeding:** deliberately seed different topological classes rather than only different random seeds or scalar profiles.
- **Live search:** include a compact partial-path topological signature in beam diversity or novelty selection.

The live version must be tested carefully because a partial path does not yet determine a final homotopy class. A coarse signature can still be useful if it captures meaningful region-separation choices without falsely claiming topological equivalence.

## 4. Repair work should proceed through descent-aware probing before more operators

**Recommendation:** instrument first; then build real prefix surgery only if the evidence identifies stable load-bearing decisions.

The repair investigation has repeatedly found the append-only wall. Soft random mechanisms can escape some plateaus; rigid suffix copying collapses under legality; constant tuning has failed; turn-aware biasing helps narrowly but does not yet generalize enough.

The next step should be **descent-aware shadow probing**:

- While a restart is still improving, record what each proposed intervention would have changed.
- Identify the earliest decision after which the repair trajectory becomes structurally unable to reach the target.
- Separate decisions that merely correlate with failure from decisions whose alternative branches repeatedly produce better descendants.

Only then build real prefix surgery. The most promising concrete operator is a bounded **two-cut reroute**:

1. choose two anchors on the current path;
2. remove the segment between them;
3. rebuild the middle segment from the full state at the first anchor;
4. replay the suffix only while it remains legal;
5. optionally repair the first invalid suffix junction.

This is materially different from exact-copy relinking because it reconstructs the middle under the true historical state instead of assuming a guide segment can be transplanted.

## 5. Learned participation is worth revisiting, but not as the old portfolio scheduler

**Recommendation:** learn guaranteed participation and stopping decisions, not a wholesale replacement schedule.

The failed portfolio experiment does not imply that all algorithm selection is useless. It showed that the measured scheduler variants were slower than the legacy order on the tested population. Separately, the admissible-order node reserve produced a large gain on its target population, demonstrating that **specialist starvation is real**.

A narrower learned system should answer:

- Which specialist families deserve a guaranteed minimum node floor?
- Which families are almost certainly irrelevant for this level?
- At what budget does the conditional probability of success collapse?
- Which attempt should begin earlier without suppressing the robust baseline?

This can remain deterministic by using fixed models, thresholds, and tie-breaks. It should be evaluated as participation control layered over the current solver, not as another ambitious portfolio replacement.

## 6. Family analysis should use solver-response vectors, not only static level features

**Recommendation:** high-value analysis project.

The sibling/cousin system creates controlled level families, but the most revealing representation may be how the solver reacts to each mutation.

For every family member, collect a response vector containing:

- solved or unsolved under each attempt family;
- winner identity;
- nodes and time by attempt;
- best badness trajectory;
- winning-path rank statistics;
- homotopy-class availability;
- prune-gap catch rates;
- repair plateau signatures;
- effect of each experimental inference module;
- decision depth at which the winning path is lost.

Cluster levels by these response vectors. Two levels with very different board geometry may share the same solver failure mechanism; two visually similar siblings may produce entirely different search behaviour. Response-space clustering is more likely to reveal missing solver mechanisms than another static difficulty classifier.

## 7. Richer nogoods and dominance relations should remain an offline falsification project

**Recommendation:** do not implement runtime caching until candidate keys survive adversarial testing.

The naive nogood key has already been shown unsound. Any future key may need to include some combination of:

- head position and entry direction;
- per-cell edge usage or axis usage;
- visit counts;
- portal and flipper state;
- obligation state;
- residual component topology;
- degree deficits;
- remaining exact resources.

At that point, key size and hit rate may erase the payoff. Before implementation, use the exact oracle to search for pairs of states that collide under a candidate key but differ in completion feasibility. Treat each key as a theorem under attack.

A useful outcome is not necessarily a global transposition table. The same process may uncover **restricted dominance relations** valid only inside a region, mechanic subset, or specialist search.

## 8. Existing directions that should remain deprioritized

Based on current evidence, avoid spending another major campaign on:

- scalar-weight tuning without a new representation;
- isolated local connectivity refinements;
- naive memoization or compressed global state keys;
- CP-SAT calls inside ordinary node expansion;
- exact-copy repair relinking;
- generic portfolio scheduling that replaces the existing fallback order;
- more repair constant tuning;
- broad learned winning-profile classification without a sharper target variable.

These can be reconsidered only if new telemetry changes the underlying premise.

---

# Part II: New Pathfinder-specific research ideas

## New idea A: Eulerian completion relaxation

### Core idea

Temporarily ignore chronology and represent a completed solution as a set of used grid edges. Under the no-edge-reuse rule, the final drawing forms an Euler trail through that edge set.

This gives structural constraints:

- gate and goal have endpoint parity;
- ordinary internal path cells have degree 2;
- true crossing cells have horizontal degree 2 and vertical degree 2, hence total degree 4;
- must-cross cells require both axes;
- filters restrict legal incident-edge pairings;
- exact path length becomes exact edge cardinality;
- exact intersections become an exact count of degree-4 crossing configurations;
- the current prefix has already consumed part of each cell's degree capacity.

The relaxed question is:

> Does any degree-constrained edge set exist that could complete this prefix with the exact remaining edge count and intersection count?

Ignore ordering, full connectedness, and difficult stateful mechanics initially. Failure remains a sound prune because the relaxation is permissive.

### Possible implementations

- f-factor or b-matching feasibility;
- bounded integer flow;
- small bitset dynamic programming over degree deficits;
- offline exact analysis that distils cheaper rules.

### Information it could provide

- minimum and maximum remaining edge count;
- minimum and maximum number of possible crossing cells;
- impossible degree assignments;
- forced or impossible edges;
- parity contradictions;
- cells whose remaining degree demand cannot be met.

### Why this is interesting

It couples exact length and exact intersections as properties of one final graph rather than treating them as mostly separate counters.

### Kill criterion

Reject as a runtime direction if an offline prototype fails to eliminate a meaningful fraction of CP-SAT-proven dead prefixes, or if the relaxation's permissiveness makes it nearly always feasible.

---

## New idea B: Block-cut resource spectra

### Core idea

Decompose the residual accessible graph into biconnected components, articulation cells, corridors, and chambers. For each component, compute a compact set of achievable resource combinations, for example:

`(steps consumed, new intersections, entry side, exit side)`

Small obligation summaries can be added where necessary.

Combine component spectra along the block-cut tree using bitset convolution.

### What this catches

Ordinary lower and upper bounds treat every value inside a range as attainable. Resource spectra detect holes.

A residual state may permit between 18 and 30 additional moves but only permit even totals, or permit length 23 only when it creates at least two intersections. The target pair can therefore be impossible even when all scalar bounds pass.

### Suggested representation

For each region and boundary condition, maintain a bitset indexed by:

`remaining length × remaining intersections`

Pathfinder's resource dimensions are small enough that this may be practical.

### Initial experiment

Run in shadow mode on a labelled dead/live prefix set:

- measure target-pair absence on dead prefixes;
- measure false rejection on known-live prefixes, which must remain zero;
- record cost by residual graph size and number of articulation regions;
- compare against the existing prune gap by depth.

### Why this ranks highly

It is a natural middle-layer propagator, jointly addresses exact resources, and has a plausible bitset implementation.

---

## New idea C: Depth-limited future-cone MDD

### Core idea

From selected beam states, build a compressed multi-valued decision diagram for the next `k` moves, perhaps 8–20.

Each layer is one future step. States can merge under a deliberately coarse signature such as:

- current cell;
- entry direction or axis;
- remaining steps and intersections;
- obligation masks;
- portal/flipper state;
- coarse residual-use signature.

### Outputs

- zero abstract accepting continuations: sound prune only if the abstraction is conservative;
- continuation count or entropy: optionality guidance;
- forced first moves;
- distinct abstract future classes;
- candidate suffix witnesses;
- evidence that two beam states are functionally redundant.

### Obligation mutex propagation

For each outstanding obligation, compute possible future layers and modes. Examples:

- must-pass P can occur only at layers 6–10;
- must-cross C can occur only vertically at layers 9–13;
- portal use forces a particular state transition;
- turn obligation T requires a restricted entry/exit pair.

Propagate incompatibilities. If two mandatory events cannot coexist in any abstract future, the prefix is dead. If only one ordering survives, use it as guidance or a forced macro-order relation.

### Kill criterion

Abandon runtime use if diagram construction cannot remain bounded or if state merging must retain almost the full path history to avoid uselessly weak results.

---

## New idea D: CEGAR-driven propagator design

### Core idea

Use counterexample-guided abstraction refinement offline to discover which distinctions the cheap solver representation is missing.

1. Begin with a permissive abstract completion model.
2. Ask it to complete a prefix known dead by CP-SAT.
3. Inspect why the abstract completion cannot be realized concretely.
4. Add one distinction to the abstraction.
5. Repeat across many prefixes.

Candidate refinements include:

- entry axis into a region;
- component visitation count;
- crossing capacity;
- portal parity;
- degree deficit;
- obligation ordering;
- corridor occupancy;
- required exit side;
- cell-axis exclusivity.

### Goal

Let the corpus help design the smallest useful global propagator rather than guessing its complete state representation in advance.

### Deliverables

- a ranked list of missing distinctions;
- abstractions with measured dead-prefix discrimination;
- candidate runtime features;
- concrete counterexamples explaining why weaker abstractions fail.

### Important boundary

CEGAR is proposed as an offline research machine. The production solver would receive a compact distilled abstraction or set of deductions, not run a refinement loop per level.

---

## New idea E: Automatic pruning-rule synthesis and falsification

### Core idea

Define a grammar of candidate sound statements involving:

- component capacities;
- parity equations;
- degree-deficit inequalities;
- axis availability;
- obligation-order implications;
- corridor usage;
- remaining length/intersection combinations;
- small topological patterns.

Generate candidate rules, then use the exact oracle to search aggressively for counterexamples.

### Required discipline

Every runtime rule should have:

- a clear logical argument;
- an automated counterexample search;
- exhaustive verification on a bounded small-board universe where possible;
- a certificate or diagnostic payload emitted when it fires.

### Why this fits Pathfinder

The project has already paid the cost of an unsound memoization premise. Automated adversarial falsification should be part of the feature, not an afterthought.

### Possible outcome

The most valuable result may be a library of disproved attractive rules. That prevents future agents from repeatedly rebuilding the same trap.

---

## New idea F: Failure-directed feature activity

### Core idea

During one solve, let contradictions leave temporary scars.

Assign recency-decayed activity to decision features rather than complete states, for example:

- entering a cell from a particular side;
- postponing a named obligation;
- consuming one axis at a potential crossing cell;
- sealing a component with obligations inside;
- using a portal under a specific resource budget;
- creating a degree deficit;
- making a sequence of moves away from an obligation cluster.

When a branch reaches a contradiction, increase activity for the features implicated in its recent ancestry. Slightly penalize similar choices in subsequent branching. Maintain separate positive credit for features on successful or strongly improving trajectories.

### Safety

This is move ordering only. It must not prune.

### Determinism

Use fixed update rules, fixed decay, fixed feature ordering, and no stochastic sampling.

### Why it may work

The present solver repeatedly discovers the same shape of failure within a level but does not remember it unless a hand-designed heuristic already encodes that pattern.

### Kill criterion

Reject if activity merely amplifies early heuristic errors, reduces diversity, or produces gains only through nondeterministic tie changes.

---

## New idea G: Rectangle Search or depth-revisiting beam exploration

### Core idea

The current beam may discard the winning prefix at one depth and spend the rest of the budget exploring descendants of the wrong survivors. Instead of widening every depth uniformly, allocate search across a rectangle:

- one axis is path depth;
- the other is rank outside the surviving beam.

Repeatedly revisit alternatives at multiple depth levels.

### Why this is an unusually clean experiment

It can wrap the current scorer with minimal heuristic changes. Equal-node comparison can isolate search scheduling from heuristic quality.

### Telemetry required

- winning move rank by depth;
- first depth where the known solution leaves the beam;
- score margin at extinction;
- cost of recovering the path under each revisit policy;
- solve gain stratified by extinction depth.

### Related variant

Test best-leaf-first discrepancy search, where the cost of deviating from the heuristic's preferred child determines which frontier leaf is explored next.

### Kill criterion

Reject if gains disappear under equal-work comparison or if revisit overhead merely replays broad low-value prefixes.

---

## New idea H: Macro search over obligation order and resource allocation

### Core idea

Search first over strategic events rather than cells.

Macro decisions can include:

- next obligation or obligation subset;
- partial order among must-pass and must-cross events;
- region entry and exit sides;
- segment length allocation;
- segment intersection allocation;
- portal use phase;
- flipper phase;
- homotopy class.

A low-level search then attempts to realize each macro segment.

### Learning from failure

When a low-level route fails, learn a macro nogood such as:

> `A before C` with fewer than four post-C steps is impossible under this entry-side combination.

This statement can reject many cell-level prefixes.

### Safer first version

Do not replace ordinary search. Generate several plausible macro skeletons offline or as specialist attempts, then seed the existing solver with their preferred ordering and resource allocation.

### Kill criterion

Reject if the macro abstraction has to encode most of the cell-level path to predict feasibility, or if low-level routing failures provide no reusable macro information.

---

## New idea I: Topology-first solution skeletons

### Core idea

Separate two questions:

1. What final path skeletons are structurally possible?
2. Which skeletons admit an ordering compatible with history-sensitive mechanics?

A skeleton can specify:

- used cells and edges;
- crossing cells;
- degree-2 versus degree-4 cells;
- chamber connections;
- rough homotopy;
- portal use;
- required region traversal.

The chronology stage then checks filters, flippers, turns, and the exact gate-to-goal ordering.

### Potential technology

- frontier-based graph enumeration;
- zero-suppressed decision diagrams;
- compact compilation of restricted path families;
- degree-constrained subgraph generation.

### Best initial scope

- zero-intersection levels;
- one or two prescribed crossing cells;
- mechanics-free residual regions;
- small boards;
- offline solution-family enumeration.

### Value even if it never ships

A skeleton compiler could become an independent oracle with different blind spots from CP-SAT and could expose the size and topology of the solution space.

---

## New idea J: Backward compatibility envelopes

### Core idea

Do not revisit exact meet-in-the-middle. Build abstract information backward from the goal and intersect it with forward prefixes.

A backward envelope might record:

- reachable remaining lengths;
- reachable remaining intersection counts;
- possible entry axes;
- portal/flipper state requirements;
- coarse residual cell constraints;
- possible obligation subsets completed in the suffix.

A forward state is rejected or guided by compatibility with these envelopes.

### Why this differs from the rejected MITM premise

There is no exact state rendezvous and no assumption that the suffix can be represented independently of all history. The backward object is deliberately permissive and functions as a goal-side abstraction.

### Initial experiment

Build envelopes only for simple mechanic subsets and measure whether they reject dead prefixes not caught by forward bounds.

---

## New idea K: Continuation-count and entropy guidance

### Core idea

Replace some scalar notions of “good-looking” with estimates of future optionality.

For sampled states, estimate:

- number of legal continuations to depth `k`;
- number of abstract accepting continuations;
- distribution of first moves among those continuations;
- number of homotopy or region-order classes;
- earliest forced decision;
- entropy of future resource allocations.

Use this only as guidance initially. Some hard solutions may pass through low-entropy bottlenecks, so “more futures” is not automatically better.

### Most useful role

Continuation statistics can diagnose whether failures come from:

- choosing branches that are already nearly forced and wrong;
- overvaluing huge but barren continuation spaces;
- failing to preserve a rare low-volume class containing the solution.

---

## New idea L: Restricted pattern databases or learned abstractions

### Core idea

Build small exact abstractions over selected state variables and precompute distance or feasibility information.

Possible patterns:

- a cluster of must-cross cells plus entry axis;
- portal state plus remaining portal-adjacent obligations;
- a constrained region and its boundary usage;
- pending turns plus local edge occupancy;
- one articulation chain and its required visits.

Patterns can be selected by CEGAR or from minimal dead-core clusters.

### Runtime role

- lower bounds;
- impossibility lookup;
- move ordering;
- specialist selection.

### Kill criterion

Reject patterns whose lookup state requires so much path history that table size explodes or hit rate collapses.

---

# Part III: New information to collect

## 1. Decision regret and winning-path extinction

For every known solution path under every tested configuration, record:

- rank of the winning move at each depth;
- score gap to the selected move;
- beam survival margin;
- first depth where the winning prefix is discarded;
- whether it was discarded by scoring, diversity, hard pruning, or specialist starvation;
- amount of subsequent work after extinction.

This separates four fundamentally different failures:

1. bad move ordering;
2. insufficient width or revisit policy;
3. unsound or overaggressive pruning;
4. budget allocation failure.

## 2. Strong-branching labels

At sampled states, give every legal child an equal small probe budget. Record:

- immediate contradiction rate;
- best badness reached;
- live/dead oracle label where available;
- whether the child eventually solves under a larger budget;
- resource and topology changes caused by the move.

The result is a training and analysis set for discovering missing move-ordering features. A small interpretable ranking model is preferable to an opaque model unless the latter demonstrates a decisive advantage.

## 3. Minimal dead cores

Given a dead prefix, remove or relax historical commitments until the state becomes live. The remaining commitments approximate a minimal explanation of failure.

Cluster cores by:

- geometry;
- mechanic state;
- degree deficit;
- obligation order;
- component closure;
- crossing capacity;
- portal/flipper phase.

Minimal dead cores are likely to expose reusable pruning rules more clearly than complete dead paths.

## 4. Continuation spectra

For sampled prefixes, compute or estimate:

- valid completion count;
- abstract completion count;
- attainable `(remaining length, remaining intersections)` pairs;
- homotopy-class count;
- valid first-move distribution;
- forced-event ordering;
- earliest forced move depth.

Store both exact and approximate provenance.

## 5. Attempt hazard curves

For every specialist family, estimate:

> probability of eventual success given that the attempt has already consumed `N` nodes without solving.

Use censored-run methods rather than treating every timeout as an ordinary failure. This supports evidence-based early stopping and node reserves.

## 6. Prune value weighted by avoided work

Do not rank a propagator only by the number of dead prefixes it detects. Record:

- depth of detection;
- estimated subtree size avoided;
- time spent to detect;
- overlap with existing gauntlet deductions;
- unique dead branches caught;
- effect on winning-path states;
- amortized cost per candidate.

A rare prune near the root may be worth much more than a frequent prune one move before failure.

## 7. Explanation payloads for every experimental inference

Each prune or forced deduction should optionally emit:

- rule or module name;
- state quantities used;
- contradiction certificate or failed target resource pair;
- depth;
- estimated work avoided;
- whether the exact oracle confirms death.

This makes negative results interpretable and allows agents to audit soundness.

---

# Part IV: Experimental priority order

## Tier 1: highest expected value

### 1. Block-cut resource spectra in shadow mode

Why first:

- couples exact length and intersections;
- naturally uses compact bitsets;
- fits the measured need for global propagation;
- has a clear soundness story;
- can be evaluated without changing search.

Success gate:

- zero false rejections on known-live states;
- meaningful unique catch rate on oracle-dead prefixes;
- acceptable amortized cost at selected invocation depths.

### 2. Winning-path extinction and decision-regret telemetry

Why first:

- low conceptual risk;
- informs Rectangle Search, beam width, move ordering, and specialist allocation;
- identifies whether a new pruning campaign is even aimed at the dominant failure mechanism.

### 3. CP-SAT prefix oracle and dead-core dataset

Why first:

- underpins CEGAR, rule falsification, dominance testing, and propagator evaluation;
- converts exact solving work into reusable research data.

## Tier 2: strong medium-term candidates

### 4. Depth-limited future-cone MDD

Begin as a shadow diagnostic. Enable pruning only after conservative-abstraction soundness is established.

### 5. Rectangle Search wrapper

Test at equal node budgets using the current scorer. This is the cheapest opportunity for a surprising direct solve gain.

### 6. Failure-directed feature activity

Implement as deterministic move-ordering feedback, never pruning.

### 7. Homotopy-aware hint and attempt diversity

Ship diagnostics and curation first; then live beam experiments.

## Tier 3: research machinery and structural bets

### 8. Eulerian completion relaxation

Prototype offline against labelled prefixes. Promote only if it meaningfully closes the prune gap.

### 9. CEGAR abstraction refinement

Use evidence from spectra, MDDs, and dead cores to define the initial abstraction vocabulary.

### 10. Macro obligation-order search

Start as a specialist or seed generator, not a replacement architecture.

### 11. Backward compatibility envelopes

Restrict initial scope to mechanic-light subsets.

## Tier 4: moonshots

### 12. Topology-first skeleton compilation

Valuable as an independent oracle or family analyser even if it never enters the production solver.

### 13. Automatic rule synthesis

Powerful, but only after oracle infrastructure and proof/certificate conventions are mature.

---

# Part V: Suggested campaign sequence

## Campaign A: establish the failure boundary

1. Add decision-regret and winning-path extinction telemetry.
2. Sample prefixes from solved and unsolved trajectories.
3. Label in-scope prefixes with CP-SAT.
4. Build dead-core and continuation-spectrum datasets.
5. Report failure categories by depth and avoided-work estimate.

**Output:** a corpus showing exactly where the solver loses viable futures and which dead states look deceptively live.

## Campaign B: test the missing-middle hypothesis

1. Prototype block-cut resource spectra.
2. Prototype Eulerian degree feasibility.
3. Prototype a depth-limited future MDD.
4. Run all three in shadow mode on the same prefix dataset.
5. Compare unique catch, overlap, depth, cost, and explanation quality.

**Output:** evidence for which compact global representation has the best information-per-microsecond ratio.

## Campaign C: improve exploration without changing inference

1. Wrap current scoring in Rectangle Search or a depth-revisit schedule.
2. Add best-leaf-first discrepancy as a second scheduling experiment.
3. Add solve-local failure-directed feature activity.
4. Compare under equal nodes and fixed deterministic tie-breaks.

**Output:** separation of search-schedule gains from inference gains.

## Campaign D: let failures design the abstraction

1. Feed labelled dead prefixes to a CEGAR loop.
2. Record which distinctions repeatedly eliminate spurious completions.
3. Cluster minimal dead cores.
4. Select a small set of candidate propagated variables or pattern databases.
5. Implement only the distinctions with broad explanatory coverage.

**Output:** a corpus-derived design for the next production global propagator.

## Campaign E: structural specialists

1. Macro obligation-order specialist.
2. Backward compatibility-envelope specialist.
3. Restricted topology-first skeleton compiler.
4. Evaluate each for unique solves, not merely total speed.

**Output:** specialist methods aimed at hard families the general solver still misses.

---

# Part VI: Verification and reporting rules

All experimental solver work should preserve the repo's existing verification culture and add the following requirements.

## Soundness classes

Every mechanism must be labelled as one of:

- **sound prune**;
- **sound lower/upper bound**;
- **forced deduction**;
- **move ordering only**;
- **diversity policy**;
- **budget policy**;
- **offline oracle or analysis only**.

Do not allow a guidance signal to quietly become a prune.

## Equal-work reporting

Report at minimum:

- equal-node results;
- wall-clock results;
- unique solves gained and lost;
- attempt-level attribution;
- deterministic repeatability;
- published-corpus preservation;
- full timing overhead, not only target-family performance.

## Negative-result preservation

For every serious experiment, record:

- exact premise;
- implementation scope;
- datasets and budgets;
- result;
- confounds ruled out;
- whether the mechanism is disproved, merely underpowered, or still plausible in a narrower form.

## Provenance

Generated labels, hints, dead cores, and learned models should record:

- originating solver or oracle;
- model/version/configuration;
- budget;
- timestamp;
- exactness status;
- mechanics supported;
- whether the data was used for training, selection, or final evaluation.

---

# Part VII: Literature seeds

These references are inspiration, not evidence that the method transfers to Pathfinder.

- Sofia Lemons, Wheeler Ruml, Rob Holte, and Carlos Linares Lopez, **"Rectangle Search: An Anytime Beam Search"**, AAAI 2024. DOI: <https://doi.org/10.1609/aaai.v38i18.30063>
- Mingwei Zhang, Liangda Fang, Zhenhao Gu, Quanlong Guan, and Yong Lai, **"A Multi-Valued Decision Diagram-Based Approach to Constrained Optimal Path Problems over Directed Acyclic Graphs"**, IJCAI 2024. DOI: <https://doi.org/10.24963/ijcai.2024/219>
- Jendrik Seipp and Malte Helmert, **"Counterexample-Guided Cartesian Abstraction Refinement"**, ICAPS 2013. DOI: <https://doi.org/10.1609/icaps.v23i1.13605>
- Alexander Rovner, Silvan Sievers, and Malte Helmert, **"Counterexample-Guided Abstraction Refinement for Pattern Selection in Optimal Classical Planning"**, ICAPS 2019. DOI: <https://doi.org/10.1609/icaps.v29i1.3499>
- Martín Pozo, Alvaro Torralba, and Carlos Linares Lopez, **"When CEGAR Meets Regression: A Love Story in Optimal Classical Planning"**, AAAI 2024. DOI: <https://doi.org/10.1609/aaai.v38i18.30004>
- Yang Zhang and Hongbo Li, **"Right Branches Matter in Failure-based Variable Ordering Heuristics"**, AAAI 2026. DOI: <https://doi.org/10.1609/aaai.v40i17.38455>
- Yukihide Kohira, Suguru Suehiro, and Atsushi Takahashi, **"A Fast Longer Path Algorithm for Routing Grid with Obstacles Using Biconnectivity Based Length Upper Bound"**, IEICE 2009. DOI: <https://doi.org/10.1587/transfun.E92.A.2971>
- Tzur Shubi, Solomon Eyal Shimony, Ariel Felner, and Shahaf Shperberg, **"Bidirectional Heuristic Search in Longest Path Problems"**, SoCS 2025. DOI: <https://doi.org/10.1609/socs.v18i1.36012>
- Norihito Yasuda, Teruji Sugaya, and Shin-Ichi Minato, **"Fast Compilation of s-t Paths on a Graph for Counting and Enumeration"**, PMLR 2017. <https://proceedings.mlr.press/v73/teruji-sugaya17a.html>
- Augustin Delecluse, Pierre Schaus, and Pascal Van Hentenryck, **"Sequence Variables: A Constraint Programming Computational Domain for Routing and Sequencing"**, 2025 preprint. <https://arxiv.org/abs/2510.09373>

---

# Final recommendation

The immediate goal should not be to bolt another instinct onto the solver. It should be to build one compact way of seeing the **shape of the remaining solution space**.

The strongest near-term path is:

1. collect winning-path extinction and oracle-labelled prefix data;
2. test block-cut resource spectra;
3. test a bounded future-cone MDD;
4. compare both against an Eulerian degree relaxation;
5. use CEGAR and dead-core clustering to determine what the production propagator must remember;
6. independently test Rectangle Search and failure-directed activity as exploration improvements.

This sequence is designed so that even failed solver ideas produce valuable information. The experiments should leave behind labelled prefixes, contradiction explanations, resource spectra, extinction traces, and disproved rule candidates rather than another isolated yes/no benchmark result.
