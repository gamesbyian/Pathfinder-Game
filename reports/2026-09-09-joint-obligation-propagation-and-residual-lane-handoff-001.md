# Joint-obligation propagation and residual-lane handoff 001

> **Status:** implementation handoff; coding and causal validation remain unstarted
> **Last evidence:** 2026-09-09
> **Decision:** use existing evidence to discriminate allocation failure from missing constraint reasoning inside the intersection + must-cross + multi-portal cohort. If trace evidence supports the latter, begin with observer-only joint-obligation propagation. Keep any residual allocation lane small, explicitly priced, and downstream of the current Workstream-2 repricing decisions.

## Why this cohort is worth mechanism analysis

The 396 levels simultaneously matching the intersection-heavy, must-cross-heavy, and multi-portal predicates contain 278/725 current production misses and 242/604 current misses without an isolated T1 winner. Their production solve rate is 29.8%, versus 73.1% for intersection + must-cross without multi-portal. The effect is stable across even/odd ID halves.

That concentration establishes a high-yield investigation population. It does not identify whether the cause is missing exposure, insufficient work, beam retention, repair policy, or a missing logical bound.

## Required evidence join before implementation

For the triple-overlap cohort and matched controls, join:

1. production lifecycle reach, nonzero stage work, exhaustion, and terminal reason;
2. isolated T1 capability and winning technique/configuration;
3. retained hint paths, solver provenance, and solution fingerprints;
4. available branch/live-prefix labels and prune traces;
5. variant-parent relationships where they provide within-family controls.

Classify each informative miss into one of three evidence roles:

- **allocation/exposure:** a known winner was absent, starved, or capped near a demonstrated success;
- **search-policy:** the action ran with material work but lost a viable lineage through ordering, retention, or restart behavior;
- **reasoning/representation:** no known native action succeeds, while valid exact/hint paths or dead-branch labels expose recurring joint constraints.

Do not begin the propagation implementation merely because a level belongs to the high-risk cohort. It earns implementation when the reasoning/representation class contains a recurring, expressible failure family.

## Observer-only joint-obligation candidate

### Hypothesis

Existing bounds model several obligations independently. A partial path may leave intersection demand, must-cross approach directions, and portal transitions individually feasible while making their joint boundary requirements incompatible. Detecting that incompatibility earlier could improve DFS and beam reach without changing the solution set.

### Initial representation

1. Build small connected obligation clusters from must-cross cells, intersection demand, must-pass/turn obligations, and portal endpoints whose relaxed cardinal/portal neighborhoods overlap.
2. Enumerate conservative boundary signatures: entry cell/direction, exit cell/direction, remaining horizontal/vertical use at intersection cells, remaining required visits, and portal-transition state.
3. Propagate only implications proved in a relaxation of the actual puzzle. Unsupported mechanic combinations return `abstain`; a relaxation-feasible state returns `pass`; only a relaxation-infeasible state becomes a rejection candidate.
4. In observer mode, log `pass/reject/abstain`, reason family, search depth, incremental work, and whether the existing solver later proves the branch dead or extends it into a referee-valid solution.

Portals must be explicit paired transitions. Flippers, filters, surround, adjacent-turn, or other unsupported interactions initially force `abstain` when their omission would make the relaxation direction unclear.

### Evidence population

- Primary: existing labelled live/dead branches and traces from the triple-overlap cohort.
- Soundness adversaries: live prefixes from referee-valid production and retained hint solutions.
- Exact counterexamples: the 12 current production-unsolved/no-isolated-T1 levels with retained CP-SAT solutions.
- Controls: non-triple levels matched on required path length, constrained-object count, and portal count.

### Promotion gates

The observer earns a pruning pilot only if it rejects zero live prefixes, its sampled rejections are independently confirmed dead, it catches material dead work before existing prunes across held-out level IDs, and its own cost is small relative to avoided `workSpent`.

The pruning pilot then requires a frozen equal-work comparison, zero referee/correctness regressions, and solve-count or work benefit on held-out levels. Close the representation if it rarely fires, fires only after current bounds, or abstains across most of the target cohort.

## Residual allocation lane

The current production-boundary join contains 122 misses with an isolated winner: 45 were never offered that winner and 77 were offered it but remained unresolved. Treat these as separate causal populations.

- **Goal-attraction-disabled retry:** ten current production wins exist, including three without another isolated T1 winner (`R02126`, `R02298`, `R02474`), while the retry is starved on 605/725 current misses showing any starvation pattern. Its predeclared fresh-pool confirmation remains the cleanest missing-participation test.
- **Non-default admissible ordering:** it contributes 28 current production wins, but all have T1 support and the attempted repricing A/B gave the target stage zero work. Any follow-up must guarantee real target-stage participation.
- **Turn-biased repair:** it is the largest named never-offered isolated-winner group (13 levels), but ownership is temporally fragile and broad routing evidence has not shown production benefit. Test it only as a frozen, matched-work residual-lane candidate.

Any lane must have an explicit total-work price, protected specialist coverage, and production-exclusive gain accounting. Isolated winner identity alone does not justify permanent tail work.

## Production boundary

No production search, routing, or pruning behavior is authorized by this report. Workstream 2 repricing remains first in execution order; this handoff defines the cheapest evidence and observer gates for the next capability-development question.

