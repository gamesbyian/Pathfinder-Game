# Beam-Search Variants with Explicit Diversity

This report reviews survivor-selection methods that deliberately preserve diversity, novelty, or multiple objective trade-offs under a finite frontier. The motivating use case is constrained path construction, but most of the mature literature comes from sequence decoding, AI planning, evolutionary search, and quality-diversity optimization. Transfer claims therefore need to distinguish **evidence that a mechanism works in its native domain** from **evidence that it will preserve completable partial paths in a constrained beam search**. The latter is much less established.

## Diverse beam search

**Diverse Beam Search (DBS)**, introduced by Vijayakumar et al., partitions a beam into groups and augments the normal sequence score with a diversity term that discourages later groups from duplicating structures already selected by earlier groups. The diversity function is user-defined and can depend on token overlap or other sequence features. Selection remains depth-local: there is no persistent archive across the whole run.

The main empirical result is real but domain-specific. The authors reported improved diversity and quality on image captioning, visual question generation, and machine translation, with relatively modest computational and memory overhead. Their strongest motivation was that ordinary neural decoding often spends many beam slots on near-paraphrases of one another. That supports the proposition that **finite beam capacity can be wasted on redundant candidates**.

It does not establish that DBS is generally superior for combinatorial feasibility search. In language generation, several alternative continuations can all be acceptable outputs, and similarity is naturally defined over sequences. In constrained path search, two geometrically or historically different prefixes may have nearly identical future possibilities, while two superficially similar prefixes may differ critically in residual topology or mechanic state. Thus DBS transfers mainly as a survivor-selection principle: penalize redundant occupancy only if the similarity representation corresponds to future search opportunity.

## Determinantal beam search

**Determinantal Beam Search**, by Meister, Forster, and Cotterell (ACL 2021), reformulates each beam-selection step as a diverse subset-selection problem related to determinantal point processes (DPPs). A positive semidefinite kernel expresses candidate quality and pairwise similarity; subdeterminant maximization favors sets that are simultaneously high-quality and mutually dissimilar.

The original report overstated two points. First, determinantal beam search should not be described as simply computing the exact maximum-determinant subset at each step without qualification: the underlying subset problem is combinatorial, and practical methods use structured/approximate optimization. Second, its empirical evidence is primarily a **language-generation case study**, not evidence of broad transfer to arbitrary search domains. The authors found competitive sequence quality while increasing diversity and presented the method as a more general framework for diverse set generation.

The conceptual attraction for constrained search is that diversity is assessed at the level of the **whole survivor set**, rather than by independently perturbing candidate scores. The cost is a substantially more elaborate similarity model and subset-selection procedure. Its usefulness would depend almost entirely on whether a meaningful kernel over partial states captures distinct future possibilities rather than cosmetic path differences.

## Stochastic beam search and conditional Poisson sampling

Randomized survivor selection provides another route to diversity. **Conditional Poisson Stochastic Beam Search (CPSBS)**, by Meister, Amini, Vieira, and Cotterell (EMNLP 2021), replaces the deterministic top-K operation with conditional-Poisson sampling without replacement. The method was developed chiefly as a stochastic decoder and sampling scheme for sequence models.

Its validated strengths should be stated precisely. CPSBS can produce diverse samples and supports statistically consistent estimators of expectations under the model; in neural machine-translation experiments it produced lower-variance and more efficient estimators than the stochastic-beam comparator used by the authors, including in high-entropy settings. Those are **sampling and estimation results**, not evidence that stochastic retention improves top-1 combinatorial search success.

For a feasibility beam, the transferable principle is weaker but useful: deterministic score cutoffs can permanently eliminate lower-ranked states, whereas stochastic selection gives some probability of survival to states whose heuristic score may underestimate their future value. The cost is equally clear: stochasticity can discard genuinely superior states. Random retention is therefore an exploration mechanism, not a free improvement in beam quality.

“Reservoir sampling” should not be treated as synonymous with stochastic beam search. Reservoir sampling solves a different streaming-sampling problem. A beam algorithm could certainly reserve slots by random or reservoir-like rules, but that would be an analogy or new design choice rather than an established equivalence in the literature.

## Pareto and multicriteria survivor selection

