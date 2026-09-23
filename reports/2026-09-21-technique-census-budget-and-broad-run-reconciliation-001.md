# Technique census budget and broad-run reconciliation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-22 — stress refresh `35687363645` and technique census `35687337464` completed from shared solver ref `39d14d49023aa09cb680053b975ef786eeae9b01`; census combine is 120/120 complete with 80,538 unique cells.
> **Decision:** retain the 50M-node T1/T3/T4 ceiling and the bounded 60-level / 10M-work EW1 tranche. The fresh evidence exposes useful deep-vs-cheap allocation cohorts without making deeper standing census compute decision-limiting.
> **Remaining gate:** materialize the fresh second-order census outputs and harden the standard-result execution-identity contract; production scheduler changes still require controlled confirmation.

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

## Machine reconciliation consumer

The mandatory post-run composition now has a maintained derived consumer:

`scripts/reconcile-broad-solver-evidence.mjs`

It joins the canonical production-side equal-work reach summary, deep T1 census analysis, production summary, and frozen WS1 challenge into one machine artifact while keeping their evidence currencies and scopes separate.

Use it **after** the component analyzers, before prose interpretation. Its nomination sets are inputs to question intake, not automatic scheduler/removal decisions.

See [broad reconciliation consumer](2026-09-21-broad-solver-evidence-reconciliation-consumer-001.md).

## Required post-run reconciliation

After both broad runs complete, the next solver-research pass must:

1. establish the new production capability boundary from the stress refresh, including solved-set churn, lifecycle/failure map, compact failure response, and solver-health record, then run the maintained broad-evidence reconciliation consumer once the census-side derived analysis is available;
2. inspect the frozen WS1 action-selection challenge from the same refresh without refitting the model;
3. compare fresh T1 deep capability with the prior census, including gains/losses, exclusive capability, newly capped cells, and technique/flag regressions;
4. compare fresh EW1 equal-work pricing with the August 28 pilot under exact current protocol identity, separating naturally exhausted cheap screens from cap-bound continuations;
5. join T1 depth and EW1 pricing to ask whether current production allocation misses cheap capability, underdoses useful continuations, or spends work on newly dominated actions;
6. route any resulting decision-changing discriminator through the normal question-intake/research-contract system rather than treating broad-run correlations as production policy;
7. explicitly reconsider the next census budget only if capped-depth evidence is now decision-limiting.

Do not mark the broad acquisition complete merely because the workflows are green. The acquisition closes only after this reconciliation is recorded in current workstream authority or a dated result.

## 2026-09-22 closeout

The preregistered broad-run reconciliation is complete. The stress boundary remained **101/102 C1 + 1,169/1,700 C2** with zero solved-set churn. The census finished all 120 shards and shows full-depth T1 isolated capability on **83/532 current production misses**, including **47 singleton-supported** misses; **449** current misses have no T1 solve. On the safety side, **140/1,430 production-solved levels** have no isolated T1 solver, so T1 remains capability evidence rather than a production-ladder oracle.

EW1 also behaved as intended: the 60-level × 10M-work tranche completed without deadline truncation and separates cheap naturally exhausted beam screens from cap-bound DFS/admissible/repair continuations. Cross-source joins nominate cheap isolated capability that production does not convert into recorded wins, but those rows are allocation questions rather than automatic promotions or removals.

The census workflow itself ended red only after the scientific combine, when its legacy direct hint-persistence commit collided with newer main. Automatic harvesting subsequently persisted the discoveries at `afd744a195b2177a865670d3ec3afc00ed5352a7`. No rerun is warranted. [Full closeout](2026-09-22-technique-census-broad-evidence-closeout-001.md).

The generic `solver-sweep-result` wrapper did reveal one genuine integration gap: the combined census primary result does not bind the immutable execution SHA / exact expected-observed population through the newer standard contract, so the wrapper labels it non-decision-bearing despite complete specialized coverage. Repair that contract before the next standing census; do not solve it by repeating this acquisition.
