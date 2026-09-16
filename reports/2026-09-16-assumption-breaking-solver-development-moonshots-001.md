# Assumption-breaking solver development moonshots 001

> **Status:** ideation / architecture hypothesis harvest only
> **Date:** 2026-09-16
> **Authority:** not a work queue, not an experiment authorization, and not a replacement for `docs/solver-optimization-workstreams.md` or `docs/solver-future-work.md`
> **Purpose:** challenge assumptions that survived because the current solver family is effective, not because alternatives were proved inferior.

## Why this pass

The current solver is fundamentally a portfolio over forward path-prefix search. DFS and beam share transitions and validity; beam ranks/truncates prefixes; repair returns to earlier prefixes and searches forward again; portfolio policy chooses which of these attempts receives work. Much of the research program therefore asks how to score, retain, route, continue, or repair **forward prefixes** more effectively.

That is a sensible architecture, but it is also a very strong prior. The remaining 531-row residual, especially 390 Class-5 misses with no known admissible/T1 candidate, is exactly where architectural priors deserve interrogation.

Three assumptions are particularly worth breaking:

1. the natural search object is a forward prefix;
2. failed search is disposable evidence rather than something from which the solver should learn within the invocation;
3. exact reasoning belongs only to offline oracle/reference work rather than being a possible cold level-blind production primitive.

The level-blindness contract does **not** forbid sophisticated or exact current-input computation. It forbids saved exact-level history, identity/provenance leakage, stored hints/witnesses, and cross-run memory. A deterministic generic proof/search routine derived solely from the current puzzle and current invocation remains level-blind in principle. This creates a larger legal production design space than the current heuristic/oracle convention suggests.

## Moonshot A — minimal DEAD cores and conflict-driven search

### Broken assumption

When a prefix/state is proved or strongly diagnosed DEAD, current search mostly throws that event away except for ordinary backtracking/pruning effects.

### Idea

Build an offline **minimal DEAD-core extractor** first. Given an exact-DEAD state, relax or erase selected commitments until completion becomes possible, then seek a small causal set whose conjunction makes completion impossible. Candidate commitments include:

- portal-use/history facts;
- consumed region/interface choices;
- must-cross axis commitments;
- future-intersection placements/orderings;
- turn-entry/exit commitments;
- obligation ordering;
- path-side enclosure/walling facts.

The runtime descendant is conflict-driven search: derive a generic nogood such as “these three commitments cannot coexist,” retain it during the invocation, and use it to prune sibling branches or backjump directly to the commitment that can still change.

This is materially different from transposition caching. A learned conflict generalizes across many syntactically different prefixes that share the same causal commitments.

### Cheapest falsifier

On a frozen exact-labelled sibling set, ask whether DEAD states admit small recurring cores and whether those cores reject other DEAD siblings while sparing LIVE siblings. If cores are large, parent-specific, or non-recurring, stop before runtime machinery.

## Moonshot B — CEGAR obligation planner / path compiler

### Broken assumption

Search must construct geometry directly and continuously from Gate to Goal.

### Idea

Treat Pathfinder as two coupled problems:

1. an **abstract completion plan** over obligations/events/interfaces;
2. a geometric realization of that plan.

Start with a deliberately coarse abstraction: visit/satisfy pending landmarks, realize required crossings, consume portals, cross region interfaces, reach goal, respect broad length/intersection resources. Solve for an abstract event skeleton. Attempt to realize it geometrically. If realization fails, diagnose why the abstract plan was spurious and refine only the abstraction needed to exclude that failure. Repeat.

This is a Pathfinder-shaped counterexample-guided abstraction-refinement loop. Rather than hand-inventing an ever richer global state representation, the level itself forces the abstraction to become more precise only where required.

It is a direct architectural realization of H1 completion-regime reasoning.

### Cheapest falsifier

Using exact-labelled Class-5 states, define a tiny prespecified event vocabulary and test whether coarse abstract completion plans are frequently realizable after only a small number of refinements. If nearly every abstract plan needs near-concrete geometry before becoming predictive, CEGAR has little compression to exploit.

## Moonshot C — cold local exact proof engine

### Broken assumption

“Exact/oracle” is a research-data role rather than a possible production computation mode.

### Idea

Add a generic, bounded exact reasoning engine invoked only on selected current-level/current-state subproblems. It could be SAT/CP/DP/branch-and-bound or a purpose-built exact suffix solver. It receives no historical labels or saved witnesses.

Possible services:

- prove a frontier state infeasible;
- prove that a pair/order of future events is impossible;
- return an admissible lower bound;
- return a small conflict core;
- produce a bounded suffix witness;
- answer a local interface-contract question for decomposition.

The important shift is from “heuristic solver judged by exact oracle” to “heuristic solver may purchase exact information when uncertainty is expensive.”

### Cheapest falsifier

Replay current frontier states offline through the exact routine under explicit work accounting. Measure exact-work cost against avoided heuristic work and newly reachable solves. If exact queries are almost always more expensive than simply searching, keep them as research instrumentation.

