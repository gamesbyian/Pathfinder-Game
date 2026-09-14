# Known-solution-prefix survival analysis

> **Status:** current beam-observation instrument contract. Current scoring/retention rank lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Capability rule:** known solutions are offline labels only and never guide search.

Known-solution-prefix survival observation asks a finite-frontier question:

> During unchanged beam search, does any generated/retained prefix still belong to a known-valid solution family, and at which ordinary search boundary is the final known support lost?

Former dated cohort results/first CP-SAT follow-ups: [`archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md`](archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md).

## Observation boundaries

The observer distinguishes known support through incoming frontier, generated candidates, post-hard-prune, post-dedup, post-score/width cull, and diversity selection where applicable. Useful telemetry includes support/family coverage, extinction depth/cause, cull rank/margin, and work spent after final known support.

Observation OFF/ON parity is mandatory. Enabling it must not change solution, canonical work, scoring, retention, tie order, randomness, or cache/memo lifetime.

## Oracle-set identity and conditioning

The observer is set-valued evidence. Its conclusion is conditional on the accepted-path set supplied to it, even though every included path is a sound positive oracle. Persisted decision-bearing runs should therefore retain enough compact metadata to reconstruct that conditioning set: level structural revision, path-set inclusion rule, exact accepted-path identity/signature, structural solution family, provenance/evidence purpose, conservative dependency stratum and replay ancestry where known, plus solver/config revision.

Do not infer independence from `supportedPaths`, `supportedFamilies` or raw provenance counts alone. Multiple labels can descend from one replay/family/discovery chain. When a claim matters to a live mechanism nomination, compare scientifically justified path-set views such as all eligible paths, dependency-collapsed support, replay-first exclusion, or one representative per conservative dependency stratum. Missing historical ancestry stays unknown.

Identity-bound exact/reference labels remain bound to their original witness path. Never replace those witnesses with generic representatives merely to make the metadata uniform.

## Interpretation

Known hints/solutions are incomplete, so:

- known-support extinction is not proof that all true solutions are extinct;
- a solved control may lose every known labelled solution prefix and later find an unknown valid route;
- score/width extinction nominates exact/contrastive follow-up, not infeasibility;
- exact-prefix reference labels can strengthen a sibling comparison; unsupported/timeout remains abstention;
- a labelled eventual winner does not prove each prefix was uniquely/best viable;
- a selected interesting known-solution-prefix survival case is discovery evidence, not prevalence evidence.

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

Family/statistical rules: [`variant-level-research.md`](variant-level-research.md). Shadow/oracle rules: [`solver-offline-replay-harness.md`](solver-offline-replay-harness.md), [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Promotion boundary

A known-solution-prefix survival finding earns a live counterfactual only after a recurring generic distinction is identified. Consumers may include score terms, retention reserves/quotas, diversity descriptors, or typed failure artifacts.

Promotion requires actual cold solve/work improvement, competition inside the relevant aggregate work envelope, gains/losses on the population reaching the decision, independent confirmation for selected/tuned descriptors, and no runtime use of level/family identity or known-path compatibility.

Do not jump from “known path was culled” to copying it, global beam widening, or exact-level special treatment. Known-solution-prefix survival is a diagnostic, not the production objective.
