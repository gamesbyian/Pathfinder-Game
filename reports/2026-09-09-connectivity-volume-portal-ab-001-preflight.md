# PRUNE_CONNECTIVITY_VOLUME_PORTAL: frozen matched-work population A/B preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-10 — both arms complete over the full frozen 954-id population (control 455/954, treatment 457/954). **2 gains (`R02297`, `R02746`), 0 losses, net +2**, plus a small aggregate workSpent/nodesExpanded reduction. See [`Result`](#result-2026-09-10) below.
> **Decision:** **PROMOTE.** Net +2 solves, 0 losses, plus a small aggregate work/node reduction — squarely inside the frozen acceptance rule's promote condition.
> **Remaining gate:** none. `PRUNE_CONNECTIVITY_VOLUME_PORTAL` removed from `OPT_IN_FEATURES`; `isConnected`'s portal gate flipped to default-ON with an explicit-`false` research escape hatch (`modules/solver/topology.ts`).
> **Evidence role:** population-scale promotion gate for `PRUNE_CONNECTIVITY_VOLUME_PORTAL` (see [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md))
> **Selection:** deterministic structural predicate over the frozen Corpus-2 source, not outcome-selected

## Why now

`isConnected`'s volume tail (`freshVolume + intNeeded < rSteps`) carried a blanket `level.portalMap.size === 0` carve-out. [`The evidence-hardening report`](2026-09-09-portal-restoration-evidence-hardening-001.md#3-ordinary-connectivity-volume-portal-derivation-closes) closes that derivation: a portal jump spends zero counted length but may occupy an additional fresh cell, which makes `freshVolume` *more* generous relative to the counted steps still required — weakening the prune, never making it unsound. The carve-out is removed behind a new opt-in flag (`PRUNE_CONNECTIVITY_VOLUME_PORTAL`, default OFF). Correctness gates are clean. Per the standing rule that a sound prune can still perturb a budget-limited search and lose solves through survivor/order effects, production stays unchanged until this matched-work population evidence lands.

This report does **not** cover `isConnectedForFalseGoalTriggerSearch` (the false-goal trigger-search mirror), which the evidence-hardening report explicitly keeps as its own, separate correctness treatment (a completed false-goal enumeration can turn absence into an editor-facing "untriggerable" conclusion, so it needs its own triggerable-endpoint differential before any change). That function is untouched by this branch.

## Population

Deterministic structural predicate over frozen Corpus 2 (`data/stress/stress-levels-random.json`, `sha256:89cd0b6380a6d585e43411139a0805078e78f883d02f37e7ae3513f4be55b414`): `portalPairs > 0`.

