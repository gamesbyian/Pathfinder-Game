# BC1 fresh-only pre-filter result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-30 — same 24 parents, fresh-only vs lineage-only shadow arms.
> **Decision:** the pre-filter "evaluate BC1 only when ordinary connectivity was just computed for the candidate" removes all canonical flood cost (4,534,704 -> 0 units) and 83% of shadow wall time (226.5 s -> 38.5 s) while still covering 86% of dead-lineage candidates. Cheap features (pending count, remaining steps) had no discriminating power (flag rate flat 3-6%), so a schedule-based filter, not a feature filter, is the mechanism. Earns the smallest behavioral consumer at matched work.
> **Remaining gate:** behavioral consumer A/B (see matched-budget A/B result).
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

Frozen Stage-B 24 parents, width 500, 3M nodes, lineage-aware; behaviorIdentical 24/24, safety alarms 0 in both arms.

| Arm | first-flag roots | inherited-dead | clear | skipped | canonical shadow cost | shadow wall |
|---|---:|---:|---:|---:|---:|---:|
| lineage-only (check every live candidate) | 19,427 | 598,767 | 465,019 | 0 | 4,534,704 | 226.5 s |
| fresh-only | 15,091 | 517,871 | 77,519 | 472,732 | 0 | 38.5 s |

Dead-lineage candidates: 618,194 vs 532,962 (86.2% covered). Roots missed at one phase are caught at a later fresh phase (connectivity runs every 8th step or within 20 remaining), so this is mostly delayed detection.

Caveats: wall time includes uncounted Tarjan/graph construction; shadow-only, so real removed work and freed-beam effects are unmeasured; 3/24 parents solved either way.

## Next gate
Opt-in behavioral consumer (prune BC1-flagged candidates at fresh-connectivity phases) A/B at matched node budget on the same 24 parents plus a solved-control set: solves, workSpent, regressions.
