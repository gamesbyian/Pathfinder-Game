# portfolio-18-specialists production-envelope confirmation 003: independent replication of cap map v2

> **Status:** dispatched, awaiting result
> **Last evidence:** none yet — protocol written before dispatch per `docs/investigation-report-conventions.md`.
> **Decision:** pending.
> **Remaining gate:** run both dispatches; compare `portfolio-18-tranche-v2` against `full-menu` and `portfolio-18-flat-2m` on a population none of the three has ever been tested against.
> **Evidence role:** confirmation — independent replication of confirmation-002's single-population result, on a fresh disjoint population.

## Question

`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-002-preflight.md` found `portfolio-18-tranche-v2` (a p75-derived tranche cap map, see `2026-09-03-portfolio-18-tail-percentile-cost-probe-001-preflight.md`) solving 62/150 on confirmation-001's population — beating `portfolio-18-flat-2m` (54), `portfolio-18-tranche-v1` (49), and even the uncapped 34-technique `full-menu` (55) itself, at less aggregate work than `full-menu`. This is the first `static-portfolio` treatment in this research line to beat `full-menu`'s own coverage. Per this program's confirmation-strength norms (`portfolio-18-specialists`' own promotion took two independent fresh-population confirmations), one population is development-tier evidence for a result this consequential — this dispatch is the independent replication.

## Why two dispatches, not one

Same structural reason as confirmation-001: `build-static-portfolio-plan.mjs` applies one `--per-technique-work-cap-map` to every cell in a plan regardless of arm. `full-menu` and `portfolio-18-flat-2m` both contain technique keys that are also in `portfolio-18-tranche-cap-map-v2.json`; if the v2 map were applied to a plan containing those arms too, it would silently replace their flat 2,000,000 cap with v2's per-technique caps for those 18 techniques, corrupting both control arms' own meaning. Two dispatches sharing the same population keeps the map scoped to only the arm it's meant for.

## Protocol

1. **Population:** a fresh 150-level uniform random sample of Corpus 2 (`data/stress/portfolio-18-specialists-production-envelope-confirmation-003-population.json`), seed `portfolio-18-specialists-production-envelope-confirmation-003`, `--exclude-ids-from` covering the union of every population this research line has drawn on so far (EW1's 60 + `confirmation-001/002/003`'s (the `static-portfolio-confirmation-*` line) 450 + `admissible-order-profile-cost-probe-001`'s 80 + `portfolio-18-specialists-production-envelope-confirmation-001`'s 150 + `portfolio-18-tail-percentile-cost-probe-001`'s 120 — 860 unique ids total), verified disjoint (0 overlap).
2. **Dispatch A — flat-cap/full-menu baseline** (`data/stress/portfolio-18-specialists-production-envelope-confirmation-003-arms-a.json`): arms `full-menu` (34, control) and `portfolio-18-flat-2m` (18). `work_budget=67000000`, `per_technique_work_cap=2000000`, no map — identical protocol to confirmation-001 dispatch A, on the new population.
3. **Dispatch B — tranche cap v2** (`data/stress/portfolio-18-specialists-production-envelope-confirmation-003-arms-b.json`): single arm `portfolio-18-tranche-v2`, same 18 techniques/order. `work_budget=67000000`, `per_technique_work_cap=2000000` (harmless fallback), `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`. `control_arm` set to the arm itself only to satisfy the combiner's required input.
4. **Execution:** both via `static-portfolio-confirmation.yml`, `shards=15`, `workers=4`.

## Accept/reject framing

Report coverage and `solvedWorkStats` for all three arms on the identical fresh population. If `portfolio-18-tranche-v2` again beats `full-menu` and `portfolio-18-flat-2m`, that is two independent confirmations — enough to nominate it as the new candidate default `static-portfolio` treatment (still short of an actual production-caller flip, which needs its own separate decision). If it loses to either on this population, report both results honestly: a single win is still real evidence of a positive effect, just not yet a stable one.

## Stop condition

Two independent confirmations (this plus confirmation-002) settle whether v2 is a stable improvement. Do not chase a third population reflexively regardless of outcome; if results disagree, name the disagreement and decide the next step from the specific pattern rather than an escalating series.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=portfolio-18-specialists-production-envelope-confirmation-003 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 + admissible-order-profile-cost-probe-001 + portfolio-18-specialists-production-envelope-confirmation-001 + portfolio-18-tail-percentile-cost-probe-001 populations, 860 ids> \
  --out=data/stress/portfolio-18-specialists-production-envelope-confirmation-003-population.json
```

Dispatch A: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-specialists-production-envelope-confirmation-003-a`, `population_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-003-population.json`, `arms_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-003-arms-a.json`, `control_arm=full-menu`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `shards=15`, `workers=4`.

Dispatch B: same workflow, `cohort_id=portfolio-18-specialists-production-envelope-confirmation-003-b`, `arms_file=data/stress/portfolio-18-specialists-production-envelope-confirmation-003-arms-b.json`, `control_arm=portfolio-18-tranche-v2`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`, `shards=15`, `workers=4`.

## Result

_Pending — filled in once both GHA runs complete._
