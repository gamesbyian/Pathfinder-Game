# Solver Next Frontier: Multilingual Research Update

**Status:** research refinement and expansion  
**Date:** 2026-08-02  
**Companion to:** [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md)  
**Scope:** literature-informed refinement of the existing roadmap, including new hypotheses, revised priorities, likely failure modes, and concrete experiments

## How this update should be read

This document does not replace the original roadmap's descriptions of the candidate ideas. It sharpens them after a multilingual research pass across heuristic search, constraint programming, graph algorithms, exact-length path problems, abstraction refinement, decision diagrams, path planning, partial-order reduction, large-neighbourhood search, and algorithm selection.

Where this document changes priority or scope, this document should be treated as the newer recommendation.

The strongest conclusion from the research is that "build a global propagator" is still too broad to be an actionable project. The literature points toward three distinct middle-layer machines:

1. **separator resource reasoning**, which asks whether exact resources can be distributed through residual regions;
2. **bounded future compatibility**, which asks whether mandatory future events can coexist;
3. **learned abstraction**, which asks what information must be remembered to distinguish spurious completions from realizable ones.

They should be evaluated independently against the same labelled prefix corpus before any attempt is made to combine them.

---

# 1. Research coverage and multilingual findings

The research pass used English, Chinese, Japanese, and German search terminology.

## English-language literature

The strongest directly relevant bodies of work were:

- constrained path search with multi-valued decision diagrams;
- counterexample-guided abstraction refinement in classical planning;
- beam-search variants that revisit discarded depth layers;
- longest-path search with structural upper bounds;
- bidirectional longest-path search;
- failure-based branching heuristics;
- runtime survival analysis and algorithm selection;
- exact detour and exact-length path parameterizations;
- sequence variables and large-neighbourhood search;
- frontier-based path-family compilation.

## Chinese-language literature

The most useful distinct connection was **MDD-based mutex propagation** in multi-agent path finding. The relevant conceptual result is not that MAPF techniques transfer directly, but that one general incompatibility-propagation mechanism can subsume collections of hand-coded rectangle and corridor conflict rules.

For Pathfinder, that suggests reasoning about the compatibility of mandatory future events, rather than continuing to add isolated must-cross, turn, and corridor deductions.

## Japanese-language literature

Japanese searches reinforced the relevance of:

- biconnectivity-based bounds for long grid routes;
- ZDD and frontier-based path enumeration;
- compact compilation of path families.

Much of the primary publication trail was available in English proceedings, so there was no important language-exclusive result to preserve separately.

## German-language literature

German searches mainly reinforced work from the planning and abstraction community, especially Cartesian abstraction, CEGAR, pattern selection, and regression-based refinement. Again, the primary papers were generally published in English.

## Important negative result from the multilingual pass

No language revealed a hidden, mature algorithm that obviously solves Pathfinder's exact history-sensitive problem. The value came from connecting methods that are usually discussed under different disciplinary vocabularies.

---

# 2. Revised central diagnosis

The original roadmap's "missing middle layer" diagnosis survives the research pass.

Pathfinder has:

- cheap local rules and scalar bounds;
- expensive exact models;
- relatively little machinery for representing families of possible completions compositionally.

The refined central research question is:

> **What is the smallest residual interface that preserves enough completion-feasibility information to support useful composition?**

A residual interface may contain:

- boundary cells;
- entry and exit directions;
- used axis at each boundary cell;
- degree parity or local transition state;
- exact length contribution;
- exact intersection contribution;
- obligation subset completed;
- mechanic-state delta;
- connectivity relation among boundary points;
- whether the head remains inside or outside the region.

This interface vocabulary can potentially serve several projects at once:

- separator-state resource dynamic programming;
- repair-anchor equivalence;
- backward compatibility envelopes;
- detour gadgets;
- macro obligation routing;
- restricted dominance relations;
- CEGAR abstractions;
- topology-aware search diversity.

This makes **residual-interface discovery** the most important unifying research programme.

---

# 3. Refined recommendation: separator-state resource dynamic programming

The original "block-cut resource spectra" idea remains the strongest direct propagation candidate, but its initial formulation was too coarse.

## 3.1 Replace component spectra with boundary-conditioned spectra

Do not attach one spectrum to each residual component. Attach spectra to component **boundary states**.

For a component separated from the rest of the residual graph by a small boundary, represent:

- which boundary cells are used;
- which boundary cells are entry or exit points;
- direction or axis at each used boundary cell;
- parity or degree requirement at each boundary cell;
- steps consumed inside the component;
- intersections created inside the component;
- obligations completed inside the component;
- head location relative to the component;
- number of allowed entries or traversal episodes where necessary.

The component's value is then a set of feasible tuples under each boundary interpretation.

## 3.2 Combine spectra compositionally

For articulation-separated regions, combine spectra along the block-cut tree.

For slightly larger separators, use a bounded tree-decomposition or frontier-style dynamic programme only when the measured interface width is sufficiently small.

