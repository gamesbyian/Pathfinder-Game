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

### 1. Graph-separator / articulation-point pruning
Both docs flag this as a cheap, sound, incremental win. We only have flood-fill reachability
(`modules/solver/topology.ts`'s `isConnected`) — no Tarjan cut-vertex detection to catch "this
must-pass cluster sits behind a single-cell chokepoint, so remaining length must exceed X."

Cheap to add (reuses the existing BFS scaffolding), and — this is the leverage point — testable
*before writing any pruning code* against data we already have: `reports/stress/witness-divergence-*.json`
already flags exactly the levels where the witness repeatedly took a locally-"worse" move than
greedy scoring would pick (high `cumulativeDiscrepancy`). That is precisely the signature an
articulation-point bottleneck would produce. Cross-referencing the two tells us in an afternoon
whether the idea is worth building, before committing to it.

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

### 3. Learned portfolio selection, done properly
The highest-leverage near-term item, because every piece of the pipeline already exists for an
unrelated reason. Extend the existing ridge-regression challenge model from "predict difficulty"
to "predict which `ATTEMPT_CONFIGS` profile wins" — a classification/ranking task over the same
feature vectors `features.mjs`'s `levelFeatures` already computes. Training data: every
`benchmark.mjs` run's `winningStrategy` field (fresh for corpus-1 now, corpus-2 soon). This is a
small, well-scoped experiment reusing existing code, not a new subsystem — feature extraction,
historical-outcome logging, and even the regression-fitting code are all already written.

### 4. Homotopy / topological path-class signatures
Genuinely new to us (doc 3, via Bhattacharya et al.). Our closest analogs are `portalSignature`'s
directed-jump-set (a coarse topological invariant, but only for portal usage) and the solution-profile
tool's `normalizedFootprint` — neither captures "which side of an obstacle cluster did this path
take" the way a true homotopy-class encoding would. Worth a narrow experiment scoped to must-cross-heavy
levels specifically (where path topology around obligations matters most): compute a cheap
homotopy-class proxy and check whether it partitions the existing hint corpus into behaviorally
distinct clusters that the current `featureDistance` metric (edge-Jaccard + crossing-placement +
must-cross order) misses. If it doesn't add a distinguishable axis, drop it.

### 5. State dominance / transposition pruning — flagged as *not* worth pursuing soon
No cross-state dedup exists beyond lower-bound memoization (which memoizes a *bound computation*,
not a *search decision*). Doc 2's own assessment is right that soundness here is "nontrivial to
implement and verify" given portals, flippers, and must-turn axis-state all needing to enter the
dominance test correctly — exactly the failure-mode class CLAUDE.md already spent a real debugging
cycle on. Revisit only if a much stronger case emerges (e.g. profiling shows repeated re-exploration
of provably-dominated states costing real search time on the current corpus).

## Suggested order, if any of this gets picked up

1. **Near-term, cheap, high-confidence:** articulation-point pruning experiment (a few hours, sound,
   testable against existing witness-divergence data before implementation) + the learned portfolio
   selector (reuses existing feature/challenge-model code).
2. **Mid-term, real payoff, needs care:** offline nogood mining from the benchmark corpora,
   validated on a held-out slice before it ever goes live in search.
3. **Exploratory:** homotopy-class path signatures as a new solution-profile axis — narrow scope,
   drop it if it doesn't add distinguishing power.
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
