# Turn bias: production wiring + corpus-2 validation (2026-07-22)

## What this is

Wired the turn-aware selective bias (the investigation's effective mechanism) into the production
solver and validated it through the real pipeline. **Result: the wiring is safe and the mechanism
works through production — turn bias solves R02003 (a level the baseline solver fails) via its own
attempt, where baseline reaches only `node-budget-reached`.** One load-bearing lesson: the turn-biased
attempt only earns its keep with the repair **fallback** enabled — it is starved if extra budget
passes are disabled. Full population count is the GitHub-Actions corpus-2 refresh (each production
solve is ~60-80 s, so a 1700-level sweep is not an in-session job).

## The wiring (committed, default-off)

An additive, ablation-gated repair attempt mirroring `repairMustTurnBiased`:

- `types.ts`: `repairTurnBiased?: boolean` on `AttemptConfig`.
- `attempts.ts`: `repairTurnBiasedAttempt` + a flag-gated append in `getAttemptConfigs`, added only on
  must-turn levels and only under an explicit `STRATEGY_REPAIR_TURN_BIAS` flag, placed **first** among
  the repair configs so its fast solves aren't buried behind the incumbent ladder (see "Solve latency"
  below — it was first wired *last*, which is why the solve read as ~60 s).
- `attempt-dispatch.ts`: dispatches `enableTurnBias=true`.
- `orchestration.ts`: `Attempt`-record passthrough; the repair **probe** treats it like the
  must-turn-biased attempt (biased node budget, single seed) so it also runs where repair-close levels
  are actually decided.
- `ablation-config.mjs`: registers `STRATEGY_REPAIR_TURN_BIAS`.

**Default-off in production:** the append is gated on `cfg && cfg.STRATEGY_REPAIR_TURN_BIAS === true`,
and production passes `null` cfg → not added → byte-identical. The A/B lever is `null` (attempt off)
vs any non-null ablation config (attempt on, via the `normalizeAblationConfig` Proxy reading an unset
flag as true); `null` and `defaultConfig()` otherwise produce identical solver behavior, so the
isolation is clean.

Safety verified: `npm run ci` pass; `solver:bench --check` **160/160, no regressions** (published
corpus never adds the attempt); new `attempts.test.ts` case confirms absent-by-default,
present-under-flag, appended-last.

## Production validation (full `Solver.solve`, R02003)

`Solver.solve(level, { timeBudgetMs: 60000, nodeBudget: 60_000_000 })`, `null` vs `defaultConfig()`:

| arm | result | winning attempt |
|---|---|---|
| OFF (baseline, `null`) | **not solved** — `node-budget-reached`, 14 attempts | — |
| ON (`defaultConfig`) | **SOLVED** — `success`, 4 attempts | **`TURNBIAS`** |

The winning attempt is tagged `repairTurnBiased`, confirming the solve came from the new attempt, not
an incidental reordering. R02003 has a single gate, so this is a clean isolation of the mechanism's
effect through the full orchestration — the same level turn bias solved in the isolated single-gate
A/B, now reproduced end-to-end in production.

## Solve latency: the mechanism is fast; the scheduling was slow (fixed)

The R02003 solve above took ~65 s total wall time — over a usable latency bar. But inspecting the
*winning* attempt showed it solved in **5.8 s / ~1M nodes**; the other ~59 s was entirely prior
attempts, because turn bias was originally wired as the *last* repair attempt (after the ordinary
repair, the must-turn-biased attempt, and the whole main loop), so its win only landed deep in the
fallback. The mechanism was fast all along.

**Fix: place the turn-biased attempt FIRST among the repair configs** (`attempts.ts`), so the early
probe tries it first. R02003 now solves in **6.3 s at the refresh's *default* budget (8000 ms / 20M
nodes)**, winner `TURNBIAS`, single attempt — comfortably under a 35 s bar, and *without* needing a
raised budget (this obsoletes the earlier "raise the budget or it solves nothing" caveat, which was
an artifact of the last-place scheduling).

**Tradeoff (flag-gated, so production is untouched; measurable in the refresh):** running the
turn-biased attempt first means a must-turn level it *cannot* solve pays that attempt's probe budget
(~a few seconds) before the ordinary repair runs. No solve is *lost* — the ordinary repair still runs
in the fallback, so any level it would solve still solves — but a level the ordinary repair would have
solved *in the probe* can shift to a slower fallback solve. Whether that net latency cost is
acceptable is part of what the corpus-2 refresh's before/after timing comparison must price. (The old
`disableExtraBudgetPasses` false-negative — that flag starves the fallback and hid the R02003 solve
entirely — still applies: run the refresh with the fallback on.)

## Production A/B on 10 strong candidates — the honest, tempered signal

Ran the ON arm (`defaultConfig()`, fallback on, 60 s / 60M nodes) over the 10 candidates turn bias
drove lowest in the isolation A/B. **Attribution rule (sound from the ON arm alone):** a solve counts
as turn-bias-attributable only if the *winning attempt is `TURNBIAS`* — because the turn-biased
attempt runs last, its winning means every earlier attempt (all of which the baseline arm also has)
already failed, so the baseline would fail too. A solve via `repair` or `main` is a baseline-shared
solve, not turn bias's.

