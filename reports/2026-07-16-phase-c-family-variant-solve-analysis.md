# Phase C: solving Phase B's denser family/variant sets (2026-07-16)

> **Status:** superseded
> **Last evidence:** 2026-08-08 — intervention guidance reconciled with Phase D and the current synthesis
> **Decision:** retain the fragile/robust classification, but do not act on this report's suggestion to temper `SCORE_INTERSECTION_SETUP`; later ablations found different rescuing terms across fragile families
> **Remaining gate:** see [`2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](2026-08-08-symmetry-orientation-sensitivity-synthesis.md)

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

## The finding: `dfs-plain` is not one population, it's (at least) two

The 11 seeds split sharply by how they respond to perturbation, not by badness or archetype:

- **Fragile** (R02248 above all, also R02795/R00156/R02960 to lesser degrees): a large fraction of
  *any* perturbation type — symmetry, local-mutant, swap, shuffle, re-embed alike — flips the level
  solvable. R02248 solved in 35/45 of its own variants (78%) across every mutation type tried. This
  matches its already-documented diagnosis (`reports/2026-07-16-r02248-orientation-scoring-
  interaction.md`): a narrow, specific scoring-term × structure interaction, not a deep
  computational wall — nudge the structure almost any way and the interaction breaks.
- **Robust** (R00440 above all, also R02579 and to a lesser extent R02239/R02452/R00059): little to
  no perturbation helps. **R00440 solved in 0 of 45 variants across all 5 mutation types** — every
  symmetry orientation, every single-object relocation, every swap, every reshuffle, every grid
  enlargement stayed unsolved. R02579 solved in only 1/45. Checked whether this is one specific
  technique failing uniformly (which would itself be a fixable, narrow signal): it isn't — R00440's
  variants exercise 10 different attempt profiles/techniques (repair, both beam and DFS variants of
  `intersectionHarvest`/`objectiveFirst`/`mustCrossFirst`/`perimeterSweep`/`harvestThenFinish`) with
  badness ranging 2–108 (median ~44); R02579 exercises 12 techniques with badness 3–42 (median ~24).
  A wide spread of techniques all getting stuck at varying, often-substantial distances is the
  signature of genuine combinatorial hardness — a large, genuinely constrained search space — not a
  single narrow bug a scoring tweak would fix.

## Reading

This directly answers the practical question this whole investigation started from (a solver that
takes minutes isn't worth it if the real target is ~20-30s): the `dfs-plain` cluster isn't a single
target for one fix. The **fragile subgroup** is where a scoring/heuristic change has real leverage —
a small, targeted change (in R02248's case, tempering `SCORE_INTERSECTION_SETUP`'s interaction with
orientation) could plausibly unlock a meaningful slice of currently-unsolved levels within budget,
mirroring how trivially R02248's own variants already flip. The **robust subgroup** (best
represented by R00440, 0/45) is not a good target for a scoring fix — no structural nudge helps, and
many different techniques all fail at different distances, suggesting the puzzle is simply hard at
its core. Any future work aimed at "solve more within a practical budget" should prioritize
diagnosing what's fixable in the fragile group's shared failure shape over trying to force robust-group
levels to solve faster. **Later Phase D evidence supersedes the term-specific suggestion above:**
five fragile families implicated five primary navigation/attraction terms, so the general candidate
is bounded search diversity rather than tempering `SCORE_INTERSECTION_SETUP` globally. The robust
group may be better addressed by accepting the difficulty (or
flagging it for level-design review, since a level nothing short of exhaustive search can crack
within a practical time budget may not be a good level to have shipped in the first place, regardless
of the solver's own limitations).

## Caveats

- n=11 seeds, not a statistically rigorous sample of `dfs-plain`'s 843 levels — this is a first,
  informative pass, not a corpus-wide claim about what fraction is fragile vs. robust.
- "Fragile" here means *some* perturbation-induced structural change breaks the difficulty, not that
  the *parent itself* has a known fix — R02795/R00156/R02960 don't have a documented root-cause
  diagnosis the way R02248 does; that would need the same ablation-sweep treatment R02248/R01465
  already got.
- Symmetry variants are the cleanest signal (a small, exhaustive, structure-preserving set — 7 per
  seed) since they change nothing about the puzzle's actual constraints, only orientation; the other
  modes introduce real puzzle-content changes (different mustCross/block placement etc.), so a solve
  there confirms perturbation *can* help but conflates "orientation sensitivity" with "any structural
  sensitivity."