## Moonshot D — complete-path large-neighborhood search

### Broken assumption

The only useful partial object is a valid prefix.

### Idea

Maintain a **complete or nearly complete Gate-to-Goal path candidate**, permitted to violate a controlled subset of Pathfinder constraints. Iteratively destroy a structurally meaningful neighborhood and repair it. Destruction could target a crossing region, portal segment, obligation cluster, turn chain, or high-conflict interface rather than “roll back N path cells.”

This changes the search landscape. A prefix solver must repeatedly rediscover the suffix; a complete-path solver can preserve globally useful structure while rewriting the region that causes infeasibility. Existing negative generic positional-repair evidence does not test this search object.

### Cheapest falsifier

Construct relaxed complete candidates for a sample of residual parents and compare their structural/edit distance to accepted solutions. If useful solutions are not locally reachable from plausible relaxed full paths, LNS loses its reason to exist.

## Moonshot E — backward abstraction and meet-in-the-middle feasibility

### Broken assumption

All meaningful reasoning must progress from the Gate forward.

### Idea

Full exact reverse search is awkward because Pathfinder state is history-sensitive. But reverse **abstraction** need not reconstruct exact history. Build a backward frontier from the Goal carrying only necessary completion contracts: remaining length/parity bands, obligation/interface requirements, allowable portal histories, crossing-resource ranges, or region signatures.

Forward prefixes then ask whether they can meet any compatible backward abstract state. This can be used as a prune, heuristic, or actual bidirectional architecture.

A more radical version combines this with CEGAR: backward abstraction identifies suffix impossibilities; forward concrete search identifies prefix realities; refinements sharpen whichever side generated the spurious meeting.

### Cheapest falsifier

On exact LIVE/DEAD sibling states, test whether a coarse backward completion signature rejects a useful fraction of DEAD states without rejecting LIVE states. Do not build a complete bidirectional solver first.

## Moonshot F — separator contracts and region decomposition

### Broken assumption

The path must be reasoned about as one monolithic grid object.

### Idea

Many levels may contain narrow geometric separators, bottleneck interfaces, filter/portal transitions, or obstacle-defined regions. Detect them and decompose the puzzle into regions connected by small interfaces. A region contract can summarize what a partial realization contributes/consumes:

- entry/exit cells and directions;
- length contribution;
- intersection contribution/capacity;
- mechanic-state changes;
- obligation satisfaction;
- portal/interface use;
- compatibility with neighboring contracts.

Then solve or precompute local region possibilities and compose them with DP/CSP/AND-OR search.

This could turn a huge path state space into a much smaller contract-composition problem on the levels where topology cooperates.

### Cheapest falsifier

Run a decomposition census over the 390 Class-5 residual: separator sizes, region counts, interface widths, and whether known solutions cross candidate separators in low-complexity ways. If residual levels are mostly highly entangled with broad interfaces, deprioritize.

## Moonshot G — learn the state space, not merely the score

### Broken assumption

The current syntactic state representation is approximately the right equivalence relation, so the main job is ranking states better.

### Idea

Use offline exact suffix probes to study **behavioral equivalence**. Two syntactically different states are equivalent for search if every relevant future completion behavior available from one is available from the other. Exact equivalence is probably intractable, but a probe-defined approximation can reveal which state distinctions matter and which are noise.

This is a Myhill-Nerode/bisimulation-flavored view of Pathfinder: learn a compact signature of the future completion language, then use that signature for canonicalization, retention, or heuristics.

Portal coarse-state merge is suggestive here. Its success shows that intentionally lossy state equivalence can buy real capability. The August categorical-quota negative tested a retention policy over chosen keys, not the broader question “what is the right future-behavior state quotient?”

### Cheapest falsifier

Sample sibling states, run a fixed battery of exact bounded completion/event probes, cluster by behavioral response, and ask how much syntactic state collapses without mixing known LIVE/DEAD behavior on held-out parents.

## Moonshot H — optionality search instead of progress search

### Broken assumption

A good state is one that looks closest to satisfying the objective now.

### Idea

Score or retain states by **future option value**: the diversity/number of qualitatively distinct completion regimes still available. A state can look locally ugly but preserve three viable obligation orders; a prettier state may already have committed itself to one impossible regime.

This is the runtime sibling of H1. The representation could be a small event-feasibility signature, backward-contract count, or abstract-plan count rather than a giant scalar feature vector.

### Cheapest falsifier

On exact extinction pairs, measure whether LIVE siblings preserve more distinct feasible event/order regimes than higher-ranked DEAD siblings after controlling for ordinary score/progress. A null result kills the idea cheaply.

## Moonshot I — interpretable program synthesis as a hypothesis engine

### Broken assumption

Humans must manually invent every useful generic state descriptor.

### Idea

