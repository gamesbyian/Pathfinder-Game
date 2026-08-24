# Beam Search with Explicit Diversity

## Core problem

Finite-width search must choose a **set** of survivors, not merely rank individual states. A beam can contain many high-scoring states yet collectively cover only one narrow region of future search space.

Diversity methods ask whether some slots should be preserved for states that are meaningfully different from those already retained. The hard part is not adding diversity pressure; it is defining **difference that correlates with distinct future possibilities**.

Most mature evidence comes from sequence decoding, planning, evolutionary search, and quality-diversity optimization. Success there establishes mechanisms, not direct transfer to constrained path feasibility.

## Survivor-selection families

### Diverse Beam Search (DBS)

DBS partitions the beam into groups. Later groups receive a penalty for resembling states already selected by earlier groups.

- **Similarity:** user-defined sequence/feature overlap.
- **Scope:** local to the current depth; no persistent archive required.
- **Cost:** modest relative to ordinary beam search.
- **Evidence:** improves output-set diversity and sometimes top output quality in neural sequence generation, where ordinary beams often waste slots on near-duplicates.
- **Risk:** excessive diversity can displace genuinely superior states.

Transferable principle: **do not spend many beam slots on candidates that are different only cosmetically**. Transfer depends entirely on whether the similarity representation reflects future search opportunity.

### Determinantal/DPP-style subset selection

Determinantal Beam Search scores the survivor set jointly using a kernel encoding candidate quality and similarity. It favors high-quality sets whose members are mutually dissimilar.

- **Scope:** global within one depth’s survivor set.
- **Cost:** materially higher; subset optimization is combinatorial and practical methods require structured/approximate optimization.
- **Evidence:** strong for diversity-quality trade-offs in language generation, not arbitrary combinatorial search.

Its main conceptual value is **set-level selection**: candidate value depends partly on what else has already survived.

### Stochastic retention

Stochastic beam methods sample survivors rather than always taking deterministic top-K. Conditional-Poisson beam sampling is one principled example; reservoir-like retention is a related but different idea.

- **Benefit:** gives lower-ranked states some survival probability and increases coverage.
- **Cost:** usually modest.
- **Risk:** can discard the best-scoring candidate; diversity may be random rather than useful.
- **Evidence:** strongest for sampling/estimation and output diversity, not improved top-1 combinatorial feasibility.

Useful as a baseline for asking whether deterministic ranking itself causes premature extinction.

### Multiobjective/Pareto selection

States can be evaluated on several axes rather than collapsed immediately to one scalar score. Pareto fronts plus crowding/spread rules are standard in multiobjective optimization.

- **Benefit:** preserves states strong on different dimensions.
- **Cost:** nondominated sorting and tie-breaking grow with population and objective count.
- **Risk:** weak states can survive because they are extreme on an irrelevant objective.

The specific recent “Pareto Beam Search” example has weak evidentiary status; the mature support comes from multiobjective evolutionary selection more broadly. The transferable idea is **survival without premature scalarization**.

## Novelty and width-based search

### Novelty search

Novelty search rewards behavioral difference from current and archived states, usually via distance in a behavior descriptor space.

- **Scope:** global/archive-based.
- **Strength:** can escape deceptive objectives by seeking new behavior rather than better score.
- **Cost:** archive storage and repeated distance calculations.
- **Risk:** pure novelty can wander and ignore genuine quality.
- **Dependency:** feature/descriptor design is decisive.

Evidence is strongest in deceptive evolutionary domains and robotics. It supports novelty as an exploration mechanism, not a conclusion that pure novelty should replace heuristic quality in beam search.

### Width-based search (IW/BFWS)

Width-based planning defines novelty from propositional features. A state has novelty \(k\) if some \(k\)-tuple of features becomes true for the first time. IW(k) prunes states whose novelty exceeds the bound; BFWS combines novelty with heuristic guidance.

Important correction: **IW is not a beam algorithm and has no beam-width parameter**. Its controlling width is novelty tuple size \(k\).

- **Strength:** strong planning results when relevant solutions have low structural width and ordinary heuristics are weak/deceptive.
- **Cost:** novelty tracking; tuple cost grows rapidly with \(k\).
- **Failure mode:** poor features or high-width problems erase the advantage.

This literature is particularly relevant conceptually because it preserves states for introducing **new feature combinations**, closer to “new future possibilities” than raw geometric dissimilarity.

## Quality-diversity and archives

### MAP-Elites / quality-diversity

Quality-diversity (QD) methods define a low-dimensional behavior/structure descriptor space and retain high-quality elites in many niches.

- **Similarity:** same/near descriptor cell.
- **Scope:** persistent global archive.
- **Strength:** preserves multiple high-quality structural types.
- **Risk:** bad descriptors fill the archive with irrelevant distinctions; large archives cost memory/work.

