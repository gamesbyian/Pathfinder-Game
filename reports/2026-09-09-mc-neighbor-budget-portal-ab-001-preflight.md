# PRUNE_MC_NEIGHBOR_BUDGET_PORTAL: frozen matched-work population A/B preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-09 — both arms complete over the full frozen 530-id population (control 193/530, treatment 245/530), per-level enumeration: **52 gains, 0 losses, net +52**, every gain confirmed referee-valid on independent replay ([`run 34358138984`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34358138984), 52/52 `refereeValid=true`), `npm run solver:regression` clean (160/160, no regressions). See [`Results`](#results) below.
> **Decision:** **PROMOTE.** `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` flipped to production default-ON 2026-09-09 (removed from `OPT_IN_FEATURES`; `mustCrossNeighborBudgetDeadlocked`'s portal gate now `!cfg || cfg.PRUNE_MC_NEIGHBOR_BUDGET_PORTAL !== false`, preserving an explicit-`false` research escape hatch). See [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md).
> **Remaining gate:** none — all acceptance-rule gates below are satisfied.
> **Evidence role:** population-scale promotion gate for `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` (see [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md))
> **Selection:** deterministic structural predicate over the frozen Corpus-2 source, not outcome-selected

## Why now

`mustCrossNeighborBudgetDeadlocked`'s blanket portal carve-out predates the portal-forced-move derivation; [`the evidence-hardening report`](2026-09-09-portal-restoration-evidence-hardening-001.md) closes that derivation and this branch removes the carve-out behind a new opt-in flag (`PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`, default OFF). Correctness gates are clean. Per that report's own frozen contract (section 5.1) and the standing rule that a sound prune can still perturb a budget-limited search and lose solves through survivor/order effects, production stays unchanged until this matched-work population evidence lands.

## Population

Deterministic structural predicate over frozen Corpus 2 (`data/stress/stress-levels-random.json`, `sha256:89cd0b6380a6d585e43411139a0805078e78f883d02f37e7ae3513f4be55b414`): `portalPairs > 0 && mustCross.length > 0`.

Resolved count: **530** (matches the evidence-hardening report's committed census). IDs committed for reproducibility: [`data/stress/mc-neighbor-budget-portal-ab-001-ids.txt`](../data/stress/mc-neighbor-budget-portal-ab-001-ids.txt).

```js
// data/stress/stress-levels-random.json, one pass:
const portalCount = l.portals ? (Array.isArray(l.portals) ? l.portals.length : Object.keys(l.portals).length) : 0;
const mcCount = (l.mustCross || []).length;
if (portalCount > 0 && mcCount > 0) ids.push(l.id);
```

No outcome was inspected before freezing this list — it is a pure structural filter over the corpus, matching the frozen baseline population identified in the evidence-hardening report.

## Envelope

Baseline production boundary referenced by the evidence-hardening report: `workBudget=67,000,000` (solver commit `045bbe904a567929ef4ed3aeeded110bd13b5491`). `solver-level-blind-targeted-sweep.yml` derives `work_budget = node_budget * 1.34`, so `node_budget=50,000,000` reproduces that same `workBudget` exactly. `strict_total_work_budget=false` (ordinary additive-tier semantics, matching this same prune's original 2026-08-12 promotion methodology — a strict cap is a different comparison, not needed to isolate this treatment). All other workflow inputs left at default.

## Candidate arms

| arm | flags |
|---|---|
| control | (none — production default; `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` stays OFF) |
| treatment | `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` |

Both arms otherwise run the full default-ON production ladder unchanged (`PRUNE_MC_NEIGHBOR_BUDGET` itself is already default-ON for portal-free must-cross axes in both arms; only the portal-level evaluation gate differs).

## Acceptance rule (frozen before either arm runs)

Per the evidence-hardening report's own section 5.1 gate:

- identical total `workBudget` and scheduler envelope (guaranteed by both arms sharing this dispatch's inputs);
- no attempt errors / deadline-censoring imbalance between arms;
- referee-valid treatment gains (every claimed new solve replayed/validated);
- enumerate every gain and loss, not just the net;
- published-corpus regression unchanged (not part of this dispatch — checked separately via `npm run solver:regression` before promotion);
- **promote** (remove `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` from `OPT_IN_FEATURES` and flip `mustCrossNeighborBudgetDeadlocked`'s portal gate to `!cfg || cfg.PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`) only on **positive net solves**, or a **material work reduction with zero solve loss**;
- if churn exists (both gains and losses with a positive or flat net), diagnose it as search/allocation coupling (survivor/order effects) rather than treating it as evidence against soundness — the derivation itself is not in question, only the population-level scheduling interaction;
- **any net solve loss** with no offsetting material work reduction: do not promote; keep `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` ACTIVE/opt-in and record the loss set for follow-up.

## Reproduction

Workflow: `solver-level-blind-targeted-sweep.yml`, `ids_file=data/stress/mc-neighbor-budget-portal-ab-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`, `target_wall_minutes=5` (reduced from the workflow's default 20; see the dispatch-mechanics note below).

### Dispatch mechanics note (read before reproducing)

Three distinct GHA issues surfaced getting this population through cleanly, in order:

1. **Shard-matrix regression** (pre-existing, unrelated to this A/B): fixed separately, see the `d0d5e91` commit ("Fix shard-matrix expansion regression in two GHA sweep workflows").
2. **Per-shard job-timeout miscalibration at the default `target_wall_minutes=20`**: shards hit their 40-minute job-timeout ceiling before finishing. Fixed by dropping to `target_wall_minutes=5`.
3. **A small, consistent set of ids (~16-18 out of 530) are genuinely slow at `workBudget=67,000,000` under this ladder** — slow enough that even a handful of them packed into one shard together exceeds that shard's own job timeout, regardless of which wave they land in. This is NOT flakiness: two independent full-population control dispatches ([`34320087947`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34320087947): 513/530; [`34328472452`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34328472452): 514/530) came back missing nearly the identical id set. Fixed by dispatching just the missing ids as their own small population at `target_wall_minutes=1`, which packs one id per shard and gives each individually slow level its own full timeout headroom — see [`data/stress/mc-neighbor-budget-portal-gapfill-001-ids.txt`](../data/stress/mc-neighbor-budget-portal-gapfill-001-ids.txt) (the union of both attempts' missing ids, 18 total).

### Control arm — COMPLETE (530/530)

- Main body: run [`34328472452`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34328472452) (`target_wall_minutes=5`), 514/530 levels resolved, 189 solved. Missing 16: R02565, R02656, R02794, R02802, R02858, R02884, R02899, R02902, R02915, R02927, R02932, R03032, R03128, R03303, R03304, R03334.
- Gap-fill: run [`34337880617`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34337880617) (`target_wall_minutes=1`, 18 ids including the 16 above plus R03097/R03368 which the main body already had), 4/18 solved: R02858, R02884, R02927, R03304. The other 14 (including all 16 the main body was missing minus those 4) are `node-budget-reached`.
- **Combined control: 189 + 4 = 193/530 solved.**

### Treatment arm — COMPLETE (530/530)

- Gap-fill-001 (18 ids, the ones control also needed gap-fill for): run [`34337871124`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34337871124) (`target_wall_minutes=1`), 5/18 solved: R02858, R02884, R02927, R02915, R03304. The other 13 are `node-budget-reached`.
- Main body: run [`34341771720`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34341771720) (`enable_flags=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`, `target_wall_minutes=5`). Hit much worse GHA runner-capacity/timeout attrition than control (33/53 shards cancelled vs. control's 3/53): 398/530 levels reported, 220 solved, 132 missing (a strict superset of the 18 gap-fill-001 ids). Its full per-level table isn't directly recoverable from this run's own logs (predates the `if:always()` print-step fix in `e4ff8d7`/`50054cc`); reconstructed instead via per-shard job-log scraping (398/398 rows recovered — 397 by direct scrape, 1 row, **R03356**, forced SOLVED by exact +1/+1 reconciliation against the official 398-row/220-solved aggregate, since it wasn't visible in any of the 53 shards' console text despite exhaustive verified scraping — most likely lost to console buffering at a cancellation boundary, not a parsing miss).
- Gap-fill-002 (114 net-new missing ids): id list at [`data/stress/mc-neighbor-budget-portal-treatment-gapfill-002-ids.txt`](../data/stress/mc-neighbor-budget-portal-treatment-gapfill-002-ids.txt); run [`34349539268`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34349539268) (`target_wall_minutes=1`). Much lower attrition (1/62 shards cancelled): 113/114 resolved, 20/113 solved.
- Gap-fill-003 (the 1 remaining id, R03346): run [`34356409220`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34356409220), clean, `node-budget-reached` (0 solves across every stage).
- **Combined treatment: 245/530 solved.**

## Results

Per-level enumeration, treatment vs. control, over the full frozen 530-id population (both arms independently reconstructed to 530/530 via the dispatch history above):

| | control unsolved | control solved |
|---|---:|---:|
| **treatment unsolved** | 285 (both unsolved) | 0 (losses) |
| **treatment solved** | 52 (gains) | 193 (both solved) |

- **Gains: 52.** Every one of them: control=`node-budget-reached` → treatment=`SOLVED`/`success`. Full id list: R00340, R00342, R00702, R00867, R00893, R01229, R01477, R01590, R01769, R02077, R02078, R02081, R02151, R02168, R02176, R02179, R02205, R02227, R02251, R02261, R02427, R02428, R02535, R02593, R02610, R02647, R02695, R02765, R02770, R02814, R02815, R02848, R02866, R02900, R02915, R02924, R02975, R03014, R03061, R03063, R03071, R03084, R03094, R03120, R03137, R03143, R03153, R03186, R03205, R03242, R03324, R03356 — committed at [`data/stress/mc-neighbor-budget-portal-gain-referee-check-001-ids.txt`](../data/stress/mc-neighbor-budget-portal-gain-referee-check-001-ids.txt).
- **Losses: 0.** No level solved under control regressed to unsolved under treatment — no churn to diagnose.
- **Net: +52.**
- **Referee validity: confirmed.** None of the 52 gains' `refereeValid` status was directly observable from console logs at the time they were solved (the console line only printed `SOLVED`, not the underlying `Solver.validateCandidatePath` replay result). Added a small, additive print-line fix (`f8d30f2`) to surface `refereeValid` inline, then redispatched exactly these 52 ids under the treatment flag (run [`34358138984`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34358138984)): 52/52 resolved `SOLVED` again, and **52/52 `refereeValid=true`** — zero `false`, zero `null`. Every claimed gain replays clean.
- **Attempt errors / deadline-censoring imbalance:** no differential censoring at the per-level solve level between arms — both arms reached complete, identical 530/530 population coverage, and every individual id (regardless of which dispatch round supplied it) ran under the identical `node_budget=50,000,000`/`workBudget=67,000,000` envelope this report froze. GHA runner-capacity attrition affected only which shard/dispatch round produced a given id's result, never its solve envelope, so there is no envelope imbalance to diagnose.
- **Published-corpus regression:** clean. `npm run solver:regression` (production-default config): 160/160 solved, no regressions, `solver-bench --check` PASS.

## Decision

**PROMOTE.** All acceptance-rule gates are satisfied: identical envelope, zero censoring imbalance, 52/52 referee-valid gains, every gain/loss enumerated (52/0), clean published-corpus regression, and a strictly positive net (+52, zero losses — not even churn to diagnose). `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` is promoted to production default-ON: removed from `OPT_IN_FEATURES` in [`ablation-config.ts`](../modules/solver/ablation-config.ts); `mustCrossNeighborBudgetDeadlocked`'s portal gate in [`lower-bounds.ts`](../modules/solver/lower-bounds.ts) now defaults to evaluating portal levels, with an explicit `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL: false` retained as a research escape hatch rather than deleting the flag outright.
