# Repair live-prefix reconstruction: a first population-level rate estimate

> **Status:** active
> **Last evidence:** 2026-09-02 — CP-SAT-verified exact live/dead boundaries plus `closeLengthGap`/randomized-rollout classification, referee-validated and independently replayed where solved, for seven freshly-selected, unrelated-parent exact-live cases drawn from one independent sample (`R02257`, `R02426`, `R03097`, `R02644`, `R02919`, `R02975`, `R02575`)
> **Decision:** extending the fresh sample from n=3 to n=7 turns "does either regime recur" into a first real rate estimate. Of six cases with a CP-SAT-resolved boundary (`R02919`'s interior abstained — excluded from the rate), **2/6 (33%) are near-budget-boundary reconstructable** (`R02257`, `R02426` — the shape this report originally found) and **4/6 (67%) are operator-incapable** (`R03097`, `R02644`, `R02975`, `R02575` — the `R00648`/`R03176` shape). The near-budget-boundary shape is real and recurring, but it is the **minority** shape in this fresh sample, not the dominant one.
> **Remaining gate:** n=6 resolved cases is still a small sample for a population rate (a two-sided ~95% interval around 33% spans roughly 10-65% at this size) — do not finalize a budget-increase mechanism on this estimate alone. A materially larger sample (order 20-30+ resolved cases) would meaningfully narrow it. `R00630`'s and `R02449`'s own shapes remain unrecurred singletons in every fresh draw so far.
> **Evidence role:** discovery (population-recurrence check and first rate estimate, same role as the parent audit's stop-rule gate)
> **Selection:** prespecified — drew one fresh, independent 30-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02`, distinct from any seed this program has used before) via `census-repair-rollback-windows.mjs`, then processed the shallowest-rollback elite from each successive distinct parent level in that sample, in ascending rollback order, in two batches (`R02257`/`R02426`/`R03097` first, then `R02644`/`R02919`/`R02975`/`R02575`) — the selection rule (next-shallowest distinct parent) was fixed before either batch, and no case was substituted after seeing its own result.

## Why this check

[`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s remaining gate, after `R00630` and `R02449` were classified, is explicit: "check whether either new regime (`R00630`'s cheap-reconstruction shape or `R02449`'s expensive-but-reconstructable shape) recurs across unrelated exact-live cases before considering any retreat/reopening treatment or a larger `closeLengthGap` budget." Four cases (`R00648`, `R03176`, `R00630`, `R02449`) had been classified as of that report, each from the same two earlier mining rounds (an initial 3-level pilot and one 2026-08-13 "broadened sample" of 4 specific levels) — no case had yet been drawn from a genuinely fresh, independent sample.

## Method

Reused the existing pipeline exactly, end to end, with no new tooling beyond one cosmetic fix:

1. **Fresh sample.** `scripts/stress/census-repair-rollback-windows.mjs --levels=data/stress/stress-levels-random.json --sample=30 --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000` — 30 levels, 5 elites each (150 rows), none of the levels overlapping any previously-classified case (`R00001`, `R00039`, `R00044`, `R00630`, `R00648`, `R02449`, `R03176`).
2. **Selection.** Sorted all 150 rows by `rollbackSteps` ascending (the same "smallest rollbackSteps" criterion `repair-elite-path-dump.mjs`'s own header comment names as a legitimate selection basis), then fixed the rule "take the shallowest-rollback elite from each successive distinct parent level, in ascending order" before running any of them. In order: `R02257:elite:3` (15 steps, 13.6% of `requiredLength`; all four of `R02257`'s own elites occupied the top four slots, a level-level effect, not a selection artifact), `R02426:elite:4` (32, 37.2%), `R03097:elite:4` (44, 86.3%), `R02644:elite:2` (49, 87.5%), `R02919:elite:4` (54, 58.7%), `R02975:elite:4` (54, 78.3%), `R02575:elite:0` (55, 85.9%). Run in two batches (first three, then the next four) — the selection rule itself, not the batch boundary, is what was fixed in advance; no case already run was revisited or excluded after seeing its own result.
3. **Path dump.** `scripts/stress/repair-elite-path-dump.mjs --only=<levelIds> --node-budget=30000 --limit-elites=5` — deterministically reproduces the exact same elite selection as step 1 (confirmed: identical badness/path-length per elite for every case), plus full packed-key paths for CP-SAT.
4. **CP-SAT exact boundary.** `scripts/stress/repair-retreat-binary-search.mjs --dump=<path dump> --time-limit=60 --elites=<id>` — the same `cpsat-reference-probe.py`-backed bisection every prior case used. One pre-existing cosmetic bug fixed along the way: this script read a dump-file field named `reqLen`, but current `repair-elite-path-dump.mjs` emits `requiredLength` — the mismatch only ever printed `reqLen=undefined` in this script's own progress log (never affected bisection logic, which uses `eliteLength`/`low`/`high` only), fixed with a fallback (`lvl.reqLen ?? lvl.requiredLength`).
5. **Classification.** `scripts/stress/repair-plateau-rollout-classifier.mjs --retreat-file=<boundary output> --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 --seed=repair-reachability-recurrence-check-2026-09-02` — identical protocol to the `R00630`/`R02449` classification (2,000 randomized rollouts from the verified-feasible depth; `closeLengthGap` with `floor=0`, full backtrack to the gate, and the same 500x-inflated 2,000,000-node diagnostic ceiling).
6. **Independent verification.** Beyond the classifier's own internal `solved`/`nodes` result, replayed each `closeLengthGap` *solve* two more ways: `Solver.validateCandidatePath` (the canonical referee) on the returned final path, and a from-scratch replay through fresh state confirming `isSolutionState`. Both passed on the only two solved cases (`R02257`, `R02426`). Every other case (`R03097`, `R02644`, `R02919`, `R02975`, `R02575`) produced no path to verify — each exhausted the full 2,000,000-node diagnostic ceiling without solving, confirmed by its own reported node count matching that ceiling exactly (not a quick natural dead end).
7. **One CP-SAT abstention.** `R02919:elite:4`'s bisection did not converge: the depth-27 probe returned `timeout/abstain (reference-unknown)` within the 60s time limit, leaving a wide unresolved interval (`low=0` — the trivial gate-is-always-feasible floor, not a verified near-elite-end boundary — `high=54`). Per the parent audit's own rule ("do not buy more CP-SAT resolution merely to narrow existing UNKNOWN intervals"), this was not re-probed with a longer time limit. Its own `closeLengthGap` diagnostic (run from the trivial `low=0` depth, which is a materially weaker test than every other case's CP-SAT-verified near-elite-end depth) also failed at the full ceiling, but this case is **excluded from the rate estimate below** rather than counted as a sixth operator-incapable case, since its boundary was never actually verified live near the elite's own end.

## Result

| Elite | Level `reqLen`/`reqInt`/`mustCross` | `D_live` | `D_dead` | Elite length | Rollback (steps / % of elite) | Random rollout (2,000 trials) | `closeLengthGap` (floor=0, 2M-node cap) | vs. 4,000-node production budget | Referee |
|---|---|---:|---:|---:|---|---|---|---:|---|
| `R02257:elite:3` | 110 / 9 / 0 | 18 | 19 | 26 | 8 / 30.8% | **0/2000 solved**, avg 16.2 nodes/trial, best progress 78/92 residual (84.8%) | **SOLVED, 4,674 nodes** | **1.17x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R02426:elite:4` | 86 / — / — | 54 | 55 | 85 | 31 / 36.5% | **2/2000 solved** (see note below), best progress 36/32 residual (100%, i.e. some rollouts overshoot the nominal residual before dying) | **SOLVED, 5,060 nodes** | **1.27x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R03097:elite:4` | 64 / — / — | 7 | 8 | 51 | 44 / 86.3% | **0/2000 solved**, best progress 50/57 residual (87.7%) | **FAILED — exhausted the full 2,000,000-node ceiling** | n/a (defeats the diagnostic) | no path produced; nothing to referee |
| `R02644:elite:2` | 68 / — / — | 20 | 21 | 56 | 36 / 64.3% | **0/2000 solved**, best progress 42/48 residual (87.5%) | **FAILED — exhausted the full 2,000,000-node ceiling** | n/a (defeats the diagnostic) | no path produced; nothing to referee |
| `R02975:elite:4` | 69 / — / — | 10 | 11 | 64 | 54 / 84.4% | **0/2000 solved**, best progress 61/59 residual (100%+) | **FAILED — exhausted the full 2,000,000-node ceiling** | n/a (defeats the diagnostic) | no path produced; nothing to referee |
| `R02575:elite:0` | 64 / — / — | 3 | 4 | 58 | 55 / 94.8% | **0/2000 solved**, best progress 47/61 residual (77.0%) | **FAILED — exhausted the full 2,000,000-node ceiling** | n/a (defeats the diagnostic) | no path produced; nothing to referee |
| `R02919:elite:4` *(boundary unresolved — CP-SAT abstained at depth 27; excluded from rate)* | 92 / — / — | 0* | 54 | 54 | n/a | not run (no verified boundary) | FAILED at the trivial `low=0` depth (weaker test, not comparable) | n/a | n/a |

Every `closeLengthGap` failure above consumed the entire 2,000,000-node diagnostic ceiling (confirmed by each result's own reported node count), the same signature `R00648`'s original diagnosis used to rule out "just needs a modest budget increase" — none is a quick natural dead end or an artifact of an insufficient cap. `R02257`'s and `R02426`'s solves, conversely, land well inside that ceiling, so both are genuine capability results.

**Note on `R02426`'s 2/2000 random-rollout solves:** every other case classified under this program so far — `R00648`, `R03176`, `R00630`, `R02449`, and `R02257` above — solved **zero** of 2,000 blind rollouts. `R02426:elite:4` is the first case where blind construction (`takePly`) ever found a complete solution at all, however rarely (0.1%). This does not change its classification (still overwhelmingly reconstructable only via the deterministic operator, not blind search), but it is worth flagging as the first crack in the "blind rollout never works here" pattern this program had observed on every prior case.

## Interpretation

`R02257` and `R02426` land in a **distinct, previously-unmeasured zone** neither `R00630` (well under the 4,000-node production budget) nor `R02449` (317x over it) occupied: reconstructable by the same named operator, at a cost that is modestly — not dramatically — above what production actually spends there (1.17x and 1.27x). Plotted on the same cost axis the parent audit's regimes occupy:

```
0                    4,000 (production budget)                 2,000,000 (diagnostic ceiling)
|--- R00630 (3,247) ---|--- R02257 (4,674), R02426 (5,060) ---|  ...  --- R02449 (1,268,180) ---|--- R03097, R02644, R02975, R02575: never solve ---|
     under budget          near-budget-boundary (n=2/6)                317x over budget                   operator-incapable (n=4/6)
```

Extending the fresh sample from n=3 to n=7 (six with a resolved boundary) turns the earlier "does either regime recur" question into a first real **rate estimate**: 2/6 (33%) near-budget-boundary reconstructable, 4/6 (67%) operator-incapable. Both prior extremes (`R00630`'s comfortably-under-budget solve, `R02449`'s 317x-over-budget solve) remain unrecurred singletons across all seven fresh draws.

This is materially more useful than the n=3 snapshot: it says the near-budget-boundary shape is **real and recurring but a minority**, and that operator-incapability — defeating `closeLengthGap` even at 500x its production budget — is the single most common outcome for an unrelated exact-live case in this sample, not a rare edge captured by `R00648`/`R03176` alone. A population where two-thirds of fresh cases are operator-incapable is not one where a modest `closeLengthGap` budget increase (sized for the near-budget-boundary third) would move the needle on repair's overall reachability picture — it would help exactly the cases that were already going to be found relatively cheaply, and do nothing for the majority. This reframes the practical stakes of the near-budget-boundary shape *down*, not up, relative to how it read at n=2.

At the same time, n=6 is still a small sample for a population rate: treating each classification as an independent Bernoulli trial, a two-sided ~95% confidence interval around a 33% observed rate at n=6 spans roughly 10-65% — wide enough that "the true rate is anywhere from about 1-in-10 to about 2-in-3" is still consistent with this data. The point estimate is real and should replace "recurs vs. doesn't" in how this program talks about the shape, but it should not be treated as precise.

## What this does not establish

- **Not a precise rate.** n=6 resolved cases gives a wide interval (see above); a materially larger sample (order 20-30+) would be needed to narrow it enough to weigh a specific mechanism's expected value.
- **Not a retreat/reachability claim.** `floor=0` deliberately isolates the reconstruction-operator question from whether ordinary repair's actual restart/splice mechanism ever reaches these exact branch points in real operation — unchanged from every prior case in this program. This includes every operator-incapable case here: this report says nothing about whether the whole `repairSearchFromGate` process might still solve any of them through some other trajectory (the `R03176`-style question), only that each one's own frozen prefix defeats the direct diagnostic.
- **Not evidence that `R00630`'s or `R02449`'s own shapes are closed as "won't recur."** None of the seven new draws landed exactly there; a larger future sample could still surface either.
- **`R02919` is deliberately excluded from the rate**, not counted as a fifth operator-incapable case, because its CP-SAT boundary never converged — including it either way would be substituting a weaker test's result for the question the rate is actually asking.
- **`R02426`'s rare rollout success is not investigated further here** — it is flagged as a first observation, not diagnosed (no attempt made to characterize what differs about that specific trajectory).

## Disposition

Update [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s diagnostic-matrix population: ten exact-live cases now classified in total (`R00648`, `R03176`, `R00630`, `R02449`, `R02257`, `R02426`, `R03097`, `R02644`, `R02975`, `R02575`), plus one abstained (`R02919`), across four distinct cost/regime shapes (operator-incapable — now the largest group at six cases; operator-incapable-here-but-whole-process-solves, `R03176` only, open for the rest; comfortably-under-budget, `R00630` only; near-budget-boundary, `R02257`/`R02426`; `R02449`'s own far-over-budget outlier). Do not design a retreat, reconstruction-budget, or destroy mechanism from this population yet — the rate estimate (33% near-budget-boundary / 67% operator-incapable at n=6) is a first read, not a settled number. The next gate is a materially larger sample (order 20-30+ resolved cases) to narrow that interval, or a specific different question (e.g. whether operator-incapability itself correlates with any legal static level feature) before any mechanism is proposed.

## Reproduction

```bash
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --levels=data/stress/stress-levels-random.json --sample=30 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000 \
  --out=/tmp/rollback-census-new.json

node scripts/run-bundled.mjs scripts/stress/repair-elite-path-dump.mjs -- \
  --levels=data/stress/stress-levels-random.json --only=R02257,R02426,R03097,R02644,R02919,R02975,R02575 \
  --node-budget=30000 --limit-elites=5 --out=/tmp/elite-paths.json

node scripts/run-bundled.mjs scripts/stress/repair-retreat-binary-search.mjs -- \
  --dump=/tmp/elite-paths.json --corpus=data/stress/stress-levels-random.json --time-limit=60 \
  --elites=R02257:elite:3,R02426:elite:4,R03097:elite:4,R02644:elite:2,R02919:elite:4,R02975:elite:4,R02575:elite:0 \
  --out=/tmp/boundary.json

node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json --retreat-file=/tmp/boundary.json \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --out=/tmp/classification.json
```
