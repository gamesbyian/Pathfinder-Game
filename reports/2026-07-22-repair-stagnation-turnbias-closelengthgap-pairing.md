# Repair-stagnation: pairing turn bias with closeLengthGap (2026-07-22)

## What this is

The experiment the turn-aware-biasing report flagged as "the first combination with a plausible path
to an actual solve": pair turn bias (which drives the must-turn deficit down but stalls at badness
4–5) with `closeLengthGap` (which closes a pure length/intersection gap once structure is cleared).
**Verdict: no-op, and now precisely diagnosed as unfixable by this operator — the residual's
completion lives outside `closeLengthGap`'s searchable region. Net-zero code change (the turn-aware
`closeLengthGap` variant was built, measured, and reverted).**

## First: "both on" was already measured

`closeLengthGap` is default-on, so the earlier turn-bias A/B *already* had both mechanisms active and
still produced no solve. So a real pairing had to change something. The turn-aware-biasing report
identified the target from the residual breakdowns of the turn-bias wins:

| level | turn-bias residual | closeLengthGap status |
|---|---|---|
| R02267 | badness 4 = **len 4**, no structural deficit | fires (`structuralDeficit=0`), exhausts locally, no detour |
| R02077 | badness 5 = **len 4 + one pending must-turn** (`structuralDeficit=1`) | near-miss trigger fires, generic scoring makes the turn unreliably |
| R02279 / R03280 | `structuralDeficit ≥ 2` | never fires |

Only R02077's shape is a candidate for a *turn-aware* `closeLengthGap` (make the turn while closing
length), so that was the experiment: promote the required-turn exit (`preferredTurnExit`) to the
front of `closeLengthGap`'s DFS ordering at a pending must-turn cell.

## Result: no change, and why (instrumented)

Equal-work A/B (3M-node budget, gate 0) with turn-aware `closeLengthGap`: **byte-identical to
takePly-only turn bias** — R02077 still ends at badness 5, no new solves (1/16).

`PF_LENGTH_GAP_DEBUG=1` on R02077 (turn bias on) explains it decisively:

- `closeLengthGap` **fires 1659 times**, on exactly the right residual (`computeBadness=5`,
  `structuralDeficit=1` ⇒ len 4 + one pending must-turn), with the turn-aware ordering active.
- **Every call exhausts its local subtree** (`nodesUsed` 11–2066, `exhausted=true`) without solving.
  The node counts are tiny — the dead-ends land right at the splice floor, so the suffix
  `closeLengthGap` may backtrack (`[floor, deadEnd]`) is nearly empty.

So the turn-aware ordering changes nothing because **the problem was never ordering** — the
turn+length completion is not in the searchable subtree at all. It exhausts a tiny, dead region. The
completion requires restructuring the spliced **prefix** (below the floor), which `closeLengthGap`
structurally cannot touch by design (the floor exists precisely to avoid re-opening the prefix). This
is the append-only / suffix-confinement wall, seen from a third angle (after Stage 3-real's exact-copy
collapse and the descent-phase regression).

## What this rules out, and what it implies

- **Ruled out:** the badness-4-5 turn-bias stall is *not* a local-ordering or budget problem —
  `closeLengthGap` already fires on the right states and exhausts them. More budget, wider slack, or
  turn-aware ordering all search the same exhausted region and cannot help.
- **Implied:** closing these residuals needs an operator that can edit the **prefix**, i.e. exactly
  the reversible prefix-restructuring the append-only search lacks — and Stage 3-real already showed
  exact segment transplantation collapses under state-dependent legality. So bounded local operators
  are the wrong tool for the "make the turn AND hit exact length" residual; it is a global constraint.

## Verification

- `repair-search.test.ts` 32/32 (unchanged — the experiment reverted to net-zero code).
- `tsc`/`eslint` clean. No `solver:bench` needed — no committed code change.

## Recommendation

Stop pairing turn bias with bounded local completion operators — three independent results
(Stage 3-real, the descent-phase regression, this) now point at the same append-only prefix-editing
wall. Turn bias remains the best mechanism *as a bestBadness reducer* and should stay as the base for
a **descent-aware** investigation (shadow-mode logging of what the bias would change on a would-be
improving restart, per the plan's soundness rule 7) — the one avenue not yet shown to hit the wall.
The honest state: the investigation has a genuinely effective bestBadness lever (turn bias) but no
mechanism yet converts the stress-corpus near-misses to solves, because the terminal residual is a
global length↔turn coupling that no bounded local operator built here can satisfy.
