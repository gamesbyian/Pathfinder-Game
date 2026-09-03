# A fixed-cap portfolio scheduler as an opt-in `solveLevel()` mode: implementation design

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — `schedulerMode: 'static-portfolio'`/`runStaticPortfolio` is merged in `modules/solver/orchestration.ts`, covered by unit tests (`orchestration.test.ts`), and now also verified against real corpus data: [`2026-09-03-static-portfolio-entrypoint-parity-check.md`](2026-09-03-static-portfolio-entrypoint-parity-check.md) found 15/15 exact matches between this entrypoint and the research harness (`technique-census-cell.mjs`) on `portfolio-18-tranche-v2`'s own confirmed configuration.
> **Decision:** the design below (proposed as design-only on 2026-09-03) is implemented as designed — no deviation beyond `techniqueConfigs: AttemptConfig[]` replacing the originally-sketched `techniqueKeys: string[]` (parsing is a caller/tooling concern, kept out of this browser-free core module, per the type's own doc comment).
> **Remaining gate:** step 3 below (wiring `static-portfolio-confirmation.yml`/`build-static-portfolio-plan.mjs` with a thin adapter to dispatch through this entrypoint by default, and/or running an actual confirmation-scale dispatch through it) is future infrastructure work, not blocking any current conclusion — the parity check above already establishes that today's confirmed results would reproduce through this entrypoint.
> **Evidence role:** development — an implementation design, now with both the implementation and a real-data behavior-preservation check; still not itself a scheduler promotion or production-wiring decision.

## What (d) is actually asking

`docs/solver-optimization-workstreams.md`'s Workstream 2 (d): "a real implementation design for how a fixed ordered-menu-with-per-technique-caps policy would replace or coexist with the current stage/reserve-based scheduler." Every `static-portfolio-confirmation-00N` result to date measured this policy through `technique-census-cell.mjs`'s `runCell` — a purpose-built research harness, never through `solveLevel()`, the actual entrypoint every real caller (interactive UI, batch corpus solving, hint generation) uses. This report proposes how to close that gap safely.

## Scoping: which "production" this is for

`solveLevel()` has two real callers today, and they are not equivalent:

- **The interactive UI** (`modules/input/solver-controller.ts`, `review-controller.ts`) calls `solveLevel(level, { timeBudgetMs: 30000, yieldFn, disableExtraBudgetPasses: true })` — no explicit `nodeBudget` (defaults to `Infinity`) or `workBudget` (derived once, deterministically, from `timeBudgetMs` via `budget-units.ts`'s fixed `LEGACY_MS_TO_WORK_RATE` calibration — never measured host speed). `disableExtraBudgetPasses: true` zeroes every additive retry tier's budget fraction, **including the entire `admissible-order-fallback` tier** (`stage-budget.ts`: `admissibleOrderBudgetFraction` resolves to `0` when this flag is set, so `admissibleOrderTierWillRun` is `false` — not just its non-default profiles, all five, `'default'`/`'none'` included). The three tie-break profiles this whole research line has been discussing are therefore not merely starved but **entirely absent** from live interactive solves, by the same mechanism that already excludes every other additive tier there for latency.
- **Offline/batch orchestration** (corpus regression, hint generation, capability sweeps, `solver:regression`, the various GHA sweep/confirmation workflows) is the caller that passes explicit finite `nodeBudget`/`workBudget` values and does **not** set `disableExtraBudgetPasses`. This is where `admissible-order-fallback` runs, where the reserve-starvation mechanism `2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md` documents actually applies, and where this whole static-portfolio research line's "production reach" evidence (`reports/stress/capability-runs/33588487486/equal-work-production-reach.md`) was measured (1,802 real batch attempt rows).

**A fixed-cap portfolio scheduler, in the sense this research line has characterized it, is a proposal for the offline/batch path — corpus solve-rate/hint-generation capability — not the live interactive UI.** The UI's own 30-second latency budget and `disableExtraBudgetPasses` design are a separate, already-settled tradeoff this design does not touch or revisit. Any implementation should make this scope explicit rather than let "production" default-read as "what a player experiences."

## Existing precedent: `solveLevel()` already supports a pluggable alternate scheduler

`SolveOpts.schedulerMode` (`orchestration.ts:289`) already accepts `'production' | 'legacy-latency-portfolio-experiment' | 'legacy' | 'portfolio-experiment'`. When set to the portfolio-experiment value, `solveLevel()` routes to `runLegacyLatencyPortfolioExperiment` (`orchestration.ts:1511-1609`) instead of the normal ladder — a **completely separate execution path**, sharing only `prepLevel`/`getConfiguredAttemptConfigs`/`runAttemptSlice`, that runs a hand-authored, historically-ms-shaped pass structure (`legacy-latency-portfolio-experiment.ts`, explicitly marked "LEGACY WALL-CLOCK SCHEDULER EXPERIMENT... not machine-independent equal-work scheduler evidence") and, if it doesn't solve, **falls back** to a real `solveLevel(level, { ...opts, schedulerMode: 'production' })` call so the returned result is never worse than the ordinary ladder's own coverage.

This establishes two things useful here: (1) `solveLevel()` already has a clean, tested seam for "opt-in, fully alternate execution, zero effect on default callers," so adding a new mode is architecturally unsurprising, not a novel pattern; (2) the existing example is explicitly a **legacy, closed, ms-shaped** mechanism this repo has already deliberately moved away from — the new mode should not resemble it beyond the dispatch seam itself.

## Proposed design

Add a new `SolveOpts.schedulerMode` value — suggested name `'static-portfolio'`, to match the vocabulary this whole research line (`static-portfolio-confirmation-00N`, `portfolio-18-specialists`) already uses, and to avoid any reader conflating it with the deprecated `'legacy-latency-portfolio-experiment'`/`'portfolio-experiment'` values above.

```ts
schedulerMode?: 'production' | 'legacy-latency-portfolio-experiment' | 'legacy' | 'portfolio-experiment' | 'static-portfolio';
staticPortfolio?: {
    techniqueKeys: string[];               // ordered list — same vocabulary as technique-census-cell.mjs's cell.techniqueKeys
    workBudget: number;                    // shared cumulative ceiling across gates, same semantics as the existing top-level workBudget/baseWorkBudget
    perTechniqueWorkCap?: number;          // technique-census-cell.mjs's own field, same semantics
    perTechniqueWorkCapByKey?: Record<string, number>; // this session's 2026-09-03 addition, same semantics
};
```

When `schedulerMode === 'static-portfolio'`, `solveLevel()` would route to a new `runStaticPortfolio(level, opts, ...)` function that:

1. Calls `prepLevel(level)` and sets `prep._workCap`/`prep._strictWorkCap` exactly as `technique-census-cell.mjs`'s `runCell` already does (both caps, for the same reason that file's own header comment and `docs/solver-budget-determinism.md`'s "Equal-work isolated-action contract" document: admissible-order/IDA's hot loop only honors `_strictWorkCap`).
2. Iterates `opts.staticPortfolio.techniqueKeys` in order, per gate, applying the same gate-share/per-technique-cap math `technique-census-cell.mjs`'s `runCell` already implements and this session's tests already pin (`scripts/technique-census-cell-node-test.mjs`).
3. Stops at the first solve, same as every other stage in this codebase.
4. Returns a `SolveResult` shaped exactly like every other `solveLevel()` caller expects (`ok`, `status`, `solution`, `attempts`, `nodesExpanded`, `workSpent` when `attemptBudgetTelemetry`/`lifecycleTelemetry` is set) so it composes with the existing lifecycle-telemetry/hint-provenance/equal-work-production-reach pipeline without bespoke handling — each attempt's `configKey`/`gateKey` already carries everything `classifyAttemptTier` and friends need; a uniform `stage: 'static-portfolio'` tag (there is only one flat list, not the ladder's distinct tiers) is enough.

