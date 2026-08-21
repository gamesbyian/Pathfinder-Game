# Winning-lineage survival analysis

> **Status:** instrumentation and first same-config cohort complete; score/width forensics complete; first explicit-prefix CP-SAT follow-up complete; next step is bounded extinction-adjacent exact labeling
> **Capability rule:** known solutions are labels only and never guide the search
> **Current result reports:** [`../reports/2026-08-11-winning-lineage-score-width-forensics.md`](../reports/2026-08-11-winning-lineage-score-width-forensics.md), [`../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md)

## Purpose

Winning-path archaeology answers a local question: how does the solver rank the known-correct next move? Winning-lineage observation answers the finite-frontier question:

> **During the actual unchanged search, does the solver continue to retain any prefix belonging to any known-valid solution family, and where is the final known support lost?**

Known solutions are diagnostic fluorescence. They may label generated/pruned/deduped/culled/retained nodes after the search makes its ordinary decisions. They may never alter scoring, retention, tie order, budget, random state, or stopping.

## Implemented observation boundaries

The observer can distinguish support through the meaningful beam stages:

1. incoming frontier;
2. generated candidates;
3. post-hard-prune;
4. post-dedup;
5. post-score/width cull;
6. diversity selection where applicable.

It records support/family coverage, extinction depth/cause, cull rank/margin, and work after final known support. Because known solutions are incomplete, “known support extinct” is never interpreted as proof that no true solution remains.

Observation OFF/ON parity is required: instrumentation must not change path, outcome, or canonical work.

## Same-config cohort result

A deterministic 30-level solution-bearing Corpus-1 cohort used one isolated beam configuration: width 100, default profile, 100k canonical nodes.

Result:

- **13 solved / 17 failed**;
- observer OFF/ON parity: 30/30;
- zero hard-prune alarms;
- failed final labelled-support losses: **15 score/width, 2 dedup**;
- solved controls also sometimes lost all known support and later solved, confirming label incompleteness.

Mean normalized last-known support was substantially deeper for solves than failures, but post-extinction work alone was not discriminative enough to justify an early stop.

## Score/width forensics

The 15 failed final score/width extinctions were classified level-wise:

- **10 A: clearly mis-ranked**;
- **3 B: weak-margin**;
- **0 C: exact-tie/stable-order**;
- **2 D: width saturation**;
- **0 E: ambiguous**.

No known-supported candidate exactly tied the cutoff. The two width-saturation cases had best supported ranks 108/109 at width 100, with modest positive score deficits. Most other failures had materially worse scores, sometimes dramatically worse.

Interpretation: the recurring failure mechanism is **score representation under a saturated frontier**, not stable exact-tie order. This does not justify global widening or tie shuffling.

## First exact-prefix CP-SAT follow-up

The existing contrastive atlas contained 12 sibling rows where the lightweight oracle had abstained. The dedicated explicit-prefix CP-SAT workflow processed all 12:

- **7 dead** (`INFEASIBLE`);
- **1 live** (`OPTIMAL` with referee-valid emitted completion);
- **4 abstain**, all R00039 `unsupported-mechanics`;
- **0 input alarms**;
- **0 correctness alarms**.

The live case is `R00001:42:child-[5,6]:3`.

The strongest direct finding is that at least one R00001 sibling ranked **first** by the beam at its parent is exact-infeasible while the same parent has a known-valid continuation. Therefore at least some observed score/width failures are genuine future-viability mis-ranking, not merely tie order or unavoidable width.

The one live alternative is equally important: alternatives to the stored known continuation are not all dead. The production problem is to represent generic future viability better, not imitate a stored path.

## Next exact-label experiment

Do **not** rerun the original 12 cases unchanged.

Build a bounded set of same-parent sibling decisions near **actual score/width extinction events** from the lineage cohort or a carefully expanded cohort. Prefer cases where:

- the supported candidate is near or below cutoff;
- multiple legal siblings exist;
- the CP-SAT model supports the relevant mechanics;
- candidate ranks/margins make the decision informative.

Label each exact prefix+child as:

- live;
- dead;
- timeout/unsupported/abstain.

Never collapse abstain into dead.

## What to test against exact labels

Before changing production policy, evaluate neutral descriptors such as:

- crossing slack / forced future revisits;
- remaining must-cross completion interfaces;
- turn-family entry/exit opportunities;
- residual reachable volume/topology;
- portal/flipper state;
- future length/intersection commitments;
- structural-family descriptors.

The question is whether any generic fact separates exact-live from exact-dead siblings under identical parent history.

## Possible later receptors

Only after exact labels reveal a recurring generic distinction should a narrow live counterfactual be designed. Possible receptors include:

- a secondary beam retention reservoir/quota;
- a score component or tie-break;
- a diversity descriptor;
- a failure artifact for another method.

A structural-family reservoir remains plausible, but it is not frozen. It must preserve the ordinary scoring/width logic as much as possible, run at matched total work, and remain level-blind.

## Interpretation cautions

- Known solution sets are incomplete.
- Final known-support extinction is not proof all true solutions are extinct.
- CP-SAT support coverage is mechanic-dependent; unsupported cases are abstentions.
- One vivid exact-dead rank-1 sibling is a useful counterexample, not a complete scoring theory.
- Correlation with known solutions is not permission to guide search from those solutions.

## Current handoff

1. Select a bounded extinction-adjacent sibling set.
2. Run through `.github/workflows/cpsat-explicit-prefix-oracle.yml`.
3. Compare neutral descriptors against exact live/dead labels.
4. Only then specify the narrowest equal-work retention/score experiment justified by the evidence.

This lane can proceed in parallel with neighbor-budget five-loss diagnosis and repair-retreat CP-SAT because it is observation/oracle work rather than a production promotion change.
