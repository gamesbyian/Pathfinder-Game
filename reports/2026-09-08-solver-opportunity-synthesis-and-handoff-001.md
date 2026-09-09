# Solver opportunity synthesis and implementation handoff 001

> **Status:** concluded research synthesis; implementation candidates remain unstarted
> **Last evidence:** 2026-09-08
> **Decision:** keep production priority on Workstream 2 repricing/allocation. The strongest new capability-development target is bounded joint-obligation propagation on the intersection + must-cross + multi-portal residual cohort; the strongest exact-label opportunity is a prespecified small/easier native-residual acquisition rule. Static topology features and broad residual retries do not earn production work from current evidence.

## Ranked opportunities

| Rank | Opportunity | Evidence now | Immediate disposition |
|---:|---|---|---|
| 1 | Finish the three bounded Workstream-2 repricing decisions | Mature causal evidence and explicit confirmation gates already exist | Remains current production priority |
| 2 | Joint-obligation interface propagation | The triple routing-predicate cohort contains 38.3% of current misses and 40.1% of current misses with no isolated T1 winner | Prepare an observer-only implementation against existing traces/solutions; no prune yet |
| 3 | Small residual allocation lane | 122 current misses have an isolated winner: 45 were never offered it and 77 were offered but unresolved | Restrict candidates to evidence-backed missing exposure/participation; require matched work and production exclusivity |
| 4 | Prespecified CP-SAT label acquisition | Existing rescues concentrate in shorter, lower-load native residuals; a simple rule selects 18/26 rescues in 99/725 misses | Validate only on future temporal/new labels; keep CP-SAT research-only |
| 5 | Static topology/placement routing features | Topology adds -0.003 AUC for production failure and only +0.009 for no-T1 residual status | Close the tested bundle as a general selector extension |

## Residual-lane evidence boundary

The current production-boundary join should be treated as a queue of causal questions, not a license for a permanent kitchen-sink tail:

- **Goal-attraction-disabled retry:** ten current production wins exist, including three without another isolated T1 winner (`R02126`, `R02298`, `R02474`), while the retry is starved on 605/725 current misses showing any starvation pattern. Its already-predeclared fresh-pool confirmation remains the cleanest missing-participation test.
- **Non-default admissible ordering:** it contributes 28 current production wins, but all have T1 support and the attempted repricing A/B gave the target stage zero work. The next test must guarantee real target-stage participation before judging the price.
- **Turn-biased repair:** it is the largest named never-offered isolated-winner group (13 levels), but ownership is temporally fragile and prior broad routing evidence does not establish a production gain. It is a candidate for a small residual lane only after a frozen matched-work confirmation.

This ordering preserves the causal work already invested in Workstream 2 and avoids turning isolated winner identity into unpriced production work.

## Joint-obligation propagation handoff

### Hypothesis

Existing bounds model several obligations independently. On levels that simultaneously satisfy intersection-heavy, must-cross-heavy, and multi-portal predicates, a partial path may leave every individual obligation apparently feasible while making their required approach/exit directions jointly incompatible. Detecting that incompatibility earlier could improve both DFS and beam reach without changing the solution set.

### First implementation: observer only

1. Build small connected obligation clusters from must-cross cells, intersection demand, must-pass/turn obligations, and portal endpoints whose relaxed cardinal/portal neighborhoods overlap.
2. For each cluster, enumerate a conservative set of boundary signatures: entry cell/direction, exit cell/direction, remaining horizontal/vertical use at intersection cells, remaining required visits, and portal transition state.
3. Propagate only implications proved in a relaxation of the real puzzle. Unsupported mechanic combinations return `abstain`; a relaxation-feasible state returns `pass`; only a relaxation-infeasible state may become a rejection candidate.
4. In observer mode, log `pass/reject/abstain`, reason family, search depth, incremental work, and whether the existing solver later proves the branch dead or extends it into a referee-valid solution.

Portals must be explicit paired transitions in the relaxation. Flippers, filters, surround, or other unsupported interactions should initially force `abstain`, not an optimistic or pessimistic approximation whose direction is unclear.

### Evidence population

- Primary: existing labelled live/dead branch sets and traces from the 396-level triple-overlap cohort.
- Soundness adversaries: live prefixes from referee-valid production and retained hint solutions.
- Exact counterexamples: the 12 current production-unsolved/no-isolated-T1 levels with retained CP-SAT solutions.
- Controls: matched non-triple levels with similar required path length, constrained-object count, and portal count.

### Promotion gates

The observer earns a pruning pilot only if:

- it rejects zero live prefixes from referee-valid solutions;
- sampled rejections are independently confirmed dead by the existing labelled harness or exact completion check;
- it catches a material number of dead branches before existing prunes, with stable reason families across held-out level IDs;
- observer cost is small relative to saved downstream `workSpent`.

The pruning pilot then needs a frozen equal-work comparison, zero referee-validity/correctness regressions, and solve or work benefit on held-out levels. If the observer rarely fires, fires only after existing bounds, or depends on unsupported-mechanic abstentions across most of the target cohort, close this representation.

## Production boundary

No production solver policy or search semantics changed in this research pass. Each implementation candidate above requires a coding pass and its own validation gate.

