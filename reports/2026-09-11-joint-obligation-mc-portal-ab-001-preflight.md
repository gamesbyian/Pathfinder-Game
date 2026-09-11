# PRUNE_MC_PORTAL_FORCED_NEIGHBOR: frozen matched-work population A/B preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — both arms complete over the full frozen 219-id population: control [`34557531960`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34557531960) **0/219 solved** (219/219 `node-budget-reached`), treatment [`34557533731`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34557533731) **21/219 solved**. Since control solved zero, every treatment solve is a pure gain by construction — **21 gains, 0 losses, net +21** — and every gain was independently reproduced and referee-valid on a fresh local rerun (`scripts/stress/verify-joint-obligation-ab-gains.mjs`, not the GHA artifact, which this session's egress policy cannot reach: `productionresultssa*.blob.core.windows.net` returns 403 at the proxy).
> **Decision:** **PROMOTE.** `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` flips to production default-ON (removed from `OPT_IN_FEATURES`). See [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md).
> **Remaining gate:** none — all acceptance-rule gates below are satisfied.
> **Evidence role:** population-scale promotion gate for `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` (see [`opt-in ledger`](../docs/solver-opt-in-experiment-ledger.md))
> **Selection:** deterministic structural predicate (`findObligationClusters` non-empty) over the frozen current 671-miss residual, not outcome-selected

## Why now

The observer pilot proved the mechanism sound (a categorical consequence of `search-state.ts`'s portal-revisit rule, not a heuristic estimate) and materially useful on held-out evidence, but carries **zero population-scale solve-count evidence** — it never pruned anything. Per this repo's standing rule that a sound prune can still perturb a budget-limited search and lose solves through survivor/order effects, production stays unchanged until this matched-work population evidence lands, mirroring `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`'s own promotion path exactly.

## Population

Deterministic structural predicate over the frozen current 671-miss Corpus-2 residual (`reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json`, production baseline run `34531412380`): `findObligationClusters(level, prep).length > 0` — at least one pending must-cross cell has a portal terminal as a cardinal neighbor. This is the exact predicate the observer pilot validated, run over the atlas's own rows rather than reconstructed independently.

Resolved count: **219** (86 class 4, 120 class 5, 1 class 1, 4 class 2, 8 class 3). IDs committed for reproducibility: [`data/stress/joint-obligation-mc-portal-ab-001-ids.txt`](../data/stress/joint-obligation-mc-portal-ab-001-ids.txt).

No outcome was inspected before freezing this list beyond the observer pilot's own static-opportunity computation (`analyze-joint-obligation-opportunity.mjs`), which is a pure structural join over the atlas — every one of these 219 is already a current production miss by construction (the atlas only rejoins misses), so "gain" here means the flag alone made a previously-failing level solve at matched work, not a change relative to some other baseline.

## Envelope

`node_budget=50,000,000`, matching the production baseline (`34531412380`'s `corpus2_node_budget`) and the `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` precedent exactly, so a gain means "solves within the same envelope the current miss boundary was established at." `strict_total_work_budget=false` (ordinary additive-tier semantics, same as the precedent). All other workflow inputs left at default (`budget_ms=86400000` non-binding wall-safety only).

## Candidate arms

| arm | flags |
|---|---|
| control | (none — production default; `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` stays OFF) |
| treatment | `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` |

Both arms otherwise run the full default-ON production ladder unchanged.

## Acceptance rule (frozen before either arm runs)

- **Promote (flip default-ON)** if: zero losses (every control-solved id also solves under treatment), at least one gain, and every gain is independently referee-valid on replay.
- **Close negative** if: any loss (a sound prune can still perturb survivor/order and starve a different winning line), regardless of gain count.
- **Close null** if: zero gains and zero losses (real participation confirmed, but the flag never changes an outcome at this envelope).
- A small nonzero loss count with a much larger gain count is NOT a promotion case here (unlike some scoring/retention treatments) — soundness alone does not guarantee zero survivor-effect losses in a budget-limited search, so the same-standard-as-precedent zero-loss bar applies.

## Dispatch plan

Workflow: `solver-level-blind-targeted-sweep.yml`, `ref=claude/solver-queue-sprint-dsgy2r` (carries the new flag; not yet on `main`), `ids_file=data/stress/joint-obligation-mc-portal-ab-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`.

- Control: no `enable_flags`.
- Treatment: `enable_flags=PRUNE_MC_PORTAL_FORCED_NEIGHBOR`.

## Results

| arm | run | solved | work | nodes |
|---|---|---:|---:|---:|
| control | [`34557531960`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34557531960) | 0/219 | 51,794,598,716 | 45,024,213,737 |
| treatment | [`34557533731`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34557533731) | 21/219 | 49,662,705,934 | 41,659,932,525 |

**Gains (21, all pure since control solved none):** R00726, R01274, R01489, R01849, R01882, R02036, R02060, R02162, R02389, R02479, R02546, R02654, R02707, R02823, R02832, R02864, R02932, R03097, R03106, R03254, R03336.

**Losses: 0.** Not possible by construction — control solved zero of the 219, so no control-only solve exists for treatment to fail to reproduce.

**Referee validation:** GHA artifact download is blocked by this session's egress policy (`productionresultssa18.blob.core.windows.net` / `productionresultssa9.blob.core.windows.net` both return 403 at the proxy — reported, not routed around). Independently reproduced all 21 gains locally instead, on the exact same commit (`dd28ee0`) with `{ ...defaultConfig(), PRUNE_MC_PORTAL_FORCED_NEIGHBOR: true }`, `nodeBudget=50000000`: all 21 solved and passed `Solver.validateCandidatePath` (canonical referee). See `scripts/stress/verify-joint-obligation-ab-gains.mjs`.

**Attempt errors / deadline-censoring imbalance:** both arms reached complete, identical 219/219 population coverage (101/101 and 55/55 shards respectively, both auto-recovered to completeness), with no differential censoring — every id ran under the identical `node_budget=50,000,000` envelope this report froze.
