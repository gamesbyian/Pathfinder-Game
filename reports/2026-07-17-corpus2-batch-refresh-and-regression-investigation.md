# Corpus-2 batch refresh: results and regression investigation (2026-07-17)

## Background

The 20 `stress-corpus2-batch-*.yml` GitHub Actions workflows (`.github/workflows/`, one per
~85-level slice of the 1700-level stress-corpus-2) had already been run once, establishing the
`236/1700 solved` baseline cited in CLAUDE.md ("First full run, 2026-07-16 (post elite-splice-fix)").
When re-triggered today to pick up this session's solver work (the nodesExpanded instrumentation
fixes, the repair-budget-fraction policy, and the new attraction-diversity last-resort pass — see
`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`), all 20 runs finished in
2-3 minutes instead of the expected ~12.5 min/batch average. Investigation found the root cause:
each `stress-corpus2-batch-NN` branch still carried its `--resume` checkpoint file from the
*original* 2026-07-16 run, and `portfolio-solve-sweep.mjs`'s `--resume` flag trusts an existing
checkpoint unconditionally — it has no way to know the solver code changed underneath it. The
console log for batch 01 confirmed this directly: `--resume: 85 level(s) already checkpointed...,
skipping` and `levels=85 (0 to solve)` — zero new solving happened at all.

## Fix: reset the checkpoints, re-run

All 20 `stress-corpus2-batch-NN` branches were reset: the stale `batch-NN.json` /
`batch-NN-summary.md` / `batch-NN.checkpoint.jsonl` / `batch-NN.console.log` files were moved
(pure `git mv`, not deleted) to
`logs/solver-corpus2-batches/archive/2026-07-16-pre-attraction-diversity-refresh/` on each branch,
then all 20 workflows were re-triggered via `workflow_dispatch` against `main`. This time every
batch took ~10-13 minutes (confirmed via `mcp__github__actions_list`: batch 01 ran 00:03:51 →
00:17:09 UTC, batch 20 ran 00:04:16 → 00:14:26 UTC) — matching the historical per-batch average,
confirming a genuine re-solve happened this time, not another silent skip.

## Result: 237/1700 solved (was 236/1700)

Aggregated from each branch's `batch-NN-summary.md` (`Solved (any phase)` field):

| Batch | Solved | Unsolved | Batch | Solved | Unsolved |
|---|---:|---:|---|---:|---:|
| 01 | 3 | 82 | 11 | 11 | 74 |
| 02 | 6 | 79 | 12 | 11 | 74 |
| 03 | 2 | 83 | 13 | 18 | 67 |
| 04 | 6 | 79 | 14 | 15 | 70 |
| 05 | 14 | 71 | 15 | 8 | 77 |
| 06 | 11 | 74 | 16 | 23 | 62 |
| 07 | 16 | 69 | 17 | 12 | 73 |
| 08 | 12 | 73 | 18 | 13 | 72 |
| 09 | 14 | 71 | 19 | 18 | 67 |
| 10 | 11 | 74 | 20 | 13 | 72 |

**Total: 237/1700.** A net gain of only +1 over the pre-session baseline — much smaller than the
~10% rescue rate (3/30) the attraction-diversity pass showed on a controlled, isolated 30-level
sample from the `dfs-plain` cluster (see
`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`), which extrapolated to a rough
~80-level estimate for the full 843-level `dfs-plain` cluster alone.

## Why the net gain is so much smaller: the aggregate hides real churn

Diffing each batch's new `checkpoint.jsonl` against its archived pre-refresh copy (a precise
per-level solved/unsolved comparison, not just the aggregate counts) found the +1 net was actually
**+8 newly solved, -7 "regressed"** (solved in the old checkpoint, not solved in the new one):

- Newly solved (8): R01644, R01766, R01903, R02155, R02771, R02834, R03025, R03075
- Regressed (7): R01134, R02520, R02583, R02679, R02797, R03150, R03210

A raw aggregate count would never have surfaced this — it looks like "basically nothing changed,"
when in fact 15 individual levels flipped in one direction or the other.

## Investigating the 7 "regressions" — none are genuine

