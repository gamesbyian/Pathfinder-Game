# Solver technique operational taxonomy

> **Status:** current implementation interpretation and active research proposal; not production scheduling policy.
> **Purpose:** distinguish techniques that are genuinely different search mechanisms from configs that merely alter ordering, retention, pruning, or budget context, then define the missing operational-similarity analysis.
> **Implementation authority:** [`solver-architecture.md`](solver-architecture.md) and `modules/solver/*`.
> **Outcome evidence:** [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md).
> **Scheduling use:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

## Why this distinction matters

The technique census measures **effect**: which levels each isolated technique solves, how much isolated node work it uses, and how solve sets overlap. It does not directly measure **operation**: whether two techniques make the same local choices, explore the same branches, preserve the same frontier states, or diverge for fundamentally different reasons.

The solver's names can overstate implementation diversity. Many names that sound like separate algorithms are only scoring profiles passed to the same search engine. `harvestThenFinish`, `portalFirstTransfer`, `objectiveFirst`, `nearClosureRescue`, `knotBuilder`, `closureCommitment`, and the other ordinary profiles do not invoke bespoke procedures matching their names. Their names describe the intended emphasis of different weight vectors in the shared `scoreMove()` function. The authoritative current values live in `modules/solver/policy.ts`.

Do not infer operational independence from technique names, and do not infer operational redundancy from solve-set overlap alone.

## Operational layers

| Layer | What changes operationally | What stays shared |
|---|---|---|
| Ordinary DFS profile | `scoreMove()` weight vector changes child ordering | DFS traversal, LDS wrapper, legal moves, pruning, state representation |
| DFS structural template | Extra geometric bonus changes child ordering | DFS engine, base scoring terms, pruning |
| Plain beam profile | Same scoring-profile vocabulary applied to a retained frontier | Legal moves, scorer, much pruning/state machinery |
| Beam width | Number of frontier survivors retained | Generation/scoring logic and beam algorithm |
| Diverse beam | Survivor selection preserves buckets by structural state rather than purely global score | Candidate generation/scoring and beam traversal |
| Beam dedup / near-tie modes | Which near-equivalent frontier states survive | Core beam generation/scoring |
| Admissible-order search | Primary child ordering becomes least admissible slack first | DFS-shaped stack search, legal moves, sound bounds/pruning |
| Admissible-order tie-break profile | Only equal-slack children use a soft scoring profile | Admissible-slack primary ordering |
| `ida:none` | Equal-slack children retain candidate order; no soft-score tie-break | Admissible-slack primary ordering and search engine |
| Repair | Seeded randomized restarts, near-miss elites, splice/ruin-and-recreate behavior | Legal move/state primitives and much scoring vocabulary |
| Prune ablation/retry | Feasible explored tree changes because a hard rejection rule changes | Search family otherwise unchanged |
| Retry tier / budget tranche | Same or closely related search is revisited in a different residual/budget context | Underlying search mechanism may be identical |

This taxonomy is about *mechanism*, not value. A small operational difference can still cause a large solve-set difference in a combinatorial search.

## Major families

### Shared-score deterministic search: DFS and beam

Ordinary DFS and beam are more closely related than their outcome labels suggest. Both use the same policy profiles and `scoreMove()` vocabulary, and much of the same legal-state/pruning machinery. Their fundamental distinction is how they respond to uncertainty after scoring candidates:

- DFS commits down one scored branch and backtracks; the LDS probes temporarily bound how many non-greedy child choices may be accumulated before the final unbounded DFS wave.
- Beam retains multiple partial paths, then culls the frontier. Width, dedup, near-tie retention, and diverse selection therefore alter *which alternatives survive*, not what the base scorer considers attractive.

A DFS profile and beam profile with the same `profileName` can therefore agree strongly on local move preference while behaving very differently globally because one commits and the other preserves alternatives.

### Scoring profiles are weight vectors, not named algorithms

`POLICY_PROFILES` changes the balance among shared terms such as goal attraction, objective attraction, finish commitment, perimeter bias, must-pass/must-cross urgency, must-turn guidance, portal-parity guidance, intersection setup, anti-dither, and revisit penalty.

Examples of current intent:

- `perimeterSweep`: raises perimeter preference and reduces some anti-dither/revisit pressure.
- `objectiveFirst`: emphasizes must-pass/must-cross/objective progress.
- `mustCrossFirst`: further raises must-cross urgency.
- `intersectionHarvest`: strongly raises intersection setup while weakening objective urgency.
- `finishFirst` / `nearClosureRescue` / `closureCommitment`: emphasize goal/finish pressure to different degrees.
- `harvestThenFinish`, `portalFirstTransfer`, and `portalCommitted` are comparatively nearby mixtures of the same terms; their names do not imply dedicated phase or portal procedures.

Raw numeric distance between profile weight vectors is only a **source-level similarity proxy**. It is not an operational distance metric because scoring terms have different natural magnitudes, activation conditions, correlations, and phase scaling. Two numerically close profiles can diverge sharply on states where their differing term is decisive; two numerically distant profiles can rank all available children identically on many states.

### Structural templates are explicit geometric interventions

Templates add geometric ordering signals rather than merely renaming a profile:

- `perimeterCW` and `perimeterCCW` pull toward the boundary and reward opposite traversal directions;
- `cornerHarvest` pulls toward corners during its active phase;
- `sideCommitment` discourages crossing the grid midline;
- axis/side templates bias toward a selected half of the board.

CW and CCW are therefore unusually clean operational mirror treatments. Their balanced but level-specific census inversions are especially useful controlled fixtures for studying search fragility and orientation sensitivity.

### Admissible-order search is a different ordering principle, not a different state space

Admissible-order search keeps a DFS-shaped bounded-memory search and the same sound feasibility machinery, but ranks surviving children primarily by **admissible slack**: remaining steps minus the tightest applicable admissible lower bound. Least slack is tried first.

The named admissible-order profiles are secondary tie-breakers only. `ida:none` is more operationally distinctive than its sibling label suggests because equal-slack children receive **no soft-score tie-break at all**. This should remain explicit when interpreting its unusually distinctive census capability.

### Repair is the strongest genuinely different paradigm

Repair is an iterated-local-search / ruin-and-recreate strategy built specifically to escape deterministic best-first commitment failures. It uses deterministic seeded randomness, repeated restarts, near-miss elites and splice repair instead of relying on one systematic gate-to-goal tree traversal.

Repair reuses legal move/state primitives and portions of the scoring vocabulary, but its exploration dynamics are qualitatively different. It also deliberately differs from deterministic DFS/beam in some scorer/pruning details where seemingly small changes were empirically load-bearing. Its large census-exclusive capability is therefore consistent with genuine operational complementarity rather than merely a differently named weight vector.

## What we currently know about similarity

The existing second-order census provides **outcome similarity**. It identifies high solve-vector overlaps such as closely related admissible-order profiles and ordinary DFS profiles. That is useful for scheduling/substitutability, but it does not establish that those techniques traverse the search space similarly.

Source inspection establishes several strong operational relationships without another experiment:

1. all ordinary scoring profiles share one scoring equation and differ primarily by weights;
2. DFS and beam can share the same move-order preference while differing in commitment/frontier retention;
3. beam width and diversity alter retained breadth more directly than scoring intent;
4. structural templates add explicit geometry on top of a profile;
5. admissible-order changes the primary ordering signal, while its named profiles affect ties only;
6. repair changes the exploration paradigm itself.

What is **not** yet known quantitatively is which ordinary profiles/configs actually make equivalent decisions on the states the solver encounters, where each pair first diverges, how much of their explored search tree/frontier overlaps, and whether outcome differences are caused by broad strategic differences or a tiny number of load-bearing ordering flips.

## Missing analysis: operational similarity census

Build a rebuildable operational-similarity view that complements the existing outcome census. Prefer extending existing probe/census infrastructure and telemetry over creating another canonical evidence store.

The analysis should compare applicable configurations on shared encountered states and, where needed, bounded matched probes. Useful metrics include:

- **top-choice agreement:** fraction of candidate sets where two policies choose the same first child;
- **full ranking agreement:** Kendall/Spearman-style agreement over each sibling set, handling 2–4 candidate sets cleanly;
- **score decomposition:** which scoring term causes a pair's ranking to diverge and by what margin;
- **first-divergence depth:** earliest search depth/state at which two otherwise matched deterministic runs choose different continuations;
- **prefix / branch overlap:** shared explored states or path prefixes before divergence;
- **DFS subtree overlap:** how much work occurs in common versus disjoint branches under matched deterministic budgets;
- **beam candidate/frontier overlap:** generated-candidate and retained-frontier Jaccard, lineage survival, dedup collisions, near-tie survival, bucket pressure and churn;
- **width/diversity delta:** distinguish "same ranking, more survivors" from genuinely different retained structural modes;
- **admissible-versus-soft disagreement:** how often least-slack ordering disagrees with each soft profile, and whether `ida:none`'s candidate-order ties are the decisive divergence;
- **template intervention rate:** how often a template actually changes the child ranking relative to its untemplated base profile, including CW/CCW mirror comparisons;
- **repair fingerprints:** restart/elite/splice source, greedy-vs-exploratory choice rates, badness trajectories, repeated-attractor states and seed sensitivity rather than pretending repair has a directly comparable deterministic tree.

Use canonical `workSpent` only when comparing production cost across search families. Nodes and state-count overlap are appropriate within a family but are not portable cross-technique currency.

### Sampling

Do not immediately rerun the entire expensive census. Start with deterministic, reusable cohorts chosen to answer the mechanism question:

- technique-outcome inversion levels from the existing census;
- high-similarity pairs with discordant outcomes;
- singleton/doubleton capability levels;
- CW/CCW direction inversions;
- beam 2K/5K and plain/diverse inversions;
- `ida:none` versus `ida:default` and the other canonical tie-break profiles;
- repair-only and mixed repair/non-repair phenotypes;
- a representative control sample where paired techniques have the same outcome.

Split family/variant-derived evaluation by parent family. Exact IDs may select offline diagnostic fixtures but may never become production steering inputs.

## Cross the operational and outcome maps

The highest-value output is a pairwise map with **two independent axes**: operational similarity and outcome similarity.

| Operational behavior | Outcomes | Interpretation |
|---|---|---|
| Similar | Similar | strongest redundancy/substitution candidate |
| Similar | Different | high-value fragility case: find the few load-bearing divergence decisions |
| Different | Similar | alternative routes to the same capability; useful scheduler substitution/resilience candidate |
| Different | Different | strongest evidence of genuinely complementary search capability |

The **similar operation / different outcome** quadrant is especially valuable for capability work. If two policies agree almost everywhere but one solves and the other fails, trace the first meaningful divergence and identify the scoring/retention/pruning term responsible. That narrows "why does technique X win?" from a whole algorithm to a small causal decision boundary.

The **different operation / same outcome** quadrant is especially valuable for scheduling. If two methods reach essentially the same solve set through disjoint search behavior, the cheaper/current-residual one may substitute for the other without assuming they are mechanically redundant.

## Scheduler use

Operational similarity should become a secondary scheduler feature/evidence source, not a runtime technique-ID lookup. It can help:

- avoid spending deep budget on several configs that explore nearly the same states after the same predecessors fail;
- protect genuinely complementary actions even when their global solve count is modest;
- choose diversity deliberately, rather than equating a list of different profile names with a diverse portfolio;
- define action clusters for the oracle-frontier analysis;
- identify which live telemetry signals can tell that one operational mode is already exhausted before buying a near-duplicate continuation.

The production scheduler remains level-blind. Offline pair labels and exact historical winners may discover generic rules, but runtime decisions must use legal static features and current-solve telemetry under [`solver-level-blindness.md`](solver-level-blindness.md).

## Documentation rule

When describing a profile, template, retry or technique, say **which operational layer changes**. Avoid prose that makes a scoring profile sound like an independent algorithm or a retry tier sound like new search capability. For exact current weight values, `modules/solver/policy.ts` is authoritative; descriptive registry strings are convenience labels and must not contradict it.

One stale registry label found in this audit illustrates the rule: `modules/solver/ablation-config.ts` currently describes `PROFILE_default` as "all weights = 1.0", but current `POLICY_PROFILES.default` uses a non-uniform tuned vector. Treat `policy.ts` as truth. Correct that convenience label rather than propagating it into analysis or documentation.