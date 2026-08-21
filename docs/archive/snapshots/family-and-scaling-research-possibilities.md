New Research Directions for Pathfinder

> **Status:** original research proposal (no implementation-status tracking of its own). Most of
> the level-family half (sections 1, 8, 9, 11a, 13, 19, 21–23) was picked up and built as
> [`sibling-cousin-system.md`](sibling-cousin-system.md), whose own "Implementation status"
> section maps directly against this document's section numbers and records what shipped vs. what
> still describes target state. Read that doc first for current behavior; this one for the
> original motivating research questions. The first narrow scaling instrument now exists as
> [`req-length-sweep.md`](req-length-sweep.md); the broader multi-feature analysis proposed here
> remains future work.

Level Families, Counterfactual Variants, and Solver Scaling

Pathfinder now has enough solver telemetry, known witnesses, provenance information, and corpus breadth to support a new kind of investigation.

Until now, most solver development has compared different solver versions against a fixed set of levels. That answers whether the solver is improving, but it provides limited evidence about why one level is easy, another is hard, or why a particular configuration succeeds.

Two related research directions could make those questions much easier to study:

1. Generate controlled families of related levels from existing levels and witnesses.
2. Analyze how solver cost scales with board size, win requirements, path structure, object density, and solver technique.

These ideas are useful independently. Together, they could turn the level corpus into a much richer experimental environment.

The level-family work provides controlled variation. The scaling work provides a language for describing what changed and how solver cost responded.

The broad goal would be to move from observations such as:

«Level 147 is slow.»

toward explanations such as:

«Perimeter beam search becomes expensive when intersection demand is high relative to path length, but path density is low enough that the board does not naturally force revisitation. Moving the must-cross objects nearer the witness’s intersection cluster removes most of that cost.»

That kind of explanation can inform scheduling, heuristics, pruning, level generation, difficulty estimation, and benchmark design.

---

1. Level families

There are several useful kinds of related levels, but they should not all be treated as equivalent.

Exact-witness children

An exact-witness child preserves the same known coordinate path as a valid solution while changing some arrangement of grid objects.

The parent and child retain:

- the same grid dimensions,
- the same required length,
- the same required intersection count,
- the same selected witness path,
- and normally the same object inventory.

The objects may be rearranged only where the original witness remains legal.

The solver is not required to find that preserved witness. The child may contain other valid solutions, and discovering one of those is useful evidence.

This is the strongest kind of controlled comparison because the central path geometry remains fixed.

It asks:

«How much of the observed difficulty comes from the object arrangement rather than the known solution path itself?»

Examples might include:

- moving must-pass objects among cells already visited by the witness,
- moving must-cross objects among cells where the witness genuinely satisfies the crossing rule,
- moving blocks or hazards among cells the witness does not use,
- relocating compatible filters,
- rearranging unused portal pairs,
- or changing several movable objects at once.

Some mechanics will naturally have very little freedom under a fixed witness. That limitation is informative rather than a defect. A witness that supports only one legal must-cross placement has a different structural capacity from one that supports ten.

Local children

A local child changes only one object or one small relationship.

Examples:

- move one block,
- move one must-pass,
- move one must-cross,
- rotate one filter,
- swap two compatible objects,
- move one unused portal pair,
- or change one object’s permitted intrinsic property under a deliberately relaxed experiment.

These are likely to provide the clearest causal evidence.

If the parent solves in 20 milliseconds and a one-object child times out, the changed object has exposed a real solver sensitivity. A global reshuffle can reveal that difficulty varies, but a local mutation can often reveal what carries that difficulty.

Local children could eventually form a graph of neighboring levels, where each edge is a single mutation and each node is labelled with solver behavior.

That graph could expose:

- easy plateaus,
- hard basins,
- sharp solved-to-unsolved boundaries,
- solver-technique transition points,
- and isolated pathological arrangements.

Symmetry children

The whole level and witness can be rotated or reflected together.

These levels are logically equivalent under the symmetry, but the solver may not treat them equivalently.

A large difference in nodes or runtime could expose:

- directional move-order bias,
- clockwise versus counterclockwise preference,
- gate-order effects,
- coordinate-based tie breaking,
- asymmetrical perimeter behavior,
- or implementation details that accidentally privilege one orientation.

