# Repair-probe / early-main-loop node starvation: diagnosis and a pilot fix (2026-08-12)

Follow-up to `reports/2026-08-12-main-loop-late-reserve-population-ab.md`'s "Follow-up" section
and `docs/future-work.md` item #4, which flagged a plausible-but-unconfirmed mechanism for why the
2026-08-12 single full-corpus sweep with both `PRUNE_MC_NEIGHBOR_BUDGET` and
`STRATEGY_MAIN_LOOP_LATE_RESERVE` genuinely default-on came back at Corpus-2 635/1700 — lower than
several individual reference points including the confounded 0.15 treatment arm's 694.

**Bottom line: the specific hypothesis in the originating report is wrong as stated, but a real,
related, and previously-undocumented starvation mechanism exists nearby. A small opt-in pilot fix
for that real mechanism is implemented, verified, and landed on this branch as
`STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (default OFF).**

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
process, this sandbox). 15,000,000 was chosen (rather than production's 36,000,000) purely for
local iteration speed, per CLAUDE.md's "iterate freely before gating" — see the caveat below on why
absolute severity at this budget does not transfer directly to production's 36M.

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
crowds out every early main-loop config. At production's 36,000,000-node budget the same
arithmetic gives `mainLoopEarlyNodeBudget = 22,950,000` — the probe's ~10,000,000 worst case is a
much smaller fraction (~44%) of that pool, so the *severity* of this specific finding does not
transfer 1:1 to production; the *mechanism* (unprotected shared pool, probe goes first) is
identical regardless of budget size, and the wall-clock fix's real effect (letting a contended
probe reach closer to its full worst case) still shifts the split between probe and early configs
in the same direction at any budget.

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

## Caveats

- **n=12 is a local iteration sample, not a promotion-grade population result.** Both the gate
  constant (`BADNESS_GATE = 10`) and the floor (`MIN_SCALE = 0.35`) are picked from this same small
  sample (n=1 for the positive "needs full budget" case) — a defensible starting point, not a
  validated constant. `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` is landed **opt-in, default
  OFF** specifically because of this; it needs its own dedicated level-blind population A/B (same
  bar as every other flag in `docs/solver-opt-in-experiment-ledger.md`) before any promotion
  decision.
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
future promotion decision.

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
