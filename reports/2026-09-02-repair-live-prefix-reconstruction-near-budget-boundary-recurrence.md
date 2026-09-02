# Repair live-prefix reconstruction: a first population-level rate estimate

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — a third independent batch (12 more resolved cases, 4 solved/8 operator-incapable) reached the "order 20-30+" target: **6/28 (21.4%) reconstructable, 22/28 (78.6%) operator-incapable**. Batch 3 also found that the "near-budget-boundary" regime from batch 1 does not hold up as a distinct cluster — reconstructable cases now span a continuum from 0.22x to 317x the production budget. See "Batch 3 addendum" below for the full account; batches 1-2 are preserved unchanged above it.
> **Decision:** operator-incapability is the dominant (~79%) outcome for an unrelated exact-live case, stable in shape from n=16 to n=28. The reconstructable minority's own cost is heavy-tailed, not clustered near the production budget — this closes the "near-budget-boundary" framing as a distinct regime and makes a fixed-budget-increase mechanism a harder sell than the n=6/n=16 reads suggested, not an easier one. Do not design a retreat/reconstruction-budget/destroy mechanism from this population.
> **Remaining gate:** none for this exact recurrence-check design — it reached its own target sample size. If repair-reachability work continues, the next question is qualitatively different (e.g. correlating operator-incapability with a legal static level feature), not a fourth same-design batch.
> **Evidence role:** discovery (population-recurrence check and rate estimate, same role as the parent audit's stop-rule gate)
> **Selection:** prespecified for all three batches — batch 1 (below) drew one fresh, independent 30-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02`); batch 2 (addendum) drew a second, independent 40-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02-batch2`); batch 3 (addendum) drew a third, independent 40-level stratified sample (seed `repair-reachability-recurrence-check-2026-09-02-batch3`, no overlap with any of the 24 previously-classified/abstained levels across batches 1-2) — all via the same `census-repair-rollback-windows.mjs` tool, then processed the shallowest-rollback elite from each successive distinct parent level in ascending rollback order. The selection rule was fixed before each batch, and no case was substituted after seeing its own result.

## Batch 1 (original, n=6/7) — method and result unchanged below

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

## Batch 2 addendum (same day): n grows from 6 to 16, rate narrows to 12.5%

### Method

Identical pipeline, a fresh independent sample. `census-repair-rollback-windows.mjs --sample=40 --seed=repair-reachability-recurrence-check-2026-09-02-batch2` (no overlap with any previously-classified level: `R00001`, `R00039`, `R00044`, `R00630`, `R00648`, `R02449`, `R03176`, `R02257`, `R02426`, `R03097`, `R02644`, `R02919`, `R02975`, `R02575`), giving 40 distinct-parent candidates. Fixed the rule "next 10 shallowest-rollback distinct-parent elites" before running any: `R02271:elite:4`, `R02293:elite:4`, `R02459:elite:0`, `R03297:elite:4`, `R03171:elite:3`, `R03162:elite:0`, `R02596:elite:3`, `R02816:elite:2`, `R00260:elite:4`, `R02075:elite:0`.

**Operational note.** The first CP-SAT bisection attempt for this batch ran as an unmanaged local background process (`nohup ... &`) and was silently killed mid-run partway through the 4th case, after resolving 3 (`R02271` abstained at depth 16; `R02293` converged low=16/high=17; `R02459` converged low=12/high=13). Rather than discard that partial work, the run was repeated in full: the clean rerun reproduced all 3 recovered boundaries exactly (confirming CP-SAT bisection is deterministic given identical inputs) and additionally converged on `R02271` (low=1/high=32) where the interrupted run had abstained — the earlier abstention was a 60-second time-limit fluke on that one probe, not a genuine unresolved interior. The same pattern recurred for `R02816` and `R00260` in the full rerun (both abstained once, both converged on retry). All 10 elites have a genuine resolved CP-SAT boundary in the final dataset used below.

### Result

