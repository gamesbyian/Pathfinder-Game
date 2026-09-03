# portfolio-18-specialists production-envelope confirmation 002: tail-percentile cap map v2

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — GHA run [`33707473373`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33707473373), complete, all 15 shards succeeded.
> **Decision:** `portfolio-18-tranche-v2` solved **62/150** — 8 more than `portfolio-18-flat-2m` (54/150), 13 more than `portfolio-18-tranche-v1` (49/150), and **7 more than the uncapped 34-technique `full-menu`** (55/150), while spending less aggregate work than `full-menu` (5,725,486,940 vs. 6,507,179,632). This is not a close call, and it is the first `static-portfolio` treatment measured in this entire research line to beat the full menu's own coverage rather than trade a small coverage loss for work savings. Per this program's confirmation-strength norms (matching `portfolio-18-specialists`' own two-independent-confirmation history), one population is not yet enough to call this the new default treatment — see confirmation-003 for the independent fresh-population replication this result earns.
> **Remaining gate:** independent replication on a fresh, disjoint population — dispatched as `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-003-preflight.md`.
> **Evidence role:** confirmation — a single-variable comparison (cap-map version only; menu, order, population, and total envelope all held fixed against confirmation-001's two already-recorded arms), on one population. A second independent population is needed before this graduates to a validated production candidate.

## Question

`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md` found cap-map v1 (uniformly-scaled raw production `meanAttemptWork`) strictly worse than the flat 2,000,000-per-technique cap: 5 fewer levels solved (49 vs. 54/150) at roughly double the typical cost among solves. Its own Interpretation named the likely cause: mean-scaled caps front-load large shares on a few expensive-but-common early-menu techniques, starving later positions' above-average solves.

`2026-09-03-portfolio-18-tail-percentile-cost-probe-001-preflight.md` then measured all 18 `portfolio-18-specialists` techniques' own isolated `workSpent` distribution (single-technique arms, one consistent uncensored measurement method, unlike v1's mix of 17 production means + 1 cost-probe mean) and derived `data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` from each technique's own p75, scaled to the same 67,000,000 envelope. The raw p75 sum (72,175,464) needed only a mild 0.928x scale-down, versus v1's raw-mean sum (83,495,813) needing 0.802x — a direct, measurable sign that v2's source statistic is less inflated than v1's censored production means.

This confirmation isolates one question: **holding the menu (same 18 techniques, same order), the population, and the total work envelope (67,000,000) fixed, does switching from cap-map v1 (or the flat cap) to cap-map v2 change coverage or aggregate work?**

## Protocol

1. **Population:** the exact same 150-level population already used for confirmation-001 (`data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json`) — reused deliberately so `portfolio-18-tranche-v2`'s result is directly comparable to the already-recorded `portfolio-18-flat-2m`/`portfolio-18-tranche-v1` rows on the identical cells, with no new population-selection effect. This is fair reuse, not mining: v2's cap map was derived entirely from an independent population (the tail-percentile cost probe's own fresh 120-level draw), never from this one's outcomes.
2. **Dispatch C — tranche cap v2** (`data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-c.json`): single arm `portfolio-18-tranche-v2`, same 18 techniques/order as `portfolio-18-flat-2m`/`portfolio-18-tranche-v1`. `work_budget=67000000`, `per_technique_work_cap=2000000` (harmless fallback — every key is covered by the map), `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`. Single-arm plan; `control_arm` is set to the arm itself only to satisfy the combiner's required-control-arm input (trivially 0 gained/0 lost by construction) — the comparison that matters is cross-dispatch against confirmation-001's dispatch A/B, not within this dispatch.
3. **Execution:** `static-portfolio-confirmation.yml`, `shards=15`, `workers=4` (matching confirmation-001's own shard count for this population size).

## Accept/reject framing

Not a strict promotion gate — a characterization, like confirmation-001. Report:
- Coverage (solved count) for `portfolio-18-tranche-v2` vs. `portfolio-18-flat-2m` and `portfolio-18-tranche-v1` on the identical population.
- Aggregate `work` and `solvedWorkStats` (min/median/mean/p75/p90/max — this session's own addition to `combine-static-portfolio-shards.mjs`).

## Stop condition

One dispatch at this population/envelope/cap-map version. If v2 also loses to the flat cap, that closes tail-percentile-derived cap sizing (at least at p75) as tested for this exact menu/envelope — a v3 attempt would need either a different percentile (e.g. p90) or a materially different allocation policy, not another scaling-constant tweak, and should not be dispatched reflexively.

## Reproduction

Dispatch: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-specialists-production-envelope-confirmation-002-c`, `population_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json`, `arms_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-c.json`, `control_arm=portfolio-18-tranche-v2`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`, `shards=15`, `workers=4`.

## Result

Run [`33707473373`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33707473373) completed in ~5 minutes with all 15 shards and the combine job succeeding (`Combined 15 shard file(s), 150 cells, 1 arms`). Recovered from the combine job's own console log (raw artifact blob storage remains blocked by this environment's egress policy, same as every prior report in this line):

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `portfolio-18-tranche-v2` | 150 | **62** | 5,725,486,940 |

`workSpent` among solved cells only:

| arm | solved | min | median | mean | p75 | p90 | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| `portfolio-18-tranche-v2` | 62 | 2,021 | 5,096,026.5 | 8,342,282 | 12,596,862 | 16,631,969 | 46,477,192 |

### Cross-dispatch comparison (same population, same 67,000,000 envelope, same 18-technique menu/order except `full-menu`)

| arm | solved / 150 | aggregate work |
|---|---:|---:|
| `full-menu` (34 techniques, confirmation-001 dispatch A) | 55 | 6,507,179,632 |
| `portfolio-18-flat-2m` (flat 2M cap, confirmation-001 dispatch A) | 54 | 3,490,712,525 |
| `portfolio-18-tranche-v1` (mean-scaled cap map, confirmation-001 dispatch B) | 49 | 7,221,532,626 |
| `portfolio-18-tranche-v2` (p75-scaled cap map, this dispatch) | **62** | 5,725,486,940 |

`portfolio-18-tranche-v2` beats every other treatment measured on this population: +8 over the flat cap, +13 over v1, and **+7 over the uncapped 34-technique full menu itself**, at less aggregate work than the full menu (5.73B vs. 6.51B). Exact per-level gain/loss identities are not extracted here (raw per-cell artifacts remain blob-blocked in this environment, same limitation every prior report in this line has documented); the aggregate result is unambiguous enough that attribution is not needed to see the direction and size of the effect.

### Decision

`portfolio-18-tranche-v2` is a genuine, large, clean win on this population — the first `static-portfolio` treatment in this research line to beat `full-menu`'s own coverage rather than trade a small coverage loss for work savings. This is real evidence that a well-grounded, uncensored per-technique cost distribution (isolated p75, not production's censored mean) makes tranche-weighted allocation work where the mean-scaled v1 attempt failed.

Per this program's own confirmation-strength norms — `portfolio-18-specialists`' own promotion took two independent fresh-population confirmations before being treated as validated — one population, however striking, is development-tier evidence for a candidate this consequential. **Does not yet replace `portfolio-18-flat-2m` as the validated treatment.** See `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-003-preflight.md` for the independent replication this result earns.
