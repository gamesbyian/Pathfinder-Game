# Technique census budget and broad-run reconciliation 001

> **Status:** completed
> **Last evidence:** 2026-09-21 — current production refresh remains 50M nodes/level; EW1 remains the validated shallow cross-technique pricing instrument at 10M canonical work.
> **Decision:** keep T1/T3/T4 at 50M nodes; make a bounded 60-level / 10M-work EW1 tranche part of the normal census dispatch, with an independent frozen seed and a dedicated pre-fan-out work-cap canary.
> **Remaining gate:** after the next stress refresh + census complete, reconcile the fresh capability boundary, EW1 shallow pricing, T1 deep capability, failure-response evidence, and WS1 frozen-model challenge before changing scheduler or census budgets.

## Why the deep census stays at 50M nodes

The technique census answers a depth/capability question. Its T1/T3/T4 node budget is intentionally within-technique evidence rather than a claim of equal cost across DFS, beam, repair, IDA, and admissible-order search.

Recent budget work strengthens rather than weakens that boundary:

- ordinary production refreshes still use a 50M-node per-level ceiling;
- brute work-ladder escalation closed negative on economics against cheaper known technique screens;
- current research uses canonical `workSpent` for cross-technique allocation claims;
- the fresh WS1 independent-parent preflight separately uses a 50M-node solver ceiling, so there is no current evidence that 50M is systematically too shallow for the broad capability question.

A higher standing node ceiling would multiply the most expensive matrix in the repository without a current discriminator that requires it. Reopen the deep census budget only if fresh evidence shows a meaningful population of node-capped cells whose unresolved capability status changes a live decision.

## Why EW1 rides with the census now

The existing census planner already supports an EW1 tier and the combiner already emits separate equal-work summaries. The missing piece was workflow exposure.

Default EW1 contract:

- frozen pre-dispatch production boundary `35066677597` (101/102 C1, 1,169/1,700 C2), replacing the stale `31918095910` workflow default;
- 60 production-unsolved levels sampled from that frozen boundary;
- 10,000,000 canonical work per eligible base technique;
- independent deterministic seed `20260921`;
- base techniques only, preserving EW1's role as shallow pricing rather than duplicating T1 variants/pairs;
- one pre-fan-out EW1 cell canary, specifically protecting the strict work-cap seam that previously exposed an IDA budget-contract defect.

EW1 does not replace T1. T1 asks what isolated techniques can eventually do at the maintained depth ceiling. EW1 asks what they buy cheaply in the common canonical allocation currency. The sampling boundary stays frozen even if the concurrently requested stress refresh later establishes a newer solved set, avoiding outcome-selected EW1 membership.

## Broad-run work-saving policy

Do not change solver behavior inside the canonical stress refresh or census merely to save tonight's compute. These runs are longitudinal/current-boundary evidence and should remain clean.

Production-inert piggybacking is allowed only where the observer already has a canonical owner and the run naturally supplies its required evidence. The stress refresh now applies the frozen WS1 legal-signal model and seals action-boundary identity. Generic memoization, compiled-level caching, proof blackboards, shared-search runtime, and connectivity-cut reuse remain closed on current economics and should not be revived by opportunistic telemetry.

BC1 removable-work economics and forced-work singleton-chain economics remain separate bounded acquisitions because their next instruments require specific beam-hosted populations and attribution semantics rather than whole-corpus firehoses.

## Required post-run reconciliation

After both broad runs complete, the next solver-research pass must:

1. establish the new production capability boundary from the stress refresh, including solved-set churn, lifecycle/failure map, compact failure response, and solver-health record;
2. inspect the frozen WS1 action-selection challenge from the same refresh without refitting the model;
3. compare fresh T1 deep capability with the prior census, including gains/losses, exclusive capability, newly capped cells, and technique/flag regressions;
4. compare fresh EW1 equal-work pricing with the August 28 pilot under exact current protocol identity, separating naturally exhausted cheap screens from cap-bound continuations;
5. join T1 depth and EW1 pricing to ask whether current production allocation misses cheap capability, underdoses useful continuations, or spends work on newly dominated actions;
6. route any resulting decision-changing discriminator through the normal question-intake/research-contract system rather than treating broad-run correlations as production policy;
7. explicitly reconsider the next census budget only if capped-depth evidence is now decision-limiting.

Do not mark the broad acquisition complete merely because the workflows are green. The acquisition closes only after this reconciliation is recorded in current workstream authority or a dated result.
