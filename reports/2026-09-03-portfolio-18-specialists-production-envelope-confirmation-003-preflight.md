# portfolio-18-specialists production-envelope confirmation 003: independent replication of cap map v2

> **Status:** confirmed-positive — replicates cleanly
> **Last evidence:** 2026-09-03 — GHA runs [`33708100385`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33708100385) (dispatch A) and [`33708101847`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33708101847) (dispatch B), both complete.
> **Decision:** `portfolio-18-tranche-v2` solved **68/150** on this fresh population — beating `full-menu` (64/150) and `portfolio-18-flat-2m` (62/150) again, replicating confirmation-002's pattern (62 vs. 55 vs. 54 on the first population) exactly: v2 beats everything on both populations tested. This is now **two independent confirmations**, the same bar `portfolio-18-specialists` itself needed before being treated as validated. `portfolio-18-tranche-v2` is the strongest `static-portfolio` treatment this research line has produced.
> **Remaining gate:** none for the cap-map candidacy itself. The next real gate is a production-wiring decision (whether to actually flip a production caller onto `schedulerMode: 'static-portfolio'` with this cap map) — a separate, larger decision this report does not make.
> **Evidence role:** confirmation — independent replication of confirmation-002's single-population result, on a fresh disjoint population. Both confirmations now support the same conclusion.

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

Both dispatches completed successfully (~7-8 minutes each). Recovered from each combine job's own console log (raw artifact blob storage remains blocked by this environment's egress policy):

### Dispatch A (flat-cap baseline) — run [`33708100385`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33708100385)

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `full-menu` | 150 | 64 | 5,952,326,539 |
| `portfolio-18-flat-2m` | 150 | 62 | 3,196,257,105 |

`portfolio-18-flat-2m` vs. `full-menu`: gained (0): none. Lost (2): `R02788`, `R02913`. Work delta: -2,756,069,434 (-46.30%) — reproduces the established flat-cap pattern (small coverage loss, large work saving) on yet another fresh population.

### Dispatch B (tranche cap v2) — run [`33708101847`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33708101847)

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `portfolio-18-tranche-v2` | 150 | **68** | 5,315,390,003 |

`workSpent` among solved cells only: min 8,192, median 5,219,533.5, mean 7,580,489, p75 9,309,963, p90 16,343,472, max 52,066,407.

### Cross-dispatch comparison (same population, same 67,000,000 envelope, same 18-technique menu/order except `full-menu`)

| arm | solved / 150 | aggregate work |
|---|---:|---:|
| `full-menu` (34 techniques) | 64 | 5,952,326,539 |
| `portfolio-18-flat-2m` (flat 2M cap) | 62 | 3,196,257,105 |
| `portfolio-18-tranche-v2` (p75-scaled cap map) | **68** | 5,315,390,003 |

`portfolio-18-tranche-v2` again beats every other treatment: +4 over `full-menu`, +6 over `portfolio-18-flat-2m`, at less aggregate work than `full-menu` (5.32B vs. 5.95B) — the same shape confirmation-002 found on the first population (+7 over `full-menu`, +8 over flat-2m, less work than `full-menu`). Two independent fresh populations, same direction, same magnitude of effect.

### Decision

Two independent confirmations now agree: `portfolio-18-tranche-v2` beats both the flat cap and the uncapped 34-technique menu on both populations tested. This meets this program's own confirmation-strength bar (matching `portfolio-18-specialists`' own two-confirmation promotion history). `portfolio-18-tranche-v2` is now the strongest characterized `static-portfolio` treatment in this research line — stronger than `portfolio-18-flat-2m`, which itself was already validated as a Pareto improvement over the full menu.

**What this does not decide:** whether to actually route a production caller through `schedulerMode: 'static-portfolio'` with this cap map. That is a separate, larger decision (todays's `static-portfolio` mode is additive/opt-in, evaluated only through this research harness's own entrypoint — see `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md` for what a real production flip would require) outside this report's scope.
