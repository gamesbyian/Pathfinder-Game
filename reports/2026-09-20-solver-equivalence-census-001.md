# Solver exact/symmetry equivalence census 001

> **Status:** partial but decision-relevant negative; Corpus 2 pending execution.
> **Date:** 2026-09-20
> **Parent plan:** [`../docs/solver-batch-digestion-architecture-audit-plan.md`](../docs/solver-batch-digestion-architecture-audit-plan.md)
> **Evidence role:** solve-less opportunity census.
> **Population:** complete committed published corpus (160) + complete Corpus 1 (102), 262 rows total.
> **Decision:** no exact/symmetry canonicalization implementation is earned from these populations.

## Question

Are independently stored Pathfinder levels duplicated exactly, or equivalent under the exact 8-way
rotation/reflection semantics already used by the editor/runtime/family generator, often enough that
the solver could solve one representative and transform the solution back?

Generated family datasets were deliberately excluded. Their symmetry siblings exist by construction
and would inflate this opportunity mechanically.

## Method

The census reproduced the current v2 level-fingerprint semantics:

- grid dimensions;
- reqLen / reqInt;
- gates / goal / false goals;
- blocks, excluding landmark-derived blockers;
- must-pass, excluding landmark-derived must-pass cells;
- must-cross;
- filters / flipping filters with axis semantics;
- portals as unordered endpoint pairs;
- geese;
- normalized landmark role + turn semantics.

For symmetry identity, each raw level was transformed through all 8 orientations using the same
coordinate, filter-axis, and turn-chirality rules as `modules/domain/geometry.ts`. The canonical
symmetry key was the lexicographically smallest v2 fingerprint payload.

The two complete corpora were loaded directly from current `main`:

- `data/levels.json`: 160 levels;
- `data/stress/stress-levels.json`: 102 levels.

The connector does not expose the large `stress-levels-random.json` body, so Corpus 2 is not
included in this result.

## Result

| Metric | Result |
|---|---:|
| rows | 262 |
| exact duplicate groups | **0** |
| exact rows avoidable after one representative | **0** |
| strict symmetry-equivalent groups beyond exact identity | **0** |
| additional rows avoidable by symmetry after exact dedup | **0** |

There were no examples to inspect because no collision occurred.

## Interpretation

This is a clean negative for the strongest cheap form of “solve less” on these two natural/committed
populations.

It says:

- the published corpus is not carrying accidental semantic duplicate levels;
- Corpus 1 is not carrying accidental semantic duplicate levels;
- the union of those populations does not contain cross-corpus duplicates;
- exact board symmetry does not collapse any pair either.

So an exact canonicalization layer would currently add identity/transform machinery while saving
**zero solves** on these 262 levels.

That does **not** prove Corpus 2 has zero opportunity. The larger generated random corpus could have
collisions that these populations do not. But the prior is now materially lower: canonicalization is
not a general property of the current level populations.

## Relationship to generated family symmetry

The repository contains many explicit symmetry family datasets. Those are a different use case:

- their equivalence is known by provenance rather than discovered by canonicalization;
- transformed witnesses already exist by generation contract;
- using them as evidence that natural corpora need symmetry dedup would be circular.

If a family-processing workflow wants to avoid recomputing known symmetry siblings operationally,
it should consume family provenance directly rather than globally canonicalizing every level.

## Disposition

- **Global exact-dedup layer:** not earned.
- **Global symmetry canonicalizer:** not earned from published + Corpus 1.
- **Corpus 2 census:** remains open because the large corpus must run on an execution surface.
- **Family-specific symmetry reuse:** separate provenance-driven lane; do not conflate it with
  natural-corpus duplicate elimination.

The instrumentation remains in `scripts/solver-equivalence-opportunity-census.mjs` for the pending
Corpus-2 completion.