The first implementation should not attempt a general treewidth solver. It should opportunistically exploit small separators produced by the current prefix.

## 3.3 Store Pareto-reduced spectra

States can be dominated only when they have identical boundary semantics and one is no worse in all exact-resource dimensions.

This is a much safer environment for dominance than a global transposition table because the separator provides an explicit interface behind which internal differences may become irrelevant.

Every proposed dominance relation must still be falsified against exact completion labels.

## 3.4 What this representation can prove

The key benefit is detecting holes in resource space.

Scalar bounds may say:

- minimum remaining length: 18;
- maximum remaining length: 30;
- target remaining length: 23.

The boundary-conditioned spectrum may reveal that only lengths 18, 20, 22, 24, 26, 28, and 30 are realizable, or that length 23 is realizable only with at least two additional intersections.

This joins exact length and exact intersections into one attainability problem.

## 3.5 Invocation policy

Run only when a cheap residual decomposition finds:

- articulation structure;
- a separator below a fixed size;
- multiple obligation-bearing chambers;
- tight remaining resource budgets;
- a region whose interface has previously compiled successfully.

Do not pay decomposition and DP costs indiscriminately on open boards.

## 3.6 Shadow-mode experiment

For sampled prefixes:

1. compute residual articulation and separator statistics;
2. compile boundary-conditioned resource spectra where feasible;
3. test whether the true target pair is present;
4. compare against exact live/dead labels;
5. measure unique dead-prefix catches beyond the current gauntlet;
6. weight catches by depth and estimated subtree avoided;
7. report interface size, table size, and construction time.

## 3.7 Kill criteria

Deprioritize runtime use if:

- small separators are rare on the hard corpus;
- boundary-state counts explode even at width two or three;
- spectra reject very few oracle-dead prefixes;
- most catches occur only immediately before ordinary failure;
- history-sensitive mechanics require nearly complete path state at the interface.

## Updated recommendation

Rename the project:

**Separator-state resource DP**

This is now the highest-priority direct propagator experiment.

---

# 4. Refined recommendation: bounded obligation-compatibility MDD

The original future-cone MDD idea should not attempt to model approximate full paths. That likely recreates the original state explosion inside a new data structure.

## 4.1 Model future events, not future paths

For a bounded horizon, represent possible placements and modes of mandatory events:

- visiting must-pass P;
- crossing must-cross C horizontally;
- crossing C vertically;
- satisfying turn T with a particular entry and exit pair;
- entering or leaving residual region R;
- activating a portal transition;
- consuming a fresh cell;
- creating an intersection;
- reaching the goal with a particular arrival axis.

Each MDD layer represents a future move index. Domains contain event-mode possibilities supported by a permissive reachability model.

## 4.2 Propagate mutexes

Construct incompatibility relations among event-mode placements.

Examples:

- two obligations each have feasible layer ranges, but no pair of placements can coexist;
- a must-cross axis choice blocks every future placement of a turn obligation;
- portal use and a required crossing impose incompatible parity;
- two region-entry events require the same exhausted corridor capacity;
- one event ordering necessarily consumes too many remaining steps.

If all placements of a mandatory event are removed, the prefix is dead.

If one ordering or axis survives, use it as a forced macro relation or move-ordering signal.

## 4.3 Borrow the cardinal-conflict distinction

Classify event conflicts by exact-resource consequence:

- **cardinal:** every coexistence arrangement exceeds a required resource;
- **semi-cardinal:** one mode or order remains feasible, while another necessarily exceeds the budget;
- **non-cardinal:** multiple compatible arrangements remain.

This classification can guide both pruning and search ordering.

## 4.4 Conservative abstraction requirement

A zero-continuation result is a sound prune only if the MDD is built from a permissive abstraction. Under-approximating reachability would be unsafe.

Early versions should therefore be used for diagnostics and mutex discovery rather than pruning.

## 4.5 Initial experiment

Use a horizon of 8, 12, and 16 moves on the same labelled prefix sample.

Measure:

- event-domain size;
- mutex count;
- mandatory events eliminated;
- dead prefixes detected;
- forced order or axis deductions;
- construction cost;
- overlap with separator DP;
- accuracy of guidance on known winning prefixes.

## 4.6 Kill criteria

Deprioritize if:

- useful event domains require nearly full cell-history state;
- bounded horizons rarely contain more than one relevant obligation;
- mutex computation is dominated by ordinary path enumeration;
- the abstraction is either unsafe or too permissive to eliminate anything.

## Updated recommendation

Rename the project:

**Bounded obligation-compatibility MDD**

It should be benchmarked independently from separator DP, not folded into a universal propagator first.

---

# 5. Refined recommendation: bidirectional multi-abstraction CEGAR

The original CEGAR idea remains strong as research infrastructure, but the planning literature suggests three important upgrades.

## 5.1 Refine from both directions

A forward abstract completion reveals what the current prefix has made impossible.

Backward regression from the goal reveals what every valid ending would have required before the current state.

