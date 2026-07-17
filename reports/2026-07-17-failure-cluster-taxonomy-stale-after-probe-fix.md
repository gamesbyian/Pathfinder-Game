# The repair-close/repair-far taxonomy silently collapsed after the probe-budget fix — found and fixed (2026-07-17)

## What was found

Re-running `scripts/stress/cluster-unsolved-failures.mjs` against the fresh genuine 295/1700
corpus-2 baseline (`reports/stress/benchmark-latest-random.json`, from PR #1241) produced a
degenerate result: **all 1405 unsolved levels tagged `dfs-plain`, zero tagged `repair-close` or
`repair-far`** — a complete collapse of a taxonomy that previously split 843/114/507 (2026-07-16
baseline, `reports/2026-07-16-phase-a-unsolved-failure-clustering.md`).

## Root cause

The classifier's `repair-close`/`repair-far` criterion was `repairAttempts.length ===
attempts.length` — "every attempt on this level was a repair attempt." That was an accurate proxy
for "repair-gated" back when it was written, because the early repair *probe*'s pre-fix behavior
(documented in `CLAUDE.md`'s budget-composition gotcha, fixed today via
`reports/2026-07-17-repair-probe-budget-override-bug.md` /
`-node-budget-starvation.md`) silently ignored the caller's external `nodeBudget` and burned the
*entire* budget on repair attempts alone — a repair-gated level's attempt ladder genuinely
consisted of nothing but repair attempts, because the probe never left any budget for the main
loop to run at all.

Now that the probe respects its budget, a repair-gated level's attempt ladder legitimately mixes
repair attempts (the probe, then repair-fallback if it's reached) *with* real non-repair DFS/beam
attempts from the main loop — see `R01698`'s fresh attempt array: 4 repair attempts (down to
`bestBadness: 2`) interleaved with `intersectionHarvest`/`objectiveFirst` DFS/beam attempts that
also ran and timed out. `repairAttempts.length === attempts.length` is now false for essentially
every repair-gated level, so they all fall through to `dfs-plain` only (correctly, since they do
have real non-repair timeouts too) and never get tagged `repair-close`/`repair-far` at all — the
whole rescue-target taxonomy silently vanished.

## Fix

Loosened the condition to `repairAttempts.length > 0` (`scripts/stress/cluster-unsolved-failures.mjs`).
This matches the script's own documented design intent — its header comment already states tags
are "diagnostic tags, not exclusive," so a level legitimately carrying both `dfs-plain` and
`repair-close`/`repair-far` is not a design violation, just something the old over-strict
condition never allowed to happen. Docstring updated to explain why the condition changed and to
warn against reverting it.

## Corrected numbers (2026-07-17, genuine 295/1700 baseline)

| Tag | Count | vs. 2026-07-16 baseline (843/114/507, pre repair-probe-fix) |
|---|---:|---|
| `dfs-plain` | 1405 | was 843 — now legitimately overlaps nearly the whole unsolved population, since the main loop runs on every repair-gated level too |
| `repair-close` (bestBadness ≤ 5) | **156** | was 114 |
| `repair-far` | **751** | was 507 |

Both repair-gated buckets grew (156 vs 114, 751 vs 507; 907 total vs 621) — not because more
levels became repair-gated, but because the fix corrected `needsRepairFallback`-triggering levels
that the pre-fix probe bug was previously preventing from ever reaching a real repair attempt at
all in some cases, per the node-budget-starvation report. `repair-close` is the natural
Campaign 1 rescue target and is now 37% larger than previously known.

## Caveat: badness is a real per-attempt deficit metric, not a distance guarantee

`computeBadness` (`modules/solver/solution.ts`) sums concrete deficits (length, intersections,
must-pass, must-cross, surround, turn) from repair search's *best-found* final state — a real,
un-quantized number, not an artifact. But 35 of the 156 `repair-close` levels tie at exactly
badness 2 (2, 3, 4, 5 badness bins hold 35/52/37/32 levels respectively) — including `R00440`,
which this session already characterized via family-variant testing as a **robust hard core**
(0/45 structural perturbations solvable, `reports/2026-07-16-...` family reports). This is not a
contradiction: `computeBadness` reflects where repair's *stochastic local search* happened to land
its single best sample, not a proven shortest distance to a valid solution — a level can be
globally hard (every structural variant resists every technique) while still having one lucky
near-miss trajectory. **Don't treat "badness 2" alone as evidence a level is an easy rescue** —
cross-check against any existing robustness characterization (family-variant fragile/robust split)
before picking a `repair-close` closest-miss as a diagnostic target, the same caution this
session's roadmap already establishes for the fragile/robust split generally.

## What this doesn't do

No solver code changed — this is a diagnostic-tooling correctness fix, not a solvability change.
`reports/stress/unsolved-failure-clusters.json` regenerated with the corrected numbers; the
roadmap's "Where things stand" narrative updated to cite 156/751 instead of the stale 114/507.

## Verification

Confirmed the root cause directly by inspecting `R01698`'s fresh `attempts[]` array in
`reports/stress/benchmark-latest-random.json` (4 repair attempts including one at `bestBadness: 2`,
interleaved with real non-repair DFS/beam attempts) and tracing the exact boolean condition in
`cluster-unsolved-failures.mjs` that this shape now fails. Re-ran the classifier before/after the
one-line fix on the same input file to confirm 0→156/751 for the two tags with no other tag's
counts changing (`dfs-plain` stayed 1405 both times, as expected since its own condition wasn't
touched).
