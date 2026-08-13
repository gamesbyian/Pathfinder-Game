# Repair-probe / early-main-loop node starvation: diagnosis and a pilot fix (2026-08-12)

Follow-up to `reports/2026-08-12-main-loop-late-reserve-population-ab.md`'s "Follow-up" section
and `docs/future-work.md` item #4, which flagged a plausible-but-unconfirmed mechanism for why the
2026-08-12 single full-corpus sweep with both `PRUNE_MC_NEIGHBOR_BUDGET` and
`STRATEGY_MAIN_LOOP_LATE_RESERVE` genuinely default-on came back at Corpus-2 635/1700 — lower than
several individual reference points including the confounded 0.15 treatment arm's 694.

**Bottom line: the specific hypothesis in the originating report is wrong as stated, but a real,
related, and previously-undocumented starvation mechanism exists nearby. A small fix for that real
mechanism, `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`, was implemented as an opt-in pilot, then
confirmed at larger scale and promoted to production default-ON on 2026-08-13 — see "Promotion"
near the end of this report for the decision and its explicit caveats.**

## Phase 1: the stated hypothesis, traced against the actual code

The originating report's plausible mechanism was: `runRepairProbe` runs before either the
admissible-order reserve or the main-loop late reserve is "applied," so a repair probe that (post
`2bfefc660`, the wall-clock-trip-wire fix) now spends its full intended node budget under
contention could eat into those reserved slices, starving their beneficiaries.

Reading `orchestration.ts`'s `solveLevel` in order refutes this as literally stated:

1. `admissibleOrderNodeReserve` is computed and subtracted from `nodeBudget` to produce
   `earlyTierNodeBudget` — **before** the probe runs.
2. `mainLoopLateReserve` is computed and subtracted from `earlyTierNodeBudget` to produce
   `mainLoopEarlyNodeBudget` — **before** the probe runs.
3. `runRepairProbe` is called with `mainLoopEarlyNodeBudget` as its own external node ceiling
   (`nodeBudget` param), and each of its rounds caps itself to
   `Math.min(fixedProbeNodeBudget, remainingExternal)` — it structurally **cannot** exceed
   `mainLoopEarlyNodeBudget`, so it cannot dip into either reserve. Both reserves are, by
   construction, already carved out and protected before the probe ever starts.

So a repair probe consuming more of its own allotted budget cannot, through this code path,
starve the late-reserve or admissible-order tiers directly.

## What IS real: the probe and the early main-loop configs share one unprotected pool

`mainLoopEarlyNodeBudget` itself has no internal split between "the probe's share" and "the early
main-loop configs' share" — they draw from the same running `prep._metrics.nodesExpanded` counter
against the same ceiling, and the probe runs **first**, taking whatever it needs (up to its own
fixed worst case, ~10,000,000 nodes when a single biased tier is present: 2×2,000,000 ordinary +
6,000,000 biased) before the early main-loop configs (`runInterleavedAttempts`/
`runGateSerialAttempts`, config indices before `mainLoopLateConfigStart`) get a single node.
`earlyConfigNodeBudget` in those functions is exactly `mainLoopEarlyNodeBudget`; once
`nodesSpent >= earlyConfigNodeBudget` the loop jumps straight past the remaining early configs to
the late-reserve suffix (`ci = lateConfigStart - 1; continue configLoop`).

### Direct local confirmation (n=12, uncontended)

Sample: the 5 known `PRUNE_MC_NEIGHBOR_BUDGET` five-loss levels (`R00635`, `R02119`, `R02422`,
`R02823`, `R02867`) plus 7 more repair-gated Corpus-2 levels (`needsRepairFallback`:
`mustCross>=2 && mustPass>=3`), evenly spread across `data/stress/stress-levels-random.json`:
`R00044`, `R00602`, `R01174`, `R01856`, `R02083`, `R02205`, `R02318`. Budget: `--node-budget=15000000
--work-budget=100000000 --budget-ms=86400000` (non-binding) `--workers=1`, uncontended (single
process, this sandbox). 15,000,000 was chosen (rather than the canonical `solver-stress-refresh.yml`
workflow's `corpus2_node_budget` default, 50,000,000 as of `c011b4c9`'s 2026-08-12 corpus-1/corpus-2
unification — was 36,000,000 before that commit) purely for local iteration speed, per CLAUDE.md's
"iterate freely before gating" — see the caveat below on why absolute severity at this budget does
not transfer directly to production's real budget.

