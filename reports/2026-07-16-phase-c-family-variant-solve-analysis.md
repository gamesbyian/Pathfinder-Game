# Phase C: solving Phase B's denser family/variant sets (2026-07-16)

> **Status:** superseded
> **Last evidence:** 2026-09-14 — historical claim-lineage audit narrowed the causal interpretation of perturbation robustness
> **Decision:** retain `fragile` / `robust` only as descriptive perturbation-response labels under this tested family/solver/budget. Do not infer intrinsic combinatorial hardness or a specific missing capability from sibling/technique resistance alone; later ablations also supersede the suggestion to temper `SCORE_INTERSECTION_SETUP`.
> **Remaining gate:** see [`2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](2026-08-08-symmetry-orientation-sensitivity-synthesis.md) and [`2026-09-14-historical-claim-lineage-audit-001.md`](2026-09-14-historical-claim-lineage-audit-001.md)

## Setup

Solved all 477 Phase B variants (11 seeds × {8 symmetry, 10 local-mutant, 10 swap, 8
constrained-shuffle, ~9 re-embed} — generation is described here from memory; no
`reports/2026-07-16-phase-b-*` file exists in the repository, so this reference is dangling and
the generation parameters above are this report's only surviving record of it) at a 20s
wall-clock budget with `--repair-budget-fraction=0` (the solver-testing policy established this
session — see `docs/solver-architecture.md`'s repair-budget-fraction policy note), matching the
practical ~20-30s tolerance this whole investigation is scoped around, not "does it eventually
solve."

**Result: 120/477 solved (25.2%).**

## Per-seed, per-mutation-type solvability

| Seed | Symmetry (/7) | Local-mutant (/10) | Swap (/10) | Constrained-shuffle (/8) | Re-embed (/~10) |
| --- | ---: | ---: | ---: | ---: | ---: |
| R02248 | 3 | 9 | 9 | 8 | 6 |
| R02795 | 5 | 6 | 7 | 1 | 0 |
| R00156 | 4 | 2 | 1 | 0 | 9 |
| R02960 | 4 | 1 | 0 | 2 | 5 |
| R01465 | 2 | 3 | 0 | 3 | 4 |
| R00059 | 0 | 0 | 0 | 3 | 4 |
| R02452 | 2 | 1 | 1 | 1 | 0 |
| R00548 | 2 | 2 | 1 | 2 | 1 |
| R02239 | 2 | 3 | 0 | 0 | 0 |
| R02579 | 0 | 1 | 0 | 0 | 0 |
| **R00440** | **0** | **0** | **0** | **0** | **0** |

## The finding: `dfs-plain` contains different perturbation-response phenotypes

The 11 selected seeds split sharply by how they respond to the tested perturbations, not by badness or archetype:

- **Fragile** (R02248 above all, also R02795/R00156/R02960 to lesser degrees): a large fraction of
  perturbation types — symmetry, local-mutant, swap, shuffle, re-embed — flip the tested sibling
  solvable. R02248 solved in 35/45 of its own variants (78%) across every mutation type tried. This
  matches its already-documented diagnosis (`reports/2026-07-16-r02248-orientation-scoring-
  interaction.md`): on that worked case, a narrow scoring-term × structure interaction is visible
  under direct ablation.
- **Robust to this intervention set** (R00440 above all, also R02579 and to a lesser extent
  R02239/R02452/R00059): little to no tested perturbation helps. **R00440 solved in 0 of 45 variants
  across all 5 mutation types** and R02579 solved in only 1/45. Their variants also exercise a wide
  spread of attempt profiles/techniques and badness values. That is useful evidence that these
  parents resist this particular perturbation/search menu, but it does **not** establish intrinsic
  combinatorial hardness, independence among techniques, or which missing capability would solve
  them.

## Reading

This directly answers the practical question this investigation started from: the selected
`dfs-plain` cases are not one homogeneous intervention target. The **fragile subgroup** is useful
discovery material for scoring/search-diversity mechanisms because small controlled changes often
produce solve-status cliffs. The **robust subgroup** is useful as a contrasting perturbation-response
phenotype, but its cause remains unknown. Forty-five correlated siblings from one parent are not 45
independent causal demonstrations, generated siblings are conditioned on the family producer's
eligibility/witness/validation rules, and multiple solver profiles can share representation,
ordering, scoring, pruning, or predecessor-state limitations.

**Later Phase D evidence supersedes the term-specific suggestion:** five selected fragile families
implicated different primary navigation/attraction terms, so the useful general question became
bounded search diversity rather than globally tempering `SCORE_INTERSECTION_SETUP`. The 2026-09-14
claim-lineage audit further narrows the old robust interpretation: resistance here nominates cases
for a changed-premise capability study only if a live question needs them; it is not evidence that
nothing short of exhaustive search can crack the parent.

## Caveats

- n=11 seeds, not a statistically rigorous sample of `dfs-plain`'s 843 levels — this is a first,
  informative pass, not a corpus-wide claim about what fraction is fragile vs. robust.
- family rows are correlated; the parent is the independent unit for cross-parent generalization.
- "Fragile" means some tested perturbation-induced structural change breaks the observed solver
  difficulty, not that the parent itself has a known fix. R02795/R00156/R02960 required separate
  ablation work rather than inheriting R02248's mechanism.
- "Robust" means resistance to the tested generated intervention set under this solver/budget. It
  does not mean intrinsic hardness or absence of a compact untested capability.
- Symmetry variants are the cleanest signal (a small, exhaustive, structure-preserving set — 7 per
  seed) since they change nothing about the puzzle's actual constraints, only orientation; the other
  modes introduce real puzzle-content changes (different mustCross/block placement etc.), so a solve
  there confirms perturbation *can* help but conflates orientation sensitivity with broader
  structural sensitivity.