A combined system should identify:

- forward flaws;
- backward flaws;
- interface flaws where prefix and suffix abstractions cannot meet consistently.

Backward refinement is particularly valuable because Pathfinder already tracks forward history richly and has comparatively weak goal-side reasoning.

## 5.2 Refine against multiple spurious completions

Do not accept the first arbitrary abstract counterexample as the refinement target.

Generate a diverse set of spurious abstract completions and rank candidate distinctions by:

- number of counterexamples eliminated;
- number of other dead prefixes explained;
- separation of live/dead near twins;
- projected runtime cost;
- support across multiple mechanics and level families.

This turns refinement selection into a coverage problem rather than a one-counterexample reaction.

## 5.3 Build several small abstractions

Prefer a portfolio of compact abstractions over one monolith:

- degree and axis abstraction;
- exact-resource abstraction;
- separator-usage abstraction;
- obligation-order abstraction;
- turn-state abstraction;
- portal-state abstraction;
- goal-regression abstraction.

Combine their conclusions conservatively.

## 5.4 Required outputs

The CEGAR project should produce:

- a ranked vocabulary of missing distinctions;
- several compact complementary abstractions;
- a library of spurious-completion families;
- counterexamples showing why weaker abstractions fail;
- estimated runtime cost for carrying each distinction;
- candidate residual interfaces for other solver modules.

## 5.5 Boundary

CEGAR remains offline research machinery. The production solver receives distilled abstractions, tables, or deductions.

---

# 6. Refined recommendation: Eulerian and local-transition relaxation hierarchy

The original Eulerian completion relaxation is promising but should not begin as a full matching model.

## 6.1 Degree is not enough

A degree-four cell does not automatically represent a valid Pathfinder intersection. Local traversal pairing and chronology matter.

The local domain should distinguish transition patterns:

- unused;
- endpoint with direction;
- straight horizontal;
- straight vertical;
- turn NE;
- turn NW;
- turn SE;
- turn SW;
- crossing HV.

Filters, must-turn cells, and existing prefix usage restrict this domain.

This makes the first useful model a local-transition factor system rather than a pure degree model.

## 6.2 Relaxation ladder

### E0: parity and local transition capacity

Check:

- endpoint parity;
- remaining incident-edge capacity;
- mandatory crossing modes;
- impossible transition domains;
- total edge and degree sums.

### E1: degree-constrained subgraph feasibility

Ask whether any edge set satisfies the local transition domains and exact edge count, ignoring chronology and full connectedness.

### E2: connected relaxed skeleton

Add weak flow or region-connectivity conditions.

### E3: separator-consistent skeleton

Require compatibility with separator boundary states.

### E4: orderability

Given a skeleton, test whether it admits a chronological trail compatible with local mechanics.

## 6.3 Experimental rule

Build E0 first. Build E1 only if E0 shows meaningful discrimination and the remaining gap appears to require global degree assignment.

## 6.4 Kill criteria

Stop if:

- the permissive model is nearly always feasible;
- useful strength requires expensive connected-subgraph solving;
- portals and flippers invalidate the representation on most target levels;
- transition domains approach the complexity of CP-SAT without comparable power.

---

# 7. New direction: partial-order and commuting-segment reduction

The search may be duplicating work by exploring different orders of locally independent excursions.

This is not ordinary Jump Point Search. Exact length and self-intersection requirements make apparently redundant detours potentially essential.

The narrower hypothesis is:

> Some completed local excursions commute because they affect disjoint state and expose the same external interface.

## 7.1 Candidate commuting condition

Two excursions may commute when they:

- affect disjoint cells and edges;
- do not alter portal or flipper state;
- satisfy no order-sensitive obligation;
- return to the same interface cell and direction;
- contribute the same total length and intersections regardless of order;
- leave identical externally relevant residual state.

If the conditions are proved sufficient, preserve one canonical ordering.

## 7.2 Safer first step

Search offline for pairs of prefixes that differ only by reordered local excursions.

Compare:

- full serialized state;
- exact completion feasibility;
- completion counts and topology classes;
- solver work below each prefix;
- mechanics that break apparent commutativity.

## 7.3 Expected outcomes

A positive result may produce:

- a sound canonicalization rule;
- a specialist-only partial-order reduction;
- a residual-interface equivalence relation.

A negative result is also valuable because it identifies the history features that make local order significant.

## Priority

Place below separator DP and backward envelopes, but above topology-first skeleton compilation.

---

# 8. Refined recommendation: contrastive failure-directed activity

The original failure-activity proposal was too close to a generic recency penalty.

## 8.1 Learn from sibling contrast

At a decision point, compare outcomes across children.

Strong evidence:

- a feature appears in a quickly dead child but not in a viable sibling;
- a feature predicts a repeated contradiction class across several siblings;
- changing one decision removes a stable downstream deficit.

Weak evidence:

- a feature occurs in both live and dead branches;
- a branch fails only after deep productive search;
- the feature merely correlates with greater path depth.