| Elite | `D_live` | `D_dead` | Elite length | Random rollout (2,000 trials) | `closeLengthGap` (floor=0, 2M-node cap) |
|---|---:|---:|---:|---|---|
| `R02271:elite:4` | 1 | 32 | 32 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R02293:elite:4` | 16 | 17 | 49 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R02459:elite:0` | 12 | 13 | 46 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R03297:elite:4` | 50 | 51 | 53 | **2/2000 solved** (as with `R02426`, does not change classification) | **FAILED — exhausted 2,000,000-node ceiling** |
| `R03171:elite:3` | 8 | 9 | 49 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R03162:elite:0` | 3 | 4 | 50 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R02596:elite:3` | 16 | 17 | 71 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R02816:elite:2` | 16 | 17 | 68 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R00260:elite:4` | 21 | 22 | 66 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |
| `R02075:elite:0` | 5 | 6 | 59 | 0/2000 solved | **FAILED — exhausted 2,000,000-node ceiling** |

**All ten are operator-incapable.** Zero near-budget-boundary or comfortably-reconstructable cases in this batch — every `closeLengthGap` invocation consumed the full 2,000,000-node diagnostic ceiling exactly (confirmed by each result's own reported node count), the same signature used throughout this program to rule out "just needs a modest budget/backtrack increase." No path was produced by any case, so there is nothing to referee-verify (consistent with every prior operator-incapable case in this program).

### Combined rate estimate (batches 1 + 2)

| | near-budget-boundary | operator-incapable | total resolved |
|---|---:|---:|---:|
| Batch 1 (2026-09-02) | 2 (`R02257`, `R02426`) | 4 (`R03097`, `R02644`, `R02975`, `R02575`) | 6 |
| Batch 2 (2026-09-02) | 0 | 10 (all) | 10 |
| **Combined** | **2 (12.5%)** | **14 (87.5%)** | **16** |

Treating each classification as an independent Bernoulli trial, a two-sided ~95% confidence interval around a 12.5% observed rate at n=16 is roughly 4-32% — narrower than batch 1's ~10-65% interval at n=6, and no longer consistent with "roughly a third," which the n=6 read could not rule out. The two near-budget-boundary cases are unchanged (`R02257`, `R02426`) — batch 2 did not surface a third instance of that shape, nor did it surface `R00630`'s or `R02449`'s shapes. `R03297`'s 2/2000 rollout success joins `R02426`'s as a second (still undiagnosed) crack in the "blind rollout never works" pattern, without changing either case's `closeLengthGap`-based classification.

### What batch 2 changes and does not change

- **Changes:** the point estimate (33% → 12.5% near-budget-boundary) and the confidence interval's width (roughly 10-65% → roughly 4-32%). The qualitative conclusion — operator-incapability is the dominant outcome, a near-budget-boundary-sized budget increase would not move the needle on the majority — is now *better supported*, not merely repeated.
- **Does not change:** the near-budget-boundary shape's reality (still two independent, referee-verified recurrences); `R00630`'s and `R02449`'s status as unrecurred singletons; the standing rule against designing a mechanism from this population; the "order 20-30+" target for a precise rate, which n=16 has not yet reached.

## Disposition (updated)

Update [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s diagnostic-matrix population: **twenty** exact-live cases now classified in total (the original ten plus batch 2's ten), plus one abstained (`R02919`), across the same four distinct cost/regime shapes, with operator-incapable now the overwhelming majority (16 of 20 classified cases across both programs, 14/16 in the fresh-sample rate estimate specifically). Still do not design a retreat, reconstruction-budget, or destroy mechanism from this population — the rate estimate (12.5% near-budget-boundary / 87.5% operator-incapable at n=16) is more precise than the n=6 read but has not yet reached the "order 20-30+" target. The next gate, if this program continues, is a third batch of comparable size to close that gap, or a specific different question (e.g. whether operator-incapability correlates with any legal static level feature) before any mechanism is proposed.

## Reproduction (batch 2)

```bash
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --levels=data/stress/stress-levels-random.json --sample=40 \
  --seed=repair-reachability-recurrence-check-2026-09-02-batch2 --limit-elites=5 --node-budget=30000 \
  --out=/tmp/rollback-census-batch2.json