**Deliberately no automatic fallback to the production ladder** — unlike `runLegacyLatencyPortfolioExperiment`. This mode exists to *evaluate* the static-portfolio policy on its own terms, matching exactly what `technique-census-cell.mjs`/`static-portfolio-confirmation.yml` already measure; a silent fallback would make every dispatch trivially "at least as good as production," destroying the coverage/work comparison this whole research line depends on. A caller that wants graceful degradation composes it explicitly (call `static-portfolio` first, then `production` on failure) exactly the way `runLegacyLatencyPortfolioExperiment` does internally — that composition is a caller decision, not baked into this mode.

## Why this is safe to build now

- **Zero effect on any existing caller.** `opts.schedulerMode` defaults to `'production'`; nothing this design adds changes behavior unless a caller explicitly opts in with the new value and its own `staticPortfolio` config.
- **No new search logic.** Every piece of execution logic this proposes already exists, tested, in `technique-census-cell.mjs`'s `runCell` and this session's `perTechniqueWorkCapByKey` addition — this is a promotion/relocation of already-validated logic into a real `solveLevel()` entrypoint, not new search-policy code.
- **Matches governance rule 14** (`solver-scheduling-policy.md`: "Keep a known-good fallback during rollout/debugging") trivially — the fallback is the unmodified default path, which this design never touches.