## 8.2 Use both chosen and rejected branches

Record:

- chosen-child outcome;
- sibling outcomes when explored;
- contradiction depth;
- work before contradiction;
- badness improvement;
- oracle feasibility where available;
- contradiction class;
- topology or resource change caused by the decision.

## 8.3 Search-tree topology as an adaptive signal

Track solve-local statistics:

- average contradiction depth;
- proportion of immediate sibling failures;
- recurrence of the same contradiction class;
- beam extinction depth;
- rate of improving descendants;
- branch-factor change by depth;
- work since the last informative contradiction.

These can select among fixed move-ordering behaviours without invoking a broad static portfolio scheduler.

## 8.4 Safety

Activity remains move ordering only. It must not prune.

## 8.5 Kill criteria

Reject if:

- early mistaken beliefs become self-reinforcing;
- class diversity collapses;
- gains arise only from unstable tie changes;
- equal-node performance worsens despite occasional lucky solves.

---

# 9. Refined recommendation: winning-path archaeology before Rectangle Search

Rectangle Search and depth revisitation remain attractive, but the solver must first establish that beam extinction is a dominant pathology.

## 9.1 Classify known-solution failures

For every known hint, record:

- correct-child rank at each depth;
- score gap;
- beam admission;
- first extinction depth;
- whether an equivalent topology class survives;
- work performed after every known winning class disappears;
- attempt and budget context.

Classify failures as:

1. **early ordering failure**;
2. **narrow beam extinction**;
3. **topology-class collapse**;
4. **late inference failure**;
5. **specialist starvation**.

Rectangle Search principally targets categories 2 and 3.

## 9.2 Lower-risk first implementation: depth reservoir

Preserve a small overflow reservoir at selected depths.

Reservoir candidates can be ranked by:

- heuristic discrepancy;
- topology rarity;
- obligation-order novelty;
- score margin at rejection;
- historical recovery value for that depth.

Periodically spawn a bounded continuation from one reservoir state.

## 9.3 Hazard-based retirement

Retire reservoir depths whose conditional chance of producing a solution has collapsed based on prior experiments.

## 9.4 Kill criteria

Deprioritize depth revisitation if:

- winning moves are usually ranked catastrophically low from the beginning;
- winning prefixes commonly survive until late search;
- recovery work mostly replays broad barren subtrees;
- gains vanish under equal-node comparison.

---

# 10. New direction: detour slack and detour gadgets

Exact-length path research often parameterizes difficulty by excess above a shortest or minimum-feasible path.

Pathfinder's analogue is:

`detourSlack = remainingRequiredLength - minimumObligationRespectingCompletionLength`

## 10.1 Decompose slack

Estimate slack forced by:

- must-cross obligations;
- must-turn obligations;
- chamber entry and exit;
- portal approach and departure;
- axis alignment;
- repeat access through articulation regions.

The remainder is **free slack** that must be spent deliberately.

## 10.2 Discover detour gadgets

A detour gadget is a local replacement with a defined external interface and resource delta.

Record:

- entry cell and direction;
- exit cell and direction;
- state preconditions;
- length delta;
- intersection delta;
- obligations affected;
- cells and edges consumed;
- portal/flipper delta;
- topology signature;
- residual-interface compatibility.

## 10.3 Use cases

- repair paths that remain consistently too short;
- macro resource allocation;
- separator spectra;
- exact slack completion;
- specialist attempt seeding;
- identifying regions capable of absorbing surplus length.

## 10.4 Safe first experiment

Mine known solutions and near-misses for pairs of interface-equivalent subpaths with different resource contributions.

Measure:

- frequency of reusable gadgets;
- distribution of length and intersection deltas;
- mechanic compatibility;
- whether hard unsolved levels contain candidate insertion interfaces;
- whether selecting compatible gadgets becomes a tractable subset-sum or DP problem.

## 10.5 Why this ranks highly

This creates a concrete bridge among:

- exact-length reasoning;
- repair search;
- separator interfaces;
- macro search;
- topology preservation.

It is now one of the strongest new directions not present in the original roadmap.

---

# 11. Refined recommendation: causal intervention repair

The next repair system should choose windows based on causal leverage rather than path disagreement alone.

## 11.1 Intervention-window score

For each candidate window, estimate:

- counterfactual sibling outcomes near its start;
- effect on final length deficit;
- effect on pending must-turn shape;
- effect on region accessibility;
- effect on attainable resource spectra;
- suffix replay survival;
- topology-class change;
- number of downstream decisions invalidated.

## 11.2 Three repair operators

### State-preserving micro-reroute

Replace a short segment while requiring identical full external state at the second anchor.

This preserves the suffix exactly and is the safest form of surgery.

### Interface-preserving reroute

Require only an empirically validated residual interface at the second anchor, then replay and validate the suffix incrementally.

### Suffix-regenerating surgery

Delete from the first anchor to the end, but use the old suffix's macro information as guidance:

- obligation order;
- region sequence;
- desired topology class;
- target resource allocation.

## 11.3 Shared vocabulary

Repair-anchor equivalence should use the same residual-interface definitions developed for separator DP and CEGAR.

## 11.4 Kill criteria

Stop if:

- useful anchor equivalence requires the full prefix state;
- suffix survival is negligible outside exact-state equality;
- causal scores do not outperform random or geometric window selection;
- repair becomes a slower duplicate of fresh search.

---

# 12. Refined recommendation: topology signatures, not only homotopy

Static homotopy around fixed obstacles is useful but incomplete because Pathfinder's own path changes future topology.

## 12.1 Layered search-topology signature

Maintain separate descriptors for:

1. static obstacle winding;
2. residual region separation;
3. crossing order and crossing axes;
4. portal transition word;
5. obligation partial order;
6. coarse residual block-cut structure;
7. enclosure or surround state;
8. optional detour-gadget usage.

This is not claimed to be a formal homotopy invariant. It is a search-diversity representation.

## 12.2 Use quotas, not another scalar weight

Use topology signatures to:

- preserve at least one strong representative from rare classes;
- cap overrepresented classes;
- curate hints;
- seed specialist attempts;
- select repair guides;
- populate depth reservoirs;
- detect class collapse.

Do not initially combine the signature into one weighted score.

## 12.3 Telemetry

Record:

- class count by depth;
- fraction of beam held by the dominant class;
- depth of irreversible class collapse;
- whether known winning classes were ever represented;
- class-specific solve rates;
- cost of signature computation.

---

# 13. Backward multi-resolution compatibility envelopes

The research pass raises backward envelopes from a lower-tier curiosity to a strong Tier 2 candidate.

## 13.1 Envelope hierarchy

### B0: distance and parity

For each cell, track relaxed arrival lengths and parity.

### B1: exact-resource and arrival-axis envelope

Track feasible tuples:

`(remainingLength, remainingIntersections, arrivalAxis)`

### B2: local obligation envelope

Include small masks for obligations near the goal or inside a constrained goal region.

### B3: residual-interface envelope

Track required boundary states for reaching the goal through narrow regions.

### B4: mechanic-state envelope

Add portal, filter, or flipper compatibility where a sound backward abstraction is available.

## 13.2 Runtime use

Query the strongest applicable precomputed or incrementally maintained layer.

Use as:

- sound pruning when the abstraction is permissive;
- move ordering when only guidance is justified;
- CEGAR counterexample generation;
- forward/backward interface comparison.

## 13.3 Best target population

Prioritize levels where:

- the goal lies behind a narrow corridor;
- arrival direction is constrained;
- a portal or filter dominates final access;
- exact remaining length is tight;
- late intersections must occur in a small region.

## 13.4 Kill criteria

Deprioritize if:

- backward abstractions are too permissive to eliminate anything;
- path-created obstacles invalidate reuse across prefixes;
- recomputation cost approaches forward search;
- mechanic state prevents a compact suffix summary.

---

# 14. Hazard-based participation and adaptive capping

The old portfolio scheduler remains deprioritized, but survival-analysis framing strengthens the narrower participation idea.

## 14.1 Model conditional success

For each attempt family estimate:

> probability of solving in the next budget interval, given that the attempt has already consumed N nodes without solving.

This is an attempt hazard curve.

## 14.2 Use censored observations correctly

A timeout does not reveal the true completion time. Training and evaluation must preserve censoring rather than treating all timeouts as ordinary failures.

## 14.3 Decisions supported

- guaranteed entry for specialists with high early hazard;
- early termination when hazard collapses;
- extension when a family has demonstrated late hazard on the relevant archetype;
- depth-reservoir retirement;
- budget reservation for underrepresented but high-upside attempts.

## 14.4 Determinism

Train offline, freeze versioned curves or models, and use deterministic thresholds and tie-breaking.

## 14.5 Kill criteria

Reject if:

- data is too sparse for stable conditional estimates;
- curves merely reproduce the existing static attempt order;
- saved nodes do not translate into additional solves;
- gains disappear on temporally held-out level families.

---

# 15. The completion-feasibility atlas

Do not build one undifferentiated prefix dataset. Build a deliberately paired atlas.

## 15.1 Pair types

### Live/dead near twins

Prefixes differing by one local decision, one move, or one event ordering.

### Same abstraction, different truth

Pairs that collide under a proposed state representation but differ in exact completion feasibility.

### Same depth, different search fate

Known-winning versus solver-preferred prefixes from the same level and depth.

### Same resources, different topology

Pairs with equal remaining length, intersections, and obligation masks but different residual structure.

### Same topology, different mechanic state

Pairs isolating portal, flipper, filter, or entry-direction effects.

### Controlled sibling-level pairs

Corresponding trajectories across symmetry, local mutation, density, or required-length families.

### Repair intervention pairs

Near-misses before and after a candidate causal window decision.

## 15.2 Required labels

Where supported, record:

- exact live/dead completion label;
- one or more solution witnesses;
- valid first moves;
- earliest contradiction explanation;
- attainable resource pairs;
- topology classes;
- minimum obligation-respecting completion length;
- exact solver/model provenance;
- supported mechanic subset;
- timeout or censoring status.

## 15.3 Why pairs matter

Independent prefixes allow models to learn superficial level identity, depth, or board difficulty. Paired examples force attention onto distinctions that change feasibility.

## 15.4 Shared use

The atlas supports:

- separator-interface falsification;
- CEGAR;
- MDD validation;
- pruning-rule synthesis;
- failure-activity feature design;
- decision-regret analysis;
- hazard modelling;
- dominance testing;
- detour-gadget mining;
- topology-signature evaluation.

This is now the highest-priority research infrastructure project.

---

# 16. Revised experimental ranking

This ranking supersedes Part IV of the original roadmap where the two differ.

## Tier 1: establish the evidence engine

### 1. Completion-feasibility atlas

Build exact, paired, provenance-rich prefix data rather than a random label dump.

### 2. Winning-path archaeology

Measure extinction, class collapse, decision regret, and wasted work after winning classes disappear.

### 3. Residual separator and interface census

Before building DP, measure:

- separator frequency;
- separator width;
- obligation distribution across regions;
- interface-state counts;
- mechanic features that break apparent interface equivalence.

These three projects determine whether the later algorithms have suitable terrain.

## Tier 2: strongest direct solver candidates

### 4. Separator-state resource DP

Highest-priority propagation experiment.

### 5. Backward multi-resolution compatibility envelopes

Raised from the previous ranking because backward regression complements Pathfinder's strong forward-history representation.

### 6. Bounded obligation-compatibility MDD

Strongest candidate for general incompatibility propagation among future mandatory events.

### 7. Depth-reservoir beam or Rectangle Search wrapper

Proceed only if winning-path archaeology confirms beam extinction or topology-class collapse.

## Tier 3: mechanisms that learn from search

### 8. Contrastive failure-directed activity

Use sibling outcomes, contradiction classes, and search-tree topology.

### 9. Hazard-based adaptive capping and participation floors

A narrower successor to the failed general portfolio scheduler.

### 10. Bidirectional multi-abstraction CEGAR

Use the atlas to discover distinctions and residual interfaces.

## Tier 4: structural specialists

### 11. Detour-gadget discovery and slack allocation

Newly elevated because it links exact length, repair, macro search, and separator interfaces.

### 12. Interface-preserving repair surgery

Build only after residual interfaces and causal windows have evidence.

### 13. Partial-order and commuting-segment analysis

Potential work reduction without requiring improved heuristic prediction.

### 14. Eulerian/local-transition relaxation ladder

Begin with E0 parity and transition-domain propagation.

### 15. Topology-signature diversity

Diagnostics and hint curation first, live quotas second.

## Tier 5: longer moonshots

### 16. Topology-first skeleton compilation

Valuable as an independent oracle and solution-family analyser.

### 17. Automatic rule synthesis

Attempt only after the atlas, counterexample machinery, and proof-certificate conventions exist.

---

# 17. Recommended next campaign: Residual Interface Discovery

This campaign supersedes the original roadmap's immediate implementation sequence.

## Stage 1: sample and pair prefixes

Collect:

- known-winning prefixes;
- solver-preferred failed prefixes;
- near-twin sibling choices;
- repair near-misses;
- prefixes before and after topology-class collapse;
- corresponding prefixes across controlled level families.

## Stage 2: exact labelling

Use CP-SAT or another exact oracle where supported to obtain:

- live/dead labels;
- valid first moves;
- solution witnesses;
- resource-attainability sets;
- contradiction information;
- topology-family information.

Preserve censored and unsupported cases explicitly.

## Stage 3: residual decomposition census

For each prefix compute:

- block-cut structure;
- candidate separators;
- boundary width;
- obligations by component;
- portal and flipper interactions;
- local transition domains;
- goal-side corridor structure.

Report the prevalence of tractable residual interfaces before implementing DP.

## Stage 4: candidate interface definitions

Test increasingly rich interfaces:

1. boundary cell set only;
2. boundary plus entry/exit direction;
3. boundary plus axis use;
4. boundary plus exact-resource contribution;
5. boundary plus obligation subset;
6. boundary plus mechanic-state delta;
7. boundary plus residual connectivity relation.

Search specifically for state pairs that collide under each interface but differ in completion feasibility.

## Stage 5: forward and backward refinement

Use CEGAR to identify:

- forward distinctions needed to explain prefix-induced failure;
- backward distinctions needed to explain goal requirements;
- interface distinctions needed to make the two meet.

## Stage 6: compile small resource spectra

For interfaces below the chosen width threshold:

- compute attainable length/intersection pairs;
- store boundary-conditioned spectra;
- measure Pareto compression;
- test live/dead discrimination;
- estimate amortized runtime cost.

## Stage 7: shared-interface applications

