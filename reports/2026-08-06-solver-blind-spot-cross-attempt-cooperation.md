# Solver solve-rate blind spots: the search programme does not retain partial knowledge (2026-08-06, expanded 2026-08-07)

> **2026-08-07 expansion.** The first version correctly identified cross-attempt handoff as an
> untested seam, but stated it too narrowly and too absolutely. The existing frontier documents do
> already discuss compositional residual interfaces, specialist seeding, and shared-interface
> applications. What they do not yet make central is the broader pattern joining those ideas:
> useful partial knowledge is discarded **between attempts within one cold solve**, and most
> evaluation observes one known trajectory rather than the family of possible completions. An
> earlier revision also proposed cross-level solution transfer; that was out of bounds for the cold
> production solver because it would make search depend on precomputed solutions. This revision
> removes that proposal, records the invariant explicitly, and separates legitimate within-solve
> cooperation from separately-provenanced hint-guided research.

## Executive conclusion

The recurring blind spot is **knowledge retention and transfer inside one hint-blind solve**.

Pathfinder has accumulated many search approaches, but nearly all of them are framed, implemented,
measured, and accepted or rejected as self-contained attempts that start from the gate and either
return a complete solution or leave only aggregate telemetry. The orchestration layer shares a
budget; it does not share useful search products. DFS/beam dead subtrees, beam survivors, repair
elites and deficit signatures, admissible-order partial assignments, and CP-SAT explanations are
not a common currency that a later technique can consume.

That makes an unstated assumption throughout the research record:

> One existing or new technique must be able to cross the entire combinatorial gap by itself.

The evidence does not justify that assumption. In fact, several results point the other way: the
correct continuation is usually locally well ranked; repair repeatedly reaches structurally close
but frozen families; many specialist profiles genuinely run but fail independently; and fairer
budget division produced a large solve-rate gain without changing an algorithm. Together these say
that Pathfinder has useful but incomplete information distributed across attempts. It currently
throws that information away at exactly the point where techniques could complement one another.

This is not a recommendation to revive the failed broad portfolio scheduler. That experiment asked
which independent complete solver should receive the next time slice. The missing experiment asks
whether one search can hand a **bounded, explicitly typed artifact** to another search.

There is one equally important extension:

1. **Completion-family reasoning:** most diagnostics score a supplied winning trajectory one move
   at a time. They reveal local compatibility with that path, not which partial states preserve a
   large or strategically distinct family of completions.

The deeper assumption is therefore not merely “one technique must solve alone,” but:

> Within a cold solve, only a complete accepted path is reusable progress; incomplete work from a
> failed attempt is discarded.

### Non-negotiable boundary: no cross-level solution transfer in the cold solver

The production solver is intentionally agnostic to saved hints and withheld witnesses. Strategy may
depend on the current level's structural features, never its identity, provenance, stored solution,
nearest solved relative, or generator family. Therefore an earlier proposal in this report—to
retrieve motifs from solved cousins and use them as production warm starts—was wrong for the stated
goal. Even coordinate-free motifs would still encode information learned from precomputed solutions
and would make a nominally cold solve no longer cold.

That idea is permissible only in a separately named **hint-guided/offline discovery** workflow whose
provenance says it used prior hints. It may improve player hint coverage, but it must not be counted
as native solver solve rate, solver-solvability, or independent rediscovery. It is removed from the
recommendations below rather than rehabilitated through feature-keying.

## Scope of this review

This synthesis followed the repository's own authority chain rather than treating every dated file
as equally current:

1. `CLAUDE.md`, `docs/README.md`, `docs/solver-architecture.md`, and
   `docs/solver-development-roadmap.md` for current behavior and campaign framing.
2. The technique ledgers in `docs/solver-improvement-research-notes.md`,
   `docs/solver-next-frontier-multilingual-research-update-2026-08-02.md`,
   `docs/repair-search-stagnation-escape-plan.md`, `docs/ai-assisted-manual-solving.md`, and
   `data/stress/README.md`.
3. The top-level dated reports, especially the July 29-August 6 plateau, budget, nearest-neighbor,
   repair-stagnation, pruning, and path-archaeology series.
4. Report/log indexes and the generated corpus summaries. Raw per-level JSON and console logs were
   treated as backing evidence for their curated reports, not as thousands of independent claims.