MAP-Elites does **not** guarantee that every reachable niche will be discovered. Its contribution is an explicit mechanism for maintaining quality across a chosen diversity map.

### Archive-based novelty/elite selection

Persistent archives make diversity global across time rather than only within the current beam. They can prevent repeated rediscovery of already explored behavioral regions.

Costs and risks:

- memory growth;
- expensive similarity checks;
- stale/redundant archive entries;
- suppressing states that look similar under an abstraction but have importantly different futures.

## Niching, crowding, and population diversity

Evolutionary niching preserves multiple subpopulations by reducing the advantage of crowded regions or by making replacement local to similar individuals.

Examples include fitness sharing, deterministic crowding, restricted tournaments, and quality-plus-distance pool management.

Main lessons:

- diversity can preserve multiple optima/basins;
- tuning niche radius/distance matters;
- genotypic or geometric diversity can be useless if it does not correspond to behavioral/search diversity;
- diversity alone often slows early convergence;
- quality and diversity generally need balancing.

These mechanisms do not inherently require crossover/mutation, but much of their empirical literature comes from evolutionary populations rather than beam search.

## Diversity metrics are not success metrics

High entropy, mean pairwise distance, archive coverage, or novelty do not establish better search. Diversity is useful only if it improves end-to-end outcomes such as:

- success probability;
- best objective/feasibility reached;
- survival of later-useful states;
- escape from plateaus;
- coverage of distinct successful solution classes;
- work to solution.

A diversity mechanism that merely increases a metric while reducing solves is harmful.

## The central representation problem

For constrained path search, several notions of difference may disagree:

- geometric path shape;
- exact path history;
- endpoint/location;
- mechanic state;
- remaining length/crossing resources;
- outstanding obligations;
- residual topology/connectivity;
- future completion options.

Two visually different paths can have essentially the same remaining possibilities. Two superficially similar states can differ critically because one has consumed a unique future option.

Therefore the most important research question is not “which diversity algorithm?” but:

> **Which state abstraction makes similarity correspond to interchangeable future possibilities, and difference correspond to genuinely different completion opportunities?**

Once that representation exists, many survivor mechanisms become plausible: buckets, quotas, novelty, crowding, stochastic reserve slots, multiobjective fronts, or set-level optimization.

## Local vs global diversity

| Method family | Diversity scope | Typical memory |
|---|---|---|
| DBS / crowding within beam | Current depth/population | Low |
| DPP/set selection | Whole survivor set at current depth | Low-medium |
| Stochastic retention | Implicit/current depth | Low |
| Pareto/multiobjective beam | Current depth | Low-medium |
| IW/BFWS novelty | Search history of feature tuples | Medium |
| Novelty archive | Across run | Medium-high |
| MAP-Elites/QD archive | Across run/niches | Medium-high |

Local methods are cheaper and adapt quickly. Global archives can prevent long-term repetition but risk stale abstractions and memory growth.

## When diversity helps or hurts

Likely to help when:

- heuristic score is imperfect/deceptive;
- many beam slots contain near-equivalent futures;
- rare solution paths require temporarily lower-scoring states;
- multiple distinct structural basins exist;
- wider beams otherwise collapse into more copies of the same phenotype.

Likely to hurt when:

- score is already strongly predictive;
- diversity descriptor tracks irrelevant differences;
- beam is so small that every diverted slot is costly;
- archive/selection overhead consumes more work than exploration saves;
- forced spread preserves states with little completion value.

## Relative relevance of the literature

**Most conceptually relevant:**

1. **State novelty/width-based reasoning:** preserves new structural feature combinations; strong planning evidence.
2. **Quality + diversity survivor selection:** emphasizes population quality rather than individual rank alone.
3. **Simple diversity buckets/crowding/quotas:** cheap mechanisms once a useful abstraction exists.
4. **Multiobjective survival:** avoids premature scalarization where several partial-state qualities matter.
5. **Stochastic reserve capacity:** cheap test of whether deterministic top-K causes extinction.

**More speculative for constrained path search:**

- full novelty archives;
- MAP-Elites-style large QD archives;
- determinantal/DPP selection;
- specialized NLP beam-diversification schemes.

Their native-domain results are real, but transfer evidence is weak.

## Bottom line

Finite-width search should be judged on the **quality of the survivor set**, not merely the scores of its members. Diversity is valuable when it preserves different useful futures that score-only selection would erase.

The crucial design object is the state abstraction. A sophisticated diversity selector over the wrong representation can preserve cosmetic variety while still losing every important completion path. Conversely, a simple bucket or quota scheme over the right structural vocabulary may capture most of the benefit.