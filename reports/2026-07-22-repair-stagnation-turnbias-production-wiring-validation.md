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
  must-turn levels and only under an explicit `STRATEGY_REPAIR_TURN_BIAS` flag, **after** the ordinary
  + must-turn-biased repair attempts (purely additive — can only add solves).
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

## The load-bearing lesson: turn bias needs the fallback

An earlier A/B run with `disableExtraBudgetPasses: true` reported R02003 **unsolved** by turn bias — a
false negative. Cause: `disableExtraBudgetPasses` kills the repair fallback's extra budget, so the
turn-biased attempt only ran in the (budget-limited) early probe, which is not enough for it to
converge. With the fallback enabled (default production behavior), it solves. **Implication for any
batch validation:** the corpus-2 refresh must run with the repair fallback *on* (do not set
`disableExtraBudgetPasses`), or it will under-measure turn bias. This is the same class of
budget-composition subtlety `CLAUDE.md` documents for the repair fallback's own `repairBudgetFraction`.

## Scope / what remains

- **In-session validation is positive and complete for the wiring + mechanism:** turn bias, through
  the real solver, converts R02003 from unsolved to solved via its own attempt, with the published
  corpus byte-identical. This matches the isolation result (the 56-level single-gate A/B had exactly
  one new solve, R02003; the several badness-2 near-misses were never *solved* in isolation, so they
  are not expected production solves either — turn bias gets them close, not over the line).
- **The population-level solved-count delta on all of corpus-2 is the GitHub-Actions refresh**
  (`.github/workflows/solver-corpus2-batch-*.yml`), run twice — baseline (`null`) vs an ablation
  config with `STRATEGY_REPAIR_TURN_BIAS` on, **fallback enabled** — combined via
  `npm run solver:combine-corpus2-batches`. Each production solve is ~60-80 s, so this is a
  batch/CI job, not an in-session sweep. That refresh (plus a full-corpus before/after timing
  comparison, since a new fallback attempt has a cost `solver:bench --check` won't catch) is the
  remaining gate before promoting the attempt from flag-gated to a default attempt.

## Verdict

Turn bias is validated as a real, safe, production-reachable mechanism that solves a level the
baseline solver cannot. It is committed default-off behind `STRATEGY_REPAIR_TURN_BIAS`. Promoting it
to a default attempt is justified pending the corpus-2 refresh (fallback on) — the one step that
needs the batch infrastructure rather than an in-session run.