Resolved count: **954** (matches the evidence-hardening report's committed census exactly — the whole portal-bearing population, not the narrower must-cross intersection used by the neighbour-budget A/B). IDs committed for reproducibility: [`data/stress/connectivity-volume-portal-ab-001-ids.txt`](../data/stress/connectivity-volume-portal-ab-001-ids.txt).

No outcome was inspected before freezing this list — it is a pure structural filter over the corpus.

## Envelope

Same envelope as [`the neighbour-budget A/B`](2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md), for consistency across the portal-restoration tranche: `node_budget=50,000,000` (→ `workBudget=67,000,000`, matching the frozen production boundary referenced by the evidence-hardening report), `strict_total_work_budget=false`. All other workflow inputs left at default.

## Candidate arms

| arm | flags |
|---|---|
| control | (none — production default; `PRUNE_CONNECTIVITY_VOLUME_PORTAL` stays OFF) |
| treatment | `PRUNE_CONNECTIVITY_VOLUME_PORTAL` |

## Acceptance rule (frozen before either arm runs)

Per the evidence-hardening report's own section 5.2 gate:

- identical total `workBudget` and scheduler envelope (guaranteed by both arms sharing this dispatch's inputs);
- zero stored-path/differential soundness failures (already separately verified pre-population, see above);
- gains/losses and aggregate `workSpent` reported, not just the net;
- published-corpus regression unchanged (checked separately via `npm run solver:regression` before promotion);
- **promote** (remove `PRUNE_CONNECTIVITY_VOLUME_PORTAL` from `OPT_IN_FEATURES` and flip `isConnected`'s portal gate to `!cfg || cfg.PRUNE_CONNECTIVITY_VOLUME_PORTAL`, matching every other default-ON gate) only on **positive net solves**, or a **material work reduction with zero solve loss**;
- if churn exists (both gains and losses with a positive or flat net), diagnose it as search/allocation coupling rather than treating it as evidence against soundness;
- **any net solve loss** with no offsetting material work reduction: do not promote; keep `PRUNE_CONNECTIVITY_VOLUME_PORTAL` ACTIVE/opt-in and record the loss set for follow-up.

## Reproduction

Workflow: `solver-level-blind-targeted-sweep.yml`, `ids_file=data/stress/connectivity-volume-portal-ab-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`.

- Control dispatch: no `enable_flags`/`disable_flags`.
- Treatment dispatch: `enable_flags=PRUNE_CONNECTIVITY_VOLUME_PORTAL`.

Both dispatches share the workflow's own default concurrency group, so they run sequentially (control first) — and queue behind the already-dispatched `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` A/B, which shares that same concurrency group.

**Status as of 2026-09-09 ~21:13 UTC:** the other two portal restoration A/Bs have both reached decisions (`PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` promoted; `STRATEGY_PORTAL_COARSE_STATE_MERGE` closed negative on promotion), freeing capacity for this one. Control dispatched: run [`34405685643`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34405685643) (`target_wall_minutes=5`).

## Result (2026-09-10)

Both arms hit shard-level GHA job timeouts on their first dispatches (root-caused separately: telemetry linearly extrapolated across a large node-budget scale change plus a `sum(predicted)/workers` estimator that ignores queueing — see `docs/solver-scheduling-policy.md`'s "Shard-level runtime estimation, uncertainty, and timeout recovery" section for the full mechanism and the fix). Each arm's exact 954-id population was reconstructed by reconciling its original dispatch with targeted gap-fill dispatches for exactly the ids the timeout dropped, via `solver-combine-sweep-runs.yml` (cross-run reconciliation; validates exact population completeness — no duplicate/unexpected/missing ids — before publishing a combined result):

- **Control:** run [`34422971433`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34422971433), reconciling the original dispatch (878 rows) with 4 gap-fill batches (76 rows). **455/954 solved.**
- **Treatment:** run [`34441926524`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34441926524), reconciling the original dispatch (297 rows) with 3 gap-fill batches (657 rows, split a/b/c). **457/954 solved.**

| | control | treatment |
|---|---|---|
| solved | 455/954 | 457/954 |
| aggregate workSpent (all levels) | 136,961,352,144 | 136,150,757,720 |
| aggregate workSpent (solved subset) | 21,243,073,281 | 21,136,080,662 |
| aggregate nodesExpanded (all levels) | 112,886,547,345 | 112,426,482,537 |

**Gains (treatment solved, control did not): `R02297`, `R02746`.**
**Losses (control solved, treatment did not): none.**
**Net: +2, 0 losses**, plus a small (~0.6%) aggregate workSpent/nodesExpanded reduction. Every control-arm unsolved level cleanly reports `node-budget-reached` (no timeout/error censoring in either arm's final combined population).

Per the frozen acceptance rule above (positive net solves with zero losses; no churn to diagnose since losses = 0): **promote.** Published-corpus regression re-checked on the shipped code change: `npm run solver:regression -- --check` reports 160/160 solved, identical solve set, no regressions. Full test suite (1,406 vitest tests, `topology.test.ts`/`lower-bounds.test.ts`/`orchestration.test.ts` specifically re-run) and `check:types`/`check:lint` all pass after the promotion edit.

`PRUNE_CONNECTIVITY_VOLUME_PORTAL` is removed from `OPT_IN_FEATURES` and `isConnected`'s portal gate (`modules/solver/topology.ts`) is flipped to default-ON, matching `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`'s own promoted convention: the flag stays named so an explicit `false` remains a research escape hatch, rather than being deleted outright. `isConnectedForFalseGoalTriggerSearch` is untouched, as planned.