## What this unblocks

- **(b) production-envelope confirmation** can dispatch through the real `solveLevel()` entrypoint with `schedulerMode: 'static-portfolio'` instead of `technique-census-cell.mjs` directly — the same population/arms/cap-map inputs `build-static-portfolio-plan.mjs` already produces, run through one more layer of integration so the result carries the exact `SolveResult`/lifecycle-telemetry contract every other production-reach evidence in this repo already uses (the `equal-work-production-reach` join, hint provenance, etc.), rather than a bespoke research-harness shape that has to be reconciled by hand each time (as `static-portfolio-confirmation-00N`'s own reports had to do for per-level attribution).
- **(c) rare-capability retention auditing** gets the same benefit: retention auditing tooling that already consumes ordinary `SolveResult`/lifecycle-telemetry data (this is exactly what the technique-niches/production-reach machinery already does) would work against `static-portfolio` results with no bespoke adapter.
- **Promotion-path step 6** (`solver-scheduling-policy.md`: "run a matched-work live A/B") becomes literally possible for the first time — today there is no way to run the static-portfolio policy through the same code path as a real solve at all, only through a separate script.

## What this does not do

- Does not decide whether `static-portfolio` mode should ever become the *default* (`schedulerMode` unset) production behavior — that is a much later decision gated on the full promotion path (matched-work A/B, independent confirmation, rare-capability retention evidence at the scale `solver-scheduling-policy.md`'s guardrail requires).
- Does not resolve (b)'s own remaining gap: a defensible per-technique cap-sizing derivation. `2026-09-03-admissible-order-profile-cost-probe-preflight.md` is one input toward that; the other ~15 `portfolio-18-specialists` techniques still need their own sizing decision (real production `meanAttemptWork`, per `equal-work-production-reach.json`'s `techniques[].production.meanAttemptWork`, is the natural existing-evidence candidate for those, but has not been assembled into an actual cap map yet).
- Does not touch `admissible-order-fallback`'s existing ladder tier, `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE`, or any other current production scheduling code. The new mode is additive and parallel, not a modification of existing behavior.

## Suggested next steps, in order

1. Implement `runStaticPortfolio`/the `schedulerMode: 'static-portfolio'` dispatch in `orchestration.ts`, with unit tests mirroring `technique-census-cell-node-test.mjs`'s own coverage (this is largely a relocation of already-tested logic, not new design work, so implementation risk is low relative to everything else in this design).
2. Add a thin adapter so `static-portfolio-confirmation.yml`/`build-static-portfolio-plan.mjs` can optionally dispatch through the new `solveLevel()` mode instead of `technique-census-cell.mjs` directly, and confirm byte-identical results on a small shared population (a behavior-preservation check, not a new experiment) before relying on it for any future confirmation.
3. Only then run (b)'s real production-envelope confirmation and (c)'s retention audit through the new entrypoint.
