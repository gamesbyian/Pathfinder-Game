# Main-loop late-reserve full-population A/B: results and promotion (2026-08-12)

**Verdict: promoted default-ON at fraction 0.15.** Frozen protocol: [`docs/main-loop-late-reserve-experiment.md`](../docs/main-loop-late-reserve-experiment.md). Workflow: `.github/workflows/solver-stress-refresh.yml`, level-blind capability sweep (`scripts/level-blind-capability-sweep.mjs`), all four arms `corpus2_workers=1`, `corpus1_workers=1`, `deterministic=true`, `main_loop_late_reserve_config_count=4`.

## Results

| arm | run id | commit | C1 solved | C1 nodes | C1 work | C2 solved | C2 nodes | C2 work |
|---|---|---|---:|---:|---:|---:|---:|---:|
| control | 31555042628 (#34) | `b925d3f35e79` | 91/102 | 856,373,268 | 1,305,259,616 | 617/1700 | 42,848,573,912 | 59,098,364,678 |
| 0.05 | 31559504666 (#35) | `b925d3f35e79` | 94/102 | 804,491,846 | 1,207,539,467 | 687/1700 | 41,193,237,907 | 56,597,695,949 |
| 0.10 | 31569619386 (#36) | `6cc3cea4e1d7` | 94/102 | 804,291,978 | 1,217,830,107 | 692/1700 | 40,957,017,442 | 56,215,383,606 |
| 0.15 | 31577986868 (#37) | `6cc3cea4e1d7` | 94/102 | 800,831,184 | 1,206,857,384 | 694/1700 | 40,897,086,361 | 56,210,144,075 |

Every arm confirmed full coverage (1700/1700 C2, 102/102 C1) in its combine-job log before being accepted.

**Commit note**: control/0.05 ran at `b925d3f35e79`; 0.10/0.15 ran at `6cc3cea4e1d7` (the diff between the two SHAs is `reports/` + `docs/future-work.md` only — the worker-count-sensitivity report and a future-work log entry — zero `modules/solver/` change). Per the frozen doc's "report `commitSha` must match" acceptance criterion, this is a non-issue: no solver code differs between the two SHAs, so all four arms remain directly comparable.

## Trend

Corpus-2 solved count rises monotonically with the reserve fraction, with clearly diminishing marginal gain: **+70** (control→0.05), **+5** (0.05→0.10), **+2** (0.10→0.15). Corpus-1 saturates at 94/102 starting at 0.05 — all three treatments tie on corpus-1's solved count, with only cost still improving slightly as the fraction grows.

Aggregate nodes and work on **both** corpora decrease monotonically across every arm, despite each successive arm solving more levels, not fewer:

- C2 nodes: 42.8B → 41.2B → 41.0B → 40.9B
- C2 work: 59.1B → 56.6B → 56.2B → 56.2B

0.15 is a **strict win** over every other arm on every measured axis (highest solved count, lowest node count, lowest work, both corpora) — there is no sign of overshoot or reversal at the highest tested fraction. This is squarely the frozen doc's **"positive full-population result"** branch: participation floors/starvation are a real general lever.

## Caveat: worker-count comparability

All four arms used `workers=1` consistently, so the A/B's internal control-vs-treatment comparison is sound. But absolute solved counts here are **not** comparable to any `workers=2` run — see [`reports/2026-08-12-worker-count-solve-outcome-sensitivity.md`](2026-08-12-worker-count-solve-outcome-sensitivity.md) for a documented ~2.8% corpus-2 solved-count gap between otherwise-identical `workers=1` vs `workers=2` runs, root cause not yet identified. Do not read this experiment's raw solved counts (617/687/692/694) against any `workers=2` baseline (e.g. the neighbor-budget A/B's 611/665) without accounting for that gap; the deltas *within* this A/B (all workers=1) are unaffected by it.

## Promotion

Given the strict-win result at 0.15 with no reversal, `STRATEGY_MAIN_LOOP_LATE_RESERVE` is promoted to production default-ON at fraction 0.15:

- `scripts/ablation-config.mjs`: removed `STRATEGY_MAIN_LOOP_LATE_RESERVE` from `OPT_IN_FEATURES`; updated its description.
- `modules/solver/orchestration.ts`: `MAIN_LOOP_LATE_RESERVE_FRACTION` changed from `0.10` (the pilot's tested value) to `0.15` (this A/B's winning value) — this is the fallback used whenever `mainLoopLateReserveFractionOverride` is not explicitly passed, which is every production caller.

The reserve mechanism itself remains a strict no-op unless a finite `nodeBudget` is supplied (`mainLoopLateReserveEligible` requires `earlyTierNodeBudget !== Infinity`) — production Play/Editor/Review solves never set `nodeBudget`, so this promotion changes **only** offline batch-tooling behavior (stress refreshes, benchmarking), not interactive solve behavior. This mirrors the existing `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` no-op guard.

## Verification

- `npx tsc --noEmit`: clean.
- `npx vitest run modules/solver/`: full suite passes.
- `npm run solver:bench -- --check` with the flag genuinely default-on: 0 regressions vs `logs/solver-baseline.json`.

## Not pursued further

Per the frozen doc, this closes the promotion question for `STRATEGY_MAIN_LOOP_LATE_RESERVE` in its current reserve-not-reorder form. A materially different mechanism (e.g. online failure-conditioned allocation, as flagged as the fallback direction if this A/B had come back negative) is not warranted — the static reserve already won cleanly. Chasing fractions beyond 0.15 is not ruled out in principle (the curve was still climbing, if only barely) but is a low-priority follow-up, not a promotion blocker: the marginal gain from 0.10→0.15 was already down to 2 levels on a 1700-level corpus.
