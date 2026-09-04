# Production-ladder marginal-value/tail audit: where the extra 4/40 coverage comes from, and where production spends work for nothing on this population

> **Status:** active
> **Last evidence:** 2026-09-04 — attribution complete; repricing pilot complete, 40/40 levels both arms
> **Decision:** the 4 production-only wins over `static-portfolio` in `2026-09-04-static-portfolio-entrypoint-production-ab-001.md` split 3 dose-truncation / 1 missing-action; on the same 40-level population, two `admissible-order` stages (`admissible-order-fallback` + `admissible-order-alternate-tiebreak-retry`) together consume ~62% of all production `workSpent` for a combined 3 realized solves. Disabling `admissible-order-alternate-tiebreak-retry` entirely loses **zero** solves and saves **58.35%** of total production `workSpent` on this population — but that tier's tie-break profiles have documented rare/exclusive census value, so this report recommends repricing (a smaller, percentile-derived work ceiling), not permanent removal.
> **Remaining gate:** a percentile-derived smaller work ceiling for `admissible-order-alternate-tiebreak-retry`, confirmed on a ~150-level population — see "Next earned gate."
> **Evidence role:** analysis (parts 1-2 are joins over existing evidence); the fixed-work pilot (part 4) is confirmation-shaped but single-population, so it nominates a repricing magnitude rather than closing the policy question
> **Selection:** the population is the existing disjoint 40-level draw from `2026-09-04-static-portfolio-entrypoint-production-ab-001.md` (prespecified there, reused here — not selected for this report's outcome); the pilot's treatment (which stage to disable) was chosen from this report's own tail table, so it is nomination evidence, not independently confirmed

## Question

`docs/solver-optimization-workstreams.md` and this session's brief: `portfolio-18-tranche-v2` (the static-portfolio scheduler) lost the real production ladder 14/40 vs. 18/40 despite using 86% less work. Two follow-on questions:

1. Where does the production ladder earn its extra coverage over the static-portfolio menu?
2. Where does production spend work with little or no marginal value, and what is the smallest defensible intervention to test?

## Data sources

- `reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json` — the 40-level `schedulerMode: 'production'` arm from the 2026-09-04 A/B, `workBudget: 67,000,000`, current-HEAD-equivalent commit `1b73539` (verified: only a scheduler-mode-name-normalization diff separates it from this session's HEAD `3599f215`, no solver-logic change — see Reproduction). Full per-attempt lifecycle (`stageId`, `actionKey`/`configKey`, `outcome`, `nodesExpanded`) for every attempt on every level, solved and unsolved.
- `reports/portfolio/static-portfolio-entrypoint-production-ab-001/static-portfolio-arm.json` — the matched `static-portfolio` arm on the same 40 levels, which additionally carries real per-attempt `workSpent` (an equal-work harness sets an explicit `allocatedWorkCeiling`/`workSpent` per attempt; production does not).
- `reports/stress/technique-niches/2026-09-03/level-capability.json` — the current frozen-T1 technique-capability census (1,962-level Corpus 2), used only to check whether a tail candidate has documented rare/exclusive value before recommending suppression.
- `reports/stress/capability-runs/33824275953/` — the freshest stress-refresh capability run (2026-09-04, 1,700-level Corpus 2, `lifecycle_telemetry=false`). Consulted but **not used as the primary tail-table source**: without `lifecycle_telemetry=true` it records only `winningConfig`/`failedStrategies` (attempt config names) and total level `workSpent`, not per-attempt work/stage attribution, so it cannot support a stage-level marginal-value table. It remains useful as an independent solved/unsolved cross-check (975/1,700 solved) and is the freshest whole-corpus capability snapshot on record.

### Work-estimation methodology (part 2 only)

`production-arm.json` has no per-attempt `workSpent` (only per-attempt `nodesExpanded` and one level-total `workSpent`). `static-portfolio-arm.json` ran a large, overlapping subset of the same configs (`configKey`) on the same 40 levels and does carry real per-attempt `workSpent` alongside `nodesExpanded`. Because `workSpent = applyMove calls + 12 * isConnected calls` (`docs/solver-budget-determinism.md`) is a property of the search algorithm/config, not of which stage dispatched it or what budget it was given, a config's work/node ratio measured in the static-portfolio arm should transfer to the same config running inside a production stage. Per-`configKey` median work/node ratios were computed from all `static-portfolio-arm.json` attempts (720 attempts across 40 levels), with a family-level (`beam`/`dfs`/`repair`/`admissible-order`) fallback median for the handful of production configs never run in the static-portfolio menu. These ratios were applied to `production-arm.json`'s per-attempt `nodesExpanded` to estimate per-attempt `workSpent`. Sanity check: summed per-level estimates reproduce the real aggregate production `workSpent` (12,395,204,792) to within 3.5% (12,830,720,524) — reported estimates below are labeled `~` and should be read as directionally reliable, not exact.

## Part 1 — Attribution of the 4 production-only wins

All 4 losses (`R00153`, `R02126`, `R02675`, `R02873`) were re-examined attempt-by-attempt in both arms.

| id | production winner (stage\|config) | production win nodes | same-config static-portfolio attempt | mechanism |
|---|---|---:|---|---|
| `R00153` | `main-search` \| `beam,intersectionHarvest,w=5000,retention=plain` | 407,988 | same config, capped at `allocatedWorkCeiling=4,144,503` (~378,830 nodes), **timed-out**, `finalBadness=18` | **Dose truncation.** static-portfolio's per-technique cap cut this exact winning config off ~7% of the way short of what production let it run. |
| `R02675` | `main-search` \| `beam,intersectionHarvest,w=5000,retention=plain` | 517,163 | same config, capped at 4,144,503 (~453,537 nodes), **timed-out**, `finalBadness=43` | **Dose truncation**, same mechanism, ~12% short. |
| `R02873` | `main-search` \| `beam,intersectionHarvest,w=5000,retention=mechanic-buckets` | 348,557 | same config, capped at 4,424,574 (~342,143 nodes), **timed-out**, `finalBadness=10` | **Dose truncation**, same mechanism, ~2% short. |
| `R02126` | `goal-attraction-disabled-retry` \| `beam,intersectionHarvest,w=2000,retention=plain` | 147,340 | the *plain* config (no goal-attraction disabled) ran and legitimately **exhausted** at 119,597 nodes without solving, in both arms | **Missing action.** This is not a truncated dose — the plain config genuinely finished searching and failed in both arms. Production's win came from a materially different search (goal-attraction disabled, a distinct scoring behavior) that `static-portfolio`'s 18-technique menu has no equivalent for. |

**Interpretation:** 3/4 losses are the starvation mechanism the original A/B report already named in the abstract — `static-portfolio`'s flat per-technique work cap on `intersectionHarvest` cut off a search that was, on this population, only 2-12% of node-count away from converging under production's more generous (and cheaper-than-nominal, since beam configs are naturally self-exhausting) effective allocation. This is a **dose** problem, not a missing-capability problem: the exact winning config is already in the `portfolio-18-specialists` menu. The 4th loss is different in kind: production's actual winner is an **additive retry action** (`goal-attraction-disabled-retry`, one of production's whole-ladder "disable one internal mechanism and retry everything" tiers) that has no equivalent anywhere in the static-portfolio menu — no cap increase on `intersectionHarvest` would have found this, because the static-portfolio menu never runs the goal-attraction-disabled search variant at all.

This directly answers the workstream's standing question: production's extra coverage on this population comes from (a) a materially larger, cheaper-than-static-portfolio's-per-technique-cap effective allocation to `intersectionHarvest` specifically (3 of 4 cases), and (b) one additive retry action outside the static-portfolio menu entirely (1 of 4 cases) — not from any general "production is better tuned" effect, and not from predecessor-state contamination (each winning attempt's node count is close to, not wildly different from, its static-portfolio counterpart; there is no evidence of a large hidden context transfer).