Symmetry variants are especially valuable because they test the solver more directly than the puzzle.

A reflected level taking fifty times as many nodes is not evidence that the reflected puzzle is fifty times harder. It is evidence that the solver has an orientation preference.

Constrained-shuffle children

A larger number of eligible objects can be rearranged while preserving the selected witness and inventory.

These children provide a distribution of difficulty around one witness.

A family might reveal that:

- almost every legal arrangement solves quickly,
- most arrangements fail,
- the original level is unusually easy,
- the original level is unusually hostile,
- or the family contains several sharply different search regimes.

This creates useful family-level descriptions such as:

- robust family,
- arrangement-sensitive family,
- specialist-dependent family,
- witness-hard family,
- hostile-parent family,
- or chaotic family.

Re-embedded cousins

A cousin may preserve the abstract structure of the witness while changing its coordinate embedding.

Possible preserved features include:

- path length,
- intersection count,
- revisit structure,
- turn sequence,
- crossing order,
- objective order,
- portal-event sequence,
- and relative endpoint structure.

The witness might be translated, rotated, reflected, or embedded into a larger board.

These are weaker comparisons than exact-witness children because the path itself changes location or geometry, but they can isolate questions that exact children cannot.

One especially useful experiment would be placing essentially the same path structure into boards of different sizes.

That would help answer:

«How much does additional irrelevant spatial freedom affect each solver technique?»

For example, a path structure that fits inside an 8×8 region might be embedded in:

- an 8×8 board,
- a 10×10 board,
- a 12×12 board,
- and a 15×15 board.

The essential witness remains similar, while the amount of unused open space changes.

A broad DFS might suffer badly because it can wander into the additional area. An objective-focused beam may remain relatively stable. This would reveal genuine technique-specific scaling rather than merely comparing unrelated levels of different sizes.

Recipe cousins

A more distant cousin might preserve only a declared recipe:

- grid size,
- required length,
- required intersections,
- object counts,
- mechanic counts,
- density bucket,
- witness signature,
- or some broader structural category.

The cousin would use a new witness and a new arrangement.

At that point, it is effectively a newly generated level from the same recipe. It is still useful, but it should not be treated as a controlled sibling.

Recipe cousins could help test whether findings discovered within exact-witness families generalize to unrelated levels.

For example:

«A must-cross placement rule appears predictive within one sibling family. Does it remain predictive across new witnesses with similar length, intersection demand, and density?»

That is where cousins become especially valuable.

---

2. Why solved parents are useful

Solved levels provide a known baseline.

A solved parent can reveal:

- how fragile its success is,
- whether its winning configuration remains stable,
- whether the original arrangement was unusually favourable,
- whether most children remain easy,
- and whether small changes create large performance cliffs.

A level that currently solves in 10 milliseconds may have children ranging from 5 milliseconds to timeout. That would show that the parent occupies a lucky spot in a difficult family.

Another level may remain trivial across hundreds of legal children. That would indicate a broadly easy witness family rather than a fortunate arrangement.

Solved levels are also useful for testing overfitting.

A heuristic improvement discovered on one parent should ideally improve or preserve performance across held-out children and entirely separate families, not merely on the exact arrangement that inspired it.

---

3. Why unsolved parents are useful

Unsolved but witnessed parents ask a different question:

«Is the family broadly unsupported, or is the original arrangement unusually hostile?»

Several possible outcomes would be informative.

Many children solve

The witness and win metrics are not inherently beyond the solver. Something about the parent’s arrangement is making the correct search difficult.

The next useful step would be comparing the parent with nearby solved children.

Few children solve

The rare successful children may identify very specific structural changes that unlock the solver.

These could point toward:

- weak heuristic gradients,
- misleading objective ordering,
- portal timing problems,
- must-cross placement sensitivity,
- poor gate selection,
- or specialist configurations that are currently scheduled too late.

No children solve

The difficulty may be tied more strongly to:

- the witness geometry,
- the win requirements,
- the object inventory,
- or a broader unsupported structural family.

Recipe cousins could then test whether the problem persists across new witnesses with similar metrics.

---

4. Multiple solutions and witness interpretation

A witness is one valid solution, not the definition of the level.

