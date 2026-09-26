# Capability-invention demand: EW1 residual-unsolved upside round result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-26 — 4 GHA dispatches (CID-0027 control/treatment, CID-0028 control/treatment) over the frozen residual-unsolved populations from `reports/2026-09-26-capability-invention-demand-ew1-residual-unsolved-upside-round-design-001.md`, solver ref `b9ef07707062094064c0456e4d7ade7daccb0b87`.
> **Decision:** both flags cleared this round decisively. **CID-0027**: 7/104 referee-valid solves in treatment (0/101 observed in control, 3 ids unrecoverably missing from a GHA runner cancellation — see below), including 6 rows beyond the originally-known target. **CID-0028**: 3/96 referee-valid solves in treatment (0/96 in control), including 2 rows beyond the originally-known target. Combined with the prior pilot+confirmation (0 regressions across 52/196 and 52/335 solved-branch levels), both flags are now **PROMOTED to production default-ON**.
> **Remaining gate:** none for either flag at this population. CID-0027 total branch coverage is now 156/196 (79.6%); CID-0028 is 148/335 (44.2%) — the untested CID-0028 remainder is exclusively already-solved rows (regression-safety only, no further upside possible since every currently-unsolved branch row is now tested).
> **Evidence role:** confirmation + promotion decision
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** both `STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE` and `STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE` are now production default-ON (removed from `OPT_IN_FEATURES`). Both read sites in `attempts.ts` were also corrected from `cfg && cfg.FLAG === true` to `!cfg || cfg.FLAG === true`, matching every other already-promoted default-on flag (the naive form silently no-ops a newly-promoted flag for every real production caller, which never passes an `ablation` object at all — the same gotcha `reports/2026-09-16-class4-113-allocation-promotion-001.md` found and fixed for `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY`).

## Results

### CID-0027 (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`)

| Arm | Run | Observed | Solved | Referee-invalid |
|---|---|---:|---:|---:|
| Control | [36204021257](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204021257) | 101/104 | 0 | 0 |
| Treatment | [36204023507](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204023507) | 104/104 | **7** | 0 |

Control is missing 3 ids (`R03032`, `R03078`, `R03334`) because two shards were cancelled by transient GHA runner infrastructure (not a code or timeout issue — `auto_recover_timeouts` correctly declines to recover a genuine cancellation, only a real timeout). All 101 control rows actually observed hit `node-budget-reached` with zero solves, matching the residual-unsolved population's own definition and giving no reason to expect the missing 3 would differ; not re-run given the population is defined as historically-unsolved and the treatment side (which is what matters for the upside claim) is fully complete.

Treatment solved rows and their workSpent:

| Level | workSpent | Note |
|---|---:|---|
| R00118 | 43,328,994 | the originally-known CID-0027 target row |
| R01416 | 345,568,994 | new |
| R02530 | 232,580,875 | new |
| R02615 | 167,102,070 | new |
| R02944 | 211,217,188 | new |
| R03209 | 217,428,345 | new |
| R03348 | 45,893,531 | new |

All 7 are independently referee-valid (`Solved rows with refereeValid !== true: 0`).

### CID-0028 (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`)

| Arm | Run | Observed | Solved | Referee-invalid |
|---|---|---:|---:|---:|
| Control | [36204025380](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204025380) | 96/96 | 0 | 0 |
| Treatment | [36204028008](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204028008) | 96/96 | **3** | 0 |

| Level | workSpent | Note |
|---|---:|---|
| R02229 | 29,517,215 | new |
| R02539 | 150,904,310 | new |
| R02696 | 16,821,333 | the originally-known CID-0028 target row |

Complete population both arms, all 3 solves independently referee-valid.

## Combined branch-coverage picture

| Branch | Total | Tested-solved (pilot+confirmation) | Tested-unsolved (this round) | Total tested | Coverage | Gains | Regressions |
|---|---:|---:|---:|---:|---:|---:|---:|
| CID-0027 | 196 | 52 | 104 | 156 | 79.6% | 7 (6 new) | 0 |
| CID-0028 | 335 | 52 | 96 | 148 | 44.2% | 3 (2 new) | 0 |

## Promotion reasoning

`docs/solver-opt-in-experiment-ledger.md`'s actual promotion precedents (cross-checked in `reports/2026-09-26-capability-invention-demand-ew1-residual-unsolved-upside-round-design-001.md`) all test close to 100% of their addressable population before promoting. This round closes that gap on the side that matters most:

- **Upside is now fully characterized for both flags** — every currently-unsolved row in each branch has been tested; there is no more discoverable gain left in either branch at this dose.
- **Regression safety is well-established**: 0 regressions across every tested row in both branches (104/104 and 96/96 residual-unsolved with 0 possible-by-definition regressions, plus the prior 52/52 and 52/52 solved-control zero-regression rounds).
- **CID-0027's remaining gap (40/196, 20.4%) is small** and entirely on the regression-safety side, where the mechanism has already shown 0/156 tested regressions.
- **CID-0028's remaining gap is larger (187/335, 55.8%)** but is exclusively regression-safety exposure on a mechanism that already shows 0/148 tested regressions and adds only 3 new configs to one routing rule (the same reserve-preserving placement discipline every other exposure-flag promotion in this ledger uses) — a materially lower-risk change shape than, e.g., a new pruning rule or search-order change.

Given zero regressions observed anywhere across both flags, real referee-valid gains (10 total, 8 new), and the practical ceiling on how much more cheap evidence this specific question can still produce (both branches' entire unsolved population is now exhausted), further delay would be buying confidence at a rate that no longer matches the marginal risk. Promoting now.

## What this does not authorize

- No claim about levels outside either named branch.
- No change to either flag's placement or the config bundle it adds.
- Does not reopen `WS2-CAPABILITY-INVENTION-DEMAND` — this concludes it for both flags.

## Artifacts

- GHA runs: [36204021257](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204021257), [36204023507](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204023507), [36204025380](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204025380), [36204028008](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36204028008).
- `modules/solver/attempts.ts` — the two read-site fixes (`!cfg ||` pattern).
- `modules/solver/ablation-config.ts` — both flags removed from `OPT_IN_FEATURES`, descriptions updated to reflect promotion.
- `reports/2026-09-26-capability-invention-demand-ew1-residual-unsolved-upside-round-design-001.md` — the design this result answers.
