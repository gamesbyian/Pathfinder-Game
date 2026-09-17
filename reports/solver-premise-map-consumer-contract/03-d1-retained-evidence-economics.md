# D1 retained-evidence consumer/economics falsifier

Date: 2026-09-17
Status: concluded / retained evidence insufficient to earn live prototype

## Question

After the consumer-contract census found a real existing ranking/retention seam for D1 future-intersection commitment realizability, can retained evidence alone establish enough eligibility, disagreement and information-value economics to justify a live matched-work prototype?

This is deliberately narrower than testing whether D1 is an interesting discriminator. That was already observed. The gate is whether the information would be available often enough, change an actual search decision often enough, displace enough downstream work, and cost little enough to deserve live policy feedback.

## Retained evidence used

- `reports/stress/class5-production-search-frontier-multi-pick-cases-2026-09-17.json`
- `reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json`
- `reports/stress/class5-multi-pick-intersection-commitment-realizability-2026-09-17.json`
- `scripts/stress/class5-multi-pick-intersection-commitment-realizability.mjs`
- current beam ranking/retention implementation in `modules/solver/search.ts`
- `docs/solver-offline-replay-harness.md` and current evidence/work-contract authorities

No new compute, oracle calls, runtime instrumentation or solver changes were made.

## Eligibility

The retained D1 replication supports 20 matched depth-11 states, all from parent `R03147`, selected because LIVE and DEAD states shared the same remaining-intersection deficit and prefix length. Each supported state exposed 11 eligible revisit candidates, giving 220 pin-revisit queries.

This proves the query contract is well-defined on that selected cohort. It does **not** estimate production invocation prevalence. The retained production-frontier case file contains prefixes but no denominator of all generated/reached beam decisions satisfying the D1 matching/query contract. Therefore production eligibility frequency is **not recoverable from retained evidence**.

P206 consequence: 20 supported states cannot be divided by 50 labelled states, 390 residual levels, or any other convenient row count and called a runtime opportunity rate. Those populations were produced by different selection rules.

## Would D1 actually change a current decision?

A concrete ranking counterfactual exists: after ordinary legality checks, rank/retain a generated state with zero realizable future-intersection commitments below an otherwise comparable state with at least one.

The retained D1 result discriminates its selected states strongly: 18 exact-DEAD states have zero feasible commitments; both exact-LIVE states have at least one.

However, the retained artifacts do not preserve the actual beam decision context for those states:

- no contemporaneous candidate score;
- no sibling candidate scores;
- no frontier rank;
- no beam-width cutoff position;
- no coarse-state collision/retention outcome;
- no record that a zero/nonzero D1 distinction would have crossed a selection boundary.

Therefore the number of **actual disagreements with current behavior is unknown**, not 18 and not 20. D1 separates labelled states; retained evidence does not show that the proposed ranking authority would alter a real bounded-frontier choice.

## Downstream work potentially displaced

The retained artifacts do not preserve descendant subtree work, later selection survival, first-loss location, or remaining `workSpent` attributable to each D1-labelled prefix.

Safe bounds from retained evidence are consequently weak:

- lower bound: **0 displaced work**, because a D1-labelled state might already have been ranked/retained away without affecting later search;
- finite useful upper bound: **not recoverable** from the retained artifacts.

Using the remaining level budget as an avoided-work estimate would be invalid because it assumes the labelled state monopolizes all later work and ignores alternative frontier candidates/policy feedback.

## Cost of obtaining D1 information

The retained campaign used 220 separate CP-SAT `--pin-revisit` queries with a 45-second per-query time limit, plus state reconstruction and referee validation for claimed-live witnesses.

The result JSON does not retain per-query elapsed time. Therefore the actual cost distribution, median, tail, amortization opportunity and cost relative to production `workSpent` cannot be reconstructed. `220 * 45s` is only an administrative worst-case envelope, not observed cost and not an economics estimate.

Reading a completed JSON result is cheap but irrelevant to production: exact/offline labels are forbidden cold-routing inputs. A production consumer would have to derive equivalent information from current input/state under its own work contract.

## Authority

The only smallest consumer justified by the census remains **ranking/retention**. The retained evidence does not earn hard prune or forced-move semantics.

Even a zero-feasible result from the exact research model would need a separate proof that the enumerated commitment set is necessary/complete under game semantics before rejection authority. One-parent zero-alarm validation is not that proof.

## Replay validity

Retained replay could validly answer one-step questions **if** beam decision context had been retained: eligibility, D1 value, existing score/rank, and whether adding the value would cross a fixed selection boundary.

Those fields are missing. More importantly, once ranking changes frontier composition, later eligibility, scores, reachable states and work all change. Offline replay cannot establish solve/work economics under that feedback. Any downstream-value test would eventually require a live matched-work opt-in treatment.

## Rival explanations preserved

The retained gap is compatible with several materially different stories:

1. D1 is valuable but missing instrumentation prevents measuring its decision population/economics.
2. D1 is a strong forensic discriminator on specially selected states but almost never crosses a live beam selection boundary.
3. D1 would cross decisions, but exact information is too expensive relative to displaced work.
4. A cheap approximation might exist, but no evidence here establishes one.
5. The one-parent result is idiosyncratic and does not generalize.

The retained evidence cannot discriminate these without new observation.

## Stop condition

The preregistered retained-evidence economics gate asked for eligibility frequency, actual decision disagreements, displaced-work bounds and information cost before a live implementation.

Three of those four are not recoverable from retained assets at decision-bearing resolution, and observed query cost is not retained. Therefore the gate **does not pass**.

No live D1 treatment, exact-query production mechanism, approximation search or new oracle campaign is earned by this phase.

## Precise reopen trigger

Reopen D1 only when a generic, production-inert observation can retain, on an independently selected multi-parent population:

- every eligible decision opportunity under an explicit contract;
- current candidate score/rank and actual retention/cutoff outcome;
- zero/nonzero D1 result (or a separately justified cheap proxy) without using historical identity to route production;
- descendant/work ancestry sufficient to bound displaced `workSpent`;
- measured information-production cost under the same work accounting;
- independent parent identity and evidence ancestry.

That observation should run before any policy change. Only if it shows non-trivial decision disagreement and plausible positive information value should a live matched-work ranking prototype be considered.

This is a deferred measurement trigger, not authorization to add instrumentation immediately. The present mining descendant stops here.