Any level with multiple solutions permits different valid witnesses.

The purpose of preserving one selected witness is not to claim uniqueness. It is to retain a fixed known solution while varying other properties.

When the solver finds a different solution in a child, several interpretations are possible:

- the rearrangement made an alternative path easier,
- the preserved witness became harder to discover,
- the solver switched solution attractors,
- or a previously impossible solution family became available.

It would therefore be useful to compare the discovered path with the hidden preserved witness.

Possible measures include:

- exact path equality,
- edge overlap,
- cell overlap,
- crossing-location overlap,
- objective-order similarity,
- portal-event similarity,
- and broader structural similarity.

A child can remain a valid exact-witness child even when the solver finds a completely different path.

That alternative-solution behaviour is part of the result.

---

5. Scaling by board size

Grid size is an obvious candidate predictor of solver cost, but nominal dimensions alone are fairly crude.

Useful size measures include:

- width,
- height,
- total area,
- number of open cells,
- number of statically reachable cells,
- average local degree,
- static branchiness,
- obstacle density,
- and portal-adjusted connectivity.

An open 12×12 board may provide more search freedom than a heavily blocked 15×15 board.

For each solver configuration, it would be useful to examine how the following grow with board size:

- solve rate,
- nodes expanded,
- elapsed time,
- milliseconds per node,
- timeout rate,
- winning frequency,
- scheduler pass,
- and late-win frequency.

Different techniques may scale for different reasons.

A DFS configuration may expand many more nodes as open area increases.

A beam configuration may expand a more stable number of nodes but spend more time sorting or scoring larger candidate sets.

A portal specialist may be largely insensitive to area until portal connectivity introduces additional branching.

A perimeter strategy may depend more on board dimensions and boundary length than on total area.

These distinctions can inform both solver architecture and scheduling.

---

6. Scaling by win metrics

The two central win requirements are:

- required path length,
- required intersection count.

Their absolute values matter.

A path of length 100 usually represents more search depth than a path of length 30, even when both occupy the same proportion of the board.

Ten required intersections usually represent more accumulated structural burden than two, even when the ratios are identical.

Useful absolute features include:

- "reqLength",
- "reqInt",
- endpoint distance,
- minimum static route length,
- and the difference between required length and shortest plausible route.

A useful detour measure is:

[
\text{detour factor}

\frac{\text{required length}}
{\text{minimum gate-to-goal distance}}
]

A high detour factor means the path must do substantially more than merely reach the goal.

This could interact strongly with perimeter, objective-first, and near-closure techniques.

---

7. Scaling by ratios

Ratios help compare levels of different sizes and burdens.

Length density

[
\text{length density}

\frac{\text{reqLength}}
{\text{open area}}
]

This describes how much path must be packed into the available space.

A high value suggests congestion, extensive coverage, or revisitation pressure.

A low value suggests abundant unused space and many opportunities for irrelevant wandering.

Intersection frequency

[
\text{intersection frequency}

\frac{\text{reqInt}}
{\text{reqLength}}
]

This describes how often the path must create intersections relative to its length.

Two levels with the same "reqInt" can impose very different demands if one has a much shorter path.

Intersection pressure by area

[
\text{intersection pressure}

\frac{\text{reqInt}}
{\text{open area}}
]

This describes how many required intersections must be realized relative to the board’s available spatial capacity.

Object density

[
\text{object density}

\frac{\text{number of mechanical objects}}
{\text{board area}}
]

Mechanic-specific versions could also be useful:

- must-cross objects per path step,
- filters per open cell,
- portals per open cell,
- objectives per path step,
- or hazards per reachable cell.

Ratios should not replace absolute values.

A 30-step path and a 100-step path can have identical length density but very different search depths.

The useful analysis includes both absolute burden and normalized pressure.

---

8. The relationship between board size, required length, and required intersections

This may be one of the most important scaling questions.

The difficulty of an intersection requirement depends on both path length and spatial freedom.

A high intersection ratio on a small crowded board may be geometrically natural because the path has few places to go without revisiting itself.

The same intersection ratio on a large open board may require the solver to deliberately manufacture crossings despite abundant opportunities to avoid them.

Grid size can therefore affect intersection difficulty in opposite directions.

