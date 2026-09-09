# Joint-obligation propagation and residual-lane handoff 001

> **Status:** active / downstream of portal-restoration tranche
> **Last evidence:** 2026-09-09 — portal-carveout audit supplied a cheaper mechanism-level explanation for much of the target cohort
> **Decision:** keep using existing evidence to discriminate allocation failure from missing constraint reasoning inside the intersection + must-cross + multi-portal cohort, but do not implement new joint-obligation propagation until the portal capability restorations are tested and the production boundary is refreshed. If a recurring reasoning/representation residue survives that refresh, begin with observer-only joint-obligation propagation. Keep any residual allocation lane small, explicitly priced, and downstream of portal restoration plus the bounded Workstream-2 repricing decisions.
> **Remaining gate:** complete cheap existing-data joins where useful; after portal restoration, refresh the target cohort and classify each remaining informative miss as allocation/exposure, search-policy, or reasoning/representation.

## Why this cohort is worth mechanism analysis

The 396 levels simultaneously matching the intersection-heavy, must-cross-heavy, and multi-portal predicates contain 278/725 current production misses and 242/604 current misses without an isolated T1 winner. Their production solve rate is 29.8%, versus 73.1% for intersection + must-cross without multi-portal. The effect is stable across even/odd ID halves.

That concentration establishes a high-yield investigation population. It does not identify whether the cause is missing exposure, insufficient work, beam retention, repair policy, or a missing logical bound. The later portal-carveout audit adds a concrete prior cause: four production mechanisms are disabled on all portal-bearing levels, including coarse-state merge, connectivity volume pruning, and must-cross neighbour-budget propagation. Portal-bearing levels contain 551/725 current misses and 464/604 misses without an isolated winner. Resolve those existing capability exclusions before calling the residual cohort a new reasoning problem.

The immediate must-cross portal-restoration population provides a particularly clean intervention on this question. All 396 triple-overlap levels are inside the 530-level portal+must-cross population, so the risk cohort is 74.7% of that treatment population. It contains 278/337 (82.5%) of the portal+must-cross misses and 242/288 (84.0%) of its misses without an isolated T1 winner. The 134 portal+must-cross levels outside the triple cohort contain only 59 misses and 46 no-isolated-winner misses. Therefore the first matched-work neighbour-budget restoration A/B is not merely adjacent solver work: its per-level gains/losses are direct causal evidence about how much of the triple-overlap risk remains after restoring an existing mechanism.

## Required evidence join before implementation

For the triple-overlap cohort and matched controls, join:

1. production lifecycle reach, nonzero stage work, exhaustion, and terminal reason;
2. isolated T1 capability and winning technique/configuration;
3. retained hint paths, solver provenance, and solution fingerprints;
4. available branch/live-prefix labels and prune traces;
5. variant-parent relationships where they provide within-family controls;
6. portal-carveout exposure/restoration status so misses attributable to disabled existing mechanisms are separated from genuinely unexplained failures.

Classify each informative miss into one of three evidence roles:

- **allocation/exposure:** a known winner was absent, starved, or capped near a demonstrated success;
- **search-policy:** the action ran with material work but lost a viable lineage through ordering, retention, or restart behavior;
- **reasoning/representation:** no known native action succeeds, while valid exact/hint paths or dead-branch labels expose recurring joint constraints.

Cheap joins may proceed in parallel with restoration experiments, but do not begin propagation implementation merely because a level belongs to the high-risk cohort. Recompute the classifications after material portal restorations land. The observer earns implementation only when the refreshed reasoning/representation class contains a recurring, expressible failure family.

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

The current production-boundary join contains 122 misses with an isolated winner: 45 were never offered that winner and 77 were offered it but remained unresolved. Treat these as separate causal populations, but recompute the counts after portal restoration rather than carrying them forward as a post-restoration fact.

- **Goal-attraction-disabled retry:** ten current production wins exist, including three without another isolated T1 winner (`R02126`, `R02298`, `R02474`), while the retry is starved on 605/725 current misses showing any starvation pattern. Its predeclared fresh-pool confirmation remains the cleanest missing-participation test.
- **Non-default admissible ordering:** it contributes 28 current production wins, but all have T1 support and the attempted repricing A/B gave the target stage zero work. Any follow-up must guarantee real target-stage participation.
- **Turn-biased repair:** it is the largest named never-offered isolated-winner group (13 levels), but ownership is temporally fragile and broad routing evidence has not shown production benefit. Test it only as a frozen, matched-work residual-lane candidate.

Any lane must have an explicit total-work price, protected specialist coverage, and production-exclusive gain accounting. Isolated winner identity alone does not justify permanent tail work.

## Production boundary

No production search, routing, or pruning behavior is authorized by this report. Portal capability restoration is first in execution order, followed by the bounded Workstream-2 closeouts and a refreshed production/capability boundary. This handoff defines the cheapest existing-data and observer gates for the capability-development question that remains afterward.
