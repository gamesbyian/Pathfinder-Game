# Solver improvement research notes

> **Status: historical research ledger, reconciled through 2026-08-09.** Four of the five original
> items were probed against real data in the 2026-07-11 pass. Later work has since implemented one
> of them in a narrower sound form (repair-scoped nogood caching) and closed the learned repair-winner
> classifier after the larger Corpus-2 rerun. This is still a research-inspiration doc, not the live
> queue: use [`future-work.md`](future-work.md) for current priorities. The original experiments and
> reasoning are retained below, with later status blocks where subsequent work superseded an old
> “next step.”

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
| Portfolio/algorithm selection by instance features (SUNNY/SATzilla-style) | `modules/solver/attempts.ts`'s `getAttemptConfigs`, gated on `archetype.ts`'s `detectArchetype`/`getNavigableDensity` | The *architecture* (declarative, feature-keyed attempt ladder) exists; the *classifier* is hand-tuned rather than learned — see gap #3 below and its 2026-08-07 closure. |
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

### 2. Nogood / dead-end learning — original global key refuted; narrower sound form shipped 2026-08-07

> **Later status:** the original three-field global key remains provably unsound and the experiment
> below remains the reason not to build it. Subsequent repair-search work found a much stronger
> within-call exact dead-state repetition signal (53.65–98.09% on seven repair-close levels) and
> implemented a deliberately narrower solution: `modules/solver/nogood-cache.ts`, using a freshly
> computed exact state signature rather than an incremental/under-keyed hash. It shipped default-on
> as `STRATEGY_REPAIR_NOGOOD_CACHE`. A 20-level A/B was 5/20 vs 4/20, zero regressions, with
> 13.7–40.9% node reductions on every level solved by either arm; a later full Corpus-2 refresh at
> the current 36M-node budget produced a byte-identical solved-ID set. So there is **no remaining
> “design and build a nogood cache” task** here. The historical global-key result below is retained
> as the soundness lesson and as evidence against broadening the cache without a proof-quality key.

Doc 2's top "high-impact if it works, moderate risk of bug" pick. The correctness bar is real —
CLAUDE.md's own MST-scratch-buffer bug (`docs/solver-architecture.md`'s "History: the MST bound
scratch buffer bug") is a direct instance of the exact caution doc 2 raises: *"learned nogoods must
be sound regardless of solution length, not episodic."* Don't underestimate that bar.

The original mining idea used `benchmark.mjs`'s `failedStrategies` + `attempts[].finalBadness`
and proposed recurring `(mpVisitedMask, mustCrossMask, remaining length)` contexts. The direct probe
below was deliberately run before any production implementation.

**Probed directly (2026-07-11) via a budget-capped exploratory search, not just corpus data —
and found a real counterexample confirming the correctness risk is immediate, not theoretical.**
Ran a beam-3, 8000-node DFS per level using the solver's own exported search-core primitives
(`SOLVER_TESTING_API` — the same surface `witness-divergence.mjs` already uses; no solver source
touched, own state cloning for backtrack instead of any internal undo). For each dead end,
recorded the naive candidate nogood signature `(mpVisitedMask, mustCrossMask, remaining length)`;
for each state whose subtree contained a solution, marked that same signature as "saw a success."

- **On 5 of 6 sampled levels the probe's crude search found zero solutions at all** — these are
  levels the real solver only cracks via `repair`/diverse-beam/specific templates, well beyond
  what a plain beam-3 walk reaches in budget. Their large recurring-signature counts (one signature
  on `S00114` recurred **2,817 times across 27 distinct positions**) are suggestive of a genuine
  repeated-failure pattern, but **cannot be called safe or unsafe from this data — the search never
  got the chance to find a counterexample.** Don't read "0 unsafe" on these as a soundness result.
- **On the one level that solved quickly (`S00133`, 21 nodes), 2 of its 10 observed signatures were
  directly unsafe**: the exact same `(mpVisitedMask, mustCrossMask, remaining)` triple appeared as
  a dead end on one branch and as part of a successful path on another. A naive position-independent
  cache on this signature alone would have wrongly pruned a real solution — a concrete instance of
  doc 2's own caution, found in this codebase's actual state space on the very first try.