Small and crowded

Possible effects:

- intersections occur naturally,
- exact intersection control becomes difficult,
- premature or excessive intersections become common,
- connectivity becomes fragile,
- and path completion may be constrained.

Large and sparse

Possible effects:

- intersections are easy to avoid,
- the solver can wander through large non-intersecting regions,
- intersection-seeking heuristics may become more valuable,
- and general search may waste time in geometrically irrelevant space.

This suggests interaction features rather than one universal ratio.

A useful experimental question is:

«For a fixed required length and intersection count, how does increasing open area affect each solver technique?»

Another is:

«For a fixed board size and path length, how does increasing intersection demand affect each technique?»

And another:

«Does the effect of intersection demand change depending on path density?»

The strongest analysis may include interactions such as:

[
\text{technique}
\times
\text{open area}
]

[
\text{technique}
\times
\frac{\text{reqLength}}{\text{open area}}
]

[
\text{technique}
\times
\frac{\text{reqInt}}{\text{reqLength}}
]

and:

[
\text{technique}
\times
\left(
\frac{\text{reqLength}}{\text{open area}}
\cdot
\frac{\text{reqInt}}{\text{reqLength}}
\right)
]

There is no need to assume one combined formula is correct in advance. Several interpretable features can be compared against observed solver cost.

---

9. Empirically normalized intersection demand

Raw ratios may still miss an important question:

«How unusual is this intersection requirement for a path of this length on a board of this shape?»

A longer-term possibility would be estimating an expected or feasible distribution of intersections for comparable paths.

For example:

- grid size: 12×12,
- open cells: 124,
- path length: 60,
- obstacle density: 10%,
- no portals.

Random legal path sampling or witness generation might show that most valid paths of length 60 produce between zero and three intersections.

A requirement of eight intersections would then be structurally unusual, even if "8 / 60" does not appear extreme in isolation.

This could produce an empirical percentile:

«Required intersection count is above the 95th percentile for comparable path geometries.»

Possible normalizations include:

[
\frac{\text{reqInt}}
{\text{expected intersections}}
]

or:

[
\frac{\text{reqInt}}
{\text{high-percentile feasible intersections}}
]

This would be more computationally involved, but sibling and cousin generation could help estimate the relevant distributions.

---

10. Witness-derived structural metrics

Known solutions allow much more precise description than win metrics alone.

Two witnesses with the same length and intersection count can have very different geometry.

Useful witness features include:

- number of unique cells,
- revisit surplus,
- maximum visits to one cell,
- turn count,
- straight-run distribution,
- witness bounding-box area,
- witness area as a fraction of board area,
- intersection clustering,
- mean distance between crossing events,
- first and last intersection positions,
- longest interval without an intersection,
- objective order,
- objective clustering,
- portal usage,
- and local branching around the witness.

For example:

[
\text{unique-cell ratio}

\frac{\text{unique witness cells}}
{\text{path positions}}
]

and:

[
\text{revisit surplus}

\text{path positions}

\text{unique witness cells}
]

A path can produce many intersections in one tight knot or spread them across the whole board.

Those forms may interact differently with:

- intersection harvesting,
- perimeter sweep,
- near-closure rescue,
- beam diversity,
- and objective-first search.

Witness metrics could therefore explain technique behaviour that "reqLength" and "reqInt" cannot.

---

11. Nodes versus elapsed time

Nodes expanded and elapsed time answer different questions.

Nodes expanded

Nodes provide a relatively stable measure of search effort.

If node count grows sharply with grid size, the solver is exploring a larger state space.

If node count grows sharply with intersection frequency, the solver may be struggling with history-sensitive geometry.

Elapsed time

Elapsed time includes:

- node expansion,
- heuristic calculation,
- connectivity checks,
- beam maintenance,
- sorting,
- memory allocation,
- garbage collection,
- validation,
- and orchestration overhead.

A useful derived metric is:

[
\text{milliseconds per node}

\frac{\text{elapsed time}}
{\text{nodes expanded}}
]

If nodes remain stable while milliseconds per node rise with board size, the solver may have an implementation scaling problem rather than a search-space problem.

Possible causes include:

- larger bitsets,
- more expensive flood fills,
- larger objective scans,
- repeated whole-grid operations,
- or increased beam bookkeeping.

If nodes and time rise proportionally, the main issue is probably search breadth or depth.

If time grows much faster than nodes, the per-state machinery deserves inspection.

---

12. Technique-specific growth

The most useful scaling analysis will probably be per configuration rather than only at the whole-solver level.

For each solver technique, examine growth against:

- open area,
- required length,
- required intersections,
- length density,
- intersection frequency,
- intersection pressure,
- detour factor,
- object density,
- witness revisit structure,
- and mechanic counts.

Possible findings might include:

- Generic DFS scales badly with open area because it explores irrelevant spatial freedom.
- IntersectionHarvest improves as intersection frequency rises because the objective aligns with its search bias.
- IntersectionHarvest performs poorly when intersection demand is moderate but board area is very large.
- NearClosureRescue depends more on remaining obligations than on board size.
- Large beams have flatter node growth but worse milliseconds per node.
- Perimeter strategies perform best when witness geometry stays near the boundary.
- Portal specialists show weak dependence on grid area but strong dependence on endpoint topology.
- Flipping-filter levels increase per-node cost more than raw node count.

These findings could directly influence:

- attempt ordering,
- per-configuration time caps,
- beam width,
- feature gating,
- specialist selection,
- and fallback policy.

---

13. How level families strengthen scaling analysis

The existing corpus can reveal correlations, but it is heavily confounded.

Larger boards may also contain:

- longer paths,
- more intersections,
- more objects,
- newer mechanics,
- harder design styles,
- or later-generation procedural patterns.

A raw finding that 15×15 levels take longer might not be caused by grid size.

Children and cousins allow more controlled experiments.

Exact-witness children

These hold grid size, win metrics, and witness constant while changing object placement.

They help estimate arrangement variance.

Re-embedded cousins across board sizes

These can hold witness structure roughly constant while changing spatial freedom.

They help estimate genuine grid-size effects.

Recipe cousins

These can hold broad density and metric categories constant while sampling new witnesses.

They help test population-level generalization.

Together, these could separate:

- witness effect,
- placement effect,
- board-size effect,
- mechanic effect,
- solver-technique effect,
- and interactions among them.

Conceptually:

[
\text{observed solver cost}

\text{witness structure}
+
\text{object arrangement}
+
\text{board capacity}
+
\text{mechanics}
+
\text{solver configuration}
+
\text{interactions}
]

The decomposition will never be perfect, but related-level experiments make it far more approachable.

---

14. How scaling analysis can guide family generation

The relationship also works in the opposite direction.

Scaling results can determine which children and cousins are most informative to generate.

Examples:

- If DFS appears sensitive to open area, generate re-embedded cousins with controlled increases in unused space.
- If intersectionHarvest appears sensitive to "reqInt / reqLength", generate cousins across a range of intersection frequencies.
- If must-cross density correlates with late wins, generate exact-witness children that move must-cross objects through different geometric contexts.
- If milliseconds per node rise sharply on larger boards, generate size-scaled cousins to isolate per-node overhead.
- If perimeter configurations show directional asymmetry, generate symmetry children.
- If one feature region contains solved/timeout cliffs, generate local children around those boundaries.

This would create an adaptive research loop:

1. Scaling analysis identifies a suspicious relationship.
2. Controlled families are generated to isolate it.
3. Solver behaviour is measured across the family.
4. The relationship is confirmed, rejected, or refined.
5. A solver improvement is proposed.
6. The improvement is tested on held-out families and ordinary corpora.

---

15. Scheduler implications

The current fast-portfolio work already shows that winning attempts are usually extremely front-loaded.

Family and scaling analysis could reveal where that result does and does not generalize.

For each configuration, it would be useful to examine win probability by elapsed threshold across:

- grid sizes,
- length-density buckets,
- intersection-frequency buckets,
- witness structures,
- mechanic combinations,
- and sibling families.

A configuration might be fast-or-never overall but possess a real late tail on:

- low-density, high-intersection boards,
- large portal-heavy boards,
- or families with clustered must-cross obligations.

That could support feature-conditioned scheduler behaviour.

For example:

- 250 ms for a configuration on small low-intersection boards,
- 1 second on ordinary boards,
- 3 seconds on a feature-defined specialist family.

