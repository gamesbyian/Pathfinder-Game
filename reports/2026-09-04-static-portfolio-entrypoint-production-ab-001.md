# static-portfolio vs production ladder: a real matched-work A/B through the production entrypoint

> **Status:** active
> **Last evidence:** 2026-09-04 — dispatch in progress (local, `--workers=4`)
> **Decision:** pending
> **Remaining gate:** both arms finish on the full 40-level population
> **Evidence role:** confirmation
> **Selection:** prespecified — treatment, control, population-draw rule, and accept/reject framing were all fixed before either arm was dispatched or inspected

## Question

`docs/solver-optimization-workstreams.md`'s Immediate execution priority states, as of 2026-09-03: "The next real gate is a production-wiring decision (whether to flip a production caller onto
`static-portfolio` mode with this cap map), not another cap-sizing, entrypoint-verification, or transfer-check iteration." Every prior `static-portfolio-confirmation-00N`/`portfolio-18-*`
result compared `static-portfolio` treatments only against each other or against a flat sequential `full-menu` arm, both measured through `technique-census-cell.mjs`'s research harness — never
against the real default production scheduler (`solveLevel()`'s ordinary stage/reserve-based ladder, `schedulerMode: 'production'`) through the real entrypoint. `2026-09-03-static-portfolio-
entrypoint-parity-check.md` proved the entrypoint reproduces the harness exactly (15/15), and this session wired `schedulerMode: 'static-portfolio'` into `scripts/portfolio-solve-sweep.mjs` (a
real batch-solving tool, not a one-off script) so this comparison is finally possible directly. This is the smallest value-of-information pilot for that missing question: at equal work, through
the same tool and the same entrypoint, does `portfolio-18-tranche-v2` (the strongest characterized `static-portfolio` treatment, two independent confirmations) beat, match, or lose to today's
real production ladder?

## Protocol (fixed before dispatch)

1. **Treatment:** `schedulerMode: 'static-portfolio'`, arm `portfolio-18-specialists` from `data/stress/static-portfolio-confirmation-003-arms.json` (18 ordered technique keys), `workBudget:
   67,000,000`, `perTechniqueWorkCap: 2,000,000` flat fallback, `perTechniqueWorkCapByKey` = `data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` (the confirmed `portfolio-18-tranche-
   v2` cap map).
2. **Control:** `schedulerMode: 'production'` (today's real default ladder — every additive tier, reserves, admissible-order-fallback, repair-fallback, etc.), `workBudget: 67,000,000` (same
   envelope as the treatment; `disableExtraBudgetPasses` NOT set, matching this whole research line's own "offline/batch" scoping — see `2026-09-03-fixed-cap-portfolio-scheduler-implementation-
   design.md`'s "Scoping" section — not the interactive-UI configuration).
3. **Code/ref identity:** current HEAD at dispatch time, commit `1b7353955cf67df93cd35a8083546adfc670ad94` plus this session's uncommitted-then-committed `portfolio-solve-sweep.mjs` static-
   portfolio CLI wiring (`eddbde1c`) — the wiring is additive/zero-effect-on-default per its own commit message and is independently unit/node-tested; it does not touch `orchestration.ts`'s
   production ladder at all.
4. **Population:** a fresh 40-level uniform random sample of Corpus 2 (`data/stress/static-portfolio-entrypoint-production-ab-001-population.json`), seed
   `static-portfolio-entrypoint-production-ab-001`, `--exclude-ids-from` the union of every corpus-2 population this research line has drawn on so far (EW1's 60-level pricing snapshot,
   `static-portfolio-confirmation-001/002/003`'s three 150-level populations, `admissible-order-profile-cost-probe-001`'s 80, `portfolio-18-specialists-production-envelope-confirmation-001`'s
   150, `portfolio-18-specialists-production-envelope-confirmation-003`'s 150, `portfolio-18-tail-percentile-cost-probe-001`'s 120 — 1,010 unique ids total), verified disjoint (0 overlap).
   Sized smaller than the standard 150-level confirmation scale because this run is local (4 cores, not GHA's ~60-way shard parallelism); see "Stop condition" below for what would justify a
   larger follow-up.
5. **Dispatch:** two independent `portfolio-solve-sweep.mjs` runs against the same 40-level id list, `--workers=4` each, both artifact-only (no `--save-hints`, no commit to baselines/heatmaps).
6. **Primary outcome:** solved count (of 40) per arm, gained/lost ids (production solves but static-portfolio doesn't, and vice versa), aggregate `workSpent`, per-arm winning-technique
   distribution for static-portfolio's solves.
7. **Accept/reject framing:** this is real-data evidence for the production-wiring decision, not the decision itself — even a clean win only nominates `static-portfolio` as viable for a specific
   offline/batch caller; actually flipping a caller's default is a separate, later decision per `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md`. Report both directions
   honestly: a static-portfolio loss on this population is real (if small-sample) evidence that the flat-menu policy does not simply dominate the ladder's own adaptive/reserve machinery, not a
   reason to retune the cap map from this one population's outcome.
8. **Stop condition:** one 40-level local pilot settles whether there is a large, obvious effect in either direction. Do not chase population size locally; if the result is close, directionally
   interesting, or motivates an actual caller flip, the next step is a GHA-scale confirmation (150 levels, matching this line's own established confirmation size) — a separate, explicitly gated
   follow-up, not an automatic escalation from this report.

## Reproduction

```
node scripts/run-bundled.mjs scripts/stress/select-random-sample.mjs -- \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=40 --seed=static-portfolio-entrypoint-production-ab-001 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 + admissible-order-profile-cost-probe-001 +
    portfolio-18-specialists-production-envelope-confirmation-001/003 + portfolio-18-tail-percentile-cost-probe-001 populations, 1,010 ids> \
  --out=data/stress/static-portfolio-entrypoint-production-ab-001-population.json

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<the 40 positions above> \
  --scheduler-mode=production --work-budget=67000000 --workers=4 \
  --out=reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<the 40 positions above> \
  --scheduler-mode=static-portfolio \
  --static-portfolio-arms=data/stress/static-portfolio-confirmation-003-arms.json \
  --static-portfolio-arm=portfolio-18-specialists --work-budget=67000000 \
  --per-technique-work-cap=2000000 \
  --per-technique-work-cap-map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json \
  --workers=4 \
  --out=reports/portfolio/static-portfolio-entrypoint-production-ab-001/static-portfolio-arm.json
```

## Result

_Pending — both dispatches were still running when this report was drafted. Filled in once both arms complete._

## Decision

_Pending._