At this budget: `admissibleOrderNodeReserve = floor(15,000,000 × 0.25) = 3,750,000`,
`earlyTierNodeBudget = 11,250,000`, `mainLoopLateReserve = floor(11,250,000 × 0.15) = 1,687,500`,
`mainLoopEarlyNodeBudget = 9,562,500`.

| level | ordinary-tier min `bestBadness` | biased tier present | probe nodes (current code) | early main-loop nodes | result |
|---|---:|:---:|---:|---:|---|
| R00044 | 13 | no | 4,000,000 | 5,562,613 | unsolved |
| R00602 | 15 | yes | 9,562,530 | **0** | unsolved |
| R00635 | 15 | yes | 9,562,505 | **0** | unsolved |
| R01174 | 26 | yes | 9,562,581 | **0** | unsolved |
| R01856 | 3 | yes | 9,562,505 | **0** | solved (late-reserve config) |
| R02083 | 18 | yes | 9,562,533 | **0** | unsolved |
| R02119 | — (no ordinary probe; not repair-gated by `mustPass`) | no | 0 | 9,856,544 | unsolved |
| R02205 | 8 | yes | 9,562,505 | **0** | unsolved |
| R02318 | 19 | no | 4,000,051 | 678,501 | unsolved |
| R02422 | 6 | no | 4,000,002 | 662,437 | unsolved |
| R02823 | 4 | yes | 9,308,917 (probe itself solves) | — | **solved by probe** |
| R02867 | 18 | yes | 9,562,517 | **0** | unsolved |

**7 of 12 levels have the probe consuming the *entire* `mainLoopEarlyNodeBudget` pool
(~9,562,500), leaving the early main-loop configs exactly zero nodes.** At this reduced budget the
probe's own worst case (~10,000,000, when a biased tier is present) is close to the whole
early-tier pool (9,562,500), so on any level whose probe doesn't itself solve, it structurally
crowds out every early main-loop config. At production's real 50,000,000-node budget the same
arithmetic gives `admissibleOrderNodeReserve = 12,500,000`, `earlyTierNodeBudget = 37,500,000`,
`mainLoopLateReserve = 5,625,000`, `mainLoopEarlyNodeBudget = 31,875,000` — the probe's ~10,000,000
worst case is a much smaller fraction (~31%) of that pool, so the *severity* of this specific
finding does not transfer 1:1 to production; the *mechanism* (unprotected shared pool, probe goes
first) is identical regardless of budget size, and the wall-clock fix's real effect (letting a
contended probe reach closer to its full worst case) still shifts the split between probe and
early configs in the same direction at any budget.

### A naive static fix is zero-sum, not a clean win

Testing whether simply shrinking the probe's own node budget recovers early-config solves
(`REPAIR_PROBE_NODE_SCALE_DEBUG=0.55`, matching the measured pre-`2bfefc660`
contended-throughput ratio from `reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`,
applied uniformly to every probe round):

- **R00602 flips unsolved → solved**: probe usage drops 9,562,530 → 5,500,059, freeing enough of
  the shared pool for an early main-loop config to solve it in 520,775 nodes.
- **R02823 flips solved → unsolved**: this level's own actual solution lies at 9,308,917 nodes
  *inside the probe's own biased-tier search* — a uniform 0.55 cap truncates the probe at
  5,500,015, well short, and nothing later in the ladder finds it either at this budget.

One gain, one loss — exactly the zero-sum trade-off CLAUDE.md's guardrails warn a blanket
reallocation risks, and direct, local, non-hypothetical confirmation of it, not just a theoretical
concern.

## Phase 2: a live, single-signal, single-recipient pilot fix