## Part 2 — Production marginal-value/tail table (40-level A/B population)

Aggregate production `workSpent` on this population: **12,395,204,792**. Of that, only **4.9%** (609,789,967) was spent on the 18 levels that end up solved; **95.1%** (11,785,414,825) was spent on the 22 levels that remain unsolved at the 67M work envelope — an unavoidable feature of any bounded search over a mixed solvable/unsolvable-within-budget population, not itself a scheduler defect, but it explains why per-stage failed-work totals below are large in absolute terms.

| stage | reached | conditional solves | solve rate | ~solved work | ~failed work | % of total work | naturally exhausted attempts | censored (capped) attempts | distinct configs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `admissible-order-fallback` | 25/40 | 3 | 12.0% | ~28.6M | ~4,356.2M | **34.2%** | 0 | 112 | 5 |
| `admissible-order-alternate-tiebreak-retry` | 22/40 | 0 | 0.0% | 0 | ~3,530.1M | **27.5%** | 0 | 88 | 4 |
| `repair-fallback` | 14/40 | 0 | 0.0% | 0 | ~1,226.0M | 9.6% | 0 | 23 | 2 |
| `late-repair-multiseed-retry` | 9/40 | 0 | 0.0% | 0 | ~822.4M | 6.4% | 0 | 63 | 7 |
| `main-search` | 35/40 | 9 | 25.7% | ~23.0M | ~769.5M | 6.2% | 90 | 220 | 27 |
| `early-repair-search` | 24/40 | 5 | 20.8% | ~7.3M | ~439.8M | 3.5% | 0 | 54 | 3 |
| `connectivity-axis-prune-disabled-retry` | 22/40 | 0 | 0.0% | 0 | ~373.3M | 2.9% | 70 | 177 | 27 |
| `guidance-goal-distance-retry` | 22/40 | 0 | 0.0% | 0 | ~371.9M | 2.9% | 70 | 177 | 27 |
| `coarse-state-near-tie-retention-disabled-retry` | 22/40 | 0 | 0.0% | 0 | ~361.9M | 2.8% | 68 | 179 | 27 |
| `must-cross-neighbor-prune-disabled-retry` | 13/40 | 0 | 0.0% | 0 | ~240.8M | 1.9% | 62 | 84 | 27 |
| `goal-attraction-disabled-retry` | 12/40 | 1 | 8.3% | ~1.4M | ~168.1M | 1.3% | 20 | 136 | 25 |
| `late-repair-search` | 9/40 | 0 | 0.0% | 0 | ~110.3M | 0.9% | 0 | 9 | 1 |

