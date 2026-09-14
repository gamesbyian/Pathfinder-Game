# Symmetry orientation sensitivity: current synthesis and next steps

> **Status:** concluded-positive
> **Last evidence:** 2026-09-14 — historical claim-lineage audit narrowed perturbation robustness from causal hardness to a descriptive response phenotype
> **Decision:** treat a symmetry rescue as evidence of representation-dependent finite search; diagnose ranked solve-status cliffs before considering an orientation-retry tier, and prefer bounded search diversity over a global score retune. Treat `fragile` / `robust` as tested perturbation-response labels, not latent-cause classifications.
> **Remaining gate:** run the existing family-boundary tooling on the wide trove only if a current mechanism question earns it; otherwise use the current representation-sensitivity lineage-survival gate

## Question and answer

A whole-level rotation or reflection does not make the abstract puzzle easier. The transform is
invertible, and the generator transforms directional mechanics and the known witness with the
level. When one orientation solves and another does not at the operating budget, the difference is
therefore in the solver's finite search, not the valid solution set.

The solver is intentionally heuristic rather than exhaustive. Coordinate-sensitive attraction and
structural-template scores alter the early trajectory; neighbor enumeration and stable ties alter
which equally scored candidate is seen first; beam truncation permanently removes candidates; DFS
and repair then spend a finite budget below the surviving choices. A small early ordering difference
can consequently become a solve/non-solve cliff on a low-slack level. "Unsolved" in these reports
means that this policy did not find a solution within the stated work/time budget, not that the
level lacks a solution.

## Reconciled evidence

### What was stale

The first symmetry report's apparent general variant-1 tilt was produced while repair's elite-splice
near-miss pool was silently inactive. After that bug was fixed and all 38 families were rerun,
variant 1 failed in 6/16 mixed families, indistinguishable from chance. Three of four core
published repair-gated families also lost their orientation-dependent repair failure. The original
direction-index story is historical evidence about the broken solver, not a current mechanism.

The original R02248 report also ended with an `n=1` caveat. That caveat was subsequently resolved:
R01465 reproduced the same high-level signature—single-digit beam-frontier exhaustion plus repair
plateaus across seeds—but not the same ablation. R02248 unlocked when
`SCORE_INTERSECTION_SETUP` was disabled; R01465 unlocked when `SCORE_SURROUND_URGENCY` was disabled.

Phase D extended the pattern to R02795, R00156, and R02960. Their rescuing ablations implicated
goal attraction, perimeter bias, or objective attraction. Across the five diagnosed fragile
families, no single score flag rescued more than two. The recurring mechanism is therefore not one
universally broken term. On these selected parent-level cases, position/attraction scores can make
an early structural commitment that becomes unrecoverable after beam truncation or within the
repair budget.

### What remains established

R02248 remains the clearest worked causal example. It is near-Hamiltonian and needs seven
intersections. In its hard orientations, an orientation-shaped early trajectory makes the strong
revisit incentive create a crossing too soon, consuming adjacency needed to cover almost all open
cells later. Disabling intersection setup rescued every hard orientation in the targeted ablation.
That is an interaction effect, not proof that the term should be removed globally.

The wider variant experiment also exposes different **perturbation-response phenotypes**. Fragile
parents often solve after a symmetry or small controlled perturbation and are useful discovery
material for heuristic/search-diversity questions. Parents historically labelled robust, such as
R00440, resisted the tested transformations and technique menu. That resistance is descriptive:
it does **not** prove intrinsic combinatorial hardness, technique independence, or that bounds,
pruning, or a new search family is the missing cause. The parent is the independent unit and the
accepted family rows are conditioned by the generator/witness/validation pipeline.

## Implementation-level causal chain

1. Structural templates explicitly score perimeter direction, corner proximity, board side, and
   axis-relative movement (`modules/solver/scoring.ts`). These are useful policies, but their
   interaction with a transformed gate, goal, and obligations need not preserve candidate ranks.
2. Legal neighbors are emitted from a fixed four-direction table. Equal-score paths therefore have
   a deterministic insertion order that can change under coordinate relabeling.
3. Beam search performs a stable score sort and slices to its width. A candidate just below the
   cutoff is gone permanently; later pruning can identify a dead survivor but cannot restore the
   discarded alternative.
4. Near-Hamiltonian and otherwise low-slack levels reveal this most dramatically because a locally
   attractive commitment can become provably bad only many moves later.
5. Repair randomness can soften the dependence, but repeated equal badness plateaus show that
   multiple seeds can still be pulled into the same heuristic basin.

Identical node counts across all eight presentations are neither realistic nor required. The
actionable pathology is a solve-status cliff, extreme work ratio, or reproducible term/order
divergence.

## Recommended next work

### 1. Use family ranking only when a current question needs it

The historical boundary report can still rank canonical-failure/symmetry-success parents, sibling
solve-status disagreement, extreme work spread, and winning-technique spread. It is discovery
machinery, not a standing queue. Current work should follow the live representation-sensitivity
lineage-survival gate and use family ranking when that gate needs controlled parent-level cases.

### 2. Use one diagnosis packet per high-ranked family

For each selected family:

1. inverse-transform the successful path and validate it on the parent;
2. compare complete attempt traces under the same work allocation and seeds;
3. distinguish frontier exhaustion from budget exhaustion;
4. replay equivalent easy/hard paths to find the first meaningful candidate-rank or prune
   divergence;
5. run single-flag scoring ablations, then small interaction ablations only when the first pass
   warrants them;
6. repeat the winning ablation across every hard orientation and at least one unrelated parent;
7. record whether the parent is perturbation-sensitive, perturbation-resistant, or inconclusive
   without treating that label as its latent cause.

### 3. Prefer diversity hypotheses to a universal coefficient change

The five diagnosed fragile families implicate different primary navigation terms. That evidence
argues against globally weakening any one term. A better general hypothesis is a bounded,
feature-gated, last-resort diversity pass that perturbs candidate ranking or temporarily omits a
small score family only after the ordinary ladder fails. Any prototype must be evaluated in work,
not only wall time, and must show canonical cold-solve gains without losing published solves or
inflating the already-solved corpus.

Do not revive the previously closed sequential five-full-pass attraction-diversity design without
a cheap predictor or shared-search implementation; its cost was already judged disproportionate.

### 4. Keep production orientation retry deferred

Trying all eight presentations is a useful diagnostic control but a poor first production fix: it
can multiply work, hides recurrent scoring defects, and does not establish why a
perturbation-resistant parent is hard. Revisit an orientation portfolio only if current matched
lineage diagnostics show a residual population dominated by representation-dependent cutoff
effects and a raced, shared-budget implementation beats score-diversity on solved count and total
work.

## Acceptance criteria for a solver change

A symmetry-derived change is ready to keep only when it:

- improves canonical cold solves, not merely transformed siblings;
- preserves the published solved set;
- reduces solve-status cliffs across the target symmetry families;
- is feature-keyed rather than level-id-keyed;
- passes full-corpus before/after work comparison, solver regression, and oracle/differential checks
  appropriate to any pruning change; and
- records losses and cost inflation, not just rescues.

## Scope limits

This synthesis does not claim a corpus-wide prevalence rate. The historical 38-family study used a
selected population, and the five ablation-diagnosed fragile families are enough to reject a
single-term explanation on those cases but not enough to estimate how often each mechanism occurs.
Family rows are correlated within parent, and family/replay/imported-hint/Profile/path-derived
descendants must not be counted as independent confirmation without an ancestry break. See
[`2026-09-14-historical-claim-lineage-audit-001.md`](2026-09-14-historical-claim-lineage-audit-001.md).
