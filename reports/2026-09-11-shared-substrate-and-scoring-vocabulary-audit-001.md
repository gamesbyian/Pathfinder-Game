# Shared-substrate and scoring-vocabulary audit

> **Status:** active
> **Last evidence:** 2026-09-11 — static shared-substrate audit, historical evidence reconciliation, and scorer-basis tooling added on PR #1718; population execution is still pending
> **Decision:** keep the class-4/class-5 first-loss and joint-feasibility program primary; run the scorer-vocabulary probe only as cheap supporting evidence, and do not reopen already-answered legality fuzzing, generic prefix rescue, broad solution counting, or generic rank diagnosis
> **Remaining gate:** pass CI, then run the bounded scorer-basis diagnostic and class-4/class-5 join; escalate only if reconstruction is exact and weight-invariant ties/preferences are frontier-enriched or independently exact-labelled live/dead
> **Evidence role:** forensic
> **Selection:** observational; the hypotheses and candidate diagnostics were chosen after inspecting current frontier evidence and historical repo experiments, before any new population run
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

## Existing exact evidence leaves one scorer question open

The August winning-lineage work established selected cases where beam scoring preferred a CP-SAT-proven dead future over a live alternative at the same retention boundary. Later descriptor work falsified several simple scalar progress/resource explanations.

That proves **mis-ranking**, but it leaves three explanations:

1. the needed signal is already in the current weighted vocabulary and the weights combine it badly;
2. the current weighted terms cannot distinguish the alternatives although richer raw state can;
3. even raw state lacks a derived future-opportunity fact needed to distinguish them.

Profile/weight racing explores only (1).

## New diagnostic: exact scorer-basis decomposition

New files:

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

## Scope boundary: this is a DFS/pre-apply evaluator test first

The replay matches the **pre-apply `scoreAndSort` calling convention used by DFS ordering**. The same weight vocabulary appears elsewhere, but beam/repair also score under post-apply state conventions in important paths; repair deliberately preserves a different MustCross-axis scoring path as well.

Therefore a weight-invariant result from this tool proves only:

> under the replayed pre-apply evaluator convention, retuning the current twelve profile weights cannot change the pairwise score relationship reported for those candidates at that state.

It does **not** by itself prove that repair or every beam path is equally unable to distinguish them. Cross-action recurrence still has to be demonstrated before promoting the result to a shared evaluator defect.

## Strong local results

For known-valid child `a` and another legal child `b`, compare the twelve tunable basis components separately from the zero-profile intercept.

If all twelve tunable components match, their score difference under any reweighting is fixed at:

`margin(a,b) = s0(a) - s0(b)`.

That yields two proof-grade local categories:

- **weight-invariant tie:** all twelve components match and the intercepts match. No profile-weight retuning can distinguish the candidates.
- **weight-invariant alternative preference:** all twelve components match and `s0(b) > s0(a)`. No profile-weight retuning can stop the current fixed/non-tunable contribution from preferring `b` over the known-live `a` at that state.

The second category is stronger than a tie for deciding whether more profile tuning is worthwhile. It is not automatically a correctness or capability defect because `b` remains `reference-abstain` unless independently labelled dead.

The strongest follow-up is therefore a weight-invariant pair independently labelled **live versus dead** by the maintained reference model. A fixed alternative preference toward an exact-dead sibling would prove that the replayed evaluator contains a viability-relevant distinction that the twelve tunable weights cannot repair.

Structural ordering bias is intentionally held outside the first test. If weight-invariant cases recur, first ask whether existing ordering-bias features already split them before inventing another descriptor.

## Frontier join

`analyze-scoring-vocabulary-frontier.mjs` joins completed diagnostic rows to the post-1,029 residual atlas by level id. It reports for class 4 and class 5:

- atlas population and diagnostic coverage;
- levels/decisions with exact weight-invariant ties;
- levels/decisions with any weight-invariant pair;
- levels/decisions where the fixed intercept prefers the non-known sibling;
- pair counts and descriptive class-5 minus class-4 rate differences.

Level and decision rates are both retained because decisions within a level are correlated. The join is descriptive, not a significance test, and it exposes coverage denominators because stored-solution coverage can differ by class.

Example:

```bash
node scripts/run-bundled.mjs scripts/stress/witness-scoring-vocabulary-diagnostic.mjs -- \
  --corpus=corpus2 \
  --unsolved-only \
  --report=<current-production-report.json> \
  --out=tmp/witness-scoring-vocabulary-unsolved.json

node scripts/stress/analyze-scoring-vocabulary-frontier.mjs \
  --diagnostic=tmp/witness-scoring-vocabulary-unsolved.json \
  --atlas=reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json \
  --out=tmp/witness-scoring-vocabulary-frontier.json
```

## Interpretation gate

1. **Any material reconstruction failure:** stop; the basis/tooling is incomplete or wrong.
2. **No/rare weight-invariant cases and no class-5 enrichment:** current weighted vocabulary is not disproved. Continue first-loss/future-feasibility work; profile weights may still be poor.
3. **Weight-invariant cases occur similarly in class 4:** evaluator ambiguity/fixed preference exists but is weak frontier-gap evidence.
4. **Class-5-enriched weight-invariant ties or fixed alternative preferences:** nominate the smallest independent-parent exact-prefix label sample.
5. **Exact live/dead weight-invariant pair:** evaluator-vocabulary limitation established locally. A fixed preference toward the dead sibling is especially strong evidence against further weight tuning for that state. Find the smallest cheap raw/derived distinction separating the pair before adding a term.
6. **The same missing distinction recurs across independent parents and operationally distinct actions:** escalate to shared-capability evidence.

Do not respond to a weight-invariant case by immediately adding another hand-authored scoring term.

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

The class-4/class-5 joint-obligation and all-known-basin first-loss work remains the strongest near-term shared-future-feasibility test. The scorer-vocabulary probe is cheap supporting evidence that can run alongside it and can prevent needless profile/weight experimentation.

Route later results by mechanism:

- false hard rejection -> correctness / WS2 reasoning;
- exact weight-invariant live/dead evaluator result -> evaluator/derived-feature diagnosis, initially action-local;
- rank/retention loss without weight invariance -> WS4;
- repair-specific reachability -> WS6;
- cross-action residual-feasibility recurrence -> shared WS2 capability candidate;
- heterogeneous mechanisms -> weaken the single-deep-gap hypothesis and subdivide class 5.
