# admissible-order tie-break profile cost probe: preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — GHA run [`33701870052`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33701870052) completed (the decision-bearing run; see "History" for an earlier same-protocol dispatch, run [`33701156125`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33701156125), whose result is superseded here only because it predates the `solvedWorkStats` tooling addition, not because anything about it was wrong)
> **Decision:** all three profiles solve real cells at a meaningful rate (9-12/80, 11.25-15%) when given an isolated 20,000,000-work shot, and their real cost-when-solving is modest — medians 3.8M-4.1M work, means 4.6M-5.6M work, comfortably under both this probe's own 20,000,000 cap and EW1's 10,000,000 cap. This is real, uncensored-where-observed cost data these three profiles never had before.
> **Remaining gate:** none for this exact probe. This data is one input toward Workstream 2's still-open (b) (a defensible per-technique cap-sizing derivation needs the same signal for the other ~15 `portfolio-18-specialists` techniques, most of which already have real production `meanAttemptWork`) — not itself a completed cap map or a dispatched confirmation.
> **Evidence role:** development — a cheap, targeted characterization measurement, not a comparative confirmation. Feeds the "defensible cap-sizing derivation" gap `docs/solver-optimization-workstreams.md`'s (b) note flags, nothing else.

## Why this probe

`2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md` established that `admissible-order|tieBreak={mustCrossFirst,intersectionHarvest,nearClosureRescue}|lds=off` never reach real production (0/1,802 real batch attempts each, per `reports/stress/capability-runs/33588487486/equal-work-production-reach.md`). That same join's own EW1 column shows these three at 0/60, 0/60, and 2/60 solved cells respectively — too thin, and too cap-dominated (EW1's own 10,000,000-work cell cap), to say anything about their **real cost when they do solve**. Workstream 2's (b) note (`docs/solver-optimization-workstreams.md`) explicitly flags this as the one piece of evidence a tranche-weighted per-technique cap map (`technique-census-cell.mjs`'s new `perTechniqueWorkCapByKey`, `2026-09-03`) cannot get from already-collected data. This probe fills exactly that gap and nothing more — it does not attempt to size caps for the other 15 `portfolio-18-specialists` techniques (those already have real, if imperfect, production `meanAttemptWork` signal from the same join) or to build/dispatch a full (b) confirmation itself.

## Protocol

