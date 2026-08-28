# Additive-tier participation audit — the 9 legacy tiers are dead in play, and their real cost dwarfs the nominal budget

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — static trace of `disableExtraBudgetPasses` through `modules/solver/stage-budget.ts`, a 10-level empirical run (`scripts/additive-tier-participation-audit.mjs`) with a capability-sweep-shaped call (`nodeBudget=500,000`, `workBudget=670,000`, `timeBudgetMs=86,400,000`, no `disableExtraBudgetPasses`, no `strictTotalWorkBudget`), and a follow-up trace of `strictTotalWorkBudget`'s own enforcement plus which real workflows opt into it (none currently do — see Part 3)
> **Decision:** the 9 CI-ratchet-approved ms-shaped additive tiers (plus `repair-late-probe`/its multi-seed retry, the 10th/11th related sites) never run in either real interactive production path (`solver-controller.ts`, `review-controller.ts` — both pass `disableExtraBudgetPasses: true`), so migrating any of their formulas carries **zero live-player risk**. Their actual relevance is entirely to offline capability-sweep/confirmation-workflow tooling, where this audit found they are neither rare nor cheap: on a 10-level hard sample, every level produced at least one additive-tier attempt, 30% of levels were *solved by* one, and per-tier work costs ran 1.5x-470x the nominal `workBudget=670,000` (e.g. `repair-late-probe-multi-seed-retry` alone spent 313,076,369 work units across 3 levels — 104M/level, ~470x nominal). A caller-supplied `nodeBudget`/`workBudget` is not a real ceiling on a capability-sweep-shaped solve unless `strictTotalWorkBudget: true` is also set.
> **Remaining gate:** none for this audit itself (a discovery pilot, not a promotion). It supplies the missing "how much is actually at stake" input for queue #2 step 3's "one additive tier at a time" migration work and for anyone interpreting a capability-sweep/confirmation workflow's `node_budget` input as a real per-level ceiling.
> **Evidence role:** discovery
> **Selection:** the static trace is a code fact (not a sample). The empirical run used corpus2 positions 1-10, sequential, prespecified before inspection, at the same `nodeBudget=500,000` scale as the initial smoke test (kept for continuity, not reselected after seeing results); a small N was accepted deliberately given the tiers' own cost (10 levels already cost ~15 real minutes on this population).

## Motivation