Use the same interface vocabulary to test:

- repair-anchor equivalence;
- detour gadgets;
- backward envelopes;
- restricted dominance;
- macro region routing.

## Stage 8: decision report

The report should decide among:

- implement separator DP in production shadow mode;
- prioritize backward envelopes;
- prioritize obligation MDDs;
- restrict interfaces to repair and offline analysis;
- abandon compositional interfaces if history requirements remain too large.

## Success without solve gain

This campaign succeeds if it produces:

- a completion-feasibility atlas;
- a measured separator/interface census;
- falsified insufficient interface definitions;
- one or more empirically faithful compact interfaces;
- reusable paired counterexamples;
- a justified choice of the next production experiment.

A solve-count gain is not required at this stage.

---

# 18. Shared evaluation harness

All three middle-layer reasoners should run against the same sampled states:

- separator-state resource DP;
- bounded obligation-compatibility MDD;
- CEGAR-derived compact abstractions or backward envelopes.

For every state and method record:

- exact label availability;
- rejection or acceptance;
- soundness class;
- unique catch beyond current gauntlet;
- overlap with other methods;
- depth;
- estimated subtree avoided;
- construction time;
- memory;
- explanation payload;
- mechanic coverage;
- whether the known winning path remains represented.

Do not compare only raw dead-prefix catch counts.

A method catching one early high-fanout contradiction may be worth more than a method catching hundreds of terminal dead ends.

---

# 19. Additional telemetry requirements

## 19.1 Interface telemetry

- separator size;
- boundary-state count;
- spectrum cardinality before and after Pareto reduction;
- interface collision count;
- live/dead collisions;
- mechanics responsible for collision;
- compile and lookup cost.

## 19.2 Topology telemetry

- signature classes represented by depth;
- dominant-class share;
- winning-class presence;
- class extinction depth;
- portal-word diversity;
- obligation-order diversity;
- residual block-cut diversity.

## 19.3 Slack telemetry

- minimum obligation-respecting completion length;
- total detour slack;
- forced versus free slack estimate;
- regions capable of absorbing slack;
- known detour gadgets available;
- final shortfall or surplus by repair trajectory.

## 19.4 Contradiction taxonomy

Every contradiction should be categorized where possible:

- length lower-bound failure;
- length attainability hole;
- intersection lower or upper failure;
- separator capacity;
- obligation mutex;
- axis incompatibility;
- local transition-domain wipeout;
- goal-envelope incompatibility;
- portal/flipper state;
- residual disconnection;
- exact oracle only / unexplained.

## 19.5 Counterfactual decision telemetry

At sampled branch points:

- child feature delta;
- sibling probe result;
- contradiction depth;
- search work;
- oracle label;
- topology-class change;
- resource-spectrum change;
- suffix compatibility change.

---

# 20. Verification rules added by this update

## 20.1 Interface claims are hypotheses

No two states may be treated as equivalent merely because they share a proposed residual interface until adversarial live/dead collision search has been performed.

## 20.2 Backward abstractions must be permissive

A backward envelope may prune only when it over-approximates all valid suffixes.

## 20.3 MDD absence must not arise from horizon truncation

Failure to place an event inside the bounded horizon is not a contradiction unless the event is known to be required inside that horizon.

## 20.4 Dominance stays local

Prefer component- or interface-local dominance over global path-state dominance.

## 20.5 Learned guidance remains guidance

Failure activity, hazard models, topology quotas, and continuation estimates may order or allocate search but may not become sound pruning without an independent proof.

## 20.6 Paired evaluation split

Training and test splits must keep related sibling/cousin families together to prevent near-duplicate leakage.

## 20.7 Temporal holdout

Learned models should be tested on levels created after the training corpus where possible.

## 20.8 Exactness provenance

Every label must identify whether it is:

- proved live;
- proved dead;
- witnessed live;
- timed out;
- unsupported by the oracle mechanic scope;
- inferred by a non-exact abstraction.

---

# 21. Refined stop-doing list

The research pass provides no reason to revive:

- broad scalar retuning without new state information;
- another collection of isolated connectivity micro-rules;
- unsound compressed memoization;
- full CP-SAT inside ordinary expansion;
- exact-copy repair relinking;
- indiscriminate global treewidth or ZDD compilation;
- a monolithic learned portfolio scheduler;
- a future MDD that attempts to preserve nearly full path history;
- a single universal abstraction refined from one arbitrary counterexample;
- topology diversity reduced to one extra weighted score.

---

# 22. Literature added by this update

These sources motivate experiments; they do not establish transfer to Pathfinder.

## Decision diagrams and mutex propagation

- Mingwei Zhang, Liangda Fang, Zhenhao Gu, Quanlong Guan, and Yong Lai, **"A Multi-Valued Decision Diagram-Based Approach to Constrained Optimal Path Problems over Directed Acyclic Graphs"**, IJCAI 2024. DOI: <https://doi.org/10.24963/ijcai.2024/219>
- Chinese-language MDD mutex-propagation work in multi-agent path finding, discussing general mutex propagation that subsumes specialized rectangle and corridor conflict handling. DOI: <https://doi.org/10.19678/j.issn.1000-3428.0066699>