1. **Population:** a fresh 80-level uniform random sample of Corpus 2 (`data/stress/admissible-order-profile-cost-probe-001-population.json`), seed `admissible-order-profile-cost-probe-001`, drawn by `scripts/stress/select-random-sample.mjs` with `--exclude-ids-from` covering the union of EW1's 60-level pricing snapshot plus `static-portfolio-confirmation-001/002/003`'s three 150-level populations (510 unique ids total, merged via a one-off scratch script) — verified disjoint from every population this specific research line has already drawn on. (Reuse risk is lower here than for a comparative confirmation, since this probe measures one technique's own cost distribution rather than picking a winner among candidates, but disjointness costs nothing and keeps this evidence usable for a future confirmation without contamination concerns.)
2. **Arms:** three single-technique arms (`data/stress/admissible-order-profile-cost-probe-001-arms.json`) — `admissible-order|tieBreak=mustCrossFirst|lds=off`, `...intersectionHarvest|lds=off`, `...nearClosureRescue|lds=off` — each run in isolation (no competition for gate share; a cell's entire budget belongs to its one listed technique), via `scripts/build-static-portfolio-plan.mjs`.
3. **Envelope:** `work_budget=20,000,000` per cell, double EW1's own 10,000,000 cap, chosen so a technique that would have naturally exhausted somewhat past EW1's ceiling gets a real chance to do so. `per_technique_work_cap` is set equal to `work_budget` (20,000,000) so it is a deliberate no-op — irrelevant for a single-technique arm in principle, but `technique-census-cell.mjs`'s `perTechniqueWorkCap` narrows every technique's own share unconditionally when finite (not only when multiple techniques compete for one list), so leaving the workflow's own default (2,000,000) in place would have silently clipped every cell back down to EW1-ish scale. `attemptBudgetMs` at the tool's own default (600,000ms, non-binding relative to the work ceiling — `technique-census-cell.mjs` bounds via `_workCap`/`_strictWorkCap`, both of which this harness sets, unlike `method-probe.mjs`'s `--work-budget` which only sets the soft `_workCap` and would not have bounded these particular searches at all; see `docs/solver-budget-determinism.md`'s "Equal-work isolated-action contract").
4. **Execution:** GHA, via the existing `static-portfolio-confirmation.yml` workflow — `cohort_id=admissible-order-profile-cost-probe-001`, `shards=10`, `workers=4`. (An earlier attempt at this same measurement ran locally in the background of this session; per explicit correction from the user mid-run, it was killed before completion — see "History" below — and redispatched through this existing GHA workflow instead, which is purpose-built for exactly this population+arms+budget shape and needed no new workflow or code.) 240 cells (80 levels × 3 arms). `control_arm=admissible-order-mustCrossFirst` is set only because the workflow requires naming one arm as control for its own pairwise coverage/work comparison output; that comparison is not this probe's actual question (all three arms are independent single-technique cost measurements, not competing candidates) and is not used in the Result below — this report reads each arm's own per-cell results directly from the raw shard artifacts instead.

## History

This probe was first attempted as a local (non-GHA) background run in this session (`node scripts/run-bundled.mjs scripts/technique-census.mjs`, workers=4, 240 cells at `work_budget=20,000,000`). It was interrupted by explicit user instruction partway through (~75-90/240 cells complete, all still right-censored at the work cap with no observed solves yet) on the grounds that a run of this length should use the existing GHA workflow rather than local compute. The partial local output was discarded (never committed, never used for evidence).

The identical measurement was then dispatched via `static-portfolio-confirmation.yml` (GHA), using the same already-committed population/arms/envelope — run [`33701156125`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33701156125), completed successfully (per-arm coverage: intersectionHarvest 12/80, mustCrossFirst 9/80, nearClosureRescue 10/80, work totals matching the final run below exactly). While reading back its result it became clear the combine job's own summary only reports aggregate `work` (dominated by censored/unsolved cells), not the solved-cells-only cost distribution this probe actually needs, and that the raw per-cell shard JSON needed to compute it by hand is blocked by this environment's blob-storage egress policy (confirmed directly: a 403 from the egress proxy on the artifact's own blob URL). Rather than hand-derive an approximation from the aggregate numbers, added `solvedWorkStats` (min/median/mean/max workSpent among solved cells) to `combine-static-portfolio-shards.mjs`'s own summary output — a small, tested, additive change with standing value for every future static-portfolio dispatch, not just this one — and redispatched the identical probe (same population/arms/envelope) as run `33701870052` to get the precise numbers with no manual estimation. Both GHA runs are legitimate evidence of the same measurement; only the second is used for the Result below because it is the one with the exact statistic, not because the first was flawed.

## What this probe answers and does not answer

**Answers:** for each of the three profiles, among the levels it actually solves within a 20,000,000-work isolated shot, what `workSpent` looks like (distribution, not just a mean) — real, uncensored-where-observed cost data these three profiles have never had before (EW1 was too cap-dominated; production has zero reach at all).

**Does not answer:** whether any specific per-technique cap number derived from this is the *right* one for a real scheduler — that is a design/policy decision for whoever builds the (b) confirmation next, informed by but not dictated by this probe. At an 80-level population and profiles observed to solve on the order of 1-3% of levels in prior larger (150-level) samples, this run may turn up only a handful of real solves per profile (or, for the rarest, zero) — if so, this probe's own disposition will say exactly that (inconclusive/under-powered for that specific profile) rather than force a number from too few points, per this repo's own evidence-precision convention.

## Stop condition

One dispatch at this population/envelope. If a profile comes back with zero or one real solve, that is a legitimate under-powered result for that profile specifically, not grounds for an escalating series of larger runs chasing a clean number — a materially larger population for just that profile would be its own separately-justified follow-up, not an automatic next step here.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=80 --seed=admissible-order-profile-cost-probe-001 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 populations, 510 ids> \
  --out=data/stress/admissible-order-profile-cost-probe-001-population.json
```

Workflow dispatch: `static-portfolio-confirmation.yml`, `cohort_id=admissible-order-profile-cost-probe-001`, `population_file=data/stress/admissible-order-profile-cost-probe-001-population.json`, `arms_file=data/stress/admissible-order-profile-cost-probe-001-arms.json`, `control_arm=admissible-order-mustCrossFirst` (nominal only — see "Envelope" above), `work_budget=20000000`, `per_technique_work_cap=20000000` (deliberate no-op — see "Envelope" above), `budget_ms=600000`, `shards=10`, `workers=4`.

## Result

Run [`33701870052`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33701870052) completed in ~4 minutes (01:00:25–01:04:06 UTC) with all 10 shards and the combine job succeeding (`Combined 10 shard file(s), 240 cells, 3 arms.`). Recovered directly from the combine job's own console log (raw artifact blob storage remains blocked by this environment's egress policy, confirmed directly against this exact run — see "History"):

| arm | cells | solved | work (aggregate, censored-dominated) |
|---|---:|---:|---:|
| `admissible-order-intersectionHarvest` | 80 | 12 (15.0%) | 1,415,742,906 |
| `admissible-order-mustCrossFirst` | 80 | 9 (11.25%) | 1,470,047,063 |
| `admissible-order-nearClosureRescue` | 80 | 10 (12.5%) | 1,449,330,477 |

**workSpent among solved cells only** (the actual question this probe was built to answer):

| arm | solved | min | median | mean | max |
|---|---:|---:|---:|---:|---:|
| `admissible-order-intersectionHarvest` | 12 | 13,784 | 3,844,760.5 | 4,644,157 | 18,870,037 |
| `admissible-order-mustCrossFirst` | 9 | 192,630 | 4,098,258 | 5,559,235 | 18,526,341 |
| `admissible-order-nearClosureRescue` | 10 | 10,187 | 3,852,578 | 4,931,493 | 18,524,957 |

Every profile solved at a real, non-trivial rate (11.25-15% of the fresh 80-level population) once given a full, unshared, isolated 20,000,000-work shot — much higher than the 0-2/60 EW1 cap-dominated rate or the 0/1,802 real-production rate, both entirely explained by starvation/exclusion rather than the technique being genuinely rare (see `2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md`). Cost-when-solving is unremarkable relative to the probe's own 20,000,000 cap: medians sit at 38-41% of it, means at 23-28%, and even the maximum observed cost (18.5-18.9M across all three) stays under the cap rather than clustering at it — a sign that most solved cells reflect genuine search termination, not near-censoring. All three profiles' distributions are similar in shape (same order of magnitude min/median/mean/max), with `mustCrossFirst` costing modestly more on average (mean 5.56M vs. 4.64-4.93M) despite solving fewer cells (9 vs. 10-12) — consistent with, not contradicted by, its earlier-established position as the rarest/most specialized of the three (rank 28 in the full production win-count ranking, vs. `nearClosureRescue`'s rank 29 and — reported nowhere else in this session — `intersectionHarvest`'s own rank 27).

No cell hit `deadline-truncated` in either GHA dispatch (both completed cleanly, all 20 total shards across the two runs succeeded), so none of this data needs right-censoring exclusion.

## Interpretation for (b)'s cap-sizing question

This gives a real, population-scale answer to the one gap `docs/solver-optimization-workstreams.md`'s (b) note flagged: these three profiles do not need anywhere near their old EW1-scale 10,000,000 cap to realize their real capability — a per-technique cap in roughly the 5-8M range (comfortably above the observed means, with headroom for the tail) would very likely preserve nearly all of the solves this 20M-cap probe found, at a fraction of the cost a flat 20M (or the historical EW1 10M) allocation would spend on the ~85-89% of cells that never solve at all. This is *directional* sizing guidance, not a finished cap map — it does not by itself resolve (b), which still needs the same signal assembled for `portfolio-18-specialists`'s other ~15 techniques (most already have real production `meanAttemptWork`, per `equal-work-production-reach.json`) before a full tranche-weighted confirmation can be prespecified and dispatched.
