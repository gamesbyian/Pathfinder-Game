# PRUNE_CONNECTIVITY_VOLUME_PORTAL: frozen matched-work population A/B preflight

> **Status:** active
> **Last evidence:** 2026-09-09 — correctness gates clean (0 violations replaying every known stored solution across all 3 corpora with the flag forced on, `scripts/stress/connectivity-volume-portal-soundness-check.mjs`). See [`topology.ts`](../modules/solver/topology.ts) and [`portal restoration evidence hardening`](2026-09-09-portal-restoration-evidence-hardening-001.md).
> **Decision:** pending — this report freezes the population, envelope, and acceptance rule before either arm runs.
> **Remaining gate:** dispatch control then treatment, combine, and apply the frozen acceptance rule below.
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
