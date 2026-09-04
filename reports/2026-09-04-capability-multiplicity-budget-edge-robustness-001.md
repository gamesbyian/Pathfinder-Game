# Capability multiplicity predicts budget-edge robustness too

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — direct computation over `reports/stress/technique-niches/2026-09-03/level-capability.json`'s 1,316 oracle-solved levels with a recorded `cheapestObservedSolveNodes`, against the census's own uniform 50,000,000-node per-cell budget (`combined-cells.json`'s `nodeBudget` field), no new dispatch
> **Decision:** a level's `solverCount` (how many distinct techniques solve it) monotonically and strongly predicts how much margin its cheapest known solve has under the census node budget. Median cheapest-solve-as-fraction-of-cap falls from **2.22% at singleton down to 0.10% at solverCount 11+ — a 22x range** — and the fraction of levels whose only/cheapest known solve consumes over half the budget falls from **15.4% (singleton) to 0.0%** by solverCount 6+. This closes the "budget-edge robustness" clause of `solver-future-work.md`'s deferred multiplicity bullet, alongside `2026-09-04-capability-multiplicity-temporal-robustness-001.md`'s closure of the temporal clause.
> **Remaining gate:** none for the budget-edge clause. Only the variant-family clause of the same bullet remains genuinely untested (the current census carries no `familyId`/`parentId` data — see that report's own caveat).
> **Evidence role:** discovery — the question was named in advance by `solver-future-work.md`; the specific bucketing was chosen after inspecting the data
> **Selection:** whole population of oracle-solved comparable levels (1,316), not a drawn sample

## Method

`reports/stress/technique-census/33717910218/combined-cells.json` records a uniform `nodeBudget: 50000000` per T1 census cell. `level-capability.json` already carries each solved level's `cheapestObservedSolveNodes` (the lowest node count any technique needed to solve it) and `solverCount`. Computed `cheapestObservedSolveNodes / 50,000,000` per level and bucketed by `solverCount`.

## Result

| `solverCount` | n | median frac-of-cap | p90 frac-of-cap | % using >50% of cap | % using >90% of cap |
|---:|---:|---:|---:|---:|---:|
| 1 (singleton) | 175 | 2.22% | 62.47% | **15.4%** | 1.1% |
| 2 (doubleton) | 94 | 0.84% | 27.96% | 3.2% | 0.0% |
| 3-5 | 213 | 0.44% | 9.52% | 1.9% | 0.0% |
| 6-10 | 195 | 0.29% | 0.82% | 0.0% | 0.0% |
| 11+ | 639 | 0.10% | 0.37% | 0.3% | 0.0% |

## Interpretation

This is a distinct fragility axis from the already-established temporal one, and it points the same direction: singleton-solved levels are not just at risk from solver-code drift, a meaningful fraction of them (15.4%) are also intrinsically close to the census's own budget ceiling — a smaller work/node envelope than the one used to build the current capability map would plausibly have missed them even with *no* code change at all. Levels solved by many techniques essentially never sit anywhere near the ceiling (11+ multiplicity: p90 is 0.37% of cap). Both fragility modes share the same underlying cause: a singleton level's entire "in the capability map" status rests on one technique's one observed solve, with no redundancy against either a revised solver or a smaller budget.

## Caveats

- This measures margin under the **census's own** 50M-node budget, not the budget any particular production/research caller actually uses — a caller with a materially different budget would see a different absolute frontier, though the *relative* multiplicity-vs-margin relationship should hold directionally regardless of the specific ceiling.
- `cheapestObservedSolveNodes` reflects whichever technique happened to solve it cheapest in this specific census run; it is not necessarily the same technique across census refreshes (see the companion temporal-robustness report's technique-identity-retention finding).
- Single census snapshot; not independently replicated against a second one.

## Recommended change to `solver-future-work.md`

Same as the temporal-robustness report's own recommendation: the budget-edge clause of the multiplicity bullet is now answered and should be removed from the deferred list, leaving only the variant-family clause open.
