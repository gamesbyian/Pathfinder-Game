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

Observation OFF/ON parity is mandatory. Enabling the observer must not change solution, canonical work, scoring, retention, tie order, randomness, or cache/memo lifetime.

## Interpretation

Known hints/solutions are incomplete. Therefore:

- known-support extinction is **not** proof that all true solution paths are extinct;
- a solved control may lose every known labelled lineage and later find an unknown valid route;
- a score/width extinction is a nomination for exact or contrastive follow-up, not proof that the scorer chose an infeasible branch;
- exact-prefix CP-SAT can strengthen the diagnosis when both competing prefixes are supported by the oracle model;
- unsupported/timeout oracle cases remain abstentions;
- the fact that a labelled path eventually wins does not imply every earlier prefix on it was the only or even the best viable continuation;
- a lineage selected because it exhibits an attractive failure shape is discovery data, not an unbiased estimate of how often that mechanism occurs.

The most useful contrast is often same-parent siblings around a real extinction event, because geometry/history can be controlled closely. Those siblings are still one family for generalization; do not count sibling rows as independent confirmation.

## Current workflow

For active **Priority 4 beam-retention work**, use bounded extinction/inversion cohorts and compare the narrowest candidate explanation against simple controls at equal surrounding policy. Do not turn the lineage instrument into another full-corpus census unless a decision specifically requires it.

Preferred sequence:

1. locate a reproducible extinction boundary under unchanged search;
2. ask whether exact-prefix/reference evidence can label the competing material live/dead;
3. identify the specific score, dedup, width, or diversity decision that removed viable material;
4. test one neutral descriptor or retention mechanism in shadow mode;
5. compare against simple controls such as width-only or random/neutral retention at matched work;
6. replicate the mechanism across unrelated parent families;
7. only then test a live production counterfactual, with confirmation outside the cases used to design it.

Candidate descriptor families include future completion interfaces, residual topology/volume, crossing slack/resource commitments, and mechanic-state descriptors. If several descriptors are tried on the same extinction cohort, report the selection process. The best separator from that cohort is not independently validated merely because it has a clean margin.

For family/variant selection and statistical cautions see [`variant-level-research.md`](variant-level-research.md). For broader shadow/oracle rules see [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Promotion boundary

A lineage finding earns a live counterfactual only after it identifies a recurring generic distinction. Possible receptors include score terms, retention reservoirs/quotas, diversity descriptors, or typed failure artifacts for another technique.

Promotion requires more than “known valid material survived longer”:

- the treatment must improve actual cold solve/work behavior, not only labelled-lineage survival;
- it must compete inside the relevant aggregate work envelope;
- gains and losses must be measured on the population that reaches the decision;
- a selected/tuned descriptor must survive independent confirmation;
- level/family identity and known-path compatibility remain offline labels only.

Do not jump from “the known path was culled” to copying the known path, global beam widening, or exact-level special treatment. Do not optimize the observer metric itself as though known-lineage survival were the production objective.