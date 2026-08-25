# Symmetry, equivariance, and representation bias in heuristic search

## Scope

Two different problems are often called “symmetry handling”:

1. **Redundant exploration:** avoid searching multiple states that are equivalent under a symmetry.
2. **Representation dependence:** avoid materially different heuristic behavior merely because an isomorphic problem was rotated, reflected, renamed, or otherwise re-encoded.

The second is the important issue for finite-budget heuristic search. Canonicalization and symmetry pruning mainly address the first and do **not** automatically solve the second.

## Core distinction

Let `σ` be a symmetry of the problem.

A scalar heuristic is **invariant** when

`h(σ(s)) = h(s)`.

A state-to-state, move, ranking, or survivor operation is **equivariant** when applying the symmetry before the operation gives the transformed version of applying the operation first. Informally:

`F(σ(s)) = σ(F(s))`.

These are different properties, not stronger/weaker versions of one another.

Even if heuristic values are perfectly invariant, the **search process need not be equivariant**. Finite-budget behavior also depends on:

- successor enumeration order;
- tie-breaking;
- secondary scores;
- queue discipline;
- beam truncation;
- duplicate/dedup policy;
- random-number consumption;
- hashing/canonical identifiers;
- state iteration order;
- pruning whose preconditions depend on representation;
- implementation details that resolve otherwise equivalent choices.

Therefore two mathematically isomorphic orientations can legitimately explore different traces and can even have different finite-budget outcomes without a correctness defect.

## What should transform under symmetry?

For a true puzzle symmetry, the **mathematical transition relation** should transform equivariantly: legal moves and resulting states correspond under `σ`.

If a heuristic is defined only from symmetry-preserving structure, its values may be expected to be invariant. Many classical relaxation heuristics have formal invariance results under task symmetries, but not every implementation preserves those results because supporter choice, tie-breaking, abstractions, feature construction, or pattern selection may break symmetry.

Hard feasibility predicates and exact pruning rules should normally be invariant/equivariant when the symmetry preserves the puzzle semantics. A rotation should not make a genuinely legal path illegal or turn a proved-dead state live.

By contrast, **which equal-valued candidate is expanded first** usually has no mathematical requirement to be invariant. Nor must a bounded beam preserve corresponding subsets unless survivor selection itself is equivariant.

## Representation-induced search bias

Orientation dependence can arise without any incorrect rule. A reflected grid may reorder moves, hashes, ties, or beam candidates. Under unlimited complete search this may only alter trace order; under a finite budget it can alter which subtrees receive computation before cutoff.

Useful taxonomy:

- **Harmless trace difference:** different expansion order, essentially same cost/capability.
- **Useful diversification:** different representation or tie behavior explores meaningfully different search regions and improves portfolio coverage.
- **Arbitrary representation bias:** different behavior caused by representation but with no consistent benefit.
- **Systematic harmful bias:** one orientation repeatedly receives worse rankings, retention, or work efficiency and therefore loses capability.

The last two are the primary diagnostic concern.

Random tie-breaking can diversify traces but does not by itself prove or guarantee representation neutrality. Randomness may merely average over one source of bias while leaving others intact.

## Structural orientation cost versus arbitrary representation bias

Frontier/decomposition research adds an important control to this taxonomy.

A rotated or reflected instance can interact differently with a **fixed geometric processing order** because the corresponding frontier/interface width changes. That is a legitimate structural computational effect: bounded-width dynamic programming is exponential in interface width, and even heuristic search can inherit different residual bottlenecks from geometry.

This should be kept separate from arbitrary representation conventions such as compass priority, coordinate lexicography, insertion order, or PRNG-consumption order.

For orientation diagnostics, therefore compare geometry-only interface measures when they are cheaply available:

- row-major versus column-major frontier width/profile;
- minimum of a prespecified geometry-only ordering family;
- other exact boundary-width proxies chosen without observing solve outcome.

Interpretation:

- if isomorphic orientations have materially different prespecified interface widths, some runtime/capability asymmetry may have a structural explanation;
- if those widths are equivalent but finite-budget outcomes still diverge, arbitrary ranking/retention/order effects become a stronger suspect;
- equal width does not prove search equivariance, and unequal width does not excuse semantic or heuristic asymmetry.

Do not choose the favorable ordering after observing which orientation solved and then use that width as post-hoc justification.

## Symmetry pruning and canonicalization

Graph automorphisms partition states into symmetry orbits. A canonicalizer maps each orbit to one representative so duplicate-equivalent states can be stored once. Static symmetry breaking adds constraints/orderings up front; dynamic symmetry breaking prunes symmetric alternatives during search.

