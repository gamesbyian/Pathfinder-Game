# DFS revisits functionally-equivalent states 92-99% of the time — transposition-table premise validated (2026-07-17)

## Context

The roadmap's real-attempt-policy-profile witness-divergence closure (same day) found that
per-step local move ranking is essentially perfect (`maxStepRank` ≤ 3 on 18/18 levels tested,
every profile) yet DFS still fails to find a solution within budget on `dfs-plain`/
`repair-close` levels. That combination — a heuristic that's already very good locally, but a
search that still exhausts its budget without success — is the classic signature of wasted
*redundant* exploration rather than a *misguided* one: if the search keeps re-deriving the same
conclusions from scratch via different move orders instead of ever recognizing "I've been in an
equivalent position before and it didn't work," that alone could exhaust a large node budget
regardless of how good the per-step heuristic is. This is the setting where a transposition
table (game-tree-search terminology: memoize "this state, or an equivalent one, already
provably can't reach a solution from here within the remaining budget" so a different path
reaching the same state later skips it) pays off — and notably, nothing in this session's (or
this repo's) prior solver work has tried it. Flagged in the roadmap as a candidate for a
*future* session pending a premise check; this report is that premise check, done the same day
since it's cheap and purely diagnostic (no production code risk).

## Method

Temporary instrumentation in `dfsFromGate` (reverted immediately after measuring, not shipped):
after every `applyMove`, compute a reduced state signature —
`` `${pos}|${mustMask}|${mustCrossMask}|${adjTurnMask}|${mustTurnMask}|${surroundMask}|${ints}|${pathLength}` ``
— and track how many of the search's total node visits are exact repeats of an already-seen
signature within the same attempt. This is deliberately a *crude, almost certainly unsound-for-
memoization* signature (see Caveats below) — the point of this measurement is only to answer
"how often does the search even reach the same rough shape of state twice," not to validate a
specific cache design.

Ran on 6 levels spanning every population characterized this session: 2 fresh `dfs-plain`
(R02025, R02044), 1 `repair-close` (R01698), the turn-landmark archetype (R02657), the
structurally-robust hard core (R00440), and one high-`reqInt` `adjacentTurn`-heavy level
(R02472) — each level's first few non-repair DFS/beam attempt configs, 3s budget each.

## Result: 92-99% of all node visits are duplicates

| Level | Attempt | Total visits | Unique signatures | Duplicate rate |
|---|---|---:|---:|---:|
| R02025 | perimeterSweep/cornerHarvest | 1,009,142 | 28,679 | 97.16% |
| R02025 | perimeterSweep/perimeterCCW | 1,057,186 | 41,502 | 96.07% |
| R02025 | objectiveFirst | 1,089,569 | 36,119 | 96.69% |
| R02025 | intersectionHarvest | 1,032,108 | 38,977 | 96.22% |
| R02044 | intersectionHarvest | 1,533,041 | 46,545 | 96.96% |
| R02044 | objectiveFirst | 1,581,511 | 43,798 | 97.23% |
| R01698 (repair-close) | objectiveFirst | 903,610 | 68,873 | 92.38% |
| R01698 (repair-close) | intersectionHarvest | 1,010,494 | 81,164 | 91.97% |
| R02657 (turn-landmark) | perimeterSweep/× | 1,684,625–1,804,405 | 14,669–22,041 | **98.71–99.19%** |
| R00440 (robust hard core) | intersectionHarvest | 974,541 | 57,212 | 94.13% |
| R00440 (robust hard core) | objectiveFirst | 1,026,093 | 42,683 | 95.84% |
| R02472 (high reqInt) | intersectionHarvest | 919,906 | 72,816 | 92.08% |
| R02472 (high reqInt) | objectiveFirst | 989,512 | 81,951 | 91.72% |

**Every single attempt across every population tested lands in the 92-99% range**, with the
turn-landmark archetype (R02657) at the extreme end: only ~1-1.3% of ~1.7-1.8 million node
visits are even exploring a genuinely new reduced-signature shape; the rest is repetition. This
is consistent, not a fluke of one level or one archetype — it spans `dfs-plain`, `repair-close`,
the turn-landmark archetype, and a known robust hard core alike.

## Interpretation

