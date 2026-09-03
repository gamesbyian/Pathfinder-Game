# portfolio-18-tranche-v2 cross-generator transfer 001: preflight

> **Status:** dispatched, awaiting result
> **Last evidence:** none yet — protocol written before dispatch per `docs/investigation-report-conventions.md`.
> **Decision:** pending.
> **Remaining gate:** run both dispatches; compare `portfolio-18-tranche-v2` against `full-menu` and `portfolio-18-flat-2m` on Corpus 1 — a genuinely different generator from every population this candidate has been tested on so far.
> **Evidence role:** cross-generator transfer/challenge — `docs/solver-scheduling-policy.md`'s promotion-path step 8 ("sample-independent confirmation and cross-distribution transfer/challenge evidence appropriate to the policy's selection pressure and claim scope"), not yet exercised for this candidate.

## Why this dispatch

`portfolio-18-tranche-v2` has now cleared several of `solver-scheduling-policy.md`'s promotion-path steps: two independent confirmations (both on Corpus 2, `stress-levels-random.json` — 1,700 uniform-random/solver-blind levels) found it beats both the flat cap and the uncapped 34-technique menu (62/150 and 68/150 respectively), and a production-entrypoint parity check confirmed the result would hold through the real `solveLevel()` entrypoint, not just the research harness. Every population used so far, though, has come from the same generator (Corpus 2's uniform-random construction) — per `docs/solver-evaluation-evidence.md`, confirmation on "the same random generator" is not cross-generator transfer, and a candidate this selected (a specific 18-technique menu, curated; a specific p75-derived cap map, tuned) earns proportionally more scrutiny before being treated as broadly validated.

Corpus 1 (`data/stress/stress-levels.json`, 102 hypothesis-driven/generated levels — a genuinely different construction method from Corpus 2's uniform-random generation, per `data/stress/README.md`'s own corpus map) has never been used by any dispatch in this research line, making it a clean, disjoint, differently-generated population for exactly this purpose.

## Protocol

1. **Population:** all 102 Corpus 1 levels (`data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json`) — the entire corpus, not a sample (small population, maximize power; nothing in this line has touched Corpus 1 before, so no exclusion is needed).
2. **Dispatch A — flat-cap/full-menu baseline** (`data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-a.json`): arms `full-menu` (34, control) and `portfolio-18-flat-2m` (18) — identical protocol to every prior confirmation, on Corpus 1.
3. **Dispatch B — tranche cap v2** (`data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-b.json`): single arm `portfolio-18-tranche-v2`, same menu/order, same `per_technique_work_cap_map`. Separate dispatch for the same structural reason every prior tranche-cap dispatch used two: the shared plan-level cap-map application would otherwise corrupt `full-menu`/`portfolio-18-flat-2m`'s own flat caps.
4. **Envelope:** `work_budget=67000000`, `per_technique_work_cap=2000000` — unchanged from every prior confirmation in this line, so results are directly comparable in currency (not just direction) to the Corpus-2 confirmations.
5. **Execution:** both via `static-portfolio-confirmation.yml`, `shards=5` (102 cells is far smaller than the 150-cell/15-shard confirmations; scaled down proportionally), `workers=4`.

## Accept/reject framing

Report coverage and `solvedWorkStats` for all three arms. Corpus 1's small size (102 levels, roughly a third of a Corpus-2 confirmation's population) means this is inherently lower-powered than the two Corpus-2 confirmations — a good outcome here strengthens the existing conclusion across generators; a poor one is real signal the candidate doesn't transfer, not dismissible as noise, but should be read alongside its own population size rather than granted the same weight as a same-generator confirmation.

## Stop condition

One dispatch pair at this population. This is a transfer check for an already-twice-confirmed candidate, not a new tuning loop — if `portfolio-18-tranche-v2` underperforms here, report the disagreement honestly (candidate may be Corpus-2-specific) rather than iterating on a v3 cap map to chase a win on this specific small population.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels.json --corpus-label=corpus1 \
  --sample=200 --seed=portfolio-18-tranche-v2-cross-generator-001 \
  --out=data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json
```
(sample size exceeds the population, so every level is included — 102/102.)

Dispatch A: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-tranche-v2-cross-generator-001-a`, `population_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json`, `arms_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-a.json`, `control_arm=full-menu`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `shards=5`, `workers=4`.

Dispatch B: same workflow, `cohort_id=portfolio-18-tranche-v2-cross-generator-001-b`, `arms_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-b.json`, `control_arm=portfolio-18-tranche-v2`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`, `shards=5`, `workers=4`.

## Result

_Pending — filled in once both GHA runs complete._