[`2026-08-27-solver-budget-model-rationalization.md`](2026-08-27-solver-budget-model-rationalization.md) inventories 9 approved ms-shaped additive allocation sites (`repair-fallback`, `attraction-diversity`, `admissible-order`, `dedup-near-tie-retry`, `admissible-order-non-default-retry`, `connectivity-axis-exhausted-retry`, `repair-elite-prefix-dfs-retry`, `mc-neighbor-budget-retry`, `goal-attraction-legacy-distance-retry`) plus a 10th direct-conversion site (`repair-late-probe-multi-seed-retry`), all frozen by `scripts/check-solver-budget-boundaries.mjs`, and names them as [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #2's step-3 migration target: *"one additive tier at a time: replace ms-derived dose with an explicitly equivalent work dose, prove parity under the current policy, then remove that site from the CI allowlist."* That report explicitly warned migration "can change production solve sets and must be handled as either a behavior-preserving representation proof or an explicit scheduler-policy experiment" — real risk, but risk to what population, and how much is actually at stake, was not previously quantified in one place. This audit answers both questions without touching any production code.

## Part 1: static fact — these tiers are already off in every real interactive solve

`modules/input/solver-controller.ts:108` and `modules/input/review-controller.ts:143` — the only two production callers that solve a level for an actual interactive Play/Editor/Review user — both call `solverApi.solve(level, { timeBudgetMs: budgetMs, yieldFn, disableExtraBudgetPasses: true })`.

Tracing that flag through `modules/solver/stage-budget.ts` shows it zeroes every one of the 9 CI-ratchet-listed tiers' own participation condition, plus `repair-late-probe` and its multi-seed sibling:

| Site | `stage-budget.ts` line | Effect of `disableExtraBudgetPasses: true` |
|---|---|---|
| repair-fallback | 923 | `repairFractionOverride` forced to `0` |
| attraction-diversity | 934 | `diversityFractionOverride` forced to `0` |
| dedup-near-tie-retry | 943 | `dedupRetryFractionOverride` forced to `0` |
| admissible-order-non-default-retry | 957 | `nonDefaultRetryFractionOverride` forced to `0` |
| connectivity-axis-exhausted-retry | 971 | `connectivityRetryFractionOverride` forced to `0` |
| repair-elite-prefix-dfs-retry | 987 | `repairElitePrefixDfsRetryFractionOverride` forced to `0` |
| mc-neighbor-budget-retry | 999 | `mcNeighborBudgetRetryFractionOverride` forced to `0` |
| admissible-order | 1020 | `admissibleOrderFractionOverride` forced to `0` |
| repair-late-probe | 1194 | `repairLateProbeNodeBudgetRaw` forced to `0` |
| goal-attraction-legacy-distance-retry | 1217-1218 | fraction forced to `0` directly (`opts.disableExtraBudgetPasses ? 0 : ...`) |
| repair-late-probe-multi-seed-retry | 1228-1232 | transitively disabled — its own run condition requires `repairLateProbeTierWillRun`, which already requires the (now zero) `repair-late-probe` budget |

Every one of these tiers' participation condition is `budgetFraction > 0 && ...`. With the fraction forced to `0`, none of them ever produce a single attempt in a real Play/Editor/Review solve, regardless of how hard the level is. **Migrating any of their formulas cannot change what a real player experiences**, because none of them currently run for a real player at all.

## Part 2: empirical — what actually exercises them, and how much they cost

The one call shape that *does* leave these tiers enabled is exactly the offline/batch shape used by `level-blind-capability-sweep.mjs` and the `solver-broad-confirmation.yml`/`solver-residual-confirmation.yml` workflows: no `disableExtraBudgetPasses`, a caller-supplied `nodeBudget`/`workBudget`, and a large non-binding `timeBudgetMs` (the confirmation workflows' own default is `86,400,000` — 24h, explicitly commented `"intentionally non-binding; node budget is the real ceiling"`).

`scripts/additive-tier-participation-audit.mjs` reproduces that exact shape (`nodeBudget`, `workBudget`, `timeBudgetMs`, `attemptBudgetTelemetry: true` for the `workSpent` field, no `strictTotalWorkBudget`) and reads only existing, already-diagnostic-only `Attempt.stageId`/`workSpent`/`nodesExpanded` fields (see `orchestration.ts`'s own `Attempt` interface: *"Diagnostic-only, read by external tooling — not read by any solving logic"*) — no new hook, no observer, nothing that could change a search decision.

### Population and result

10 levels, corpus2 positions 1-10, `nodeBudget=500,000`, `workBudget=670,000` (the confirmation workflows' own 1.34x ratio), `timeBudgetMs=86,400,000`.

3/10 solved within budget; 7/10 hit `node-budget-reached`. **10/10 levels produced at least one additive-tier attempt** — on this hard sample, every level reaches these tiers. **3/10 levels (30%) were solved BY one of them** — `repair-late-probe-multi-seed-retry` (R00039), `repair-late-probe` (R00059), and `connectivity-axis-exhausted-retry` (R00080) each won exactly one level nothing earlier in the ladder would have found within this budget. These tiers are not dead weight on this sample; they are the reason nearly a third of it solves at all.

### Cost: nominal budget is not the real ceiling

| Stage | Levels participated | Levels won | Total `workSpent` | Ratio to nominal `workBudget` (670,000) |
|---|---:|---:|---:|---:|
| repair-fallback | 5/10 | 0 | 1,022,368 | 1.5x |
| admissible-order | 10/10 | 0 | 1,965,404 | 2.9x |
| admissible-order-non-default-retry | 10/10 | 0 | 1,730,533 | 2.6x |
| dedup-near-tie-retry | 10/10 | 0 | 6,028,767 | 9.0x |
| connectivity-axis-exhausted-retry | 10/10 | 1 | 12,168,302 | 18.2x |
| mc-neighbor-budget-retry | 5/10 | 0 | 10,890,427 | 16.3x |
| repair-late-probe | 4/10 | 1 | 59,855,302 | 89.3x |
| goal-attraction-legacy-distance-retry | 8/10 | 0 | 31,957,484 | 47.7x |
| repair-late-probe-multi-seed-retry | 3/10 | 1 | 313,076,369 | **467.3x** |
| attraction-diversity, repair-probe-shrink-recovery, repair-elite-prefix-dfs-retry | 0/10 | 0 | 0 | — (not eligible/not reached on this sample) |

`repair-fallback` stays close to nominal because it deliberately shares the caller's own outer, already-depleting work pool (per its call site's own comment) rather than getting a fresh one. Every "additive-node-headroom" or "fixed-node-cap" tier does the opposite: it gets a **fresh** budget sized from its own fixed constant or fraction, independent of whatever `nodeBudget`/`workBudget` the caller actually asked for:

- `REPAIR_LATE_PROBE_NODE_BUDGET = 5,000,000` (`stage-budget.ts:820`) — a flat node count 10x the nominal `nodeBudget` used here, on its own.
- `REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS = [1,2,3,4,5,6,7]` (`stage-budget.ts:873`) — up to 7 *additional* rounds stacked on top of that.
- `DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION`, `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION`, `MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION`, `GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_BUDGET_FRACTION` are each `1.0` (`stage-budget.ts:362,565,721,839`) — a full **fresh, undivided** whole-ladder rerun, not a small top-up.

None of these four constants are derived from the caller's `nodeBudget`/`workBudget`/`timeBudgetMs` at all. A capability sweep or confirmation A/B that requests `node_budget=50,000,000` is not asking for a 50M-node ceiling per level — once the main ladder is exhausted, each eligible late tier adds its own multi-million-node (or fully-fresh, `1.0`-fraction) allocation on top, unless `strictTotalWorkBudget: true` is also set.

## Reading against queue #2's own framing

This does not tell us any specific tier's ms→work conversion is currently *wrong* (Part 1 already shows none of them affect live play, so there's no correctness regression to find there), and it does not perform or de-risk a migration. What it establishes:

1. **Migration risk is confined to offline tooling**, never live play — a materially lower stakes bar than "could silently change what a player experiences" for all 9+ sites at once.
2. **These tiers are not negligible on offline populations** — they fire on effectively every hard level in this sample and are responsible for a meaningful share of solves (30% here), so "just delete them" is not a viable simplification; any future migration needs real behavior-preservation, not removal.
3. **The bigger, currently-undocumented-in-one-place risk for anyone consuming a capability-sweep/confirmation number is budget legibility, not ms-vs-work purity**: a `node_budget=X` input to `solver-broad-confirmation.yml`/`solver-residual-confirmation.yml`/`level-blind-capability-sweep.mjs` can mean many times `X` in real per-level cost once these tiers engage, unless the run also sets `strictTotalWorkBudget`. That is a distinct, likely higher-value finding than the "one additive tier at a time" migration order queue #2 currently names, and is worth flagging to whoever next revises that item's priority ordering.

## Part 3: is the fix already available, and is it actually used?

A follow-up static trace answers the "not-yet-audited question" this report originally left open.

**The fix works.** `strictTotalWorkBudget: true` sets `prep._strictWorkCap = workStart + workBudget`
(`orchestration.ts:1610`), and every additive tier's own local `prep._workCap` assignment is clamped
to it (`Math.min(prep._workMeter.units + attBudget, prep._strictWorkCap ?? Infinity)`, e.g.
`orchestration.ts:814,910,2528`). The search internals that actually stop work
(`search.ts:153`, `repair-search.ts:1106`, `admissible-order-search.ts:317`) all check
`prep._workMeter.units >= (prep._workCap ?? Infinity)` as a hard stop — so `strictTotalWorkBudget`
genuinely overrides even a fixed-constant tier like `repair-late-probe`'s flat 5,000,000-node budget,
not just the fraction-derived ones. This is exactly the mechanism Stage A/B of the connectivity-
rejection audit already relied on for their byte-identical, wall-clock-predictable per-level runs.

**It is opt-in and the real confirmation pipeline does not opt in.** `level-blind-capability-sweep.mjs`
(the script both `solver-broad-confirmation.yml` and `solver-residual-confirmation.yml` invoke for
every real confirmation shard) supports `--strict-total-work-budget`, but neither workflow — nor the
currently-running `solver-level-blind-targeted-sweep.yml` — ever passes it. Every confirmation A/B
this queue has run to date (including the `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` promotion
chain) ran under the additive, not-actually-capped semantics this report describes.

**This is not necessarily a bug to fix.** These workflows' `target_wall_minutes`/timeout/worker
settings were presumably tuned against their own real observed run times, additive tiers included —
switching them to `strictTotalWorkBudget` now would itself be a solve-set-changing intervention
requiring the same behavior-preservation rigor as any other queue #2 step-3 migration, not a free
correctness fix. The actionable takeaway is narrower: **`node_budget`/`--node-budget` in these
workflows is a per-level starting allocation, not a per-level ceiling** — worth stating precisely
wherever that input is documented or reasoned about, so a future reader does not treat it as a hard
bound it never was.

**Scale caveat on Part 2's 1.5x-467x figures:** that population used `nodeBudget=500,000`, two orders
of magnitude below the confirmation workflows' own `node_budget=50,000,000` default. Tiers with a
FLAT constant ceiling (`repair-late-probe`'s 5,000,000 nodes) would be a much smaller relative share
at that larger scale (10% of 50M vs. ~1000% of 500K here). Tiers at a `1.0` budget FRACTION
(`dedup-near-tie-retry`, `connectivity-axis-exhausted-retry`, `mc-neighbor-budget-retry`,
`goal-attraction-legacy-distance-retry`) scale proportionally with whatever pool they draw from, so
their relative overshoot should hold roughly constant across scale — but this is reasoning from the
constants, not measured at 50M-node-budget scale, which would need its own (much more expensive) run.

## What this does not establish

- No claim about any tier's ms→work conversion accuracy or correctness — not measured here.
- No production code change, and no recommendation to add one. This is discovery evidence only.
- No claim beyond this specific 10-level corpus2 sample; a larger population would sharpen the per-tier participation/win rates but is unlikely to change Part 1's static conclusion (which is a code fact, not a sample-dependent one).
- Part 2's exact multiplier (1.5x-467x) is specific to the tested `nodeBudget=500,000` scale, not measured at the confirmation workflows' own `node_budget=50,000,000` scale — see Part 3's scale caveat.
- No recommendation on whether the confirmation/sweep workflows should adopt `strictTotalWorkBudget` — that tradeoff (reproducibility/legibility vs. a real solve-set-changing policy change) is unevaluated here.

## Reproduction

```bash
node scripts/additive-tier-participation-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-10 \
  --node-budget=500000 \
  --out=reports/stress/additive-tier-participation-audit.json \
  --summary-out=reports/stress/additive-tier-participation-audit-summary.md
```

Raw records and per-level summaries: [`reports/stress/additive-tier-participation-audit.json`](stress/additive-tier-participation-audit.json).
