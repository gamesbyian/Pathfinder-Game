# Beam dedup: adding must-cross axis-lock granularity to `sc` is net-negative — reverted (2026-08-07)

## Context

`reports/2026-08-06-beam-state-dedup-sound-signature-audit.md` (the day before this one) fixed a
real bit-overflow correctness bug in the beam dedup key (`sc`, `search.ts`) and, in its "What this
changes" section, flagged one specific gap it deliberately left unchased:

> `sc`'s `mustCrossMask` bit can't distinguish "0 visits" from "1 visit, axis partially locked" on
> the same must-cross cell — could plausibly matter more than it did on this sample.

That is: `sc` includes `mustCrossMask` (which bits are still pending) but not `crossCounts`/
`edgeUsage` (whether a pending cell has already had its first, axis-locking crossing). Two
candidates at the same cell with the same mask can be genuinely different future states — one
needing a fresh approach to the must-cross cell, the other needing the perpendicular-axis approach
map (`scoreMove`'s `SCORE_MC_APPROACH_GUIDANCE` term treats these very differently) — yet `sc`
merges them as identical.

## Implementation

Added `mcAxisSub`, a base-4-digit-per-must-cross-index sub-state appended to `sc`, reusing the
*exact same* encoding `mustCrossLowerBound`'s cache key already uses (`lower-bounds.ts`): 0 for
"not pending or never crossed," 1 for "crossed once via H (needs V)," 2 for "crossed once via V
(needs H)." Reusing an already-proven-correct pattern rather than inventing a new one. Gated behind
a new `STRATEGY_STATE_DEDUP_MC_AXIS` ablation flag, default-on (following this codebase's existing
flag convention), computed only when `mustCrossMask !== 0` so non-must-cross levels are unaffected.
`tsc --noEmit` clean; existing `modules/solver/` vitest suite (search/scoring/orchestration) passes
unchanged; `solver:bench --check` against the published corpus: 160/160, no regressions (nodes
−7.8% vs. baseline on a single non-interleaved run — not itself conclusive, see below).

## The A/B: net negative on exactly the population it targets

Mirrored the prior report's own corrected Experiment C methodology precisely, since it already
identified and fixed a real trap (a tight wall-clock budget being the actual binding constraint,
producing a false "zero divergence"): node-budget-pinned (300,000 nodes/attempt), a generous
non-binding 120s wall-clock budget, each level's real `getAttemptConfigs()`-selected beam config
(not hand-picked), non-portal (dedup is disabled entirely on portal levels regardless of this
change), sample skewed toward must-cross-heavy levels (`mustCross.length ≥ 2`, the population where
crossCounts/axis-lock state actually varies) plus a mixed tail.

**100-level sample, 100 beam-exercising (0 DFS-only, 0 errored):**

| | ON (mcAxis default) | OFF (`STRATEGY_STATE_DEDUP_MC_AXIS: false`) |
|---|---:|---:|
| Solved | 13/100 | **16/100** |
| Total nodesExpanded | 25,874,067 | 25,555,399 |

**9 solved-status flips, split 6-3 in favor of OFF** (all on `intersectionHarvest`, `beamWidth:
5000` — the attempt bundle real must-cross-heavy levels actually route to):

- 6 levels solve with the axis-granular key *disabled* and fail (node-budget-capped) with it
  *enabled*: R02289, R02559, R02124, R02521, R02652, R03295.
- 3 levels solve the other way: R00108, R02328, R02342.

Net **−3** on the exact population this change targeted.

## Why: the same tension the prior report's own conclusion implies, now confirmed directly

That report's central finding was that `sc`'s practical value is *not* correctness-preserving
duplicate elimination (true duplicates are ~0.02% of candidates) but *implicit width/diversity
management* — culling many candidates that superficially converge on the same `(cell, mask-tuple)`
frees beam width for candidates elsewhere, even though the discarded candidates are genuinely
different underlying states. Making the key *more* precise (which `mcAxisSub` does, by design — it
exists specifically to stop merging two real must-cross sub-states) moves in the opposite direction
from where the mechanism's measured value comes from: less merging, not more correctness. On a
must-cross-heavy population at fixed beam width, that costs the exact width-freeing effect the
report's Experiment C showed matters (its own disable-dedup-entirely test found 19/75 solved→
unsolved flips). This is the smaller, narrower version of the same trade-off, in the same direction,
on the same kind of population — internally consistent with, not contradicting, that report's
conclusion.

## Disposition: reverted

`search.ts`'s `sc` construction and the new ablation flag were reverted; no solver code differs
from before this session. This closes the one gap the prior report explicitly flagged as unchased,
with a direct answer: **don't chase it** — the mask-only key is already tuned closer to the
mechanism's actual local optimum (aggressive merging) than a more state-accurate key would be, at
least for the must-cross-heavy population where the gap could plausibly matter most.

## What remains open from the prior report

The prior report's *other* flagged-but-unchased item — extending dedup to portal levels (currently
disabled entirely via `level.portalMap.size === 0`) — is untouched by this investigation and remains
a separate, unexamined question. Given this session's result, a portal-identity key extension should
be expected to face the same tension (more precision competing against the mechanism's
width-management value) rather than assumed to be a clean win, and would need the same node-budget-
pinned A/B before being trusted either way.

## Caveat

100 levels (skewed must-cross-heavy) from corpus-2's non-portal population is a real but bounded
sample, and only one profile/beam-width combination (`intersectionHarvest`/5000) was exercised,
since that's what `getAttemptConfigs` actually routes must-cross-heavy levels to. A −3/100 net on a
targeted sample is a small effect in absolute terms, but the 6-3 directional consistency plus the
mechanistic explanation (more merging-precision competing against the mechanism's actual value)
makes this a real, not noise-level, finding for this specific change — not a claim that no
must-cross-state-aware dedup key could ever help.
