# Surround/adjacent-turn dynamic reachability deadlock: sound, fires constantly, no measurable payoff — reverted (2026-08-07)

## Context

Starting from an independent read of `scoring.ts`/`lower-bounds.ts`/`topology.ts`/`prune-gauntlet.ts`
(not `docs/solver-heuristic-capability-gap-analysis.md`'s prose), a real structural asymmetry stood
out: `lower-bounds.ts` has dynamic deadlock checks for exactly two mechanics —
`mustTurnDeadlocked` (a pending must-turn cell with both `edgeUsage` axis bits spent can never be
re-entered) and `mustCrossForcedNeighborDeadlocked` (a pending must-cross cell's still-needed
straight pass requires both of that axis's neighbors to stay enterable). Surround and
adjacent-turn — the codebase's other two "must eventually visit some cell(s)" mechanics — have no
analog. Their own lower bounds (`surroundLowerBound`/`adjTurnLowerBound`) read from
`surroundNeighborDistMaps`/`adjTurnDistMaps`, which are built once at `prepLevel()` time from only
`level.blockSet`/`gooseSet` (confirmed by reading `prep.ts`'s landmark-precomputation block) — they
never see `state.visited`/`edgeUsage`/`flipperUsedMask`, so they can't notice a candidate cell the
path has since walled off *itself*. Worse, `isConnected`'s flood fill — which *does* track dynamic
state — never even asks about surround-neighbor or adjacent-turn candidate cells; its reachability
loop covers only `goalKey`, `mustPassKeys`, and `mustCrossKeys`.

This is a different angle from the two adjacent-turn ideas the roadmap had already falsified
(`reports/2026-07-17-adj-turn-exit-guidance-null-result.md`'s exit-guidance score, and a naive
single-linkage adjacent-turn MST bound measured *looser* than the existing max-of-individual bound)
— neither of those touched dynamic reachability at all.

## The derivation

`isConnected` (`topology.ts`) already computes a full dynamic flood fill from `pos` every time it
runs, and already asks that same fill "is `X` reached?" for `goalKey`/`mustPassKeys`/`mustCrossKeys`
via the module-private `_reached()` helper. Extending it to ask the identical question about two
more cell sets costs no extra flood-fill work — it reuses the exact same `_reached()` result set the
call already produced, the same "widen what the sound oracle is asked about" pattern as the existing
mustPass/mustCross loops right above it in the function, not a new admissibility derivation:

- **Surround** (CLAUDE.md: "must visit all reachable 8-adjacent cells"): an **AND** over
  `state.surroundNeighborRemainingMasks[i]`'s still-set bits — every not-yet-visited required
  neighbor of a still-open object must stay reachable, or the state is dead.
- **Adjacent-turn** ("must make a required turn at one of its 8-adjacent passable cells"): an **OR**
  over the object's valid candidate cells — only one needs to stay reachable. `prep.ts` didn't
  previously retain this per-object raw candidate list (only the flattened multi-source distance
  map), so a new `prep.adjTurnSourceKeys: number[][]` field was added to carry it.

Both checks reuse cell-level admissibility logic (`_reachCanEnter`) that's already proven sound for
every other cell it's asked about — the risk surface is "does this ask about new cells correctly,"
not "is the underlying reachability computation correct."

## Soundness census

Replayed every corpus witness/hint solution touching surround or adjacent-turn through real search
state (`createState`/`applyMove` — the exact code real search uses), calling `isConnected()` at
every step with the new checks at their default (ON) and forced OFF (baseline), per CLAUDE.md's
stored-solution falsification discipline (the same methodology that caught
`mustCrossForcedNeighborDeadlocked`'s 261-false-rejection near-miss before it shipped default-on):

| Corpus | Landmark-bearing levels w/ witness | Steps checked | Baseline false rejects | Candidate false rejects |
|---|---|---|---|---|
| stress-levels-random.json (corpus-2) | 1,304 | 133,077 | 0 | 0 |
| stress-levels.json (corpus-1) | 41 | 3,406 | 0 | 0 |
| stress-levels-envelope.json | 148 | 14,931 | 0 | 0 |
| **Total** | **1,493** | **151,414** | **0** | **0** |

Zero false rejections across every replayed step of every known-valid solution touching either
mechanic. The derivation is sound.

## Usefulness probe: fires constantly, no measurable payoff

Soundness alone doesn't justify a hot-path addition — CLAUDE.md requires evidence the check catches
something the existing gauntlet misses. Ran one plain DFS attempt (`default` profile, no template —
the same code every real DFS attempt uses) per level, once with the new checks ON and once OFF,
comparing `nodesExpanded` and solved status.

**First pass** — top-80 levels by surround+adjacentTurn density (corpus-2), 2,000,000-node budget:
0/80 solved either way (too hard for one profile at this budget), but the checks fired on **80/80**
levels — 74,409 surround + 16,454 adjacent-turn firings. Confirms the condition is real and common,
not a rare curiosity, but this sample gave no solved-level comparison.

**Second pass** — a mixed-difficulty sample (natural corpus order, 100 levels, 500,000-node budget)
so some levels would actually complete:

```
Solved (ON):  2/100        Solved (OFF): 2/100        Solved-status flips: 0
Total nodesExpanded ON:  49,524,710
Total nodesExpanded OFF: 49,525,109
Delta (OFF - ON): 399 nodes  (0.0008% fewer nodes with checks ON)
Levels where the checks fired at least once: 83/100
Total firings — surround: 14,475, adjacent-turn: 3,335
```

The checks fire on 83% of levels, ~17,800 times total — real, frequent activity, not dead code — yet
the aggregate effect on search cost is **399 nodes out of 49.5 million** and the solved set is
byte-identical. The likely explanation: whatever state this newly rejects was already a dead branch
the existing gauntlet (distance bound, parity, must-pass/must-cross lower bounds, the volume check)
was about to reject within a step or two anyway, so catching it *slightly* earlier here doesn't
prune a meaningfully larger subtree. This is a different failure shape from the adjacent-turn exit
guidance null result (that one changed nothing because the mechanism doesn't matter for this
population) or the already-known "sound deadlock check fired zero times in ~88.7M evaluations" case
(the gap doc's Adjacent-turn Symmetry bullet — that condition essentially never arises at all): here
the condition arises constantly and the check correctly identifies it, but it's redundant with what
the rest of the gauntlet was about to do regardless.

## Disposition: reverted

Per this repo's standard (a sound-but-non-paying idea gets reverted, not shipped behind an
unused flag — see the adjacent-turn exit-guidance and naive-MST precedents), the `prep.ts`/
`topology.ts`/`types.ts` hot-path changes were reverted. No solver code differs from before this
session; `solver:bench --check` and a cost comparison were not needed since nothing shipped.

**What this closes off**: "give surround/adjacent-turn the same dynamic deadlock treatment
must-turn/must-cross already have" — the natural next idea implied by the code's own asymmetry — is
now a measured null result, not an untested opportunity. It sharpens rather than just extends the
gap-analysis doc's "Landmark feasibility" lead (`docs/solver-heuristic-capability-gap-analysis.md`
gap #2): a plain reachability completion-interface check is not where the value is; if landmark
feasibility is revisited, the next attempt should look for a signal that catches states *earlier*
than the existing gauntlet's other members (e.g., a bound tied to a resource the volume/distance
checks don't already track), not just a differently-shaped reachability check over the same
information the flood fill already had.

## Caveat

100–150 levels is a real but not exhaustive sample of corpus-2's 807 surround-bearing /
926 adjacent-turn-bearing levels, and this only tested the `default` DFS profile (no template, no
repair — repair-search never calls `isConnected` at all per `prune-gauntlet.ts`'s own comment, so
this check is structurally invisible to repair regardless of any future tuning). A population-wide
sweep across every profile could in principle surface a different picture, but a 0.0008% aggregate
effect with 83% firing coverage is a strong enough null that re-deriving from a different profile
angle is not the recommended next step — see the "what this closes off" note above for where the
recommended next step actually is.
