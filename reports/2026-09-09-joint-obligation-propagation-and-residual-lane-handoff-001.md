# Joint-obligation propagation and residual-lane handoff 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — the observer-only joint-obligation propagation pilot this report scoped is now implemented and validated: [`2026-09-11-joint-obligation-propagation-observer-pilot-001.md`](2026-09-11-joint-obligation-propagation-observer-pilot-001.md). Its first concrete obligation-cluster kind (must-cross forced-neighbor x portal terminal) is sound (zero false rejects across the oracle-labelled atlas, a full 3-corpus known-solution replay, and a real-search run over the class-4/class-5 opportunity population), catches material dead work the existing gauntlet misses, and shows a depth-confound-controlled differential (1.6x median reject rate) enriched in class 5 over the class-4 near-control PR #1716/#1717 required.
> **Decision:** all four of this report's own observer promotion gates are met. Promote to the next gate: implement the actual hard-prune behind a new opt-in ablation flag and run a frozen matched-work A/B, following `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`'s own promotion path. The residual allocation lane stays small and explicitly priced, as originally scoped.
> **Remaining gate:** the pruning-pilot promotion A/B (population, work envelope, and stop rules per the pilot report's "Next gate" section) — not yet run.

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

**Recomputed 2026-09-11 at the current 671-miss boundary** (the post-1,029 residual atlas; do not carry forward the old 725-boundary 122/45/77 figures — they are historical sizing only). Misses with a base-T1 isolated winner: **83/671** (classes 1-3 of the atlas), split as **26 never offered** (atlas class 1), **21 offered but not reached or materially starved** (class 2), and **36 offered/reached with comparable work but still failed** (class 3). This is a materially smaller allocation-adjacent population than the old 725-boundary figure, both in absolute count and as a share of the residual (83/671 = 12.4% vs. the prior 122/725 = 16.8%) — consistent with the portal restorations having disproportionately closed exactly this kind of exposure gap. The atlas's own class-1 detail names the two recurring never-offered configs (`beam|score=intersectionHarvest|...|width=5000|retention=mechanic-buckets` and the `objectiveFirst` sibling); see `2026-09-11-post-1029-residual-atlas-001.md` for the full per-level breakdown.

- **Goal-attraction-disabled retry:** still exposed at only 120/671 (still-flat reach count post its own fresh-pool fix; see the WS1 exposure classification's "notable non-finding"). Its predeclared fresh-pool confirmation already promoted; no further action queued here.
- **Non-default admissible ordering:** the atlas's class-2/3 detail shows both repair and admissible-order retry tiers reaching comparable work and still failing on the bulk of the 57 offered-adjacent misses — allocation alone is not the story for this tier; see the atlas report's gate-3 discussion.
- **Turn-biased repair (`must-turn-biased`):** still a real, if now smaller, never-offered-adjacent contributor inside the atlas's class-3 breakdown (`repair|score=repair|guidance=must-turn-biased` appears repeatedly as the "reached, comparable work, still failed" config, not as a never-offered case at the current boundary).

Any lane must have an explicit total-work price, protected specialist coverage, and production-exclusive gain accounting. Isolated winner identity alone does not justify permanent tail work. Given the atlas found allocation/exposure a minority failure mode overall (57/671, 8.5%, combining classes 2+3), this lane remains a small, bounded candidate — not the primary next gate, which per the atlas's dominant no-known-rescuer class (388/671, 57.8%) is the observer-only joint-obligation propagation pilot above.

## Production boundary

No production search, routing, or pruning behavior is authorized by this report. Portal capability restoration is first in execution order, followed by the bounded Workstream-2 closeouts and a refreshed production/capability boundary. This handoff defines the cheapest existing-data and observer gates for the capability-development question that remains afterward.
