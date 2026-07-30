# Surround/adjacent-turn MST tightening reverted: net negative at operating budget (2026-07-30)

## What this is

Follow-up and reversal of the 2026-07-29 turn-load MST-tightening thread (mechanism diagnosis →
`surroundObjectMSTLowerBound`/`adjTurnObjectMSTLowerBound` shipped → a targeted wide sweep reported
"6 genuine new corpus-2 solves"). A broader before/after check that thread never ran — the effect on
levels that were **already solvable** at the operating budget, not just the population it was aimed
at — found a real, substantial net regression. The bounds have been reverted
(`modules/solver/lower-bounds.ts`, `lower-bounds.test.ts`, `prep.ts`, `types.ts`,
`docs/solver-architecture.md` restored to their pre-`9defcc66` state, commit `eda20331`).

**The earlier reports' diagnosis is not wrong** — turn-load genuinely drives corpus-2 robustness,
and `surroundLowerBound`/`adjTurnLowerBound` genuinely lack the MST-joint tightening `mustPassLowerBound`/
`mustCrossLowerBound` have. What's wrong is the conclusion that closing the gap this way was a clear
win. It wasn't measured against the right population. See the "not wrong, incomplete" framing below.

## What was missed, and how it was found

The wide sweep (`2026-07-29-mst-tightening-wide-sweep-results.md`) only tested corpus-2's
**unsolved-with-≥2-surround** population — by construction, every level there starts at `ok:false`,
so there was no way for that sweep to detect a regression; only wins were possible. It never checked
whether the same change made any **already-solved** level worse.

Chasing an unrelated performance question (does the new MST computation add measurable per-call cost?
— it does: a 50-level solved-population sample showed nodes down ~12% but wall-time up ~41%, an
uncaught gap since `solver:bench --check`'s published-corpus sample barely exercises this code path —
only 2 published levels have ≥2 surround objects) led to adding memoization for both bounds (mirroring
`mustPassLowerBound`'s cache pattern; verified sound via 1230 real-witness cache-hit/soundness replays
across all 3 corpora, and via new unit tests). Caching helped (wall-time overhead dropped from +41% to
+25% on the sample) but didn't close the gap, which prompted checking the **full** already-solved
population directly rather than a sample.

## The result

353 corpus-2 levels solved (at some budget) with ≥2 surround or ≥2 adj-turn objects, re-run at the
session's standard 8000ms/20M-node budget, before vs. after (with caching):

| | count |
|---|---|
| Solved before (this budget, unmodified code) | 169 |
| Solved after (this budget, MST tightening + cache) | 157 |
| Both solved | 143 |
| **Regressions** (solved before, failed after) | **26** |
| New wins (failed before, solved after) | 14 |
| Both unsolved | 170 |

**Net: −12 levels**, at the exact same budget used throughout this whole investigation. Every
regression was a clean, unambiguous `node-budget-reached` failure where the unmodified code had
succeeded comfortably — several in well under a tenth of the node budget (e.g. R02093: 267,642 nodes
before → 20,000,225 after; R02248: 4,182,923 → 20,000,000). Not noise: the pattern is consistent and
the magnitudes are large.

Combined with the earlier targeted sweep's +6 on the never-solved population, the honest net picture
across everything measured is roughly **−6 to −12 levels** at this operating budget — the opposite of
what the 2026-07-29 report concluded.

## Why: the same double-edged property this session already found once

Both new bounds are provably admissible (the group-MST relaxation argument holds, and 1,230+ level
soundness replays never found a violation) — they never wrongly prune a state that's actually on a
reachable solution path *given unlimited search*. But DFS/beam/repair here are **heuristic,
budget-limited, non-exhaustive** searches, not exhaustive ones. Pruning more aggressively — even
soundly — changes *which* candidates get explored and in *what order*. That reordering helps some
instances (a previously-explored dead branch now gets skipped, freeing budget for the real solution)
and hurts others (a branch the search used to stumble into the solution through now gets legitimately
pruned earlier, and the search's remaining budget goes somewhere that doesn't pan out). This is
exactly the same category of result as this session's earlier `2026-07-29-archetype-routing-ab-refuted.md`
finding (a routing change that was individually well-reasoned but net-harmful once measured against
the right population) — soundness and improved worst-case node efficiency do not guarantee improved
outcomes under a fixed wall-clock/node budget in a heuristic search.

## What's kept, what's reverted

**Reverted**: `surroundObjectMSTLowerBound`, `adjTurnObjectMSTLowerBound`, their wiring into
`surroundLowerBound`/`adjTurnLowerBound`, `prep.adjTurnNeighborKeys`, the two new caches
(`_atLowerBoundCache`, `_survLowerBoundCache`), all associated unit tests, and the
`docs/solver-architecture.md` History section — restored to commit `eda20331`.

**Kept**: the 6 hint files found during the wide sweep (`data/stress/hints-random/{R02670,R02888,
R03222,R03293,R02110,R03045}.json`) — these are genuine, referee-verified valid solutions; a solved
path doesn't stop being valid because the code that found it was reverted. Also kept: all the
diagnostic reports establishing turn-load (not archetype) as the robustness driver
(`reports/families/2026-07-29-turn-load-fragile-robust-split.md`, `...-vs-archetype-disambiguation.md`),
which remain accurate findings independent of this specific fix's fate, and the family-variant data
under `data/families/`.

## What this means for future work on this thread

The diagnosis stands: turn-load genuinely drives robustness, and the missing MST tightening is a
genuine, real gap relative to MP/MC. What doesn't work is applying it unconditionally on every
candidate-move evaluation once ≥2 objects are pending. Untried alternatives that might recover the
targeted-population benefit without the broad cost — none attempted here, flagged for whoever picks
this up next:

- **Throttle the joint-MST computation** the way `isConnected` is throttled (checked only every N
  nodes / at shallow depth), rather than running it on every candidate move — trades some pruning
  precision for much lower amortized cost.
- **Gate it on a feature threshold** (e.g. only compute the joint term when `remainLen` is large
  enough, or navDensity/turnLoad crosses some measured cutoff) so it only activates for the
  population it actually helps, closer to how `ATTEMPT_POLICY` rules are feature-gated elsewhere.
- **A genuinely cheaper algorithm** for the group-MST assembly itself, reducing the per-call constant
  factor rather than trying to amortize it via caching (caching only helps when the exact same
  `(pos, state)` recurs — apparently not often enough in these search patterns to close the gap).

Any of these would need the same rigor this thread already demonstrated is necessary: soundness
verification, AND — the lesson of this report — a full before/after check against the
**already-solved** population at the standard operating budget, not just the population the change
targets.

## Verification

The revert restores exactly the file state at `eda20331` (verified via `git diff` against that commit
showing zero difference in the 4 touched source files). Post-revert: `check:types`/`eslint` clean,
264/264 solver tests pass (269 minus the 5 removed MST-specific tests), `solver:bench --check` 160/160
no regressions. The regression data above is the `full-solved-regression-check{,-before}.json` sweep
output (not checked in — scratch verification artifacts), reproducible by re-running
`scripts/portfolio-solve-sweep.mjs` against the same 353-level position spec at commits `eda20331`
(before) and `d8575359` (after, the last commit before this revert) with `--budget-ms=8000
--node-budget=20000000 --workers=4`.
