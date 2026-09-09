# PRUNE_MC_NEIGHBOR_BUDGET_PORTAL: frozen matched-work population A/B preflight

> **Status:** active
> **Last evidence:** 2026-09-09 — correctness gates clean (0 false rejects on the full 5,518-branch oracle-labelled atlas restricted to the 922 portal+must-cross branches; 0 soundness violations replaying every known stored solution across all 3 corpora with the flag forced on). See [`lower-bounds.ts`](../modules/solver/lower-bounds.ts) and [`portal restoration evidence hardening`](2026-09-09-portal-restoration-evidence-hardening-001.md).
> **Decision:** pending — this report freezes the population, envelope, and acceptance rule before either arm runs.
> **Remaining gate:** dispatch control then treatment, combine, and apply the frozen acceptance rule below.
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

### Treatment arm

- Gap-fill only so far: run [`34337871124`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34337871124) (`target_wall_minutes=1`, same 18 ids), 5/18 solved: R02858, R02884, R02927, R02915, R03304 — **R02915 is a gain over control on this 18-id subset** (control: `node-budget-reached`; treatment: solved). All other levels match control on this subset.
- Main body (the other ~512 ids): dispatched as run [`34341771720`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34341771720) (`enable_flags=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`, `target_wall_minutes=5`), in progress as of this writing. Expect a small residual gap requiring the same gap-fill treatment; if the missing set differs from control's, gap-fill treatment on the union.

Once the treatment main body + any needed gap-fill lands, combine per-level (not just aggregate counts) against the control's full 530-row set above to enumerate gains/losses per the frozen acceptance rule.
