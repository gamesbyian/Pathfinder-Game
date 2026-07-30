# Archetype-routing hypothesis: two A/B tests, both refuted (2026-07-29)

## What this is

[`corpus2-failure-categorization-2026-07-29.md`](stress/corpus2-failure-categorization-2026-07-29.md)'s
Finding 1 diagnosed that `detectArchetype` (`modules/solver/archetype.ts`) tests
`high-intersection-burden` before `must-cross-heavy`, so 734/736 corpus-2 levels with `mustCross ≥ 4`
never reach the must-cross-specific `ATTEMPT_POLICY` rules — 77.5% of those are unsolved. That report
named this a hypothesis, not a proven cause, and proposed two specific tests. Both have now been run.
**Both are refuted — the current single-label routing outperforms both alternatives tried.**

## Method

A stratified 160-level sample from stress-corpus-2 (60 "starved" levels that solve today despite the
mislabeling, 60 "starved" levels that don't, 40 control levels with `mustCross = 0` in the
`high-intersection-burden` archetype), solved at the standard operational budget
(`--scheduler-mode=legacy --budget-ms=8000 --node-budget=20000000`) under three conditions:

- **Baseline**: unmodified production code.
- **Disable routing**: `--disable-flags=STRATEGY_ARCHETYPE_ROUTING`, forcing every level through the
  catch-all attempt ladder regardless of archetype.
- **Must-cross-first reorder**: a local, uncommitted edit to `detectArchetype` moving the
  `mustCrossKeys.length >= 2 && reqInt >= 2` check before the `high-intersection-burden` check, so
  every level satisfying both predicates is labeled `must-cross-heavy` instead.

## Result

| Arm | Solved / 160 | Net vs. baseline | Helped | Hurt |
|---|---|---|---|---|
| Baseline | 43 | — | — | — |
| Disable routing | 39 | **−4** | 3: R00001, R02122, R02645 | 7: R00960, R01778, R02344, R02477, R02618, R02707, R03145 |
| Must-cross-first reorder | 35 | **−8** | 1: R02122 | 9: R02017, R02071, R02303, R02344, R02604, R02609, R02618, R03075, R03145 |

The reorder is not just ineffective, it is the **worst of the three arms** — worse than the blanket
disable it was proposed as a more targeted alternative to. Four levels (R02344, R02618, R03145, and
R02122 in the opposite direction) appear in both experiments' helped/hurt lists, consistent with both
edits perturbing the same underlying classification mechanism rather than being independent failures.

## Why the diagnosis was right but the fix was wrong

The starvation finding itself stands: 734/736 mustCross≥4 levels genuinely never reach the must-cross
rules under current routing. What this A/B shows is that **routing them there doesn't help** — most
likely because `high-intersection-burden`'s own rules (perimeter/objective beams, `mediumHighIntDfsOrder`)
are already the right tool for many of these levels precisely because they *are* high-intersection
(the predicate isn't misfiring, it's correctly identifying a real property these levels have
*in addition to* their must-cross burden), and swapping them onto the must-cross ladder trades a working
strategy for a worse-fitting one more often than it rescues a starved level. A single archetype label
was always going to be a blunt instrument for a level that genuinely has both properties at once; this
result says the current tie-break (favor high-intersection) beats the alternative tie-break (favor
must-cross), not that tie-breaking is unnecessary.

## What this doesn't rule out

- A **combined** rule — a level matching both predicates gets a strategy that tries must-cross-aware
  moves *within* the high-intersection ladder, rather than fully reassigning it — was not tested and
  remains a live option; it's a more invasive change than either of these two, so it wasn't the
  cheap-first move.
- Neither experiment isolated *why* specific levels flip (e.g., whether the 7-9 "hurt" levels lose
  because must-cross's beam bucketing genuinely searches worse for them, or some other mechanism).
  That's available from the raw `arm-*.json` outputs if someone wants to dig into a specific hurt
  level next.

## Status

`modules/solver/archetype.ts` reverted to its original predicate order — confirmed zero diff against
HEAD after the revert. No solver code changed by this investigation.

## Verification

Read-only A/B comparison against `logs/stress-corpus2-baseline.json`-style solve/fail outcomes, both
runs using `--node-budget` (deterministic, machine-speed-independent), so the solved/unsolved verdict
is trustworthy even though both runs shared CPU with unrelated background work. Per-level
helped/hurt lists computed directly from the two runs' raw JSON output, not summarized figures.
