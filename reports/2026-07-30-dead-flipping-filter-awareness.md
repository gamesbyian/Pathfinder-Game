# Dead flipping filters: connectivity awareness shipped, move-gen exclusion refuted (2026-07-30)

> **Status:** concluded-positive
> **Last evidence:** 2026-07-30 — published, corpus-1, and partial corpus-2 A/Bs
> **Decision:** keep connectivity marking; do not exclude dead flippers from move generation or
> tighten distance maps without new profiling evidence
> **Remaining gate:** none

A flipping filter with **neither axis geometrically traversable** can be entered but never left, so
it can never appear in a valid solution. This writeup records the derivation, why it is
orientation-independent (the non-obvious part), how common such cells are, and the measurement that
split the idea into a half worth shipping and a half worth *not* shipping.

Shipped on branch `claude/solver-hot-path-perf-28rbq1`.

## The rule

A flipping filter must be crossed **straight through** — entry axis must equal exit axis (no turning
on it, `search-state.ts`'s `isMoveDynamicallyValid`) — and the axis-reuse rule forbids backing out
the way you came. Crossing one therefore requires **both** neighbours on a single axis to be
enterable. A flipper with neither axis available is a dead end, and it can never be the path's
terminus either: one-object-per-cell means it is not the goal, not a gate, and not a portal
destination. Entering one is always fatal.

`prepLevel` (`modules/solver/prep.ts`) computes the set into `prep.deadFlipperKeys`.

### Why this is orientation-independent — the part that is easy to get wrong

A flipper *flips*: it starts on its declared axis and swaps each time the path uses it
(`flipperUsedMask` parity), and **other** flippers' usage changes the global parity picture. So a
flipper can be untraversable in its current orientation and perfectly fine after a flip. Any test
that consults the current axis would therefore be unsound.

The test never does. It is purely geometric:

```ts
if (!(_open(fx - 1, fy) && _open(fx + 1, fy)) && !(_open(fx, fy - 1) && _open(fx, fy + 1)))
```

`_open` is "in bounds and not a block" — no parity, no `flipperUsedMask`, no current axis. Both
axes must fail. A flipper dead in only one orientation fails that `&&` and is deliberately left
alone, because the flip only ever chooses between H and V and one of them is available.

The derivation is also conservative in two further ways, each erring toward marking *fewer* cells:

- Only **blocks** disqualify a neighbour. Geese and false goals are ignored by the solver anyway, and
  a gate can legitimately serve as the entry side (the path starts there).
- A neighbouring flipper counts as **open** even when it is itself momentarily untraversable — that
  is dynamic state, so it is not consulted.

The `&&`-vs-`||` confusion is exactly the failure mode this guards against, and
`prep.test.ts`'s `prepLevel marks only flippers with neither axis traversable as dead` pins it —
mutating the `&&` to `||` fails the test on the "one dead axis is not enough" assertion.

## Prevalence

| corpus | levels w/ flipping filters | levels w/ ≥1 dead flipper | dead cells |
|---|---|---|---|
| published (`data/levels.json`) | 13 | **0** | **0** |
| corpus-1 | 42 | 21 | 29 (3 corner, 26 block-locked) |
| corpus-2 | 957 | 715 | 1,125 (220 corner, 905 block-locked) |

Corner cells are the degenerate case; the large majority are block-locked interior cells.

**The published corpus has zero of these, so `npm run solver:bench -- --check` is structurally blind
to this change** — it passed 160/160 with nodes +0.0% because the code path is inert there. Any
future work on dead flippers must be gated on corpus-1/corpus-2, not the published bench.

## Soundness check against stored solutions

Every stored path in corpus-1 and corpus-2 — 17,398 paths, comprising each level's
`stressMeta.witnessSolution` plus every saved hint — was checked for (a) a visit to a cell this rule
marks dead and (b) a turn taken on any flipper:

```
corpus1: 42 flipper-levels with stored paths, 4,900 paths checked, 16 with >=1 dead flipper
   visits to a would-be-dead flipper: 0   |   turns taken on a flipper: 0
corpus2: 957 flipper-levels with stored paths, 12,498 paths checked, 623 with >=1 dead flipper
   visits to a would-be-dead flipper: 0   |   turns taken on a flipper: 0
```

No accepted solution anywhere depends on traversing a cell this rule excludes.

## The two halves, measured separately

The rule admits two independent applications. Both are sound; only one is worth having.

1. **Connectivity** — mark dead flippers impassable in `reachBlockedArr`, so the `isConnected` flood
   fill and the volume prune stop counting a cell the path can never leave toward the goal.
2. **Move generation** — drop dead flippers from `staticNeighborKeys`, so the search never generates
   a move onto one.

All runs used a pinned `--work-budget` with a non-binding `--budget-ms`, which makes the solve set
and node counts host-independent (`docs/solver-budget-determinism.md`).

### Corpus-1, the 21 affected solver-solved levels

| variant | solved | nodes vs baseline |
|---|---|---|
| baseline | 12/21 | — |
| **connectivity only (shipped)** | **12/21** | **+0.005%** |
| both halves | 11/21 | +11.8% |
| move-gen only | — | loses R01478 on its own |

The "both halves" run lost **R01478**: a 276,195-node solve became a full-budget failure. That one
level accounts for ~16.7M of the 16.8M node delta, so the apparent +11.8% cost is the lost solve,
not a per-node regression.

Isolating the halves on R01478 pinned the cause precisely:

| variant | R01478 |
|---|---|
| baseline | ✓ 276,195 nodes |
| move-gen exclusion only | ✗ timeout |
| connectivity marking only | ✓ 276,114 nodes |

**Move generation is what costs the solve.** The loss is not a soundness bug — R01478's dead cell
(12,2) is visited by none of its 178 stored hints and not by its generator witness. It is pure
search-order perturbation. It is also not budget-recoverable: still failing at 30M, 60M and 120M
work (9× budget, ~440× the nodes it originally needed), and still failing with the extra-budget
passes enabled (`--extras`), which is the configuration the corpus's solved set was built under.

### Corpus-2, the 384 affected solver-solved levels

| variant | solved | nodes |
|---|---|---|
| baseline | 8/384 | 1,255,333,409 |
| **connectivity only (shipped)** | **8/384 (identical set)** | 1,255,330,301 (**−0.0002%**) |

52 of 384 levels show any node change at all; of those, 28 up and 24 down — symmetric noise. The
solved set is the same eight levels: R02028, R02066, R02750, R02964, R03100, R03243, R03248, R03314.

### Gain side: none found

- Corpus-1: the 9 affected levels unsolved at budget stayed unsolved under both variants — 9 chances,
  0 gains.
- Corpus-2: the aggressive both-halves variant was swept over 146 of the 331 affected-and-unsolved
  levels before the run was stopped (it tests a variant not being shipped) — **0 new solves**.
  Baseline over the first 120 of those was likewise 0/120.

**Mechanistically this is unsurprising.** A dead flipper costs the search roughly one wasted node per
entry: step on, find no exit, backtrack. Removing one cell from a 100–225-cell grid is far below the
noise floor of the search-order perturbation that removing it causes. The exclusion is *correct* and
*worthless*, and on corpus-1 it was worse than worthless.

## What shipped

Connectivity marking only. `prep.deadFlipperKeys` is computed and exposed on `PrepLevel`, and its
cells are marked impassable in `reachBlockedArr`. Dead flippers deliberately **remain** in
`staticNeighborKeys`; `prep.ts` carries a comment explaining why, so the move-gen half is not
"finished" later by someone reading the set's existence as an unfinished job.

Verification: `npx tsc --noEmit` clean; `npx vitest run modules/solver/` 271 passed;
`npm run check:lint` clean; `npm run solver:bench -- --check` 160/160, no regressions, nodes +0.0%;
plus the corpus-1 and corpus-2 A/Bs above.

## Non-actions and reopening trigger

- **Distance maps are deliberately unchanged, not unfinished.** `buildDistMap` can still route
  *through* dead flippers, leaving BFS lower bounds one or two steps optimistic nearby. The measured
  connectivity effect was ~0.00%, while move-generation exclusion was net-negative; that evidence
  does not justify another implementation or corpus sweep. Reopen only if a current profile shows
  distance-bound looseness at dead flippers is material on a decision-bearing population.
- **R01478 is a guard, not an open task.** It stays solved on the shipped variant. Re-run it only if
  move-generation exclusion is revived under the profiling trigger above.
