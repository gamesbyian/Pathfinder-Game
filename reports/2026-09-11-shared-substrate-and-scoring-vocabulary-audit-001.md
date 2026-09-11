# Shared-substrate and scoring-vocabulary audit

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — corrected 671-level witness-only scorer-vocabulary run 34559477019 and class-4/class-5 join
> **Decision:** close the broad DFS/pre-apply scorer-vocabulary form as a class-5 frontier discriminator: weight-invariant ambiguity exists but is not enriched in class 5. Keep first-loss/residual-feasibility work primary; do not buy scorer-term tuning or an exact-label campaign from this result. The other shared-substrate hypotheses remain routed to their existing workstreams rather than active gates in this report.
> **Remaining gate:** none for the tested broad scorer-vocabulary form; reopen only if independent first-loss evidence nominates evaluator/rank loss or an independently exact-labelled live/dead pair under this evaluator convention becomes decision-bearing
> **Evidence role:** forensic
> **Selection:** observational; the hypotheses and candidate diagnostics were chosen after inspecting current frontier evidence and historical repo experiments. The witness-only source, class-4/class-5 contrast and primary readouts were fixed before the valid population run; the corrected run changed only an input-envelope defect found by the first attempt.
> **Production behavior:** unchanged
> **Compute:** no new broad solve, census, variant, solution-count, or exact-reference campaign

## Question

The current frontier program asks whether operationally distinct actions lose known-live material for the same future-feasibility reason. This audit asks the broader question:

> What weaknesses could remain common to many or all named techniques even when their search policies differ?

The useful boundary is between **driver-level weakness** (DFS/beam/repair policy, profile, width, retry, scheduler) and **common-substrate weakness** (shared mechanics/state/derived data/pruning/evaluation/search language). A portfolio can be diverse at the driver layer while still sharing a blind spot underneath it.

## What the audit rules out as an obvious next experiment

### Generic partial-state legality fuzzing

Substantially existing. `scripts/solver-oracle/fuzz.mjs` already compares an independent reference oracle, production solver move/state logic, live-domain `isValidMove`, and final referee/runtime arbiters. It checks full legal-move sets during bounded random walks, not only final solutions. Its history includes bugs caught specifically because the comparison had independent arms.

**Disposition:** do not build a second generic semantic fuzzer. Extend the existing harness only for a concrete unsupported mechanic/state seam.

### Generic exact-prefix rescue

Substantially existing for repair. The repair reachability/reconstructability program handed CP-SAT-confirmed live prefixes directly to native completion machinery. Across the completed recurrence sample, **22/28 (78.6%)** exact-live cases were operator-incapable under the tested deterministic completion operator; only 6/28 were reconstructable, with heavy-tailed reconstruction cost. Randomized rollout variants were also tested.

**Disposition:** any future oracle-information experiment must ask a new question, such as cross-family completion from the same live state or abstract strategic information versus an exact cell prefix. Do not merely expose longer correct prefixes to the same operator.

### Generic move-ordering diagnosis

Substantially existing. Witness-rank/divergence tooling already measures rank distributions, cumulative discrepancy, worst-ranked live steps, profile comparisons and score-term ablations. The controlled July comparison found unsolved witnesses were not generally ranked worse than solved controls.

**Disposition:** a new observability metric is justified only if first-loss evidence points to rank/retention. The genuinely different quantity would be the **consecutive duration until a poorly ranked live lineage becomes locally visible again**, not another aggregate rank statistic.

### Broad solution-density counting

Tried and closed in its obvious form. `scripts/stress/cpsat-solution-count-probe.py` enumerates a relaxed core model and was retained specifically to record that even relaxed solution counting was intractable.

**Disposition:** do not run another broad solution-count campaign. A prefix-local live-child fraction can still be useful on a tiny mechanism-selected cohort.

## What remains a credible common-mode surface

| Shared surface | Reach | Residual question |
|---|---|---|
| normalization / `prepLevel` distances, approach maps and topology | most native search families | can a wrong-but-legal derived fact systematically mis-rank or falsely prune? |
| search-state summaries/masks | DFS/beam/admissible/repair | are the summaries sufficient for every downstream inference even when transitions are legal? |
| hard prune / lower bounds / connectivity | DFS/beam/admissible and substantial repair overlap | do distinct actions reject known-live states for the same derived reason? |
| weighted `scoreMove` vocabulary | fields reused across multiple actions, but with different calling conventions | can the weighted evaluator express the viability-relevant distinction at all? |
| path-first decision representation | all native search families | are important strategic variables only observable after many cell decisions? |
| finite-retention/state-equivalence abstractions | beam and related retention mechanisms | does the same omitted future-relevant distinction recur outside one beam-specific mechanism? |

