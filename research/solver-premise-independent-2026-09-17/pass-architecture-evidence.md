# Independent premise-space checkpoint: architecture and evidence pass

This checkpoint was written before opening the quarantine on the recent premise-mapping work.

## 1. A useful independent distinction: question status is multi-axis

The codebase makes a binary `idea exists / idea absent` model actively misleading. A solver-research proposition may be:

- conceptually stated but never operationalized;
- implemented only as an observer or diagnostic;
- implemented as an opt-in treatment;
- available in a search family but not scheduled by production orchestration;
- scheduled, but starved of work or reached only after earlier stages consume the budget;
- exercised in production but only on a narrow structural subset;
- measured under a historical architecture whose later changes alter the proposition being tested;
- promoted to production defaults;
- rejected only in one implementation, population, budget, or interaction context.

This is not bookkeeping trivia. `modules/solver/joint-obligation-propagation.ts`, for example, contains a concrete implementation of relational reasoning about two obligations that are individually feasible but jointly impossible, while explicitly remaining observer-only and forbidden from changing search. Therefore the proposition “the solver has no joint-obligation reasoning code” is false, while “production search exploits this class of relational feasibility inference” may still be false or only partially true. Any premise representation that collapses those states will manufacture gaps or closures.

## 2. Representation is both search state and an epistemic boundary

`search-state.ts` and the surrounding representation contracts make solver state an implicit claim about which past facts can matter to future legality, feasibility, ordering, repair, and equivalence. The current state stores substantial path-derived information, including path/current predecessor information, edge/visit state, portal use, intersections, requirement masks, crossing counts, surround and turn masks, flipper use and portal-jump history.

The failed-state experience cache sharpens the point. `nogood-cache.ts` deliberately includes current position, predecessor, path length, visited-edge usage, portal jumps, intersection count, requirement masks/counts, surround/turn state, flipper state, and whether the last transition was a portal jump. Its comments explicitly deny that equal signatures prove future-state equivalence. Thus the repo already contains a crucial premise distinction:

> a representation can be useful as an experience-matching key without being sound as a logical equivalence relation.

This means deduplication, merging, caching, failed-state reuse, and research clustering should not be treated as one conceptual family merely because all compare states.

## 3. Failure memory exists, but its scope is deliberately local and epistemically weak

`nogood-cache.ts` records that one prior randomized repair continuation from a matching signature failed. It explicitly does **not** claim global unsatisfiability or that every continuation is fruitless. The cache is repair-local, per call, not shared between repair invocations and not persisted.

This yields several distinct questions that historical work can easily blur:

1. Can local experience reduce redundant randomized repair work?
2. Can a failed state support a logically sound impossibility certificate?
3. Can weaker empirical failure evidence usefully bias later exploration without becoming a prune?
4. Can information learned in one repair invocation help another repair, retry, stage, level variant, or solver family?
5. What abstraction of a failed state transfers while preserving useful conditional context?

Only the first is directly embodied by this cache. A negative or positive result on it cannot settle the other four.

## 4. Joint-obligation reasoning is a real lineage, not a hypothetical blank

`joint-obligation-propagation.ts` identifies a concrete shape where existing individual checks are each locally correct but miss their combination: a pending must-cross axis can force use of a neighboring portal terminal whose one-visit rule makes that future entry impossible after it has already been visited. The module describes this as “individually feasible, jointly incompatible.”

Important status: observer-only. It logs verdicts for offline analysis and must never influence pruning, ordering, or budget decisions.

The broader question is therefore not simply “has Pathfinder considered interacting constraints?” It has. Better parent questions are:

- Which obligations are currently modeled independently even though feasibility depends on their relation?
- Which relational combinations admit sound propagation/pruning, and which only predictive ordering?
- Are pairwise relations enough, or do hard residual failures require higher-order clusters?
- At what point does relational inference cost more work than it saves?
- Does a relational inference discovered in one subsystem survive stage boundaries and reach the part of search that can exploit it?

The current concrete implementation tests only one narrow descendant of that broader lineage.

## 5. Search diversity is distributed across multiple mechanisms

The source inventory contains explicit diversification, variety-search, scoring profiles, retry tiers, static portfolios, routing regimes, repair search, early/late repair, structural policies, and stage-budget machinery. This suggests that “diversification” is not one knob. It can act on:

- successor ordering;
- score geometry;
- beam/frontier retention;
- stochastic seed;
- search family;
- repair operator/path transformation;
- retry composition;
- stage order;
- work allocation among techniques;
- level-conditioned routing.

A failed diversity treatment should be located on this axis before generalizing to “more diversity does not help.” Likewise, two superficially different treatments may merely resample the same underlying search distribution.

The presence of `stage-budget-retry-distinctness.test.ts` is especially revealing: the repo has already recognized that retry identity and nominally separate attempts do not guarantee meaningful search distinctness. This should be treated as an explicit methodological premise when evaluating retry gains.

## 6. Continuation and restart are distinct research propositions

Current source includes both a restart/continuation harness and a beam-resumability pilot. This directly challenges any assumption that “more budget” is a scalar extension of one search. Additional work can be delivered by:

- extending an existing frontier with retained state/history;
- restarting the same policy with more budget;
- restarting with a different seed/profile;
- entering a different stage or search family;
- repairing a previously found partial/near solution.

Those interventions differ in which information is retained and which search distribution is revisited. Therefore historical scaling curves cannot automatically answer whether resumable continuation would help, and resumability results cannot automatically answer whether diversified restarts help.

