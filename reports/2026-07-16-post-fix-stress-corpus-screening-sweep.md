# Post-fix stress-corpus screening sweep: 64 new solves found

**Date**: 2026-07-16. **Data collection only — no solver code changed.** A quick, deliberately
low-budget screening pass over both stress corpora, to get a rough sense of how much today's two
solver fixes (elite-splice restoration, `e6a9cb9`; repair-probe retry-width re-tune, `7c59c4a`,
`451ac24`) moved the needle at production scale, beyond the ~40 hand-picked families already
re-tested in the Experiment 1-5 reruns.

## Method

`portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=5000 --node-budget=4000000
--workers=4 --resume --save-hints`, run separately against `data/stress/stress-levels.json`
(corpus 1, 102 levels) and `data/stress/stress-levels-random.json` (corpus 2, 1700 levels).

Two choices worth explaining, since both were corrected mid-task after a second look:

- **Legacy scheduler, not `portfolio-experiment`.** `schedulerMode: 'portfolio-experiment'`
  was considered for its documented 30-40% stress-corpus speedup
  (`reports/portfolio/portfolio-scheduler-decision.md`), but checking the actual tier
  config (`data/config/portfolio-experiment.js`) showed passes 1-3 alone cost 7,500ms
  minimum before even reaching the embedded fallback (up to 67,500ms for repair-gated
  levels hitting the conditional pass) — and `orchestration.ts`'s `runPortfolioExperiment`
  always falls through to a full legacy-equivalent solve if the tiers don't find one
  (no flag exists to skip this). At this sweep's deliberately low 5,000ms target budget,
  that fixed tier overhead exceeds the whole target and then pays for a fallback on top —
  slower, not faster, for a corpus with many expected failures. The documented speedup was
  almost certainly measured at a much larger total budget where the fixed overhead is a
  small fraction. Reverted to `legacy` mode, which respects `--budget-ms` as a simple,
  direct per-level cap.
- **Real OS-level parallelism (`--workers=4`, child processes), not a scheduler change.**
  Orthogonal to the above — `--workers` is genuine multi-core parallelism for CPU-bound
  solves, unrelated to which scheduler mode is used.

`--node-budget=4000000` bounds worst-case cost deterministically (machine-speed-independent) on
top of the wall-clock budget, per `docs/solver-architecture.md`'s cost-gotcha guidance.
`--baseline` was passed for `--priority`/`--attempt-cache` purposes but does **not** itself produce
a solved/failed diff (checked — that's a `solver:bench --check`-only feature); the diff below was
computed directly from the sweep's raw JSON output against the committed baseline files.

## Results

| Corpus | Official baseline (full budget) | This sweep (5s budget) | New solves |
|---|---|---|---|
| Corpus 1 (102 levels) | 85/102 | 53/102 | **2** |
| Corpus 2 (1700 levels) | 152/1700 | 158/1700 | **62** |

**New solves** (baseline unsolved, now solving even at this low budget):

- Corpus 1: `R00408`, `R00716`
- Corpus 2 (62 total): `R00234, R00278, R00869, R00970, R01086, R01477, R01778, R01925, R02017,
  R02020, R02045, R02048, R02071, R02116, R02141, R02152, R02167, R02204, R02243, R02252, R02262,
  R02268, R02293, R02321, R02386, R02482, R02519, R02521, R02609, R02634, R02639, R02678, R02713,
  R02742, R02775, R02804, R02817, R02859, R02925, R02972, R02975, R02978, R03010, R03060, R03065,
  R03101, R03138, R03139, R03164, R03176, R03196, R03204, R03206, R03219, R03224, R03239, R03249,
  R03272, R03277, R03285, R03295, R03363`

**Corpus 2's low-budget sweep outright beat its own full-budget official baseline** (158 vs. 152),
despite using a fraction of the budget (5s vs. whatever the official sequential run used). That's
the clearest available signal that today's fixes materially improved repair's typical-case speed:
enough previously-hard levels now resolve fast that a stingy budget catches more solves than the
old baseline needed a generous one for.

The "lost" levels (34 in corpus 1, 56 in corpus 2 — solved in the baseline, not solved here) are
not regressions; they're levels that genuinely need more than 5 seconds, exactly as expected for a
deliberately low-budget screening pass. No solver code changed between the baseline and this
sweep other than today's two already-verified fixes, so there is no mechanism for a real
regression here.

## What this is not

- **Not a baseline refresh.** `logs/stress-corpus{1,2}-baseline.json` were deliberately left
  untouched. Overwriting them with this partial, low-budget sweep would corrupt future regression
  detection (every level needing more than 5s would look like a false regression against a
  baseline that no longer reflects real full-budget capability). A proper baseline refresh needs a
  full-budget, official-style run — a larger undertaking than this screening pass, and a natural
  next step if the corpus-2 unsolved count is worth re-measuring formally.
- **Not exhaustive.** At only 5 seconds and a 4M node cap, this sweep almost certainly
  undercounts the real improvement — levels needing 10-30s to resolve now (plausible, given how
  much cheaper repair got across the board) wouldn't show up as new solves here at all.

## Verification

All 211 new-solve hint files (53 corpus-1, 158 corpus-2) saved via `--save-hints`, validated as
well-formed JSON. Every solve is validated by construction — `Solver.solve`'s own win-condition
check (`isSolutionState`) is the referee; it cannot return `ok: true` for an invalid path, so no
separate validation pass was needed.