## Abstraction refinement and regression

- Jendrik Seipp and Malte Helmert, **"Counterexample-Guided Cartesian Abstraction Refinement"**, ICAPS 2013. DOI: <https://doi.org/10.1609/icaps.v23i1.13605>
- Alexander Rovner, Silvan Sievers, and Malte Helmert, **"Counterexample-Guided Abstraction Refinement for Pattern Selection in Optimal Classical Planning"**, ICAPS 2019. DOI: <https://doi.org/10.1609/icaps.v29i1.3499>
- Martín Pozo, Alvaro Torralba, and Carlos Linares Lopez, **"When CEGAR Meets Regression: A Love Story in Optimal Classical Planning"**, AAAI 2024. DOI: <https://doi.org/10.1609/aaai.v38i18.30004>

## Beam and discrepancy search

- Sofia Lemons, Wheeler Ruml, Rob Holte, and Carlos Linares Lopez, **"Rectangle Search: An Anytime Beam Search"**, AAAI 2024. DOI: <https://doi.org/10.1609/aaai.v38i18.30063>

## Failure-based search adaptation

- Yang Zhang and Hongbo Li, **"Right Branches Matter in Failure-based Variable Ordering Heuristics"**, AAAI 2026. DOI: <https://doi.org/10.1609/aaai.v40i17.38455>

## Structural long-path and path-family methods

- Yukihide Kohira, Suguru Suehiro, and Atsushi Takahashi, **"A Fast Longer Path Algorithm for Routing Grid with Obstacles Using Biconnectivity Based Length Upper Bound"**, IEICE 2009. DOI: <https://doi.org/10.1587/transfun.E92.A.2971>
- Tzur Shubi, Solomon Eyal Shimony, Ariel Felner, and Shahaf Shperberg, **"Bidirectional Heuristic Search in Longest Path Problems"**, SoCS 2025. DOI: <https://doi.org/10.1609/socs.v18i1.36012>
- Norihito Yasuda, Teruji Sugaya, and Shin-Ichi Minato, **"Fast Compilation of s-t Paths on a Graph for Counting and Enumeration"**, PMLR 2017. <https://proceedings.mlr.press/v73/teruji-sugaya17a.html>

## Exact detour and exact-length parameterization

- Work on **Exact Detour**, parameterizing a required path length as shortest-path distance plus an exact detour parameter. <https://arxiv.org/abs/1607.07737>

## Sequence variables and neighbourhood search

- Augustin Delecluse, Pierre Schaus, and Pascal Van Hentenryck, **"Sequence Variables: A Constraint Programming Computational Domain for Routing and Sequencing"**, 2025 preprint. <https://arxiv.org/abs/2510.09373>

## Runtime survival analysis

- Marius Lindauer, Katharina Eggensperger, Matthias Feurer, André Biedenkapp, and Frank Hutter, **"Run2Survive: A Decision-theoretic Approach to Algorithm Selection based on Survival Analysis"**. <https://arxiv.org/abs/2007.02816>

---

> **2026-08-05 implementation note:** section 18's shared evaluation harness, section 17's Stage 3
> residual-separator census, and a first prototype implementing this section's separator-state
> resource DP (scoped to single-articulation pendant chambers) now exist as real code with real
> corpus-2 measurements — see [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md).
> Headline finding: the specific chamber shape this prototype targets is genuinely rare on
> corpus-2 (~0.4% of sibling branches, 7.1% of levels) — closer to this doc's own "small separators
> are rare" kill criterion than to a common phenomenon — but where it does apply, the probe caught
> 2 dead branches invisible to the existing gauntlet with zero false rejects across 623 labelled
> branches. Read that doc's "Honest bottom line" before deciding whether to invest further here.

# 23. Final updated recommendation

The next major effort should not begin by implementing a new solver module.

It should begin by discovering whether Pathfinder's residual problems expose small, stable interfaces.

The recommended sequence is:

1. build the completion-feasibility atlas;
2. perform winning-path archaeology;
3. measure residual separator and interface width on hard prefixes;
4. falsify candidate interface definitions using live/dead near twins;
5. compile separator-state resource spectra only where interfaces are small;
6. build backward envelopes and obligation MDDs against the same prefix harness;
7. use bidirectional CEGAR to identify missing distinctions;
8. share the successful interface vocabulary with repair, detour gadgets, macro search, and restricted dominance;
9. test depth revisitation only if extinction telemetry shows it targets the actual failure mode;
10. preserve every failed abstraction and counterexample as a reusable research result.

The broad research goal is now:

> **Find compact interfaces through which Pathfinder's remaining solution space can be composed, contradicted, and repaired.**

That is the most promising route from isolated clever heuristics toward a solver that can reason about the architecture of its remaining futures.