A finite frontier need not be ordered by one scalar. Candidates can instead carry a vector of criteria and be selected using Pareto dominance, non-dominated sorting, crowding, lexicographic rules, or related multiobjective mechanisms.

The previous version gave too much evidentiary weight to a 2026 item called **Pareto Beam Search**. That item is an anonymous Technical Disclosure Commons publication describing Pareto pruning for generative retrieval, not a mature peer-reviewed research line establishing the superiority of Pareto beam search. It is useful as a concrete example of how Pareto fronts and crowding distance can be inserted into beam pruning, but it should not carry the same weight as established multiobjective evolutionary optimization or classical beam-search work.

The better-supported general principle comes from multiobjective optimization: scalarization can hide candidates that are strong on different dimensions, while Pareto-based survivor selection can preserve multiple trade-offs. The limitation is also well known. As the number of objectives grows, large fractions of the population can become mutually non-dominated, reducing selection pressure and pushing the burden onto secondary rules such as crowding distance. There is also no guarantee that the chosen objectives correspond to actual completion probability.

For constrained path construction, Pareto selection is therefore conceptually relevant when distinct state attributes genuinely represent different kinds of future opportunity. It is not, by itself, evidence that replacing a scalar beam score with several components will improve solves.

# Exploration-focused algorithms

## Novelty search

**Novelty Search**, associated especially with Lehman and Stanley, rewards behavioral novelty rather than progress on a conventional objective. Individuals are represented by a behavior characterization, and novelty is commonly estimated from distances to nearby behaviors in the current population and/or an archive.

The method has strong evidence in deceptive evolutionary-search domains, including maze navigation, where objective-driven search can be attracted toward regions that do not lead to the goal. Its central lesson is that **stepping stones need not look objectively promising when they are first encountered**.

However, novelty search is not naturally a finite-width beam algorithm, and pure novelty can be wasteful when the objective is informative. It also inherits a severe representation problem: novelty is only as meaningful as the behavior descriptor and distance function. High novelty in an irrelevant descriptor space can simply force search to spend resources on unusual but useless states.

The transfer to constrained path search is therefore conceptual rather than algorithmic. It supports considering whether the ordinary heuristic is deceptive and whether some low-scoring prefixes should survive because they occupy genuinely different future-opportunity regions. It does not establish that an ever-growing novelty archive or k-nearest-neighbor calculation is appropriate for a beam solver.

## Width-based search

**Width-based search** from AI planning is particularly relevant because it gives novelty an explicit search-theoretic role. In Iterated Width, IW(k), a state is retained when it makes true some tuple of up to k propositional features that has not previously been observed in the relevant novelty table. IW(1) therefore retains states that make at least one atom newly true; IW(2) uses pairs, and so on. Best-First Width Search (BFWS) combines novelty with heuristic information rather than relying on novelty alone.

The previous report incorrectly discussed IW as though larger **beam width** or “depth allowance” were its native control parameter. IW is not a beam-search algorithm. Its defining parameter is the novelty width k, together with the state-feature representation and the novelty tables used by a particular variant. Increasing k can increase completeness/coverage but also increases the combinatorial cost of tracking feature tuples.

Width-based methods have substantial empirical support in classical planning and game playing. Work on Atari showed IW(1) performing at the level of strong planning baselines, and subsequent width-based methods achieved state-of-the-art or highly competitive results in several planning/game settings. These successes are especially interesting because the methods can work with weak conventional heuristics when the problem has low effective width under a useful feature representation.

The strongest transfer lesson is not “use IW inside the beam.” It is that novelty over **factored state features** can reveal useful search directions that scalar heuristic quality misses. For a constrained path solver, the key unknown is whether there exists a compact feature vocabulary for residual obligations, topology, mechanics, and resource state whose first-seen combinations correlate with genuinely different completion opportunities.

# Quality-diversity and archive-based methods

## Quality-diversity and MAP-Elites

**Quality-Diversity (QD)** algorithms seek a collection of high-quality solutions spread across a user-defined behavioral or feature space. In MAP-Elites, the descriptor space is discretized into cells and each occupied cell stores the best individual found for that niche.

