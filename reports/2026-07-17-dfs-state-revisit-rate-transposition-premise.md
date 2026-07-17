# CORRECTED: sound-signature DFS state-revisit rate is 0.5-16%, not 92-99% — transposition table checked and found weak (2026-07-17)

> **CORRECTION, same day, before this report's premise was acted on further.** The 92-99%
> figure below uses a signature explicitly flagged in the report's own "Caveats" section as too
> loose to memoize on soundly. That caveat turned out to matter enormously, not just in
> principle: a same-day follow-up measurement using the actually-sound signature (full
> visited-cell identity + `edgeUsage` + portal history, not just masks/counts) found the REAL
> duplicate rate is **0.5-16%** — an order of magnitude lower, and on the level that showed the
> most extreme crude-signature duplication (R02657, 98.7-99.2%), the sound-signature rate is
> the LOWEST of any level tested (0.5-1.1%). See "Correction: the sound-signature duplicate rate
> is 0.5-16%, not 92-99%" below. **The transposition-table lever is downgraded from "very
> plausibly the highest-leverage lever this campaign has found" to "checked and found weak" as
> a direct result.** Left the original write-up below intact (struck through in spirit, not
> deleted) per this session's practice of keeping the reasoning trail visible rather than
> quietly rewriting a claim — see the correction section for what actually holds.

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

## Correction: the sound-signature duplicate rate is 0.5-16%, not 92-99%

Rather than leave "designing a sound signature" as unstarted future work, the natural next
check — done the same day, immediately following the write-up above — was to measure the
*actually-sound* signature's duplicate rate directly, before investing more design effort into
a premise that hadn't been confirmed at the correctness-relevant granularity. New temporary
instrumentation (same revert-after-measuring discipline) replaced the crude 8-field signature
with the genuinely sound one: `pos`, the full sorted-unique visited-cell-key list (exact
identity, not a count), `edgeUsage` at every one of those cells, `portalJumps`, and all 5
landmark/objective masks. Two nodes matching this signature really do have identical future
prospects — this is the standard, no-approximation transposition-table key.

| Level | Attempt | Total visits | Unique (sound sig) | Duplicate rate |
|---|---|---:|---:|---:|
| R02025 | perimeterSweep/cornerHarvest | 172,709 | 164,521 | 4.74% |
| R02025 | perimeterSweep/perimeterCCW | 192,860 | 188,360 | 2.33% |
| R02025 | objectiveFirst | 217,766 | 182,847 | 16.04% |
| R02044 | intersectionHarvest | 198,287 | 196,011 | 1.15% |
| R02044 | objectiveFirst | 193,771 | 190,795 | 1.54% |
| R01698 (repair-close) | objectiveFirst | 210,820 | 208,330 | 1.18% |
| R01698 (repair-close) | intersectionHarvest | 231,125 | 228,061 | 1.33% |
| R02657 (turn-landmark) | perimeterSweep/× | 316,809–331,067 | 315,099–327,368 | **0.54–1.12%** |
| R00440 (robust hard core) | intersectionHarvest | 190,929 | 187,550 | 1.77% |
| R00440 (robust hard core) | objectiveFirst | 195,745 | 192,365 | 1.73% |
| R02472 (high reqInt) | intersectionHarvest | 196,644 | 194,623 | 1.03% |
| R02472 (high reqInt) | objectiveFirst | 205,364 | 202,060 | 1.61% |

**The real (sound) duplicate rate is 0.5-16% across all 13 runs, an order of magnitude below the
92-99% the crude signature reported.** Most strikingly, R02657 — the level whose crude signature
showed the *most extreme* duplication (98.7-99.2%) — has the *lowest* sound-signature rate of
any level tested (0.5-1.1%). This means almost all of the crude signature's apparent
"duplication" was states that merely *looked* similar (same position, same remaining-objective
masks, same intersection count, same path length) while actually being distinct in the ways that
matter: different specific cells visited, different `edgeUsage` history. Two states sharing the
crude signature are overwhelmingly likely to be genuinely different states with genuinely
different future prospects — exactly the false-equivalence risk the original write-up's
"Caveats" section warned a naive cache would create, now confirmed to be the dominant case
empirically, not just a theoretical risk.

### Revised conclusion: the transposition-table lever is weak, not strong

A transposition table built on the sound signature would eliminate on the order of 1-2% of node
visits on most levels (16% on one outlier attempt) — a real but modest win, nowhere near the
"very plausibly the highest-leverage lever this campaign has found" claim in the original
write-up above, which was built entirely on the unsound number. Given the real cost of computing
and hashing a full visited-cell-set + `edgeUsage` signature on every node (the exact-signature
measurement itself ran roughly 5-6x fewer total nodes than the crude-signature measurement in
the same 3s budget — sorting/joining a visited-cell array per node is not free), a 1-2% hit-rate
transposition table would very plausibly cost more in per-node overhead than it saves in skipped
work. **This lever is downgraded from the prior recommendation ("clear next priority") to
"checked and found weak — not worth pursuing further without a cheaper sound signature than the
one measured here."** If a future session wants to revisit this, the open question is whether a
*cheaper-to-compute* sound (or provably-conservative) signature exists that still catches a
meaningful fraction of genuine duplication — not "should we build the naive version," which this
measurement answers: no.

### Why the earlier "highest-leverage lever" framing was wrong, not just optimistic

The original write-up correctly flagged the crude signature as unsound *for correctness*, but
didn't separately ask whether it was even a *reasonable proxy* for how often sound duplication
occurs — an implicit assumption that turned out to be false by roughly 10-90x depending on the
level. The lesson for future sessions: when a cheap proxy measurement motivates a design
recommendation, and the proxy is known to be loose in a specific direction (here: crude signature
strictly *overcounts* matches relative to the sound one, since it ignores information), checking
where the *sound* measurement actually lands is not optional due diligence — it's the number
that actually answers "is this worth building," and can invalidate a large, clean-looking result
built on the proxy alone.

## Verification

Pure read-only measurement — temporary instrumentation added to `dfsFromGate` (two separate
passes: the crude signature, then the sound one), run, measured, then reverted (`git checkout
--`) before this report was written or updated; `git diff`/`git status` confirmed clean against
production `search.ts` after both passes. `tsc --noEmit` clean and `npx vitest run
modules/solver` (196/196) re-verified post-revert, both times. No production code changed by
this investigation.
