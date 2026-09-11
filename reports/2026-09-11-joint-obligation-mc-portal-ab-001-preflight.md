# PRUNE_MC_PORTAL_FORCED_NEIGHBOR: frozen matched-work population A/B preflight

> **Status:** active
> **Last evidence:** 2026-09-11 — [`observer pilot`](2026-09-11-joint-obligation-propagation-observer-pilot-001.md) concluded-positive: 0 false rejects across the oracle-labelled atlas, a full 3-corpus known-solution replay, and a class-4/class-5 real-search run; 15 unique oracle-atlas dead-branch catches beyond the existing gauntlet.
> **Decision:** dispatch the frozen matched-work A/B below before any promotion decision. Production stays unchanged (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` default-OFF) until this population evidence lands.
> **Remaining gate:** both arms complete over the frozen population; apply the acceptance rule below.
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

Pending both dispatches.
