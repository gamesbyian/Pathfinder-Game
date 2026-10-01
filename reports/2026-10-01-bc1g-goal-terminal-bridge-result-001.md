# BC1-G (goal-terminal bridge excursion) result

> **Status:** concluded-negative
> **Last evidence:** 2026-10-01 — corpus-2 witness-replay soundness run plus the frozen Stage-B 24-parent shadow.
> **Decision:** BC1-G is sound on every tested state but adds only 2.7% more first-flag dead roots than BC1 (399 vs 14,974 on the Stage-B 24); at BC1's observed conversion (23 gains per ~15k roots on 300 levels) its expected production effect is below what any affordable A/B can resolve. Not nominated for a production consumer.
> **Remaining gate:** none; reopen only if a materially larger incidence population appears (e.g. portal-heavy regime).
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

## Theorem
Stepping onto the goal early is a reject (`hard-prune-pipeline.ts`), so the goal is terminal and never traversed through. In the graph `G - goal` (single-use transition resources, same multigraph as BC1) the suffix must end at a goal-neighbour. Conflict if (a) a pending mandatory cell is unreachable without passing through the goal, or (b) the bridges of `G - goal` whose far side holds pending cells have no single goal-neighbour inside all of them (including the pending-bearing bridge subtrees being disjoint). BC1 is the special case where a far side contains no goal-neighbour at all, so BC1-G flags a strict superset (e.g. a cycle through the goal with pending cells on both arcs: no bridge in `G`, but `G - goal` is a path).

## Soundness (counterexample-first, existing data)
`scripts/stress/bc1g-witness-soundness.mjs` replays every stored referee-valid hint (up to 4 per level) of all 1,700 corpus-2 levels through the real search state; at every strict prefix passing ordinary connectivity a valid solution exists, so no predicate may flag it. Result: **664,514 states over 6,606 replayed paths, 0 BC1 flags, 0 BC1-G flags** (`reports/stress/bc1g-witness-soundness-corpus2.json`). The Stage-B shadow's own solution-safety alarm: 0/24.

## Incidence and disposition (Stage-B 24 parents, fresh-only + lineage-aware shadow)
BC1 first-flag roots 14,974 (11,588 later-lossy-cull / 3,386 later-deterministic-rejection); BC1-G extra roots **399** (231 / 168), on 12/24 parents, `behaviorIdentical` 24/24. Largest contributors R02851 (215), R00639 (55), R02558 (36).

## Why it stops here
The extra roots are 2.7% of BC1's; BC1's measured production effect (~+19 net solves per 300 levels) came from ~15k roots, and the 300-level A/B already shows a perturbation loss floor of ~4-5 levels per 300, so a BC1-G A/B would need many thousands of levels to resolve a plausible +1. Code is retained as research-only (`bc1HasConflictFast(..., goalTerminal)`, `bc1gShadow` observer option, witness-soundness harness) because it is sound and reusable for a future regime-specific incidence question; no production consumer, no default change.

## Multi-portal follow-up (regime-specific incidence)
The 12 multi-portal levels among the 75 main-unsolved random-300 ids (same shadow settings, width 500, 3M nodes): BC1 first-flag roots **6263**, BC1-G extra roots **277** (4/12 parents; R02633 alone has 160 of them), 0 safety alarms, behaviorIdentical 12/12. The one-parent concentration is a sampling accident, not a regime-wide effect, so the "reopen for portal-heavy regime" condition above is not met by this population either.