node scripts/run-bundled.mjs scripts/stress/repair-elite-path-dump.mjs -- \
  --levels=data/stress/stress-levels-random.json \
  --only=R02271,R02293,R02459,R03297,R03171,R03162,R02596,R02816,R00260,R02075 \
  --node-budget=30000 --limit-elites=5 --out=/tmp/elite-paths-batch2.json

node scripts/run-bundled.mjs scripts/stress/repair-retreat-binary-search.mjs -- \
  --dump=/tmp/elite-paths-batch2.json --corpus=data/stress/stress-levels-random.json --time-limit=60 \
  --elites=R02271:elite:4,R02293:elite:4,R02459:elite:0,R03297:elite:4,R03171:elite:3,R03162:elite:0,R02596:elite:3,R02816:elite:2,R00260:elite:4,R02075:elite:0 \
  --out=/tmp/boundary-batch2.json

node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json --retreat-file=/tmp/boundary-batch2.json \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reachability-recurrence-check-2026-09-02-batch2 --out=/tmp/classification-batch2.json
```

## Batch 3 addendum (same day): n reaches 28, reconstruction cost turns out to be a continuum, not a second cluster

### Method

Identical pipeline, a fresh independent sample. `census-repair-rollback-windows.mjs --sample=40 --seed=repair-reachability-recurrence-check-2026-09-02-batch3` (no overlap with any of the 24 previously-classified/abstained levels across batches 1+2: `R00001`, `R00039`, `R00044`, `R00630`, `R00648`, `R02449`, `R03176`, `R02257`, `R02426`, `R03097`, `R02644`, `R02919`, `R02975`, `R02575`, `R02271`, `R02293`, `R02459`, `R03297`, `R03171`, `R03162`, `R02596`, `R02816`, `R00260`, `R02075`). Fixed the rule "next 12 shallowest-rollback distinct-parent elites" before running any: `R02958:elite:3`, `R02134:elite:0`, `R02344:elite:0`, `R02413:elite:3`, `R02990:elite:0`, `R03020:elite:0`, `R03104:elite:3`, `R00500:elite:0`, `R01936:elite:3`, `R03187:elite:4`, `R00479:elite:4`, `R02265:elite:2`. Ran the bisection step as a harness-tracked background command rather than an unmanaged `nohup` process this time (batch 2's own operational note flagged a prior silent process death) — completed cleanly with no interruption.

**Operational note (fluke abstentions, resolved by retry — same pattern as batch 2).** The first bisection pass resolved 9/12 elites cleanly but 3 (`R03187`, `R00479`, `R02265`) abstained immediately at the full elite-length probe (`probe-exit-2`, a CP-SAT reference-probe subprocess exit code rather than a genuine UNKNOWN status). Retrying only those 3 (per this program's own "recover partial results rather than rerun entire tests" practice) resolved all three cleanly on the first attempt, matching batch 2's finding that such abstentions are typically transient rather than structural. One elite (`R01936`) hit a mid-bisection abstention that narrowed only from low=43/high=45 to low=43/high=44 on retry — genuinely converged (adjacent) on the second attempt.

**`R00500`: a real but imprecise boundary, included with a caveat (unlike `R02919`).** `R00500`'s depth=4 probe abstained identically on two separate attempts (both `reference-unknown`, i.e. a genuine CP-SAT `UNKNOWN` status, not a subprocess flake), leaving `low=3` (the elite's own trivial `commonPrefixSteps-1` floor — CP-SAT never confirmed a deeper `live` point) and `high=6` (CP-SAT-verified `dead`). This differs from `R02919`'s batch-1 exclusion in one material way: `R02919`'s own `high` never narrowed at all from the elite's near-full length (54 of 54 — essentially zero information), while `R00500`'s `high` narrowed from the elite's full 57 down to 6 (real, substantial progress) before the one persistent abstention. Since `repair-plateau-rollout-classifier.mjs` runs `closeLengthGap` from `low` regardless (not from `high`), and `R00500`'s `low=3` is the exact same kind of floor every other case's `low` initializes from before any CP-SAT `live` confirmation, this case is included below rather than excluded — flagged, not discarded.

**Independent referee verification, now built into the tool itself.** Prior batches verified each `closeLengthGap` solve by hand, outside the classifier script. This batch found that awkward enough (4 solves to verify) to fix properly: `repair-plateau-rollout-classifier.mjs`'s `closeGapAtDepth` now returns the solved path, and the classifier calls `Solver.validateCandidatePath` (the canonical referee) plus a from-scratch replay confirming `isSolutionState` directly on every solved case, logging and persisting both results. All four of this batch's solves passed both checks. This is a reusable fix, not a one-off — any future run of this tool with `--close-gap-node-budget>0` now gets this verification automatically.

### Result

| Elite | `D_live`/`D_dead` (CP-SAT boundary) | Elite length | `closeLengthGap` (floor=0, 2M-node cap) | vs. 4,000-node production budget | Referee |
|---|---|---:|---|---:|---|
| `R02958:elite:3` | 29/30 | 30 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R02134:elite:0` | 69/70 | 80 | **SOLVED, 888 nodes** | **0.22x (under budget)** | `validateCandidatePath: ok`, replay `isSolutionState: true` |
| `R02344:elite:0` | 49/50 | 71 | **SOLVED, 79,045 nodes** | **19.76x** | `validateCandidatePath: ok`, replay `isSolutionState: true` |
| `R02413:elite:3` | 10/11 | 41 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R02990:elite:0` | 29/30 | 65 | **SOLVED, 461,616 nodes** | **115.40x** | `validateCandidatePath: ok`, replay `isSolutionState: true` |
| `R03020:elite:0` | 40/41 | 78 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R03104:elite:3` | 34/35 | 58 | **SOLVED, 90,792 nodes** | **22.70x** | `validateCandidatePath: ok`, replay `isSolutionState: true` |
| `R00500:elite:0` *(imprecise boundary, low=3/high=6 — see above)* | 3/6 | 57 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R01936:elite:3` | 43/44 | 91 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R03187:elite:4` | 9/10 | 58 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R00479:elite:4` | 1/2 | 57 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |
| `R02265:elite:2` | 12/13 | 64 | **FAILED — exhausted 2,000,000-node ceiling** | n/a | — |

**4/12 solved, 8/12 operator-incapable** (every failure again consumed the full 2,000,000-node ceiling exactly, the same signature used throughout this program). All 2,000-trial random rollouts at each verified-boundary depth again solved 0/2000 (no case in this batch repeated `R02426`'s/`R03297`'s rare rollout crack).

### The new finding: successful reconstruction cost is a continuum, not two clusters

Batch 1's n=2 near-budget-boundary reads (`R02257` 1.17x, `R02426` 1.27x) sat suspiciously close together next to the far outlier `R02449` (317x), inviting a "two clusters" reading — comfortably-under-budget, a narrow near-boundary band, and a rare far-over-budget outlier. **Batch 3 breaks that reading.** Combining every reconstructable (solved) case found across this program's original mining and both recurrence-check batches, by cost multiple over the 4,000-node production budget:

```
0.22x (R02134)  0.81x (R00630)  1.17x (R02257)  1.27x (R02426)  19.76x (R02344)  22.70x (R03104)  115.40x (R02990)  317x (R02449)
```

Eight known-reconstructable cases now span nearly three orders of magnitude with no gap wide enough to call any two of them "the same cluster" — the near-budget-boundary pair from batch 1 was two adjacent points on what is actually a continuous (or at least densely-populated, heavy-tailed) distribution, not evidence of a distinct second regime. This is a real, useful correction: it does not change the operator-incapable/reconstructable split (still the dominant distinction), but it retires the "near-budget-boundary" framing as a named regime worth targeting on its own.

### Combined rate estimate (batches 1 + 2 + 3)

| | reconstructable (solved) | operator-incapable | total resolved |
|---|---:|---:|---:|
| Batch 1 (2026-09-02) | 2 | 4 | 6 |
| Batch 2 (2026-09-02) | 0 | 10 | 10 |
| Batch 3 (2026-09-02) | 4 | 8 | 12 |
| **Combined** | **6 (21.4%)** | **22 (78.6%)** | **28** |

This reaches the "order 20-30+" target this report's own n=6 version set as the next gate. A Wilson score interval around 21.4% at n=28 is roughly 10-40% (wider than a naive normal approximation would suggest at this sample size) — narrower than batch 1's n=6 interval, comparable in shape to the n=16 interval, and now resting on a rate that has moved back up from 12.5% (n=16, all-operator-incapable batch 2) toward the original n=6 read, illustrating that even at n≈16-28 this rate estimate is still not fully stable — batch-to-batch composition varies meaningfully (batch 2: 0/10 solved; batch 3: 4/12 solved).

### What this changes and does not change

- **Changes:** retires "near-budget-boundary" as a distinct named regime — the evidence now reads as a single reconstructable-cost continuum from well-under-budget to hundreds-of-x over, with no clean second cluster. Confirms independent referee verification is now built into `repair-plateau-rollout-classifier.mjs` itself rather than a manual step, for any future run.
- **Does not change:** the primary operator-incapable/reconstructable split (78.6% operator-incapable, the dominant outcome, essentially unchanged in shape from n=16's 87.5%); the standing rule against designing a retreat/reconstruction-budget/destroy mechanism from this population; `R00630`'s and `R02449`'s status as the original two mined extremes (now joined by six more fresh-sample points spanning the same range).
- **Sharpens the negative case against a budget-increase mechanism specifically:** even restricted to the reconstructable minority, no single fixed budget multiplier is well-matched to this population — a modest increase (e.g. 20-25x) would catch `R02344`/`R03104` but still miss `R02990` (115x) and `R02449` (317x) entirely, while spending unnecessary budget on cases like `R02134` (already well under the existing 4,000-node budget). A heavy-tailed reconstruction-cost distribution is a *harder* target for a fixed-budget mechanism than the narrow-cluster reading suggested, not an easier one.

### Disposition

Combined resolved population (`n=28`, excluding the one CP-SAT-abstained case, `R02919`) has reached this report's own "order 20-30+" target. **Close this recurrence-check line of investigation as sufficiently powered for the question it was designed to answer** ("does either originally-mined regime recur, and at what rate"): both regimes recurred at least once, but the underlying structure is a continuum rather than discrete regimes, and operator-incapability remains the dominant (~79%) outcome for an unrelated exact-live case. Do not run a batch 4 of the same design merely to further narrow this interval — the next repair-reachability question, if this program continues, is qualitatively different: whether operator-incapability (or reconstruction cost, among the reconstructable minority) correlates with any legal static level feature, per the parent audit's own next-step framing, not another same-design recurrence batch.

### Reproduction (batch 3)

```bash
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --levels=data/stress/stress-levels-random.json --sample=40 \
  --seed=repair-reachability-recurrence-check-2026-09-02-batch3 --limit-elites=5 --node-budget=30000 \
  --out=/tmp/rollback-census-batch3.json

node scripts/run-bundled.mjs scripts/stress/repair-elite-path-dump.mjs -- \
  --levels=data/stress/stress-levels-random.json \
  --only=R02958,R02134,R02344,R02413,R02990,R03020,R03104,R00500,R01936,R03187,R00479,R02265 \
  --node-budget=30000 --limit-elites=5 --out=/tmp/elite-paths-batch3.json

node scripts/run-bundled.mjs scripts/stress/repair-retreat-binary-search.mjs -- \
  --dump=/tmp/elite-paths-batch3.json --corpus=data/stress/stress-levels-random.json --time-limit=60 \
  --elites=R02958:elite:3,R02134:elite:0,R02344:elite:0,R02413:elite:3,R02990:elite:0,R03020:elite:0,R03104:elite:3,R00500:elite:0,R01936:elite:3,R03187:elite:4,R00479:elite:4,R02265:elite:2 \
  --out=/tmp/boundary-batch3.json
# (any abstained elite retried individually the same way; results merged by eliteId before classifying)

node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json --retreat-file=/tmp/boundary-batch3-final.json \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reachability-recurrence-check-2026-09-02-batch3 --out=/tmp/classification-batch3.json
```
