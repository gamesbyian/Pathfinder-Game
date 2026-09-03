# portfolio-18-specialists production-envelope confirmation 001: tranche cap map vs. the flat research cap

> **Status:** concluded-negative
> **Last evidence:** 2026-09-03 — dispatch A run [`33703097166`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703097166), dispatch B run [`33703099051`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703099051), both complete.
> **Decision:** cap-map v1 (uniformly-scaled raw production means) does not replace the flat 2,000,000-per-technique cap — it solves 5 fewer levels (49 vs. 54/150) at roughly double the median cost among solves, on the identical population/envelope/menu. `portfolio-18-flat-2m` remains the validated `static-portfolio` treatment.
> **Remaining gate:** none for this specific cap-map version. A v2 tail-percentile-derived cap map (see Interpretation) is a possible future direction, not a current gate.
> **Evidence role:** confirmation — a single-variable A/B (cap treatment only; menu, order, population, and total envelope all held fixed against the already-validated flat-cap baseline).

## Question

Every prior `static-portfolio-confirmation-00N` result measured `portfolio-18-specialists` under a flat `per_technique_work_cap=2,000,000` — deliberately generous and uniform, not evidence of real allocation. `docs/solver-optimization-workstreams.md`'s (b) note asks for a production-envelope confirmation using a *defensible* per-technique cap, not this flat one. `2026-09-03-portfolio-18-specialists-tranche-cap-map-derivation.md` built exactly that (`data/stress/portfolio-18-specialists-tranche-cap-map-v1.json`, derived from real production `meanAttemptWork` for 17 techniques plus this session's own cost-probe for the 18th, uniformly scaled to fit a 67,000,000 total envelope).

This confirmation isolates one question: **holding the menu (same 18 techniques, same order), the population, and the total work envelope (67,000,000) fixed, does switching from the flat 2,000,000 cap to the real-evidence-derived tranche cap map change coverage or aggregate work?**

## Why two dispatches, not one

`build-static-portfolio-plan.mjs` applies one `--work-budget`/`--per-technique-work-cap`/`--per-technique-work-cap-map` triple to every cell in a plan, regardless of arm — there is no per-arm cap override. Since both the flat-cap and tranche-cap treatments use the *same* 18 technique keys (by design — this is a same-menu cap-only A/B), they cannot coexist as two arms of one plan; the cap settings would apply identically to both and there would be nothing left to compare. Two dispatches sharing the same population is the correct shape for this specific comparison, not a workaround.

`static-portfolio-confirmation.yml` gained a `per_technique_work_cap_map` input this session (optional; a technique absent from it falls back to the flat cap) specifically so dispatch B below needs no new workflow.

## Protocol