Define a tiny expression language over legal current-state facts: comparisons, conjunctions, small counts, topology/interface predicates, mechanic-state relations, and event-feasibility outputs. On **development-only** exact-labelled sibling data, synthesize the smallest predicate/program that separates recurring LIVE/DEAD contrasts. Penalize complexity aggressively.

Do not deploy the fitted artifact immediately. Treat it as an automated scientist proposing a hypothesis. Freeze the expression, translate it into a named causal claim, and validate on untouched parents/generator blocks.

A tiny tree or neural model can play the same discovery role if its job is to nominate interactions for distillation rather than become production policy.

### Cheapest falsifier

If parent-held-out prediction collapses or synthesized rules are large/unstable, that is evidence against a compact missing descriptor and in favor of architecture/search changes.

## Moonshot J — adversarial counterexample generation

### Broken assumption

The research corpus should mainly sample levels and then observe where the solver fails.

### Idea

Generate levels/variants specifically to maximize **disagreement between solver belief and exact reality**, or to flip one proposed abstraction while preserving neighboring structure. Examples:

- states ranked strongly by production but exact-DEAD;
- tiny mutations that switch exact completion while leaving scalar features almost unchanged;
- levels where two actions diverge maximally in first-loss location;
- levels that force an abstraction/refinement system to reveal a missing variable.

The generator becomes a counterexample finder for solver theories, not merely a difficulty generator.

This should complement, not replace, human/editor transfer because adversarial synthetic families can overfit their own construction logic.

### Cheapest falsifier

Try to produce controlled solver/exact disagreement families for one frozen hypothesis. If the generator cannot make informative independent contrasts without encoding the answer in construction artifacts, keep it diagnostic only.

## Moonshot K — cooperative blackboard portfolio

### Broken assumption

Strategies are independent attempts that communicate mainly through orchestration and final outcomes.

### Idea

Let beam, DFS, repair, backward abstraction, and exact micro-solvers exchange generic within-invocation artifacts:

- promising frontier states;
- conflict cores/nogoods;
- backward completion contracts;
- regions shown infeasible;
- event-order impossibilities;
- structural novelty/stasis information.

A blackboard architecture turns the portfolio from “try several solvers” into “several reasoning processes attacking one level together.” Card E continuation/handoff is the smallest current empirical doorway into this idea, so this moonshot should remain downstream of Card E recurrence rather than leapfrogging it.

## Moonshot L — per-level search-plan compilation

### Broken assumption

The portfolio should select among a fixed library of attempt configurations.

### Idea

Perform deterministic cold static analysis of the current puzzle and **compile a bespoke search algorithm** for that invocation. The compiler can choose:

- decomposition vs monolithic search;
- forward/bidirectional mode;
- abstraction vocabulary;
- exact-query budget;
- macro-actions;
- region ordering;
- beam/DFS/repair roles;
- which proof certificates to maintain.

This is still level-blind because the entire plan is derived from legal current puzzle inputs. It moves policy selection up one level: from choosing parameterized attempts to choosing a reasoning architecture.

The first version need not be ambitious. A compiler that chooses between two genuinely different search architectures from static structural facts would already test the premise.

## Cross-cutting moonshot — declarative mechanic automata

A longer-term rewrite could represent each Pathfinder mechanic as a small automaton/resource constraint and search a product of spatial/path state with mechanic automata. This would make future-feasibility, backward abstraction, exact micro-solving, decomposition contracts, and proof explanations easier to compose as mechanics grow.

This is the least immediate idea here because its migration cost is enormous. Its value is architectural coherence, not a presently evidenced solve gain.

## Suggested research posture

Do **not** add these twelve ideas to the active queue. Their value is in widening the hypothesis space without destroying the repo's hard-won evidence discipline.

The highest-information cheap work is:

1. **minimal DEAD-core extraction** — because even a negative teaches whether Class-5 failure has compact causal explanations;
2. **separator/decomposition census** — cheap static evidence about whether a radically different algorithmic factorization is available;
3. **behavioral-state quotient probe** — asks whether the solver is searching the wrong state space;
4. **cold exact-query economics replay** — tests the protocol-level assumption that production exact reasoning is too expensive before building it;
5. **CEGAR micro-prototype** only if H1/DEAD-core evidence shows recurring relational completion constraints.

The best independent competing solver-family bet is complete-path LNS. The highest-upside integrated architecture is CEGAR + backward abstraction + conflict learning. The most provocative protocol change is allowing bounded exact current-input reasoning to become a first-class production primitive when its measured value exceeds its cost.

## Core conclusion

A great deal of Pathfinder research has optimized **which forward prefixes survive and which forward search attempt gets the next unit of work**. The residual may instead require one of three different moves:

- change the object being searched (complete paths, abstract plans, region contracts);
- change what the solver learns from failure (cores, conflicts, refinements);
- change the epistemic contract of an invocation (purchase exact local knowledge when useful).

If none of those families produces compact recurring structure on Class 5, that itself would be strong evidence that the remaining misses are not hiding one elegant missing abstraction and may instead require substantially greater generic search power.