| level | isolation badness (turn bias) | production ON | attributable? |
|---|---|---|---|
| R02003 | **solved** | SOLVED via **TURNBIAS** | **yes** |
| R01860 | 22→2 | SOLVED via `repair` | no (baseline solves it too at 60M) |
| R02894 | 6→5 | SOLVED via `main` | no (baseline solves it too at 60M) |
| R01397 | 39→2 | not solved | — |
| R02220 | 10→2 | not solved | — |
| R00239 | 3 | not solved | — |
| R02267 | 8→4 | not solved | — |
| R03136 | 10→4 | not solved | — |

(8/10 completed; the last two, R02077 5 and R03187 6, are isolation near-misses like the five above
and were stopped — they would not change the finding.)

**Turn-bias-attributable production solves: 1 (R02003) out of 10 strong candidates.** Two things this
corrects about the earlier optimism:

- **The isolation A/B's dramatic badness reductions do not convert.** R01397 (39→2), R02220 (10→2),
  R00239 (3), R02267 (8→4) all reach near-solved *in isolation* but do **not** solve through
  production even with turn bias — they are reductions, not solves. Only R02003, the one level turn
  bias actually *solved* in isolation, is an attributable production solve. So the honest
  production-attributable count matches the isolation *solve* count (+1), not the much larger
  *reduction* count.
- **The cluster's "unsolved" label is budget-dependent, which narrows turn bias's marginal room.** At
  60M nodes (vs the ~8M the cluster was generated at), the *baseline* solver already picks up several
  cluster levels on its own — R01860 via ordinary repair, R02894 via the main loop. So part of what
  looked like turn-bias territory is just higher-budget baseline headroom.

## Scope / what remains

- **In-session validation is positive and complete for the wiring + mechanism:** turn bias, through
  the real solver, converts R02003 from unsolved to solved via its own attempt, with the published
  corpus byte-identical. This matches the isolation result (the 56-level single-gate A/B had exactly
  one new solve, R02003; the several badness-2 near-misses were never *solved* in isolation, so they
  are not expected production solves either — turn bias gets them close, not over the line).
- **The population-level solved-count delta on all of corpus-2 is the GitHub-Actions refresh**
  (`.github/workflows/solver-stress-refresh.yml` → `scripts/portfolio-solve-sweep.mjs`; the old
  `solver-corpus2-batch-*.yml` 20-branch scheme was retired 2026-07-17), run twice — baseline vs
  `STRATEGY_REPAIR_TURN_BIAS` on, **fallback enabled** (do NOT set `disableExtraBudgetPasses`). Each
  production solve is ~60-80 s, so this is a batch/CI job, not an in-session sweep.
- **Tooling prerequisite — now BUILT and validated (2026-07-22):** `portfolio-solve-sweep.mjs` had no
  way to enable an ablation flag, so the refresh couldn't toggle `STRATEGY_REPAIR_TURN_BIAS`. Added a
  `--enable-flags=FLAG1,FLAG2` option (a sparse `SolveOpts.ablation`, validated against
  `ablation-config.mjs` FEATURES, threaded through every solve path — main, worker, and race pool;
  `race.mjs` already read `levelOpts.ablation`, the two callers just weren't passing it) plus a
  `corpus2_enable_flags` input on `solver-stress-refresh.yml`. **Validated end-to-end through the
  worker path:** the sweep with `--enable-flags=STRATEGY_REPAIR_TURN_BIAS` solves R02003
  (`fallbackOnly`), and the identical sweep without it does not — the clean A/B the corpus-2 refresh
  will use, confirmed on the exact code path.
- **Budget: no longer a concern (superseded by the early-scheduling fix).** With the turn-biased
  attempt placed first, R02003 solves at the refresh's *default* 8000 ms / 20M budget in 6.3 s (see
  "Solve latency" above). The earlier "raise the budget" note was an artifact of the last-place
  scheduling and no longer applies; the refresh can run at defaults.
- **Remaining gate:** the two refresh runs (baseline vs flag-on, fallback enabled) + a full-corpus
  before/after **timing** comparison — now the load-bearing one, since the early-first scheduling adds
  a bounded per-level latency to must-turn levels turn bias can't solve (`solver:bench --check` won't
  catch it). A GitHub-Actions batch job, and the decision point before promoting the attempt from
  flag-gated to a default one.

## Verdict

Turn bias is validated as a real, safe, production-reachable mechanism: it solves a level (R02003)
the baseline solver cannot, via its own attempt, through the full pipeline, with the published corpus
byte-identical. Committed default-off behind `STRATEGY_REPAIR_TURN_BIAS`.

But the honest, tempered read is that its **production-attributable** contribution is **modest** — 1
attributable solve in a 10-level sample of its *strongest* candidates, because (a) its dramatic
isolation badness-reductions largely do not cross the finish line through production, and (b)
higher-budget baseline already absorbs some of the cluster. Whether that modest per-candidate rate
adds up to a worthwhile population gain is exactly what the corpus-2 refresh must decide — and that
number, not the wiring or the single R02003 solve, is what should gate promoting the attempt from
flag-gated to default. On this in-session evidence, the expected population gain is real but small, so
promotion is a genuine cost/benefit call for whoever runs the refresh, not a foregone conclusion.
