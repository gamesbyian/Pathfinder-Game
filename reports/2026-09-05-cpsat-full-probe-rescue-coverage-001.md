# The exact CP-SAT reference solver rescues a small, concrete set of native-residual levels

> **Status:** concluded-positive observation / **isolated-no-winner cohort quarantined for integrity repair**
> **Last evidence:** 2026-09-06 — audit found the reported isolated-no-winner count and printed ID list are internally inconsistent; see `2026-09-06-cpsat-rescue-cohort-integrity-audit-001.md`.
> **Decision:** retain the descriptive conclusion that stored `cpsat-full-probe` provenance contains useful native-residual rescues, but do not use the reported 13-level isolated-no-winner cohort for selector/modeling work until it is deterministically regenerated. The separately reported production-unsolved cohort must also be count/list verified before modeling.
> **Remaining gate:** regenerate the rescue cohorts from current capability data plus referee-valid hint provenance with explicit uniqueness/count/predicate assertions; then resume any structural characterization.
> **Evidence role:** discovery with a later result-integrity defect in the small-cohort enumeration
> **Selection:** whole corpus2 population (1,700 levels), not a sample

## Integrity warning

The original analysis reported `isolated_no_winner_cpsat_count = 13` and described 13 distinct IDs, but the printed list contains 15 entries and 14 unique IDs:

`R00044, R00537, R00860, R00860, R02059, R02194, R02452, R02464, R02474, R02718, R02862, R03092, R03115, R03201, R00720`

`R00860` is duplicated, but deduplicating that entry still leaves 14 unique IDs. A targeted recheck shows `R00720` is not an obvious stray: current capability data marks it `productionSolved:false` and `isolatedOracleSolved:false`, and its retained hint provenance contains referee-accepted `cpsat-full-probe` solutions. The correct isolated-no-winner membership/count therefore cannot be recovered by casually deleting the suspicious-looking tail entry.

Do **not** silently reinterpret the old count as 14. The exact membership is unresolved until the join is regenerated with assertions. See `2026-09-06-cpsat-rescue-cohort-integrity-audit-001.md` for the repair contract.

## Original method and descriptive result

For each of the 1,700 hint files, the original pass checked whether any stored hint's `provenance[0].solver.technique` equals `cpsat-full-probe` (an exact/reference solver distinct from the heuristic T1 census menu), then joined the resulting level-id set against current-at-the-time `isolatedOracleSolved` and `productionSolved` values.

The original aggregate output was:

| | originally reported count | current status |
|---|---:|---|
| levels with any `cpsat-full-probe` hint | 280 / 1,700 (16.5%) | descriptive result retained; regenerate before downstream modeling |
| also `isolatedOracleSolved===false` | 13 / 646 (2.0%) | **quarantined: count conflicts with printed membership** |
| also `productionSolved===false` | 45 / 888 (5.1%) | not contradicted by this audit, but count/list integrity must be independently verified before modeling |

## Interpretation that survives the audit

There is still a useful Workstream 5 premise here: exact/reference provenance contains already-computed solutions for some levels that remain residual under current native evidence. That makes the hint stash a potentially cheap source of labels/counterexamples without immediately commissioning new CP-SAT runs.

What no longer survives is treating the hand-reported 13-row isolated-no-winner cohort as a trustworthy analysis population. Because the proposed follow-up uses a very small positive class, a one-row membership error is decision-bearing. The cohort must be mechanically regenerated first.

This still does not justify building CP-SAT infrastructure into production. Any production-facing question would require its own bounded cost, legality, and confirmation contract.

## What this does not establish

- It does not establish whether the correct isolated-no-winner rescue cardinality is 13, 14, or another value after a clean current join.
- It does not independently validate the reported 45 production-unsolved membership/count.
- It does not characterize what makes CP-SAT-rescued residual levels structurally different from controls.
- It does not turn an exact-solver rescue into evidence that the native solver can rediscover the path.
- It does not authorize new exact-search compute; the immediate repair uses existing repository data only.
