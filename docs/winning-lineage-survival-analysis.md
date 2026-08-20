# Winning-lineage survival analysis

> **Status:** current beam-observation instrument contract. Current scoring/retention priority lives in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **Capability rule:** known solutions are offline labels only and never guide search.

Winning-lineage observation asks a finite-frontier question:

> During the unchanged beam search, does any generated/retained prefix still belong to a known-valid solution family, and at which ordinary search boundary is the final known support lost?

The former document's dated cohort results and first CP-SAT follow-ups are preserved at [`archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md`](archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md).

## Observation boundaries

The observer distinguishes known support through:

1. incoming frontier;
2. generated candidates;
3. post-hard-prune;
4. post-dedup;
5. post-score/width cull;
6. diversity selection where applicable.

Useful telemetry includes support/family coverage, extinction depth/cause, cull rank/margin, and work spent after final known support.

Observation OFF/ON parity is mandatory. Enabling the observer must not change solution, canonical work, scoring, retention, tie order, or randomness.

## Interpretation

Known hints/solutions are incomplete. Therefore:

- known-support extinction is **not** proof that all true solution paths are extinct;
- a solved control may lose every known labelled lineage and later find an unknown valid route;
- a score/width extinction is a nomination for exact or contrastive follow-up, not proof that the scorer chose an infeasible branch;
- exact-prefix CP-SAT can strengthen the diagnosis when both competing prefixes are supported by the oracle model;
- unsupported/timeout oracle cases remain abstentions.

The most useful contrast is often same-parent siblings around a real extinction event, because history is identical up to the choice being studied.

## Current workflow

For active Priority 2 work, use the current queue's held-out family-namespaced extinction set and compare the narrowest candidate explanation against a simple K-vs-2K width control at equal surrounding policy.

Neutral descriptors can be tested in shadow mode before any production scorer change. Candidate families include future completion interfaces, residual topology/volume, crossing slack/resource commitments, and mechanic-state descriptors. A descriptor should generalize across unrelated parent families rather than merely separate one vivid case.

For family/variant selection and statistical cautions see [`variant-level-research.md`](variant-level-research.md). For broader shadow/oracle rules see [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Promotion boundary

A lineage finding earns a live counterfactual only after it identifies a recurring generic distinction. Possible receptors include score terms, retention reservoirs/quotas, diversity descriptors, or typed failure artifacts for another technique.

Do not jump from “the known path was culled” to copying the known path, global beam widening, or exact-level special treatment. The production change must remain level-blind and be judged at matched total work.
