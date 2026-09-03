# portfolio-18-specialists tail-percentile cost probe 001: preflight

> **Status:** dispatched, awaiting result
> **Last evidence:** none yet — this report is written before dispatch per this repo's own "write down the intended test before dispatch" convention (`docs/investigation-report-conventions.md`).
> **Decision:** pending.
> **Remaining gate:** run the probe; if it produces usable per-technique cost distributions, derive a v2 tail-percentile tranche cap map and dispatch the same production-envelope-confirmation shape `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md` already used, comparing v2 against both `portfolio-18-flat-2m` and cap-map v1.
> **Evidence role:** development — a characterization measurement (like `2026-09-03-admissible-order-profile-cost-probe-001-preflight.md`), not itself a comparative confirmation.

## Question

`2026-09-03-portfolio-18-specialists-tranche-cap-map-derivation.md` (cap-map v1) sized each `portfolio-18-specialists` technique's cap from its raw production `meanAttemptWork`, uniformly scaled to fit the 67,000,000 envelope. `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md` found that map strictly worse than the flat 2,000,000 cap on every axis (49 vs. 54/150 solved, ~2x median cost). Its own Interpretation section named the likely cause: mean-scaled caps front-load large shares on a few expensive-but-common techniques early in menu order, leaving too little room for later positions' above-average solves. It proposed sizing caps from **a high percentile of each technique's own cost distribution** instead of its mean, as the untried v2 direction — flagged as "a possible future direction, not a current gate," which `docs/solver-optimization-workstreams.md`'s current-priority section separately names as a legitimate example of the "materially new premise" needed to reopen this workstream.

This probe answers the prerequisite question: **what does each of the 18 `portfolio-18-specialists` techniques' own workSpent distribution look like among cells it solves, measured consistently and in isolation?**

## Why a new probe, not a reuse of existing data

Cap-map v1 mixed two incompatible quantities: 17 techniques' real production `meanAttemptWork` (the mean cost of every attempt under the *current ladder's own allocation*, win or lose — heavily conditioned by whatever partial budget each stage happened to give that attempt) and 1 technique's isolated cost-probe mean (uncensored, full-budget, single-technique). A percentile computed by mixing those sources would inherit the same apples-to-oranges problem the mean already had, only worse (production data as stored only exposes a mean, not a distribution to take a percentile of at all — confirmed directly: `reports/stress/capability-runs/33588487486/per-level-corpus{1,2}.json`'s per-level `workSpent` is each level's *total cumulative* work across every stage/retry the whole ladder tried before its winning technique succeeded, not that technique's own isolated cost, so quantiles computed from it would be systematically inflated by whatever ran first — checked and discarded before writing this preflight, not used anywhere below).

The only clean way to get a real, comparable percentile for all 18 techniques is the same tool `admissible-order-profile-cost-probe-001` already validated for 3 of them: an isolated single-technique arm per technique, same population, same envelope, so every technique's distribution is measured under identical conditions. This probe extends that exact method from 3 techniques to all 18, replacing cap-map v1's mixed-source sizing with one consistent measurement end to end.

## Tooling change made for this probe

