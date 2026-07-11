# Solver improvement research notes

> **Status: proposed, nothing started.** This is a research-inspiration doc, not a committed
> plan — it exists to record what survived contact with the actual codebase after reading three
> external research surveys, so the ideas don't need re-deriving from scratch when someone picks
> one up. No code in this repo has been changed as a result of it. When an item below moves from
> "proposed" to "in progress," pull it into its own dated plan doc (see `solver-dev-tooling-plan.md`
> for the shape) and link it from [`future-work.md`](future-work.md); fold what ships into
> [`solver-architecture.md`](solver-architecture.md) the way every other completed plan does.

## Context

Three external research documents (AI planning / CP / SAT / search literature surveys,
commissioned to look for solver-improvement ideas) were read in full and cross-checked against
this repo's actual `modules/solver/*` code — not just their own summaries of what a typical puzzle
solver has, which necessarily guessed at Pathfinder's internals from the outside. The goal of this
pass was narrow: for each proposed idea, answer "do we already have this," "do we have the data to
prototype it cheaply," or "is it a genuinely new, well-scoped gap" — before anyone spends
implementation time on it.

This also deliberately looks for leverage from the solution-data infrastructure this repo already
carries: saved hints + provenance (`domain/hint-types.ts`), the per-level heatmap
(`data/level-heatmaps.json`), level-shape fingerprinting (`domain/level-fingerprint.ts`), and
solution-space fingerprinting (`scripts/stress/solution-profile-lib.mjs`,
[`solution-profile.md`](solution-profile.md)) — several of the papers' ideas turn out to be
much cheaper to prototype here than a green-field implementation would suggest, because the mining
corpus or the feature-extraction code already exists for an unrelated reason.

## Sources

- **"Ideas Likely Directly Useful"** — a broad idea-generation pass across CP/SAT/planning
  literature (dominance/nogood learning, symmetry breaking, admissible relaxations, portfolio
  scheduling, explainable search), tiered by confidence (directly useful / worth experimenting /
  speculative / deserves deeper investigation), with a reading list.
- **"Executive Assessment"** — the same territory, but run through a Pathfinder-specific
  applicability matrix (substantial novelty / incremental extension / already present /
  incompatible) with concrete minimal experiments, correctness-risk notes, and a recommended
  near-term/mid-term/moonshot sequence.
- **"Executive Synthesis"** — narrower and more relevant to this repo's existing solution-data
  work: what structured information can be mined from a corpus of *known solutions* (subgoal
  ordering, action motifs, occupancy-measure diversity, homotopy classes, invariant mining),
  demonstration-guided search, and — most usefully — an extended discussion of corpus-construction
  bias (solver bias, generator bias, survivorship bias, train/test leakage) that maps directly onto
  the caution [`solution-profile.md`](solution-profile.md) already bakes in (provenance-source
  bucketing, `provablyExhaustive` vs. the `discoverySaturation` heuristic).

All three are third-party research surveys, not written with knowledge of this codebase's actual
internals — every claim about "what Pathfinder already has" below was verified against the real
source files, not taken from the documents' own guesses.

## Already implemented — verified against the actual code

Don't rebuild these; a couple of the papers' "worth trying" items turned out to already exist here
in a more rigorous form than proposed.