The conclusion is therefore about a pattern across the research programme, not a claim that every
historical plan omitted every form of composition. The frontier research explicitly proposes
*spatial* composition through residual interfaces. The blind spot identified here is the adjacent,
more operational question of composition **between search procedures during the same cold solve**.
The distinction matters: this report is synthesizing and reprioritizing partially visible
ideas, not claiming that the words “seed,” “interface,” or “composition” never appeared before.

## The pattern across approaches

### 1. The orchestration unit is a complete attempt

The active roadmap's permitted change shapes are policy routing, scoring/pruning, lower bounds, or
an additive last-resort pass. Those are all useful, but each assumes an attempt remains the unit of
progress. Even `portfolio-solve-sweep`'s attempt cache is an experiment-speed optimization: it can
skip an unaffected attempt on a later program run, but it does not let one attempt consume another
attempt's partial search result on the same level.

The independent-attempt framing is especially visible in the near-twin work. The comparison asks
whether the solved twin's winning profile was absent, starved, or genuinely attempted. That is the
right diagnostic for routing, but `real-attempt` is then treated as evidence of an algorithmic
limit: the matching technique received nodes and did not finish. It does not test whether that
technique could finish after being seeded or constrained by a different technique's output.

### 2. Negative experiments mostly test isolated mechanisms

The record is admirably disciplined about killing ideas. Move-order changes, local must-cross
prunes, MST variants, symmetry, static forced chains, repair relinking, plateau penalties, and the
fast scheduler all received controls and kill criteria. But the dominant experimental shape is
still:

```
baseline complete attempt  vs.  same complete attempt + mechanism
```

This establishes whether a mechanism is independently strong enough to flip a solve under the
current ladder. It does **not** establish that the information produced by the mechanism is useless
to another search. Examples:

- A prune that saves only 1-5% of nodes cannot solve independently, but its rejected-state reason
  could focus a repair perturbation.
- Repair path relinking can fail because two elites share an incompatible suffix, while the same
  elites may still identify a small set of disputed cells for bounded exact search.
- Admissible-order search can fail to complete, yet expose a durable partial obligation order that
  removes an exponential family from DFS.
- A beam can fail to retain a winner to the goal but still provide diverse deep prefixes that are
  materially better starting points than another fresh-from-gate restart.

The inference “did not solve alone” → “not useful” is safe only for independent deployment, not for
cooperative deployment.

### 3. The strongest positive result was an interaction in disguise

The work-budget starvation fix moved corpus-2 by +41 solves without changing search logic. It made
attempts participate fairly instead of allowing the first one to consume the external node cap.
That is evidence that **the way approaches interact through resource allocation is itself a
solve-rate mechanism**.

The same history contains repeated second-order interactions: an early probe can starve the main
ladder; a sound prune changes branch order and can increase total nodes; widening several scoring
flags loses rescues found by single-flag passes; repair is more sensitive than DFS/beam to shared
scoring changes; and sequential repair variants can waste the budget before the useful variant.
These are not edge cases. They demonstrate that “technique A's measured value” is conditional on
what runs before, after, and alongside it.

Yet the response has mainly been better isolation and fair division. The next challenge is not
merely to prevent harmful interactions, but to design a beneficial one.

### 4. The diagnostics observe trajectories, not transferable state

Witness-divergence and winning-path archaeology answer whether the scorer likes moves on a known
valid path. Branching-factor and backtrack-depth work ask how search behaves locally. Those results
rule out several simple explanations, but their common unit is a move, prefix, or aggregate
attempt. None asks:

- Which partial states recur across otherwise different attempt profiles?
- Does repair's best elite lie close to a deep state visited by DFS or discarded by beam?
- Which obligations, cells, axes, or segment orders are stable across the best failures from
  independent techniques?
- Can one attempt's failure shrink another attempt's decision space without becoming an unsound
  prune?

The research corpus contains saved hints, withheld witnesses, attempt traces, near misses, sibling
families, and CP-SAT-labelled prefixes. It has enough material to measure these questions, but no
shared artifact schema joins them.

### 5. A known path is being used as a proxy for a completion family

Witness-divergence, path archaeology, and prune replay are excellent correctness and local-ordering
tools. They become misleading only when their null results are interpreted too broadly. A witness
move ranking first says that the scorer likes that move *conditional on already being on the exact
witness prefix*. The production search usually is not on that prefix, and a different first-ranked
move may also be valid but lead into a much smaller completion family.