**Historical conclusion, still valid for this key:** the plain 3-field signature is not sound as a
global nogood key. Any broader future implementation needs a richer signature capturing every
future-relevant state variable, or a proof that its scope is conservative. The repair-scoped cache
that later shipped satisfies that requirement by using exact state identity rather than attempting
to rehabilitate this three-field approximation.

### 3. Learned portfolio selection — probed 2026-07-11; larger rerun closed it 2026-08-07
The original near-term idea was to extend the existing ridge-regression challenge model from
"predict difficulty" to "predict which `ATTEMPT_CONFIGS` profile wins". The architecture and data
made that cheap to test, but the later Corpus-2 rerun closed the classifier path.

**Initial Corpus-1 probe (85 solved levels).** Two findings, one actionable without learning and one
a genuine negative result:

- **79.2% of total solve time on solved levels was spent on attempts BEFORE the actual winner**
  (516.6s of 652.0s). Per archetype, `must-cross-heavy` and `high-intersection-burden` wasted
  75–86% of their time this way and had 5–8 distinct winning profiles within the same archetype
  bucket. This remains useful evidence that attempt ordering can waste substantial work.
- A naive leave-one-out 1-NN classifier scored 30.6% winning-profile accuracy, worse than the
  current archetype's dominant-winner baseline (35.3%). The binary “will repair win?” reframing
  looked more promising on the small sample: `navDensity <= 0.524` reached F1 0.500, but with only
  10 repair winners it was explicitly left pending a larger dataset.