The zero-sum result is the actual evidence for the online-allocation framing already recorded in
`docs/solver-opt-in-experiment-ledger.md`, `docs/solver-interoperability-and-cooperation-plan.md`
§17, and `docs/future-work.md` item #4: a fixed shrink cannot tell R00602 (poor probe progress,
should yield budget) apart from R02823 (probe is close, should keep its budget) — but a *live*
signal generated during the current probe's own search can.

`repairSearchFromGate` already reports `bestBadness` on every failed attempt — the lowest
near-miss score any restart reached, current-invocation evidence, no exact-level history, so it
satisfies `docs/solver-level-blindness.md`. In the sample above, the one level that genuinely
needed the biased tier's full budget (`R02823`) had already shown a low ordinary-tier minimum
badness (4) before the biased tier ran; every other sampled level's ordinary-tier minimum was
either much higher (15–26) or the level had no biased tier to gate at all.

**`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`** (`modules/solver/orchestration.ts`, opt-in,
default OFF): after the ordinary-tier rounds fail, if a biased repair config is about to run,
scale its node budget by

```
scale = min(1, max(MIN_SCALE, BADNESS_GATE / ordinaryBestBadness))
```

with `BADNESS_GATE = 10`, `MIN_SCALE = 0.35` (both calibrated from this same n=12 sample — n=1 for
the "needs full budget" case; see the constant's own comment in `orchestration.ts` for the full
derivation and the explicit re-calibration caveat). A strict no-op whenever the ordinary tier
hasn't run, reported no finite badness, or already looks promising (badness ≤ the gate) — R02823's
badness of 4 is well under 10, so its biased tier is untouched. Bounded below by `MIN_SCALE` so the
biased tier is never fully suppressed (participation floor, per
`solver-interoperability-and-cooperation-plan.md` §17.3), even on the poorest-evidence levels.

### Result: the same 12-level sample, flag enabled

| level | scale applied | probe nodes | early main-loop nodes | result | vs. baseline |
|---|---:|---:|---:|---|---|
| R00044 | 1 (no biased tier) | 4,000,000 | 5,562,613 | unsolved | unchanged |
| R00602 | 0.667 (10/15) | 8,000,006 | 520,775 | **solved** | **FLIP: gained** |
| R00635 | 0.667 (10/15) | 8,000,047 | 0 | unsolved | unchanged (more late-reserve headroom, no early-config win) |
| R01174 | 0.385 (10/26) | 6,307,729 | 1,231,949 | unsolved | unchanged, but early configs now get real budget |
| R01856 | 1 (badness 3 < gate) | 9,562,505 | 0 | solved | unchanged (byte-identical) |
| R02083 | 0.556 (10/18) | 7,333,391 | 983,209 | unsolved | unchanged |
| R02119 | n/a | 0 | 9,856,544 | unsolved | unchanged (byte-identical) |
| R02205 | 1 (badness 8 < gate) | 9,562,505 | 0 | unsolved | unchanged (byte-identical) |
| R02318 | n/a | 4,000,051 | 678,501 | unsolved | unchanged (byte-identical) |
| R02422 | n/a | 4,000,002 | 662,437 | unsolved | unchanged (byte-identical) |
| R02823 | 1 (badness 4 < gate) | 9,308,917 | — | **solved** | unchanged (byte-identical) |
| R02867 | 0.556 (10/18) | 7,333,382 | 777,667 | unsolved | unchanged |

**Net on this sample: +1 (1 gained, 0 lost)** — a clean, non-zero-sum result, in contrast to the
naive static shrink's 1-gained/1-lost wash. `R02823` is byte-identical to baseline (confirms the
gate correctly left it untouched); every level with badness below the gate (`R01856`: 3, `R02205`:
8) or no biased tier at all (`R00044`, `R02318`, `R02422`, `R02119`) is byte-identical to baseline,
confirming the mechanism only ever acts where its own justification (poor live evidence) applies.

## Follow-up: 300-level stratified GHA A/B at the real production budget (2026-08-13)

