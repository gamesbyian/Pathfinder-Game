# admissible-order tie-break profile cost probe: preflight

> **Status:** active
> **Last evidence:** 2026-09-03 — dispatched via GHA (`static-portfolio-confirmation.yml`, run [`33701156125`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33701156125)), in progress at prespecification time
> **Decision:** none yet; this is the prespecification, written before results land.
> **Remaining gate:** run `33701156125` completing and being read back into this report's Result section.
> **Evidence role:** development — a cheap, targeted characterization measurement, not a comparative confirmation. Feeds the "defensible cap-sizing derivation" gap `docs/solver-optimization-workstreams.md`'s (b) note flags, nothing else.

## Why this probe

`2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md` established that `admissible-order|tieBreak={mustCrossFirst,intersectionHarvest,nearClosureRescue}|lds=off` never reach real production (0/1,802 real batch attempts each, per `reports/stress/capability-runs/33588487486/equal-work-production-reach.md`). That same join's own EW1 column shows these three at 0/60, 0/60, and 2/60 solved cells respectively — too thin, and too cap-dominated (EW1's own 10,000,000-work cell cap), to say anything about their **real cost when they do solve**. Workstream 2's (b) note (`docs/solver-optimization-workstreams.md`) explicitly flags this as the one piece of evidence a tranche-weighted per-technique cap map (`technique-census-cell.mjs`'s new `perTechniqueWorkCapByKey`, `2026-09-03`) cannot get from already-collected data. This probe fills exactly that gap and nothing more — it does not attempt to size caps for the other 15 `portfolio-18-specialists` techniques (those already have real, if imperfect, production `meanAttemptWork` signal from the same join) or to build/dispatch a full (b) confirmation itself.

## Protocol

1. **Population:** a fresh 80-level uniform random sample of Corpus 2 (`data/stress/admissible-order-profile-cost-probe-001-population.json`), seed `admissible-order-profile-cost-probe-001`, drawn by `scripts/stress/select-random-sample.mjs` with `--exclude-ids-from` covering the union of EW1's 60-level pricing snapshot plus `static-portfolio-confirmation-001/002/003`'s three 150-level populations (510 unique ids total, merged via a one-off scratch script) — verified disjoint from every population this specific research line has already drawn on. (Reuse risk is lower here than for a comparative confirmation, since this probe measures one technique's own cost distribution rather than picking a winner among candidates, but disjointness costs nothing and keeps this evidence usable for a future confirmation without contamination concerns.)
2. **Arms:** three single-technique arms (`data/stress/admissible-order-profile-cost-probe-001-arms.json`) — `admissible-order|tieBreak=mustCrossFirst|lds=off`, `...intersectionHarvest|lds=off`, `...nearClosureRescue|lds=off` — each run in isolation (no competition for gate share; a cell's entire budget belongs to its one listed technique), via `scripts/build-static-portfolio-plan.mjs`.
3. **Envelope:** `work_budget=20,000,000` per cell, double EW1's own 10,000,000 cap, chosen so a technique that would have naturally exhausted somewhat past EW1's ceiling gets a real chance to do so. `per_technique_work_cap` is set equal to `work_budget` (20,000,000) so it is a deliberate no-op — irrelevant for a single-technique arm in principle, but `technique-census-cell.mjs`'s `perTechniqueWorkCap` narrows every technique's own share unconditionally when finite (not only when multiple techniques compete for one list), so leaving the workflow's own default (2,000,000) in place would have silently clipped every cell back down to EW1-ish scale. `attemptBudgetMs` at the tool's own default (600,000ms, non-binding relative to the work ceiling — `technique-census-cell.mjs` bounds via `_workCap`/`_strictWorkCap`, both of which this harness sets, unlike `method-probe.mjs`'s `--work-budget` which only sets the soft `_workCap` and would not have bounded these particular searches at all; see `docs/solver-budget-determinism.md`'s "Equal-work isolated-action contract").
4. **Execution:** GHA, via the existing `static-portfolio-confirmation.yml` workflow — `cohort_id=admissible-order-profile-cost-probe-001`, `shards=10`, `workers=4`. (An earlier attempt at this same measurement ran locally in the background of this session; per explicit correction from the user mid-run, it was killed before completion — see "History" below — and redispatched through this existing GHA workflow instead, which is purpose-built for exactly this population+arms+budget shape and needed no new workflow or code.) 240 cells (80 levels × 3 arms). `control_arm=admissible-order-mustCrossFirst` is set only because the workflow requires naming one arm as control for its own pairwise coverage/work comparison output; that comparison is not this probe's actual question (all three arms are independent single-technique cost measurements, not competing candidates) and is not used in the Result below — this report reads each arm's own per-cell results directly from the raw shard artifacts instead.

## History

This probe was first attempted as a local (non-GHA) background run in this session (`node scripts/run-bundled.mjs scripts/technique-census.mjs`, workers=4, 240 cells at `work_budget=20,000,000`). It was interrupted by explicit user instruction partway through (~75-90/240 cells complete, all still right-censored at the work cap with no observed solves yet) on the grounds that a run of this length should use the existing GHA workflow rather than local compute. The partial local output was discarded (never committed, never used for evidence) and the identical measurement was redispatched via `static-portfolio-confirmation.yml` (GHA) instead, using the same already-committed population/arms/envelope. No results from the local attempt appear anywhere in this report.

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

_Pending — filled in once the local run completes._