**Corpus-2 rerun (2026-08-07) closes the data-volume gate: drop the classifier.** On 725 solved
levels with 188 repair winners, the historical `navDensity <= 0.524` rule collapses to F1 0.010
(1/188 repair winners caught). Deterministic five-fold threshold cross-validation finds
`mustCross >= 2` as the best single feature (F1 0.471), only modestly above the always-repair
prevalence baseline (F1 0.412), with 237 false positives and a direct policy-confounding problem:
must-cross burden already helps decide whether repair is attempted. Do not build ML or promote repair
from this rule. The separate attempt-ordering-cost observation remains valid and should be tested by
direct A/B, not prediction. Full report:
[`reports/2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md).

### 4. Homotopy / topological path-class signatures — confirmed real (2026-07-11), second probe
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

**Second probe, the real computation this time.** Implemented actual winding numbers (Sunday's
algorithm — correct even for self-intersecting loops) of the closed loop `pathA + reverse(pathB)`
around each connected obstacle cluster's centroid (4-adjacency flood fill over blocks + impassable
landmarks): winding number 0 around every obstacle means the two paths are genuinely homotopic.
Ran against the published corpus's must-cross-heavy levels with obstacles present (19 qualifying
levels). **Result: a real, positive finding.**

- **12 of 19 levels have more than one distinct homotopy class among their saved hints** —
  e.g. one level's 50 hints span 20 distinct classes, another's 48 hints span 14. Real solutions
  genuinely do take topologically different routes around obstacle clusters, not just
  geometrically different ones.
- **Of 5,659 hint pairs that fall into *different* homotopy classes, 939 (16.6%) are still rated
  "similar" by the current `featureDistance` metric** (below 0.65, the exact threshold
  `hint-selection.ts`'s curation uses to decide two paths are "genuinely different"). That's the
  real blind spot the first (mis-designed) probe was looking for and couldn't find: the curation
  system's farthest-point selection can end up treating two topologically distinct solutions as
  redundant roughly one time in six, on levels where this axis applies.

Caveat worth stating plainly: obstacle centroids are an approximation of "a point inside the hole,"
not a rigorous interior-point computation — fine for the common roughly-convex block clusters in
this corpus, but could misplace the puncture point for a highly concave obstacle shape. Worth
spot-checking a few of the flagged levels by eye before trusting the exact numbers, but the
overall signal (double-digit-percent blind spot on a filtered, real subset of the corpus) is
unlikely to be an artifact of that alone. **This is now the strongest-evidence still-open item in
this research ledger** — real effect, real size, on real data, using a correct computation of the
thing doc 3 actually proposed.

### 5. State dominance / transposition pruning — flagged as *not* worth pursuing soon
No cross-state dedup exists beyond lower-bound memoization (which memoizes a *bound computation*,
not a *search decision*). Doc 2's own assessment is right that soundness here is "nontrivial to
implement and verify" given portals, flippers, and must-turn axis-state all needing to enter the
dominance test correctly — exactly the failure-mode class CLAUDE.md already spent a real debugging
cycle on. Later direct DFS measurement strengthened the economic case against it: the crude
signature's apparent 92–99% duplication collapsed to 0.5–16%, typically ~1–2%, under an actually
sound signature, with substantial signature-computation overhead. Do not revive this as fresh work
without materially new evidence.

## Suggested order, reconciled 2026-08-09

This section supersedes the original 2026-07-11 ranking. Current live priority still belongs in
`future-work.md`; this is only the status ordering of the five research ideas in this document.

1. **Still-open strongest evidence: homotopy-class curation axis (item #4).** Real, measured,
   double-digit-percent effect on real data (16.6% of cross-homotopy-class hint pairs rated
   "similar" by current curation). This remains the clearest unclosed item here.
2. **Implemented, no build task: nogood learning (item #2).** The naive global key is unsound;
   the viable repair-scoped exact-state cache has shipped default-on. Only revisit with evidence
   for a broader or cheaper sound form.
3. **Closed: learned portfolio classifier (item #3).** The larger Corpus-2 rerun refuted the
   historical density rule and did not produce a sufficiently useful replacement. Keep the
   separate attempt-ordering-cost finding, but test ordering directly rather than rebuilding the
   classifier.
4. **Refuted, redirected: articulation-point pruning (item #1).** The original
   distance-vs-discrepancy premise is dead. The redirected corridor-capacity form remains a
   different hypothesis and must be re-probed before implementation.
5. **Deprioritized: state-dominance/transposition caching (item #5).** Sound duplicates are too
   sparse and expensive to identify for the measured payoff.

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

## Using this to attack corpus-2 (the combined workflow)

The pieces above are each documented on their own terms; this section is the connective tissue —
what to actually reach for, in what order, when the goal is pushing corpus-2's solve rate up
rather than reading about any one tool in isolation.

1. **Triage a stuck level.** `npx tsx scripts/stress/solution-profile-compare.mjs
   --target-level=<n>` (see [`solution-profile.md`](solution-profile.md)) profiles the level from
   its witness (or mined hints, if any) and returns its nearest known-solvable neighbors by
   solution *behavior*, with a per-axis breakdown of what differs most.
2. **Don't trust a neighbor's structural facts at face value — check provenance.** The `combined`
   bucket alone can't tell you whether a neighbor's rigid must-cross order (say) is a real level
   constraint or a search-technique artifact. Re-run with `--bucket=<source>` per source
   (`witness`, `production-solver`, `randomized-enumeration`, ...) — a fact that holds up
   independently across multiple sources is real evidence to act on; a fact that only shows up in
   one source might just be that technique's bias. This is the "statistical vs. causal" distinction
   the section above exists to operationalize.
3. **Turn a provenance-corroborated fact into an attempt-config bias**, e.g. try attempt profiles
   that respect a corroborated must-cross order first, rather than the default ladder order — a
   per-level, manual application of the attempt-ordering question without pretending the closed
   learned classifier solved it.
4. **If the level has no mined hints yet**, `hint-corpus-expand.mjs`'s prefix-anchored completion
   (System B) can bootstrap from a partial known-good path — including, after this session's
   `human-solved` addition, a path a human found manually — rather than starting blind search over.
5. **For ladder-level changes, use direct evidence rather than the closed classifier.** The old
   “rerun repair-needed prediction once Corpus-2 lands” step is complete and negative. Current
   ordering work should use attempt telemetry, known winning configurations, starvation/cutoff
   evidence, and direct matched-budget A/Bs. `future-work.md` is the source of truth for whichever
   ordering or allocation question remains open.
6. **Don't spend more mining budget on a level that's already maximally explored.** Check
   `provablyExhaustive` (from `search.termination === 'exhaustive'`) before investing in a deeper
   pass — a plateaued-but-not-exhaustive level is a better target for a dedicated
   complete-enumeration run than one already proven complete.
