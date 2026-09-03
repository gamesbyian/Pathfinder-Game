# portfolio-18-specialists production-envelope confirmation 001: tranche cap map vs. the flat research cap

> **Status:** active
> **Last evidence:** 2026-09-03 — dispatched via GHA: dispatch A run [`33703097166`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703097166), dispatch B run [`33703099051`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33703099051) (queued behind A — both dispatches share the workflow's own `static-portfolio-confirmation` concurrency group, so they run sequentially, not in parallel); results pending at prespecification time
> **Decision:** none yet; this is the prespecification, written before either dispatch runs.
> **Remaining gate:** both dispatches completing and being read back into this report's Result section.
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

_Pending — filled in once both dispatches complete._