The current all-known-basin first-loss work remains the strongest gate for shared prune/future-feasibility claims.

## Technique diversity is shallower than solve-set diversity

Many named techniques are configurations of shared engines. Repair is the strongest genuinely different production paradigm, yet it still reuses substantial move/state/prune/scoring machinery. Therefore “many technique names fail” is not enough evidence for intrinsic puzzle hardness or one shared capability gap.

A shared-gap claim must identify which substrate is actually independent across the compared actions. Nearby beam widths or score profiles are not independent confirmation merely because their outcomes differ.

## Existing exact evidence left one scorer question open

The August winning-lineage work established selected cases where beam scoring preferred a CP-SAT-proven dead future over a live alternative at the same retention boundary. Later descriptor work falsified several simple scalar progress/resource explanations.

That proved **mis-ranking**, but initially left three explanations:

1. the needed signal was already in the current weighted vocabulary and the weights combined it badly;
2. the current weighted terms could not distinguish the alternatives although richer raw state could;
3. even raw state lacked a derived future-opportunity fact needed to distinguish them.

Profile/weight racing explores only (1). The scorer-basis diagnostic was added to test a proof-grade subset of (2) without launching a tuning sweep.

## Diagnostic: exact scorer-basis decomposition

Files:

- `scripts/stress/scoring-vocabulary-lib.mjs`
- `scripts/stress/witness-scoring-vocabulary-diagnostic.mjs`
- `scripts/stress/analyze-scoring-vocabulary-frontier.mjs`
- unit, integration and one-level bundled CLI smoke tests

The current weighted vocabulary has twelve fields:

- goal attraction;
- objective attraction;
- finish commitment;
- perimeter bias;
- must-pass urgency;
- must-cross urgency;
- must-turn urgency;
- must-turn exit guidance;
- portal-parity guidance;
- intersection setup;
- anti-dither;
- revisit penalty.

At each branching known-live prefix, the diagnostic evaluates the same legal sibling set under:

- one true-zero profile;
- twelve one-hot profiles;
- one requested real profile used only for reconstruction validation.

For candidate `c`, if `s0(c)` is the zero-profile score and `si(c)` the one-hot score for term `i`, define:

`fi(c) = si(c) - s0(c)`.

The real profile must reconstruct as:

`score(c) = s0(c) + Σ wi fi(c)`.

Basis scoring calls `scoreMove` directly to keep work linear in profile count. A single-policy `scoreAndSort` research observer records the actual active-profile scores so a broken/incomplete decomposition fails loudly before any weight-invariance result is interpreted.

The zero-profile intercept is meaningful rather than merely algebraic. `scoreMove` has profile-independent contributions, including fixed flipping-filter approach urgency. Those terms remain in `s0(c)` while all twelve tunable weights are zero.

## Scope boundary: DFS/pre-apply evaluator

The replay matches the **pre-apply `scoreAndSort` calling convention used by DFS ordering**. The same weight vocabulary appears elsewhere, but beam/repair also score under post-apply state conventions in important paths; repair deliberately preserves a different MustCross-axis scoring path as well.

Therefore a weight-invariant result proves only:

> under the replayed pre-apply evaluator convention, retuning the current twelve profile weights cannot change the reported pairwise score relationship at that state.

It does **not** by itself prove that repair or every beam path is equally unable to distinguish the candidates. Cross-action recurrence remains required before promoting a result to a shared evaluator defect.

## Strong local categories

For known-valid child `a` and another legal child `b`, compare the twelve tunable basis components separately from the zero-profile intercept.

If all twelve tunable components match, their score difference under any reweighting is fixed at:

`margin(a,b) = s0(a) - s0(b)`.

That yields two local categories:

- **weight-invariant tie:** all twelve components match and the intercepts match. No profile-weight retuning can distinguish the candidates.
- **weight-invariant alternative preference:** all twelve components match and `s0(b) > s0(a)`. No profile-weight retuning can stop the current fixed/non-tunable contribution from preferring `b` over known-live `a` at that state.

The second category is stronger than a tie for deciding whether more profile tuning is worthwhile. It is not automatically a correctness or capability defect because `b` remains `reference-abstain` unless independently labelled dead.

Structural ordering bias is intentionally held outside this test.

## Population result: negative as a frontier discriminator

The corrected witness-only run `34559477019` scored the full **671/671** frozen Corpus-2 production misses with:

- 73,059 witness decisions visited;
- 42,914 branching decisions;
- **0** known continuations absent from legal siblings;
- **0** affine reconstruction failures;
- maximum reconstruction error `1.1368683772161603e-13`.

