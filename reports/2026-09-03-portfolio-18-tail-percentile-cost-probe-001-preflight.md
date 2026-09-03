# portfolio-18-specialists tail-percentile cost probe 001: preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — GHA run [`33706241144`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33706241144), complete, all 48 shards succeeded.
> **Decision:** all 18 techniques solved a usable number of cells (7-33/120 each — every technique cleared the "at least a handful of real solves" bar this probe's own stop condition required, unlike the admissible-order probe's thinnest cases). `data/stress/portfolio-18-tail-percentile-cost-probe-001-result.json` records the full per-arm `solvedWorkStats`. Built `data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` from each technique's own p75, uniformly scaled to the 67,000,000 envelope (same scaling method as v1, only the source statistic changes) — see Interpretation below for why this already looks structurally healthier than v1.
> **Remaining gate:** dispatch a v2 production-envelope confirmation on `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md`'s own population, comparing `portfolio-18-tranche-v2` against the already-recorded `portfolio-18-flat-2m` (54/150) and `portfolio-18-tranche-v1` (49/150) results.
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

Run [`33706241144`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33706241144) completed in ~11 minutes with all 48 shards and the combine job succeeding (`Combined 48 shard file(s), 2160 cells, 18 arms`). Recovered from the combine job's own console log (raw artifact blob storage remains blocked by this environment's egress policy, same as every prior report in this line):

| arm | cells | solved | solvedWork min | median | mean | p75 | p90 | max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `admissible-order-default` | 120 | 13 | 510 | 2,507,061 | 4,051,726 | 6,249,790 | 9,489,700 | 11,267,930 |
| `admissible-order-mustCrossFirst` | 120 | 13 | 510 | 2,505,255 | 3,933,818 | 6,226,188 | 8,894,198 | 11,288,692 |
| `admissible-order-none` | 120 | 14 | 2,936 | 45,346.5 | 3,993,363 | 5,035,829 | 6,658,702 | 18,581,089 |
| `beam-harvestThenFinish-w2000-plain` | 120 | 16 | 683,273 | 1,354,709 | 1,422,607 | 1,953,775 | 2,035,936 | 2,312,292 |
| `beam-intersectionHarvest-w2000-plain` | 120 | 14 | 735,551 | 1,174,454.5 | 1,376,691 | 1,862,277 | 2,119,876 | 2,282,270 |
| `beam-intersectionHarvest-w5000-buckets` | 120 | 33 | 949,760 | 3,756,202 | 3,636,593 | 4,766,353 | 5,348,904 | 7,280,773 |
| `beam-intersectionHarvest-w5000-plain` | 120 | 22 | 949,760 | 3,624,611.5 | 3,332,323 | 4,464,648 | 4,771,055 | 5,364,482 |
| `beam-mustCrossFirst-w2000-plain` | 120 | 20 | 516,280 | 1,383,410.5 | 1,449,551 | 1,943,827 | 2,217,371 | 2,781,823 |
| `beam-objectiveFirst-w2000-plain` | 120 | 17 | 606,051 | 1,364,473 | 1,423,261 | 2,028,238 | 2,086,931 | 2,338,658 |
| `beam-objectiveFirst-w5000-buckets` | 120 | 28 | 882,729 | 3,625,145.5 | 3,582,858 | 4,766,051 | 5,771,826 | 6,265,747 |
| `beam-objectiveFirst-w5000-plain` | 120 | 24 | 882,729 | 3,653,329.5 | 3,349,333 | 4,664,872 | 5,033,860 | 5,422,770 |
| `beam-perimeterCCW-w2000-plain` | 120 | 21 | 417,841 | 1,703,636 | 1,597,972 | 2,081,212 | 2,279,560 | 2,698,200 |
| `beam-perimeterCW-w2000-plain` | 120 | 20 | 447,862 | 1,864,680.5 | 1,627,101 | 2,115,916 | 2,440,373 | 2,703,287 |
| `dfs-perimeterCCW` | 120 | 12 | 116,596 | 2,336,141.5 | 4,110,582 | 4,497,574 | 5,919,822 | 18,378,893 |
| `dfs-portalFirstTransfer` | 120 | 8 | 686,860 | 2,792,582 | 4,604,304 | 4,463,514 | 8,170,570 | 14,130,398 |
| `dfs-sideCommitment` | 120 | 7 | 289,433 | 7,454,581 | 6,810,180 | 7,526,532 | 14,314,989 | 15,762,717 |
| `repair-mustTurnBiased` | 120 | 20 | 3,436 | 924,646.5 | 3,593,536 | 3,537,003 | 12,851,153 | 19,193,173 |
| `repair-standard` | 120 | 19 | 3,436 | 810,617 | 3,795,367 | 3,991,865 | 12,851,153 | 18,940,437 |