## 7. Known-solution witnesses permit unusually sharp causal diagnostics

The source inventory includes `known-solution-prefix-survival.ts` in addition to the historical generated-level witness discipline. This creates a stronger diagnostic question than end-to-end solve/no-solve:

> where does a known-valid solution lineage cease to survive the actual production search process?

Potential causal loci include legality/generation, hard pruning, equivalence/merging, ordering, beam retention, stage termination, and work starvation. This is structurally more informative than treating every residual as a generic “hard level.”

It also exposes a methodological asymmetry: research that has a witness can diagnose destruction of a successful lineage, while research on naturally sourced levels without witnesses may see only absence of success. Conclusions drawn across those populations should not silently inherit the same evidential strength.

## 8. Topology has at least three roles that must stay separate

Current code contains topology computation, an open-path topology observer, and topology-linked diagnostics. Historical repair and level-blindness work also discusses topology. These can encode different propositions:

- topology as a logically necessary feasibility invariant;
- topology as a predictive feature for ordering/routing;
- topology as a diagnostic explanation of failure after the fact.

Evidence for usefulness in one role does not establish usefulness in another. In particular, observer correlation is not a pruning proof, and a failed scalar topology score does not reject topological structure as a source of categorical feasibility information.

## 9. Work allocation is part of capability, not merely performance

The current architecture has dedicated stage-budget, work-meter, orchestration reserve, retry-tier reserve, static-portfolio and routing machinery. Historical evidence likewise shows techniques that possessed useful behavior but failed at production scale because they consumed work that displaced stronger paths or were not exposed to the right residuals.

Accordingly, capability should be decomposed into at least:

- **intrinsic reach:** can the technique solve a target when given suitable exposure?
- **coverage:** which structural/failure regions can it affect?
- **marginal complementarity:** which solves does it add beyond already scheduled work?
- **consumption:** what competing work does it displace?
- **timing:** when does it receive its opportunity?
- **selection:** can orchestration identify when it is worth invoking?

A treatment can be intrinsically capable and production-negative. Conversely, an apparently weak technique can become valuable after routing or budget architecture changes. This is a major reason to scope historical negatives carefully.

## 10. Research-method premises already encoded by the repo

Across historical operating-model material and current tests/tools, several methodological beliefs are explicit enough to treat as premises themselves:

- wall-clock alone is an unstable work measure across machines/load;
- a solved-set regression is not sufficient evidence about compute cost;
- cumulative known-solution ledgers and cold typical-budget solves answer different questions;
- admissible lower-bound changes need correctness evidence independent of observed solve gains;
- a stochastic near-miss score is not proof of geometric/counterfactual closeness to a solution;
- generated witness-bearing levels allow stronger claims about search failure than unknown-solvability levels;
- feature-conditioned generalization is preferred to level-identity special casing;
- opt-in/default-off experiments should not silently alter production semantics;
- nominally distinct retries require evidence that they actually explore distinct work.

These assumptions shape which ideas become visible, which results count as evidence, and how quickly a branch of the premise tree is declared closed.

## 11. Provisional negative-space directions generated by this pass

These are **questions**, not claims of absence. Each needs a history/evidence search before classification.

1. **Cross-stage epistemic continuity:** what useful information about failed prefixes, rejected states, near-misses, obligation conflicts, or frontier structure is discarded when moving among main search, repair, retries, and later stages?
2. **Transfer scope of learned failure:** the existing nogood cache is intentionally local. Has the repo tested weaker non-pruning reuse across invocations/stages/families, rather than only sound certificates or purely local caching?
3. **Higher-order obligation interaction:** joint-obligation work has at least one pairwise concrete case. Is there evidence about interaction graphs or clusters larger than the implemented pair?
4. **Witness-lineage attribution:** are known-solution prefix survival tools routinely connected to production residual classification, or mainly used as bounded diagnostics?
5. **Equivalence hierarchy:** has research explicitly separated logical future-equivalence, safe dominance, pragmatic coarse merging, experience similarity, and diagnostic clustering across the whole solver, or only locally?
6. **Exposure-aware negatives:** how many historical “did not help” conclusions become “did not earn budget under this portfolio” once consumption and displacement are reconstructed?
7. **Information value versus inference cost:** relational/topological/constraint information can be valid yet too expensive. Has the repo measured information value at multiple insertion points rather than testing one monolithic implementation?
8. **Restart-versus-continuation semantics:** are historical budget-scaling conclusions robust to whether extra work preserves frontier/history?
9. **Failure-conditioned technique selection:** the architecture has routing and failure observability, but how much selection is based on direct failure signatures versus static level features or fixed portfolios?
10. **Research visibility bias:** observer-only mechanisms can accumulate evidence without receiving production opportunity, while production mechanisms can receive opportunity without fine-grained causal attribution. Does the research process systematically favor ideas that are easy to toggle and count?

## 12. Next passes

Before breaking quarantine, the investigation still needs:

- direct inspection of restart/continuation, known-prefix, topology observer, routing, budget/work and production orchestration code;
- historical searches for predecessor terminology and abandoned implementations;
- reconstruction of important negative-result lineages with population/config/budget limits;
- negative-space search generated from the independent structure above;
- hostile completeness audit, especially code/practice-only premises and cross-component boundaries;
- an independent synthesis committed as a freeze point.

Only after that freeze will the recent premise-mapping artifacts be read.