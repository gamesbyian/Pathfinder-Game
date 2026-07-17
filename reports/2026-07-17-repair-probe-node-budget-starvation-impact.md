# Impact follow-up: does fixing the probe's node-budget accounting unlock new solves? (2026-07-17)

## Context

Follow-up to `reports/2026-07-17-repair-probe-node-budget-starvation.md`, which fixed a bug where
the early repair probe never checked the caller's external `nodeBudget`, so it always ran its
~10,000,000-node worst case regardless of a smaller external ceiling — confirmed to be why all
621 `repair-close`+`repair-far` unsolved-cluster levels hit `node-budget-reached` with only the
probe's 3 attempts ever recorded under the GitHub Actions batch workflow's `--node-budget=8000000`.
This report measures whether the fix actually unlocks new solves at scale, and whether the
workflow's `node_budget` needs raising to see the benefit.

## Method

Two sweeps against the fixed code, both `--scheduler-mode=legacy --budget-ms=8000` (matching the
batch workflow), production-default `repairBudgetFraction`/`attractionDiversityBudgetFraction`
(no overrides — the real production shape, unlike Campaign 0's isolation-style tests):

1. **150-level sample** (seeded mulberry32, drawn from the 621 confirmed probe-starved levels) at
   `--node-budget=8000000` — the *current* workflow setting, now with the fix applied.
2. **30-level sample** (first 30 of the same 150) at `--node-budget=25000000` — roughly 2.5x the
   probe's own ~10,000,000-node worst case, to test whether real headroom for the main
   loop/fallback/diversity pass changes the outcome.

## Results

**8,000,000 node budget (current workflow setting), 150 levels: 0/150 solved.** The overshoot bug
is fully fixed — `nodesExpanded` now ranges 8,000,000–8,000,073 (vs. the pre-fix ~10,000,038
median, a 25% overshoot) — but **every one of the 150 levels still ends up probe-only**
(`attemptCount: 3` for all 150, every attempt tagged `repair`). At this node budget, the probe
genuinely needs close to its own full internal worst case to reach its best near-miss on this
population, leaving **zero** headroom for the main loop regardless of the fix. The fix corrected
the accounting; it did not, by itself, change the outcome at this specific budget size.

**25,000,000 node budget, 30 levels: 0/30 solved.** This time the fix's benefit is directly
visible — every level now gets real main-loop/fallback/diversity attempts (`attemptCount` ranging
7–16, vs. the probe-only 3), confirming the fix genuinely restores headroom when the external
budget is large enough to hold it. **But still zero new solves.** All 30 levels fully exhaust the
25,000,000-node budget (`nodesExpanded` 25,000,001–25,000,055) without finding a solution, at
`totalMs` ranging 26,131–125,248ms (consistent with the up-to-8x budget-fraction stacking also
being a real, separate constraint alongside the node ceiling).

## Conclusion

**The probe-starvation bug was real, confirmed at 100% prevalence across the entire
`repair-close`+`repair-far` population, and worth fixing for node-budget accounting honesty — but
it is not the primary reason these levels are unsolved.** Even with 2.5x the probe's own worst-case
node budget and genuine main-loop/fallback/diversity access (the exact conditions that were
missing before the fix), this population's sampled members remain unsolved. This population
appears **genuinely combinatorially hard for the current solver**, in the same spirit as the
`dfs-plain` cluster's "genuine exhaustion, not budget starvation" characterization
(`reports/2026-07-16-phase-a-unsolved-failure-clustering.md`) — not a budget-configuration
artifact the way the probe overshoot itself was.

**A real, important side effect**: the `repair-close`/`repair-far` cluster classification and
"badness" ranking in `reports/stress/unsolved-failure-clusters.json` were computed entirely from
probe-only telemetry (per the root-cause report) — they reflect how close the *probe alone* got,
not the full pipeline. Now that the probe no longer silently overshoots, a future corpus-2 refresh
with an adequately large `node_budget` (this session's data suggests the workflow's current
8,000,000 should be raised to comfortably clear the probe's own ~10,000,000-node worst case with
real headroom left over — 25,000,000+ demonstrated as sufficient to reach the main loop, though not
sufficient to solve) would produce an **honest** re-classification, likely reshuffling which levels
count as "close" vs. "far" based on real full-pipeline badness rather than probe-only badness.

## Recommendation

1. **Raise the GitHub Actions corpus-2 batch workflow's `node_budget` default** (currently
   8,000,000 in `.github/workflows/solver-corpus2-batch-*.yml` /
   `README-solver-corpus2-batches.md`) to at least 20,000,000–25,000,000, so the probe's own
   worst case no longer consumes the entire ceiling on must-turn-heavy repair-gated levels. This is
   a config/workflow-input change, not a code change — not made in this session since it implies a
   real resource commitment (a full 20-batch corpus-2 re-run costs real CI time/minutes) that's
   better flagged for an explicit decision than triggered unilaterally.
2. **Re-run the corpus-2 batches** (or at minimum re-generate `unsolved-failure-clusters.json`)
   once that happens, to get badness/cluster telemetry that reflects the real full-pipeline
   near-miss distance instead of the probe-only one. Until then, treat `repair-close`'s "badness
   ≤ 5" framing with caution — it may not predict which levels are actually closest to solving
   under the full pipeline.
3. **Campaign 1's original framing (targeted rescue of `repair-close`'s near-misses) should be
   revisited after that re-classification**, not abandoned — this session's 30-level sample is too
   small to conclude the whole 621-level population is unsolvable with more budget alone, only that
   this specific sample didn't yield within a 2.5x-generous but still bounded budget. The next
   productive step within Campaign 1, absent a full re-run, is differential diagnosis (witness-
   divergence) on individual confirmed-hard members to look for a shared structural cause, the same
   method that found the real `dfs-plain` fixes.

## Verification

Both sweeps ran against the already-committed, already-verified fix (see the root-cause report for
`tsc`/lint/vitest/`solver:bench --check` verification) — this report is a pure measurement
follow-up, no additional code changed.