The n=12 local sample above was a fast local diagnostic at a deliberately shrunk 15M-node budget.
A larger, level-blind confirmation followed via `.github/workflows/solver-repair-probe-adaptive-
sample-ab.yml` (new workflow, `scripts/stress/select-repair-probe-adaptive-sample.mjs`): 250
levels drawn from the 512-level eligible population (repair-gated AND has a must-turn cell — the
only levels this flag can ever touch) plus 50 control levels from the ineligible remainder,
deterministic seed `repair-probe-adaptive-sample-2026-08-12`, at the real production
`corpus2_node_budget` (50,000,000, matching `solver-stress-refresh.yml`'s current default),
`--workers=2`, non-binding 24h deadline. Dispatched twice against `main` (`564f6c98`): control
(blank `enable_flags`, run `31651604893`) and treatment (`enable_flags=
STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`, run `31651610514`).

| arm | solved / 300 | nodes | work |
|---|---:|---:|---:|
| control | 108 | 10,698,789,545 | 18,179,853,725 |
| treatment | 109 | 10,541,566,647 | 16,547,624,983 |

**Net +1 (1 gained, 0 lost)**, nodes -1.5%, work -9.0%. The one gain, `R02719`
(mustCross=8, mustPass=0, mustTurn=5, reqInt=9 — squarely inside the eligible population, not a
control-bucket artifact), is a clean single-level flip with no corresponding loss anywhere in the
300-level sample — the same zero-loss, non-zero-sum shape as the n=12 local result, now confirmed
at 25x the sample size and the real production node budget rather than a shrunk local one. All 50
control-sample levels are consistent with the structural claim that the flag cannot touch them
(no ineligible-bucket id appears in either arm's gained/lost set).

## Caveats

- **300/1700 (250 of the 512 eligible) is a real, level-blind, production-budget stratified
  sample — stronger evidence than the n=12 local pilot, but still not the dedicated full-population
  Corpus-2 A/B `docs/solver-opt-in-experiment-ledger.md`'s promotion bar calls for.** The gate
  constant (`BADNESS_GATE = 10`) and floor (`MIN_SCALE = 0.35`) are still picked from the original
  n=12 sample (n=1 for the positive "needs full budget" case) — a defensible starting point, not a
  constant re-derived from this larger run. `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` remains
  landed **opt-in, default OFF**; a full-corpus (or a larger/repeat stratified) A/B is the
  reasonable next step before a promotion decision, not strictly required to have SOME positive
  larger-than-pilot evidence on record.
- **This does not explain the full 635-vs-694 corpus-scale gap.** It identifies and fixes a related
  but distinct starvation mechanism from the one originally hypothesized; whether it, combined with
  the still-not-fully-isolated effect of `2bfefc660` on early main-loop configs specifically,
  accounts for a meaningful share of that gap at full corpus-2 scale (36,000,000-node budget) is
  untested here. A future corpus-2 A/B with this flag enabled vs. disabled (matched flags/budget)
  would answer that directly.
- **The originating hypothesis's specific claim (probe reaching into the reserved slices) is now
  known to be false** and should not be repeated in future documentation without re-deriving it —
  see Phase 1 above for the exact code trace.

## Verification performed

- `npx tsc --noEmit`: clean.
- `npx vitest run modules/solver/`: 28 files / 341 tests pass.
- `npm run solver:bench -- --check`: **160/160 solved, 0 regressions, byte-identical 51,789,137
  nodes** vs. the committed baseline — confirms the new flag is a strict no-op for every
  production/default-`cfg` caller (it defaults OFF via `OPT_IN_FEATURES`).
- `npm run check:lint`: clean.
- `node scripts/experiment-manifest-lib-check.mjs`: passes.
- Local 12-level sample comparison above (baseline vs. static-scale-debug vs. the real opt-in flag).

**Not attempted**: a full corpus-2 A/B with the new flag (outside this session's scope — this is a
pilot, and CLAUDE.md's own guidance is to gather cheap local evidence before buying an expensive
population run). `npm run test:node` / full `npm run ci` were not re-run end-to-end after this
change (the targeted subset above covers everything this change touches); recommended before any
future re-evaluation.

## Post-promotion saved-artifact recalibration audit (2026-08-13)

A follow-up audit joined the matched control and treatment artifacts above and reconstructed each control level's initial contiguous repair-probe prefix. These artifacts predate the explicit `repairProbe` attempt tag added in PR #1368, so this reconstruction is suitable for nominating experiments, not for a final causal claim.

Observed direct repair yield was sharply concentrated at low baseline badness:

| Baseline badness | Eligible levels | Direct repair wins | Win rate |
|---:|---:|---:|---:|
| 0-5 | 38 | 7 | 18.4% |
| 6-10 | 37 | 3 | 8.1% |
| 11-15 | 38 | 1 | 2.6% |
| 16-20 | 61 | 1 | 1.6% |
| 21+ | 73 | 0 | 0.0% |

The promoted treatment preserved all 12 direct repair wins, introduced no solved-level loss, added a later beam solve on R02719, and reduced aggregate node/work use. A retrospective replay with `MIN_SCALE=0.35` nominated the following `BADNESS_GATE` sweep:

| Candidate gate | Biased-tier nodes avoided | Observed winning cap crossings |
|---:|---:|---:|
| 10 | 32.8% | 0 |
| 8 | 40.1% | 0 |
| 6 | 47.7% | 0 |
| 4 | 54.4% | 2 |

Accordingly, the next matched experiment should compare gates 10, 8, and 6 while holding the floor fixed. Gate 4 is excluded from the first sweep because the replay crosses two observed winning caps. The experiment must use current-main tagged telemetry and full-ladder outcomes; replayed prefixes alone are not promotion evidence.

The full methodology, wider family/variant findings, and ranked tuning plan are in [Existing solve-data tuning opportunities](2026-08-13-existing-solve-data-tuning-opportunities.md).

## Promotion (2026-08-13)

Promoted to production default-ON at the project owner's explicit direction, on the strength of the
300-level stratified GHA A/B above plus the original n=12 local pilot — **not** the dedicated
full-population Corpus-2 A/B this project's own `docs/solver-opt-in-experiment-ledger.md` normally
requires before promotion. This is recorded here as a deliberate, acknowledged deviation from that
bar, not an oversight: if a future full-corpus run surfaces a loss neither sample caught, that is
the expected shape of the risk being accepted, not a surprise.

Both halves of the promotion landed together, learning directly from the wiring-gap lesson that bit
both `PRUNE_MC_NEIGHBOR_BUDGET`'s and `STRATEGY_MAIN_LOOP_LATE_RESERVE`'s own promotions the same
week (`docs/solver-opt-in-experiment-ledger.md`):

- `scripts/ablation-config.mjs`: removed from `OPT_IN_FEATURES`; `FEATURES` description updated.
- `modules/solver/orchestration.ts`: the read site converted from the opt-in convention
  (`cfg && cfg.FLAG === true`, which stays inert whenever `cfg` is `null` — every production
  interactive solve and any CLI run without `--enable-flags`) to the standard convention
  (`!cfg || cfg.FLAG`).
- Three new regression tests in `modules/solver/orchestration.test.ts`: the mechanism activates
  under a genuinely-omitted ablation config (not just an explicit `{ FLAG: true }` object, which
  would have missed the exact wiring gap above); it correctly leaves the biased tier untouched when
  live evidence already looks promising; an explicit `{ FLAG: false }` still fully disables it.

**Re-verification performed at promotion time:**
- `npx tsc --noEmit`: clean.
- `npx vitest run modules/solver/`: 28 files / 344 tests pass (341 + 3 new).
- `npm run check:lint`: clean.
- `node scripts/check-documentation-links.mjs`: passes.
- `npm run solver:bench -- --check`: **160/160 solved, 0 regressions, byte-identical 51,789,137
  nodes** — confirms the published corpus has zero eligible levels (none are both repair-gated and
  carry a must-turn cell), so this promotion has no effect on any interactive Play/Editor/Review
  solve; it only changes offline batch-tooling behavior on levels that set a finite `nodeBudget`.

**Still not attempted**: a full corpus-2 A/B, and a re-run of `npm run test:node` / full `npm run
ci` end-to-end (the targeted subset above covers everything this change touches). Both remain
reasonable follow-ups, not blockers to the promotion already made.

## Gate/min-scale recalibration: local pilot (2026-08-13)

Follow-up to the saved-artifact audit's `BADNESS_GATE=10/8/6` nomination above. Two mechanical
additions made the sweep runnable without editing the constant: `SolveOpts.repairProbeAdaptiveBiasedBadnessGateOverride`
/ `repairProbeAdaptiveBiasedMinScaleOverride` (`modules/solver/orchestration.ts`, dedicated
top-level fields, same shape as every other override in that file — not ablation flags, since
there's no existing opt-in/opt-out plumbing this could piggyback on and a fresh ablation flag would
conflate "use the mechanism at all" with "which gate value"), and matching
`--repair-probe-adaptive-badness-gate`/`--repair-probe-adaptive-min-scale` CLI flags on
`scripts/level-blind-capability-sweep.mjs`. `MIN_SCALE` was left at its production default (0.35,
undefined override) throughout — the nomination's own instruction to hold it fixed.

**First attempt (n=30, `--node-budget=8000000`) was invalidated by its own budget, not the gate.**
The probe's own worst case (ordinary tier up to 4,000,000 across 2 seed salts, plus up to 6,000,000
for the biased tier before any scaling) can reach ~10,000,000 nodes — *larger* than the 8,000,000
external ceiling this first pass used. Per-level attempt records confirmed the external ceiling, not
the biased tier's own (gate-dependent) scaled budget, was cutting attempts off: all three arms
(baseline, gate=8, gate=6) came back with byte-identical total `nodesExpanded`/`workSpent` across
the whole sample, and a spot-check on `R02360` showed the biased-tier attempt hitting the exact same
`nodesExpanded: 1,100,013` in both the baseline and gate=6 arms despite their different internal
scale factors (0.53 vs. 0.35) implying different budgets (~3.16M vs. ~2.1M nodes) — the attempt
never got far enough to reach either number, having already been stopped by the shared external
ceiling. Same failure shape as the pre-fix `mainLoopEarlyNodeBudget` starvation this whole thread
started from: a tight external ceiling can make an internal reallocation invisible by binding first.

**Re-run at n=12 (a subset of the same deterministic draw) with `--node-budget=30000000`** — large
enough that the probe's own budgets, not the external ceiling, are what typically decides an
attempt's outcome — showed a real, gate-dependent effect:

| Arm | Solved | Total nodesExpanded | Total workSpent |
|---|---:|---:|---:|
| baseline (gate=10) | 7/12 | 196,373,558 | 447,402,793 |
| gate=8 | 7/12 | 194,250,690 (−1.1%) | 433,309,051 (−3.2%) |
| gate=6 | 7/12 | 192,127,564 (−2.2%) | 421,207,101 (−5.9%) |

Zero flips at any gate (`scripts/stress/repair-probe-badness-report.mjs`'s matched-pair mode: 0
flips vs. baseline for both gate=8 and gate=6, out of the same 12-level sample). The per-level detail
matches the mechanism's own logic exactly: unsolved levels that still hit the external 30,000,000
ceiling regardless of arm (`R00532`, `R01254`, `R02102`, `R02546`, `R03083`) show ~identical node
counts across arms (the external ceiling dominates there too, same shape as the n=30 attempt);
solved levels where the biased tier's shrink freed nodes that would otherwise have been spent on an
already-doomed biased-tier search show a real, monotonic reduction as the gate lowers — `R00986`
(8.81M → 7.89M → 6.97M, −21% baseline to gate=6) and `R02476` (10.44M → 9.23M → 8.04M, −23%).

This is the same shape (net-neutral or positive on solved-count, real cost reduction) the original
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` promotion itself validated on before its own 300-level
GHA A/B — n=12 is far too small to detect a rare flip (the production A/B needed 250 eligible levels
to find its one gain), but it clears the same "worth spending GHA compute" bar the interoperability
plan's decision gate calls for: real, monotonic cost signal, zero observed loss, mechanically
identical population to the already-promoted, already-validated mechanism. `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml`
gained `repair_probe_adaptive_badness_gate`/`repair_probe_adaptive_min_scale` dispatch inputs so the
existing eligible-population sampler/sharding infrastructure can be reused for this gate-value sweep
without a new workflow.

**Decision-bearing next action**: dispatch the workflow three times (blank/baseline, gate=8, gate=6;
identical seed/sample/node_budget, min_scale left blank) at GHA scale and compare combined solved
count/flips/cost the same way the original mechanism's A/B was judged, before considering any change
to the production `REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE` constant.

## Gate/min-scale recalibration: GHA A/B (2026-08-13)

Same 250-eligible/50-control stratified sample as the original `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET`
A/B (`seed=repair-probe-badness-gate-sweep-2026-08-13`, `node_budget=50000000`, `deterministic=true`),
dispatched three times via `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml`'s new
`repair_probe_adaptive_badness_gate` input (runs `31750738328` baseline/blank, `31751758999` gate=8,
`31750750943` gate=6 — all on branch `claude/repair-probe-adaptive-followup-p2egv5`). The
concurrency group only allows one run in progress plus one queued, so all three had to run
sequentially rather than in parallel (~14-27 min wall time each); dispatching them back-to-back
without spacing bumped the middle dispatch out of the queue once, requiring a re-dispatch.

| Arm | Solved | Total nodesExpanded | Total workSpent |
|---|---:|---:|---:|
| baseline (gate=10) | 88/300 | 11,324,468,371 | 17,391,234,058 |
| gate=8 | 89/300 (+1) | 11,263,963,307 (−0.5%) | 17,022,244,568 (−2.1%) |
| gate=6 | 89/300 (+1) | 11,242,314,812 (−0.7%) | 16,683,133,299 (−4.1%) |

Both gate=8 and gate=6 solve the exact same set: baseline's 88 plus `R02663` (verified by exact set
difference, not just a count match — `gate6 - baseline == gate8 - baseline == {R02663}`, and
`baseline - gate6 == baseline - gate8 == {}`, zero losses at either gate). **Gate=6 strictly
dominates gate=8** on this sample: identical
solved-set gain, larger cost reduction on every metric. This is the exact shape the original
mechanism's own promotion was judged on (net-neutral-or-positive solved count, real cost reduction),
now reproduced for the gate value itself rather than the mechanism's on/off state — and at the same
sample size (300, 250 eligible) the original promotion used, not just the smaller local pilot.

**Promoted (2026-08-13)**: `REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE` narrowed from 10 to 6 in
`orchestration.ts` (`MIN_SCALE=0.35` unchanged) at the project owner's explicit direction, on the
strength of the GHA A/B above — same evidentiary bar this file's own
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` on/off promotion used. Re-verified at promotion time:
`npx tsc --noEmit` clean, `npx vitest run modules/solver/` 362/362 pass, `npm run check:lint` clean,
`npm run solver:bench -- --check` 160/160 solved, byte-identical 51,789,137 nodes (the published
corpus has zero eligible must-turn+repair-gated levels, so this promotion has no effect on any
interactive Play/Editor/Review solve — only offline batch tooling with a finite `nodeBudget`, same
scope as the mechanism's own original promotion).

## Reproducing

```bash
LEVELS="pos:98,pos:450,pos:753,pos:1154,pos:1198,pos:3,pos:94,pos:195,pos:307,pos:414,pos:536,pos:649"
# baseline
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="$LEVELS" \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=15000000 --work-budget=100000000 \
  --workers=1 --out=<file> --summary-out=<file>
# pilot flag
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="$LEVELS" \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=15000000 --work-budget=100000000 \
  --workers=1 --enable-flags=STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET \
  --out=<file> --summary-out=<file>
```