The aim would not be to create a complicated scheduler immediately. The first value is understanding whether current static tiers are robust across the level population.

Children also offer a stronger overfitting test for scheduler thresholds.

A threshold inferred from one published level should be tested across:

- its siblings,
- held-out families,
- and recipe cousins.

---

16. Heuristic and pruning implications

Near-identical children are especially valuable for diagnosing solver failures.

Suppose two levels share:

- the same witness,
- the same metrics,
- the same objects except for one must-cross placement.

One solves quickly and the other times out.

Comparing their search telemetry could reveal:

- a heuristic gradient pointing away from the useful region,
- premature objective pursuit,
- an ineffective lower bound,
- a pruning condition that becomes too weak,
- a specialist that is attempted too late,
- beam collapse onto one attractor,
- or poor diversity near a geometric bottleneck.

This is much stronger evidence than comparing two unrelated levels.

The same family can also test whether a proposed fix addresses a real structural weakness.

A fix inspired by one boundary pair should ideally improve:

- nearby children,
- similar held-out families,
- and related cousins.

If it improves only the original pair, it may be a local patch rather than a general solver advance.

---

17. Benchmark design

Families could produce more informative benchmarks than isolated levels.

Possible benchmark subsets include:

Symmetry benchmark

Logically equivalent transforms used to test orientation bias.

Arrangement robustness benchmark

Many children sharing one witness, used to test sensitivity to object placement.

Boundary benchmark

Near-identical solved and unsolved pairs.

Scaling benchmark

Related cousins that vary one major dimension, such as board area or intersection frequency.

Specialist benchmark

Families known to favour specific solver techniques.

Generalization benchmark

Entire held-out families and recipe-cousin populations.

The family should be the unit of train/test separation.

Randomly splitting siblings from one family across development and validation would exaggerate generalization because those levels share too much structure.

---

18. Statistical cautions

Several traps are worth keeping visible.

Family pseudoreplication

A thousand children from one witness are not a thousand independent examples.

Aggregate conclusions should weight or group by family.

Generation bias

Randomized placement is not necessarily uniform.

Accepted children may depend heavily on:

- placement order,
- eligibility domain size,
- rejection strategy,
- and backtracking behaviour.

Generation telemetry should therefore record:

- candidate counts,
- rejection reasons,
- eligible domains,
- and generation attempts.

Solver censoring

The ordinary solver stops after the first solution.

That means later configurations do not receive equal opportunities.

For technique comparison, a research mode may need to run all selected configurations under standardized caps even after another configuration solves.

Timing noise

Elapsed time can be affected by machine load, garbage collection, and run order.

Nodes expanded are generally better for structural scaling, while time remains essential for practical performance.

Alternative solutions

A child may solve quickly because it creates a new easy solution rather than making the preserved witness easier.

Solution comparison should distinguish these possibilities.

Historical corpus entanglement

Published levels may reflect the solver’s development history.

Findings should be tested on stress corpora, held-out families, and newly generated cousins.

---

19. Useful derived concepts

Several compact descriptors might prove valuable.

Spatial freedom

A measure based on:

- open cells,
- reachable cells,
- average degree,
- and unused space relative to required length.

Path pressure

A measure based on:

[
\frac{\text{reqLength}}
{\text{open area}}
]

Intersection pressure

A measure based on:

- "reqInt",
- "reqInt / reqLength",
- and how unusual that requirement is for the board and path length.

Objective pressure

A measure based on:

[
\frac{\text{mandatory objectives}}
{\text{reqLength}}
]

possibly adjusted for clustering and ordering.

Witness compactness

A measure based on:

- witness bounding area,
- unique cells,
- revisit surplus,
- and crossing clustering.

Arrangement sensitivity

Variance in solver cost across exact-witness children.

Configuration stability

How consistently one solver technique wins across a family.

Symmetry stability

How invariant solver behaviour is under rotations and reflections.

Search yield

Possible measures include:

- solutions found per million nodes,
- distinct solution families per million nodes,
- or successful configurations per million nodes.

These require standardized research budgets and should not be inferred from ordinary stop-on-first-win runs.

---

20. A possible research progression

