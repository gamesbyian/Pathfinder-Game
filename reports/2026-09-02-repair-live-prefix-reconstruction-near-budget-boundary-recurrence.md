# Repair live-prefix reconstruction: a fourth, recurring near-budget-boundary regime

> **Status:** active
> **Last evidence:** 2026-09-02 — CP-SAT-verified exact live/dead boundaries plus `closeLengthGap`/randomized-rollout classification, referee-validated and independently replayed, for two freshly-selected, unrelated-parent exact-live cases (`R02257:elite:3`, `R02426:elite:4`)
> **Decision:** neither of the two previously-named regimes (`R00630`'s comfortably-under-budget reconstruction, `R02449`'s dramatically-over-budget reconstruction) recurred on this fresh, prespecified pair. Instead, both new cases land in a distinct, previously-unseen zone: `closeLengthGap` solves, but only modestly (1.17x, 1.27x) above its own 4,000-node production budget — not comfortably under it, not hundreds of times over it. This is a genuine two-case recurrence of that specific shape, not of either prior named regime.
> **Remaining gate:** this is n=2 for the new shape — per the parent audit's own stop rule, still not enough to justify designing a specific mechanism (e.g. a modestly larger `closeLengthGap` production budget). A third+ independent unrelated case landing in the same near-budget-boundary zone would meaningfully strengthen this; a case landing back in either of the two originally-named regimes, or a wholly different shape, would show the population is heterogeneous rather than clustered near the boundary.
> **Evidence role:** discovery (population-recurrence check, same role as the parent audit's stop-rule gate)
> **Selection:** prespecified — drew one fresh, independent 30-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02`, distinct from any seed this program has used before) via `census-repair-rollback-windows.mjs`, then selected the single shallowest-rollback elite from each of the two lowest-rollback *distinct* parent levels in that sample (`R02257`, `R02426`) — before running either through CP-SAT bisection or classification, and therefore before seeing either outcome. Neither level nor elite was substituted after seeing a result.

## Why this check

[`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s remaining gate, after `R00630` and `R02449` were classified, is explicit: "check whether either new regime (`R00630`'s cheap-reconstruction shape or `R02449`'s expensive-but-reconstructable shape) recurs across unrelated exact-live cases before considering any retreat/reopening treatment or a larger `closeLengthGap` budget." Four cases (`R00648`, `R03176`, `R00630`, `R02449`) had been classified as of that report, each from the same two earlier mining rounds (an initial 3-level pilot and one 2026-08-13 "broadened sample" of 4 specific levels) — no case had yet been drawn from a genuinely fresh, independent sample.

## Method

Reused the existing pipeline exactly, end to end, with no new tooling beyond one cosmetic fix:

1. **Fresh sample.** `scripts/stress/census-repair-rollback-windows.mjs --levels=data/stress/stress-levels-random.json --sample=30 --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000` — 30 levels, 5 elites each (150 rows), none of the levels overlapping any previously-classified case (`R00001`, `R00039`, `R00044`, `R00630`, `R00648`, `R02449`, `R03176`).
2. **Selection.** Sorted all 150 rows by `rollbackSteps` ascending (the same "smallest rollbackSteps" criterion `repair-elite-path-dump.mjs`'s own header comment names as a legitimate selection basis). The single shallowest row was `R02257:elite:3` (15 steps, 13.6% of `requiredLength`); all four of `R02257`'s own elites occupied the top four slots (a level-level effect, not a selection artifact — every one of its elites happens to share a similar shallow prefix). The next-shallowest row belonging to a *different* level was `R02426:elite:4` (32 steps, 37.2%).
3. **Path dump.** `scripts/stress/repair-elite-path-dump.mjs --only=R02257 --node-budget=30000 --limit-elites=5` (and again for `R02426`) — deterministically reproduces the exact same elite selection as step 1 (confirmed: identical badness/path-length per elite), plus full packed-key paths for CP-SAT.
4. **CP-SAT exact boundary.** `scripts/stress/repair-retreat-binary-search.mjs --dump=<path dump> --time-limit=60 --elites=<id>` — the same `cpsat-reference-probe.py`-backed bisection every prior case used. One pre-existing cosmetic bug fixed along the way: this script read a dump-file field named `reqLen`, but current `repair-elite-path-dump.mjs` emits `requiredLength` — the mismatch only ever printed `reqLen=undefined` in this script's own progress log (never affected bisection logic, which uses `eliteLength`/`low`/`high` only), fixed with a fallback (`lvl.reqLen ?? lvl.requiredLength`).
5. **Classification.** `scripts/stress/repair-plateau-rollout-classifier.mjs --retreat-file=<boundary output> --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 --seed=repair-reachability-recurrence-check-2026-09-02` — identical protocol to the `R00630`/`R02449` classification (2,000 randomized rollouts from the verified-feasible depth; `closeLengthGap` with `floor=0`, full backtrack to the gate, and the same 500x-inflated 2,000,000-node diagnostic ceiling).
6. **Independent verification.** Beyond the classifier's own internal `solved`/`nodes` result, replayed each `closeLengthGap` solve two more ways for both cases: `Solver.validateCandidatePath` (the canonical referee) on the returned final path, and a from-scratch replay through fresh state confirming `isSolutionState`. Both passed on both cases.

## Result

| Elite | Level `reqLen`/`reqInt`/`mustCross` | `D_live` | `D_dead` | Elite length | Rollback (steps / % of elite) | Random rollout (2,000 trials) | `closeLengthGap` (floor=0, 2M-node cap) | vs. 4,000-node production budget | Referee |
|---|---|---:|---:|---:|---|---|---|---:|---|
| `R02257:elite:3` | 110 / 9 / 0 | 18 | 19 | 26 | 8 / 30.8% | **0/2000 solved**, avg 16.2 nodes/trial, best progress 78/92 residual (84.8%) | **SOLVED, 4,674 nodes** | **1.17x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R02426:elite:4` | 86 / — / — | 54 | 55 | 85 | 31 / 36.5% | **2/2000 solved** (see note below), best progress 36/32 residual (100%, i.e. some rollouts overshoot the nominal residual before dying) | **SOLVED, 5,060 nodes** | **1.27x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |

Both `closeLengthGap` solves are well inside the 2,000,000-node diagnostic ceiling (neither is budget-truncated the way `R00648` was), so both are genuine capability results, not artifacts of an insufficient cap.

**Note on `R02426`'s 2/2000 random-rollout solves:** every other case classified under this program so far — `R00648`, `R03176`, `R00630`, `R02449`, and `R02257` above — solved **zero** of 2,000 blind rollouts. `R02426:elite:4` is the first case where blind construction (`takePly`) ever found a complete solution at all, however rarely (0.1%). This does not change its classification (still overwhelmingly reconstructable only via the deterministic operator, not blind search), but it is worth flagging as the first crack in the "blind rollout never works here" pattern this program had observed on every prior case.

## Interpretation

Neither `R00630`'s shape (well under the 4,000-node production budget) nor `R02449`'s shape (317x over it) recurred on this fresh, unrelated pair. Instead, both land in a **distinct, previously-unmeasured zone**: reconstructable by the same named operator, at a cost that is modestly — not dramatically — above what production actually spends there (1.17x and 1.27x, versus `R02449`'s 317x). Plotted on the same cost axis the parent audit's three prior regimes occupy:

```
0                    4,000 (production budget)                 2,000,000 (diagnostic ceiling)
|--- R00630 (3,247) ---|--- R02257 (4,674), R02426 (5,060) ---|  ...  --- R02449 (1,268,180) ---|
     under budget          NEW: just above budget                      317x over budget
```

This reframes the parent audit's original "cheap reconstruction" vs. "reconstructable but only far outside budget" dichotomy as two ends of what may be a **continuum**, not two isolated clusters — `R00630` and this pair are close together in absolute node count (3,247 to 5,060, all within about 1,800 nodes of each other) despite sitting on opposite sides of the exact 4,000-node line, while `R02449` is over two orders of magnitude further out. A production budget increase small enough to close `R02257`/`R02426` (something on the order of 1.2-1.5x, not the 317x `R02449` alone would suggest) is a materially different, far less risky candidate mechanism than what `R02449` in isolation implied — but per the parent audit's own explicit stop rule, **n=2 is still not enough to design that mechanism**, only enough to note that the shape recurs and to reframe the next recurrence question more precisely.

## What this does not establish

- **Not a population.** Two cases sharing a similar cost band is suggestive, not a distribution. A third and fourth independent unrelated case are needed before any specific budget multiplier is worth proposing, per the parent audit's own "one instance does not establish a general repair policy" rule — now read as "two instances of a shape distinct from what was already tested" rather than "zero instances."
- **Not a retreat/reachability claim.** `floor=0` deliberately isolates the reconstruction-operator question from whether ordinary repair's actual restart/splice mechanism ever reaches these exact branch points in real operation — unchanged from every prior case in this program.
- **Not evidence that `R00630`'s or `R02449`'s own shapes are now closed as "won't recur."** This pair simply didn't land there; a larger future sample could still surface either shape again, or something else entirely.
- **`R02426`'s rare rollout success is not investigated further here** — it is flagged as a first observation, not diagnosed (no attempt made to characterize what differs about that specific trajectory).

## Disposition

Update [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s diagnostic-matrix population: six exact-live cases now classified in total (`R00648`, `R03176`, `R00630`, `R02449`, `R02257`, `R02426`), four distinct cost/regime shapes among them (operator-incapable; operator-incapable-here-but-whole-process-solves; comfortably-under-budget; near-budget-boundary — the new one this report adds; and `R02449`'s own far-over-budget outlier, which the near-budget pair does not generalize). Do not design a retreat, reconstruction-budget, or destroy mechanism from this n=2; the next step is a third+ independent unrelated case, prespecified the same way this pair was, before any mechanism is proposed.

## Reproduction

```bash
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --levels=data/stress/stress-levels-random.json --sample=30 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000 \
  --out=/tmp/rollback-census-new.json

node scripts/run-bundled.mjs scripts/stress/repair-elite-path-dump.mjs -- \
  --levels=data/stress/stress-levels-random.json --only=R02257,R02426 --node-budget=30000 --limit-elites=5 \
  --out=/tmp/elite-paths.json

node scripts/run-bundled.mjs scripts/stress/repair-retreat-binary-search.mjs -- \
  --dump=/tmp/elite-paths.json --corpus=data/stress/stress-levels-random.json --time-limit=60 \
  --elites=R02257:elite:3,R02426:elite:4 --out=/tmp/boundary.json

node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json --retreat-file=/tmp/boundary.json \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --out=/tmp/classification.json
```