These methods can dramatically reduce redundant exploration when a search contains many symmetric states, but they answer a different question from orientation bias.

Important cautions:

- canonical labeling is closely related to graph isomorphism; do not casually describe it as an ordinary NP-complete/NP-hard primitive;
- approximate canonicalization may miss symmetries but must not merge genuinely non-equivalent states if used for hard pruning;
- a canonical state representation can reduce orbit redundancy while the heuristic ranking, tie-breaking, or beam survivor policy remains representation-biased;
- symmetry-breaking rules can interact badly with weighted, bounded, incomplete, or otherwise modified search if their correctness assumptions no longer hold.

## Tie-breaking and ordering

Tie-breaking has large empirical effects in heuristic search. When many frontier states share the same primary score, a secondary order can dominate practical behavior.

For orientation-sensitive puzzles, inspect whether corresponding choices remain corresponding after transformation. Potential sources include:

- fixed compass-direction priority;
- coordinate-lexicographic order;
- insertion/FIFO/LIFO order;
- map/set iteration order;
- stable-sort fallbacks;
- candidate IDs derived from coordinates;
- asymmetric secondary heuristics;
- width/dedup rules that keep one representative class preferentially.

A deterministic order is not automatically symmetry-neutral. Lexicographic coordinate order is deterministic but usually changes meaning under rotation/reflection.

## Beneficial intentional asymmetry

Symmetry is not always something to remove. Deliberately different orderings or configurations can be useful when they provide complementary finite-budget exploration. A portfolio may rationally include asymmetric behaviors if each earns marginal solve/work value.

The key distinction is **intentional, measured diversification** versus accidental dependence on arbitrary encoding.

If multiple directional configurations solve disjoint instances, their asymmetry may be useful. But that does not establish that each direction deserves production budget; fixed-work marginal value still decides.

## Diagnostic questions

When symmetric variants differ, ask in order:

1. **Semantic correctness:** do legal moves, goals, exact counts, and hard prunes transform correctly?
2. **Heuristic values:** are corresponding states assigned corresponding/invariant scores?
3. **Structural interface cost:** under prespecified geometry-only orderings, do the orientations expose materially different frontier/interface widths?
4. **Ranking:** when scores tie or nearly tie, does secondary ordering preserve the symmetry?
5. **Retention:** do beam/dedup policies preserve corresponding candidate classes?
6. **Randomness:** does the transformation alter PRNG-consumption order rather than only labels?
7. **Budget effect:** does the trace difference materially change solve probability or work?
8. **Systematic direction:** across unrelated parent levels, is one orientation consistently advantaged, or are wins balanced?

A single orientation flip is weak evidence. Repeated parent-level cliffs, especially with consistent first-divergence mechanisms, are stronger.

## What evidence matters

Useful measurements include:

- first corresponding step where search order diverges;
- score/rank differences at that point;
- whether corresponding states are both live/dead under an exact oracle;
- beam survival/culling differences;
- expansions or machine-independent work by orientation;
- prespecified geometry-only frontier/interface width by orientation where cheaply available;
- parent-level solve/work discordance across rotations/reflections;
- whether discordance has directional sign or merely balanced diversification;
- ablation of tie-break/order components while holding total work fixed.

Avoid treating row-level counts from many sibling variants as independent evidence; the parent puzzle is the natural unit for generalization.

## Development interpretation

The literature supports **diagnosing orientation dependence**, not automatically responding with rotated production retries or global canonicalization.

If hard semantics differ under symmetry, that is a correctness issue.

If heuristic values differ unexpectedly, inspect the heuristic representation.

If values agree but finite-budget outcomes diverge, first distinguish genuine interface/decomposition-cost differences from arbitrary ranking, tie-breaking, retention, randomness, and truncation effects.

If directional differences are balanced and complementary, they may represent useful diversification rather than a defect. If one representation repeatedly loses for arbitrary reasons, reducing that dependence can recover capability and may reduce the need for multiple directional configurations.

## Bottom line

The central theoretical point is simple:

> **Heuristic invariance is not search equivariance.**

A symmetric puzzle can receive identical heuristic values yet different finite-budget outcomes because the solver must still resolve ties, order successors, choose survivors, consume randomness, and truncate search. Symmetry pruning removes redundant equivalent states; representation-neutral search tries to ensure that arbitrary orientation does not systematically distort those decisions. Geometry-induced interface width provides a separate structural explanation that should be measured rather than conflated with either category.