Full per-arm data (including aggregate censored-dominated `work`) is in `data/stress/portfolio-18-tail-percentile-cost-probe-001-result.json`. Every technique solved at least 7/120 cells — no technique came back too thin to use, unlike the earlier admissible-order probe's own sparsest cases.

### v2 cap map derivation

Following the same uniform-scaling method v1 used (scale every technique's chosen statistic by one constant so the worst-case cumulative sum, walked in the menu's own committed order, lands at exactly 67,000,000), but using **p75 of this probe's own isolated solvedWorkStats** instead of v1's raw production `meanAttemptWork`:

Raw p75 sum across all 18 techniques: 72,175,464 — much closer to the 67,000,000 envelope than v1's raw-mean sum (83,495,813), requiring only a mild 0.928x scale-down instead of v1's 0.802x. This is a direct consequence of using a consistent, uncensored, isolated measurement instead of production's `meanAttemptWork`, which mixes in partial/censored attempts under the current ladder's own allocation and runs measurably higher for the expensive families (e.g. `repair-standard`'s production mean was 11,331,032 vs. this probe's own isolated p75 of only 3,991,865; `admissible-order-default`'s production mean was 14,751,999 vs. an isolated p75 of 6,249,790).

| rank (menu order) | technique | p75 (raw) | scaled cap | cumulative worst-case |
|---:|---|---:|---:|---:|
| 1 | `repair\|score=repair\|guidance=standard` | 3,991,865 | 3,705,622 | 3,705,622 |
| 2 | `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` | 2,115,916 | 1,964,191 | 5,669,813 |
| 3 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | 4,766,353 | 4,424,574 | 10,094,387 |
| 4 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain` | 4,464,648 | 4,144,503 | 14,238,890 |
| 5 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain` | 4,664,872 | 4,330,369 | 18,569,259 |
| 6 | `beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain` | 2,081,212 | 1,931,975 | 20,501,234 |
| 7 | `admissible-order\|tieBreak=default\|lds=off` | 6,249,790 | 5,801,638 | 26,302,872 |
| 8 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets` | 4,766,051 | 4,424,293 | 30,727,165 |
| 9 | `repair\|score=repair\|guidance=must-turn-biased` | 3,537,003 | 3,283,376 | 34,010,541 |
| 10 | `admissible-order\|tieBreak=none\|lds=off` | 5,035,829 | 4,674,726 | 38,685,267 |
| 11 | `beam\|score=intersectionHarvest\|bias=none\|width=2000\|retention=plain` | 1,862,277 | 1,728,739 | 40,414,006 |
| 12 | `dfs\|score=portalFirstTransfer\|bias=none` | 4,463,514 | 4,143,450 | 44,557,456 |
| 13 | `beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain` | 2,028,238 | 1,882,800 | 46,440,256 |
| 14 | `dfs\|score=perimeterSweep\|bias=perimeterCCW` | 4,497,574 | 4,175,068 | 50,615,324 |
| 15 | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | 1,943,827 | 1,804,442 | 52,419,766 |
| 16 | `dfs\|score=perimeterSweep\|bias=sideCommitment` | 7,526,532 | 6,986,829 | 59,406,595 |
| 17 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | 6,226,188 | 5,779,729 | 65,186,324 |
| 18 | `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | 1,953,775 | 1,813,676 | 67,000,000 |

`data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` holds this map. Every technique's scaled cap keeps ~93% of its own raw p75 headroom (vs. v1's ~80% of raw mean), and — unlike v1 — every raw statistic feeding this map came from the exact same isolated, uncensored measurement method, so the relative weights reflect real differences in techniques' own cost distributions rather than an artifact of how censored each technique's production attempts happened to be.

### Interpretation

This does not yet establish that `portfolio-18-tranche-v2` beats the flat cap or v1 in a real fixed-envelope confirmation — that is the next dispatch (`portfolio-18-tranche-v2` confirmation, not yet run as of this writing). What this probe does establish: v1's failure mode (a few expensive early-menu techniques consuming a disproportionate envelope share, starving later positions) is structurally less likely to recur here, because (a) the source statistic no longer inherits production's censoring-driven inflation for expensive families, and (b) the milder 0.928x scale leaves more absolute headroom everywhere. Whether that translates into more solved levels than the flat cap is an empirical question for the confirmation dispatch, not something this probe alone can answer.