The previous report contained a definite error: MAP-Elites does **not** guarantee that every reachable niche will be filled. Mouret and Clune explicitly note that cells can remain empty either because no solution maps to them or because the search simply fails to discover one even though one exists.

QD has strong empirical support in robotics, design optimization, and evolutionary search as a way to illuminate many qualitatively different high-performing solutions. Its archive can also provide stepping stones and robustness when one solution class fails. But its native goal is usually to build a repertoire or map, not to maximize the probability of finding one exact feasible solution under a tight beam budget.

Computational overhead also should not be characterized uniformly as “large.” Archive insertion in MAP-Elites can be cheap once descriptors are computed; the dominant cost may instead be evaluating candidates, generating enough trials to cover the descriptor space, or handling high-dimensional/adaptive archives. What grows rapidly is the *search burden* when descriptors produce many niches, not necessarily the cost of each archive lookup.

For constrained beam search, the transferable principle is **quality within niches**: do not let one heavily populated state class consume the entire survivor budget if other descriptor classes may preserve different futures. The difficult part is selecting descriptors whose niches have predictive meaning.

## Archive-based novelty and elite selection

Archives can preserve long-term information that a depth-local beam would otherwise forget. Novelty archives retain unusual behaviors; Pareto archives preserve non-dominated solutions; QD archives retain elites within niches.

The benefit is persistence. A state or behavior can continue influencing selection after leaving the current population. The cost is that archive membership and similarity tests can increasingly dominate computation, and stale archive entries can suppress exploration if the novelty definition is poorly calibrated.

For partial-path search, archiving exact paths purely for difference is unlikely to be useful at scale. The literature instead points toward **abstraction**: archives usually operate on descriptors, objectives, or behavioral features rather than treating every trajectory as semantically unique.

# Niching, crowding, and population diversity

**Fitness sharing, niching, restricted tournaments, deterministic crowding, and related evolutionary mechanisms** preserve multiple subpopulations by reducing competition between sufficiently different candidates or penalizing dense regions. They are well established in multimodal evolutionary optimization.

The previous report overstated the dependence of these ideas on crossover and mutation. Niching and crowding are survivor-selection principles; although much of their literature is evolutionary, the underlying mechanisms do not logically require genetic recombination. Their transfer to beam search is therefore not blocked by the absence of breeding operators. The more important issue is whether their distance or niche definition corresponds to distinct search possibilities.

Pairwise-distance methods can become expensive for large candidate sets, and niche radii or sharing functions can be sensitive parameters. They can also preserve diversity that is irrelevant to the objective. A population may be diverse geometrically or historically while remaining homogeneous with respect to the decisions that determine eventual feasibility.

## Population-diversity metrics

Entropy, mean pairwise distance, minimum pairwise distance, coverage, and related statistics are useful diagnostics but should not be confused with survivor objectives. Maximizing a diversity statistic alone commonly sacrifices quality.

The previous report also blurred distinct subset-selection families by saying max-min diversity is “essentially” a special case of determinantal or multiobjective selection. These approaches are related by a broad common goal but are mathematically different objectives. Max-min selection maximizes a worst pairwise-distance criterion; DPP-style selection uses determinants/volume; multiobjective selection works with dominance or trade-offs among several objectives. They should be compared rather than collapsed into one another.

# What counts as evidence that diversity helps?

The most important distinction is between **diversity as a measured property** and **diversity as useful search coverage**. A method can dramatically increase pairwise distance or archive coverage while reducing solution probability.

Research therefore evaluates diversity mechanisms against end-to-end task outcomes as well as internal diversity metrics. Depending on the domain, useful measures include:

- top-1 quality or success rate;
- best-of-set or oracle quality;
- time/work to first acceptable solution;
- coverage of qualitatively distinct solution classes;
- escape from plateaus or deceptive basins;
- survival of candidates that later become high-quality or feasible;
- marginal benefit of additional population/beam slots;
- quality-diversity trade-off curves rather than diversity alone.

Ablations are especially important. If a diversity mechanism raises entropy but leaves final success unchanged, it may merely be decorative. Conversely, a mechanism can help even if a generic diversity statistic barely moves, provided it preserves the *right* rare alternatives.

For finite-width feasibility search, the most discriminating observable is conceptually **future value of survivors**: does a selection rule preserve states that remain completable and would otherwise have been culled? This is a stronger criterion than whether the survivors look different according to a convenient metric.

