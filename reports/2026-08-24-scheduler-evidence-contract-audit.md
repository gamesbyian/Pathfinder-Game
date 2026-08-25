# Scheduler evidence-contract audit

> **Status:** active
> **Last evidence:** 2026-08-24 — current `Attempt`/persistence/lifecycle contracts plus the existing technique-census second-order analysis
> **Decision:** current solver artifacts already carry enough per-attempt identity, work, and termination semantics to support the first action-level scheduler repricing. Do not spend another telemetry round merely to distinguish natural exhaustion from censoring. The existing `portfolio-historical-replay.mjs` remains a winner/cap archaeology tool only and must not be used as the decision-bearing continuation-value analyzer.
> **Remaining gate:** join current persisted attempt/action rows to the existing census cap/tranche matrix and compute action-level risk sets, failed-work tax, exclusivity, portfolio-cardinality and fixed-work oracle/Pareto headroom, excluding sequence-ambiguous cells until P0 is resolved.
> **Evidence role:** tuning
> **Selection:** observational — this audit reconciles already-mined scheduler/census artifacts and current source contracts; it does not claim independent confirmation.

## Why this audit exists

Queue items #1 and #3 had converged on an infrastructure question: before building an action registry or buying more runs, does the current persisted evidence actually distinguish the things continuation-value analysis needs?

The answer on current code is mostly **yes**.

The missing work is now analysis/integration, not another telemetry redesign.

## Canonical identities already exist

`modules/solver/attempt-identity.mjs` already separates two useful layers:

- `formatAttemptIdentityKey(...)`: configuration/search-family identity such as profile, template, beam width/diversity, repair/admissible mode;
- `formatAttemptActionKey(...)`: scheduler/research identity that adds `stageId` and deterministic repair `seedSalt`.

Gate and resource envelope are deliberately kept as separate telemetry dimensions rather than exploded into the action identifier.

This is a sensible current contract. Stage belongs in the action identity because retry stages can change forced flags and semantics. Repair seed belongs there because different deterministic PRNG trajectories are genuinely different actions. Gate and budget should remain context/tranche dimensions.

Therefore the old queue wording “define stable search-action identity” is no longer the first missing primitive. The current identity helpers and tests already cover every supported search family.

## Current persisted attempt contract

`scripts/portfolio-solve-sweep-lib.mjs` projects current attempts with at least:

- `stageId`;
- canonical `actionKey` when stage identity exists;
- gate/config/profile/template/beam width;
- repair/admissible/diversity flags;
- repair `seedSalt` and exact derived `randomSeed` where present;
- `allocatedBudgetMs`;
- `allocatedWorkCeiling`;
- `allocatedNodeCeiling`;
- actual `workSpent`;
- `nodesExpanded`;
- `outcome`;
- `timedOut`;
- scheduler phase/pass/restart context where relevant.

At row level it also preserves total `workSpent`, deadline truncation, technique lifecycle telemetry, winner action identity, failed action identities, and correctness/referee status.

That is already much richer than the older portfolio replay assumed.

## Termination semantics are explicit enough

Current `Attempt.outcome` is one of:

- `success`;
- `exhausted`;
- `timed-out`;
- `budget-starved`;
- `error`.

The accompanying `timedOut` field explicitly distinguishes a genuine search-space exhaustion from a failure that ran out of its own budget for DFS/beam. Repair is documented as having no natural exhaustion state of its own, so repair failure remains censored rather than being falsely promoted to exhaustion.

This is exactly the distinction the portfolio/continuation-value literature requires.

The separate `techniqueLifecycle` record remains useful for broader eligibility/reach/starvation questions. `scripts/stress/lifecycle-failure-map.mjs` already distinguishes technique-level:

- instantiated;
- reached;
- starved by node budget;
- starved by work budget;
- routing/configuration skip;
- exhausted search space;
- actual nodes/work.

So the evidence stack is complementary:

- **attempt rows:** action-level outcome/work/censoring;
- **lifecycle rows:** technique-level eligibility/reach/starvation/exhaustion.

Do not collapse one into the other.

## The stale tool boundary: `portfolio-historical-replay.mjs`

The existing historical replay is not wrong at what it claims to do. Its own output note says it is an upper-bound expectation from recorded winning-attempt elapsed times only.

But it is **not** suitable for the current scheduler decision because it:

- reads only the first successful attempt on a level;
- ignores failed-attempt work entirely;
- uses wall-clock `elapsedMs` as the cap currency;
- does not build risk sets from attempts that survived unsolved to a tranche;
- does not distinguish natural exhaustion from censoring in its policy simulation;
- does not account for action overlap/substitution or rare exclusives;
- does not use current `actionKey` as the primary unit;
- cannot charge the failed-work tax that makes dead-last additive retries expensive on hard residual levels.

Keep it as historical cap/recovery archaeology. Do not extend its conclusions into current continuation-value policy merely because the file name says “portfolio.”

A current analyzer may reuse its input-loading/reporting helpers, but its statistical object is different.

## What the existing census already tells us before the join

The generated second-order census already supplies a useful preliminary portfolio shape, with important caveats because its cross-technique cost is raw nodes and its cells are isolated/frozen rather than current sequential action rows.

On the fully sampled production-unsolved gap union:

- 219 levels have a winner among fully sampled techniques;
- coverage-first greedy selection gets **121/219** from plain repair alone;
- the best three selected techniques reach **153/219 (69.9%)**;
- eight techniques reach **190/219 (86.8%)**;
- reaching the full 219/219 union takes **22 techniques**;
- a cost-first cover delays repair until step 13.

This already falsifies one overly simple story: there is not obviously a tiny three-action portfolio that preserves the whole isolated hard-gap capability union.

But it also shows substantial compression is possible if losing some rare tail capability is acceptable: eight techniques cover most of that fully sampled union.

The scheduler decision therefore needs an explicit cardinality/Pareto curve with the rare lost solves shown, not a single “best portfolio size.”

The same census also shows cheap perimeter beam actions scoring very highly when placed after failed deep DFS/IDA in an observational pair ranking. The correct interpretation is the inverse scheduling nomination: run the cheap screen earlier. The pair table itself does not establish a causal sequence benefit.

## Existing tranche evidence

The census already reports censored cap/hazard structure across `100K/250K/500K/1M/2M/5M/10M/20M/30M/40M/50M`.

Durable findings relevant to the first join include:

- beams often naturally exhaust at sub-million frontiers and behave like cheap screens;
- plain repair has genuine deep yield and must not be globally truncated to the easy-level median;
- repair adds 13 solves in 20M→30M, 16 in 30M→40M, and 8 in 40M→50M in the frozen isolated matrix;
- 40M→50M is the weakest measured repair tranche by isolated nodes per incremental solve, but still contains real capability and therefore needs current residual `workSpent` pricing before removal;
- `ida:none` has materially more equal-cap exclusivity at 50M than the other canonical IDA profiles and should not be collapsed into a generic “deep IDA is redundant” bucket;
- several ordinary DFS profiles look highly substitutable in isolated evidence and are stronger overspend nominations than deep repair.

These are nominations, not current production cap decisions.

## Smallest current-data analysis

Build one rebuildable table at **attempt/action/tranche** granularity.

For each comparable current action/context record:

- `actionKey`;
- search/config family;
- stage/context;
- seed where meaningful;
- gate only as context, not algorithm identity;
- allocated work/node ceiling;
- actual `workSpent`;
- outcome (`success`/`exhausted`/`timed-out`/`budget-starved`/`error`);
- predecessor/reach context available from the current ladder;
- census family/config mapping when comparable;
- cap/tranche membership;
- solve/exclusive/overlap membership;
- evidence freshness and sequence-comparability flag.

Then construct tranche risk sets using only rows that are genuinely still at risk:

- success before tranche start leaves the risk set;
- natural exhaustion leaves all later continuation risk sets;
- timeout/cap at tranche start is right-censored and remains a candidate for a later measured tranche;
- budget-starved action is **not evidence of search failure at that tranche**;
- deadline-truncated/error rows remain indeterminate/excluded from negative inference.

## First outputs

The first decision-bearing report should produce, before any live scheduler change:

1. **Current tail audit:** reached count, failed-work tax, residual solves and exclusives for every promoted additive/retry stage.
2. **Continuation table:** incremental solves and incremental `workSpent` by comparable action/tranche risk set.
3. **Portfolio cardinality curve:** best measured 1, 2, 3, ... actions under explicit coverage/work objectives, including rare solves lost at each contraction.
4. **Fixed-work frontier:** current production point versus optimistic measured static oracle/Pareto points under the same aggregate work envelope.
5. **Simple greedy/static baseline:** how much oracle headroom can be captured without dynamic telemetry or learned routing.
6. **Sensitivity:** repeat the frontier excluding P0/sequence-ambiguous admissible-order cells and any stale-code mappings.

Only if those views show material residual headroom should a dynamic/learned scheduler survive as an implementation priority.

## P0 interaction

The action identity and termination telemetry are not a reason to ignore cross-stage dependence.

For the historical admissible-order anomaly, predecessor activity appears causally relevant. Until that mechanism is understood, affected cells need `sequenceComparable = false` (or equivalent) in the scheduler matrix.

Two frontiers are acceptable:

- conservative frontier excluding ambiguous cells;
- explicitly optimistic sensitivity frontier including them.

Do not allow the optimistic version to become the production justification.

If the dependency is eventually formalized as an intentional producer→receptor handoff, producer work becomes part of the action contract and must be charged.

## Automatic-configuration consequence

Queue #3 can move one step forward.

The first missing gate is no longer identity definition. The next gate is:

> Does the existing action menu, priced honestly at current residual `workSpent`, contain enough complementary fixed-envelope headroom to justify configuration search beyond selecting among the actions already present?

If a small static subset captures nearly all comparable headroom, do not launch raw weight/flag configuration search.

If substantial headroom remains and is concentrated inside one surviving action family, then local parameter refinement around that family becomes justified.

## Stop conditions

Stop before new scheduler infrastructure if:

- current artifacts cannot be joined without large stale-code ambiguity;
- comparable fixed-work oracle headroom is small;
- simple static repricing captures nearly all of it;
- apparent gain depends mostly on additive work, right-censoring misclassification, or sequence-ambiguous rows;
- rare exclusive losses erase the average saving.

## Disposition

The telemetry/identity prerequisite is **substantially complete on current code**.

Do not commission another general telemetry pass merely to obtain action identity or exhaustion-vs-censoring. Use the current persisted attempt contract, lifecycle telemetry, and existing census cap matrix. The next work is the actual join/frontier analysis.