`combine-static-portfolio-shards.mjs`'s `solvedWorkStats` previously reported only min/median/mean/max. Added `p75`/`p90` (same nearest-rank quantile convention as `analyze-technique-niches.mjs`'s `quantile`) so this probe's result is available directly from the combine job's own summary — the same reason `solvedWorkStats` itself was added for the admissible-order probe (raw per-cell shard artifacts remain blocked by this environment's blob-storage egress policy). Additive, tested (`scripts/combine-static-portfolio-shards-node-test.mjs`), no effect on any existing consumer.

## Protocol

1. **Population:** a fresh 120-level uniform random sample of Corpus 2 (`data/stress/portfolio-18-tail-percentile-cost-probe-001-population.json`), seed `portfolio-18-tail-percentile-cost-probe-001`, `--exclude-ids-from` covering the union of every population this research line has drawn on so far: EW1's 60-level pricing snapshot (`reports/stress/ew1/33156541827-pricing-snapshot.json`), `static-portfolio-confirmation-001/002/003`'s three 150-level populations, `admissible-order-profile-cost-probe-001`'s 80-level population, and `portfolio-18-specialists-production-envelope-confirmation-001`'s 150-level population — 740 unique excluded ids total, verified disjoint (0 overlap) against the new 120-level draw.
2. **Arms:** 18 single-technique arms (`data/stress/portfolio-18-tail-percentile-cost-probe-001-arms.json`), one per `portfolio-18-specialists` technique (verified byte-for-byte set-equal to `static-portfolio-confirmation-003-arms.json`'s `portfolio-18-specialists` list), each run in isolation — a cell's entire budget belongs to its one listed technique, same as the admissible-order probe.
3. **Envelope:** `work_budget=20,000,000` per cell (same as the admissible-order probe: double EW1's 10,000,000 cap, enough room for a technique that would naturally exhaust somewhat past EW1's ceiling to actually do so). `per_technique_work_cap=20,000,000` (deliberate no-op for a single-technique arm, same reasoning as the admissible-order probe: `technique-census-cell.mjs`'s `perTechniqueWorkCap` narrows every technique's own share unconditionally when finite, so leaving the workflow's own default of 2,000,000 would have silently re-imposed EW1-ish scale).
4. **Execution:** GHA, `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-tail-percentile-cost-probe-001`, `shards=48`, `workers=4`. 2,160 cells (120 levels × 18 arms) — 9x the admissible-order probe's 240 cells, so shard count is scaled up proportionally (48 vs. 10) to keep per-shard cell count (45) close to that probe's (24) rather than letting wall time grow with cell count at a fixed shard count. `control_arm` is nominal only (the workflow requires naming one), set to `repair-standard`; the comparison that matters is each arm's own `solvedWorkStats`, not the pairwise gained/lost columns, exactly as the admissible-order probe used its own nominal control arm.

## What this probe answers and does not answer

**Answers:** for each of the 18 techniques, among the levels it solves within an isolated 20,000,000-work shot, the real shape of `workSpent` (min/median/mean/p75/p90/max) — comparable across all 18 for the first time, since today's mix is 17 different-conditions production means plus 1 isolated-probe mean.

**Does not answer:** whether a v2 cap map built from this data actually beats the flat cap or cap-map v1 in a real fixed-envelope confirmation — that is a separate, subsequent dispatch (same shape as `production-envelope-confirmation-001`), prespecified only after this probe's result is in hand, not before. Also does not re-litigate whether `portfolio-18-specialists` itself is the right 18-technique menu; that composition is already validated evidence this probe takes as given.

Some of these 18 techniques (the cheap, common beams) will likely solve a large fraction of the 120-level population; others (the three admissible-order profiles, already measured once at 80 levels) may solve only a handful. A technique that comes back with 0-1 solves at this population size is a legitimate under-powered result for that technique specifically — per this program's own evidence-precision convention, that technique's v2 cap should fall back to its existing production/cost-probe-derived value (or the flat cap) rather than force a percentile from too few points.

## Stop condition

One dispatch at this population/envelope. If the resulting distributions are unusable (e.g. most techniques come back with fewer real solves than cap-map v1's own signal already had), that closes this specific measurement approach as under-powered at 120 levels — a materially larger population would be its own separately-justified follow-up, not an automatic re-dispatch.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=120 --seed=portfolio-18-tail-percentile-cost-probe-001 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 + admissible-order-profile-cost-probe-001 + portfolio-18-specialists-production-envelope-confirmation-001 populations, 740 ids> \
  --out=data/stress/portfolio-18-tail-percentile-cost-probe-001-population.json
```

Workflow dispatch: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-tail-percentile-cost-probe-001`, `population_file=data/stress/portfolio-18-tail-percentile-cost-probe-001-population.json`, `arms_file=data/stress/portfolio-18-tail-percentile-cost-probe-001-arms.json`, `control_arm=repair-standard` (nominal only — see Protocol), `work_budget=20000000`, `per_technique_work_cap=20000000` (deliberate no-op — see Protocol), `budget_ms=600000`, `shards=48`, `workers=4`.

## Result

_Pending — filled in once the GHA run completes._