A modest progression could produce useful evidence without committing immediately to a large system.

Stage 1: Descriptive scaling

Analyze the existing corpus by:

- grid size,
- open area,
- required length,
- required intersections,
- density ratios,
- witness structure,
- and solver configuration.

Use both nodes and elapsed time.

This may reveal obvious growth patterns and suspicious interactions.

Stage 2: Symmetry and local children

Generate:

- rotations,
- reflections,
- and one-object exact-witness children

for a stratified set of solved and unsolved parents.

Look for large performance cliffs and directional biases.

Stage 3: Constrained-shuffle families

Generate modest child families around selected witnesses.

Measure:

- solve rate,
- performance variance,
- configuration stability,
- and alternative-solution behaviour.

Stage 4: Controlled scaling cousins

Re-embed selected witness structures across different board sizes or spatial capacities.

Vary:

- unused open space,
- path density,
- and intersection pressure.

This directly tests scaling hypotheses from Stage 1.

Stage 5: Recipe cousins

Generate new witnesses within selected feature buckets.

Use them to test whether findings transfer beyond the original witness families.

Stage 6: Solver experiments

Apply family-derived findings to:

- scheduling,
- heuristics,
- beam policy,
- pruning,
- or attempt selection.

Evaluate on held-out families and ordinary corpora.

---

21. Minimal connections to the current codebase

Only a few existing-code seams appear especially important.

Canonical witness validator

Child generation must use the same rule interpretation as the game and solver.

A full path should be replayed under actual mechanics rather than validated using simplified placement rules.

Attempt-local telemetry

The existing attempt timing, node count, configuration identity, and provenance work should be retained.

Family analysis benefits from both:

- attempt-local cost,
- and cumulative scheduler cost before the winner.

Explicit configuration execution

Technique-comparison experiments may benefit from the ability to run a specific configuration × gate pair under an explicit cap.

This is similar to the seam already being considered for the portfolio scheduler.

Level and hint provenance

This should not be a bespoke record kept only inside family-tooling output. The codebase already has two append-only provenance schemas built for exactly this — `LevelProvenance`/`LevelProvenanceEntry` (`modules/domain/level-provenance-types.ts`) and `Hint`/`HintProvenanceEntry` (`modules/domain/hint-types.ts`), the latter with `mergeHints`/`reconcileHints` already implementing "the same solution rediscovered by a different technique appends a new entry, never overwrites or drops." Generated children and cousins should record parent, witness branch, relation type, mutation manifest, generation seed, and content hash as a `LevelProvenanceEntry` (`actor: 'procedural'`) on the level itself, and every solved/rediscovered path — including the constructed witness itself, tagged with a witness-style `solver.id` rather than as if found by cold search — as a `HintProvenanceEntry` merged onto that variant's `Hint`. See `docs/sibling-cousin-system.md` section 11a for the full mapping; solver-run provenance (technique, nodes, termination) stays on the `HintProvenanceEntry`'s `search`/`solver` sub-objects, distinct from but attached alongside the level's own `LevelProvenance`.

Hidden witnesses

The witness used for construction should not be exposed to *ordinary solver runs* — it is a validation oracle and comparison target during solving, not a hint fed into search. That is separate from whether it gets recorded afterward: once a variant is generated, its witness should still be persisted as a provenance-tagged `Hint` (per above) so the research corpus retains a known solution for every variant, even ones the solver never rediscovers cold.

---

22. Overall opportunity

The child and cousin ideas create controlled variation in level space.

The scaling ideas create a framework for understanding solver response.

Individually:

- children reveal placement sensitivity,
- cousins test structural generalization,
- symmetry variants expose solver bias,
- scaling analysis reveals growth patterns,
- witness metrics describe actual path geometry,
- and technique-specific curves reveal which solver strategies are vulnerable to which forms of complexity.

Together, they could support a more mature experimental cycle.

Instead of only asking:

«Did the new solver version solve more levels faster?»

Pathfinder could increasingly ask:

«Which structural properties caused this technique to succeed, fail, or consume additional search, and does that explanation hold across controlled relatives and unseen families?»

That is a much broader source of leverage.

The solver would no longer be learning only from a list of isolated successes and failures. It would be learning from landscapes of nearby possibilities.