The preferred class-4 near-control and class-5 frontier comparison did not support enrichment:

| Readout | Class 4 | Class 5 | Class 5 - class 4 |
|---|---:|---:|---:|
| levels with exact weight-vocabulary collision | 163/200 = **81.50%** | 299/388 = **77.06%** | **-4.44 pp** |
| collision decisions / branching decisions | 605/12,893 = **4.692%** | 883/24,728 = **3.571%** | **-1.122 pp** |
| levels with fixed alternative preference | 18/200 = **9.00%** | 36/388 = **9.28%** | **+0.278 pp** |
| fixed-preference decisions / branching decisions | 37/12,893 = **0.2870%** | 65/24,728 = **0.2629%** | **-0.0241 pp** |

Exact scorer ambiguity is actually more common in class 4, while fixed alternative preference is essentially flat. The broad proposition that the twelve-weight evaluator vocabulary distinguishes the no-known-rescuer frontier is therefore closed negative.

See [`2026-09-11-scorer-vocabulary-frontier-witness-only-001.md`](2026-09-11-scorer-vocabulary-frontier-witness-only-001.md) for the full population contract, execution history, and the benchmark-report input-schema defect found during the run.

## Interpretation after the run

1. The basis reconstructed cleanly, so the negative contrast is interpretable.
2. Weight-invariant ambiguity is a real general property of the evaluator/search landscape, not a class-5 signature.
3. Do not add or tune scorer terms from this population result.
4. Do not buy a new exact live/dead sibling-label campaign solely because many ties/preferences exist.
5. Reuse the tooling only if independent first-loss evidence later nominates evaluator/rank loss on a smaller mechanism-selected cohort.
6. A future exact live/dead weight-invariant pair can still establish a **local** evaluator limitation; it would not retroactively make the broad class-5 discriminator positive.

## Intrinsic-hardness hypothesis is not currently leading

The July CP-SAT core comparison solved a matched five-level sample of native failures at a reported median around 23 seconds while Pathfinder still failed those levels at 20M and 100M nodes. The model was a **relaxation**, so this is not proof that the full Pathfinder instances were easy. It is nevertheless evidence against assuming the frontier is simply an unavoidable complexity wall.

The maintained full reference model has since grown to support exact length/intersections, MustPass/MustCross, landmark state, portals, flipping filters and explicit prefixes, with a documented validation matrix; static regular filters remain deliberately unsupported. Its role remains bounded adjudication, not whole-corpus competition.

**Disposition:** if intrinsic hardness later becomes decision-bearing, use a mechanism-selected controlled scaling or bounded cross-representation comparison. Do not launch generic exact-solver competition or broad counting first.

## Other deeper-gap hypotheses after reconciliation

### Prune-soundness / first-loss differential

**Active through current frontier work.** Known-prefix survival, prune-gap, exact-prefix and first-loss infrastructure already exists. Cross-action recurrence on class 5 is the missing gate.

### Heuristic observability latency

**Partly existing; defer until rank/retention is nominated.** Existing divergence tools already capture aggregate discrepancy. Add consecutive invisibility duration only if it changes a live first-loss decision.

### Continuation density / solution funnels

**Broad counting closed; prefix-local version conditional.** On a selected prefix cohort, exact-live-child fraction is a legitimate different question. Do not buy it without a mechanism nomination.

### Minimum oracle information to competence

**Partly answered for repair; redefine before running.** Compare information types or operationally distinct completion families, not longer exact prefixes to the same repair operator.

### Search-language / strategic abstraction

**Still genuinely open but not yet earned as a framework project.** If exact-live states remain unreconstructable across operationally distinct native families, or scorer/first-loss evidence repeatedly points to long-horizon strategic commitments, then compare compact abstract information such as constraint order, portal order, bottleneck reservation or coarse checkpoints against exact-prefix information. Start as an oracle-information diagnostic, not a new production planner.

## Queue impact

No priority inversion is justified.

The class-4/class-5 all-known-basin first-loss and residual-feasibility work remains the stronger near-term shared-capability test. The scorer-vocabulary arm now leaves that funnel rather than running beside it as an active population gate.

Route later evidence by mechanism:

- false hard rejection -> correctness / WS2 reasoning;
- exact weight-invariant live/dead evaluator result -> evaluator/derived-feature diagnosis, initially action-local;
- rank/retention loss without weight invariance -> WS4;
- repair-specific reachability -> WS6;
- cross-action residual-feasibility recurrence -> shared WS2 capability candidate;
- heterogeneous mechanisms -> weaken the single-deep-gap hypothesis and subdivide class 5.