This exposes three assumptions that should be tested separately:

1. **Prefix-conditioning assumption:** local quality along a supplied path predicts the global
   probability of reaching that prefix.
2. **Single-solution assumption:** one witness is representative of the solution family. This is
   weakest precisely on unsolved levels, which often have only the construction witness while
   solved levels have richer hint libraries.
3. **Mean-statistic assumption:** similar average rank/branching/backtrack statistics imply similar
   tail behavior. A handful of irreversible commitments can dominate a 100-step solve while barely
   moving the mean.

The missing measurement is not another average. It is **completion mass and extinction**:

- At matched depths, estimate how many distinct accepted completions remain under a prefix (exactly
  on small reductions, CP-SAT sampled/bounded on full levels).
- Track whether beam/DFS retains at least one prefix from each completion-equivalence class, rather
  than whether a particular witness child is locally rank 1.
- Compare the first depth at which all known/sampled completion classes disappear between solved
  and unsolved populations.
- Report upper tails and first-catastrophe depth per level, not only population means.

This measurement is complementary to cross-attempt transfer: it identifies *which* frontier state
is worth handing off, and prevents transferring a deep but completion-poor near miss merely because
its scalar badness looks attractive.

### 6. “Solve rate” hides three different product questions

The documentation carefully distinguishes cold typical-budget solves from levels carrying a valid
stored hint, but campaign language still sometimes treats “the solve count” as one objective. There
are at least three:

- **Player coverage:** can the product serve a verified hint? A stored or externally harvested hint
  counts.
- **Cold native rediscovery:** can the production solver independently rediscover a path under the
  interactive budget?
- **Research capability:** can any approved offline method solve a new instance under a stated
  resource envelope?

An idea can be valuable for one and irrelevant to another. Hint-guided discovery may dramatically
improve player coverage without improving cold native rediscovery and must retain that provenance.
A strong CP-SAT handoff may be appropriate offline but not browser-safe. Conversely, a 1% hot-path saving
matters interactively even if it adds no new corpus hint. Future reports should state which solve
rate is being optimized before declaring an avenue positive or dead.

This is not semantic housekeeping. Optimizing the wrong numerator encourages repeatedly solving
levels that already have valid hints while underinvesting in hint acquisition, compression, and
transfer for genuinely uncovered levels.

## The assumption to challenge

The programme often divides failures into “routing/scoring/budget” versus “genuine combinatorial or
algorithmic limit.” That is a useful taxonomy, but it accidentally makes the latter sound atomic:
if a correctly routed, fairly funded attempt still fails, a substantially new monolithic algorithm
or stronger admissible bound appears necessary.

A third category is missing:

> **coordination-limited** — several procedures each discover a different useful projection of the
> solution, but no procedure is allowed to inherit the others' progress.

This category is consistent with all recent null results:

- Good local move rank does not imply a complete correct path survives global competition.
- Similar local branching and DFS subtree sizes do not imply the searches visit the same useful
  deep states.
- Failure at 5.5× budget does not show that independent restarts accumulate knowledge; they may be
  repeating the same structural families at greater scale.
- No false prune on the witness proves soundness, not search diversity or information retention.

The repair stagnation reports are the clearest direct clue. Tens of thousands of fresh restarts
converge to the same deficit family. The response so far has tried to alter repair's own memory,
penalties, relinking, and perturbations. The untested interaction is to export the plateau's stable
facts to a different search whose strength is exact bounded completion rather than stochastic
construction.

## What else could explain the plateau?

Knowledge transfer is a supported hypothesis, not an established cause. A comprehensive conclusion
must preserve competing explanations and name evidence that would distinguish them.

| Rival explanation | Why it remains plausible | Discriminating observation |
|---|---|---|
| The representation is too weak, regardless of handoff | Exact length, intersections, edge-axis history, portals, and turn obligations create global coupling that a path or small artifact may not summarize | Handoff artifacts have no higher completion feasibility than matched controls, while a compact completion-family propagator does |
| The unsolved tail has extremely sparse solutions | Good local rank and ordinary branching can coexist with a vanishingly small number of globally compatible paths | Small reductions and CP-SAT sampling show orders-of-magnitude lower completion counts for unsolved levels at matched structure |
| Search failure is dominated by rare irreversible commitments | Population means can look identical while one early topology choice determines the entire solve | First-extinction/catastrophe depth separates solved and unsolved even when mean rank does not |
| Existing attempts are insufficiently diverse | A handoff between correlated searches may only recycle the same family | Cross-technique state-distance and deficit-signature distributions show little complementarity before any handoff is built |
| The remaining barrier is simply much larger compute | A 5.5× sample is informative but not an asymptotic scaling curve | Deterministic multi-budget survival curves remain smooth and predict solves at feasible larger budgets |