1. **Population:** a fresh 150-level uniform random sample of Corpus 2 (`data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json`), seed `portfolio-18-specialists-production-envelope-confirmation-001`, `--exclude-ids-from` covering the union of every population this research line has drawn on so far (EW1's 60 + `confirmation-001/002/003`'s 450 + `admissible-order-profile-cost-probe-001`'s 80 — 590 unique ids total) — verified disjoint. The **same population** is used for both dispatches below.
2. **Dispatch A — flat-cap baseline** (`data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-a.json`): arms `full-menu` (34 techniques, control) and `portfolio-18-flat-2m` (the same 18-technique menu, same order, as every prior confirmation). `work_budget=67000000`, `per_technique_work_cap=2000000` (no map) — byte-identical protocol to `static-portfolio-confirmation-001/002/003`, just on a fresh population. This both gives a full-menu reference point and independently re-confirms the already-validated flat-cap `portfolio-18-specialists` result on data it has never been tested against.
3. **Dispatch B — tranche cap** (`data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-b.json`): single arm `portfolio-18-tranche-v1`, same 18 techniques/order as `portfolio-18-flat-2m`. `work_budget=67000000`, `per_technique_work_cap=2000000` (harmless fallback — every key is covered by the map below), `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v1.json`. Single-arm plan; `control_arm` is set to the arm itself only to satisfy the combiner's required-control-arm input (trivially 0 gained/0 lost by construction) — the comparison that matters is cross-dispatch (B's own coverage/work against A's `portfolio-18-flat-2m` row), not within dispatch B.
4. **Execution:** both via `static-portfolio-confirmation.yml`, `shards=15`, `workers=4` (matching prior confirmations' shard count for a 150-level population).

## Accept/reject framing

Not a strict promotion gate — a characterization, like `static-portfolio-confirmation-003`. Report:
- Coverage (solved count) for `portfolio-18-tranche-v1` vs. `portfolio-18-flat-2m` on the identical population — any loss is flagged and attributed (same local-reproduction method prior reports used, since raw artifacts remain blob-blocked); any gain is a genuine improvement from better-shaped allocation.
- Aggregate `work` for both, and each arm's own `solvedWorkStats` (min/median/mean/max among solved cells — the `combine-static-portfolio-shards.mjs` addition from earlier this session).
- Both against `full-menu` from dispatch A, for continuity with the existing evidence chain.

## Stop condition

One dispatch pair at this population/envelope/cap-map version. If the tranche map loses coverage, that closes cap-map v1 as tested and nominates either a different scaling approach or reverting to flat-2M for now — not an escalating series of hand-tuned cap-map versions chasing zero losses on this exact population.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=portfolio-18-specialists-production-envelope-confirmation-001 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 + cost-probe-001 populations, 590 ids> \
  --out=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json
```

Dispatch A: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-specialists-production-envelope-confirmation-001-a`, `population_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json`, `arms_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-a.json`, `control_arm=full-menu`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `shards=15`, `workers=4`.

Dispatch B: same workflow, `cohort_id=portfolio-18-specialists-production-envelope-confirmation-001-b`, `arms_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-001-arms-b.json`, `control_arm=portfolio-18-tranche-v1`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v1.json`, `shards=15`, `workers=4`.

## Result

### Dispatch A (flat-cap baseline) — run [`33703097166`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703097166), complete

Control arm `full-menu`. 150 cells per arm.

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `full-menu` | 150 | 55 | 6,507,179,632 |
| `portfolio-18-flat-2m` | 150 | 54 | 3,490,712,525 |

`workSpent` among solved cells only:

| arm | solved | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `full-menu` | 55 | 2,021 | 3,700,923 | 9,564,053 | 60,234,425 |
| `portfolio-18-flat-2m` | 54 | 2,021 | 3,648,269.5 | 8,066,175 | 32,268,586 |

`portfolio-18-flat-2m` vs. `full-menu`: gained (0): none. Lost (1): `R01080`. Work delta: −3,016,467,107 (−46.36%).

This reproduces the established pattern from `static-portfolio-confirmation-001/002/003` on a population neither has seen before: `portfolio-18-flat-2m` trades one solved level for a ~46% aggregate work reduction, with no gains. Confirms the flat-cap result is not an artifact of a particular population.

### Dispatch B (tranche cap) — run [`33703099051`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703099051), complete

Single arm `portfolio-18-tranche-v1` (trivial control-arm-is-itself, 0 gained/0 lost within-dispatch by construction — see Protocol). 150 cells, same population as dispatch A.

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `portfolio-18-tranche-v1` | 150 | 49 | 7,221,532,626 |

`workSpent` among solved cells only:

| arm | solved | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `portfolio-18-tranche-v1` | 49 | 2,021 | 7,944,033 | 10,157,764 | 41,409,691 |

### Cross-dispatch comparison (same population, same 67,000,000 envelope, same 18-technique menu/order)

| arm | solved / 150 | aggregate work | solved-cell median work | solved-cell mean work |
|---|---:|---:|---:|---:|
| `full-menu` (34 techniques, dispatch A) | 55 | 6,507,179,632 | 3,700,923 | 9,564,053 |
| `portfolio-18-flat-2m` (flat 2M cap, dispatch A) | 54 | 3,490,712,525 | 3,648,269.5 | 8,066,175 |
| `portfolio-18-tranche-v1` (tranche cap map v1, dispatch B) | **49** | 7,221,532,626 | **7,944,033** | 10,157,764 |

The tranche cap map is worse than the flat cap on every axis measured: 5 fewer levels solved (49 vs. 54, and 6 fewer than `full-menu`'s 55), roughly double the median/typical cost among the levels it does solve (7.94M vs. 3.65M), and higher aggregate work despite solving fewer cells. This is not a close call — the evidence-derived tranche sizing underperforms the deliberately-generous flat cap it was meant to improve on.

Per this report's own stop condition, this closes cap-map v1 as tested. Exact per-level gain/loss identities against `portfolio-18-flat-2m` are not extracted here (raw per-cell artifacts remain blob-blocked per this session's environment, and the aggregate result is unambiguous enough that the stop condition applies without that attribution work); a future attempt at evidence-derived per-technique caps should not reuse this scaling approach — see Interpretation below for the likely mechanism.

### Interpretation

The tranche cap map (`portfolio-18-specialists-tranche-cap-map-v1.json`) was built by uniformly scaling each technique's real production `meanAttemptWork` so the sum across all 18 techniques exactly fit the 67,000,000 envelope in committed menu order. That derivation optimizes for "the mean case fits," not for "solves that need more than the mean get enough room." Two of the largest tranche caps (`admissible-order|tieBreak=default|lds=off`: 11,837,526; `admissible-order|tieBreak=none|lds=off`: 12,009,959) sit early in menu order and consume a large fraction of the envelope on their own, leaving less room for later techniques than the flat 2,000,000-per-technique cap did uniformly — the flat cap's very uniformity, which looked naive going in, turns out to spread risk more evenly across the menu than a mean-derived tranche map does. A future iteration should size caps from the *tail* of each technique's cost distribution (e.g. a high percentile of `meanAttemptWork`, not the raw mean) if it wants to preserve headroom for above-average solves without reverting to a fully flat cap.

### Decision

Cap-map v1 does not replace the flat 2,000,000-per-technique cap. `portfolio-18-flat-2m` (the already-validated flat-cap treatment) remains the better-characterized `static-portfolio` treatment for `portfolio-18-specialists`. Workstream 2 item (b) is answered for this specific tranche-map design: a naive mean-scaled cap map is closed negative. It does not close the broader "can a non-flat cap map ever beat flat" question — see Interpretation's tail-percentile suggestion for what a v2 attempt would need to try differently, if this thread is resumed.
