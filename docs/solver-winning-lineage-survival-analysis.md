# Winning-lineage survival analysis

> **Status:** current beam-observation instrument contract. Current scoring/retention rank lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Capability rule:** known solutions are offline labels only and never guide search.

Winning-lineage observation asks a finite-frontier question:

> During unchanged beam search, does any generated/retained prefix still belong to a known-valid solution family, and at which ordinary search boundary is the final known support lost?

Former dated cohort results/first CP-SAT follow-ups: [`archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md`](archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md).

## Observation boundaries

The observer distinguishes known support through incoming frontier, generated candidates, post-hard-prune, post-dedup, post-score/width cull, and diversity selection where applicable. Useful telemetry includes support/family coverage, extinction depth/cause, cull rank/margin, and work spent after final known support.

Observation OFF/ON parity is mandatory. Enabling it must not change solution, canonical work, scoring, retention, tie order, randomness, or cache/memo lifetime.

## Interpretation

Known hints/solutions are incomplete, so:

- known-support extinction is not proof that all true solutions are extinct;
- a solved control may lose every known labelled lineage and later find an unknown valid route;
- score/width extinction nominates exact/contrastive follow-up, not infeasibility;
- exact-prefix reference labels can strengthen a sibling comparison; unsupported/timeout remains abstention;
- a labelled eventual winner does not prove each prefix was uniquely/best viable;
- a selected interesting lineage is discovery evidence, not prevalence evidence.

Same-parent siblings around one extinction event give useful geometric/history control but remain one family for generalization.

## Current workflow

For active beam-retention work, use bounded extinction/inversion cohorts and the narrowest candidate explanation against simple controls at equal surrounding policy. The current full-pool capture/projection gate is recorded in [`../reports/2026-08-24-beam-full-pool-capture-readiness.md`](../reports/2026-08-24-beam-full-pool-capture-readiness.md); do not create another census merely because the observer exists.

Preferred sequence:

1. locate a reproducible extinction boundary under unchanged search;
2. label competing material live/dead with exact/reference evidence where supported;
3. identify the score/dedup/width/diversity decision that removed viable material;
4. test one neutral descriptor/retention mechanism in shadow mode;
5. compare width-only and random/neutral controls at matched work;
6. replicate across unrelated parents;
7. only then test a live counterfactual with confirmation outside the design cases.

Candidate descriptors may use future interfaces, residual topology/volume, crossing/resource commitments, or mechanic state. If several are tried on one cohort, disclose selection; the best separator from that cohort is not independent confirmation.

Family/statistical rules: [`variant-level-research.md`](variant-level-research.md). Shadow/oracle rules: [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md), [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Promotion boundary

A lineage finding earns a live counterfactual only after a recurring generic distinction is identified. Receptors may include score terms, retention reserves/quotas, diversity descriptors, or typed failure artifacts.

Promotion requires actual cold solve/work improvement, competition inside the relevant aggregate work envelope, gains/losses on the population reaching the decision, independent confirmation for selected/tuned descriptors, and no runtime use of level/family identity or known-path compatibility.

Do not jump from “known path was culled” to copying it, global beam widening, or exact-level special treatment. Known-lineage survival is a diagnostic, not the production objective.