| Paper idea | Where it already lives | Note |
|---|---|---|
| Landmark/MST hybrid lower bound (both docs' top near-term pick) | `modules/solver/lower-bounds.ts`'s `mpMSTLowerBound`/`mcMSTLowerBound` | Exact Kruskal MST over `{pos} ∪ remaining objectives`, with must-cross's perpendicular-2nd-visit-approach distance tightening on top, soundly memoized per `(pos, mask, [per-cell axis state])`. Stronger than the "greedy connecting order" the docs suggest as a first cut. |
| Portfolio/algorithm selection by instance features (SUNNY/SATzilla-style) | `modules/solver/attempts.ts`'s `getAttemptConfigs`, gated on `archetype.ts`'s `detectArchetype`/`getNavigableDensity` | The *architecture* (declarative, feature-keyed attempt ladder) exists; the *classifier* is 5 hand-tuned threshold rules, not learned — see gap #3 below. |
| Quality-Diversity / solution-family diversity search | `modules/solver/variety-search.ts` (exhaustive/saturated/target/budget/capped outcomes) + `domain/hint-selection.ts`'s coverage-guaranteed farthest-point selection over `domain/path-features.ts`'s `featureDistance` | A bespoke QD system in all but name: behavioral descriptors (edge-Jaccard, crossing placement, must-cross order), diversity floor, coverage guarantee. Doc 3's "occupancy-measure diversity" (Ghasemi et al.) is the same idea in RL vocabulary. |
| Delta-debugging / instance minimization | `scripts/stress/reduce-level.mjs` | Object removal, grid-shift, portal-pair-drop, re-validated against the referee at each step. |
| Learned difficulty prediction from solved instances | `scripts/stress/features.mjs`'s `fitRidge`/`predictRidge`/`buildChallengeModel` | Ridge regression trained on audit history, currently used only for generation-time level labeling — never wired into runtime strategy selection. See gap #3. |
| Diversity-decay / "beam collapse" monitoring | `modules/solver/orchestration.ts`'s per-attempt `bestBadness`/`finalBadness`/`nodesExpanded`; `scripts/stress/rank-levels.mjs` | Substrate exists (ranking "closest miss first"); no *live* beam-diversity metric during search itself. |

## Genuine gaps, and how existing data shrinks the cost of prototyping each

### 1. Graph-separator / articulation-point pruning — tested (2026-07-11), premise refuted; redirect, don't abandon
Both docs flag this as a cheap, sound, incremental win. We only have flood-fill reachability
(`modules/solver/topology.ts`'s `isConnected`) — no Tarjan cut-vertex detection to catch "this
must-pass cluster sits behind a single-cell chokepoint, so remaining length must exceed X."

**Tested the premise before writing any pruning code**, per the plan below: computed articulation
points (Tarjan) over each Corpus-1 level's free-cell graph, flagged must-pass/must-cross objectives
separated from the goal by at least one cut vertex, and correlated "fraction of objectives gated
behind a chokepoint" against `reports/stress/witness-divergence-corpus1.json`'s `cumulativeDiscrepancy`
(hypothesis: chokepoint-gated levels are where the witness most often needed a locally-"worse" move
than greedy scoring would pick). **Result: correlation -0.406 — the opposite of the hypothesis.**
Gated levels average *lower* discrepancy (19.0, n=11) than ungated ones (33.5, n=54).

This makes sense in hindsight: witness-divergence measures branching-factor confusion (how often
greedy scoring disagreed with the witness), and a single-corridor chokepoint gives the search little
to be confused about — there's only one way through. It doesn't measure forced-detour *cost*, and
BFS-based distances (already what `lower-bounds.ts`'s MST bound uses) naturally price in corridor
traversal through the real grid graph, so plain distance-based articulation-point pruning is likely
already subsumed by the existing MST bound.

The real opportunity is a different mechanism than either paper framed it as: a single-cell corridor
caps how many times a path can cross it, which caps how many extra self-intersections/loops are
achievable near objectives behind it. That's much closer to doc 2's separate "exact-intersection
feasibility check" idea (bound `reqInt` via cycle-space/corridor capacity) than to a length bound.
**Redirect this item to that hypothesis, not distance pruning, before trying again.**

### 2. Nogood / dead-end learning
Doc 2's top "high-impact if it works, moderate risk of bug" pick. The correctness bar is real —
CLAUDE.md's own MST-scratch-buffer bug (`docs/solver-architecture.md`'s "History: the MST bound
scratch buffer bug") is a direct instance of the exact caution doc 2 raises: *"learned nogoods must
be sound regardless of solution length, not episodic."* Don't underestimate that bar.

But the mining corpus already exists: `benchmark.mjs`'s `failedStrategies` + `attempts[].finalBadness`
across the stress corpora (now fresh for Corpus 1's 102 levels, and Corpus 2 shortly) is thousands
of recorded dead-ends with their exact `(mpVisitedMask, mustCrossMask, remaining length)` context.
Mining "combinations that never once succeeded across N independent attempts" *offline* from data
we already have is much safer than deriving nogoods live during search. Validate against the full
corpus first; promote to a live prune only once a candidate rule survives cross-validation against
a held-out slice — the exact leakage discipline doc 3 spends most of its "Bias, Leakage, and Corpus
Construction" section on.

### 3. Learned portfolio selection, done properly — probed (2026-07-11), two distinct findings
The highest-leverage near-term item, because every piece of the pipeline already exists for an
unrelated reason. Extend the existing ridge-regression challenge model from "predict difficulty"
to "predict which `ATTEMPT_CONFIGS` profile wins" — a classification/ranking task over the same
feature vectors `features.mjs`'s `levelFeatures` already computes. Training data: every
`benchmark.mjs` run's `winningStrategy` field (fresh for corpus-1 now, corpus-2 soon). This is a
small, well-scoped experiment reusing existing code, not a new subsystem — feature extraction,
historical-outcome logging, and even the regression-fitting code are all already written.

**Probed against the fresh Corpus-1 benchmark (85 solved levels) before building anything, same
discipline as item #1.** Two findings, one strongly actionable without any learning at all, one a
genuine negative result:

- **79.2% of total solve time on solved levels was spent on attempts BEFORE the actual winner**
  (516.6s of 652.0s). Per archetype: `must-cross-heavy` and `high-intersection-burden` waste
  75-86% of their time this way and have 5-8 *distinct* winning profiles within the same archetype
  bucket (vs. `portal-heavy`'s 6/8 dominated by one profile, still wasting 86% — an ordering
  problem even where the profile set is right). Worst individual cases burn 8-9 failed attempts
  and 20-26s before `repair` (the fallback-of-last-resort, deliberately tried last) turns out to be
  the actual winner. **This is real, actionable headroom independent of any ML** — re-examining
  `attempts.ts`'s declarative ordering for these two archetypes specifically, informed by this
  breakdown, could pay off before any learned component exists.
- **A naive leave-one-out 1-NN classifier (12 raw numeric features, z-scored, unweighted Euclidean)
  scored 30.6% winning-profile accuracy — *worse* than the current archetype's own dominant-winner
  baseline (35.3%).** Honest negative result on this attempt, not evidence the idea is dead: 85
  labeled examples across up to 8 classes per archetype bucket is a small, high-variance dataset
  (Corpus-2's benchmark, once it finishes, roughly quadruples it); the feature/distance choice was
  a first cut, not engineered; and "predict the exact winning profile" (a hard multi-class problem)
  is probably the wrong framing — "predict whether `repair` will be needed at all" (a binary
  classifier, since `repair` accounts for a disproportionate share of the wasted-time cases above)
  is a much easier, more directly useful target. Re-run once Corpus-2's benchmark data exists,
  reframed as the binary question, before drawing a final conclusion.

**Follow-up probe, same dataset, reframed as binary "will `repair` win":** only 10/85 (11.8%)
levels won on repair — a genuinely rare-positive, high-variance problem at this sample size.
Findings:
- **Best single-feature rule** (searched over 17 raw features × every threshold): `navDensity <=
  0.524` — precision 0.429, recall 0.600, F1 0.500. Catches 6/10 repair-winners at the cost of 8
  false positives. Intuitively sensible (repair is a fallback that's good at sparse/twisty
  problems where the beam/DFS profiles' typical heuristics get stuck) and — this is the point —
  *interpretable and cheaply deployable* if it ever clears a higher bar: a one-line density check,
  not a model to ship.
- **5-NN over all 17 features did *worse*** (F1 0.267, recall only 0.2 — catches 2/10) than the
  single-feature rule. Confirms item #3's first finding: more features actively hurt at n=85 with
  only 10 positives (classic small-data curse-of-dimensionality — irrelevant dimensions drown out
  `navDensity`'s real signal in the distance metric).
- **Conclusion: a real but moderate signal exists (`navDensity`), not yet strong enough to act on.**
  Both probes on this item now point the same direction — the dataset is the limiter, not the
  premise. Re-run this exact script once Corpus-2's benchmark lands (~4x the data, and critically
  more positive examples) before deciding whether to build or drop it.

### 4. Homotopy / topological path-class signatures — first probe mis-designed, real question still open
Genuinely new to us (doc 3, via Bhattacharya et al.). Our closest analogs are `portalSignature`'s
directed-jump-set (a coarse topological invariant, but only for portal usage) and the solution-profile
tool's `normalizedFootprint` — neither captures "which side of an obstacle cluster did this path
take" the way a true homotopy-class encoding would. Worth a narrow experiment scoped to must-cross-heavy
levels specifically (where path topology around obligations matters most): compute a cheap
homotopy-class proxy and check whether it partitions the existing hint corpus into behaviorally
distinct clusters that the current `featureDistance` metric (edge-Jaccard + crossing-placement +
must-cross order) misses. If it doesn't add a distinguishable axis, drop it.

**First probe (2026-07-11), against the published corpus (24 must-cross-heavy levels with ≥5
hints, 27,605 hint pairs — the stress corpus alone only had 3 qualifying levels, no statistical
power):** looked for pairs the current `featureDistance` rates as similar (< 0.3) despite visiting
very different cell sets (cell-visitation Jaccard > 0.6). **Zero such pairs found, out of 27,605.**

That's a clean result, but the test was checking the wrong thing: cell-visitation Jaccard and
edge-Jaccard (the dominant term in `featureDistance`) are mechanically correlated — both derive
from the same linear cell sequence — so of course they rarely diverge. It confirms the current
metric doesn't confuse "visited a totally different region" with "similar," which was never really
in doubt. The scenario homotopy classes actually exist to catch is different and harder to probe
cheaply: two paths sharing *most* of their edges, differing only in which side they pass a shared
obstacle on — a case where `featureDistance` would likely read as *low* (mostly-matching edge
sets) while the paths are topologically distinct. Testing that needs an actual winding/homotopy
computation (obstacle-relative signed crossing counts, roughly per Bhattacharya et al.'s complex-
plane encoding), not a set-overlap proxy — a real implementation task, not a cheap data probe.
**Left open**, not dropped: the premise wasn't refuted, the test just wasn't sharp enough to
refute or confirm it.

### 5. State dominance / transposition pruning — flagged as *not* worth pursuing soon
No cross-state dedup exists beyond lower-bound memoization (which memoizes a *bound computation*,
not a *search decision*). Doc 2's own assessment is right that soundness here is "nontrivial to
implement and verify" given portals, flippers, and must-turn axis-state all needing to enter the
dominance test correctly — exactly the failure-mode class CLAUDE.md already spent a real debugging
cycle on. Revisit only if a much stronger case emerges (e.g. profiling shows repeated re-exploration
of provably-dominated states costing real search time on the current corpus).

## Suggested order, if any of this gets picked up

1. **Near-term, cheap, high-confidence:** the learned portfolio selector (reuses existing
   feature/challenge-model code) is now the strongest ready-to-build item. Articulation-point
   pruning against the *distance-vs-discrepancy* hypothesis was tested and refuted (see item #1
   above) — its redirected form (corridor-capacity bound on `reqInt`) still needs its own premise
   test before implementation, same discipline as before.
2. **Mid-term, real payoff, needs care:** offline nogood mining from the benchmark corpora,
   validated on a held-out slice before it ever goes live in search.
3. **Exploratory:** homotopy-class path signatures as a new solution-profile axis — narrow scope,
   drop it if it doesn't add distinguishing power. Corridor-capacity intersection bound (the
   articulation-point redirect above) belongs here too until its own premise test runs.
4. **Not now:** state-dominance/transposition caching — correctness risk too high relative to
   current payoff evidence.

## Where solution-space fingerprinting fits

Doc 3's entire theme — what known solutions reveal, and how to avoid fooling yourself about it —
is what `scripts/stress/solution-profile-lib.mjs` already operationalizes: provenance-source
bucketing (so a pattern recurring across witness/production-solver/randomized-enumeration sources
reads as level-*forced* rather than a search-technique artifact — directly answering doc 3's
"statistical vs. causal" caution), the `discoverySaturation` heuristic vs. `provablyExhaustive`
distinction (directly answering its "candidate invariant vs. proven invariant" caution), and
`mustCrossOrder.rigid` (a mined-and-validated necessary-condition candidate, already computed per
level). If any pruning idea above gets prototyped, route its offline mining/validation through this
existing fingerprint corpus rather than building new analysis plumbing from scratch.
