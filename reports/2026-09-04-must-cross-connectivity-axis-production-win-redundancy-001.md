# must-cross-neighbor / connectivity-axis retry tiers: most real production wins DO have an isolated alternative

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — join of `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level `winningTechnique` against `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `solvingActions`, no new dispatch
> **Decision:** companion to `2026-09-04-admissible-order-alternate-tiebreak-retry-production-win-redundancy-001.md`, same method, for the two tiers `2026-09-04-whole-ladder-retry-tier-dfs-monopolization-forensic-note-001.md` already forensically audited. `must-cross-neighbor-prune-disabled-retry` wins **9/975** production solves; **6/9 (67%)** of those levels also have an isolated-census winner. `connectivity-axis-prune-disabled-retry` wins **6/975**; **4/6 (67%)** also have an isolated winner. Both tiers show the same roughly-two-thirds-redundant / one-third-genuinely-unique split, materially lower confirmed-redundancy than `admissible-order-alternate-tiebreak-retry`'s 100%.
> **Remaining gate:** none. These are characterization, not a repricing recommendation — neither tier is currently a live confirmation target the way `admissible-order-alternate-tiebreak-retry` is.
> **Evidence role:** discovery — exploratory join of two already-collected artifacts
> **Selection:** whole win population for each stage (9 and 6 levels respectively), not a drawn sample

## Result

| stage | real production wins (of 975 solves) | has isolated-census winner | no isolated winner (genuinely unique) |
|---|---:|---:|---:|
| `must-cross-neighbor-prune-disabled-retry` | 9 | 6 (67%) | **3 (33%)**: `R02783`, `R02858`, `R03361` |
| `connectivity-axis-prune-disabled-retry` | 6 | 4 (67%) | **2 (33%)**: `R00635`, `R02690` |

(`R02690` is the same level `2026-09-04-production-solved-no-isolated-winner-35-cohort-anatomy.md` and its independent chatgpt-branch counterpart already found and attributed to `connectivity-axis-prune-disabled-retry` — this join reproduces that specific case rather than contradicting it, a small consistency check between two independently-built analyses this session.)

## Interpretation

Both tiers show a materially *lower* redundancy rate (67% have an alternative) than `admissible-order-alternate-tiebreak-retry`'s 100% — meaning a full third of their real production wins are levels the isolated T1 census cannot currently explain any other way. This is a meaningfully stronger rare-capability signal for these two tiers than for the admissible-order tier at this same scale, worth weighing if either tier is ever considered for its own repricing pass — the "material cost makes it a scheduler tail-audit candidate" framing this session's earlier forensic note already closed as a DFS-monopolization non-lever still leaves the tiers' own *retention* question separately answered here: yes, keep them, with real (if small, ~0.6-0.9% of all solves) unique value each.

## What this does not establish

- Same caveats as the companion admissible-order report: "has an isolated winner" does not mean production's actual earlier attempt would have found it with its real dose/context; single production run; stage-level not sub-action-level attribution.