The proposed programme should be killed or redirected when one of these explanations wins. The
report's thesis is that the repository has not yet gathered the *interaction data* needed to decide,
not that cooperation is guaranteed to add solves.

## The missing interactions

These are hypotheses, ordered from smallest/most falsifiable to largest. None should become a hard
prune without the repository's existing proof and oracle bar.

### A. Repair elite → bounded exact completion

When repair plateaus, compute consensus and disagreement across its diverse elites:

- stable obligation orderings;
- stable path segments or entered axes;
- cells consistently included/excluded;
- a small “uncertain interface” around the remaining deficit.

Run a bounded DFS/beam/CP completion search that treats consensus only as **ordering or a reversible
assumption**, never as truth. Start with the most stable assumptions, relax them CEGAR-style when
completion fails. This differs from the rejected exact-copy relinking: it transfers a constraint
hypothesis, not a suffix.

### B. Beam frontier → repair warm starts

Sample structurally diverse deep beam survivors before frontier extinction and convert them to
repair starting material. Repair currently performs fresh-from-gate construction or splicing
inside its own elite family. Beam states have passed a different selection pressure and can inject
families repair does not generate by itself.

The decisive measurement is not local winning-move rank. It is whether beam-seeded repair produces
new deficit signatures or best-badness improvements compared with seed-identical repair alone.

### C. Admissible-order partial result → ordinary search ordering

If admissible-order search cannot finish, retain the deepest compatible partial obligation order or
a small set of alternative orders. Use these as soft phase guides for ordinary DFS/beam. The
existing choice is effectively “AO solves” or “AO used budget and failed”; the handoff extracts
value before completion.

### D. Cross-profile failure activity → diversification

Record compact, explicitly lossy features of repeated failed regions (for example current cell,
remaining obligation masks, resource bucket, and a visited-set sketch). Later attempts use this
only to break score ties or allocate participation, not to reject states. A feature becomes more
interesting when *different* profiles independently fail around it; that cross-profile agreement
is unavailable to any one attempt's internal stagnation memory.

### E. External oracle explanation → native search probe

The CP-SAT work is usually judged by whether it emits a full accepted hint. Instead, sample native
prefix states and ask the external model for a bounded completion, conflict, or minimal relaxation.
Map repeated conflicts back to soft native features. This makes the external solver a teacher of
where native search is wasting effort rather than a competing end-to-end hint generator.

## Interaction opportunity map

Not every pair deserves an experiment. The useful pairs are those where the producer's observed
by-product matches the consumer's known strength:

| Producer | Artifact (not a full solution) | Consumer | Why the interaction is non-redundant | First cheap test |
|---|---|---|---|---|
| Repair | elite consensus + disputed cells/obligations | bounded DFS or CP-SAT | stochastic construction locates a basin; exact search resolves a small interface | compare completion feasibility of consensus-conditioned vs matched prefixes |
| Beam | diverse deep frontier states/classes | repair | global breadth supplies structural families absent from repair's converged elite pool | seed-identical repair with/without imported states; compare new signatures |
| Admissible-order | partial obligation orders and contradictions | ordinary DFS/beam | global constraint ordering guides a faster native walker without requiring AO to finish | soft-order replay at equal work; verify guide is consumed |
| DFS/prune gauntlet | repeated late-dead features/reasons | repair or scheduler | exact failure evidence can direct stochastic perturbation away from recurring basins | shadow correlation with future repair stagnation, no pruning |
| CP-SAT atlas | bounded completion/conflict labels | native scoring/participation | external global reasoning labels native blind regions without shipping CP-SAT | held-out prediction of dead branches beyond existing gauntlet |
| Repair + beam + DFS | disagreement set across best partial states | small interface compiler | disagreement localizes where techniques have complementary uncertainty | measure whether interface width is materially below path length |

Three combinations should **not** be prioritized:

- More independent profiles with no artifact handoff: already exercised extensively by the ladder.
- A monolithic learned scheduler: the failed scheduler and current evidence do not justify its
  complexity; participation prediction is only useful after an artifact has demonstrated value.
- Hard cross-attempt nogoods from lossy signatures: the state-history audits show why apparent
  equivalence is unsafe. Begin with ordering, allocation, or reversible assumptions.

## A minimal evidence-first experiment

Do **not** build a universal shared-memory framework first. Add a shadow-only artifact collector on
a small, already-defined population:

1. Use 10-20 members of the 36-level `real-attempt` near-twin population. Use the solved twins only
   as evaluation controls; never expose their paths or hint-derived features to the solving run.
2. Run two complementary attempts with deterministic work allocation: one repair attempt and one
   beam or ordinary DFS attempt.
3. Capture at bounded intervals:
   - the best repair elites and deficit signatures;
   - diverse deepest beam/DFS states;
   - obligation-order, visited-cell, edge-axis, and remaining-resource summaries.
4. Measure overlap and complementarity before changing solve behavior:
   - nearest state distance across technique families;
   - stable facts shared by repair elites but not enforced by the exact search;
   - whether exact-search deep states fill repair's missing obligations;
   - whether handoff candidates are more completion-feasible in the existing CP-SAT atlas than
     matched same-depth controls.
5. Only if the shadow signal is positive, implement one soft handoff: repair-consensus guidance for
   a bounded DFS completion probe, followed by a memory-blind control pass.

### Success criteria

- The handoff reaches new deficit signatures or deeper completion-feasible states on at least 20%
  of the target population.
- At least one held-out level solves without reducing the solved set on published/corpus-1 gates.
- The benefit persists at equal total work and node budgets; it is not another hidden allocation
  change.
- The receiving attempt demonstrates use of the artifact; a nominally wired but inactive handoff
  is a failed experiment.

### Kill criteria

- Cross-technique artifacts are no more completion-feasible than matched same-depth controls.
- Consensus interfaces are nearly as large as the full path or collapse under one relaxation,
  leaving no bounded subproblem.
- Handoff merely reproduces states the receiver already reaches early.
- Serialization/copying cost consumes more than 5% of the target budget before any solve-rate
  signal.
- Any proposed hard equivalence or prune shows a live/dead collision under oracle fuzzing.

## Research-process corrections

Regardless of whether the experiment succeeds, four documentation habits would prevent this blind
spot from recurring:

1. **Classify negative results precisely.** Say “not independently solve-rate positive under this
   ladder” rather than “dead” when a mechanism may still emit useful information.
2. **Add an artifact column to the technique ledger.** For every search, list what it can export
   before completion and what other search could consume it.
3. **Separate resource composition from information composition.** Fair budgets are necessary;
   they are not cooperation.
4. **Test pairwise interactions selectively.** A full factorial across 63 ablations is wasteful.
   Test pairs only where one technique's observed failure product matches another's strength.
5. **Report trajectory evidence at its true scope.** A witness-prefix replay supports claims about
   local legality or rank on that prefix, not global frontier survival or completion-family size.
6. **Name the solve-rate objective.** Separate player hint coverage, cold native rediscovery, and
   offline research capability.
7. **Keep analysis inputs out of cold search.** A witness, stored hint, solved twin, or
   solution-profile library may label or evaluate an experiment, but may not provide an input
   feature or seed to `Solver.solve()`.

## Bottom line

Pathfinder has explored a wide algorithmic surface, but largely inside a single architectural and
experimental frame: independent, restart-from-gate, all-or-nothing attempts; and one known
trajectory used as the easiest observable
proxy for a completion family. The reports repeatedly show that attempts produce partial structure,
that their effects depend on ordering and allocation, and that more independent work does not
necessarily escape the same families.

The most important untested possibility is therefore broader than another scoring term, prune, or
portfolio order. It is that the solver can retain and transfer partial knowledge:

> **continue from what a different kind of search learned earlier in the same hint-blind solve,
> while measuring whether the transferred state still preserves real completions.**

That is the opportunity. It is not yet the verdict. The first obligation is the shadow comparison:
prove that techniques possess complementary, completion-relevant information at all. If they do
not, the rival-explanation table points the programme toward solution sparsity,
rare irreversible commitments, or a genuinely new global representation instead.
