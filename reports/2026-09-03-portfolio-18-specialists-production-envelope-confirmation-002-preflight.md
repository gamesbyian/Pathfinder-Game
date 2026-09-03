# portfolio-18-specialists production-envelope confirmation 002: tail-percentile cap map v2

> **Status:** dispatched, awaiting result
> **Last evidence:** none yet — protocol written before dispatch per `docs/investigation-report-conventions.md`.
> **Decision:** pending.
> **Remaining gate:** run the dispatch; compare `portfolio-18-tranche-v2` against the already-recorded `portfolio-18-flat-2m` (54/150, confirmation-001 dispatch A) and `portfolio-18-tranche-v1` (49/150, confirmation-001 dispatch B) on the identical population/envelope/menu.
> **Evidence role:** confirmation — a single-variable comparison (cap-map version only; menu, order, population, and total envelope all held fixed against confirmation-001's two already-recorded arms).

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

_Pending — filled in once the GHA run completes._