# Comparison of principles

The external evidence supports several principles, but not the strong ranking in the previous version.

1. **State abstraction is foundational.** Every diversity method depends on a definition of similarity, novelty, niche, or objective. In constrained path search this representation may matter more than the downstream selection algorithm. Geometric path difference, trajectory difference, residual obligations, mechanic state, and residual topology are not interchangeable notions.

2. **Width-based novelty has the strongest directly search-oriented precedent.** IW/BFWS demonstrates that first-seen fact combinations can be powerful search signals in planning. The transfer still depends on finding a suitable factored representation.

3. **Quality plus diversity is better supported than pure diversity when a meaningful quality signal exists.** DBS, DPP selection, QD, and multiobjective methods all embody different forms of this balance. None has general evidence of superiority for constrained path feasibility.

4. **Stochastic retention is a cheap conceptual hedge against heuristic error.** Its virtue is that it does not require a sophisticated diversity metric; its weakness is that randomness can consume scarce frontier capacity without preserving specifically useful alternatives.

5. **Global archives are powerful but qualitatively different from local beam management.** Novelty Search and MAP-Elites show what persistent diversity can accomplish, but their memory/search budgets and objectives differ substantially from a finite-depth beam.

6. **DPP and Pareto methods are principled subset selectors, but their current transfer evidence is weak.** DPP beam search is supported mainly by language-generation experiments; the named 2026 Pareto Beam Search example is a technical disclosure rather than mature empirical literature.

7. **Niching and crowding remain relevant survivor-selection analogues.** Their main limitation is not lack of genetic operators but the same representation problem faced by every diversity mechanism.

# Synthesis for constrained path construction

The literature does support the general concern that score-only beam selection can waste capacity on candidates that are individually attractive but collectively redundant. It does **not** establish that novelty search, Pareto pruning, DPPs, MAP-Elites, or any other named diversity mechanism is likely to improve a constrained path solver without knowing how partial-state similarity maps to future feasibility.

The central transferable question is therefore:

> **What representation of a partial state distinguishes genuinely different future completion possibilities?**

Once that representation exists, many survivor-selection mechanisms become plausible: bucket quotas, novelty bonuses, crowding penalties, Pareto fronts, stochastic slots, archives, or set-level diversity objectives. Without it, sophisticated diversity machinery can simply preserve different histories that lead to the same future, or eliminate superficially redundant states whose residual possibilities are actually distinct.

The external literature is strongest as evidence for **population shaping under heuristic uncertainty**, not as evidence for a particular algorithm. For a finite-width feasibility search, diversity should ultimately be judged by whether it preserves useful future possibilities at a better solve/work trade-off than score-only retention or simply increasing the beam.

## Selected sources

- Vijayakumar, A. et al. (2018). **Diverse Beam Search for Improved Description of Complex Scenes.** AAAI 2018. https://doi.org/10.1609/aaai.v32i1.12340
- Meister, C., Forster, M. & Cotterell, R. (2021). **Determinantal Beam Search.** ACL-IJCNLP 2021, 6551–6562. https://doi.org/10.18653/v1/2021.acl-long.512
- Meister, C., Amini, A., Vieira, T. & Cotterell, R. (2021). **Conditional Poisson Stochastic Beam Search.** EMNLP 2021, 664–681. https://doi.org/10.18653/v1/2021.emnlp-main.52
- Lipovetzky, N. & Geffner, H. (2012). Work introducing Iterated Width and planning width.
- Bandres, W., Bonet, B. & Geffner, H. (2018). **Planning With Pixels in (Almost) Real Time.** AAAI 2018. https://doi.org/10.1609/aaai.v32i1.12095
- Lehman, J. & Stanley, K. O. (2011). **Abandoning Objectives: Evolution Through the Search for Novelty Alone.** *Evolutionary Computation* 19(2), 189–223.
- Mouret, J.-B. & Clune, J. (2015). **Illuminating search spaces by mapping elites.** arXiv:1504.04909.
- Anonymous (2026). **Pareto Beam Search.** Technical Disclosure Commons. Useful as an implementation example, not treated here as mature peer-reviewed evidence.