This is strong, if indirect, evidence that a meaningful fraction of the multi-million-node
budgets these attempts burn is **redundant re-derivation of already-explored territory**, not
productive new exploration. Combined with the same-day witness-divergence closure (per-step
choice quality isn't the bottleneck), the picture that emerges is: DFS is choosing reasonably at
each step, but different orderings of essentially-forced move sequences (dictated by the level's
geometry/constraints, not by any real choice) keep landing it back in equivalent positions it's
already tried and failed from — and it has no memory of that. A sound transposition table could,
in principle, turn a large fraction of this redundant work into instant rejections, freeing that
budget for genuinely new exploration — plausibly the highest-leverage lever identified this
entire campaign, well above anything in the scoring/pruning/bound family already exhausted.

## Why this was NOT implemented today — a real, not deferred-for-convenience, correctness gap

The crude 8-field signature used for this measurement is **not sound to memoize on directly**.
Two DFS nodes can share the exact same `(pos, mustMask, mustCrossMask, adjTurnMask,
mustTurnMask, surroundMask, ints, pathLength)` tuple while having genuinely different future
prospects, because none of these fields captures:

- **`edgeUsage`** (which axis has been used at which cell) — governs turn legality, must-cross
  axis-locking, and flipping-filter orientation. Two paths with identical mask/`ints` counts can
  have entered the same set of cells via different axis histories, making different future moves
  legal.
- **The actual visited-cell multiset** — `ints` is a *count*, not a *set*; two paths with the
  same intersection count can have revisited entirely different cells, meaning a move that would
  be a *new* intersection (or a *forbidden* one) on one path is a *repeat* (or already-seen) on
  the other.
- **Portal-usage history** — `portalJumps` isn't tracked in the signature at all, and even if it
  were, a count doesn't distinguish *which* portals were used (each terminal is usable once).
- **`crossCounts`/must-cross per-object state** beyond the aggregate `mustCrossMask`.

An under-keyed cache here would not just produce a loose bound (as a numeric lower-bound
under-keying would) — it would risk **incorrectly treating two genuinely different states as
equivalent and skipping a branch that could actually win**, a false-"provably dead" claim. This
is precisely the class of bug CLAUDE.md's `mustCrossLowerBound` cache-key gotcha and the
MST-scratch-buffer precedent warn about, now for a *pruning* cache rather than a *bound value* —
arguably higher-stakes, since a wrong bound only prunes too aggressively in degree, while a wrong
transposition-table hit could categorically eliminate the only winning branch.

**Designing a sound reduced signature is real, non-trivial work**: it needs to capture enough
state to be safe (at minimum, something equivalent to the visited-cell set and `edgeUsage`, which
are large) while still being coarse enough to actually catch the redundancy this measurement
found — collapsing to something like a full path replay would defeat the purpose entirely. This
needs its own dedicated investigation (candidate signature designs, a soundness argument for
each, then implementation with the same oracle-fuzzing rigor every prior pruning change in this
session went through) — explicitly **not attempted here**, consistent with treating
correctness-sensitive search-core changes carefully rather than rushing a design at the tail end
of an already long session.

## Recommended next step for a future session

1. Design a sound (or provably-conservative) reduced signature — the real design question this
   report surfaces but doesn't answer. One starting angle: instead of hashing exact state,
   canonicalize on `(pos, remaining-objective masks)` **plus** a bound check (only treat as a
   dead-repeat if the current attempt's remaining budget/discrepancy is no better than what the
   first visit had) — a strictly *conservative* skip (never wrong, may just be less aggressive
   than a hypothetically tighter signature) is a safer starting point than trying to nail full
   equivalence immediately.
2. Prototype behind an ablation flag, verify `solver:bench --check` + a full-corpus cost sweep
   (this session's standing rule), and specifically re-measure the duplicate rate *with* the
   cache active to confirm it's actually converting duplicates into fast rejections rather than
   adding lookup overhead without catching them.
3. If it holds up, this is very plausibly worth prioritizing over further scoring/bound work on
   any of the currently-exhausted archetypes, given the consistency and magnitude of the
   duplication rate found here.

## Verification

Pure read-only measurement — temporary instrumentation added to `dfsFromGate`, run, measured,
then reverted (`git checkout --`) before this report was written; `git diff`/`git status`
confirmed clean against production `search.ts` afterward. `tsc --noEmit` clean and
`npx vitest run modules/solver` (196/196) re-verified post-revert. No production code changed by
this investigation.
