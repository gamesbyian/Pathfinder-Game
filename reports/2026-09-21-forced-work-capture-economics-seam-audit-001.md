# Forced-work capture-economics seam audit 001

> **Status:** active preflight / interpretation correction.
> **Date:** 2026-09-21.
> **Owner:** `WS2-FORCED-WORK-CAPTURE-ECONOMICS`.
> **Production effect:** none.
> **Source result:** [forced-work prevalence result 001](2026-09-21-forced-work-prevalence-result-001.md).
> **Decision:** retain the 25.33% figure as a strong prevalence/work reservoir, but do not call it a directly removable post-prune work ceiling. At the current observation seam, the parent expansion and hard-prune work used to discover one-survivor status has already been paid.

## Why the economics question changes

The prevalence observer starts each parent's charged `workSpent` after replaying the retained parent into the beam working state. It then runs neighbor generation, candidate application, ordinary hard pruning and surviving-candidate scoring. Only after that parent expansion is complete can the observer know that exactly one candidate survived.

Therefore the measured **22,944,663 / 90,572,067 = 25.33%** parent-expansion work at one-successor parents is a gross reservoir associated with forcedness, not work that a consumer inserted after ordinary hard pruning can retroactively delete.

The old "perfect free contraction" interpretation is valid only under a stronger hypothetical: a perfect **earlier** recognizer that can know the unique viable continuation before paying the ordinary expansion/pruning cost. No such recognizer has been demonstrated.

This distinction matters because the current next gate is supposed to price a real consumer, not rename already-spent work as savings.

## Smallest live economics questions

The production-inert follow-up now has three separable numerators.

1. **Post-recognition bookkeeping:** when the whole post-hard-prune frontier has one candidate, how often can sorting, retention/cull work, candidate materialization and parent/frontier bookkeeping be skipped while preserving exact behavior?
2. **Replay/phase-boundary overhead:** when a singleton frontier feeds another singleton frontier, how much non-canonical replay/materialization overhead is paid only because the beam loop closes and reconstructs the next phase instead of continuing the live state directly?
3. **Earlier recognition:** is there any cheaper sound current-input test that establishes unique viable continuation before ordinary candidate expansion/hard pruning? This is a separate inference question and must not be assumed from literal post-prune forcedness.

The existing 25.33% prevalence result remains valuable because it says the phenomenon is broad. It does not answer any of these three numerators by itself.

## New zero-behavior-change measurement

Extend the existing forced-work reducer using observer stages that already exist. No solver instrumentation is required.

For each beam phase retain:

- incoming frontier size;
- expanded-parent count and expansion work;
- zero/one/multi-successor parent counts;
- total candidate count after ordinary hard pruning.

Derived phase classes:

- **singleton outcome:** post-hard-prune frontier size = 1;
- **singleton -> singleton:** incoming frontier size = 1 and post-hard-prune frontier size = 1;
- **all parents individually forced:** every expanded parent has exactly one survivor.

These classes are deliberately stronger than "one parent has one survivor." They identify places where global beam choice may actually have collapsed.

The reducer records the canonical work already spent to discover each singleton outcome as **discovery work**, explicitly not as removable work.

## Admission logic

The next full frozen-sample rerun should answer:

- how common singleton-outcome and singleton->singleton phases are;
- whether they recur across independent parents rather than one selected level;
- how much already-spent discovery work precedes them;
- whether they are concentrated at shallow/deep phases or particular mechanics.

Interpretation:

- **rare global singleton phases:** close simple semantics-preserving forced-step compression as a batch-speed route; the 25.33% per-parent prevalence mostly reflects local forcedness inside a still-branching global beam.
- **common singleton phases but tiny replay/bookkeeping cost:** close canonical speed claims; retain only possible wall-time micro-optimization if separately measured.
- **common singleton->singleton runs with material replay/bookkeeping overhead:** earn the smallest behavior-equivalent direct-continuation implementation and matched-work/wall-time validation.
- **material earlier-recognition premise appears:** route it through its own soundness/economics gate; do not smuggle exact semantic-forcedness into production.

## Execution gate

Rerun the existing frozen 64-parent probe after this reducer extension using the same population, profile, width, work budget and wall-safety contract as the corrected prevalence census.

This environment cannot dispatch a fresh arbitrary GitHub Actions workflow directly. The rerun is therefore queued as the next acquisition step for `WS2-FORCED-WORK-CAPTURE-ECONOMICS`; no new one-shot workflow should be left on `main`.

Until that result exists, no behavior-changing forced-step consumer is earned.
