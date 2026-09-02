# Repair live-prefix reconstruction: near-budget-boundary recurrence, and the population stays heterogeneous

> **Status:** active
> **Last evidence:** 2026-09-02 — CP-SAT-verified exact live/dead boundaries plus `closeLengthGap`/randomized-rollout classification, referee-validated and independently replayed, for three freshly-selected, unrelated-parent exact-live cases (`R02257:elite:3`, `R02426:elite:4`, `R03097:elite:4`)
> **Decision:** the first two new cases recurred a shape neither `R00630` nor `R02449` occupied — `closeLengthGap` solves, but only modestly (1.17x, 1.27x) above its own 4,000-node production budget. Extending to a third independent case before proposing any mechanism (per the parent audit's own stop rule) was the right call: `R03097:elite:4` did **not** continue that pattern — it defeats `closeLengthGap` entirely, even at the full 2,000,000-node diagnostic ceiling, recurring the `R00648`/`R03176` operator-incapable shape instead. The population is genuinely heterogeneous across three independent draws, not converging on one dominant shape.
> **Remaining gate:** the near-budget-boundary shape is still only n=2 (`R02257`, `R02426`); it did not go 3-for-3, so it is evidence of recurrence, not evidence of dominance. Do not design any mechanism (retreat, reconstruction-budget, or destroy) from this population yet — three independent draws have now landed in three of the four known shapes (near-budget-boundary x2, operator-incapable x1), which itself argues for a materially larger sample before treating any single shape as the one worth engineering for.
> **Evidence role:** discovery (population-recurrence check, same role as the parent audit's stop-rule gate)
> **Selection:** prespecified — drew one fresh, independent 30-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02`, distinct from any seed this program has used before) via `census-repair-rollback-windows.mjs`, then selected the single shallowest-rollback elite from each of the three lowest-rollback *distinct* parent levels in that sample (`R02257`, `R02426`, `R03097`, in that order) — each run through CP-SAT bisection and classification before the next was selected, but the selection rule itself (next-shallowest distinct parent) was fixed before seeing any of the three outcomes, and none of the three was substituted after seeing its own result.

## Why this check

[`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s remaining gate, after `R00630` and `R02449` were classified, is explicit: "check whether either new regime (`R00630`'s cheap-reconstruction shape or `R02449`'s expensive-but-reconstructable shape) recurs across unrelated exact-live cases before considering any retreat/reopening treatment or a larger `closeLengthGap` budget." Four cases (`R00648`, `R03176`, `R00630`, `R02449`) had been classified as of that report, each from the same two earlier mining rounds (an initial 3-level pilot and one 2026-08-13 "broadened sample" of 4 specific levels) — no case had yet been drawn from a genuinely fresh, independent sample.

## Method

Reused the existing pipeline exactly, end to end, with no new tooling beyond one cosmetic fix:

1. **Fresh sample.** `scripts/stress/census-repair-rollback-windows.mjs --levels=data/stress/stress-levels-random.json --sample=30 --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000` — 30 levels, 5 elites each (150 rows), none of the levels overlapping any previously-classified case (`R00001`, `R00039`, `R00044`, `R00630`, `R00648`, `R02449`, `R03176`).
2. **Selection.** Sorted all 150 rows by `rollbackSteps` ascending (the same "smallest rollbackSteps" criterion `repair-elite-path-dump.mjs`'s own header comment names as a legitimate selection basis), then fixed the rule "take the shallowest-rollback elite from each successive distinct parent level, in ascending order" before running any of them. The single shallowest row was `R02257:elite:3` (15 steps, 13.6% of `requiredLength`); all four of `R02257`'s own elites occupied the top four slots (a level-level effect, not a selection artifact — every one of its elites happens to share a similar shallow prefix). The next-shallowest row belonging to a *different* level was `R02426:elite:4` (32 steps, 37.2%); the one after that was `R03097:elite:4` (44 steps, 86.3% — the census's conservative longest-common-prefix proxy already flagged this one as a much deeper rollback than the first two, though not by how it would ultimately classify).
3. **Path dump.** `scripts/stress/repair-elite-path-dump.mjs --only=<levelId> --node-budget=30000 --limit-elites=5` for each of `R02257`, `R02426`, `R03097` — deterministically reproduces the exact same elite selection as step 1 (confirmed: identical badness/path-length per elite), plus full packed-key paths for CP-SAT.
4. **CP-SAT exact boundary.** `scripts/stress/repair-retreat-binary-search.mjs --dump=<path dump> --time-limit=60 --elites=<id>` — the same `cpsat-reference-probe.py`-backed bisection every prior case used. One pre-existing cosmetic bug fixed along the way: this script read a dump-file field named `reqLen`, but current `repair-elite-path-dump.mjs` emits `requiredLength` — the mismatch only ever printed `reqLen=undefined` in this script's own progress log (never affected bisection logic, which uses `eliteLength`/`low`/`high` only), fixed with a fallback (`lvl.reqLen ?? lvl.requiredLength`).
5. **Classification.** `scripts/stress/repair-plateau-rollout-classifier.mjs --retreat-file=<boundary output> --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 --seed=repair-reachability-recurrence-check-2026-09-02` — identical protocol to the `R00630`/`R02449` classification (2,000 randomized rollouts from the verified-feasible depth; `closeLengthGap` with `floor=0`, full backtrack to the gate, and the same 500x-inflated 2,000,000-node diagnostic ceiling).
6. **Independent verification.** Beyond the classifier's own internal `solved`/`nodes` result, replayed each `closeLengthGap` *solve* two more ways: `Solver.validateCandidatePath` (the canonical referee) on the returned final path, and a from-scratch replay through fresh state confirming `isSolutionState`. Both passed on both solved cases (`R02257`, `R02426`). `R03097:elite:4` produced no path to verify — it exhausted the full 2,000,000-node diagnostic ceiling without solving, confirmed by its own reported node count matching that ceiling exactly (not a quick natural dead end).

## Result

| Elite | Level `reqLen`/`reqInt`/`mustCross` | `D_live` | `D_dead` | Elite length | Rollback (steps / % of elite) | Random rollout (2,000 trials) | `closeLengthGap` (floor=0, 2M-node cap) | vs. 4,000-node production budget | Referee |
|---|---|---:|---:|---:|---|---|---|---:|---|
| `R02257:elite:3` | 110 / 9 / 0 | 18 | 19 | 26 | 8 / 30.8% | **0/2000 solved**, avg 16.2 nodes/trial, best progress 78/92 residual (84.8%) | **SOLVED, 4,674 nodes** | **1.17x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R02426:elite:4` | 86 / — / — | 54 | 55 | 85 | 31 / 36.5% | **2/2000 solved** (see note below), best progress 36/32 residual (100%, i.e. some rollouts overshoot the nominal residual before dying) | **SOLVED, 5,060 nodes** | **1.27x** | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R03097:elite:4` | 64 / — / — | 7 | 8 | 51 | 44 / 86.3% | **0/2000 solved**, best progress 50/57 residual (87.7%) | **FAILED — exhausted the full 2,000,000-node ceiling** | n/a (defeats the diagnostic) | no path produced; nothing to referee |

Both `R02257`'s and `R02426`'s `closeLengthGap` solves land well inside the 2,000,000-node diagnostic ceiling (neither is budget-truncated the way `R00648` was), so both are genuine capability results, not artifacts of an insufficient cap. `R03097` is the opposite: its failure consumes the entire ceiling, the same signature `R00648`'s original diagnosis used to rule out "just needs a modest budget increase" for that case.

**Note on `R02426`'s 2/2000 random-rollout solves:** every other case classified under this program so far — `R00648`, `R03176`, `R00630`, `R02449`, and `R02257` above — solved **zero** of 2,000 blind rollouts. `R02426:elite:4` is the first case where blind construction (`takePly`) ever found a complete solution at all, however rarely (0.1%). This does not change its classification (still overwhelmingly reconstructable only via the deterministic operator, not blind search), but it is worth flagging as the first crack in the "blind rollout never works here" pattern this program had observed on every prior case.

## Interpretation

`R02257` and `R02426` land in a **distinct, previously-unmeasured zone** neither `R00630` (well under the 4,000-node production budget) nor `R02449` (317x over it) occupied: reconstructable by the same named operator, at a cost that is modestly — not dramatically — above what production actually spends there (1.17x and 1.27x). Plotted on the same cost axis the parent audit's regimes occupy:

```
0                    4,000 (production budget)                 2,000,000 (diagnostic ceiling)
|--- R00630 (3,247) ---|--- R02257 (4,674), R02426 (5,060) ---|  ...  --- R02449 (1,268,180) ---|--- R03097: never solves ---|
     under budget          near-budget-boundary (NEW, n=2)             317x over budget          operator-incapable (recurs)
```

Extending to a third independent draw before drawing any conclusion — the parent audit's own explicit discipline — mattered: `R03097:elite:4` broke the pattern entirely, defeating `closeLengthGap` at the full 2,000,000-node ceiling, the same way `R00648` and `R03176` did. Three independent, unrelated-parent draws landed in **three different shapes** (near-budget-boundary x2, operator-incapable x1) out of the four now known. That is real information, but it points the opposite direction from "a continuum worth engineering for": a population where a fresh draw has a real chance of landing in the operator-incapable bucket is not one where a modest `closeLengthGap` budget increase would reliably help — it would help exactly the near-budget-boundary cases and do nothing for the operator-incapable ones, and this sample cannot yet say what fraction of real cases are which.

This still leaves the near-budget-boundary shape as a genuine, referee-verified two-case recurrence, distinct from anything previously classified — not a coincidence attributable to a shared parent or a shared selection artifact (`R02257` and `R02426` are unrelated levels with different `requiredLength`/mechanic profiles). But per the parent audit's own explicit stop rule, **recurrence in 2 of 3 draws is not dominance, and dominance (or even a defensible rate estimate) is what a budget-increase mechanism would need to justify its cost against the operator-incapable population it cannot help.**

## What this does not establish

- **Not a population, and now demonstrably not a clean dichotomy either.** Three independent draws surfacing three different shapes argues for measuring a real rate across a materially larger sample before proposing any specific budget multiplier, per the parent audit's own "one instance does not establish a general repair policy" rule — now with concrete evidence that a small sample does not settle it either.
- **Not a retreat/reachability claim.** `floor=0` deliberately isolates the reconstruction-operator question from whether ordinary repair's actual restart/splice mechanism ever reaches these exact branch points in real operation — unchanged from every prior case in this program. This includes `R03097`: this report says nothing about whether the whole `repairSearchFromGate` process might still solve `R03097` through some other trajectory (the `R03176`-style question), only that this one frozen prefix defeats the direct diagnostic.
- **Not evidence that `R00630`'s or `R02449`'s own shapes are closed as "won't recur."** None of the three new draws landed exactly there; a larger future sample could still surface either.
- **`R02426`'s rare rollout success is not investigated further here** — it is flagged as a first observation, not diagnosed (no attempt made to characterize what differs about that specific trajectory).

## Disposition

Update [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s diagnostic-matrix population: seven exact-live cases now classified in total (`R00648`, `R03176`, `R00630`, `R02449`, `R02257`, `R02426`, `R03097`), four distinct cost/regime shapes among them (operator-incapable — now `R00648`, `R03176`, and `R03097`; operator-incapable-here-but-whole-process-solves, `R03176` only, an open question for `R03097`; comfortably-under-budget, `R00630` only; near-budget-boundary, `R02257`/`R02426`; and `R02449`'s own far-over-budget outlier). Do not design a retreat, reconstruction-budget, or destroy mechanism from this population — three independent draws landing in three different shapes is itself evidence that no single shape can yet be treated as dominant. The next gate is a materially larger sample (not just one or two more cases) with an explicit rate estimate per shape, before any mechanism is proposed.

## Reproduction

```bash
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --levels=data/stress/stress-levels-random.json --sample=30 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --limit-elites=5 --node-budget=30000 \
  --out=/tmp/rollback-census-new.json

node scripts/run-bundled.mjs scripts/stress/repair-elite-path-dump.mjs -- \
  --levels=data/stress/stress-levels-random.json --only=R02257,R02426,R03097 --node-budget=30000 --limit-elites=5 \
  --out=/tmp/elite-paths.json

node scripts/run-bundled.mjs scripts/stress/repair-retreat-binary-search.mjs -- \
  --dump=/tmp/elite-paths.json --corpus=data/stress/stress-levels-random.json --time-limit=60 \
  --elites=R02257:elite:3,R02426:elite:4,R03097:elite:4 --out=/tmp/boundary.json

node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json --retreat-file=/tmp/boundary.json \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reachability-recurrence-check-2026-09-02 --out=/tmp/classification.json
```