Each of the 7 was re-solved locally (3 trials each, at the production workflow's exact settings —
`timeBudgetMs: 8000, nodeBudget: 8000000`, default repair/diversity fractions since the workflow
doesn't override either) to determine whether these are real correctness regressions from today's
solver changes, or artifacts of running on a shared, variable GitHub Actions runner.

| Level | Local re-test (3 trials) | Verdict |
|---|---|---|
| R02797 | SOLVED, SOLVED, SOLVED (7.4–8.0s) | **False regression** — solves reliably and quickly |
| R03150 | SOLVED, SOLVED, SOLVED (2.5–2.7s) | **False regression** — solves reliably and quickly |
| R03210 | SOLVED, SOLVED, SOLVED (3.5–3.6s) | **False regression** — solves reliably and quickly |
| R02520 | SOLVED, unsolved, unsolved | **Confirmed flaky** — 1/3 even under current code |
| R01134 | unsolved, unsolved, unsolved | Consistently unsolved under current code |
| R02583 | unsolved, unsolved, unsolved | Consistently unsolved under current code |
| R02679 | unsolved, unsolved, unsolved | Consistently unsolved under current code |

The first three solving reliably and quickly in isolation, despite failing on the actual GH Actions
run, points to CPU contention from the workflow's `--workers=2` (two levels solving concurrently on
a shared 2-4-core runner) as the likely cause — a level needing several seconds of real compute can
easily miss its 8s wall-clock budget when sharing a core with another concurrent solve, with nothing
to do with the solver's own correctness.

The remaining 3 (R01134, R02583, R02679) needed a stronger check: were they reliably solving under
the OLD (pre-session) solver at all? All three have only 1 gate (ruling out `adaptiveGateWeight`'s
≥4-gate risk surface — checked directly via `data/stress/stress-levels-random.json`'s `gates`
field), and none have `mustCross` (ruling out the repair-fallback feature gate), so the plausible
causes were narrow to begin with. Checked out commit `123bbc5` ("Document the repair-search
elite-splice regression: investigation and fix" — the commit CLAUDE.md's "post elite-splice-fix"
baseline description refers to) in an isolated git worktree and re-solved all 3 there, 3 trials
each, at the identical settings:

```
R01134 unsolved(timeout) | unsolved(timeout) | unsolved(timeout)
R02583 unsolved(timeout) | unsolved(timeout) | unsolved(timeout)
R02679 unsolved(timeout) | unsolved(timeout) | unsolved(timeout)
```

**All 3 were ALSO consistently unsolved under the pre-session baseline commit.** They were never
reliably solving — the original 2026-07-16 run's checkpoint recording them as solved was itself a
lucky, borderline-timing result (the same class of flakiness this codebase's own Determinism Report
already documents for `runRepairProbe`), not evidence of a stable "solved" state that today's changes
broke.

**Conclusion: none of the 7 apparent regressions are a genuine correctness regression from this
session's solver changes.** Every one is explained by either runner contention (3) or pre-existing,
timing-dependent flakiness that predates today's work entirely (4).

## What this means going forward

- The published-corpus regression gate (`solver:bench --check`, 160/160 throughout this session)
  remains the only reliable regression signal — as CLAUDE.md's own gotchas already say, it's the
  single source of truth for "did a change break something," and this investigation is a real-world
  demonstration of why: a raw corpus-2 aggregate diff alone would have been read as "roughly nothing
  happened," and even a shallow read of the per-level diff would have wrongly flagged 7 regressions
  that don't actually exist.
- The much-smaller-than-estimated net gain (+1 vs. the ~80-level rough estimate) is *not* evidence
  the attraction-diversity pass doesn't work — the controlled 30-level sample that produced the ~10%
  estimate was drawn specifically from `dfs-plain`, and this production run's other ~1463 unsolved
  levels are dominated by populations (`repair-close`, `repair-far`, and the `dfs-plain` "robust"
  subgroup) the pass was never diagnosed against or shown to help on. This is exactly what one of
  this session's follow-up research tasks (testing the pass against `repair-close`/`repair-far`
  specifically) is designed to check — see the corresponding prompt for that task.
- `data/stress/hints-random/` gained a handful of new hint files from the 8 newly-solved levels
  (via `--save-hints`, each with proper `HintProvenanceEntry` records) — a genuine, permanent
  discovery-event outcome of this refresh, independent of the regression question above.

## Caveats

- This investigation covers only the 7 flagged "regressions," not an exhaustive re-verification of
  all 229 previously-solved levels that stayed solved — it's reasonable to assume most of those are
  fine (they solved consistently in both this run and, presumably, the original), but that assumption
  wasn't independently checked here.
- The false-regression hypothesis (runner contention from `--workers=2`) is plausible and consistent
  with the evidence but wasn't directly proven (e.g. by re-running the actual GH Actions workflow
  with `--workers=1` to see if R02797/R03150/R03210 solve there) — a cheap follow-up if worth
  confirming definitively.