("Conditional solves" = levels this stage's own attempt was the one marked `ok:true` — since this ladder stops at first success, this is exactly the unique marginal solve count for that stage on this population; no separate dedup was needed.)

### Overlap / substitution

`main-search`'s 27 beam/DFS configs are **re-run verbatim** (identical `configKey`) inside five separate whole-ladder retry tiers (`goal-attraction-disabled-retry`, `coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`, `guidance-goal-distance-retry`) — each tier disables exactly one internal solver mechanism (a prune, a retention rule, a scoring term) and reruns the full menu. This is deliberate design (each tier tests "does disabling X let an otherwise-identical search through"), not redundant duplication of logically identical work — but it does mean these five tiers' true marginal population is "the same nominal search, minus one internal switch," and none of the four zero-solve tiers created a distinct census-tracked action identity (the frozen census keys off `configKey`, which these tiers share with `main-search`). The two `admissible-order` stages substitute for each other on a different axis: `admissible-order-fallback` runs all five tie-break profiles (`default`, `none`, `mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`) sharing one array-ordered ceiling (already documented in `docs/solver-optimization-workstreams.md` as starving the non-`default` profiles most of the time), and `admissible-order-alternate-tiebreak-retry` is a dead-last additive retry of the same three non-`default`/non-`none` profiles (`mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`) plus `none`, each with its **own** fresh work pool.

### Natural exhaustion vs. censoring

The five "disable one mechanism and retry the full main-search menu" tiers show the same signature: roughly 25-30% of their attempts naturally exhaust (mostly the cheap self-terminating beam configs) and the rest are censored (mostly DFS/admissible-order-shaped configs hitting their per-attempt allocation). `admissible-order-fallback`, `admissible-order-alternate-tiebreak-retry`, `repair-fallback`, `late-repair-search`, and `late-repair-multiseed-retry` show **zero** natural exhaustion — every failed attempt in those stages is censored, meaning their real depth-vs-value curve is still unknown at the caps this population exercised (consistent with `docs/solver-scheduling-policy.md`'s note that repair/admissible-order rarely self-terminate).

### Rare/specialist capability check (before treating any zero-solve row as "negligible")

Two zero-conditional-solve rows in the table above have **documented** non-trivial value elsewhere and must not be read as "safe to remove" from this sample alone:

- The four `admissible-order` non-default tie-break profiles (the configs `admissible-order-alternate-tiebreak-retry` runs) each carry real frozen-census value: `tieBreak=none` has **17 exclusive levels** and **38 production-miss-wins** across the 1,962-level census; `tieBreak=mustCrossFirst`/`intersectionHarvest`/`nearClosureRescue` each carry 1-2 exclusive levels and 30-35 production-miss-wins (`reports/stress/technique-niches/2026-09-03/level-capability.json`). At that base rate (~30-38 hits / 1,962 ≈ 1.5-2%), a 40-level sample showing zero hits is the **expected** outcome under the null of "this tier still works as documented," not evidence against it.
- `guidance-goal-distance-retry` (`STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY`) was promoted 2026-08-23 on a population-scale A/B showing **+3/-0** on a 73-level loss-conditioned population (`modules/solver/ablation-config.ts`'s own comment). Zero hits on this 40-level sample is again consistent with a real but rare (~4%) mechanism, not disproof.

The other three zero-solve whole-ladder tiers (`coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`) were also promoted on their own historical population-scale evidence (see `docs/solver-budget-determinism.md`'s work-dose-migration entries and their linked reports) and are not re-litigated here — this report did not find new evidence against them, only that this particular 40-level draw didn't happen to exercise their value.

**No row in this table is closed-negative from this sample alone.** What the table does establish cleanly, independent of any single row's future value, is the **concentration** of cost: `admissible-order-fallback` + `admissible-order-alternate-tiebreak-retry` together are **61.7%** of all production `workSpent` on this population for 3 realized solves, dwarfing every other stage. That concentration — not any individual zero-solve row — is this report's main finding.

## Part 3 — Candidate interventions considered

1. **Protect the late-stage `intersectionHarvest` beam dose.** Directly motivated by Part 1 (3/4 losses). Not applicable to production itself (production already affords this dose); relevant only if `static-portfolio`/scheduler work resumes — record as input to that line, not a production change.
2. **Add a `goal-attraction-disabled`-equivalent action to any future fixed-menu portfolio.** Directly motivated by Part 1's 4th loss. Same scope note as above.
3. **Reprice/shrink `admissible-order-alternate-tiebreak-retry`'s work pool.** Directly motivated by Part 2's cost concentration. Already flagged in `docs/solver-opt-in-experiment-ledger.md` ("retain as baseline but reprice residual value") — this report supplies the fresh single-population cost evidence (27.5% of total work, 0 realized solves) motivating that repricing, while the census check above blocks outright suppression.
4. **Suppress one of the three zero-census-identity whole-ladder retry tiers** (`coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`). Cheaper in aggregate (1.9-2.9% of work each) and structurally the "same config, one flag flipped" pattern with no distinct census identity to check against — a cleaner candidate on paper, but each was independently promoted on its own historical population evidence not re-audited here. Not tested this session; flagged as the better-supported next candidate if this report's pilot (below) is inconclusive.

Candidate 3 is the largest single lever found (27.5% of total work) and is explicitly already earmarked for repricing by the opt-in ledger, so it is the strongest candidate to spend this session's one pilot on.

## Part 4 — Fixed-work pilot

**Treatment:** `schedulerMode: 'production'`, `--disable-flags=STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` (turns off the `admissible-order-alternate-tiebreak-retry` stage; every other production tier, including `admissible-order-fallback`, stays at its default-ON behavior).
**Control:** the existing `production` arm from `2026-09-04-static-portfolio-entrypoint-production-ab-001.md` (18/40, 12,395,204,792 workSpent) — same population, same `workBudget: 67,000,000`, same tool, functionally the same commit (verified above).
**Population:** the same 40-level id list as the original A/B (no new corpus draw — reuses existing disjoint evidence per `solver-research-operating-model.md` rule 8).
**Accept/reject framing (prespecified before dispatch):** this is a value-of-information probe for the repricing question the opt-in ledger already opened, not a suppression decision. If solved count is unchanged at 18/40 with the ~27.5%-of-work stage removed, that is real (if single-population) evidence the tier bought nothing on this draw and supports shrinking its work pool. If solved count drops, that is evidence the tier's rare value fired even in this small sample and argues for caution. Either result is reported honestly; **neither result licenses outright removal**, given the documented rare-capability check above — the next earned gate either way is a properly-sized repricing experiment (shrink the pool, do not delete the tier) validated on a larger population.

**Reproduction:**

```
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels=pos:4,pos:20,pos:36,pos:139,pos:143,pos:158,pos:210,pos:234,pos:329,pos:345,pos:457,pos:513,pos:590,pos:664,pos:665,pos:700,pos:701,pos:817,pos:963,pos:984,pos:1006,pos:1115,pos:1149,pos:1163,pos:1170,pos:1204,pos:1255,pos:1317,pos:1424,pos:1488,pos:1489,pos:1498,pos:1518,pos:1541,pos:1550,pos:1580,pos:1585,pos:1678,pos:1687,pos:1694 \
  --scheduler-mode=production --work-budget=67000000 --workers=4 \
  --disable-flags=STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY \
  --out=reports/portfolio/admissible-order-alt-tiebreak-suppression-pilot-001/no-alt-tiebreak-arm.json
```

### Result

Both arms ran the identical 40-level population to completion.

| Arm | Solved | Aggregate workSpent |
|---|---:|---:|
| `production` (control, `admissible-order-alternate-tiebreak-retry` active) | 18/40 | 12,395,204,792 |
| `production` with `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` disabled | 18/40 | 5,162,700,501 (**−58.35%**) |

**Gained (pilot solves, control doesn't): 0. Lost (control solves, pilot doesn't): 0.** The solved-id set is byte-identical between arms: `R00153, R00296, R02014, R02126, R02259, R02370, R02653, R02675, R02784, R02873, R02924, R03167, R03187, R03210, R03219, R03249, R03347, R03363`.

One solved level's winning stage/action differs between arms despite the identical outcome: `R02259` won via `main-search|dfs|score=perimeterSweep|bias=perimeterCW` in the control and via `admissible-order-fallback|admissible-order|tieBreak=none|lds=off` in the pilot. Both winning stages run *before* `admissible-order-alternate-tiebreak-retry` in the ladder, so a dead-last additive tier being disabled cannot mechanically change what an earlier stage finds — this is ordinary solver run-to-run nondeterminism (the underlying capability run this session also consulted was itself dispatched with `deterministic: "false"`; this pilot did not request a deterministic run either), not a scheduler effect. It does not change the headline result (both arms still solve `R02259`) and is noted only so a reader does not mistake it for a hidden interaction.

## Interpretation

This is a clean, single-population, zero-cost result: disabling the single largest work-sink stage found in Part 2 (27.5% of total production work, 0 conditional solves in-sample) cost nothing on this exact population while removing 58.35% of aggregate `workSpent` — more than Part 2's own per-stage estimate would suggest, because the two `admissible-order` stages compete for wall-clock-adjacent budget in ways that compound (a shorter ladder also changes how much the *other* stages get to run before the outer envelope closes).

This result must be read through the census caveat already raised in Part 2, not as a standalone "this tier is worthless" finding. The four tie-break profiles this tier runs each carry documented rare/exclusive value in the frozen 1,962-level census (`tieBreak=none` alone: 17 exclusive levels, 38 production-miss-wins — roughly a 1.5-2% per-profile hit rate). At that base rate, a 40-level sample has a real chance of observing zero hits (roughly 40-50% probability under a naive Poisson approximation at a single profile's own ~1.9% rate, before accounting for the other three profiles) even if the tier's documented value is completely intact — so this pilot's zero-loss result is **consistent with, not evidence against**, the tier still carrying its documented rare value on the wider population. What this pilot does establish cleanly is that the tier's *current, always-on, full-fresh-work-pool* sizing is far more expensive than its typical (non-rare-case) marginal contribution, on this population and in this specific 40-level draw — exactly the gap the opt-in ledger's existing "retain as baseline but reprice residual value" annotation already anticipated, now with a concrete, large, single-population magnitude attached to it.

The right reading is therefore **repricing headroom, not a suppression verdict**: a materially smaller work ceiling for this tier (rather than either its current full pool or an outright disable) is the shape of intervention this evidence actually supports — small enough to capture most of the ~58% saving on the common case, large enough to still reach the rare tie-break-specific wins the census documents. Sizing that ceiling from this one pilot alone would repeat the mean-scaled-cap mistake this same research line already found and closed negative for `static-portfolio`'s own tranche-cap-map-v1 (`2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md`) — a percentile-based derivation from this tier's own isolated cost distribution, not its raw mean, is the better-supported next step.

## Decision

**Do not disable `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` in production from this evidence.** The pilot is a clean zero-cost/58%-work-saving result on one 40-level population, but the census cross-check shows this tier's real value is a rare (~1.5-2%-per-profile) event this sample size cannot rule out, and the ledger already anticipated this exact tier needing repricing rather than removal. This report closes the "is there large, obvious waste concentrated in the admissible-order stages" question as tested — yes, concentrated and large (61.7% of total work for 3/40 realized solves; one sub-tier saves 58% of total work at zero measured cost on this draw) — and opens a properly scoped repricing design as the next step, rather than recommending either "leave it exactly as-is" or "remove it."

## Next earned gate

A percentile-derived (not mean-derived) smaller work ceiling for `admissible-order-alternate-tiebreak-retry`, sized from that tier's own isolated cost-when-solving distribution (mirroring `2026-09-03-portfolio-18-tail-percentile-cost-probe-001-preflight.md`'s method for the static-portfolio line), confirmed on a larger population (GHA-scale, ~150 levels, matching this research line's own established confirmation size) so the tier's documented ~1.5-2%-per-profile rare-capability hit rate has a real chance to be exercised and checked for retention. Do not re-run this exact 40-level suppression pilot again; the next decision-bearing step is the resized-ceiling confirmation, not another all-or-nothing test.
